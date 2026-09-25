import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function ToastNotification({ toast, onDismiss, onPress }) {
  const animY = useRef(new Animated.Value(-80)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    Animated.parallel([
      Animated.spring(animY, {
        toValue: 16,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleDismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(animY, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: animY }],
          opacity: animOpacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.inner}
        activeOpacity={0.85}
        onPress={() => {
          if (onPress) onPress(toast);
          handleDismiss();
        }}
      >
        <View style={styles.iconCircle}>
          <Ionicons
            name={toast.icon || 'notifications'}
            size={16}
            color={toast.iconColor || THEME.accent}
          />
        </View>
        <View style={styles.textWrap}>
          {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
          <Ionicons name="close" size={14} color={THEME.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    width: '100%',
    maxWidth: 400,
    gap: 10,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
  },
  message: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
});
