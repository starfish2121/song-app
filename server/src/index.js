require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');
const {
  registerUser,
  loginUser,
  createGuestUser,
  getUserById,
  updateUserProfile,
  verifyToken,
  authMiddleware,
  DEFAULT_AVATARS
} = require('./auth');
const {
  getSpotifyAuthUrl,
  exchangeSpotifyCode,
  fetchSpotifyCurrentlyPlaying,
  isSpotifyConfigured
} = require('./spotify');
const { INITIAL_SONGS, SIMULATED_LISTENERS } = require('./mockData');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Serve static web app build if available
const clientDistPath = path.join(__dirname, '../../web/dist');
const htmlIndexPath = path.join(clientDistPath, 'index.html');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// In-memory active presence map
// roomKey -> { song, listeners: [ { socketId, userId, name, username, avatar, source, positionMs, isPlaying, isBot } ] }
const activeRooms = new Map();
// socketId -> userSession
const socketUsers = new Map();
// Rate limit map: socketId -> count
const rateLimits = new Map();

function normalizeSongKey(title, artist) {
  if (!title) return 'unknown';
  const cleanTitle = title.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
  const cleanArtist = (artist || '').toLowerCase().split(',')[0].split('feat')[0].trim();
  return `${cleanArtist}:::${cleanTitle}`;
}

