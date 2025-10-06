/**
 * Haptic Feedback Utility
 * Provides safe vibration API access with proper error handling
 */

/**
 * Triggers haptic feedback on supported devices
 * @param duration - Duration of vibration in milliseconds (default: 10ms)
 */
export const triggerHaptic = (duration: number = 10): void => {
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(duration);
    }
  } catch (error) {
    // Silently fail - vibration is a nice-to-have feature
    console.debug('[Haptic] Vibration not available:', error);
  }
};

/**
 * Triggers a short haptic pulse
 */
export const hapticClick = (): void => triggerHaptic(10);

/**
 * Triggers a medium haptic pulse
 */
export const hapticNotification = (): void => triggerHaptic(20);

/**
 * Triggers a long haptic pulse for errors
 */
export const hapticError = (): void => triggerHaptic(30);

/**
 * Triggers a pattern of haptic pulses
 * @param pattern - Array of vibration durations and pauses
 */
export const hapticPattern = (pattern: number[]): void => {
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.debug('[Haptic] Vibration pattern not available:', error);
  }
};
