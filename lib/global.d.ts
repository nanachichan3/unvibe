// Global type augmentations for UnVibe

declare global {
  interface Window {
    /** Timestamp when the current game round started (ms) */
    __unvibe_round_start?: number;
  }
}

export {};
