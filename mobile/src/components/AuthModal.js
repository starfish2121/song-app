import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../theme';
import { SERVER_URL } from '../socket';

export default function AuthModal({ visible, onAuthSuccess }) {
  const [mode, setMode] = useState('welcome'); // 'welcome' | 'login' | 'register'
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [streamingPlatform, setStreamingPlatform] = useState('spotify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enter as guest');
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`,
          email: email.trim().toLowerCase(),
          password,
          streaming_platform: streamingPlatform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          {/* Logo & Headline */}
          <View style={styles.brandRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="radio" size={20} color="#fff" />
            </View>
            <Text style={styles.brandTitle}>SongSync</Text>
          </View>
          <Text style={styles.brandTagline}>Hear Together. Connect in Real Time.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Welcome Screen */}
          {mode === 'welcome' && (
            <View style={styles.welcomeSection}>
              <TouchableOpacity
                style={styles.guestBtn}
                onPress={handleGuestLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#090a0f" />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color="#090a0f" style={{ marginRight: 6 }} />
                    <Text style={styles.guestBtnText}>Instant Start as Guest</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or have an account?</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.accountButtonsRow}>
                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => { setMode('login'); setError(''); }}
                >
                  <Text style={styles.outlineBtnText}>Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, styles.primaryOutlineBtn]}
                  onPress={() => { setMode('register'); setError(''); }}
                >
                  <Text style={[styles.outlineBtnText, styles.primaryOutlineBtnText]}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Login Screen */}
          {mode === 'login' && (
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Welcome Back</Text>

              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={THEME.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={THEME.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#090a0f" />
                ) : (
                  <Text style={styles.submitBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => { setMode('welcome'); setError(''); }}
              >
                <Text style={styles.backLinkText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Register Screen */}
          {mode === 'register' && (
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Create Free Account</Text>

              <TextInput
                style={styles.input}
                placeholder="Full Name (e.g. Maya Chen)"
                placeholderTextColor={THEME.textMuted}
                value={name}
                onChangeText={setName}
              />

              <TextInput
                style={styles.input}
                placeholder="Username (e.g. @mayabeats)"
                placeholderTextColor={THEME.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={THEME.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={THEME.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* Streaming Choice */}
              <View style={styles.platformPickRow}>
                <TouchableOpacity
                  style={[
                    styles.platformOption,
                    streamingPlatform === 'spotify' && styles.platformOptionActive,
                  ]}
                  onPress={() => setStreamingPlatform('spotify')}
                >
                  <FontAwesome5
                    name="spotify"
                    size={14}
                    color={streamingPlatform === 'spotify' ? '#fff' : THEME.primary}
                  />
                  <Text
                    style={[
                      styles.platformOptionText,
                      streamingPlatform === 'spotify' && styles.platformOptionTextActive,
                    ]}
                  >
                    Spotify
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.platformOption,
                    streamingPlatform === 'youtube' && styles.platformOptionActiveYT,
                  ]}
                  onPress={() => setStreamingPlatform('youtube')}
                >
                  <FontAwesome5
                    name="youtube"
                    size={14}
                    color={streamingPlatform === 'youtube' ? '#fff' : THEME.secondary}
                  />
                  <Text
                    style={[
                      styles.platformOptionText,
                      streamingPlatform === 'youtube' && styles.platformOptionTextActive,
                    ]}
                  >
                    YouTube Music
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#090a0f" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => { setMode('welcome'); setError(''); }}
              >
                <Text style={styles.backLinkText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 10,
    width: '100%',
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
    fontWeight: '600',
  },
  welcomeSection: {
    width: '100%',
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.text,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
  },
  guestBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#090a0f',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.surfaceBorder,
  },
  dividerText: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  accountButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    alignItems: 'center',
    backgroundColor: THEME.surfaceLight,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  primaryOutlineBtn: {
    borderColor: THEME.accent,
  },
  primaryOutlineBtnText: {
    color: THEME.accent,
  },
  formSection: {
    width: '100%',
    gap: 10,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  input: {
    backgroundColor: THEME.surfaceLight,
    color: THEME.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  platformPickRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  platformOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: THEME.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
  },
  platformOptionActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  platformOptionActiveYT: {
    backgroundColor: THEME.secondary,
    borderColor: THEME.secondary,
  },
  platformOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  platformOptionTextActive: {
    color: '#fff',
  },
  submitBtn: {
    backgroundColor: THEME.accent,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  backLinkText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
});
