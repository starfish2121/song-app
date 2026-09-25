import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../theme';
import { SERVER_URL } from '../socket';

export default function ProfileSettings({
  visible,
  onClose,
  userProfile,
  onUpdateProfile,
  onLogout,
}) {
  const [name, setName] = useState(userProfile.name);
  const [username, setUsername] = useState(userProfile.username);
  const [bio, setBio] = useState(userProfile.bio);
  const [source, setSource] = useState(userProfile.source || 'spotify');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateProfile({
      ...userProfile,
      name,
      username,
      bio,
      source,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleConnectSpotify = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/spotify/auth-url?userId=${encodeURIComponent(userProfile.id)}`);
      const data = await res.json();
      if (data.url) {
        Linking.openURL(data.url).catch(() => {});
      } else {
        alert('Spotify OAuth credentials not yet set in server .env. The app is running with seamless in-app streaming.');
      }
    } catch (_) {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Account & Preferences</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {/* Account Status */}
            <View style={styles.statusPillRow}>
              <View style={styles.accountBadge}>
                <Ionicons
                  name={userProfile.is_guest ? 'person-outline' : 'shield-checkmark'}
                  size={12}
                  color={THEME.accent}
                />
                <Text style={styles.accountBadgeText}>
                  {userProfile.is_guest ? 'Guest Session' : 'Registered Member'}
                </Text>
              </View>
            </View>

            {/* Default music app */}
            <View>
              <Text style={styles.label}>Broadcast Platform</Text>
              <View style={styles.platformRow}>
                <TouchableOpacity
                  style={[
                    styles.platformChoice,
                    source === 'spotify' && styles.platformChoiceActive,
                  ]}
                  onPress={() => setSource('spotify')}
                >
                  <FontAwesome5
                    name="spotify"
                    size={15}
                    color={source === 'spotify' ? '#fff' : THEME.primary}
                  />
                  <Text
                    style={[
                      styles.platformChoiceText,
                      source === 'spotify' && styles.platformChoiceTextActive,
                    ]}
                  >
                    Spotify
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.platformChoice,
                    source === 'youtube' && styles.platformChoiceActiveYT,
                  ]}
                  onPress={() => setSource('youtube')}
                >
                  <FontAwesome5
                    name="youtube"
                    size={15}
                    color={source === 'youtube' ? '#fff' : THEME.secondary}
                  />
                  <Text
                    style={[
                      styles.platformChoiceText,
                      source === 'youtube' && styles.platformChoiceTextActive,
                    ]}
                  >
                    YouTube Music
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Spotify OAuth connect button */}
            <TouchableOpacity style={styles.spotifyOAuthBtn} onPress={handleConnectSpotify}>
              <FontAwesome5 name="spotify" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.spotifyOAuthBtnText}>Connect Spotify Account</Text>
            </TouchableOpacity>

            {/* Profile fields */}
            <View>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            <View>
              <Text style={styles.label}>Handle</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="@handle"
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            <View>
              <Text style={styles.label}>Music Bio</Text>
              <TextInput
                style={[styles.input, { height: 50, textAlignVertical: 'top' }]}
                value={bio}
                onChangeText={setBio}
                multiline
                placeholder="Your music vibe..."
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {saved ? 'Saved ✓' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            {/* Logout / Switch Account */}
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
              <Text style={styles.logoutBtnText}>Switch Account / Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
  },
  closeBtn: {
    padding: 4,
  },
  statusPillRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    gap: 6,
  },
  accountBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 6,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 8,
  },
  platformChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: THEME.surfaceLight,
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  platformChoiceActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  platformChoiceActiveYT: {
    backgroundColor: THEME.secondary,
    borderColor: THEME.secondary,
  },
  platformChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  platformChoiceTextActive: {
    color: '#fff',
  },
  spotifyOAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803d',
    paddingVertical: 10,
    borderRadius: 12,
  },
  spotifyOAuthBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: THEME.surfaceLight,
    color: THEME.text,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  saveBtn: {
    backgroundColor: THEME.text,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#090a0f',
    fontWeight: '700',
    fontSize: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
