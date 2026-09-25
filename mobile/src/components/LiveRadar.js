import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../theme';
import AudioBars from './AudioBars';

export default function LiveRadar({
  songs,
  rooms,
  currentSong,
  isPlaying,
  onSelectSong,
  onSearch,
  searchQuery,
  setSearchQuery,
}) {
  const [platformFilter, setPlatformFilter] = useState('all');

  const enrichedSongs = songs.map((song) => {
    const matchingRoom = rooms.find(
      (r) =>
        r.song?.id === song.id ||
        (r.song?.title?.toLowerCase() === song.title?.toLowerCase() &&
          r.song?.artist?.toLowerCase() === song.artist?.toLowerCase())
    );

    const listenerCount = matchingRoom ? matchingRoom.listenerCount : (song.activeListeners || 1);
    const roomListeners = matchingRoom ? matchingRoom.listeners : [];

    return {
      ...song,
      currentListeners: listenerCount,
      roomListeners,
    };
  });

  const filteredSongs = enrichedSongs.filter((song) => {
    if (platformFilter === 'all') return true;
    if (platformFilter === 'spotify') {
      return song.roomListeners.some((l) => l.source === 'spotify') || song.spotifyUrl;
    }
    if (platformFilter === 'youtube') {
      return song.roomListeners.some((l) => l.source === 'youtube') || song.youtubeMusicUrl;
    }
    return true;
  });

  const renderItem = ({ item }) => {
    const isCurrent = currentSong?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.card, isCurrent && styles.cardActive]}
        onPress={() => onSelectSong(item)}
      >
        <Image source={{ uri: item.albumArt }} style={styles.art} />

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>

          <View style={styles.metaRow}>
            <View style={styles.liveBadge}>
              <View style={styles.dot} />
              <Text style={styles.liveText}>{item.currentListeners} listening</Text>
            </View>

            <View style={styles.platformRow}>
              {item.spotifyUrl ? (
                <FontAwesome5 name="spotify" size={11} color={THEME.primary} style={{ marginRight: 6 }} />
              ) : null}
              {item.youtubeMusicUrl ? (
                <FontAwesome5 name="youtube" size={11} color={THEME.secondary} />
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.actionWrap}>
          {isCurrent && isPlaying ? (
            <AudioBars isPlaying={true} barCount={3} color={THEME.accent} />
          ) : (
            <Ionicons name="play" size={16} color={THEME.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={THEME.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search any song, artist, or vibe..."
            placeholderTextColor={THEME.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              onSearch(text);
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); onSearch(''); }}>
              <Ionicons name="close-circle" size={16} color={THEME.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, platformFilter === 'all' && styles.filterChipActive]}
            onPress={() => setPlatformFilter('all')}
          >
            <Text style={[styles.filterText, platformFilter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, platformFilter === 'spotify' && styles.filterChipActive]}
            onPress={() => setPlatformFilter('spotify')}
          >
            <FontAwesome5
              name="spotify"
              size={11}
              color={platformFilter === 'spotify' ? '#fff' : THEME.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterText, platformFilter === 'spotify' && styles.filterTextActive]}>
              Spotify
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, platformFilter === 'youtube' && styles.filterChipActive]}
            onPress={() => setPlatformFilter('youtube')}
          >
            <FontAwesome5
              name="youtube"
              size={11}
              color={platformFilter === 'youtube' ? '#fff' : THEME.secondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterText, platformFilter === 'youtube' && styles.filterTextActive]}>
              YouTube Music
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredSongs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={40} color={THEME.textMuted} />
            <Text style={styles.emptyTitle}>No songs found</Text>
            <Text style={styles.emptySub}>Try searching another title or artist</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: THEME.text,
    borderColor: THEME.text,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  filterTextActive: {
    color: '#090a0f',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  cardActive: {
    borderColor: THEME.accent,
    backgroundColor: THEME.surfaceLight,
  },
  art: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: THEME.surfaceLight,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  artist: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.success,
  },
  liveText: {
    fontSize: 10,
    color: THEME.success,
    fontWeight: '600',
  },
  platformRow: {
    flexDirection: 'row',
  },
  actionWrap: {
    paddingHorizontal: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
});
