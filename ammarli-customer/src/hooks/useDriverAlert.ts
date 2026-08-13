import { useEffect, useRef } from 'react';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';

/**
 * useDriverAlert — plays looping vibration + in-app sound while `isActive` is true.
 * Automatically stops and unloads when `isActive` becomes false or component unmounts.
 *
 * Designed to accompany the NewOrderCard popup for its full countdown duration.
 *
 * @param isActive  true = start alert loop, false = stop everything immediately.
 */
export function useDriverAlert(isActive: boolean) {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let cancelled = false;
    let vibrationInterval: ReturnType<typeof setInterval> | null = null;

    async function startAlert() {
      // ── 1. Looping vibration via setInterval (vibrate → pause → repeat) ──────
      // React Native's Vibration.vibrate() with repeat=true is unreliable on some
      // Android versions, so we use setInterval for precise control.
      Vibration.vibrate([0, 500, 250, 500]); // fire immediately
      vibrationInterval = setInterval(() => {
        if (!cancelled) {
          Vibration.vibrate([0, 500, 250, 500]);
        }
      }, 1500); // repeat every 1.5 s (matches pattern duration)

      try {
        // ── 2. iOS silent-mode override ─────────────────────────────────────────
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // ── 3. Load sound ────────────────────────────────────────────────────────
        // 📌 Place your alert file at: assets/sounds/alert.mp3
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/alert.mp3'),
          {
            isLooping: true,   // loop until we explicitly stop it
            shouldPlay: true,  // start playback immediately after load
          }
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
      } catch (error) {
        // Missing sound file during dev? Vibration still fires.
        console.warn('[useDriverAlert] Could not play alert sound:', error);
      }
    }

    async function stopAlert() {
      cancelled = true;

      // Stop vibration loop
      if (vibrationInterval) clearInterval(vibrationInterval);
      Vibration.cancel();

      // Stop + unload sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (_) {}
        soundRef.current = null;
      }
    }

    if (isActive) {
      startAlert();
    } else {
      stopAlert();
    }

    return () => {
      stopAlert();
    };
  }, [isActive]);
}
