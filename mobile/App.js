import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socket, initializeUserSession, SERVER_URL } from './src/socket';
import { THEME } from './src/theme';
import { audioEngine } from './src/utils/audioEngine';
import AppHeader from './src/components/AppHeader';
import BottomTabBar from './src/components/BottomTabBar';
import NowPlayingLounge from './src/components/NowPlayingLounge';
import LiveRadar from './src/components/LiveRadar';
import VibeMatches from './src/components/VibeMatches';
import ProfileSettings from './src/components/ProfileSettings';
import AuthModal from './src/components/AuthModal';
import ToastNotification from './src/components/ToastNotification';

const STORAGE_KEY_TOKEN = 'songsync_auth_token';
const STORAGE_KEY_USER = 'songsync_user_profile';

export default function App() {
  const [currentTab, setCurrentTab] = useState('lounge'); // 'lounge' | 'radar' | 'matches'
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  // User Profile
  const [userProfile, setUserProfile] = useState(null);

  // Songs & Rooms Data
  const [songs, setSongs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);

  // Vibe Matches & DMs
  const [matches, setMatches] = useState([]);

  // Toast Notification state
  const [activeToast, setActiveToast] = useState(null);

  const songsRef = useRef([]);
  songsRef.current = songs;
  const currentSongRef = useRef(null);
  currentSongRef.current = currentSong;

  // Initialize Auth state from AsyncStorage
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEY_USER);

      if (storedToken && storedUser) {
        setAuthToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUserProfile(parsedUser);
        initializeUserSession(parsedUser);
        fetchMatches(storedToken);
      } else {
        // Show auth modal for first-time public users
        setShowAuthModal(true);
      }
    } catch (e) {
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = async (user, token) => {
    setUserProfile(user);
    setAuthToken(token);
    setShowAuthModal(false);

    try {
      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch (_) {}

    initializeUserSession(user);
    fetchMatches(token);

    setActiveToast({
      title: `Welcome, ${user.name}!`,
      message: 'You are now live on SongSync. Tune in and connect!',
      icon: 'sparkles',
      iconColor: THEME.accent,
    });
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEY_USER);
    } catch (_) {}

    setAuthToken(null);
    setUserProfile(null);
    setShowSettings(false);
    setShowAuthModal(true);
  };

  // Setup audio callbacks & queue auto-play
  useEffect(() => {
    audioEngine.setCallbacks({
      onProgress: (posMs) => {
        setPlaybackPositionMs(posMs);
      },
      onEnd: () => {
        // Auto advance to next song in the queue for seamless listening
        handleAutoAdvance();
      },
    });

    return () => {
      audioEngine.stop();
    };
  }, []);

  const handleAutoAdvance = () => {
    const list = songsRef.current;
    const current = currentSongRef.current;
    if (list.length === 0) return;

    const currentIndex = list.findIndex((s) => s.id === current?.id);
    const nextIndex = (currentIndex + 1) % list.length;
    handleSelectSong(list[nextIndex]);
  };

  // Keyboard shortcut for Web (Space to play/pause)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleTogglePlay();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlaying]);

  // Fetch initial catalog and active rooms
  useEffect(() => {
    fetchSongsAndRooms();

    socket.on('connect', () => {
      console.log('Connected to SongSync server');
    });

    socket.on('room:joined', (data) => {
      setCurrentRoom(data);
    });

    socket.on('room:listeners_updated', (data) => {
      setCurrentRoom((prev) => {
        if (!prev) return prev;
        const newCount = data.listeners.length;
        const prevCount = prev.listeners?.length || 0;
        if (newCount > prevCount && prev.listeners) {
          const joined = data.listeners.find(
            (nl) => !prev.listeners.some((ol) => ol.userId === nl.userId)
          );
          if (joined && joined.userId !== userProfile?.id) {
            setActiveToast({
              title: `${joined.name} tuned in`,
              message: `Now listening via ${joined.source === 'spotify' ? 'Spotify' : 'YouTube Music'}`,
              icon: 'headset',
              iconColor: THEME.success,
            });
          }
        }
        return { ...prev, listeners: data.listeners };
      });
    });

    socket.on('room:new_message', (message) => {
      setCurrentRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), message],
        };
      });
    });

    socket.on('room:new_reaction', (reaction) => {
      setCurrentRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reactions: [...(prev.reactions || []).slice(-8), reaction],
        };
      });
    });

    socket.on('radar:updated', (roomsData) => {
      setRooms(roomsData);
    });

    socket.on('direct:match_received', ({ requester, songTitle, songArtist }) => {
      setActiveToast({
        title: 'New Vibe Match Request! 🎶',
        message: `${requester.name} is listening to "${songTitle}" with you. Tap to connect!`,
        icon: 'heart',
        iconColor: THEME.accent,
        onPress: () => {
          socket.emit('direct:match_accept', {
            requesterSocketId: requester.socketId,
            requesterUserId: requester.id,
            songTitle,
            songArtist,
          });
        },
      });
    });

    socket.on('direct:match_accepted', (conversation) => {
      setMatches((prev) => {
        const exists = prev.some((m) => m.id === conversation.id);
        if (exists) return prev;
        return [conversation, ...prev];
      });
      setCurrentTab('matches');
      setActiveToast({
        title: 'Connected! 🤝',
        message: 'You have a new Vibe Match! Start chatting now.',
        icon: 'chatbubble',
        iconColor: THEME.accent,
      });
    });

    socket.on('direct:new_message', ({ matchId, message }) => {
      setMatches((prev) =>
        prev.map((conv) => {
          if (conv.id === matchId) {
            return {
              ...conv,
              messages: [...conv.messages, message],
            };
          }
          return conv;
        })
      );
    });

    return () => {
      socket.off('connect');
      socket.off('room:joined');
      socket.off('room:listeners_updated');
      socket.off('room:new_message');
      socket.off('room:new_reaction');
      socket.off('radar:updated');
      socket.off('direct:match_received');
      socket.off('direct:match_accepted');
      socket.off('direct:new_message');
    };
  }, [userProfile]);

  const fetchSongsAndRooms = async () => {
    try {
      const [resSongs, resRooms] = await Promise.all([
        fetch(`${SERVER_URL}/api/songs`).then((r) => r.json()),
        fetch(`${SERVER_URL}/api/rooms`).then((r) => r.json()),
      ]);
      setSongs(resSongs);
      setRooms(resRooms);

      if (resSongs.length > 0 && !currentSong) {
        handleSelectSong(resSongs[0]);
      }
    } catch (e) {
      console.error('Failed to load songs:', e);
    }
  };

  const fetchMatches = async (token) => {
    if (!token) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (_) {}
  };

  // Sync position tick with server
  useEffect(() => {
    let interval = null;
    if (isPlaying && currentSong) {
      interval = setInterval(() => {
        socket.emit('song:sync_position', {
          positionMs: playbackPositionMs,
          isPlaying: true,
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackPositionMs, currentSong]);

  // Play/Pause
  const handleTogglePlay = async () => {
    if (isPlaying) {
      await audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.resume();
      setIsPlaying(true);
    }
    socket.emit('song:sync_position', {
      positionMs: playbackPositionMs,
      isPlaying: !isPlaying,
    });
  };

  // Seek
  const handleSeek = async (newPosMs) => {
    setPlaybackPositionMs(newPosMs);
    await audioEngine.seek(newPosMs);
    socket.emit('song:sync_position', {
      positionMs: newPosMs,
      isPlaying,
    });
  };

  // Sync to median room timestamp
  const handleSyncToMedian = () => {
    if (!currentRoom?.listeners || currentRoom.listeners.length === 0) return;
    const positions = currentRoom.listeners
      .map((l) => l.positionMs || 0)
      .sort((a, b) => a - b);
    const median = positions[Math.floor(positions.length / 2)] || 0;
    handleSeek(median);

    setActiveToast({
      title: 'Synchronized!',
      message: 'Your playback snapped to the room timestamp.',
      icon: 'sync',
      iconColor: THEME.success,
    });
  };

  // Select song
  const handleSelectSong = async (song) => {
    setCurrentSong(song);
    setPlaybackPositionMs(0);
    setIsPlaying(true);

    socket.emit('song:start_listening', {
      song,
      positionMs: 0,
      isPlaying: true,
      source: userProfile?.source || 'spotify',
    });

    if (song.previewUrl) {
      await audioEngine.play(song.previewUrl, 0);
    }

    setCurrentTab('lounge');
  };

  // Search
  const handleSearch = async (query) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSongs(data);
    } catch (e) {
      console.error('Search failed:', e);
    }
  };

  // Toggle platform between Spotify and YouTube Music
  const handleTogglePlatform = async () => {
    if (!userProfile) return;
    const nextSource = userProfile.source === 'spotify' ? 'youtube' : 'spotify';
    const updated = { ...userProfile, source: nextSource };
    setUserProfile(updated);
    initializeUserSession(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (_) {}

    if (currentSong) {
      socket.emit('song:start_listening', {
        song: currentSong,
        positionMs: playbackPositionMs,
        isPlaying,
        source: nextSource,
      });
    }

    setActiveToast({
      title: 'Platform Switched',
      message: `Now broadcasting as ${nextSource === 'spotify' ? 'Spotify' : 'YouTube Music'} listener.`,
      icon: 'radio',
      iconColor: nextSource === 'spotify' ? THEME.primary : THEME.secondary,
    });
  };

  const handleUpdateProfile = async (newProfile) => {
    setUserProfile(newProfile);
    initializeUserSession(newProfile);

    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newProfile));
    } catch (_) {}

    if (authToken) {
      fetch(`${SERVER_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newProfile),
      }).catch(() => {});
    }
  };

  const onlineCount = rooms.reduce((acc, r) => acc + (r.listenerCount || 0), 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.background} />

      <View style={styles.shell}>
        {/* Toast Notifications */}
        <ToastNotification
          toast={activeToast}
          onDismiss={() => setActiveToast(null)}
          onPress={(toast) => {
            if (toast.onPress) toast.onPress();
          }}
        />

        {/* App Header */}
        <AppHeader
          activePlatform={userProfile?.source || 'spotify'}
          onlineCount={onlineCount}
          onTogglePlatform={handleTogglePlatform}
          onOpenProfile={() => setShowSettings(true)}
        />

        {/* Main Tab Content */}
        <View style={styles.content}>
          {currentTab === 'lounge' && (
            <NowPlayingLounge
              song={currentSong}
              roomData={currentRoom}
              userProfile={userProfile || { id: 'guest', name: 'Listener', source: 'spotify' }}
              isPlaying={isPlaying}
              playbackPositionMs={playbackPositionMs}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onSendChatMessage={(text) => socket.emit('room:send_message', { text })}
              onSendReaction={(emoji) => socket.emit('room:send_reaction', { emoji })}
              onRequestMatch={(targetListener) =>
                socket.emit('direct:match_request', {
                  targetUserId: targetListener.userId,
                  targetSocketId: targetListener.socketId,
                })
              }
              onSyncToMedian={handleSyncToMedian}
            />
          )}

          {currentTab === 'radar' && (
            <LiveRadar
              songs={songs}
              rooms={rooms}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onSelectSong={handleSelectSong}
              onSearch={handleSearch}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}

          {currentTab === 'matches' && (
            <VibeMatches
              matches={matches}
              currentUserId={userProfile?.id}
              onSendDirectMessage={(payload) => socket.emit('direct:send_message', payload)}
            />
          )}
        </View>

        {/* Bottom Navigation */}
        <BottomTabBar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          matchCount={matches.length}
        />

        {/* Settings Modal */}
        {userProfile && (
          <ProfileSettings
            visible={showSettings}
            onClose={() => setShowSettings(false)}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
          />
        )}

        {/* Auth / Onboarding Modal for Public Users */}
        <AuthModal
          visible={showAuthModal}
          onAuthSuccess={handleAuthSuccess}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 440 : '100%',
    alignSelf: 'center',
    backgroundColor: THEME.background,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: THEME.surfaceBorder,
    position: 'relative',
  },
  content: {
    flex: 1,
  },
});
