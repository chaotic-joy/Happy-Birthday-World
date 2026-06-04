import { SOUND_FILE } from './config.js';

// Loads and plays the celebration sound that fires when the lights go out.
// Degrades gracefully if the user hasn't dropped a file at public/sounds/start.mp3.
export class Celebration {
  constructor() {
    this.audio = new Audio(SOUND_FILE);
    this.audio.preload = 'auto';
    this.ready = false;
    this.audio.addEventListener('canplaythrough', () => (this.ready = true), { once: true });
    this.audio.addEventListener('error', () => {
      console.info(
        `[audio] No celebration sound found at "${SOUND_FILE}". ` +
          'Drop your file at public/sounds/start.mp3 to hear it.'
      );
    });
  }

  play() {
    const p = this.audio.play();
    if (p && p.catch) {
      p.catch(() => {
        /* autoplay/missing-file — already logged */
      });
    }
  }
}