// Seed initial rooms with active simulated listeners for public engagement
function initSimulatedRooms() {
  INITIAL_SONGS.forEach((song, idx) => {
    const roomKey = normalizeSongKey(song.title, song.artist);
    const assignedSims = SIMULATED_LISTENERS.slice(idx % SIMULATED_LISTENERS.length, (idx % SIMULATED_LISTENERS.length) + 2);

    const listeners = assignedSims.map((sim, sIdx) => ({
      socketId: `bot-${sim.id}`,
      userId: sim.id,
      name: sim.name,
      username: sim.username,
      avatar: sim.avatar,
      bio: sim.bio,
      source: sim.source,
      city: sim.city,
      positionMs: 30000 + (sIdx * 2000),
      isPlaying: true,
      lastSync: Date.now(),
      isBot: true
    }));

    activeRooms.set(roomKey, {
      song: { ...song },
      roomKey,
      listeners,
      reactions: []
    });

    // Check if initial room message exists in DB, otherwise seed one
    const existingMsg = db.prepare('SELECT id FROM room_messages WHERE room_key = ? LIMIT 1').get(roomKey);
    if (!existingMsg && assignedSims[0]) {
      db.prepare(`
        INSERT INTO room_messages (id, room_key, user_id, user_name, user_avatar, user_source, text, playback_timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `seed-msg-${idx}`,
        roomKey,
        assignedSims[0].id,
        assignedSims[0].name,
        assignedSims[0].avatar,
        assignedSims[0].source,
        'This bridge gives me pure goosebumps every time! 🎧✨',
        32000,
        Date.now() - 1000 * 60 * 5
      );
    }
  });
}

initSimulatedRooms();

// Periodically simulate bot playback ticks
setInterval(() => {
  activeRooms.forEach((room) => {
    room.listeners.forEach((listener) => {
      if (listener.isBot && listener.isPlaying) {
        listener.positionMs = (listener.positionMs + 3000) % (room.song.durationMs || 200000);
      }
    });
  });
}, 3000);

// --- REST API Endpoints ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'sqlite-connected',
    spotifyConfigured: isSpotifyConfigured(),
    activeRoomsCount: activeRooms.size,
    onlineSockets: socketUsers.size
  });
});

// Authentication routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name, username, streaming_platform, avatar, bio } = req.body;
    const result = registerUser({ email, password, name, username, streaming_platform, avatar, bio });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const result = loginUser({ email, password });
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/guest', (req, res) => {
  try {
    const result = createGuestUser();
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.put('/api/auth/profile', authMiddleware, (req, res) => {
  try {
    const updated = updateUserProfile(req.user.id, req.body);
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Spotify OAuth endpoints
app.get('/api/spotify/auth-url', (req, res) => {
  const userId = req.query.userId || 'guest';
  const url = getSpotifyAuthUrl(userId);
  res.json({ url, configured: isSpotifyConfigured() });
});

app.get('/api/auth/spotify/callback', async (req, res) => {
  const { code, state: userId, error } = req.query;

  if (error || !code) {
    return res.redirect(`/?spotify_error=${encodeURIComponent(error || 'cancelled')}`);
  }

  try {
    const tokens = await exchangeSpotifyCode(code);
    if (userId && !userId.startsWith('guest')) {
      db.prepare(`
        UPDATE users SET
          spotify_access_token = ?,
          spotify_refresh_token = ?
        WHERE id = ?
      `).run(tokens.accessToken, tokens.refreshToken, userId);
    }

    res.redirect(`/?spotify_connected=true&access_token=${tokens.accessToken}`);
  } catch (err) {
    console.error('Spotify callback exchange error:', err);
    res.redirect(`/?spotify_error=${encodeURIComponent(err.message)}`);
  }
});

app.get('/api/spotify/now-playing', authMiddleware, async (req, res) => {
  const token = req.user.spotify_access_token;
  if (!token) {
    return res.status(400).json({ error: 'No Spotify account linked' });
  }

  const track = await fetchSpotifyCurrentlyPlaying(token);
  res.json({ track });
});

// Music Catalog & Search
app.get('/api/songs', (req, res) => {
  const enriched = INITIAL_SONGS.map(song => {
    const roomKey = normalizeSongKey(song.title, song.artist);
    const room = activeRooms.get(roomKey);
    return {
      ...song,
      activeListeners: room ? room.listeners.length : 1
    };
  });
  res.json(enriched);
});

app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.json(INITIAL_SONGS);
  }

  let matches = INITIAL_SONGS.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    s.artist.toLowerCase().includes(query.toLowerCase()) ||
    (s.genre && s.genre.toLowerCase().includes(query.toLowerCase())) ||
    (s.vibe && s.vibe.toLowerCase().includes(query.toLowerCase()))
  );

  if (matches.length < 5) {
    try {
      const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=6`);
      const itunesData = await itunesRes.json();
      if (itunesData.results && itunesData.results.length > 0) {
        const dynamicSongs = itunesData.results.map((track, i) => ({
          id: `itunes-${track.trackId || Date.now() + i}`,
          title: track.trackName,
          artist: track.artistName,
          album: track.collectionName || 'Single',
          albumArt: (track.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg'),
          durationMs: track.trackTimeMillis || 210000,
          genre: track.primaryGenreName || 'Pop',
          vibe: 'Live Matched Track',
          color: '#8b5cf6',
          spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(track.trackName + ' ' + track.artistName)}`,
          youtubeMusicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(track.trackName + ' ' + track.artistName)}`,
          previewUrl: track.previewUrl || ''
        }));

        const existingKeys = new Set(matches.map(m => normalizeSongKey(m.title, m.artist)));
        dynamicSongs.forEach(ds => {
          const k = normalizeSongKey(ds.title, ds.artist);
          if (!existingKeys.has(k)) {
            existingKeys.add(k);
            matches.push(ds);
          }
        });
      }
    } catch (err) {
      console.error('Search error:', err.message);
    }
  }

  const enriched = matches.map(song => {
    const roomKey = normalizeSongKey(song.title, song.artist);
    const room = activeRooms.get(roomKey);
    return {
      ...song,
      activeListeners: room ? room.listeners.length : 1
    };
  });

  res.json(enriched);
});

// Active Rooms
app.get('/api/rooms', (req, res) => {
  const roomsList = [];
  activeRooms.forEach((room, key) => {
    if (room.listeners.length > 0) {
      roomsList.push({
        roomKey: key,
        song: room.song,
        listenerCount: room.listeners.length,
        listeners: room.listeners.map(l => ({
          userId: l.userId,
          name: l.name,
          username: l.username,
          avatar: l.avatar,
          source: l.source,
          city: l.city,
          positionMs: l.positionMs
        }))
      });
    }
  });

  roomsList.sort((a, b) => b.listenerCount - a.listenerCount);
  res.json(roomsList);
});

