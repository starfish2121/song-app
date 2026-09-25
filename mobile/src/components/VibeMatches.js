import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function VibeMatches({
  matches,
  currentUserId,
  onSendDirectMessage,
}) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [inputText, setInputText] = useState('');

  const currentMatch = matches.find((m) => m.id === selectedMatch?.id) || selectedMatch;

  const handleSend = () => {
    if (!inputText.trim() || !currentMatch) return;
    const otherParticipant = currentMatch.participants.find((p) => p.id !== currentUserId);
    onSendDirectMessage({
      matchId: currentMatch.id,
      text: inputText.trim(),
      recipientSocketId: otherParticipant?.socketId,
    });
    setInputText('');
  };

  if (currentMatch) {
    const partner = currentMatch.participants.find((p) => p.id !== currentUserId) || {
      name: 'Listener',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      source: 'spotify',
    };

    return (
      <View style={styles.chatView}>
        <View style={styles.chatNav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedMatch(null)}>
            <Ionicons name="arrow-back" size={20} color={THEME.text} />
          </TouchableOpacity>
          <Image source={{ uri: partner.avatar }} style={styles.chatAvatar} />
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatName}>{partner.name}</Text>
            <Text style={styles.chatSub}>
              via {partner.source === 'spotify' ? 'Spotify' : 'YouTube Music'}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.messagesScroll}
          contentContainerStyle={{ padding: 16, gap: 10 }}
        >
          <View style={styles.contextPill}>
            <Ionicons name="sparkles" size={13} color={THEME.accent} />
            <Text style={styles.contextText}>Connected while listening to the same song</Text>
          </View>

          {currentMatch.messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <View
                key={msg.id}
                style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}
              >
                <Text style={styles.bubbleText}>{msg.text}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            placeholder="Type a message..."
            placeholderTextColor={THEME.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const partner = item.participants.find((p) => p.id !== currentUserId) || {
            name: 'Connected Listener',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
            source: 'spotify',
          };
          const lastMsg = item.messages[item.messages.length - 1];

          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedMatch(item)}>
              <Image source={{ uri: partner.avatar }} style={styles.avatar} />
              <View style={styles.details}>
                <Text style={styles.name}>{partner.name}</Text>
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {lastMsg ? lastMsg.text : 'Connected! Start chatting.'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="heart-outline" size={44} color={THEME.textMuted} />
            <Text style={styles.emptyTitle}>No Matches Yet</Text>
            <Text style={styles.emptySub}>
              Tap any listener's avatar on the Now Playing screen to connect 1-on-1!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  list: {
    padding: 20,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.surfaceLight,
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  lastMsg: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 70,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  chatView: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  chatNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.surfaceBorder,
    backgroundColor: THEME.surface,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  chatAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  chatHeaderInfo: {
    marginLeft: 10,
    flex: 1,
  },
  chatName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  chatSub: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  messagesScroll: {
    flex: 1,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    gap: 6,
    marginBottom: 8,
  },
  contextText: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: THEME.accent,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: THEME.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  bubbleText: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.surfaceBorder,
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: THEME.surfaceLight,
    color: THEME.text,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    fontSize: 13,
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
