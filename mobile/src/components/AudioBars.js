import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { THEME } from '../theme';

export default function AudioBars({ isPlaying = true, barCount = 5, color = THEME.accent }) {
  const animations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (!isPlaying) {
      animations.forEach(anim => anim.setValue(0.2));
      return;
    }

    const loops = animations.map((anim, i) => {
      const minHeight = 0.2;
      const maxHeight = 0.9 + Math.random() * 0.1;
      const duration = 300 + (i * 120) % 400;

      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxHeight,
            duration: duration,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: minHeight,
            duration: duration,
            useNativeDriver: false,
          }),
        ])
      );
    });

    loops.forEach(loop => loop.start());

    return () => {
      loops.forEach(loop => loop.stop());
    };
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      {animations.map((anim, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['4px', '22px'],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    justifyContent: 'center',
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
  },
});
