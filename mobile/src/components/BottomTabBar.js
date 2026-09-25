import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function BottomTabBar({
  currentTab,
  onSelectTab,
  matchCount = 0,
}) {
  const tabs = [
    {
      id: 'lounge',
      label: 'Now Playing',
      iconActive: 'musical-notes',
      iconInactive: 'musical-notes-outline',
    },
    {
      id: 'radar',
      label: 'Find Songs',
      iconActive: 'compass',
      iconInactive: 'compass-outline',
    },
    {
      id: 'matches',
      label: 'Matches',
      iconActive: 'heart',
      iconInactive: 'heart-outline',
      badge: matchCount,
    },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onSelectTab(tab.id)}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={isActive ? tab.iconActive : tab.iconInactive}
                size={22}
                color={isActive ? THEME.text : THEME.textMuted}
              />
              {tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.surfaceBorder,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    height: Platform.OS === 'ios' ? 74 : 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: '600',
    marginTop: 3,
  },
  activeTabLabel: {
    color: THEME.text,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -8,
    backgroundColor: THEME.accent,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});