// Persistent Room Chat messages
app.get('/api/rooms/:roomKey/messages', (req, res) => {
  const roomKey = req.params.roomKey;
  const messages = db.prepare(`
    SELECT
      id,
      user_id as senderId,
      user_name as senderName,
      user_avatar as senderAvatar,
      user_source as senderSource,
      text,
      playback_timestamp as playbackTimestamp,
      created_at as timestamp
    FROM room_messages
    WHERE room_key = ?
    ORDER BY created_at ASC
    LIMIT 100
  `).all(roomKey);

  res.json(messages.map(m => ({
    id: m.id,
    sender: {
      id: m.senderId,
      name: m.senderName,
      avatar: m.senderAvatar,
      source: m.senderSource
    },
    text: m.text,
    playbackTimestamp: m.playbackTimestamp,
    timestamp: m.timestamp
  })));
});

// User's Persistent Matches & DMs
app.get('/api/matches', authMiddleware, (req, res) => {
  const userId = req.user.id;

  const matches = db.prepare(`
    SELECT m.id, m.user1_id, m.user2_id, m.song_title, m.song_artist, m.created_at,
           u1.name as u1_name, u1.avatar as u1_avatar, u1.streaming_platform as u1_source,
           u2.name as u2_name, u2.avatar as u2_avatar, u2.streaming_platform as u2_source
    FROM matches m
    JOIN users u1 ON m.user1_id = u1.id
    JOIN users u2 ON m.user2_id = u2.id
    WHERE m.user1_id = ? OR m.user2_id = ?
    ORDER BY m.created_at DESC
  `).all(userId, userId);

  const formatted = matches.map(match => {
    const messages = db.prepare(`
      SELECT id, sender_id as senderId, sender_name as senderName, text, created_at as timestamp
      FROM direct_messages
      WHERE match_id = ?
      ORDER BY created_at ASC
      LIMIT 100
    `).all(match.id);

    return {
      id: match.id,
      songTitle: match.song_title,
      songArtist: match.song_artist,
      participants: [
        { id: match.user1_id, name: match.u1_name, avatar: match.u1_avatar, source: match.u1_source },
        { id: match.user2_id, name: match.u2_name, avatar: match.u2_avatar, source: match.u2_source }
      ],
      messages
    };
  });

  res.json(formatted);
});

// Global stats
app.get('/api/stats', (req, res) => {
  let totalListeners = 0;
  activeRooms.forEach(r => { totalListeners += r.listeners.length; });
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  res.json({
    activeListeners: totalListeners + socketUsers.size,
    totalRegisteredUsers: totalUsers,
    activeSongRooms: activeRooms.size
  });
});

