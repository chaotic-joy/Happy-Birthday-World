// F1-style 5-light start sequence driven against the HTML gantry.
// Lights illuminate one column per ~1s, hold a brief random pause, then all go
// out = GO. Beeps are synthesized via Web Audio so no asset is needed here.
export class Countdown {
  constructor(gantryEl, audioCtx) {
    this.gantry = gantryEl;
    this.cols = Array.from(gantryEl.querySelectorAll('.light-col'));
    this.ctx = audioCtx;
  }

  // Runs the sequence; resolves (and calls onStart) when the lights go out.
  start(onStart) {
    this.gantry.classList.remove('hidden');
    let col = 0;

    const lightNext = () => {
      if (col < this.cols.length) {
        this.cols[col].querySelectorAll('.lamp').forEach((l) => l.classList.add('on'));
        this._beep(660, 0.12);
        col++;
        setTimeout(lightNext, 1000);
      } else {
        // hold all-red for a dramatic random pause (like real F1)
        const hold = 1000 + Math.random() * 1500;
        setTimeout(() => {
          this._setGo(); // lights turn green = GO!
          this._beep(990, 0.4, 'sawtooth'); // lights-out tone
          if (onStart) onStart();
          setTimeout(() => this.gantry.classList.add('hidden'), 1400);
        }, hold);
      }
    };

    setTimeout(lightNext, 600);
  }

  _setGo() {
    this.cols.forEach((c) =>
      c.querySelectorAll('.lamp').forEach((l) => {
        l.classList.remove('on');
        l.classList.add('go');
      })
    );
  }

  _beep(freq, dur, type = 'square') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}
