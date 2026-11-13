// ============================================================================
// CYCLE 12: WEB AUDIO SCI-FI SFX + ADAPTIVE AMBIENT BGM SYNTHESIZER
// ============================================================================

const safeStorage = {
  get: (k) => (typeof localStorage !== "undefined" ? localStorage.getItem(k) : null),
  set: (k, v) => { if (typeof localStorage !== "undefined") localStorage.setItem(k, v); }
};

class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = safeStorage.get("CYCLE12_MUTED") === "1";
    this.bgmOn = safeStorage.get("CYCLE12_BGM") === "1";
    this.scene = "vn";
    this._bgmTimer = null;
    this._bgmStep = 0;
  }

  ensureCtx() {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== "undefined") {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    safeStorage.set("CYCLE12_MUTED", this.muted ? "1" : "0");
    if (this.muted) {
      this.stopBGM();
    } else if (this.bgmOn) {
      this.startBGM();
    }
    return this.muted;
  }

  toggleBGM() {
    this.bgmOn = !this.bgmOn;
    safeStorage.set("CYCLE12_BGM", this.bgmOn ? "1" : "0");
    if (this.bgmOn && !this.muted) this.startBGM();
    else this.stopBGM();
    return this.bgmOn;
  }

  setMusicScene(mode) {
    this.scene = mode || "vn";
  }

  startBGM() {
    if (this.muted || !this.bgmOn) return;
    this.stopBGM();
    const tick = () => {
      if (this.muted || !this.bgmOn) return;
      const step = this._bgmStep++;
      if (this.scene === "arena") {
        // Energetic dark synth bass + pulse
        const bass = [110, 110, 130.8, 98, 110, 146.8, 130.8, 98][step % 8];
        this.tone(bass, 0.28, "sawtooth", 0.018);
        if (step % 2 === 0) this.tone(bass * 2, 0.16, "triangle", 0.014);
        this._bgmTimer = setTimeout(tick, 320);
      } else {
        // Atmospheric space opera pad chord
        const chord = [220, 261.6, 329.6, 392, 440, 329.6, 293.7, 246.9][step % 8];
        this.tone(chord, 1.35, "sine", 0.016);
        if (step % 2 === 0) this.tone(chord * 0.5, 1.8, "triangle", 0.012);
        this._bgmTimer = setTimeout(tick, 950);
      }
    };
    tick();
  }

  stopBGM() {
    clearTimeout(this._bgmTimer);
    this._bgmTimer = null;
  }

  tone(freq, dur = 0.08, type = "sine", vol = 0.08, slideTo = null) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  click() {
    this.tone(680, 0.05, "triangle", 0.06, 920);
  }

  blip(pitch = 520) {
    this.tone(pitch + (Math.random() - 0.5) * 60, 0.025, "sine", 0.022);
  }

  choice() {
    this.tone(440, 0.08, "triangle", 0.07, 660);
    setTimeout(() => this.tone(660, 0.12, "sine", 0.06, 880), 45);
  }

  laser() {
    this.tone(1100, 0.25, "sawtooth", 0.07, 180);
  }

  heavyHit() {
    this.tone(160, 0.22, "square", 0.09, 45);
  }

  dodge() {
    this.tone(520, 0.14, "sine", 0.06, 1240);
  }

  overdrive() {
    [440, 554, 659, 880, 1175].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.24, "sawtooth", 0.06), i * 50);
    });
  }

  superweapon() {
    this.tone(240, 0.55, "sawtooth", 0.1, 45);
    setTimeout(() => this.tone(880, 0.35, "sine", 0.08, 220), 120);
  }

  victory() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.2, "triangle", 0.08), i * 95);
    });
  }

  alert() {
    this.tone(360, 0.14, "sawtooth", 0.06, 260);
  }
}

export const SFX = new SoundFX();
