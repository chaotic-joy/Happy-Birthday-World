// Synthesized engine sound via the Web Audio API. Rather than a steady tone
// (which drones), this models an engine's character: a distorted tone plus
// filtered noise, both amplitude-modulated at the firing rate so the sound
// *pulses* like cylinders firing. Pitch, brightness, and pulse rate all track
// the car's speed. No audio assets needed.
export class EngineSound {
  constructor(ctx) {
    this.ctx = ctx;
    this.started = false;

    // --- output chain: amMix -> lowpass -> master -> destination ---
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 500;
    this.lowpass.connect(this.master);

    // amMix's gain is modulated by the firing LFO -> the whole engine pulses.
    this.amMix = ctx.createGain();
    this.amMix.gain.value = 0.35; // DC offset; LFO adds ±depth on top
    this.amMix.connect(this.lowpass);

    // --- tone: sawtooth through a soft-clip waveshaper for a buzzy timbre ---
    this.osc = ctx.createOscillator();
    this.osc.type = 'sawtooth';
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDriveCurve(3);
    this.toneGain = ctx.createGain();
    this.toneGain.gain.value = 0.45;
    this.osc.connect(shaper).connect(this.toneGain).connect(this.amMix);

    // --- noise: looping white noise through a bandpass for the raspy air ---
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = ctx.createBufferSource();
    this.noise.buffer = buf;
    this.noise.loop = true;
    this.noiseBP = ctx.createBiquadFilter();
    this.noiseBP.type = 'bandpass';
    this.noiseBP.frequency.value = 1200;
    this.noiseBP.Q.value = 0.7;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.25;
    this.noise.connect(this.noiseBP).connect(this.noiseGain).connect(this.amMix);

    // --- firing LFO: drives the amplitude modulation (the "chug") ---
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sawtooth';
    this.lfoDepth = ctx.createGain();
    this.lfoDepth.gain.value = 0.32;
    this.lfo.connect(this.lfoDepth).connect(this.amMix.gain);
  }

  start() {
    if (this.started) return;
    const t = this.ctx.currentTime;
    this.osc.frequency.setValueAtTime(40, t);
    this.lfo.frequency.setValueAtTime(20, t);
    this.osc.start();
    this.lfo.start();
    this.noise.start();
    this.master.gain.setTargetAtTime(0.07, t, 0.3);
    this.started = true;
  }

  // speed (signed), maxSpeed (unused for pitch), throttle engaged?
  update(speed, maxSpeed, throttle) {
    if (!this.started) return;
    const t = this.ctx.currentTime;

    // RPM from absolute speed (nominal divisor so boost revs past 1.0).
    const rpm = Math.min(1.7, Math.abs(speed) / 30);
    // Subtle idle hunt + a touch of randomness so it never sits perfectly still.
    const wobble = 1 + 0.018 * Math.sin(t * 11) + (Math.random() - 0.5) * 0.01;

    const fire = (19 + rpm * 92) * wobble; // firing rate (the audible "pitch")
    this.lfo.frequency.setTargetAtTime(fire, t, 0.06);
    this.osc.frequency.setTargetAtTime(fire, t, 0.06); // fundamental rumble

    // Brightness opens up with revs / throttle.
    this.lowpass.frequency.setTargetAtTime(
      320 + rpm * 2600 + (throttle ? 500 : 0),
      t,
      0.08
    );
    // Deeper pulsing at low rpm, smoother at high rpm.
    this.lfoDepth.gain.setTargetAtTime(0.34 - rpm * 0.12, t, 0.1);
    this.noiseGain.gain.setTargetAtTime(0.18 + rpm * 0.28, t, 0.08);

    const vol = 0.06 + rpm * 0.1 + (throttle ? 0.02 : 0);
    this.master.gain.setTargetAtTime(vol, t, 0.08);
  }

  stop() {
    if (!this.started) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }
}

// Soft-clip (tanh) curve adds harmonics for a buzzy, engine-like timbre.
function makeDriveCurve(amount) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
}
