import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function AppHeader({
  activePlatform,
  onlineCount,
  onTogglePlatform,
  onOpenProfile,
}) {
  return (
    <View style={styles.header}>
      {/* Brand */}
      <View style={styles.brandRow}>
        <Text style={styles.logoText}>SongSync</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveCount}>{onlineCount} online</Text>
        </View>
      </View>

      {/* Right Controls */}
      <View style={styles.actionsRow}>
        {/* Quick toggle platform */}
        <TouchableOpacity style={styles.platformPill} onPress={onTogglePlatform}>
          <FontAwesome5
            name={activePlatform === 'spotify' ? 'spotify' : 'youtube'}
            size={13}
            color={activePlatform === 'spotify' ? THEME.primary : THEME.secondary}
          />
          <Text style={styles.platformLabel}>
            {activePlatform === 'spotify' ? 'Spotify' : 'YT Music'}
          </Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity style={styles.profileBtn} onPress={onOpenProfile}>
          <Ionicons name="settings-outline" size={17} color={THEME.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: THEME.background,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
  },
  liveCount: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    gap: 6,
  },
  platformLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  profileBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
});
