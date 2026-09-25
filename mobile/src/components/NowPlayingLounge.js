import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../theme';
import AudioBars from './AudioBars';
import FloatingReactions from './FloatingReactions';
import ListenerModal from './ListenerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EMOJIS = ['🔥', '❤️', '🎧', '✨', '💃'];

export default function NowPlayingLounge({
  song,
  roomData,
  userProfile,
  isPlaying,
  playbackPositionMs,
  onTogglePlay,
  onSeek,
  onSendChatMessage,
  onSendReaction,
  onRequestMatch,
  onSyncToMedian,
}) {
  const [chatText, setChatText] = useState('');
  const [selectedListener, setSelectedListener] = useState(null);
  const chatScrollRef = useRef(null);

  const listeners = roomData?.listeners || [];
  const messages = roomData?.messages || [];
  const reactions = roomData?.reactions || [];

  const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const durationMs = song?.durationMs || 180000;
  const progressPercent = Math.min(100, Math.max(0, (playbackPositionMs / durationMs) * 100));

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSendChat = () => {
    if (!chatText.trim()) return;
    onSendChatMessage(chatText.trim());
    setChatText('');
  };

  const openSpotify = () => {
    if (song?.spotifyUrl) Linking.openURL(song.spotifyUrl).catch(() => {});
  };

  const openYouTubeMusic = () => {
    if (song?.youtubeMusicUrl) Linking.openURL(song.youtubeMusicUrl).catch(() => {});
  };

  if (!song) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="musical-notes-outline" size={48} color={THEME.textMuted} />
        <Text style={styles.emptyTitle}>Nothing Playing</Text>
        <Text style={styles.emptySubtitle}>Select a track from Find Songs to start listening</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FloatingReactions reactions={reactions} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sync Status Banner */}
        <View style={styles.syncRow}>
          <View style={styles.syncBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.syncText}>
              {listeners.length} {listeners.length === 1 ? 'listener' : 'listeners'} right now
            </Text>
          </View>

          <TouchableOpacity style={styles.syncActionBtn} onPress={onSyncToMedian}>
            <Ionicons name="sync-outline" size={13} color={THEME.text} />
            <Text style={styles.syncActionText}>Sync Time</Text>
          </TouchableOpacity>
        </View>

        {/* Album Artwork */}
        <View style={styles.artContainer}>
          <Image source={{ uri: song.albumArt }} style={styles.albumArt} />
          {isPlaying && (
            <View style={styles.playingPill}>
              <AudioBars isPlaying={true} barCount={4} color="#fff" />
            </View>
          )}
        </View>

        {/* Song Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>

          {/* Deep links to Spotify & YouTube Music */}
          <View style={styles.platformLinksRow}>
            <TouchableOpacity style={styles.platformButton} onPress={openSpotify}>
              <FontAwesome5 name="spotify" size={14} color={THEME.primary} />
              <Text style={styles.platformButtonText}>Spotify</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.platformButton} onPress={openYouTubeMusic}>
              <FontAwesome5 name="youtube" size={14} color={THEME.secondary} />
              <Text style={styles.platformButtonText}>YouTube Music</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Playback Progress Slider */}
        <View style={styles.progressContainer}>
          <View
            style={styles.progressBarBg}
            onTouchStart={(e) => {
              const { locationX } = e.nativeEvent;
              const ratio = Math.max(0, Math.min(1, locationX / (SCREEN_WIDTH - 64)));
              onSeek(ratio * durationMs);
            }}
          >
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(playbackPositionMs)}</Text>
            <Text style={styles.timeText}>{formatTime(durationMs)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => onSeek(Math.max(0, playbackPositionMs - 15000))}
          >
            <Ionicons name="play-back-outline" size={22} color={THEME.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playBtn} onPress={onTogglePlay}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={26}
              color="#090a0f"
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => onSeek(Math.min(durationMs, playbackPositionMs + 15000))}
          >
            <Ionicons name="play-forward-outline" size={22} color={THEME.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Active Listeners Section */}
        <View style={styles.listenersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shared Listeners</Text>
            <Text style={styles.sectionHint}>Tap to match</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarsRow}>
            {listeners.map((listener) => {
              const isMe = listener.userId === userProfile.id;
              const isSpotify = listener.source === 'spotify';

              return (
                <TouchableOpacity
                  key={listener.socketId || listener.userId}
                  style={styles.avatarCard}
                  onPress={() => !isMe && setSelectedListener(listener)}
                >
                  <View style={styles.avatarWrap}>
                    <Image source={{ uri: listener.avatar }} style={styles.avatarImg} />
                    <View
                      style={[
                        styles.platformDot,
                        { backgroundColor: isSpotify ? THEME.primary : THEME.secondary },
                      ]}
                    />
                  </View>
                  <Text style={styles.avatarName} numberOfLines={1}>
                    {isMe ? 'You' : listener.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Floating Reactions Bar */}
        <View style={styles.reactionsBar}>
          {EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiBtn}
              onPress={() => onSendReaction(emoji)}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Communal Room Chat */}
        <View style={styles.chatCard}>
          <Text style={styles.chatHeader}>Lounge Chat</Text>
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            nestedScrollEnabled
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {messages.length === 0 ? (
              <Text style={styles.emptyChatText}>No messages yet. Say hi to fellow listeners!</Text>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender?.id === userProfile.id;
                return (
                  <View
                    key={msg.id}
                    style={[styles.chatBubble, isMe ? styles.myBubble : styles.theirBubble]}
                  >
                    <Text style={styles.chatSender}>
                      {isMe ? 'You' : msg.sender?.name || 'Listener'}
                    </Text>
                    <Text style={styles.chatMsgText}>{msg.text}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Drop a vibe or thought..."
              placeholderTextColor={THEME.textMuted}
              value={chatText}
              onChangeText={setChatText}
              onSubmitEditing={handleSendChat}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !chatText.trim() && { opacity: 0.4 }]}
              onPress={handleSendChat}
              disabled={!chatText.trim()}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Listener Profile / Vibe Match Modal */}
      <ListenerModal
        visible={!!selectedListener}
        listener={selectedListener}
        onClose={() => setSelectedListener(null)}
        onMatchRequest={onRequestMatch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  syncActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  artContainer: {
    alignItems: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  albumArt: {
    width: 220,
    height: 220,
    borderRadius: 20,
    backgroundColor: THEME.surfaceLight,
  },
  playingPill: {
    position: 'absolute',
    bottom: 10,
    right: (SCREEN_WIDTH - 220) / 2 + 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
  },
  artist: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  platformLinksRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    gap: 6,
  },
  platformButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  progressContainer: {
    marginTop: 20,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.text,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    marginTop: 12,
  },
  skipBtn: {
    padding: 8,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listenersSection: {
    marginTop: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  sectionHint: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  avatarsRow: {
    flexDirection: 'row',
  },
  avatarCard: {
    alignItems: 'center',
    marginRight: 14,
    width: 50,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.surfaceLight,
  },
  platformDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: THEME.background,
  },
  avatarName: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  reactionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: THEME.surface,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    marginTop: 20,
  },
  emojiBtn: {
    paddingHorizontal: 8,
  },
  emojiText: {
    fontSize: 20,
  },
  chatCard: {
    backgroundColor: THEME.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    padding: 14,
    marginTop: 18,
    height: 220,
  },
  chatHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  chatScroll: {
    flex: 1,
  },
  emptyChatText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 30,
  },
  chatBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: '85%',
  },
  myBubble: {
    backgroundColor: THEME.accent,
    alignSelf: 'flex-end',
  },
  theirBubble: {
    backgroundColor: THEME.surfaceLight,
    alignSelf: 'flex-start',
  },
  chatSender: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  chatMsgText: {
    fontSize: 13,
    color: '#fff',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: THEME.surfaceLight,
    color: THEME.text,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  sendBtn: {
    backgroundColor: THEME.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
