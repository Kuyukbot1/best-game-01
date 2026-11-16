// Lumen Drift — procedural WebAudio: every sound effect and the music.
// One clear job: nothing is loaded, everything is synthesised. All sounds
// are created on first user gesture; calling any method before that is safe.

import { AUDIO } from './config.js';

const NOTE = { A3: 220.0, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0 };

/** A chord pad progression for the ambient music loop. */
const PAD_CHORDS = [
  [NOTE.A3, NOTE.C4, NOTE.E4],
  [NOTE.F4, NOTE.A4, NOTE.C5],
  [NOTE.C4, NOTE.E4, NOTE.G4],
  [NOTE.G4, NOTE.B4, NOTE.D5],
];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.thrustGain = null;
    this.thrustFilter = null;
  }

  /** Create the context. Call from a user gesture; safe to call twice. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = AUDIO.master;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = AUDIO.music;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = AUDIO.sfx;
      this.sfxBus.connect(this.master);
      this.startThrustLoop();
      this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : AUDIO.master, this.ctx.currentTime, 0.03);
    }
  }

  /** A short oscillator blip with an exponential decay envelope. */
  blip(freq, dur, type, vol, when = 0) {
    if (!this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A filtered noise burst: explosions, impacts, whooshes. */
  noise(dur, filterFreq, vol, when = 0, type = 'lowpass') {
    if (!this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.sfxBus);
    src.start(t0);
  }

  /** A rising two-note pickup blip; higher combo, higher pitch. */
  pickup(combo) {
    const step = Math.min(combo, 12);
    const base = NOTE.E5 * Math.pow(2, step / 12);
    this.blip(base, 0.12, 'sine', 0.5);
    this.blip(base * 1.5, 0.16, 'sine', 0.4, 0.05);
  }

  slingshot() {
    if (!this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t0);
    osc.frequency.exponentialRampToValueAtTime(920, t0 + 0.22);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    osc.connect(gain).connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + 0.3);
  }

  explosion() {
    this.noise(0.5, 900, 0.9);
    this.blip(70, 0.45, 'sine', 0.8);
    this.blip(48, 0.6, 'triangle', 0.5, 0.05);
  }

  hit() {
    this.noise(0.22, 1600, 0.5);
    this.blip(160, 0.2, 'square', 0.3);
  }

  waveClear() {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C5 * 2].forEach((f, i) => this.blip(f, 0.22, 'triangle', 0.4, i * 0.09));
  }

  victory() {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C5 * 2, NOTE.E5 * 2, NOTE.G5 * 2].forEach((f, i) =>
      this.blip(f, 0.4, 'triangle', 0.4, i * 0.12),
    );
  }

  gameOver() {
    [NOTE.A4, NOTE.F4, NOTE.D4, NOTE.A3].forEach((f, i) => this.blip(f, 0.5, 'sawtooth', 0.22, i * 0.16));
  }

  click() {
    this.blip(660, 0.07, 'sine', 0.35);
  }

  boon() {
    [NOTE.G4, NOTE.C5, NOTE.E5].forEach((f, i) => this.blip(f, 0.18, 'sine', 0.4, i * 0.07));
  }

  /** Continuous filtered noise whose gain follows the thrust level. */
  startThrustLoop() {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    this.thrustFilter = this.ctx.createBiquadFilter();
    this.thrustFilter.type = 'bandpass';
    this.thrustFilter.frequency.value = 420;
    this.thrustFilter.Q.value = 0.8;
    this.thrustGain = this.ctx.createGain();
    this.thrustGain.gain.value = 0;
    src.connect(this.thrustFilter).connect(this.thrustGain).connect(this.sfxBus);
    src.start();
  }

  /** 0..1: how hard the ship is thrusting right now. */
  setThrust(level) {
    if (!this.ctx || !this.thrustGain) return;
    this.thrustGain.gain.setTargetAtTime(level * 0.16, this.ctx.currentTime, 0.08);
    if (this.thrustFilter) this.thrustFilter.frequency.setTargetAtTime(320 + level * 500, this.ctx.currentTime, 0.1);
  }

  /** Slow ambient pads: one chord every 4 seconds, quiet. */
  startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    const playChord = () => {
      if (!this.ctx || !this.musicBus) return;
      const chord = PAD_CHORDS[this.musicStep % PAD_CHORDS.length];
      this.musicStep += 1;
      const t0 = this.ctx.currentTime;
      for (const freq of chord) {
        for (const detune of [-6, 6]) {
          const osc = this.ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.linearRampToValueAtTime(0.5, t0 + 1.2);
          gain.gain.setValueAtTime(0.5, t0 + 2.6);
          gain.gain.linearRampToValueAtTime(0.0001, t0 + 4.0);
          osc.connect(gain).connect(this.musicBus);
          osc.start(t0);
          osc.stop(t0 + 4.1);
        }
      }
    };
    playChord();
    this.musicTimer = window.setInterval(playChord, 4000);
  }
}
