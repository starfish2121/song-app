import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Radio,
  Compass,
  Heart,
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ExternalLink,
  Search,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Send,
  X
} from 'lucide-react';
import './App.css';

const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin;

export default function App() {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('songsync_token') || null);
  const [currentTab, setCurrentTab] = useState('lounge'); // 'lounge' | 'radar' | 'matches'
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Audio & Song State
  const [songs, setSongs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Room & Social State
  const [currentRoom, setCurrentRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [directInput, setDirectInput] = useState('');
  const [selectedListener, setSelectedListener] = useState(null);
  const [toast, setToast] = useState(null);

  const audioRef = useRef(new Audio());
  const chatBottomRef = useRef(null);
  const songsRef = useRef([]);
  songsRef.current = songs;
  const currentSongRef = useRef(null);
  currentSongRef.current = currentSong;

  // Initialize Auth
  useEffect(() => {
    const storedUser = localStorage.getItem('songsync_user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch (_) {
        setShowAuthModal(true);
      }
    } else {
      handleGuestLogin();
    }
  }, []);

  // Setup Socket.io
  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log('Connected to SongSync server');
      if (user) {
        s.emit('user:register', user);
      }
    });

    s.on('room:joined', (data) => {
      setCurrentRoom(data);
      setChatMessages(data.messages || []);
    });

    s.on('room:listeners_updated', (data) => {
      setCurrentRoom(prev => prev ? { ...prev, listeners: data.listeners } : prev);
    });

    s.on('room:new_message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    s.on('room:new_reaction', (reaction) => {
      showToast(`${reaction.userName} sent ${reaction.emoji}`, 'reaction');
    });

    s.on('radar:updated', (roomsList) => {
      setRooms(roomsList);
    });

    s.on('direct:match_received', ({ requester, songTitle }) => {
      showToast(`${requester.name} wants to Vibe Match on "${songTitle}"!`, 'match', () => {
        s.emit('direct:match_accept', {
          requesterSocketId: requester.socketId,
          requesterUserId: requester.id,
          songTitle
        });
      });
    });

    s.on('direct:match_accepted', (conversation) => {
      setMatches(prev => {
        if (prev.some(m => m.id === conversation.id)) return prev;
        return [conversation, ...prev];
      });
      showToast('New Vibe Match connected!', 'success');
    });

    s.on('direct:new_message', ({ matchId, message }) => {
      setMatches(prev => prev.map(m => {
        if (m.id === matchId) {
          return { ...m, messages: [...(m.messages || []), message] };
        }
        return m;
      }));
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user?.id]);

  // Audio element setup
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setDuration(audio.duration);
    };

    const onEnded = () => {
      handleAutoAdvance();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [volume]);

  // Auto-advance track
  const handleAutoAdvance = () => {
    const list = songsRef.current;
    const current = currentSongRef.current;
    if (list.length === 0) return;
    const idx = list.findIndex(s => s.id === current?.id);
    const nextIdx = (idx + 1) % list.length;
    handleSelectSong(list[nextIdx]);
  };

  // Keyboard shortcut: Space to play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Periodic playback sync emit
  useEffect(() => {
    if (!socket || !isPlaying || !currentSong) return;
    const interval = setInterval(() => {
      socket.emit('song:sync_position', {
        positionMs: Math.floor(currentTime * 1000),
        isPlaying: true
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [socket, isPlaying, currentTime, currentSong]);

  // Fetch initial songs and rooms
  useEffect(() => {
    fetch(`${SERVER_URL}/api/songs`)
      .then(r => r.json())
      .then(data => {
        setSongs(data);
        if (data.length > 0 && !currentSong) {
          handleSelectSong(data[0], false);
        }
      })
      .catch(console.error);

    fetch(`${SERVER_URL}/api/rooms`)
      .then(r => r.json())
      .then(data => setRooms(data))
      .catch(console.error);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleGuestLogin = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/guest`, { method: 'POST' });
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('songsync_token', data.token);
      localStorage.setItem('songsync_user', JSON.stringify(data.user));
      if (socket) socket.emit('user:register', data.user);
    } catch (err) {
      console.error('Guest auth failed:', err);
    }
  };

  const handleSelectSong = (song, autoplay = true) => {
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(song.durationMs ? song.durationMs / 1000 : 180);

    const audio = audioRef.current;
    if (song.previewUrl) {
      audio.src = song.previewUrl;
      if (autoplay) {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }

    if (socket) {
      socket.emit('song:start_listening', {
        song,
        positionMs: 0,
        isPlaying: autoplay,
        source: user?.streaming_platform || 'spotify'
      });
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }

    if (socket) {
      socket.emit('song:sync_position', {
        positionMs: Math.floor(currentTime * 1000),
        isPlaying: !isPlaying
      });
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    setCurrentTime(newTime);
    audioRef.current.currentTime = newTime;

    if (socket) {
      socket.emit('song:sync_position', {
        positionMs: Math.floor(newTime * 1000),
        isPlaying
      });
    }
  };

  const handleSyncToMedian = () => {
    if (!currentRoom?.listeners || currentRoom.listeners.length === 0) return;
    const positions = currentRoom.listeners.map(l => (l.positionMs || 0) / 1000).sort((a, b) => a - b);
    const medianTime = positions[Math.floor(positions.length / 2)] || 0;
    setCurrentTime(medianTime);
    audioRef.current.currentTime = medianTime;
    showToast('Synchronized with room timestamp!', 'success');
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioRef.current.volume = val;
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const togglePlatform = () => {
    const next = user?.streaming_platform === 'spotify' ? 'youtube' : 'spotify';
    const updated = { ...user, streaming_platform: next };
    setUser(updated);
    localStorage.setItem('songsync_user', JSON.stringify(updated));
    if (socket) {
      socket.emit('user:register', updated);
      if (currentSong) {
        socket.emit('song:start_listening', {
          song: currentSong,
          positionMs: Math.floor(currentTime * 1000),
          isPlaying,
          source: next
        });
      }
    }
    showToast(`Switched broadcast to ${next === 'spotify' ? 'Spotify' : 'YouTube Music'}`, 'info');
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('room:send_message', { text: chatInput.trim() });
    setChatInput('');
  };

  const handleSendReaction = (emoji) => {
    if (!socket) return;
    socket.emit('room:send_reaction', { emoji });
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    try {
      const res = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSongs(data);
    } catch (_) {}
  };

  const handleRequestMatch = (targetListener) => {
    if (!socket) return;
    socket.emit('direct:match_request', {
      targetUserId: targetListener.userId,
      targetSocketId: targetListener.socketId
    });
    setSelectedListener(null);
    showToast(`Vibe Match request sent to ${targetListener.name}!`, 'success');
  };

  const handleSendDirectMessage = (e) => {
    e.preventDefault();
    if (!directInput.trim() || !selectedMatch || !socket) return;
    const partner = selectedMatch.participants.find(p => p.id !== user?.id);
    socket.emit('direct:send_message', {
      matchId: selectedMatch.id,
      text: directInput.trim(),
      recipientSocketId: partner?.socketId
    });
    setDirectInput('');
  };

  const showToast = (message, type = 'info', action = null) => {
    setToast({ message, type, action });
    setTimeout(() => setToast(null), 4000);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentListeners = currentRoom?.listeners || [];
  const onlineCount = rooms.reduce((acc, r) => acc + (r.listenerCount || 0), 1);

  return (
    <div className="desktop-layout">
      {/* Toast Notification */}
      {toast && (
        <div className="desktop-toast" onClick={toast.action}>
          <span>{toast.message}</span>
          <button onClick={(e) => { e.stopPropagation(); setToast(null); }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <Radio size={20} className="brand-icon" />
          <span className="brand-name">SongSync</span>
          <span className="live-pill">
            <span className="live-dot"></span>
            {onlineCount} live
          </span>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${currentTab === 'lounge' ? 'active' : ''}`}
            onClick={() => setCurrentTab('lounge')}
          >
            <Music size={18} />
            <span>Now Playing</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'radar' ? 'active' : ''}`}
            onClick={() => setCurrentTab('radar')}
          >
            <Compass size={18} />
            <span>Live Radar</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'matches' ? 'active' : ''}`}
            onClick={() => setCurrentTab('matches')}
          >
            <Heart size={18} />
            <span>Matches</span>
            {matches.length > 0 && <span className="nav-badge">{matches.length}</span>}
          </button>
        </nav>

        {/* Platform Broadcast Indicator */}
        <div className="platform-card" onClick={togglePlatform}>
          <div className="platform-meta">
            <span className="platform-title">Broadcast Service</span>
            <span className="platform-current">
              {user?.streaming_platform === 'spotify' ? '🟢 Spotify' : '🔴 YouTube Music'}
            </span>
          </div>
          <span className="platform-switch-hint">Switch</span>
        </div>

        {/* User Card */}
        <div className="user-profile-bar">
          <img src={user?.avatar} alt={user?.name} className="user-avatar" />
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-handle">{user?.username}</span>
          </div>
          <button className="user-action-btn" onClick={() => setShowSettingsModal(true)}>
            <Settings size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-viewport">
        {/* Top Header */}
        <header className="top-header">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search songs, artists, or vibes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="header-status">
            <span className="sync-chip">
              <span className="dot green"></span>
              {currentListeners.length} {currentListeners.length === 1 ? 'listener' : 'listeners'} synced
            </span>
            <button className="sync-btn" onClick={handleSyncToMedian}>
              <RefreshCw size={13} />
              <span>Sync Time</span>
            </button>
          </div>
        </header>

        {/* Tab 1: Now Playing Lounge */}
        {currentTab === 'lounge' && (
          <div className="lounge-stage">
            {currentSong ? (
              <div className="song-hero">
                <div className="artwork-wrapper">
                  <img src={currentSong.albumArt} alt={currentSong.title} className="hero-artwork" />
                </div>

                <div className="song-details">
                  <span className="song-vibe-tag">{currentSong.genre || 'Synchronized Track'}</span>
                  <h1 className="hero-title">{currentSong.title}</h1>
                  <h2 className="hero-artist">{currentSong.artist}</h2>
                  <p className="hero-album">{currentSong.album}</p>

                  <div className="hero-actions">
                    {currentSong.spotifyUrl && (
                      <a href={currentSong.spotifyUrl} target="_blank" rel="noreferrer" className="btn-service spotify">
                        Listen on Spotify <ExternalLink size={13} />
                      </a>
                    )}
                    {currentSong.youtubeMusicUrl && (
                      <a href={currentSong.youtubeMusicUrl} target="_blank" rel="noreferrer" className="btn-service youtube">
                        Listen on YouTube Music <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Active Listeners Strip */}
            <div className="active-listeners-panel">
              <div className="panel-title-row">
                <span className="panel-title">Active Listeners on this Track</span>
                <span className="panel-sub">Click avatar to connect 1-on-1</span>
              </div>

              <div className="listeners-strip">
                {currentListeners.map((l) => {
                  const isMe = l.userId === user?.id;
                  return (
                    <div
                      key={l.socketId || l.userId}
                      className={`listener-chip ${isMe ? 'is-me' : ''}`}
                      onClick={() => !isMe && setSelectedListener(l)}
                    >
                      <div className="chip-avatar-wrap">
                        <img src={l.avatar} alt={l.name} className="chip-avatar" />
                        <span className={`service-dot ${l.source === 'spotify' ? 'spotify' : 'youtube'}`}></span>
                      </div>
                      <span className="chip-name">{isMe ? 'You' : l.name.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live Radar (Track Discovery) */}
        {currentTab === 'radar' && (
          <div className="radar-stage">
            <h2 className="section-heading">Live Active Rooms</h2>
            <p className="section-sub">Discover songs currently being listened to across Spotify & YouTube Music</p>

            <div className="tracks-grid">
              {songs.map((song) => {
                const isSelected = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    className={`track-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectSong(song)}
                  >
                    <img src={song.albumArt} alt={song.title} className="track-art" />
                    <div className="track-card-body">
                      <div className="track-title" title={song.title}>{song.title}</div>
                      <div className="track-artist">{song.artist}</div>
                      <div className="track-footer">
                        <span className="listener-count-badge">
                          <span className="dot green"></span>
                          {song.activeListeners || 1} listening
                        </span>
                        <button className="play-track-btn">
                          {isSelected && isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Matches & DMs */}
        {currentTab === 'matches' && (
          <div className="matches-stage">
            <div className="matches-sidebar">
              <h3 className="matches-sidebar-title">Vibe Matches ({matches.length})</h3>
              <div className="matches-list">
                {matches.length === 0 ? (
                  <div className="empty-matches">No matches yet. Click any listener on Now Playing to connect!</div>
                ) : (
                  matches.map((m) => {
                    const partner = m.participants.find(p => p.id !== user?.id) || { name: 'Listener' };
                    const isSelected = selectedMatch?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`match-item ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedMatch(m)}
                      >
                        <img src={partner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'} alt="" className="match-avatar" />
                        <div className="match-item-info">
                          <span className="match-name">{partner.name}</span>
                          <span className="match-track-sub">Matched on {m.songTitle || 'Shared Track'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="chat-window">
              {selectedMatch ? (
                <>
                  <div className="chat-window-header">
                    <span className="partner-name">
                      {selectedMatch.participants.find(p => p.id !== user?.id)?.name}
                    </span>
                    <span className="partner-track">Matched on {selectedMatch.songTitle}</span>
                  </div>

                  <div className="chat-window-messages">
                    {(selectedMatch.messages || []).map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`direct-bubble ${isMe ? 'me' : 'them'}`}>
                          <div className="bubble-text">{msg.text}</div>
                        </div>
                      );
                    })}
                  </div>

                  <form className="chat-window-input-row" onSubmit={handleSendDirectMessage}>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={directInput}
                      onChange={(e) => setDirectInput(e.target.value)}
                      className="direct-input-field"
                    />
                    <button type="submit" className="direct-send-btn" disabled={!directInput.trim()}>
                      <Send size={15} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="no-chat-selected">Select a match to start chatting</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Right Sidebar: Live Lounge Chat & Reactions */}
      <aside className="right-panel">
        <div className="right-panel-header">
          <div className="header-title-wrap">
            <MessageSquare size={16} />
            <span>Room Lounge</span>
          </div>
          <span className="room-count">{currentListeners.length} here</span>
        </div>

        {/* Reaction Bar */}
        <div className="reactions-tray">
          {['🔥', '❤️', '🎧', '⚡', '👏'].map((emoji) => (
            <button key={emoji} className="emoji-btn" onClick={() => handleSendReaction(emoji)}>
              {emoji}
            </button>
          ))}
        </div>

        {/* Chat Stream */}
        <div className="lounge-messages">
          {chatMessages.length === 0 ? (
            <div className="empty-lounge">No messages yet. Say hello to fellow listeners!</div>
          ) : (
            chatMessages.map((msg) => {
              const isMe = msg.sender?.id === user?.id;
              return (
                <div key={msg.id} className={`lounge-msg ${isMe ? 'mine' : ''}`}>
                  <div className="msg-meta">
                    <span className="msg-sender">{isMe ? 'You' : msg.sender?.name || 'Listener'}</span>
                    <span className={`msg-source-dot ${msg.sender?.source === 'spotify' ? 'spotify' : 'youtube'}`}></span>
                    {msg.playbackTimestamp ? (
                      <span className="msg-time">{formatTime(msg.playbackTimestamp / 1000)}</span>
                    ) : null}
                  </div>
                  <div className="msg-body">{msg.text}</div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input */}
        <form className="lounge-input-form" onSubmit={handleSendChat}>
          <input
            type="text"
            placeholder="Share a thought or lyric..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="lounge-input"
          />
          <button type="submit" className="lounge-send-btn" disabled={!chatInput.trim()}>
            <Send size={14} />
          </button>
        </form>
      </aside>

      {/* Bottom Desktop Persistent Player */}
      <footer className="desktop-player">
        <div className="player-left">
          {currentSong && (
            <>
              <img src={currentSong.albumArt} alt="" className="player-thumb" />
              <div className="player-meta">
                <span className="player-track-name" title={currentSong.title}>{currentSong.title}</span>
                <span className="player-artist-name">{currentSong.artist}</span>
              </div>
            </>
          )}
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button className="control-btn" onClick={handleAutoAdvance} title="Previous">
              <SkipBack size={18} />
            </button>
            <button className="play-main-btn" onClick={togglePlay} title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button className="control-btn" onClick={handleAutoAdvance} title="Next">
              <SkipForward size={18} />
            </button>
          </div>

          <div className="progress-bar-row">
            <span className="time-display">{formatTime(currentTime)}</span>
            <div className="progress-track" onClick={handleSeek}>
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, (currentTime / (duration || 180)) * 100)}%` }}
              ></div>
            </div>
            <span className="time-display">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-right">
          <button className="service-switch-pill" onClick={togglePlatform}>
            {user?.streaming_platform === 'spotify' ? 'Spotify' : 'YouTube Music'}
          </button>

          <button className="volume-btn" onClick={toggleMute}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </footer>

      {/* Listener Profile Card Modal */}
      {selectedListener && (
        <div className="modal-backdrop" onClick={() => setSelectedListener(null)}>
          <div className="listener-modal-card" onClick={(e) => e.stopPropagation()}>
            <img src={selectedListener.avatar} alt="" className="modal-avatar" />
            <h3 className="modal-name">{selectedListener.name}</h3>
            <p className="modal-username">{selectedListener.username}</p>
            <p className="modal-bio">"{selectedListener.bio || 'Listening to this track'}"</p>

            <div className="modal-sync-info">
              <span className="dot green"></span>
              <span>Listening to the same song right now via {selectedListener.source === 'spotify' ? 'Spotify' : 'YouTube Music'}</span>
            </div>

            <button className="btn-match" onClick={() => handleRequestMatch(selectedListener)}>
              <Heart size={16} />
              <span>Connect & Vibe Match</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Settings</h3>
              <button onClick={() => setShowSettingsModal(false)}><X size={18} /></button>
            </div>
            <div className="settings-body">
              <div className="setting-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  onChange={(e) => {
                    const u = { ...user, name: e.target.value };
                    setUser(u);
                    localStorage.setItem('songsync_user', JSON.stringify(u));
                  }}
                  className="setting-input"
                />
              </div>

              <div className="setting-group">
                <label>Preferred Streaming App</label>
                <div className="setting-platform-row">
                  <button
                    className={`setting-platform-btn ${user?.streaming_platform === 'spotify' ? 'active-spotify' : ''}`}
                    onClick={() => {
                      const u = { ...user, streaming_platform: 'spotify' };
                      setUser(u);
                      localStorage.setItem('songsync_user', JSON.stringify(u));
                    }}
                  >
                    Spotify
                  </button>
                  <button
                    className={`setting-platform-btn ${user?.streaming_platform === 'youtube' ? 'active-youtube' : ''}`}
                    onClick={() => {
                      const u = { ...user, streaming_platform: 'youtube' };
                      setUser(u);
                      localStorage.setItem('songsync_user', JSON.stringify(u));
                    }}
                  >
                    YouTube Music
                  </button>
                </div>
              </div>

              <button
                className="btn-logout"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
              >
                <LogOut size={16} />
                <span>Switch / Reset Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