// SPA routing fallback / Root status
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();

  if (fs.existsSync(htmlIndexPath)) {
    return res.sendFile(htmlIndexPath);
  }

  // If deployed as a standalone API server (e.g. on Render), return clean API status
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>SongSync API Server</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0b0e; color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #12141a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; max-width: 480px; text-align: center; }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.15); color: #10b981; font-weight: 600; font-size: 13px; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; }
        .dot { width: 8px; height: 8px; border-radius: 4px; background: #10b981; }
        h1 { margin: 0 0 8px; font-size: 24px; }
        p { color: #8b92a4; margin: 0 0 20px; font-size: 14px; line-height: 1.5; }
        a { color: #818cf8; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge"><span class="dot"></span> Online & Operational</div>
        <h1>SongSync Backend API</h1>
        <p>Real-time audio synchronization service for Spotify & YouTube Music.</p>
        <p><a href="/api/health">Check API Health Status (/api/health)</a></p>
      </div>
    </body>
    </html>
  `);
});

// --- Real-time Socket.IO Handlers ---

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('user:register', (userData) => {
    let user = null;
    if (userData && userData.id) {
      user = getUserById(userData.id);
    }

    if (!user) {
      user = {
        id: userData?.id || `usr-${uuidv4()}`,
        name: userData?.name || 'Listener',
        username: userData?.username || `@listener_${socket.id.slice(0, 4)}`,
        avatar: userData?.avatar || DEFAULT_AVATARS[0],
        bio: userData?.bio || 'Listening in real-time',
        source: userData?.source || 'spotify'
      };
    }

    const session = {
      socketId: socket.id,
      userId: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      source: userData?.source || user.streaming_platform || 'spotify',
      currentRoomKey: null,
      positionMs: 0,
      isPlaying: false,
      lastUpdated: Date.now()
    };

    socketUsers.set(socket.id, session);
    socket.emit('user:registered', session);
  });

  // User plays song
  socket.on('song:start_listening', (payload) => {
    const user = socketUsers.get(socket.id);
    if (!user) return;

    const { song, positionMs = 0, isPlaying = true, source } = payload;
    const roomKey = normalizeSongKey(song.title, song.artist);

    if (user.currentRoomKey && user.currentRoomKey !== roomKey) {
      leaveCurrentRoom(socket, user);
    }

    user.currentRoomKey = roomKey;
    user.positionMs = positionMs;
    user.isPlaying = isPlaying;
    if (source) user.source = source;

    socket.join(roomKey);

    let room = activeRooms.get(roomKey);
    if (!room) {
      room = {
        song,
        roomKey,
        listeners: [],
        reactions: []
      };
      activeRooms.set(roomKey, room);
    }

    const existingIdx = room.listeners.findIndex(l => l.socketId === socket.id);
    const listenerEntry = {
      socketId: socket.id,
      userId: user.userId,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      source: user.source,
      positionMs: user.positionMs,
      isPlaying: user.isPlaying,
      lastSync: Date.now(),
      isBot: false
    };

    if (existingIdx >= 0) {
      room.listeners[existingIdx] = listenerEntry;
    } else {
      room.listeners.push(listenerEntry);
    }

    // Record listening history in SQLite
    try {
      db.prepare(`
        INSERT INTO listening_history (id, user_id, song_id, title, artist, album_art, listened_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `lh-${uuidv4()}`,
        user.userId,
        song.id || 'unknown',
        song.title,
        song.artist,
        song.albumArt || '',
        Date.now()
      );
    } catch (_) {}

    // Load persistent room chat from SQLite
    const persistentMessages = db.prepare(`
      SELECT
        id,
        user_id as senderId,
        user_name as senderName,
        user_avatar as senderAvatar,
        user_source as senderSource,
        text,
        playback_timestamp as playbackTimestamp,
        created_at as timestamp
      FROM room_messages
      WHERE room_key = ?
      ORDER BY created_at ASC
      LIMIT 60
    `).all(roomKey).map(m => ({
      id: m.id,
      sender: {
        id: m.senderId,
        name: m.senderName,
        avatar: m.senderAvatar,
        source: m.senderSource
      },
      text: m.text,
      playbackTimestamp: m.playbackTimestamp,
      timestamp: m.timestamp
    }));

    socket.emit('room:joined', {
      roomKey,
      song: room.song,
      listeners: room.listeners,
      messages: persistentMessages,
      timestamp: Date.now()
    });

    io.to(roomKey).emit('room:listeners_updated', {
      roomKey,
      listeners: room.listeners
    });

    broadcastRadarUpdate();
  });

  // Playback sync position tick
  socket.on('song:sync_position', ({ positionMs, isPlaying }) => {
    const user = socketUsers.get(socket.id);
    if (!user || !user.currentRoomKey) return;

    user.positionMs = positionMs;
    user.isPlaying = isPlaying;
    user.lastUpdated = Date.now();

    const room = activeRooms.get(user.currentRoomKey);
    if (!room) return;

    const listener = room.listeners.find(l => l.socketId === socket.id);
    if (listener) {
      listener.positionMs = positionMs;
      listener.isPlaying = isPlaying;
      listener.lastSync = Date.now();
    }
  });

  // Persistent Room Chat
  socket.on('room:send_message', ({ text }) => {
    const user = socketUsers.get(socket.id);
    if (!user || !user.currentRoomKey || !text || !text.trim()) return;

    const cleanText = text.trim().slice(0, 500);
    const msgId = `msg-${uuidv4()}`;
    const now = Date.now();

    // Persist in SQLite
    try {
      db.prepare(`
        INSERT INTO room_messages (
          id, room_key, user_id, user_name, user_avatar, user_source, text, playback_timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        msgId,
        user.currentRoomKey,
        user.userId,
        user.name,
        user.avatar,
        user.source,
        cleanText,
        user.positionMs,
        now
      );
    } catch (err) {
      console.error('Failed to persist room message:', err);
    }

    const message = {
      id: msgId,
      sender: {
        id: user.userId,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        source: user.source
      },
      text: cleanText,
      playbackTimestamp: user.positionMs,
      timestamp: now
    };

    io.to(user.currentRoomKey).emit('room:new_message', message);
  });

  // Floating live emoji reaction
  socket.on('room:send_reaction', ({ emoji }) => {
    const user = socketUsers.get(socket.id);
    if (!user || !user.currentRoomKey) return;

    const reaction = {
      id: `react-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: user.userId,
      userName: user.name,
      emoji: emoji || '🔥',
      timestamp: Date.now()
    };

    io.to(user.currentRoomKey).emit('room:new_reaction', reaction);
  });

  // 1-on-1 Vibe Match request
  socket.on('direct:match_request', ({ targetUserId, targetSocketId }) => {
    const requester = socketUsers.get(socket.id);
    if (!requester) return;

    const currentRoom = activeRooms.get(requester.currentRoomKey);
    const songTitle = currentRoom?.song?.title || 'Shared Song';
    const songArtist = currentRoom?.song?.artist || '';

    // If target is bot, instant auto-accept and persist match in SQLite
    if (targetSocketId && targetSocketId.startsWith('bot-')) {
      const simBot = SIMULATED_LISTENERS.find(s => s.id === targetUserId) || SIMULATED_LISTENERS[0];
      const matchId = `match-${requester.userId}-${simBot.id}`;
      const now = Date.now();

      // Upsert match in SQLite
      try {
        db.prepare(`
          INSERT INTO matches (id, user1_id, user2_id, song_title, song_artist, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user1_id, user2_id) DO UPDATE SET created_at = ?
        `).run(matchId, requester.userId, simBot.id, songTitle, songArtist, now, now);

        // Ensure bot user exists in DB for foreign keys
        const botInDb = db.prepare('SELECT id FROM users WHERE id = ?').get(simBot.id);
        if (!botInDb) {
          db.prepare(`
            INSERT OR IGNORE INTO users (id, name, username, avatar, bio, streaming_platform, is_guest, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
          `).run(simBot.id, simBot.name, simBot.username, simBot.avatar, simBot.bio, simBot.source, now);
        }

        // Add welcome message
        const welcomeMsgId = `dm-${uuidv4()}`;
        const welcomeText = `Hey! Love that we're both listening to "${songTitle}" right now! What do you like most about this track? 🎶`;
        db.prepare(`
          INSERT INTO direct_messages (id, match_id, sender_id, sender_name, text, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(welcomeMsgId, matchId, simBot.id, simBot.name, welcomeText, now);
      } catch (err) {
        console.error('Error saving bot match to DB:', err);
      }

      const conversation = {
        id: matchId,
        songTitle,
        songArtist,
        participants: [
          { id: requester.userId, name: requester.name, avatar: requester.avatar, source: requester.source },
          { id: simBot.id, name: simBot.name, avatar: simBot.avatar, source: simBot.source }
        ],
        messages: [
          {
            id: `dm-init-${now}`,
            senderId: simBot.id,
            senderName: simBot.name,
            text: `Hey! Love that we're both listening to "${songTitle}" right now! What do you like most about this track? 🎶`,
            timestamp: now
          }
        ]
      };

      socket.emit('direct:match_accepted', conversation);
      return;
    }

    // Real socket user target
    if (targetSocketId) {
      io.to(targetSocketId).emit('direct:match_received', {
        requester: {
          id: requester.userId,
          socketId: socket.id,
          name: requester.name,
          username: requester.username,
          avatar: requester.avatar,
          bio: requester.bio,
          source: requester.source
        },
        songTitle,
        songArtist
      });
    }
  });

  // Accept 1-on-1 match
  socket.on('direct:match_accept', ({ requesterSocketId, requesterUserId, songTitle, songArtist }) => {
    const acceptor = socketUsers.get(socket.id);
    if (!acceptor) return;

    const matchId = `match-${requesterUserId}-${acceptor.userId}`;
    const now = Date.now();

    try {
      db.prepare(`
        INSERT INTO matches (id, user1_id, user2_id, song_title, song_artist, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user1_id, user2_id) DO NOTHING
      `).run(matchId, requesterUserId, acceptor.userId, songTitle || '', songArtist || '', now);
    } catch (_) {}

    const conversation = {
      id: matchId,
      songTitle: songTitle || '',
      songArtist: songArtist || '',
      participants: [
        { id: requesterUserId, name: 'Connected Listener', socketId: requesterSocketId },
        { id: acceptor.userId, name: acceptor.name, avatar: acceptor.avatar, source: acceptor.source, socketId: socket.id }
      ],
      messages: []
    };

    socket.emit('direct:match_accepted', conversation);
    if (requesterSocketId) {
      io.to(requesterSocketId).emit('direct:match_accepted', conversation);
    }
  });

  // Send Direct Message
  socket.on('direct:send_message', ({ matchId, text, recipientSocketId }) => {
    const sender = socketUsers.get(socket.id);
    if (!sender || !text || !text.trim()) return;

    const cleanText = text.trim().slice(0, 500);
    const msgId = `dm-${uuidv4()}`;
    const now = Date.now();

    try {
      db.prepare(`
        INSERT INTO direct_messages (id, match_id, sender_id, sender_name, text, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(msgId, matchId, sender.userId, sender.name, cleanText, now);
    } catch (err) {
      console.error('Failed to persist direct message:', err);
    }

    const msg = {
      id: msgId,
      senderId: sender.userId,
      senderName: sender.name,
      text: cleanText,
      timestamp: now
    };

    socket.emit('direct:new_message', { matchId, message: msg });

    if (matchId.includes('sim-')) {
      setTimeout(() => {
        const botReplies = [
          "100%! The production on this track is so crisp.",
          "I have this on repeat today! Are you listening via Spotify or YouTube?",
          "The beat drop right around 1:30 is pure magic ✨",
          "Adding this to my top playlist right now!",
          "Such good vibes. Have you listened to their full album yet?"
        ];
        const botText = botReplies[Math.floor(Math.random() * botReplies.length)];
        const botMsgId = `dm-reply-${uuidv4()}`;
        const replyNow = Date.now();

        try {
          db.prepare(`
            INSERT INTO direct_messages (id, match_id, sender_id, sender_name, text, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(botMsgId, matchId, 'sim-bot', 'Listener', botText, replyNow);
        } catch (_) {}

        socket.emit('direct:new_message', {
          matchId,
          message: {
            id: botMsgId,
            senderId: 'sim-bot',
            senderName: 'Listener',
            text: botText,
            timestamp: replyNow
          }
        });
      }, 1400);
    } else if (recipientSocketId) {
      io.to(recipientSocketId).emit('direct:new_message', { matchId, message: msg });
    }
  });

  socket.on('disconnect', () => {
    const user = socketUsers.get(socket.id);
    if (user) {
      if (user.currentRoomKey) {
        leaveCurrentRoom(socket, user);
      }
      socketUsers.delete(socket.id);
    }
  });
});

function leaveCurrentRoom(socket, user) {
  const roomKey = user.currentRoomKey;
  if (!roomKey) return;

  socket.leave(roomKey);
  const room = activeRooms.get(roomKey);
  if (room) {
    room.listeners = room.listeners.filter(l => l.socketId !== socket.id);
    io.to(roomKey).emit('room:listeners_updated', {
      roomKey,
      listeners: room.listeners
    });
  }

  user.currentRoomKey = null;
  broadcastRadarUpdate();
}

function broadcastRadarUpdate() {
  const roomsSummary = [];
  activeRooms.forEach((room, key) => {
    if (room.listeners.length > 0) {
      roomsSummary.push({
        roomKey: key,
        song: room.song,
        listenerCount: room.listeners.length,
        listeners: room.listeners.slice(0, 5)
      });
    }
  });
  roomsSummary.sort((a, b) => b.listenerCount - a.listenerCount);
  io.emit('radar:updated', roomsSummary);
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SongSync Server running on http://localhost:${PORT}`);
  console.log(`🎧 Connected music platforms: Spotify & YouTube Music`);
  console.log(`🌐 Web App available at http://localhost:${PORT}`);
});
