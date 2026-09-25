import { Platform } from 'react-native';
import { Audio } from 'expo-av';

class AudioEngine {
  constructor() {
    this.htmlAudio = null;
    this.expoSound = null;
    this.currentUrl = null;
    this.isPlaying = false;
    this.onProgressCallback = null;
    this.onEndCallback = null;
    this.progressInterval = null;

    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
    }
  }

  setCallbacks({ onProgress, onEnd }) {
    this.onProgressCallback = onProgress;
    this.onEndCallback = onEnd;
  }

  async play(url, positionMs = 0) {
    if (!url) return;

    if (Platform.OS === 'web') {
      try {
        if (this.htmlAudio) {
          this.htmlAudio.pause();
          this.htmlAudio.src = '';
        }

        const audio = new window.Audio(url);
        this.htmlAudio = audio;
        this.currentUrl = url;
        audio.currentTime = positionMs / 1000;

        audio.onended = () => {
          this.isPlaying = false;
          if (this.onEndCallback) this.onEndCallback();
        };

        await audio.play();
        this.isPlaying = true;
        this.startTicker();
      } catch (err) {
        console.warn('Web Audio Play error (often requires initial user gesture):', err);
        this.isPlaying = true; // Still report playing for UI
      }
    } else {
      // Native Expo AV
      try {
        if (this.expoSound) {
          await this.expoSound.unloadAsync().catch(() => {});
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, positionMillis: positionMs, isLooping: true },
          (status) => {
            if (status.isLoaded) {
              this.isPlaying = status.isPlaying;
              if (this.onProgressCallback && status.positionMillis !== undefined) {
                this.onProgressCallback(status.positionMillis);
              }
            }
          }
        );
        this.expoSound = sound;
        this.currentUrl = url;
        this.isPlaying = true;
      } catch (err) {
        console.warn('Expo AV Native Play error:', err);
        this.isPlaying = true;
      }
    }
  }

  async pause() {
    this.isPlaying = false;
    this.stopTicker();

    if (Platform.OS === 'web' && this.htmlAudio) {
      try {
        this.htmlAudio.pause();
      } catch (_) {}
    } else if (this.expoSound) {
      try {
        await this.expoSound.pauseAsync();
      } catch (_) {}
    }
  }

  async resume() {
    this.isPlaying = true;
    if (Platform.OS === 'web' && this.htmlAudio) {
      try {
        await this.htmlAudio.play();
        this.startTicker();
      } catch (_) {}
    } else if (this.expoSound) {
      try {
        await this.expoSound.playAsync();
      } catch (_) {}
    }
  }

  async seek(positionMs) {
    if (Platform.OS === 'web' && this.htmlAudio) {
      try {
        this.htmlAudio.currentTime = positionMs / 1000;
      } catch (_) {}
    } else if (this.expoSound) {
      try {
        await this.expoSound.setPositionAsync(positionMs);
      } catch (_) {}
    }
  }

  startTicker() {
    this.stopTicker();
    this.progressInterval = setInterval(() => {
      if (Platform.OS === 'web' && this.htmlAudio && this.isPlaying) {
        const ms = Math.floor(this.htmlAudio.currentTime * 1000);
        if (this.onProgressCallback) {
          this.onProgressCallback(ms);
        }
      }
    }, 500);
  }

  stopTicker() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async stop() {
    this.isPlaying = false;
    this.stopTicker();
    if (Platform.OS === 'web' && this.htmlAudio) {
      try {
        this.htmlAudio.pause();
        this.htmlAudio = null;
      } catch (_) {}
    } else if (this.expoSound) {
      try {
        await this.expoSound.unloadAsync();
        this.expoSound = null;
      } catch (_) {}
    }
  }
}

export const audioEngine = new AudioEngine();
