import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function SingleFloatingEmoji({ emoji, userName, onComplete }) {
  const animY = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;
  const animScale = useRef(new Animated.Value(0.5)).current;
  const randomX = useRef(Math.floor(Math.random() * 120) - 60).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animY, {
        toValue: -220,
        duration: 2200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(animScale, {
          toValue: 1.4,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(animScale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(animOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (onComplete) onComplete();
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.emojiBubble,
        {
          transform: [
            { translateY: animY },
            { translateX: randomX },
            { scale: animScale },
          ],
          opacity: animOpacity,
        },
      ]}
    >
      <Text style={styles.emojiText}>{emoji}</Text>
      {userName ? <Text style={styles.userLabel}>{userName.split(' ')[0]}</Text> : null}
    </Animated.View>
  );
}

export default function FloatingReactions({ reactions, onReactionDone }) {
  return (
    <View pointerEvents="none" style={styles.overlay}>
      {reactions.map((r) => (
        <SingleFloatingEmoji
          key={r.id}
          emoji={r.emoji}
          userName={r.userName}
          onComplete={() => onReactionDone && onReactionDone(r.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  emojiBubble: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 27, 40, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  emojiText: {
    fontSize: 28,
  },
  userLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
});
