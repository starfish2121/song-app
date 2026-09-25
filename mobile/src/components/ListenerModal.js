import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Pressable } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function ListenerModal({ visible, listener, onClose, onMatchRequest }) {
  if (!listener) return null;

  const isSpotify = listener.source === 'spotify';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={THEME.textSecondary} />
          </TouchableOpacity>

          {/* Profile Header */}
          <View style={styles.header}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: listener.avatar }} style={styles.avatar} />
              <View
                style={[
                  styles.platformBadge,
                  { backgroundColor: isSpotify ? THEME.primary : THEME.secondary },
                ]}
              >
                <FontAwesome5
                  name={isSpotify ? 'spotify' : 'youtube'}
                  size={12}
                  color="#fff"
                />
              </View>
            </View>

            <Text style={styles.name}>{listener.name}</Text>
            <Text style={styles.username}>{listener.username}</Text>

            {listener.city && (
              <View style={styles.cityRow}>
                <Ionicons name="location-sharp" size={12} color={THEME.textMuted} />
                <Text style={styles.cityText}>{listener.city}</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {listener.bio && (
            <View style={styles.bioBox}>
              <Text style={styles.bioText}>"{listener.bio}"</Text>
            </View>
          )}

          {/* Listening details */}
          <View style={styles.syncInfoRow}>
            <View style={styles.syncIndicator}>
              <View style={styles.pulseDot} />
              <Text style={styles.syncStatusText}>Listening to same song right now</Text>
            </View>
            <View style={styles.platformPill}>
              <Text style={styles.platformPillText}>
                Via {isSpotify ? 'Spotify' : 'YouTube Music'}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.matchButton}
              onPress={() => {
                onMatchRequest(listener);
                onClose();
              }}
            >
              <Ionicons name="heart" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.matchButtonText}>Connect & Vibe Match</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 15,
    backgroundColor: THEME.surfaceLight,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: THEME.accent,
  },
  platformBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.surface,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
  },
  username: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  cityText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  bioBox: {
    backgroundColor: THEME.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  bioText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  syncInfoRow: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.success,
  },
  syncStatusText: {
    fontSize: 12,
    color: THEME.success,
    fontWeight: '600',
  },
  platformPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  platformPillText: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  actionRow: {
    marginTop: 22,
    width: '100%',
  },
  matchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  matchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
