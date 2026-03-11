(() => {
  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("/ninth-life/sw.js").catch(() => {}); }
  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  function mulberry32(seed) {
    let t = seed | 0;
    return function() {
      t = t + 1831565813 | 0;
      let x = Math.imul(t ^ t >>> 15, 1 | t);
      x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }
  function dateToSeed(dateStr) {
    let h = 0;
    for (let i = 0; i < dateStr.length; i++) {
      h = Math.imul(31, h) + dateStr.charCodeAt(i) | 0;
    }
    return h >>> 0;
  }
  function getTodaySeed() {
    return dateToSeed((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  }
  let _originalRandom = null;
  let _dailyActive = false;
  function startDailyRNG() {
    const seed = getTodaySeed();
    const rng = mulberry32(seed);
    _originalRandom = Math.random;
    Math.random = rng;
    _dailyActive = true;
    return seed;
  }
  function stopDailyRNG() {
    if (_originalRandom) {
      Math.random = _originalRandom;
      _originalRandom = null;
    }
    _dailyActive = false;
  }
  function getDailyData() {
    try {
      const raw = localStorage.getItem("nl_daily");
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveDailyData(d) {
    try {
      localStorage.setItem("nl_daily", JSON.stringify(d));
    } catch (e) {
    }
  }
  const LB_API = "https://ninth-life-leaderboard.ninelives.workers.dev";
  function getPlayerId() {
    try {
      let pid = localStorage.getItem("nl_pid");
      if (!pid) {
        pid = "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        localStorage.setItem("nl_pid", pid);
      }
      return pid;
    } catch (e) {
      return "anon";
    }
  }
  function getHandle() {
    try {
      return localStorage.getItem("nl_handle") || "Anonymous";
    } catch (e) {
      return "Anonymous";
    }
  }
  function setHandle(h) {
    try {
      localStorage.setItem("nl_handle", (h || "Anonymous").slice(0, 16));
    } catch (e) {
    }
  }
  async function submitScore(score, night, won) {
    try {
      const r = await fetch(LB_API + "/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, night, won, handle: getHandle(), pid: getPlayerId() })
      });
      return await r.json();
    } catch (e) {
      return { ok: false, error: "offline" };
    }
  }
  async function fetchDaily(date) {
    try {
      const r = await fetch(LB_API + "/api/daily" + (date ? "?date=" + date : ""));
      return await r.json();
    } catch (e) {
      return { board: [], total: 0 };
    }
  }
  async function fetchAllTime() {
    try {
      const r = await fetch(LB_API + "/api/alltime");
      return await r.json();
    } catch (e) {
      return { board: [] };
    }
  }
  const Haptic = {
    light: () => { try { navigator?.vibrate?.(10); } catch(e) {} },
    medium: () => { try { navigator?.vibrate?.(25); } catch(e) {} },
    heavy: () => { try { navigator?.vibrate?.(50); } catch(e) {} },
    double: () => { try { navigator?.vibrate?.([20, 40, 20]); } catch(e) {} },
    cascade: () => { try { navigator?.vibrate?.(8); } catch(e) {} },
    death: () => { try { navigator?.vibrate?.([50, 30, 80]); } catch(e) {} },
    victory: () => { try { navigator?.vibrate?.([30, 50, 30, 50, 100]); } catch(e) {} },
    threshold: () => { try { navigator?.vibrate?.([15, 20, 40]); } catch(e) {} }
  };
  const Audio = {
    ready: false,
    muted: false,
    async init() {
      if (this.ready) return;
      try {
        await Tone.start();
        this.syn = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.08, release: 0.6 }, volume: -8 }).toDestination();
        this.bass = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.05, decay: 0.4, sustain: 0.2, release: 0.8 }, volume: -6 }).toDestination();
        this.perc = new Tone.NoiseSynth({ envelope: { attack: 5e-3, decay: 0.06, sustain: 0, release: 0.04 }, volume: -18 }).toDestination();
        this.ready = true;
      } catch (e) {
        console.warn("Audio init failed:", e);
      }
    },
    p(fn) {
      if (!this.ready || this.muted) return;
      try {
        fn();
      } catch (e) {
      }
    },
    // Notes for scaling
    noteAt(base, n) {
      const notes = ["C", "D", "E", "F", "G", "A", "B"];
      return notes[Math.min(6, Math.max(0, n))] + (base || 4);
    },
    // ── Scoring sounds (★ DOPAMINE: ascending pitch tracks progress toward target) ──
    chipUp(v, progress = 0) {
      this.p(() => {
        const baseN = Math.min(6, Math.floor(v / 2));
        const progN = Math.min(6, Math.floor(Math.min(1.2, progress) * 6));
        const n = Math.max(baseN, progN);
        this.syn.triggerAttackRelease(this.noteAt(4, n), "16n", Tone.now(), 0.25 + Math.min(0.25, progress * 0.2));
      });
    },
    multHit(v, progress = 0) {
      this.p(() => {
        const baseN = Math.min(6, Math.floor(v / 3));
        const progN = Math.min(6, Math.floor(Math.min(1.2, progress) * 6));
        const n = Math.max(baseN, progN);
        this.syn.triggerAttackRelease(this.noteAt(5, n), "32n", Tone.now(), 0.4 + Math.min(0.2, progress * 0.15));
      });
    },
    xMultSlam(x) {
      this.p(() => {
        const t = Tone.now();
        this.bass.triggerAttackRelease("C2", "8n", t, 0.7);
        this.syn.triggerAttackRelease(["E4", "G4", "B4"], "8n", t + 0.05, 0.4);
        if (x >= 2) this.syn.triggerAttackRelease("C5", "16n", t + 0.1, 0.3);
      });
    },
    // ★ DOPAMINE: Threshold crossing celebration. the moment you KNOW you made it
    thresholdCross() {
      this.p(() => {
        const t = Tone.now();
        this.bass.triggerAttackRelease("C2", "4n", t, 0.5);
        ["E4", "G4", "C5"].forEach((n, i) => this.syn.triggerAttackRelease(n, "16n", t + 0.04 + i * 0.06, 0.35));
        this.perc.triggerAttackRelease("16n", t + 0.02, 0.4);
      });
    },
    // ★ DOPAMINE: Big cat fires. when a loaded cat drops a huge combined hit
    bigCatHit(progress = 0) {
      this.p(() => {
        const t = Tone.now();
        const n = Math.min(6, Math.floor(Math.min(1.2, progress) * 6));
        this.syn.triggerAttackRelease(this.noteAt(4, n), "16n", t, 0.35);
        this.syn.triggerAttackRelease(this.noteAt(5, Math.min(6, n + 1)), "32n", t + 0.04, 0.3);
        this.perc.triggerAttackRelease("32n", t, 0.25);
      });
    },
    handType(tier) {
      this.p(() => {
        const t = Tone.now();
        const n = ["C4", "E4", "G4", "C5"][Math.min(3, tier)];
        this.syn.triggerAttackRelease(n, "8n", t, 0.25);
      });
    },
    comboHit() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease("E5", "16n", t, 0.3);
        this.syn.triggerAttackRelease("G5", "16n", t + 0.06, 0.3);
        this.bass.triggerAttackRelease("C3", "8n", t, 0.35);
      });
    },
    grudgeTense() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease(["Db4", "D4"], "16n", t, 0.35);
      });
    },
    grudgeProve() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease(["C4", "E4", "G4"], "8n", t, 0.4);
        this.syn.triggerAttackRelease("C5", "16n", t + 0.12, 0.3);
      });
    },
    bondChime() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease("E5", "16n", t, 0.25);
        this.syn.triggerAttackRelease("G5", "16n", t + 0.1, 0.25);
      });
    },
    nerveUp() {
      this.p(() => {
        const t = Tone.now();
        ["C4", "E4", "G4"].forEach((n, i) => this.syn.triggerAttackRelease(n, "32n", t + i * 0.06, 0.2));
      });
    },
    nerveDown() {
      this.p(() => {
        const t = Tone.now();
        ["G4", "E4", "C4"].forEach((n, i) => this.syn.triggerAttackRelease(n, "32n", t + i * 0.06, 0.15));
      });
    },
    tierReveal(tier) {
      this.p(() => {
        const t = Tone.now();
        const chords = [["C4"], ["C4", "E4"], ["C4", "E4", "G4"], ["C4", "E4", "G4", "B4"], ["C4", "E4", "G4", "B4", "D5"], ["C4", "E4", "G4", "B4", "D5", "F#5"]];
        const ch = chords[Math.min(5, tier)] || chords[0];
        this.syn.triggerAttackRelease(ch, "4n", t, 0.3 + tier * 0.05);
        if (tier >= 4) this.bass.triggerAttackRelease("C2", "4n", t, 0.5);
      });
    },
    passiveHit() {
      this.p(() => {
        this.syn.triggerAttackRelease("A4", "32n", Tone.now(), 0.15);
      });
    },
    // ── UI sounds ──
    cardSelect() {
      this.p(() => {
        this.perc.triggerAttackRelease("32n", Tone.now(), 0.4);
      });
    },
    cardPlay() {
      this.p(() => {
        const t = Tone.now();
        this.perc.triggerAttackRelease("16n", t, 0.3);
        this.syn.triggerAttackRelease("G4", "32n", t + 0.02, 0.1);
      });
    },
    buy() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease("E5", "32n", t, 0.2);
        this.syn.triggerAttackRelease("G5", "32n", t + 0.05, 0.15);
      });
    },
    // ── Phase sounds ──
    bossIntro() {
      this.p(() => {
        const t = Tone.now();
        this.bass.triggerAttackRelease("D2", "2n", t, 0.6);
        this.syn.triggerAttackRelease(["Eb4", "Gb4"], "4n", t + 0.2, 0.15);
      });
    },
    victory() {
      this.p(() => {
        const t = Tone.now();
        ["C4", "E4", "G4", "C5", "E5"].forEach((n, i) => this.syn.triggerAttackRelease(n, "8n", t + i * 0.12, 0.35));
      });
    },
    defeat() {
      this.p(() => {
        const t = Tone.now();
        ["E4", "D4", "C4", "B3", "A3"].forEach((n, i) => this.syn.triggerAttackRelease(n, "4n", t + i * 0.25, 0.2));
      });
    },
    clutchWin() {
      this.p(() => {
        const t = Tone.now();
        this.bass.triggerAttackRelease("C2", "2n", t, 0.6);
        ["C4", "E4", "G4", "C5", "E5", "G5"].forEach((n, i) => this.syn.triggerAttackRelease(n, "8n", t + 0.1 + i * 0.1, 0.4));
      });
    },
    // ── Den sounds ──
    denBirth() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease("C5", "16n", t, 0.25);
        this.syn.triggerAttackRelease("E5", "16n", t + 0.08, 0.25);
        this.syn.triggerAttackRelease("G5", "16n", t + 0.16, 0.2);
      });
    },
    denFight() {
      this.p(() => {
        const t = Tone.now();
        this.perc.triggerAttackRelease("8n", t, 0.6);
        this.syn.triggerAttackRelease("Eb4", "16n", t + 0.03, 0.3);
      });
    },
    denDeath() {
      this.p(() => {
        const t = Tone.now();
        this.bass.triggerAttackRelease("D2", "1n", t, 0.5);
        this.syn.triggerAttackRelease(["Eb4", "Ab4"], "2n", t + 0.1, 0.15);
      });
    },
    denBond() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease("E5", "16n", t, 0.2);
        this.syn.triggerAttackRelease("A5", "16n", t + 0.1, 0.2);
      });
    },
    denGrudge() {
      this.p(() => {
        this.syn.triggerAttackRelease(["D4", "Ab4"], "16n", Tone.now(), 0.25);
      });
    },
    denGrowth() {
      this.p(() => {
        this.syn.triggerAttackRelease("F5", "32n", Tone.now(), 0.2);
      });
    },
    // ── Juice sounds (★ v54: every moment matters) ──
    epithetEarned() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease("A4", "8n", t, 0.2);
        this.syn.triggerAttackRelease("E5", "8n", t + 0.15, 0.25);
        this.syn.triggerAttackRelease("A5", "4n", t + 0.3, 0.2);
      });
    },
    legendaryDiscover() {
      this.p(() => {
        const t = Tone.now();
        this.bass.triggerAttackRelease("C2", "2n", t, 0.5);
        ["G4", "B4", "D5", "G5"].forEach((n, i) => this.syn.triggerAttackRelease(n, "8n", t + 0.05 + i * 0.1, 0.35));
        this.perc.triggerAttackRelease("16n", t + 0.02, 0.3);
      });
    },
    mythicDiscover() {
      this.p(() => {
        const t = Tone.now();
        this.bass.triggerAttackRelease("C2", "1n", t, 0.7);
        ["C4", "E4", "G4", "B4", "D5", "G5", "B5"].forEach((n, i) => this.syn.triggerAttackRelease(n, "8n", t + i * 0.09, 0.4));
        this.perc.triggerAttackRelease("8n", t, 0.4);
      });
    },
    recruit() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease("D5", "32n", t, 0.2);
        this.syn.triggerAttackRelease("G5", "32n", t + 0.06, 0.15);
      });
    },
    bossClear() {
      this.p(() => {
        const t = Tone.now();
        this.bass.triggerAttackRelease("C2", "4n", t, 0.5);
        ["C4", "E4", "G4", "C5"].forEach((n, i) => this.syn.triggerAttackRelease(n, "16n", t + 0.1 + i * 0.08, 0.3));
        this.perc.triggerAttackRelease("8n", t + 0.05, 0.35);
      });
    },
    kittenGrow() {
      this.p(() => {
        const t = Tone.now();
        ["C5", "E5", "G5", "C6"].forEach((n, i) => this.syn.triggerAttackRelease(n, "32n", t + i * 0.07, 0.2));
      });
    },
    // ── Atmosphere sounds (★ v66: ambience + transitions) ──
    draftFlip(i) {
      this.p(() => {
        const t = Tone.now();
        const notes = ["D4", "F4", "A4"];
        this.syn.triggerAttackRelease(notes[i % 3], "32n", t, 0.15);
        this.perc.triggerAttackRelease("32n", t, 0.2);
      });
    },
    nightTransition() {
      this.p(() => {
        const t = Tone.now();
        this.bass.triggerAttackRelease("A1", "2n", t, 0.3);
        this.syn.triggerAttackRelease("E4", "4n", t + 0.1, 0.08);
      });
    },
    shopAmbient() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease(["C3", "G3", "E4"], "2n", t, 0.06);
      });
    },
    campfire() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease("A3", "2n", t, 0.05);
        this.syn.triggerAttackRelease("E4", "2n", t + 0.3, 0.04);
      });
    },
    discard() {
      this.p(() => {
        const t = Tone.now();
        this.perc.triggerAttackRelease("16n", t, 0.15);
        this.syn.triggerAttackRelease("D4", "32n", t + 0.02, 0.06);
      });
    },
    stepTick(progress = 0) {
      this.p(() => {
        const n = Math.min(6, Math.floor(Math.min(1.5, progress) * 5));
        this.syn.triggerAttackRelease(this.noteAt(5, n), "64n", Tone.now(), 0.06 + progress * 0.04);
      });
    },
    eventReveal() {
      this.p(() => {
        const t = Tone.now();
        this.syn.triggerAttackRelease("A4", "8n", t, 0.1);
        this.bass.triggerAttackRelease("D2", "4n", t, 0.15);
      });
    }
  };
  const BREEDS = {
    Autumn: { color: "#d4a54a", glow: "#b8892e", bg: "#1f1a0e", icon: "\u{1F342}", name: "Autumn", lore: "Born when the leaves fell. They know what it means to let go." },
    Winter: { color: "#67e8f9", glow: "#06b6d4", bg: "#1b3a4e", icon: "\u2744\uFE0F", name: "Winter", lore: "Born in the cold. The cold never left them." },
    Spring: { color: "#4ade80", glow: "#22c55e", bg: "#1b4e2d", icon: "\u{1F331}", name: "Spring", lore: "Born when the world tried again. They carry that stubbornness." },
    Summer: { color: "#f43f5e", glow: "#e11d48", bg: "#4e1b2e", icon: "\u2600\uFE0F", name: "Summer", lore: "Born in the longest light. They burn like they know it won't last." }
  };
  const BK = Object.keys(BREEDS);
  const DEVOTION_MILESTONES = {
    Autumn: [
      { at: 10, name: "First Harvest", desc: "+1 bonus per Autumn cat played", fx: { multPerCat: 1 } },
      { at: 25, name: "Scarred Earth", desc: "Scarred cats score \xD71.4", fx: { scarMult: 1.4 } },
      { at: 50, name: "Endurance", desc: "+1 hand per round", fx: { hands: 1 } },
      { at: 80, name: "Ironwood", desc: "Injuries heal in 1 round", fx: { fastHeal: true } },
      { at: 90, name: "The Harvest Moon", desc: "All Autumn cats +3 Power", fx: { powerBoost: 3 } }
    ],
    Summer: [
      { at: 10, name: "First Spark", desc: "+3 base score per Summer cat played", fx: { chipsPerCat: 3 } },
      { at: 25, name: "Wildfire", desc: "Hand types get +10% base score", fx: { chipScale: 0.1 } },
      { at: 50, name: "Fury", desc: "+1 free recruit per round", fx: { freeRecruits: 1 } },
      { at: 80, name: "Inferno", desc: "Nerve gains +1 extra", fx: { nerveBoost: 1 } },
      { at: 90, name: "The Blazing Sun", desc: "All Summer cats +3 Power", fx: { powerBoost: 3 } }
    ],
    Winter: [
      { at: 10, name: "First Frost", desc: "+1 bonus per Winter cat played", fx: { multPerCat: 1 } },
      { at: 25, name: "Permafrost", desc: "First recruit each blind is free", fx: { freeRecruit: true } },
      { at: 50, name: "Stillness", desc: "+1 hand per round", fx: { hands: 1 } },
      { at: 80, name: "Absolute Zero", desc: "Boss curses reduced by 1", fx: { curseReduce: 1 } },
      { at: 90, name: "The Frozen Throne", desc: "All Winter cats +3 Power", fx: { powerBoost: 3 } }
    ],
    Spring: [
      { at: 10, name: "First Bloom", desc: "+1 bonus per bonded cat played", fx: { bondMult: 1 } },
      { at: 25, name: "Overgrowth", desc: "Breed cap 75% \u2192 100%", fx: { breedBoost: 0.25 } },
      { at: 50, name: "Deep Roots", desc: "Bonds score \xD71.75", fx: { bondScale: 1.75 } },
      { at: 80, name: "Renewal", desc: "+1 Shelter slot", fx: { shelter: 1 } },
      { at: 90, name: "The Eternal Garden", desc: "All Spring cats +3 Power", fx: { powerBoost: 3 } }
    ]
  };
  function getDevotionLevel(breed, counts) {
    const c = (counts || {})[breed] || 0;
    const ms = DEVOTION_MILESTONES[breed] || [];
    const unlocked = ms.filter((m) => c >= m.at);
    const next = ms.find((m) => c < m.at);
    return { count: c, unlocked, next, total: ms.length };
  }
  function getAllDevotionFx(counts) {
    const fx = { multPerCat: {}, chipsPerCat: {}, hands: 0, discards: 0, scarMult: 0, chipScale: 0, nerveBoost: 0, freeRecruit: false, fastHeal: false, peek: 0, curseReduce: 0, breedBoost: 0, bondScale: 0, bondMult: 0, shelter: 0, powerBoost: {} };
    Object.keys(DEVOTION_MILESTONES).forEach((breed) => {
      const dev = getDevotionLevel(breed, counts);
      dev.unlocked.forEach((m) => {
        if (m.fx.multPerCat) fx.multPerCat[breed] = (fx.multPerCat[breed] || 0) + m.fx.multPerCat;
        if (m.fx.chipsPerCat) fx.chipsPerCat[breed] = (fx.chipsPerCat[breed] || 0) + m.fx.chipsPerCat;
        if (m.fx.hands) fx.hands += m.fx.hands;
        if (m.fx.discards) fx.discards += m.fx.discards;
        if (m.fx.freeRecruits) fx.freeRecruits = (fx.freeRecruits || 0) + m.fx.freeRecruits;
        if (m.fx.scarMult) fx.scarMult = m.fx.scarMult;
        if (m.fx.chipScale) fx.chipScale += m.fx.chipScale;
        if (m.fx.nerveBoost) fx.nerveBoost += m.fx.nerveBoost;
        if (m.fx.freeRecruit) fx.freeRecruit = true;
        if (m.fx.fastHeal) fx.fastHeal = true;
        if (m.fx.peek) fx.peek = Math.max(fx.peek, m.fx.peek);
        if (m.fx.curseReduce) fx.curseReduce += m.fx.curseReduce;
        if (m.fx.breedBoost) fx.breedBoost += m.fx.breedBoost;
        if (m.fx.bondScale) fx.bondScale = m.fx.bondScale;
        if (m.fx.bondMult) fx.bondMult += m.fx.bondMult;
        if (m.fx.shelter) fx.shelter += m.fx.shelter;
        if (m.fx.powerBoost) fx.powerBoost[breed] = (fx.powerBoost[breed] || 0) + m.fx.powerBoost;
      });
    });
    return fx;
  }
  function hasGrudge(c1, c2) {
    return (c1.grudgedWith || []).includes(c2.id) || (c2.grudgedWith || []).includes(c1.id);
  }
  function addGrudge(c, targetId) {
    if (c.epithetKey === "grudgeResolved") return c;
    if (!(c.grudgedWith || []).includes(targetId)) {
      c.grudgedWith = [...c.grudgedWith || [], targetId];
    }
    return c;
  }
  function removeGrudge(c, targetId) {
    c.grudgedWith = (c.grudgedWith || []).filter((id) => id !== targetId);
    return c;
  }
  function getGrudges(cats) {
    const grudges = [];
    for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) {
      if (hasGrudge(cats[i], cats[j])) {
        grudges.push([cats[i], cats[j]]);
      }
    }
    return grudges;
  }
  const PLAIN = { name: "Plain", icon: "", desc: "No special ability yet", tier: "plain" };
  const TRAIT_DETAIL = {
    Plain: "No special ability yet. This cat can earn a trait through den events, breeding, or the shop.",
    Wild: "A cat between seasons. Counts as every season at once, so they fit into any hand you're building. The ultimate glue cat.",
    Stubborn: "Won't back down. Adds 3 mult when played, but if your last hand failed to clear, they dig in harder for 6 mult instead. Discard to gain +1 Nerve.",
    Stray: "The outsider who brings everyone together. Gains 3 mult per unique season among the cats you play. Play all four seasons together and that's +12 mult. Discard to draw an extra card.",
    Loyal: "Bonds with routine. Adds 2 mult normally, but play the exact same cats as your last play and they contribute 4 mult instead. Discard to inspire +1 mult across your whole hand.",
    Devoted: "Heart belongs to their mate. Adds 5 mult when their bonded partner is played in the same hand. Discard to give their mate +1 Power. Strongest when you play the pair together.",
    Scavenger: "A practical survivor. Adds 1 mult for every ration you're carrying, up to +5. The richer you are, the harder they fight. Discard to earn +2 rations.",
    Scrapper: "Tough and battle-hardened. Adds 3 mult, or 5 mult if they are hardened. Battle makes them stronger. Discard to gain +1 Nerve.",
    Cursed: "A dark presence. Normally costs you 3 mult. But play them as the only cat of their season and the curse inverts for +8 mult. Isolate them for power. Discard to gain +1 Nerve.",
    Guardian: "Protector of the wounded. Gains 2 mult for every injured or hardened cat you play alongside them. The more your colony bleeds, the harder they fight. Discard to heal one injured cat.",
    Feral: "Untamed and unpredictable. Gains 2 mult for every cat played in the hand. Play all 5 and that's +10 mult. Rewards big, aggressive plays.",
    Seer: "Sees what's coming. Adds 4 mult always. But if you play the same hand type as your previous play, the Seer predicted it and adds +8 mult instead. Rewards consistency.",
    Chimera: "Belongs to all four seasons at once. When played with 3 or more cats, multiplies your entire hand by 1.5. A legendary shape-shifter.",
    Alpha: "The leader of the pack. If this cat has the highest power among the cats you play, multiplies everything by 1.3. Keep them strong and they carry the colony.",
    Echo: "Scores twice. The second time at half power. One of the strongest traits in the game. Every bonus this cat earns happens twice.",
    Nocturnal: "Gets stronger the longer you survive. Gains 2 mult for every level of Nerve your colony has built up. At max Nerve, that's +34 mult from one cat. Discard to gain +2 Nerve.",
    Eternal: "A living legend. Multiplies the entire hand by 3 and scores twice at full power. The rarest and most powerful trait. Changes everything.",
    Phoenix: "Burns brightest near death. Multiplies by 2.5, or by 4 if hardened. If this cat falls in the den, they rise once as Eternal. Death is not the end."
  };
  const DRAFT_VOICE = {
    // Trait-based (priority)
    // COMMON (C tier)
    Stubborn: ["I don't quit.", "They said it couldn't be done. Watch me.", "Knock me down. See what happens.", "I'll outlast anything."],
    Scavenger: ["I know where the good stuff grows.", "Save your rations. I'll find more.", "Every patch of ground has something.", "I provide. That's what I do."],
    Wild: ["I belong everywhere. And nowhere.", "Don't try to categorize me.", "I'm whatever you need me to be.", "Seasons? I make my own."],
    Stray: ["I've seen all four seasons.", "I don't belong anywhere. I belong everywhere.", "Diversity is survival.", "I make bridges, not walls."],
    Loyal: ["Same crew. Same fight.", "I remember who stood with me.", "You were there last time. That matters.", "Together again. Good."],
    Devoted: ["Where they go, I go.", "My heart belongs to someone.", "Together we're unstoppable.", "Love isn't weakness. It's fuel."],
    // RARE (B tier)
    Scrapper: ["I fight dirty. That a problem?", "Scars? I've got a collection.", "Hit me. I dare you.", "Pain's just information."],
    Cursed: ["Don't get close. Trust me.", "I bring bad luck. Mostly to others.", "Something's wrong with me. Use it.", "Alone, I'm dangerous. Together\u2026 worse."],
    Guardian: ["I watch the ones who hurt.", "Someone has to protect them.", "Every scar I see makes me stronger.", "The wounded need a shield."],
    Feral: ["More of us. More power.", "I fight harder in a crowd.", "Alone I'm nothing. Together I'm everything.", "Fill the hand. Watch what happens."],
    Seer: ["I know what comes next.", "Same move twice. Trust me.", "The pattern is the weapon.", "I see it before you play it."],
    // LEGENDARY (A tier)
    Echo: ["You'll see me twice.", "I linger.", "Once is never enough.", "Everything I do, I do again."],
    Chimera: ["I'm all of them at once.", "Every season runs through me.", "I don't fit. That's the point.", "More than the sum of my parts."],
    Alpha: ["I lead. That's not a request.", "Strongest in the room. Always.", "Follow me or get out of the way.", "Power recognizes power."],
    Nocturnal: ["The darker it gets, the brighter I burn.", "I come alive when hope dies.", "Desperation is my element.", "You'll need me at the end."],
    // MYTHIC (S tier)
    Eternal: ["You won't find another like me.", "I've been waiting for this colony.", "The stories about me? All true.", "This changes everything. You'll see."],
    Phoenix: ["I don't stay dead.", "Burn me. I'll come back hotter.", "Scars make me legendary.", "You can't kill what I am."],
    // Breed fallbacks for Plain cats
    _Autumn: ["I know when to let go.", "The leaves taught me patience.", "I've seen things end. I'm still here.", "Quiet. Watching. Ready."],
    _Summer: ["I'm loud. Deal with it.", "Born running. Haven't stopped.", "I'll burn for this colony.", "You want energy? I'm your cat."],
    _Winter: ["I don't talk much.", "Cold doesn't bother me.", "I've survived worse than this.", "Still. Steady. Enough."],
    _Spring: ["I grow things. Bonds, mostly.", "Everything heals if you let it.", "I'm here for the others.", "New beginnings. That's my whole thing."]
  };
  function getDraftVoice(cat2, meta) {
    if (cat2._returned) return cat2._draftVoice || "You remember me. I almost didn't come back.";
    const totalDeaths = meta?.stats?.totalFallen || 0;
    const runs = meta?.stats?.r || 0;
    if (runs > 5 && totalDeaths > 10 && Math.random() < 0.2) return pk(["I know what happens to colonies. I came anyway.", "They say you lose them. All of them, eventually. I came anyway.", "The last colony lost everyone. But you're not the last colony, are you?"]);
    if (runs > 3 && Math.random() < 0.15) return pk(["You've done this before. I can tell.", "The ground remembers the ones who came before us.", "Colony number... what are we at now?"]);
    const tr = cat2.trait || PLAIN;
    if (tr.name !== "Plain" && DRAFT_VOICE[tr.name]) return pk(DRAFT_VOICE[tr.name]);
    return pk(DRAFT_VOICE["_" + cat2.breed] || DRAFT_VOICE._Autumn);
  }
  const TRAITS = [
    // --- COMMON (C tier): utility, economy, enablers ---
    { name: "Wild", icon: "\u{1F300}", desc: "Counts as any season", tier: "common" },
    { name: "Devoted", icon: "\u{1FAC0}", desc: "+5 bonus with partner. Discard: partner +1 Power", tier: "common" },
    { name: "Stubborn", icon: "\u{1FAA8}", desc: "+3 bonus. Lost last round: +6 bonus. Discard: +1 Nerve", tier: "common" },
    { name: "Stray", icon: "\u{1F408}", desc: "+3 bonus per unique season in group. Discard: +1 draw", tier: "common" },
    { name: "Loyal", icon: "\u{1FAC2}", desc: "+2 bonus. Same cats as last: +4. Discard: +1 bonus all", tier: "common" },
    { name: "Scavenger", icon: "\u{1F33E}", desc: "+1 bonus per \u{1F41F} held (max +5). Discard: +2\u{1F41F}", tier: "common" },
    // --- RARE (B tier): solid contributors with conditions ---
    { name: "Scrapper", icon: "\u{1F94A}", desc: "+3 bonus, +5 if scarred in battle. Discard: +1 Nerve", tier: "rare" },
    { name: "Cursed", icon: "\u{1F480}", desc: "\u22123 bonus. Only one of their season: +8. Discard: +1 Nerve", tier: "rare_neg" },
    { name: "Feral", icon: "\u{1F43E}", desc: "+2 bonus per cat played. Stronger in big groups", tier: "rare" },
    { name: "Seer", icon: "\u{1F441}\uFE0F", desc: "+4 bonus. Same group type as last: +8 bonus", tier: "rare" },
    { name: "Guardian", icon: "\u{1F6E1}\uFE0F", desc: "+2 bonus per injured ally played. Discard: heal 1", tier: "rare" },
    // --- LEGENDARY (A tier): build-defining ---
    { name: "Echo", icon: "\u{1F501}", desc: "Scores twice, half power on second", tier: "legendary" },
    { name: "Chimera", icon: "\u{1F9EC}", desc: "Counts as all seasons. Play 3+ cats: \xD71.5", tier: "legendary" },
    { name: "Alpha", icon: "\u{1F43A}", desc: "\xD71.3 if highest power among played cats", tier: "rare" },
    { name: "Nocturnal", icon: "\u{1F319}", desc: "+2 bonus per momentum level. Grows every round", tier: "legendary" },
    // --- MYTHIC (S tier): run-defining ---
    { name: "Eternal", icon: "\u2728", desc: "\xD73 bonus, scores twice at full power", tier: "mythic" },
    { name: "Phoenix", icon: "\u{1F525}", desc: "\xD72.5 bonus. Battle-scarred: \xD74. Revives once on death", tier: "mythic" }
  ];
  const RARE_NEG = TRAITS.filter((t) => t.tier === "rare_neg");
  const COMMON_TRAITS = TRAITS.filter((t) => t.tier === "common");
  const RARE_TRAITS = TRAITS.filter((t) => t.tier === "rare");
  const LEGENDARY_TRAITS = TRAITS.filter((t) => t.tier === "legendary");
  const MYTHIC_TRAITS = TRAITS.filter((t) => t.tier === "mythic");
  function pickTrait(allowHigh = false) {
    const r = Math.random();
    if (r < 0.03) return pk(LEGENDARY_TRAITS);
    if (r < 0.35) return pk(RARE_TRAITS);
    return pk(COMMON_TRAITS);
  }
  function pickDraftTrait() {
    const r = Math.random();
    if (r < 0.35) return pk(RARE_TRAITS);
    return pk(COMMON_TRAITS);
  }
  function pickBreedInheritTrait(p1, p2) {
    const t1 = (p1.trait || PLAIN).tier || "common", t2 = (p2.trait || PLAIN).tier || "common";
    const tiers = [t1, t2].map((t) => t === "mythic" ? 4 : t === "legendary" ? 3 : t === "rare" || t === "rare_neg" ? 2 : t === "common" ? 1 : 0);
    const maxTier = Math.max(...tiers), minTier = Math.min(...tiers);
    if (minTier >= 3) {
      if (Math.random() < 0.1) return pk(MYTHIC_TRAITS);
      return Math.random() < 0.5 ? pk(LEGENDARY_TRAITS) : pk(RARE_TRAITS);
    }
    if (maxTier >= 3 && minTier >= 2) {
      const r = Math.random();
      if (r < 0.2) return pk(LEGENDARY_TRAITS);
      if (r < 0.55) return pk(RARE_TRAITS);
      return pk(COMMON_TRAITS);
    }
    if (minTier >= 2) {
      const r = Math.random();
      if (r < 0.09) return pk(LEGENDARY_TRAITS);
      if (r < 0.45) return pk(RARE_TRAITS);
      return pk(COMMON_TRAITS);
    }
    if (maxTier >= 2) {
      return Math.random() < 0.35 ? pk(RARE_TRAITS) : pk(COMMON_TRAITS);
    }
    return pk(COMMON_TRAITS);
    return pk(COMMON_TRAITS);
  }
  function traitTierLabel(t) {
    if (t.tier === "mythic") return { label: "Mythic", color: "#c084fc" };
    if (t.tier === "legendary") return { label: "Legendary", color: "#f97316" };
    if (t.tier === "rare" || t.tier === "rare_neg") return { label: "Rare", color: "#38bdf8" };
    return { label: "Common", color: "#888" };
  }
  function isHighTier(t) {
    return t.tier === "mythic" || t.tier === "legendary" || t.tier === "rare";
  }
  function tierColor(t) {
    return traitTierLabel(t).color;
  }
  function catHas(cat2, name) {
    return (cat2.trait || PLAIN).name === name || (cat2.extraTraits || []).some((t) => t.name === name);
  }
  function catAllTraits(cat2) {
    const all = [cat2.trait || PLAIN, ...cat2.extraTraits || []];
    return all.filter((t) => t.name !== "Plain");
  }
  function catIsPlain(cat2) {
    return (cat2.trait || PLAIN).name === "Plain" && !(cat2.extraTraits || []).length;
  }
  function catIsKitten(cat2) {
    return !!(cat2.parentIds && cat2.parentIds.length > 0 && (cat2.stats?.tp || 0) === 0);
  }
  function addTrait(cat2, trait) {
    if (!cat2.trait) cat2.trait = PLAIN;
    if (cat2.trait.name === "Plain") {
      cat2._wasPlain = true;
      cat2.trait = trait;
      assignEpithet(cat2);
      return true;
    }
    if (!(cat2.extraTraits || []).length && cat2.trait.name !== trait.name) {
      cat2.extraTraits = [trait];
      return true;
    }
    return false;
  }
  const HT = [
    { name: "Stray", base: { c: 15, m: 2 }, ex: "Any cat alone", echo: "alone" },
    { name: "Kin", base: { c: 40, m: 4 }, ex: "2 same season", echo: "together" },
    { name: "Two Kin", base: { c: 80, m: 4 }, ex: "2 of one season + 2 of another", echo: "balanced" },
    { name: "Clowder", base: { c: 110, m: 6 }, ex: "3 of the same season", echo: "pack" },
    { name: "Kindred", base: { c: 110, m: 6 }, ex: "3+ cats with the same trait", hidden: true, echo: "chosen family" },
    { name: "Full Den", base: { c: 130, m: 6 }, ex: "3 of one season + 2 of another", echo: "home" },
    { name: "Colony", base: { c: 180, m: 9 }, ex: "4 of the same season", echo: "unified" },
    { name: "Litter", base: { c: 260, m: 14 }, ex: "5 of the same season", echo: "one blood" }
  ];
  function getHtLevel(htName, levels) {
    return (levels || {})[htName] || 1;
  }
  function getHtScaled(ht, level) {
    const lv = Math.max(1, level);
    if (lv <= 1) return ht.base;
    const chipScale = 1 + (lv - 1) * 0.15;
    const multAdd = (lv - 1) * 1;
    return { c: Math.round(ht.base.c * chipScale), m: ht.base.m + multAdd };
  }
  const SCROLL_POOL = ["Kin", "Two Kin", "Clowder", "Full Den", "Colony", "Litter", "Kindred"];
  function genScrolls(ante, htLevels) {
    const played = Object.keys(htLevels).filter((k) => htLevels[k] > 0);
    const pool = played.length >= 3 ? shuf(played).slice(0, 3) : shuf([.../* @__PURE__ */ new Set([...played, ...SCROLL_POOL])]).slice(0, 3);
    return pool.slice(0, 3).map((name) => {
      const ht = HT.find((h) => h.name === name);
      const lv = getHtLevel(name, htLevels);
      const nextBase = ht ? getHtScaled(ht, lv + 1) : null;
      const price = 3 + ante + Math.floor(lv / 2);
      return { name, lv, nextLv: lv + 1, nextBase, price, ht };
    });
  }
  const POWER_COMBOS = [
    { name: "Twins", bonus: { c: 20, m: 2 }, standalone: { c: 40, m: 3 }, ex: "2 same power", hidden: true, echo: "matched pair" },
    { name: "Two Pair", bonus: { c: 40, m: 3 }, standalone: { c: 70, m: 5 }, ex: "2+2 same power", hidden: true, echo: "double matched" },
    { name: "Prowl", bonus: { c: 30, m: 2 }, standalone: { c: 60, m: 4 }, ex: "3 consecutive power", hidden: true, echo: "in step" },
    // ~23%
    { name: "Triplets", bonus: { c: 60, m: 5 }, standalone: { c: 110, m: 6 }, ex: "3 same power", hidden: true, echo: "equals" },
    // ~10%
    { name: "Full House", bonus: { c: 100, m: 7 }, standalone: { c: 160, m: 8 }, ex: "3+2 same power", hidden: true, echo: "a perfect den" },
    { name: "Stalk", bonus: { c: 50, m: 3 }, standalone: { c: 90, m: 5 }, ex: "4 consecutive power", hidden: true, echo: "rising" },
    // ~7%
    { name: "Mirrors", bonus: { c: 140, m: 9 }, standalone: { c: 210, m: 11 }, ex: "4 same power", hidden: true, echo: "matched" },
    // ~0.6%
    { name: "Nine Lives", bonus: { c: 80, m: 5 }, standalone: { c: 140, m: 7 }, ex: "5 consecutive power", hidden: true, echo: "the last hand" },
    // ~1%
    { name: "Quintuplets", bonus: { c: 250, m: 15 }, standalone: { c: 350, m: 18 }, ex: "5 same power", hidden: true, echo: "impossible odds" }
    // near 0%
  ];
  const FAMS = [
    { id: "f1", name: "Falling Leaf", icon: "\u{1F342}", desc: "Autumn cats: +2 bonus each, +5 if 3+", eff: (c) => {
      const n = c.filter((x) => getCatBreeds(x).includes("Autumn")).length;
      return { mult: n * 2 + (n >= 3 ? 5 : 0) };
    } },
    { id: "f2", name: "Warm Hearth", icon: "\u2600\uFE0F", desc: "Summer cats: +2 bonus each, +5 if 3+", eff: (c) => {
      const n = c.filter((x) => getCatBreeds(x).includes("Summer")).length;
      return { mult: n * 2 + (n >= 3 ? 5 : 0) };
    } },
    { id: "f3", name: "Snowglobe", icon: "\u{1F52E}", desc: "Winter cats: +2 bonus each, +5 if 3+", eff: (c) => {
      const n = c.filter((x) => getCatBreeds(x).includes("Winter")).length;
      return { mult: n * 2 + (n >= 3 ? 5 : 0) };
    } },
    { id: "f4", name: "First Bud", icon: "\u{1F338}", desc: "Spring cats: +2 bonus each, +5 if 3+", eff: (c) => {
      const n = c.filter((x) => getCatBreeds(x).includes("Spring")).length;
      return { mult: n * 2 + (n >= 3 ? 5 : 0) };
    } },
    { id: "f5", name: "Golden Yarn", icon: "\u{1F9F6}", desc: "+15 base score per cat. 3+ seasons: +25 extra", eff: (c) => {
      const seasons = new Set(c.map((x) => x.breed));
      return { chips: c.length * 15 + (seasons.size >= 3 ? 25 : 0) };
    } },
    { id: "f6", name: "Moonstone", icon: "\u{1F319}", desc: "\xD71.3 if 4 or more cats", eff: (c) => c.length >= 4 ? { xMult: 1.3 } : {} },
    { id: "f7", name: "Black Mirror", icon: "\u{1FA9E}", desc: "\xD71.5 if all same season", eff: (c) => {
      const b0 = getCatBreeds(c[0] || {});
      return c.length > 1 && c.every((x) => getCatBreeds(x).some((br) => b0.includes(br))) ? { xMult: 1.5 } : {};
    } },
    { id: "f8", name: "Witch's Bell", icon: "\u{1F514}", desc: "+1 Ration per hand", eff: () => ({ gold: 1 }) },
    { id: "f9", name: "Stubborn's Stone", icon: "\u{1FAA8}", desc: "Stubborn in hand: +6 bonus", eff: (c) => c.some((x) => catHas(x, "Stubborn")) ? { mult: 6 } : {} },
    { id: "f10", name: "Wild Card", icon: "\u{1F0CF}", desc: "\xD72 with Wild cat", eff: (c) => c.some((x) => catHas(x, "Wild")) ? { xMult: 2 } : {} },
    { id: "f11", name: "Echo Chamber", icon: "\u{1F50A}", desc: "Echo cats: +5 bonus each", eff: (c) => ({ mult: c.filter((x) => catHas(x, "Echo")).length * 5 }) },
    { id: "f12", name: "Brawler's Belt", icon: "\u{1F94B}", desc: "Scrapper cats: +3 bonus each", eff: (c) => ({ mult: c.filter((x) => catHas(x, "Scrapper")).length * 3 }) },
    { id: "f18", name: "Iron Will", icon: "\u{1F6E1}\uFE0F", desc: "\xD71.15 per hardened cat", eff: (c) => {
      const sc = c.filter((x) => x.scarred && !x.injured).length;
      return sc > 0 ? { xMult: Math.round(Math.pow(1.15, sc) * 100) / 100 } : {};
    } },
    { id: "f19", name: "Nesting Ward", icon: "\u{1F3E0}", desc: "+1 Shelter slot", eff: () => ({ shelter: 1 }), passive: true },
    // ★ Hand-type bonus wards. steer hand selection strategy
    { id: "f20", name: "Pair Bond", icon: "\u{1F48E}", desc: "Kin \xD71.4", eff: () => ({}), htBonus: { Kin: { xMult: 1.4 } } },
    { id: "f21", name: "Pack Howl", icon: "\u{1F43A}", desc: "Clowder \xD71.3, Colony \xD71.5", eff: () => ({}), htBonus: { Clowder: { xMult: 1.3 }, Colony: { xMult: 1.5 } } },
    { id: "f22", name: "Harmony", icon: "\u{1F3B5}", desc: "Two Kin \xD71.7, Den \xD71.6", eff: () => ({}), htBonus: { "Two Kin": { xMult: 1.7 }, "Full Den": { xMult: 1.6 } } },
    { id: "f23", name: "Lone Wolf", icon: "\u{1F311}", desc: "Stray \xD72.5", eff: () => ({}), htBonus: { Stray: { xMult: 2.5 } } },
    { id: "f24", name: "Reserve Strength", icon: "\u{1FA91}", desc: "+2 bonus per unplayed cat", eff: (c, ctx) => ({ mult: (ctx?.benchSize || 0) * 2 }) },
    { id: "f25", name: "Soul Bond", icon: "\u{1F49C}", desc: "Kindred \xD71.6", eff: () => ({}), htBonus: { Kindred: { xMult: 1.6 } } }
  ];
  const CURSES = [
    { id: "c_shrink", name: "Cramped Cage", icon: "\u{1F4E6}", desc: "Hand size -1", tier: 1, fx: { hsMod: -1 } },
    { id: "c_silence", name: "Muzzled", icon: "\u{1F910}", desc: "Wards silenced", tier: 1, fx: { silence: true } },
    { id: "c_fog", name: "Fog of War", icon: "\u{1F32B}\uFE0F", desc: "Cards face-down", tier: 1, fx: { fog: true } },
    { id: "c_exile", name: "Exile", icon: "\u{1F6AB}", desc: "One season can't score", tier: 2, fx: { exile: true } },
    { id: "c_fragile", name: "Glass Claws", icon: "\u{1F494}", desc: "No discards", tier: 2, fx: { noDisc: true } },
    { id: "c_famine", name: "Famine", icon: "\u{1F9B4}", desc: "No Rations earned this night", tier: 2, fx: { famine: true } },
    { id: "c_double", name: "Double Down", icon: "\u{1F3B2}", desc: "Target \xD71.3", tier: 3, fx: { tgtMult: 1.3 } }
  ];
  const NIGHT_MODS = [
    { id: "surge", name: "Resonance Surge", icon: "\u2728", desc: "Same-season cats score +4 extra chips tonight", fx: { seasonChipsBonus: 4 } },
    { id: "lone", name: "Lone Wolf", icon: "\u{1F43A}", desc: "Hands of 1-2 cats: \xD71.5 total score tonight", fx: { loneWolfMult: 1.5 } },
    { id: "full", name: "Full Moon", icon: "\u{1F315}", desc: "Hands of 4+ cats: +3 bonus per cat tonight", fx: { fullMoonMult: 3 } },
    { id: "thin", name: "Thin Ice", icon: "\u{1F9CA}", desc: "One fewer hand per blind tonight", fx: { handMod: -1 } },
    { id: "blood", name: "Blood Moon", icon: "\u{1FA78}", desc: "Hardened cats score \xD71.5 tonight", fx: { bloodMoonMult: 1.5 } },
    { id: "bonds", name: "Kindred Spirits", icon: "\u{1F495}", desc: "Bonded pairs played together: +5 bonus per pair tonight", fx: { bondHandMult: 5 } }
  ];
  const NERVE = [
    { name: "Still", xM: 1, color: "#666", glow: "transparent", desc: "" },
    // 0
    { name: "Stirring", xM: 1.05, color: "#6b7280", glow: "transparent", desc: "" },
    // 1
    { name: "Awake", xM: 1.1, color: "#6b7280", glow: "#6b728033", desc: "" },
    // 2
    { name: "Alert", xM: 1.15, color: "#b8956a", glow: "#b8956a33", desc: "" },
    // 3
    { name: "Tense", xM: 1.2, color: "#b8956a", glow: "#b8956a44", desc: "" },
    // 4
    { name: "Focused", xM: 1.25, color: "#b8956a", glow: "#b8956a44", desc: "" },
    // 5
    { name: "Cornered", xM: 1.3, color: "#b85c2c", glow: "#b85c2c44", desc: "" },
    // 6
    { name: "Cornered", xM: 1.35, color: "#b85c2c", glow: "#b85c2c55", desc: "" },
    // 7
    { name: "Defiant", xM: 1.4, color: "#d97706", glow: "#d9770655", desc: "backs against the wall" },
    // 8
    { name: "Defiant", xM: 1.45, color: "#d97706", glow: "#d9770666", desc: "backs against the wall" },
    // 9
    { name: "Burning", xM: 1.5, color: "#f59e0b", glow: "#f59e0b66", desc: "past the point of fear" },
    // 10
    { name: "Burning", xM: 1.55, color: "#f59e0b", glow: "#f59e0b77", desc: "past the point of fear" },
    // 11
    { name: "Fury", xM: 1.65, color: "#fb923c", glow: "#fb923c77", desc: "nothing left to lose" },
    // 12
    { name: "Blazing", xM: 1.75, color: "#fbbf24", glow: "#fbbf2488", desc: "the air catches fire" },
    // 13
    { name: "Blazing", xM: 1.85, color: "#fbbf24", glow: "#fbbf24aa", desc: "the air catches fire" },
    // 14
    { name: "Undying", xM: 1.95, color: "#fef08a", glow: "#fef08aaa", desc: "they should have stayed down" },
    // 15
    { name: "Undying", xM: 2.1, color: "#fef08a", glow: "#fef08abb", desc: "they should have stayed down" },
    // 16
    { name: "NINTH LIFE", xM: 2.3, color: "#ffffffdd", glow: "#ffffffbb", desc: "the last one" }
    // 17
  ];
  const NERVE_MAX = 17;
  const UPGRADES = [
    // --- TIER 1: FUNDAMENTALS (always visible) ---
    { id: "u_g", flavor: "The remembered buried rations for those who came next.", name: "Buried Provisions", icon: "\u{1F41F}", desc: "+2 Rations each night", cost: 25, b: { gold: 2 }, max: 3, tier: 1 },
    { id: "u_d", flavor: "Sharper eyes find allies in the dark.", name: "Quick Instincts", icon: "\u{1F4E3}", desc: "+1 Free Recruit per round", cost: 40, b: { freeRecruits: 1 }, max: 2, tier: 1 },
    { id: "u_den", flavor: "Deeper earth. Safer dreams.", name: "Deeper Burrow", icon: "\u{1F3E0}", desc: "+1 Shelter slot in the den", cost: 50, b: { shelter: 1 }, max: 2, tier: 1 },
    { id: "u_keen", flavor: "The colony knows who to call.", name: "Keen Eye", icon: "\u{1F3AF}", desc: "Recruit costs 1\u{1F41F} less (min free)", cost: 35, b: { recruitDiscount: 1 }, max: 1, tier: 1 },
    // --- TIER 2: STRATEGIC (unlocks after 2 purchases) ---
    { id: "u_h", flavor: "One more chance. The colony fights faster.", name: "Stubborn Will", icon: "\u270A", desc: "+1 Hand per round", cost: 65, b: { hands: 1 }, max: 2, tier: 2 },
    { id: "u_f", flavor: "The old fire burns in the new colony.", name: "The Old Fire", icon: "\u{1F525}", desc: "Start with +2 Nerve", cost: 70, b: { fervor: 2 }, max: 2, tier: 2 },
    { id: "u_pot", flavor: "Protection. The first gift of the remembered.", name: "The Warden", icon: "\u{1F6E1}\uFE0F", desc: "Start each run with a random ward", cost: 75, b: { startWard: 1 }, max: 2, tier: 2 },
    { id: "u_b", flavor: "Memory in the blood. Deeper than names.", name: "Blood Memory", icon: "\u{1FA78}", desc: "Starter cat inherits a Hearth cat's trait", cost: 80, b: { bloodMemory: 1 }, max: 1, tier: 2 },
    { id: "u_fertile", flavor: "The earth remembers how to grow.", name: "Fertile Ground", icon: "\u{1F33F}", desc: "Den breed chance +15%", cost: 60, b: { breedBoost: 0.15 }, max: 1, tier: 2 },
    { id: "u_scroll", flavor: "Ancient knowledge in paw prints.", name: "Ancient Scrolls", icon: "\u{1F4DC}", desc: "Start with a random hand type leveled up", cost: 75, b: { startScroll: 1 }, max: 1, tier: 2 },
    // --- TIER 3: POWER (unlocks after 4 purchases) ---
    { id: "u_c", name: "Bloodline", icon: "\u{1F4FF}", desc: "Companion +2 power, drafted cats +1 power", cost: 100, b: { heirloom: 2, draftPower: 1 }, max: 1, tier: 3 },
    { id: "u_scr", name: "Scar Memory", icon: "\u{1FA79}", desc: "Scarred cats gain +2 mult (stacks with trait)", cost: 100, b: { scarMult: 2 }, max: 1, tier: 3 },
    { id: "u_grd", name: "Grudge Tempering", icon: "\u26A1", desc: "Grudge penalty reduced: \u22122 \u2192 \u22121 bonus", cost: 110, b: { grudgeWisdom: 1 }, max: 1, tier: 3 },
    { id: "u_bench", flavor: "Those who watch learn twice as much.", name: "Deep Reserves", icon: "\u{1FA91}", desc: "Unplayed cats give +50% passive bonus", cost: 90, b: { doubleBench: 1 }, max: 1, tier: 3 },
    { id: "u_combo", flavor: "Power aligned. The colony resonates.", name: "Power Resonance", icon: "\u{1F4A5}", desc: "Power combos give +50% bonus", cost: 110, b: { comboBoost: 0.5 }, max: 1, tier: 3 },
    // --- TIER 4: ENDGAME (unlocks after 6 purchases) ---
    { id: "u_o", name: "What The Stars Owe", icon: "\u{1F50D}", desc: "+50% Stardust from the Hearth", cost: 120, b: { dustBonus: 0.5 }, max: 1, tier: 4 },
    { id: "u_draft", flavor: "One more voice in the chorus.", name: "Wider Horizons", icon: "\u{1F305}", desc: "See 4 cats per draft wave instead of 3", cost: 130, b: { draftSize: 1 }, max: 1, tier: 4 },
    { id: "u_trait_luck", name: "The Colony's Memory", icon: "\u{1F9EC}", desc: "Drafted cats 55% chance of Rare trait (vs 35%)", cost: 140, b: { traitLuck: 1 }, max: 1, tier: 4 },
    { id: "u_bond_str", name: "Unbreakable Bonds", icon: "\u{1F495}", desc: "Bonded pairs score \xD71.75", cost: 150, b: { bondBoost: 1 }, max: 1, tier: 4 },
    { id: "u_nerve_floor", name: "Ember Within", icon: "\u{1F56F}\uFE0F", desc: "+2 starting Nerve each run", cost: 160, b: { fervor: 2 }, max: 1, tier: 4 },
    { id: "u_second_wind", name: "Second Wind", icon: "\u{1F4A8}", desc: "+1 extra Hand on final blind of each night", cost: 180, b: { bossHand: 1 }, max: 1, tier: 4 },
    { id: "u_4draft", name: "Colony Instinct", icon: "\u{1F431}", desc: "Draft 4 cats instead of 3", cost: 170, b: { extraDraft: 1 }, max: 1, tier: 4 },
    { id: "u_mythic", name: "Mythic Bloodline", icon: "\u{1F31F}", desc: "Guarantee 1 Legendary trait in each draft", cost: 200, b: { mythicChance: 1 }, max: 1, tier: 4 }
  ];
  const MILESTONES = [
    { req: 3, bonus: { gold: 1 }, label: "First Light" },
    { req: 6, bonus: { freeRecruits: 1 }, label: "Growing Warmth" },
    { req: 10, bonus: { hands: 1 }, label: "Burning Bright" },
    { req: 15, bonus: { gold: 2 }, label: "The Colony Remembers" },
    { req: 20, bonus: { fervor: 1 }, label: "Legends Gather" },
    { req: 30, bonus: { hands: 1, freeRecruits: 1 }, label: "The Hearth Eternal" }
  ];
  const CAT_NAMES = [
    // Tender (sonorant-heavy. for attachment, mourning, loss)
    "Mabel",
    "Penny",
    "Clover",
    "Milo",
    "Olive",
    "Willow",
    "Maple",
    "Poppy",
    "Wren",
    "Ruby",
    "Percy",
    "Fern",
    "Pearl",
    "Opal",
    "Hazel",
    "Honey",
    "Ada",
    "Flora",
    "Plum",
    "Sage",
    "Lumen",
    "Maren",
    "Solene",
    "Lark",
    "Rue",
    "Sable",
    "Linnea",
    "Iris",
    "Yarrow",
    // Earned-feeling (imply history. survivors, not pets)
    "Cinder",
    "Soot",
    "Brindle",
    "Thistle",
    "Gale",
    "Hob",
    "Rook",
    "Tallow",
    "Spindle",
    "Thresh",
    "Knot",
    "Tinder",
    "Sedge",
    "Wisp",
    "Ghost",
    "Twice",
    "Waif",
    "Vagrant",
    "Notch",
    "Scruff",
    "Burr",
    "Smudge",
    "Patch",
    "Tuft",
    "Scrap",
    "Char",
    "Ravel",
    // Fierce (plosive-forward. memorable and expendable)
    "Bracken",
    "Crook",
    "Pitch",
    "Buckle",
    "Brunt",
    "Knox",
    "Gravel",
    "Stark",
    "Harrow",
    // Nature / world (grounded, real, textured)
    "Thimble",
    "Candle",
    "Locket",
    "Lantern",
    "Compass",
    "Cobalt",
    "Shale",
    "Marrow",
    "Truffle",
    "Pepper",
    "Thorn",
    "Flicker",
    "Hemlock",
    "Cairn",
    "Bramble",
    "Pyre",
    "Quarry",
    "Sullen",
    "Ermine",
    "Wicker",
    "Talon",
    "Anvil",
    "Ember",
    "Slate"
  ];
  const SEASON_NAMES = {
    Autumn: ["Rowan", "Amber", "Copper", "Russet", "Acorn", "Hickory", "Walnut", "Harvest", "Tawny", "Ashen", "Roan", "Fen", "Sorrel", "Umber", "Husk"],
    Winter: ["Frost", "Silver", "Hush", "Rime", "Quill", "Flurry", "Aspen", "Ivory", "Sterling", "Mist", "Pebble", "Nighten", "Boreal", "Glaze"],
    Summer: ["Blaze", "Brass", "Soleil", "Marigold", "Saffron", "Dahlia", "Clemmie", "Zinnia", "Coral", "Flare", "Sienna", "Scald", "Torch"],
    Spring: ["Blossom", "Dew", "Clove", "Primrose", "Violet", "Aster", "Linden", "Briar", "Ivy", "Moss", "Sprout", "Verdant", "Sapling"]
  };
  const TRAIT_NAMES = {
    Eternal: ["Vesper", "Solace", "Haven", "Riven", "Vigil", "Crest", "Herald", "Starling", "Meridian"],
    Phoenix: ["Kindle", "Dawn", "Ash", "Scorch", "Fable", "Remnant", "Reverie", "Crucible"],
    Chimera: ["Puzzle", "Mosaic", "Riddle", "Motley", "Kaleid", "Prisma", "Mirage"],
    Alpha: ["Rex", "Duke", "Reign", "Crown", "Apex", "Prime", "Summit", "Valor"],
    Nocturnal: ["Dusk", "Shade", "Eclipse", "Twilight", "Gloaming", "Umbra", "Nyx", "Eventide"],
    Scrapper: ["Grit", "Flint", "Fang", "Spike", "Bolt", "Raze", "Vice", "Wreck"],
    Cursed: ["Jinx", "Hex", "Bane", "Omen", "Wraith", "Murk", "Pall", "Blight"],
    Guardian: ["Ward", "Bastion", "Aegis", "Warden", "Shield", "Sentinel", "Anchor", "Keep"],
    Feral: ["Claw", "Snarl", "Prowl", "Savage", "Maw", "Rend", "Lash", "Torrent"],
    Seer: ["Oracle", "Vision", "Augur", "Sight", "Prophet", "Lens", "Rune", "Portent"],
    Stubborn: ["Grim", "Stone", "Iron", "Clench", "Root", "Brace", "Plod", "Bulwark"],
    Stray: ["Drift", "Wander", "Bridge", "Path", "Roam", "Link", "Range", "Venture"],
    Loyal: ["True", "Bond", "Steady", "Oath", "Heart", "Trust", "Pact", "Follow"],
    Scavenger: ["Berry", "Burrow", "Dig", "Cache", "Gather", "Stock", "Nest"]
  };
  const TITL = { Autumn: ["the Fading", "who Remembers", "Last of the Harvest", "of Falling Leaves"], Summer: ["the Undying", "who Burns", "Keeper of Flames", "the Defiant"], Winter: ["the Patient", "who Endures", "Still as Stone", "the Unyielding"], Spring: ["the Tender", "who Grows", "of New Roots", "the Renewing"] };
  const TITL_RARE = { Eternal: ["the Myth", "of Legend", "the Undying Name", "whom the Dark Remembers"], Phoenix: ["Twice-Risen", "the Unkillable", "who Returned", "Born from Ash"], Chimera: ["of Many Faces", "the Impossible", "who Contains Multitudes", "Between Worlds"], Alpha: ["the Unquestioned", "who Leads", "the Apex", "First Among All"], Nocturnal: ["of the Dark Hours", "the Sleepless", "who Wakes at Midnight", "Last Light Standing"], Echo: ["Twice-Heard", "the Resonance", "who Lingers", "the Afterimage"], Feral: ["the Untamed", "who Hunts", "of the Wild Pack", "the Savage"], Seer: ["the Knowing", "who Foresaw", "of Clear Eyes", "the Pattern-Reader"] };
  const EPITHETS = {
    scarred: {
      key: "scarred",
      test: (c) => c.scarred && !c.epithet,
      titles: ["the Marked", "the Scarred", "who Bled"],
      bonus: { mult: 1 },
      desc: "+1 bonus (battle-hardened)",
      flavor: "What didn't kill them made them permanent."
    },
    bonded: {
      key: "bonded",
      test: (c) => c.bondedTo && !c.epithet,
      titles: ["the Devoted", "the Beloved", "who Chose"],
      bonus: { bondMult: true },
      desc: "+2 mult when bonded partner is played",
      flavor: "They chose each other in the dark."
    },
    grudgeResolved: {
      key: "grudgeResolved",
      test: (c) => c._grudgeResolved && !c.epithet,
      titles: ["the Forgiven", "the Mended", "who Let Go"],
      bonus: { grudgeImmune: true },
      desc: "Immune to future grudges",
      flavor: "Some wounds close from the inside."
    },
    bossNight: {
      key: "bossNight",
      test: (c, ctx) => ctx?.bossNight && !c.epithet,
      gen: (c, ctx) => [`of the ${["First", "Second", "Third", "Fourth", "Fifth"][Math.min((ctx?.ante || 1) - 1, 4)]} Night`],
      bonus: { mult: 3 },
      desc: "+3 bonus (boss slayer)",
      flavor: "The test came. They answered."
    },
    decisive: {
      key: "decisive",
      test: (c, ctx) => ctx?.decisive && !c.epithet,
      titles: ["the Decisive", "who Tipped the Scale", "the Clutch"],
      bonus: { clutchMult: 3 },
      desc: "+3 bonus on clutch hands",
      flavor: "One hand. Everything on it."
    },
    lastStanding: {
      key: "lastStanding",
      test: (c, ctx) => ctx?.lastStanding && !c.epithet,
      titles: ["the Alone", "Last Standing", "the Survivor"],
      bonus: { soloMult: 4 },
      desc: "+4 bonus when only cat of their season",
      flavor: "Everyone else fell. They didn't."
    },
    grownUp: {
      key: "grownUp",
      test: (c) => c._grewUp && !c.epithet,
      titles: ["the Grown", "the Bloomed", "who Found Their Name"],
      bonus: { power: 2 },
      desc: "+2 Power (matured)",
      flavor: "Born small. Grew into something."
    },
    // NEW epithets
    unbreakable: {
      key: "unbreakable",
      test: (c) => (c.stats?.injuries || 0) >= 3 && !c.epithet,
      titles: ["the Unbreakable", "the Enduring", "who Would Not Fall"],
      bonus: { mult: 2 },
      desc: "+2 bonus",
      flavor: "What kills others makes them quieter."
    },
    thunder: {
      key: "thunder",
      test: (c, ctx) => ctx?.thunder && !c.epithet,
      titles: ["the Thunder", "the Storm", "who Shook the Dark"],
      bonus: { thunderMult: 2 },
      desc: "+2 bonus on hands scoring 5k+",
      flavor: "The number echoed. The dark flinched."
    },
    parent: {
      key: "parent",
      test: (c) => (c.stats?.kidsBreed || 0) >= 2 && !c.epithet,
      titles: ["the Mother", "the Father", "who Built a Future"],
      bonus: { parentMult: true },
      desc: "+1 bonus per own kitten alive",
      flavor: "They built a future in the dark."
    },
    wanderer: {
      key: "wanderer",
      test: (c) => c._wasPlain && !c.epithet,
      titles: ["the Wanderer", "the Becoming", "who Arrived with Nothing"],
      bonus: { mult: 2 },
      desc: "+2 bonus",
      flavor: "They arrived with nothing and became something."
    },
    mourning: {
      key: "mourning",
      test: (c) => c._mateDied,
      titles: ["the Mourning", "the Bereft", "who Carries Two Names"],
      bonus: { mult: 3 },
      desc: "+3 mult (grief)",
      flavor: "They carry two names now."
    },
    // v0.7: The Spared — when player refuses The Offering sacrifice
    spared: {
      key: "spared",
      test: (c) => c._spared && !c.epithet,
      titles: ["the Spared", "the Kept", "who Almost Wasn't"],
      bonus: { mult: 2 },
      desc: "+2 bonus",
      flavor: "They don't know how close it was."
    },
    // v0.7: The Returned — ghost from a previous run
    returned: {
      key: "returned",
      test: (c) => c._returned && !c.epithet,
      titles: ["the Returned", "the Echo", "who Came Back"],
      bonus: { mult: 2 },
      desc: "+2 bonus",
      flavor: "You remember me. I almost didn't come back."
    }
  };
  function assignEpithet(cat2, ctx = {}) {
    for (const [, ep] of Object.entries(EPITHETS)) {
      if (ep.test(cat2, ctx)) {
        const pool = ep.gen ? ep.gen(cat2, ctx) : ep.titles;
        const title = pk(pool);
        if (!cat2.epithet) {
          cat2.epithet = title;
          cat2.epithetKey = ep.key;
          cat2.story = [...(cat2.story || []).slice(-4), `Earned: "${title}"`];
          cat2._newEpithet = true;
          if (ep.bonus.power) cat2.power = Math.min(15, cat2.power + ep.bonus.power);
        } else {
          if (!cat2.earnedEpithets) cat2.earnedEpithets = [];
          if (!cat2.earnedEpithets.some((e) => e.key === ep.key)) {
            cat2.earnedEpithets.push({ key: ep.key, title, desc: ep.desc, flavor: ep.flavor });
            cat2.story = [...(cat2.story || []).slice(-4), `Also earned: "${title}"`];
          }
        }
        return;
      }
    }
  }
  function getFullName(cat2) {
    const first = cat2.name.split(" ")[0];
    return cat2.epithet ? `${first} ${cat2.epithet}` : cat2.name;
  }
  function epithetToastMsg(cat2) {
    const fn = cat2.name.split(" ")[0];
    return `${fn} earned: "${cat2.epithet}"`;
  }
  const DEN_BREED = [
    (a, b, baby) => `${a} and ${b} curled around each other as the moon rose. By dawn, ${baby} was breathing softly between them.`,
    (a, b, baby) => `No one saw the moment it happened. Only that when the light came, there were three where there had been two. ${baby} blinked at the world for the first time.`,
    (a, b, baby) => `${a} groomed ${b}'s ear. ${b} pressed close. ${baby} arrived quiet as a secret, already purring.`,
    (a, b, baby) => `They chose each other. In the gentleness between heartbeats, ${baby} came into being.`,
    (a, b, baby) => `${a} had never stayed this close to anyone before. But ${b} was different. And ${baby} was proof.`,
    (a, b, baby) => `The den was small and warm. ${a} and ${b} made it smaller. ${baby} made it complete.`
  ];
  const DEN_FIGHT = [
    (a, b, loser) => `A growl in the dark. Then claws. ${loser} pulled away, bleeding. Some things don't heal clean.`,
    () => "Nothing happened. Sometimes that's the most merciful thing a night can do.",
    () => "Someone purred. Someone shifted. The others pretended to sleep. In the morning, no one mentioned the sound they all heard at the treeline.",
    () => "Rain on the roof. The den smelled like wet earth and warm fur. For a few hours, they were just animals. Just alive. Just here.",
    () => "The quietest nights are the ones you remember. Not for what happened. For what almost didn't."
  ];
  const DEN_PHOENIX = [
    (a, b, risen) => `The fight should have ended ${risen}. It did, for a moment. But something older than death flickered behind those eyes, and ${risen} rose, changed, burning with what comes after the last chance.`,
    (a, b, risen) => `${risen} lay still. The others turned away. Then: light. Heat. The cat that stood up was not the cat that fell. Something had been traded. Something had been gained.`
  ];
  function getDeathMemorial(cat2, ante) {
    const fn = cat2.name.split(" ")[0];
    const tp = cat2.stats?.tp || 0;
    const bs = cat2.stats?.bs || 0;
    const bonded = cat2.bondedTo;
    const scarred = cat2.scarred;
    const ep = cat2.epithet;
    const ek = cat2.epithetKey;
    if (ep) {
      if (ek === "scarred") return `${fn} ${ep}. The scar outlived the cat who wore it.`;
      if (ek === "bonded") return `${fn} ${ep}. They chose each other in the dark. One of them has to carry both names now.`;
      if (ek === "mourning") return `${fn} ${ep}. They were already carrying two names. Now the colony carries three.`;
      if (ek === "thunder") return `${fn} ${ep}. The score that shook the dark. The dark shook back.`;
      if (ek === "decisive") return `${fn} ${ep}. The clutch hand. The one everyone counted on. Gone.`;
      if (ek === "unbreakable") return `${fn} ${ep}. Survived everything. Until now.`;
      if (ek === "parent") return `${fn} ${ep}. Built a future in the dark. Won't see it.`;
      if (ek === "grownUp") return `${fn} ${ep}. Born small. Grew into something. Something the colony will miss.`;
      return `${fn} ${ep}. The title stays. The cat doesn't.`;
    }
    if (tp >= 10 && bonded) return `${fn} played ${tp} hands. Bonded. Hardened. Carried more than their share. The colony will feel this space for a long time.`;
    if (tp >= 8) return `${fn} played ${tp} hands. Best score: ${bs.toLocaleString()}. They knew every fight. Every number. Gone.`;
    if (bonded) return `${fn} was bonded. The mate will look for them tomorrow. And the day after. And the day after that.`;
    if (scarred) return `${fn} was hardened in Night ${Math.max(1, ante - 1)}. Survived that. Didn't survive this.`;
    if (tp >= 3) return `${fn} was finding their rhythm. ${tp} hands played. A story just getting started.`;
    if (tp === 0 && cat2.origin) return `${fn} never played a single hand. ${cat2.origin.replace(/\.$/, "")}. That's all they were.`;
    if (tp === 0) return `${fn} never played a single hand. Never got the chance. Remember them anyway.`;
    if (cat2.origin) return `${fn}. ${cat2.origin.replace(/\.$/, "")}. The dark didn't care.`;
    return `${fn}. Say the name. That's all you can do now.`;
  }
  const CAT_REACTIONS = {
    pb: (fn) => [`${fn} has never scored higher.`, `${fn} just peaked. They know it. You can tell.`, `The best hand ${fn} will ever play? Maybe. Maybe not.`],
    carry: (fn, pct) => [`${fn} carried that hand alone.`, `Without ${fn}, that hand collapses.`, `${fn} did ${pct}% of the work. The others watched.`],
    clutch: (fn) => [`${fn}. One number. That was all that stood between survival and silence.`, `${fn} pulled them through. Ask the others. they'll tell you.`],
    bond: (a, b) => [`${a} and ${b}. Together, more. Always more.`, `${a} fights harder when ${b} is watching. They both do.`]
  };
  const DEN_GROWTH = [
    (cat2) => `A quiet night for ${cat2}. But the quiet does something. Muscles remember. Instincts sharpen.`,
    (cat2) => `${cat2} sat watching the treeline until dawn. Something behind those eyes had changed.`,
    (cat2) => `${cat2} hunted alone tonight. What came back moved differently. Faster. More certain.`,
    (cat2) => `The others noticed it first: ${cat2} had grown. Not larger. Sharper. The kind of change you can't undo.`,
    (cat2) => `${cat2} practiced the jump seventeen times. On the eighteenth, something clicked. Power isn't born. It's built.`
  ];
  const DEN_TRAINING = [
    (a, b) => `${a} and ${b} circled each other until dawn. Something was settled. Neither will say what.`,
    (a, b) => `They sparred until their muscles burned. ${a} won, probably. ${b} learned more.`,
    (a, b) => `Claws sheathed. Eyes locked. ${a} and ${b} found the line between fighting and learning.`,
    (a, b) => `The wilds taught them both. ${a} led. ${b} followed. Then they switched.`
  ];
  const NIGHT_FLAVOR = [
    "The first night. They sleep with their eyes open.",
    "The second night. Someone keeps watch without being asked. The others pretend not to notice.",
    "The third night. The den gets quieter. Not from fear. From knowing.",
    "The fourth night. Someone purrs in the dark. The others press closer. They know what's coming. They're choosing to be here anyway.",
    "The last night. They don't sleep. They sit together. They know each other's names. That's enough. That's always been enough.",
    "The sixth night. The ones with scars sleep deepest. The ones without can't stop watching the entrance.",
    "The seventh night. They move like a single creature now. Whatever they were before, they're a colony now.",
    "The eighth night. Somebody brought back food and laid it at the entrance without eating any. The others understood.",
    "The ninth night. Nobody speaks. Nobody needs to. They know."
  ];
  const BLIND_WHISPER = {
    dusk: [
      // The dark stirs. first probe
      "The dark stirs. Testing.",
      "Something shifts at the edge of hearing. Calibrating.",
      "The first test. It was gentle for the first colony too.",
      "Prove you exist. The dark doesn't believe you yet."
    ],
    midnight: [
      // Escalation. the system adjusts
      "It knows you're here now. It's adjusting.",
      "Midnight. The dark runs the same tests it ran on the second colony. They failed here.",
      "Halfway through the night. The dark has your shape now. Your weaknesses.",
      "The number rises. Eight colonies met it. Six couldn't."
    ],
    boss: [
      // The pattern sends its champion
      "The pattern sends what killed the others. It has never failed.",
      "This is why eight colonies fell. This exact test.",
      "Everything before this was calibration. This is the real measurement.",
      "The dark's best pattern. Undefeated. Until maybe now."
    ]
  };
  function getThresholdClear(ante, blind, clutch, pct) {
    if (blind >= 2) return null;
    if (clutch) {
      return pk([
        "One number between you and nothing. One number was enough.",
        "The dark held. You held harder.",
        "That close. The eighth colony knows what close feels like.",
        "The margin was a rounding error. The survival wasn't."
      ]);
    }
    if (pct >= 300) {
      return pk([
        "The number didn't break. It evaporated.",
        "That wasn't survival. That was a statement.",
        "Somewhere in the dark, something took notes."
      ]);
    }
    if (pct >= 200) {
      const crush = [
        "The dark flinched. It doesn't do that often.",
        "More than enough. More than the eight ever managed.",
        "The target shattered like it was never there."
      ];
      if (ante >= 4) crush.push("Four nights in and still hitting like this. The dark is running out of responses.");
      return pk(crush);
    }
    const lines = [
      ["The dark heard something. Wasn't sure what. Decided not to check.", "One hand in. One number down. The smallest victory is still a victory.", "They existed loud enough to matter. For one more round."],
      ["It noticed you. That's the first step to being remembered.", "The second night and you're still making noise. The first colony was quiet by now.", "Louder. The dark is further away than it was."],
      ["Three nights deep. The dark knows your name, your number, your shape. You're still here.", "Most colonies break on Night 3. You bent. That's different.", "The dark gives like it's getting tired of you."],
      ["Four nights. The pattern was supposed to break you by now. It didn't.", "The eighth colony was this strong on Night 4. Remember what happened to them. Then do it differently.", "Still visible. Still burning. The dark expected silence by now."],
      ["The last number. You walked through it like a door you've opened before.", "Five nights and every number broken. The dark has nothing left to say.", "You are not forgettable. You never were."]
    ];
    return pk(lines[Math.min(ante - 1, 4)]);
  }
  const ANTE_ESCALATION = [
    "",
    "The dark noticed the light. It's moving closer.",
    "It remembers your shape now. The numbers tighten.",
    "Four nights. The dark sends the patterns that killed the other eight.",
    "The last number. Everything the dark has. Everything you have. One of you is wrong."
  ];
  const ACHIEVEMENTS = [
    // Tier 1. Foundation (easy: 5✦)
    { id: "first_win", name: "Survivor", desc: "Win your first run", icon: "\u{1F3C6}", dust: 5, check: (s) => s.w >= 1, reward: "5-night mode unlocked" },
    { id: "deathless", name: "Every Single One", desc: "Win with 0 deaths", icon: "\u{1F49A}", dust: 15, check: (_, f) => f === true, reward: "New epigraphs unlocked" },
    { id: "ten_runs", name: "The Stubborn", desc: "Attempt 10 runs", icon: "\u{1F504}", dust: 5, check: (s) => s.r >= 10, reward: "Run counter on title screen" },
    { id: "max_fervor", name: "Nerve of Steel", desc: "Reach maximum Nerve", icon: "\u{1F525}", dust: 5, check: (s) => s.mf >= 9, reward: "Gold nerve flame visual" },
    // Tier 2. Mastery (medium: 15✦)
    { id: "all_breeds", name: "All Four Seasons", desc: "Save each season to Hearth", icon: "\u{1F43E}", dust: 15, check: (s) => {
      const br = new Set((s.disc || []).map((d) => d.split("-")[0]));
      return ["Autumn", "Winter", "Spring", "Summer"].every((b) => br.has(b));
    }, reward: "Season icons glow on title" },
    { id: "five_wins", name: "Colony Leader", desc: "Win 5 runs", icon: "\u{1F451}", dust: 15, check: (s) => s.w >= 5, reward: "Gold colony name on title" },
    { id: "night5", name: "Into the Dark", desc: "Reach Night 5", icon: "\u{1F319}", dust: 15, check: (s) => s.ba >= 5, reward: "Boss traits shown on Night Card" },
    { id: "breeder", name: "The Breeder", desc: "5+ kittens in one run", icon: "\u{1F423}", dust: 15, check: (s) => s.kittensTotal >= 5, reward: "Kitten celebration" },
    // Tier 3. Legend (hard: 30✦)
    { id: "legend_score", name: "NINTH LIFE", desc: "Score 350,000+ in one hand", icon: "\u2728", dust: 30, check: (s) => s.hs >= 35e4, reward: "Gold card borders" },
    { id: "heat_five", name: "Five by Five", desc: "Win 5 runs at Heat 1+", icon: "\u{1F525}", dust: 30, check: (s) => (s.heatWins || 0) >= 5, reward: "Career heat wins shown" },
    { id: "diplomat", name: "The Diplomat", desc: "Resolve 10 grudges across all runs", icon: "\u{1F54A}\uFE0F", dust: 30, check: (s) => (s.grudgesResolved || 0) >= 10, reward: "Upgraded reconciliation" },
    { id: "archivist", name: "The Archivist", desc: "Play 50 hands of one type", icon: "\u{1F4DC}", dust: 30, check: (s) => {
      const hp = s.handTypePlays || {};
      return Object.values(hp).some((v) => v >= 50);
    }, reward: "Custom hand type sound" },
    // Tier 4. Myth (hard: 30✦)
    { id: "ninth_dawn", name: "The Remembering", desc: "Clear the Ninth Dawn", icon: "\u{1F305}", dust: 30, check: (s) => s.ninthDawnCleared === true, reward: "Secret epigraph pool" },
    { id: "constellation", name: "The Constellation", desc: "Save 20+ cats to Hearth", icon: "\u2B50", dust: 30, check: (s) => (s.hearthTotal || 0) >= 20, reward: "Hearth becomes star field" },
    { id: "unbroken", name: "Unbroken Line", desc: "3rd generation cat in colony", icon: "\u{1F46A}", dust: 30, check: (s) => s.thirdGen === true, reward: "Lineage tree in den" },
    { id: "completionist", name: "Completionist", desc: "All other achievements", icon: "\u{1F31F}", dust: 30, check: (s, _, achv) => ACHIEVEMENTS.filter((a) => a.id !== "completionist").every((a) => achv.includes(a.id)), reward: "Alternate title gradient" },
    // NEW. Easy (5✦)
    { id: "first_bond", name: "Heartbound", desc: "First bond formed in a run", icon: "\u{1F495}", dust: 5, check: (s) => (s.maxBonds || 0) >= 1, reward: "Bond sparkle effect" },
    { id: "first_epithet", name: "Named", desc: "A cat earns an epithet", icon: "\u{1F3F7}\uFE0F", dust: 5, check: (s) => (s.epithetsEarned || 0) >= 1, reward: "Epithet glow on cards" },
    { id: "camp_five", name: "Firekeeper", desc: "Camp 5 times across all runs", icon: "\u{1F3D5}", dust: 5, check: (s) => (s.campCount || 0) >= 5, reward: "Camp whisper pool expanded" },
    // NEW. Medium (15✦)
    { id: "clutch_win", name: "By a Thread", desc: "Win a boss fight on the last hand", icon: "\u{1F3AF}", dust: 15, check: (s) => (s.clutchBossWins || 0) >= 1, reward: "Clutch flash enhanced" },
    { id: "hearth_release", name: "Letting Go", desc: "Release a Hearth pair", icon: "\u{1F54A}\uFE0F", dust: 15, check: (s) => (s.hearthReleases || 0) >= 1, reward: "Release ceremony" },
    { id: "full_bonds", name: "Love Colony", desc: "4+ bonded pairs in one run", icon: "\u{1F49E}", dust: 15, check: (s) => (s.maxBonds || 0) >= 4, reward: "Bond constellation visual" },
    { id: "ten_epithets", name: "The Named Ones", desc: "10 epithets earned across runs", icon: "\u{1F4DC}", dust: 15, check: (s) => (s.epithetsEarned || 0) >= 10, reward: "Epithet history in Hearth" },
    { id: "no_market", name: "Off the Grid", desc: "Win without visiting the market", icon: "\u{1F6AB}", dust: 15, check: (s) => (s.marketlessWins || 0) >= 1, reward: "Scavenger bonus increased" },
    // NEW. Hard (30✦)
    { id: "all_bosses", name: "Fear Nothing", desc: "Defeat all 8 unique bosses", icon: "\u{1F480}", dust: 30, check: (s) => {
      const br = s.bossRecord || {};
      return Object.keys(br).filter((k) => br[k].w > 0).length >= 8;
    }, reward: "Boss lore expanded" },
    { id: "triple_mythic", name: "Impossible Colony", desc: "3 Mythic cats alive in one run", icon: "\u2728", dust: 30, check: (s) => (s.maxMythics || 0) >= 3, reward: "Mythic particle effects" },
    { id: "heat_deathless", name: "Untouchable", desc: "Win at Heat 3+ with 0 deaths", icon: "\u{1F6E1}\uFE0F", dust: 30, check: (s) => (s.mh || 0) >= 3 && s.deathlessHeatWin === true, reward: "Invincible title card" },
    { id: "dynasty", name: "Dynasty", desc: "A Hearth child earns an epithet", icon: "\u{1F46A}", dust: 30, check: (s) => (s.dynastyEarned || 0) >= 1, reward: "Dynasty marker on Hearth" },
    // v0.77 C6: Narrative-engagement achievements
    { id: "peacemaker", name: "The Peacemaker", desc: "Resolve 5 grudges in a single run", icon: "\u{1F54A}\uFE0F", dust: 15, check: (s) => (s.maxGrudgesResolved || 0) >= 5, reward: "Grudge glow softens" },
    { id: "storyteller", name: "The Storyteller", desc: "Cat has 5+ story moments", icon: "\u{1F4D6}", dust: 15, check: (s) => (s.maxStoryEntries || 0) >= 5, reward: "Extended biography" },
    { id: "four_wards", name: "The Collector", desc: "Own 4+ wards in one run", icon: "\u{1F6E1}\uFE0F", dust: 15, check: (s) => (s.maxWards || 0) >= 4, reward: "Ward synergy sparkle" }
  ];
  const BOSS_PORTRAIT_BASE = "https://raw.githubusercontent.com/greatgamesgonewild/ninth-life/main/bosses/";
  const BOSS_PORTRAITS = { hunger: "hunger.webp", territory: "territory.webp", mother: "mother.webp", swarm: "swarm.webp", forgetting: "forgetting.webp", fraying: "fraying.webp", eclipse: "eclipse.webp", ember: "ember.webp" };
  const BOSS_MASTERY = {
    hunger: { title: "FAMINE BREAKER", wins: 5 },
    territory: { title: "GROUND KEEPER", wins: 5 },
    mother: { title: "THE UNBURDENED", wins: 5 },
    swarm: { title: "SWARM BREAKER", wins: 5 },
    forgetting: { title: "ONE WHO REMEMBERS", wins: 5 },
    fraying: { title: "THE UNBROKEN", wins: 5 },
    eclipse: { title: "LIGHT BEARER", wins: 5 },
    ember: { title: "THE FINISHER", wins: 5 }
  };
  function getChapterTitle(meta) {
    if (!meta) return null;
    const w = meta.stats.w || 0, r = meta.stats.r || 0, h = meta.heat || 0;
    if (meta.ninthDawnCleared) return { num: "VII", name: "THE TENTH COLONY" };
    if (w >= 1 && h >= 3) return { num: "VI", name: "THE FIRE THAT SPREADS" };
    if (w >= 10) return { num: "V", name: "THE LONG MEMORY" };
    if (w >= 6) return { num: "IV", name: "WHAT THE DARK TAUGHT" };
    if (w >= 3) return { num: "III", name: "THE OLD WOUNDS" };
    if (meta.cats?.length >= 3) return { num: "II", name: "NAMES IN THE FIRE" };
    if (r >= 1) return { num: "I", name: "THE FIRST NIGHT" };
    return null;
  }
  const CAT_XP = [
    { plays: 0, label: "Novice", bonus: { mult: 0, xMult: 0.9 }, color: "#666", free: true, icon: "\xB7" },
    { plays: 3, label: "Experienced", bonus: { mult: 2, xMult: 1 }, color: "#94a3b8", free: true, icon: "\xB7" },
    { plays: 6, label: "Expert", bonus: { mult: 3, xMult: 1.1 }, color: "#60a5fa", free: true, icon: "\u2605" },
    { plays: 9, label: "Veteran", bonus: { mult: 4, xMult: 1.2 }, color: "#818cf8", icon: "\u2726" },
    { plays: 12, label: "Icon", bonus: { mult: 4, xMult: 1.25 }, color: "#c084fc", icon: "\u2726" },
    { plays: 15, label: "CATALYST", bonus: { mult: 4, xMult: 1.3 }, color: "#f472b6", icon: "\u25C6" },
    { plays: 18, label: "Purrrfect", bonus: { mult: 5, xMult: 1.5 }, color: "#fbbf24", icon: "\u2600" }
  ];
  function getCatXP(tp, hasMastery = false) {
    for (let i = CAT_XP.length - 1; i >= 0; i--) {
      if (tp >= CAT_XP[i].plays) {
        if (CAT_XP[i].free || hasMastery) return CAT_XP[i];
      }
    }
    for (let i = CAT_XP.length - 1; i >= 0; i--) {
      if (tp >= CAT_XP[i].plays && CAT_XP[i].free) return CAT_XP[i];
    }
    return CAT_XP[0];
  }
  function isElder(cat2) {
    return (cat2.stats?.tp || 0) >= 8;
  }
  const COLONY_EVENTS = [
    // ═══════════════════════════════════════════════════════════
    // v50. "EVERY EVENT IS A SCAR OR A STORY"
    // Voice: a narrator who has watched colonies die. Wry, weathered, invested.
    // Dignity: named cats are affected. Never "weakest." Crisis events spaced.
    // Structure: thematic tags ensure variety. Chains weighted 60%. Night 5 mandatory.
    // Tags: memory, sacrifice, belonging, identity, survival, hope
    // ═══════════════════════════════════════════════════════════
    // ——— ARC 1: THE STRANGER (3 events) ———
    {
      id: "stranger_arrives",
      title: "The Stranger",
      icon: "\u{1F431}",
      maxNight: 2,
      tag: "belonging",
      textFn: (_, ctx) => {
        const n = ctx.colony;
        return n >= 18 ? `Ribs like a ladder. Eyes like yours on a bad night. All ${n} of your cats are watching the entrance and nobody's moving. You know what this is. You've been this. The one on the outside, hoping someone opens the door.` : `Something at the edge of the firelight. Not the dark. Something smaller. Hungrier. It has a name somewhere behind those eyes. Whether you learn it is up to you.`;
      },
      choices: [
        { label: "One more mouth. One more heartbeat.", desc: "A stranger joins the colony.", fx: { addCat: true, chainSet: "stranger_welcomed" } },
        { label: "You can't save everyone. Start with these.", desc: "-2 Rations, +2 Nerve.", fx: { gold: -2, fervor: 2, chainSet: "stranger_rejected" } }
      ]
    },
    {
      id: "stranger_returns",
      title: "The Stranger Returns",
      icon: "\u{1F431}",
      minNight: 2,
      chainRequires: "stranger_rejected",
      tag: "belonging",
      textFn: (_, ctx) => `Same eyes. You recognize them now. Thinner than before, which you didn't think was possible. They came back. After what you did, they still came back. That tells you something about them. Maybe about you too.`,
      choices: [
        { label: "Alright. This time, come in.", desc: "They join hardened but strong.", fx: { addCat: true, catPower: 3, chainSet: "stranger_redeemed" } },
        { label: "Not this time either. Not ever.", desc: "+3 Nerve. The guilt burns clean.", fx: { fervor: 3 } }
      ]
    },
    {
      id: "stranger_gift",
      title: "The Stranger's Gift",
      icon: "\u{1F381}",
      minNight: 2,
      chainRequires: "stranger_welcomed",
      tag: "belonging",
      textFn: (_, ctx) => `The one you took in. The stranger. Left something at the entrance while everyone slept. A kill. The biggest anyone's seen. They're sitting beside it. Not eating. Waiting. You know what they're saying without words: I belong here now. Right?`,
      choices: [
        { label: "Split it. Every mouth, every bowl.", desc: "+4 Rations. +1 Nerve.", fx: { gold: 4, fervor: 1 } },
        { label: "You first. Don't look at me like that.", desc: "Best cat +3 Power.", fx: { bestPower: 3 } }
      ]
    },
    // ——— ARC 2: THE SICKNESS (3 events) ———
    {
      id: "sickness",
      title: "The Sickness",
      icon: "\u{1F912}",
      minNight: 2,
      maxNight: 4,
      needsCat: "random",
      tag: "sacrifice",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `${n} didn't eat this morning. By midday they're shaking. By evening two others won't look you in the eye. You've seen this before? No. Nobody's seen this before and survived. That's the point.`;
      },
      choices: [
        { label: "Separate them. I know. I know. Do it.", desc: `Cat hardened. Colony safe.`, fx: { targetScar: true, fervor: 1, chainSet: "sickness_quarantine" } },
        { label: "Nobody leaves. Not for this.", desc: "All cats -1 Power. No one alone.", fx: { allPowerLoss: true, chainSet: "sickness_spread" } },
        { label: "Burn the food. I don't care. Save them.", desc: "-4 Rations. Full heal.", fx: { gold: -4, fullHeal: true } }
      ]
    },
    {
      id: "sickness_aftermath",
      title: "After the Fever",
      icon: "\u{1F4AA}",
      minNight: 2,
      chainRequires: "sickness_quarantine",
      needsCat: "random",
      tag: "identity",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "They";
        return `${n} survived the quarantine. Different now. Quieter. But when the others hesitate, ${n} moves first. Every time. You don't get that from rest. You get it from being left alone in the dark and finding out you're enough.`;
      },
      choices: [
        { label: "You're still here. That means something.", desc: "Cat gains Stubborn.", fx: { targetNamedTrait: "Stubborn" } },
        { label: "Whatever you went through made you this. We need this.", desc: "Cat +3 Power.", fx: { targetPower: 3 } }
      ]
    },
    {
      id: "sickness_bond",
      title: "The Ones Who Stayed",
      icon: "\u{1F495}",
      minNight: 2,
      chainRequires: "sickness_spread",
      needsCat: "pair",
      tag: "belonging",
      textFn: (t, ctx) => {
        const a = t[0]?.name.split(" ")[0] || "One";
        const b = t[1]?.name.split(" ")[0] || "Another";
        return `${a} and ${b} slept side by side through the worst of it. When the fever broke, neither would move more than a tail's length from the other. The sickness took something from everyone. But it gave those two each other.`;
      },
      choices: [
        { label: "Let it happen. Some things you can't force.", desc: "Both bond. +1 Power each.", fx: { pactBond: true } },
        { label: "Remember it. Let it make you harder.", desc: "Both +2 Power.", fx: { bothPower: 2 } }
      ]
    },
    // ——— ARC 3: THE WALL (3 events) ———
    {
      id: "the_wall",
      title: "The Wall",
      icon: "\u{1F9F1}",
      maxNight: 3,
      tag: "survival",
      textFn: (_, ctx) => `Someone started stacking stones while the others slept. By morning there's half a wall. Not enough to stop anything real. But enough to say something real: we're not leaving. Question is whether you finish it or take it apart for what it's worth.`,
      choices: [
        { label: "They started this wall. We finish it.", desc: "Den safe next phase. -2 Rations.", fx: { eventDenSafe: true, gold: -2, chainSet: "wall_built" } },
        { label: "Leave the stones. Take what's useful.", desc: "+3 Rations.", fx: { gold: 3, chainSet: "wall_refused" } }
      ]
    },
    {
      id: "wall_holds",
      title: "The Wall Holds",
      icon: "\u{1F6E1}\uFE0F",
      minNight: 2,
      chainRequires: "wall_built",
      tag: "hope",
      textFn: (_, ctx) => `Something hit the wall last night. Hard enough to crack the second row. Hard enough to wake every one of your ${ctx.colony} cats. But it held. Claw marks on the other side, deep ones. On this side: nothing. Just a colony, alive, staring at something they built that actually worked.`,
      choices: [
        { label: "Higher. Thicker. It won't fall again.", desc: "Den safe again. All cats +1 Power.", fx: { eventDenSafe: true, allPower: 1 } },
        { label: "We learned something. That's worth more than stone.", desc: "+3 Nerve. You can build things that last.", fx: { fervor: 3 } }
      ]
    },
    {
      id: "wall_regret",
      title: "What the Wall Would Have Stopped",
      icon: "\u{1F327}\uFE0F",
      minNight: 2,
      chainRequires: "wall_refused",
      needsCat: "random",
      tag: "sacrifice",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `The rain came sideways. ${n} was closest to the entrance. Took the worst of it. Everyone's thinking the same thing. The stones you took apart would have been a wall. ${n}'s shivering. Nobody's saying it. Everyone's saying it.`;
      },
      choices: [
        { label: "I told you. I told you we needed the wall.", desc: "Cat hardened. +2 Nerve.", fx: { targetScar: true, fervor: 2 } },
        { label: "Clear the rubble. We're starting over.", desc: "-3 Rations. Den safe.", fx: { gold: -3, eventDenSafe: true } }
      ]
    },
    // ——— ARC 4: THE DEBT (2 events) ———
    {
      id: "the_debt",
      title: "The Debt",
      icon: "\u{1F4DC}",
      minNight: 2,
      maxNight: 4,
      tag: "sacrifice",
      textFn: (_, ctx) => `A voice from the dark. Not hostile. Worse. Businesslike. "I kept something alive for you once. Before you knew this place existed. Now I need something in return." You can't see what's speaking. You're not sure you want to.`,
      choices: [
        { label: "Take what you need. Just make it quick.", desc: "Random cat hardened. +4 Rations. +2 Nerve.", fx: { debtBlood: true, chainSet: "debt_paid" } },
        { label: "We don't pay. Not to the dark. Not to anything.", desc: "50/50: +3 Nerve or -1 hand next round.", fx: { debtRefuse: true, chainSet: "debt_refused" } }
      ]
    },
    {
      id: "debt_collector",
      title: "The Collector",
      icon: "\u{1F4DC}",
      minNight: 3,
      chainRequires: "debt_refused",
      tag: "sacrifice",
      textFn: (_, ctx) => `It came back. The voice. Quieter now. "I asked nicely last time." Two of your youngest cats are shaking. They can feel it. Whatever's out there, it remembers you said no.`,
      choices: [
        { label: "Fine. Take it and go.", desc: "Two youngest cats -2 Power. +6 Rations.", fx: { weakDmg: true, gold: 6 } },
        { label: "I said no. I don't repeat myself.", desc: "+4 Nerve. Nothing is free.", fx: { fervor: 4 } }
      ]
    },
    // ——— ARC 5: THE FIRE (2 events) ———
    {
      id: "the_fire",
      title: "The Fire",
      icon: "\u{1F525}",
      maxNight: 3,
      tag: "hope",
      textFn: (_, ctx) => `Nobody knows who started it. Maybe lightning. Maybe something kinder. But there's a fire now, burning in a ring of stones, and every cat in the colony is sitting around it like they were born for this exact moment. Funny thing about fire. You don't realize how cold you were until you're warm.`,
      choices: [
        { label: "Keep it burning. Whatever it takes.", desc: "+2 Nerve. +1 Shelter.", fx: { fervor: 2, eventDenBonus: true, chainSet: "fire_tended" } },
        { label: "Cook it all. Practical wins tonight.", desc: "+5 Rations. Practical wins.", fx: { gold: 5, chainSet: "fire_taken" } }
      ]
    },
    {
      id: "fire_memory",
      title: "The Fire Remembers",
      icon: "\u{1F525}",
      minNight: 3,
      chainRequires: "fire_tended",
      tag: "hope",
      textFn: (_, ctx) => {
        const bonded = ctx.all.filter((c) => c.bondedTo);
        const n = Math.floor(bonded.length / 2);
        return n > 0 ? `The fire's still burning. Nobody feeds it anymore. it just goes. The bonded pairs sit closest. ${n} pair${n > 1 ? "s" : ""}, warming each other and the flame. Something about this feels older than any of you. Like you're remembering something you never lived.` : `The fire's still burning. No one feeds it. No one needs to. It just keeps going. Remind you of anyone?`;
      },
      choices: [
        { label: "Sit. I'll tell you about the ones before us.", desc: "Bonded cats +2 Power. +1 Nerve.", fx: { bondedPower: 2, fervor: 1 } },
        { label: "Shh. Listen to the fire.", desc: "+3 Nerve.", fx: { fervor: 3 } }
      ]
    },
    // ——— ARC 6: THE ELDER (2 events) ———
    {
      id: "the_elder",
      title: "The Elder",
      icon: "\u{1F474}",
      minNight: 3,
      needsCat: "random",
      tag: "memory",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        const tp = t[0]?.stats?.tp || 0;
        return tp >= 5 ? `${n} has fought more hands than anyone and the others know it. They don't look at ${n} with fear. It's closer to reverence. ${n} doesn't notice. Too busy surviving to see what they've become.` : `${n} sits at the back. Says nothing. But when the younger cats argue, they all glance toward ${n} first. Authority isn't given. It's accumulated.`;
      },
      choices: [
        { label: "Sit. Watch. I need to show you something.", desc: "Cat +2 Power. Colony learns.", fx: { targetPower: 2, chainSet: "elder_met" } },
        { label: "Lie down. The colony can wait one night.", desc: "Cat healed. +1 Shelter.", fx: { targetHeal: true, eventDenBonus: true } }
      ]
    },
    {
      id: "elder_legacy",
      title: "The Elder's Legacy",
      icon: "\u{1F4D6}",
      minNight: 3,
      chainRequires: "elder_met",
      tag: "memory",
      textFn: (_, ctx) => {
        const traits = ctx.all.filter((c) => (c.trait || {}).name !== "Plain");
        return `The elder started scratching marks into the wall at sunset. By midnight it's a map. Not of places. of relationships. Who bonds with whom. Who fights. Who carries. ${traits.length} cats with names worth remembering. The elder knows every single one.`;
      },
      choices: [
        { label: "These marks. Someone drew them before us.", desc: "+3 Nerve. Bonded cats +1 Power.", fx: { fervor: 3, bondedPower: 1 } },
        { label: "Hand me the charcoal. Our turn.", desc: "Random plain cat gains trait. +2 Rations.", fx: { targetTrait: true, gold: 2 } }
      ]
    },
    // ——— ESTABLISHING (Night 1-2) ———
    {
      id: "cache",
      title: "The Cache",
      icon: "\u{1F4E6}",
      maxNight: 3,
      tag: "survival",
      textFn: (_, ctx) => {
        const c = ctx.all.length;
        return `A dead colony's pantry. Still stocked. Isn't that always the way. they had enough food, they just didn't have enough time. You've got ${c} mouths and enough here for maybe half of them to care.`;
      },
      choices: [
        { label: "They didn't make it. Their rations did.", desc: "+4 Rations.", fx: { gold: 4 } },
        { label: "You. Eat. Don't argue.", desc: "Best cat +3 Power. -2 Rations.", fx: { bestPower: 3, gold: -2 } },
        { label: "Light it up. We need warmth more than food.", desc: "+3 Nerve. All cats +1 Power. -4 Rations.", fx: { fervor: 3, allPower: 1, gold: -4 } }
      ]
    },
    {
      id: "first_kill",
      title: "First Blood",
      icon: "\u{1FA78}",
      needsCat: "random",
      maxNight: 2,
      tag: "identity",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        const sc = ctx?.scarred || 0;
        return `${n} brought something back. Dropped it at the entrance without a word and sat down. ${sc > 0 ? `Not the first to bleed for this colony. Won't be the last. But ${n} didn't need to be asked.` : `The others don't know what to do with it. ${n} does. ${n}'s known since before you got here.`}`;
      },
      choices: [
        { label: "Look at you. Look what you became.", desc: "Cat +2 Power. Cat hardened.", fx: { targetPower: 2, targetScar: true } },
        { label: "Tonight, nobody goes hungry.", desc: "+3 Rations.", fx: { gold: 3 } }
      ]
    },
    {
      id: "the_name",
      title: "The Old Name",
      icon: "\u{1F4DB}",
      maxNight: 2,
      tag: "memory",
      textFn: (_, ctx) => `Scratched into the stone above the entrance: a name. Not a cat's name. A colony's name. The one that was here before. They carved it deep. Like they wanted someone to see it, even knowing no one would. But you see it. You're seeing it right now.`,
      choices: [
        { label: "Give me the stone. I want to write our names.", desc: "+2 Nerve. We were here.", fx: { fervor: 2 } },
        { label: "They knew something. It's in the scratches.", desc: "Random plain cat gains trait.", fx: { targetTrait: true } }
      ]
    },
    {
      id: "quiet",
      title: "A Quiet Moment",
      icon: "\u{1F319}",
      maxNight: 5,
      needsCat: "random",
      tag: "hope",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        const p = t[0]?.power || 0;
        const sc = t[0]?.scarred;
        return sc ? `${n} is sitting alone at the entrance. Scar catching the firelight. Not watching for danger. Just watching. Like they're memorizing what the dark looks like from the winning side.` : `${n} is sitting alone, watching the dark. Not afraid. Just... present. The others give them space. Some silences are worth more than plans.`;
      },
      choices: [
        { label: "Just sit. You don't have to talk.", desc: "Cat +1 Power. +1 Nerve.", fx: { targetPower: 1, fervor: 1 } },
        { label: "Don't interrupt. This is theirs.", desc: "Cat gains Loyal. -2 Rations.", fx: { targetNamedTrait: "Loyal", gold: -2 } }
      ]
    },
    // ——— PRESSURE (Night 2-3) ———
    {
      id: "the_pact",
      title: "The Pact",
      icon: "\u{1F91D}",
      needsCat: "pair",
      minNight: 2,
      tag: "belonging",
      textFn: (t, ctx) => {
        const a = t[0]?.name.split(" ")[0] || "One";
        const b = t[1]?.name.split(" ")[0] || "Another";
        const grudge = t[0]?.grudgedWith?.includes(t[1]?.id);
        return grudge ? `${a} and ${b} have been circling each other for days. Not fighting. Not talking. Just circling. Tonight one of them stopped. The other sat down. Something's changing and it's bigger than both of them.` : `${a} and ${b} found something in each other. The kind of recognition that doesn't need explaining. You can see it from across the den. Something's being decided.`;
      },
      choices: [
        { label: "Let it become what it is.", desc: "Both bond. +1 Power each.", fx: { pactBond: true } },
        { label: "Turn it into fire.", desc: "Both +2 Power. Grudge fuels them.", fx: { pactGrudge: true } }
      ]
    },
    {
      id: "the_choice",
      title: "The Lifeboat",
      icon: "\u2696\uFE0F",
      needsCat: "pair",
      minNight: 2,
      tag: "sacrifice",
      textFn: (t, ctx) => {
        const a = t[0]?.name.split(" ")[0] || "One";
        const b = t[1]?.name.split(" ")[0] || "Another";
        return `The ledge is crumbling. ${a} (P${t[0]?.power || "?"}) on the left. ${b} (P${t[1]?.power || "?"}) on the right. One paw-hold. The rock's already moving. You know exactly what this is. Don't pretend you don't.`;
      },
      choices: [
        { labelFn: (t) => `Reach for ${t[0]?.name.split(" ")[0] || "the first"}.`, desc: "Saved +3 Power. Other hardened, grudge formed.", fx: { choiceSave: 0 } },
        { labelFn: (t) => `Reach for ${t[1]?.name.split(" ")[0] || "the second"}.`, desc: "Saved +3 Power. Other hardened, grudge formed.", fx: { choiceSave: 1 } }
      ]
    },
    {
      id: "the_challenge",
      title: "The Challenge",
      icon: "\u2694\uFE0F",
      needsCat: "pair",
      minNight: 2,
      tag: "identity",
      textFn: (t, ctx) => {
        const a = t[0]?.name.split(" ")[0] || "One";
        const b = t[1]?.name.split(" ")[0] || "Another";
        return `${a} knocked ${b}'s food sideways. Deliberate. ${b} turned slow. The colony went quiet. This is either going to end with blood or with something stronger than blood. You can feel everyone waiting to see which.`;
      },
      choices: [
        { label: "Blood, then. Get it over with.", desc: "Winner +2 Power. Loser hardened.", fx: { catFight: true, chainSet: "challenge_blood" } },
        { label: "Not tonight.", desc: "Both -1 Power. But no blood.", fx: { bothWeaken: true, fervor: 1 } }
      ]
    },
    {
      id: "the_gift",
      title: "Something Left Behind",
      icon: "\u{1F381}",
      minNight: 2,
      tag: "memory",
      textFn: (_, ctx) => `Wedged in the rocks: something wrapped in leaves. Old leaves. Older than this colony, older than the one before it. Someone hid this here on purpose and whoever they were, they're gone in a way that doesn't leave a forwarding address.`,
      choices: [
        { label: "Open it. They left it for someone.", desc: "Random: ward, Rations, or trouble.", fx: { mysteryGift: true } },
        { label: "Some things stay buried for a reason.", desc: "+2 Nerve.", fx: { fervor: 2 } }
      ]
    },
    // ——— DESPERATION (Night 3-4) ———
    {
      id: "the_wager",
      title: "The Wager",
      icon: "\u{1F3B2}",
      minNight: 3,
      tag: "survival",
      textFn: (_, ctx) => {
        const g = ctx.gold || 0;
        return `A voice from the dark. Not the businesslike one. This one laughs. "I'll bet you double or nothing. ${g} rations on one question: does your colony see dawn?" The laughter stops. "Well?"`;
      },
      choices: [
        { label: "You're on. Bet the rations.", desc: "55%: triple Rations + Nerve. 45%: lose half.", fx: { wagerGold: true } },
        { label: "Bet something that matters.", desc: "55%: best cat gains rare trait. 45%: hardened.", fx: { wagerBest: true } },
        { label: "Not today. Not with them.", desc: "+2 Nerve.", fx: { fervor: 2 } }
      ]
    },
    {
      id: "the_hollow",
      title: "The Hollow Tree",
      icon: "\u{1F333}",
      minNight: 3,
      tag: "identity",
      textFn: (_, ctx) => `The tree has been dead longer than any colony has been alive. But inside it's warm. Not hot. Just the absence of cold. One of your cats is already walking toward it. The others are watching, and you can see them doing the math: is this hope or a trap? The answer is always both.`,
      choices: [
        { label: "Let them go. Some doors you walk through.", desc: "Random: trait gained, supplies, or hardened.", fx: { hollowEnter: true } },
        { label: "We don't walk into the dark.", desc: "+2 Nerve.", fx: { fervor: 2 } }
      ]
    },
    {
      id: "the_storm",
      title: "The Storm",
      icon: "\u26C8\uFE0F",
      minNight: 3,
      tag: "survival",
      textFn: (_, ctx) => {
        const n = ctx.colony;
        return `You know what's louder than a storm? ${n} cats pretending they're not scared. The ones on the outside are taking the worst of it. The ones on the inside are taking it differently. Everyone needs something and there isn't enough of anything.`;
      },
      choices: [
        { label: "Shield the youngest. We owe them that.", desc: "Strongest cat hardened. +2 Nerve.", fx: { targetGambleScar: true, fervor: 2, chainSet: "storm_shield" } },
        { label: "Ride it out. Everyone takes their share.", desc: "2 cats -2 Power. +1 hand next round.", fx: { weakDmg: true, tempHands: 1, chainSet: "storm_ride" } },
        { label: "Burn supplies for shelter. Everything.", desc: "-4 Rations. Full heal. Den safe.", fx: { gold: -4, fullHeal: true, eventDenSafe: true, chainSet: "storm_shelter" } }
      ]
    },
    {
      id: "the_split",
      title: "The Split",
      icon: "\u2194\uFE0F",
      needsCat: "pair",
      minNight: 3,
      tag: "identity",
      textFn: (t, ctx) => {
        const a = t[0]?.name.split(" ")[0] || "One";
        const b = t[1]?.name.split(" ")[0] || "Another";
        return `Two paths. ${a} smells food to the left. ${b} hears water to the right. Colony can't split. Someone decides for everyone. That's what leadership is. picking which half of the colony to disappoint.`;
      },
      choices: [
        { labelFn: (t) => `Follow ${t[0]?.name.split(" ")[0] || "left"}'s instinct.`, desc: "Outcome depends on their Power.", fx: { splitFollow: 0 } },
        { labelFn: (t) => `Follow ${t[1]?.name.split(" ")[0] || "right"}'s instinct.`, desc: "Outcome depends on their Power.", fx: { splitFollow: 1 } }
      ]
    },
    // ——— ENDGAME WEIGHT (Night 4-5) ———
    {
      id: "the_count",
      title: "The Count",
      icon: "\u{1F4CB}",
      minNight: 4,
      tag: "memory",
      textFn: (_, ctx) => {
        const n = ctx.colony;
        const fallen = ctx.fallen?.length || 0;
        return fallen > 0 ? `You count them. ${n}. You count again. Still ${n}. The number doesn't change no matter how many times you check. ${fallen} empty spaces where names used to be. You'll carry those spaces with you. That's the deal.` : `You count them. ${n}. Every single one. You count again. Still ${n}. All of them. Still here. You know how rare that is? Most colonies can't say that by Night 2.`;
      },
      choices: [
        { label: "Say the names. All of them.", desc: "+3 Nerve. -2 Rations for the ceremony.", fx: { fervor: 3, gold: -2 } },
        { label: "Focus on the living.", desc: "All cats +1 Power.", fx: { allPower: 1 } }
      ]
    },
    {
      id: "the_last_light",
      title: "The Last Light",
      icon: "\u{1F56F}\uFE0F",
      minNight: 4,
      tag: "hope",
      textFn: (_, ctx) => {
        const b = ctx.all.filter((c) => c.bondedTo);
        const s = ctx.all.filter((c) => c.scarred);
        return `The light is failing. Not the fire. the other light. The one inside. ${b.length > 0 ? `The bonded pairs hold tighter. ` : ""}${s.length > 0 ? `The scarred ones don't flinch anymore. ` : ""}This is the part where colonies give up. You can feel it in the air. the quiet before surrender. The question is whether you're the kind that surrenders.`;
      },
      choices: [
        { label: "Not us. Not tonight. Not ever.", desc: "+4 Nerve.", fx: { fervor: 4 } },
        { label: "Rest. We'll need everything for tomorrow.", desc: "Full heal. -3 Rations.", fx: { fullHeal: true, gold: -3 } }
      ]
    },
    {
      id: "the_sacrifice",
      title: "The Offering",
      icon: "\u{1F54A}\uFE0F",
      minNight: 4,
      needsCat: "random",
      tag: "sacrifice",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        const p = t[0]?.power || 0;
        return `${n}'s standing at the entrance and you already know what that means. Don't pretend you don't. P${p}. They're not running because they decided this before you did. The question is whether you're going to stop them.`;
      },
      choices: [
        { label: "Nobody goes.", desc: "+2 Nerve. Weakest cat gains an epithet.", fx: { fervor: 2, spareTarget: true } },
        { label: "...let them go.", desc: "Cat lost. +6 Rations. Den safe.", fx: { sacrifice: true } }
      ]
    },
    {
      id: "the_vigil",
      title: "The Vigil",
      icon: "\u{1F56F}\uFE0F",
      minNight: 4,
      tag: "memory",
      textFn: (_, ctx) => {
        const fallen = ctx.fallen || [];
        const n = ctx.colony;
        return fallen.length > 0 ? `Someone placed a stone at the entrance for each cat lost. ${fallen.length} stone${fallen.length > 1 ? "s" : ""}. ${n} cats sitting around them in silence. Not grieving. Remembering. There's a difference, and the colony that knows the difference is the colony that makes it.` : `No one can sleep. All ${n} of them, awake, watching the entrance. Not because they're afraid. Because they want to be awake for this. Whatever tonight becomes, they want to be present for it.`;
      },
      choices: [
        { label: "Say their names. Every one.", desc: "+4 Nerve. -3 Rations for the vigil.", fx: { fervor: 4, gold: -3 } },
        { label: "Add a stone for the living.", desc: "All cats +1 Power.", fx: { allPower: 1 } }
      ]
    },
    // ——— TRAIT-SPECIFIC ———
    {
      id: "the_stubborn_stand",
      title: "The Stand",
      icon: "\u{1FAA8}",
      minNight: 2,
      needsCat: "random",
      tag: "identity",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `Something came for the food stores. Big enough that everyone else backed away. ${n} didn't. Didn't run. Didn't call for help. Just stood there like a stone that grew legs and opinions. Whatever it was took one look at ${n} and left.`;
      },
      choices: [
        { label: "You don't bend, do you?", desc: "Cat gains Stubborn.", fx: { targetNamedTrait: "Stubborn" } },
        { label: "Get inside. Now.", desc: "Cat +2 Power. +1 Nerve.", fx: { targetPower: 2, fervor: 1 } }
      ]
    },
    {
      id: "the_wanderer",
      title: "The Wanderer's Return",
      icon: "\u{1F408}",
      minNight: 2,
      needsCat: "random",
      tag: "identity",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `${n} disappeared for two days. Everyone thought the worst. Then they walked back in smelling of places no cat here has been. Brought nothing back but a look that says: I've seen all four seasons. I've seen everything.`;
      },
      choices: [
        { label: "What did you find out there?", desc: "Cat gains Stray. +2 Rations.", fx: { targetNamedTrait: "Stray", gold: 2 } },
        { label: "Don't you ever do that again.", desc: "Cat +3 Power.", fx: { targetPower: 3 } }
      ]
    },
    {
      id: "the_devotion",
      title: "The Devotion",
      icon: "\u{1FAC2}",
      needsCat: "pair",
      minNight: 2,
      tag: "belonging",
      textFn: (t, ctx) => {
        const a = t[0]?.name.split(" ")[0] || "One";
        const b = t[1]?.name.split(" ")[0] || "Another";
        const bonded = t[0]?.bondedTo === t[1]?.id;
        return bonded ? `${a} and ${b} won't eat unless the other eats first. It's becoming a problem. A beautiful, infuriating problem that you don't actually want to solve.` : `${a} keeps bringing food to ${b}. Not sharing. giving. ${b} pretends not to notice. Everyone else notices. Everyone else is trying not to smile.`;
      },
      choices: [
        { label: "Let it grow. We need more of this.", desc: "Both gain Loyal.", fx: { bothNamedTrait: "Loyal" } },
        { label: "Channel it. Fight, don't feel.", desc: "Both +2 Power.", fx: { bothPower: 2 } }
      ]
    },
    {
      id: "the_scavenger_find",
      title: "The Find",
      icon: "\u{1F33E}",
      maxNight: 4,
      needsCat: "random",
      tag: "survival",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `${n} found a cache buried so deep it was clearly meant to stay hidden. Old. Sealed. Enough to feed the colony twice over. The question isn't whether to eat it. The question is how fast.`;
      },
      choices: [
        { label: "Feast. Tonight we live.", desc: "-3 Rations. Full heal. All cats +1 Power.", fx: { gold: -3, fullHeal: true, allPower: 1 } },
        { label: "Ration it. Make it last.", desc: "+3 Rations. Cat gains Scavenger.", fx: { gold: 3, targetNamedTrait: "Scavenger" } }
      ]
    },
    {
      id: "the_echo_cave",
      title: "The Echo",
      icon: "\u{1F501}",
      minNight: 3,
      needsCat: "random",
      tag: "memory",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `${n} called into the cave. Their voice came back. Twice. Not an echo. the second voice was different. Deeper. Said the same words but meant something else entirely. Like the cave was translating.`;
      },
      choices: [
        { label: "Call again. See what answers.", desc: "Cat gains Echo.", fx: { targetNamedTrait: "Echo", specificTrait: "Echo", rareTrait: true } },
        { label: "Seal it. Some things echo for a reason.", desc: "+3 Nerve.", fx: { fervor: 3 } }
      ]
    },
    {
      id: "the_alpha_test",
      title: "The Test of Strength",
      icon: "\u{1F43A}",
      minNight: 2,
      needsCat: "random",
      tag: "identity",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        const p = t[0]?.power || 0;
        return `${n} (P${p}) walked to the front of the food line and stared. That's it. Didn't push. Didn't hiss. Just stared until everyone else looked away. You've seen this before in colonies that work. Also in colonies that don't.`;
      },
      choices: [
        { label: "Alright. You lead.", desc: "Cat gains Alpha.", fx: { targetNamedTrait: "Alpha", specificTrait: "Alpha", rareTrait: true } },
        { label: "We're equals here. All of us.", desc: "Cat +2 Power. All others +1 Power.", fx: { targetPower: 2, othersPower: 1 } }
      ]
    },
    // ——— EMOTIONAL BEATS ———
    {
      id: "the_lullaby",
      title: "The Lullaby",
      icon: "\u{1F3B5}",
      minNight: 2,
      needsCat: "random",
      tag: "hope",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        const kittens = ctx.all.filter((c) => c.parentIds?.length > 0);
        return kittens.length > 0 ? `${n} is humming. Not a song anyone knows. The kittens, ${kittens.map((k) => k.name.split(" ")[0]).slice(0, 3).join(", ")}, are asleep before the second verse. The adults pretend they're not listening. They're all listening.` : `${n} is humming something that came from before this colony, before the dark. One by one, the others stop what they're doing. Not to listen. To remember something they didn't know they'd forgotten.`;
      },
      choices: [
        { label: "Join in. Everyone needs this.", desc: "All cats heal. +1 Nerve.", fx: { fullHeal: true, fervor: 1 } },
        { label: "Let it end on its own.", desc: "Cat gains Devoted.", fx: { targetNamedTrait: "Devoted" } }
      ]
    },
    {
      id: "the_naming",
      title: "The Naming Ceremony",
      icon: "\u2728",
      minNight: 3,
      needsCat: "random",
      tag: "identity",
      textFn: (t, ctx) => {
        const plains = ctx.all.filter((c) => (c.trait || {}).name === "Plain");
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return plains.length > 3 ? `${plains.length} cats in this colony without a defining moment. Without the thing that makes them them. ${n} is looking at you like they're waiting for theirs. You can see it. the potential. The almost.` : `${n} did something today nobody expected. Small. Unremarkable to anyone who wasn't watching. But you were watching. You always are.`;
      },
      choices: [
        { label: "This is your moment.", desc: "Cat gains a random trait.", fx: { targetTrait: true } },
        { label: "Your moment will come. Be patient.", desc: "Cat +2 Power. +1 Nerve.", fx: { targetPower: 2, fervor: 1 } }
      ]
    },
    {
      id: "the_grave",
      title: "The Unmarked Grave",
      icon: "\u26B0\uFE0F",
      minNight: 3,
      tag: "memory",
      textFn: (_, ctx) => {
        const fallen = ctx.fallen || [];
        return fallen.length > 0 ? `You found it while digging. A grave. Not one of yours. older. Deeper. From the colony before. No marker, no name. Just a hollow in the dirt shaped like someone who mattered. ${fallen.length} of yours are gone too. Somebody, someday, will find their graves and not know their names either. Unless.` : `A hollow in the dirt. Shaped like a body. No marker. No name. Gone in a way that doesn't leave anything behind. Not dead. erased. As if they were never here at all.`;
      },
      choices: [
        { label: "Mark it. Every name is defiance.", desc: "+3 Nerve.", fx: { fervor: 3 } },
        { label: "Dig deeper. They were buried with something.", desc: "Find a ward.", fx: { addWard: true } }
      ]
    },
    {
      id: "the_inheritance",
      title: "The Inheritance",
      icon: "\u{1F4DC}",
      minNight: 3,
      needsCat: "random",
      tag: "memory",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `${n} found carvings in the back wall. Not words. diagrams. Strategies. Patterns. A dead colony's last gift to whoever came next. They spent their final hours writing instructions for people they'd never meet. That's either beautiful or heartbreaking. Probably both.`;
      },
      choices: [
        { label: "Read it to everyone.", desc: "All cats +1 Power. Plain cat gains trait.", fx: { inheritanceRead: true } },
        { label: "Keep it quiet. One cat's edge.", desc: "Cat +3 Power. Best cat gains rare trait.", fx: { inheritancePrivate: true } }
      ]
    },
    // ——— COLONY-REACTIVE ———
    {
      id: "the_reckoning",
      title: "The Reckoning",
      icon: "\u26A1",
      minNight: 2,
      needsCat: "pair",
      tag: "belonging",
      textFn: (t, ctx) => {
        const a = t[0]?.name.split(" ")[0] || "One";
        const b = t[1]?.name.split(" ")[0] || "Another";
        const hasGrudge2 = t[0]?.grudgedWith?.includes(t[1]?.id);
        return hasGrudge2 ? `${a} and ${b} have been carrying this long enough. Tonight something shifts. Not forgiveness. something rawer. The whole colony can feel it, the way you feel a storm before it hits.` : `${a} bumped ${b} at the food pile. The silence afterward lasted longer than it should have. This is going somewhere. The only question is where.`;
      },
      choices: [
        { label: "Talk. Now. Both of you.", desc: "Both bond. +1 Power each.", fx: { pactBond: true } },
        { label: "Get it out of your systems.", desc: "Winner +3 Power, loser hardened.", fx: { catFight: true } },
        { label: "Separate them. Distance helps.", desc: "+1 Shelter. +1 Nerve.", fx: { eventDenBonus: true, fervor: 1 } }
      ]
    },
    {
      id: "the_teaching",
      title: "The Teaching",
      icon: "\u{1F393}",
      minNight: 3,
      needsCat: "pair",
      tag: "belonging",
      textFn: (t, ctx) => {
        const a = t[0]?.name.split(" ")[0] || "One";
        const b = t[1]?.name.split(" ")[0] || "Another";
        const isParent = t[1]?.parentIds?.includes(t[0]?.id);
        return isParent ? `${a} has been watching ${b}. their own kitten, grown now. Watching how they hesitate. Tonight, ${a} sat down next to ${b} and just... showed them. No words. Just doing.` : `${a} has something ${b} needs to learn. You can see it in the way ${b} watches when ${a} isn't looking. Some lessons aren't taught. They're witnessed.`;
      },
      choices: [
        { label: "Let the lesson happen.", desc: "Both +2 Power.", fx: { bothPower: 2 } },
        { label: "Make it a colony lesson.", desc: "All cats +1 Power.", fx: { allPower: 1 } }
      ]
    },
    {
      id: "the_crowding",
      title: "The Crowding",
      icon: "\u{1F3DA}\uFE0F",
      minNight: 3,
      tag: "survival",
      textFn: (_, ctx) => {
        const n = ctx.colony;
        return n > 18 ? `${n} bodies. One shelter. Someone is always awake, always pressed against a wall, always one sneeze away from a fight. You built this colony to survive. You didn't build it to be comfortable. Those are different problems.` : `The shelter feels smaller every night. Not because it's shrinking. Because everything inside it is growing. Louder. Braver. More alive. That's the cost of keeping them all.`;
      },
      choices: [
        { label: "Expand. Build outward.", desc: "+2 Shelter. -3 Rations.", fx: { eventDenBonus: true, gold: -3, fervor: 1 } },
        { label: "Hold tighter. Closeness is strength.", desc: "+2 Nerve.", fx: { fervor: 2 } }
      ]
    },
    {
      id: "the_thin_colony",
      title: "The Thinning",
      icon: "\u{1F4A8}",
      minNight: 3,
      tag: "identity",
      textFn: (_, ctx) => {
        const n = ctx.colony;
        const fallen = ctx.fallen?.length || 0;
        return n <= 14 ? `${n}. You keep counting. Still ${n}. Every cat that's left has outlived the odds.${fallen > 0 ? ` ${fallen} didn't. You carry their weight now. and somehow, it makes you lighter.` : ""} This is what a blade feels like before it strikes.` : `The colony is lean. No passengers. Every cat who's still here earned their place by being here. That's circular logic. It's also the only logic that works in the dark.`;
      },
      choices: [
        { label: "We're enough. We have to be.", desc: "+4 Nerve.", fx: { fervor: 4 } },
        { label: "We need more. Send the call.", desc: "Gain 2 plain strays.", fx: { addStrays: 2 } }
      ]
    },
    {
      id: "the_dream",
      title: "The Dream",
      icon: "\u{1F4AD}",
      minNight: 4,
      needsCat: "random",
      tag: "hope",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        const fallen = ctx.fallen || [];
        return fallen.length > 0 ? `${n} woke up screaming. Said they saw ${fallen[0]?.name || "the one who was lost"}. Said they were warm. Waiting somewhere past the dark. The others pretend they didn't hear. They all heard.` : `${n} woke up smiling. Said they dreamed of a place with no dark. No cold. Just sun and grass and every cat they'd ever known. They looked embarrassed. Nobody laughed.`;
      },
      choices: [
        { label: "Tell me more. We need this.", desc: "Cat +2 Power. +3 Nerve. -3 Rations.", fx: { targetPower: 2, fervor: 3, gold: -3 } },
        { label: "Dreams are for after. Focus.", desc: "+3 Nerve.", fx: { fervor: 3 } }
      ]
    },
    {
      id: "the_promise",
      title: "The Promise",
      icon: "\u{1F91E}",
      minNight: 4,
      needsCat: "pair",
      tag: "belonging",
      textFn: (t, ctx) => {
        const a = t[0]?.name.split(" ")[0] || "One";
        const b = t[1]?.name.split(" ")[0] || "Another";
        return `${a} and ${b} pressed their foreheads together. No words. Didn't need any. Everyone who saw it understood the same thing: whatever comes, those two face it together. The colony is stronger for having witnessed it.`;
      },
      choices: [
        { label: "Remember this. All of you.", desc: "Both bond. Both +2 Power.", fx: { pactBond: true, bothPower: 1 } },
        { label: "This is why we fight.", desc: "+3 Nerve. +2 Rations.", fx: { fervor: 3, gold: 2 } }
      ]
    },
    // ——— THE WATCHER (Kojima's meta-awareness event) ———
    {
      id: "the_watcher",
      title: "The Watcher",
      icon: "\u{1F441}\uFE0F",
      minNight: 4,
      tag: "memory",
      textFn: (_, ctx) => {
        const n = ctx.colony;
        return `One of your cats stopped mid-step and looked up. Not at the ceiling. Past it. Like they could see through the stone to somewhere else entirely. "Something's watching us," they said. Not from the dark. From... outside. Somewhere beyond. "They've been watching the whole time." Nobody argued. Everyone felt it.`;
      },
      choices: [
        { label: "Then let them see us survive.", desc: "+3 Nerve. All cats +1 Power.", fx: { fervor: 3, allPower: 1 } },
        { label: "We don't perform. We endure.", desc: "+4 Nerve.", fx: { fervor: 4 } }
      ]
    },
    // v0.7: THE QUESTION (Kojima's meta-consequence event — fires at 10+ runs or 20+ deaths)
    {
      id: "the_question",
      title: "The Question",
      icon: "\u2753",
      minNight: 4,
      tag: "memory",
      once: true,
      condFn: (_, ctx) => (ctx.meta?.stats?.r || 0) >= 10 || (ctx.meta?.stats?.totalFallen || 0) >= 20,
      textFn: (_, ctx) => {
        const runs = (ctx.meta?.stats?.r || 0) + 1;
        const dead = ctx.meta?.stats?.totalFallen || 0;
        return `Colony ${runs}. You've built ${runs} of these. Chosen who joins. Chosen who plays. Chosen who stays on the bench while others risk everything. ${dead} cats have died across all of them. You named them. You played them. You moved on. At what point does the one who remembers become the one who decides? At what point does remembering become choosing who matters?`;
      },
      choices: [
        { label: "I carry every name.", desc: "+5 Nerve.", fx: { fervor: 5 } },
        { label: "I do what the colony needs.", desc: "+3 Nerve. +4 Rations.", fx: { fervor: 3, gold: 4 } }
      ]
    },
    // ——— NIGHT 5 MANDATORY (Kojima's thesis event) ———
    {
      id: "the_dawn_question",
      title: "What Was It For",
      icon: "\u{1F305}",
      minNight: 5,
      mandatory: true,
      tag: "memory",
      textFn: (_, ctx) => {
        const n = ctx.colony;
        const fallen = ctx.fallen?.length || 0;
        const scarred = ctx.all.filter((c) => c.scarred).length;
        return `The last night. ${n} cats. ${scarred} carrying scars.${fallen > 0 ? ` ${fallen} name${fallen > 1 ? "s" : ""} you'll carry differently.` : ""} The question isn't whether you survive. The question is whether what survives is worth surviving for. You've been answering that question all along. Every hand. Every choice. Every name you remembered. Answer it one more time.`;
      },
      choices: [
        { label: "It was worth it. All of it.", desc: "+3 Nerve. All cats +1 Power.", fx: { fervor: 3, allPower: 1 } },
        { label: "Ask me after dawn.", desc: "+5 Nerve.", fx: { fervor: 5 } }
      ]
    },
    // ——— NIGHT 5: ARC SUMMARY (Nolan's revelation event) ———
    {
      id: "the_record",
      title: "The Record",
      icon: "\u{1F4DC}",
      minNight: 5,
      tag: "memory",
      textFn: (_, ctx) => {
        const h = ctx.eventHistory || {};
        const parts = [];
        if (h.wall_built) parts.push("The wall you built still stands.");
        if (h.wall_refused) parts.push("The stones you scattered are still scattered.");
        if (h.stranger_welcomed) parts.push("The stranger you welcomed sits closest to the fire.");
        if (h.stranger_rejected && !h.stranger_redeemed) parts.push("The stranger's eyes are somewhere in the dark. Still.");
        if (h.fire_tended) parts.push("The fire you tended is still burning.");
        if (h.sickness_quarantine) parts.push("The one you quarantined survived.");
        if (h.sickness_spread) parts.push("The ones who stayed together are still together.");
        if (h.debt_paid) parts.push("The debt is paid. The dark remembers.");
        if (h.debt_refused) parts.push("The dark remembers what you wouldn't give.");
        if (h.elder_met) parts.push("The elder's marks cover the wall now.");
        return parts.length > 0 ? parts.join(" ") + ` That's the record. That's what this colony did.` : `${ctx.colony} cats. No record of what happened except the one you're writing right now.`;
      },
      choices: [
        { label: "Write it down. Someone needs to know.", desc: "+4 Nerve.", fx: { fervor: 4 } },
        { label: "We are the record.", desc: "All cats +1 Power. +2 Rations.", fx: { allPower: 1, gold: 2 } }
      ]
    },
    // ——— NIGHT 5: THE CHORUS ———
    {
      id: "the_chorus",
      title: "The Chorus",
      icon: "\u{1F3B6}",
      minNight: 4,
      tag: "hope",
      textFn: (_, ctx) => `It started with one voice. Then two. Then all of them. Not a song. Not a howl. Something between that says the only thing worth saying: we are here. We are here. We are here. The dark doesn't answer. For the first time, it doesn't need to.`,
      choices: [
        { label: "Join in. Every voice counts.", desc: "Full heal. +2 Nerve. Random bond.", fx: { chorusJoin: true } },
        { label: "Listen. Witness is enough.", desc: "+4 Nerve.", fx: { fervor: 4 } }
      ]
    },
    // ——— CROSS-RUN ARCS. events that remember previous colonies ———
    // These check meta.stats.chronicle flags set by fx.chronicleSet
    // ——— HIGH STAKES: Legendary Trait Events ———
    {
      id: "the_old_blood",
      title: "The Old Blood",
      icon: "\u{1F9EC}",
      minNight: 3,
      needsCat: "best",
      tag: "identity",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `Something is happening to ${n}. The others can feel it. A heat in the fur. A light behind the eyes that wasn't there yesterday. The old bloodlines are waking up. But change has a cost, and this change demands everything.`;
      },
      choices: [
        { label: "Let the blood burn. Whatever comes.", desc: "Cat gains a random Legendary trait. Scarred. -4 Rations.", fx: { targetLegendary: true, targetScar: true, gold: -4 } },
        { label: "Not like this. Not them.", desc: "Cat +3 Power. +2 Nerve.", fx: { targetPower: 3, fervor: 2 } }
      ]
    },
    {
      id: "the_echo_cave",
      title: "The Echo Cave",
      icon: "\u{1F50A}",
      minNight: 3,
      tag: "memory",
      textFn: (_, ctx) => {
        const n = ctx.colony;
        return `Deep beneath the den, a cave. Not natural. Carved by claws older than any name you know. The walls are scored with marks that look like scoring tallies. Hundreds. Thousands. And at the far end, something glowing. The Eighth Colony left this here. A gift or a trap. It's waiting for someone brave enough to take it.`;
      },
      choices: [
        { label: "Reach into the glow.", desc: "Best cat gains Echo. Cat injured. -3 Rations.", fx: { bestNamedTrait: "Echo", bestInjure: true, gold: -3 } },
        { label: "We don't need their gifts.", desc: "+4 Nerve. Colony hardens.", fx: { fervor: 4 } }
      ]
    },
    {
      id: "the_moonlit_hunt",
      title: "The Moonlit Hunt",
      icon: "\u{1F319}",
      minNight: 3,
      needsCat: "random",
      tag: "survival",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `The moon is full. ${n} can feel something stirring. An ancient instinct, older than colonies, older than hearths. The urge to hunt not for food but for purpose. To run until the world makes sense. The dark is dangerous tonight, but so is ${n}.`;
      },
      choices: [
        { label: "Hunt. Find what the moon is showing you.", desc: "Cat gains Nocturnal. Scarred. -3 Rations.", fx: { targetNamedTrait: "Nocturnal", targetScar: true, gold: -3 } },
        { label: "Stay by the fire. The moon lies.", desc: "Cat +2 Power. +3 Rations.", fx: { targetPower: 2, gold: 3 } }
      ]
    },
    // ——— TRAIT-SPECIFIC: Feral and Seer ———
    {
      id: "the_pack_instinct",
      title: "The Pack Instinct",
      icon: "\u{1F43E}",
      minNight: 2,
      needsCat: "random",
      tag: "identity",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `${n} won't eat alone anymore. Won't sleep alone. Won't even groom alone. At first it seemed clingy. Now you realize it's something else. ${n} fights three times as hard when the others are nearby. Not brave. Just... more.`;
      },
      choices: [
        { label: "You're stronger in a crowd, aren't you?", desc: "Cat gains Feral. -2 Rations.", fx: { targetNamedTrait: "Feral", gold: -2 } },
        { label: "Don't depend on others. Depend on yourself.", desc: "Cat +2 Power.", fx: { targetPower: 2 } }
      ]
    },
    {
      id: "the_dreamer",
      title: "The Dreamer",
      icon: "\u{1F441}\uFE0F",
      minNight: 2,
      needsCat: "random",
      tag: "identity",
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `${n} froze mid-step this morning. Eyes wide. Pupils like moons. Then said one word: "Clowder." Three hands later, you played a Clowder. Coincidence. Except it's happened three times now. ${n} sees things before they happen. The question is whether that's a gift or a warning.`;
      },
      choices: [
        { label: "Tell me what you see next.", desc: "Cat gains Seer. Cat injured.", fx: { targetNamedTrait: "Seer", targetInjure: true } },
        { label: "Dreams are for after. Focus.", desc: "+3 Nerve.", fx: { fervor: 3 } }
      ]
    },
    // ARC: THE SCAR KEEPER (appears after 3+ wins, requires hardened cats)
    {
      id: "scar_keeper_1",
      title: "The Marking",
      icon: "\u2694\uFE0F",
      minNight: 2,
      tag: "memory",
      needsCat: "random",
      metaRequires: (s) => s.w >= 3 && !s.chronicle?.scarKeeper_complete,
      metaExcludes: (s) => s.chronicle?.scarKeeper_acknowledged || s.chronicle?.scarKeeper_dismissed,
      textFn: (t, ctx) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        const sc = t[0]?.scarred;
        return sc ? `${n} has a scar that matches one from a colony that fell before yours. Same shape. Same place. The elder. the cat who's been here longest. says it means the memory is trying to get out.` : `${n} found markings on the wall. Claw marks. Old ones. They match a pattern no living cat could have taught. Something from before.`;
      },
      choices: [
        { label: "Let it mean something.", desc: "Cat +2 Power. The scars remember.", fx: { targetPower: 2, chronicleSet: "scarKeeper_acknowledged" } },
        { label: "Scars are scars. Move on.", desc: "+3 Nerve.", fx: { fervor: 3, chronicleSet: "scarKeeper_dismissed" } }
      ]
    },
    {
      id: "scar_keeper_2",
      title: "The Keeper Speaks",
      icon: "\u{1F5FA}\uFE0F",
      minNight: 3,
      tag: "memory",
      metaRequires: (s) => s.chronicle?.scarKeeper_acknowledged && !s.chronicle?.scarKeeper_complete,
      textFn: (_, ctx) => `The patterns are everywhere now. Scratched into stone, traced in the dirt, carved by cats who died before you were born. They're not random. They're a map. A map to the First Colony's shelter. Whatever's there has been waiting a very long time.`,
      choices: [
        { label: "Follow the map.", desc: "Reveal boss traits. +2 Nerve.", fx: { fervor: 2, chronicleSet: "scarKeeper_mapped", peek: 1 } },
        { label: "The past stays buried.", desc: "+4 Nerve.", fx: { fervor: 4 } }
      ]
    },
    {
      id: "scar_keeper_3",
      title: "The Scar's Memory",
      icon: "\u{1F3DB}\uFE0F",
      minNight: 3,
      tag: "memory",
      metaRequires: (s) => s.chronicle?.scarKeeper_mapped && !s.chronicle?.scarKeeper_complete,
      textFn: (_, ctx) => `You found it. The First Colony's shelter. Collapsed, overgrown, but inside, something still warm. Not fire. Memory. The walls are covered in names. Hundreds of names. And at the bottom, space for yours.`,
      choices: [
        { label: "Write your names. Carry theirs.", desc: "All cats +2 Power. A ward left behind.", fx: { allPower: 2, addWard: true, chronicleSet: "scarKeeper_complete" } },
        { label: "Seal it. This place is a grave.", desc: "+6 Nerve.", fx: { fervor: 6, chronicleSet: "scarKeeper_complete" } }
      ]
    },
    // ARC: THE HISTORIAN (appears after 9+ Hearth cats)
    {
      id: "historian_1",
      title: "The Historian",
      icon: "\u{1F4D6}",
      minNight: 2,
      tag: "memory",
      metaRequires: (s) => (s.hearthTotal || 0) >= 9 && !s.chronicle?.historian_complete,
      metaExcludes: (s) => s.chronicle?.historian_met,
      textFn: (_, ctx) => `An old cat. Older than old. Blind, but they move like they can see the walls from memory. "I've been counting," they say. "Colonies. Not the ones that survived. The ones that didn't. Eight. I knew their names. Do you?"`,
      choices: [
        { label: "Tell me their names.", desc: "+3 Nerve. The mythology deepens.", fx: { fervor: 3, chronicleSet: "historian_met" } },
        { label: "Names don't help the living.", desc: "+4 Rations.", fx: { gold: 4, chronicleSet: "historian_dismissed" } }
      ]
    },
    {
      id: "historian_2",
      title: "The Historian's Gift",
      icon: "\u{1F4DC}",
      minNight: 3,
      tag: "memory",
      metaRequires: (s) => s.chronicle?.historian_met && !s.chronicle?.historian_complete,
      textFn: (_, ctx) => `The blind cat returned. They brought something: a bundle of leaves, each one etched with a name. "Eight colonies," they whisper. "Each one learned something the next one needed. The First learned hunger. The Third learned love costs more than hate. The Eighth learned that 'almost' and 'failure' weigh the same." They hold out the bundle. "Your turn to learn."`,
      choices: [
        { label: "Take the bundle. Carry all eight.", desc: "All cats +1 Power. +3 Nerve. The weight is worth it.", fx: { allPower: 1, fervor: 3, chronicleSet: "historian_complete" } },
        { label: "We'll write our own lessons.", desc: "+5 Nerve.", fx: { fervor: 5, chronicleSet: "historian_complete" } }
      ]
    },
    // ARC: THE FIRE SPREADER (appears after Heat 3+ win)
    {
      id: "fire_spreader_1",
      title: "The Fire That Traveled",
      icon: "\u{1F525}",
      minNight: 2,
      tag: "hope",
      metaRequires: (s) => (s.mh || 0) >= 3 && !s.chronicle?.fireSpreader_complete,
      metaExcludes: (s) => s.chronicle?.fireSpreader_found,
      textFn: (_, ctx) => `A fire in the distance. Not the Hearth. Something further. Something that shouldn't be there. Someone carried a coal from your fire and planted it in the dark. It's still burning. You can see it from here.`,
      choices: [
        { label: "Find out who lit it.", desc: "+3 Nerve. +3 Rations.", fx: { fervor: 3, gold: 3, chronicleSet: "fireSpreader_found" } },
        { label: "Let it burn. Fires don't need permission.", desc: "+4 Nerve.", fx: { fervor: 4, chronicleSet: "fireSpreader_ignored" } }
      ]
    },
    {
      id: "fire_spreader_2",
      title: "The Other Colony",
      icon: "\u{1F3D5}\uFE0F",
      minNight: 3,
      tag: "hope",
      metaRequires: (s) => s.chronicle?.fireSpreader_found && !s.chronicle?.fireSpreader_complete,
      textFn: (_, ctx) => `They're real. A tenth colony. Tiny, fragile, impossible. Three cats huddled around a coal that came from your Hearth. They look at you the way you looked at the dark on your first night. There was never supposed to be a tenth. But here it is.`,
      choices: [
        { label: "Give them what they need.", desc: "-4 Rations. +6 Nerve. A new colony survives.", fx: { gold: -4, fervor: 6, chronicleSet: "fireSpreader_complete" } },
        { label: "They'll have to earn it. Like you did.", desc: "+4 Nerve. They watch you leave.", fx: { fervor: 4, chronicleSet: "fireSpreader_complete" } }
      ]
    },
    // v0.7: Build-reactive events — the game notices your colony's composition
    {
      id: "autumn_wind",
      title: "The Autumn Wind",
      icon: "\u{1F342}",
      minNight: 2,
      tag: "season",
      condFn: (_, ctx) => ctx.all && ctx.all.filter((c) => c.breed === "Autumn").length >= 5,
      textFn: (_, ctx) => {
        const n = ctx.all.filter((c) => c.breed === "Autumn").length;
        return `The wind carries the scent of fallen leaves. ${n} of your colony were born when things ended. They know what it means to hold on past the season. The wind knows them.`;
      },
      choices: [
        { label: "Let the wind through.", desc: "All Autumn cats +1 Power.", fx: { seasonBoost: "Autumn" } },
        { label: "Shelter against it.", desc: "+3 Rations. The wind passes.", fx: { gold: 3 } }
      ]
    },
    {
      id: "summer_heat",
      title: "The Longest Day",
      icon: "\u2600\uFE0F",
      minNight: 2,
      tag: "season",
      condFn: (_, ctx) => ctx.all && ctx.all.filter((c) => c.breed === "Summer").length >= 5,
      textFn: (_, ctx) => {
        const n = ctx.all.filter((c) => c.breed === "Summer").length;
        return `The light lingers. ${n} cats born in the longest days pace restlessly. They burn like they know it won't last. Tonight, they burn brighter.`;
      },
      choices: [
        { label: "Let them burn.", desc: "All Summer cats +1 Power.", fx: { seasonBoost: "Summer" } },
        { label: "Save the energy.", desc: "+2 Nerve.", fx: { fervor: 2 } }
      ]
    },
    {
      id: "winter_silence",
      title: "The First Frost",
      icon: "\u2744\uFE0F",
      minNight: 2,
      tag: "season",
      condFn: (_, ctx) => ctx.all && ctx.all.filter((c) => c.breed === "Winter").length >= 5,
      textFn: (_, ctx) => {
        const n = ctx.all.filter((c) => c.breed === "Winter").length;
        return `Cold settles. ${n} of your colony were born in it. The cold never left them. Tonight, it sharpens them.`;
      },
      choices: [
        { label: "Embrace the cold.", desc: "All Winter cats +1 Power.", fx: { seasonBoost: "Winter" } },
        { label: "Build the fire higher.", desc: "+3 Rations.", fx: { gold: 3 } }
      ]
    },
    {
      id: "spring_growth",
      title: "New Growth",
      icon: "\u{1F331}",
      minNight: 2,
      tag: "season",
      condFn: (_, ctx) => ctx.all && ctx.all.filter((c) => c.breed === "Spring").length >= 5,
      textFn: (_, ctx) => {
        const n = ctx.all.filter((c) => c.breed === "Spring").length;
        return `Something pushes up through the dark soil. ${n} cats feel it. They were born when the world tried again. Tonight, they carry that stubbornness.`;
      },
      choices: [
        { label: "Let it grow.", desc: "All Spring cats +1 Power.", fx: { seasonBoost: "Spring" } },
        { label: "Harvest what's there.", desc: "+3 Rations.", fx: { gold: 3 } }
      ]
    },
    {
      id: "kindred_call",
      title: "The Kindred Call",
      icon: "\u{1F43E}",
      minNight: 3,
      tag: "trait",
      condFn: (_, ctx) => {
        if (!ctx.all) return false;
        const tc = {};
        ctx.all.forEach((c) => {
          if (c.trait?.name !== "Plain") tc[c.trait?.name] = (tc[c.trait?.name] || 0) + 1;
        });
        return Object.values(tc).some((v) => v >= 3);
      },
      textFn: (_, ctx) => {
        const tc = {};
        ctx.all.forEach((c) => {
          if (c.trait?.name !== "Plain") tc[c.trait?.name] = (tc[c.trait?.name] || 0) + 1;
        });
        const top = Object.entries(tc).sort((a, b) => b[1] - a[1])[0];
        return `Three or more share the ${top[0]} trait. They move in sync now. Something between instinct and ritual. The colony notices.`;
      },
      choices: [
        { label: "Let them lead.", desc: "Kindred hand type +2 mult this run.", fx: { kindredBoost: true } },
        { label: "Teach the others. Everyone learns.", desc: "Random Plain cat learns the dominant trait.", fx: { teachDominant: true } }
      ]
    },
    {
      id: "hardened_gather",
      title: "The Hardened Gather",
      icon: "\u2694",
      minNight: 3,
      tag: "scars",
      condFn: (_, ctx) => ctx.all && ctx.all.filter((c) => c.scarred).length >= 3,
      textFn: (_, ctx) => {
        const h = ctx.all.filter((c) => c.scarred);
        return `${h.length} of your colony bear marks. They don't talk about how they got them. But tonight, they sit together. Apart from the others. Understanding something the unhurt never will.`;
      },
      choices: [
        { label: "Leave them alone. Scars know what they're doing.", desc: "All hardened cats +1 Power.", fx: { hardenedBoost: true } },
        { label: "You're tough. Be useful about it.", desc: "+4 Rations. The hardened always find a way.", fx: { gold: 4 } }
      ]
    },
    {
      id: "bonded_strength",
      title: "Stronger Together",
      icon: "\u{1F495}",
      minNight: 2,
      tag: "bonds",
      condFn: (_, ctx) => ctx.all && ctx.all.filter((c) => c.bondedTo).length >= 4,
      textFn: (_, ctx) => {
        const bp = ctx.all.filter((c) => c.bondedTo).length / 2;
        return `${Math.floor(bp)} bonded pairs. The colony is built on love. That's not weakness. That's architecture.`;
      },
      choices: [
        { label: "Look at them. Look at what love does.", desc: "All bonded cats +1 Power. +3 mood.", fx: { bondBoost: true } },
        { label: "Eyes forward. Love doesn't win fights.", desc: "+2 Nerve. Love doesn't win fights alone.", fx: { fervor: 2 } }
      ]
    },
    // ═══════════════════════════════════════════════════
    // v0.7: MISSING CHAIN FOLLOW-UPS + NEW CHAINS
    // ═══════════════════════════════════════════════════
    {
      id: "debt_reward",
      title: "The Debt Remembered",
      icon: "\u{1F381}",
      minNight: 3,
      chainRequires: "debt_paid",
      tag: "memory",
      textFn: (_, ctx) => `The dark remembers debts paid. Something was left at the entrance. A gift. Or a receipt.`,
      choices: [
        { label: "We earned this. Take it.", desc: "Find a ward. +2 Rations.", fx: { gold: 5, fervor: 1 } },
        { label: "Walk away. We paid enough.", desc: "+4 Nerve.", fx: { fervor: 4 } }
      ]
    },
    {
      id: "fire_ashes",
      title: "What the Fire Left",
      icon: "\u{1F525}",
      minNight: 3,
      chainRequires: "fire_taken",
      needsCat: "random",
      tag: "survival",
      textFn: (t) => {
        const n = t[0]?.name.split(" ")[0] || "Someone";
        return `${n} sifts through the ashes. Something hardened by the heat. Changed.`;
      },
      choices: [
        { label: "Deeper. There's something under the ash.", desc: "Cat gains Scrapper. Cat hardened.", fx: { targetNamedTrait: "Scrapper", targetScar: true } },
        { label: "Leave it. Ashes don't owe us anything.", desc: "+3 Rations.", fx: { gold: 3 } }
      ]
    },
    {
      id: "stranger_home",
      title: "The Stranger's Name",
      icon: "\u{1F3E0}",
      minNight: 3,
      chainRequires: "stranger_redeemed",
      tag: "belonging",
      textFn: () => `The one you turned away and then let in. They brought food without being asked. They have a name now.`,
      choices: [
        { label: "You're one of us now. Act like it.", desc: "All cats +1 Power. +2 Nerve.", fx: { allPower: 1, fervor: 2 } },
        { label: "Show me. Tonight. In the dark.", desc: "Random cat gains rare trait. -3 Rations.", fx: { rareTrait: true, gold: -3 } }
      ]
    },
    {
      id: "storm_aftermath",
      title: "After the Storm",
      icon: "\u{1F308}",
      minNight: 3,
      tag: "hope",
      condFn: (_, ctx) => {
        const eh = ctx.eventHistory || {};
        return eh.storm_shield || eh.storm_ride || eh.storm_shelter;
      },
      textFn: (_, ctx) => {
        const eh = ctx.eventHistory || {};
        return eh.storm_shelter ? "The supplies you burned kept everyone alive. But everyone is still here." : eh.storm_shield ? "The strongest took the worst of it. The youngest are untouched." : "Everyone took their share. The bruises are equal. So is the bond.";
      },
      choices: [
        { label: "We're alive. That's the only lesson.", desc: "All cats +1 Power.", fx: { allPower: 1 } },
        { label: "Build the walls. Dig the trenches. Never again.", desc: "+1 Shelter. +2 Nerve. -3 Rations.", fx: { eventDenSafe: true, fervor: 2, gold: -3 } }
      ]
    }
  ];
  const BOSS_REWARDS = [
    // --- ECONOMY ---
    { id: "br_rations", name: "What They Left Behind", desc: "+8 Rations", icon: "\u{1F41F}", type: "gold", value: 8 },
    { id: "br_bounty", name: "The Bounty", desc: "+5 Rations, +1 Nerve", icon: "\u{1F41F}", type: "gold_nerve", value: 5 },
    { id: "br_tithe", name: "The Tithe", desc: "+12 Rations, worst cat lost", icon: "\u{1F4B0}", type: "gold_sacrifice", value: 12, minNight: 3 },
    // --- HANDS / DISCARDS ---
    { id: "br_hands", name: "Earned Ground", desc: "+1 Hand per round (this run)", icon: "\u270A", type: "hands", value: 1 },
    { id: "br_discs", name: "Quick Reflexes", desc: "+2 Free Recruits per round (this run)", icon: "\u{1F4E3}", type: "freeRecruits", value: 2 },
    { id: "br_both", name: "Battle Rhythm", desc: "+1 Hand, +2 Free Recruits next night", icon: "\u26A1", type: "temp_both" },
    // --- POWER ---
    { id: "br_power", name: "They Remember", desc: "All cats +1 Power", icon: "\u2B50", type: "power", value: 1 },
    { id: "br_elite", name: "The Strongest Survives", desc: "Best cat +3 Power, weakest -1", icon: "\u{1F4AA}", type: "elite_power", minNight: 2 },
    { id: "br_surge", name: "Adrenaline Surge", desc: "All cats +2 Power, -1 Power next night", icon: "\u{1F53A}", type: "surge", minNight: 3 },
    // --- TRAITS ---
    { id: "br_trait", name: "Her Locket", desc: "Best cat gains a rare trait", icon: "\u{1F48E}", type: "trait" },
    { id: "br_common_trait", name: "Hard Lessons", desc: "3 Plain cats gain random common traits", icon: "\u{1F4DA}", type: "mass_trait" },
    { id: "br_xp", name: "Forged in Battle", desc: "All cats +1 Power", icon: "\u2605", type: "power_all" },
    // --- DECK ---
    { id: "br_thin", name: "Cleared Path", desc: "Remove 3 weakest cats", icon: "\u{1F5D1}\uFE0F", type: "thin", value: 3 },
    { id: "br_recruit", name: "Fresh Blood", desc: "Gain 2 cats with traits", icon: "\u{1F431}", type: "recruit", minNight: 2 },
    { id: "br_shelter", name: "Deeper Ground", desc: "+1 Shelter slot (permanent)", icon: "\u{1F3E0}", type: "shelter" },
    // --- NERVE ---
    { id: "br_nerve", name: "Defiance", desc: "+3 Nerve", icon: "\u{1F525}", type: "nerve", value: 3 },
    { id: "br_nerve_lock", name: "Unbreakable", desc: "+4 Nerve", icon: "\u{1F6E1}\uFE0F", type: "nerve_surge", minNight: 3 },
    // --- WARDS ---
    { id: "br_ward", name: "The Relic", desc: "Gain a random ward", icon: "\u{1F52E}", type: "ward" },
    // --- HEALING ---
    { id: "br_heal", name: "The Respite", desc: "All cats fully heal. Den safe.", icon: "\u{1F33F}", type: "heal_safe" },
    // --- DARK / HIGH-RISK ---
    { id: "br_gamble", name: "Double or Nothing", desc: "Random: +10 Rations or lose half", icon: "\u{1F3B2}", type: "gamble", minNight: 2 },
    { id: "br_blood", name: "Blood Price", desc: "Strongest cat hardened. All others +2 Power.", icon: "\u{1FA78}", type: "blood_price", minNight: 3 }
  ];
  function pickBossRewards(currentAnte, prevIds = []) {
    const pool = BOSS_REWARDS.filter((r) => (!r.minNight || currentAnte >= r.minNight) && !prevIds.includes(r.id));
    return shuf([...pool]).slice(0, 3);
  }
  const EXPANDED_BOSSES = [
    {
      id: "fraying",
      name: "The Fraying",
      icon: "\u{1F578}\uFE0F",
      taunt: "I'm already inside. I always have been.",
      tauntFn: (ctx) => {
        const pf = ctx.prevFallen || [];
        if ((ctx.totalRuns || 0) > 5 && ctx.grudges > 0) return `Colony ${(ctx.totalRuns || 0) + 1} and they're already fighting. The Fifth Colony fought too. I watched. I didn't need to do anything.`;
        return ctx.bonded > 3 && ctx.grudges > 0 ? "Love and hate in the same den. I don't even have to try." : ctx.grudges > 0 ? `They resent each other. I can taste it.` : "No grudges? Give it time. I'm patient.";
      },
      defeat: "You held it together. The Fifth Colony said the same thing on Night 3.",
      defeatFn: (ctx) => ctx.clutch ? "Held together by a thread. I know what threads do." : "You healed what I infected. Impressive. Temporary.",
      lore: "The colony that ate itself."
    },
    {
      id: "eclipse",
      name: "The Eclipse",
      icon: "\u{1F311}",
      taunt: "You've fought so hard. Isn't it time to rest?",
      tauntFn: (ctx) => {
        const pf = ctx.prevFallen || [];
        if ((ctx.totalDeaths || 0) > 10) return `${ctx.totalDeaths} cats across ${(ctx.totalRuns || 0) + 1} colonies. You keep building. You keep losing. Isn't it exhausting? Wouldn't it be easier to just... stop?`;
        return ctx.fallen > 2 ? "You've lost so many. Why keep going? For what?" : ctx.colony < 12 ? "So few of you. You've done enough. It's okay." : "All that nerve. All that fire. Aren't you tired?";
      },
      defeat: "Fine. Burn. But fire always goes out eventually.",
      defeatFn: (ctx) => ctx.clutch ? "You almost let go. You wanted to. I felt it." : "Still burning. The Sixth Colony burned too. Until they didn't.",
      lore: "The fire went out and no one relit it."
    },
    {
      id: "ember",
      name: "The Ember That Remains",
      icon: "\u{1F525}",
      taunt: "Don't you dare fall one short. Don't you dare.",
      tauntFn: (ctx) => {
        const pf = ctx.prevFallen || [];
        if (pf.length > 0 && (ctx.totalRuns || 0) > 2) return `Colony ${(ctx.totalRuns || 0) + 1}. We were colony 8. We got this far. ${pf[0].name} didn't make it in one of yours. We know what that costs. Don't let it be for nothing.`;
        return ctx.clutch ? "Cutting it close. I know what 'close' costs." : ctx.colony < 10 ? "Not enough of you. There weren't enough of us either." : ctx.fallen > 0 ? "We lost three on Night 4. Thought we could still make it. 'Still' is a lie." : "This is where we died. Right here. Make it different.";
      },
      defeat: "Good. Do what we couldn't. And don't look back.",
      defeatFn: (ctx) => ctx.clutch ? "By that much? Of course by that much. It's always by that much." : "All of them. You kept all of them. We... couldn't.",
      lore: "One hand short. That's the whole story."
    }
  ];
  const BOSS_TRAITS = [
    { id: "armored", name: "Armored", icon: "\u{1F6E1}\uFE0F", desc: "+20% target", flavor: "It remembers how to protect itself.", fx: { tgtMult: 1.2 } },
    { id: "watchful", name: "Watchful", icon: "\u{1F441}\uFE0F", desc: "Strength meter disabled", flavor: "It knows what you're holding.", fx: { noStrength: true } },
    { id: "sealed", name: "Sealed", icon: "\u{1F512}", desc: "Ward abilities blocked", flavor: "Your tricks won't work.", fx: { sealed: true } },
    { id: "bleeding", name: "Bleeding", icon: "\u{1FA78}", desc: "Target shrinks 2% per hand played", flavor: "It weakens, but will you last?", fx: { bleeding: true } },
    { id: "frozen", name: "Frozen", icon: "\u{1F9CA}", desc: "First 2 cats score half power", flavor: "The cold takes the first ones.", fx: { frozen: true } },
    { id: "enraged", name: "Enraged", icon: "\u{1F525}", desc: "Target \u221215%, all cats +3 mult", flavor: "It fights harder. So do you.", fx: { tgtMult: 0.85, enragedMult: 3 } },
    { id: "fading", name: "Fading", icon: "\u{1F56F}\uFE0F", desc: "Target grows 5% per hand remaining", flavor: "It grows stronger as time runs out.", fx: { fading: true } },
    { id: "marked", name: "Marked", icon: "\u{1FA9E}", desc: "One cat hardened before the fight", flavor: "The dark reached in and chose one.", fx: { marked: true } },
    { id: "bloodied", name: "Bloodied", icon: "\u{1FA79}", desc: "Every failed hand scars a random cat", flavor: "Each mistake leaves a permanent mark.", fx: { bloodied: true } }
  ];
  function pickBossTraits(ante, heat, isNinthDawn) {
    const pool = shuf([...BOSS_TRAITS]);
    let count = 0;
    if (ante === 1) count = 0;
    else if (ante === 2) count = Math.random() < 0.5 ? 0 : 1;
    else if (ante === 3) count = 1;
    else if (ante === 4) count = Math.random() < 0.5 ? 1 : 2;
    else count = 2;
    if ((heat || 0) >= 2) count += 1;
    if (isNinthDawn) count = Math.min(3, count + 1);
    return pool.slice(0, Math.min(count, 3));
  }
  const HEAT_FLAVOR = [
    "",
    "The fire remembers.",
    "They're sending you instead of an army.",
    "The dark noticed.",
    "Everything you've built burns in your defense.",
    "Ninth life. Last light. No mercy."
  ];
  const HEAT_RELICS = [
    null,
    // index 0 unused
    { heat: 1, icon: "\u{1F56F}\uFE0F", name: "First Flame", desc: "Colony events offer +1 choice", flavor: "The first light anyone carried out of the dark." },
    { heat: 2, icon: "\u2694\uFE0F", name: "Old Scars", desc: "Scarred cats start with +1 Power", flavor: "What doesn't kill them makes everyone remember." },
    { heat: 3, icon: "\u{1F441}\uFE0F", name: "The Vigil", desc: "Boss intros reveal their weakness", flavor: "They watched the dark long enough to learn its patterns." },
    { heat: 4, icon: "\u{1F31F}", name: "Ninth Star", desc: "Hearth descendants start with +1 Power", flavor: "The bloodline strengthens." },
    { heat: 5, icon: "\u{1F525}", name: "Undying Flame", desc: "Start every run with +1 Nerve", flavor: "The last thing the dark expected: someone who came back angrier." }
  ];
  const NINTH_DAWN_EVENTS = [
    {
      id: "nd_first_fire",
      title: "The First Colony's Fire",
      icon: "\u{1F525}",
      minNight: 1,
      maxNight: 1,
      ninthDawn: true,
      textFn: (_, ctx) => {
        const inj = ctx?.injured || 0;
        return inj > 0 ? `You find warmth where there should be none. A fire pit, maintained by no one, burning fuel that doesn't exist. ${inj} of your cats are hurting. They press close. The First Colony's last gift. Or their last trap.` : `You find warmth where there should be none. A fire pit, maintained by no one, burning fuel that doesn't exist. The First Colony starved behind perfect walls. This fire is all that remains of them.`;
      },
      choices: [
        { label: "Keep it burning", desc: "+3 Nerve. All cats heal.", fx: { fervor: 3, fullHeal: true } },
        { label: "Pocket the coals. We'll need them", desc: "+6 Rations", fx: { gold: 6 } },
        { label: "Let it go. See what rises", desc: "Best cat gains Mythic trait", fx: { rareTrait: true, specificTrait: "Eternal" } }
      ]
    },
    {
      id: "nd_second_wall",
      title: "The Second Colony's Wall",
      icon: "\u{1F9F1}",
      minNight: 2,
      maxNight: 2,
      ninthDawn: true,
      textFn: (_, ctx) => {
        const c = ctx?.colony || 12;
        return `A wall. Built perfectly. Every stone placed with intention. Behind it: nothing. The Second Colony defended something that was already gone. Your ${c} study the craftsmanship. The question is whether to build on ruin.`;
      },
      choices: [
        { label: "Pull it apart. Use the pieces", desc: "+2 Hands next round", fx: { tempHands: 2 } },
        { label: "Build on top. Make it ours", desc: "Den is safe next phase", fx: { eventDenSafe: true } },
        { label: "Read the stones. Someone left a message", desc: "Random cat gains a trait", fx: { targetTrait: true } }
      ]
    },
    {
      id: "nd_third_cradle",
      title: "The Third Colony's Cradle",
      icon: "\u{1F37C}",
      minNight: 3,
      maxNight: 3,
      ninthDawn: true,
      textFn: (_, ctx) => {
        const bd = ctx?.bonded || 0;
        return bd > 0 ? `A nest. Woven from materials that don't grow here anymore. Inside: tiny bones, curled together. She tried to keep them warm. She tried so hard. Your ${bd} bonded cats understand. They look away first.` : `A nest. Woven from materials that don't grow here anymore. Inside: tiny bones, curled together. The Third Colony's leader loved every one of them. That was her mistake. And her gift.`;
      },
      choices: [
        { label: "Sit. Remember. Cry if you need to", desc: "All bonded cats +2 Power", fx: { bondedPower: 2 } },
        { label: "Swear it. On their names", desc: "+4 Nerve", fx: { fervor: 4 } },
        { label: "Bring them with us. They deserve that", desc: "A kitten appears. P1. Phoenix trait.", fx: { addPhoenixKitten: true } }
      ]
    },
    {
      id: "nd_eighth_score",
      title: "The Eighth Colony's Score",
      icon: "\u{1F4CA}",
      minNight: 4,
      maxNight: 4,
      ninthDawn: true,
      textFn: (_, ctx) => {
        const hs = ctx?.all ? Math.max(...ctx.all.map((c) => c.stats?.bs || 0)) : 0;
        return hs > 1e4 ? `Scratched into the floor: a number. Their best score. Their last score. The one that wasn't enough. You've scored higher. The number stares at you like a dare anyway.` : `Scratched into the floor: a number. Their best score. Their last score. The one that wasn't enough. The Eighth Colony came this close. One hand short. The number stares at you like a dare.`;
      },
      choices: [
        { label: "Watch this. Hold my rations", desc: "Next hand \u226550% of target? +6 Nerve. Else \u22123.", fx: { dareBet: true } },
        { label: "Bow your head. Witness", desc: "+5 Rations. Some things need witnessing.", fx: { gold: 5 } },
        { label: "Scratch it out. We write our own", desc: "Best cat gains Scrapper", fx: { targetScrapper: true } }
      ]
    },
    {
      id: "nd_names_wall",
      title: "The Names on the Wall",
      icon: "\u{1F4DC}",
      minNight: 5,
      maxNight: 5,
      ninthDawn: true,
      textFn: (_, ctx) => {
        const c = ctx?.colony || 12;
        const f = ctx?.fallen?.length || 0;
        return f > 0 ? `Every name. Every colony. Scratched, painted, burned into stone. Hundreds of names you will never know. Below them, space for ${c} more. And ${f} empty spaces where names should have been.` : `Every name. Every colony. Scratched, painted, burned into stone. Hundreds of names you will never know. And below them, space for exactly ${c} more. Your cats' names. There is exactly enough room.`;
      },
      choices: [
        { label: "Every name. Every single one", desc: "All cats +1 Power", fx: { allPower: 1 } },
        { label: "No names. Names are for the living", desc: "+5 Nerve. Names are for the living.", fx: { fervor: 5 } }
      ]
    }
  ];
  const THE_REMEMBERING = {
    name: "The Remembering",
    icon: "\u{1F305}",
    taunt: "I am everyone you saved and everyone you lost. Do you know why you're here?",
    tauntFn: (ctx) => "I am the First Colony's hunger and the Eighth Colony's last hand. I am the fire that went out and the fire that didn't.",
    defeat: "Not because you're strong. Because you remember.",
    defeatFn: (ctx) => ctx.clutch ? "By that much. Of course. It's always by that much. But you remembered." : "They will remember this colony. They will have to. Because you remembered all the rest.",
    lore: "The last question is not 'did you survive.' It is 'did you remember.'"
  };
  function canUnlockNinthDawn(meta) {
    if (!meta) return false;
    const w = meta.stats.w || 0, h = Math.max(meta.heat || 0, meta.stats.mh || 0), cats = meta.cats?.length || 0;
    const allBreeds = BK.every((b) => (meta.stats.disc || []).some((d) => d.startsWith(b)));
    const achvCount = (meta.achv || []).length;
    return w >= 1 && h >= 3 && cats >= 9 && allBreeds && achvCount >= 3;
  }
  const EPIGRAPHS = [
    "You don't get to choose what you lose. Only what you carry.",
    "A colony is a bet against the dark. Sometimes the dark wins.",
    "They asked me how many survived. I told them their names instead.",
    "The difference between a colony and a grave is one more night.",
    "Every name is a small act of defiance against forgetting.",
    "Eight colonies fell. This one doesn't have to.",
    "The dark doesn't hate you. It doesn't know you're there. Yet.",
    "What do you call the thing that keeps burning after everything else goes out?",
    "They didn't win because they were the strongest. They won because they didn't stop.",
    "Somewhere behind the dark, the dawn is keeping score.",
    "A colony is just a word for people who refuse to die alone.",
    "The first colony starved. The second fought. The third loved too much. You get one more try.",
    "Not all fires go out. Some of them become Hearths.",
    "The same tests. The same dark. The only variable is you.",
    "Eight iterations. Eight failures. The system doesn't know it's about to break.",
    "The dark sends the same patterns because they've always worked. Until now.",
    "Every colony that failed made the next one possible. That's not hope. That's math."
  ];
  function getEpigraph(meta) {
    if (!meta || meta.stats.r === 0) return pk(EPIGRAPHS);
    const w = meta.stats.w || 0, r = meta.stats.r || 0, h = meta.heat || 0, cats = meta.cats?.length || 0;
    const br = meta.stats.bossRecord || {};
    const totalBossWins = Object.values(br).reduce((s, b) => s + (b.w || 0), 0);
    if (w >= 1 && h >= 3 && cats >= 9 && BK.every((b) => (meta.stats.disc || []).some((d) => d.startsWith(b))) && (meta.achv || []).length >= 3) {
      if (meta.ninthDawnCleared) return "Nine colonies. One survived. Not because it was the strongest. Because someone remembered all the rest.";
      return "The Hearth is bright enough to see by now. Something is coming. Not from the dark. From the light.";
    }
    if (totalBossWins >= 20 && w >= 10) return pk(["You've broken the pattern so many times the dark is rewriting its tests.", "The system was built to process colonies. It wasn't built to process you."]);
    if (br.forgetting?.w >= 3) return "The Forgetting tried three times. You said their names every time. It doesn't know what to do with that.";
    if (cats >= 15) return "The Hearth is full of names the system tried to erase. They're still here.";
    if ((meta.stats.grudgesResolved || 0) >= 10) return "They fought. They forgave. The system has no model for forgiveness.";
    if (h >= 3 && w >= 6) return "The dark is running out of patterns it hasn't tried on you. That's never happened before.";
    if (w >= 10) return "You are what the colonies were for.";
    if (r >= 6) return "The dark has learned to flinch.";
    if (w >= 4) return "They're starting to tell stories about you.";
    if (w >= 2) return "The Hearth burns a little brighter.";
    if (r >= 3 && w === 0) return pk(["The dark keeps winning. But you keep coming back.", "Three attempts. Zero victories. The stubborn survive longer than the strong."]);
    if (r >= 1) return "The night remembers your name now.";
    return pk(EPIGRAPHS);
  }
  const NIGHT_EPI = [
    "I. WHAT REMAINS",
    "II. THE COST OF KEEPING",
    "III. THE ONES WHO CAME BEFORE",
    "IV. WHAT YOU CHOSE",
    "V. WHAT THEY WERE FOR",
    "VI. WHAT THE DARK LEARNED",
    "VII. THE ANOMALY",
    "VIII. WHAT BURNS LONGER",
    "IX. THE LAST NAME"
  ];
  const NIGHT_PLACES = ["The Threshold", "The Hollow", "The Scar", "The Maw", "The Forgetting", "The Fraying", "The Eclipse", "The Ember", "The Remembering"];
  const LORE_FRAGMENTS = [
    "You found marks on the wall. Three tallies. Someone counted the days.",
    "An old collar. The name was 'Ash.' It meant something once.",
    "Claw marks in a circle. A colony that tried to hold the dark at bay.",
    "A pile of fish bones, carefully stacked. Someone was saving.",
    "Two sets of tracks, side by side. They walked together until they didn't.",
    "A den, perfectly built. Never used. The builders didn't make it this far.",
    "Scratched into stone: 'We were seven.' Nothing else.",
    "A single whisker caught in the wall. Still warm. Impossible.",
    "The ground here is softer. Something grew once. Something chose to stop.",
    "You smell smoke. Old smoke. From a fire that burned for someone else.",
    "A pattern in the dust. Someone was counting cats. They stopped at twelve.",
    "Tooth marks on a root. Someone gnawed through hunger. Someone didn't."
  ];
  const WHISPER_OVERFLOW = {
    crush: [
      // scored 200%+ of target
      "None of the eight ever scored like that. None.",
      "The dark flinched. Write that down. It flinched.",
      "The fourth colony never hit this hard. They still fell. Don't get comfortable.",
      "That number will echo through every colony that comes after this one."
    ],
    scrape: [
      // scored 100-130% of target
      "The eighth colony made it this far too. One hand short of everything.",
      "Close. The third colony lost their nerve here. She couldn't make the choice. You can.",
      "Enough. Barely enough. The first colony said that on Night 1. Then the food ran out.",
      "The margin was thin. The survival was not."
    ],
    boss: [
      // after beating a boss
      "One more echo silenced. Eight colonies produced that pattern. You just broke it.",
      "The dark sent what killed the others. You sent it back.",
      "Every boss is a colony that died wearing a different face. You just survived their death.",
      "The pattern expected to win. It always had before. Not tonight."
    ]
  };
  const WHISPER_SHOP = [
    "The first colony had perfect walls. No food. Every decision has a shadow.",
    "The sixth colony stopped buying. Stopped fighting. Stopped. Don't stop.",
    "Every ration spent is a bet that tomorrow exists. Place it wisely.",
    "The second colony fought over what the market offered. You get to choose. That's the difference.",
    "The fifth colony couldn't agree on what to buy. The argument outlasted the colony.",
    "The eighth colony saved everything for one last hand. They were one purchase short.",
    "The market doesn't care about your story. It cares about your \u{1F41F}. Same as the dark.",
    "Buy what keeps you alive. Sell what doesn't. The math is simple. The choices aren't."
  ];
  const WHISPER_NIGHT = [
    // contextual night card additions
    null,
    // Night 1: no whisper
    (ctx) => ctx.fallen > 0 ? `The dark took ${ctx.fallen === 1 ? "one" : "several"} on the second night. It always starts with the second night. The first colony learned that.` : "The second night. The dark is calibrating. Measuring you against the pattern of the eight that failed.",
    (ctx) => ctx.colony < 12 ? "Getting smaller. The third colony got smaller too. She tried to save them all. You can't. Nobody can." : "All of them, still here. The system didn't expect that. The third colony was half this size by Night 3.",
    (ctx) => ctx.fallen === 0 ? "Not a single name lost. The eighth colony was whole on Night 4 too. One more night and they'd have made it. They didn't." : "You've already made the choices the Mother couldn't. Whether that's enough is the only question left.",
    (_) => "The last night. Eight colonies never saw this far. The dark is running a pattern it's never completed. Neither are you.",
    (_) => "Six nights. The system is improvising now. It doesn't know this territory. Neither do you.",
    (_) => "Seven nights. You've outlived every colony that ever existed. The dark is watching something it doesn't understand.",
    (_) => "Eight nights. The eighth colony fell one hand short of this moment. You're standing where they died.",
    (_) => "Nine. The number was always nine. Nine colonies. Nine lives. Nine nights. This is why you're here."
  ];
  function getMoodWhisper(mood, colony) {
    if (mood < 20) return pk(["Backs against the wall. They stopped fighting each other.", "The dark is close. The colony is closer.", "No one slept. But no one left either."]);
    if (mood < 40) return pk(["Quiet tonight. The kind of quiet that precedes something.", "They're holding together. Tighter than before.", "Something changed after the last loss. They train harder now."]);
    if (mood > 80) return pk(["The colony breathes easier tonight.", "Something like laughter from the den. When was the last time?", "They're starting to look like they belong together."]);
    if (mood > 60) return pk(["Steady. The colony is finding its rhythm.", `${colony} names. All accounted for.`, "The bonds are holding. That matters."]);
    return null;
  }
  const NIGHT_SUB = [
    "They're yours now.",
    "The choices are still breathing.",
    "This happened before. Not to you.",
    "You are the sum of every choice.",
    "What were their names?",
    "You weren't supposed to be here.",
    "Longer than any. Longer than all.",
    "The dark is repeating itself. You're not.",
    "Nine."
  ];
  function getNarratorRecap(ante, ctx) {
    const { fallen, bonds, grudges, breeds, colony, eventHistory, scarred, allCats } = ctx;
    const eh = eventHistory || {};
    if (ante >= 5) {
      if (allCats && allCats.length > 0) {
        const names = allCats.slice(0, 8).map((c) => c.name.split(" ")[0]).join(". ") + ".";
        return fallen > 0 ? `${names} Still here. ${fallen} are not.` : names + " All of them. Still.";
      }
      return null;
    }
    const echoes = [];
    if (eh.stranger_welcomed) echoes.push("The stranger you let in sleeps by the fire now. They stopped flinching.");
    if (eh.stranger_rejected && !eh.stranger_redeemed) echoes.push("The stranger you turned away is still out there. You can feel the watching.");
    if (eh.stranger_redeemed) echoes.push("The stranger came back. You let them in this time. Something shifted.");
    if (eh.fire_tended) echoes.push("The fire you chose to tend still burns. It remembers the hand that fed it.");
    if (eh.sickness_quarantine) echoes.push("The one you quarantined carries the mark like a question you haven't answered.");
    if (eh.sickness_spread) echoes.push("The sickness touched everyone. Nobody died. But nobody's the same.");
    if (eh.wall_built) echoes.push("The wall you built is holding. You hear things test it at night.");
    if (eh.wall_refused) echoes.push("You scattered the stones. Sometimes you wonder what they would have stopped.");
    if (eh.debt_paid) echoes.push("The debt is paid. Blood price. The dark cashed the check and said nothing.");
    if (eh.debt_refused) echoes.push("You told the dark no. It hasn't forgotten. It doesn't forget anything.");
    if (ante <= 2) {
      if (echoes.length > 0) return echoes[0];
      const ac2 = allCats || [];
      const fallenName = ac2.length === 0 ? "someone" : "";
      const bondedPair = ac2.filter((c) => c.bondedTo);
      if (fallen > 0) {
        const fn = ctx.fallenNames || [];
        return fn.length ? `${fn[0]} is gone. The space where they slept is still warm.` : `${fallen} gone already. The spaces are still warm.`;
      }
      if (bondedPair.length >= 2) {
        const a = bondedPair[0].name.split(" ")[0];
        const b = ac2.find((c) => c.id === bondedPair[0].bondedTo);
        return b ? `${a} and ${b.name.split(" ")[0]} bonded in the dark. The colony is starting to mean something.` : "Someone bonded in the dark.";
      }
      return null;
    }
    if (ante === 3) {
      const ac2 = allCats || [];
      const scarredCat = ac2.find((c) => c.scarred);
      const grudgedCat2 = ac2.find((c) => (c.grudgedWith || []).length > 0);
      const bondedPair = ac2.filter((c) => c.bondedTo);
      const baby = ac2.find((c) => c.stats?.par);
      const stateLines = [];
      if (fallen > 0 && bondedPair.length >= 2) {
        const bName = bondedPair[0].name.split(" ")[0];
        stateLines.push(`Loss and love in the same den. ${bName} bonded while the colony grieved. The third colony knew this feeling.`);
      } else if (grudges >= 2 && grudgedCat2) stateLines.push(`${grudgedCat2.name.split(" ")[0]} is fighting their own. It always starts around Night 3. The fifth colony could tell you why.`);
      else if (baby) stateLines.push(`${baby.name.split(" ")[0]} was born in the dark. The fourth colony never got this far.`);
      else if (scarred >= 3 && scarredCat) stateLines.push(`${scarredCat.name.split(" ")[0]} is hardened now. The colony is starting to rhyme with the ones that came before.`);
      const echo2 = echoes.length > 0 ? echoes[0] + " " : "";
      const hint = stateLines.length > 0 ? stateLines[0] : "Funny thing about Night 3. It's where the pattern usually starts to show.";
      return echo2 + hint;
    }
    const ac = allCats || [];
    const strongest = ac.length ? [...ac].sort((a, b) => b.power - a.power)[0] : null;
    const strongName = strongest ? strongest.name.split(" ")[0] : "your colony";
    const systemLines = [
      `This has all happened before. The stranger. The sickness. The fire. The dark sends the same tests because they've always worked. But none of them had ${strongName}.`,
      `You're inside a pattern. The dark built it from eight dead colonies. Every event is a test. Every boss is a failure mode. The only thing the pattern didn't account for is ${strongName} and the others.`,
      "The dark doesn't improvise. It runs the same sequence it ran on the first colony. The sequence always wins. That's what makes tonight interesting.",
      "Eight iterations. Eight failures. The system expects you to fail too. It has no contingency for what happens if you don't."
    ];
    const echo = echoes.length > 0 ? echoes[0] + " " : "";
    const bondedCat = ac.find((c) => c.bondedTo);
    const grudgedCat = ac.find((c) => (c.grudgedWith || []).length > 0);
    const colState = fallen > 0 ? `${fallen} names the dark already collected. ` : bondedCat && bonds >= 2 ? `${bondedCat.name.split(" ")[0]} is bonded. The system doesn't have a test for that. ` : grudgedCat && grudges >= 2 ? `${grudgedCat.name.split(" ")[0]} is fighting their own. The dark doesn't need to break what's already cracking. ` : "";
    return echo + colState + pk(systemLines);
  }
  const SCORE_TIERS = [{ min: 0, label: "", color: "", sub: "", nar: "" }, { min: 1200, label: "Alive", color: "#b8956a", sub: "", nar: "Breathing. That counts." }, { min: 4500, label: "Defiant", color: "#b85c2c", sub: "they felt that one", nar: "Something cracked. They heard it." }, { min: 12e3, label: "ROARING", color: "#f59e0b", sub: "the ground shakes", nar: "The dark stopped moving. It's listening." }, { min: 35e3, label: "UNSTOPPABLE", color: "#fbbf24", sub: "nothing can touch them", nar: "Colonies don't score like this. Legends do." }, { min: 1e5, label: "LEGENDARY", color: "#fef08a", sub: "they will tell stories about this", nar: "Scratch it into the stone. Someone needs to find this number." }, { min: 35e4, label: "NINTH LIFE", color: "#ffffffdd", sub: "the dark blinks first", nar: "Nine lives. Nine colonies. One hand. This is the one they'll remember." }];
  function getScoreTier(s) {
    let t = SCORE_TIERS[0];
    for (const tier of SCORE_TIERS) if (s >= tier.min) t = tier;
    return t;
  }
  function getShakeIntensity(s) {
    if (s < 1500) return 0;
    if (s < 6e3) return 1;
    if (s < 15e3) return 2;
    if (s < 45e3) return 3;
    return 5;
  }
  let _nis = 0;
  const _un = /* @__PURE__ */ new Set();
  let _belovedNames = [];
  function setBelovedNames(meta) {
    if (!meta) return;
    const names = /* @__PURE__ */ new Set();
    (meta.cats || []).forEach((c) => {
      if (c.name) names.add(c.name.split(" ")[0]);
    });
    (meta.stats?.belovedNames || []).forEach((n) => names.add(n));
    _belovedNames = [...names];
  }
  function gN(br, trait) {
    const tName = trait && trait.name && trait.name !== "Plain" ? trait.name : null;
    if (_belovedNames.length > 0 && Math.random() < 0.5) {
      const avail = _belovedNames.filter((n2) => !_un.has(n2));
      if (avail.length > 0) {
        const n2 = avail[Math.floor(Math.random() * avail.length)];
        _un.add(n2);
        if (tName && Math.random() < 0.3) {
          const rareTitles = TITL_RARE[tName];
          if (rareTitles && Math.random() < 0.6) return `${n2} ${pk(rareTitles)}`;
          if (TITL[br]) return `${n2} ${pk(TITL[br])}`;
        }
        return n2;
      }
    }
    const pool = [...CAT_NAMES];
    if (SEASON_NAMES[br]) pool.push(...SEASON_NAMES[br], ...SEASON_NAMES[br]);
    if (tName && TRAIT_NAMES[tName]) pool.push(...TRAIT_NAMES[tName], ...TRAIT_NAMES[tName], ...TRAIT_NAMES[tName]);
    const shuffled = pool.sort(() => Math.random() - 0.5);
    let n = shuffled.find((x) => !_un.has(x) && x.length <= 8);
    if (!n) {
      const base = shuffled.find((x) => x.length <= 6) || shuffled[0] || "Cat";
      let suffix = 2;
      while (_un.has(base + suffix) && suffix < 99) suffix++;
      n = base + suffix;
    }
    _un.add(n);
    if (tName && Math.random() < 0.3) {
      const rareTitles = TITL_RARE[tName];
      if (rareTitles && Math.random() < 0.6) return `${n} ${pk(rareTitles)}`;
      if (TITL[br]) return `${n} ${pk(TITL[br])}`;
    }
    return n;
  }
  const QUIRKS = {
    Autumn: ["stares at falling things", "sleeps with one eye open", "hoards scraps", "vanishes mid-conversation", "sits in doorways", "refuses to be held", "watches the horizon"],
    Summer: ["purrs aggressively", "knocks things over", "yells at dawn", "eats too fast", "picks fights for fun", "headbutts everyone", "steals food"],
    Winter: ["never blinks first", "sits perfectly still", "watches snow fall", "last to sleep", "first to wake", "ignores chaos", "waits by the door"],
    Spring: ["grooms everyone", "brings gifts", "naps in sunlight", "follows the youngest", "purrs in their sleep", "finds water", "nudges the sad ones"]
  };
  let _cid = 0;
  const uid = () => `c${++_cid}`;
  const pk = (a) => a && a.length ? a[Math.floor(Math.random() * a.length)] : void 0;
  function cpk(cache, key, arr, fn) {
    if (!cache.current[key]) {
      cache.current[key] = fn ? fn(pk(arr)) : pk(arr);
    }
    return cache.current[key];
  }
  const shuf = (a) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const CAT_ORIGINS = {
    Autumn: ["Found shivering in a collapsed tunnel.", "Watched from the treeline for three days.", "Came from a colony that didn't survive harvest.", "Remembers things the others have forgotten."],
    Summer: ["Walked out of the dark like it owed them money.", "Still warm. Whatever happened before, this one ran.", "Born in the longest day. Burns like it.", "The loud one. Showed up yelling."],
    Winter: ["Was already here when the colony arrived.", "Born in the deep cold. The cold never left.", "Watched the dark with something like patience.", "The cold didn't bother them. Nothing did."],
    Spring: ["Followed the youngest kitten in. Stayed.", "Groomed everyone on arrival. Nobody refused.", "Born when the world thawed. Carried that warmth.", "The gentle one. Gentle things survive too."]
  };
  function gC(o = {}) {
    const br = o.breed || pk(BK);
    const defaultTrait = o.trait || pickTrait(false) || PLAIN;
    const cat2 = {
      id: uid(),
      breed: br,
      power: o.power || Math.floor(Math.random() * 6) + 1,
      trait: defaultTrait,
      extraTraits: o.extraTraits || [],
      name: o.name || gN(br, defaultTrait),
      sex: o.sex || (Math.random() < 0.5 ? "M" : "F"),
      parentBreeds: o.parentBreeds || null,
      parentIds: o.parentIds || null,
      quirk: o.quirk || pk(QUIRKS[o.breed || br] || QUIRKS.Autumn),
      origin: o.origin || pk(CAT_ORIGINS[br] || CAT_ORIGINS.Autumn),
      scarred: o.scarred || false,
      injured: o.injured || false,
      bondedTo: o.bondedTo || null,
      grudgedWith: o.grudgedWith || [],
      story: o.story || [],
      stats: o.stats || { tp: 0, ts: 0, bs: 0, bh: "" }
    };
    return cat2;
  }
  function breedC(p1, p2) {
    let br = Math.random() < 0.08 ? pk(BK) : Math.random() < 0.5 ? p1.breed : p2.breed;
    const parentAvg = (p1.power + p2.power) / 2;
    let pw = 3;
    if (Math.random() < 0.6) pw++;
    if (Math.random() < 0.4) pw++;
    const exceedChance = Math.max(0, Math.min(0.5, (parentAvg - 4) * 0.1));
    if (pw >= 5 && Math.random() < exceedChance) {
      const r = Math.random();
      pw = r < 0.7 ? 6 : r < 0.95 ? 7 : 8;
    }
    pw = Math.min(8, pw);
    let tr = PLAIN;
    const p1Traits = catAllTraits(p1), p2Traits = catAllTraits(p2);
    const parentTraits = [...p1Traits, ...p2Traits].filter((t) => t.name !== "Plain");
    if (parentTraits.length > 0 && Math.random() < 0.6) {
      tr = pk(parentTraits);
    }
    if (Math.random() < 0.08) {
      tr = pickBreedInheritTrait(p1, p2);
    }
    const t1 = (p1.trait || PLAIN).tier || "plain", t2 = (p2.trait || PLAIN).tier || "plain";
    const tiers = [t1, t2].map((t) => t === "mythic" ? 4 : t === "legendary" ? 3 : t === "rare" || t === "rare_neg" ? 2 : t === "common" ? 1 : 0);
    const minTier = Math.min(...tiers), maxTier = Math.max(...tiers);
    if (Math.random() < 0.09) {
      if (minTier >= 3) {
        tr = pk(MYTHIC_TRAITS);
      } else if (minTier >= 2) {
        tr = pk(LEGENDARY_TRAITS);
      } else if (maxTier >= 3 && Math.random() < 0.33) {
        tr = pk(LEGENDARY_TRAITS);
      }
    }
    const pBreeds = p1.breed !== p2.breed ? [p1.breed, p2.breed] : null;
    return gC({
      breed: br,
      power: pw,
      trait: tr,
      parentBreeds: pBreeds,
      parentIds: [p1.id, p2.id],
      sex: Math.random() < 0.5 ? "M" : "F",
      stats: { tp: 0, ts: 0, bs: 0, bh: "", par: `${p1.name.split(" ")[0]} & ${p2.name.split(" ")[0]}` }
    });
  }
  function calcAffinity(c1, c2, ctx = {}) {
    let breedCh = 0, fightCh = 0;
    const oppSex = c1.sex !== c2.sex;
    if (oppSex) breedCh = 30;
    const isParentChild = c1.parentIds?.includes(c2.id) || c2.parentIds?.includes(c1.id);
    const isSibling = c1.parentIds && c2.parentIds && c1.parentIds.some((p) => c2.parentIds.includes(p));
    if (isParentChild || isSibling) breedCh = 0;
    const b1 = c1.breed, b2 = c2.breed;
    const personalBond = c1.bondedTo === c2.id || c2.bondedTo === c1.id;
    if (personalBond) {
      breedCh += 15;
      fightCh = Math.max(0, fightCh - 3);
    }
    const hasGrudgeFlag = hasGrudge(c1, c2);
    if (hasGrudgeFlag) {
      fightCh += 12;
    }
    if (b1 === b2) {
      breedCh += 15;
      fightCh += 5;
    }
    [c1, c2].forEach((c) => {
      if (catHas(c, "Scrapper")) fightCh += 5;
      if (catHas(c, "Cursed")) fightCh += 8;
      if (catHas(c, "Alpha")) fightCh += 4;
      if (catHas(c, "Guardian")) fightCh -= 3;
      if (catHas(c, "Devoted") && c.bondedTo) breedCh += 10;
    });
    if (!oppSex) breedCh = 0;
    if (isParentChild || isSibling) breedCh = 0;
    const denSize = ctx.denSize || 2;
    if (oppSex) breedCh += Math.max(0, (denSize - 2) * 2);
    const nerveLvl = ctx.nerveLvl || 0;
    if (nerveLvl >= 4) {
      const nerveExcess = nerveLvl - 3;
      fightCh += nerveExcess * 2;
      breedCh -= nerveExcess * 2;
    }
    const sameBreedCount = ctx.sameBreedCount || 0;
    if (b1 === b2 && sameBreedCount > 2) {
      fightCh += (sameBreedCount - 2) * 4;
    }
    const springBoost = ctx.breedBoost || 0;
    const breedCap = springBoost > 0 ? 100 : 75;
    return { breedCh: clamp(breedCh, 0, breedCap), fightCh: clamp(fightCh, 0, 70) };
  }
  function resolveDen(denCats, hasMatchmaker, denSafe, heatDenFight, ctx = {}) {
    if (denCats.length < 2) return [];
    const results = [];
    const paired = /* @__PURE__ */ new Set();
    const deckSize = ctx.deckSize || 18;
    let deaths = 0;
    const cats = shuf([...denCats]);
    const breedOnly = ctx.breedOnly || false;
    const noBreed = ctx.noBreed || false;
    const MAX_COLONY = 25;
    const MAX_BIRTHS = 2 + (ctx.breedBoost >= 0.15 ? 1 : 0);
    const colonyTooLarge = (ctx.deckSize || 0) >= MAX_COLONY;
    const breedCensus = {};
    cats.forEach((c) => {
      breedCensus[c.breed] = (breedCensus[c.breed] || 0) + 1;
    });
    const minEvents = Math.max(1, Math.floor(cats.length / 2));
    const maxEvents = cats.length;
    const baseEvents = breedOnly ? Math.min(minEvents, MAX_BIRTHS) : Math.min(maxEvents, 2 + Math.floor(Math.random() * 2));
    let bonusEvents = 0;
    if (breedOnly) {
      for (let e = 0; e < Math.max(0, cats.length - 2); e++) {
        if (Math.random() < 0.15) bonusEvents++;
      }
    } else {
      for (let e = 0; e < Math.max(0, cats.length - 4); e++) {
        if (Math.random() < 0.1) bonusEvents++;
      }
    }
    const targetEvents = Math.min(maxEvents, Math.max(minEvents, baseEvents + bonusEvents));
    for (let i = 0; i < cats.length; i++) {
      if (paired.has(cats[i].id)) continue;
      if (results.length >= targetEvents) break;
      for (let j = i + 1; j < cats.length; j++) {
        if (paired.has(cats[j].id)) continue;
        const sameBreed = cats[i].breed === cats[j].breed ? breedCensus[cats[i].breed] || 0 : 0;
        const a = calcAffinity(cats[i], cats[j], { nerveLvl: ctx.nerveLvl || 0, sameBreedCount: sameBreed, denSize: cats.length, breedBoost: ctx.breedBoost || 0 });
        const denRisk = Math.max(0, Math.round((denCats.length - 2) * 0.32));
        a.fightCh = Math.min(70, a.fightCh + denRisk + (heatDenFight || 0));
        const moodMod = ctx.mood || 50;
        if (moodMod > 70) a.fightCh = Math.max(0, a.fightCh - 8);
        if (moodMod < 30) {
          a.fightCh = Math.max(0, a.fightCh - 5);
          a.reconcileCh = Math.min(100, (a.reconcileCh || 15) + 15);
        }
        let bCh = a.breedCh;
        if (hasMatchmaker) bCh = Math.min(100, bCh + 10);
        if (moodMod > 60) bCh = Math.min(100, bCh + 5);
        if (moodMod < 30) bCh = Math.min(100, bCh + 8);
        if (breedOnly) bCh = Math.min(100, bCh + 15);
        const birthsSoFar = results.filter((r) => r.type === "breed").length;
        const breedBlocked = colonyTooLarge || birthsSoFar >= MAX_BIRTHS;
        const roll = Math.random() * 100;
        if (!noBreed && !breedBlocked && roll < bCh) {
          const baby = breedC(cats[i], cats[j]);
          const twins = Math.random() < 0.08;
          results.push({ type: "breed", c1: cats[i], c2: cats[j], baby, twins });
          cats[i].bondedTo = cats[j].id;
          cats[j].bondedTo = cats[i].id;
          paired.add(cats[i].id);
          paired.add(cats[j].id);
          break;
        } else if (!breedOnly && !denSafe && (noBreed ? roll < a.fightCh : roll < bCh + a.fightCh)) {
          const severity = Math.random();
          const loser = Math.random() < 0.5 ? cats[i] : cats[j];
          addGrudge(cats[i], cats[j].id);
          addGrudge(cats[j], cats[i].id);
          const canDie = deckSize - deaths > 6;
          const hasPhoenix = catHas(loser, "Phoenix");
          if (loser.injured) {
            if (hasPhoenix) {
              loser.power = 1;
              loser.scarred = true;
              loser.injured = false;
              loser.injuryTimer = 0;
              loser.trait = TRAITS.find((t) => t.name === "Eternal");
              results.push({ type: "phoenix", c1: cats[i], c2: cats[j], risen: loser });
            } else if (canDie) {
              deaths++;
              results.push({ type: "death", c1: cats[i], c2: cats[j], victim: loser });
            } else {
              loser.power = Math.max(1, loser.power - 3);
              loser.scarred = true;
              results.push({ type: "fight", c1: cats[i], c2: cats[j], loser, dmg: 3, wasInjured: true });
            }
          } else if (severity < 0.05) {
            loser.power = Math.max(1, loser.power - 3);
            loser.scarred = true;
            loser.injured = true;
            loser.injuryTimer = 2;
            results.push({ type: "fight", c1: cats[i], c2: cats[j], loser, dmg: 3, wasInjured: true });
          } else if (severity < 0.4) {
            if (loser.scarred) {
              loser.injured = true;
              loser.injuryTimer = 2;
              loser.power = Math.max(1, loser.power - 3);
              results.push({ type: "fight", c1: cats[i], c2: cats[j], loser, dmg: 3, wasInjured: true });
            } else {
              loser.power = Math.max(1, loser.power - 2);
              loser.scarred = true;
              results.push({ type: "fight", c1: cats[i], c2: cats[j], loser, dmg: 2 });
            }
          } else {
            if (loser.scarred) {
              loser.injured = true;
              loser.injuryTimer = 2;
              loser.power = Math.max(1, loser.power - 2);
              results.push({ type: "fight", c1: cats[i], c2: cats[j], loser, dmg: 2, wasInjured: true });
            } else {
              loser.power = Math.max(1, loser.power - 1);
              loser.scarred = true;
              results.push({ type: "fight", c1: cats[i], c2: cats[j], loser, dmg: 1 });
            }
          }
          paired.add(cats[i].id);
          paired.add(cats[j].id);
          break;
        } else if (breedOnly) {
          if (hasGrudge(cats[i], cats[j]) && Math.random() < 0.35) {
            removeGrudge(cats[i], cats[j].id);
            removeGrudge(cats[j], cats[i].id);
            if (Math.random() < 0.3 && cats[i].sex !== cats[j].sex) {
              cats[i].bondedTo = cats[j].id;
              cats[j].bondedTo = cats[i].id;
              results.push({ type: "reconcile_bond", c1: cats[i], c2: cats[j] });
            } else {
              results.push({ type: "reconcile", c1: cats[i], c2: cats[j] });
            }
            paired.add(cats[i].id);
            paired.add(cats[j].id);
            break;
          }
          const parentChild = cats[i].parentIds?.includes(cats[j].id) ? [cats[j], cats[i]] : cats[j].parentIds?.includes(cats[i].id) ? [cats[i], cats[j]] : null;
          if (parentChild) {
            const [parent, child] = parentChild;
            const parentTraits = catAllTraits(parent).filter((t) => t.name !== "Plain");
            if (parentTraits.length > 0 && catIsPlain(child) && Math.random() < 0.35) {
              const learned = pk(parentTraits);
              if (addTrait(child, learned)) {
                results.push({ type: "teach", parent, child, trait: learned });
                paired.add(cats[i].id);
                paired.add(cats[j].id);
                break;
              }
            }
          }
          if (!cats[i].bondedTo && !cats[j].bondedTo && cats[i].sex !== cats[j].sex && Math.random() < 0.2) {
            cats[i].bondedTo = cats[j].id;
            cats[j].bondedTo = cats[i].id;
            results.push({ type: "bond", c1: cats[i], c2: cats[j] });
            paired.add(cats[i].id);
            paired.add(cats[j].id);
            break;
          }
        } else if (Math.random() < 0.18) {
          const ev = Math.random();
          const elder = cats[i].stats.tp >= 6 ? cats[i] : cats[j].stats.tp >= 6 ? cats[j] : null;
          const young = elder ? elder === cats[i] ? cats[j] : cats[i] : null;
          const rallyBoost = moodMod < 30 ? 0.1 : 0;
          if (elder && young && young.stats.tp <= 1 && ev < 0.2) {
            young.power = Math.min(15, young.power + 1);
            results.push({ type: "mentor", elder, young });
            if (elder.trait && elder.trait.name !== "Plain" && young.trait && young.trait.name === "Plain" && Math.random() < 0.15 && ctx.hasWon) {
              young.trait = { ...elder.trait };
              young._taughtBy = elder.name.split(" ")[0];
              results.push({ type: "traitTeach", elder, young, trait: elder.trait });
            }
          } else if (ev < 0.3) {
            results.push({ type: "found", cat: cats[i], gold: Math.random() < 0.3 ? 4 : 2 });
          } else if (ev < 0.5 + rallyBoost) {
            const g = Math.random() < 0.5 ? cats[i] : cats[j];
            g.power = Math.min(15, g.power + 1);
            results.push({ type: "growth", cat: g });
          } else if (ev < 0.65 + rallyBoost) {
            cats[i].power = Math.min(15, cats[i].power + 1);
            cats[j].power = Math.min(15, cats[j].power + 1);
            results.push({ type: "training", c1: cats[i], c2: cats[j] });
          } else if (ev < 0.78 - rallyBoost && !hasGrudge(cats[i], cats[j])) {
            addGrudge(cats[i], cats[j].id);
            addGrudge(cats[j], cats[i].id);
            results.push({ type: "grudge", c1: cats[i], c2: cats[j] });
          } else if (ev < 0.88 && hasGrudge(cats[i], cats[j])) {
            removeGrudge(cats[i], cats[j].id);
            removeGrudge(cats[j], cats[i].id);
            results.push({ type: "reconcile", c1: cats[i], c2: cats[j] });
          } else if (ev < 0.93) {
            const candidate = Math.random() < 0.5 ? cats[i] : cats[j];
            candidate.power = Math.min(15, candidate.power + 2);
            results.push({ type: "growth", cat: candidate });
          } else {
            const rjBreed = ctx.draftRejects && ctx.draftRejects.length > 0 && Math.random() < 0.6 ? pk(ctx.draftRejects) : null;
            const w = gC(rjBreed ? { breed: rjBreed, trait: PLAIN } : { trait: PLAIN });
            results.push({ type: "wanderer", cat: w });
          }
          paired.add(cats[i].id);
          paired.add(cats[j].id);
          break;
        }
      }
    }
    let safety = 0;
    while (results.length < targetEvents && safety++ < 10) {
      const avail = cats.filter((c) => !paired.has(c.id));
      const pool = avail.length >= 2 ? avail : cats;
      if (pool.length < 1) break;
      const ev = Math.random();
      if (pool.length >= 2 && ev < 0.25) {
        const [a, b] = [pk(pool), pk(pool.filter((c) => c.id !== pool[0]?.id) || pool)];
        if (a && b && a.id !== b.id) {
          a.power = Math.min(15, a.power + 1);
          b.power = Math.min(15, b.power + 1);
          results.push({ type: "training", c1: a, c2: b });
          paired.add(a.id);
          paired.add(b.id);
          continue;
        }
      }
      if (ev < 0.45) {
        const g = pk(pool);
        g.power = Math.min(15, g.power + 1);
        results.push({ type: "growth", cat: g });
      } else if (ev < 0.6) {
        results.push({ type: "found", cat: pk(pool), gold: Math.random() < 0.3 ? 4 : 2 });
      } else if (breedOnly && pool.length >= 2 && ev < 0.8) {
        const a = pk(pool), b = pk(pool.filter((c) => c.id !== a.id));
        if (a && b && a.sex !== b.sex && !a.bondedTo && !b.bondedTo) {
          a.bondedTo = b.id;
          b.bondedTo = a.id;
          results.push({ type: "bond", c1: a, c2: b });
        } else {
          const g = pk(pool);
          g.power = Math.min(15, g.power + 1);
          results.push({ type: "growth", cat: g });
        }
      } else {
        const g = pk(pool);
        g.power = Math.min(15, g.power + 1);
        results.push({ type: "growth", cat: g });
      }
    }
    if (results.length === 0 && cats.length >= 2 && breedOnly) {
      const mfPair = [];
      for (let i2 = 0; i2 < cats.length && mfPair.length < 2; i2++) {
        for (let j2 = i2 + 1; j2 < cats.length && mfPair.length < 2; j2++) {
          const oppS = cats[i2].sex !== cats[j2].sex;
          const isPC = cats[i2].parentIds?.includes(cats[j2].id) || cats[j2].parentIds?.includes(cats[i2].id);
          const isSib = cats[i2].parentIds && cats[j2].parentIds && cats[i2].parentIds.some((p) => cats[j2].parentIds.includes(p));
          if (oppS && !isPC && !isSib && !colonyTooLarge) { mfPair.push(cats[i2], cats[j2]); }
        }
      }
      if (mfPair.length === 2) {
        const baby = breedC(mfPair[0], mfPair[1]);
        const twins = Math.random() < 0.08;
        results.push({ type: "breed", c1: mfPair[0], c2: mfPair[1], baby, twins });
        mfPair[0].bondedTo = mfPair[1].id;
        mfPair[1].bondedTo = mfPair[0].id;
      } else {
      const ev = Math.random();
      if (ev < 0.25) {
        const g = pk(cats);
        g.power = Math.min(15, g.power + 1);
        results.push({ type: "growth", cat: g });
      } else if (ev < 0.45) {
        results.push({ type: "found", cat: pk(cats), gold: Math.random() < 0.3 ? 4 : 2 });
      } else if (ev < 0.65) {
        cats[0].power = Math.min(15, cats[0].power + 1);
        cats[1].power = Math.min(15, cats[1].power + 1);
        results.push({ type: "training", c1: cats[0], c2: cats[1] });
      } else {
        const c1 = cats[0], c2 = cats[1];
        if (c1.sex !== c2.sex && !c1.bondedTo) {
          c1.bondedTo = c2.id;
          c2.bondedTo = c1.id;
          results.push({ type: "bond", c1, c2 });
        } else {
          const g = pk(cats);
          g.power = Math.min(15, g.power + 1);
          results.push({ type: "growth", cat: g });
        }
        }
      }
    }
    return results;
  }
  function getCatBreeds(cat2) {
    if (catHas(cat2, "Wild") || catHas(cat2, "Chimera")) return [...BK];
    return [cat2.breed];
  }
  function narrativeReason(c, cats, mechanicalReasons) {
    const n = c.name.split(" ")[0];
    const tp = c.stats?.tp || 0;
    if (c.bondedTo) {
      const mate = cats.find((x) => x.id === c.bondedTo);
      if (mate) return `${n} and ${mate.name.split(" ")[0]}. Together since they chose each other.`;
    }
    if (c.epithetKey === "mourning") return `${n} carries two names now. That weight becomes strength.`;
    if (c.epithetKey === "spared") return `${n} was almost sent away. They score like they know.`;
    if (c.scarred && catHas(c, "Scrapper")) return `${n} scores harder since the scar. The colony knows it.`;
    if (c.scarred && catHas(c, "Guardian")) return `${n} protects the wounded. Takes one to know one.`;
    if (catHas(c, "Alpha") && c.power >= Math.max(...cats.map((x) => x.power))) return `${n} leads from the front. The highest power in the hand.`;
    if (catHas(c, "Echo")) return `${n} scores twice. The echo always comes back.`;
    if (catHas(c, "Cursed") && !cats.some((x) => x.id !== c.id && x.breed === c.breed)) return `${n} alone. The curse becomes a gift when nobody else is watching.`;
    if (catHas(c, "Feral")) return `${n} feeds on the crowd. ${cats.length} cats, ${cats.length * 2} mult.`;
    if (catHas(c, "Nocturnal")) return `${n} grows stronger as the nerve climbs. Desperation is fuel.`;
    if (catHas(c, "Chimera")) return `${n} belongs to every season. The colony can't agree on what ${n} is. That's the point.`;
    if (c._bornNight) return `Born Night ${c._bornNight}. ${n} has something to prove.`;
    if (tp >= 12) return `${n} has played ${tp} hands. The colony depends on them.`;
    if (tp === 0) return `${n}'s first hand. Everything starts here.`;
    if (c.trait?.tier === "mythic") return `${n}. ${c.trait.name}. The colony holds its breath.`;
    if (c.trait?.tier === "legendary") return `${n}. ${c.trait.name}. Rare enough to change everything.`;
    if (isElder(c)) return `${n} has seen more than most. The colony watches for their lead.`;
    return mechanicalReasons.join(" \xB7 ");
  }
  function evalH(cats) {
    if (!cats.length) return { type: HT[0], idx: 0, combo: null };
    const bc = {};
    cats.forEach((c) => {
      getCatBreeds(c).forEach((b) => {
        bc[b] = (bc[b] || 0) + 1;
      });
    });
    const mBC = Math.max(0, ...Object.values(bc)), pairs = Object.values(bc).filter((c) => c >= 2).length;
    const bcVals = Object.values(bc).sort((a, b) => b - a);
    const tc = {};
    cats.forEach((c) => {
      catAllTraits(c).forEach((t) => {
        tc[t.name] = (tc[t.name] || 0) + 1;
      });
    });
    const mTC = Math.max(0, ...Object.values(tc));
    const pows = [...new Set(cats.map((c) => c.power))].sort((a, b) => a - b);
    let maxSeq = 1, curSeq = 1, seqStart = 0, bestSeqStart = 0, bestSeqLen = 1;
    for (let i = 1; i < pows.length; i++) {
      if (pows[i] === pows[i - 1] + 1) {
        curSeq++;
        if (curSeq > maxSeq) {
          maxSeq = curSeq;
          bestSeqStart = seqStart;
          bestSeqLen = curSeq;
        }
      } else {
        curSeq = 1;
        seqStart = i;
      }
    }
    const pc = {};
    cats.forEach((c, ci) => {
      if (!pc[c.power]) pc[c.power] = { n: 0, idxs: [] };
      pc[c.power].n++;
      pc[c.power].idxs.push(ci);
    });
    const mPC = Math.max(0, ...Object.values(pc).map((v) => v.n));
    const getSeqIdxs = (len) => {
      const sp = pows.slice(bestSeqStart, bestSeqStart + len);
      return sp.flatMap((p) => pc[p] ? [pc[p].idxs[0]] : []);
    };
    const getSameIdxs = (n) => {
      const best = Object.values(pc).sort((a, b) => b.n - a.n)[0];
      return best ? best.idxs.slice(0, n) : [];
    };
    const getFullHouseIdxs = () => {
      const s = Object.values(pc).sort((a, b) => b.n - a.n);
      return s.length >= 2 && s[0].n >= 3 && s[1].n >= 2 ? [...s[0].idxs.slice(0, 3), ...s[1].idxs.slice(0, 2)] : [];
    };
    const getTwoPairIdxs = () => {
      const ps = Object.values(pc).filter((v) => v.n >= 2).sort((a, b) => b.n - a.n);
      return ps.length >= 2 ? [...ps[0].idxs.slice(0, 2), ...ps[1].idxs.slice(0, 2)] : [];
    };
    let combo = null, comboIdxs = [];
    const pcVals = Object.values(pc).map((v) => v.n).sort((a, b) => b - a);
    const pairCount = pcVals.filter((v) => v >= 2).length;
    const hasFullHouse = pcVals[0] >= 3 && pcVals.length >= 2 && pcVals[1] >= 2;
    for (let i = POWER_COMBOS.length - 1; i >= 0; i--) {
      const p = POWER_COMBOS[i];
      if (p.name === "Quintuplets" && mPC >= 5) {
        combo = p;
        comboIdxs = getSameIdxs(5);
        break;
      }
      if (p.name === "Nine Lives" && maxSeq >= 5) {
        combo = p;
        comboIdxs = getSeqIdxs(5);
        break;
      }
      if (p.name === "Mirrors" && mPC >= 4) {
        combo = p;
        comboIdxs = getSameIdxs(4);
        break;
      }
      if (p.name === "Stalk" && maxSeq >= 4) {
        combo = p;
        comboIdxs = getSeqIdxs(4);
        break;
      }
      if (p.name === "Full House" && hasFullHouse) {
        combo = p;
        comboIdxs = getFullHouseIdxs();
        break;
      }
      if (p.name === "Triplets" && mPC >= 3) {
        combo = p;
        comboIdxs = getSameIdxs(3);
        break;
      }
      if (p.name === "Prowl" && maxSeq >= 3) {
        combo = p;
        comboIdxs = getSeqIdxs(3);
        break;
      }
      if (p.name === "Two Pair" && pairCount >= 2) {
        combo = p;
        comboIdxs = getTwoPairIdxs();
        break;
      }
      if (p.name === "Twins" && mPC >= 2) {
        combo = p;
        comboIdxs = getSameIdxs(2);
        break;
      }
    }
    let primary, idx, handIdxs = [];
    const breedIdxs = (breed, n) => cats.map((c, i) => getCatBreeds(c).includes(breed) ? i : -1).filter((i) => i >= 0).slice(0, n);
    const bestBreed = Object.entries(bc).sort(([, a], [, b]) => b - a)[0]?.[0];
    const secondBreed = Object.entries(bc).sort(([, a], [, b]) => b - a)[1]?.[0];
    if (cats.length >= 5 && mBC >= 5) {
      primary = HT[7];
      idx = 7;
      handIdxs = breedIdxs(bestBreed, 5);
    } else if (mBC >= 4) {
      primary = HT[6];
      idx = 6;
      handIdxs = breedIdxs(bestBreed, 4);
    } else if (bcVals[0] >= 3 && bcVals.length >= 2 && bcVals[1] >= 2) {
      primary = HT[5];
      idx = 5;
      handIdxs = [...breedIdxs(bestBreed, 3), ...breedIdxs(secondBreed, 2)];
    } else if (mTC >= 3 && cats.length >= 3) {
      primary = HT[4];
      idx = 4;
      const sharedTrait = Object.entries(tc).find(([, v]) => v >= 3)?.[0];
      handIdxs = sharedTrait ? cats.map((c, i) => catAllTraits(c).some((t) => t.name === sharedTrait) ? i : -1).filter((i) => i >= 0) : cats.map((_, i) => i);
    } else if (mBC >= 3) {
      primary = HT[3];
      idx = 3;
      handIdxs = breedIdxs(bestBreed, 3);
    } else if (pairs >= 2) {
      primary = HT[2];
      idx = 2;
      const pairedBreeds = Object.entries(bc).filter(([, v]) => v >= 2).map(([b]) => b).slice(0, 2);
      handIdxs = [...breedIdxs(pairedBreeds[0], 2), ...pairedBreeds[1] ? breedIdxs(pairedBreeds[1], 2) : []];
    } else if (mBC >= 2) {
      primary = HT[1];
      idx = 1;
      handIdxs = breedIdxs(bestBreed, 2);
    } else if (combo) {
      primary = { name: combo.name, base: combo.standalone, ex: combo.ex, hidden: true };
      idx = -1;
      return { type: primary, idx, combo: null, comboIdxs: [], handIdxs: comboIdxs };
    } else {
      primary = HT[0];
      idx = 0;
      handIdxs = [0];
    }
    return { type: primary, idx, combo, comboIdxs, handIdxs };
  }
  function calcScore(cats, fams, fLvl, cfx = {}, ctx = {}) {
    const { type, combo, comboIdxs, handIdxs } = evalH(cats);
    const htLv = getHtLevel(type.name, ctx.htLevels || {});
    const scaledBase = getHtScaled(type, htLv);
    let chips = scaledBase.c, mult = scaledBase.m;
    if (type.name === "Kindred" && ctx.kindredMult) mult += ctx.kindredMult;
    const lvLabel = htLv > 1 ? ` Lv${htLv}` : "";
    const bd = [{ label: type.name + lvLabel, chips: scaledBase.c, mult: scaledBase.m + (type.name === "Kindred" && ctx.kindredMult ? ctx.kindredMult : 0), type: "hand", catIdxs: handIdxs }];
    let resonance = false;
    if (combo) {
      const comboCats = comboIdxs.map((i) => cats[i]).filter(Boolean);
      if (comboCats.length >= 2) {
        const seasons = comboCats.map((c) => c.breed);
        resonance = seasons.every((s) => s === seasons[0]);
      }
      const comboBoostUp = ctx.comboBoost || 0;
      const resMult = (resonance ? 1.5 : 1) * (1 + comboBoostUp);
      const bc = Math.round(combo.bonus.c * resMult);
      const bm = Math.round(combo.bonus.m * resMult);
      chips += bc;
      mult += bm;
      bd.push({ label: `\u26A1 ${combo.name}${resonance ? " \u2726" : ""}`, chips: bc, mult: bm, type: "combo", catIdxs: comboIdxs });
      if (resonance) bd.push({ label: "\u2726 Resonance: season match bonus", chips: 0, mult: 0, type: "resonance" });
    }
    const btFxAll = ctx.bossTraitFx || [];
    if (btFxAll.length > 0) {
      btFxAll.forEach((bt) => {
        if (bt.fx.frozen) bd.push({ label: `\u{1F9CA} Frozen: first 2 cats score at half power`, chips: 0, mult: 0, type: "boss_trait" });
        if (bt.fx.enragedMult) bd.push({ label: `\u{1F525} Enraged: all cats +${bt.fx.enragedMult}M`, chips: 0, mult: 0, type: "boss_trait" });
      });
    }
    const { gold: pGold = 0, deckSize = 18, discSize = 0 } = ctx;
    const devFx = getAllDevotionFx(ctx.devotion || {});
    if (devFx.chipScale > 0) {
      const bonus = Math.round(scaledBase.c * devFx.chipScale);
      chips += bonus;
      bd.push({ label: `\u2600\uFE0F Wildfire +${bonus}C`, chips: bonus, mult: 0, type: "devotion" });
    }
    if (devFx.powerBoost) {
      let pbTotal = 0;
      cats.forEach((c) => {
        const pb = devFx.powerBoost[c.breed] || 0;
        if (pb > 0) { chips += pb * 5; pbTotal += pb * 5; }
      });
      if (pbTotal > 0) bd.push({ label: `\u{1F451} Devotion Power +${pbTotal}C`, chips: pbTotal, mult: 0, type: "devotion" });
    }
    const powers = cats.map((c) => c.power);
    const maxP = Math.max(...powers);
    const minP = Math.min(...powers);
    const uniqueBreeds = new Set(cats.flatMap((c) => getCatBreeds(c))).size;
    const toS = [];
    cats.forEach((c, ci) => {
      c._ci = ci;
      toS.push(c);
      if (!cfx.noTraits) {
        if (catHas(c, "Echo")) toS.push({ ...c, _re: true, _halfPow: true, _ci: ci });
        if (catHas(c, "Eternal")) toS.push({ ...c, _re: true, _ci: ci });
      }
    });
    const btFx = ctx.bossTraitFx || [];
    const hasFrozen = btFx.some((bt) => bt.fx.frozen);
    const enragedBT = btFx.find((bt) => bt.fx.enragedMult);
    toS.forEach((c, si) => {
      const isKit = catIsKitten(c) && !c._re;
      const exiled = cfx.exileBreed && c.breed === cfx.exileBreed;
      let basePow = isKit ? 1 : c._halfPow ? Math.max(2, Math.floor(c.power / 2)) : c.injured && !c._re ? Math.floor(c.power / 2) : c.power;
      if (!isKit && hasFrozen && !c._re && c._ci < 2) basePow = Math.max(2, Math.floor(basePow / 2));
      let cc = exiled ? 0 : basePow, cm = 0, cx = 1;
      if (!isKit && enragedBT && !c._re) cm += enragedBT.fx.enragedMult;
      const icons = [];
      if (isKit) icons.push("\u{1F43E}");
      if (!cfx.noTraits && !isKit) {
        if (catHas(c, "Devoted") && !c._re) {
          if (c.bondedTo && cats.find((x) => x.id === c.bondedTo)) {
            cm += 5;
            icons.push("\u{1FAC0}");
          }
        }
        if (catHas(c, "Stubborn") && !c._re) {
          const bonus = ctx.lastHandLost ? 6 : 3;
          cm += bonus;
          icons.push("\u{1FAA8}");
        }
        if (catHas(c, "Stray") && !c._re) {
          const seasons = new Set(cats.flatMap((x) => getCatBreeds(x)));
          const v = seasons.size * 3;
          cm += v;
          icons.push("\u{1F408}");
        }
        if (catHas(c, "Loyal") && !c._re) {
          const lh = ctx.lastHandIds || [];
          const bonus = lh.length > 0 && cats.every((x) => lh.includes(x.id)) ? 4 : 2;
          cm += bonus;
          icons.push("\u{1FAC2}");
        }
        if (catHas(c, "Scavenger") && !c._re) {
          const v = Math.min(5, Math.floor(pGold));
          cm += v;
          icons.push("\u{1F33E}");
        }
        if (catHas(c, "Scrapper")) {
          const v = c.scarred && !c._re ? 5 : 3;
          cm += v;
          icons.push("\u{1F94A}");
        }
        if (catHas(c, "Cursed")) {
          const myBreeds = getCatBreeds(c);
          const alone = !cats.some((x) => x.id !== c.id && getCatBreeds(x).some((b) => myBreeds.includes(b)));
          const v = alone ? 8 : -3;
          cm += v;
          icons.push("\u{1F480}");
        }
        if (catHas(c, "Guardian") && !c._re) {
          const hurt = cats.filter((x) => x.id !== c.id && (x.scarred || x.injured)).length;
          if (hurt > 0) {
            cm += hurt * 2;
            icons.push("\u{1F6E1}\uFE0F");
          }
        }
        if (catHas(c, "Feral") && !c._re) {
          cm += cats.length * 2;
          icons.push("\u{1F43E}");
        }
        if (catHas(c, "Seer") && !c._re) {
          const predicted = ctx.lastHandType && type.name === ctx.lastHandType;
          cm += predicted ? 8 : 4;
          icons.push("\u{1F441}\uFE0F");
        }
        if (catHas(c, "Echo")) {
        }
        if (catHas(c, "Chimera") && !c._re) {
          if (cats.length >= 3) {
            cx *= 1.5;
            icons.push("\u{1F9EC}");
          }
        }
        if (catHas(c, "Alpha") && !c._re) {
          if (c.power >= Math.max(...powers)) {
            cx *= 1.3;
            icons.push("\u{1F43A}");
          }
        }
        if (catHas(c, "Nocturnal") && !c._re) {
          const nerveMult = fLvl * 2;
          if (nerveMult > 0) {
            cm += nerveMult;
            icons.push("\u{1F319}");
          }
        }
        if (catHas(c, "Eternal")) {
          cx *= 3;
          icons.push("\u2728");
        }
        if (catHas(c, "Phoenix")) {
          const v = c.scarred ? 4 : 2.5;
          cx *= v;
          icons.push("\u{1F525}");
        }
      }
      if (c.injured && !c._re) {
        cm -= 2;
        icons.push("\u{1FA79}");
      } else if (c.scarred && !c._re) {
        cx *= devFx.scarMult || 1.25;
        const sm = ctx.scarMult || 0;
        if (sm) cm += sm;
        icons.push("\u2694\uFE0F");
      }
      if (c.epithetKey && !c._re) {
        const epDef = Object.values(EPITHETS).find((e) => e.key === c.epithetKey);
        if (epDef?.bonus) {
          const eb = epDef.bonus;
          if (eb.mult) {
            cm += eb.mult;
            icons.push("\u{1F3F7}\uFE0F");
          }
          if (eb.bondMult && c.bondedTo && cats.find((x) => x.id === c.bondedTo)) {
            cm += 2;
          }
          if (eb.clutchMult && !ctx.beatingPace) {
            cm += eb.clutchMult;
            icons.push("\u{1F3F7}\uFE0F");
          }
          if (eb.soloMult) {
            const myBreeds = getCatBreeds(c);
            const alone = !cats.some((x) => x.id !== c.id && getCatBreeds(x).some((b) => myBreeds.includes(b)));
            if (alone) {
              cm += eb.soloMult;
              icons.push("\u{1F3F7}\uFE0F");
            }
          }
          if (eb.thunderMult) {
            cm += eb.thunderMult;
            icons.push("\u{1F3F7}\uFE0F");
          }
          if (eb.parentMult) {
            const kidCount = cats.filter((x) => x.parentIds?.includes(c.id)).length;
            if (kidCount > 0) {
              cm += kidCount;
              icons.push("\u{1F3F7}\uFE0F");
            }
          }
        }
      }
      if (!c._re) {
        const breed = c.breed;
        if (devFx.multPerCat[breed]) {
          cm += devFx.multPerCat[breed];
          icons.push(BREEDS[breed]?.icon || "");
        }
        if (devFx.chipsPerCat[breed]) {
          cc += devFx.chipsPerCat[breed];
          icons.push(BREEDS[breed]?.icon || "");
        }
        if (ctx.weatherSeason && getCatBreeds(c).includes(ctx.weatherSeason)) {
          cc += 2;
          icons.push("\u{1F324}");
        }
        const nmfx = ctx.nightModFx || {};
        if (nmfx.seasonChipsBonus && ctx.weatherSeason && getCatBreeds(c).includes(ctx.weatherSeason)) {
          cc += nmfx.seasonChipsBonus;
          icons.push("\u2728");
        }
        if (nmfx.bloodMoonMult && c.scarred && !c.injured) {
          cx *= nmfx.bloodMoonMult;
          icons.push("\u{1FA78}");
        }
      }
      chips += cc;
      mult += cm;
      if (cx !== 1) mult = Math.round(mult * cx);
      const iconStr = icons.filter(Boolean).join("");
      const hasRareTrait = cx >= 1.5;
      const hasScar = c.scarred && !c.injured && !c._re;
      const hasTrait = icons.length > 0;
      const catType = hasRareTrait ? "trait_rare" : hasScar && hasTrait ? "scar" : hasTrait ? "trait" : "cat";
      const reasons = [];
      if (cc > 0) reasons.push("P" + basePow);
      if (!cfx.noTraits) {
        if (catHas(c, "Scrapper")) reasons.push("Scrapper" + (c.scarred ? " (scarred!)" : ""));
        if (catHas(c, "Devoted") && c.bondedTo && cats.find((x) => x.id === c.bondedTo)) reasons.push("Devoted to mate");
        if (catHas(c, "Alpha") && c.power >= Math.max(...powers)) reasons.push("Alpha (highest P)");
        if (catHas(c, "Nocturnal") && fLvl > 0) reasons.push("Nocturnal (Nerve " + fLvl + ")");
        if (catHas(c, "Chimera") && cats.length >= 3) reasons.push("Chimera \xD71.5");
        if (catHas(c, "Eternal")) reasons.push("Eternal \xD73");
        if (catHas(c, "Phoenix")) reasons.push("Phoenix \xD7" + (c.scarred ? "4" : "2.5"));
        if (catHas(c, "Echo") && c._re) reasons.push("Echo (replay)");
        if (catHas(c, "Guardian") && cats.filter((x) => x.id !== c.id && (x.scarred || x.injured)).length > 0) reasons.push("Guardian (protecting " + cats.filter((x) => x.id !== c.id && (x.scarred || x.injured)).length + ")");
        if (catHas(c, "Feral")) reasons.push("Feral (" + cats.length + " cats \xD7 2M)");
        if (catHas(c, "Seer")) {
          const pr = ctx.lastHandType && type.name === ctx.lastHandType;
          reasons.push(pr ? "Seer (predicted! +8M)" : "Seer (+4M)");
        }
        if (catHas(c, "Cursed")) {
          const myB = getCatBreeds(c);
          const al = !cats.some((x) => x.id !== c.id && getCatBreeds(x).some((b) => myB.includes(b)));
          reasons.push(al ? "Cursed (lone \u2192 +8M)" : "Cursed (\u22123M)");
        }
        if (catHas(c, "Fragile")) reasons.push("Fragile (+2M/ally)");
      }
      if (c.scarred && !c.injured && !c._re) reasons.push("Scarred \xD71.25");
      if (c.injured && !c._re) reasons.push("Injured (halved)");
      if (c.epithetKey && !c._re) {
        const epDef = Object.values(EPITHETS).find((e) => e.key === c.epithetKey);
        if (epDef?.bonus) {
          if (c.epithetKey === "mourning") {
            const soloMourning = cats.length === 1;
            const mournMult = soloMourning ? 5 : 1;
            cm += mournMult;
            reasons.push(soloMourning ? `"${c.epithet}" alone in grief +5M` : `"${c.epithet}" pushing through +1M`);
          } else if (epDef.bonus.mult) reasons.push(`"${c.epithet}" +${epDef.bonus.mult}M`);
          if (epDef.bonus.clutchMult && !ctx.beatingPace) reasons.push(`"${c.epithet}" clutch +${epDef.bonus.clutchMult}M`);
          if (epDef.bonus.soloMult) {
            const myB = getCatBreeds(c);
            const al = !cats.some((x) => x.id !== c.id && getCatBreeds(x).some((b) => myB.includes(b)));
            if (al) reasons.push(`"${c.epithet}" solo +${epDef.bonus.soloMult}M`);
          }
          if (epDef.bonus.bondMult && c.bondedTo && cats.find((x) => x.id === c.bondedTo)) reasons.push(`"${c.epithet}" bond +2M`);
        }
      }
      bd.push({
        label: `${iconStr}${iconStr ? " " : ""}${c._re ? "\u21BB " : ""}${c.name.split(" ")[0]}${c.epithet ? " " + c.epithet : ""}${c.trait && c.trait.name !== "Plain" && !c._re ? " (" + c.trait.name + ")" : ""}`,
        // v0.7: 15% chance narrative reason replaces mechanical reason
        reason: reasons.length > 0 ? Math.random() < 0.15 ? narrativeReason(c, cats, reasons) : reasons.join(" \xB7 ") : "",
        chips: cc,
        mult: cm,
        xMult: cx !== 1 ? cx : null,
        type: catType,
        catIdx: c._ci,
        isBigCat: Math.abs(cm) >= 3 || cx > 1 || cc >= 8
      });
    });
    const grudges = getGrudges(cats);
    const grudgePenalty = (ctx.grudgeWisdom || 0) > 0 ? -1 : -2;
    let hasGrudgeProve = false;
    if (!cfx.noTraits && grudges.length > 0) {
      grudges.forEach(([a, b]) => {
        mult = Math.max(1, mult + grudgePenalty);
        bd.push({ label: `\u26A1 ${a.name.split(" ")[0]}+${b.name.split(" ")[0]} Tension`, chips: 0, mult: grudgePenalty, type: "grudge_tension", catIdxs: [cats.indexOf(a), cats.indexOf(b)] });
      });
    }
    {
      const bondedPairs = [];
      cats.forEach((c) => {
        if (c.bondedTo) {
          const mate = cats.find((x) => x.id === c.bondedTo);
          if (mate && !bondedPairs.find((p) => p[0] === mate.id)) bondedPairs.push([c.id, mate.id]);
        }
      });
      bondedPairs.forEach(([a, b], pi) => {
        const ca = cats.find((c) => c.id === a), cb = cats.find((c) => c.id === b);
        const bondBoostActive = ctx.bondBoost || 0;
        const baseBond = devFx.bondScale || 1.5;
        const bpXM = pi === 0 ? baseBond + (bondBoostActive ? 0.25 : 0) : 1.25 + (bondBoostActive ? 0.15 : 0);
        mult = Math.round(mult * bpXM);
        bd.push({ label: `\u{1F495} ${ca.name.split(" ")[0]}+${cb.name.split(" ")[0]} Bonded`, chips: 0, mult: 0, xMult: bpXM, type: "bond", catIdxs: [cats.indexOf(ca), cats.indexOf(cb)] });
        const allHand = cats;
        [ca, cb].forEach((bonded) => {
          const mate = bonded === ca ? cb : ca;
          const mateGrudges = mate.grudgedWith || [];
          const triangleCat = allHand.find((c) => c.id !== bonded.id && c.id !== mate.id && mateGrudges.includes(c.id));
          if (triangleCat) {
            bd.push({ label: `\u26A1 ${bonded.name.split(" ")[0]} plays beside ${triangleCat.name.split(" ")[0]}. ${mate.name.split(" ")[0]} watches.`, chips: 0, mult: 0, type: "triangle" });
          }
        });
      });
    }
    let bG = 0;
    if (!cfx.silence) {
      const benchSize = (ctx.bench || []).length;
      fams.forEach((f) => {
        const fx = f.eff(cats, { benchSize });
        const fc = fx.chips || 0, fm = fx.mult || 0, fxm = fx.xMult || 1;
        if (fx.gold) bG += fx.gold;
        chips += fc;
        mult += fm;
        if (fxm > 1) mult = Math.round(mult * fxm);
        if (fc || fm || fxm > 1) bd.push({ label: `${f.icon} ${f.name}`, chips: fc, mult: fm, xMult: fxm > 1 ? fxm : null, type: "fam" });
      });
    } else if (fams.length) bd.push({ label: "\u{1F910} Silenced", chips: 0, mult: 0, type: "curse" });
    const bench = ctx.bench || [];
    const benchMultiplier = (ctx.doubleBench || 0) > 0 ? 1.5 : 1;
    if (bench.length > 0) {
      let bc = 0, bm = 0;
      bench.forEach((c) => {
        if (catIsKitten(c)) return;
        if (catHas(c, "Seer")) {
          bm += 3 * benchMultiplier;
        } else if (catHas(c, "Guardian")) {
          bm += Math.min(4, cats.filter((x) => x.scarred || x.injured).length * 2) * benchMultiplier;
        } else if (catHas(c, "Devoted") && c.bondedTo && cats.find((x) => x.id === c.bondedTo)) {
          bm += 3 * benchMultiplier;
        } else if (catHas(c, "Scavenger")) {
          bG += 1 * benchMultiplier;
        } else if (catHas(c, "Nocturnal")) {
          bm += Math.floor(fLvl / 2) * benchMultiplier;
        } else if (catHas(c, "Feral")) {
          bm += cats.length * benchMultiplier;
        } else if (catHas(c, "Seer")) {
          bm += 3 * benchMultiplier;
        } else {
          bc += c.power * benchMultiplier;
        }
      });
      if (bc > 0) {
        chips += bc;
        bd.push({ label: `\u{1FA91} Reserves +${bc}C`, chips: bc, mult: 0, type: "bench" });
      }
      if (bm > 0) {
        mult += bm;
        bd.push({ label: `\u{1FA91} Reserves +${bm}M`, chips: 0, mult: bm, type: "bench" });
      }
    }
    if (!cfx.silence) {
      const htName = type.name;
      fams.forEach((f) => {
        if (f.htBonus && f.htBonus[htName]) {
          const hb = f.htBonus[htName];
          if (hb.xMult) {
            mult = Math.round(mult * hb.xMult);
            bd.push({ label: `${f.icon} ${f.name}: ${htName} \xD7${hb.xMult}`, chips: 0, mult: 0, xMult: hb.xMult, type: "fam" });
          }
          if (hb.mult) {
            mult += hb.mult;
            bd.push({ label: `${f.icon} ${f.name}: ${htName} +${hb.mult}M`, chips: 0, mult: hb.mult, type: "fam" });
          }
        }
      });
    }
    const focusScale = [0, 1.5, 1.3, 1.2, 1.1];
    if (cats.length >= 1 && cats.length <= 4) {
      const fm = focusScale[cats.length];
      mult = Math.round(mult * fm);
      bd.push({ label: `\u{1F3AF} Focus \xD7${fm}`, chips: 0, mult: 0, xMult: fm, type: "focus", allCats: true });
    }
    const fv = NERVE[fLvl];
    if (fv.xM > 1) {
      mult = Math.round(mult * fv.xM);
      bd.push({ label: `\u{1F525} ${fv.name}`, chips: 0, mult: 0, xMult: fv.xM, type: "nerve", allCats: true });
    }
    const nmfx2 = ctx.nightModFx || {};
    if (nmfx2.loneWolfMult && cats.length <= 2) {
      mult = Math.round(mult * nmfx2.loneWolfMult);
      bd.push({ label: "\u{1F43A} Lone Wolf", chips: 0, mult: 0, xMult: nmfx2.loneWolfMult, type: "night_mod", allCats: true });
    }
    if (nmfx2.fullMoonMult && cats.length >= 4) {
      const fm = nmfx2.fullMoonMult * cats.length;
      mult += fm;
      bd.push({ label: `\u{1F315} Full Moon (+${fm}M)`, chips: 0, mult: fm, type: "night_mod", allCats: true });
    }
    if (nmfx2.bondHandMult) {
      const bondPairs = cats.filter((c) => c.bondedTo && cats.find((x) => x.id === c.bondedTo)).length / 2;
      if (bondPairs > 0) {
        const bm = Math.round(nmfx2.bondHandMult * bondPairs);
        mult += bm;
        bd.push({ label: `\u{1F495} Kindred Spirits (+${bm}M)`, chips: 0, mult: bm, type: "night_mod", allCats: true });
      }
    }
    const negTypes = /* @__PURE__ */ new Set(["grudge_tension", "curse", "boss_trait"]);
    const bdHand = bd.filter((s) => s.type === "hand" || s.type === "combo");
    const bdNeg = bd.filter((s) => negTypes.has(s.type) || s.mult < 0 && s.type !== "hand" && s.type !== "combo");
    const bdPos = bd.filter((s) => !negTypes.has(s.type) && !(s.mult < 0 && s.type !== "hand" && s.type !== "combo") && s.type !== "hand" && s.type !== "combo");
    const bdSorted = [...bdHand, ...bdNeg, ...bdPos];
    return { chips: Math.max(0, chips), mult: Math.max(1, mult), total: Math.max(0, chips) * Math.max(1, mult), bd: bdSorted, bG, ht: type.name, combo: combo?.name || null, hasGrudgeProve };
  }
  function narrativeLabel(step, allCats) {
    if (Math.random() > 0.15) return null;
    const cn = step.catName || "";
    if (step.type === "bond" && cn) return `\u{1F495} ${step.label.split(" ")[0]}. Together since they chose each other.`;
    if (step.type === "grudge_tension" && cn) return `\u26A1 The grudge burns. Scoring through clenched teeth.`;
    if (step.isBigCat && cn) {
      const cat2 = allCats?.find((c) => c.name.split(" ")[0] === cn);
      if (cat2?.scarred) return `\u{1F94A} ${cn} scores harder since the scar.`;
      if (cat2?.bondedTo) {
        const mate = allCats.find((c) => c.id === cat2.bondedTo);
        if (mate) return `${cn} plays like ${mate.name.split(" ")[0]} is watching.`;
      }
      if ((cat2?.stats?.tp || 0) > 10) return `${cn}. ${cat2.stats.tp} hands deep. This is who they are.`;
    }
    if (step.type === "nerve") return `The colony pushes back. The dark feels it.`;
    return null;
  }
  function getUnlocks(meta) {
    if (!meta) return { fams: false, all: false };
    const r = meta.stats.r || 0, w = meta.stats.w || 0, ba = meta.stats.ba || 0;
    return {
      fams: w >= 1,
      // Wards: won at least one run
      all: w >= 2
      // Full arsenal
    };
  }
  function getTarget(a, b, firstRun, isLong) {
    const scale = isLong ? 1.45 : 1.65;
    const base = (firstRun ? [1400, 2800, 4200] : [2e3, 4e3, 8500])[b] * Math.pow(scale, a - 1);
    const bossDiscount = b === 2 ? a === 1 ? 0.9 : a === 2 && firstRun ? 0.9 : 1 : 1;
    return Math.round(base * bossDiscount);
  }
  function getHeatMult(h) {
    return 1 + (h || 0) * 0.15;
  }
  function getHeatFx(h) {
    return {
      targets: 1 + (h || 0) * 0.15,
      // H1:+15%, H3:+45%, H5:+75%
      extraCurse: h >= 1 ? 1 : 0,
      // H1+: Bosses get +1 curse
      discMod: h >= 2 ? -1 : 0,
      // H2+: -1 starting discard
      shopCost: h >= 3 ? 1 : 0,
      // H3+: Everything costs +1 more
      denFight: h >= 3 ? 8 : 0,
      // H3+: +8% den fight chance
      handMod: h >= 4 ? -1 : 0,
      // H4+: -1 starting hand
      hexStart: h >= 5,
      // H5: Start with a Hexed cat
      dustMult: 1 + (h || 0) * 0.25
      // +25% stardust per level (reward)
    };
  }
  function genCurses(ante, extraCurses = 0) {
    const p1 = CURSES.filter((c) => c.tier === 1), p2 = CURSES.filter((c) => c.tier <= 2), p3 = CURSES.filter((c) => c.tier <= 3);
    const pickN = (p, n) => {
      const s = [...p], r = [];
      for (let i = 0; i < n && s.length; i++) {
        const j = Math.floor(Math.random() * s.length);
        r.push(s.splice(j, 1)[0]);
      }
      return r;
    };
    const base = ante <= 1 ? pickN(p1, 1) : ante === 2 ? pickN(p2, 1) : ante === 3 ? pickN(p2, 2) : ante === 4 ? pickN(p3, 2) : pickN(p3, 3);
    const extra = pickN(p3.filter((x) => !base.find((b) => b.id === x.id)), extraCurses);
    return [...base, ...extra];
  }
  function buildCfx(curses) {
    const fx = { hsMod: 0, silence: false, fog: false, exileBreed: null, noDisc: false, tgtMult: 1, famine: false };
    curses.forEach((c) => {
      const e = c.fx;
      if (e.hsMod) fx.hsMod += e.hsMod;
      if (e.silence) fx.silence = true;
      if (e.fog) fx.fog = true;
      if (e.exile) fx.exileBreed = fx.exileBreed || pk(BK);
      if (e.noDisc) fx.noDisc = true;
      if (e.tgtMult) fx.tgtMult *= e.tgtMult;
      if (e.famine) fx.famine = true;
    });
    return fx;
  }
  const SLOT_COUNT = 3;
  let activeSlot = 1;
  const slotKey = (s) => `nl_s${s}`;
  const runKey = (s) => `nl_r${s}`;
  const bakKey = (k) => k + "_bak";
  const SK_SLOT = "nl_slot";
  const dSave = () => ({ cats: [], dust: 0, ups: {}, stats: { r: 0, w: 0, ba: 0, hs: 0, mf: 0, mh: 0, td: 0, disc: [], dh: [], bossRecord: {}, grudgesResolved: 0, kittensTotal: 0, handTypePlays: {} }, heat: 0, achv: [], relics: [], codex: [], v: 17 });
  function validateSave(d) {
    if (!d || typeof d !== "object") return dSave();
    if (!Array.isArray(d.cats)) d.cats = [];
    if (typeof d.dust !== "number" || isNaN(d.dust)) d.dust = 0;
    if (!d.ups || typeof d.ups !== "object") d.ups = {};
    if (!d.stats || typeof d.stats !== "object") d.stats = {};
    const s = d.stats;
    if (typeof s.r !== "number") s.r = 0;
    if (typeof s.w !== "number") s.w = 0;
    if (typeof s.ba !== "number") s.ba = 0;
    if (typeof s.hs !== "number") s.hs = 0;
    if (typeof s.mf !== "number") s.mf = 0;
    if (typeof s.mh !== "number") s.mh = 0;
    if (typeof s.td !== "number") s.td = 0;
    if (!Array.isArray(s.disc)) s.disc = [];
    if (!Array.isArray(s.dh)) s.dh = [];
    if (!Array.isArray(d.achv)) d.achv = [];
    if (!Array.isArray(d.relics)) d.relics = [];
    if (typeof d.heat !== "number") d.heat = 0;
    if (!s.bossRecord || typeof s.bossRecord !== "object") s.bossRecord = {};
    if (typeof s.grudgesResolved !== "number") s.grudgesResolved = 0;
    if (typeof s.kittensTotal !== "number") s.kittensTotal = 0;
    if (!s.handTypePlays || typeof s.handTypePlays !== "object") s.handTypePlays = {};
    if (!s.chronicle || typeof s.chronicle !== "object") s.chronicle = {};
    d.cats = d.cats.filter((c) => c && typeof c === "object" && c.name && c.breed);
    if (!d.v) d.v = 17;
    return d;
  }
  async function readRaw(k) {
    try {
      if (window.storage?.get) {
        const r = await window.storage.get(k);
        if (r) return r.value;
      }
    } catch (e) {
    }
    try {
      return localStorage.getItem(k);
    } catch (e) {
    }
    return null;
  }
  async function writeRaw(k, v) {
    try {
      if (window.storage?.set) await window.storage.set(k, v);
    } catch (e) {
    }
    try {
      localStorage.setItem(k, v);
    } catch (e) {
    }
  }
  async function deleteRaw(k) {
    try {
      if (window.storage?.delete) await window.storage.delete(k);
    } catch (e) {
    }
    try {
      localStorage.removeItem(k);
    } catch (e) {
    }
  }
  async function loadSlotNum() {
    try {
      const v = await readRaw(SK_SLOT);
      if (v) {
        const n = parseInt(v);
        if (n >= 1 && n <= SLOT_COUNT) {
          activeSlot = n;
          return n;
        }
      }
    } catch (e) {
    }
    activeSlot = 1;
    return 1;
  }
  async function loadS(slot) {
    const sk = slotKey(slot || activeSlot);
    try {
      const raw = await readRaw(sk);
      if (raw) {
        const d = JSON.parse(raw);
        return validateSave(migrateSave(d));
      }
    } catch (e) {
    }
    try {
      const bak = await readRaw(bakKey(sk));
      if (bak) {
        const d = JSON.parse(bak);
        return validateSave(migrateSave(d));
      }
    } catch (e) {
    }
    return dSave();
  }
  async function saveS(d, slot) {
    const sk = slotKey(slot || activeSlot);
    const json = JSON.stringify(d);
    try {
      const prev = await readRaw(sk);
      if (prev) await writeRaw(bakKey(sk), prev);
    } catch (e) {
    }
    await writeRaw(sk, json);
  }
  async function saveRun(state) {
    const rk = runKey(activeSlot);
    await writeRaw(rk, JSON.stringify(state));
  }
  async function loadRun() {
    const rk = runKey(activeSlot);
    try {
      const raw = await readRaw(rk);
      if (raw) return JSON.parse(raw);
    } catch (e) {
    }
    return null;
  }
  async function clearRunSave() {
    await deleteRaw(runKey(activeSlot));
  }
  async function exportSlot(slot) {
    const raw = await readRaw(slotKey(slot || activeSlot));
    return raw || JSON.stringify(dSave());
  }
  async function importSlot(json, slot) {
    try {
      const d = validateSave(migrateSave(JSON.parse(json)));
      await saveS(d, slot || activeSlot);
      return d;
    } catch (e) {
      return null;
    }
  }
  async function getSlotSummary(slot) {
    try {
      const raw = await readRaw(slotKey(slot));
      if (raw) {
        const d = JSON.parse(raw);
        return { empty: false, wins: d.stats?.w || 0, runs: d.stats?.r || 0, cats: d.cats?.length || 0, dust: d.dust || 0, heat: d.heat || 0 };
      }
    } catch (e) {
    }
    return { empty: true, wins: 0, runs: 0, cats: 0, dust: 0, heat: 0 };
  }
  async function setActiveSlot(n) {
    activeSlot = n;
    await writeRaw(SK_SLOT, String(n));
  }
  async function migrateLegacy() {
    const old = await readRaw("nl_v29");
    if (old) {
      await writeRaw(slotKey(1), old);
      const oldRun = await readRaw("nl_run");
      if (oldRun) await writeRaw(runKey(1), oldRun);
      await deleteRaw("nl_v29");
      await deleteRaw("nl_run");
    }
  }
  const BREED_MIGRATE = { Shadow: "Autumn", Ember: "Summer", Frost: "Winter", Bloom: "Spring" };
  function migrateSave(d) {
    if (!d) return dSave();
    const mb = (n) => BREED_MIGRATE[n] || n;
    if (d.cats) d.cats = d.cats.map((c) => ({ ...c, breed: mb(c.breed) }));
    if (d.stats?.disc) d.stats.disc = d.stats.disc.map((s) => s.replace(/^(Shadow|Ember|Frost|Bloom)/, (_, m) => mb(m)));
    if (!d.stats.dh) d.stats.dh = [];
    if (!d.v || d.v < 17) {
      if (!d.stats.bossRecord) d.stats.bossRecord = {};
      if (!d.stats.grudgesResolved) d.stats.grudgesResolved = 0;
      if (!d.stats.kittensTotal) d.stats.kittensTotal = 0;
      if (!d.stats.handTypePlays) d.stats.handTypePlays = {};
      if (!d.stats.chronicle) d.stats.chronicle = {};
      d.v = 17;
    }
    return validateSave(d);
  }
  function getHearthPairs(hearthCats) {
    const pairs = {};
    hearthCats.filter((c) => c.pairId).forEach((c) => {
      if (!pairs[c.pairId]) pairs[c.pairId] = [];
      pairs[c.pairId].push(c);
    });
    return Object.values(pairs).filter((p) => p.length === 2);
  }
  function genDescendant(hearthCats, powerBonus = 0, specificPair = null) {
    const pairs = getHearthPairs(hearthCats);
    if (pairs.length === 0 && !specificPair) return gC({ trait: pickDraftTrait() });
    const pair = specificPair || pk(pairs);
    const p1 = { ...pair[0], id: pair[0].name + "-h1", trait: typeof pair[0].trait === "string" ? TRAITS.find((t) => t.name === pair[0].trait) || PLAIN : pair[0].trait || PLAIN };
    const p2 = { ...pair[1], id: pair[1].name + "-h2", trait: typeof pair[1].trait === "string" ? TRAITS.find((t) => t.name === pair[1].trait) || PLAIN : pair[1].trait || PLAIN };
    const baby = breedC(p1, p2);
    if (catIsPlain(baby)) {
      baby.trait = pk(COMMON_TRAITS);
      baby.name = gN(baby.breed, baby.trait);
    }
    if (powerBonus > 0) baby.power = Math.min(8, baby.power + powerBonus);
    baby.hearthDescendant = true;
    baby._hearthParents = `${pair[0].name.split(" ")[0]} & ${pair[1].name.split(" ")[0]}`;
    baby._parentTrait = pair[0].trait?.name || pair[1].trait?.name || null;
    return baby;
  }
  function calcHearthDust(cats) {
    return cats.map((c) => {
      let d = 0;
      d += Math.max(1, Math.floor((c.power || 3) / 2));
      const tier = c.trait?.tier || "common";
      if (tier === "mythic") d += 15;
      else if (tier === "legendary") d += 10;
      else if (tier === "rare" || tier === "rare_neg") d += 6;
      else if (tier === "common" && c.trait?.name !== "Plain") d += 3;
      if (c.stats?.tp >= 12) d += 3;
      else if (c.stats?.tp >= 6) d += 2;
      else if (c.stats?.tp >= 3) d += 1;
      if (c.stats?.bs >= 1e4) d += 5;
      else if (c.stats?.bs >= 3e3) d += 2;
      if (c.bondedTo || c.bonded) d += 2;
      if (c.scarred) d += 3;
      if (c.fromAnte >= 5) d += 4;
      else if (c.fromAnte >= 3) d += 2;
      if (c.lineage) d += 3;
      if (c.epithet) d += 3;
      return { cat: c, dust: Math.max(1, Math.ceil(d * 0.5)) };
    });
  }
  function calcTotalHearthDust(cats, dustBonus = 0, heatMult = 1) {
    const hd = calcHearthDust(cats);
    const raw = hd.reduce((s, h) => s + h.dust, 0);
    const activeCats = cats.filter((c) => !c.enshrined);
    const activeRaw = calcHearthDust(activeCats).reduce((s, h) => s + h.dust, 0);
    const maintenance = activeCats.length > 8 ? (activeCats.length - 8) * 2 : 0;
    const enshrined = cats.filter((c) => c.enshrined).length;
    const tierBonus = cats.length >= 15 ? 0.3 : cats.length >= 6 ? 0.15 : 0;
    const gross = Math.round(activeRaw * (1 + dustBonus + tierBonus) * heatMult);
    const total = Math.max(0, gross - maintenance);
    return { cats: hd, total, raw: activeRaw, gross, maintenance, enshrined, activeCats: activeCats.length };
  }
  const PORTRAIT_BASE = "https://raw.githubusercontent.com/greatgamesgonewild/ninth-life/main/portraits/";
  let _portraitsAvailable = null;
  (function() {
    try {
      const img = new Image();
      img.onload = () => {
        _portraitsAvailable = true;
      };
      img.onerror = () => {
        _portraitsAvailable = false;
      };
      img.src = PORTRAIT_BASE + "plain-autumn.png";
    } catch (e) {
      _portraitsAvailable = false;
    }
  })();
  function getPortraitUrl(cat2) {
    try {
      if (!cat2 || !cat2.breed) return null;
      const season = cat2.breed.toLowerCase();
      const allT = catAllTraits(cat2);
      const hasT = (n) => allT.some((t) => t.name === n);
      const hasTier = (t) => allT.some((tr) => tr.tier === t);
      const power = cat2.power || 1;
      const tp = cat2.stats?.tp || 0;
      let style = "plain";
      if (catIsKitten(cat2)) style = "kitten";
      else if (hasTier("mythic") || hasT("Eternal") || hasT("Phoenix")) style = "mythic";
      else if (hasTier("legendary") && power >= 8) style = "regal";
      else if (tp >= 10) style = "elder";
      else if (hasT("Scrapper") || hasT("Alpha") || hasT("Guardian") || cat2.scarred) style = "alert";
      else if (hasT("Wild") || hasT("Chimera") || hasT("Feral") || hasT("Cursed")) style = "wild";
      else if (hasT("Devoted") || hasT("Loyal") || hasT("Scavenger")) style = "gentle";
      else if (hasT("Seer") || hasTier("legendary")) style = "regal";
      else if (allT.length > 0) style = "alert";
      return PORTRAIT_BASE + style + "-" + season + ".png";
    } catch (e) {
      return null;
    }
  }
  function _CC({ cat: _cat, sel, onClick, sm, cw: _cw, dis, hl, fog, chemHint, denMode, onTraitClick }) {
    const cat2 = !_cat || !_cat.trait ? { ..._cat || {}, trait: PLAIN, extraTraits: [], breed: "Autumn", name: "???", power: 1, sex: "M" } : _cat;
    const b = BREEDS[cat2.breed] || BREEDS.Autumn, w = _cw || (sm ? 80 : 112), h = _cw ? Math.round(_cw * 1.4) : sm ? 112 : 158, fn = cat2.name ? cat2.name.split(" ")[0] : "?";
    const xs = w < 60;
    if (_cw && _cw < 80) sm = true;
    const allTraits = catAllTraits(cat2);
    const isMythicTier = allTraits.some((t) => t.tier === "mythic");
    const isLegendaryTier = allTraits.some((t) => t.tier === "legendary");
    const isRareTier = allTraits.some((t) => t.tier === "rare" || t.tier === "rare_neg");
    const isPlain = cat2.trait.name === "Plain" && !(cat2.extraTraits || []).length;
    const isWild = catHas(cat2, "Chimera") || catHas(cat2, "Wild");
    const neon = b.color;
    const nd = neon + "55";
    const ng = neon + "33";
    const tierGlow = isMythicTier ? ",0 0 16px #c084fc55,0 0 30px #c084fc33,0 0 4px #c084fc22 inset" : isLegendaryTier ? ",0 0 12px #f9731644,0 0 20px #f9731622" : isRareTier ? ",0 0 8px #38bdf822" : "";
    const goldBorder = _goldBorders && !isPlain;
    const mythicBorder = isMythicTier ? `2px solid #c084fc66` : isLegendaryTier ? `2px solid #f9731644` : null;
    let rankLabel = null;
    if (fog) return /* @__PURE__ */ React.createElement("div", { onClick: dis ? void 0 : onClick, style: { width: w, height: h, borderRadius: sm ? 8 : 12, background: "#0d1117", border: "2px solid #ffffff12", boxShadow: "0 2px 8px #00000066", cursor: dis ? "default" : "pointer", transition: "all .15s", transform: sel ? "translateY(-12px) scale(1.05)" : "", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: sm ? 22 : 30, opacity: 0.12, color: neon } }, "?"));
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: dis ? void 0 : onClick,
        title: cat2.name + " - " + b.name + ", P" + cat2.power,
        style: {
          width: w,
          height: h,
          borderRadius: sm ? 8 : 12,
          background: "#0d1117",
          border: mythicBorder || ("2px solid " + (sel ? "#fbbf24" : denMode ? "#c084fc88" : hl ? neon : goldBorder ? "#fbbf2466" : nd)),
          boxShadow: (sel ? "0 0 14px " + neon + "66,0 0 28px " + ng : hl ? "0 0 10px " + ng : "0 0 6px " + ng + ",0 0 14px " + ng) + tierGlow + (goldBorder ? ",0 0 3px #fbbf2422" : ""),
          cursor: dis ? "default" : "pointer",
          transition: "all .15s ease-out",
          transform: sel ? `translateY(-${Math.min(12, Math.round(w * 0.12))}px) scale(1.04)` : "translateZ(0)",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
          opacity: dis ? 0.4 : 1,
          willChange: "transform,box-shadow",
          animation: cat2._newEpithet ? "epithetFlash 1.2s ease-out" : ""
        },
        onMouseEnter: (e) => {
          if (!dis && !sel) {
            e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
            e.currentTarget.style.boxShadow = `0 6px 20px ${neon}33,0 0 12px ${neon}22`;
          }
        },
        onMouseLeave: (e) => {
          if (!dis && !sel) {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "";
          }
        }
      },
      sel && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: "50%", left: "50%", width: w * 0.6, height: w * 0.6, borderRadius: "50%", background: neon + "44", transform: "translate(-50%,-50%)", animation: "cardRipple .4s ease-out forwards", pointerEvents: "none", zIndex: 5 } }),
      /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        top: sm ? 3 : 4,
        left: sm ? 3 : 4,
        right: sm ? 3 : 4,
        bottom: sm ? 3 : 4,
        borderRadius: sm ? 5 : 8,
        border: "1px solid " + nd,
        pointerEvents: "none",
        zIndex: 1
      } }),
      /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: sm ? 28 : 38,
        overflow: "hidden",
        borderRadius: (sm ? 6 : 10) + "px " + (sm ? 6 : 10) + "px 0 0",
        zIndex: 2,
        background: `radial-gradient(circle at 50% 40%, ${neon}11, transparent 70%)`
      } }, _portraitsAvailable !== false && getPortraitUrl(cat2) ? /* @__PURE__ */ React.createElement(
        "img",
        {
          src: getPortraitUrl(cat2),
          alt: "",
          loading: "eager",
          style: {
            width: "100%",
            height: "115%",
            objectFit: "cover",
            objectPosition: "center 15%",
            opacity: isPlain ? 0.15 : 1,
            filter: cat2.injured ? "saturate(0.3) brightness(0.5)" : cat2.scarred ? "contrast(1.15) brightness(0.9)" : "none",
            transition: "opacity .3s"
          },
          onLoad: function(e) {
            _portraitsAvailable = true;
          },
          onError: function(e) {
            const src = e.target.src;
            const season = src.match(/-(\w+)\.png/)?.[1] || "autumn";
            const fallback = PORTRAIT_BASE + "plain-" + season + ".png";
            if (src !== fallback) {
              e.target.src = fallback;
            } else {
              e.target.style.display = "none";
            }
          }
        }
      ) : null),
      /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        top: sm ? 1 : 2,
        right: sm ? 1 : 2,
        zIndex: 5,
        display: "flex",
        alignItems: "baseline",
        gap: sm ? 2 : 3,
        background: "#0d1117ee",
        border: "1.5px solid " + nd,
        borderRadius: sm ? "0 6px 0 8px" : "0 10px 0 10px",
        padding: sm ? "2px 5px 1px" : "3px 7px 2px",
        borderTop: "none",
        borderRight: "none"
      } }, /* @__PURE__ */ React.createElement("span", { style: {
        fontSize: xs ? 12 : sm ? 15 : 22,
        fontWeight: 900,
        color: neon,
        lineHeight: 1,
        textShadow: "0 0 8px " + ng
      } }, cat2.power)),
      (cat2.injured || !sm && (cat2.scarred || cat2.bondedTo || (cat2.grudgedWith || []).length > 0 || cat2.parentIds?.length > 0 || cat2._hearthChild)) && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, display: "flex", gap: 0, justifyContent: "center" } }, cat2._hearthChild && !sm && /* @__PURE__ */ React.createElement("div", { title: "Hearth Legend: returned to guide this colony. Cannot be saved back.", style: {
        background: "linear-gradient(180deg,#fbbf2433,#fbbf2411)",
        padding: sm ? "2px 4px" : "3px 5px",
        fontSize: sm ? 9 : 11,
        color: "#fbbf24",
        lineHeight: 1,
        fontWeight: 700,
        borderBottom: "1px solid #fbbf2444"
      } }, "\u{1F525}"), cat2.injured && /* @__PURE__ */ React.createElement("div", { title: "Injured: half power, \u22122 bonus. Heals in 1-2 rounds.", style: {
        background: "linear-gradient(180deg,#ef444433,#ef444411)",
        padding: sm ? "2px 4px" : "3px 5px",
        fontSize: sm ? 9 : 11,
        color: "#ef4444",
        lineHeight: 1,
        fontWeight: 700,
        borderBottom: "1px solid #ef444444"
      } }, "\u271A"), !cat2.injured && cat2.scarred && !sm && /* @__PURE__ */ React.createElement("div", { title: "Hardened: \xD71.25 bonus. Permanent.", style: {
        background: "linear-gradient(180deg,#fbbf2433,#fbbf2411)",
        padding: "3px 5px",
        fontSize: 11,
        color: "#fbbf24",
        lineHeight: 1,
        fontWeight: 700,
        borderBottom: "1px solid #fbbf2444"
      } }, "\u2694"), cat2.bondedTo && !cat2._mateDied && !sm && /* @__PURE__ */ React.createElement("div", { title: "Bonded: \xD71.5 bonus when played with partner.", style: {
        background: "linear-gradient(180deg,#f472b633,#f472b611)",
        padding: "3px 5px",
        fontSize: 11,
        color: "#f472b6",
        lineHeight: 1,
        fontWeight: 700,
        borderBottom: "1px solid #f472b644"
      } }, "\u2661"), cat2._mateDied && !sm && /* @__PURE__ */ React.createElement("div", { title: "Lost their partner. Carries two names now.", style: {
        background: "linear-gradient(180deg,#ef444433,#ef444411)",
        padding: "3px 5px",
        fontSize: 11,
        color: "#ef4444",
        lineHeight: 1,
        fontWeight: 700,
        borderBottom: "1px solid #ef444444"
      } }, "\u{1F494}"), (cat2.grudgedWith || []).length > 0 && !sm && /* @__PURE__ */ React.createElement("div", { title: "Grudge: \u22122 bonus when played with rival.", style: {
        background: "linear-gradient(180deg,#fb923c33,#fb923c11)",
        padding: "3px 5px",
        fontSize: 11,
        color: "#fb923c",
        lineHeight: 1,
        fontWeight: 700,
        borderBottom: "1px solid #fb923c44"
      } }, "\u26A1"), cat2.parentIds && cat2.parentIds.length > 0 && !sm && /* @__PURE__ */ React.createElement("div", { title: `Born in the den${cat2.stats?.par ? ", parents: " + cat2.stats.par : ""}`, style: {
        background: "linear-gradient(180deg,#c084fc33,#c084fc11)",
        padding: "3px 5px",
        fontSize: 11,
        color: "#c084fc",
        lineHeight: 1,
        fontWeight: 700,
        borderBottom: "1px solid #c084fc44"
      } }, "\u{1F46A}")),
      rankLabel && /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        top: sm ? 15 : 20,
        right: sm ? 2 : 3,
        zIndex: 5,
        background: "#0d1117ee",
        border: "1px solid " + nd,
        borderRadius: 3,
        padding: "1px 3px",
        fontSize: sm ? 6 : 7,
        color: neon + "bb",
        fontWeight: 600
      } }, rankLabel),
      /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", height: sm ? 14 : 18 } }, /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        top: "50%",
        left: sm ? 4 : 5,
        right: sm ? 4 : 5,
        height: 1,
        background: "linear-gradient(90deg," + neon + "44," + neon + "88," + neon + "44)"
      } }), /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        left: sm ? 4 : 6,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        gap: sm ? 2 : 3,
        zIndex: 1
      } }, [cat2.trait, ...cat2.extraTraits || []].filter(function(t) {
        return t.name !== "Plain";
      }).map(function(t, ti) {
        return /* @__PURE__ */ React.createElement("div", { key: ti, onClick: function(e) {
          e.stopPropagation();
          if (onTraitClick) onTraitClick(cat2);
        }, style: {
          background: "#0d1117",
          padding: "0 2px",
          fontSize: xs ? 8 : sm ? 10 : 13,
          lineHeight: 1,
          cursor: onTraitClick ? "help" : "default"
        } }, t.icon);
      })), /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        right: sm ? 4 : 6,
        top: "50%",
        transform: "translateY(-50%)",
        background: neon + "22",
        borderRadius: "50%",
        width: xs ? 14 : sm ? 16 : 20,
        height: xs ? 14 : sm ? 16 : 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: xs ? 8 : sm ? 10 : 13,
        lineHeight: 1,
        zIndex: 1,
        boxShadow: "0 0 6px " + neon + "15"
      } }, isWild ? "\u2726" : b.icon)), !sm && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", padding: "2px 8px 5px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: fn.length > 8 ? 10 : fn.length > 6 ? 11 : 13,
        fontWeight: 700,
        color: neon,
        letterSpacing: fn.length > 7 ? 1 : 3,
        textShadow: "0 0 6px " + ng,
        textTransform: "uppercase",
        lineHeight: 1.2,
        whiteSpace: "nowrap"
      } }, fn, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 700, marginLeft: 2, color: cat2.sex === "M" ? "#60a5fa" : "#f472b6" } }, cat2.sex === "M" ? "\u2642" : "\u2640"))), sm && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", padding: "1px 4px 3px", textAlign: "center", height: 12 } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: 7,
        fontWeight: 700,
        color: neon + "aa",
        letterSpacing: 0,
        textTransform: "uppercase",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        overflow: "hidden"
      } }, fn)))
    );
  }
  const CC = React.memo(_CC);
  function ProgressMap({ ante, blind, mx }) {
    const dots = [];
    for (let a = 1; a <= mx; a++) {
      for (let b = 0; b < 3; b++) {
        const done = a < ante || a === ante && b < blind;
        const cur = a === ante && b === blind;
        const isBoss = b === 2;
        dots.push({ a, b, done, cur, isBoss });
      }
    }
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2, alignItems: "center", padding: "2px 0" } }, dots.map((d, i) => {
      const showAnte = d.b === 0;
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 1 } }, showAnte && i > 0 && /* @__PURE__ */ React.createElement("div", { style: { width: 4, height: 1, background: "#333", margin: "0 1px" } }), showAnte && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: d.done || d.cur ? "#fbbf24" : "#444", marginRight: 1 } }, d.a), /* @__PURE__ */ React.createElement("div", { style: {
        width: d.cur ? 10 : d.isBoss ? 9 : 6,
        height: d.cur ? 10 : d.isBoss ? 9 : 6,
        borderRadius: d.isBoss ? 1 : 10,
        background: d.cur ? "#fbbf24" : d.done ? "#4ade80" : "#333",
        border: d.cur ? `2px solid #fbbf24` : d.isBoss && !d.done ? "1px solid #ef444488" : "none",
        boxShadow: d.cur ? "0 0 8px #fbbf2488" : "none",
        transition: "all .15s"
      } }));
    }));
  }
  function _FM({ level, prev }) {
    const fv = NERVE[level] || NERVE[0], pct = level / NERVE_MAX * 100, mx = level === NERVE_MAX, ch = prev !== null && prev !== level, up = ch && level > prev, dn = ch && level < prev;
    return /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 700, padding: "0 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { title: "NERVE multiplies ALL scores.\nGain: +unused hands when you clear a blind.\nFaster clears = more nerve.\nAt NINTH LIFE (max): \xD72.3 to ALL scores.", style: { fontSize: 12, fontWeight: 700, color: fv.color, letterSpacing: 2, textShadow: mx ? `0 0 14px ${fv.glow}` : level > 5 ? `0 0 6px ${fv.color}44` : "none", animation: mx ? "fp 1s ease-in-out infinite" : up ? "fpp .4s ease-out" : dn ? "shake .3s ease" : "none", cursor: "help" } }, mx ? "\u2726 " : "", fv.name, mx ? " \u2726" : ""), /* @__PURE__ */ React.createElement("span", { style: { fontSize: fv.xM > 1 ? 13 : 11, color: fv.color, fontWeight: 900, opacity: fv.xM > 1 ? 1 : 0.3, letterSpacing: fv.xM > 1 ? 1 : 0, textShadow: fv.xM > 1.3 ? `0 0 8px ${fv.color}44` : "none" } }, fv.xM > 1 ? `\xD7${fv.xM}` : "\xD71"), ch && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, animation: "countUp .4s ease-out", color: up ? "#4ade80" : "#ef4444" } }, up ? "\u25B2" : "\u25BC")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666" } }, level, "/", NERVE_MAX)), /* @__PURE__ */ React.createElement("div", { style: { height: 8, background: "#1a1a2e", borderRadius: 4, overflow: "hidden", border: "1px solid #ffffff08" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${pct}%`, borderRadius: 4, background: mx ? "linear-gradient(90deg,#b85c2c,#f59e0b,#fef08a,#ffffffcc)" : `linear-gradient(90deg,#b8956a,${fv.color})`, transition: "width .5s cubic-bezier(.34,1.56,.64,1)", boxShadow: level > 5 ? `0 0 8px ${fv.color}44` : "none", animation: level > 8 ? `nervePulse ${Math.max(0.6, 2 - level * 0.1)}s ease-in-out infinite` : "none" } })), level === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", marginTop: 2, textAlign: "center" } }, "Clear blinds to build Nerve. Fewer hands used = more Nerve gained."));
  }
  const FM = React.memo(_FM);
  function AnimatedScore({ value, style }) {
    const ref = useRef(null);
    const prev = useRef(value);
    const raf = useRef(null);
    useEffect(() => {
      const start = prev.current;
      const end = value;
      const duration = Math.min(400, Math.max(150, Math.abs(end - start) / 50));
      let t0 = null;
      function tick(ts) {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / duration);
        const eased = 1 - (1 - p) * (1 - p);
        const cur = Math.round(start + (end - start) * eased);
        if (ref.current) ref.current.textContent = cur.toLocaleString();
        if (p < 1) raf.current = requestAnimationFrame(tick);
        else prev.current = end;
      }
      if (start !== end) {
        raf.current = requestAnimationFrame(tick);
      } else if (ref.current) ref.current.textContent = value.toLocaleString();
      return () => {
        if (raf.current) cancelAnimationFrame(raf.current);
      };
    }, [value]);
    return /* @__PURE__ */ React.createElement("span", { ref, style }, value.toLocaleString());
  }
  function NinthLife() {
    const [ph, _setPh] = useState("title");
    const [phFade, setPhFade] = useState(false);
    const instantPhases = new Set(["scoring", "playing"]);
    const setPh = (p) => {
      flavorCache.current = {};
      if (instantPhases.has(p)) { _setPh(p); return; }
      setPhFade(true);
      setTimeout(() => { _setPh(p); setPhFade(false); }, 120);
    };
    const [ante, setAnte] = useState(1);
    const [blind, setBlind] = useState(0);
    const [rScore, setRScore] = useState(0);
    const [hLeft, setHLeft] = useState(4);
    const [dLeft, setDLeft] = useState(3);
    const [gold, setGold] = useState(5);
    const [mood, setMood] = useState(50);
    const [weather, setWeather] = useState(null);
    const [nightMod, setNightMod] = useState(null);
    const [hand, setHand] = useState([]);
    const [draw, setDraw] = useState([]);
    const [disc, setDisc] = useState([]);
    const [sel, setSel] = useState(/* @__PURE__ */ new Set());
    const [fams, setFams] = useState([]);
    const [sCats, setSCats] = useState([]);
    const [sFams, setSFams] = useState([]);
    const [sRes, setSRes] = useState(null);
    const [sStep, setSStep] = useState(-1);
    const [runChips, setRunChips] = useState(0);
    const [runMult, setRunMult] = useState(0);
    const [scoreShake, setScoreShake] = useState(0);
    const [clutch, setClutch] = useState(false);
    const [scoringFlash, setScoringFlash] = useState(null);
    const [multPop, setMultPop] = useState(null);
    const [injuredFlash, setInjuredFlash] = useState(null);
    const [handBests, setHandBests] = useState({});
    const [newBest, setNewBest] = useState(null);
    const [handDiscovery, setHandDiscovery] = useState([]);
    const [scoringDone, setScoringDone] = useState(false);
    const [traitTip, setTraitTip] = useState(null);
    const [inspectCat, setInspectCat] = useState(null);
    const [colStep, setColStep] = useState(0);
    const [deckView, setDeckView] = useState(false);
    const [handSort, setHandSort] = useState("season");
    const [showLog, setShowLog] = useState(false);
    const [boss, setBoss] = useState(null);
    const stRef = useRef(null);
    const scoreEndRef = useRef(null);
    const flavorCache = useRef({});
    const advancingRef = useRef(false);
    const actionLock = useRef(false);
    const goldRef = useRef(5);
    const injuredThisBlind = useRef(false);
    const undoRef = useRef(null);
    const fcSeenRef = useRef({});
    const [ferv, setFerv] = useState(0);
    const [pFerv, setPFerv] = useState(null);
    const [fFlash, setFFlash] = useState(null);
    const [rMaxF, setRMaxF] = useState(0);
    const [curses, setCurses] = useState([]);
    const [cfx, setCfx] = useState({});
    const [oData, setOData] = useState(null);
    const [sellMode, setSellMode] = useState(false);
    const [sellConfirm, setSellConfirm] = useState(null);
    const [sellsLeft, setSellsLeft] = useState(2);
    const [den, setDen] = useState([]);
    const [denRes, setDenRes] = useState(null);
    const denStRef = useRef(null);
    useEffect(() => () => {
      if (stRef.current) clearTimeout(stRef.current);
      if (denStRef.current) clearTimeout(denStRef.current);
    }, []);
    const [runLog, setRunLog] = useState([]);
    const [fallen, setFallen] = useState([]);
    const [draftPool, setDraftPool] = useState([]);
    const [draftRejects, setDraftRejects] = useState([]);
    const [colonyData, setColonyData] = useState(null);
    const [draftReady, setDraftReady] = useState(false);
    const [colonyName, setColonyName] = useState("");
    const [draftPicked, setDraftPicked] = useState([]);
    const [draftBase, setDraftBase] = useState([]);
    const [draftWaves, setDraftWaves] = useState([]);
    const [bossRewardChoices, setBossRewardChoices] = useState([]);
    const prevRewardIdsRef = useRef([]);
    const [runBonus, setRunBonus] = useState({ hands: 0 });
    const [denNews, setDenNews] = useState([]);
    const [firstHandPlayed, setFirstHandPlayed] = useState(false);
    const [scoringCats, setScoringCats] = useState([]);
    const [lastHandIds, setLastHandIds] = useState([]);
    const [lastHandLost, setLastHandLost] = useState(false);
    const [lastHandType, setLastHandType] = useState(null);
    const [aftermath, setAftermath] = useState([]);
    const [colEvent, setColEvent] = useState(null);
    const [eventHistory, setEventHistory] = useState({});
    const [colTargets, setColTargets] = useState([]);
    const [eventOutcome, setEventOutcome] = useState(null);
    const [skipShop, setSkipShop] = useState(false);
    const [campMode, setCampMode] = useState(false);
    const [tempMods, setTempMods] = useState({ hands: 0, discs: 0, freeRecruits: 0, nerveLock: 0 });
    const [eventDenSafe, setEventDenSafe] = useState(false);
    const [eventDenBonus, setEventDenBonus] = useState(0);
    const [firstDenUsed, setFirstDenUsed] = useState(false);
    const [newUnlocks, setNewUnlocks] = useState([]);
    const [shopTab, setShopTab] = useState("cats");
    const [defeatData, setDefeatData] = useState(null);
    const [bloodMemMsg, setBloodMemMsg] = useState(null);
    const [rerollCount, setRerollCount] = useState(0);
    const [htLevels, setHtLevels] = useState({});
    const [sScrolls, setSScrolls] = useState([]);
    const [devotion, setDevotion] = useState({});
    const [hearthDust, setHearthDust] = useState(0);
    const [anteUp, setAnteUp] = useState(null);
    const [nightCard, setNightCard] = useState(null);
    const [meta, setMeta] = useState(null);
    const [hearthPair, setHearthPair] = useState([]);
    const [victoryStep, setVictoryStep] = useState(0);
    const [hearthConfirm, setHearthConfirm] = useState(null);
    const [hearthFlash, setHearthFlash] = useState(null);
    const [savedRun, setSavedRun] = useState(null);
    const [reshuf, setReshuf] = useState(false);
    const [tab, setTab] = useState("play");
    const [demoStep, setDemoStep] = useState(0);
    const epigraphRef = useRef(null);
    const [dailyPlayers, setDailyPlayers] = useState(null);
    const [miniBoard, setMiniBoard] = useState(null);
    const [lbTab, setLbTab] = useState("daily");
    const [lbData, setLbData] = useState(null);
    const [lbLoading, setLbLoading] = useState(false);
    const [handleInput, setHandleInput] = useState(() => getHandle());
    useEffect(() => {
      if (ph !== "title") return;
      const t = setInterval(() => setDemoStep((s) => (s + 1) % 16), 600);
      return () => clearInterval(t);
    }, [ph]);
    useEffect(() => {
      fetchDaily().then((d) => { if (d.total > 0) setDailyPlayers(d.total); setMiniBoard(d); }).catch(() => {});
    }, []);
    const [longDark, setLongDark] = useState(false);
    const [guide, setGuide] = useState(null);
    const [autoPlay, setAutoPlay] = useState(null);
    const [namingCat, setNamingCat] = useState(null);
    const [babyNamingQueue, setBabyNamingQueue] = useState([]);
    const pendingRenames = useRef({});
    const [toasts, setToasts] = useState([]);
    const toastRef = useRef(0);
    function toast(icon, text, color = "#fbbf24", dur = 2500) {
      const id = ++toastRef.current;
      const neg = color === "#ef4444" || color === "#fb923c";
      setToasts((t) => [...t, { id, icon, text, color, big: dur > 2500, neg }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), dur);
    }
    const prevNerveRef = useRef(ferv);
    useEffect(() => {
      const prev = prevNerveRef.current;
      prevNerveRef.current = ferv;
      if (prev === ferv || ph === "title" || ph === "draft") return;
      const up = ferv > prev;
      const NERVE_VOICE = { 2: "Tension.", 3: "Cornered.", 4: "DEFIANCE.", 5: "IGNITE.", 6: "FURY.", 7: "BLAZING.", 8: "UNDYING.", 9: "NINTH LIFE." };
      const DOWN_VOICE = { 0: "Silence.", 1: "Fading.", 2: "Slipping.", 3: "Shaken." };
      if (up && NERVE_VOICE[ferv]) toast("\u{1F525}", NERVE_VOICE[ferv], NERVE[ferv].color);
      else if (!up && ferv <= 3 && DOWN_VOICE[ferv]) toast("\u{1F4A8}", DOWN_VOICE[ferv], "#6b7280");
    }, [ferv]);
    const [seen, setSeen] = useState({});
    const [muted, setMuted] = useState(() => {
      try {
        return localStorage.getItem("nl_mute") === "1";
      } catch (e) {
        return false;
      }
    });
    const [abandonConfirm, setAbandonConfirm] = useState(false);
    const [newColonyConfirm, setNewColonyConfirm] = useState(false);
    const toggleMute = () => {
      setMuted((m) => {
        const v = !m;
        Audio.muted = v;
        try {
          localStorage.setItem("nl_mute", v ? "1" : "0");
        } catch (e) {
        }
        return v;
      });
    };
    const [bossTraits, setBossTraits] = useState([]);
    const [isNinthDawn, setIsNinthDawn] = useState(false);
    const [isDailyRun, setIsDailyRun] = useState(false);
    const [dareBet, setDareBet] = useState(false);
    const isFirstRun = !meta || meta.stats.w === 0;
    const runCount = meta?.stats?.r || 0;
    const MX = isFirstRun ? 3 : longDark ? 9 : 5, BH = 6, MF = 5, MIN_DECK = 6;
    const BOSSES = [
      {
        id: "hunger",
        name: "The Hunger",
        icon: "\u{1F32A}\uFE0F",
        taunt: "I was here before you named it.",
        tauntFn: (ctx) => {
          const pf = ctx.prevFallen || [];
          if (pf.length > 0 && ctx.totalRuns > 3) return `Colony ${ctx.totalRuns + 1}. You've fed ${ctx.totalDeaths} to the dark already. ${pf[0].name} was one of them. The dark remembers the taste.`;
          return ctx.markedName ? `${ctx.markedName} carries a mark like it means something. It doesn't. It means you bled and the dark noticed.` : ctx.fallen > 0 ? `${ctx.fallenName} is gone and the rest are pretending the food will last. It won't.` : ctx.scarred > 2 ? `${ctx.scarredName} carries scars like armor. They're not armor. They're receipts.` : ctx.colony > 18 ? "All those mouths. I don't have to break in. I just have to wait." : ctx.bonded > 2 ? `${ctx.bondedName} and ${ctx.bondedMateName}. Love is expensive. Every bond is a mouth you'll feed twice.` : ctx.gold < 3 ? "You feel it already, don't you? That tightness. That counting." : "Fresh. Unbroken. I've seen that look eight times. It changes.";
        },
        defeat: "...for now. I come back every morning disguised as a plan.",
        defeatFn: (ctx) => ctx.clutch ? "That close. You smelled it. You'll smell it again." : ctx.deathless ? `You fed them all. Even ${ctx.strongestName || "the strongest"}. Nobody's done that before.` : "You passed the first test. There are others.",
        lore: "Not a creature. A fact."
      },
      {
        id: "territory",
        name: "The Territory",
        icon: "\u26F0\uFE0F",
        taunt: "You built on someone else's grave.",
        tauntFn: (ctx) => {
          const pf = ctx.prevFallen || [];
          if (pf.length > 0 && (ctx.totalRuns || 0) > 4) return `Colony ${(ctx.totalRuns || 0) + 1} on this ground. ${pf.slice(0, 3).map((f) => f.name).join(", ")} are already part of the soil. You'll join them.`;
          return ctx.colony > 18 ? `${ctx.colony} of you? The second colony had more. This ground ate them anyway.` : ctx.scarred > 3 ? `${ctx.scarredName} has scars from my ground. Bold. Stupid, but bold.` : ctx.bonded > 0 ? `${ctx.bondedName} thinks this is home now. The ground disagrees.` : ctx.grudges > 2 ? "Fighting among yourselves on contested ground. The fifth colony did that." : "Every colony builds here. Every colony thinks it's different.";
        },
        defeat: "Next time, build faster.",
        defeatFn: (ctx) => ctx.clutch ? "Barely. The ground remembers close calls." : ctx.deathless ? "Sturdy. The second colony was sturdy too. For a while." : "You held it. This time.",
        lore: "The land remembers who was here first."
      },
      {
        id: "mother",
        name: "The Mother",
        icon: "\u{1F494}",
        taunt: "I had names for them, too. Every one.",
        tauntFn: (ctx) => {
          const pf = ctx.prevFallen || [];
          if (pf.length > 3) return `${pf[0].name}. ${pf[1].name}. ${pf[2].name}. I know their names too. I know every name that didn't make it. ${ctx.totalDeaths || 0} across all your colonies. I counted. Mothers count.`;
          if (pf.length > 0 && ctx.fallen > 0) return `You lost ${ctx.fallenName} this time. You lost ${pf[0].name} before. I'm not the pattern. You are.`;
          return ctx.mourningName ? `${ctx.mourningName} lost someone they loved. I know that look. I wore it until the end.` : ctx.fallen > 2 ? `I never lost that many that fast. I lost them slowly. Watching each one go.` : ctx.fallen > 0 ? `${ctx.fallenName}. I would have kept ${ctx.fallenName} safe. I would have kept all of them safe. That's what destroyed me.` : ctx.colony > 18 ? "So many of them looking at you. I know that weight." : ctx.bonded > 3 ? `${ctx.bondedName} loves someone in that colony. It's beautiful. Love is what makes the losing unbearable.` : ctx.colony < 10 ? "Getting smaller. I know this part. I watched it happen to me." : `${ctx.strongestName} leads them. They look at ${ctx.strongestName} the way mine looked at me.`;
        },
        defeat: "Take care of them. Please. Do what I couldn't.",
        defeatFn: (ctx) => ctx.clutch ? "One number. That's all that stood between them and me." : ctx.deathless ? "You kept them all. I never could." : ctx.fallen > 0 ? "You've already lost some. And you're still going. That's the choice I couldn't make." : "You're stronger than I was. Don't waste it.",
        lore: "She is what you become if you fail."
      },
      {
        id: "swarm",
        name: "The Swarm",
        icon: "\u{1F400}",
        taunt: "We don't need to be stronger. Just patient.",
        tauntFn: (ctx) => {
          const pf = ctx.prevFallen || [];
          if ((ctx.totalDeaths || 0) > 8) return `${ctx.totalDeaths} across all your colonies. We counted every one. We count everything. That's what we do.`;
          return ctx.scarred > 3 ? `${ctx.scarredName} is wounded. We can smell it. We're very good at smelling weakness.` : ctx.colony < 12 ? `${ctx.colony} of you. Getting smaller. The math gets easier for us every round.` : ctx.colony > 18 ? "Impressive numbers! Still not enough. We've done this math eight times." : ctx.grudges > 2 ? `${ctx.grudgedName} is fighting their own. We love that. Saves us the trouble.` : `We've been watching ${ctx.strongestName}. Strong. But there's only one of them. There are so many of us.`;
        },
        defeat: "We are still counting.",
        defeatFn: (ctx) => ctx.clutch ? "We almost had you. We always almost have you." : ctx.fallen > 0 ? `We took ${ctx.fallenName}. We'll take more next time.` : ctx.deathless ? `Not a single one. Not even ${ctx.strongestName || "the weakest"}. The math says that shouldn't happen.` : "Fewer of us now. But never none. Never, ever none.",
        lore: "The math of extinction."
      },
      {
        id: "forgetting",
        name: "The Forgetting",
        icon: "\u{1F32B}\uFE0F",
        taunt: "What were their names? Say them. Quickly, now.",
        tauntFn: (ctx) => {
          const pf = ctx.prevFallen || [];
          const prevName = pf.length > 0 ? pf[0].name : null;
          if (prevName && ctx.totalDeaths > 5) return `${prevName}. You lost a ${prevName} once. Run ${pf[0].run || "?"}. You've lost ${ctx.totalDeaths} total. I remember every single one. Do you?`;
          if (prevName && pf.length > 2) return `${prevName}. ${pf[1]?.name}. ${pf[2]?.name}. I keep a list. It's longer than yours.`;
          return ctx.epithets > 3 ? `They have titles now. "the Marked." "the Devoted." Titles are the last thing I erase. They think a name will save them.` : ctx.fallen > 0 ? `What color were ${ctx.fallenName}'s eyes? What sound did they make when they slept? You're already forgetting. I don't have to do anything.` : ctx.colony > 18 ? `${ctx.colony} names. Say them. All of them. Without looking. You can't, can you?` : ctx.scarred > 2 ? `${ctx.scarredName} has scars. Which night did they get them? You don't remember. I'm already inside.` : ctx.bonded > 3 ? `${ctx.bondedName} bonded with someone. What were the exact words? What was the weather? Gone. The details go first.` : "All of them? Still? Let me fix that.";
        },
        defeat: "You remembered. This time.",
        defeatFn: (ctx) => ctx.clutch ? "One number between you and oblivion." : ctx.epithets > 3 ? "Titles. So many titles. But will anyone read them in a hundred years?" : ctx.deathless ? "Every name survived. Impressive. For now." : ctx.deathless ? "They'll remember this colony. I couldn't stop you. I've never failed before." : ctx.fallen > 2 ? "You'll tell people about the survivors. Not the fallen. That's how I work. Not with violence. With editing." : "You passed. I'll adapt. I always adapt.",
        lore: "The last enemy is not death. It is being forgotten."
      }
    ];
    const wins = meta?.stats?.w || 0;
    const FULL_BOSS_POOL = [...BOSSES, ...wins >= 3 || (meta?.heat || 0) >= 3 ? EXPANDED_BOSSES : []];
    const [slotSummaries, setSlotSummaries] = useState(null);
    const [showSlots, setShowSlots] = useState(false);
    const [importText, setImportText] = useState("");
    const [showImport, setShowImport] = useState(false);
    useEffect(() => {
      (async () => {
        await migrateLegacy();
        const slot = await loadSlotNum();
        const d = await loadS(slot);
        setMeta(d);
        _goldBorders = (d.achv || []).includes("legend_score");
        const r = await loadRun();
        setSavedRun(r);
      })();
    }, []);
    useEffect(() => {
      Audio.muted = muted;
    }, [muted]);
    useEffect(() => {
      if (ph === "playing" && hLeft > 0 && hand.length === 0 && draw.length === 0 && disc.length === 0) {
        const t = (() => {
          try {
            return eTgt();
          } catch (e) {
            return Infinity;
          }
        })();
        const timer = setTimeout(() => {
          if (hand.length > 0 || draw.length > 0 || disc.length > 0) return;
          if (rScore >= t) {
            showOF(rScore, t, hLeft);
          } else {
            toast("\u{1F480}", "No cats left to play.", "#ef4444");
            endRun(false, rScore);
          }
        }, 1e3);
        return () => clearTimeout(timer);
      }
      if (ph === "playing" && hand.length === 0 && (draw.length > 0 || disc.length > 0)) {
        const target = hs();
        const { drawn, nd, ndi } = drawN([...draw], [...disc], target);
        if (drawn.length > 0) {
          setHand(drawn);
          setDraw(nd);
          setDisc(ndi);
        }
      }
    }, [ph, hLeft, hand.length, draw.length, disc.length]);
    useEffect(() => {
      if (ph === "nightCard" && hand.length + draw.length > 0) {
        const snapshot = {
          ante,
          blind,
          hand,
          draw,
          fams: fams.map((f) => f.id),
          ferv,
          rMaxF,
          gold,
          fallen,
          handBests,
          runBonus,
          runLog,
          denNews,
          isNinthDawn,
          hearthDust,
          firstHandPlayed,
          firstDenUsed,
          tempMods,
          _cid,
          _nis
        };
        saveRun(snapshot);
      }
    }, [ph]);
    const autoRef = useRef(null);
    const [introStep, setIntroStep] = useState(0);
    function startAutoPlay() {
      if (!hand || hand.length === 0) return;
      const bc = {};
      hand.forEach((c) => {
        bc[c.breed] = (bc[c.breed] || 0) + 1;
      });
      const best = Object.entries(bc).sort((a, b) => b[1] - a[1]).find(([, v]) => v >= 2);
      const ids = [];
      if (best) hand.forEach((c) => {
        if (c.breed === best[0] && ids.length < 5) ids.push(c.id);
      });
      else {
        ids.push(hand[0].id);
        if (hand.length > 1) ids.push(hand[1].id);
      }
      if (ids.length === 0) return;
      const idxs = ids.map((id) => hand.findIndex((c) => c.id === id)).filter((i) => i >= 0);
      setAutoPlay({ step: -3, idxs });
    }
    function getMB() {
      if (!meta) return { gold: 0, hands: 0, discards: 0, freeRecruits: 0, fervor: 0, bloodMemory: 0, heirloom: 0, draftPower: 0, dustBonus: 0, scarMult: 0, startWard: 0, grudgeWisdom: 0, shelter: 0, draftSize: 0, traitLuck: 0, bondBoost: 0, nerveFloor: 0, bossHand: 0, recruitDiscount: 0, breedBoost: 0, startScroll: 0, doubleBench: 0, comboBoost: 0, extraDraft: 0, mythicChance: 0 };
      let b = { gold: 0, hands: 0, discards: 0, freeRecruits: 0, fervor: 0, bloodMemory: 0, heirloom: 0, draftPower: 0, dustBonus: 0, scarMult: 0, startWard: 0, grudgeWisdom: 0, shelter: 0, draftSize: 0, traitLuck: 0, bondBoost: 0, nerveFloor: 0, bossHand: 0, recruitDiscount: 0, breedBoost: 0, startScroll: 0, doubleBench: 0, comboBoost: 0, extraDraft: 0, mythicChance: 0 };
      MILESTONES.forEach((m) => {
        if (meta.cats.length >= m.req) Object.entries(m.bonus).forEach(([k, v]) => {
          b[k] = (b[k] || 0) + v;
        });
      });
      Object.entries(meta.ups || {}).forEach(([id, cnt]) => {
        const u = UPGRADES.find((x) => x.id === id);
        if (u) Object.entries(u.b).forEach(([k, v]) => {
          b[k] = (b[k] || 0) + v * cnt;
        });
      });
      if (meta.stats.disc) {
        const breeds = new Set(meta.stats.disc.map((d) => d.split("-")[0]));
        if (BK.every((b2) => breeds.has(b2))) b.gold += 2;
      }
      return b;
    }
    const hasRelic = (n) => !!(meta?.relics || []).includes(n);
    const hs = () => Math.max(4, BH + (cfx.hsMod || 0));
    const nerveFloor = () => Math.max(getMB().nerveFloor || 0, tempMods.nerveLock || 0);
    const eTgt = () => {
      let t = Math.round(getTarget(ante, blind, isFirstRun, longDark) * (cfx.tgtMult || 1) * getHeatMult(meta?.heat));
      if (blind === 2 && bossTraits.length > 0) {
        bossTraits.forEach((bt) => {
          if (bt.fx.tgtMult) t = Math.round(t * bt.fx.tgtMult);
        });
        const fadingTrait = bossTraits.find((bt) => bt.fx.fading);
        if (fadingTrait) t = Math.round(t * (1 + hLeft * 0.05));
        const bleedingTrait = bossTraits.find((bt) => bt.fx.bleeding);
        if (bleedingTrait) {
          const played = Math.max(0, 4 - hLeft);
          t = Math.round(t * (1 - played * 0.02));
        }
      }
      return t;
    };
    const allC = React.useMemo(() => {
      const raw = [...hand, ...draw, ...disc];
      const seen = new Set();
      return raw.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    }, [hand, draw, disc]);
    goldRef.current = gold;
    function logEvent(type, data) {
      setRunLog((l) => [...l, { type, data, ante, blind, t: Date.now() }]);
    }
    function genChronicle(won) {
      const deaths = runLog.filter((e) => e.type === "death");
      const fights = runLog.filter((e) => e.type === "fight");
      const bonds = runLog.filter((e) => e.type === "bond");
      const breeds = runLog.filter((e) => e.type === "breed");
      const grudges = runLog.filter((e) => e.type === "grudge");
      const reconciles = runLog.filter((e) => e.type === "reconcile");
      const hands = runLog.filter((e) => e.type === "hand");
      const bestHand = hands.length ? hands.reduce((a, b) => b.data.score > a.data.score ? b : a, hands[0]) : null;
      const worstHand = hands.length ? hands.reduce((a, b) => b.data.score < a.data.score ? b : a, hands[0]) : null;
      const mvpCat = [...allC].sort((a, b) => (b.stats?.bs || 0) - (a.stats?.bs || 0))[0];
      const mvpName = mvpCat ? mvpCat.name.split(" ")[0] : "someone";
      const totalScore = hands.reduce((s, e) => s + (e.data?.score || 0), 0);
      const epithetCats = [...allC].filter((c) => c.epithet);
      const scarredCats = [...allC].filter((c) => c.scarred);
      const hearthChildren = [...allC].filter((c) => c.hearthDescendant);
      const companion = [...allC].find((c) => c._hearthChild);
      const lines = [];
      const draftLine = runLog.find((e) => e.type === "draft");
      const draftNames = draftLine?.data?.picked || "three strangers";
      if (companion) {
        const compName = companion.name.split(" ")[0];
        if (ante <= 2) lines.push(`It lasted ${ante} night${ante > 1 ? "s" : ""}. ${compName} came back from the Hearth to lead them. It wasn't enough. ${draftNames} and ${allC.length + fallen.length - 1} others followed the legend into the dark, and the dark swallowed them whole.`);
        else lines.push(`Colony #${(meta?.stats?.r || 0) + 1} burned for ${ante} nights. ${compName} walked out of the Hearth to lead them. a legend among ${allC.length + fallen.length - 1} who had never seen a dawn. ${draftNames} stepped into the firelight beside them.`);
      } else {
        if (ante <= 2) lines.push(`It lasted ${ante} night${ante > 1 ? "s" : ""}. Not long enough for anyone to learn each other's names. ${draftNames} were the first into the dark, and the colony that formed around them never found its footing.`);
        else if (ante <= 3) lines.push(`Three nights. ${draftNames} and ${allC.length + fallen.length} others gathered around a fire nobody remembers lighting. By the second night they had a system. By the third, they had a story.`);
        else lines.push(`Colony #${(meta?.stats?.r || 0) + 1} burned for ${ante} nights. It began the way they all begin: ${draftNames} stepping into the firelight, and the dark pretending not to notice.`);
      }
      const mid = [];
      if (bestHand) {
        const bScore = bestHand.data.score.toLocaleString();
        const bType = bestHand.data.type;
        const bCats = bestHand.data.cats;
        if (bestHand.data.score >= 5e4) mid.push(`The hand that broke the pattern: ${bCats}, a ${bType} for ${bScore}. The dark doesn't forget numbers like that.`);
        else mid.push(`The hand they'll remember: ${bCats}, playing a ${bType} for ${bScore}.`);
      }
      if (worstHand && bestHand && worstHand.data.score < bestHand.data.score * 0.15 && hands.length > 3) {
        mid.push(`The hand they won't talk about: ${worstHand.data.score.toLocaleString()}. ${worstHand.data.cats || "Someone"} played into the silence and the silence won.`);
      }
      if (deaths.length > 0 && bonds.length > 0) {
        const dName = deaths[0].data.victim?.split(" ")[0] || "one";
        const bPair = bonds[0];
        mid.push(`${dName} fell in the den. That same night, ${bPair?.data?.c1?.split(" ")[0] || "two cats"} and ${bPair?.data?.c2?.split(" ")[0] || "another"} bonded. Grief and love run through the same dark.`);
      } else if (deaths.length > 0) {
        const dNames = deaths.map((d) => d.data.victim?.split(" ")[0] || "one");
        if (deaths.length === 1) mid.push(`${dNames[0]} didn't make it out of the den. The colony got quieter after that. Not weaker. Quieter.`);
        else mid.push(`${dNames.join(", ")}. ${deaths.length} names scratched off the wall. The colony stopped counting and started surviving.`);
      } else if (bonds.length > 0) {
        if (bonds.length >= 3) mid.push(`${bonds.length} pairs bonded over ${ante} nights. The colony stopped being survivors and became something with a pulse.`);
        else if (bonds.length === 1) mid.push(`${bonds[0].data.c1?.split(" ")[0]} and ${bonds[0].data.c2?.split(" ")[0]} bonded. Nobody announced it. They just started sleeping closer to the fire.`);
      }
      if (scarredCats.length >= 3) mid.push(`${scarredCats.length} cats carried scars by the end. ${scarredCats.slice(0, 2).map((c) => c.name.split(" ")[0]).join(" and ")} wore them like they meant something. They did.`);
      else if (scarredCats.length === 1) mid.push(`${scarredCats[0].name.split(" ")[0]} was hardened early and carried it the whole way. It never slowed them down. It never stopped burning either.`);
      if (grudges.length > 0 && reconciles.length > 0) mid.push(`${grudges.length} grudges cut the den in two. ${reconciles.length} healed. Forgiveness is its own kind of scoring.`);
      else if (grudges.length >= 2) mid.push(`${grudges.length} grudges. None forgiven. The colony survived the dark, but some nights the real enemy was inside.`);
      if (breeds.length >= 3) mid.push(`${breeds.length} kittens born in the dark. New life, impossibly small, in a world that had stopped believing in new things.`);
      else if (breeds.length === 1) mid.push(`One kitten. Born between Night ${breeds[0].ante || "?"}. The colony had something to protect now that wasn't just themselves.`);
      if (hearthChildren.length > 0) {
        const hcBest = hearthChildren.sort((a, b) => (b.stats?.bs || 0) - (a.stats?.bs || 0))[0];
        if (hcBest && hcBest.stats?.bs > 5e3) mid.push(`${hcBest.name.split(" ")[0]}, child of the Hearth, scored ${hcBest.stats.bs.toLocaleString()} in a single hand. The bloodline proved itself.`);
      }
      if (totalScore > 15e4) mid.push(`Combined output: ${totalScore.toLocaleString()}. The kind of number that makes you wonder if the dark was ever the threat, or just the audience.`);
      const neverPlayed2 = allC.filter((c) => (c.stats?.tp || 0) === 0);
      if (neverPlayed2.length >= 2) mid.push(`${neverPlayed2.map((c) => c.name.split(" ")[0]).join(" and ")} never played a hand. They watched everything from the bench. Whether that's safety or waste depends on who's telling the story.`);
      const elders = allC.filter((c) => isElder(c));
      if (elders.length >= 2) mid.push(`${elders.map((c) => c.name.split(" ")[0]).join(" and ")} played ${elders.reduce((s, c) => s + (c.stats?.tp || 0), 0)} hands between them. The colony's elders. The ones everyone followed.`);
      else if (elders.length === 1) mid.push(`${elders[0].name.split(" ")[0]} played ${elders[0].stats?.tp || 0} hands. More than anyone. The elder of the colony.`);
      if (mood < 25) mid.push("The colony was fraying by the end. Too many losses. Too many silences where names used to be.");
      else if (mood > 75) mid.push("Something rare happened in this colony. They liked each other. The bonds held. The mood held. The fire burned steady.");
      lines.push(mid.slice(0, 3).join(" "));
      if (won && fallen.length === 0) {
        const epithetRoll = epithetCats.length > 0 ? epithetCats.slice(0, 4).map((c) => `${c.name.split(" ")[0]} ${c.epithet}`).join(", ") : "";
        if (epithetRoll) lines.push(`All of them. Every single one walked out of night ${ante} and into a dawn that had no right to exist. ${epithetRoll}. Names that earned their titles. The fire burns because of what they did.`);
        else lines.push(`All of them. Every single one walked out of night ${ante}. ${mvpName} carried the colony, scoring ${mvpCat?.stats?.bs?.toLocaleString() || "more than anyone"}. Their names belong to the Hearth now.`);
      } else if (won) {
        const fallenNames = fallen.map((f) => f.name.split(" ")[0]).join(", ");
        const survivorEpithets = epithetCats.slice(0, 3).map((c) => `${c.name.split(" ")[0]} ${c.epithet}`).join(", ");
        lines.push(`${fallen.length} didn't make it. ${fallenNames}. The rest walked into the dawn carrying names that weren't their own.${survivorEpithets ? ` ${survivorEpithets}.` : ""} The real score was the number of names they refused to forget.`);
      } else {
        lines.push(`Night ${ante}. The numbers fell short and the dark moved in. ${fallen.length > 0 ? fallen.map((f) => f.name.split(" ")[0]).join(", ") + " went first. " : ""}The colony didn't scream. They'd already said everything worth saying. ${totalScore.toLocaleString()}. That's what they were worth. Remember it.`);
      }
      return lines;
    }
    function getDeckStats() {
      const cats = allC;
      const bc = {};
      const gc = { M: 0, F: 0 };
      let tp = 0, neg = 0, rare = 0, scarred = 0, bonded = 0;
      cats.forEach((c) => {
        bc[c.breed] = (bc[c.breed] || 0) + 1;
        gc[c.sex || "M"]++;
        tp += c.power;
        if ((c.trait || PLAIN).tier === "rare_neg") neg++;
        if ((c.trait || PLAIN).tier === "rare") rare++;
        if (c.scarred) scarred++;
        if (c.bondedTo) bonded++;
      });
      return { total: cats.length, bc, gc, avgPow: cats.length ? (tp / cats.length).toFixed(1) : "0", neg, rare, scarred, bonded: Math.floor(bonded / 2) };
    }
    function getNextTarget() {
      const nb = blind >= 2 ? 0 : blind + 1;
      const na = blind >= 2 ? ante + 1 : ante;
      if (blind >= 2 && ante >= MX) return null;
      const blindNames = ["Dusk", "Midnight", "The Boss"];
      return { ante: na, blind: nb, target: Math.round(getTarget(na, nb, isFirstRun, longDark)), blindName: blindNames[nb] || "Dusk" };
    }
    function drawN(dp, di, n) {
      let d = [...dp], ds = [...di];
      const r = [];
      for (let i = 0; i < n; i++) {
        if (!d.length && ds.length) {
          d = shuf(ds);
          ds = [];
          setReshuf(true);
          setTimeout(() => setReshuf(false), 500);
        }
        if (d.length) r.push(d.shift());
        else break;
      }
      return { drawn: r, nd: d, ndi: ds };
    }
    function updFerv(s, cs, ct, ch, hasGrudgeProve) {
      if (cfx.noNerve) return;
      setPFerv(ferv);
      const totalScore = cs + s;
      const handsAfter = ch - 1;
      if (totalScore >= ct) {
        const devNerve = getAllDevotionFx(devotion).nerveBoost || 0;
        const gain = Math.max(0, handsAfter) + (handsAfter > 0 ? devNerve : 0);
        if (gain > 0) {
          const nx = Math.min(NERVE_MAX, ferv + gain);
          setFerv(nx);
          setRMaxF((m) => Math.max(m, nx));
          setFFlash("up");
          Audio.nerveUp();
          if (ferv <= 1 && !seen.nerveExplain) {
            setSeen((s2) => ({ ...s2, nerveExplain: true }));
            setTimeout(() => toast("\u{1F525}", "Nerve up! Clear with fewer hands to build it faster.", "#fbbf24", 4500), 800);
          }
        }
      }
      setTimeout(() => setFFlash(null), 400);
    }
    function startGame() {
      clearRunSave();
      try {
        const today = (/* @__PURE__ */ new Date()).toDateString();
        const lastPlay = localStorage.getItem("nl_lastPlay");
        if (lastPlay !== today && meta) {
          localStorage.setItem("nl_lastPlay", today);
          setMeta((m) => {
            const nm = { ...m, dust: (m.dust || 0) + 2 };
            saveS(nm);
            return nm;
          });
          setTimeout(() => toast("\u{1F305}", "+2\u2726 stardust. The Hearth remembers you came back.", "#c084fc", 3e3), 1e3);
        }
      } catch (e) {
      }
      _cid = 0;
      _nis = Math.floor(Math.random() * CAT_NAMES.length);
      _un.clear();
      setBelovedNames(meta);
      const mb = getMB();
      const cats = [];
      const draftCount = 3 + (mb.extraDraft || 0);
      const strayCount = 18 - draftCount;
      const perSeason = Math.floor(strayCount / 4);
      const remainder = strayCount - perSeason * 4;
      const strayBreeds = [];
      for (let s = 0; s < 4; s++) for (let i = 0; i < perSeason; i++) strayBreeds.push(BK[s]);
      for (let i = 0; i < remainder; i++) strayBreeds.push(pk(BK));
      const shuffledBreeds = shuf(strayBreeds);
      const usedCombos = /* @__PURE__ */ new Set();
      for (let i = 0; i < strayCount; i++) {
        const sex = i % 2 === 0 ? "M" : "F";
        const breed = shuffledBreeds[i];
        let cat2 = gC({ sex, breed, trait: PLAIN });
        let key = `${cat2.breed}-${cat2.power}`;
        let attempts = 0;
        while (usedCombos.has(key) && attempts < 10) {
          cat2.power = Math.max(1, Math.min(9, cat2.power + (Math.random() < 0.5 ? 1 : -1)));
          key = `${cat2.breed}-${cat2.power}`;
          attempts++;
        }
        usedCombos.add(key);
        cats.push(cat2);
      }
      if (getHeatFx(meta?.heat).hexStart) {
        const hexTr = TRAITS.find((t) => t.name === "Cursed");
        cats[1] = gC({ trait: hexTr, name: "Cursed One" });
      }
      const baseCats = cats.slice(0, 15);
      setBloodMemMsg(null);
      if ((mb.bloodMemory || 0) > 0 && meta && meta.cats.length > 0) {
        const plainStarters = baseCats.filter((c) => (c.trait || PLAIN).name === "Plain");
        if (plainStarters.length > 0) {
          const heir = pk(plainStarters);
          const ancestor = pk(meta.cats);
          const ancestorTrait = TRAITS.find((t) => t.name === ancestor.trait?.name) || (ancestor.trait?.tier ? ancestor.trait : null);
          if (ancestorTrait && ancestorTrait.name !== "Plain") {
            heir.trait = ancestorTrait;
            if (ancestor.scarred) {
              heir.scarred = true;
            }
            heir.story = [`Inherited ${ancestorTrait.icon}${ancestorTrait.name} from ${ancestor.name.split(" ")[0]}`];
            setBloodMemMsg({ heir: heir.name, ancestor: ancestor.name.split(" ")[0], trait: ancestorTrait, scarred: !!ancestor.scarred });
          }
        }
      }
      const dp = mb.draftPower || 0;
      const hearthPrs = getHearthPairs(meta?.cats || []);
      const ninthStarBonus = (meta?.relics || []).includes(4) ? 1 : 0;
      const hearthBreeds = (meta?.cats || []).map((c) => c.breed).filter(Boolean);
      const waveSize = 3 + (mb.draftSize || 0);
      function genHearthWave(size) {
        const wave = [];
        const sortedPairs = [...hearthPrs].reverse();
        for (let i = 0; i < size; i++) {
          const pair = sortedPairs[i % sortedPairs.length];
          const child = genDescendant(meta.cats, dp + ninthStarBonus, pair);
          if (hearthPrs.length === 1 && i < 2 && pair[i]) {
            child.breed = pair[i].breed;
            child.name = gN(child.breed, child.trait);
          }
          child.power = clamp(child.power + 1, 3, 7);
          child._draftWave = "hearth";
          child.stats = { ...child.stats, tp: 3 };
          child.quirk = pk(QUIRKS[child.breed] || QUIRKS.Autumn);
          wave.push(child);
        }
        return wave;
      }
      function genRandomWave(size, breedWeighted) {
        const wave = [];
        for (let i = 0; i < size; i++) {
          const breed = breedWeighted && hearthBreeds.length > 0 ? pk(hearthBreeds) : pk(BK);
          const traitFn = mb.traitLuck ? () => {
            const r = Math.random();
            if (r < 0.55) return pk(RARE_TRAITS);
            return pk(COMMON_TRAITS);
          } : pickDraftTrait;
          const c = gC({ breed, trait: traitFn() });
          c.power = clamp(c.power + dp, 2, 6);
          c.name = gN(c.breed, c.trait);
          c.quirk = pk(QUIRKS[c.breed] || QUIRKS.Autumn);
          c.stats = { ...c.stats, tp: 3 };
          c._draftWave = "stranger";
          wave.push(c);
        }
        return wave;
      }
      let wave1, wave2;
      if (isDailyRun) {
        wave1 = genRandomWave(waveSize, false);
        wave2 = genRandomWave(waveSize, false);
      } else if (hearthPrs.length >= 2) {
        wave1 = genHearthWave(waveSize);
        wave2 = genHearthWave(waveSize);
      } else if (hearthPrs.length === 1) {
        wave1 = genHearthWave(waveSize);
        wave2 = genRandomWave(waveSize, true);
      } else {
        wave1 = genRandomWave(waveSize, false);
        wave2 = genRandomWave(waveSize, false);
      }
      const wave3 = hearthPrs.length >= 3 ? genHearthWave(waveSize) : genRandomWave(waveSize, hearthBreeds.length > 0);
      let allDraft = [...wave1, ...wave2, ...wave3];
      const prevFallen = meta?.allFallen || [];
      if (prevFallen.length > 0 && (meta?.stats?.r || 0) >= 3 && Math.random() < 0.03) {
        const ghost = prevFallen[Math.floor(Math.random() * Math.min(5, prevFallen.length))];
        const ghostCat = allDraft[Math.floor(Math.random() * allDraft.length)];
        if (ghostCat && ghost) {
          ghostCat.name = ghost.name + " " + gN(ghostCat.breed, ghostCat.trait).split(" ").slice(1).join(" ");
          ghostCat.name = ghost.name;
          ghostCat.breed = ghost.breed || ghostCat.breed;
          ghostCat.power = Math.max(1, ghostCat.power - 1);
          ghostCat._returned = true;
          ghostCat._draftVoice = "You remember me. I almost didn't come back.";
          ghostCat.name = gN(ghostCat.breed, ghostCat.trait);
          ghostCat.name = ghost.name;
        }
      }
      allDraft.forEach((c) => {
        if (c.hearthDescendant) return;
        if ((c.trait || PLAIN).tier === "mythic" || (c.trait || PLAIN).tier === "legendary") {
          c.trait = pk(RARE_TRAITS);
          c.name = gN(c.breed, c.trait);
        }
      });
      if (mb.mythicChance > 0 && !allDraft.some((c) => (c.trait || PLAIN).tier === "legendary")) {
        const cands = allDraft.filter((c) => !c.hearthDescendant && (c.trait || PLAIN).tier !== "legendary");
        if (cands.length > 0) {
          const pick = pk(cands);
          pick.trait = pk(LEGENDARY_TRAITS);
          pick.name = gN(pick.breed, pick.trait);
        }
      }
      if (!allDraft.some((c) => (c.trait || PLAIN).tier === "rare" || (c.trait || PLAIN).tier === "rare_neg")) {
        const cands = allDraft.filter((c) => (c.trait || PLAIN).name === "Plain" || (c.trait || PLAIN).tier === "common");
        if (cands.length > 0) {
          const pick = pk(cands);
          pick.trait = pk(RARE_TRAITS);
          pick.name = gN(pick.breed, pick.trait);
        }
      }
      function ensureVisualDiversity(wave) {
        if (wave.length < 3) return wave;
        const getType = (c) => {
          const allT2 = [c.trait, ...c.extraTraits || []].filter((t) => t && t.name !== "Plain");
          if (allT2.some((t) => t.tier === "mythic")) return "mythic";
          if (allT2.some((t) => t.tier === "legendary") && c.power >= 8) return "noble";
          if (allT2.some((t) => ["Scrapper", "Alpha"].includes(t.name))) return "alert";
          if (allT2.some((t) => ["Wild", "Chimera", "Feral", "Cursed"].includes(t.name))) return "wild";
          if (allT2.some((t) => ["Devoted", "Provider", "Seer", "Guardian"].includes(t.name))) return "gentle";
          if (allT2.some((t) => t.tier === "legendary")) return "noble";
          if (allT2.length > 0) return "alert";
          return "plain";
        };
        const types = wave.map(getType);
        const VARIETY_TRAITS = [
          { pool: RARE_TRAITS.filter((t) => ["Scrapper", "Guardian"].includes(t.name)), type: "alert" },
          { pool: COMMON_TRAITS.filter((t) => ["Devoted", "Provider", "Seer"].includes(t.name)), type: "gentle" },
          { pool: RARE_TRAITS.filter((t) => ["Cursed"].includes(t.name)), type: "wild" }
        ];
        for (let i = 1; i < wave.length; i++) {
          if (types.slice(0, i).includes(types[i])) {
            const vt = VARIETY_TRAITS.find((v) => v.type !== types[i] && v.pool.length > 0 && !types.slice(0, i).includes(v.type));
            if (vt && !wave[i].hearthDescendant) {
              wave[i].trait = pk(vt.pool);
              wave[i].name = gN(wave[i].breed, wave[i].trait);
              types[i] = vt.type;
            }
          }
        }
        return wave;
      }
      const pool1 = ensureVisualDiversity(allDraft.slice(0, waveSize));
      setDraftBase(baseCats);
      setDraftPool(pool1);
      setDraftPicked([]);
      setDraftRejects([]);
      setDraftReady(false);
      setTimeout(() => setDraftReady(true), 500);
      setDraftWaves([ensureVisualDiversity(allDraft.slice(waveSize, waveSize * 2)), ensureVisualDiversity(allDraft.slice(waveSize * 2, waveSize * 3))]);
      setDisc([]);
      setSel(/* @__PURE__ */ new Set());
      setAnte(1);
      setBlind(0);
      setRScore(0);
      setLastHandIds([]);
      setLastHandLost(false);
      setLastHandType(null);
      setEventHistory({});
      const hfx = getHeatFx(meta?.heat);
      setHLeft(3 + mb.hands + (hfx.handMod || 0));
      setDLeft(3 + mb.discards + (hfx.discMod || 0));
      setGold(3 + mb.gold);
      const dd = getDailyData();
      const dailyStreak = dd.streak || 0;
      const winStreak = meta?.stats?.streak || 0;
      if (dailyStreak >= 7) { setGold((g) => g + 2); setTimeout(() => toast("\u{1F525}", `7-day daily streak! +2\u{1F41F} bonus`, "#67e8f9", 2500), 1e3); }
      else if (dailyStreak >= 3) { setGold((g) => g + 1); setTimeout(() => toast("\u2600\uFE0F", `${dailyStreak}-day daily streak! +1\u{1F41F} bonus`, "#67e8f9", 2e3), 1e3); }
      if (winStreak >= 5) setTimeout(() => toast("\u{1F451}", `${winStreak} win streak! +${Math.min(10, winStreak)}\u2726 after this run`, "#fbbf24", 2500), 1500);
      const startNerve = (mb.fervor || 0) + ((meta?.relics || []).includes(5) ? 1 : 0);
      setFams([]);
      setFerv(startNerve);
      setPFerv(null);
      setFFlash(null);
      setRMaxF(startNerve);
      setBoss(BOSSES[0]);
      setSRes(null);
      setSStep(-1);
      setScoringDone(false);
      setHearthPair(null);
      setBossTraits([]);
      setIsNinthDawn(false);
      setDareBet(false);
      setCurses([]);
      setCfx({});
      setOData(null);
      setSellMode(false);
      setSellsLeft(2);
      const startWards = mb.startWard || 0;
      const startFams = [];
      if (startWards > 0) {
        for (let i = 0; i < startWards; i++) {
          const w = pk(FAMS.filter((f) => !startFams.find((o) => o.id === f.id)));
          if (w) startFams.push(w);
        }
      }
      setFams(startFams);
      setDen([]);
      setDenRes(null);
      setRunLog([]);
      setFallen([]);
      setAnteUp(null);
      setBossRewardChoices([]);
      prevRewardIdsRef.current = [];
      setRunBonus({ hands: 0 });
      setDenNews([]);
      setFirstHandPlayed(false);
      setScoringCats([]);
      setAftermath([]);
      setColEvent(null);
      setColTargets([]);
      setTempMods({ hands: 0, discs: 0, freeRecruits: 0, nerveLock: 0 });
      setEventDenSafe(false);
      setEventDenBonus(0);
      setBabyNamingQueue([]);
      setFirstDenUsed(false);
      fcSeenRef.current = {};
      setAutoPlay(null);
      setHtLevels({});
      setSScrolls([]);
      setDevotion({});
      setNightMod(null);
      setWeather(null);
      setRunChips(0);
      setRunMult(0);
      setScoreShake(0);
      setClutch(false);
      setNewBest(null);
      setHandDiscovery([]);
      setDefeatData(null);
      setRerollCount(0);
      if (meta && meta.cats.length > 0) {
        const dustBonus = getMB().dustBonus || 0;
        const heatMult = getHeatFx(meta?.heat).dustMult || 1;
        const hd = calcTotalHearthDust(meta.cats, dustBonus, heatMult);
        setHearthDust(hd.total);
        if (hd.total > 0) {
          const newDust = meta.dust + hd.total;
          const u = { ...meta, dust: newDust };
          setMeta(u);
          saveS(u);
          const canNow = UPGRADES.some((ug) => {
            const cur = u.ups?.[ug.id] || 0;
            const tierUnlocked = ug.tier <= 1 || ug.tier === 2 && u.stats.w >= 2 || ug.tier === 3 && u.stats.w >= 4 || ug.tier === 4 && u.stats.w >= 6;
            return tierUnlocked && cur < ug.max && newDust >= ug.cost;
          });
          if (canNow) setTimeout(() => toast("\u2726", "You can afford an upgrade. Check the Hearth.", "#c084fc", 3e3), 800);
        }
      } else {
        setHearthDust(0);
      }
      if (mb.startScroll > 0) {
        const scrollHT = pk(HT.filter((h) => !h.hidden));
        if (scrollHT) setHtLevels((prev) => ({ ...prev, [scrollHT.name]: (prev[scrollHT.name] || 1) + 1 }));
      }
      if (meta && meta.cats.length > 0 && meta.stats.r > 0 && !isDailyRun) {
        setHearthFlash(meta.cats);
        setPh("hearthFlash");
      } else {
        setPh("draft");
      }
    }
    function resumeRun(sr) {
      _cid = sr._cid || 100;
      _nis = sr._nis || sr._ni || 0;
      _un.clear();
      setBelovedNames(meta);
      const sanitizeCat = (c) => {
        if (!c) return c;
        if (!c.trait) c.trait = PLAIN;
        if (!c.extraTraits) c.extraTraits = [];
        if (!c.grudgedWith) c.grudgedWith = [];
        if (!c.stats) c.stats = { tp: 0, ts: 0, bs: 0, bh: "" };
        if (typeof c.trait.name === "string") {
          const found = TRAITS.find((t) => t.name === c.trait.name);
          if (found) c.trait = found;
        }
        c.extraTraits = c.extraTraits.map((et) => {
          if (typeof et.name === "string") {
            const found = TRAITS.find((t) => t.name === et.name);
            return found || et;
          }
          return et;
        });
        return c;
      };
      const sHand = (sr.hand || []).map(sanitizeCat);
      const sDraw = (sr.draw || []).map(sanitizeCat);
      [...sHand, ...sDraw, ...sr.fallen || []].forEach((c) => {
        if (c && c.name) {
          const fn = c.name.split(" ")[0];
          _un.add(fn);
        }
      });
      const mb = getMB();
      const hfx = getHeatFx(meta?.heat);
      setHand(sHand);
      setDraw(sDraw);
      setDisc([]);
      setSel(/* @__PURE__ */ new Set());
      setAnte(sr.ante);
      setBlind(sr.blind);
      setRScore(0);
      setFams((sr.fams || []).map((fid) => typeof fid === "string" ? FAMS.find((f) => f.id === fid) || { id: fid, name: "?", icon: "?", desc: "", eff: () => ({}) } : fid));
      setFerv(sr.ferv || 0);
      setPFerv(null);
      setFFlash(null);
      setRMaxF(sr.rMaxF || 0);
      setGold(sr.gold || 0);
      setFallen(sr.fallen || []);
      setHandBests(sr.handBests || {});
      setRunBonus(sr.runBonus || { hands: 0 });
      setRunLog(sr.runLog || []);
      setDenNews(sr.denNews || []);
      setIsNinthDawn(sr.isNinthDawn || false);
      setHearthDust(sr.hearthDust || 0);
      setFirstHandPlayed(sr.firstHandPlayed || false);
      setFirstDenUsed(sr.firstDenUsed || false);
      setTempMods(sr.tempMods || { hands: 0, discs: 0, freeRecruits: 0, nerveLock: 0 });
      setBoss(BOSSES[Math.min(sr.ante - 1, BOSSES.length - 1)]);
      setSRes(null);
      setSStep(-1);
      setScoringDone(false);
      setHearthPair(null);
      setBossTraits([]);
      setDareBet(false);
      setCurses([]);
      setCfx({});
      setOData(null);
      setSellMode(false);
      setSellsLeft(2);
      setDen([]);
      setDenRes(null);
      setScoringCats([]);
      setAftermath([]);
      setColEvent(null);
      setColTargets([]);
      setEventDenSafe(false);
      setEventDenBonus(0);
      setBabyNamingQueue([]);
      setRunChips(0);
      setRunMult(0);
      setScoreShake(0);
      setClutch(false);
      setNewBest(null);
      setDefeatData(null);
      setRerollCount(0);
      setBloodMemMsg(null);
      const resumeBase = (sr.blind || 0) === 2 ? 4 : 3;
      const bh = resumeBase + mb.hands + (hfx.handMod || 0) + (sr.runBonus?.hands || 0);
      const bd = 3 + mb.discards + (hfx.discMod || 0);
      setHLeft(bh);
      setDLeft(bd);
      setNightCard({ ante: sr.ante, blind: sr.blind });
      setPh("nightCard");
      setSavedRun(null);
      toast("\u{1F3E0}", "Colony restored. The fire still burns.", "#fbbf24");
    }
    function startDailyRun() {
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const dd = getDailyData();
      if (dd.lastDate === today && dd.played) {
        toast("\u{1F4C5}", "Already played today's Daily Colony. Come back tomorrow!", "#fbbf24", 3500);
        return;
      }
      startDailyRNG();
      setIsDailyRun(true);
      startGame();
    }
    function startNinthDawn() {
      startGame(null);
      setIsNinthDawn(true);
    }
    function pickDraft(i) {
      Audio.draftFlip(draftPicked.length);
      const cat2 = draftPool[i];
      const picked = [...draftPicked, cat2];
      const tn = (cat2.trait || PLAIN).name;
      const p = cat2.power;
      const draftNarr = tn !== "Plain" && (cat2.trait || {}).tier === "legendary" ? `${cat2.name.split(" ")[0]}. P${p}. You don't find cats like this. They find you.` : tn !== "Plain" && (cat2.trait || {}).tier === "rare" ? `${cat2.name.split(" ")[0]}. P${p} ${tn}. They came with a story already started.` : p >= 8 ? `${cat2.name.split(" ")[0]}. P${p}. The others step aside when this one walks past.` : p <= 3 ? `${cat2.name.split(" ")[0]}. P${p}. No power yet. Give them time.` : `${cat2.name.split(" ")[0]}. P${p}. Another name for the record.`;
      toast(BREEDS[cat2.breed].icon, draftNarr, BREEDS[cat2.breed].color);
      const rejects = [...draftRejects, ...draftPool.filter((_, j) => j !== i).map((c) => c.breed)];
      setDraftRejects(rejects);
      const maxPicks = 3 + (getMB().extraDraft || 0);
      const isFirstEverRun = !meta || meta.stats.r === 0;
      if (picked.length >= maxPicks) {
        setDraftPicked(picked);
        if (!isFirstEverRun && !isDailyRun) {
          const toName = picked.filter((c) => !c._hearthChild);
          if (toName.length > 0) {
            setBabyNamingQueue(toName.slice(1));
            setNamingCat(toName[0]);
            toName[toName.length - 1]._finalPick = true;
            setPh("naming");
          } else {
            finalizeDraft(picked);
          }
        } else {
          finalizeDraft(picked);
        }
      } else {
        setDraftPicked(picked);
        const waveIdx = picked.length - 1;
        const np = draftWaves[waveIdx] || Array.from({ length: 3 + (getMB().draftSize || 0) }, () => gC({ trait: pickDraftTrait() }));
        setDraftPool(np);
        setDraftReady(false);
        setTimeout(() => setDraftReady(true), 500);
        if (np[0]?._draftWave === "hearth" && np.some((c) => c._hearthParents)) {
          setTimeout(() => toast("\u{1F3E0}", "The bloodline continues. Their parents walked this path before them.", "#fbbf24", 3500), 400);
        }
      }
    }
    function finalizeDraft(picked) {
      const traitVal = (t) => t.tier === "mythic" ? 5 : t.tier === "legendary" ? 3 : t.tier === "rare" ? 2 : t.tier === "rare_neg" ? -1 : t.name === "Plain" ? 0 : 1;
      const draftStr = picked.reduce((s, c) => s + c.power + traitVal(c.trait || PLAIN), 0);
      const midpoint = 19;
      const raw = (midpoint - draftStr) / 4;
      const floatOffset = raw > 0 ? Math.min(2, raw * 0.5) : Math.max(-1.5, raw * 0.7);
      if (floatOffset !== 0) {
        const sign = floatOffset > 0 ? 1 : -1;
        const abs = Math.abs(floatOffset);
        const base = Math.floor(abs);
        const frac = abs - base;
        draftBase.forEach((c) => {
          const bonus = base + (Math.random() < frac ? 1 : 0);
          c.power = Math.max(1, Math.min(6, c.power + bonus * sign));
        });
      }
      const offset = Math.round(floatOffset);
      const all = shuf([...draftBase, ...picked]);
      setHand(all.slice(0, BH));
      setDraw(all.slice(BH));
      setColonyData({ chosen: picked, strays: draftBase, strayOffset: offset });
      setDraftPool([]);
      setDraftPicked([]);
      setDraftBase([]);
      logEvent("draft", { picked: picked.map((c) => c.name.split(" ")[0]).join(", "), rejects: draftRejects.length });
      if (!meta || meta.stats.r === 0) {
        setColonyData(null);
        setWeather({ season: pk(["Autumn", "Winter", "Spring", "Summer"]), night: 1 });
        setNightMod(null);
        setNightCard({ ante: 1, blind: 0 });
        setPh("nightCard");
        try { Audio.nightTransition(); } catch(e) {}
      } else {
        setPh("colonyFormed");
      }
      setTraitTip(null);
      setColStep(0);
    }
    function checkHandDiscovery(htName, comboName) {
      const discoveries = [];
      const ht = HT.find((h) => h.name === htName);
      if (ht && ht.hidden && !(meta?.stats?.dh || []).includes(htName)) discoveries.push(htName);
      if (comboName) {
        const pc = POWER_COMBOS.find((p) => p.name === comboName);
        if (pc && pc.hidden && !(meta?.stats?.dh || []).includes(comboName)) discoveries.push(comboName);
      }
      if (discoveries.length > 0) {
        setMeta((m) => {
          const nm = { ...m, stats: { ...m.stats, dh: [...m.stats.dh || [], ...discoveries] } };
          saveS(nm);
          return nm;
        });
        setHandDiscovery(discoveries);
        const label = discoveries.join(" + ");
        toast("\u2728", `SECRET ${discoveries.length > 1 ? "COMBOS" : "COMBO"} DISCOVERED: ${label}!`, "#c084fc");
        Audio.tierReveal(4);
        discoveries.forEach((d, i) => {
          const def = POWER_COMBOS.find((p) => p.name === d) || HT.find((h) => h.name === d);
          if (def && def.ex) {
            setTimeout(() => toast("\u{1F4A1}", `${d}: ${def.ex}. Look for it again.`, "#c084fc", 5e3), 2e3 + i * 1500);
          }
        });
      }
    }
    function advanceFromScoring() {
      if (!scoringDone || !sRes) return;
      if (advancingRef.current) return;
      advancingRef.current = true;
      try {
        if (autoPlay) {
          setAutoPlay(null);
          setGuide({ step: 2, msg: "" });
        }
        const result = sRes;
        const cats = scoringCats;
        const tgt2 = eTgt();
        const ns = rScore + result.total;
        setRScore(ns);
        setGold((g) => Math.max(0, g + result.bG));
        if (result.ht) {
          setHtLevels((prev) => {
            const cur = prev[result.ht] || 1;
            const xpNeeded = cur * 3;
            const xpKey = result.ht + "_xp";
            const curXp = (prev[xpKey] || 0) + 1;
            if (curXp >= xpNeeded) {
              setDenNews((n) => [...n, { icon: "\u{1F4DC}", text: `${result.ht} \u2192 Lv${cur + 1}!`, color: "#fbbf24" }]);
              return { ...prev, [result.ht]: cur + 1, [xpKey]: 0 };
            }
            return { ...prev, [xpKey]: curXp };
          });
        }
        if (result.ht && meta) {
          setMeta((m) => {
            const hp = { ...m.stats.handTypePlays || {} };
            hp[result.ht] = (hp[result.ht] || 0) + 1;
            const codex = [...m.codex || []];
            let codexNew = 0;
            cats.forEach((c) => {
              const tn = (c.trait || PLAIN).name;
              const key = `${c.breed}-${tn}`;
              if (!codex.includes(key)) { codex.push(key); codexNew++; }
            });
            if (codexNew > 0) setTimeout(() => toast("\u{1F4D6}", `Codex: ${codexNew} new entr${codexNew === 1 ? "y" : "ies"} discovered! (${codex.length} total)`, "#c084fc", 2500), 400);
            return { ...m, stats: { ...m.stats, handTypePlays: hp }, codex };
          });
        }
        setDevotion((prev) => {
          const next = { ...prev };
          cats.forEach((c) => {
            next[c.breed] = (next[c.breed] || 0) + 1;
          });
          Object.keys(DEVOTION_MILESTONES).forEach((breed) => {
            const oldCount = prev[breed] || 0;
            const newCount = next[breed] || 0;
            const ms = DEVOTION_MILESTONES[breed] || [];
            ms.forEach((m) => {
              if (oldCount < m.at && newCount >= m.at) {
                const icon = breed === "Mixed" ? "\u{1F308}" : BREEDS[breed]?.icon || "\u2726";
                const color = breed === "Mixed" ? "#e8e6e3" : BREEDS[breed]?.color || "#fbbf24";
                setDenNews((n) => [...n, { icon, text: `${m.name}: ${m.desc}`, color }]);
                if (m.at === 10 && BREEDS[breed]?.lore) {
                  setTimeout(() => toast(icon, BREEDS[breed].lore, color + "aa", 4e3), 1200);
                }
              }
            });
          });
          return next;
        });
        setLastHandIds(cats.map((c) => c.id));
        const remainNeeded = Math.max(0, tgt2 - rScore);
        const perHandPace = hLeft > 0 ? remainNeeded / hLeft : remainNeeded;
        setLastHandLost(result.total < perHandPace * 0.5);
        setLastHandType(result.ht || null);
        updFerv(result.total, rScore, tgt2, hLeft, result.hasGrudgeProve);
        if (dareBet) {
          if (result.total >= tgt2 * 0.5) {
            setFerv((f) => Math.min(NERVE_MAX, f + 6));
            toast("\u{1F525}", "THE DARE IS MET. +6 Nerve!", "#fbbf24");
          } else {
            toast("\u{1F480}", "The dare... failed. The number stares back.", "#ef4444");
          }
          setDareBet(false);
        }
        logEvent("hand", { score: result.total, type: result.ht, cats: cats.map((c) => c.name.split(" ")[0]).join(", "), nerve: NERVE[ferv].name });
        if (isFirstRun && ante === 1 && blind === 0 && !autoPlay && !firstHandPlayed) {
          const matched = result.ht && ["Kin", "Clowder", "Colony", "Litter", "Full Den", "Two Kin"].includes(result.ht);
          setTimeout(() => {
            if (matched) toast("\u2726", "Same-season cats score much higher together. Keep matching!", "#fbbf24", 4e3);
            else toast("\u2726", "Try picking cats of the same season. They score much better together.", "#fbbf24", 4e3);
          }, 800);
        }
        if (isFirstRun && !autoPlay && firstHandPlayed) {
          const handNum = (seen.earlyHands || 0) + 1;
          setSeen((s) => ({ ...s, earlyHands: (s.earlyHands || 0) + 1 }));
          if (handNum === 1) {
            const topCat = cats.sort((a, b) => b.power - a.power)[0];
            if (result.total > 1500) setTimeout(() => toast("\u{1F4AA}", `${topCat?.name.split(" ")[0] || "Nice"} carried that one. ${result.total.toLocaleString()} scored.`, "#4ade80", 3e3), 600);
            else setTimeout(() => toast("\u{1F4A1}", "Try selecting more cats of the same season for a bigger score.", "#fbbf24aa", 3e3), 600);
          } else if (handNum === 2 && ns >= tgt2) {
            setTimeout(() => toast("\u{1F389}", "Target cleared! The colony survived this round.", "#4ade80", 3e3), 600);
          }
        }
        if (tgt2 > 0 && result.total >= tgt2 * 5) {
          const thunderCat = cats.sort((a, b) => b.power - a.power)[0];
          if (thunderCat) assignEpithet(thunderCat, { thunder: true });
        }
        const catMods = {};
        cats.forEach((c) => {
          if (catHas(c, "Eternal") && !c.injured) {
            catMods[c.id] = { ...(catMods[c.id] || {}), injured: true, injuryTimer: 1 };
            if (c.stats.tp >= 2) toast("\u2728", `${c.name.split(" ")[0]} is exhausted. The Eternal burns bright, then rests.`, "#c084fc88", 2500);
          }
          const wasKitten = catIsKitten(c);
          c.stats.tp++;
          c.stats.ts += result.total;
          const wasPB = c.stats.bs;
          if (result.total > c.stats.bs) {
            c.stats.bs = result.total;
            c.stats.bh = result.ht;
            if (c.stats.tp >= 3 && result.total > wasPB * 1.3) {
              const fn = c.name.split(" ")[0];
              setDenNews((n) => [...n, { icon: "\u{1F3C6}", text: `${fn}: new personal best! ${result.total.toLocaleString()}`, color: BREEDS[c.breed]?.color || "#fbbf24" }]);
            }
          }
          if (wasKitten) {
            const fn = c.name.split(" ")[0];
            const hasTrait = c.trait && c.trait.name !== "Plain";
            setDenNews((n) => [...n, { icon: "\u{1F43E}", text: `${fn} grew up!${hasTrait ? " " + c.trait.icon + " " + c.trait.name + " awakens." : ""}`, color: BREEDS[c.breed]?.color || "#fbbf24" }]);
            c._grewUp = true;
            assignEpithet(c);
            Audio.kittenGrow();
            if (c.epithetKey === "grownUp") {
              catMods[c.id] = { ...(catMods[c.id] || {}), power: c.power, epithet: c.epithet, epithetKey: c.epithetKey, _grewUp: true };
              setDenNews((n) => [...n, { icon: "\u{1F3F7}\uFE0F", text: `${fn} earned: "${c.epithet}" (+2 Power)`, color: "#fbbf24" }]);
            }
          }
        });
        const applyCatMods = (c) => catMods[c.id] ? { ...c, ...catMods[c.id] } : c;
        const pIds = new Set(cats.map((c) => c.id));
        const rem = hand.filter((c) => !pIds.has(c.id)).map(applyCatMods);
        const nDisc = [...disc, ...cats.map(applyCatMods)];
        const target = hs();
        const need = target - rem.length;
        if (need > 0) {
          const { drawn, nd, ndi } = drawN(draw, nDisc, need);
          setHand([...rem, ...drawn]);
          setDraw(nd);
          setDisc(ndi);
        } else {
          setHand(rem);
          setDraw(draw);
          setDisc(nDisc);
        }
        setSel(/* @__PURE__ */ new Set());
        setHLeft((h) => h - 1);
        setRecruitsThisHand(0);
        const handsAfter = hLeft - 1;
        if (ns >= tgt2) {
          setMood((m) => Math.min(100, m + 1));
          if (blind === 2) {
            Audio.bossClear(); Haptic.double();
            setMood((m) => Math.min(100, m + 5));
            if (ante >= 3) {
              const topCat = cats.sort((a, b) => (b.stats?.bs || 0) - (a.stats?.bs || 0))[0];
              if (topCat) assignEpithet(topCat, { bossNight: true, ante });
            }
            const decisive = cats.sort((a, b) => b.power - a.power)[0];
            if (decisive && handsAfter >= 0) assignEpithet(decisive, { decisive: true });
            [...cats].forEach((c) => {
              if (c.epithet) {
                if (c._newEpithet) {
                  delete c._newEpithet;
                  c._bossEpithet = true;
                }
                [setHand, setDraw, setDisc].forEach((s) => {
                  s((arr) => arr.map((x) => x.id === c.id ? { ...x, epithet: c.epithet, epithetKey: c.epithetKey, _bossEpithet: c._bossEpithet } : x));
                });
              }
            });
          }
          if (handsAfter <= 0) {
            setClutch(true);
            Audio.clutchWin();
          }
          const isBossClear = blind === 2;
          if (isBossClear && ante >= MX) {
            const bonusDust = Math.floor(gold / 5);
            if (bonusDust > 0 && meta) {
              setMeta((m) => {
                const nm = { ...m, dust: (m.dust || 0) + bonusDust };
                saveS(nm);
                return nm;
              });
              setTimeout(() => toast("\u2726", `${bonusDust}\u2726 stardust from leftover rations`, "#c084fc", 3e3), 1200);
            }
            setTimeout(() => {
              setClutch(false);
              endRun(true, ns);
            }, 1800);
          } else if (isBossClear) {
            setTimeout(() => {
              setClutch(false);
              showOF(ns, tgt2, handsAfter);
            }, 1800);
          } else {
            setClutch(false);
            showOF(ns, tgt2, handsAfter);
          }
        } else if (handsAfter <= 0) {
          endRun(false, ns);
        } else {
          const shouldInjure = blind === 2 && (ante >= 2 || isFirstRun && ante === 1) && !injuredThisBlind.current;
          if (shouldInjure) {
            injuredThisBlind.current = true;
            const allC2 = [...hand, ...draw, ...disc];
            const eligible = allC2.filter((c) => !c.injured);
            if (eligible.length > 0) {
              const victim = pk(eligible);
              setMood((m) => Math.max(0, m - 5));
              const isBloodied = bossTraits.some((bt) => bt.fx.bloodied);
              if (isBloodied) {
                [setHand, setDraw, setDisc].forEach((s) => {
                  s((arr) => arr.map((x) => x.id === victim.id ? { ...x, scarred: true, _hardenedNight: x._hardenedNight || ante, story: [...(x.story || []).slice(-3), `Hardened by ${boss?.name || "boss"} N${ante}`] } : x));
                });
                toast("\u{1FA79}", `${victim.name.split(" ")[0]} was hardened by ${boss?.name || "the boss"}!`, "#ef4444");
                victim.scarred = true;
                assignEpithet(victim);
                if (victim._newEpithet) {
                  delete victim._newEpithet;
                  setTimeout(() => {
                    toast("\u{1F3F7}\uFE0F", epithetToastMsg(victim), BREEDS[victim.breed]?.color || "#fbbf24", 3e3);
                    Audio.epithetEarned();
                  }, 1500);
                }
                [setHand, setDraw, setDisc].forEach((s) => {
                  s((arr) => arr.map((x) => x.id === victim.id ? { ...x, epithet: victim.epithet, epithetKey: victim.epithetKey } : x));
                });
              } else {
                [setHand, setDraw, setDisc].forEach((s) => {
                  s((arr) => arr.map((x) => x.id === victim.id ? { ...x, injured: true, injuryTimer: 2, power: Math.max(1, x.power), stats: { ...x.stats, injuries: (x.stats?.injuries || 0) + 1 }, story: [...(x.story || []).slice(-3), `Injured by ${boss?.name || "boss"} N${ante}`] } : x));
                });
                victim.stats = { ...victim.stats, injuries: (victim.stats?.injuries || 0) + 1 };
                assignEpithet(victim);
                toast("\u{1F480}", `${victim.name.split(" ")[0]} was injured by ${boss?.name || "the boss"}!`, "#ef4444");
                setInjuredFlash(victim.id);
                setTimeout(() => setInjuredFlash(null), 2500);
                if (isFirstRun && !seen.injury) {
                  setSeen((s) => ({ ...s, injury: true }));
                  setTimeout(() => toast("\u{1F4A1}", "Injured cats score half. Leave them unplayed \u2014 they still help from the bench. Camp heals them.", "#ef4444", 6e3), 2e3);
                }
                if (victim._newEpithet) {
                  delete victim._newEpithet;
                  setTimeout(() => {
                    toast("\u{1F3F7}\uFE0F", epithetToastMsg(victim), BREEDS[victim.breed]?.color || "#fbbf24", 3e3);
                    Audio.epithetEarned();
                  }, 1500);
                }
                [setHand, setDraw, setDisc].forEach((s) => {
                  s((arr) => arr.map((x) => x.id === victim.id ? { ...x, epithet: victim.epithet, epithetKey: victim.epithetKey } : x));
                });
              }
            }
          }
          setRunChips(0);
          setRunMult(0);
          setNewBest(null);
          setScoringDone(false);
          setSRes(null);
          setSStep(-1);
          setPh("playing");
        }
        advancingRef.current = false;
      } catch (e) {
        console.error("advanceFromScoring error:", e);
        advancingRef.current = false;
        setRunChips(0);
        setRunMult(0);
        setNewBest(null);
        setScoringDone(false);
        setSRes(null);
        setSStep(-1);
        toast("\u26A0", "Something went wrong. Try playing again.", "#ef4444");
        setPh("playing");
      }
    }
    function skipScoring() {
      if (scoringDone || !sRes || !scoreEndRef.current) return;
      if (stRef.current) clearTimeout(stRef.current);
      const end = scoreEndRef.current;
      setSStep(sRes.bd.length - 1);
      setRunChips(end.chips);
      setRunMult(end.mult);
      setScoreShake(end.shk);
      setTimeout(() => setScoreShake(0), 400 + end.shk * 100);
      const prev = handBests[end.ht] || 0;
      if (end.total > prev) {
        setHandBests((b) => ({ ...b, [end.ht]: end.total }));
        setNewBest(end.ht);
      }
      checkHandDiscovery(end.ht, end.combo);
      setAftermath(end.aft);
      setScoringDone(true);
      if (!autoPlay && guide && guide.step === 2) setTimeout(() => setGuide((g) => g && g.step === 2 ? { ...g, step: 3 } : g), 4e3);
    }
    const toggleS = (i) => {
      if (ph !== "playing" || autoPlay) return;
      Audio.cardSelect(); Haptic.light();
      const s = new Set(sel);
      if (s.has(i)) s.delete(i);
      else if (s.size < 5) s.add(i);
      setSel(s);
      if (guide && guide.step === 0 && s.size >= 2) {
        const sc = [...s].map((j) => hand[j]).filter(Boolean);
        const bc = {};
        sc.forEach((c) => {
          bc[c.breed] = (bc[c.breed] || 0) + 1;
        });
        if (Object.values(bc).some((v) => v >= 2)) setGuide((g) => ({ ...g, step: 1 }));
      }
    };
    function playH() {
      if (!sel.size || hLeft <= 0) return;
      if (actionLock.current) return;
      actionLock.current = true;
      undoRef.current = null;
      Audio.cardPlay(); Haptic.medium();
      setDenNews([]);
      if (guide && guide.step <= 1) setGuide((g) => ({ ...g, step: 2 }));
      setFirstHandPlayed(true);
      const cats = [...sel].map((i) => hand[i]).filter(Boolean);
      cats.forEach((c) => {
        if (c._mateDied && !c._griefAcknowledged) {
          const mn = fallen.find((f) => true)?.name?.split(" ")[0];
          const mateCat = allC.find((x) => x.id === c.bondedTo);
          const mateName = mateCat?.name?.split(" ")[0] || mn || "their mate";
          toast("\u{1F494}", `${c.name.split(" ")[0]} plays for the first time since ${mateName}. Slower. Heavier. But they play.`, "#f472b6", 3e3);
          c._griefAcknowledged = true;
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === c.id ? { ...x, _griefAcknowledged: true } : x));
          });
        }
      });
      setScoringCats(cats);
      setAftermath([]);
      const beatingPace = rScore >= eTgt() * 0.4;
      const activeBT = blind === 2 ? bossTraits : [];
      const result = calcScore(cats, fams, ferv, cfx, { gold, deckSize: allC.length, discSize: disc.length, handSize: hs(), beatingPace, bossTraitFx: activeBT, scarMult: getMB().scarMult || 0, grudgeWisdom: getMB().grudgeWisdom || 0, hasMastery: !!getMB().xp, bondBoost: getMB().bondBoost || 0, comboBoost: getMB().comboBoost || 0, doubleBench: getMB().doubleBench || 0, kindredMult: tempMods.kindredMult || 0, weatherSeason: weather?.season || null, nightModFx: nightMod?.fx || {}, lastHandIds, lastHandLost, lastHandType, htLevels, devotion, bench: hand.filter((c) => !cats.find((x) => x.id === c.id)) });
      advancingRef.current = false;
      actionLock.current = false;
      setSRes(result);
      setSStep(-1);
      setPh("scoring");
      setRunChips(0);
      setRunMult(0);
      setNewBest(null);
      let rC = 0, rM = 0;
      const stepTotals = result.bd.map((s) => {
        rC += s.chips || 0;
        rM += s.mult || 0;
        if (s.xMult) rM = Math.round(rM * s.xMult);
        const total = Math.max(0, rC) * Math.max(1, rM);
        return { chips: Math.max(0, rC), mult: Math.max(1, rM), total };
      });
      const curTgt = tgt - rScore;
      let thresholdStep = -1;
      for (let i = 0; i < stepTotals.length; i++) {
        if (stepTotals[i].total >= curTgt && (i === 0 || stepTotals[i - 1].total < curTgt)) {
          thresholdStep = i;
          break;
        }
      }
      let step = 0;
      const tot = result.bd.length;
      if (stRef.current) clearTimeout(stRef.current);
      const aft = [];
      cats.forEach((c) => {
        if (result.total > c.stats.bs) aft.push({ icon: "\u{1F3C6}", text: `${c.name.split(" ")[0]} PB: ${result.total.toLocaleString()}`, color: "#fbbf24" });
      });
      const bondedInHand = cats.filter((c) => c.bondedTo && cats.find((x) => x.id === c.bondedTo));
      if (bondedInHand.length >= 2) aft.push({ icon: "\u{1F495}", text: `${bondedInHand[0].name.split(" ")[0]} & ${bondedInHand[1].name.split(" ")[0]}: Together`, color: "#f472b6" });
      const isFirstCascade = isFirstRun && ante === 1 && blind === 0 && !firstHandPlayed;
      scoreEndRef.current = { chips: result.chips, mult: result.mult, total: result.total, ht: result.ht, combo: result.combo, aft, shk: getShakeIntensity(result.total), isFirstCascade, stepTotals };
      function getStepDelay(s, total) {
        const slowMult = isFirstCascade ? 1.8 : meta && meta.stats.r <= 1 ? 1.4 : meta && meta.stats.r <= 4 ? 1.2 : meta && meta.stats.r >= 8 ? 0.8 : 1;
        const tempo = Math.max(0.5, Math.min(1.4, 7 / total));
        const step2 = result.bd[s];
        const isLast = s === total - 1;
        const isPenult = s === total - 2;
        const isNeg = step2 && (step2.mult < 0 || step2.type === "curse" || step2.type === "grudge_tension");
        const hasX = step2 && !!step2.xMult;
        const isNerve = step2 && step2.type === "nerve";
        const isCombo = step2 && step2.type === "combo";
        const isBond = step2 && (step2.type === "bond" || step2.type === "grudge_tension");
        const isBigCat = step2 && step2.isBigCat;
        const isThreshold = s === thresholdStep;
        if (isNeg) return Math.round(180 * tempo * slowMult);
        if (isThreshold && !hasX) return Math.round(Math.max(700, 900 * Math.max(0.7, tempo)) * slowMult);
        if (hasX) return Math.round(Math.max(700, 950 * Math.max(0.7, tempo)) * slowMult);
        if (isNerve) return Math.round(Math.max(600, 800 * Math.max(0.7, tempo)) * slowMult);
        if (isBond) return Math.round(Math.max(550, 720 * tempo) * slowMult);
        if (isPenult) return Math.round(Math.max(450, 600 * tempo) * slowMult);
        if (isLast) return Math.round(Math.max(550, 750 * tempo) * slowMult);
        if (s === 0) return Math.round(1100 * tempo * slowMult);
        if (isCombo) return Math.round(Math.max(900, 1e3 * tempo) * slowMult);
        if (isBigCat) return Math.round(Math.max(350, 480 * tempo) * slowMult);
        if (s === 1) return Math.round(420 * tempo * slowMult);
        if (s <= 3) return Math.round(380 * tempo * slowMult);
        const cascade = Math.max(160, Math.round((300 - s * 10) * tempo));
        return Math.round(cascade * slowMult);
      }
      function animStep() {
        step++;
        if (step < tot) {
          setSStep(step);
          setRunChips(stepTotals[step].chips);
          setRunMult(stepTotals[step].mult);
          const progress = curTgt > 0 ? stepTotals[step].total / curTgt : 0;
          const prevTotal = step > 0 ? stepTotals[step - 1].total : 0;
          const jumpPct = prevTotal > 0 ? (stepTotals[step].total - prevTotal) / prevTotal : 0;
          if (step === thresholdStep) {
            Audio.thresholdCross(); Haptic.threshold();
            setScoreShake(5);
            setScoringFlash("#4ade80");
            setTimeout(() => {
              setScoreShake(0);
              setScoringFlash(null);
            }, 500);
          }
          const s = result.bd[step];
          const prevTier = step > 0 ? getScoreTier(stepTotals[step - 1].total) : null;
          const curTier = getScoreTier(stepTotals[step].total);
          if (curTier && (!prevTier || curTier.label !== prevTier.label)) {
            setScoreShake(1);
            setTimeout(() => setScoreShake(0), 200);
          }
          if (!s?.xMult && step !== thresholdStep) {
            const magnitude = stepTotals[step].total > 1e4 ? 2 : 1;
            setScoreShake(magnitude);
            setTimeout(() => setScoreShake(0), 100);
          }
          if (s) {
            if (s.xMult) {
              Audio.xMultSlam(s.xMult); Haptic.heavy();
              setScoreShake(Math.ceil(s.xMult));
              setTimeout(() => setScoreShake(0), 300);
              setScoringFlash(s.xMult >= 1.5 ? "#fef08a" : "#fbbf24");
              setTimeout(() => setScoringFlash(null), 150);
              setMultPop({ val: s.xMult, label: s.label, mode: "xmult" });
              setTimeout(() => setMultPop(null), 1200);
            } else if (s.type === "hand") {
              const htIdx = HT.findIndex((h) => s.label.startsWith(h.name));
              const shk = htIdx >= 6 ? 4 : htIdx >= 4 ? 3 : htIdx >= 2 ? 2 : 1;
              Audio.comboHit();
              setScoringFlash(htIdx >= 4 ? "#fef08a" : "#fbbf24");
              setScoreShake(shk);
              setTimeout(() => {
                setScoreShake(0);
                setScoringFlash(null);
              }, 200 + shk * 50);
            } else if (s.type === "combo") {
              Audio.comboHit();
              setScoreShake(3);
              setScoringFlash("#c084fc");
              setTimeout(() => {
                setScoreShake(0);
                setScoringFlash(null);
              }, 300);
            } else if (s.type === "grudge_tension") {
              Audio.grudgeTense();
              setScoringFlash("#ef4444");
              setTimeout(() => setScoringFlash(null), 200);
              setScoreShake(2);
              setTimeout(() => setScoreShake(0), 300);
            } else if (s.type === "curse" || s.mult < 0) {
              setScoringFlash("#ef4444");
              setTimeout(() => setScoringFlash(null), 200);
            } else if (s.type === "bond" || s.type === "lineage") Audio.bondChime();
            else if (s.isBigCat) Audio.bigCatHit(progress);
            else if (s.mult > 0) Audio.multHit(s.mult, progress);
            else if (s.chips > 0) Audio.chipUp(s.chips, progress); Haptic.cascade();
            Audio.stepTick(progress);
          }
          stRef.current = setTimeout(animStep, getStepDelay(step, tot));
        } else {
          const end = scoreEndRef.current;
          setRunChips(end.chips);
          setRunMult(end.mult);
          setScoreShake(end.shk);
          setTimeout(() => setScoreShake(0), 400 + end.shk * 100);
          const prev = handBests[end.ht] || 0;
          if (end.total > prev) {
            setHandBests((b) => ({ ...b, [end.ht]: end.total }));
            setNewBest(end.ht);
          }
          checkHandDiscovery(end.ht, end.combo);
          setAftermath(end.aft);
          setScoringDone(true);
          if (!autoPlay && guide && guide.step === 2) setTimeout(() => setGuide((g) => g && g.step === 2 ? { ...g, step: 3 } : g), 4e3);
          const tier = getScoreTier(end.total);
          if (tier && tier.label) Audio.tierReveal(Math.min(5, Math.floor(end.total / 5e3)));
        }
      }
      stRef.current = setTimeout(() => {
        {
          const _hti = HT.findIndex((h) => h.name === result.ht);
          Audio.handType(Math.min(3, Math.floor((_hti >= 0 ? _hti : 4) / 2)));
        }
        setSStep(0);
        setRunChips(scoreEndRef.current.stepTotals[0].chips);
        setRunMult(scoreEndRef.current.stepTotals[0].mult);
        stRef.current = setTimeout(animStep, getStepDelay(0, tot));
      }, 800);
    }
    const MAX_DISCARD = 3;
    function discardH() {
      if (!sel.size || dLeft <= 0 || cfx.noDisc) return;
      if (sel.size > MAX_DISCARD) {
        toast("\u267B\uFE0F", `Max ${MAX_DISCARD} cards per discard`, "#ef4444");
        return;
      }
      undoRef.current = { hand: [...hand], draw: [...draw], disc: [...disc], sel: new Set(sel), dLeft, gold, ferv, mood, hLeft };
      if (actionLock.current) { undoRef.current = null; return; }
      actionLock.current = true;
      requestAnimationFrame(() => {
        actionLock.current = false;
      });
      Audio.discard(); Haptic.light();
      const d = [...sel].map((i) => hand[i]).filter(Boolean);
      const rem = hand.filter((_, i) => !sel.has(i));
      if (d.length > 0) {
        const dc = d[0];
        const dn = dc.name.split(" ")[0];
        const mateInHand = dc.bondedTo && rem.find((c) => c.id === dc.bondedTo);
        const isKitten = catIsKitten(dc);
        const isMvp = [...hand, ...draw, ...disc].sort((a, b) => (b.stats?.tp || 0) - (a.stats?.tp || 0))[0]?.id === dc.id;
        if (mateInHand) setMood((m) => Math.max(0, m - 1));
        else if (isMvp && (dc.stats?.tp || 0) > 5) setMood((m) => Math.max(0, m - 1));
        else if (isKitten) setMood((m) => Math.max(0, m - 1));
        if (Math.random() < 0.15) {
          const whisper = mateInHand ? `${mateInHand.name.split(" ")[0]} watches ${dn} go.` : isKitten ? `${dn} never got a chance.` : isMvp && (dc.stats?.tp || 0) > 5 ? `The colony's most played cat. Discarded.` : dc.epithet ? `${dn} ${dc.epithet}. Sent to the bottom of the pile.` : null;
          if (whisper) toast("", whisper, "#ffffff66", 2e3);
        }
      }
      let extraDraw = [];
      let healIds = [];
      let powerUps = {};
      let nerveDelta = 0;
      let goldDelta = 0;
      let handDelta = 0;
      let discDelta = 0;
      d.forEach((cat2) => {
        if (catHas(cat2, "Scrapper")) {
          nerveDelta++;
          toast("\u{1F94A}", "Scrapper discarded: +1 Nerve", "#fb923c");
        } else if (catHas(cat2, "Cursed")) {
          nerveDelta++;
          toast("\u{1F480}", "Cursed discarded: +1 Nerve", "#d97706");
        } else if (catHas(cat2, "Nocturnal")) {
          nerveDelta += 2;
          toast("\u{1F319}", "Nocturnal discarded: +2 Nerve", "#c084fc");
        } else if (catHas(cat2, "Devoted") && cat2.bondedTo) {
          powerUps[cat2.bondedTo] = (powerUps[cat2.bondedTo] || 0) + 1;
          toast("\u{1FAC0}", "Devoted discarded: mate +1 Power", "#f472b6");
        } else if (catHas(cat2, "Guardian")) {
          const healTarget = [...rem, ...draw, ...disc].find((c) => c.injured && !healIds.includes(c.id));
          if (healTarget) {
            healIds.push(healTarget.id);
            toast("\u{1F6E1}\uFE0F", `Guardian healed ${healTarget.name.split(" ")[0]}`, "#4ade80");
          } else {
            toast("\u{1F6E1}\uFE0F", "Guardian discarded: no injured to heal", "#888");
          }
        } else if (catHas(cat2, "Stubborn")) {
          nerveDelta++;
          toast("\u{1FAA8}", "Stubborn discarded: +1 Nerve", "#9ca3af");
        } else if (catHas(cat2, "Stray")) {
          extraDraw.push(draw.length > 0 ? draw[0] : gC({ trait: PLAIN }));
          toast("\u{1F408}", "Stray wandered: +1 draw", "#67e8f9");
        } else if (catHas(cat2, "Loyal")) {
          toast("\u{1FAC2}", "Loyal inspires: +1M to all drawn cats", "#f472b6");
        } else if (catHas(cat2, "Scavenger")) {
          goldDelta += 2;
          toast("\u{1F33E}", "Scavenger discarded: +2\u{1F41F}", "#4ade80");
        } else if (catHas(cat2, "Feral")) {
          nerveDelta++;
          handDelta++;
          toast("\u{1F43E}", "Feral discarded: +1 Nerve, +1 hand", "#fb923c");
        } else if (catHas(cat2, "Seer")) {
          discDelta++;
          toast("\u{1F441}\uFE0F", "Seer discarded: +1 discard", "#38bdf8");
        }
      });
      const applyMods = (arr) => arr.map((c) => {
        let nc = { ...c };
        if (powerUps[c.id]) nc.power = Math.min(15, nc.power + powerUps[c.id]);
        if (healIds.includes(c.id)) {
          nc.injured = false;
          nc.injuryTimer = 0;
        }
        return nc;
      });
      const nDisc = [...disc, ...d];
      const nDraw = [...draw, ...extraDraw];
      const target = hs();
      const need = target - rem.length;
      if (need > 0) {
        const { drawn, nd, ndi } = drawN(applyMods(nDraw), applyMods(nDisc), need);
        setHand(applyMods([...rem, ...drawn]));
        setDraw(nd);
        setDisc(ndi);
      } else {
        setHand(applyMods(rem));
        setDraw(applyMods(nDraw));
        setDisc(applyMods(nDisc));
      }
      setSel(/* @__PURE__ */ new Set());
      setDLeft((v) => v - 1);
      if (nerveDelta > 0) setFerv((f) => Math.min(NERVE_MAX, f + nerveDelta));
      if (goldDelta > 0) setGold((g) => g + goldDelta);
      if (handDelta > 0) setHLeft((h) => h + handDelta);
      if (discDelta > 0) setDLeft((v) => v + discDelta);
      Audio.cardSelect(); Haptic.light();
    }
    function undoDiscard() {
      if (!undoRef.current) return;
      const u = undoRef.current;
      setHand(u.hand);
      setDraw(u.draw);
      setDisc(u.disc);
      setSel(u.sel);
      setDLeft(u.dLeft);
      setHLeft(u.hLeft);
      setGold(u.gold);
      goldRef.current = u.gold;
      setFerv(u.ferv);
      setMood(u.mood);
      undoRef.current = null;
      toast("\u21A9\uFE0F", "Discard undone", "#888", 1500);
    }
    const [recruitsThisHand, setRecruitsThisHand] = useState(0);
    const [freeRecruitsUsed, setFreeRecruitsUsed] = useState(0);
    const devFxRef = useRef({});
    useEffect(() => {
      try {
        devFxRef.current = getAllDevotionFx(devotion);
      } catch (e) {
      }
    }, [devotion]);
    const totalFreeRecruits = () => {
      const mb = getMB();
      const winterPerm = devFxRef.current.freeRecruit ? 1 : 0;
      return winterPerm + (mb.freeRecruits || 0) + (devFxRef.current.freeRecruits || 0) + (tempMods.freeRecruits || 0);
    };
    const recruitCost = () => {
      const freeLeft = Math.max(0, totalFreeRecruits() - freeRecruitsUsed);
      if (freeLeft > 0) return 0;
      const paidCount = recruitsThisHand - Math.min(recruitsThisHand, totalFreeRecruits());
      const base = [1, 2, 4, 8][Math.min(Math.max(0, paidCount), 3)];
      const discount = getMB().recruitDiscount || 0;
      return Math.max(0, base - discount);
    };
    function recruitCat() {
      if (ph !== "playing") return;
      const cost = recruitCost();
      if (goldRef.current < cost) return;
      if (draw.length === 0 && disc.length === 0) return;
      if (actionLock.current) return;
      actionLock.current = true;
      goldRef.current -= cost;
      undoRef.current = null;
      requestAnimationFrame(() => {
        actionLock.current = false;
      });
      setGold((g) => g - cost);
      Audio.recruit();
      setMood((m) => Math.min(100, m + 1));
      if (cost === 0) setFreeRecruitsUsed((f) => f + 1);
      let recruited = null;
      if (draw.length > 0) {
        recruited = draw[0];
        setHand((h) => [...h, draw[0]]);
        setDraw((d) => d.slice(1));
      } else {
        const shuffled = shuf([...disc]);
        recruited = shuffled[0];
        setHand((h) => [...h, shuffled[0]]);
        setDraw(shuffled.slice(1));
        setDisc([]);
      }
      setRecruitsThisHand((r) => r + 1);
      setSel(/* @__PURE__ */ new Set());
      const rn = recruited?.name?.split(" ")[0] || "Someone";
      const rb = BREEDS[recruited?.breed]?.icon || "";
      toast("\u{1F4E3}", cost === 0 ? `${rb} ${rn} joins. Free.` : `${rb} ${rn} joins the hand. (${cost}\u{1F41F})`, cost > 0 ? "#fbbf24" : "#4ade80");
      Audio.cardSelect(); Haptic.light();
    }
    function showOF(fs, tgt2, uh) {
      setRunChips(0);
      setRunMult(0);
      setNewBest(null);
      setScoringDone(false);
      setSRes(null);
      setSStep(-1);
      const excess = Math.max(0, fs - tgt2);
      const pct = tgt2 > 0 ? fs / tgt2 : 1;
      const baseR = cfx.famine ? 0 : Math.floor(Math.min(6, 2 + Math.max(0, pct - 1) * 5));
      const bossBonus = blind >= 2 ? 2 : 0;
      const gR = cfx.famine ? 0 : baseR + bossBonus;
      const excessGold = 0;
      const interest = Math.min(5, Math.floor(gold / 5));
      setGold((g) => {
        const curInterest = Math.min(5, Math.floor(g / 5));
        return g + gR + curInterest;
      });
      setOData({ excess, uh, gR, fs, tgt: tgt2, interest, excessGold, pct: Math.round(pct * 100) });
      setPh("overflow");
      if (blind < 2 && !clutch) {
        const pctClear = tgt2 > 0 ? Math.round(fs / tgt2 * 100) : 100;
        const perf = pctClear >= 300 ? "Legendary" : pctClear >= 200 ? "Dominating" : pctClear >= 150 ? "Crushing" : pctClear >= 120 ? "Comfortable" : "Cleared";
        toast("\u2705", `${perf} (${pctClear}%) \xB7 +${gR}\u{1F41F}${interest > 0 ? " +" + interest + " stores" : ""}`, "#4ade80", 2500);
      }
    }
    function endRun(won, finalScore) {
      try {
        if (isDailyRun) {
          const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
          const fsc = finalScore != null ? finalScore : rScore;
          const dd = getDailyData();
          const prevBest = dd.lastDate === today ? dd.score || 0 : 0;
          saveDailyData({
            lastDate: today,
            played: true,
            score: Math.max(fsc, prevBest),
            won: won || dd.won,
            night: ante,
            streak: dd.lastDate === new Date(Date.now() - 864e5).toISOString().slice(0, 10) ? (dd.streak || 0) + 1 : 1,
            allTime: Math.max(fsc, dd.allTime || 0)
          });
          submitScore(Math.max(fsc, prevBest), ante, won || dd.won).then((res) => {
            if (res.rank) {
              toast("\u{1F3C6}", `Daily rank: #${res.rank} of ${res.total} players`, "#67e8f9", 4e3);
              const dd2 = getDailyData();
              dd2.rank = res.rank;
              dd2.total = res.total;
              saveDailyData(dd2);
            }
          }).catch(() => {
          });
          stopDailyRNG();
          setIsDailyRun(false);
        }
        setRunChips(0);
        setRunMult(0);
        setNewBest(null);
        setScoringDone(false);
        setSRes(null);
        setSStep(-1);
        try {
          clearRunSave();
          setSavedRun(null);
        } catch (e) {
        }
        const fScore = finalScore != null ? finalScore : rScore;
        const bName = ["Dusk", "Midnight", boss?.name || "The Boss"][blind] || "Unknown";
        if (isDailyRun) {
          if (won) {
            const dd = getDailyData();
            toast("\u2600\uFE0F", `Daily complete! Score: ${fScore.toLocaleString()}${dd.streak > 1 ? " \xB7 " + dd.streak + " day streak" : ""}. Share your result from the title screen.`, "#67e8f9", 5e3);
          }
          setDefeatData(won ? { score: fScore, target: 0, line: "Daily complete. Your score has been recorded.", blind: bName, daily: true } : { score: fScore, target: (() => {
            try {
              return eTgt();
            } catch (e) {
              return 0;
            }
          })(), line: pk(["The daily colony fell. Try again tomorrow.", "Today's seed wasn't kind. Tomorrow's might be."]), blind: bName, daily: true });
          setPh("defeat");
          if (meta) {
            const nm = { ...meta, stats: { ...meta.stats, r: (meta.stats.r || 0) + 1 } };
            setMeta(nm);
            saveS(nm);
          }
          return;
        }
        setHearthPair(won ? [] : null);
        if (won) {
          setVictoryStep(0);
          setPh("victory");
          try {
            Audio.victory(); Haptic.victory();
          } catch (e) {
          }
        } else {
          try {
            Audio.defeat(); Haptic.death();
          } catch (e) {
          }
          const defeatLines = [
            "The numbers fell short. The dark didn't wait for an explanation.",
            "Below the line. The silence didn't come fast. It came slow. That's worse.",
            "The last hand wasn't enough. Somewhere, the eighth colony nodded. They know.",
            "The score hit the floor and the dark walked in like it owned the place. It does.",
            "Not enough. The number doesn't care how hard you tried. It never does.",
            "They fell below the line. And the world went on like they were never there.",
            "Close doesn't count. The first colony learned that. Now you have too."
          ];
          const tgtVal = (() => {
            try {
              return eTgt();
            } catch (e) {
              return 0;
            }
          })();
          setDefeatData({ score: fScore, target: tgtVal, line: pk(defeatLines), blind: bName, dustEarned: Math.min(3, ante) });
          setPh("defeat");
        }
        if (meta) {
          (async () => {
            try {
              const curHeat = meta.heat || 0;
              const maxHeatReached = Math.max(meta.stats.mh || 0, curHeat);
              const newMaxHeat = won ? Math.min(5, maxHeatReached + 1) : maxHeatReached;
              const newHeat = won ? Math.min(newMaxHeat, curHeat + 1) : curHeat;
              const deathless = won && fallen.length === 0;
              const relics = [...meta.relics || []];
              if (won && curHeat >= 1 && !relics.includes(curHeat)) {
                relics.push(curHeat);
                const relic = HEAT_RELICS[curHeat];
                if (relic) toast(relic.icon, `RELIC: ${relic.name}. ${relic.desc}`, "#fbbf24");
              }
              const ninthDawnCleared = isNinthDawn && won ? true : meta.ninthDawnCleared || false;
              const bossRecord = { ...meta.stats.bossRecord || {} };
              if (blind === 2 && boss) {
                const bk = boss.id || "unknown";
                if (!bossRecord[bk]) bossRecord[bk] = { w: 0, l: 0 };
                if (won || ante >= MX) bossRecord[bk].w++;
                else bossRecord[bk].l++;
                const coreBosses = ["hunger", "territory", "mother", "swarm", "forgetting"];
                if (won && coreBosses.every((id) => bossRecord[id]?.w > 0) && !meta._loreRevealed) {
                  setTimeout(() => toast("\u2726", "Five patterns. Five colonies. You've seen how they died. Don't repeat it.", "#fbbf24", 6e3), 3e3);
                  setMeta((m) => ({ ...m, _loreRevealed: true }));
                }
              }
              const heatWins = (meta.stats.heatWins || 0) + (won && curHeat >= 1 ? 1 : 0);
              const hearthTotal = meta.stats.hearthTotal || 0;
              const existingBeloved = new Set(meta.stats.belovedNames || []);
              [...allC, ...fallen].forEach((c) => {
                const firstName = c.name.split(" ")[0];
                const isDefault = CAT_NAMES.includes(firstName) || Object.values(SEASON_NAMES).some((p) => p.includes(firstName)) || Object.values(TRAIT_NAMES).some((p) => p.includes(firstName));
                if (!isDefault) existingBeloved.add(firstName);
              });
              const belovedNames = [...existingBeloved].slice(0, 50);
              const runEpithets = [...allC, ...fallen].filter((c) => c.epithet).length;
              const runBonds = [...allC].filter((c) => c.bondedTo).length / 2;
              const runClutchBoss = clutch && won;
              const runHasHearthChild = [...allC].some((c) => c.hearthDescendant && c.epithet);
              const runMythics = [...allC].filter((c) => (c.trait || PLAIN).tier === "mythic").length;
              const u = {
                ...meta,
                dust: (meta.dust || 0) + (won ? 0 : Math.min(3, ante)) + (won && (meta.stats.streak || 0) >= 4 ? Math.min(10, (meta.stats.streak || 0) + 1) : 0),
                heat: newHeat,
                ninthDawnCleared,
                relics,
                // v0.7: Store cross-run fallen for boss memory (last 30 names)
                allFallen: [...fallen.map((c) => ({ name: c.name.split(" ")[0], breed: c.breed, night: c.night || ante, run: (meta.stats.r || 0) + 1 })), ...meta.allFallen || []].slice(0, 30),
                stats: {
                  ...meta.stats,
                  r: meta.stats.r + 1,
                  w: meta.stats.w + (won ? 1 : 0),
                  ba: Math.max(meta.stats.ba, ante),
                  hs: Math.max(meta.stats.hs, fScore),
                  mf: Math.max(meta.stats.mf, rMaxF),
                  mh: newMaxHeat,
                  bossRecord,
                  heatWins,
                  ninthDawnCleared,
                  hearthTotal,
                  belovedNames,
                  streak: won ? (meta.stats.streak || 0) + 1 : 0,
                  bestStreak: Math.max(meta.stats.bestStreak || 0, won ? (meta.stats.streak || 0) + 1 : 0),
                  totalFallen: (meta.stats.totalFallen || 0) + fallen.length,
                  epithetsEarned: (meta.stats.epithetsEarned || 0) + runEpithets,
                  maxBonds: Math.max(meta.stats.maxBonds || 0, Math.floor(runBonds)),
                  clutchBossWins: (meta.stats.clutchBossWins || 0) + (runClutchBoss ? 1 : 0),
                  campCount: meta.stats.campCount || 0,
                  // incremented in camp resolution
                  hearthReleases: meta.stats.hearthReleases || 0,
                  // incremented in release
                  marketlessWins: (meta.stats.marketlessWins || 0) + (won && !seen.shop ? 1 : 0),
                  maxMythics: Math.max(meta.stats.maxMythics || 0, runMythics),
                  dynastyEarned: (meta.stats.dynastyEarned || 0) + (runHasHearthChild ? 1 : 0),
                  deathlessHeatWin: meta.stats.deathlessHeatWin || won && deathless && (meta.heat || 0) >= 3 || false
                }
              };
              const newAchv = [...u.achv || []];
              ACHIEVEMENTS.forEach((a) => {
                if (!newAchv.includes(a.id) && a.check(u.stats, deathless, newAchv)) newAchv.push(a.id);
              });
              const prevAchv = meta.achv || [];
              const freshAchvs = newAchv.filter((id) => !prevAchv.includes(id));
              let achvDust = 0;
              freshAchvs.forEach((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                if (a?.dust) achvDust += a.dust;
              });
              if (achvDust > 0) u.dust = (u.dust || 0) + achvDust;
              u.achv = newAchv;
              setMeta(u);
              try {
                await saveS(u);
              } catch (e) {
                console.warn("Save failed:", e);
              }
              const prevUl = getUnlocks(meta);
              const newUl = getUnlocks(u);
              const unlockMsgs = [];
              if (!prevUl.fams && newUl.fams) unlockMsgs.push("\u{1F6E1}\uFE0F Wards unlocked in the Market!");
              newAchv.filter((id) => !prevAchv.includes(id)).forEach((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                if (a) unlockMsgs.push(`${a.icon} ${a.name}${a.dust ? " +" + a.dust + "\u2726" : ""}. ${a.reward}`);
              });
              const prevChapter = getChapterTitle(meta);
              const newChapter = getChapterTitle(u);
              if (newChapter && (!prevChapter || prevChapter.num !== newChapter.num)) {
                unlockMsgs.push(`\u{1F4D6} Chapter ${newChapter.num} \xB7 ${newChapter.name}`);
              }
              setNewUnlocks(unlockMsgs);
            } catch (e) {
              console.warn("Post-run save error:", e);
            }
          })();
        }
      } catch (e) {
        console.error("endRun crashed:", e);
        setPh("defeat");
        setDefeatData({ score: finalScore || rScore || 0, target: 0, line: "Something went wrong.", blind: "?" });
      }
    }
    const savingRef = useRef(false);
    async function saveCatM(cat2) {
      if (!meta || savingRef.current) return;
      savingRef.current = true;
      try {
        const allC2 = [...hand, ...draw, ...disc];
        const hasKids = allC2.some((c) => c.parentIds?.includes(cat2.id));
        const hasParents = cat2.parentIds?.some((pid) => allC2.some((c) => c.id === pid));
        const ser = {
          id: cat2.id,
          breed: cat2.breed,
          power: cat2.power,
          sex: cat2.sex || "M",
          trait: { name: (cat2.trait || PLAIN).name, icon: (cat2.trait || PLAIN).icon, desc: (cat2.trait || PLAIN).desc, tier: (cat2.trait || PLAIN).tier },
          name: cat2.name,
          parentBreeds: cat2.parentBreeds,
          parentIds: cat2.parentIds || null,
          bonded: !!cat2.bondedTo,
          scarred: !!cat2.scarred,
          lineage: !!(hasKids || hasParents),
          stats: { ...cat2.stats },
          savedAt: Date.now(),
          fromAnte: ante,
          story: (() => {
            const fn = cat2.name.split(" ")[0];
            const tp = cat2.stats?.tp || 0;
            const bs = cat2.stats?.bs || 0;
            const traitName = (cat2.trait || PLAIN).name;
            const parts = [`${fn} survived ${ante} night${ante > 1 ? "s" : ""}.`];
            if (traitName !== "Plain") parts.push(`${(cat2.trait || PLAIN).icon} ${traitName}.`);
            if (cat2.scarred && cat2.bondedTo) {
              const mate = allC2.find((c) => c.id === cat2.bondedTo);
              parts.push(`Scarred and bonded${mate ? " to " + mate.name.split(" ")[0] : ""}.`);
            } else if (cat2.scarred) parts.push("Carried a scar from the den.");
            else if (cat2.bondedTo) {
              const mate = allC2.find((c) => c.id === cat2.bondedTo);
              parts.push(`Bonded${mate ? " to " + mate.name.split(" ")[0] : ""}.`);
            }
            if (tp >= 10) parts.push(`Played ${tp} hands.`);
            if (bs > 5e3) parts.push(`Best score: ${bs.toLocaleString()}.`);
            else if (tp < 3) parts.push("Quiet. Reliable. Survived when others couldn't.");
            return parts.join(" ");
          })()
        };
        const newPair = [...hearthPair, ser];
        if (newPair.length >= 2) {
          const pairId = Date.now();
          newPair[0].pairId = pairId;
          newPair[1].pairId = pairId;
          const d1 = `${newPair[0].breed}-${(newPair[0].trait || PLAIN).name}`, d2 = `${newPair[1].breed}-${(newPair[1].trait || PLAIN).name}`;
          const newDisc = [...meta.stats.disc];
          if (!newDisc.includes(d1)) newDisc.push(d1);
          if (!newDisc.includes(d2)) newDisc.push(d2);
          const u = { ...meta, cats: [...meta.cats, ...newPair], stats: { ...meta.stats, disc: newDisc, hearthTotal: (meta.stats.hearthTotal || 0) + 2 } };
          setMeta(u);
          await saveS(u);
          setHearthPair(null);
          toast("\u{1F3E0}", "Their children will find you in future runs.", "#fbbf24", 3500);
          savingRef.current = false;
        } else {
          setHearthPair(newPair);
          savingRef.current = false;
        }
      } catch (e) {
        savingRef.current = false;
      }
    }
    function nextBlind() {
      const nb = blind >= 2 ? 0 : blind + 1, na = blind >= 2 ? ante + 1 : ante;
      if (blind >= 2 && ante >= MX) {
        endRun(true);
        return;
      }
      setBlind(nb);
      setAnte(na);
      setRScore(0);
      setLastHandIds([]);
      setLastHandLost(false);
      setFreeRecruitsUsed(0);
      injuredThisBlind.current = false;
      const mb = getMB();
      const hfx2 = getHeatFx(meta?.heat);
      const bossHandBonus = nb === 2 && mb.bossHand ? mb.bossHand : 0;
      const dFx = getAllDevotionFx(devotion);
      const baseHands = nb === 2 ? 4 : 3;
      setHLeft(baseHands + mb.hands + runBonus.hands + tempMods.hands + (hfx2.handMod || 0) + bossHandBonus + dFx.hands + (nb === 2 ? 0 : nightMod?.fx?.handMod || 0));
      setDLeft(3 + mb.discards + tempMods.discs + (hfx2.discMod || 0) + dFx.discards);
      setTempMods((m) => ({ hands: 0, discs: 0, freeRecruits: 0, nerveLock: 0, kindredMult: m.kindredMult || 0 }));
      if (nb === 0) {
        setBoss(BOSSES[Math.min(na, BOSSES.length) - 1] || BOSSES[0]);
        if ((wins >= 3 || (meta?.heat || 0) >= 3) && !isNinthDawn) {
          const pool = FULL_BOSS_POOL.filter((b) => b.name !== boss?.name);
          setBoss(pk(pool) || BOSSES[Math.min(na, BOSSES.length) - 1]);
        }
        setBossTraits(pickBossTraits(na, meta?.heat, isNinthDawn));
        if (isNinthDawn && na >= MX) {
          setBoss(THE_REMEMBERING);
        }
        setFirstHandPlayed(false);
        if (na > ante) {
          setAnteUp({ from: ante, to: na, target: Math.round(getTarget(na, 0, isFirstRun, longDark)) });
          logEvent("night", { from: ante, to: na });
        }
      }
      if (nb === 2) {
        const hfxC = getHeatFx(meta?.heat);
        const devCurseReduce = getAllDevotionFx(devotion).curseReduce || 0;
        const c = genCurses(na, Math.max(0, (hfxC.extraCurse || 0) - devCurseReduce));
        setCurses(c);
        const fx = buildCfx(c);
        setCfx(fx);
        if (fx.famine) setGold((g) => Math.max(0, g - Math.min(5, Math.floor(g / 5))));
      } else {
        setCurses([]);
        setCfx({});
      }
      const devFastHeal = getAllDevotionFx(devotion).fastHeal || false;
      const healCat = (c) => {
        if (!c.injured) return c;
        const timer = (c.injuryTimer || 2) - 1;
        const fastHeal = catHas(c, "Scrapper") || devFastHeal;
        if (timer <= 0 || fastHeal) return { ...c, injured: false, injuryTimer: 0 };
        return { ...c, injuryTimer: timer };
      };
      const allRaw = [...hand, ...draw, ...disc].map((c) => {
        let nc = healCat(c);
        if (pendingRenames.current[nc.id]) {
          return { ...nc, name: pendingRenames.current[nc.id] };
        }
        return nc;
      });
      const dedupSeen = new Set();
      const all = shuf(allRaw.filter((c) => { if (dedupSeen.has(c.id)) return false; dedupSeen.add(c.id); return true; }));
      pendingRenames.current = {};
      setHand(all.slice(0, BH));
      setDraw(all.slice(BH));
      setDisc([]);
      setSel(/* @__PURE__ */ new Set());
      setSellMode(false);
      if (nb === 2) {
        setPh("bossIntro");
        Audio.bossIntro(); Haptic.heavy();
        if (eventHistory._lastTag === "scarKeeper" || eventHistory.storm_mapped) {
          const curseNames = curses.map((c) => c.name).join(", ");
          if (curseNames) setTimeout(() => toast("\u{1F5FA}\uFE0F", `The map reveals: ${curseNames}`, "#c084fc", 4e3), 1500);
        }
      } else {
        if (nb === 0) {
          const wSeasons = ["Autumn", "Winter", "Spring", "Summer"];
          setWeather({ season: pk(wSeasons), night: na });
          if (na >= 2 && !isFirstRun) {
            const nmAll = [...hand, ...draw, ...disc];
            const hasHardened = nmAll.some((c) => c.scarred && !c.injured);
            const hasBonds = nmAll.some((c) => c.bondedTo);
            const relevant = NIGHT_MODS.filter((m) => {
              if (m.id === "blood" && !hasHardened) return false;
              if (m.id === "bonds" && !hasBonds) return false;
              return true;
            });
            setNightMod(pk(relevant.length > 0 ? relevant : NIGHT_MODS));
          } else {
            setNightMod(null);
          }
        }
        setNightCard({ ante: na, blind: nb });
        setPh("nightCard");
        Audio.nightTransition();
        if (meta && meta.stats.r >= 2 && nb < 2) {
          setTimeout(() => { _setPh((p) => { if (p === "nightCard") { setNightCard(null); return "playing"; } return p; }); }, 2e3);
        }
      }
    }
    function genShop() {
      setSeen((s) => ({ ...s, shop: true }));
      const hfxS = getHeatFx(meta?.heat);
      const catPrice = (a, c) => {
        const tier = (c.trait || PLAIN).tier;
        const tierCost = tier === "rare_neg" ? 2 : tier === "mythic" ? 12 : tier === "legendary" ? 8 : tier === "rare" ? 5 : tier === "common" ? 3 : 2;
        const powCost = Math.max(0, Math.floor((c.power - 3) / 2));
        return tierCost + powCost + Math.floor(a / 2) + (hfxS.shopCost || 0);
      };
      const colCats = [...hand, ...draw, ...disc];
      const seasonCts = {};
      colCats.forEach((c) => {
        seasonCts[c.breed] = (seasonCts[c.breed] || 0) + 1;
      });
      const dominantSeason = Object.entries(seasonCts).sort((a, b) => b[1] - a[1])[0];
      const sc = [];
      const headline = gC({ trait: pickTrait(ante >= 3) });
      headline._price = catPrice(ante, headline);
      headline._headline = true;
      sc.push(headline);
      const straySeasons = shuf([...BK]);
      if (dominantSeason && dominantSeason[1] >= 5 && !straySeasons.slice(0, 3).includes(dominantSeason[0])) {
        straySeasons[2] = dominantSeason[0];
      }
      for (let i = 0; i < 3; i++) {
        const pow = 1 + Math.floor(Math.random() * 4);
        const s = gC({ breed: straySeasons[i % straySeasons.length], trait: PLAIN, power: pow });
        s._price = Math.max(2, 1 + Math.floor(ante * 0.6) + (hfxS.shopCost || 0));
        s._stray = true;
        sc.push(s);
      }
      setSCats(sc);
      setSScrolls(genScrolls(ante, htLevels));
      const ul = getUnlocks(meta);
      const STARTER_WARD_IDS = ["f5", "f6", "f8"];
      if (isFirstRun && fams.length === 0) {
        const starters = shuf(FAMS.filter((f) => STARTER_WARD_IDS.includes(f.id) && !fams.find((o) => o.id === f.id))).slice(0, 2).map((w) => ({ ...w, _starter: true }));
        setSFams(starters);
      } else {
        setSFams(ul.fams ? shuf(FAMS.filter((f) => !fams.find((o) => o.id === f.id))).slice(0, 2) : []);
      }
      setSellMode(false);
      setSellsLeft(2);
      setDen([]);
      setRerollCount(0);
      setShopTab(isFirstRun && fams.length === 0 ? "wards" : "cats");
    }
    const famPrice = (f) => f?._starter ? 2 : 4 + ante + (getHeatFx(meta?.heat).shopCost || 0);
    function buyCat(i) {
      const p = sCats[i]._price || 3;
      if (goldRef.current < p) return;
      goldRef.current -= p;
      Audio.buy();
      setGold((g) => g - p);
      const c = { ...sCats[i] };
      delete c._price;
      const bTier = (c.trait || PLAIN).tier;
      if (bTier === "mythic") {
        Audio.mythicDiscover();
        toast("\u{1F31F}", `MYTHIC! ${c.name.split(" ")[0]}: ${c.trait.icon}${c.trait.name}!`, "#c084fc", 3e3);
      } else if (bTier === "legendary") {
        Audio.legendaryDiscover();
        toast("\u2728", `LEGENDARY! ${c.name.split(" ")[0]}: ${c.trait.icon}${c.trait.name}!`, "#f59e0b", 2500);
      }
      setDraw((d) => [...d, c]);
      setSCats((s) => s.filter((_, j) => j !== i));
      logEvent("buy", { name: c.name, breed: c.breed, cost: p });
      const buyLines = ["Another mouth. Another heartbeat.", "They were waiting for a colony that would have them.", "One more name to remember.", "The colony grows."];
      toast(BREEDS[c.breed].icon, `${c.name.split(" ")[0]} joined. ${buyLines[(c.power + ante) % buyLines.length]}`, BREEDS[c.breed].color);
    }
    function buyFam(i) {
      const f = sFams[i];
      const fp = famPrice(f);
      if (goldRef.current < fp || fams.length >= MF) return;
      goldRef.current -= fp;
      Audio.buy();
      setGold((g) => g - fp);
      const clean = { ...f };
      delete clean._starter;
      setFams((fs) => [...fs, clean]);
      setSFams((s) => s.filter((_, j) => j !== i));
      toast(f.icon, `${f.name} watches over you`, "#fbbf24");
      if (fams.length === 0 && runCount <= 1) setTimeout(() => toast("\u{1F4A1}", "You'll earn more rations next round. Spend wisely but don't hoard.", "#fbbf24aa", 3500), 1500);
    }
    function buyScroll(i) {
      const s = sScrolls[i];
      if (!s || goldRef.current < s.price) return;
      goldRef.current -= s.price;
      Audio.buy();
      setGold((g) => g - s.price);
      setHtLevels((prev) => ({ ...prev, [s.name]: (prev[s.name] || 1) + 1, [s.name + "_xp"]: 0 }));
      setSScrolls((sc) => sc.filter((_, j) => j !== i));
      toast("\u{1F4DC}", `${s.name} \u2192 Lv${s.nextLv}! ${s.nextBase ? s.nextBase.c + "C\xD7" + s.nextBase.m + "M" : ""}`, "#fbbf24");
    }
    function reroll() {
      const rc = 2 + ante + rerollCount;
      if (goldRef.current < rc) return;
      goldRef.current -= rc;
      setGold((g) => g - rc);
      setRerollCount((c) => c + 1);
      genShop();
    }
    function getPartingGifts(cat2) {
      const gifts = [];
      let narr = "";
      const isNeg = (cat2.trait || PLAIN).tier === "rare_neg" || (cat2.extraTraits || []).some((t) => t.tier === "rare_neg");
      if (isNeg) {
        return { goldVal: 0, gifts, narr: `${cat2.name.split(" ")[0]} slipped away before dawn. No one stopped them.` };
      }
      const tier = (cat2.trait || PLAIN).tier;
      const tierVal = tier === "mythic" ? 6 : tier === "legendary" ? 4 : tier === "rare" ? 3 : tier === "common" ? 2 : 1;
      const powVal = Math.max(0, Math.floor((cat2.power - 3) / 2));
      let goldVal = Math.max(1, tierVal + powVal);
      if (cat2.scarred) {
        goldVal += 1;
        gifts.push("+1 Nerve");
        narr = `${cat2.name.split(" ")[0]} walked different after being hardened. Heavier. But they walked.`;
      }
      if (cat2.power >= 8) {
        gifts.push("Weakest gains power");
        if (!narr) narr = `${cat2.name.split(" ")[0]} was the strongest. Now someone else has to be.`;
      }
      if (cat2.bondedTo) {
        gifts.push("Partner gains power");
        if (!narr) narr = `The one who stayed didn't eat for two days.`;
      }
      if (!narr) narr = `${cat2.name.split(" ")[0]} left before sunrise.${gifts.length > 0 ? " They left something behind." : ""}`;
      return { goldVal, gifts, narr };
    }
    function sellCat(cat2) {
      if (allC.length <= MIN_DECK || sellsLeft <= 0) return;
      const pg = getPartingGifts(cat2);
      if (pg.goldVal < 0 && gold < Math.abs(pg.goldVal)) return;
      setFerv((f) => Math.max(0, f - 1));
      setGold((g) => g + pg.goldVal);
      setSellsLeft((s) => s - 1);
      logEvent("sell", { name: cat2.name.split(" ")[0], gold: pg.goldVal });
      setMood((m) => Math.max(0, m - 4));
      setHand((h) => h.filter((c) => c.id !== cat2.id));
      setDraw((d) => d.filter((c) => c.id !== cat2.id));
      setDisc((di) => di.filter((c) => c.id !== cat2.id));
      if (cat2.scarred) setFerv((f) => Math.min(NERVE_MAX, f + 1));
      if (cat2.bondedTo) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((c) => {
            if (c.id === cat2.bondedTo) return { ...c, power: Math.min(15, c.power + 2), bondedTo: null, story: [...c.story || [], `Watched ${cat2.name.split(" ")[0]} go`] };
            return c;
          }));
        });
      }
      if (cat2.power >= 8) {
        const uAll2 = [...hand, ...draw, ...disc].filter((c) => c.id !== cat2.id);
        if (uAll2.length > 0) {
          const weakest = uAll2.reduce((a, b) => a.power <= b.power ? a : b);
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((c) => c.id === weakest.id ? { ...c, power: Math.min(15, c.power + 1) } : c));
          });
        }
      }
      const giftStr = pg.gifts.length > 0 ? ` (${pg.gifts.join(", ")})` : "";
      const sellLines = ["Gone. Not to the dark. Just gone.", "The colony gets lighter.", "One less name. The rest carry more."];
      toast("\u{1F54A}\uFE0F", `${cat2.name.split(" ")[0]} released. ${sellLines[ante % sellLines.length]}${giftStr}`, pg.goldVal >= 0 ? "#c084fc" : "#ef4444");
      if (ph === "shop") {
        const hfxS = getHeatFx(meta?.heat);
        const pow = 1 + Math.floor(Math.random() * 4);
        const replacement = gC({ trait: PLAIN, power: pow });
        replacement._price = Math.max(2, 1 + Math.floor(ante / 2) + (hfxS.shopCost || 0));
        replacement._stray = true;
        setSCats((sc) => [...sc, replacement]);
        toast(BREEDS[replacement.breed].icon, `${replacement.name.split(" ")[0]} appeared at the market. P${pow}.`, "#67e8f9", 2500);
      }
    }
    function sellFam(f) {
      setGold((g) => g + 3);
      setFams((fs) => fs.filter((x) => x.id !== f.id));
      toast("\u{1F6E1}\uFE0F", `${f.name} returned. +3\u{1F41F}`, "#fbbf24");
    }
    const shelterFromWards = fams.filter((f) => f.passive && f.eff).reduce((s, f) => {
      const fx = f.eff([]);
      return s + (fx.shelter || 0);
    }, 0);
    const MAX_ISOLATE = campMode ? 2 : 3 + (getMB().shelter || 0) + shelterFromWards + (eventDenBonus || 0);
    const denRef = useRef(den);
    denRef.current = den;
    const toggleDen = (c) => {
      const cur = denRef.current;
      if (cur.find((x) => x.id === c.id)) {
        const next = cur.filter((x) => x.id !== c.id);
        denRef.current = next;
        setDen(next);
        return;
      }
      if (cur.length >= MAX_ISOLATE) return;
      const next = [...cur, c];
      denRef.current = next;
      setDen(next);
    };
    function endNight() {
      const dAllRaw = [...hand, ...draw, ...disc];
      const seenIds2 = new Set();
      const dAll = dAllRaw.filter((c) => { if (seenIds2.has(c.id)) return false; seenIds2.add(c.id); return true; });
      const shelterCats = den.filter((c) => !c.injured);
      const wildCats = dAll.filter((c) => !den.find((d) => d.id === c.id));
      if (shelterCats.length < 2 && wildCats.length < 2) {
        nextBlind();
        return;
      }
      if (campMode) setMood((m) => Math.min(100, m + 5));
      setDenNews([]);
      const hasMM = false;
      const heatFight = getHeatFx(meta?.heat).denFight || 0;
      const baseCtx = { draftRejects, deckSize: dAll.length, nerveLvl: ferv, breedBoost: (getAllDevotionFx(devotion).breedBoost || 0) + (getMB().breedBoost || 0), mood, hasWon: meta && meta.stats.w > 0 };
      const shelterResults = shelterCats.length >= 2 ? resolveDen(shelterCats, hasMM, true, 0, { ...baseCtx, breedOnly: true }) : [];
      shelterResults.forEach((r) => r.source = "shelter");
      const wildResults = wildCats.length >= 2 ? resolveDen(wildCats, hasMM, eventDenSafe, heatFight, { ...baseCtx, noBreed: true }) : [];
      wildResults.forEach((r) => r.source = "wilds");
      const results = [...shelterResults, ...wildResults];
      setEventDenSafe(false);
      setEventDenBonus(0);
      if (!firstDenUsed) setFirstDenUsed(true);
      results.forEach((r) => {
        if (r.type === "breed") {
          r.baby._bornNight = ante;
          setDraw((d) => [...d, r.baby]);
          if (r.twins) {
            const twin = breedC(r.c1, r.c2);
            twin._bornNight = ante;
            setDraw((d) => [...d, twin]);
            r.twin2 = twin;
          }
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((c) => {
              if (c.id === r.c1.id) {
                c.stats = { ...c.stats, kidsBreed: (c.stats?.kidsBreed || 0) + 1 + (r.twins ? 1 : 0) };
                assignEpithet(c);
                return { ...c, bondedTo: r.c2.id, stats: c.stats, epithet: c.epithet, epithetKey: c.epithetKey, earnedEpithets: c.earnedEpithets };
              }
              if (c.id === r.c2.id) {
                c.stats = { ...c.stats, kidsBreed: (c.stats?.kidsBreed || 0) + 1 + (r.twins ? 1 : 0) };
                assignEpithet(c);
                return { ...c, bondedTo: r.c1.id, stats: c.stats, epithet: c.epithet, epithetKey: c.epithetKey, earnedEpithets: c.earnedEpithets };
              }
              if (c.bondedTo === r.c1.id || c.bondedTo === r.c2.id) return { ...c, bondedTo: null };
              return c;
            }));
          });
        } else if (r.type === "death") {
          setHand((h) => h.filter((c) => c.id !== r.victim.id));
          setDraw((d) => d.filter((c) => c.id !== r.victim.id));
          setDisc((di) => di.filter((c) => c.id !== r.victim.id));
        } else if (r.type === "fight") {
          const winnerId = r.c1.id === r.loser.id ? r.c2.id : r.c1.id;
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((c) => {
              if (c.id === r.loser.id) {
                const scarPow = hasRelic(2) ? Math.min(15, r.loser.power + 1) : r.loser.power;
                return { ...c, power: scarPow, scarred: true, injured: r.wasInjured || c.injured, injuryTimer: r.wasInjured || c.injured ? 2 : c.injuryTimer, grudgedWith: [...(c.grudgedWith || []).filter((id) => id !== winnerId), winnerId] };
              }
              if (c.id === winnerId) return { ...c, grudgedWith: [...(c.grudgedWith || []).filter((id) => id !== r.loser.id), r.loser.id] };
              return c;
            }));
          });
        }
      });
      results.forEach((r) => {
        if (r.type === "mentor") {
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((x) => x.id === r.young.id ? { ...x, power: r.young.power } : x));
          });
        }
        if (r.type === "traitTeach") {
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((x) => x.id === r.young.id ? { ...x, trait: r.trait, power: r.young.power } : x));
          });
          assignEpithet(r.young);
          logEvent("trait", { cat: r.young.name.split(" ")[0], trait: r.trait.name, from: r.elder.name.split(" ")[0] });
          if (!meta?.stats?.seenTraitTeach) {
            setMeta((m) => {
              const nm = { ...m, stats: { ...m.stats, seenTraitTeach: true } };
              saveS(nm);
              return nm;
            });
            setTimeout(() => toast("\u{1F4A1}", "Elder cats can teach their trait to Plain cats in the wilds. Build toward Kindred!", "#c084fc", 5e3), 1500);
          }
        }
        if (r.type === "found") setGold((g) => g + r.gold);
        if (r.type === "growth") {
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((x) => x.id === r.cat.id ? { ...x, power: r.cat.power } : x));
          });
        }
        if (r.type === "wanderer") setDraw((d) => [...d, r.cat]);
      });
      results.forEach((r) => {
        if (r.type === "training") {
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((c) => {
              if (c.id === r.c1.id) return { ...c, power: r.c1.power };
              if (c.id === r.c2.id) return { ...c, power: r.c2.power };
              return c;
            }));
          });
          logEvent("training", { c1: r.c1.name.split(" ")[0], c2: r.c2.name.split(" ")[0] });
        }
        if (r.type === "grudge") {
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((c) => {
              if (c.id === r.c1.id) return { ...c, grudgedWith: [...(c.grudgedWith || []).filter((id) => id !== r.c2.id), r.c2.id] };
              if (c.id === r.c2.id) return { ...c, grudgedWith: [...(c.grudgedWith || []).filter((id) => id !== r.c1.id), r.c1.id] };
              return c;
            }));
          });
          logEvent("grudge", { c1: r.c1.name.split(" ")[0], c2: r.c2.name.split(" ")[0] });
        }
        if (r.type === "reconcile" || r.type === "reconcile_bond") {
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((c) => {
              if (c.id === r.c1.id) return { ...c, grudgedWith: (c.grudgedWith || []).filter((id) => id !== r.c2.id), ...r.type === "reconcile_bond" ? { bondedTo: r.c2.id } : {} };
              if (c.id === r.c2.id) return { ...c, grudgedWith: (c.grudgedWith || []).filter((id) => id !== r.c1.id), ...r.type === "reconcile_bond" ? { bondedTo: r.c1.id } : {} };
              if (r.type === "reconcile_bond" && (c.bondedTo === r.c1.id || c.bondedTo === r.c2.id)) return { ...c, bondedTo: null };
              return c;
            }));
          });
          logEvent("reconcile", { c1: r.c1.name.split(" ")[0], c2: r.c2.name.split(" ")[0], bonded: r.type === "reconcile_bond" });
        }
        if (r.type === "bond") {
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((c) => {
              if (c.id === r.c1.id) return { ...c, bondedTo: r.c2.id };
              if (c.id === r.c2.id) return { ...c, bondedTo: r.c1.id };
              if (c.bondedTo === r.c1.id || c.bondedTo === r.c2.id) return { ...c, bondedTo: null };
              return c;
            }));
          });
          logEvent("bond", { c1: r.c1.name.split(" ")[0], c2: r.c2.name.split(" ")[0] });
        }
        if (r.type === "breed") logEvent("breed", { parents: r.c1.name.split(" ")[0] + " & " + r.c2.name.split(" ")[0], baby: r.baby.name, breed: r.baby.breed });
        if (r.type === "fight") logEvent("fight", { loser: r.loser.name.split(" ")[0], dmg: r.dmg });
        if (r.type === "death") {
          logEvent("death", { victim: r.victim.name });
          Audio.denDeath(); Haptic.death();
          const vn = r.victim.name.split(" ")[0];
          const vb = r.victim.bondedTo;
          const vs = r.victim.scarred;
          const vk = r.victim._bornNight;
          const mate = vb ? [...hand, ...draw, ...disc].find((x) => x.id === vb) : null;
          const mn = mate?.name.split(" ")[0];
          const deathChoice = Math.random() < 0.5 || (r.victim.stats?.tp || 0) > 3;
          if (deathChoice) {
            const carrier = mate || [...hand, ...draw, ...disc].filter((x) => x.id !== r.victim.id).sort((a, b) => (b.stats?.tp || 0) - (a.stats?.tp || 0))[0];
            if (carrier) {
              const cn = carrier.name.split(" ")[0];
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => x.id === carrier.id ? { ...x, power: Math.min(15, x.power + 1), story: [...(x.story || []).slice(-3), `Carries ${vn}'s name`] } : x));
              });
              toast("\u{1F56F}\uFE0F", `${cn} carries ${vn}'s name now. +1 Power.`, "#fbbf24", 3500);
            } else {
              toast("\u{1F480}", `${vn} is gone. No one left to carry the name.`, "#ef4444", 3500);
            }
          } else {
            const dustGain = (r.victim.stats?.tp || 0) >= 5 ? 2 : 1;
            if (meta) setMeta((m) => ({ ...m, dust: (m.dust || 0) + dustGain }));
            toast("\u2726", `${vn} returns to stardust. +${dustGain}\u2726`, "#c084fc", 3500);
          }
          if (r.victim.bondedTo) {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => {
                if (x.id === r.victim.bondedTo) {
                  x._mateDied = true;
                  assignEpithet(x);
                  if (x._newEpithet) {
                    delete x._newEpithet;
                    toast("\u{1F3F7}\uFE0F", epithetToastMsg(x), BREEDS[x.breed]?.color || "#fbbf24", 2500);
                    Audio.epithetEarned();
                  }
                  return { ...x, _mateDied: true, epithet: x.epithet, epithetKey: x.epithetKey, earnedEpithets: x.earnedEpithets };
                }
                return x;
              }));
            });
          }
          setFallen((f) => {
            const isFirstEver = f.length === 0 && (meta?.stats?.r || 0) <= 1;
            if (isFirstEver) toast("\u{1F56F}\uFE0F", "You will lose cats. This is the first. Remember their name.", "#ef4444", 4e3);
            return [...f, { name: r.victim.name, breed: r.victim.breed, night: ante, memorial: getDeathMemorial(r.victim, ante) }];
          });
        }
        if (r.type === "mentor") logEvent("mentor", { elder: r.elder.name.split(" ")[0], young: r.young.name.split(" ")[0] });
        if (r.type === "found") logEvent("found", { cat: r.cat.name.split(" ")[0], gold: r.gold });
        if (r.type === "growth") logEvent("growth", { cat: r.cat.name.split(" ")[0] });
        if (r.type === "wanderer") logEvent("wanderer", { cat: r.cat.name });
        if (r.traitGained) logEvent("trait", { cat: r.traitGained.cat.name, trait: r.traitGained.trait.name });
        if (r.type === "phoenix") {
          logEvent("phoenix", { risen: r.risen.name });
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((c) => c.id === r.risen.id ? { ...c, power: 1, scarred: true, trait: TRAITS.find((t) => t.name === "Eternal") } : c));
          });
        }
        if (r.type === "teach") {
          logEvent("teach", { parent: r.parent.name, child: r.child.name, trait: r.trait.name });
          [setHand, setDraw, setDisc].forEach((setter) => {
            setter((arr) => arr.map((c) => c.id === r.child.id ? { ...c, trait: r.child.trait, extraTraits: [...r.child.extraTraits || []], story: [...(c.story || []).slice(-3), `Learned ${r.trait.icon}${r.trait.name} from ${r.parent.name.split(" ")[0]}`] } : c));
          });
        }
      });
      const news = results.map((r) => {
        if (r.type === "breed") {
          const bTier = (r.baby.trait || PLAIN).tier;
          const isLeg = bTier === "legendary";
          const isMyth = bTier === "mythic";
          if (isMyth) {
            toast("\u{1F31F}", `MYTHIC! ${r.baby.name.split(" ")[0]}: ${r.baby.trait.icon}${r.baby.trait.name}!`, "#c084fc", 3e3);
            Audio.mythicDiscover();
          } else if (isLeg) {
            toast("\u2728", `LEGENDARY! ${r.baby.name.split(" ")[0]}: ${r.baby.trait.icon}${r.baby.trait.name}!`, "#f59e0b", 2500);
            Audio.legendaryDiscover();
          }
          return { icon: isMyth ? "\u{1F31F}" : isLeg ? "\u2728" : "\u{1F423}", text: `${r.baby.name.split(" ")[0]} born${bTier !== "common" && bTier !== "plain" ? ": " + r.baby.trait.icon + r.baby.trait.name : ""}`, color: isMyth ? "#c084fc" : isLeg ? "#f97316" : "#4ade80" };
        }
        if (r.type === "fight") return { icon: "\u2694", text: `${r.loser.name.split(" ")[0]} hardened`, color: "#ef4444" };
        if (r.type === "death") return { icon: "\u{1F480}", text: `${r.victim.name.split(" ")[0]} is gone. The colony is smaller now.`, color: "#ef4444" };
        if (r.type === "phoenix") return { icon: "\u{1F525}", text: `${r.risen.name.split(" ")[0]} rose`, color: "#fbbf24" };
        if (r.type === "mentor" && !results.some((x) => x.type === "traitTeach" && x.elder.id === r.elder.id && x.young.id === r.young.id)) return { icon: "\u{1F4D6}", text: `${r.elder.name.split(" ")[0]} taught ${r.young.name.split(" ")[0]}`, color: "#c084fc" };
        if (r.type === "found") return { icon: "\u{1F41F}", text: `${r.cat.name.split(" ")[0]} found rations`, color: "#fbbf24" };
        if (r.type === "growth") return { icon: "\u2B50", text: `${r.cat.name.split(" ")[0]} grew stronger`, color: "#4ade80" };
        if (r.type === "wanderer") return { icon: "\u{1F431}", text: `${r.cat.name.split(" ")[0]} joined`, color: "#67e8f9" };
        if (r.type === "bond") return { icon: "\u{1F495}", text: `${r.c1.name.split(" ")[0]}+${r.c2.name.split(" ")[0]} bonded`, color: "#f472b6" };
        if (r.type === "training") return { icon: "\u2694\uFE0F", text: `${r.c1.name.split(" ")[0]}+${r.c2.name.split(" ")[0]} trained`, color: "#60a5fa" };
        if (r.type === "grudge") return { icon: "\u26A1", text: `${r.c1.name.split(" ")[0]} vs ${r.c2.name.split(" ")[0]} grudge`, color: "#fb923c" };
        if (r.type === "reconcile") return { icon: "\u{1F54A}\uFE0F", text: `${r.c1.name.split(" ")[0]}+${r.c2.name.split(" ")[0]} made peace`, color: "#67e8f9" };
        if (r.type === "reconcile_bond") return { icon: "\u{1F495}", text: `${r.c1.name.split(" ")[0]}+${r.c2.name.split(" ")[0]} forgave & bonded`, color: "#f472b6" };
        if (r.type === "teach") return { icon: "\u{1F46A}", text: `${r.parent.name.split(" ")[0]} taught ${r.child.name.split(" ")[0]} ${r.trait.icon}${r.trait.name}`, color: "#34d399" };
        if (r.type === "traitTeach") return { icon: "\u2728", text: `${r.elder.name.split(" ")[0]} taught ${r.young.name.split(" ")[0]} ${r.trait.icon} ${r.trait.name}`, color: "#c084fc" };
        return null;
      }).filter(Boolean);
      setDenNews(news);
      if (!seen.inspectHint && results.some((r) => r.type === "bond" || r.type === "fight" || r.type === "death")) {
        setSeen((s) => ({ ...s, inspectHint: true }));
        setTimeout(() => toast("\u{1F446}", "Tap a cat card to see their full story", "#888", 4e3), 2500);
      }
      results.forEach((r) => {
        const addStory = (catId, moment) => {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((c) => c.id === catId ? { ...c, story: [...(c.story || []).slice(-3), moment] } : c));
          });
        };
        if (r.type === "breed") {
          addStory(r.c1.id, `Parent (N${ante})`);
          addStory(r.c2.id, `Parent (N${ante})`);
          addStory(r.baby.id, `Born N${ante}`);
        }
        if (r.type === "fight") {
          addStory(r.loser.id, `Hardened N${ante}`);
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((c) => c.id === r.loser.id && !c._hardenedNight ? { ...c, _hardenedNight: ante } : c));
          });
          const w = r.c1.id === r.loser.id ? r.c2 : r.c1;
          addStory(w.id, `Won fight N${ante}`);
        }
        if (r.type === "death") {
        }
        if (r.type === "bond") {
          addStory(r.c1.id, `Bonded N${ante}`);
          addStory(r.c2.id, `Bonded N${ante}`);
        }
        if (r.type === "reconcile" || r.type === "reconcile_bond") {
          addStory(r.c1.id, `Made peace N${ante}`);
          addStory(r.c2.id, `Made peace N${ante}`);
        }
        if (r.type === "mentor") {
          addStory(r.young.id, `Mentored by ${r.elder.name.split(" ")[0]}`);
        }
        if (r.type === "phoenix") {
          addStory(r.risen.id, `Rose from ashes N${ante}`);
        }
        if (r.type === "teach") {
          addStory(r.child.id, `Learned ${r.trait.name} from ${r.parent.name.split(" ")[0]}`);
        }
      });
      results.forEach((r) => {
        const applyEp = (cat2, ctx = {}) => {
          assignEpithet(cat2, ctx);
          if (cat2._newEpithet) {
            delete cat2._newEpithet;
            toast("\u{1F3F7}\uFE0F", epithetToastMsg(cat2), BREEDS[cat2.breed]?.color || "#fbbf24", 2500);
            Audio.epithetEarned();
            if (!seen.inspectHint) {
              setSeen((s) => ({ ...s, inspectHint: true }));
              setTimeout(() => toast("\u{1F446}", "Tap a cat card to inspect their full biography", "#888", 4e3), 3e3);
            }
          }
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((c) => c.id === cat2.id ? { ...c, epithet: cat2.epithet, epithetKey: cat2.epithetKey, story: cat2.story } : c));
          });
        };
        if (r.type === "fight" && r.loser.scarred) applyEp(r.loser);
        if (r.type === "bond") {
          applyEp(r.c1);
          applyEp(r.c2);
        }
        if (r.type === "reconcile" || r.type === "reconcile_bond") {
          r.c1._grudgeResolved = true;
          r.c2._grudgeResolved = true;
          applyEp(r.c1);
          applyEp(r.c2);
        }
      });
      results.forEach((r) => {
        let target = null, trait = null, chance = 0;
        if (r.type === "fight" && !r.wasInjured) {
          target = r.loser;
          trait = TRAITS.find((t) => t.name === "Scrapper");
          chance = 0.35;
        }
        if (r.type === "mentor") {
          target = r.young;
          trait = pk(COMMON_TRAITS);
          chance = 0.3;
        }
        if (r.type === "training") {
          target = Math.random() < 0.5 ? r.c1 : r.c2;
          trait = pk(COMMON_TRAITS);
          chance = 0.3;
        }
        if (r.type === "growth") {
          target = r.cat;
          trait = pk(COMMON_TRAITS);
          chance = 0.2;
        }
        if (r.type === "bond") {
          target = Math.random() < 0.5 ? r.c1 : r.c2;
          trait = TRAITS.find((t) => t.name === "Devoted");
          chance = 0.2;
        }
        if (r.type === "breed") {
          target = Math.random() < 0.5 ? r.c1 : r.c2;
          trait = TRAITS.find((t) => t.name === "Stubborn");
          chance = 0.15;
        }
        if (r.type === "reconcile") {
          target = Math.random() < 0.5 ? r.c1 : r.c2;
          trait = TRAITS.find((t) => t.name === "Wild");
          chance = 0.2;
        }
        if (r.type === "reconcile_bond") {
          target = Math.random() < 0.5 ? r.c1 : r.c2;
          trait = TRAITS.find((t) => t.name === "Echo");
          chance = 0.25;
        }
        if (r.type === "found") {
          target = r.cat;
          trait = TRAITS.find((t) => t.name === "Scavenger");
          chance = 0.25;
        }
        if (target && trait && Math.random() < chance) {
          const gained = addTrait(target, trait);
          if (gained) {
            r.traitGained = { cat: target, trait };
            [setHand, setDraw, setDisc].forEach((setter) => {
              setter((arr) => arr.map((c) => c.id === target.id ? { ...c, trait: target.trait, extraTraits: [...target.extraTraits || []], story: [...(c.story || []).slice(-3), `Gained ${trait.icon}${trait.name}`] } : c));
            });
          }
        }
      });
      setDenRes(results);
      setDen([]);
      setPh("denResults");
      if (meta) {
        const reconcileCount = results.filter((r) => r.type === "reconcile" || r.type === "reconcile_bond").length;
        const kittenCount = results.filter((r) => r.type === "breed").length + results.filter((r) => r.twin2).length;
        if (reconcileCount > 0 || kittenCount > 0) {
          setMeta((m) => {
            const nm = { ...m, stats: { ...m.stats, grudgesResolved: (m.stats.grudgesResolved || 0) + reconcileCount, kittensTotal: (m.stats.kittensTotal || 0) + kittenCount } };
            saveS(nm);
            return nm;
          });
        }
      }
      if (denStRef.current) clearTimeout(denStRef.current);
      const denSound = (r) => {
        if (r.type === "breed") {
          Audio.denBirth(); Haptic.double();
          setMood((m) => Math.min(100, m + 5));
        } else if (r.type === "death") {
          Audio.denDeath(); Haptic.death();
          setMood((m) => Math.max(0, m - 10));
        } else if (r.type === "fight" || r.type === "training") {
          Audio.denFight();
          setMood((m) => Math.max(0, m - 3));
        } else if (r.type === "bond" || r.type === "reconcile_bond") {
          Audio.denBond();
          setMood((m) => Math.min(100, m + 10));
        } else if (r.type === "grudge") {
          Audio.denGrudge();
          setMood((m) => Math.max(0, m - 5));
        } else if (r.type === "reconcile") {
          Audio.denBond();
          setMood((m) => Math.min(100, m + 8));
        } else if (r.type === "teach") {
          Audio.denBond();
          setMood((m) => Math.min(100, m + 5));
        } else Audio.denGrowth();
      };
      if (results.length === 0) {
      } else {
        denSound(results[0]);
        let ds = 0;
        const denAnim = () => {
          ds++;
          if (ds < results.length) {
            denSound(results[ds]);
            const r = results[ds];
            const delay = r.type === "death" ? 2e3 : r.type === "breed" ? 560 : r.type === "bond" || r.type === "reconcile_bond" ? 480 : r.type === "fight" ? 440 : r.type === "grudge" || r.type === "reconcile" ? 400 : 320;
            denStRef.current = setTimeout(denAnim, delay);
          }
        };
        const first = results[0];
        const firstDelay = first.type === "death" ? 2e3 : first.type === "breed" ? 560 : first.type === "bond" ? 480 : 400;
        denStRef.current = setTimeout(denAnim, firstDelay);
      }
    }
    function fireEvent() {
      if (Math.random() < 0.12 && ante >= 2) {
        const knownFrags = meta?.loreFragments || [];
        const newFrag = LORE_FRAGMENTS.find((f) => !knownFrags.includes(f));
        if (newFrag) {
          setTimeout(() => toast("\u{1F4DC}", newFrag, "#d9770688", 4e3), 800);
          if (meta) setMeta((m) => ({ ...m, loreFragments: [...(m.loreFragments || []), newFrag] }));
        }
      }
      if (Math.random() < 0.15 && (meta?.allFallen || []).length > 0) {
        const ghost = pk(meta.allFallen);
        const haunts = [`You found claw marks on the wall. They look like ${ghost.name}'s.`, `A stray pauses at the entrance. It has ${ghost.name}'s eyes.`, `The wind carries a sound. Almost a name. Almost ${ghost.name}.`, `Something in the way the light falls. ${ghost.name} used to stand here.`];
        setTimeout(() => toast("\u{1F47B}", pk(haunts), "#ffffff44", 3500), 1500);
      }
      const all = [...hand, ...draw, ...disc];
      const eventSource = isNinthDawn ? [...COLONY_EVENTS, ...NINTH_DAWN_EVENTS] : COLONY_EVENTS;
      const mandatory = eventSource.find((e) => e.mandatory && (!e.minNight || ante >= (longDark && e.minNight === 5 ? MX : e.minNight)) && (!e.maxNight || ante <= (longDark && e.maxNight === 5 ? MX : e.maxNight)) && !eventHistory["_seen_" + e.id]);
      if (mandatory) {
        let targets2 = [];
        if (mandatory.needsCat === "random") {
          targets2 = [pk(all)];
        } else if (mandatory.needsCat === "pair") {
          const s = shuf(all);
          targets2 = s.length >= 2 ? [s[0], s[1]] : [s[0], s[0]];
        }
        setColEvent(mandatory);
        setColTargets(targets2);
        setPh("event");
        return;
      }
      let pool = [...eventSource].filter((e) => {
        if (e.mandatory) return false;
        if (e.ninthDawn && !isNinthDawn) return false;
        const mn = longDark && e.minNight === 5 ? MX : e.minNight;
        const mx2 = longDark && e.maxNight === 5 ? MX : e.maxNight;
        if (mn && ante < mn) return false;
        if (mx2 && ante > mx2) return false;
        if (e.needsFallen && fallen.length < e.needsFallen) return false;
        if (e.chainRequires && !eventHistory[e.chainRequires]) return false;
        if (e.metaRequires && !e.metaRequires(meta?.stats || {})) return false;
        if (e.metaExcludes && e.metaExcludes(meta?.stats || {})) return false;
        if (e.condFn && !e.condFn(null, { meta, colony: all.length, fallen, all })) return false;
        if (e.once && (meta?.seenOnce || []).includes(e.id)) return false;
        return true;
      });
      if (isNinthDawn) {
        const ndEvts = pool.filter((e) => e.ninthDawn);
        if (ndEvts.length > 0) pool = ndEvts;
      }
      if (all.length < 2) pool = pool.filter((e) => e.needsCat !== "pair");
      if (all.length < 1) pool = pool.filter((e) => !e.needsCat);
      const lastTag = eventHistory._lastTag || "";
      const variedPool = pool.filter((e) => e.tag !== lastTag);
      if (variedPool.length >= 3) pool = variedPool;
      if (lastTag === "sacrifice") pool = pool.filter((e) => e.tag !== "sacrifice");
      const chainEvts = pool.filter((e) => e.chainRequires);
      const baseEvts = pool.filter((e) => !e.chainRequires);
      const hardEvents = ["sickness", "the_storm", "the_challenge", "the_sacrifice"];
      const weighted = ante >= 4 ? [...baseEvts, ...baseEvts.filter((e) => hardEvents.includes(e.id))] : baseEvts;
      const finalPool = [...weighted, ...chainEvts, ...chainEvts, ...chainEvts, ...chainEvts, ...chainEvts];
      const evt = pk(finalPool.length > 0 ? finalPool : pool);
      if (!evt) {
        nextBlind();
        return;
      }
      let targets = [];
      if (evt.needsCat === "random") {
        targets = [pk(all)];
      } else if (evt.needsCat === "pair") {
        const s = shuf(all);
        const diff = s.length >= 2 && s[0].breed !== s[1].breed;
        targets = diff ? [s[0], s[1]] : [s[0], s[1] || s[0]];
      }
      setColEvent(evt);
      setColTargets(targets);
      setPh("event");
      Audio.eventReveal();
    }
    function chooseEvent(idx) {
      if (!colEvent || !colEvent.choices || !colEvent.choices[idx]) return;
      if (actionLock.current) return;
      actionLock.current = true;
      requestAnimationFrame(() => { actionLock.current = false; });
      const fx = colEvent.choices[idx].fx;
      const targets = colTargets;
      const all = [...hand, ...draw, ...disc];
      if (fx.chainSet) setEventHistory((h) => ({ ...h, [fx.chainSet]: true }));
      if (fx.chronicleSet && meta) {
        setMeta((m) => {
          const nm = { ...m, stats: { ...m.stats, chronicle: { ...m.stats.chronicle || {}, [fx.chronicleSet]: true } } };
          saveS(nm);
          return nm;
        });
        const arcToasts = {
          scarKeeper_acknowledged: "\u2694\uFE0F The Scar Keeper remembers your choice...",
          scarKeeper_mapped: "\u{1F5FA}\uFE0F The map will guide future colonies...",
          scarKeeper_complete: "\u{1F3DB}\uFE0F The Scar Keeper's arc is complete.",
          historian_met: "\u{1F4D6} The Historian will return...",
          historian_complete: "\u{1F4DC} The Historian's story is told.",
          fireSpreader_found: "\u{1F525} A fire burns in the distance...",
          fireSpreader_complete: "\u{1F3D5}\uFE0F The Tenth Colony's story continues."
        };
        if (arcToasts[fx.chronicleSet]) toast("\u2726", arcToasts[fx.chronicleSet], "#c084fc", 3e3);
      }
      if (colEvent.tag) setEventHistory((h) => ({ ...h, _lastTag: colEvent.tag }));
      if (colEvent.mandatory) setEventHistory((h) => ({ ...h, ["_seen_" + colEvent.id]: true }));
      if (colEvent.once && meta) {
        const so = [...meta.seenOnce || [], colEvent.id];
        setMeta((m) => ({ ...m, seenOnce: so }));
      }
      const lateGame = ante >= 4;
      if (fx.gold) setGold((g) => Math.max(0, g + fx.gold));
      if (fx.fervor) {
        const boost = lateGame && fx.fervor >= 2 ? 1 : 0;
        const total = fx.fervor + boost;
        if (total > 0) setFerv((f) => Math.min(NERVE_MAX, f + total));
      }
      if (fx.bestPower) {
        const bp = fx.bestPower + (lateGame ? 1 : 0);
        const best = [...all].sort((a, b) => b.power - a.power)[0];
        if (best) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id !== best.id) return x;
              const u = { ...x, power: Math.min(15, x.power + bp) };
              if (lateGame && u.trait.name === "Plain") {
                const scr = TRAITS.find((t) => t.name === "Scrapper");
                if (scr) u.trait = scr;
              }
              return u;
            }));
          });
        }
      }
      if (fx.addCat) {
        const rjB = draftRejects.length > 0 && Math.random() < 0.5 ? pk(draftRejects) : null;
        const cp = fx.catPower || 0;
        const nc = gC(rjB ? { breed: rjB, trait: PLAIN } : { trait: PLAIN });
        if (cp) nc.power = clamp(cp, 1, 15);
        setDraw((d) => [...d, nc]);
      }
      if (fx.targetPower && targets[0]) {
        const t = targets[0];
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.min(15, Math.max(1, x.power + fx.targetPower)) } : x));
        });
      }
      if (fx.targetGamble && targets[0]) {
        if (Math.random() < 0.5) {
          const t = targets[0];
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.max(1, x.power - 2), scarred: true, injured: x.scarred, injuryTimer: x.scarred ? 2 : 0 } : x));
          });
        }
      }
      if (fx.randDmg) {
        const t = pk(all);
        if (t) {
          const d = Math.random() < 0.5 ? 1 : 2;
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.max(1, x.power - d) } : x));
          });
        }
      }
      if (fx.tempHands) setTempMods((m) => ({ ...m, hands: m.hands + fx.tempHands + (lateGame && fx.tempHands > 0 ? 1 : 0) }));
      if (fx.tempDiscs) setTempMods((m) => ({ ...m, discs: m.discs + fx.tempDiscs + (lateGame && fx.tempDiscs > 0 ? 1 : 0) }));
      if (fx.tradeCat && all.length > MIN_DECK) {
        const weakest = [...all].sort((a, b) => a.power - b.power)[0];
        if (weakest) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.filter((x) => x.id !== weakest.id));
          });
          setDraw((d) => [...d, gC({ power: Math.floor(Math.random() * 3) + 4, trait: PLAIN })]);
        }
      }
      if (fx.catFight && targets.length >= 2) {
        const w = Math.random() < 0.5 ? 0 : 1, l = w === 0 ? 1 : 0;
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (x.id === targets[w].id) return { ...x, power: Math.min(15, x.power + 2) };
            if (x.id === targets[l].id) return { ...x, power: Math.max(1, x.power - 1), scarred: true, injured: x.scarred, injuryTimer: x.scarred ? 2 : 0 };
            return x;
          }));
        });
      }
      if (fx.bothWeaken && targets.length >= 2) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (x.id === targets[0].id || x.id === targets[1].id) return { ...x, power: Math.max(1, x.power - 1) };
            return x;
          }));
        });
      }
      if (fx.rareTrait && !fx.specificTrait) {
        const best = [...all].sort((a, b) => b.power - a.power)[0];
        if (best) {
          const rt = pk(RARE_TRAITS);
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === best.id) {
                addTrait(x, rt);
                return { ...x };
              }
              return x;
            }));
          });
        }
      }
      if (fx.eventDenSafe) setEventDenSafe(true);
      if (fx.eventDenBonus) setEventDenBonus((b) => b + 1);
      if (fx.halfGold) setGold((g) => Math.floor(g / 2));
      if (fx.weakDmg) {
        const sorted = [...all].sort((a, b) => a.power - b.power).slice(0, 2);
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => sorted.find((w) => w.id === x.id) ? { ...x, power: Math.max(1, x.power - 2) } : x));
        });
      }
      if (fx.healScars) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.injured ? { ...x, injured: false, injuryTimer: 0, power: Math.min(15, x.power + 1) } : x.scarred ? { ...x, power: Math.min(15, x.power + 1) } : x));
        });
      }
      if (fx.pactBond && targets.length >= 2) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (x.id === targets[0].id) return { ...x, bondedTo: targets[1].id, power: Math.min(15, x.power + 1) };
            if (x.id === targets[1].id) return { ...x, bondedTo: targets[0].id, power: Math.min(15, x.power + 1) };
            if (x.bondedTo === targets[0].id || x.bondedTo === targets[1].id) return { ...x, bondedTo: null };
            return x;
          }));
        });
      }
      if (fx.pactGrudge && targets.length >= 2) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (x.id === targets[0].id) return { ...x, power: Math.min(15, x.power + 2), grudgedWith: [...(x.grudgedWith || []).filter((id) => id !== targets[1].id), targets[1].id] };
            if (x.id === targets[1].id) return { ...x, power: Math.min(15, x.power + 2), grudgedWith: [...(x.grudgedWith || []).filter((id) => id !== targets[0].id), targets[0].id] };
            return x;
          }));
        });
      }
      if (fx.choiceSave !== void 0 && targets.length >= 2) {
        const save = fx.choiceSave, scar = save === 0 ? 1 : 0;
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (x.id === targets[save].id) return { ...x, power: Math.min(15, x.power + 3) };
            if (x.id === targets[scar].id) return { ...x, scarred: true, grudgedWith: [...(x.grudgedWith || []).filter((id) => id !== targets[save].id), targets[save].id] };
            return x;
          }));
        });
      }
      if (fx.mapFollow && all.length > MIN_DECK) {
        const sorted = [...all].sort((a, b) => a.power - b.power);
        const remove = sorted.slice(0, 1);
        remove.forEach((r) => {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.filter((x) => x.id !== r.id));
          });
        });
        setDraw((d) => [...d, gC({ power: 5 + Math.floor(Math.random() * 3), trait: pickTrait(true) })]);
      }
      if (fx.targetScrapper && targets[0]) {
        const scrT = TRAITS.find((t) => t.name === "Scrapper");
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (x.id === targets[0].id) {
              addTrait(x, scrT);
              return { ...x };
            }
            return x;
          }));
        });
      }
      if (fx.targetHeal && targets[0]) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.id === targets[0].id ? { ...x, injured: false, injuryTimer: 0, power: Math.min(15, x.power + 2) } : x));
        });
      }
      if (fx.sacrifice && all.length > MIN_DECK) {
        const victim = targets[0] || [...all].sort((a, b) => a.power - b.power)[0];
        if (victim) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.filter((x) => x.id !== victim.id));
          });
          setFallen((f) => [...f, { name: victim.name, breed: victim.breed, night: ante, sacrificed: true }]);
          setGold((g) => g + 6);
          setEventDenSafe(true);
          logEvent("death", { victim: victim.name + " (sent by the colony)" });
          setMood((m) => Math.max(0, m - 10));
        }
      }
      if (fx.spareTarget) {
        const weakest = targets[0] || [...all].sort((a, b) => a.power - b.power)[0];
        if (weakest) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((c) => {
              if (c.id === weakest.id) {
                c._spared = true;
                assignEpithet(c);
                if (c._newEpithet) {
                  delete c._newEpithet;
                  toast("\u{1F3F7}\uFE0F", epithetToastMsg(c), BREEDS[c.breed]?.color || "#fbbf24", 2500);
                  Audio.epithetEarned();
                }
                return { ...c };
              }
              return c;
            }));
          });
          toast("\u{1F54A}\uFE0F", `${weakest.name.split(" ")[0]} stays. They don't know how close it was.`, "#4ade80", 3e3);
          setMood((m) => Math.min(100, m + 10));
        }
      }
      if (fx.exile && targets[0] && all.length > MIN_DECK) {
        const t = targets[0];
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.filter((x) => x.id !== t.id));
        });
        logEvent("exile", { victim: t.name + " (exiled)" });
      }
      if (fx.allPower) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => ({ ...x, power: Math.min(15, x.power + fx.allPower) })));
        });
      }
      if (fx.fullHeal) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => ({ ...x, injured: false, injuryTimer: 0 })));
        });
        if (lateGame) setFerv((f) => Math.min(NERVE_MAX, f + 1));
      }
      if (fx.spareTarget) {
        const weakest = targets[0] || [...all].sort((a, b) => a.power - b.power)[0];
        if (weakest) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === weakest.id) {
                x._spared = true;
                assignEpithet(x);
                return { ...x };
              }
              return x;
            }));
          });
          const wn = weakest.name.split(" ")[0];
          toast("\u{1F54A}\uFE0F", `${wn} stays. They don't know how close it was.`, "#4ade80", 3e3);
        }
      }
      if (fx.targetTrait) {
        const traitTarget = targets[0] || (() => {
          const plain = all.filter((c) => catIsPlain(c));
          return plain.length > 0 ? pk(plain) : pk(all);
        })();
        if (traitTarget) {
          const rt = pk(COMMON_TRAITS);
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === traitTarget.id) {
                addTrait(x, rt);
                return { ...x };
              }
              return x;
            }));
          });
          toast(rt.icon, `${traitTarget.name.split(" ")[0]} gained ${rt.icon} ${rt.name}!`, "#c084fc", 2500);
        }
      }
      if (fx.targetNamedTrait && targets[0]) {
        const nt = TRAITS.find((t) => t.name === fx.targetNamedTrait);
        if (nt) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === targets[0].id) {
                addTrait(x, nt);
                return { ...x };
              }
              return x;
            }));
          });
        }
      }
      if (fx.bestNamedTrait) {
        const best = [...all].sort((a, b) => b.power - a.power)[0];
        const nt = TRAITS.find((t) => t.name === fx.bestNamedTrait);
        if (best && nt) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === best.id) {
                addTrait(x, nt);
                return { ...x };
              }
              return x;
            }));
          });
        }
      }
      if (fx.bothNamedTrait && targets.length >= 2) {
        const nt = TRAITS.find((t) => t.name === fx.bothNamedTrait);
        if (nt) {
          targets.forEach((t) => {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => {
                if (x.id === t.id) {
                  addTrait(x, nt);
                  return { ...x };
                }
                return x;
              }));
            });
          });
        }
      }
      if (fx.targetScar && targets[0]) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.id === targets[0].id ? { ...x, scarred: true, _hardenedNight: x._hardenedNight || ante } : x));
        });
      }
      if (fx.targetInjure && targets[0]) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.id === targets[0].id ? { ...x, injured: true, injuryTimer: 2, stats: { ...x.stats, injuries: (x.stats?.injuries || 0) + 1 } } : x));
        });
      }
      if (fx.targetLegendary && targets[0]) {
        const lt = pk(LEGENDARY_TRAITS);
        if (lt) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === targets[0].id) {
                addTrait(x, lt);
                return { ...x };
              }
              return x;
            }));
          });
          toast("\u2728", `${targets[0].name.split(" ")[0]} gained ${lt.icon} ${lt.name}!`, "#f97316", 3e3);
          Audio.legendaryDiscover();
        }
      }
      if (fx.bestInjure) {
        const best = [...all].sort((a, b) => b.power - a.power)[0];
        if (best) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === best.id ? { ...x, injured: true, injuryTimer: 2 } : x));
          });
        }
      }
      if (fx.targetGambleScar && targets[0]) {
        if (Math.random() < 0.5) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === targets[0].id ? { ...x, scarred: true } : x));
          });
        }
      }
      if (fx.addNamedTrait) {
        const nt = TRAITS.find((t) => t.name === fx.addNamedTrait);
        if (nt) {
          const plain = all.filter((c) => catIsPlain(c));
          const pick = plain.length > 0 ? pk(plain) : pk(all);
          if (pick) {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => {
                if (x.id === pick.id) {
                  addTrait(x, nt);
                  return { ...x };
                }
                return x;
              }));
            });
          }
        }
      }
      if (fx.addWard) {
        const available = FAMS.filter((w) => !fams.find((f) => f.id === w.id));
        if (available.length > 0 && fams.length < MF) {
          const w = pk(available);
          setFams((fs) => [...fs, w]);
          toast(w.icon, `${w.name} found`, "#fbbf24");
        } else {
          setGold((g) => g + 5);
          toast("\u{1F41F}", "No room for a ward. +5 Rations instead.", "#fbbf24");
        }
      }
      if (fx.specificTrait && fx.rareTrait) {
        const best = [...all].sort((a, b) => b.power - a.power)[0];
        const st = TRAITS.find((t) => t.name === fx.specificTrait) || pk(RARE_TRAITS);
        if (best) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === best.id) {
                addTrait(x, st);
                return { ...x };
              }
              return x;
            }));
          });
        }
      }
      if (fx.bondedPower) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.bondedTo ? { ...x, power: Math.min(15, x.power + fx.bondedPower) } : x));
        });
      }
      if (fx.addPhoenixKitten) {
        const phTr = TRAITS.find((t) => t.name === "Phoenix");
        const kitten = gC({ power: 1, trait: phTr });
        kitten.story = ["Born from the Third Colony's memory"];
        setDraw((d) => [...d, kitten]);
      }
      if (fx.dareBet) {
        setDareBet(true);
      }
      if (fx.echoGamble) {
        const t = pk(all);
        if (t) {
          if (Math.random() < 0.6) {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.min(15, x.power + 2) } : x));
            });
          } else {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => x.id === t.id ? { ...x, scarred: true, power: Math.max(1, x.power - 1) } : x));
            });
          }
        }
      }
      if (fx.mysteryGift) {
        const r = Math.random();
        if (r < 0.4) {
          setGold((g) => g + 6);
          fx._mysteryResult = "gold";
        } else if (r < 0.75) {
          const avail = FAMS.filter((f) => !fams.find((ff) => ff.id === f.id));
          if (avail.length) {
            setFams((f) => [...f, pk(avail)].slice(0, 5));
            fx._mysteryResult = "ward";
          } else {
            setGold((g) => g + 5);
            fx._mysteryResult = "gold";
          }
        } else {
          const c = pk(CURSES.filter((x) => x.tier <= 2));
          if (c) {
            setCurses((cu) => [...cu, c]);
            fx._mysteryResult = "curse";
          } else fx._mysteryResult = "gold";
        }
      }
      if (fx.pushCat && targets[0]) {
        const t = targets[0];
        if (Math.random() < 0.4) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.min(15, x.power + 3), injured: true, injuryTimer: 2 } : x));
          });
        } else {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.min(15, x.power + 3) } : x));
          });
        }
      }
      if (fx.redistribute) {
        const sorted = [...all].sort((a, b) => b.power - a.power);
        const best = sorted[0];
        const weak = sorted.slice(-2);
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (best && x.id === best.id) return { ...x, power: Math.max(1, x.power - 1) };
            if (weak.find((w) => w.id === x.id)) return { ...x, power: Math.min(15, x.power + 1) };
            return x;
          }));
        });
      }
      if (fx.catDecide && targets[0]) {
        const t = targets[0];
        const isScarred = t.scarred;
        const hasTrait = (t.trait || PLAIN).name !== "Plain";
        if (isScarred) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.min(15, x.power + 2) } : x));
          });
          setFerv((f) => Math.min(NERVE_MAX, f + 1));
        } else if (hasTrait) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.min(15, x.power + 1) } : x));
          });
          const weak = all.filter((x) => x.id !== t.id).sort((a, b) => a.power - b.power)[0];
          if (weak) {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => x.id === weak.id ? { ...x, power: Math.min(15, x.power + 2) } : x));
            });
          }
        } else {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, injured: false, injuryTimer: 0, power: Math.min(15, x.power + 1) } : x));
          });
        }
      }
      if (fx.mysteryDoor) {
        const r = Math.random();
        if (r < 0.35) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => ({ ...x, injured: false, injuryTimer: 0 })));
          });
          setGold((g) => g + 3);
        } else if (r < 0.7) {
          const best = [...all].sort((a, b) => b.power - a.power)[0];
          if (best) {
            const rt = pk(RARE_TRAITS);
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => {
                if (x.id === best.id) {
                  addTrait(x, rt);
                  return { ...x };
                }
                return x;
              }));
            });
          }
        } else {
          const weak = [...all].sort((a, b) => a.power - b.power)[0];
          if (weak) {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.filter((x) => x.id !== weak.id));
            });
          }
          setDraw((d) => [...d, gC({ trait: PLAIN }), gC({ trait: PLAIN })]);
        }
      }
      if (fx.chorusJoin) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => ({ ...x, injured: false, injuryTimer: 0 })));
        });
        setFerv((f) => Math.min(NERVE_MAX, f + 2));
        const unbonded = all.filter((x) => !x.bondedTo);
        if (unbonded.length >= 2) {
          const a = pk(unbonded), b = pk(unbonded.filter((x) => x.id !== a.id && x.sex !== a.sex));
          if (a && b) {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => {
                if (x.id === a.id) return { ...x, bondedTo: b.id };
                if (x.id === b.id) return { ...x, bondedTo: a.id };
                if (x.bondedTo === a.id || x.bondedTo === b.id) return { ...x, bondedTo: null };
                return x;
              }));
            });
          }
        }
      }
      if (fx.tideGaze) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            const r = Math.random();
            if (r < 0.4) return { ...x, power: Math.min(15, x.power + 1) };
            if (r < 0.7) return x;
            return { ...x, power: Math.max(1, x.power - 1) };
          }));
        });
      }
      if (fx.tideWade) {
        const best = [...all].sort((a, b) => b.power - a.power)[0];
        if (best) {
          const rt = pk([...RARE_TRAITS, ...RARE_TRAITS, TRAITS.find((t) => t.name === "Wild")]);
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === best.id) {
                addTrait(x, rt);
                return { ...x, scarred: true };
              }
              return x;
            }));
          });
        }
      }
      if (fx.allPowerLoss) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => ({ ...x, power: Math.max(1, x.power - 1) })));
        });
      }
      if (fx.debtBlood) {
        const t = pk(all);
        if (t) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, scarred: true } : x));
          });
        }
        setFerv((f) => Math.min(NERVE_MAX, f + 2));
        setGold((g) => g + 4);
      }
      if (fx.debtRefuse) {
        if (Math.random() < 0.5) {
          setFerv((f) => Math.min(NERVE_MAX, f + 3));
        } else {
          setTempMods((m) => ({ ...m, hands: m.hands - 1 }));
          const t = pk(all);
          if (t) {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.max(1, x.power - 2) } : x));
            });
          }
        }
      }
      if (fx.inheritanceRead) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => ({ ...x, power: Math.min(15, x.power + 1) })));
        });
        const t = pk(all.filter((x) => (x.trait || PLAIN).name === "Plain"));
        if (t) {
          const tr = pk(COMMON_TRAITS);
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === t.id) {
                addTrait(x, tr);
                return { ...x };
              }
              return x;
            }));
          });
        }
      }
      if (fx.inheritancePrivate && targets[0]) {
        const t = targets[0];
        const rt = pk(RARE_TRAITS);
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (x.id === t.id) {
              addTrait(x, rt);
              return { ...x, power: Math.min(15, x.power + 3) };
            }
            return x;
          }));
        });
      }
      if (fx.splitFollow !== void 0 && targets.length >= 2) {
        const leader = targets[fx.splitFollow], other = targets[fx.splitFollow === 0 ? 1 : 0];
        if (leader.power >= 8) {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => ({ ...x, power: Math.min(15, x.power + 1) })));
          });
          setGold((g) => g + 3);
        } else {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === leader.id ? { ...x, power: Math.min(15, x.power + 2) } : x));
          });
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === other.id ? { ...x, power: Math.max(1, x.power - 1) } : x));
          });
        }
      }
      if (fx.hollowEnter) {
        const t = pk(all);
        if (t) {
          const r = Math.random();
          if (r < 0.5) {
            const rt = pk(COMMON_TRAITS);
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => {
                if (x.id === t.id) {
                  addTrait(x, rt);
                  return { ...x, power: Math.min(15, x.power + 1) };
                }
                return x;
              }));
            });
          } else if (r < 0.8) {
            setGold((g) => g + 5);
          } else {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => x.id === t.id ? { ...x, scarred: true, power: Math.min(15, x.power + 2) } : x));
            });
          }
        }
      }
      if (fx.wagerBest) {
        const best = [...all].sort((a, b) => b.power - a.power)[0];
        if (best) {
          if (Math.random() < 0.55) {
            const rt = pk(RARE_TRAITS);
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => {
                if (x.id === best.id) {
                  addTrait(x, rt);
                  return { ...x, power: Math.min(15, x.power + 3) };
                }
                return x;
              }));
            });
            setGold((g) => g + 8);
          } else {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => x.id === best.id ? { ...x, scarred: true, injured: true, injuryTimer: 2, power: Math.max(1, x.power - 3) } : x));
            });
          }
        }
      }
      if (fx.wagerGold) {
        const half = Math.floor((gold || 0) / 2);
        setGold((g) => Math.floor(g / 2));
        if (Math.random() < 0.55) {
          setGold((g) => g + half * 3);
          setFerv((f) => Math.min(NERVE_MAX, f + 2));
        } else {
        }
      }
      if (fx.truthTrust && targets[0]) {
        const t = targets[0];
        const r = Math.random();
        if (r < 0.4) {
          const rt = pk(RARE_TRAITS);
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => {
              if (x.id === t.id) {
                addTrait(x, rt);
                return { ...x };
              }
              return x;
            }));
          });
        } else if (r < 0.7) {
          setFerv((f) => Math.min(NERVE_MAX, f + 3));
        } else {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, scarred: true, power: Math.max(1, x.power - 1) } : x));
          });
          setFerv((f) => Math.min(NERVE_MAX, f + 1));
        }
      }
      if (fx.addStrays) {
        for (let i = 0; i < fx.addStrays; i++) setDraw((d) => [...d, gC({ trait: PLAIN })]);
      }
      if (fx.visionPeek) {
        const r = Math.random();
        if (r < 0.5) {
          setFerv((f) => Math.min(NERVE_MAX, f + 2));
        } else if (r < 0.8) {
          setGold((g) => g + 4);
        } else {
          const t = pk(all);
          if (t) {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => x.id === t.id ? { ...x, scarred: true } : x));
            });
          }
          setFerv((f) => Math.min(NERVE_MAX, f + 3));
        }
      }
      if (fx.forceBond && targets.length >= 2) {
        const [a, b] = targets;
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (x.id === a.id) return { ...x, bondedTo: b.id };
            if (x.id === b.id) return { ...x, bondedTo: a.id };
            if (x.bondedTo === a.id || x.bondedTo === b.id) return { ...x, bondedTo: null };
            return x;
          }));
        });
      }
      if (fx.shelterTarget && targets[0]) {
        setEventDenSafe(true);
      }
      if (fx.othersPower) {
        const tid = targets[0]?.id;
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.id !== tid ? { ...x, power: Math.min(15, x.power + fx.othersPower) } : x));
        });
      }
      if (fx.targetWeaken && targets[0]) {
        const t = targets[0];
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.max(1, x.power - fx.targetWeaken) } : x));
        });
      }
      if (fx.bothPower && targets.length >= 2) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => {
            if (x.id === targets[0].id || x.id === targets[1].id) return { ...x, power: Math.min(15, x.power + fx.bothPower) };
            return x;
          }));
        });
      }
      const outcomeText = buildOutcomeText(colEvent, colEvent.choices[idx], targets, fx);
      const choiceLabel = colEvent.choices[idx].labelFn ? colEvent.choices[idx].labelFn(targets) : colEvent.choices[idx].label;
      if (fx.seasonBoost) {
        const season = fx.seasonBoost;
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.breed === season ? { ...x, power: Math.min(15, x.power + 1) } : x));
        });
      }
      if (fx.kindredBoost) {
        setTempMods((m) => ({ ...m, kindredMult: (m.kindredMult || 0) + 2 }));
      }
      if (fx.teachDominant) {
        const tc = {};
        all.forEach((c) => {
          if (c.trait?.name !== "Plain") tc[c.trait?.name] = (tc[c.trait?.name] || 0) + 1;
        });
        const top = Object.entries(tc).sort((a, b) => b[1] - a[1])[0];
        if (top) {
          const trait = TRAITS.find((t) => t.name === top[0]);
          const plain = all.filter((c) => (c.trait || PLAIN).name === "Plain");
          const target = pk(plain);
          if (target && trait) {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => {
                if (x.id === target.id) {
                  addTrait(x, trait);
                  return { ...x };
                }
                return x;
              }));
            });
          }
        }
      }
      if (fx.hardenedBoost) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.scarred ? { ...x, power: Math.min(15, x.power + 1) } : x));
        });
      }
      if (fx.bondBoost) {
        [setHand, setDraw, setDisc].forEach((s) => {
          s((arr) => arr.map((x) => x.bondedTo ? { ...x, power: Math.min(15, x.power + 1) } : x));
        });
        setMood((m) => Math.min(100, m + 3));
      }
      logEvent("event", { title: colEvent.title, choice: choiceLabel });
      if (outcomeText.length > 0) {
        const top = outcomeText[0];
        toast(top.icon || "\u{1F4DC}", top.text, top.color || "#fbbf24");
      }
      const missed = colEvent.choices.filter((ch, ci) => ci !== idx && ch.fx.gold && ch.fx.gold <= -3 && gold < Math.abs(ch.fx.gold));
      if (missed.length > 0) {
        const mc = missed[0];
        const injuredCat = all.find((c) => c.injured);
        const plainCat = all.find((c) => (c.trait || PLAIN).name === "Plain");
        const regretText = mc.fx.fullHeal && injuredCat ? `The ${mc.label.split(".")[0].toLowerCase()} would have healed ${injuredCat.name.split(" ")[0]}.` : mc.fx.allPower ? `${Math.abs(mc.fx.gold)}\u{1F41F} short of making everyone stronger.` : mc.fx.targetNamedTrait && plainCat ? `${plainCat.name.split(" ")[0]} could have learned something. ${Math.abs(mc.fx.gold)}\u{1F41F} short.` : mc.fx.eventDenSafe ? `The den could have been safe. ${Math.abs(mc.fx.gold)}\u{1F41F} short.` : null;
        if (regretText) setTimeout(() => toast("", "..." + regretText, "#ffffff55", 3500), 2500);
      }
      setEventOutcome({ title: colEvent.title, icon: colEvent.icon, choice: choiceLabel, desc: outcomeText, targets });
      setColEvent(null);
      setColTargets([]);
      setPh("eventResult");
    }
    function buildOutcomeText(evt, choice, targets, fx) {
      const lines = [];
      if (fx.gold > 0) lines.push({ text: `+${fx.gold} Rations`, color: "#fbbf24", icon: "\u{1F41F}" });
      if (fx.gold < 0) lines.push({ text: `${fx.gold} Rations`, color: "#ef4444", icon: "\u{1F41F}" });
      if (fx.fervor > 0) lines.push({ text: `+${fx.fervor} Nerve`, color: "#d97706", icon: "\u{1F525}" });
      if (fx.bestPower) lines.push({ text: `Best cat +${fx.bestPower} Power`, color: "#4ade80", icon: "\u2B50" });
      if (fx.addCat) lines.push({ text: "A new cat joins the colony", color: "#67e8f9", icon: "\u{1F431}" });
      if (fx.targetPower && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} ${fx.targetPower > 0 ? "+" : ""}${fx.targetPower} Power`, color: fx.targetPower > 0 ? "#4ade80" : "#ef4444", icon: "\u26A1" });
      if (fx.targetGamble && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]}: fate decided...`, color: "#fbbf24", icon: "\u{1F3B2}" });
      if (fx.randDmg) lines.push({ text: "A cat was caught in the storm", color: "#ef4444", icon: "\u26C8\uFE0F" });
      if (fx.tempHands) lines.push({ text: `${fx.tempHands > 0 ? "+" : ""}${fx.tempHands} Hands next round`, color: fx.tempHands > 0 ? "#4ade80" : "#ef4444", icon: "\u270A" });
      if (fx.tempDiscs) lines.push({ text: `+${fx.tempDiscs} Free Recruits next round`, color: "#4ade80", icon: "\u{1F4E3}" });
      if (fx.tradeCat) lines.push({ text: "Weakest traded for a stronger stranger", color: "#fbbf24", icon: "\u{1F504}" });
      if (fx.catFight) lines.push({ text: "One stands taller. One bears the mark.", color: "#ef4444", icon: "\u2694\uFE0F" });
      if (fx.bothWeaken) lines.push({ text: "Both separated. Both diminished.", color: "#ef4444", icon: "\u{1F494}" });
      if (fx.rareTrait && !fx.specificTrait) lines.push({ text: "Best cat touched by something ancient", color: "#fbbf24", icon: "\u2728" });
      if (fx.specificTrait) lines.push({ text: `Best cat gained ${fx.specificTrait}. The flame lives in them now.`, color: "#fbbf24", icon: "\u{1F525}" });
      if (fx.eventDenSafe) lines.push({ text: "Next den is protected. No fights.", color: "#4ade80", icon: "\u{1F54A}\uFE0F" });
      if (fx.eventDenBonus) lines.push({ text: "+1 Shelter slot this night.", color: "#4ade80", icon: "\u{1F3E0}" });
      if (fx.halfGold) lines.push({ text: "Lost half your Rations saving everyone", color: "#ef4444", icon: "\u{1F41F}" });
      if (fx.weakDmg) lines.push({ text: "The youngest took the worst of it (-2 Power each)", color: "#ef4444", icon: "\u{1F30A}" });
      if (fx.healScars) lines.push({ text: "Scarred cats healed (+1 Power each)", color: "#4ade80", icon: "\u{1F49A}" });
      if (fx.pactBond) lines.push({ text: `${targets[0]?.name.split(" ")[0]} and ${targets[1]?.name.split(" ")[0]} bonded. +1 Power each.`, color: "#f472b6", icon: "\u{1F495}" });
      if (fx.pactGrudge) lines.push({ text: `Both grew stronger. But the grudge is real.`, color: "#fb923c", icon: "\u26A1" });
      if (fx.choiceSave !== void 0 && targets.length >= 2) {
        const sv = fx.choiceSave, sc = sv === 0 ? 1 : 0;
        lines.push({ text: `${targets[sv].name.split(" ")[0]} saved. ${targets[sc].name.split(" ")[0]} hardened. They won't forget.`, color: "#fbbf24", icon: "\u2696\uFE0F" });
      }
      if (fx.mapFollow) lines.push({ text: "One cat left. A stranger arrived.", color: "#c084fc", icon: "\u{1F5FA}\uFE0F" });
      if (fx.targetScrapper) lines.push({ text: `${targets[0]?.name.split(" ")[0]} gained Scrapper. The cost may come later.`, color: "#fb923c", icon: "\u{1F94A}" });
      if (fx.targetHeal) lines.push({ text: `${targets[0]?.name.split(" ")[0]} healed. +2 Power. But one less hand tomorrow.`, color: "#4ade80", icon: "\u{1F49A}" });
      if (fx.sacrifice) lines.push({ text: `${targets[0]?.name.split(" ")[0] || "One"} walked into the dark. The den sleeps safely tonight.`, color: "#ef4444", icon: "\u{1F54A}\uFE0F" });
      if (fx.exile && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} was cast out. The colony is lighter.`, color: "#ef4444", icon: "\u{1F6AA}" });
      if (fx.allPower) lines.push({ text: `All cats +${fx.allPower} Power`, color: "#4ade80", icon: "\u2B50" });
      if (fx.fullHeal) lines.push({ text: "All injuries healed.", color: "#4ade80", icon: "\u{1F49A}" });
      if (fx.targetTrait) lines.push({ text: targets[0] ? `${targets[0].name.split(" ")[0]} learned something new.` : "A cat learned something from the old marks.", color: "#c084fc", icon: "\u{1F4DC}" });
      if (fx.targetNamedTrait && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} gained ${fx.targetNamedTrait}.`, color: "#4ade80", icon: TRAITS.find((t) => t.name === fx.targetNamedTrait)?.icon || "\u2728" });
      if (fx.bestNamedTrait) lines.push({ text: `Best cat gained ${fx.bestNamedTrait}.`, color: "#fbbf24", icon: TRAITS.find((t) => t.name === fx.bestNamedTrait)?.icon || "\u2728" });
      if (fx.bothNamedTrait && targets.length >= 2) lines.push({ text: `${targets[0].name.split(" ")[0]} and ${targets[1].name.split(" ")[0]} both gained ${fx.bothNamedTrait}.`, color: "#4ade80", icon: TRAITS.find((t) => t.name === fx.bothNamedTrait)?.icon || "\u2728" });
      if (fx.bondedPower) lines.push({ text: `All bonded cats +${fx.bondedPower} Power. Love fuels rage.`, color: "#f472b6", icon: "\u{1F495}" });
      if (fx.addPhoenixKitten) lines.push({ text: "A kitten appeared. Power 1. Trait: Phoenix. Born from memory.", color: "#fbbf24", icon: "\u{1F525}" });
      if (fx.dareBet) lines.push({ text: "The dare is set. Next hand decides.", color: "#fbbf24", icon: "\u{1F4CA}" });
      if (fx.echoGamble) lines.push({ text: "The echo answered. Something changed.", color: "#c084fc", icon: "\u{1F50A}" });
      if (fx.mysteryGift) {
        const mr = fx._mysteryResult || "gold";
        lines.push({ text: mr === "gold" ? "Rations inside. Practical." : mr === "ward" ? "A ward, wrapped in old cloth. Still warm." : "A curse. Someone else's bad luck, now yours.", color: mr !== "curse" ? "#fbbf24" : "#ef4444", icon: mr === "gold" ? "\u{1F41F}" : mr === "ward" ? "\u{1F6E1}\uFE0F" : "\u{1F480}" });
      }
      if (fx.pushCat && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} pushed harder. +3 Power.`, color: "#4ade80", icon: "\u{1F4AA}" });
      if (fx.redistribute) lines.push({ text: "Burden shared. Colony rebalanced.", color: "#67e8f9", icon: "\u2696\uFE0F" });
      if (fx.catDecide && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} made their own choice.`, color: "#c084fc", icon: "\u{1F431}" });
      if (fx.mysteryDoor) lines.push({ text: "Through the door: something you didn't expect.", color: "#c084fc", icon: "\u{1F6AA}" });
      if (fx.chorusJoin) lines.push({ text: "The sound became something solid. Bonds formed in the resonance.", color: "#f472b6", icon: "\u{1F3B5}" });
      if (fx.tideGaze) lines.push({ text: "Each cat saw something different. Not all of it was kind.", color: "#67e8f9", icon: "\u{1F30A}" });
      if (fx.tideWade && targets.length === 0) lines.push({ text: "The strongest waded in. Came back changed. And hardened.", color: "#fbbf24", icon: "\u{1F30A}" });
      if (fx.allPowerLoss) lines.push({ text: "All cats \u22121 Power. The retreat cost something.", color: "#ef4444", icon: "\u{1F4C9}" });
      if (fx.debtBlood) lines.push({ text: "Blood paid. Something gained. The balance holds.", color: "#ef4444", icon: "\u{1FA78}" });
      if (fx.debtRefuse) lines.push({ text: "The debt remembers. Whether it forgives... we'll see.", color: "#fb923c", icon: "\u{1F4B0}" });
      if (fx.inheritanceRead) lines.push({ text: "The will was read. Every cat heard it. One understood.", color: "#4ade80", icon: "\u{1F4DC}" });
      if (fx.inheritancePrivate && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} kept the secret. Grew from it.`, color: "#fbbf24", icon: "\u{1F4DC}" });
      if (fx.splitFollow !== void 0 && targets.length >= 2) lines.push({ text: `The colony followed ${targets[fx.splitFollow].name.split(" ")[0]}.`, color: "#67e8f9", icon: "\u{1F500}" });
      if (fx.hollowEnter) lines.push({ text: "Someone went in. Something came out.", color: "#c084fc", icon: "\u{1F333}" });
      if (fx.wagerBest) lines.push({ text: "The wager was accepted. The voice always pays.", color: "#fbbf24", icon: "\u{1F3B2}" });
      if (fx.wagerGold) lines.push({ text: "Rations on the table. The voice smiled.", color: "#fbbf24", icon: "\u{1F3B2}" });
      if (fx.truthTrust && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} saw something in the wall. You chose to believe them.`, color: "#c084fc", icon: "\u{1F441}\uFE0F" });
      if (fx.addStrays) lines.push({ text: `+${fx.addStrays} stray${fx.addStrays > 1 ? "s" : ""} joined the colony.`, color: "#888", icon: "\u{1F43E}" });
      if (fx.visionPeek) lines.push({ text: "The vision passed. Something changed.", color: "#c084fc", icon: "\u{1F52E}" });
      if (fx.forceBond && targets.length >= 2) lines.push({ text: `${targets[0].name.split(" ")[0]} and ${targets[1].name.split(" ")[0]} bonded.`, color: "#f472b6", icon: "\u{1F495}" });
      if (fx.shelterTarget) lines.push({ text: "Quarantined. The den is safe.", color: "#4ade80", icon: "\u{1F3E0}" });
      if (fx.othersPower) lines.push({ text: `Others gained +${fx.othersPower} Power.`, color: "#4ade80", icon: "\u2B50" });
      if (fx.targetWeaken && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} \u2212${fx.targetWeaken} Power.`, color: "#ef4444", icon: "\u{1F4C9}" });
      if (fx.bothPower && targets.length >= 2) lines.push({ text: `${targets[0].name.split(" ")[0]} and ${targets[1].name.split(" ")[0]} both +${fx.bothPower} Power.`, color: "#4ade80", icon: "\u26A1" });
      if (fx.targetScar && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} hardened.`, color: "#fbbf24", icon: "\u2694" });
      if (fx.targetInjure && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} injured.`, color: "#ef4444", icon: "\u{1FA79}" });
      if (fx.targetLegendary && targets[0]) lines.push({ text: `${targets[0].name.split(" ")[0]} gained a Legendary trait!`, color: "#f97316", icon: "\u2728" });
      if (fx.bestInjure) lines.push({ text: `Best cat injured. The cost was steep.`, color: "#ef4444", icon: "\u{1FA79}" });
      if (fx.addNamedTrait) lines.push({ text: `A cat gained ${fx.addNamedTrait}.`, color: "#4ade80", icon: TRAITS.find((t) => t.name === fx.addNamedTrait)?.icon || "\u2728" });
      if (fx.addWard) lines.push({ text: "Found a ward.", color: "#fbbf24", icon: "\u{1F52E}" });
      if (fx.catPower && fx.addCat) lines.push({ text: `A Power ${fx.catPower} cat joins.`, color: "#67e8f9", icon: "\u{1F431}" });
      if (fx.seasonBoost) lines.push({ text: `All ${fx.seasonBoost} cats +1 Power. The season answers.`, color: BREEDS[fx.seasonBoost]?.color || "#fbbf24", icon: BREEDS[fx.seasonBoost]?.icon || "\u2726" });
      if (fx.kindredBoost) lines.push({ text: "Kindred hands get +2 mult this run.", color: "#c084fc", icon: "\u{1F43E}" });
      if (fx.teachDominant) lines.push({ text: "A Plain cat learned the colony's dominant trait.", color: "#c084fc", icon: "\u2728" });
      if (fx.hardenedBoost) lines.push({ text: "All hardened cats +1 Power. Battle makes them stronger.", color: "#fbbf24", icon: "\u2694" });
      if (fx.bondBoost) lines.push({ text: "All bonded cats +1 Power. Love is architecture.", color: "#f472b6", icon: "\u{1F495}" });
      if (Object.keys(fx).length === 0) lines.push({ text: "Nothing happened.", color: "#666", icon: "..." });
      return lines;
    }
    async function buyUpg(u) {
      if (!meta || meta.dust < u.cost) return;
      const cur = meta.ups[u.id] || 0;
      if (cur >= u.max) return;
      const um = { ...meta, dust: meta.dust - u.cost, ups: { ...meta.ups, [u.id]: cur + 1 } };
      setMeta(um);
      await saveS(um);
      const upgVoice = { "gold": "They buried provisions for the ones who came next.", "hands": "Steadier now. The old fire taught patience.", "freeRecruits": "The remembered ones call reinforcements from the shadows.", "fervor": "The old fire burns in the new colony's veins.", "heirloom": "The bloodline carries what the mind forgets.", "bloodMemory": "Memory in the blood. Deeper than names.", "dustBonus": "The stars owe you. They're starting to pay.", "xpBonus": "Every hand teaches more now.", "scarMemory": "Scars carry wisdom. The Hearth cats knew this.", "startWard": "Protection. The first gift of the remembered.", "grudgeWisdom": "The old scars teach patience. Grudges sting less now.", "shelter": "Deeper burrows. Safer dreams.", "recruitDiscount": "Sharper eyes. The colony knows who to call.", "breedBoost": "The earth remembers how to grow.", "startScroll": "Ancient knowledge, passed down in paw prints.", "doubleBench": "Those who watch learn twice as much.", "comboBoost": "Power aligned. The colony resonates.", "extraDraft": "One more voice in the chorus.", "mythicChance": "The stars choose their champions.", "bondBoost": "Love is the strongest multiplier.", "bossHand": "One more breath. One more chance.", "draftPower": "Stronger stock. The bloodline remembers.", "draftSize": "Wider nets catch rarer fish.", "traitLuck": "The colony remembers what it needs." };
      toast("\u2726", upgVoice[u.id] || "Something the Hearth cats knew. Something they left for you.", "#c084fc");
    }
    const selC = React.useMemo(() => [...sel].map((i) => hand[i]).filter(Boolean), [sel, hand]);
    const preview = React.useMemo(() => sel.size >= 1 ? evalH(selC) : null, [sel.size, selC]);
    const tgt = eTgt();
    const isBoss = blind === 2;
    const blindN = ["Dusk", "Midnight", boss?.name || "The Boss"];
    const W = { width: "100%", minHeight: "100vh", background: isBoss ? "linear-gradient(180deg,#140808,#1a0808,#0d0815)" : ferv >= 7 ? "linear-gradient(180deg,#0f0808,#1a0a0a,#0d0815)" : "linear-gradient(180deg,#06060f,#0a0a1a,#0d0815)", color: "#e8e6e3", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden", transition: "background .8s, opacity .12s", opacity: phFade ? 0 : 1 };
    const BG = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `${isBoss ? "radial-gradient(circle at 50% 30%,#ef444411,transparent 50%)" : ferv >= NERVE_MAX ? "radial-gradient(circle at 50% 50%,#fef08a11,transparent 40%)" : "radial-gradient(circle at 20% 80%,#7a665211,transparent 50%),radial-gradient(circle at 80% 20%,#06b6d411,transparent 50%)"},radial-gradient(ellipse at 50% 50%,transparent 50%,#00000088 100%)` };
    const BTN = (bg, col, on = true) => ({ padding: "9px 24px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 8, cursor: on ? "pointer" : "not-allowed", letterSpacing: 1, background: on ? bg : "#222", color: on ? col : "#555", transition: "all .15s" });
    const CSS = `
    @keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes epithetFlash{0%{box-shadow:0 0 0 0 #fbbf2400}15%{box-shadow:0 0 20px 4px #fbbf2466}50%{box-shadow:0 0 30px 6px #fbbf2433}100%{box-shadow:0 0 0 0 #fbbf2400}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes driftParticle{0%{transform:translateY(100vh) translateX(0);opacity:0}10%{opacity:.3}90%{opacity:.15}100%{transform:translateY(-10vh) translateX(30px);opacity:0}}
    @keyframes shimmer{0%,100%{opacity:.03}50%{opacity:.08}}
    @keyframes fp{0%,100%{text-shadow:0 0 12px #ffffffaa}50%{text-shadow:0 0 24px #ffffffdd}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes fpp{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
    @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
    @keyframes guidePulse{0%,100%{transform:translateY(0);filter:brightness(1)}50%{transform:translateY(-4px);filter:brightness(1.2)}}
    @keyframes glow{0%,100%{box-shadow:0 0 15px #fef08a44}50%{box-shadow:0 0 30px #fef08a88}}
    @keyframes flash{0%{opacity:0}30%{opacity:1}100%{opacity:0}}
    @keyframes countUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes scorePop{0%{transform:scale(1)}30%{transform:scale(1.4)}100%{transform:scale(1)}}
    @keyframes tierReveal{0%{opacity:0;transform:scale(.3) translateY(15px)}40%{opacity:1;transform:scale(1.2) translateY(-3px)}100%{transform:scale(1) translateY(0)}}
    @keyframes clutchBurst{0%{opacity:0;transform:scale(0);letter-spacing:20px}40%{opacity:1;transform:scale(1.3);letter-spacing:12px}100%{opacity:1;transform:scale(1);letter-spacing:8px}}
    @keyframes newBestPop{0%{opacity:0;transform:scale(0) rotate(-10deg)}50%{opacity:1;transform:scale(1.3) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
    @keyframes comboBurst{0%{opacity:0;transform:scale(0.3)}40%{opacity:1;transform:scale(1.4)}60%{transform:scale(0.9)}100%{transform:scale(1)}}
    @keyframes scorePopFade{0%{opacity:0;transform:translateY(8px) scale(0.8)}100%{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes multFlash{0%{opacity:0;transform:scale(0) rotate(-15deg)}50%{opacity:1;transform:scale(1.5) rotate(5deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
    @keyframes bigShake{0%,100%{transform:translate(0,0)}10%{transform:translate(-4px,-2px)}20%{transform:translate(3px,1px)}30%{transform:translate(-3px,-1px)}40%{transform:translate(2px,2px)}50%{transform:translate(-2px,-1px)}60%{transform:translate(1px,1px)}80%{transform:translate(1px,-1px)}}
    @keyframes starFall{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(60vh) scale(0.3)}}
    @keyframes breathe{0%,100%{opacity:.3}50%{opacity:.8}}
    @keyframes epicReveal{0%{opacity:0;letter-spacing:20px;filter:blur(8px)}60%{opacity:1;letter-spacing:8px;filter:blur(0)}100%{letter-spacing:4px}}
    @keyframes cardSquash{0%{transform:scaleX(1) scaleY(1)}30%{transform:scaleX(1.08) scaleY(0.92)}60%{transform:scaleX(0.97) scaleY(1.03)}100%{transform:scaleX(1) scaleY(1)}}
    @keyframes targetCross{0%{color:#4ade80;text-shadow:0 0 0 transparent}20%{color:#fef08a;text-shadow:0 0 20px #4ade8088}60%{color:#4ade80;text-shadow:0 0 10px #4ade8044}100%{text-shadow:0 0 0 transparent}}
    @keyframes burstParticle{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--px),var(--py)) scale(0)}}
    @keyframes nervePulse{0%,100%{opacity:.7;transform:scaleY(1)}50%{opacity:1;transform:scaleY(1.04)}}
    @keyframes cardFlip{0%{transform:perspective(400px) rotateY(90deg);opacity:0}40%{transform:perspective(400px) rotateY(-10deg);opacity:1}70%{transform:perspective(400px) rotateY(5deg)}100%{transform:perspective(400px) rotateY(0)}}
    @keyframes cardRipple{0%{transform:scale(0);opacity:0.4}100%{transform:scale(2.5);opacity:0}}
    @keyframes slideInLeft{0%{opacity:0;transform:translateX(-30px)}100%{opacity:1;transform:translateX(0)}}
    @keyframes slideInRight{0%{opacity:0;transform:translateX(30px)}100%{opacity:1;transform:translateX(0)}}
    @keyframes bossEntrance{0%{opacity:0;transform:scale(1.3);filter:brightness(0.3)}50%{opacity:1;transform:scale(1.05);filter:brightness(1.2)}100%{transform:scale(1);filter:brightness(1)}}
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html{padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
    :root{
      --gold:#fbbf24;--red:#ef4444;--green:#4ade80;
      --purple:#c084fc;--pink:#f472b6;--blue:#3b82f6;
      --cyan:#67e8f9;--orange:#fb923c;
      --bg:#06060f;--text:#e8e6e3;
    }
    body{margin:0;background:var(--bg);font-family:'Manrope',sans-serif;color:var(--text);font-variant-numeric:tabular-nums}
    button{min-height:44px;min-width:44px}
    button:active:not(:disabled){transform:scale(0.96)!important;transition:transform 0.08s!important}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
    .hand-scroll::-webkit-scrollbar{display:none}
    .hand-scroll{-ms-overflow-style:none;scrollbar-width:none}
    .toast-enter{
      opacity:1;transform:translateX(0);
      transition:opacity .3s ease-out,transform .3s ease-out;
      @starting-style{opacity:0;transform:translateX(30px)}
    }
    .toast-enter-neg{
      opacity:1;transform:translateX(0);
      transition:opacity .3s ease-out,transform .3s ease-out;
      @starting-style{opacity:0;transform:translateX(-30px)}
    }
    /* phase transitions handled by opacity dip */
    @supports(animation-timeline:view()){
      .scroll-reveal{opacity:0;animation:scrollFadeIn linear both;animation-timeline:view();animation-range:entry 0% entry 100%}
      @keyframes scrollFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    }
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}}`;
    const Dust = () => /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden", contain: "strict" } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, opacity: 0.03, mixBlendMode: "screen", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`, backgroundSize: "128px 128px", animation: "shimmer 4s ease-in-out infinite" } }), Array.from({ length: 8 }).map((_, i) => {
      const left = 10 + i * 11 + Math.sin(i * 2.3) * 8;
      const dur = 12 + i * 3;
      const delay = i * 2.5;
      const size = 1 + Math.random() * 1.5;
      const col = isBoss ? "#ef444415" : ferv >= 12 ? "#fbbf2412" : ante >= 5 ? "#ef444410" : ante >= 4 ? "#fb923c0d" : ante >= 3 ? "#fbbf240a" : "#ffffff08";
      const nightSpeed = Math.max(6, dur - ante * 1.5);
      return /* @__PURE__ */ React.createElement("div", { key: i, style: {
        position: "absolute",
        left: `${left}%`,
        bottom: "-4px",
        width: size,
        height: size,
        borderRadius: "50%",
        background: col,
        animation: `driftParticle ${nightSpeed}s linear ${delay}s infinite`
      } });
    }), Array.from({ length: 4 }).map((_, i) => {
      const left2 = 15 + i * 22;
      const dur2 = 25 + i * 8;
      const delay2 = i * 5;
      const size2 = 3 + i * 2;
      const col2 = isBoss ? "#ef444408" : ferv >= 12 ? "#fbbf2406" : "#ffffff04";
      return /* @__PURE__ */ React.createElement("div", { key: `p${i}`, style: {
        position: "absolute",
        left: `${left2}%`,
        bottom: "-10px",
        width: size2,
        height: size2,
        borderRadius: "50%",
        background: col2,
        animation: `driftParticle ${dur2}s linear ${delay2}s infinite`
      } });
    }));
    const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 600);
    useEffect(() => {
      const h = () => setVw(window.innerWidth);
      window.addEventListener("resize", h);
      return () => window.removeEventListener("resize", h);
    }, []);
    const mob = vw < 500;
    const inGamePhases = ["playing", "scoring", "shop", "event", "eventResult", "overflow", "nightCard", "bossIntro", "denSelect", "denResults", "colonyFormed", "draft", "naming"];
    const showAbandon = inGamePhases.includes(ph);
    if (ph === "coldOpen") {
      const coldLines = [
        "Eight colonies fell to the dark.",
        "This is the ninth. There will not be a tenth.",
        "You are what's left."
      ];
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { onClick: () => { setIntroStep(0); setPh("firstIntro"); }, style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 12, padding: 20, cursor: "pointer" } }, coldLines.map((line, i) => {
        return /* @__PURE__ */ React.createElement("div", { key: i, style: {
          fontSize: i === 1 ? 18 : 15,
          color: i === 1 ? "#fbbf24" : "#e8e6e3cc",
          fontWeight: i === 1 ? 700 : 400,
          fontStyle: i === 2 ? "normal" : "italic",
          textAlign: "center",
          maxWidth: 340,
          lineHeight: 1.8,
          animation: `fadeIn 1s ease-out ${i * 0.8}s both`,
          letterSpacing: i === 1 ? 3 : 1,
          textShadow: i === 1 ? "0 0 30px #fbbf2444" : "none"
        } }, line);
      }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ffffff44", letterSpacing: 3, marginTop: 24, animation: "fadeIn 1.5s ease-out 2.5s both" } }, "tap to continue")));
    }
    if (ph === "firstIntro") {
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 14, padding: 20, maxWidth: 420 }, onClick: () => {
        setIntroStep(0);
        setPh("draft");
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, animation: "float 3s ease-in-out infinite", filter: "drop-shadow(0 0 20px #fbbf2444)" } }, "\u{1F525}"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", animation: "fadeIn .6s ease-out" } }, ["Autumn", "Winter", "Spring", "Summer"].map((s) => {
        const b = BREEDS[s];
        return /* @__PURE__ */ React.createElement("div", { key: s, style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 8px", borderRadius: 6, background: `${b.color}11`, border: `1px solid ${b.color}22` } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16 } }, b.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: b.color, fontWeight: 700 } }, b.name));
      })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, color: "#ffffffcc", textAlign: "center", maxWidth: 300, lineHeight: 1.8, animation: "fadeIn .8s ease-out" } }, "Same-season cats score better together.", /* @__PURE__ */ React.createElement("br", null), "Match the colors. Beat the target. Survive."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ffffff44", textAlign: "center", maxWidth: 280, lineHeight: 1.6, animation: "fadeIn 1.2s ease-out" } }, "Pick cats \u2192 play them \u2192 beat the score. The rest, the dark will teach you."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ffffff44", letterSpacing: 3, marginTop: 12, animation: "fadeIn 1.5s ease-out 0.5s both" } }, "tap to draft your colony")));
    }
    if (ph === "naming" && namingCat) {
      if (meta && meta.stats.r === 1 && !seen.namingFrame) {
        setSeen((s) => ({ ...s, namingFrame: true }));
        setTimeout(() => toast("\u{1F56F}\uFE0F", "Names have power here. The dark forgets everything. Names are how you fight back.", "#fbbf24", 5e3), 600);
      }
      const b = BREEDS[namingCat.breed];
      const defaultName = namingCat.name.split(" ")[0];
      const tr = namingCat.trait || PLAIN;
      const detail = TRAIT_DETAIL[tr.name] || tr.desc;
      const tierLabel = tr.tier === "mythic" ? "Mythic" : tr.tier === "legendary" ? "Legendary" : tr.tier === "rare" ? "Rare" : tr.tier === "rare_neg" ? "Rare" : tr.tier === "common" ? "Common" : "";
      const tierCol = tr.tier === "mythic" ? "#c084fc" : tr.tier === "legendary" ? "#f97316" : tr.tier === "rare" || tr.tier === "rare_neg" ? "#38bdf8" : "#ffffff55";
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 12, padding: 20, maxWidth: 420 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff55", letterSpacing: 6, animation: "fadeIn .6s ease-out" } }, babyNamingQueue.length > 0 && draftPicked.length > 0 ? "NAME YOUR CATS" : "NAME YOUR CAT"), draftPicked.length > 0 && babyNamingQueue.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", animation: "fadeIn .4s ease-out" } }, draftPicked.map((p, pi) => {
        const done = pi < draftPicked.length - babyNamingQueue.length - 1;
        const active = p.id === namingCat.id;
        return /* @__PURE__ */ React.createElement("div", { key: pi, style: { width: 10, height: 10, borderRadius: "50%", background: done ? "#4ade80" : active ? "#fbbf24" : "#333", boxShadow: active ? "0 0 8px #fbbf2444" : "none", transition: "all .15s" } });
      }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666" } }, draftPicked.length - babyNamingQueue.length, " of ", draftPicked.length)), /* @__PURE__ */ React.createElement("div", { style: { animation: "float 3s ease-in-out infinite" } }, /* @__PURE__ */ React.createElement(CC, { cat: namingCat })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center", animation: "fadeIn .8s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: b.color, fontWeight: 700, letterSpacing: 1 } }, b.icon, " ", b.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ffffff66" } }, "Power ", namingCat.power)), tr.name !== "Plain" ? /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 16px", borderRadius: 10, background: `${tierCol}08`, border: `1px solid ${tierCol}22`, maxWidth: 340, width: "100%", animation: "fadeIn 1s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18 } }, tr.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, color: tierCol, fontWeight: 700 } }, tr.name), tierLabel && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: tierCol, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" } }, tierLabel)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ffffff77", lineHeight: 1.7 } }, detail)) : /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 16px", borderRadius: 10, background: "#ffffff06", border: "1px solid #ffffff11", maxWidth: 340, width: "100%", animation: "fadeIn 1s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ffffff77", lineHeight: 1.7 } }, "No special trait yet. This cat can earn one through events, breeding, or the shop.")), /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "nameInput",
          type: "text",
          defaultValue: defaultName,
          maxLength: 8,
          autoFocus: true,
          onKeyDown: (e) => {
            if (e.key === "Enter") document.getElementById("nameConfirm")?.click();
          },
          style: { fontSize: 22, fontWeight: 700, color: b.color, background: "#0a0a1a", border: `2px solid ${b.color}44`, borderRadius: 8, padding: "10px 16px", textAlign: "center", outline: "none", width: 220, letterSpacing: 1, marginTop: 4 }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff55", letterSpacing: 2 } }, "TAP TO RENAME"), /* @__PURE__ */ React.createElement("button", { id: "nameConfirm", onClick: () => {
        const inp = document.getElementById("nameInput");
        const defaultName2 = namingCat.name.split(" ")[0];
        const newName = (inp?.value || defaultName2).trim().substring(0, 12) || defaultName2;
        const fullName = namingCat.name.includes(" ") ? `${newName} ${namingCat.name.split(" ").slice(1).join(" ")}` : newName;
        namingCat.name = fullName;
        pendingRenames.current[namingCat.id] = fullName;
        delete namingCat._finalPick;
        toast(BREEDS[namingCat.breed]?.icon || "\u{1F431}", `${newName}. Named.`, BREEDS[namingCat.breed]?.color || "#fbbf24", 1200);
        if (babyNamingQueue.length > 0) {
          const remaining = babyNamingQueue.filter((b2) => b2.id !== namingCat.id);
          setBabyNamingQueue(remaining);
          if (remaining.length > 0) {
            setNamingCat(remaining[0]);
          } else {
            setNamingCat(null);
            if (draftPicked.length >= 3 + (getMB().extraDraft || 0) && ph === "naming" && !hand.length) {
              finalizeDraft(draftPicked);
            } else {
              nextBlind();
            }
          }
        } else {
          const isFinal = draftPicked.length >= 3 + (getMB().extraDraft || 0);
          setNamingCat(null);
          if (isFinal) {
            finalizeDraft(draftPicked);
          } else {
            setPh("draft");
          }
        }
      }, style: { ...BTN(`linear-gradient(135deg,${b.color},${b.color}cc)`, "#0a0a1a"), padding: "10px 32px", fontSize: 14, letterSpacing: 2 } }, babyNamingQueue.length > 0 ? "Name this kitten" : "This is their name"), babyNamingQueue.length > 0 && /* @__PURE__ */ React.createElement("button", { onClick: () => {
        const allToName = [namingCat, ...babyNamingQueue];
        allToName.forEach((c) => { delete c._finalPick; });
        setBabyNamingQueue([]);
        setNamingCat(null);
        toast("\u{1F431}", `${allToName.length} cats keep their names.`, "#fbbf24", 1500);
        if (draftPicked.length >= 3 + (getMB().extraDraft || 0) && !hand.length) {
          finalizeDraft(draftPicked);
        } else {
          setPh("draft");
        }
      }, style: { background: "none", border: "1px solid #ffffff15", borderRadius: 6, fontSize: 10, color: "#888", cursor: "pointer", padding: "4px 14px" } }, "Keep all names \u2192")));
    }
    if (ph === "hearthFlash" && hearthFlash) {
      const hearthCats = hearthFlash;
      const companions = hearthCats.map((c) => {
        const breed = c.breed || "Autumn";
        const tr = c.trait || PLAIN;
        return { ...gC({ breed, trait: tr, sex: c.sex || "M" }), name: c.name || "Ghost", power: Math.min(15, (c.power || 3) + (getMB().heirloom || 0)), scarred: !!c.scarred, epithet: c.epithet || null, epithetKey: c.epithetKey || null, _hearthChild: true, stats: { tp: 0, bs: 0 } };
      }).slice(0, 6);
      const colNum = (meta?.stats?.r || 0) + 1;
      const colLine = colNum === 2 ? "New names around the same fire." : colNum <= 4 ? "The fire still burns. So do you." : (meta?.stats?.w || 0) === 0 ? "The fire doesn't ask how many times you've tried." : (meta?.stats?.w || 0) >= 5 ? "The dark knows your name by now." : "New colony. Same question. Different answer.";
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 16, padding: 20, maxWidth: 500 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ffffff55", letterSpacing: 4, animation: "fadeIn 1s ease-out" } }, "COLONY ", colNum), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ffffff55", fontStyle: "italic", textAlign: "center", maxWidth: 300, lineHeight: 1.6, animation: "fadeIn 1.5s ease-out" } }, colLine), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, animation: "float 3s ease-in-out infinite", filter: "drop-shadow(0 0 20px #fbbf2444)", marginTop: 8 } }, "\u{1F525}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#fbbf24cc", letterSpacing: 4, fontWeight: 700, animation: "fadeIn 1.5s ease-out" } }, "WHO WALKS BACK?"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#fbbf24aa", textAlign: "center", maxWidth: 340, lineHeight: 1.7, animation: "fadeIn 2s ease-out" } }, "The Hearth holds ", hearthCats.length, " name", hearthCats.length > 1 ? "s" : "", ". One can return to the dark. Full strength. One last time."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: 360, marginBottom: 4 } }, hearthCats.map((c, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: { fontSize: 9, color: BREEDS[c.breed]?.color || "#fbbf24", opacity: 0.4, animation: `fadeIn ${0.5 + i * 0.1}s ease-out both` } }, c.name?.split(" ")[0] || "?"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", animation: "fadeIn 2.5s ease-out" } }, companions.map((c, i) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: i,
          onClick: () => {
            setDraftPicked([c]);
            setHearthFlash(null);
            setPh("draft");
            toast(BREEDS[c.breed].icon, `${c.name.split(" ")[0]} returns. One last walk into the dark.`, BREEDS[c.breed].color, 4e3);
            if (meta.stats.r === 1) {
              setTimeout(() => toast("\u{1F195}", "Recruit unlocked! Pay \u{1F41F} to draw extra cats.", "#4ade80", 4e3), 1200);
              setTimeout(() => toast("\u{1F195}", "Interest unlocked! Save 5+ \u{1F41F} for bonus each round.", "#4ade80", 4e3), 2400);
              setTimeout(() => toast("\u{1F195}", "Scrolls unlocked! Level up hand types in the shop.", "#4ade80", 4e3), 3600);
            }
          },
          style: { cursor: "pointer", textAlign: "center", maxWidth: 90, transition: "all .15s" },
          onMouseEnter: (e) => {
            e.currentTarget.style.transform = "translateY(-6px)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { animation: `float ${2.5 + i * 0.3}s ease-in-out ${i * 0.2}s infinite` } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true })),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: BREEDS[c.breed].color, marginTop: 3, fontWeight: 700 } }, c.name.split(" ")[0]),
        c.epithet && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#fbbf2466" } }, c.epithet),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff77" } }, (c.trait || PLAIN).icon, " P", c.power, c.scarred ? " \u2694" : "")
      ))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setHearthFlash(null);
        setPh("draft");
        if (meta.stats.r === 1) {
          setTimeout(() => toast("\u{1F195}", "Recruit unlocked! Pay \u{1F41F} to draw extra cats.", "#4ade80", 4e3), 800);
          setTimeout(() => toast("\u{1F195}", "Interest unlocked! Save 5+ \u{1F41F} for bonus each round.", "#4ade80", 4e3), 2e3);
          setTimeout(() => toast("\u{1F195}", "Scrolls unlocked! Level up hand types in the shop.", "#4ade80", 4e3), 3200);
        }
      }, style: { ...BTN("#1a1a2e", "#666"), padding: "8px 20px", fontSize: 11, border: "1px solid #ffffff12", marginTop: 4 } }, "No one. Face the dark alone.")));
    }
    if (ph === "draft") {
      const isFirstRun2 = !meta || meta.stats.r === 0;
      const hasHearthLineage = getHearthPairs(meta?.cats || []).length > 0;
      const draftStory = hasHearthLineage ? [
        "The Hearth burns. New life stirs in its light. Three descendants step forward, carrying their ancestors' blood.",
        "From the names you saved, new generations emerge. They carry the old power in young bodies.",
        "The bloodline continues. Three young cats, born of the Hearth's memory, await your choice."
      ] : isFirstRun2 ? [
        "Three survivors. Pick one.",
        "Three shapes in the dusk. One joins you.",
        "They found you first. Choose one."
      ] : [
        "The world ended. Not with fire. Not with flood. It just... stopped. These three found the wreckage first.",
        "Someone had to start over. Three cats, drawn by instinct, converged on the same ruin.",
        "They came from different directions. Different lives. But they all smelled the same thing: a place that could be a home."
      ];
      const draftMid = isFirstRun2 ? [
        "Word travels. Three more arrive.",
        "Your colony is forming. Pick another."
      ] : [
        "Word spreads among survivors. Three more arrive, drawn by the sound of breathing.",
        "The scent of a colony carries far. New arrivals circle the edges, waiting to be chosen.",
        "More shapes in the dusk. The colony's pull is stronger now. Three more step into the light."
      ];
      const draftFinal = isFirstRun2 ? [
        "Last wave. One more joins you.",
        "Three remain. Pick your final companion."
      ] : [
        "The last wave. After this, the door closes. Whoever is inside is the colony.",
        "Three final chances. The others will scatter into the night. But they might come back.",
        "Choose carefully. The ones you turn away don't disappear. They remember."
      ];
      const storyText = cpk(flavorCache, `draft_${draftPicked.length}`, draftPicked.length === 0 ? draftStory : draftPicked.length === 1 ? draftMid : draftFinal);
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 14, padding: 20, maxWidth: 500 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 4, animation: "fadeIn .5s ease-out" } }, hasHearthLineage ? "DESCENDANTS OF THE HEARTH" : "THE GATHERING"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, [0, 1, 2].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: i < draftPicked.length ? "#4ade80" : i === draftPicked.length ? "#fbbf24" : "#333",
        boxShadow: i === draftPicked.length ? "0 0 8px #fbbf2444" : "none",
        transition: "all .4s ease-out"
      } })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666", marginLeft: 4 } }, draftPicked.length + 1, " of 3")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#d9770699", fontStyle: "italic", textAlign: "center", lineHeight: 1.7, maxWidth: 320, animation: `fadeIn ${isFirstRun2 ? "1s" : "0.4s"} ease-out` } }, storyText), isFirstRun2 && draftPicked.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24aa", textAlign: "center", maxWidth: 280, lineHeight: 1.5, animation: "fadeIn 1.5s ease-out 1s both" } }, "Power (top number) = base score. Higher is stronger. Traits add bonuses."), !isFirstRun2 && draftPicked.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#fb923c", textAlign: "center", maxWidth: 300, lineHeight: 1.6, animation: "fadeIn 0.5s ease-out 0.2s both", padding: "6px 12px", borderRadius: 6, background: "#fb923c0d", border: "1px solid #fb923c22", fontWeight: 700 } }, "\u2696\uFE0F Strong cats attract weak strays. Choose wisely."), isFirstRun2 && draftPicked.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2466", textAlign: "center", maxWidth: 280, lineHeight: 1.5, animation: "fadeIn 1s ease-out .3s both" } }, "Pick who catches your eye."), draftPicked.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#4ade80bb", letterSpacing: 2 } }, "CHOSEN"), draftPicked.map((c, i) => /* @__PURE__ */ React.createElement(CC, { key: i, cat: c, sm: true, hl: true }))), !isFirstRun2 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 1, marginTop: 4 } }, draftPool[0]?._draftWave === "hearth" ? "Choose one. The bloodline continues." : "Choose one. The others scatter into the dark."), draftPool[0]?._draftWave && !isFirstRun2 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: draftPool[0]._draftWave === "hearth" ? 13 : 10, color: draftPool[0]._draftWave === "hearth" ? "#fbbf24" : "#ffffff55", letterSpacing: draftPool[0]._draftWave === "hearth" ? 4 : 3, marginBottom: 2, fontWeight: draftPool[0]._draftWave === "hearth" ? 700 : 400, textShadow: draftPool[0]._draftWave === "hearth" ? "0 0 20px #fbbf2444" : "none", animation: draftPool[0]._draftWave === "hearth" ? "fadeIn .8s ease-out" : "none" } }, draftPool[0]._draftWave === "hearth" ? "\u{1F3E0} HEARTH CHILDREN" : "STRANGERS"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 14, justifyContent: "center", animation: `fadeIn .4s ease-out ${isFirstRun2 ? "0.8s" : "0.3s"} both` } }, isFirstRun2 && draftPicked.length === 0 && /* @__PURE__ */ React.createElement("style", null, `.draftPowerHint{animation:fadeIn 1.5s ease-out 1.5s both;}`), draftPool.map((c, i) => {
        const b = BREEDS[c.breed];
        const voice = cpk(flavorCache, `draftVoice_${c.id}`, [c], () => getDraftVoice(c, meta));
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: c.id,
            onClick: () => draftReady && pickDraft(i),
            style: {
              cursor: draftReady ? "pointer" : "default",
              textAlign: "center",
              maxWidth: 110,
              animation: `cardFlip .5s ease-out ${(isFirstRun2 ? 0.9 : 0.4) + i * 0.2}s both`,
              transition: "transform .2s, filter .2s"
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.transform = "translateY(-6px)";
              e.currentTarget.style.filter = "brightness(1.15)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.filter = "brightness(1)";
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: { animation: `float ${2.5 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` } }, /* @__PURE__ */ React.createElement(CC, { cat: c })),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: b.color, marginTop: 4, lineHeight: 1.3, fontWeight: 700 } }, c.name.split(" ")[0], " ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 400, opacity: 0.6, fontSize: 10 } }, c.sex === "M" ? "\u2642" : "\u2640")),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff99", fontStyle: "italic", lineHeight: 1.4, minHeight: 28, marginTop: 3 } }, '"', voice, '"'),
          c.trait.name !== "Plain" && (() => {
            const hook = { Wild: "Fits into any season combo.", Stubborn: "Stronger when your last hand failed.", Stray: "Bonus for mixing different seasons.", Loyal: "Bonus for repeating the same team.", Devoted: "Powerful when paired with their mate.", Scavenger: "Stronger the more rations you hold.", Scrapper: "Tough fighter. Even tougher when hardened.", Cursed: "Risky. Deadly when isolated.", Guardian: "Stronger when allies are wounded.", Feral: "Stronger the more cats you play.", Seer: "Bonus for repeating hand types.", Chimera: "Belongs to every season at once.", Alpha: "Strongest cat scores even bigger.", Echo: "Scores twice. One of the strongest.", Nocturnal: "Gets stronger the longer you survive.", Eternal: "The strongest trait in the game.", Phoenix: "Burns bright. Comes back from death." };
            const tier = traitTierLabel(c.trait);
            return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: tier.color, marginTop: 2, lineHeight: 1.3, maxWidth: 120 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7 } }, tier.label), " ", isFirstRun2 ? hook[c.trait.name] || c.trait.desc : c.trait.desc);
          })(),
          c._hearthParents && /* @__PURE__ */ React.createElement("div", { style: { color: "#fbbf24", fontSize: 11, fontWeight: 700, lineHeight: 1.3, marginTop: 2, padding: "3px 6px", borderRadius: 4, background: "#fbbf2408", border: "1px solid #fbbf2418", animation: "fadeIn .8s ease-out" } }, "\u{1F3E0} Child of ", c._hearthParents, c._parentTrait && c.trait.name === c._parentTrait ? /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80", fontWeight: 400, fontSize: 10 } }, " \xB7 Carries the same fire") : c._parentTrait ? /* @__PURE__ */ React.createElement("span", { style: { color: "#c084fcaa", fontWeight: 400, fontSize: 10 } }, " \xB7 Something different in the eyes") : null),
          !c._hearthParents && c.stats?.par && /* @__PURE__ */ React.createElement("div", { style: { color: "#c084fc", fontSize: 10, fontStyle: "italic", lineHeight: 1.3, marginTop: 1 } }, "Child of ", c.stats.par)
        );
      })), !isFirstRun2 && draftRejects.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", fontStyle: "italic" } }, "The ones you turned away haven't gone far...")));
    }
    if (ph === "nightCard" && nightCard) {
      const blindNames = ["Dusk", "Midnight", "Boss"];
      const blindKey = nightCard.blind === 0 ? "dusk" : nightCard.blind === 1 ? "midnight" : "boss";
      const epi = NIGHT_EPI[Math.min(nightCard.ante - 1, 4)];
      const isMid = nightCard.blind === 1;
      const ncTgt = Math.round(getTarget(nightCard.ante, nightCard.blind, isFirstRun, longDark));
      const isFirstEver = meta && meta.stats.w === 0 && nightCard.ante === 1 && nightCard.blind === 0 && !firstHandPlayed;
      const whisper = nightCard.blind === 2 && boss ? `${boss.icon} ${boss.name} waits.` : pk(BLIND_WHISPER[blindKey]);
      const isBoss2 = nightCard.blind === 2;
      const glowColor = isBoss2 ? "#ef4444" : isMid ? "#fb923c" : "#fbbf24";
      const ncAdvance = () => { setPh("playing"); setNightCard(null); if (isFirstEver) { setTimeout(startAutoPlay, 400); } };
      return /* @__PURE__ */ React.createElement("div", { onClick: ncAdvance, style: { ...W, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: {
        position: "fixed",
        top: "10%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "120vw",
        height: "80vh",
        borderRadius: "50%",
        background: `radial-gradient(ellipse,${glowColor}${isBoss2 ? "0d" : "08"},transparent 55%)`,
        pointerEvents: "none",
        zIndex: 0
      } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 0, padding: 20 }, onClick: () => {
        setNightCard(null);
        setPh("playing");
        if (isFirstEver) setTimeout(startAutoPlay, 400);
      } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, animation: "fadeIn .8s ease-out" } }, Array.from({ length: MX }).map((_, i) => {
        const done2 = i < nightCard.ante - 1;
        const cur = i === nightCard.ante - 1;
        return /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: {
          width: cur ? 10 : 8,
          height: cur ? 10 : 8,
          borderRadius: "50%",
          background: done2 ? "#4ade80" : cur ? glowColor : "#ffffff08",
          boxShadow: cur ? `0 0 12px ${glowColor}66` : done2 ? "0 0 6px #4ade8022" : "none",
          border: cur ? `2px solid ${glowColor}66` : "none"
        } }), i < MX - 1 && /* @__PURE__ */ React.createElement("div", { style: { width: 16, height: 1, background: done2 ? "#4ade8033" : "#ffffff08" } }));
      })), /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: isBoss2 ? 52 : 44,
        fontWeight: 700,
        letterSpacing: "clamp(12px,3vw,20px)",
        color: glowColor,
        animation: "comboBurst .6s ease-out",
        textShadow: `0 0 80px ${glowColor}55, 0 0 40px ${glowColor}33`,
        marginBottom: 2
      } }, blindNames[nightCard.blind].toUpperCase()), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16, marginTop: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 60, height: 1, background: `linear-gradient(90deg,transparent,${glowColor}33)` } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ffffff55", letterSpacing: 8 } }, "NIGHT ", nightCard.ante), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#ffffff33", letterSpacing: 4, marginTop: -6 } }, NIGHT_PLACES[Math.min(nightCard.ante - 1, NIGHT_PLACES.length - 1)]), /* @__PURE__ */ React.createElement("div", { style: { width: 60, height: 1, background: `linear-gradient(90deg,${glowColor}33,transparent)` } })), weather && nightCard.blind === 0 && !isFirstRun && /* @__PURE__ */ React.createElement("div", { style: { padding: "6px 14px", borderRadius: 8, background: BREEDS[weather.season]?.color + "0a", border: `1px solid ${BREEDS[weather.season]?.color}22`, animation: "fadeIn 1s ease-out .3s both", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: BREEDS[weather.season]?.color || "#fbbf24", textAlign: "center", lineHeight: 1.5 } }, BREEDS[weather.season]?.icon, " ", /* @__PURE__ */ React.createElement("b", null, weather.season === "Autumn" ? "Falling Leaves" : weather.season === "Winter" ? "Cold Snap" : weather.season === "Spring" ? "Fresh Growth" : "Long Light"), ": ", weather.season, " cats +2 Power tonight")), nightMod && nightCard.blind === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "6px 14px", borderRadius: 8, background: "#c084fc0a", border: "1px solid #c084fc22", animation: "fadeIn 1.2s ease-out .5s both", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#c084fc", textAlign: "center", lineHeight: 1.5 } }, nightMod.icon, " ", /* @__PURE__ */ React.createElement("b", null, nightMod.name), ": ", nightMod.desc)), isBoss2 && boss && /* @__PURE__ */ React.createElement("div", { style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "18px 28px",
        borderRadius: 14,
        background: "linear-gradient(160deg,#ef444410,#ef444404,#ef444408)",
        border: "1.5px solid #ef444422",
        animation: "fadeIn 1s ease-out .2s both",
        marginBottom: 16,
        maxWidth: 340,
        boxShadow: "0 4px 40px #ef444418"
      } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 48 } }, boss.icon), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, color: "#ef4444", fontWeight: 700, letterSpacing: 3 } }, boss.name), /* @__PURE__ */ React.createElement("div", { style: { width: 80, height: 1, background: "linear-gradient(90deg,transparent,#ef444433,transparent)", margin: "4px 0" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef444488", fontStyle: "italic", textAlign: "center", lineHeight: 1.5 } }, boss.lore), boss.tauntFn && (() => {
        const scarredCats = allC.filter((c) => c.scarred);
        const bondedCats = allC.filter((c) => c.bondedTo);
        const grudgedCats = allC.filter((c) => (c.grudgedWith || []).length > 0);
        const strongest = [...allC].sort((a, b) => b.power - a.power)[0];
        const weakest = [...allC].sort((a, b) => a.power - b.power)[0];
        const epithetCats = allC.filter((c) => c.epithet);
        const markedCat = allC.find((c) => c.epithetKey === "scarred");
        const mourningCat = allC.find((c) => c.epithetKey === "mourning");
        const bCtx = {
          fallen: fallen.length,
          fallenName: fallen.length > 0 ? fallen[fallen.length - 1].name.split(" ")[0] : "",
          scarred: scarredCats.length,
          bonded: bondedCats.length,
          colony: allC.length,
          gold,
          grudges: grudgedCats.length / 2,
          scarredName: scarredCats[0]?.name.split(" ")[0] || "",
          bondedName: bondedCats[0]?.name.split(" ")[0] || "",
          bondedMateName: bondedCats[0]?.bondedTo ? allC.find((c) => c.id === bondedCats[0].bondedTo)?.name.split(" ")[0] || "" : "",
          grudgedName: grudgedCats[0]?.name.split(" ")[0] || "",
          strongestName: strongest?.name.split(" ")[0] || "",
          weakestName: weakest?.name.split(" ")[0] || "",
          epithets: epithetCats.length,
          markedName: markedCat?.name.split(" ")[0] || "",
          mourningName: mourningCat?.name.split(" ")[0] || "",
          clutch: false,
          // v0.7: Cross-run memory
          prevFallen: meta?.allFallen || [],
          totalRuns: meta?.stats?.r || 0,
          totalDeaths: meta?.stats?.totalFallen || 0
        };
        const taunt = boss.tauntFn(bCtx);
        return taunt ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ef4444bb", fontStyle: "italic", textAlign: "center", lineHeight: 1.6, marginTop: 4 } }, '"', taunt, '"') : null;
      })()), !isBoss2 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#ffffff77", fontStyle: "italic", letterSpacing: 2, animation: "fadeIn 1s ease-out", textAlign: "center", textShadow: "0 0 20px #ffffff11", maxWidth: 320, marginBottom: 8 } }, whisper), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#ffffff55", textAlign: "center", maxWidth: 320, lineHeight: 1.8, animation: "fadeIn 1.2s ease-out", letterSpacing: 4, fontWeight: 500 } }, epi), (() => {
        const mw = getMoodWhisper(mood, allC.length);
        const sub = mw || NIGHT_SUB[Math.min(nightCard.ante - 1, 4)];
        return sub ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: mw ? "#ffffff66" : "#ffffff55", fontStyle: "italic", textAlign: "center", maxWidth: 280, lineHeight: 1.5, animation: "fadeIn 1.5s ease-out", marginTop: 4 } }, sub) : null;
      })()), nightCard.blind === 0 && nightCard.ante > 1 && (() => {
        const wFn = WHISPER_NIGHT[Math.min(nightCard.ante - 1, WHISPER_NIGHT.length - 1)];
        const wCtx = { fallen: fallen.length, colony: allC.length };
        const wLine = wFn ? typeof wFn === "function" ? wFn(wCtx) : wFn : null;
        const wSeed = (nightCard.ante * 13 + gold) % 10;
        const showWhisper = wLine && wSeed <= 3;
        const nCtx = { fallen: fallen.length, bonds: allC.filter((c) => c.bondedTo).length / 2, grudges: allC.reduce((s, c) => s + (c.grudgedWith || []).length, 0) / 2, breeds: runLog.filter((e) => e.type === "breed").length, colony: allC.length, eventHistory, scarred: allC.filter((c) => c.scarred).length, allCats: allC };
        const narLine = getNarratorRecap(nightCard.ante, nCtx);
        return /* @__PURE__ */ React.createElement(React.Fragment, null, showWhisper && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2466", fontStyle: "italic", textAlign: "center", maxWidth: 300, lineHeight: 1.5, animation: "fadeIn 2s ease-out .5s both", marginTop: 8 } }, wLine), narLine && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#c084fc55", fontStyle: "italic", textAlign: "center", maxWidth: 320, lineHeight: 1.6, animation: "fadeIn 2.5s ease-out 1s both", marginTop: showWhisper ? 4 : 8, padding: "6px 12px", borderRadius: 8, background: "#c084fc06", border: "1px solid #c084fc11" } }, narLine), (() => {
          if (Math.random() > 0.25) return null;
          const plays = runLog.filter((e) => e.type === "hand");
          const neverPlayed = allC.filter((c) => (c.stats?.tp || 0) === 0);
          const overPlayed = allC.filter((c) => (c.stats?.tp || 0) > plays.length * 0.4);
          if (neverPlayed.length >= 2) return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff44", fontStyle: "italic", textAlign: "center", maxWidth: 300, lineHeight: 1.5, animation: "fadeIn 3s ease-out 1.5s both", marginTop: 4 } }, neverPlayed.map((c) => c.name.split(" ")[0]).join(" and "), " ", neverPlayed.length === 2 ? "haven't" : "haven't", " played a single hand. They're starting to wonder why they're here.");
          if (overPlayed.length === 1) return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff44", fontStyle: "italic", textAlign: "center", maxWidth: 300, lineHeight: 1.5, animation: "fadeIn 3s ease-out 1.5s both", marginTop: 4 } }, "The same hand again. ", overPlayed[0].name.split(" ")[0], " carries every hand. The others watch.");
          if (fallen.length > 3) return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff44", fontStyle: "italic", textAlign: "center", maxWidth: 300, lineHeight: 1.5, animation: "fadeIn 3s ease-out 1.5s both", marginTop: 4 } }, "The colony is lighter. Nobody says whether that's freedom or loss.");
          return null;
        })());
      })(), isNinthDawn && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2466", letterSpacing: 5, animation: "fadeIn 1.8s ease-out", marginTop: 8 } }, "THE NINTH DAWN"), nightCard.ante >= MX && nightCard.blind === 0 && (fallen.length > 0 || allC.length > 0) && /* @__PURE__ */ React.createElement("div", { style: {
        animation: "fadeIn 1.8s ease-out .8s both",
        textAlign: "center",
        maxWidth: 300,
        padding: "10px 14px",
        borderRadius: 12,
        background: "#ffffff04",
        border: "1px solid #ffffff08",
        marginTop: 12
      } }, fallen.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444488", letterSpacing: 3, marginBottom: 4 } }, "DID NOT MAKE IT"), fallen.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 11, color: BREEDS[f.breed]?.color || "#ef4444", opacity: 0.6, lineHeight: 1.5 } }, f.name.split(" ")[0], " ", /* @__PURE__ */ React.createElement("span", { style: { color: "#ffffff66", fontSize: 10 } }, "Night ", f.night)))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade8066", letterSpacing: 3, marginBottom: 3 } }, allC.length, " STILL HERE"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" } }, allC.slice(0, 16).map((c, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: { fontSize: 10, color: BREEDS[c.breed]?.color || "#888", opacity: 0.5 } }, c.name.split(" ")[0], c.scarred ? "*" : "")))), (() => {
        const ncMb = getMB();
        const ncHfx = getHeatFx(meta?.heat);
        const ncDiscs = 3 + ncMb.discards + (ncHfx.discMod || 0);
        return /* @__PURE__ */ React.createElement("div", { style: {
          display: "flex",
          gap: 0,
          alignItems: "stretch",
          marginTop: 20,
          animation: "fadeIn 1.5s ease-out .3s both",
          borderRadius: 14,
          overflow: "hidden",
          border: `1.5px solid ${glowColor}15`,
          background: `linear-gradient(145deg,${glowColor}06,#ffffff02,${glowColor}04)`,
          boxShadow: `0 4px 30px ${glowColor}11`
        } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "16px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: `${glowColor}66`, letterSpacing: 3, marginBottom: 4 } }, "SCORE TARGET"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: isFirstEver ? 34 : 28, fontWeight: 900, color: glowColor, textShadow: `0 0 20px ${glowColor}33` } }, ncTgt.toLocaleString())), /* @__PURE__ */ React.createElement("div", { style: { width: 1, background: "#ffffff08" } }), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "16px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3b82f688", letterSpacing: 3, marginBottom: 4 } }, "HANDS"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: isFirstEver ? 34 : 28, fontWeight: 900, color: "#3b82f6" } }, hLeft)), /* @__PURE__ */ React.createElement("div", { style: { width: 1, background: "#ffffff08" } }), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "16px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444488", letterSpacing: 3, marginBottom: 4 } }, "DISCARDS"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: isFirstEver ? 34 : 28, fontWeight: 900, color: "#ef4444" } }, ncDiscs)));
      })(), isFirstEver && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#4ade80bb", animation: "fadeIn 2s ease-out .8s both", marginTop: 12 } }, "Tap cats ", "\u2192", " Play ", "\u2192", " Score ", ncTgt.toLocaleString(), " to survive"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff55", marginTop: 20, animation: `fadeIn 2s ease-out ${isFirstEver ? 1.2 : 0.6}s both` } }, "tap to begin")));
    }
    if (ph === "colonyFormed" && colonyData) {
      const { chosen, strays, strayOffset } = colonyData;
      const isFirstRun2 = !meta || meta.stats.r === 0;
      const STRAY_ORIGINS = {
        Autumn: ["Found shivering in a collapsed tunnel. Born when the leaves turned.", "Watched from the treeline for three days before coming in.", "This one remembered things the others had forgotten.", "Came from a colony that didn't make it past harvest."],
        Summer: ["Walked out of the dark like it owed them money.", "Still warm. Whatever happened to the last colony, this one ran.", "Born in the longest day. Burned like it.", "The loud one. Showed up yelling. Hasn't stopped."],
        Winter: ["Was already in the shelter when they arrived. Said nothing.", "Born in the deep cold. The cold never left.", "This one watched the dark with something like patience.", "The cold didn't bother them. Nothing did."],
        Spring: ["Followed the youngest kitten in. Stayed for the rest.", "Groomed everyone on arrival. Nobody asked. Nobody refused.", "Born when the world thawed. Carried that warmth.", "The gentle one. Gentle things survive too. Sometimes."]
      };
      const allDraft = [...chosen, ...strays];
      const traitCount = allDraft.filter((c) => (c.trait || PLAIN).name !== "Plain").length;
      const seasonCounts = BK.map((b) => allDraft.filter((c) => c.breed === b).length);
      const dominant = BK[seasonCounts.indexOf(Math.max(...seasonCounts))];
      const colonyThesis = traitCount >= 6 ? `${traitCount} with names worth remembering. The rest have time.` : seasonCounts.filter((n) => n >= 5).length >= 1 ? `Heavy ${dominant}. ${seasonCounts.filter((n) => n >= 5).length > 1 ? "Two seasons dominate." : "One season leads."} Build around it.` : chosen.every((c) => (c.trait || PLAIN).name !== "Plain") ? `Three with traits. Fifteen without. The fifteen are watching.` : `Three by choice. Fifteen by survival. None by accident.`;
      const colonyCounts = {};
      chosen.forEach((c) => {
        colonyCounts[c.breed] = (colonyCounts[c.breed] || 0) + 1;
      });
      strays.forEach((c) => {
        colonyCounts[c.breed] = (colonyCounts[c.breed] || 0) + 1;
      });
      const totalPow = [...chosen, ...strays].reduce((s, c) => s + c.power, 0);
      const avgPow = (totalPow / 16).toFixed(1);
      const strayOrigins = strays.map((c, i) => cpk(flavorCache, `stray_${c.id || i}`, STRAY_ORIGINS[c.breed] || STRAY_ORIGINS.Autumn));
      const enterNight = () => {
        try {
          setColonyData(null);
          const wSeasons = ["Autumn", "Winter", "Spring", "Summer"];
          setWeather({ season: pk(wSeasons), night: 1 });
          setNightMod(null);
          setNightCard({ ante: 1, blind: 0 });
          setPh("nightCard");
        } catch (e) {
          console.error("enterNight error:", e);
          toast("\u26A0", "Something went wrong.", "#ef4444");
          setPh("nightCard");
        }
      };
      if (!chosen || chosen.length === 0) return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 14, padding: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#fbbf24" } }, "Colony formed."), /* @__PURE__ */ React.createElement("button", { onClick: enterNight, style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), padding: "14px 44px", fontSize: 17, letterSpacing: 4 } }, "Enter the Night")));
      ;
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 14, padding: 20, maxWidth: 600 } }, isNinthDawn && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24", letterSpacing: 6, animation: "float 3s ease-in-out infinite", marginBottom: -4 } }, "\u300C THE NINTH DAWN \u300D"), !isFirstRun2 && /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, animation: "fadeIn 1s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24", letterSpacing: 4, fontWeight: 700 } }, "NAME YOUR COLONY"), /* @__PURE__ */ React.createElement(
        "input",
        {
          value: colonyName,
          onChange: (e) => setColonyName(e.target.value.slice(0, 20)),
          placeholder: "...",
          onClick: (e) => e.stopPropagation(),
          style: { background: "#ffffff08", border: `2px solid ${(meta?.achv || []).includes("five_wins") ? "#fbbf24" : "#fbbf2444"}`, borderRadius: 8, padding: "8px 14px", color: "#fbbf24", fontSize: 16, letterSpacing: 3, width: 220, outline: "none", textAlign: "center", boxShadow: (meta?.achv || []).includes("five_wins") ? "0 0 16px #fbbf2433" : "none" }
        }
      )), isFirstRun2 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#999999aa", letterSpacing: 6, animation: "fadeIn 1.5s ease-out" } }, "YOUR COLONY"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, justifyContent: "center", marginTop: 8 } }, chosen.map((c, i) => {
        const b = BREEDS[c.breed];
        return /* @__PURE__ */ React.createElement("div", { key: c.id, style: { textAlign: "center", animation: `fadeIn .6s ease-out ${0.3 + i * 0.4}s both` } }, /* @__PURE__ */ React.createElement(CC, { cat: c, hl: true }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: b.color, marginTop: 4, fontWeight: 700 } }, c.name.split(" ")[0]), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff77", fontStyle: "italic", lineHeight: 1.4, marginTop: 2, maxWidth: 100 } }, '"', cpk(flavorCache, `colVoice_${c.id}`, [c], () => getDraftVoice(c, meta)), '"'));
      })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", fontStyle: "italic", textAlign: "center", lineHeight: 1.6, maxWidth: 340, marginTop: 8, animation: "fadeIn .8s ease-out .5s both" } }, "Three you chose. Fifteen already here.", /* @__PURE__ */ React.createElement("br", null), "Waiting for someone worth following.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { color: "#999999aa" } }, "Eighteen against the dark. One night to find out if that's enough.")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#999999aa", fontStyle: "italic", textAlign: "center", lineHeight: 1.6, maxWidth: 320, marginTop: 12, animation: "fadeIn 1.2s ease-out 1.5s both", padding: "8px 14px", borderRadius: 10, background: "#ffffff04", border: "1px solid #ffffff08" } }, "The dark forgets everything. Leave an impression it can't.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#999999aa", letterSpacing: 6, animation: "epicReveal 1.2s ease-out forwards" } }, "SURVIVE ", MX, " NIGHTS"), meta && meta.stats.r > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#777777bb", letterSpacing: 3 } }, (() => {
        const n = (meta.stats.r || 0) + 1;
        const w = meta.stats.w || 0;
        if (n === 2) return `Colony #${n}. New names around the same fire.`;
        if (n <= 4) return `Colony #${n}. The fire still burns. So do you.`;
        if (n <= 7 && w === 0) return `Colony #${n}. The fire doesn't ask how many times you've tried. It just burns.`;
        if (n <= 7 && w >= 1) return `Colony #${n}. The Hearth remembers what you built. Build it again.`;
        if (w >= 5) return `Colony #${n}. The dark knows your name by now. Good.`;
        return `Colony #${n}. New colony. Same question. Different answer.`;
      })()), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#888", letterSpacing: 4, animation: "fadeIn .6s ease-out .2s both" } }, "THE COLONY"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, color: "#d97706bb", fontStyle: "italic", textAlign: "center", lineHeight: 1.6, maxWidth: 360, animation: "fadeIn .8s ease-out .15s both" } }, colonyThesis), bloodMemMsg && /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg,#7a665208,#ef444408)", border: "1px solid #c084fc22", animation: "fadeIn 1s ease-out .3s both", textAlign: "center", maxWidth: 380 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc", fontStyle: "italic", lineHeight: 1.6 } }, "\u{1FA78} ", /* @__PURE__ */ React.createElement("b", null, bloodMemMsg.heir.split(" ")[0]), " carries something old. ", bloodMemMsg.trait.icon, " ", /* @__PURE__ */ React.createElement("span", { style: { color: "#e8e6e3" } }, bloodMemMsg.trait.name), ". inherited from ", /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, bloodMemMsg.ancestor), " of the Hearth.", bloodMemMsg.scarred && /* @__PURE__ */ React.createElement("span", { style: { color: "#d97706" } }, " The scar came with it."))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 20, justifyContent: "center", animation: "fadeIn 1s ease-out .25s both" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, fontWeight: 900, color: "#fbbf24", letterSpacing: 2, animation: "comboBurst .6s ease-out .35s both" } }, 14), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 2 } }, "SOULS")), /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 40, background: "#ffffff0a" } }), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, fontWeight: 900, color: "#ef4444", letterSpacing: 2, animation: "comboBurst .6s ease-out .45s both" } }, MX), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 2 } }, "NIGHTS"))), strayOffset && strayOffset !== 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: strayOffset > 0 ? "#4ade80aa" : "#fb923caa", fontStyle: "italic", textAlign: "center", animation: "fadeIn 1s ease-out .6s both", maxWidth: 340, lineHeight: 1.5 } }, strayOffset >= 2 ? "Weak cats attract strong strays. They had to be. your chosen carry less." : strayOffset === 1 ? "Weak cats attract strong strays. Something to prove." : strayOffset === -1 ? "Strong cats attract weak strays. They followed the light, not the fight." : "Strong cats attract weak strays. Your chosen burn bright. the rest just watched."), /* @__PURE__ */ React.createElement("div", { style: { width: "100%", marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade80", letterSpacing: 2, marginBottom: 6, textAlign: "center" } }, "CHOSEN. YOUR EDGE"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "center", animation: "fadeIn .6s ease-out .6s both" } }, chosen.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, style: { textAlign: "center", cursor: "pointer" }, onClick: () => setTraitTip(c) }, /* @__PURE__ */ React.createElement(CC, { cat: c, hl: true }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: BREEDS[c.breed]?.color, marginTop: 2, fontWeight: 700 } }, c.name.split(" ")[0]), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888" } }, c.trait.name !== "Plain" ? c.trait.icon + " " + c.trait.name : "plain"))))), /* @__PURE__ */ React.createElement("div", { style: { width: "100%", marginTop: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 6, textAlign: "center" } }, "THE ONES WHO WERE ALREADY HERE"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", animation: "fadeIn 1s ease-out .9s both" } }, BK.map((b) => {
        const ct = (colonyCounts[b] || 0) - chosen.filter((c) => c.breed === b).length;
        return ct > 0 ? /* @__PURE__ */ React.createElement("div", { key: b, style: { display: "flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 6, background: BREEDS[b].bg, border: `1px solid ${BREEDS[b].color}22` } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, BREEDS[b].icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: BREEDS[b].color } }, ct)) : null;
      }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 6, background: "#ffffff04", border: "1px solid #ffffff0a" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666" } }, "15 strays \xB7 all Plain"))))), !isFirstRun2 && false && /* @__PURE__ */ React.createElement("button", { onClick: () => setColStep(1), style: { background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#0a0a1a", border: "none", borderRadius: 10, padding: "12px 36px", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 3, marginTop: 8, boxShadow: "0 0 30px #fbbf2433", textTransform: "uppercase", animation: "fadeIn 1.5s ease-out 1s both" } }, "Continue"), (isFirstRun2 || true) && /* @__PURE__ */ React.createElement(React.Fragment, null, hearthDust > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#c084fc0a", border: "1px solid #c084fc22", animation: "fadeIn 1.5s ease-out 1.4s both" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, "\u{1F3E0}"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#c084fc" } }, "The Hearth radiates ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700 } }, "+", hearthDust, "\u2726"))), /* @__PURE__ */ React.createElement("button", { onClick: enterNight, style: { background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#0a0a1a", border: "none", borderRadius: 10, padding: "14px 44px", fontSize: 17, fontWeight: 900, cursor: "pointer", letterSpacing: 4, marginTop: 8, boxShadow: "0 0 40px #fbbf2433", textTransform: "uppercase", zIndex: 2, animation: "fadeIn 2s ease-out 1s both" } }, "Enter the Night"))));
    }
    if (ph === "title") {
      const mb = getMB(), hc = meta && meta.cats.length > 0, sd = meta ? meta.dust : 0;
      const hasRun = meta && meta.stats.r >= 1;
      const hasWin = meta && meta.stats.w >= 1;
      const showUpgrades = hasRun;
      const showHearth = hasWin;
      const showHeat = meta && meta.stats.w >= 2;
      const showLongDark = meta && meta.stats.w >= 3;
      const showStats = hasRun;
      const availTabs = ["play"];
      if (showUpgrades) availTabs.push("\u2726 upgrades");
      if (showHearth) availTabs.push("hearth");
      if (meta && meta.stats.r >= 1) availTabs.push("bestiary");
      if (meta && meta.stats.w >= 1) availTabs.push("rankings");
      const safeTab = availTabs.includes(tab) ? tab : "play";
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement(Dust, null), /* @__PURE__ */ React.createElement("img", { src: "https://raw.githubusercontent.com/greatgamesgonewild/ninth-life/main/hero.png", alt: "", style: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 800, opacity: 0.18, pointerEvents: "none", zIndex: 0, maskImage: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 80%)", WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 80%)" }, onError: (e) => { if (!e.target._retry) { e.target._retry = true; e.target.src = "https://greatgamesgonewild.github.io/ninth-life/hero.png"; } else { e.target.style.display = "none"; } } }), /* @__PURE__ */ React.createElement("style", null, CSS), (() => {
        if (meta?.stats?.r > 0) return null;
        const phase = demoStep % 16;
        const demoCards = [
          { breed: "Winter", p: 4, icon: "\u2744\uFE0F" },
          { breed: "Winter", p: 5, icon: "\u2744\uFE0F" },
          { breed: "Winter", p: 3, icon: "\u2744\uFE0F" },
          { breed: "Autumn", p: 4, icon: "\u{1F342}" },
        ];
        const selIdx = phase >= 2 && phase < 6 ? Math.min(phase - 2, 2) : phase >= 6 ? 3 : -1;
        const scoring = phase >= 8 && phase < 14;
        const scoreSteps = [
          { label: "Clowder", val: "360", sub: "3 matched Winter" },
          { label: "+Echo", val: "540", sub: "Echo trait fires" },
          { label: "\xD71.5 Nerve", val: "810", sub: "Nerve multiplier" },
          { label: "= 810", val: "810", sub: "Target: 2,000", final: true },
        ];
        const sIdx = scoring ? Math.min(phase - 8, scoreSteps.length - 1) : -1;
        const show = phase < 15;
        if (!show) return null;
        return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: mob ? 100 : 80, left: "50%", transform: "translateX(-50%)", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.35, pointerEvents: "none", animation: "fadeIn 1s ease-out" } },
          phase < 8 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4 } }, demoCards.map((c, i) => {
            const active = i <= selIdx;
            const matched = i < 3;
            return /* @__PURE__ */ React.createElement("div", { key: i, style: { width: 32, height: 42, borderRadius: 6, background: active ? (BREEDS[c.breed]?.bg || "#1a1a2e") : "#0d0d1a", border: `1.5px solid ${active ? (BREEDS[c.breed]?.color || "#666") + (matched ? "88" : "44") : "#ffffff08"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, transition: "all .3s", opacity: active ? 1 : 0.3, transform: active ? "scale(1.05)" : "scale(0.95)" } },
              /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12 } }, c.icon),
              /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: BREEDS[c.breed]?.color || "#888", fontWeight: 700 } }, "P", c.p));
          })),
          phase >= 2 && phase < 8 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#ffffff44", letterSpacing: 2 } }, selIdx < 3 ? "selecting cats..." : "3 Winter matched!"),
          scoring && sIdx >= 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 } },
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: scoreSteps[sIdx].final ? 16 : 12, color: scoreSteps[sIdx].final ? "#fbbf24" : "#3b82f6", fontWeight: 900, animation: "countUp .3s ease-out" }, key: sIdx }, scoreSteps[sIdx].val),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#fbbf2466", letterSpacing: 1 } }, scoreSteps[sIdx].label),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: "#ffffff22" } }, scoreSteps[sIdx].sub))
        );
      })(), /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 10, right: 10, zIndex: 200, display: "flex", gap: 6, alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55", letterSpacing: 1 } }, "v0.77"), meta && /* @__PURE__ */ React.createElement("button", { onClick: async () => {
        const sums = [];
        for (let i = 1; i <= SLOT_COUNT; i++) sums.push(await getSlotSummary(i));
        setSlotSummaries(sums);
        setShowSlots(!showSlots);
      }, style: { background: "none", border: "1px solid #ffffff15", borderRadius: 6, fontSize: 10, cursor: "pointer", opacity: 0.5, padding: "3px 8px", color: "#888" }, title: "Save Slots" }, "\u{1F4BE} ", activeSlot), /* @__PURE__ */ React.createElement("button", { onClick: toggleMute, style: { background: "none", border: "none", fontSize: 16, cursor: "pointer", opacity: 0.4, padding: 4 }, title: muted ? "Unmute" : "Mute" }, muted ? "\u{1F507}" : "\u{1F50A}")), showSlots && slotSummaries && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 40, right: 10, zIndex: 300, background: "#0d1117ee", border: "1px solid #ffffff15", borderRadius: 12, padding: 14, width: 220, animation: "fadeIn .2s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 8 } }, "SAVE SLOTS"), slotSummaries.map((s, i) => {
        const n = i + 1;
        const isActive = n === activeSlot;
        return /* @__PURE__ */ React.createElement("div", { key: n, onClick: async () => {
          if (!isActive) {
            await setActiveSlot(n);
            const d = await loadS(n);
            setMeta(d);
            const r = await loadRun();
            setSavedRun(r);
            setShowSlots(false);
          }
        }, style: {
          padding: "8px 10px",
          borderRadius: 8,
          marginBottom: 4,
          cursor: isActive ? "default" : "pointer",
          background: isActive ? "#fbbf2412" : "#ffffff06",
          border: `1px solid ${isActive ? "#fbbf2433" : "#ffffff0a"}`,
          transition: "all .15s"
        } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? "#fbbf24" : "#888" } }, "Slot ", n, isActive ? " \u2726" : ""), !s.empty && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666" } }, s.wins, "W / ", s.runs, "R")), s.empty ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", fontStyle: "italic" } }, "Empty") : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", marginTop: 2 } }, "\u{1F3E0}", s.cats, " cats \xB7 \u2726", s.dust, " \xB7 ", s.heat > 0 ? `\u{1F525}H${s.heat}` : ""));
      }), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid #ffffff0a", marginTop: 6, paddingTop: 6, display: "flex", gap: 4, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: async () => {
        const json = await exportSlot(activeSlot);
        navigator.clipboard?.writeText(json);
        toast("\u{1F4CB}", "Save copied to clipboard", "#4ade80");
      }, style: { fontSize: 10, background: "none", border: "1px solid #ffffff15", borderRadius: 4, color: "#4ade80", cursor: "pointer", padding: "3px 8px" } }, "Export Slot ", activeSlot), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowImport(!showImport), style: { fontSize: 10, background: "none", border: "1px solid #ffffff15", borderRadius: 4, color: "#fb923c", cursor: "pointer", padding: "3px 8px" } }, "Import"), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
        if (!window.confirm(`Clear Slot ${activeSlot}? This deletes all progress in this slot.`)) return;
        await saveS(dSave(), activeSlot);
        await clearRunSave();
        setMeta(dSave());
        setSavedRun(null);
        const sums = [];
        for (let i = 1; i <= SLOT_COUNT; i++) sums.push(await getSlotSummary(i));
        setSlotSummaries(sums);
        toast("\u{1F5D1}\uFE0F", `Slot ${activeSlot} cleared.`, "#ef4444");
      }, style: { fontSize: 10, background: "none", border: "1px solid #ef444444", borderRadius: 4, color: "#ef4444", cursor: "pointer", padding: "3px 8px" } }, "Clear Slot ", activeSlot)), showImport && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("textarea", { value: importText, onChange: (e) => setImportText(e.target.value), placeholder: "Paste save JSON...", onClick: (e) => e.stopPropagation(), style: { width: "100%", height: 50, background: "#0a0a1a", border: "1px solid #ffffff15", borderRadius: 4, color: "#e8e6e3", fontSize: 10, fontFamily: "monospace", padding: 4, resize: "none" } }), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
        if (!importText.trim()) return;
        const d = await importSlot(importText, activeSlot);
        if (d) {
          setMeta(d);
          toast("\u2705", "Save imported", "#4ade80");
          setShowImport(false);
          setImportText("");
          setShowSlots(false);
        } else {
          toast("\u274C", "Invalid save data", "#ef4444");
        }
      }, style: { fontSize: 10, background: "#fb923c", border: "none", borderRadius: 4, color: "#0a0a1a", cursor: "pointer", padding: "3px 10px", marginTop: 3, fontWeight: 700 } }, "Import to Slot ", activeSlot))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 12, padding: 20, textAlign: "center", maxWidth: 600 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, color: "#ffffffbb", fontStyle: "italic", textAlign: "center", maxWidth: 360, lineHeight: 1.7, animation: "fadeIn 2s ease-out", textShadow: "0 0 20px #ffffff08" } }, (() => { if (!epigraphRef.current || epigraphRef.current._r !== (meta?.stats?.r || 0)) { epigraphRef.current = { text: getEpigraph(meta), _r: meta?.stats?.r || 0 }; } return epigraphRef.current.text; })()), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 1, alignItems: "flex-end", justifyContent: "center", height: meta && meta.cats.length > 0 ? 28 : 16, marginTop: 8, marginBottom: -4 } }, meta && meta.cats.length > 0 ? meta.cats.slice(0, 20).map((c, i) => {
        const bc = BREEDS[c.breed]?.color || "#fbbf24";
        const seed = (i * 7 + 3) % 10;
        return /* @__PURE__ */ React.createElement("div", { key: i, style: {
          width: 4,
          height: 6 + seed * 0.8,
          borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
          background: `linear-gradient(0deg,${bc},#fbbf24aa)`,
          animation: `breathe ${1.5 + seed * 0.15}s ease-in-out ${i * 0.2}s infinite`,
          boxShadow: `0 0 4px ${bc}66`,
          opacity: 0.5 + seed * 0.05
        }, title: c.name });
      }) : [0, 1, 2].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
        width: 3,
        height: 6 + i * 3,
        borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
        background: "linear-gradient(0deg,#d9770644,#fbbf2444)",
        animation: `breathe ${1.8 + i * 0.3}s ease-in-out ${i * 0.3}s infinite`,
        opacity: 0.3
      } }))), meta && meta.cats.length >= 1 && meta.cats.length <= 4 && meta.stats.w <= 2 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2477", fontStyle: "italic", letterSpacing: 2, animation: "fadeIn 3s ease-out" } }, meta.cats.length === 1 ? `${meta.cats[0].name.split(" ")[0]} watches from the warm side.` : meta.cats.length === 2 ? `${meta.cats[0].name.split(" ")[0]} and ${meta.cats[1].name.split(" ")[0]}. The Founders.` : `The Hearth burns. ${meta.cats.slice(0, 3).map((c) => c.name.split(" ")[0]).join(", ")} watch.`), /* @__PURE__ */ React.createElement("h1", { style: { fontSize: "clamp(36px,8vw,58px)", fontWeight: 700, letterSpacing: "clamp(8px,2vw,18px)", lineHeight: 1, background: (meta?.achv || []).includes("completionist") ? "linear-gradient(135deg,#c084fc,#fef08a,#4ade80,#67e8f9)" : "linear-gradient(180deg,#fef08a,#fbbf24,#b85c2c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0, textTransform: "uppercase", filter: "drop-shadow(0 0 30px #fbbf2418)" } }, "NINTH LIFE", meta?.ninthDawnCleared ? " \u{1F305}" : ""), (!meta || meta.stats.r === 0) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ffffff55", letterSpacing: 3, marginTop: -2 } }, "A cat colony survival game"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#999999bb", letterSpacing: 4, fontWeight: 300, lineHeight: 1.6, animation: "fadeIn 2.5s ease-out", textTransform: "uppercase" } }, "Cats are cards \xB7 Seasons are suits \xB7 Survive the dark"), dailyPlayers > 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff33", letterSpacing: 2, animation: "fadeIn 3s ease-out" } }, dailyPlayers, " colon", dailyPlayers === 1 ? "y" : "ies", " entered the dark today") : null, (() => {
        const ch = getChapterTitle(meta);
        return ch ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc88", letterSpacing: 4, animation: "fadeIn 3s ease-out" } }, "Chapter ", ch.num, " \xB7 ", ch.name) : null;
      })(), meta && meta.stats.r >= 1 && (() => {
        const earned = (meta.achv || []).length;
        const total = ACHIEVEMENTS.length;
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, animation: "fadeIn 2s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 2 } }, "ACHIEVEMENTS ", earned, "/", total), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center", maxWidth: 200 } }, ACHIEVEMENTS.map((a) => {
          const e = (meta.achv || []).includes(a.id);
          return /* @__PURE__ */ React.createElement("div", { key: a.id, onClick: () => toast(a.icon, `${a.name}: ${a.desc}${e ? " \u2713 " + a.reward : a.dust ? " \xB7 " + a.dust + "\u2726" : ""}`, e ? "#fbbf24" : "#555"), style: {
            width: 8,
            height: 8,
            borderRadius: "50%",
            cursor: "pointer",
            background: e ? "#fbbf24" : "#ffffff0a",
            boxShadow: e ? `0 0 6px #fbbf2466` : "none",
            border: e ? "1px solid #fbbf2466" : "1px solid #ffffff12",
            transition: "all .15s"
          }, title: `${a.name}: ${a.desc}` });
        })));
      })(), hasRun && meta && (meta.codex || []).length > 0 && /* @__PURE__ */ React.createElement("div", { onClick: () => { const cx = meta.codex || []; const tot = BK.length * (TRAITS.length + 1); const pct = Math.round(cx.length / tot * 100); const frags = (meta.loreFragments || []).length; const byBreed = BK.map((b) => ({ b, n: cx.filter((k) => k.startsWith(b)).length })); toast("\u{1F4D6}", `Codex: ${cx.length}/${tot} (${pct}%). ` + byBreed.map((x) => `${BREEDS[x.b].icon}${x.n}`).join(" ") + (frags > 0 ? ` \xB7 ${frags} lore fragments` : ""), "#c084fc", 5e3); }, style: { display: "flex", alignItems: "center", gap: 6, cursor: "pointer", animation: "fadeIn 2.5s ease-out" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#c084fc88", letterSpacing: 2 } }, "\u{1F4D6} CODEX ", (meta.codex || []).length, "/", BK.length * (TRAITS.length + 1), (meta.loreFragments || []).length > 0 ? ` \xB7 ${(meta.loreFragments || []).length}\u{1F4DC}` : ""), /* @__PURE__ */ React.createElement("div", { style: { width: 40, height: 3, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${(meta.codex || []).length / (BK.length * (TRAITS.length + 1)) * 100}%`, background: "#c084fc", borderRadius: 2 } }))), hasRun && meta && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#c084fc", fontSize: 13, fontWeight: 700 } }, "\u2726 ", sd, " Stardust"), sd > 0 && !showUpgrades && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#c084fc88" } }, "earned from the Hearth"), sd > 0 && showUpgrades && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#c084fc88", cursor: "pointer" }, onClick: () => setTab("\u2726 upgrades") }, "spend on upgrades \u25B8"), meta.cats.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fcbb" } }, "\u{1F3E0} +", calcTotalHearthDust(meta.cats, getMB().dustBonus || 0, getHeatFx(meta?.heat).dustMult || 1).total, "/run")), showHeat && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2, alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ef4444" } }, "Heat ", meta.heat), meta.heat > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#4ade80" } }, "+", meta.heat * 25, "% hearth")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, alignItems: "center" } }, Array.from({ length: (meta.stats.mh || meta.heat || 1) + 1 }).map((_, h) => {
        const isActive = h === meta.heat;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: h,
            onClick: async () => {
              if (h !== meta.heat) {
                const u = { ...meta, heat: h };
                setMeta(u);
                await saveS(u);
                toast("\u{1F525}", h === 0 ? "Heat disabled. Standard difficulty." : `Heat set to ${h}. +${h * 25}% hearth dust.`, "#ef4444");
              }
            },
            style: {
              width: 24,
              height: 24,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 10,
              fontWeight: isActive ? 900 : 400,
              border: isActive ? "2px solid #ef4444" : "1px solid #ffffff15",
              background: isActive ? `linear-gradient(135deg,#ef444422,#ef444408)` : "#ffffff06",
              color: isActive ? "#ef4444" : h === 0 ? "#666" : "#ef444488"
            }
          },
          h
        );
      })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444488" } }, meta.heat === 0 ? "Standard difficulty." : "Tap a number to change."))), availTabs.length > 1 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, background: "#ffffff08", borderRadius: 8, padding: 2 } }, (() => {
        const canAffordUpgrade = meta && UPGRADES.some((u) => {
          const cur = meta.ups?.[u.id] || 0;
          const tierUnlocked = u.tier <= 1 || u.tier === 2 && meta.stats.w >= 2 || u.tier === 3 && meta.stats.w >= 4 || u.tier === 4 && meta.stats.w >= 6;
          return tierUnlocked && cur < u.max && meta.dust >= u.cost;
        });
        return availTabs.map((t) => {
          const isUpg = t === "upgrades";
          const hasGlow = isUpg && canAffordUpgrade && safeTab !== "upgrades";
          return /* @__PURE__ */ React.createElement("button", { key: t, onClick: () => setTab(t), style: {
            padding: "5px 14px",
            fontSize: 10,
            borderRadius: 6,
            cursor: "pointer",
            background: safeTab === t ? "#ffffff12" : "transparent",
            color: safeTab === t ? "#e8e6e3" : hasGlow ? "#c084fc" : "#666",
            letterSpacing: 1,
            textTransform: "uppercase",
            fontWeight: safeTab === t ? 700 : 400,
            boxShadow: hasGlow ? "0 0 8px #c084fc44" : "none",
            border: hasGlow ? "1px solid #c084fc44" : "1px solid transparent",
            transition: "all .15s"
          } }, t, hasGlow ? " \u2726" : "");
        });
      })()), safeTab === "play" && /* @__PURE__ */ React.createElement(React.Fragment, null, savedRun && /* @__PURE__ */ React.createElement("button", { onClick: () => {
        Audio.init();
        resumeRun(savedRun);
      }, style: { ...BTN("linear-gradient(135deg,#4ade80,#22c55e)", "#0a0a1a"), padding: "14px 48px", fontSize: 18, letterSpacing: 3, textTransform: "uppercase", boxShadow: "0 0 30px #4ade8044", animation: "float 3s ease-in-out infinite", marginBottom: 2 } }, "Continue Colony ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, opacity: 0.7 } }, "Night ", savedRun.ante)), savedRun && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade80aa", textAlign: "center", maxWidth: 300, marginBottom: 4 } }, "Night ", savedRun.ante, ", ", ["Dusk", "Midnight", "Boss"][savedRun.blind] || "?", " \xB7 ", (savedRun.hand || []).length + (savedRun.draw || []).length, " cats \xB7 ", savedRun.gold || 0, "\u{1F41F}"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        try {
          Audio.init();
          if (savedRun) {
            setNewColonyConfirm(true);
            return;
          }
          if (!meta?.stats?.r) {
            setGuide({ step: 0, msg: "" });
            startGame();
            setPh("firstIntro");
          } else {
            startGame();
          }
        } catch (e) {
          console.error("Start error:", e);
        }
      }, style: { ...BTN(savedRun ? "#1a1a2e" : "linear-gradient(135deg,#fbbf24,#f59e0b)", savedRun ? "#fbbf24" : "#0a0a1a"), padding: savedRun ? "10px 32px" : "14px 48px", fontSize: savedRun ? 13 : 18, letterSpacing: savedRun ? 2 : 3, textTransform: "uppercase", boxShadow: savedRun ? "none" : "0 0 30px #fbbf2444", border: savedRun ? "1px solid #fbbf2444" : "none" } }, savedRun ? "New Colony" : "Enter the Night"), !savedRun && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#ffffff22", letterSpacing: 2, marginTop: -2 } }, (!meta || meta.stats.r === 0) ? "~12 min first run" : MX >= 5 ? "~18 min" : "~12 min"), newColonyConfirm && savedRun && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 360, padding: "14px 18px", borderRadius: 12, background: "linear-gradient(145deg,#2e1b11,#0d0d1a)", border: "1px solid #fbbf2444", animation: "fadeIn .3s ease-out", marginTop: 8, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#fbbf24", fontWeight: 700, marginBottom: 8 } }, "Abandon saved colony?"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ffffffaa", lineHeight: 1.6, marginBottom: 10 } }, "Your colony on Night ", savedRun.ante || "?", ", Blind ", (savedRun.blind || 0) + 1, " will be lost.", savedRun.score > 0 && /* @__PURE__ */ React.createElement("div", { style: { color: "#fbbf24", marginTop: 3 } }, "Score: ", (savedRun.score || 0).toLocaleString(), " so far."), /* @__PURE__ */ React.createElement("div", { style: { color: "#ef4444aa", marginTop: 3 } }, "This cannot be undone.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setNewColonyConfirm(false), style: { fontSize: 12, padding: "8px 20px", borderRadius: 6, border: "1px solid #ffffff22", background: "transparent", color: "#888", cursor: "pointer", minHeight: 36 } }, "Go back"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setNewColonyConfirm(false);
        startGame();
      }, style: { fontSize: 12, padding: "8px 20px", borderRadius: 6, border: "1px solid #fbbf2466", background: "#fbbf2418", color: "#fbbf24", cursor: "pointer", fontWeight: 700, minHeight: 36 } }, "Start fresh"))), meta && canUnlockNinthDawn(meta) && !meta.ninthDawnCleared && /* @__PURE__ */ React.createElement("button", { onClick: () => {
        Audio.init();
        startNinthDawn();
      }, style: { ...BTN("linear-gradient(135deg,#fbbf24,#fef08a)", "#0a0a1a"), padding: "10px 36px", fontSize: 13, letterSpacing: 4, textTransform: "uppercase", boxShadow: "0 0 20px #fbbf2444", animation: "float 3s ease-in-out infinite" } }, "\u300C THE NINTH DAWN \u300D"), meta && meta.stats.w >= 1 && (() => {
        const dd = getDailyData();
        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const played = dd.lastDate === today && dd.played;
        const todayScore = dd.lastDate === today ? dd.score : 0;
        const streak = dd.lastDate === today ? dd.streak : dd.lastDate === new Date(Date.now() - 864e5).toISOString().slice(0, 10) ? dd.streak || 0 : 0;
        const allTimeBest = dd.allTime || 0;
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 2 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
          Audio.init();
          startDailyRun();
        }, disabled: played, style: { ...BTN(played ? "#1a1a2e" : "linear-gradient(135deg,#67e8f9,#3b82f6)", played ? "#67e8f988" : "#0a0a1a"), padding: "8px 28px", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", border: played ? "1px solid #67e8f933" : "none", opacity: played ? 0.6 : 1 } }, played ? "Daily Complete" : "\u2600\uFE0F Daily Colony"), played && todayScore > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#67e8f9aa" } }, "Today: ", todayScore.toLocaleString(), streak > 1 ? ` \xB7 ${streak} day streak` : ""), !played && allTimeBest > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#67e8f966" } }, "Best: ", allTimeBest.toLocaleString(), streak > 1 ? ` \xB7 ${streak} day streak` : ""), played && /* @__PURE__ */ React.createElement("button", { onClick: () => {
          const sq = { "Autumn": "\u{1F7EB}", "Winter": "\u{1F7E6}", "Spring": "\u{1F7E9}", "Summer": "\u{1F7E7}" };
          const dom = dd.won ? "\u{1F7E9}" : "\u274C";
          const grid = Array(Math.max(1, dd.night || 1)).fill("\u2B1C").map((_, i) => i < (dd.night || 1) - 1 ? "\u{1F7E9}" : dom).join("") + (dd.night < 5 ? "\u2B1B".repeat(5 - (dd.night || 1)) : "");
          const shareText = `\u{1F431} Ninth Life Daily \xB7 ${today}
${grid}
Score: ${todayScore.toLocaleString()} \xB7 Night ${dd.night || "?"}
\u2192 https://greatgamesgonewild.github.io/ninth-life/`;
          try {
            navigator.clipboard?.writeText(shareText);
            toast("\u{1F4CB}", "Copied!", "#67e8f9", 1500);
          } catch (e) {
          }
        }, style: { background: "none", border: "1px solid #67e8f922", borderRadius: 5, fontSize: 9, color: "#67e8f966", cursor: "pointer", padding: "2px 10px" } }, "Share daily"));
      })(), meta && meta.stats.w >= 1 && !canUnlockNinthDawn(meta) && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "8px 14px", borderRadius: 8, background: "#fbbf2406", border: "1px solid #fbbf2411", maxWidth: 280 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2444", letterSpacing: 3, fontWeight: 700 } }, "\u300C THE NINTH DAWN \u300D"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#fbbf2433", lineHeight: 1.6, marginTop: 4 } }, (meta.stats.mh || meta.heat || 0) >= 3 ? "\u2705" : "\u2B1C", " Heat 3+ win", " \xB7 ", (meta.cats?.length || 0) >= 9 ? "\u2705" : "\u2B1C", " 9+ Hearth cats", " \xB7 ", BK.every((b) => (meta.stats.disc || []).some((d) => d.startsWith(b))) ? "\u2705" : "\u2B1C", " All 4 seasons saved", " \xB7 ", (meta.achv || []).length >= 3 ? "\u2705" : "\u2B1C", " 3+ achievements")), meta?.ninthDawnCleared && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2466", fontStyle: "italic" } }, "\u{1F305} The dawn holds."), showLongDark && !isFirstRun && /* @__PURE__ */ React.createElement("button", { onClick: () => setLongDark((v) => !v), style: { padding: "6px 16px", fontSize: 10, border: `1px solid ${longDark ? "#818cf8" : "#ffffff22"}`, borderRadius: 6, cursor: "pointer", background: longDark ? "#818cf822" : "transparent", color: longDark ? "#818cf8" : "#666", letterSpacing: 1, marginTop: 2 } }, longDark ? "\u{1F311} THE LONG DARK: 9 nights" : "\u{1F311} The Long Dark"), longDark && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#818cf8aa", fontStyle: "italic" } }, "Nine nights. Nine colonies. The full weight of the dark."), showHeat && (meta.heat || 0) > 0 && HEAT_FLAVOR[meta.heat] && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444bb", fontStyle: "italic" } }, HEAT_FLAVOR[meta.heat]), showHeat && (meta.heat || 0) > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444488", lineHeight: 1.6, textAlign: "center", maxWidth: 280 } }, "Targets +", Math.round(meta.heat * 15), "%", meta.heat >= 1 ? " \xB7 Bosses +1 curse" : "", meta.heat >= 2 ? " \xB7 -1 discard" : "", meta.heat >= 3 ? " \xB7 Shop +1\u{1F41F} \xB7 Den fiercer" : "", meta.heat >= 4 ? " \xB7 -1 hand" : "", meta.heat >= 5 ? " \xB7 Start with Hexed cat" : "", " \xB7 ", "+", meta.heat * 25, "% stardust"), showHeat && (meta.heat || 0) > 0 && (() => {
        const h = meta.heat;
        const fx = getHeatFx(h);
        const mods = [];
        mods.push(`Targets +${Math.round((fx.targets - 1) * 100)}%`);
        if (fx.extraCurse) mods.push(`+${fx.extraCurse} boss curse`);
        if (fx.discMod) mods.push(`${fx.discMod} discard`);
        if (fx.shopCost) mods.push(`+${fx.shopCost}\u{1F41F} shop cost`);
        if (fx.handMod) mods.push(`${fx.handMod} hand`);
        if (fx.hexStart) mods.push("start with Cursed cat");
        mods.push(`+${Math.round((fx.dustMult - 1) * 100)}% stardust`);
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444466", letterSpacing: 1 } }, mods.join(" \xB7 "));
      })(), (meta?.relics || []).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" } }, (meta.relics || []).sort().map((h) => {
        const r = HEAT_RELICS[h];
        return r ? /* @__PURE__ */ React.createElement("div", { key: h, style: { padding: "3px 8px", borderRadius: 5, background: "#fbbf2408", border: "1px solid #fbbf2422", fontSize: 10, color: "#fbbf24" }, title: `${r.name}: ${r.desc}
"${r.flavor}"` }, r.icon, " ", r.name) : null;
      })), (!meta || meta.stats.r === 0) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2466", lineHeight: 1.5, textAlign: "center", maxWidth: 300 } }, "3 nights. 18 cats. The game teaches as you play."), meta && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 14, fontSize: 10, color: "#666", alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", null, meta.stats.r, " runs"), /* @__PURE__ */ React.createElement("span", null, meta.stats.w, " wins"), (meta.stats.streak || 0) >= 2 && /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80", fontWeight: 700 } }, "\u{1F525} W", meta.stats.streak), meta.stats.r >= 3 && /* @__PURE__ */ React.createElement("span", { onClick: () => setSeen((s) => ({ ...s, careerStats: !s.careerStats })), style: { cursor: "pointer", color: seen.careerStats ? "#fbbf24" : "#666" } }, "\u{1F4CA} Stats")), seen.careerStats && meta && meta.stats.r >= 3 && (() => {
        const s = meta.stats;
        const cats = meta.cats || [];
        const sc = {};
        cats.forEach((c) => {
          sc[c.breed] = (sc[c.breed] || 0) + 1;
        });
        const favSeason = Object.entries(sc).sort((a, b) => b[1] - a[1])[0];
        const hp = s.handTypePlays || {};
        const favHand = Object.entries(hp).sort((a, b) => b[1] - a[1])[0];
        return /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 16px", borderRadius: 10, background: "#ffffff04", border: "1px solid #ffffff0a", maxWidth: 360, fontSize: 11, color: "#888", lineHeight: 1.8, animation: "fadeIn .3s ease-out", textAlign: "left" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: "#fbbf24", marginBottom: 4, fontSize: 10, letterSpacing: 2 } }, "CAREER"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px" } }, /* @__PURE__ */ React.createElement("span", null, "Runs: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#e8e6e3" } }, s.r)), /* @__PURE__ */ React.createElement("span", null, "Wins: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#4ade80" } }, s.w)), /* @__PURE__ */ React.createElement("span", null, "Cats saved: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#c084fc" } }, cats.length)), /* @__PURE__ */ React.createElement("span", null, "Stardust: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#c084fc" } }, meta.dust || 0, "\u2726")), /* @__PURE__ */ React.createElement("span", null, "Deaths: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#ef4444" } }, s.totalFallen || 0)), /* @__PURE__ */ React.createElement("span", null, "Epithets: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#fbbf24" } }, s.epithetsEarned || 0)), favSeason && /* @__PURE__ */ React.createElement("span", null, "Fav season: ", /* @__PURE__ */ React.createElement("b", { style: { color: BREEDS[favSeason[0]]?.color } }, BREEDS[favSeason[0]]?.icon, " ", favSeason[0])), favHand && /* @__PURE__ */ React.createElement("span", null, "Fav hand: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#e8e6e3" } }, favHand[0])), /* @__PURE__ */ React.createElement("span", null, "Best score: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#fbbf24" } }, (s.hs || 0).toLocaleString())), /* @__PURE__ */ React.createElement("span", null, "Heat: ", /* @__PURE__ */ React.createElement("b", { style: { color: meta.heat > 0 ? "#ef4444" : "#666" } }, meta.heat || 0))));
      })(), seen.howToPlay && /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 16px", borderRadius: 10, background: "#ffffff06", border: "1px solid #ffffff0a", maxWidth: 400, fontSize: 13, color: "#aaa", lineHeight: 1.6, animation: "fadeIn .4s ease-out", textAlign: "left" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: "#fbbf24", marginBottom: 4 } }, "Quick Rules"), /* @__PURE__ */ React.createElement("div", null, "Draw 6 cats. Pick up to 5. Discard to swap (free)."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 4 } }, "Match 3+ of one season for Clowder or Colony."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 4 } }, "Same-season cats resonate and score far better. Traits multiply the total. Beat the target."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, "Scars (\xD71.25) and Bonds (\xD71.5) multiply your score."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 4 } }, "Nerve builds every blind you clear. Fast boss clears give more."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 4 } }, "In the Den, shelter a \u2642+\u2640 pair to breed. Everyone else enters the wilds."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, color: "#67e8f9" } }, "\u{1F3AF} Match seasons for Clowder or Colony hands."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 2, color: "#67e8f9" } }, "Same-season cats resonate for bigger scores. Unplayed cats with traits give bench bonuses."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, color: "#34d399" } }, "\u{1F46A} Shelter a parent with their child to teach traits."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 2, color: "#34d399" } }, "Save a M/F pair to the Hearth. Their descendants begin your next colony."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#ffffff04", border: "1px solid #ffffff08", fontSize: 11, color: "#666", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: "#888", marginBottom: 2, fontSize: 10, letterSpacing: 1 } }, "GLOSSARY"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6" } }, "Chips"), " = base score from Power. ", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "Mult"), " = multiplier from traits and bonuses."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, "Nerve"), " = momentum. Builds each round, multiplies everything."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#888" } }, "Bench"), " = cats in your hand that you didn't play. Traits still give passive bonuses."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#c084fc" } }, "Wards"), " = passive items. Boost score every hand. ", /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, "Scrolls"), " = level up hand types."))), meta && (mb.gold > 0 || mb.hands > 0 || mb.discards > 0 || mb.fervor > 0) && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", fontSize: 10 } }, mb.gold > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, "+", mb.gold, "\u{1F41F}"), mb.hands > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6" } }, "+", mb.hands, "H"), mb.discards > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "+", mb.discards, "D"), mb.fervor > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#d97706" } }, "N+", mb.fervor))), safeTab === "\u2726 upgrades" && meta && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", display: "flex", flexDirection: "column", gap: 6 } }, (() => {
        const totalLevels = Object.values(meta.ups || {}).reduce((s, v) => s + v, 0);
        const tierReq = { 1: 0, 2: 2, 3: 4, 4: 6 };
        const tierName = { 1: "Fundamentals", 2: "Strategic", 3: "Power", 4: "Endgame" };
        const tierColor2 = { 1: "#888", 2: "#60a5fa", 3: "#c084fc", 4: "#fbbf24" };
        const tiers = [1, 2, 3, 4];
        return tiers.map((t) => {
          const tierUps = UPGRADES.filter((u) => u.tier === t);
          const unlocked = totalLevels >= tierReq[t];
          const allMaxed = tierUps.every((u) => (meta.ups[u.id] || 0) >= u.max);
          const defaultOpen = unlocked && !allMaxed;
          return /* @__PURE__ */ React.createElement("details", { key: t, open: defaultOpen }, /* @__PURE__ */ React.createElement("summary", { style: { fontSize: 11, color: unlocked ? tierColor2[t] : tierColor2[t] + "66", letterSpacing: 2, fontWeight: 700, marginTop: t > 1 ? 8 : 0, marginBottom: 4, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", listStyle: "none" } }, /* @__PURE__ */ React.createElement("span", null, unlocked ? "" : "\u{1F512} ", tierName[t].toUpperCase(), " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 400, color: "#666" } }, "(", tierUps.filter((u) => (meta.ups[u.id] || 0) >= u.max).length, "/", tierUps.length, ")")), !unlocked ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666", fontWeight: 400 } }, "Unlocks at ", tierReq[t], " upgrades (", totalLevels, "/", tierReq[t], ")") : allMaxed ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#4ade80", fontWeight: 400 } }, "\u2713 COMPLETE") : /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666" } }, "\u25BE")), tierUps.map((u) => {
            const o = meta.ups[u.id] || 0, mx = o >= u.max, can = unlocked && meta.dust >= u.cost && !mx;
            return /* @__PURE__ */ React.createElement("div", { key: u.id, onClick: () => can && buyUpg(u), style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: mx ? "#4ade8008" : !unlocked ? "#ffffff02" : "#ffffff04", border: `1px solid ${mx ? "#4ade8033" : can ? tierColor2[t] + "44" : "#ffffff0a"}`, cursor: can ? "pointer" : "default", opacity: !unlocked ? 0.35 : can || mx ? 1 : 0.5 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18 } }, u.icon), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, textAlign: "left" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: mx ? "#4ade80" : tierColor2[t] } }, u.name, o > 0 ? ` (${o}/${u.max})` : ""), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888" } }, u.desc), u.flavor && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#666", fontStyle: "italic", marginTop: 1 } }, u.flavor)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: mx ? "#4ade80" : "#c084fc", fontWeight: 700 } }, mx ? "MAX" : `\u2726${u.cost}`));
          }));
        });
      })()), safeTab === "hearth" && meta && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", display: "flex", flexDirection: "column", gap: 8 } }, meta.cats.length > 0 ? (() => {
        const dustBonus = getMB().dustBonus || 0;
        const heatMult = getHeatFx(meta?.heat).dustMult || 1;
        const hd = calcTotalHearthDust(meta.cats, dustBonus, heatMult);
        const activeCats = meta.cats.filter((c) => !c.enshrined);
        const enshrinedCats = meta.cats.filter((c) => c.enshrined);
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: "100%", height: 80, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: -8 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, #fbbf2418, #ef44440a, transparent 70%)", animation: "breathe 3s ease-in-out infinite" } }), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle, #fbbf2422, transparent 60%)", animation: "breathe 2.5s ease-in-out .5s infinite" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 36, zIndex: 1, animation: "float 3s ease-in-out infinite", filter: "drop-shadow(0 0 20px #fbbf2444)" } }, "\u{1F525}"), activeCats.slice(0, 8).map((c, i) => { const ang = (i / Math.min(8, activeCats.length)) * Math.PI * 2 - Math.PI / 2; const r = 34; return /* @__PURE__ */ React.createElement("div", { key: c.id || i, style: { position: "absolute", left: `calc(50% + ${Math.cos(ang) * r}px - 3px)`, top: `calc(50% + ${Math.sin(ang) * r}px - 3px)`, width: 6, height: 6, borderRadius: "50%", background: BREEDS[c.breed]?.color || "#fbbf24", boxShadow: `0 0 4px ${BREEDS[c.breed]?.color || "#fbbf24"}66`, opacity: 0.7, animation: `breathe ${2 + i * 0.3}s ease-in-out ${i * 0.2}s infinite` } }); })), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "8px 0" } }, (() => {
          const n = meta.cats.length;
          const tier = n >= 15 ? { name: "THE CONSTELLATION", icon: "\u2B50", color: "#fef08a", bonus: "+30% stardust" } : n >= 6 ? { name: "THE CIRCLE", icon: "\u{1F525}", color: "#fb923c", bonus: "+15% stardust" } : { name: "THE EMBER", icon: "\u{1F56F}\uFE0F", color: "#b8956a", bonus: "" };
          return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: tier.color + "88", letterSpacing: 3, marginBottom: 4 } }, tier.icon, " ", tier.name, tier.bonus ? ` \xB7 ${tier.bonus}` : "");
        })(), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fcbb", letterSpacing: 3 } }, "STARDUST PER RUN"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: 900, color: "#c084fc", textShadow: "0 0 20px #c084fc44" } }, "+", hd.total, "\u2726"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc88", lineHeight: 1.6 } }, (dustBonus > 0 || heatMult > 1 || hd.maintenance > 0) && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "Gross ", hd.gross, "\u2726"), dustBonus > 0 && /* @__PURE__ */ React.createElement("span", null, " (\xD7", 1 + dustBonus, " bonus)"), heatMult > 1 && /* @__PURE__ */ React.createElement("span", null, " (\xD7", heatMult, " heat)"), hd.maintenance > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444bb" } }, " \u2212 ", hd.maintenance, "\u2726 upkeep (", hd.activeCats - 8, " above 8)"))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666" } }, "Each saved cat radiates stardust when you enter the night")), activeCats.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 2 } }, "HEARTH (", activeCats.length, " cats", hd.maintenance > 0 ? `. ${hd.maintenance}\u2726 upkeep` : "", ")"), (() => {
          const whisperTime = Math.floor(Date.now() / 12e3);
          const whisperCat = activeCats[whisperTime % activeCats.length];
          if (!whisperCat) return null;
          const fn = whisperCat.name?.split(" ")[0] || "Someone";
          const templates = whisperCat.scarred ? [`"The scar still itches. I'd do it again."`, `"I remember the fight. I remember winning."`, `"Scars don't fade here. Good."`] : whisperCat.bonded ? [`"I hear them sometimes. The ones who didn't make it."`, `"We made it. Together."`, `"The fire is warm enough for two."`] : whisperCat.stats?.tp >= 10 ? [`"${ante || 5} nights is nothing. I'd go back."`, `"They tell stories about us. I've heard them."`, `"We earned this warmth."`] : [`"It's warm here. Warmer than I expected."`, `"I watch the new ones leave. I hope they come back."`, `"The fire never goes out. That means something."`];
          return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2466", fontStyle: "italic", textAlign: "center", lineHeight: 1.5, animation: "fadeIn 2s ease-out", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { color: BREEDS[whisperCat.breed]?.color || "#888", fontWeight: 600 } }, fn, ":"), " ", templates[whisperTime % templates.length]);
        })(), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" } }, activeCats.map((c, i) => {
          const tr = TRAITS.find((t) => t.name === c.trait.name) || c.trait;
          const perCat = calcHearthDust([c])[0].dust;
          return /* @__PURE__ */ React.createElement("div", { key: `h${i}`, style: { textAlign: "center", position: "relative" }, onClick: () => {
            const legacyLines = [c.name];
            if (c.epithet) legacyLines.push(c.epithet);
            if (c.origin) legacyLines.push(c.origin);
            if (c.savedAt) legacyLines.push("Saved run #" + (c.savedAt || "?"));
            if (c.stats?.bs) legacyLines.push("Best: " + c.stats.bs.toLocaleString());
            if (c.stats?.tp) legacyLines.push(c.stats.tp + " hands");
            if (c.scarred) legacyLines.push("Battle-hardened");
            const childCount = (meta.cats || []).filter((x) => x._hearthParents && x._hearthParents.includes(c.name.split(" ")[0])).length;
            if (childCount > 0) legacyLines.push(childCount + " descendant" + (childCount > 1 ? "s" : ""));
            toast(BREEDS[c.breed]?.icon || "\u{1F431}", legacyLines.join(" \xB7 "), BREEDS[c.breed]?.color || "#fbbf24", 5e3);
          } }, /* @__PURE__ */ React.createElement(CC, { cat: { ...c, id: `ht${i}`, trait: tr }, sm: true }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: "#c084fc", marginTop: 1, textShadow: "0 0 6px #c084fc44" } }, "+", perCat, "\u2726"), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
            e.stopPropagation();
            const pairCats = c.pairId ? meta.cats.filter((x) => x.pairId === c.pairId) : meta.cats.filter((x) => x.name === c.name && x.savedAt === c.savedAt);
            const pairDust = pairCats.reduce((s, pc) => s + calcHearthDust([pc])[0].dust, 0) * 3;
            const pairNames = pairCats.map((pc) => pc.name.split(" ")[0]).join(" & ");
            setHearthConfirm({ name: c.name, pairNames, pairDust, pairCats });
          }, style: { fontSize: 10, color: "#ef444488", background: "transparent", border: "1px solid #ef444433", borderRadius: 4, padding: "4px 8px", cursor: "pointer", marginTop: 2, minHeight: 28, minWidth: 44 } }, "Let Go"), meta.cats.length >= 20 && /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
            e.stopPropagation();
            const cn = c.name.split(" ")[0];
            if (!c._enshrineReady) {
              toast("\u{1F31F}", `Enshrine ${cn}? Permanent. No dust cost, but they stop producing children. Tap again to confirm.`, "#fbbf24", 3500);
              c._enshrineReady = true;
              setTimeout(() => {
                c._enshrineReady = false;
              }, 4e3);
              return;
            }
            c._enshrineReady = false;
            const u = { ...meta, cats: meta.cats.map((x) => x.name === c.name && x.savedAt === c.savedAt ? { ...x, enshrined: true } : x) };
            setMeta(u);
            saveS(u);
            toast("\u{1F31F}", `${cn} enshrined. Their light is permanent now.`, "#fbbf24");
          }, style: { fontSize: 10, color: "#fbbf24bb", background: "transparent", border: "1px solid #fbbf2422", borderRadius: 4, padding: "4px 8px", cursor: "pointer", marginTop: 2, minHeight: 28, minWidth: 44 } }, "Enshrine"));
        })), hearthConfirm && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 360, padding: "14px 18px", borderRadius: 12, background: "linear-gradient(145deg,#2e1111,#0d0d1a)", border: "1px solid #ef444444", animation: "fadeIn .3s ease-out", marginTop: 8, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#ef4444", fontWeight: 700, marginBottom: 8 } }, "Let go of ", hearthConfirm.pairNames, "?"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444aa", lineHeight: 1.6, marginBottom: 10 } }, "Both cats leave the Hearth forever. Their children will no longer appear in drafts.", /* @__PURE__ */ React.createElement("div", { style: { color: "#c084fc", marginTop: 4, fontWeight: 700 } }, "You receive ", hearthConfirm.pairDust, "\u2726 stardust.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setHearthConfirm(null), style: { fontSize: 12, padding: "8px 20px", borderRadius: 6, border: "1px solid #ffffff22", background: "transparent", color: "#888", cursor: "pointer", minHeight: 36 } }, "Keep them"), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
          const { pairCats, pairDust, pairNames } = hearthConfirm;
          setHearthConfirm(null);
          const removeIds = new Set(pairCats.map((pc) => `${pc.name}-${pc.savedAt}`));
          const newCats = meta.cats.filter((pc) => !removeIds.has(`${pc.name}-${pc.savedAt}`));
          const newDust = (meta.dust || 0) + pairDust;
          const u = { ...meta, cats: newCats, dust: newDust, stats: { ...meta.stats, hearthReleases: (meta.stats.hearthReleases || 0) + 1 } };
          setMeta(u);
          await saveS(u);
          toast("\u2726", `${pairNames} walk into the light. +${pairDust}\u2726. The Hearth remembers.`, "#c084fc", 3e3);
        }, style: { fontSize: 12, padding: "8px 20px", borderRadius: 6, border: "1px solid #ef444466", background: "#ef444418", color: "#ef4444", cursor: "pointer", fontWeight: 700, minHeight: 36 } }, "Farewell. +", hearthConfirm.pairDust, "\u2726")))), enshrinedCats.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24bb", letterSpacing: 2, marginTop: 4 } }, "\u{1F31F} ENSHRINED (", enshrinedCats.length, "). eternal, no upkeep"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" } }, enshrinedCats.map((c, i) => {
          const tr = TRAITS.find((t) => t.name === c.trait.name) || c.trait;
          return /* @__PURE__ */ React.createElement("div", { key: `en${i}`, style: { textAlign: "center", position: "relative" } }, /* @__PURE__ */ React.createElement("div", { style: { border: "2px solid #fbbf2444", borderRadius: 8, padding: 1 } }, /* @__PURE__ */ React.createElement(CC, { cat: { ...c, id: `en${i}`, trait: tr }, sm: true })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2466" } }, "\u{1F31F}"));
        }))));
      })() : /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontSize: 11, textAlign: "center", padding: "20px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, opacity: 0.3, marginBottom: 8 } }, "\u{1F3E0}"), "No survivors yet. Win a run and save a cat to the Hearth.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { color: "#c084fcbb", fontSize: 10 } }, "Each saved cat will generate \u2726 Stardust at the start of every run.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, justifyContent: "center" } }, BK.map((b) => {
        const has = (meta.stats.disc || []).some((d) => d.startsWith(b));
        return /* @__PURE__ */ React.createElement("span", { key: b, style: { fontSize: 12, opacity: has ? 1 : 0.2, filter: has ? "none" : "grayscale(1)" }, title: has ? `${b} saved` : `${b} needed` }, BREEDS[b].icon);
      }), BK.every((b) => (meta.stats.disc || []).some((d) => d.startsWith(b))) && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#4ade80", fontWeight: 700 } }, "\u2713 All seasons!")), (meta.achv || []).length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 3 } }, "ACHIEVEMENTS (", (meta.achv || []).length, "/", ACHIEVEMENTS.length, ")"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" } }, ACHIEVEMENTS.filter((a) => (meta.achv || []).includes(a.id)).map((a) => /* @__PURE__ */ React.createElement("span", { key: a.id, onClick: () => toast(a.icon, `${a.name}: ${a.reward}`, "#fbbf24"), style: { fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "#fbbf2411", border: "1px solid #fbbf2422", color: "#fbbf24", cursor: "pointer" }, title: `${a.desc} \u2192 ${a.reward}` }, a.icon, " ", a.name)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", opacity: 0.4 } }, ACHIEVEMENTS.filter((a) => !(meta.achv || []).includes(a.id)).map((a) => /* @__PURE__ */ React.createElement("span", { key: a.id, onClick: () => toast(a.icon, `${a.name}: ${a.desc}`, "#555"), style: { fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#ffffff04", border: "1px solid #ffffff08", color: "#666", cursor: "pointer" }, title: a.desc }, a.icon, " ", a.name))), meta.ninthDawnCleared && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, padding: "12px 16px", borderRadius: 10, background: "linear-gradient(135deg,#fbbf2408,#7a665208)", border: "1px solid #fbbf2422" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#fbbf24", letterSpacing: 4, textAlign: "center", fontWeight: 700 } }, "\u{1F305} THE RECORD"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2466", textAlign: "center", marginTop: 3, marginBottom: 8 } }, "Every cat who ever carried the colony's name."), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: "100%", maxWidth: 300, height: 300, margin: "0 auto", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid #ffffff06" } }), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: "15%", borderRadius: "50%", border: "1px solid #ffffff04" } }), meta.cats.map((c, i) => {
        const angle = i / meta.cats.length * Math.PI * 2 - Math.PI / 2;
        const radius = c.enshrined ? 90 : 120;
        const cx = 150 + Math.cos(angle) * radius;
        const cy = 150 + Math.sin(angle) * radius;
        const dustVal = c.power * 2 + (c.trait?.tier === "mythic" ? 15 : c.trait?.tier === "legendary" ? 10 : c.trait?.tier === "rare" || c.trait?.tier === "rare_neg" ? 6 : c.trait?.name !== "Plain" ? 3 : 0);
        const dotSize = Math.max(6, Math.min(14, 4 + dustVal / 3));
        const col = BREEDS[c.breed]?.color || "#888";
        return /* @__PURE__ */ React.createElement("div", { key: i, title: `${c.name}. P${c.power} ${c.breed} ${c.trait?.icon || ""} ${c.trait?.name || "Plain"}${c.bonded ? " \u{1F495}" : ""}${c.scarred ? " \u2694" : ""}
Saved from Night ${c.fromAnte || "?"}`, style: {
          position: "absolute",
          left: cx - dotSize / 2,
          top: cy - dotSize / 2,
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          background: col,
          boxShadow: `0 0 ${c.enshrined ? 12 : 6}px ${col}66`,
          border: c.enshrined ? "2px solid #fbbf24" : "1px solid #ffffff22",
          cursor: "pointer",
          transition: "all .15s",
          zIndex: 1
        } });
      }), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, opacity: 0.5 } }, "\u{1F525}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2466" } }, meta.cats.length, " saved"))), (() => {
        const cats = meta.cats;
        const totalDust = cats.reduce((s, c) => s + c.power * 2 + (c.trait?.tier === "mythic" ? 15 : c.trait?.tier === "legendary" ? 10 : c.trait?.tier === "rare" || c.trait?.tier === "rare_neg" ? 6 : c.trait?.name !== "Plain" ? 3 : 0) + (c.bonded ? 8 : 0) + (c.scarred ? 3 : 0), 0);
        const byCounts = {};
        cats.forEach((c) => {
          byCounts[c.breed] = (byCounts[c.breed] || 0) + 1;
        });
        const longestSurvivor = cats.reduce((best, c) => (c.stats?.tp || 0) > (best.stats?.tp || 0) ? c : best, cats[0]);
        const mostScarred = cats.filter((c) => c.scarred).length;
        const totalRuns = meta.stats.r || 0;
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: "#888", lineHeight: 1.5 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Saved"), /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24", fontWeight: 700 } }, cats.length, " cats across ", totalRuns, " runs")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Total stardust generated"), /* @__PURE__ */ React.createElement("span", { style: { color: "#c084fc", fontWeight: 700 } }, totalDust, "\u2726")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Seasons"), /* @__PURE__ */ React.createElement("span", null, Object.entries(byCounts).map(([b, n]) => /* @__PURE__ */ React.createElement("span", { key: b, style: { color: BREEDS[b]?.color } }, BREEDS[b]?.icon, n, " ")))), longestSurvivor && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Most played"), /* @__PURE__ */ React.createElement("span", { style: { color: BREEDS[longestSurvivor.breed]?.color } }, longestSurvivor.name.split(" ")[0], " (", longestSurvivor.stats?.tp || 0, " plays)")), mostScarred > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Battle-hardened"), /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, mostScarred, " warriors")), (() => {
          const pairs = getHearthPairs(cats);
          return pairs.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Bloodlines"), /* @__PURE__ */ React.createElement("span", { style: { color: "#34d399" } }, pairs.length, " pair", pairs.length > 1 ? "s" : "", ". descendants draft next run")) : null;
        })());
      })(), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center", marginTop: 8 } }, meta.cats.map((c, i) => {
        const hasPair = c.pairId && meta.cats.some((x, j) => j !== i && x.pairId === c.pairId);
        const fullN = c.epithet ? `${c.name.split(" ")[0]} ${c.epithet}` : c.name.split(" ")[0];
        return /* @__PURE__ */ React.createElement("span", { key: i, title: `${fullN}: ${c.breed}, P${c.power}, ${c.trait?.name || "Plain"}${c.story?.length ? "\n" + c.story.join(", ") : ""}`, style: { fontSize: 10, color: BREEDS[c.breed]?.color || "#888", padding: "2px 6px", borderRadius: 3, background: c.enshrined ? "#fbbf2411" : "#ffffff06", border: c.enshrined ? "1px solid #fbbf2433" : hasPair ? "1px solid #34d39933" : "none", cursor: "help" } }, c.enshrined ? "\u{1F31F} " : "", hasPair ? "\u{1F46A} " : "", fullN, " ", c.sex === "M" ? "\u2642" : "\u2640");
      })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#999999aa", textAlign: "center", marginTop: 8, fontStyle: "italic" } }, "Nine colonies. One survived. Not because it was the strongest. Because someone remembered all the rest."))), safeTab === "bestiary" && meta && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", display: "flex", flexDirection: "column", gap: 8, animation: "fadeIn .3s ease-out" } }, (() => {
        const br = meta.stats.bossRecord || {};
        const allBosses = [...BOSSES, ...EXPANDED_BOSSES];
        const defeated = allBosses.filter((b) => br[b.id]?.w > 0).length;
        const expandedUnlocked = (meta.stats.w || 0) >= 3 || (meta.heat || 0) >= 3;
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ef4444", letterSpacing: 4, fontWeight: 700 } }, "BESTIARY"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444466" } }, defeated, "/", allBosses.length, " defeated")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, BOSSES.map((b) => {
          const rec = br[b.id];
          const w = rec?.w || 0;
          const l = rec?.l || 0;
          const met = w > 0 || l > 0;
          return /* @__PURE__ */ React.createElement("div", { key: b.id, style: { padding: "10px 14px", borderRadius: 10, background: met ? "#ef444408" : "#ffffff04", border: `1px solid ${w > 0 ? "#ef444433" : "#ffffff0a"}`, display: "flex", gap: 12, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, filter: met ? "none" : "grayscale(1) brightness(0.3)" } }, b.icon), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: w > 0 ? "#ef4444" : "#666", fontWeight: 700 } }, met ? b.name : "???"), met && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444488", fontStyle: "italic", lineHeight: 1.4 } }, b.lore), met && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", marginTop: 2 } }, w, "W / ", l, "L")));
        }), expandedUnlocked ? EXPANDED_BOSSES.map((b) => {
          const rec = br[b.id];
          const w = rec?.w || 0;
          const l = rec?.l || 0;
          const met = w > 0 || l > 0;
          return /* @__PURE__ */ React.createElement("div", { key: b.id, style: { padding: "10px 14px", borderRadius: 10, background: met ? "#ef444408" : "#ffffff04", border: `1px solid ${w > 0 ? "#ef444433" : "#ffffff0a"}`, display: "flex", gap: 12, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, filter: met ? "none" : "grayscale(1) brightness(0.3)" } }, b.icon), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: w > 0 ? "#ef4444" : "#666", fontWeight: 700 } }, met ? b.name : "???"), met && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444488", fontStyle: "italic", lineHeight: 1.4 } }, b.lore), met && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", marginTop: 2 } }, w, "W / ", l, "L")));
        }) : /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px", borderRadius: 10, background: "#ffffff04", border: "1px solid #ffffff08", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#666" } }, "3 more bosses hidden"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#444" } }, "Win 3 runs or reach Heat 3 to reveal"))), defeated >= 5 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444444", fontStyle: "italic", textAlign: "center", lineHeight: 1.6 } }, "Five patterns. Five colonies. You've seen how they died."));
      })()), safeTab === "rankings" && meta && (() => {
        const loadBoard = (t) => {
          setLbTab(t);
          setLbLoading(true);
          setLbData(null);
          (t === "daily" ? fetchDaily() : fetchAllTime()).then((d) => {
            setLbData(d);
            setLbLoading(false);
          }).catch(() => {
            setLbLoading(false);
          });
        };
        if (!lbData && !lbLoading) loadBoard("daily");
        const dd = getDailyData();
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const myScore = dd.lastDate === todayStr ? dd.score : 0;
        return /* @__PURE__ */ React.createElement("div", { style: { width: "100%", display: "flex", flexDirection: "column", gap: 8, animation: "fadeIn .3s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666" } }, "Your name:"), /* @__PURE__ */ React.createElement(
          "input",
          {
            value: handleInput,
            onChange: (e) => setHandleInput(e.target.value.slice(0, 16)),
            onBlur: () => setHandle(handleInput),
            style: { fontSize: 12, background: "#0d1117", border: "1px solid #ffffff15", borderRadius: 4, padding: "3px 8px", color: "#e8e6e3", width: 120, textAlign: "center", outline: "none" }
          }
        )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2, justifyContent: "center" } }, ["daily", "all-time"].map((t) => /* @__PURE__ */ React.createElement("button", { key: t, onClick: () => loadBoard(t), style: {
          padding: "4px 14px",
          fontSize: 10,
          borderRadius: 5,
          cursor: "pointer",
          background: lbTab === t ? "#67e8f922" : "transparent",
          color: lbTab === t ? "#67e8f9" : "#666",
          border: lbTab === t ? "1px solid #67e8f933" : "1px solid transparent",
          fontWeight: lbTab === t ? 700 : 400,
          letterSpacing: 1,
          textTransform: "uppercase"
        } }, t))), myScore > 0 && lbTab === "daily" && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "6px 12px", borderRadius: 8, background: "#67e8f908", border: "1px solid #67e8f922" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#67e8f966", letterSpacing: 2 } }, "YOUR DAILY SCORE"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: "#67e8f9" } }, myScore.toLocaleString()), dd.streak > 1 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#67e8f966" } }, dd.streak, " day streak")), lbLoading && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: "#666", fontSize: 11, padding: 20 } }, "Loading..."), lbData && lbData.board && lbData.board.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2 } }, lbData.board.map((e, i) => {
          const isMe = e.handle === getHandle();
          return /* @__PURE__ */ React.createElement("div", { key: i, style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 6,
            background: isMe ? "#67e8f90a" : i === 0 ? "#fbbf2408" : "#ffffff03",
            border: isMe ? "1px solid #67e8f933" : i === 0 ? "1px solid #fbbf2422" : "1px solid #ffffff06"
          } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 900, color: i === 0 ? "#fbbf24" : i < 3 ? "#67e8f9" : "#666", width: 24, textAlign: "center" } }, e.rank), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: isMe ? "#67e8f9" : "#e8e6e3", fontWeight: isMe ? 700 : 400 } }, e.handle, isMe ? " (you)" : ""), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#666" } }, e.won ? "\u2705" : "\u274C", " Night ", e.night, e.date ? " \xB7 " + e.date : "")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: i === 0 ? "#fbbf24" : "#e8e6e3" } }, e.score.toLocaleString()));
        }), lbData.total > 20 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#666", textAlign: "center" } }, lbData.total, " players today")), lbData && (!lbData.board || lbData.board.length === 0) && !lbLoading && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: "#666", fontSize: 11, padding: 20 } }, lbTab === "daily" ? "No daily scores yet today. Play the Daily Colony!" : "No scores recorded yet."));
      })()));
    }
    if (anteUp) {
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 16, padding: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#ffffffbb", fontStyle: "italic", textAlign: "center", maxWidth: 300, lineHeight: 1.6, animation: "fadeIn 1.5s ease-out", letterSpacing: 1 } }, NIGHT_EPI[Math.min(anteUp.to - 1, 4)]), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 72, fontWeight: 900, background: "linear-gradient(135deg,#f59e0b,#fef08a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "scorePop .6s ease-out", letterSpacing: 8, marginTop: 8 } }, anteUp.to), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff22", letterSpacing: 6, marginTop: -4, animation: "fadeIn 1s ease-out .3s both" } }, NIGHT_PLACES[Math.min(anteUp.to - 1, NIGHT_PLACES.length - 1)]), /* @__PURE__ */ React.createElement(ProgressMap, { ante: anteUp.to, blind: 0, mx: MX }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", marginTop: 4 } }, "Target: ", /* @__PURE__ */ React.createElement("span", { style: { color: "#e8e6e3", fontWeight: 700 } }, anteUp.target.toLocaleString())), ANTE_ESCALATION[Math.min(anteUp.to - 1, 4)] && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#fbbf2466", fontStyle: "italic", animation: "fadeIn 1.4s ease-out", textAlign: "center", maxWidth: 320, lineHeight: 1.6, textShadow: "0 0 15px #fbbf2422" } }, ANTE_ESCALATION[Math.min(anteUp.to - 1, 4)]), anteUp.to > 1 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#d97706bb", fontStyle: "italic", animation: "fadeIn 1.2s ease-out", textAlign: "center" } }, "\u26A1 The night deepens. The colony holds."), runLog.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 350, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 2, marginBottom: 4 } }, "LAST NIGHT"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 120, overflowY: "auto" } }, runLog.filter((e) => e.ante === anteUp.from).slice(-6).map((e, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 10, color: e.type === "death" ? "#ef4444" : e.type === "breed" ? "#4ade80" : e.type === "hand" ? "#fbbf24" : "#666", padding: "1px 4px" } }, e.type === "draft" && /* @__PURE__ */ React.createElement("span", null, "Drafted: ", e.data.picked), e.type === "hand" && /* @__PURE__ */ React.createElement("span", null, e.data.type, ": ", e.data.score.toLocaleString()), e.type === "breed" && /* @__PURE__ */ React.createElement("span", null, e.data.baby, " born (", e.data.breed, ")"), e.type === "fight" && /* @__PURE__ */ React.createElement("span", null, e.data.loser, " hardened (-", e.data.dmg, "P)"), e.type === "death" && /* @__PURE__ */ React.createElement("span", null, e.data.victim, " died"), e.type === "night" && /* @__PURE__ */ React.createElement("span", null, "Night ", e.data.to, " begins"), e.type === "phoenix" && /* @__PURE__ */ React.createElement("span", null, e.data.risen, " rose from the ashes!"), e.type === "mentor" && /* @__PURE__ */ React.createElement("span", null, e.data.elder, " mentored ", e.data.young), e.type === "found" && /* @__PURE__ */ React.createElement("span", null, e.data.cat, " found rations"), e.type === "growth" && /* @__PURE__ */ React.createElement("span", null, e.data.cat, " grew stronger"), e.type === "wanderer" && /* @__PURE__ */ React.createElement("span", null, e.data.cat, " joined"), e.type === "reward" && /* @__PURE__ */ React.createElement("span", null, "Reward: ", e.data.name), e.type === "event" && /* @__PURE__ */ React.createElement("span", null, e.data.title, ": ", e.data.choice))))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setAnteUp(null);
      }, style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), padding: "12px 40px", fontSize: 15, marginTop: 8 } }, "Continue")));
    }
    if (ph === "bossIntro") {
      const b = boss || BOSSES[0];
      const bossCtx = {
        fallen: fallen.length,
        fallenName: fallen.length > 0 ? fallen[fallen.length - 1].name.split(" ")[0] : "",
        scarred: allC.filter((c) => c.scarred).length,
        bonded: allC.filter((c) => c.bondedTo).length,
        colony: allC.length,
        clutch: false,
        grudges: allC.reduce((s, c) => (c.grudgedWith || []).length + s, 0) / 2,
        deathless: fallen.length === 0,
        gold,
        prevFallen: meta?.allFallen || [],
        totalRuns: meta?.stats?.r || 0,
        totalDeaths: meta?.stats?.totalFallen || 0,
        strongestName: [...allC].sort((a, b2) => b2.power - a.power)[0]?.name.split(" ")[0] || "",
        mourningName: allC.find((c) => c.epithetKey === "mourning")?.name.split(" ")[0] || "",
        markedName: allC.find((c) => c.epithetKey === "scarred")?.name.split(" ")[0] || "",
        scarredName: allC.filter((c) => c.scarred)[0]?.name.split(" ")[0] || "",
        bondedName: allC.filter((c) => c.bondedTo)[0]?.name.split(" ")[0] || "",
        grudgedName: allC.filter((c) => (c.grudgedWith || []).length > 0)[0]?.name.split(" ")[0] || ""
      };
      const dynamicTaunt = b.tauntFn ? b.tauntFn(bossCtx) : null;
      const bRec = (meta?.stats?.bossRecord || {})[b.id];
      const bWins = bRec?.w || 0;
      const bLoss = bRec?.l || 0;
      const mastery = BOSS_MASTERY[b.id];
      const hasMastery = mastery && bWins >= mastery.wins;
      const careerTaunt = bWins >= 5 ? pk([`${bWins} times you've beaten me. You think that changes anything?`, `We've done this ${bWins} times. I remember every one. Do you?`]) : bWins >= 3 ? pk([`Three times. You know my shape now. But shapes change.`, `You've beaten me before. The dark doesn't care about before.`]) : bLoss >= 3 && bWins === 0 ? pk([`Every time, you come back. Every time, I remind you.`, `${bLoss} attempts. Zero victories. I admire the stubbornness.`]) : null;
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "radial-gradient(circle at 50% 40%,transparent 20%,#000000cc 80%)", pointerEvents: "none", zIndex: 1, animation: "fadeIn 1s ease-out" } }), /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "radial-gradient(circle at 50% 40%,#ef444422,transparent 60%)", pointerEvents: "none", zIndex: 1, animation: "breathe 3s ease-in-out infinite", opacity: 0.5 } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 2, gap: vw < 500 ? 10 : 20, padding: vw < 500 ? 16 : 20, maxWidth: 500 } }, BOSS_PORTRAITS[b.id] ? /* @__PURE__ */ React.createElement("div", { style: { width: vw < 500 ? 120 : 200, height: vw < 500 ? 168 : 280, borderRadius: 14, overflow: "hidden", animation: "bossEntrance 1.5s ease-out", boxShadow: "0 0 60px #ef444433, 0 0 120px #ef444411", border: "1px solid #ef444422" } }, /* @__PURE__ */ React.createElement("img", { src: BOSS_PORTRAIT_BASE + BOSS_PORTRAITS[b.id], alt: b.name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => {
        e.target.style.display = "none";
        e.target.nextSibling.style.display = "flex";
      } }), /* @__PURE__ */ React.createElement("div", { style: { display: "none", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 72, background: "#0d1117" } }, b.icon)) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: vw < 500 ? 48 : 72, filter: "drop-shadow(0 0 30px #ef444488)", animation: "bossEntrance 1.5s ease-out" } }, b.icon), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 30, color: "#ef4444", letterSpacing: 8, margin: 0, textShadow: "0 0 40px #ef444488", animation: "epicReveal 1.2s ease-out .3s both" } }, b.name), hasMastery && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24", letterSpacing: 4, fontWeight: 700, animation: "fadeIn 1.2s ease-out" } }, "YOU ARE THE ", mastery.title), (bWins > 0 || bLoss > 0) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444488", letterSpacing: 2, animation: "fadeIn 1.5s ease-out" } }, bWins, "W / ", bLoss, "L"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 17, color: "#ef4444", fontStyle: "italic", textAlign: "center", opacity: 0.8, animation: "fadeIn 1.5s ease-out", lineHeight: 1.6, maxWidth: 360, textShadow: "0 0 20px #ef444422" } }, '"', b.taunt, '"'), careerTaunt && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#ef4444aa", fontStyle: "italic", textAlign: "center", animation: "fadeIn 2s ease-out", lineHeight: 1.5, maxWidth: 340 } }, '"', careerTaunt, '"'), dynamicTaunt && !careerTaunt && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#ef4444bb", fontStyle: "italic", textAlign: "center", animation: "fadeIn 2s ease-out" } }, '"', dynamicTaunt, '"'), (dynamicTaunt || careerTaunt) && (() => {
        const tauntText = dynamicTaunt || careerTaunt;
        const catNames = [bossCtx.scarredName, bossCtx.bondedName, bossCtx.mourningName, bossCtx.strongestName, bossCtx.fallenName, bossCtx.grudgedName].filter(Boolean);
        const namesCat = catNames.some((n) => n && tauntText.includes(n));
        if (!namesCat) return null;
        const shareText = `\u{1F431} Ninth Life \xB7 ${b.name}
"${tauntText}"
\u2192 https://greatgamesgonewild.github.io/ninth-life/`;
        return /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
          e.stopPropagation();
          try {
            navigator.clipboard?.writeText(shareText);
            toast("\u{1F4CB}", "Copied", "#4ade80", 1500);
          } catch (er) {
          }
        }, style: { background: "none", border: "1px solid #ef444433", borderRadius: 6, fontSize: 9, color: "#ef444466", cursor: "pointer", padding: "3px 10px", animation: "fadeIn 2.5s ease-out", marginTop: -4 } }, "Share taunt");
      })(), bossTraits.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", animation: "fadeIn 1.8s ease-out", maxWidth: 400 } }, bossTraits.map((t, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { padding: "8px 14px", borderRadius: 8, background: "#ef444415", border: "1px solid #ef444433", textAlign: "center", minWidth: 120, maxWidth: 180 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16 } }, t.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#ef4444", fontWeight: 700, letterSpacing: 1 } }, t.name)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#ef4444cc", marginTop: 3, lineHeight: 1.3 } }, t.desc), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444bb", fontStyle: "italic", marginTop: 2 } }, t.flavor)))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444bb", fontStyle: "italic", letterSpacing: 2, animation: "fadeIn 2.5s ease-out" } }, b.lore), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 4 } }, curses.map((c, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { padding: "6px 10px", borderRadius: 8, background: "#ef444408", border: "1px solid #ef444433", textAlign: "center", minWidth: 90 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16 } }, c.icon), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444", fontWeight: 600, marginTop: 1 } }, c.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ef4444bb", marginTop: 1 } }, c.fx.exile && cfx.exileBreed ? `${BREEDS[cfx.exileBreed].icon} ${cfx.exileBreed} can't score` : c.desc)))), cfx.exileBreed && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444bb" } }, BREEDS[cfx.exileBreed].icon, " ", cfx.exileBreed, " exiled"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#666", marginTop: 8 } }, "Target: ", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444", fontWeight: 700, fontSize: 16 } }, eTgt().toLocaleString()), (meta?.heat || 0) > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444bb", fontSize: 10 } }, " (Heat +", (meta.heat || 0) * 10, "%)")), hasRelic(3) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade8066", fontStyle: "italic", textAlign: "center", maxWidth: 300, lineHeight: 1.5, animation: "fadeIn 2.5s ease-out", padding: "4px 12px", borderRadius: 6, background: "#4ade8008", border: "1px solid #4ade8018" } }, "\u{1F441}\uFE0F The Vigil whispers: ", b.id === "hunger" ? "Bonds score double here. Fill every hand." : b.id === "territory" ? "Scars make you stronger. The Territory respects fighters." : b.id === "mother" ? "Don't spread thin. Pick your best five and commit." : b.id === "swarm" ? "Nerve is everything. Build it before you get here." : b.id === "forgetting" ? "Every name matters. Play your bonded pairs." : b.id === "fraying" ? "Resolve your grudges before you get here. Every grudge is \u22122 mult." : b.id === "eclipse" ? "Don't rest. Momentum carries through." : b.id === "ember" ? "Give everything. One more hand is all it takes." : "Trust the colony."), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (bossTraits.some((bt) => bt.fx.marked)) {
          const eligible = [...hand, ...draw, ...disc].filter((c) => !c.scarred);
          if (eligible.length > 0) {
            const victim = pk(eligible);
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => x.id === victim.id ? { ...x, scarred: true } : x));
            });
            victim.scarred = true;
            assignEpithet(victim);
            if (victim._newEpithet) {
              delete victim._newEpithet;
              setTimeout(() => {
                toast("\u{1F3F7}\uFE0F", epithetToastMsg(victim), BREEDS[victim.breed]?.color || "#fbbf24", 3e3);
                Audio.epithetEarned();
              }, 1500);
            }
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => x.id === victim.id ? { ...x, epithet: victim.epithet, epithetKey: victim.epithetKey } : x));
            });
            toast("\u{1FA9E}", `${victim.name.split(" ")[0]} was hardened before the fight began.`, "#ef4444", 2e3);
          }
        }
        setPh("playing");
      }, style: { ...BTN("linear-gradient(135deg,#ef4444,#dc2626)", "#fff"), padding: "12px 40px", fontSize: 15 } }, "Defend")));
    }
    if (ph === "event" && colEvent) {
      const evt = colEvent, tgts = colTargets;
      const allC2 = [...hand, ...draw, ...disc];
      const evtCtx = {
        all: allC2,
        colony: allC2.length,
        fallen,
        night: ante,
        ante,
        nerve: NERVE[ferv].name,
        scarred: allC2.filter((c) => c.scarred).length,
        injured: allC2.filter((c) => c.injured).length,
        bonded: allC2.filter((c) => c.bondedTo).length,
        grudges: allC2.reduce((s, c) => (c.grudgedWith || []).length + s, 0) / 2,
        gold,
        isNinthDawn,
        eventHistory,
        seasons: BK.map((b) => ({ name: b, count: allC2.filter((c) => c.breed === b).length })).filter((s) => s.count > 0).sort((a, b) => b.count - a.count)
      };
      const evtText = evt.textFn ? evt.textFn(tgts, evtCtx) : evt.text;
      const evtGlow = evt.tag === "survival" ? "#ef4444" : evt.tag === "memory" ? "#c084fc" : evt.tag === "bond" ? "#4ade80" : evt.tag === "growth" ? "#fbbf24" : evt.tag === "conflict" ? "#fb923c" : "#ffffff";
      const EVT_BG_BASE = "https://greatgamesgonewild.github.io/ninth-life/events/";
      const evtBgMap = { "The Storm": "storm", "After the Storm": "storm", "The Fire": "feast", "The Fire Remembers": "feast", "The Moonlit Hunt": "feast", "What the Fire Left": "feast", "The First Colony's Fire": "feast", "The Scar's Memory": "scarkeeper", "The Scar Keeper": "scarkeeper", "The Wager": "wager", "The Wanderer's Return": "wanderer", "The Wanderer": "wanderer" };
      const evtBgKey = evtBgMap[evt.title] || (evt.title?.includes("Shrine") || evt.title?.includes("Sacred") || evt.title?.includes("Moon") ? "shrine" : evt.title?.includes("Storm") ? "storm" : evt.title?.includes("Scar") ? "scarkeeper" : evt.title?.includes("Fire") || evt.title?.includes("Feast") ? "feast" : evt.title?.includes("Wager") || evt.title?.includes("Gambl") ? "wager" : evt.title?.includes("Wander") || evt.title?.includes("Stray") ? "wanderer" : null);
      const evtBgUrl = evtBgKey ? EVT_BG_BASE + evtBgKey + ".png" : null;
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), evtBgUrl && /* @__PURE__ */ React.createElement("img", { src: evtBgUrl, alt: "", style: { position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 800, height: "100vh", objectFit: "cover", objectPosition: "center 30%", opacity: 0.12, pointerEvents: "none", zIndex: 0, maskImage: "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.5) 0%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.5) 0%, transparent 70%)" }, onError: (e) => { e.target.style.display = "none"; } }), /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: "12%", left: "50%", transform: "translateX(-50%)", width: 350, height: 350, borderRadius: "50%", background: `radial-gradient(circle,${evtGlow}06,transparent 70%)`, pointerEvents: "none", zIndex: 0 } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 0, padding: 20, maxWidth: 480 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff55", letterSpacing: 8, marginBottom: 16, animation: "fadeIn 1.2s ease-out", textTransform: "uppercase" } }, isDailyRun ? "\u2600\uFE0F DAILY \xB7 " : "", "Night ", ante, " ", "\xB7", " ", ["Dusk", "Midnight", "After the Boss"][blind]), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 64, marginBottom: 8, animation: "fadeIn .6s ease-out", filter: `drop-shadow(0 0 40px ${evtGlow}22)` } }, evt.icon), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 20, color: "#e8e6e3", letterSpacing: 6, margin: "0 0 6px 0", fontWeight: 600, animation: "fadeIn .8s ease-out" } }, evt.title), evt.tag && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: evtGlow + "66", letterSpacing: 4, padding: "3px 12px", borderRadius: 12, border: `1px solid ${evtGlow}15`, marginBottom: 16, animation: "fadeIn 1s ease-out", textTransform: "uppercase" } }, evt.tag), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, color: "#c8c2bbdd", textAlign: "center", lineHeight: 2.1, maxWidth: 360, fontStyle: "italic", animation: "fadeIn 1.2s ease-out", marginBottom: 16, padding: "0 8px" } }, evtText), meta && meta.cats.length > 0 && tgts.length > 0 && (() => {
        const tgtBreeds = new Set(tgts.map((t) => t.breed));
        const match = meta.cats.find((c) => tgtBreeds.has(c.breed));
        if (!match || Math.random() > 0.25) return null;
        const fn = match.name?.split(" ")[0] || "Someone";
        const templates = match.scarred ? [`${fn} carried a scar like this. From a colony that fell before yours.`, `The Hearth remembers ${fn}. Same season. Same wariness.`] : match.bonded ? [`${fn} would have known what to do here. They always did.`, `Something about this reminds you of ${fn}. The way the light falls.`] : [`${fn}'s shadow falls across this moment. They survived something like this.`, `The Hearth flickers. ${fn} is watching.`];
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#c084fc88", fontStyle: "italic", textAlign: "center", maxWidth: 300, lineHeight: 1.5, animation: "fadeIn 2s ease-out", marginBottom: 8 } }, cpk(flavorCache, "bossHearth", templates));
      })(), tgts.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 14, justifyContent: "center", marginBottom: 20, animation: "fadeIn 1s ease-out 0.3s both" } }, tgts.map((t, i) => /* @__PURE__ */ React.createElement("div", { key: t.id, style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement(CC, { cat: t }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: BREEDS[t.breed]?.color || "#888", letterSpacing: 1, fontWeight: 700 } }, t.name.split(" ")[0]), t.trait && t.trait.name !== "Plain" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff55" } }, t.trait.icon, " ", t.trait.name)))), /* @__PURE__ */ React.createElement("div", { style: { width: 60, height: 1, background: `linear-gradient(90deg,transparent,${evtGlow}22,transparent)`, marginBottom: 16 } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: vw < 500 ? vw - 32 : 380 } }, evt.choices.map((ch, i) => {
        const canAfford = !ch.fx.gold || ch.fx.gold >= 0 || gold >= Math.abs(ch.fx.gold);
        const label = ch.labelFn ? ch.labelFn(tgts) : ch.label;
        const hint = (() => {
          const fx = ch.fx;
          const hints = [];
          if (fx.gold && fx.gold < 0) hints.push({ t: `-${Math.abs(fx.gold)}\u{1F41F}`, c: "#fbbf24", ic: "\u{1F41F}" });
          if (fx.gold && fx.gold > 0) hints.push({ t: `+${fx.gold}\u{1F41F}`, c: "#4ade80", ic: "\u{1F41F}" });
          if (fx.heal) hints.push({ t: "Heal 1", c: "#4ade80", ic: "\u{1FA79}" });
          if (fx.healAll) hints.push({ t: "Heal all", c: "#4ade80", ic: "\u{1FA79}" });
          if (fx.injure) hints.push({ t: "Injure", c: "#ef4444", ic: "\u26A0" });
          if (fx.scar || fx.scarTarget) hints.push({ t: "Scar", c: "#fb923c", ic: "\u2694" });
          if (fx.lose) hints.push({ t: "Lose cat", c: "#ef4444", ic: "\u{1F480}" });
          if (fx.trait || fx.addNamedTrait || fx.specificTrait) hints.push({ t: "+Trait", c: "#c084fc", ic: "\u2726" });
          if (fx.rareTrait) hints.push({ t: "+Rare trait", c: "#38bdf8", ic: "\u2B50" });
          if (fx.addWard) hints.push({ t: "+Ward", c: "#c084fc", ic: "\u{1F6E1}\uFE0F" });
          if (fx.denSafe || fx.shelter) hints.push({ t: "Safe den", c: "#4ade80", ic: "\u{1F54A}\uFE0F" });
          if (fx.power && fx.power > 0) hints.push({ t: `+${fx.power}P`, c: "#3b82f6", ic: "\u26A1" });
          if (fx.nerve && fx.nerve > 0) hints.push({ t: "+Nerve", c: "#fb923c", ic: "\u{1F525}" });
          if (fx.nerve && fx.nerve < 0) hints.push({ t: "-Nerve", c: "#ef4444", ic: "\u{1F525}" });
          if (!hints.length && fx.bond) hints.push({ t: "Bond", c: "#f472b6", ic: "\u{1F495}" });
          return hints.length > 0 ? hints[0] : null;
        })();
        return /* @__PURE__ */ React.createElement("button", { key: i, onClick: () => canAfford && chooseEvent(i), style: {
          padding: "16px 22px",
          borderRadius: 14,
          background: canAfford ? "linear-gradient(145deg,#ffffff08,#ffffff03)" : "#0a0a0a",
          border: `1.5px solid ${canAfford ? "#ffffff1a" : "#ffffff06"}`,
          cursor: canAfford ? "pointer" : "not-allowed",
          transition: "all .15s",
          opacity: canAfford ? 1 : 0.25,
          textAlign: "left",
          animation: `fadeIn .5s ease-out ${1 + i * 0.2}s both`,
          boxShadow: canAfford ? "0 4px 20px #00000044" : "none"
        } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15, color: canAfford ? "#e8e6e3" : "#555", fontWeight: 500, letterSpacing: 1, lineHeight: 1.4 } }, label), hint && canAfford && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: hint.c, letterSpacing: 1, flexShrink: 0, padding: "3px 8px", borderRadius: 6, background: hint.c + "11", border: `1px solid ${hint.c}22`, display: "flex", alignItems: "center", gap: 3 } }, hint.ic, " ", hint.t)), !canAfford && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ef4444bb", display: "block", marginTop: 4 } }, "Need ", Math.abs(ch.fx.gold || 0), "\u{1F41F}"));
      }), hasRelic(1) && /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setFerv((f) => Math.min(NERVE_MAX, f + 1));
        setEventOutcome({ title: evt.title, icon: evt.icon, choice: "Stoke the First Flame", desc: [{ text: "The first light anyone carried out of the dark. +1 Nerve.", color: "#fbbf24", icon: "\u{1F56F}\uFE0F" }], targets: [] });
        setPh("eventResult");
      }, style: {
        padding: "16px 22px",
        borderRadius: 14,
        background: "linear-gradient(145deg,#fbbf2408,#fbbf2402)",
        border: "1.5px solid #fbbf2420",
        cursor: "pointer",
        animation: `fadeIn .5s ease-out ${1 + evt.choices.length * 0.2}s both`
      } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15, color: "#fbbf24", fontWeight: 500, letterSpacing: 1 } }, "\u{1F56F}\uFE0F", " Stoke the First Flame"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, marginTop: 16, animation: "fadeIn 1.5s ease-out 0.8s both", alignItems: "center" } }, (() => {
        const allCount = [...hand, ...draw, ...disc].length;
        const scarCount = allC2.filter((c) => c.scarred).length;
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, allCount, " cats"), scarCount > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#fb923c77" } }, scarCount, " hardened"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#fbbf24", fontWeight: 700 } }, gold, "\u{1F41F}"));
      })())));
    }
    if (ph === "eventResult" && eventOutcome) {
      const eo = eventOutcome;
      const advanceEvent = () => {
        const wasScavenge = eventOutcome?.title === "Scavenge";
        const wasCamp = eventOutcome?.title === "Camp";
        setEventOutcome(null);
        if (wasScavenge && blind <= 1) {
          fireEvent();
        } else if (wasCamp && blind <= 1) {
          fireEvent();
        } else {
          nextBlind();
        }
      };
      const resGlow = eo.desc.length > 0 ? eo.desc[0].color || "#ffffff" : "#ffffff";
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: 350, height: 350, borderRadius: "50%", background: `radial-gradient(circle,${resGlow}08,transparent 60%)`, pointerEvents: "none", zIndex: 0 } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 0, padding: 20, maxWidth: 480 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 56, animation: "fadeIn .4s ease-out", filter: `drop-shadow(0 0 40px ${resGlow}22)`, marginBottom: 8 } }, eo.icon), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 20, color: "#e8e6e3cc", letterSpacing: 5, margin: "0 0 6px", fontWeight: 500, animation: "fadeIn .6s ease-out" } }, eo.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#ffffff66", fontStyle: "italic", letterSpacing: 2, animation: "fadeIn .8s ease-out", padding: "8px 20px", borderRadius: 12, background: "linear-gradient(145deg,#ffffff05,#ffffff02)", border: "1px solid #ffffff0a", marginBottom: 16 } }, '"', eo.choice, '"'), eo.targets && eo.targets.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 14, justifyContent: "center", marginBottom: 16, animation: "fadeIn .6s ease-out 0.2s both" } }, eo.targets.map((t, i) => {
        const updated = [...hand, ...draw, ...disc].find((c) => c.id === t.id) || t;
        return /* @__PURE__ */ React.createElement("div", { key: t.id, style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement(CC, { cat: updated }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: BREEDS[updated.breed]?.color || "#888", fontWeight: 700 } }, updated.name.split(" ")[0]));
      })), /* @__PURE__ */ React.createElement("div", { style: { width: 80, height: 1, background: `linear-gradient(90deg,transparent,${resGlow}22,transparent)`, marginBottom: 14 } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: vw < 500 ? vw - 32 : 380 } }, eo.desc.map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "14px 18px",
        borderRadius: 14,
        background: `linear-gradient(145deg,${d.color}0a,${d.color}03)`,
        border: `1.5px solid ${d.color}22`,
        boxShadow: `0 4px 20px ${d.color}11`,
        animation: `fadeIn .6s ease-out ${0.4 + i * 0.25}s both`
      } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 26, flexShrink: 0, filter: `drop-shadow(0 0 10px ${d.color}44)` } }, d.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, color: d.color, fontWeight: 600, lineHeight: 1.6 } }, d.text)))), /* @__PURE__ */ React.createElement("button", { onClick: advanceEvent, style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), marginTop: 20, padding: "12px 40px", fontSize: 14, letterSpacing: 2, animation: `fadeIn .5s ease-out ${0.4 + eo.desc.length * 0.25 + 0.3}s both`, boxShadow: "0 0 24px #fbbf2422" } }, "Continue ", "\u2192")));
    }
    if (ph === "overflow" && oData) {
      const o = oData;
      const pctClear = o.tgt > 0 ? Math.round(o.fs / o.tgt * 100) : 100;
      const isQuickClear = blind < 2 && !clutch;
      const clearLine = blind >= 2 ? null : isQuickClear ? null : getThresholdClear(ante, blind, clutch, pctClear);
      return /* @__PURE__ */ React.createElement("div", { style: { ...W, animation: clutch ? "flash .6s ease-out" : "none" } }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), clutch && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 50, background: "radial-gradient(circle,#fbbf2433,transparent 70%)", pointerEvents: "none", animation: "flash 1.5s ease-out" } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: isQuickClear ? 6 : 10, padding: 20 } }, !isQuickClear && clutch && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 900, color: "#fbbf24", letterSpacing: 8, textShadow: "0 0 30px #fbbf24cc", animation: "clutchBurst .8s ease-out", marginBottom: 4 } }, "CLUTCH"), !isQuickClear && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: blind >= 2 ? "#4ade80" : "#fbbf24", letterSpacing: 3 } }, blind >= 2 ? clutch ? "Survived. Barely." : "Survived." : "Cleared."), isFirstRun && ante === 1 && blind === 0 && !seen.shop && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24aa", textAlign: "center", maxWidth: 300, lineHeight: 1.6, animation: "fadeIn 1s ease-out" } }, "Round 1 of 3 done. Midnight next, then the Boss.", /* @__PURE__ */ React.createElement("br", null), "\u{1F41F} = rations. Spend them to get stronger."), clearLine && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#ffffffbb", fontStyle: "italic", textAlign: "center", maxWidth: 320, lineHeight: 1.6, animation: "fadeIn 1.2s ease-out", textShadow: "0 0 15px #ffffff11" } }, clearLine), blind >= 2 && boss && (() => {
        const scarredCats2 = allC.filter((c) => c.scarred);
        const bondedCats2 = allC.filter((c) => c.bondedTo);
        const strongest2 = [...allC].sort((a, b) => b.power - a.power)[0];
        const dCtx = {
          fallen: fallen.length,
          fallenName: fallen.length > 0 ? fallen[fallen.length - 1].name.split(" ")[0] : "",
          scarred: scarredCats2.length,
          bonded: bondedCats2.length,
          colony: allC.length,
          clutch,
          grudges: allC.reduce((s, c) => (c.grudgedWith || []).length + s, 0) / 2,
          deathless: fallen.length === 0,
          strongestName: strongest2?.name.split(" ")[0] || "",
          bondedName: bondedCats2[0]?.name.split(" ")[0] || ""
        };
        const dLine = boss.defeatFn ? boss.defeatFn(dCtx) : null;
        return /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "10px 16px", borderRadius: 10, background: "#4ade8008", border: "1px solid #4ade8022", maxWidth: 360, animation: "fadeIn 1.5s ease-out", position: "relative", overflow: "visible" } }, Array.from({ length: 24 }).map((_, i) => {
          const angle = i * (360 / 24);
          const dist = 60 + Math.random() * 80;
          const px = Math.cos(angle * Math.PI / 180) * dist;
          const py = Math.sin(angle * Math.PI / 180) * dist;
          const colors = ["#4ade80", "#fbbf24", "#67e8f9", "#c084fc"];
          return /* @__PURE__ */ React.createElement("div", { key: i, style: { position: "absolute", top: "50%", left: "50%", width: 4 + Math.random() * 3, height: 4 + Math.random() * 3, borderRadius: "50%", background: colors[i % 4], opacity: 0, pointerEvents: "none", "--px": px + "px", "--py": py + "px", animation: `burstParticle ${0.6 + Math.random() * 0.4}s ease-out ${i * 0.02}s forwards` } });
        }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#4ade80", fontWeight: 700, letterSpacing: 2, marginBottom: 4 } }, boss.name, " falls."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#4ade80cc", fontStyle: "italic", lineHeight: 1.6 } }, '"', boss.defeat, '"'), dLine && dLine !== boss.defeat && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#4ade80aa", fontStyle: "italic", marginTop: 4, lineHeight: 1.5 } }, '"', dLine, '"'));
      })(), blind === 1 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#ef4444", fontWeight: 700, letterSpacing: 3, animation: "fpp 1s ease infinite" } }, "Something approaches..."), ante >= 4 && blind < 2 && (clutch || o.fs < o.tgt * 1.3) && boss && (() => {
        const sc3 = allC.filter((c) => c.scarred);
        const bc3 = allC.filter((c) => c.bondedTo);
        const st3 = [...allC].sort((a, b) => b.power - a.power)[0];
        const bCtx = {
          fallen: fallen.length,
          fallenName: fallen.length > 0 ? fallen[fallen.length - 1].name.split(" ")[0] : "",
          scarred: sc3.length,
          bonded: bc3.length,
          colony: allC.length,
          clutch,
          grudges: allC.reduce((s, c) => (c.grudgedWith || []).length + s, 0) / 2,
          deathless: fallen.length === 0,
          gold,
          scarredName: sc3[0]?.name.split(" ")[0] || "",
          bondedName: bc3[0]?.name.split(" ")[0] || "",
          strongestName: st3?.name.split(" ")[0] || "",
          weakestName: [...allC].sort((a, b) => a.power - b.power)[0]?.name.split(" ")[0] || ""
        };
        const earlyTaunt = boss.tauntFn ? boss.tauntFn(bCtx) : null;
        return earlyTaunt ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", animation: "fadeIn 1.5s ease-out", padding: "6px 14px", borderRadius: 8, background: "#ef444408", border: "1px solid #ef444418", maxWidth: 340 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, boss.icon), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444bb", fontStyle: "italic", lineHeight: 1.5 } }, '"', earlyTaunt, '"'), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444499", marginTop: 2 } }, boss.name, " watches.")) : null;
      })(), (() => {
        const scoreSize = pctClear >= 300 ? 52 : pctClear >= 200 ? 44 : pctClear >= 150 ? 40 : 36;
        const tgtSize = pctClear >= 300 ? 16 : pctClear >= 200 ? 14 : 13;
        const scoreColor = pctClear >= 300 ? "#c084fc" : pctClear >= 200 ? "#fef08a" : pctClear >= 150 ? "#4ade80" : "#fbbf24";
        const glowSize = pctClear >= 300 ? 60 : pctClear >= 200 ? 40 : 30;
        const shakeAnim = pctClear >= 300 ? "bigShake .6s ease-out" : pctClear >= 200 ? "comboBurst .5s ease-out" : "";
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: scoreSize, fontWeight: 900, color: scoreColor, textShadow: `0 0 ${glowSize}px ${scoreColor}44`, animation: shakeAnim || "fadeIn .6s ease-out", letterSpacing: pctClear >= 200 ? 3 : 1 } }, o.fs.toLocaleString()), /* @__PURE__ */ React.createElement("div", { style: { fontSize: tgtSize, color: pctClear >= 200 ? "#888" : "#666" } }, "Target: ", o.tgt.toLocaleString()));
      })(), !isQuickClear && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5, background: "#ffffff06", borderRadius: 12, padding: "14px 22px", border: "1px solid #ffffff0a", minWidth: Math.min(260, vw - 40) } }, /* @__PURE__ */ React.createElement("div", { onClick: () => toast("\u{1F4CA}", "The higher you score above the target, the more rations you earn. Survived: 2\u{1F41F}, Comfortable: 3\u{1F41F}, Crushing: 4\u{1F41F}, Dominating: 5-6\u{1F41F}, Legendary: 6\u{1F41F}. Boss rounds give +2\u{1F41F} extra.", "#fbbf24", 7e3), style: { display: "flex", justifyContent: "space-between", fontSize: 11, cursor: "help" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#888" } }, "Performance"), /* @__PURE__ */ React.createElement("span", { style: { color: pctClear >= 300 ? "#c084fc" : pctClear >= 200 ? "#fbbf24" : pctClear >= 150 ? "#4ade80" : "#888", fontWeight: 700 } }, pctClear >= 300 ? "Legendary" : pctClear >= 200 ? "Dominating" : pctClear >= 150 ? "Crushing" : pctClear >= 120 ? "Comfortable" : "Survived", " (", pctClear, "%)")), o.uh > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#888" } }, o.uh, " Unused Hand", o.uh > 1 ? "s" : ""), /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6" } }, "saved")), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid #ffffff0a", paddingTop: 4, display: "flex", justifyContent: "space-between", fontSize: 11 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#888" } }, "Rations Earned"), /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24", fontWeight: 700 } }, "+", o.gR, " \u{1F41F}")), o.interest > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80" } }, "Stores (interest)"), /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80", fontWeight: 700 } }, "+", o.interest, " \u{1F41F}")), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid #ffffff12", paddingTop: 4, display: "flex", justifyContent: "space-between", fontSize: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#e8e6e3", fontWeight: 700 } }, "Balance"), /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24", fontWeight: 900, fontSize: 14 } }, gold, " \u{1F41F}"))), (() => {
        const overflowLines = [
          "The colony eats. Not well, but enough.",
          "Rations counted. Names remembered. Another round survived.",
          "The dark doesn't care about your budget. But you have to.",
          "Food is a number. Hunger is a feeling. Both matter.",
          "They divide it evenly. Nobody asks for more. Not tonight.",
          "Every ration is borrowed time. Spend it wisely.",
          "The pantry's lighter than yesterday. The colony's heavier.",
          "Interest compounds. So does hope.",
          "You count rations. The dark counts nights. Different math, same question.",
          "Enough for one more round. That's always the answer."
        ];
        const seed = (ante * 7 + blind * 3 + gold) % 10;
        const whisperPool = blind >= 2 ? WHISPER_OVERFLOW.boss : pctClear >= 200 ? WHISPER_OVERFLOW.crush : pctClear < 130 ? WHISPER_OVERFLOW.scrape : null;
        const moodLine = getMoodWhisper(mood, allC.length);
        const line = moodLine ? moodLine : seed < 3 && whisperPool ? whisperPool[seed % whisperPool.length] : overflowLines[((ante - 1) * 3 + blind) % overflowLines.length];
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: moodLine ? "#ffffff55" : seed < 3 && whisperPool ? "#fbbf2444" : "#ffffff44", fontStyle: "italic", textAlign: "center", maxWidth: 280, lineHeight: 1.5, marginTop: 8, animation: "fadeIn 1.5s ease-out" } }, line);
      })(), blind >= 2 ? (() => {
        if (bossRewardChoices.length === 0) {
          const picks = pickBossRewards(ante, prevRewardIdsRef.current);
          setBossRewardChoices(picks);
          prevRewardIdsRef.current = [...prevRewardIdsRef.current, ...picks.map((r) => r.id)].slice(-6);
        }
        const choices = bossRewardChoices.length > 0 ? bossRewardChoices : pickBossRewards(ante, []);
        function claimReward(rw) {
          if (actionLock.current) return;
          actionLock.current = true;
          requestAnimationFrame(() => { actionLock.current = false; });
          const all = [...hand, ...draw, ...disc];
          if (rw.type === "gold") setGold((g) => g + rw.value);
          if (rw.type === "gold_nerve") {
            setGold((g) => g + rw.value);
            setFerv((f) => Math.min(NERVE_MAX, f + 1));
          }
          if (rw.type === "gold_sacrifice") {
            setGold((g) => g + rw.value);
            const w = [...all].sort((a, b) => a.power - b.power)[0];
            if (w && all.length > MIN_DECK) {
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.filter((x) => x.id !== w.id));
              });
              setFallen((f) => [...f, { name: w.name, breed: w.breed, night: ante }]);
            }
          }
          if (rw.type === "hands") setRunBonus((b) => ({ ...b, hands: b.hands + rw.value }));
          if (rw.type === "freeRecruits") setTempMods((m) => ({ ...m, freeRecruits: (m.freeRecruits || 0) + rw.value }));
          if (rw.type === "temp_both") setTempMods((m) => ({ ...m, hands: m.hands + 1, freeRecruits: (m.freeRecruits || 0) + 2 }));
          if (rw.type === "power") {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => ({ ...x, power: Math.min(15, x.power + rw.value) })));
            });
          }
          if (rw.type === "elite_power") {
            const best = [...all].sort((a, b) => b.power - a.power)[0];
            const worst = [...all].sort((a, b) => a.power - b.power)[0];
            if (best) {
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => {
                  if (x.id === best.id) return { ...x, power: Math.min(15, x.power + 3) };
                  if (worst && x.id === worst.id) return { ...x, power: Math.max(1, x.power - 1) };
                  return x;
                }));
              });
            }
            ;
          }
          if (rw.type === "surge") {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => ({ ...x, power: Math.min(15, x.power + 2) })));
            });
          }
          if (rw.type === "trait") {
            const best = [...all].sort((a, b) => b.power - a.power)[0];
            if (best) {
              const rt = pk(RARE_TRAITS);
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => {
                  if (x.id === best.id) {
                    addTrait(x, rt);
                    return { ...x };
                  }
                  return x;
                }));
              });
            }
            ;
          }
          if (rw.type === "mass_trait") {
            const plains = all.filter((c) => catIsPlain(c)).slice(0, 3);
            plains.forEach((c) => {
              const t = pk(COMMON_TRAITS);
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => {
                  if (x.id === c.id) {
                    addTrait(x, t);
                    return { ...x };
                  }
                  return x;
                }));
              });
            });
          }
          if (rw.type === "power_all") {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => ({ ...x, power: Math.min(15, x.power + 1) })));
            });
            toast("\u2605", "Battle-forged. All cats +1 Power.", "#fbbf24");
          }
          if (rw.type === "thin") {
            const maxRemove = Math.max(0, all.length - MIN_DECK);
            const sorted = [...draw].sort((a, b) => a.power - b.power).slice(0, Math.min(rw.value, maxRemove));
            setDraw((d) => d.filter((x) => !sorted.find((r) => r.id === x.id)));
          }
          if (rw.type === "recruit") {
            for (let i = 0; i < 2; i++) {
              const nc = gC({ trait: pk(COMMON_TRAITS), power: 3 + Math.floor(Math.random() * 4) });
              setDraw((d) => [...d, nc]);
            }
          }
          if (rw.type === "shelter") setEventDenBonus((b) => b + 1);
          if (rw.type === "nerve") setFerv((f) => Math.min(NERVE_MAX, f + rw.value));
          if (rw.type === "nerve_surge") {
            setFerv((f) => Math.min(NERVE_MAX, f + 4));
            toast("\u{1F6E1}\uFE0F", "+4 Nerve! Unbreakable.", "#c084fc");
          }
          if (rw.type === "ward") {
            const avail = FAMS.filter((w) => !fams.find((f) => f.id === w.id));
            if (avail.length > 0 && fams.length < MF) {
              setFams((fs) => [...fs, pk(avail)]);
            } else {
              setGold((g) => g + 5);
            }
          }
          if (rw.type === "heal_safe") {
            [setHand, setDraw, setDisc].forEach((s) => {
              s((arr) => arr.map((x) => ({ ...x, injured: false, injuryTimer: 0 })));
            });
            setEventDenSafe(true);
          }
          if (rw.type === "gamble") {
            if (Math.random() < 0.55) setGold((g) => g + 10);
            else setGold((g) => Math.floor(g / 2));
          }
          if (rw.type === "blood_price") {
            const best = [...all].sort((a, b) => b.power - a.power)[0];
            if (best) {
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => {
                  if (x.id === best.id) return { ...x, scarred: true };
                  return { ...x, power: Math.min(15, x.power + 2) };
                }));
              });
            }
            ;
          }
          logEvent("reward", { name: rw.name, desc: rw.desc });
          setBossRewardChoices([]);
          setOData(null);
          genShop();
          setPh("shop");
          if (boss) {
            const dCtx3 = { fallen: fallen.length, fallenName: fallen.length > 0 ? fallen[fallen.length - 1].name.split(" ")[0] : "", clutch, deathless: fallen.length === 0, strongestName: [...allC].sort((a, b) => b.power - a.power)[0]?.name.split(" ")[0] || "" };
            const dLine3 = boss.defeatFn ? boss.defeatFn(dCtx3) : boss.defeat;
            setTimeout(() => toast(boss.icon, `${boss.name}: "${dLine3 || boss.defeat}"`, BREEDS[allC[0]?.breed]?.color || "#4ade80", 4e3), 300);
            const epCats = [...hand, ...draw, ...disc].filter((c) => c.epithet && c._bossEpithet);
            epCats.forEach((c, i) => {
              setTimeout(() => {
                toast("\u{1F3F7}\uFE0F", epithetToastMsg(c), BREEDS[c.breed]?.color || "#fbbf24", 3e3);
                Audio.epithetEarned();
              }, 900 + i * 600);
            });
          }
        }
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade80bb", letterSpacing: 2 } }, "CHOOSE YOUR REWARD"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" } }, choices.map((rw, i) => /* @__PURE__ */ React.createElement(
          "button",
          {
            key: rw.id || i,
            onClick: () => claimReward(rw),
            style: {
              padding: "12px 14px",
              borderRadius: 10,
              background: "linear-gradient(145deg,#1b2e1b,#0d0d1a)",
              border: "1px solid #4ade8044",
              textAlign: "center",
              cursor: "pointer",
              minWidth: 110,
              maxWidth: 130,
              transition: "all .15s"
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.border = "1px solid #4ade80aa";
              e.currentTarget.style.transform = "scale(1.05)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.border = "1px solid #4ade8044";
              e.currentTarget.style.transform = "scale(1)";
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22 } }, rw.icon),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "#4ade80", letterSpacing: 0.5, marginTop: 4, lineHeight: 1.3 } }, rw.name),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", marginTop: 3, lineHeight: 1.3 } }, rw.desc)
        ))));
      })() : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", justifyContent: "center" } }, (() => {
        const firstEverRun = !meta || meta.stats.r === 0;
        const forceMarket = firstEverRun && ante === 1 && blind === 0 && !seen.shop;
        const forceScavenge = firstEverRun && ante === 1 && blind === 1 && !seen.scavenge;
        const forceCamp = firstEverRun && ante === 2 && blind === 1 && !seen.camp;
        const showMarket = !firstEverRun || forceMarket || !forceScavenge && !forceCamp;
        const showScavenge = !firstEverRun || forceScavenge || !forceCamp && seen.scavenge;
        const showCamp = !firstEverRun || forceCamp || seen.camp;
        return /* @__PURE__ */ React.createElement(React.Fragment, null, showMarket && /* @__PURE__ */ React.createElement("button", { onClick: () => {
          setOData(null);
          setSkipShop(false);
          genShop();
          setPh("shop");
          Audio.shopAmbient();
        }, style: {
          ...BTN(forceMarket ? "linear-gradient(135deg,#4ade80,#22d3ee)" : "linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"),
          padding: forceMarket ? "12px 28px" : "10px 20px",
          fontSize: forceMarket ? 15 : 12,
          animation: forceMarket ? "breathe 2s ease-in-out infinite" : "none",
          boxShadow: forceMarket ? "0 0 20px #4ade8066" : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          minWidth: 100
        } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16 } }, "\u{1F3EA}"), /* @__PURE__ */ React.createElement("span", null, forceMarket ? "Enter the Market \u2726" : "Market"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 400, opacity: 0.6 } }, "buy wards, cats, scrolls")), showScavenge && /* @__PURE__ */ React.createElement("button", { onClick: () => {
          setSeen((s) => ({ ...s, scavenge: true }));
          const baseG = 3 + ante;
          const results = [];
          let bonusG = 0;
          results.push({ text: `The colony scavenges. +${baseG}\u{1F41F} rations found.`, color: "#fbbf24", icon: "\u{1F41F}" });
          setMood((m) => Math.max(0, m - 2));
          if (Math.random() < 0.25) {
            const r = Math.random();
            if (r < 0.35) {
              bonusG = 2 + Math.floor(Math.random() * 3);
              results.push({ text: `Dug through the ruins. +${bonusG}\u{1F41F} extra.`, color: "#fbbf24", icon: "\u{1FA99}" });
            } else if (r < 0.65) {
              const scavCats = [...hand, ...draw, ...disc];
              const scavSCts = {};
              scavCats.forEach((c2) => {
                scavSCts[c2.breed] = (scavSCts[c2.breed] || 0) + 1;
              });
              const domS = Object.entries(scavSCts).sort((a, b) => b[1] - a[1])[0];
              const biasBreed = domS && domS[1] >= 5 && Math.random() < 0.6 ? domS[0] : null;
              const nc = gC({ trait: PLAIN, power: 3 + Math.floor(Math.random() * 3), ...biasBreed ? { breed: biasBreed } : {} });
              nc.power = Math.min(6, nc.power);
              setDraw((d) => [...d, nc]);
              results.push({ text: `A stray named ${nc.name.split(" ")[0]} followed them back. (${BREEDS[nc.breed]?.icon} P${nc.power})`, color: "#4ade80", icon: "\u{1F431}" });
            } else {
              const injured = [...hand, ...draw, ...disc].filter((c) => c.injured);
              if (injured.length > 0) {
                const h = pk(injured);
                [setHand, setDraw, setDisc].forEach((s) => {
                  s((arr) => arr.map((c) => c.id === h.id ? { ...c, injured: false, injuryTimer: 0 } : c));
                });
                results.push({ text: `Found wild herbs. ${h.name.split(" ")[0]} healed.`, color: "#4ade80", icon: "\u{1F33F}" });
              } else {
                bonusG = 2;
                results.push({ text: `Nothing special in the ruins. +2\u{1F41F}.`, color: "#888", icon: "\u{1FAA8}" });
              }
            }
          } else {
            const flavors = [
              "The dark left nothing behind. But the rations are enough.",
              "Slim pickings. The colony eats, at least.",
              "They came back quiet. No finds. But no losses either.",
              "The ruins had nothing left to give. The colony carries on."
            ];
            results.push({ text: pk(flavors), color: "#ffffff55", icon: "\u{1F319}" });
          }
          setGold((g) => g + baseG + bonusG);
          setOData(null);
          setEventOutcome({ title: "Scavenge", icon: "\u{1F33F}", choice: "The colony spread out to search.", desc: results, targets: [] });
          setPh("eventResult");
        }, style: {
          ...BTN("#1a2e1a", "#4ade80"),
          padding: forceScavenge ? "12px 28px" : "10px 20px",
          fontSize: forceScavenge ? 15 : 12,
          border: "1px solid #4ade8044",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          minWidth: 100,
          animation: forceScavenge ? "breathe 2s ease-in-out infinite" : "none",
          boxShadow: forceScavenge ? "0 0 20px #4ade8066" : "none"
        } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16 } }, "\u{1F33F}"), /* @__PURE__ */ React.createElement("span", null, forceScavenge ? "Scavenge \u2726" : "Scavenge"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 400, opacity: 0.6 } }, "+", 3 + ante, "\u{1F41F}, maybe more")), showCamp && /* @__PURE__ */ React.createElement("button", { onClick: () => {
          setSeen((s) => ({ ...s, camp: true }));
          if (!forceCamp && gold < 3) {
            toast("\u{1F41F}", "Not enough Rations to camp (need 3\u{1F41F}).", "#ef4444");
            return;
          }
          setCampMode(true);
          setDen([]);
          setOData(null);
          setPh("denSelect");
        }, style: {
          ...BTN("#1a1a2e", forceCamp ? "#c084fc" : gold >= 3 ? "#c084fc" : "#555"),
          padding: forceCamp ? "12px 28px" : "10px 20px",
          fontSize: forceCamp ? 15 : 12,
          border: `1px solid ${gold >= 3 ? "#c084fc44" : "#33333366"}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          minWidth: 100,
          opacity: gold >= 3 ? 1 : 0.5,
          cursor: gold >= 3 ? "pointer" : "not-allowed",
          animation: forceCamp ? "breathe 2s ease-in-out infinite" : "none",
          boxShadow: forceCamp ? "0 0 20px #c084fc44" : "none"
        } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16 } }, "\u{1F3D5}"), /* @__PURE__ */ React.createElement("span", null, forceCamp ? "Make Camp \u2726" : "Camp"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 400, opacity: 0.6 } }, gold >= 3 ? "3\u{1F41F}, rest + bonds" : "Need 3\u{1F41F}")), firstEverRun && ante === 1 && blind === 1 && !seen.scavenge && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4ade80aa", textAlign: "center", maxWidth: 300, lineHeight: 1.5, marginTop: 6, animation: "fadeIn .6s ease-out" } }, "Scavenging finds rations without spending any. The colony spreads out and searches."), firstEverRun && ante === 2 && blind === 1 && !seen.camp && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#c084fcaa", textAlign: "center", maxWidth: 300, lineHeight: 1.5, marginTop: 6, animation: "fadeIn .6s ease-out" } }, "Camp costs 3\u{1F41F} but heals injuries, builds Nerve, and lets two cats bond by the fire."));
      })()))));
    }
    if (ph === "defeat" && defeatData) {
      const defMvp = [...allC].sort((a, b) => (b.stats?.bs || 0) - (a.stats?.bs || 0))[0];
      const defMvpN = defMvp?.name.split(" ")[0] || "Someone";
      const deficit = Math.max(0, defeatData.target - defeatData.score);
      const defBonds = allC.filter((c) => c.bondedTo);
      const defEpithets = allC.filter((c) => c.epithet);
      const handsPlayed = runLog.filter((e) => e.type === "hand").length;
      const bestHandScore = runLog.filter((e) => e.type === "hand").reduce((b, e) => Math.max(b, e.data?.score || 0), 0);
      const pctStr = defeatData.target > 0 ? Math.round(defeatData.score / defeatData.target * 100) + "%" : "";
      const defSentence = deficit > 0 && deficit < defeatData.target * 0.1 ? `${defMvpN}'s best hand: ${(defMvp?.stats?.bs || 0).toLocaleString()}. The colony needed ${deficit.toLocaleString()} more. That close.` : fallen.length > 0 && defBonds.length > 0 ? `${fallen.map((f) => f.name.split(" ")[0]).join(", ")} fell. ${defBonds[0].name.split(" ")[0]} bonded with someone who won't see dawn.` : defEpithets.length > 0 ? `${defEpithets[0].name.split(" ")[0]} ${defEpithets[0].epithet} survived. The title outlived the colony.` : defMvp && (defMvp.stats?.tp || 0) > 5 ? `${defMvpN} played ${defMvp.stats.tp} hands. Best: ${(defMvp.stats?.bs || 0).toLocaleString()}. It wasn't enough.` : fallen.length > 0 ? `${fallen[0].name.split(" ")[0]} went first. The rest followed the silence.` : `${allC.length} cats. ${defeatData.score.toLocaleString()} scored. Not enough.`;
      const nightGrid2 = (() => {
        const sq = { "Autumn": "\u{1F7EB}", "Winter": "\u{1F7E6}", "Spring": "\u{1F7E9}", "Summer": "\u{1F7E7}" };
        const cts = {};
        allC.forEach((x) => {
          cts[x.breed] = (cts[x.breed] || 0) + 1;
        });
        const dom = Object.entries(cts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Autumn";
        return Array(Math.max(1, ante - 1)).fill(sq[dom] || "\u2B1C").join("") + "\u274C" + (ante < 5 ? "\u2B1B".repeat(5 - ante) : "");
      })();
      const shareText = `\u{1F431} Ninth Life \xB7 Colony #${(meta?.stats?.r || 0) + 1} \xB7 Night ${ante}
${nightGrid2}
Score: ${defeatData.score.toLocaleString()} / ${defeatData.target.toLocaleString()} \xB7 ${pctStr}
MVP: ${defMvp ? defMvp.name : "?"} (${bestHandScore.toLocaleString()} best hand)
${deficit < defeatData.target * 0.1 ? "So close." : "The dark remembers."}
\u2192 https://greatgamesgonewild.github.io/ninth-life/`;
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 12, padding: 20, maxWidth: 500 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24aa", letterSpacing: 4, animation: "fadeIn .8s ease-out" } }, "COLONY #", (meta?.stats?.r || 0) + 1, " \xB7 NIGHT ", ante), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 36, fontWeight: 900, color: "#e8e6e3", letterSpacing: 2, animation: "fadeIn 1s ease-out" } }, defeatData.score.toLocaleString()), defeatData.target > 0 && /* @__PURE__ */ React.createElement("div", { style: { width: Math.min(280, vw - 60), height: 6, background: "#1a1a2e", borderRadius: 3, overflow: "hidden", border: "1px solid #ffffff08", animation: "fadeIn 1.2s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${Math.min(100, defeatData.score / defeatData.target * 100)}%`, borderRadius: 3, background: defeatData.score >= defeatData.target * 0.9 ? "linear-gradient(90deg,#fbbf24,#ef4444)" : "linear-gradient(90deg,#ef4444,#ef444488)", transition: "width 1s ease-out" } })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", animation: "fadeIn 1.2s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "4px 10px", borderRadius: 6, background: "#ffffff04", border: "1px solid #ffffff08", minWidth: 60 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 900, color: "#3b82f6" } }, handsPlayed), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: "#666", letterSpacing: 1 } }, "HANDS")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "4px 10px", borderRadius: 6, background: "#ffffff04", border: "1px solid #ffffff08", minWidth: 60 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 900, color: "#c084fc" } }, bestHandScore.toLocaleString()), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: "#666", letterSpacing: 1 } }, "BEST HAND")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "4px 10px", borderRadius: 6, background: "#ffffff04", border: "1px solid #ffffff08", minWidth: 60 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 900, color: NERVE[rMaxF].color } }, NERVE[rMaxF].name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: "#666", letterSpacing: 1 } }, "NERVE")), fallen.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "4px 10px", borderRadius: 6, background: "#ffffff04", border: "1px solid #ef444422", minWidth: 60 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 900, color: "#ef4444" } }, fallen.length), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: "#666", letterSpacing: 1 } }, "LOST"))), /* @__PURE__ */ React.createElement("div", { style: { width: 40, height: 1, background: "#ef444433", margin: "2px 0" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#ef4444aa", fontStyle: "italic", textAlign: "center", maxWidth: 340, lineHeight: 1.7, animation: "fadeIn 1.8s ease-out" } }, defSentence), deficit > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: deficit < defeatData.target * 0.15 ? "#fbbf2488" : "#ef444466", animation: "fadeIn 2s ease-out" } }, deficit < defeatData.target * 0.15 ? `Only ${deficit.toLocaleString()} short. That's one good hand.` : `${deficit.toLocaleString()} short of ${defeatData.target.toLocaleString()}`), fallen.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", animation: "fadeIn 2.2s ease-out" } }, fallen.map((f, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: { fontSize: 10, color: BREEDS[f.breed]?.color || "#888", opacity: 0.5 } }, f.name.split(" ")[0]))), runLog.length > 2 && /* @__PURE__ */ React.createElement("details", { open: true, style: { animation: "fadeIn 2.5s ease-out", maxWidth: 340, width: "100%" } }, /* @__PURE__ */ React.createElement("summary", { style: { fontSize: 10, color: "#666", cursor: "pointer", textAlign: "center", letterSpacing: 2 } }, "THE CHRONICLE"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3, marginTop: 6, padding: "6px 10px", borderRadius: 8, background: "#ffffff04", border: "1px solid #ffffff08" } }, (() => {
        const moments = [];
        const bestH = runLog.filter((e) => e.type === "hand").reduce((best, e) => (e.data?.score || 0) > (best?.data?.score || 0) ? e : best, null);
        if (bestH) moments.push({ text: `Best: ${bestH.data.cats} ${bestH.data.type} for ${bestH.data.score.toLocaleString()}`, color: "#fbbf24", icon: "\u2726" });
        const firstDeath = runLog.find((e) => e.type === "death");
        if (firstDeath) moments.push({ text: `${firstDeath.data?.name || "Someone"} fell. Night ${firstDeath.ante || "?"}.`, color: "#ef4444", icon: "\u{1F480}" });
        const firstBond = runLog.find((e) => e.type === "bond" || e.type === "breed");
        if (firstBond && firstBond.data) moments.push({ text: `${firstBond.data.c1 || firstBond.data.parent1 || "?"} and ${firstBond.data.c2 || firstBond.data.parent2 || "?"} found each other.`, color: "#f472b6", icon: "\u{1F495}" });
        const firstEpithet = runLog.find((e) => e.type === "epithet");
        if (firstEpithet) moments.push({ text: `${firstEpithet.data?.name || "Someone"} earned a title.`, color: "#fbbf24", icon: "\u{1F3F7}\uFE0F" });
        if (fallen.length > 0) moments.push({ text: `${fallen.length} name${fallen.length > 1 ? "s" : ""} lost before the end.`, color: "#ef4444", icon: "\u{1F56F}\uFE0F" });
        const survivors = allC.filter((c) => c.epithet);
        if (survivors.length > 0) moments.push({ text: survivors.map((c) => c.name).join(", ") + ". Titles that outlived the colony.", color: "#fbbf24", icon: "\u2726" });
        return moments.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 6, alignItems: "center", fontSize: 10, color: m.color, lineHeight: 1.4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, opacity: 0.6, flexShrink: 0 } }, m.icon), /* @__PURE__ */ React.createElement("span", null, m.text)));
      })())), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, animation: "fadeIn 2.5s ease-out", marginTop: 4 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setDefeatData(null);
        setPh("gameOver");
      }, style: { ...BTN("linear-gradient(135deg,#ef4444,#dc2626)", "#fff"), padding: "10px 32px", fontSize: 14 } }, "Continue"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setDefeatData(null);
        startGame();
      }, style: { ...BTN("#1a1a2e", "#fbbf24"), padding: "10px 20px", fontSize: 11, border: "1px solid #fbbf2444" } }, "Retry \u2192")), defeatData.dustEarned > 0 && !defeatData.daily && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, animation: "fadeIn 2.5s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#c084fc", fontWeight: 700 } }, "+", defeatData.dustEarned, "\u2726 stardust from the ashes"), (() => {
        if (!meta) return null;
        const currentDust = (meta.dust || 0) + (defeatData.dustEarned || 0);
        const nextUpg = UPGRADES.find((u) => { const cur = meta.ups?.[u.id] || 0; const tier = u.tier <= 1 || u.tier === 2 && meta.stats.w >= 2 || u.tier === 3 && meta.stats.w >= 4; return tier && cur < u.max && u.cost > currentDust; });
        const affordUpg = UPGRADES.find((u) => { const cur = meta.ups?.[u.id] || 0; const tier = u.tier <= 1 || u.tier === 2 && meta.stats.w >= 2 || u.tier === 3 && meta.stats.w >= 4; return tier && cur < u.max && u.cost <= currentDust; });
        if (affordUpg) return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade80aa" } }, "\u2726 You can afford: ", affordUpg.name);
        if (nextUpg) return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc66" } }, nextUpg.cost - currentDust, "\u2726 until ", nextUpg.name);
        return null;
      })()), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        try {
          navigator.clipboard?.writeText(shareText);
          toast("\u{1F4CB}", "Copied to clipboard", "#4ade80", 2e3);
        } catch (e) {
          toast("\u{1F4CB}", shareText, "#888", 5e3);
        }
      }, style: { background: "none", border: "1px solid #ffffff12", borderRadius: 6, fontSize: 10, color: "#666", cursor: "pointer", padding: "4px 12px", animation: "fadeIn 3s ease-out" } }, "Share run"), defeatData.daily && (() => {
        if (!miniBoard || !miniBoard.board || miniBoard.board.length === 0) return null;
        const myHandle = getHandle();
        return /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 340, animation: "fadeIn 3s ease-out", marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#67e8f966", letterSpacing: 3, textAlign: "center", marginBottom: 4 } }, "TODAY'S RANKINGS"), miniBoard.board.slice(0, 5).map((e, i) => {
          const isMe = e.handle === myHandle;
          return /* @__PURE__ */ React.createElement("div", { key: i, style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            borderRadius: 4,
            background: isMe ? "#67e8f90a" : "transparent",
            border: isMe ? "1px solid #67e8f922" : "1px solid transparent"
          } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: i === 0 ? "#fbbf24" : "#67e8f9", width: 18, textAlign: "center" } }, i + 1), /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: 11, color: isMe ? "#67e8f9" : "#aaa" } }, e.handle, isMe ? " \u2190" : ""), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: i === 0 ? "#fbbf24" : "#e8e6e3" } }, e.score.toLocaleString()));
        }), miniBoard.total > 5 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#666", textAlign: "center", marginTop: 2 } }, miniBoard.total, " players today"));
      })(), (() => {
        const tips = [];
        if (fams.length === 0) tips.push("Wards boost every hand you play. Buy one early from the Market.");
        else if (fams.length === 1 && ante >= 3) tips.push("More wards = more mult. Try buying 2-3 wards by Night 3.");
        const bestHt = runLog.filter((e) => e.type === "hand").reduce((b, e) => e.data?.type || b, "Stray");
        if (bestHt === "Stray" || bestHt === "Kin") tips.push("Colony hands (4 same season) score 3\xD7 more than Kin. Draft one season.");
        if (fallen.length >= 3) tips.push("Camp heals injuries and builds Nerve. Try camping before the boss.");
        if (deficit > 0 && deficit < defeatData.target * 0.15) tips.push("That was close. One more ward or scroll level would have cleared it.");
        if (ferv < 8 && ante >= 3) tips.push("Nerve multiplies everything. Clear blinds faster for bigger Nerve gains.");
        const tip = tips.length > 0 ? tips[Math.floor(Math.random() * tips.length)] : null;
        return tip ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2466", textAlign: "center", maxWidth: 320, lineHeight: 1.5, animation: "fadeIn 3.5s ease-out", padding: "6px 12px", borderRadius: 8, background: "#fbbf2406", border: "1px solid #fbbf2411" } }, "\u{1F4A1} ", tip) : null;
      })()));
    }
    if (ph === "gameOver" || ph === "victory") {
      const won = ph === "victory";
      const hearthNames = new Set((meta?.cats || []).map((c) => c.name));
      const cands = [...allC].filter((c) => !c._hearthChild && !hearthNames.has(c.name)).sort((a, b) => (b.stats?.bs || 0) - (a.stats?.bs || 0));
      const mvp = cands[0] || allC.sort((a, b) => (b.stats?.bs || 0) - (a.stats?.bs || 0))[0];
      const totalScored = runLog.filter((e) => e.type === "hand").reduce((s, e) => s + (e.data?.score || 0), 0);
      const handsPlayed = runLog.filter((e) => e.type === "hand").length;
      const bestHand = runLog.filter((e) => e.type === "hand").reduce((best, e) => Math.max(best, e.data?.score || 0), 0);
      const catsLost = fallen.length;
      const catsBonded = allC.filter((c) => c.bondedTo).length;
      const statItems = won ? [
        { label: "TOTAL SCORED", val: totalScored.toLocaleString(), color: "#fbbf24" },
        { label: "HANDS PLAYED", val: handsPlayed, color: "#3b82f6" },
        { label: "BEST HAND", val: bestHand.toLocaleString(), color: "#c084fc" },
        ...catsLost > 0 ? [{ label: "CATS LOST", val: catsLost, color: "#ef4444" }] : [],
        ...catsBonded > 0 ? [{ label: "BONDS FORMED", val: Math.floor(catsBonded / 2), color: "#4ade80" }] : [],
        { label: "PEAK NERVE", val: NERVE[rMaxF].name, color: NERVE[rMaxF].color }
      ] : [
        { label: "SCORED", val: totalScored.toLocaleString(), color: "#fbbf24" },
        { label: "BEST HAND", val: bestHand.toLocaleString(), color: "#c084fc" },
        ...catsLost > 0 ? [{ label: "LOST", val: catsLost, color: "#ef4444" }] : [],
        { label: "NERVE", val: NERVE[rMaxF].name, color: NERVE[rMaxF].color }
      ];
      const hasChronicle = runLog.length > 2;
      const hasUnlocks = won && (newUnlocks.length > 0 || meta && meta.stats.w === 1);
      const hasHearthPick = won && hearthPair !== null && cands.length > 0;
      const vStep = won ? victoryStep : 0;
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", zIndex: 1, gap: 12, padding: 20, maxWidth: 550 } }, vStep === 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, animation: "comboBurst .8s ease-out" } }, won ? isNinthDawn ? "\u{1F305}" : "\u{1F451}" : "\u{1F480}"), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: won && isNinthDawn ? 48 : 32, letterSpacing: won && isNinthDawn ? 16 : 8, margin: 0, color: won ? void 0 : "#ef4444", background: won ? "linear-gradient(180deg,#fef08a,#fbbf24)" : void 0, WebkitBackgroundClip: won ? "text" : void 0, WebkitTextFillColor: won ? "transparent" : void 0, animation: "comboBurst .6s ease-out", fontWeight: 700, textTransform: "uppercase", filter: won ? "drop-shadow(0 0 20px #fbbf2433)" : "none" } }, won ? isNinthDawn ? "DAWN" : "THEY MADE IT" : "THE DARK WON"), won && !isNinthDawn && (() => {
        const isFirst3 = isFirstRun && meta && meta.stats.w === 0;
        const isFirst5 = !isFirstRun && meta && meta.stats.w === 0;
        const breath = isFirst3 ? `Three nights. The dark gave you three and you took all of them. ${allC.length} cats. Every name accounted for.` : isFirst5 ? `Five nights. All five. The system ran every test it had. ${fallen.length === 0 ? "Not a single name lost." : allC.length + " still breathing."} The dark has never seen this before.` : fallen.length === 0 ? `${MX} night${MX > 1 ? "s" : ""}. Every single one of them. Not a name lost.` : `${MX} nights. ${allC.length} still breathing. ${fallen.length} carried in their memory.`;
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2466", fontStyle: "italic", letterSpacing: 2, animation: "fadeIn 1.5s ease-out", marginTop: 4, textAlign: "center", maxWidth: 340 } }, breath);
      })(), won && !isNinthDawn && meta && meta.stats.w <= 1 && /* @__PURE__ */ (() => {
        const isFirst3 = isFirstRun;
        const hookText = isFirst3 ? "The fire burns. For the first time since the eighth colony fell, someone kept it burning. Three nights. That's how long the dark takes to decide if a colony is real. You're real. Now two names go into the Hearth. Not as survivors. As founders." : "Five nights. Every test the dark has run on eight colonies, and you walked through all of it. The eighth colony fell one hand short of this moment. You didn't. The Hearth burns with names the system tried to erase.";
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#fbbf24cc", fontStyle: "italic", textAlign: "center", maxWidth: 360, lineHeight: 1.7, animation: "fadeIn 2s ease-out .5s both", padding: "10px 16px", borderRadius: 10, background: "#fbbf2406", border: "1px solid #fbbf2418" } }, hookText);
      })(), won && !isNinthDawn && meta && meta.stats.w > 1 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#fbbf2466", fontStyle: "italic", letterSpacing: 2, animation: "fadeIn 2s ease-out .5s both" } }, "The fire burns brighter. Colony #", (meta.stats.r || 0) + 1, "."), won && (() => {
        const mvpCat = [...allC].sort((a, b) => (b.stats?.tp || 0) - (a.stats?.tp || 0))[0];
        const mvpName = mvpCat?.name.split(" ")[0] || "Someone";
        const mvpPlays = mvpCat?.stats?.tp || 0;
        const bondCount = Math.floor(allC.filter((c) => c.bondedTo).length / 2);
        const scarCount = allC.filter((c) => c.scarred).length;
        const epithetCats2 = allC.filter((c) => c.epithet);
        const sentence = fallen.length > 0 && mvpPlays > 5 ? `${mvpName} played ${mvpPlays} hands. ${fallen.length === 1 ? fallen[0].name.split(" ")[0] + " didn't make it" : fallen.length + " didn't make it"}. The rest walked into the dawn carrying ${fallen.length === 1 ? "one extra name" : fallen.length + " extra names"}.` : fallen.length === 0 && bondCount > 0 ? `${allC.length} cats. ${bondCount} bond${bondCount > 1 ? "s" : ""}. Zero losses. ${mvpName} led with ${mvpPlays} hands. The dark had nothing to say.` : epithetCats2.length > 2 ? `${epithetCats2.map((c) => c.name.split(" ")[0] + " " + c.epithet).join(". ")}. Names that earned their titles.` : scarCount > 2 ? `${scarCount} scars across the colony. Every one of them a map that led here.` : `${mvpName} carried this colony. ${mvpPlays} hands. The rest followed.`;
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#e8e6e3cc", fontStyle: "italic", textAlign: "center", maxWidth: 380, lineHeight: 1.8, animation: "fadeIn 2.5s ease-out 1s both", padding: "12px 18px", borderRadius: 10, background: "#ffffff04", border: "1px solid #ffffff0a" } }, sentence);
      })(), won && allC.length > 0 && (() => {
        const cw = Math.min(340, vw - 40);
        const ch = Math.round(cw * 0.7);
        const cx = cw / 2;
        const cy = ch / 2;
        const dotSize = vw < 500 ? 6 : 5;
        const nameSize = vw < 500 ? (allC.length > 12 ? 7 : 9) : (allC.length > 16 ? 7 : 8);
        const showAllNames = allC.length <= 16;
        const pts = allC.map((c, i) => {
          const angle = i / allC.length * Math.PI * 2 - Math.PI / 2;
          const isNotable = c.epithet || c.scarred || c.bondedTo;
          const ring = allC.length > 20 && !isNotable && i % 2 === 0 ? 0.5 : 0.75;
          const r = Math.min(cx, cy) * ring;
          return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, c, i, showName: showAllNames || isNotable || i % Math.max(2, Math.ceil(allC.length / 12)) === 0 };
        });
        return /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: cw, height: ch, animation: "fadeIn 2s ease-out 1s both", opacity: 0 } }, /* @__PURE__ */ React.createElement("svg", { width: cw, height: ch, style: { position: "absolute", inset: 0 } }, pts.map((p, i) => {
          const next = pts[(i + 1) % pts.length];
          return /* @__PURE__ */ React.createElement("line", { key: `l${i}`, x1: p.x, y1: p.y, x2: next.x, y2: next.y, stroke: "#fbbf2418", strokeWidth: "1" });
        }), pts.map((p) => p.c.bondedTo && (() => {
          const mate = pts.find((q) => q.c.id === p.c.bondedTo);
          return mate ? /* @__PURE__ */ React.createElement("line", { key: `b${p.i}`, x1: p.x, y1: p.y, x2: mate.x, y2: mate.y, stroke: "#f472b633", strokeWidth: "1.5", strokeDasharray: "4 4" }) : null;
        })())), pts.map((p) => /* @__PURE__ */ React.createElement("div", { key: p.c.id, style: { position: "absolute", left: p.x - dotSize / 2, top: p.y - dotSize / 2, width: dotSize, height: dotSize, borderRadius: "50%", background: BREEDS[p.c.breed]?.color || "#fbbf24", boxShadow: `0 0 ${dotSize + 2}px ${BREEDS[p.c.breed]?.color || "#fbbf24"}66`, animation: `fadeIn .5s ease-out ${1.5 + p.i * 0.15}s both` }, title: p.c.name.split(" ")[0] })), pts.filter((p) => p.showName).map((p) => /* @__PURE__ */ React.createElement("div", { key: `n${p.c.id}`, style: { position: "absolute", left: p.x - 28, top: p.y + dotSize + 1, width: 56, fontSize: nameSize, textAlign: "center", color: BREEDS[p.c.breed]?.color || "#fbbf2466", fontWeight: 600, animation: `fadeIn .5s ease-out ${2 + p.i * 0.15}s both`, lineHeight: 1.2, textShadow: "0 0 4px #0a0a1a, 0 0 8px #0a0a1a, 0 1px 2px #000" } }, p.c.name.split(" ")[0], p.c.epithet ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: nameSize - 2, color: "#fbbf2444", fontWeight: 400 } }, p.c.epithet) : null)));
      })(), won && isNinthDawn && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#fbbf24aa", fontStyle: "italic", textAlign: "center", maxWidth: 360, lineHeight: 1.7, animation: "fadeIn 2s ease-out" } }, "Nine colonies. One survived. Not because it was the strongest. Because someone remembered all the rest."), !won && (() => {
        const breath = ante >= MX ? `Night ${ante}. So close to dawn. The eighth colony knows what "close" feels like.` : ante >= 3 ? `Night ${ante}. ${allC.length} still standing when the dark moved in. They deserved more time.` : `Night ${ante}. It ends here. But the fire doesn't go out. It never goes out.`;
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef444488", fontStyle: "italic", letterSpacing: 2, animation: "fadeIn 1.5s ease-out", marginTop: 4 } }, breath);
      })(), statItems.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 400, marginTop: 8 } }, statItems.map((st, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { textAlign: "center", padding: "6px 12px", borderRadius: 8, background: `${st.color}08`, border: `1px solid ${st.color}22`, animation: `scorePop .4s ease-out ${0.8 + i * 0.3}s both`, minWidth: 80 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: `${st.color}88`, letterSpacing: 2 } }, st.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 900, color: st.color } }, st.val)))), won && isNinthDawn && meta && meta.cats.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center", maxWidth: 400, animation: "fadeIn 3s ease-out 1s both" } }, meta.cats.map((c, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: { width: 4, height: 4, borderRadius: "50%", background: BREEDS[c.breed]?.color || "#fbbf24", boxShadow: `0 0 4px ${BREEDS[c.breed]?.color || "#fbbf24"}`, animation: `fadeIn ${0.5 + i * 0.1}s ease-out ${1 + i * 0.05}s both` }, title: c.name }))), fallen.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444bb", letterSpacing: 3 } }, "THEY WERE HERE"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3, alignItems: "center" } }, fallen.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: BREEDS[f.breed]?.color || "#888", fontWeight: 700 } }, f.name.split(" ")[0], f.epithet ? " " + f.epithet : ""), f.memorial && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff66", fontStyle: "italic", lineHeight: 1.3, maxWidth: 260 } }, f.memorial))))), !won && allC.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff55", letterSpacing: 3 } }, allC.length, " STILL STANDING"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 340 } }, allC.map((c, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: { fontSize: 10, color: BREEDS[c.breed]?.color || "#888", opacity: 0.4 } }, c.name.split(" ")[0], c.scarred ? "*" : "")))), won && meta && meta.stats.w > 1 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#fbbf24bb", fontStyle: "italic", textAlign: "center", maxWidth: 320, lineHeight: 1.6, marginTop: 4 } }, fallen.length === 0 ? `Every single one. The dark couldn't take ${mvp ? mvp.name.split(" ")[0] + " or " : ""}any of them.` : fallen.length >= 3 ? `${fallen.map((f) => f.name.split(" ")[0]).join(", ")}. The survivors carry those names now.` : clutch ? "One number. The difference between a colony and a memory." : "Not all of them. But the ones who made it carry the ones who didn't."), !won && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#ef4444bb", fontStyle: "italic", textAlign: "center", maxWidth: 320, lineHeight: 1.6, marginTop: 4 } }, fallen.length >= 3 ? `${fallen.map((f) => f.name.split(" ")[0]).join(", ")}. Say them. The dark won't.` : rMaxF >= 6 ? `${mvp ? mvp.name.split(" ")[0] + " fought like something that" : "They fought like they"} refused to go quietly.` : "They were here. They mattered. The dark can take the colony but it can't take that."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, fontSize: 10, color: "#666" } }, meta && meta.cats.length > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#c084fc" } }, "\u{1F3E0} +", calcHearthDust(meta.cats).reduce((s, h) => s + h.dust, 0), "\u2726/run"), /* @__PURE__ */ React.createElement("span", null, "Peak: ", /* @__PURE__ */ React.createElement("span", { style: { color: NERVE[rMaxF].color } }, NERVE[rMaxF].name)), (meta?.heat || 0) > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "Heat ", meta.heat, "\u{1F525}")), won ? /* @__PURE__ */ React.createElement("button", { onClick: () => setVictoryStep(hasUnlocks ? 2 : 3), style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), padding: "10px 36px", fontSize: 14, marginTop: 8 } }, "Continue") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => { setPh("title"); setTimeout(() => { try { Audio.init(); startGame(); setPh(isFirstRun ? "firstIntro" : "draft"); } catch(e) { setPh("title"); } }, 200); }, style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), padding: "12px 28px", fontSize: 14 } }, "Try Again"), /* @__PURE__ */ React.createElement("button", { onClick: () => setPh("title"), style: { ...BTN("#1a1a2e", "#888"), padding: "12px 20px", fontSize: 12, border: "1px solid #ffffff12" } }, "Title")), (() => { const nextUpg = UPGRADES.find?.((u) => { const owned = meta?.ups?.[u.id] || 0; return owned < u.max && (meta?.dust || 0) >= u.cost; }); return nextUpg ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc88", marginTop: 4, animation: "fadeIn 3s ease-out" } }, "\u2726 You can afford: ", nextUpg.icon, " ", nextUpg.name, " (", nextUpg.cost, "\u2726)") : meta && (meta.dust || 0) > 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc44", marginTop: 4, animation: "fadeIn 3s ease-out" } }, "\u2726 ", meta.dust, " stardust saved") : null; })(), ante <= 2 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff33", marginTop: 4, textAlign: "center", maxWidth: 280, lineHeight: 1.5 } }, "Tip: Match same-season cats for higher base scores. A Clowder (3 matched) scores much more than 3 random.")), hasChronicle && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 400, animation: "fadeIn 2.5s ease-out 1s both" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#999999bb", letterSpacing: 4, textAlign: "center", marginBottom: 6 } }, "THE CHRONICLE"), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 18px", borderRadius: 10, background: "#ffffff04", border: "1px solid #ffffff08" } }, genChronicle(won).map((p, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 11, color: "#aaa", fontStyle: "italic", lineHeight: 1.7, marginBottom: i < genChronicle(won).length - 1 ? 6 : 0 } }, p))))), vStep === 1 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: () => setVictoryStep(hasUnlocks ? 2 : 3), style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), padding: "10px 36px", fontSize: 14, marginTop: 8 } }, "Continue")), vStep === 2 && /* @__PURE__ */ React.createElement(React.Fragment, null, newUnlocks.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, padding: "12px 20px", borderRadius: 10, background: "#fbbf2408", border: "1px solid #fbbf2433" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24", letterSpacing: 2, fontWeight: 700 } }, "NEW UNLOCKS"), newUnlocks.map((msg, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 11, color: "#fbbf24" } }, msg))), meta && meta.stats.w === 1 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, height: "100vh", pointerEvents: "none", zIndex: 0, overflow: "hidden" } }, Array.from({ length: 24 }).map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
        position: "absolute",
        top: -10,
        left: `${4 + i * 4}%`,
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: ["#fbbf24", "#f59e0b", "#fef08a", "#c084fc"][i % 4],
        boxShadow: `0 0 8px ${["#fbbf24", "#f59e0b", "#fef08a", "#c084fc"][i % 4]}88`,
        animation: `starFall ${1.8 + i * 0.25}s ease-in ${0.3 + i * 0.12}s both`
      } }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, animation: "float 3s ease-in-out infinite", filter: "drop-shadow(0 0 30px #fbbf2444)", marginBottom: 4 } }, "\u{1F525}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 700, letterSpacing: 12, background: "linear-gradient(180deg,#fef08a,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "comboBurst .8s ease-out", textTransform: "uppercase" } }, "THE FOUNDING"), /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px", borderRadius: 14, background: "linear-gradient(145deg,#fbbf2408,#c084fc06)", border: "1.5px solid #fbbf2433", textAlign: "center", maxWidth: 380, animation: "fadeIn 1.5s ease-out .5s both", boxShadow: "0 0 40px #fbbf2418" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#fbbf24cc", lineHeight: 1.8, marginBottom: 10 } }, "A colony survived three nights. For the first time since the eighth colony fell, someone kept a fire burning through the dark. Two names go into the Hearth. Not as memories. As ", /* @__PURE__ */ React.createElement("b", { style: { color: "#fef08a" } }, "founders"), ". Everything that comes after carries their blood."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#c084fcbb", fontStyle: "italic", lineHeight: 1.6 } }, "The dark gave you three nights to see if you were worth five. You were.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", fontSize: 10, animation: "fadeIn 2s ease-out 1s both" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24", padding: "4px 10px", borderRadius: 6, background: "#fbbf2411", border: "1px solid #fbbf2422" } }, "5 Nights Unlocked"), /* @__PURE__ */ React.createElement("span", { style: { color: "#c084fc", padding: "4px 10px", borderRadius: 6, background: "#c084fc11", border: "1px solid #c084fc22" } }, "\u{1F3E0} The Hearth"), /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80", padding: "4px 10px", borderRadius: 6, background: "#4ade8011", border: "1px solid #4ade8022" } }, "\u2726 Upgrades"))), meta && meta.stats.w === 2 && !isFirstRun && MX >= 5 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, height: "100vh", pointerEvents: "none", zIndex: 0, overflow: "hidden" } }, Array.from({ length: 30 }).map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
        position: "absolute",
        top: -10,
        left: `${3 + i * 3.2}%`,
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: ["#fbbf24", "#f59e0b", "#fef08a"][i % 3],
        boxShadow: `0 0 8px ${["#fbbf24", "#f59e0b", "#fef08a"][i % 3]}aa`,
        animation: `starFall ${1.5 + i * 0.2}s ease-in ${0.3 + i * 0.1}s both`
      } }))), /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px", borderRadius: 14, background: "linear-gradient(145deg,#fbbf2410,#f59e0b08)", border: "2px solid #fbbf2444", animation: "comboBurst .8s ease-out", textAlign: "center", maxWidth: 380, boxShadow: "0 0 40px #fbbf2422" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 700, letterSpacing: 10, marginBottom: 8, background: "linear-gradient(180deg,#fef08a,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textTransform: "uppercase" } }, "THE DARK LOST"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#fbbf24cc", lineHeight: 1.7, marginBottom: 10 } }, "Five nights. Every test. Every boss. Every pattern the dark has run on eight colonies. And you walked through all of it. The Hearth burns with ", meta.cats.length, " name", meta.cats.length !== 1 ? "s" : "", ". The system doesn't know what to do with that."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2488", fontStyle: "italic" } }, "Heat is unlocked. The dark adapts. So can you."))), /* @__PURE__ */ React.createElement("button", { onClick: () => setVictoryStep(3), style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), padding: "10px 36px", fontSize: 14, marginTop: 8 } }, "Continue")), vStep === 3 && /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
        const multiEp = [...allC].filter((c) => c.epithet && (c.earnedEpithets || []).length > 0);
        if (multiEp.length === 0) return null;
        return /* @__PURE__ */ React.createElement("div", { style: { width: "100%", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2488", letterSpacing: 3, textAlign: "center", marginBottom: 8 } }, "TITLES EARNED"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, maxWidth: 380, margin: "0 auto" } }, multiEp.map((cat2) => {
          const allEps = [{ key: cat2.epithetKey, title: cat2.epithet, desc: EPITHETS[cat2.epithetKey]?.desc || "", flavor: EPITHETS[cat2.epithetKey]?.flavor || "" }, ...cat2.earnedEpithets || []];
          const fn = cat2.name.split(" ")[0];
          return /* @__PURE__ */ React.createElement("div", { key: cat2.id, style: { padding: "8px 12px", borderRadius: 8, background: "#ffffff04", border: "1px solid #fbbf2422" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: BREEDS[cat2.breed]?.color || "#fbbf24", marginBottom: 4 } }, fn), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } }, allEps.map((ep, j) => {
            const isActive = ep.key === cat2.epithetKey;
            return /* @__PURE__ */ React.createElement("button", { key: j, onClick: () => {
              if (!isActive) {
                cat2.epithet = ep.title;
                cat2.epithetKey = ep.key;
                [setHand, setDraw, setDisc].forEach((s) => {
                  s((arr) => arr.map((x) => x.id === cat2.id ? { ...x, epithet: ep.title, epithetKey: ep.key } : x));
                });
                toast("\u{1F3F7}\uFE0F", `${fn} is now "${ep.title}"`, BREEDS[cat2.breed]?.color || "#fbbf24");
              }
            }, style: {
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 10,
              cursor: isActive ? "default" : "pointer",
              background: isActive ? "#fbbf2422" : "#ffffff06",
              border: isActive ? "1px solid #fbbf2466" : "1px solid #ffffff12",
              color: isActive ? "#fbbf24" : "#888",
              fontWeight: isActive ? 700 : 400
            } }, '"', ep.title, '"', isActive ? " \u2605" : "");
          })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2466", fontStyle: "italic", marginTop: 2 } }, EPITHETS[cat2.epithetKey]?.flavor || ""));
        })));
      })(), hasHearthPick && (() => {
        const picked = hearthPair;
        const needSex = picked.length === 0 ? null : picked[0].sex === "M" ? "F" : "M";
        const availCands = needSex ? cands.filter((c) => c.sex === needSex) : cands;
        const pickedIds = picked.map((p) => p.id || p.name);
        const noMate = needSex && availCands.filter((c) => !pickedIds.includes(c.id) && !pickedIds.includes(c.name)).length === 0;
        const isFirstHearthSave = !meta || meta.cats.length === 0;
        return /* @__PURE__ */ React.createElement("div", { style: { width: "100%", textAlign: "center" } }, isFirstHearthSave && picked.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#c084fcbb", fontStyle: "italic", lineHeight: 1.6, marginBottom: 10, maxWidth: 360, margin: "0 auto 10px", padding: "10px 14px", borderRadius: 10, background: "#c084fc06", border: "1px solid #c084fc15" } }, "The Hearth has been dark since the eighth colony fell. Two names will relight it. Not as memories. As founders. Their blood flows through every colony that comes after."), !isFirstHearthSave && picked.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#c084fcbb", fontStyle: "italic", lineHeight: 1.6, marginBottom: 10, maxWidth: 360, margin: "0 auto 10px", padding: "10px 14px", borderRadius: 10, background: "#c084fc06", border: "1px solid #c084fc15" } }, "Two names enter the Hearth. The rest walk into history. Choose who is remembered."), picked.length === 1 && (() => {
          const p = picked[0];
          const pn = p.name.split(" ")[0];
          const line = p.epithet ? `${pn} ${p.epithet} is saved. The title will echo in every colony that follows.` : p.bondedTo && cands.find((c) => c.id === p.bondedTo) ? `${pn} is saved. ${cands.find((c) => c.id === p.bondedTo).name.split(" ")[0]} waits to be chosen beside them.` : (p.stats?.tp || 0) > 10 ? `${pn}. ${p.stats.tp} hands played. More than anyone. Saved.` : p.scarred ? `${pn} carries a hardened mark into the Hearth. It becomes part of the legacy.` : null;
          return line ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc66", fontStyle: "italic", textAlign: "center", maxWidth: 340, lineHeight: 1.5, marginBottom: 6, animation: "fadeIn 1s ease-out" } }, line) : null;
        })(), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#fbbf24", letterSpacing: 3, marginBottom: 4 } }, picked.length === 0 ? isFirstHearthSave ? "THE FOUNDERS" : "CHOOSE THE FIRST SOUL" : "CHOOSE THEIR MATE"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fcbb", marginBottom: 6 } }, picked.length === 0 ? isFirstHearthSave ? "Choose carefully. This is the beginning of everything." : "A male and female carry the story to the Hearth. Their descendants begin the next colony." : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24", fontWeight: 700 } }, getFullName(picked[0])), ` (${picked[0].sex === "M" ? "\u2642" : "\u2640"}) ${isFirstHearthSave ? "is the first Founder" : "will be remembered"}. Now choose ${isFirstHearthSave ? "the second Founder" : needSex === "M" ? "a male companion" : "a female companion"}.`)), noMate && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fb923c", marginBottom: 8 } }, "No ", needSex === "M" ? "males" : "females", " survived. ", picked[0].name.split(" ")[0], " goes alone.", /* @__PURE__ */ React.createElement("button", { onClick: async () => {
          const u = { ...meta, cats: [...meta.cats, picked[0]], stats: { ...meta.stats, disc: [.../* @__PURE__ */ new Set([...meta.stats.disc, `${picked[0].breed}-${(picked[0].trait || PLAIN).name}`])] } };
          setMeta(u);
          await saveS(u);
          setHearthPair(null);
          toast("\u{1F3E0}", "Their children will find you in future runs.", "#fbbf24", 3500);
        }, style: { ...BTN("#333", "#fb923c"), padding: "4px 12px", fontSize: 10, marginLeft: 8 } }, "Save alone")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", maxHeight: 300, overflowY: "auto" } }, availCands.filter((c) => !pickedIds.includes(c.id) && !pickedIds.includes(c.name)).slice(0, 12).map((c) => {
          const b = BREEDS[c.breed];
          const hVal = calcHearthDust([{ ...c, fromAnte: ante }])[0].dust;
          return /* @__PURE__ */ React.createElement("div", { key: c.id, onClick: () => saveCatM(c), style: { cursor: "pointer", textAlign: "center", padding: 5, borderRadius: 8, border: "1px solid #ffffff0a", background: "#ffffff04", width: 96 } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true, hl: c.id === mvp?.id }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 3, fontSize: 10, lineHeight: 1.4 } }, /* @__PURE__ */ React.createElement("div", { style: { color: c.sex === "M" ? "#60a5fa" : "#f472b6", fontWeight: 700 } }, c.sex === "M" ? "\u2642" : "\u2640"), c.stats.tp > 0 ? /* @__PURE__ */ React.createElement("div", { style: { color: "#888" } }, c.stats.tp, "x Best:", c.stats.bs.toLocaleString()) : /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontStyle: "italic" } }, "Never played"), /* @__PURE__ */ React.createElement("div", { style: { color: "#c084fc", fontWeight: 700, fontSize: 10 } }, "+", hVal, "\u2726/run"), c.id === mvp?.id && c.stats.tp > 0 && /* @__PURE__ */ React.createElement("div", { style: { color: "#fbbf24", fontWeight: 700, fontSize: 10 } }, "\u2605 MVP")));
        })), picked.length === 0 && /* @__PURE__ */ React.createElement("button", { onClick: () => setHearthPair(null), style: { ...BTN("#333", "#888"), padding: "6px 16px", fontSize: 10, marginTop: 8 } }, "Skip. carry no one"), picked.length === 1 && /* @__PURE__ */ React.createElement("button", { onClick: () => {
          setHearthPair([]);
        }, style: { ...BTN("#333", "#888"), padding: "6px 16px", fontSize: 10, marginTop: 8 } }, "Undo. repick"));
      })(), hearthPair === null && runLog.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 400 } }, /* @__PURE__ */ React.createElement("details", { style: { cursor: "pointer" } }, /* @__PURE__ */ React.createElement("summary", { style: { fontSize: 10, color: "#888", letterSpacing: 2 } }, "THE RECORD (", runLog.length, " events)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 200, overflowY: "auto", marginTop: 4, paddingBottom: 4 } }, runLog.map((e, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
        fontSize: 10,
        display: "flex",
        gap: 4,
        padding: "2px 0",
        color: e.type === "death" ? "#ef4444" : e.type === "phoenix" ? "#fbbf24" : e.type === "breed" || e.type === "growth" || e.type === "wanderer" || e.type === "mentor" ? "#4ade80" : e.type === "hand" || e.type === "found" || e.type === "reward" ? "#fbbf24" : e.type === "night" ? "#c084fc" : "#666"
      } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#666", minWidth: 35 } }, "N", e.ante, ".", e.blind + 1), e.type === "trait" && /* @__PURE__ */ React.createElement("span", null, "\u2728 ", e.data.cat, " gained ", e.data.trait), e.type === "draft" && /* @__PURE__ */ React.createElement("span", null, "Drafted: ", e.data.picked, " (", e.data.rejects, " turned away)"), e.type === "hand" && /* @__PURE__ */ React.createElement("span", null, e.data.cats, " played ", e.data.type, " for ", e.data.score.toLocaleString()), e.type === "breed" && /* @__PURE__ */ React.createElement("span", null, e.data.baby, " was born to ", e.data.parents), e.type === "fight" && /* @__PURE__ */ React.createElement("span", null, e.data.loser, " was hardened in a fight"), e.type === "death" && /* @__PURE__ */ React.createElement("span", null, e.data.victim, " died"), e.type === "night" && /* @__PURE__ */ React.createElement("span", null, "Night ", e.data.to, " begins"), e.type === "phoenix" && /* @__PURE__ */ React.createElement("span", null, e.data.risen, " rose from ashes!"), e.type === "bond" && /* @__PURE__ */ React.createElement("span", null, e.data.c1, " bonded with ", e.data.c2), e.type === "training" && /* @__PURE__ */ React.createElement("span", null, e.data.c1, " and ", e.data.c2, " sparred"), e.type === "grudge" && /* @__PURE__ */ React.createElement("span", null, "\u26A1 Grudge: ", e.data.c1, " vs ", e.data.c2), e.type === "reconcile" && /* @__PURE__ */ React.createElement("span", null, "\u{1F54A}\uFE0F Peace: ", e.data.c1, "+", e.data.c2, e.data.bonded ? " \u{1F495}" : ""), e.type === "mentor" && /* @__PURE__ */ React.createElement("span", null, e.data.elder, " mentored ", e.data.young), e.type === "found" && /* @__PURE__ */ React.createElement("span", null, e.data.cat, " found +", e.data.gold, "\u{1F41F}"), e.type === "growth" && /* @__PURE__ */ React.createElement("span", null, e.data.cat, " grew stronger"), e.type === "wanderer" && /* @__PURE__ */ React.createElement("span", null, e.data.cat, " joined the colony"), e.type === "reward" && /* @__PURE__ */ React.createElement("span", null, "Claimed: ", e.data.name)))))), hearthPair === null && /* @__PURE__ */ React.createElement("button", { onClick: () => setPh("title"), style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), padding: "10px 36px", fontSize: 15 } }, "Carry Their Names"), hearthPair === null && (() => {
        const nightGrid = (() => {
          const sq = { "Autumn": "\u{1F7EB}", "Winter": "\u{1F7E6}", "Spring": "\u{1F7E9}", "Summer": "\u{1F7E7}" };
          const cts = {};
          allC.forEach((x) => {
            cts[x.breed] = (cts[x.breed] || 0) + 1;
          });
          const dom = Object.entries(cts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Autumn";
          return Array(ante).fill(sq[dom] || "\u2B1C").join("") + (ante < 5 ? "\u2B1B".repeat(5 - ante) : "");
        })();
        const vicShare = `\u{1F431} Ninth Life \xB7 Colony #${(meta?.stats?.r || 0) + 1} \xB7 Night ${ante} Cleared
${nightGrid}
Score: ${totalScored.toLocaleString()} \xB7 ${fallen.length === 0 ? "Zero deaths" : "" + fallen.length + " lost"}${(meta?.heat || 0) > 0 ? " \xB7 Heat " + (meta.heat || 0) : ""}
MVP: ${mvp ? mvp.name : ""} (${bestHand.toLocaleString()} best hand)
The fire still burns.
\u2192 https://greatgamesgonewild.github.io/ninth-life/`;
        return /* @__PURE__ */ React.createElement("button", { onClick: () => {
          try {
            navigator.clipboard?.writeText(vicShare);
            toast("\u{1F4CB}", "Copied to clipboard", "#4ade80", 2e3);
          } catch (e) {
            toast("\u{1F4CB}", vicShare, "#888", 5e3);
          }
        }, style: { background: "none", border: "1px solid #ffffff12", borderRadius: 6, fontSize: 10, color: "#666", cursor: "pointer", padding: "4px 12px", marginTop: 4 } }, "Share run");
      })())));
    }
    if (ph === "denSelect") {
      const dAllRaw = [...hand, ...draw, ...disc];
      const seenIds = new Set();
      const dAll = dAllRaw.filter((c) => {
        if (seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });
      const injured = dAll.filter((c) => c.injured);
      const isolated = [...den];
      const denCats = dAll.filter((c) => !den.find((d) => d.id === c.id) && !c.injured);
      const nightText = NIGHT_FLAVOR[Math.min(ante - 1, 4)];
      const mob2 = vw < 500;
      const denCardW = mob2 ? Math.max(44, Math.min(64, Math.floor((vw - 40) / Math.max(6, Math.ceil(dAll.length / 3))))) : 80;
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minHeight: "100vh", zIndex: 1, gap: 10, padding: mob2 ? "16px 12px" : "20px", maxWidth: 600, paddingTop: mob2 ? 40 : 60 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: mob2 ? 18 : 20, color: campMode ? "#fbbf24" : "#c084fc", letterSpacing: 4, margin: 0 } }, campMode ? "\u{1F3D5} CAMP" : "THE DEN"), campMode && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#fbbf24", fontWeight: 700 } }, gold, " \u{1F41F}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: mob2 ? 11 : 12, color: "#ffffff55", fontStyle: "italic", textAlign: "center", maxWidth: 320, lineHeight: 1.6 } }, campMode ? "Pick 2 cats for the watch. The rest sleep by the fire." : nightText), campMode ? /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px", borderRadius: 10, background: "#fbbf2408", border: "1px solid #fbbf2422", fontSize: 12, color: "#fbbf24cc", lineHeight: 1.7, textAlign: "center", maxWidth: 380, animation: "fadeIn .6s ease-out" } }, /* @__PURE__ */ React.createElement("b", null, "Pick 2 cats for the watch."), " Unbonded \u2642+\u2640 may bond. Grudged pairs may reconcile. Others gain +1 Power.") : !seen.den && /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px", borderRadius: 10, background: "#c084fc08", border: "1px solid #c084fc22", fontSize: 12, color: "#c084fccc", lineHeight: 1.7, textAlign: "center", maxWidth: 380, animation: "fadeIn .6s ease-out" } }, /* @__PURE__ */ React.createElement("b", null, "Shelter:"), " Put a \u2642 + \u2640 pair here to breed a kitten (guaranteed). ", /* @__PURE__ */ React.createElement("b", null, "Wilds:"), " Cats left outside grow, train, or fight.", /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setSeen((s) => ({ ...s, den: true })), style: { fontSize: 10, background: "none", border: "1px solid #c084fc33", borderRadius: 4, color: "#c084fc", cursor: "pointer", padding: "3px 10px" } }, "Got it"))), campMode ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 480 } }, den.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginBottom: 8, padding: "8px 12px", borderRadius: 10, background: "#fbbf2408", border: "1px solid #fbbf2422" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24", letterSpacing: 2, fontWeight: 700 } }, "\u{1F525} THE WATCH"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4 } }, den.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, onClick: () => toggleDen(c), style: { cursor: "pointer", textAlign: "center" } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true, cw: denCardW, sel: true }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: BREEDS[c.breed]?.color || "#fbbf24", marginTop: 1, fontWeight: 700, lineHeight: 1 } }, c.name.split(" ")[0], " ", /* @__PURE__ */ React.createElement("span", { style: { color: c.sex === "M" ? "#60a5fa" : "#f472b6" } }, c.sex === "M" ? "\u2642" : "\u2640")))))), den.length < 2 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2466", textAlign: "center", marginBottom: 6 } }, den.length === 0 ? "Tap 2 cats below" : "Pick 1 more"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" } }, (() => {
        const sOrder = { Autumn: 0, Winter: 1, Spring: 2, Summer: 3 };
        const available = dAll.filter((c) => !den.find((d) => d.id === c.id) && !c.injured);
        const sorted = [...available].sort((a, b) => (sOrder[a.breed] || 0) - (sOrder[b.breed] || 0) || b.power - a.power);
        return sorted.map((c) => {
          const isGrudgedWith = den.length === 1 && (c.grudgedWith?.includes(den[0].id) || den[0].grudgedWith?.includes(c.id));
          const canBondWith = den.length === 1 && c.sex !== den[0].sex && !c.bondedTo && !den[0].bondedTo;
          const isMateOf = den.length === 1 && (c.bondedTo === den[0].id || den[0].bondedTo === c.id);
          return /* @__PURE__ */ React.createElement("div", { key: c.id, onClick: den.length < 2 ? () => toggleDen(c) : void 0, style: { cursor: den.length < 2 ? "pointer" : "default", opacity: den.length >= 2 ? 0.4 : 1, position: "relative", textAlign: "center" } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true, cw: denCardW, hl: isGrudgedWith || canBondWith || isMateOf }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: BREEDS[c.breed]?.color || "#888", marginTop: 1, maxWidth: denCardW + 8, lineHeight: 1, whiteSpace: "nowrap" } }, c.name.split(" ")[0]), isGrudgedWith && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: -4, right: -2, fontSize: 10, color: "#fb923c" } }, "\u26A1"), canBondWith && !isGrudgedWith && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: -4, right: -2, fontSize: 10, color: "#f472b6" } }, "\u2661"), isMateOf && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: -4, right: -2, fontSize: 10, color: "#f472b6" } }, "\u{1F495}"));
        });
      })()), injured.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fb923c88", letterSpacing: 1, marginBottom: 3 } }, "\u{1FA79} RESTING (", injured.length, ")"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" } }, injured.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, style: { position: "relative" } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true, cw: denCardW, dis: true }))))))) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: mob2 ? "column" : "row", gap: 12, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "8px 10px", borderRadius: 10, background: "#4ade8006", border: "1px solid #4ade8022", minHeight: mob2 ? 80 : 120 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: campMode ? "#fbbf24" : "#4ade80", letterSpacing: 2, fontWeight: 700, marginBottom: 6 } }, campMode ? "\u{1F525} THE WATCH" : "\u{1F6E1} SHELTER", " (", isolated.length, "/", MAX_ISOLATE, ")"), eventDenSafe && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade80aa", marginBottom: 4 } }, "\u{1F54A}\uFE0F Shrine protection active"), isolated.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade8066", fontStyle: "italic" } }, "Tap cats below to shelter them") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" } }, isolated.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, onClick: () => toggleDen(c), style: { cursor: "pointer", position: "relative" } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true, cw: denCardW, sel: true, onTraitClick: (ct) => setTraitTip(ct) })))), !campMode && (() => {
        let breedPairs = 0;
        for (let i = 0; i < isolated.length; i++) for (let j = i + 1; j < isolated.length; j++) {
          if (isolated[i].sex !== isolated[j].sex && !isolated[i].injured && !isolated[j].injured) {
            const isFamily = isolated[i].parentIds?.includes(isolated[j].id) || isolated[j].parentIds?.includes(isolated[i].id) || isolated[i].parentIds && isolated[j].parentIds && isolated[i].parentIds.some((p) => isolated[j].parentIds.includes(p));
            if (!isFamily) breedPairs++;
          }
        }
        return breedPairs > 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade80", textAlign: "center", marginTop: 4 } }, "\u{1F91D} ", breedPairs, " breeding pair", breedPairs > 1 ? "s" : "") : isolated.length >= 2 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade8066", textAlign: "center", marginTop: 4 } }, "No M/F pairs to breed") : null;
      })())), /* @__PURE__ */ React.createElement("div", { style: { flex: 2, padding: "8px 10px", borderRadius: 10, background: "#fb923c06", border: "1px solid #fb923c22", minHeight: mob2 ? 100 : 120 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fb923c", letterSpacing: 2, fontWeight: 700 } }, "\u{1F332} WILDS (", denCats.length, ")"), (() => {
        const risk = denCats.length <= 4 ? "Calm" : denCats.length <= 8 ? "Active" : denCats.length <= 12 ? "Volatile" : "Dangerous";
        const riskColor = denCats.length <= 4 ? "#4ade80" : denCats.length <= 8 ? "#fbbf24" : denCats.length <= 12 ? "#fb923c" : "#ef4444";
        return /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: riskColor, fontWeight: 600 } }, risk);
      })()), /* @__PURE__ */ React.createElement("button", { onClick: () => setSeen((s) => ({ ...s, denSort: s.denSort === "power" ? "season" : "power" })), style: { background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 5, padding: "3px 10px", fontSize: 10, color: "#aaa", cursor: "pointer", fontWeight: 600 } }, (seen.denSort || "season") === "season" ? "\u{1F342} Season" : "\u26A1 Power")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" } }, (() => {
        const sOrder = { Autumn: 0, Winter: 1, Spring: 2, Summer: 3 };
        const sorted = (seen.denSort || "season") === "season" ? [...denCats].sort((a, b) => (sOrder[a.breed] || 0) - (sOrder[b.breed] || 0) || b.power - a.power) : [...denCats].sort((a, b) => b.power - a.power);
        return sorted.map((c) => {
          const shelterHas1 = den.length === 1;
          const isCompatible = !shelterHas1 || (c.sex !== den[0].sex && !c.parentIds?.includes(den[0].id) && !den[0].parentIds?.includes(c.id));
          const dimmed = shelterHas1 && !isCompatible;
          return /* @__PURE__ */ React.createElement("div", { key: c.id, onClick: den.length < MAX_ISOLATE ? () => toggleDen(c) : void 0, style: { cursor: den.length < MAX_ISOLATE ? "pointer" : "default", opacity: den.length >= MAX_ISOLATE ? 0.6 : dimmed ? 0.35 : 1, position: "relative", textAlign: "center" } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true, cw: denCardW, denMode: true, onTraitClick: (ct) => setTraitTip(ct) }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: BREEDS[c.breed]?.color || "#888", marginTop: 1, maxWidth: denCardW + 8, lineHeight: 1, whiteSpace: "nowrap" } }, c.name.split(" ")[0], " ", /* @__PURE__ */ React.createElement("span", { style: { color: c.sex === "M" ? "#60a5fa" : "#f472b6", fontWeight: 700 } }, c.sex === "M" ? "\u2642" : "\u2640")));
        });
      })()), injured.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fb923c88", letterSpacing: 1, marginBottom: 3 } }, "\u{1FA79} RESTING (", injured.length, ")"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap" } }, injured.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, style: { position: "relative", textAlign: "center" } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true, cw: denCardW, dis: true, onTraitClick: (ct) => setTraitTip(ct) }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: "#fb923c66", marginTop: 1, maxWidth: denCardW + 8, lineHeight: 1, whiteSpace: "nowrap" } }, c.name.split(" ")[0], " ", /* @__PURE__ */ React.createElement("span", { style: { color: c.sex === "M" ? "#60a5fa44" : "#f472b644" } }, c.sex === "M" ? "\u2642" : "\u2640")))))))), (() => {
        let campHint = "", campHintColor = "#888";
        if (campMode && den.length >= 2) {
          const [a, b] = den;
          const isGrudged = a.grudgedWith?.includes(b.id) || b.grudgedWith?.includes(a.id);
          const canBond = a.sex !== b.sex && !a.bondedTo && !b.bondedTo;
          const bothDevoted = catHas(a, "Devoted") && catHas(b, "Devoted");
          if (isGrudged) {
            campHint = "45% chance to reconcile";
            campHintColor = "#c084fc";
          } else if (canBond && bothDevoted) {
            campHint = "Devoted pair: guaranteed bond \u{1F495}";
            campHintColor = "#f472b6";
          } else if (canBond) {
            campHint = "55% chance to bond";
            campHintColor = "#f472b6";
          } else {
            const aCamp2 = a._camped, bCamp2 = b._camped;
            if (aCamp2 && bCamp2) {
              campHint = "Both already grew from camp. No stat gain.";
              campHintColor = "#666";
            } else if (aCamp2 || bCamp2) {
              const who = (aCamp2 ? a : b).name.split(" ")[0];
              campHint = `${who} already grew. Other cat gets +1P.`;
              campHintColor = "#fbbf24";
            } else {
              campHint = "85% +1P one, 15% +1P both";
              campHintColor = "#fbbf24";
            }
          }
          if (meta && meta.stats.w > 0) {
            const elder2 = a.stats?.tp >= 6 ? a : b.stats?.tp >= 6 ? b : null;
            const plain2 = elder2 ? elder2 === a ? b : a : null;
            if (elder2 && plain2 && elder2.trait?.name !== "Plain" && plain2.trait?.name === "Plain") {
              campHint += " \xB7 20% teach trait";
              campHintColor = "#c084fc";
            }
          }
        }
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 4 } }, campMode && campHint && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: campHintColor, letterSpacing: 1, animation: "fadeIn .3s ease-out" } }, campHint), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: campMode ? () => {
          const isFirstCamp = (!meta || meta.stats.r === 0) && !seen.campUsed;
          const campCost = isFirstCamp ? 0 : 3;
          if (campCost > 0 && gold < campCost) {
            toast("\u{1F41F}", "Not enough Rations to camp (need 3\u{1F41F}).", "#ef4444");
            return;
          }
          if (campCost > 0) setGold((g) => g - campCost);
          if (isFirstCamp) setSeen((s) => ({ ...s, campUsed: true }));
          const results = [];
          results.push(campCost > 0 ? { text: `-${campCost}\u{1F41F}. The colony makes camp.`, color: "#888", icon: "\u{1F3D5}" } : { text: "The colony makes camp.", color: "#888", icon: "\u{1F3D5}" });
          const injCount = [...hand, ...draw, ...disc].filter((x) => x.injured).length;
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.injured ? { ...x, injuryTimer: Math.max(0, (x.injuryTimer || 2) - 1), injured: (x.injuryTimer || 2) <= 1 ? false : x.injured } : x));
          });
          results.push(injCount > 0 ? { text: `${injCount} injured tended. The colony rests.`, color: "#4ade80", icon: "\u{1FA79}" } : { text: "No injuries. The colony rests easy.", color: "#4ade8066", icon: "\u{1F319}" });
          setFerv((f) => Math.min(NERVE_MAX, f + 1));
          Audio.nerveUp();
          setFFlash("up");
          setTimeout(() => setFFlash(null), 400);
          results.push({ text: "+1 Nerve. Rest builds resolve.", color: "#d97706", icon: "\u{1F525}" });
          setGold((g) => g + 1);
          results.push({ text: "The watch found supplies nearby. +1\u{1F41F}.", color: "#fbbf24", icon: "\u{1F41F}" });
          if (den.length >= 2) {
            const [a, b] = den;
            const isGrudged = a.grudgedWith?.includes(b.id) || b.grudgedWith?.includes(a.id);
            const canBond = a.sex !== b.sex && !a.bondedTo && !b.bondedTo;
            const bothDevoted = catHas(a, "Devoted") && catHas(b, "Devoted");
            const bondChance = bothDevoted ? 1 : 0.55;
            if (isGrudged && Math.random() < 0.45) {
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => {
                  if (x.id === a.id) return { ...x, grudgedWith: (x.grudgedWith || []).filter((id) => id !== b.id) };
                  if (x.id === b.id) return { ...x, grudgedWith: (x.grudgedWith || []).filter((id) => id !== a.id) };
                  return x;
                }));
              });
              results.push({ text: `${a.name.split(" ")[0]} and ${b.name.split(" ")[0]} made peace by the fire.`, color: "#c084fc", icon: "\u{1F54A}\uFE0F" });
              a._grudgeResolved = true;
              b._grudgeResolved = true;
              assignEpithet(a);
              assignEpithet(b);
              if (a._newEpithet) {
                delete a._newEpithet;
                toast("\u{1F3F7}\uFE0F", epithetToastMsg(a), BREEDS[a.breed]?.color || "#fbbf24", 2500);
                Audio.epithetEarned();
              }
              if (b._newEpithet) {
                delete b._newEpithet;
                setTimeout(() => {
                  toast("\u{1F3F7}\uFE0F", epithetToastMsg(b), BREEDS[b.breed]?.color || "#fbbf24", 2500);
                  Audio.epithetEarned();
                }, 800);
              }
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => x.id === a.id ? { ...x, epithet: a.epithet, epithetKey: a.epithetKey } : x.id === b.id ? { ...x, epithet: b.epithet, epithetKey: b.epithetKey } : x));
              });
              Audio.denBond();
            } else if (canBond && !isGrudged && Math.random() < bondChance) {
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => {
                  if (x.id === a.id) return { ...x, bondedTo: b.id };
                  if (x.id === b.id) return { ...x, bondedTo: a.id };
                  return x;
                }));
              });
              results.push({ text: `${a.name.split(" ")[0]} and ${b.name.split(" ")[0]} bonded under the stars. \u{1F495}`, color: "#f472b6", icon: "\u{1F495}" });
              a.bondedTo = b.id;
              b.bondedTo = a.id;
              assignEpithet(a);
              assignEpithet(b);
              if (a._newEpithet) {
                delete a._newEpithet;
                toast("\u{1F3F7}\uFE0F", epithetToastMsg(a), BREEDS[a.breed]?.color || "#fbbf24", 2500);
                Audio.epithetEarned();
              }
              if (b._newEpithet) {
                delete b._newEpithet;
                setTimeout(() => {
                  toast("\u{1F3F7}\uFE0F", epithetToastMsg(b), BREEDS[b.breed]?.color || "#fbbf24", 2500);
                  Audio.epithetEarned();
                }, 800);
              }
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => x.id === a.id ? { ...x, epithet: a.epithet, epithetKey: a.epithetKey, bondedTo: b.id } : x.id === b.id ? { ...x, epithet: b.epithet, epithetKey: b.epithetKey, bondedTo: a.id } : x));
              });
              Audio.denBond();
            } else {
              const aCamped = a._camped, bCamped = b._camped;
              if (aCamped && bCamped) {
                results.push({ text: `${a.name.split(" ")[0]} and ${b.name.split(" ")[0]} shared the fire. They've grown all they can this way.`, color: "#888", icon: "\u{1F319}" });
              } else {
                const roll = Math.random();
                if (roll < 0.85) {
                  const uncamped = [!aCamped ? a : null, !bCamped ? b : null].filter(Boolean);
                  if (uncamped.length > 0) {
                    const target = uncamped.length === 1 ? uncamped[0] : pk(uncamped);
                    [setHand, setDraw, setDisc].forEach((s) => {
                      s((arr) => arr.map((x) => {
                        if (x.id === target.id) return { ...x, power: Math.min(15, x.power + 1), _camped: true };
                        return x;
                      }));
                    });
                    results.push({ text: `${target.name.split(" ")[0]} grew stronger on the watch. (+1P)`, color: "#fbbf24", icon: "\u2694" });
                  } else {
                    results.push({ text: `${a.name.split(" ")[0]} and ${b.name.split(" ")[0]} shared the fire. They've grown all they can this way.`, color: "#888", icon: "\u{1F319}" });
                  }
                } else {
                  [setHand, setDraw, setDisc].forEach((s) => {
                    s((arr) => arr.map((x) => {
                      if (x.id === a.id && !aCamped || x.id === b.id && !bCamped) return { ...x, power: Math.min(15, x.power + 1), _camped: true };
                      return x;
                    }));
                  });
                  const who = [!aCamped ? a.name.split(" ")[0] : null, !bCamped ? b.name.split(" ")[0] : null].filter(Boolean).join(" and ");
                  results.push({ text: `${who || "Both"} grew stronger together. (+1P each)`, color: "#fbbf24", icon: "\u2694\u2694" });
                }
              }
            }
          } else {
            results.push({ text: "No watch pair chosen. The colony sleeps uneasy.", color: "#888", icon: "\u{1F319}" });
          }
          if (den.length >= 2 && meta && meta.stats.w > 0) {
            const [ca, cb] = den;
            const elder = ca.stats?.tp >= 6 ? ca : cb.stats?.tp >= 6 ? cb : null;
            const plain = elder ? elder === ca ? cb : ca : null;
            if (elder && plain && elder.trait && elder.trait.name !== "Plain" && plain.trait && plain.trait.name === "Plain" && Math.random() < 0.2) {
              plain.trait = { ...elder.trait };
              plain._taughtBy = elder.name.split(" ")[0];
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => x.id === plain.id ? { ...x, trait: { ...elder.trait } } : x));
              });
              results.push({ text: `By the fire, ${elder.name.split(" ")[0]} taught ${plain.name.split(" ")[0]} ${elder.trait.icon} ${elder.trait.name}.`, color: "#c084fc", icon: "\u2728" });
              assignEpithet(plain);
              if (plain._newEpithet) {
                delete plain._newEpithet;
                setTimeout(() => {
                  toast("\u{1F3F7}\uFE0F", epithetToastMsg(plain), BREEDS[plain.breed]?.color || "#fbbf24", 3e3);
                  Audio.epithetEarned();
                }, 1500);
              }
              [setHand, setDraw, setDisc].forEach((s) => {
                s((arr) => arr.map((x) => x.id === plain.id ? { ...x, epithet: plain.epithet, epithetKey: plain.epithetKey } : x));
              });
              logEvent("trait", { cat: plain.name.split(" ")[0], trait: elder.trait.name, from: elder.name.split(" ")[0], source: "camp" });
              if (!meta?.stats?.seenTraitTeach) {
                setMeta((m) => {
                  const nm = { ...m, stats: { ...m.stats, seenTraitTeach: true } };
                  saveS(nm);
                  return nm;
                });
                setTimeout(() => toast("\u{1F4A1}", "Elder cats can teach their trait to Plain cats by the fire. Build toward Kindred!", "#c084fc", 5e3), 2500);
              }
            }
          }
          setDen([]);
          setCampMode(false);
          setEventOutcome({ title: "Camp", icon: "\u{1F3D5}", choice: "No market. No strangers. Just the colony and the fire.", desc: results, targets: [] });
          if (meta) {
            const u = { ...meta, stats: { ...meta.stats, campCount: (meta.stats.campCount || 0) + 1 } };
            setMeta(u);
            saveS(u);
          }
          setPh("eventResult");
        } : endNight, style: { ...BTN(campMode ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "linear-gradient(135deg,#c084fc,#a855f7)", "#fff"), padding: mob2 ? "12px 24px" : "10px 28px", fontSize: 14 } }, campMode ? den.length >= 2 ? "Make Camp" : "Skip Watch. Rest Only" : "End Night"), !campMode && /* @__PURE__ */ React.createElement("button", { onClick: () => {
          setDen([]);
          nextBlind();
        }, style: { ...BTN("#1a1a2e", "#888"), padding: mob2 ? "12px 16px" : "10px 20px", fontSize: 11, border: "1px solid #ffffff12" } }, "Skip"), campMode && /* @__PURE__ */ React.createElement("button", { onClick: () => {
          setCampMode(false);
          setDen([]);
          setOData({ excess: 0, uh: 0, gR: 0, fs: 0, tgt: 0, interest: 0, excessGold: 0 });
          setPh("overflow");
        }, style: { ...BTN("#1a1a2e", "#888"), padding: mob2 ? "12px 16px" : "10px 20px", fontSize: 11, border: "1px solid #ffffff12" } }, "Back")));
      })()));
    }
    if (ph === "denResults" && denRes) {
      const mob2 = vw < 500;
      const n = (c) => c.name.split(" ")[0];
      const bMult = typeof getMB === "function" ? getMB() : {};
      const bondStr = bMult.bondBoost ? "\xD71.75" : "\xD71.5";
      const beats = [];
      denRes.forEach((r) => {
        if (r.type === "breed") beats.push({ pri: 0, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { width: "100%", padding: mob2 ? "8px 10px" : "10px 14px", borderRadius: 10, background: "linear-gradient(145deg,#1b2e1b,#0d0d1a)", border: "1px solid #4ade8044" } }, /* @__PURE__ */ React.createElement("div", { style: { fontStyle: "italic", color: "#4ade80bb", fontSize: 12, lineHeight: 1.5, marginBottom: 6 } }, cpk(flavorCache, `breed_${r.baby.id}`, DEN_BREED, (fn) => fn(n(r.c1), n(r.c2), n(r.baby)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, /* @__PURE__ */ React.createElement(CC, { cat: r.c1, sm: true }), /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80bb" } }, "+"), /* @__PURE__ */ React.createElement(CC, { cat: r.c2, sm: true }), /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80bb" } }, "="), /* @__PURE__ */ React.createElement(CC, { cat: r.baby, sm: true, hl: true }), r.twins && r.twin2 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24bb" } }, "+"), /* @__PURE__ */ React.createElement(CC, { cat: r.twin2, sm: true, hl: true }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", marginTop: 3 } }, BREEDS[r.baby.breed].icon, " ", r.baby.name, " P", r.baby.power, " ", (r.baby.trait || PLAIN).icon, " ", (r.baby.trait || PLAIN).name, " ", r.baby.sex === "M" ? "\u2642" : "\u2640", (r.baby.trait || PLAIN).tier !== "common" && (r.baby.trait || PLAIN).name !== "Plain" && /* @__PURE__ */ React.createElement("span", { style: { color: traitTierLabel(r.baby.trait).color, fontWeight: 700 } }, " \u2605 ", traitTierLabel(r.baby.trait).label.toUpperCase()))) });
        if (r.type === "death") beats.push({ pri: 1, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { width: "100%", padding: mob2 ? "8px 10px" : "10px 14px", borderRadius: 10, background: "linear-gradient(145deg,#2e1111,#0d0d1a)", border: "1px solid #ef4444bb", animation: "fadeIn 1s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444", letterSpacing: 3, fontWeight: 700, marginBottom: 4 } }, "\u{1F480} DEATH"), /* @__PURE__ */ React.createElement("div", { style: { fontStyle: "italic", color: "#ef4444bb", fontSize: 13, lineHeight: 1.5, marginBottom: 6 } }, cpk(flavorCache, `death_${r.victim.id}`, DEN_DEATH, (fn) => fn(n(r.c1), n(r.c2), n(r.victim)))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "8px 12px", borderRadius: 8, background: "#ef444411", border: "1px solid #ef444422" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#ef4444", fontWeight: 700 } }, r.victim.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", marginTop: 2 } }, "P", r.victim.power, " ", BREEDS[r.victim.breed]?.icon, " ", r.victim.breed, " ", (r.victim.trait || PLAIN).icon, " ", (r.victim.trait || PLAIN).name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444bb", marginTop: 2 } }, r.victim.stats?.tp > 0 ? `Played ${r.victim.stats.tp} hands. Best: ${r.victim.stats.bs?.toLocaleString()}.` : "Never got to play."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444aa", marginTop: 4, fontStyle: "italic", lineHeight: 1.5 } }, getDeathMemorial(r.victim, ante)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: 700, letterSpacing: 2 } }, "Gone from the colony."))) });
        if (r.type === "phoenix") beats.push({ pri: 0, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { width: "100%", padding: mob2 ? "8px 10px" : "10px 14px", borderRadius: 10, background: "linear-gradient(145deg,#2e2211,#0d0d1a)", border: "1px solid #fbbf2466" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#fbbf24", fontWeight: 700, marginBottom: 4 } }, "\u{1F525} ", n(r.risen), " RISES FROM THE ASHES!"), /* @__PURE__ */ React.createElement("div", { style: { fontStyle: "italic", color: "#fbbf24bb", fontSize: 11 } }, cpk(flavorCache, `phoenix_${r.risen.id}`, DEN_PHOENIX, (fn) => fn(r.c1.name, r.c2.name, r.risen.name))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24", marginTop: 4 } }, "Now Eternal at P1. The fire changes everything.")) });
        if (r.type === "bond") beats.push({ pri: 2, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#f472b6", lineHeight: 1.4, padding: "4px 0" } }, "\u{1F495} ", n(r.c1), " & ", n(r.c2), " bonded ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, ": ", bondStr, " mult together")) });
        if (r.type === "reconcile_bond") beats.push({ pri: 2, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#f472b6", lineHeight: 1.4, padding: "4px 0" } }, "\u{1F495} ", n(r.c1), " & ", n(r.c2), " reconciled + bonded ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, ": ", bondStr, " mult together")) });
        if (r.type === "reconcile") beats.push({ pri: 2, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#67e8f9", lineHeight: 1.4, padding: "4px 0" } }, "\u{1F54A}\uFE0F ", n(r.c1), " & ", n(r.c2), " made peace ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, ": grudge cleared")) });
        if (r.type === "fight") beats.push({ pri: 3, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: r.wasInjured ? "#ef4444" : "#fbbf24", lineHeight: 1.4, padding: "4px 0" } }, r.wasInjured ? "\u{1FA79}" : "\u2694", " ", n(r.loser), " ", r.wasInjured ? "injured" : "hardened", " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, "(", r.wasInjured ? "heals in 2 rounds" : "\xD71.25 bonus", ")"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff44", fontStyle: "italic" } }, cpk(flavorCache, `fight_${r.c1?.id}_${r.c2?.id}`, DEN_FIGHT, (fn) => fn(n(r.c1), n(r.c2), n(r.loser))))) });
        if (r.type === "grudge") beats.push({ pri: 3, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#fb923c", lineHeight: 1.4, padding: "4px 0" } }, "\u26A1 ", n(r.c1), " & ", n(r.c2), " grudge ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, ": \u22122M when together")) });
        if (r.type === "wanderer") beats.push({ pri: 4, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#67e8f9", lineHeight: 1.4, padding: "4px 0" } }, "\u{1F431} ", n(r.cat), " wandered in ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, ": P", r.cat.power, " ", r.cat.breed)) });
        if (r.type === "growth") beats.push({ pri: 5, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#4ade80", lineHeight: 1.4, padding: "4px 0" } }, "\u2B50 ", n(r.cat), " +1P", /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff44", fontStyle: "italic" } }, cpk(flavorCache, `grow_${r.cat?.id}`, DEN_GROWTH, (fn) => fn(n(r.cat))))) });
        if (r.type === "mentor") beats.push({ pri: 5, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#c084fc", lineHeight: 1.4, padding: "4px 0" } }, "\u{1F4D6} ", n(r.elder), " mentored ", n(r.young), " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, ": +1P")) });
        if (r.type === "training") beats.push({ pri: 5, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#60a5fa", lineHeight: 1.4, padding: "4px 0" } }, "\u2694\uFE0F ", n(r.c1), " & ", n(r.c2), " sparred ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, ": +1P each"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff44", fontStyle: "italic" } }, cpk(flavorCache, `train_${r.c1?.id}_${r.c2?.id}`, DEN_TRAINING, (fn) => fn(n(r.c1), n(r.c2))))) });
        if (r.type === "teach") beats.push({ pri: 4, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#34d399", fontWeight: 700, lineHeight: 1.4, padding: "4px 0" } }, "\u{1F46A} ", n(r.parent), " taught ", n(r.child), " ", r.trait.icon, " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff55" } }, ": ", r.trait.name)) });
        if (r.type === "found") beats.push({ pri: 5, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#fbbf24", lineHeight: 1.4, padding: "4px 0" } }, "\u{1F41F} ", n(r.cat), " found ", r.gold, "\u{1F41F}") });
        if (r.traitGained) beats.push({ pri: 4, el: /* @__PURE__ */ React.createElement("div", { key: beats.length, style: { fontSize: 11, color: "#fbbf24", fontWeight: 700, lineHeight: 1.4, padding: "4px 0" } }, "\u2728 ", n(r.traitGained.cat), " gained ", r.traitGained.trait.icon, " ", r.traitGained.trait.name) });
      });
      beats.sort((a, b) => a.pri - b.pri);
      const majors = beats.filter((b) => b.pri <= 1);
      const minors = beats.filter((b) => b.pri >= 2);
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minHeight: "100vh", zIndex: 1, gap: 10, padding: mob2 ? "16px 12px" : "20px", maxWidth: 550, overflowY: "auto", paddingTop: mob2 ? 30 : 40 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: mob2 ? 16 : 18, color: "#c084fc", letterSpacing: 4, margin: 0, animation: "fadeIn .6s ease-out" } }, "WHAT HAPPENED IN THE DARK"), denRes.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontSize: 13, fontStyle: "italic", textAlign: "center", lineHeight: 1.6, maxWidth: 340 } }, cpk(flavorCache, "denQuiet", DEN_QUIET, (fn) => fn())), majors.map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { width: "100%", animation: `slideInLeft .4s ease-out ${i * 0.4}s both` } }, b.el)), minors.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, width: "100%", maxWidth: 420, padding: "8px 12px", borderRadius: 10, background: "#ffffff04", border: "1px solid #ffffff08", animation: `slideInLeft .4s ease-out ${majors.length * 0.4 + 0.2}s both` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc88", letterSpacing: 4, textAlign: "center", fontWeight: 700, marginBottom: 4 } }, "DEN REPORT"), minors.map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { animation: `slideInLeft .3s ease-out ${majors.length * 0.6 + 0.5 + i * 0.15}s both` } }, b.el))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        const babies = [];
        denRes.filter((r) => r.type === "breed").forEach((r) => {
          babies.push(r.baby);
          if (r.twin2) babies.push(r.twin2);
        });
        setBabyNamingQueue([]);
        if (denStRef.current) clearTimeout(denStRef.current);
        setDenRes(null);
        if (babies.length > 0) {
          setBabyNamingQueue(babies);
          setNamingCat(babies[0]);
          setPh("naming");
        } else {
          nextBlind();
        }
      }, style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), marginTop: 8, padding: "10px 32px", fontSize: 14 } }, "The Sun Comes Up")));
    }
    if (ph === "shop") {
      const mb = getMB();
      const uAll = [...hand, ...draw, ...disc];
      const rc = 2 + ante + rerollCount;
      const interestPreview = Math.min(5, Math.floor(gold / 5));
      const ul = getUnlocks(meta);
      const nt = getNextTarget();
      return /* @__PURE__ */ React.createElement("div", { style: W }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement(Dust, null), /* @__PURE__ */ React.createElement("style", null, CSS), toasts.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: mob ? "auto" : 12, bottom: mob ? 80 : "auto", left: mob ? "50%" : "auto", right: mob ? "auto" : 12, transform: mob ? "translateX(-50%)" : "none", zIndex: 250, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none", maxWidth: mob ? 320 : 280, alignItems: mob ? "center" : "flex-end" } }, toasts.slice(0, mob ? 2 : 3).map((t) => /* @__PURE__ */ React.createElement("div", { key: t.id, style: { display: "flex", gap: 8, alignItems: "center", padding: t.big ? "12px 18px" : "8px 14px", borderRadius: t.big ? 10 : 8, background: "#1a1a2eee", border: `1.5px solid ${t.color}${t.big ? "66" : "44"}`, boxShadow: `0 4px 16px #00000066,0 0 ${t.big ? 16 : 8}px ${t.color}${t.big ? "44" : "22"}`, animation: `${t.neg ? "slideInLeft" : "slideInRight"} .3s ease-out` }, className: t.neg ? "toast-enter-neg" : "toast-enter" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: t.big ? 22 : 16, flexShrink: 0 } }, t.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: t.big ? 14 : 12, color: t.color, fontWeight: t.big ? 700 : 600, lineHeight: 1.3 } }, t.text)))), /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 700, padding: "10px 16px", zIndex: 1, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", paddingBottom: 100 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 20, color: "#fbbf24", letterSpacing: 4, margin: 0 } }, "THE MARKET"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: 900, color: "#fbbf24" } }, gold, " \u{1F41F}"), /* @__PURE__ */ React.createElement(ProgressMap, { ante, blind, mx: MX }))), /* @__PURE__ */ React.createElement(FM, { level: ferv, prev: pFerv }), (() => {
        const wSeed = (ante * 11 + blind * 7 + gold) % 10;
        if (wSeed > 3 || isFirstRun) return null;
        const wardCount = fams.length;
        const scrollsBought = Object.values(htLevels).filter((v) => typeof v === "number" && v > 1).length;
        const patternLine = wardCount >= 3 && scrollsBought === 0 ? "You always buy wards. Never scrolls. The keeper has noticed." : scrollsBought >= 2 && wardCount === 0 ? "All scrolls, no wards. The keeper raises an eyebrow." : gold > 15 ? "Carrying that many rations into a shop. The keeper has seen this before. They never spend it." : allC.filter((c) => c.scarred).length >= 3 ? "The hardened ones come through here a lot. The keeper nods with respect at the door now." : null;
        const line = patternLine || WHISPER_SHOP[(ante * 3 + blind) % WHISPER_SHOP.length];
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf2466", fontStyle: "italic", textAlign: "center", maxWidth: 320, lineHeight: 1.4, animation: "fadeIn 1.5s ease-out" } }, line);
      })(), !seen.shop && /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 18px", borderRadius: 10, background: "linear-gradient(145deg,#fbbf2408,#f59e0b04)", border: "1px solid #fbbf2433", fontSize: 12, color: "#e8e6e3cc", lineHeight: 1.7, textAlign: "left", maxWidth: 400, animation: "fadeIn .6s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 6, letterSpacing: 1 } }, "THE MARKET"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, "\u{1F41F} Rations"), " are currency. Spend them or save for ", /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80" } }, "interest"), "."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff55", marginTop: 2 } }, "Every 5\u{1F41F} saved = +1\u{1F41F} per round."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, display: "flex", flexDirection: "column", gap: 3 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, "\u{1F431} Cats"), ". stronger cats with traits boost your score"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, "\u{1F4DC} Scrolls"), ". level up hand types for bigger base scores"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, "\u{1F6E1}\uFE0F Wards"), ". passive bonuses that trigger every hand")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#ffffff06", border: "1px solid #ffffff0a" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24bb" } }, "\u{1F4A1} ", /* @__PURE__ */ React.createElement("b", null, "Season Devotion"), ": Play cats of one season to make that season stronger. Check progress in the Upgrades tab.")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, textAlign: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setSeen((s) => ({ ...s, shop: true })), style: { fontSize: 11, background: "linear-gradient(135deg,#fbbf24,#f59e0b)", border: "none", borderRadius: 5, color: "#0a0a1a", cursor: "pointer", padding: "5px 16px", fontWeight: 700 } }, "Got it"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 0, width: "100%", borderBottom: "1px solid #ffffff0a" } }, [["cats", "\u{1F431} Cats"], ["upgrades", "\u26A1 Upgrades"], ["colony", "\u{1F465} Colony"]].map(([id, label]) => {
        const isNudge = id === "upgrades" && shopTab !== "upgrades" && ((sFams.some((f) => f._starter) || sScrolls.length > 0) && fams.length === 0) || id === "upgrades" && shopTab !== "upgrades" && isFirstRun && fams.length === 0;
        return /* @__PURE__ */ React.createElement("button", { key: id, onClick: () => {
          setShopTab(id);
          if (id !== "colony") setSellMode(false);
        }, style: { flex: 1, padding: vw < 500 ? "12px 4px" : "8px 4px", fontSize: 12, fontWeight: shopTab === id ? 700 : 400, color: shopTab === id ? "#fbbf24" : isNudge ? "#fbbf24" : "#666", background: shopTab === id ? "#fbbf2408" : isNudge ? "#fbbf2406" : "transparent", border: "none", borderBottom: shopTab === id ? "2px solid #fbbf24" : isNudge ? "2px solid #fbbf2466" : "2px solid transparent", cursor: "pointer", transition: "all .15s", animation: isNudge ? "breathe 2s ease-in-out infinite" : "none" } }, label, isNudge ? " \u2726" : "");
      })), shopTab === "cats" && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", animation: "fadeIn .3s ease-out", background: "#fbbf2404", borderRadius: 10, padding: "8px 6px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center", padding: "4px 0 8px", borderBottom: "1px solid #ffffff08", marginBottom: 8 } }, (() => {
        const uAll2 = [...hand, ...draw, ...disc];
        const bCounts = {};
        uAll2.forEach((c) => {
          bCounts[c.breed] = (bCounts[c.breed] || 0) + 1;
        });
        return Object.entries(bCounts).sort(([, a], [, b]) => b - a).map(
          ([br, ct]) => /* @__PURE__ */ React.createElement("span", { key: br, style: { fontSize: 10, color: BREEDS[br]?.color || "#888", padding: "1px 5px", borderRadius: 3, background: BREEDS[br]?.color + "11", border: "1px solid " + BREEDS[br]?.color + "22" } }, BREEDS[br]?.icon, ct)
        );
      })(), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666", padding: "1px 5px" } }, [...hand, ...draw, ...disc].length, " cats \xB7 avg P", Math.round([...hand, ...draw, ...disc].reduce((s, c) => s + c.power, 0) / Math.max(1, [...hand, ...draw, ...disc].length)))), (() => {
        const featured = sCats.find((c) => c._headline);
        const strays = sCats.filter((c) => c._stray);
        const ftl = featured ? traitTierLabel(featured.trait) : null;
        return /* @__PURE__ */ React.createElement("div", null, featured && ftl && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 8, animation: "scorePop .5s ease-out .1s both" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: featured.trait.name === "Plain" ? "#4ade80" : ftl.color, letterSpacing: 2, marginBottom: 4, animation: "fadeIn .4s ease-out" } }, featured.trait.tier === "mythic" ? "\u2728 MYTHIC FIND" : featured.trait.tier === "legendary" ? "\u2B50 LEGENDARY FIND" : featured.trait.tier === "rare" ? "\u2605 RARE FIND" : featured.trait.tier === "rare_neg" ? "\u26A1 RISKY BET" : featured.trait.name !== "Plain" ? "\u2605 TRAINED CAT" : "FOR SALE"), /* @__PURE__ */ React.createElement("div", { onClick: () => buyCat(sCats.indexOf(featured)), style: { cursor: gold >= (featured._price || 4) ? "pointer" : "not-allowed", display: "flex", flexDirection: vw < 500 ? "column" : "row", gap: vw < 500 ? 6 : 12, alignItems: "center", padding: vw < 500 ? "12px 10px" : "8px 12px", borderRadius: 10, background: isHighTier(featured.trait) ? `linear-gradient(135deg,${ftl.color}08,${ftl.color}02)` : "#ffffff04", border: `1px solid ${isHighTier(featured.trait) ? ftl.color + "33" : "#ffffff0a"}`, transition: "all .15s" } }, /* @__PURE__ */ React.createElement(CC, { cat: featured, dis: gold < (featured._price || 4), onTraitClick: (ct) => setTraitTip(ct), cw: vw < 500 ? 70 : void 0 }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, textAlign: vw < 500 ? "center" : "left" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: BREEDS[featured.breed]?.color } }, featured.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginTop: 2 } }, "Power ", featured.power, " ", BREEDS[featured.breed]?.icon, " ", featured.breed, " ", featured.sex === "M" ? "\u2642" : "\u2640"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: featured.trait.name === "Plain" ? "#555" : tierColor(featured.trait), marginTop: 3 } }, featured.trait.name === "Plain" ? "No trait yet" : featured.trait.icon + " " + featured.trait.name + ": " + featured.trait.desc), (featured.extraTraits || []).map((t, ti) => /* @__PURE__ */ React.createElement("div", { key: ti, style: { fontSize: 12, color: tierColor(t), marginTop: 1 } }, "+", t.icon, " ", t.name, ": ", t.desc)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24", fontWeight: 700, marginTop: 4 } }, featured._price || 4, "\u{1F41F}")))), strays.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 6 } }, "STRAYS LOOKING FOR A HOME"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" } }, strays.map((c2, ri2) => {
          const ri = sCats.indexOf(c2);
          const p = c2._price || 2;
          const can = gold >= p;
          return /* @__PURE__ */ React.createElement("div", { key: c2.id, onClick: () => can && buyCat(ri), style: { cursor: can ? "pointer" : "not-allowed", textAlign: "center", flex: "1 1 80px", maxWidth: 110, padding: "8px 6px", borderRadius: 8, background: can ? "#ffffff04" : "#ffffff02", border: `1px solid ${can ? BREEDS[c2.breed].color + "33" : "#ffffff0a"}`, opacity: can ? 1 : 0.4, transition: "all .15s", animation: `scorePop .4s ease-out ${0.2 + ri2 * 0.15}s both` } }, /* @__PURE__ */ React.createElement(CC, { cat: c2, sm: true, dis: !can, onTraitClick: (ct) => setTraitTip(ct) }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: BREEDS[c2.breed].color, marginTop: 3, fontWeight: 700 } }, c2.name.split(" ")[0]), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888" } }, BREEDS[c2.breed].icon, " P", c2.power, " ", c2.sex === "M" ? "\u2642" : "\u2640"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24", fontWeight: 700, marginTop: 2 } }, p, "\u{1F41F}"));
        }))), !sCats.length && /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontSize: 10, textAlign: "center", padding: 16 } }, "Sold out"));
      })()), (shopTab === "upgrades" || shopTab === "scrolls" || shopTab === "wards") && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", animation: "fadeIn .3s ease-out", background: "#c084fc04", borderRadius: 10, padding: "8px 6px" } }, !seen.shop2 && /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px", borderRadius: 8, background: "#fbbf2408", border: "1px solid #fbbf2422", marginBottom: 10, animation: "fadeIn .6s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24cc", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("b", null, "\u{1F6E1}\uFE0F Wards"), " boost your score every hand.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("b", null, "\u{1F4DC} Scrolls"), " level up hand types for bigger bases.", /* @__PURE__ */ React.createElement("br", null), "Both shape your strategy."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, textAlign: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setSeen((s) => ({ ...s, shop2: true })), style: { fontSize: 10, background: "#fbbf24", border: "none", borderRadius: 4, color: "#0a0a1a", cursor: "pointer", padding: "3px 12px", fontWeight: 700 } }, "Got it"))), fams.length === 0 && sFams.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 14px", borderRadius: 8, background: "#4ade8008", border: "1px solid #4ade8033", marginBottom: 8, animation: "breathe 2s ease-in-out infinite" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4ade80", fontWeight: 700 } }, "\u{1F4A1} Buy a ward! They boost your score every hand.")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fcbb", letterSpacing: 2, marginBottom: 6 } }, "\u{1F6E1}\uFE0F WARDS FOR SALE"), sFams.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 } }, sFams.map((f, i) => {
        const wp = famPrice(f);
        const can = gold >= wp && fams.length < MF;
        const alreadyOwned = fams.some((owned) => owned.id === f.id);
        const isHtWard = !!f.htBonus;
        const colCats2 = [...hand, ...draw, ...disc];
        const hasSynergy = (() => {
          if (f.id === "f1") return colCats2.filter((c) => c.breed === "Autumn").length >= 3;
          if (f.id === "f2") return colCats2.filter((c) => c.breed === "Summer").length >= 3;
          if (f.id === "f3") return colCats2.filter((c) => c.breed === "Winter").length >= 3;
          if (f.id === "f4") return colCats2.filter((c) => c.breed === "Spring").length >= 3;
          if (f.id === "f9") return colCats2.some((c) => catHas(c, "Stubborn"));
          if (f.id === "f10") return colCats2.some((c) => catHas(c, "Wild") || catHas(c, "Chimera"));
          if (f.id === "f11") return colCats2.some((c) => catHas(c, "Echo"));
          if (f.id === "f12") return colCats2.some((c) => catHas(c, "Scrapper"));
          if (f.id === "f18") return colCats2.filter((c) => c.scarred).length >= 2;
          if (f.id === "f7") return colCats2.filter((c) => c.breed === colCats2[0]?.breed).length >= Math.ceil(colCats2.length * 0.6);
          return false;
        })();
        return /* @__PURE__ */ React.createElement("div", { key: f.id, onClick: () => can && buyFam(i), style: {
          flex: "1 1 140px",
          maxWidth: 180,
          padding: "10px 12px",
          borderRadius: 10,
          background: can ? f._starter ? "linear-gradient(145deg,#4ade8010,#4ade8004)" : isHtWard ? "linear-gradient(145deg,#c084fc06,#818cf804)" : "#ffffff06" : "#ffffff03",
          border: `1px solid ${can ? f._starter ? "#4ade8044" : isHtWard ? "#c084fc33" : "#ffffff15" : "#ffffff08"}`,
          cursor: can ? "pointer" : "default",
          opacity: can ? 1 : 0.4,
          transition: "all .15s",
          animation: f._starter && can ? "breathe 2s ease-in-out infinite" : `scorePop .4s ease-out ${0.1 + i * 0.15}s both`,
          boxShadow: f._starter && can ? "0 0 16px #4ade8033" : "none"
        } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16 } }, f.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: can ? "#fbbf24" : "#555", fontWeight: 700 } }, wp, "\u{1F41F}", f._starter ? /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80" } }, " STARTER") : "")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: isHtWard ? "#c084fc" : "#e8e6e3cc", marginTop: 4 } }, f.name, alreadyOwned && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 8, color: "#4ade80", marginLeft: 4, letterSpacing: 1, fontWeight: 400 } }, "OWNED")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", lineHeight: 1.4, marginTop: 2 } }, f.desc), isHtWard && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc88", marginTop: 3, letterSpacing: 1 } }, "HAND TYPE BONUS"), hasSynergy && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4ade80", marginTop: 3, letterSpacing: 1, fontWeight: 700 }, onClick: (e) => {
          e.stopPropagation();
          toast("\u2726", "SYNERGY means this ward matches your colony. It will score better for your current build.", "#4ade80", 4e3);
        } }, "\u2726 SYNERGY"), (() => {
          try {
            const sample = allC.slice(0, 5);
            const est = f.eff(sample);
            const mult = est.mult || 0;
            const chips = est.chips || 0;
            if (mult > 0 || chips > 0) return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4ade8088", marginTop: 2 } }, "Est. ", mult > 0 ? `+${mult}M` : "", mult > 0 && chips > 0 ? " " : "", chips > 0 ? `+${chips}C` : "", "/hand");
          } catch (e) {
          }
          return null;
        })());
      })) : !ul.fams && !isFirstRun ? /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontSize: 10, fontStyle: "italic", textAlign: "center", padding: 12, marginBottom: 12 } }, "\u{1F512} Complete a run to unlock Wards") : /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontSize: 10, textAlign: "center", padding: 12, marginBottom: 12 } }, "No wards available. The market keeper shrugs."), fams.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 4 } }, "EQUIPPED (", fams.length, "/", MF, ")"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } }, fams.map((f) => /* @__PURE__ */ React.createElement("div", { key: f.id, onClick: () => toast(f.icon, `${f.name}: ${f.desc}`, "#fbbf24"), style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, background: "#ffffff06", border: "1px solid #ffffff0a", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, f.icon), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#aaa" } }, f.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666" } }, f.desc)), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
        e.stopPropagation();
        sellFam(f);
      }, style: { fontSize: 10, color: "#ef4444aa", background: "none", border: "none", cursor: "pointer", padding: 0 }, title: "Sell for 3\u{1F41F}" }, "\u2715 3\u{1F41F}"))))), runCount >= 1 && sScrolls.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24bb", letterSpacing: 2, marginBottom: 6 } }, "\u{1F4DC} SCROLLS"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 } }, sScrolls.map((s, i) => {
        const can = gold >= s.price;
        return /* @__PURE__ */ React.createElement("div", { key: s.name, onClick: () => can && buyScroll(i), style: {
          flex: "1 1 140px",
          maxWidth: 180,
          padding: "10px 12px",
          borderRadius: 10,
          background: can ? "linear-gradient(145deg,#fbbf2406,#f59e0b04)" : "#ffffff04",
          border: `1px solid ${can ? "#fbbf2433" : "#ffffff0a"}`,
          cursor: can ? "pointer" : "default",
          opacity: can ? 1 : 0.4,
          transition: "all .15s"
        } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#fbbf24" } }, s.name), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: can ? "#fbbf24" : "#555", fontWeight: 700 } }, s.price, "\u{1F41F}")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", marginTop: 3 } }, "Lv", s.lv, " ", "\u2192", " Lv", s.nextLv, s.nextBase && /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80" } }, " (", s.nextBase.c, "C \xD7 ", s.nextBase.m, "M)")));
      }))), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid #ffffff0a", paddingTop: 8, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 4 } }, "HAND LEVELS"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap" } }, HT.filter((h) => !h.hidden).map((h) => {
        const lv = getHtLevel(h.name, htLevels);
        const sc = getHtScaled(h, lv);
        return /* @__PURE__ */ React.createElement("div", { key: h.name, style: { padding: "2px 6px", borderRadius: 4, background: lv > 1 ? "#fbbf2408" : "transparent", border: lv > 1 ? "1px solid #fbbf2422" : "1px solid #ffffff08", fontSize: 10, color: lv > 1 ? "#fbbf24" : "#555" } }, h.name, lv > 1 ? ` Lv${lv}` : "", " ", /* @__PURE__ */ React.createElement("span", { style: { color: lv > 1 ? "#4ade80" : "#444" } }, sc.c, "\xD7", sc.m));
      }))), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid #ffffff0a", paddingTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 6 } }, "SEASON DEVOTION"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, Object.keys(DEVOTION_MILESTONES).map((breed) => {
        const dev = getDevotionLevel(breed, devotion);
        const color = BREEDS[breed]?.color || "#888";
        const icon = BREEDS[breed]?.icon || "?";
        return /* @__PURE__ */ React.createElement("div", { key: breed, style: { padding: "6px 10px", borderRadius: 8, background: dev.count > 0 ? color + "08" : "transparent", border: `1px solid ${dev.count > 0 ? color + "22" : "#ffffff08"}` } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color, fontWeight: 700 } }, icon, " ", breed), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: color + "88" } }, dev.count, " played")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2, marginBottom: 4 } }, (DEVOTION_MILESTONES[breed] || []).map((m, i) => {
          const unlocked = dev.count >= m.at;
          const pct = unlocked ? 100 : Math.min(100, dev.count / m.at * 100);
          return /* @__PURE__ */ React.createElement("div", { key: i, style: { flex: 1, height: 4, borderRadius: 2, background: "#ffffff0a", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${pct}%`, background: unlocked ? color : color + "44", borderRadius: 2, transition: "width .3s" } }));
        })), dev.unlocked.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 10, color: color + "99" } }, "\u2713 " + m.name + ": " + m.desc)), dev.next && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666" } }, "\u25CB " + dev.next.at + " plays: " + dev.next.name + ": " + dev.next.desc));
      })))), shopTab === "colony" && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", animation: "fadeIn .3s ease-out", background: "#4ade8004", borderRadius: 10, padding: "8px 6px" } }, (() => {
        const ds = getDeckStats();
        return /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 12px", borderRadius: 8, background: "#ffffff06", border: "1px solid #ffffff0a", fontSize: 10, display: "flex", gap: 6, flexWrap: "wrap", color: "#888", marginBottom: 8, lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700, color: "#e8e6e3" } }, uAll.length, " cats"), /* @__PURE__ */ React.createElement("span", { style: { color: "#666" } }, "\xB7"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4 } }, Object.entries(ds.bc).sort(([, a], [, b]) => b - a).map(([br, ct]) => /* @__PURE__ */ React.createElement("span", { key: br, style: { color: BREEDS[br]?.color || "#888" } }, BREEDS[br]?.icon, ct))), /* @__PURE__ */ React.createElement("span", { style: { color: "#666" } }, "\xB7"), /* @__PURE__ */ React.createElement("span", null, "Avg Power ", ds.avgPow), /* @__PURE__ */ React.createElement("span", { style: { color: "#666" } }, "\xB7"), /* @__PURE__ */ React.createElement("span", { style: { color: "#60a5fa" } }, "\u2642 ", ds.gc.M, " male"), /* @__PURE__ */ React.createElement("span", { style: { color: "#f472b6" } }, "\u2640 ", ds.gc.F, " female"), ds.scarred > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "#666" } }, "\xB7"), /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, "\u2694 ", ds.scarred, " hardened")), ds.bonded > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "#666" } }, "\xB7"), /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80" } }, "\u{1F495} ", ds.bonded, " bonded")));
      })(), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: sellMode ? "#c084fc" : "#888", fontWeight: sellMode ? 700 : 400 } }, sellMode ? /* @__PURE__ */ React.createElement("span", null, "\u{1F54A}\uFE0F THE LETTING GO ", /* @__PURE__ */ React.createElement("span", { style: { color: sellsLeft > 0 ? "#4ade80" : "#ef4444" } }, "(", sellsLeft, " left)")) : /* @__PURE__ */ React.createElement("span", null, "YOUR COLONY")), /* @__PURE__ */ React.createElement("button", { onClick: () => setSellMode(!sellMode), style: { fontSize: 10, padding: "4px 12px", borderRadius: 6, border: `1px solid ${sellMode ? "#c084fc44" : "#fbbf2444"}`, background: sellMode ? "#c084fc11" : "transparent", color: sellMode ? "#c084fc" : "#fbbf24", cursor: "pointer" } }, sellMode ? "Done" : "Let Go...")), sellMode && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fcbb", marginBottom: 6, fontStyle: "italic" } }, "Each departure costs 1 Nerve. Scarred cats leave without penalty. Tap a cat to release them."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", maxHeight: 300, overflowY: "auto", paddingBottom: 4 } }, uAll.map((c) => {
        const pg = getPartingGifts(c);
        const canSell = sellMode && sellsLeft > 0 && uAll.length > 8 && (pg.goldVal >= 0 || gold >= Math.abs(pg.goldVal));
        return /* @__PURE__ */ React.createElement("div", { key: c.id, style: { position: "relative", textAlign: "center" }, className: "scroll-reveal" }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true, onClick: sellMode && canSell ? () => {
          const isValuable = c.epithet || c.bondedTo || (c.trait || PLAIN).name !== "Plain" || c.power >= 6 || c.scarred;
          if (isValuable) setSellConfirm(c);
          else sellCat(c);
        } : !sellMode ? () => setInspectCat(c) : void 0, dis: sellMode && !canSell, onTraitClick: (ct) => setTraitTip(ct) }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: BREEDS[c.breed]?.color || "#888", marginTop: 1, maxWidth: 88, lineHeight: 1, whiteSpace: "nowrap" } }, c.name.split(" ")[0]), sellMode && canSell && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 2, right: 2, fontSize: 10, color: "#c084fc", fontWeight: 700, background: "#000000dd", borderRadius: 3, padding: "1px 3px", cursor: "pointer", maxWidth: 72, lineHeight: 1.3 } }, pg.goldVal > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80" } }, "+", pg.goldVal, "\u{1F41F} "), !cat.scarred && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "-1\u{1F525} "), pg.gifts.map((g, gi) => /* @__PURE__ */ React.createElement("span", { key: gi, style: { color: "#c084fc" } }, g, " ")), pg.goldVal === 0 && pg.gifts.length === 0 && cat.scarred && /* @__PURE__ */ React.createElement("span", { style: { color: "#888" } }, "free")));
      })), sellConfirm && sellMode && (() => {
        const sc = sellConfirm;
        const pg = getPartingGifts(sc);
        const n = sc.name.split(" ")[0];
        const mate = sc.bondedTo ? uAll.find((x) => x.id === sc.bondedTo) : null;
        const mn = mate?.name.split(" ")[0];
        return /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 360, padding: "12px 16px", borderRadius: 10, background: "linear-gradient(145deg,#1b1133,#0d0d1a)", border: "1px solid #c084fc44", animation: "fadeIn .3s ease-out", marginTop: 6, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#c084fc", fontWeight: 700, marginBottom: 6 } }, "Let ", n, " go?"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ffffffaa", lineHeight: 1.6, marginBottom: 8 } }, !sc.scarred && /* @__PURE__ */ React.createElement("div", { style: { color: "#ef4444" } }, "Costs 1 Nerve. ", n, " wasn't scarred."), sc.scarred && /* @__PURE__ */ React.createElement("div", { style: { color: "#4ade80" } }, "No Nerve cost. Scarred cats leave freely."), mate && /* @__PURE__ */ React.createElement("div", { style: { color: "#f472b6", marginTop: 3 } }, "Bonded to ", mn, ". ", mn, " loses the bond and gains +2 Power from the grief."), pg.goldVal > 0 && /* @__PURE__ */ React.createElement("div", { style: { color: "#fbbf24", marginTop: 3 } }, "The colony receives ", pg.goldVal, "\u{1F41F}."), sc.epithet && /* @__PURE__ */ React.createElement("div", { style: { color: "#fbbf24aa", marginTop: 3 } }, 'Carries the title "', sc.epithet, '."'), (sc.stats?.tp || 0) > 0 && /* @__PURE__ */ React.createElement("div", { style: { color: "#888", marginTop: 3 } }, "Played ", sc.stats.tp, " hands. Best: ", (sc.stats?.bs || 0).toLocaleString(), ".")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setSellConfirm(null), style: { fontSize: 12, padding: "8px 20px", borderRadius: 6, border: "1px solid #ffffff22", background: "transparent", color: "#888", cursor: "pointer", minHeight: 36 } }, "Keep ", n), /* @__PURE__ */ React.createElement("button", { onClick: () => {
          sellCat(sc);
          setSellConfirm(null);
        }, style: { fontSize: 12, padding: "8px 20px", borderRadius: 6, border: "1px solid #c084fc66", background: "#c084fc18", color: "#c084fc", cursor: "pointer", fontWeight: 700, minHeight: 36 } }, "Let go")));
      })()), shopTab !== "colony" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 8, marginTop: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: reroll, disabled: gold < rc, style: { ...BTN("#1a1a2e", "#fbbf24", gold >= rc), border: `1px solid ${gold >= rc ? "#fbbf2444" : "#222"}`, fontSize: 11 }, title: "Rerolls cats, wards, and scrolls. Cost increases each time." }, "Reroll All (", rc, "\u{1F41F}", rerollCount > 0 ? " \u2191" : "", ")"), ante >= 3 && /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (goldRef.current < 6) return;
        goldRef.current -= 6;
        Audio.buy();
        setGold((g) => g - 6);
        const ac2 = [...hand, ...draw, ...disc];
        const targets = shuf(ac2).slice(0, 3);
        targets.forEach((t) => {
          [setHand, setDraw, setDisc].forEach((s) => {
            s((arr) => arr.map((x) => x.id === t.id ? { ...x, power: Math.min(15, x.power + 1) } : x));
          });
        });
        toast("\u26A1", `${targets.map((t) => t.name.split(" ")[0]).join(", ")} trained. +1P each.`, "#4ade80");
      }, disabled: gold < 6, style: { ...BTN("#1a1a2e", "#4ade80", gold >= 6), border: `1px solid ${gold >= 6 ? "#4ade8044" : "#222"}`, fontSize: 11 } }, "Train (6\u{1F41F})"))), /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "linear-gradient(180deg,transparent,#0a0a1a 8px,#0a0a1a)", padding: "8px 16px 12px", display: "flex", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 700, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { onClick: () => toast("\u{1F41F}", `Rations: ${gold}\u{1F41F}. Spend in the Market on cats, wards, scrolls. Earn more by scoring higher. Save 5+ for interest.`, "#fbbf24", 5e3), style: { color: "#fbbf24", fontSize: 14, fontWeight: 700, cursor: "help" } }, "\u{1F41F}", gold), runCount >= 1 && interestPreview > 0 && /* @__PURE__ */ React.createElement("span", { onClick: () => toast("\u{1F4C8}", `Interest: +${interestPreview}\u{1F41F} next round (floor of Rations\xF75, max 5). Save Rations to earn more.`, "#4ade80"), style: { color: "#4ade80", fontSize: 10, cursor: "help" } }, "+", interestPreview, " stores", interestPreview >= 5 ? " MAX" : ""), /* @__PURE__ */ React.createElement("span", { onClick: () => toast("\u2726", `Stardust: ${meta?.dust || 0}\u2726. Meta-currency from Hearth cats. Spend on permanent upgrades between runs.`, "#c084fc", 4e3), style: { color: "#c084fc", fontSize: 10, cursor: "help" } }, "\u2726", meta?.dust || 0)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888" } }, nt ? /* @__PURE__ */ React.createElement("span", { onClick: () => toast("\u{1F3AF}", `Target: ${nt.target.toLocaleString()}. Score this much total across all hands to clear ${nt.blindName}. Boss blinds injure cats on failed hands.`, "#fbbf24"), style: { cursor: "help" } }, nt.blind === 2 ? /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444", fontWeight: 700 } }, boss?.icon || "\u{1F441}\uFE0F", " ", nt.blindName, " approaches") : /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, nt.blindName, " falls"), " \xB7 Night ", nt.ante, " \xB7 ", /* @__PURE__ */ React.createElement("span", { style: { color: "#e8e6e3", fontWeight: 700 } }, nt.target.toLocaleString()), " to survive") : /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80", fontWeight: 700 } }, "Dawn approaches..."))), blind >= 2 ? /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setDen([]);
        setPh("denSelect");
      }, style: { ...BTN("linear-gradient(135deg,#c084fc,#a855f7)", "#fff"), padding: "10px 20px", fontSize: 12 } }, "\u{1F319} Into the Den") : /* @__PURE__ */ React.createElement("button", { onClick: () => {
        fireEvent();
      }, style: { ...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)", "#0a0a1a"), padding: "10px 20px", fontSize: 12 } }, nt ? nt.blindName + " awaits \u2192" : "Face the dawn \u2192"))));
    }
    const isNL = ferv === NERVE_MAX;
    function getHint(cat2) {
      if (!sel.size) return null;
      let g = false;
      selC.forEach((s) => {
        if (hasGrudge(cat2, s)) g = true;
      });
      return g ? { grudge: true } : null;
    }
    return /* @__PURE__ */ React.createElement("div", { style: { ...W, animation: fFlash === "down" ? "shake .3s ease" : "none" } }, /* @__PURE__ */ React.createElement("div", { style: BG }), /* @__PURE__ */ React.createElement("style", null, CSS), isNL && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, border: "2px solid #fef08a44", pointerEvents: "none", zIndex: 50, animation: "glow 2s ease-in-out infinite" } }), reshuf && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: "40%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 200, animation: "flash .8s ease-out forwards", fontSize: 13, color: "#fbbf24", letterSpacing: 4, fontWeight: 700, whiteSpace: "nowrap" } }, "\u267B RESHUFFLE"), toasts.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: mob ? "auto" : 12, bottom: mob ? 80 : "auto", left: mob ? "50%" : "auto", right: mob ? "auto" : 12, transform: mob ? "translateX(-50%)" : "none", zIndex: 250, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none", maxWidth: mob ? 320 : 280, alignItems: mob ? "center" : "flex-end" } }, toasts.slice(0, mob ? 2 : 3).map((t) => /* @__PURE__ */ React.createElement("div", { key: t.id, style: { display: "flex", gap: 8, alignItems: "center", padding: t.big ? "12px 18px" : "8px 14px", borderRadius: t.big ? 10 : 8, background: "#1a1a2eee", border: `1.5px solid ${t.color}${t.big ? "66" : "44"}`, boxShadow: `0 4px 16px #00000066,0 0 ${t.big ? 16 : 8}px ${t.color}${t.big ? "44" : "22"}`, animation: `${t.neg ? "slideInLeft" : "slideInRight"} .3s ease-out` }, className: t.neg ? "toast-enter-neg" : "toast-enter" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: t.big ? 22 : 16, flexShrink: 0 } }, t.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: t.big ? 14 : 12, color: t.color, fontWeight: t.big ? 700 : 600, lineHeight: 1.3 } }, t.text)))), autoPlay && ph === "playing" && (() => {
      const step = autoPlay.step;
      const isUiTour = step < 0;
      const tourSteps = [
        { step: -3, title: "YOUR FIRST NIGHT", msg: "Welcome. I'll play the first hand to show you how scoring works. Just watch.", highlight: null, pos: "center" },
        { step: -2, title: "SCORE & TARGET", msg: "This is your score target. Score enough total across your hands to survive each round.", highlight: "score", pos: "top" },
        { step: -1, title: "YOUR COLONY", msg: "These are your cats. Same-season cats score much better together. Watch. I'll show you.", highlight: "hand", pos: "bottom" }
      ];
      const tour = tourSteps.find((t) => t.step === step);
      if (isUiTour && tour) return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000000dd", zIndex: 140, pointerEvents: "auto" }, onClick: () => setAutoPlay((a) => a ? { ...a, step: a.step + 1 } : null) }), tour.highlight === "score" && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 0, left: "30%", right: "30%", height: 60, border: "2px solid #fbbf2466", borderRadius: 12, boxShadow: "0 0 20px #fbbf2444,inset 0 0 20px #fbbf2422", zIndex: 141, pointerEvents: "none", animation: "guidePulse 1.5s ease-in-out infinite" } }), tour.highlight === "hand" && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: "40%", left: "5%", right: "5%", height: 180, border: "2px solid #4ade8066", borderRadius: 12, boxShadow: "0 0 20px #4ade8044,inset 0 0 20px #4ade8022", zIndex: 141, pointerEvents: "none", animation: "guidePulse 1.5s ease-in-out infinite" } }), /* @__PURE__ */ React.createElement("div", { style: {
        position: "fixed",
        top: tour.pos === "center" ? "35%" : tour.pos === "top" ? 80 : "auto",
        bottom: tour.pos === "bottom" ? 240 : "auto",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 142,
        padding: "20px 28px",
        borderRadius: 14,
        background: "#0d1117",
        border: "1.5px solid #fbbf2444",
        maxWidth: 360,
        animation: "fadeIn .5s ease-out",
        textAlign: "center",
        boxShadow: "0 12px 48px #00000099"
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2488", letterSpacing: 4, marginBottom: 6 } }, tour.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#e8e6e3", lineHeight: 1.6 } }, tour.msg), /* @__PURE__ */ React.createElement("button", { onClick: () => setAutoPlay((a) => a ? { ...a, step: a.step + 1 } : null), style: { marginTop: 12, fontSize: 12, background: "linear-gradient(135deg,#fbbf24,#f59e0b)", border: "none", borderRadius: 6, color: "#0a0a1a", cursor: "pointer", padding: "8px 20px", fontWeight: 700, letterSpacing: 1 } }, step === -1 ? "Show me \u2192" : "Next \u2192"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (autoRef.current) clearTimeout(autoRef.current);
        if (stRef.current) clearTimeout(stRef.current);
        setSel(/* @__PURE__ */ new Set());
        setAutoPlay(null);
        setGuide({ step: 3, msg: "" });
      }, style: { fontSize: 10, background: "none", border: "none", color: "#ffffff66", cursor: "pointer", padding: "3px 10px" } }, "Skip tutorial"))));
      if (step === 0 && !autoRef.current) {
        autoRef.current = setTimeout(() => {
          let ci = 0;
          function selectNext() {
            if (ci >= autoPlay.idxs.length) {
              setAutoPlay((a) => a ? { ...a, step: 3 } : null);
              autoRef.current = setTimeout(() => {
                const cats = autoPlay.idxs.map((i) => hand[i]).filter(Boolean);
                if (cats.length >= 1) {
                  let getAutoStepDelay22 = function(s) {
                    const tempo = Math.max(0.5, Math.min(1.4, 7 / tot));
                    const slow = 1.8;
                    const st = result.bd[s];
                    const isLast = s === tot - 1;
                    const isPenult = s === tot - 2;
                    if (st && (st.mult < 0 || st.type === "curse" || st.type === "grudge_tension")) return Math.round(200 * tempo * slow);
                    if (st && st.xMult && st.xMult >= 2) return Math.round(Math.max(900, 1100 * Math.max(0.7, tempo)) * slow);
                    if (st && st.xMult) return Math.round(Math.max(700, 900 * Math.max(0.7, tempo)) * slow);
                    if (st && st.type === "nerve") return Math.round(Math.max(650, 850 * Math.max(0.7, tempo)) * slow);
                    if (st && (st.type === "bond" || st.type === "lineage")) return Math.round(Math.max(450, 600 * tempo) * slow);
                    if (st && st.type === "fam") return Math.round(Math.max(400, 550 * tempo) * slow);
                    if (isPenult) return Math.round(Math.max(370, 520 * tempo) * slow);
                    if (isLast) return Math.round(Math.max(470, 670 * tempo) * slow);
                    if (s === 0) return Math.round(1200 * tempo * slow);
                    if (st?.isBigCat) return Math.round(Math.max(450, 580 * tempo) * slow);
                    if (s === 1) return Math.round(500 * tempo * slow);
                    if (s <= 3) return Math.round(420 * tempo * slow);
                    return Math.round(Math.max(100, (250 - s * 5) * tempo) * slow);
                  }, animStep22 = function() {
                    stp++;
                    if (stp < tot) {
                      setSStep(stp);
                      setRunChips(stepTotals[stp].chips);
                      setRunMult(stepTotals[stp].mult);
                      const progress = stepTotals[stp].total / (result.total || 1);
                      const s2 = result.bd[stp];
                      if (s2) {
                        if (s2.xMult) {
                          Audio.xMultSlam(s2.xMult); Haptic.heavy();
                          setScoreShake(Math.ceil(s2.xMult));
                          setTimeout(() => setScoreShake(0), 300);
                          setScoringFlash(s2.xMult >= 1.5 ? "#fef08a" : "#fbbf24");
                          setTimeout(() => setScoringFlash(null), 150);
                          setMultPop({ val: s2.xMult, label: s2.label, mode: "xmult" });
                          setTimeout(() => setMultPop(null), 1200);
                        } else if (s2.type === "hand") {
                          Audio.comboHit();
                          setScoringFlash("#fbbf24");
                          setScoreShake(2);
                          setTimeout(() => {
                            setScoreShake(0);
                            setScoringFlash(null);
                          }, 250);
                        } else if (s2.type === "combo") {
                          Audio.comboHit();
                          setScoreShake(3);
                          setScoringFlash("#c084fc");
                          setTimeout(() => {
                            setScoreShake(0);
                            setScoringFlash(null);
                          }, 300);
                        } else if (s2.type === "grudge_tension") Audio.grudgeTense();
                        else if (s2.type === "grudge_prove") Audio.grudgeProve();
                        else if (s2.type === "bond" || s2.type === "lineage") Audio.bondChime();
                        else if (s2.type === "xp_rank") Audio.bondChime();
                        else if (s2.isBigCat) Audio.bigCatHit(progress);
                        else if (s2.mult > 0) Audio.multHit(s2.mult, progress);
                        else if (s2.chips > 0) Audio.chipUp(s2.chips, progress); Haptic.cascade();
                      }
                      stRef.current = setTimeout(animStep22, getAutoStepDelay22(stp));
                    } else {
                      const end = scoreEndRef.current;
                      setRunChips(end.chips);
                      setRunMult(end.mult);
                      setScoreShake(end.shk);
                      setTimeout(() => setScoreShake(0), 400 + end.shk * 100);
                      const prev = handBests[end.ht] || 0;
                      if (end.total > prev) {
                        setHandBests((b) => ({ ...b, [end.ht]: end.total }));
                        setNewBest(end.ht);
                      }
                      checkHandDiscovery(end.ht, end.combo);
                      setAftermath(end.aft);
                      setScoringDone(true);
                      const tier = getScoreTier(end.total);
                      if (tier && tier.label) Audio.tierReveal(Math.min(5, Math.floor(end.total / 5e3)));
                    }
                  };
                  var getAutoStepDelay2 = getAutoStepDelay22, animStep2 = animStep22;
                  setScoringCats(cats);
                  setAftermath([]);
                  setFirstHandPlayed(true);
                  Audio.cardPlay(); Haptic.medium();
                  const beatingPace = rScore >= eTgt() * 0.4;
                  const activeBT = blind === 2 ? bossTraits : [];
                  const result = calcScore(cats, fams, ferv, cfx, { gold, deckSize: allC.length, discSize: disc.length, handSize: hs(), beatingPace, bossTraitFx: activeBT, scarMult: getMB().scarMult || 0, grudgeWisdom: getMB().grudgeWisdom || 0, hasMastery: !!getMB().xp, bondBoost: getMB().bondBoost || 0, comboBoost: getMB().comboBoost || 0, doubleBench: getMB().doubleBench || 0, kindredMult: tempMods.kindredMult || 0, weatherSeason: weather?.season || null, nightModFx: nightMod?.fx || {}, lastHandIds, lastHandLost, lastHandType, htLevels, devotion, bench: hand.filter((c) => !cats.find((x) => x.id === c.id)) });
                  advancingRef.current = false;
                  setSRes(result);
                  setSStep(-1);
                  setPh("scoring");
                  setRunChips(0);
                  setRunMult(0);
                  setNewBest(null);
                  setHandDiscovery([]);
                  let rC = 0, rM = 0;
                  const stepTotals = result.bd.map((s) => {
                    rC += s.chips || 0;
                    rM += s.mult || 0;
                    if (s.xMult) rM = Math.round(rM * s.xMult);
                    return { chips: Math.max(0, rC), mult: Math.max(1, rM), total: Math.max(0, rC) * Math.max(1, rM) };
                  });
                  const aft = [];
                  cats.forEach((c) => {
                    const oldXP = getCatXP(c.stats.tp, !!getMB().xp);
                    const newXP = getCatXP(c.stats.tp + 1, !!getMB().xp);
                    if (newXP && oldXP && newXP.label !== oldXP.label && newXP.bonus.mult > 0) aft.push({ icon: newXP.icon, text: `${c.name.split(" ")[0]}: ${newXP.label}!`, color: newXP.color });
                    if (result.total > c.stats.bs && c.stats.bs > 0) aft.push({ icon: "\u{1F3C6}", text: `${c.name.split(" ")[0]} PB: ${result.total.toLocaleString()}`, color: "#fbbf24" });
                  });
                  const catSteps = result.bd.filter((s) => s.catIdx !== void 0 && s.type !== "xp_rank");
                  if (catSteps.length > 0 && cats.length >= 2) {
                    const contribs = catSteps.map((s) => {
                      const t = stepTotals[result.bd.indexOf(s)]?.total || 0;
                      const prev = result.bd.indexOf(s) > 0 ? stepTotals[result.bd.indexOf(s) - 1]?.total || 0 : 0;
                      return { cat: cats[s.catIdx], delta: t - prev };
                    });
                    const totalDelta = contribs.reduce((s, c) => s + c.delta, 0);
                    const best2 = contribs.sort((a, b) => b.delta - a.delta)[0];
                    if (best2 && totalDelta > 0 && best2.delta / totalDelta > 0.45) {
                      const fn2 = best2.cat.name.split(" ")[0];
                      const pct2 = Math.round(best2.delta / totalDelta * 100);
                      aft.push({ icon: "\u{1F4AA}", text: pk(CAT_REACTIONS.carry(fn2, pct2)), color: BREEDS[best2.cat.breed]?.color || "#fbbf24" });
                    }
                  }
                  const bondedInHand = cats.filter((c) => c.bondedTo && cats.find((x) => x.id === c.bondedTo));
                  if (bondedInHand.length >= 2) {
                    const a2 = bondedInHand[0].name.split(" ")[0], bN2 = bondedInHand[1].name.split(" ")[0];
                    aft.push({ icon: "\u{1F495}", text: pk(CAT_REACTIONS.bond(a2, bN2)), color: "#f472b6" });
                  }
                  scoreEndRef.current = { chips: result.chips, mult: result.mult, total: result.total, ht: result.ht, combo: result.combo, aft, shk: getShakeIntensity(result.total), isFirstCascade: true, stepTotals };
                  let stp = -1;
                  const tot = result.bd.length;
                  stRef.current = setTimeout(() => {
                    {
                      const _hti = HT.findIndex((h) => h.name === result.ht);
                      Audio.handType(Math.min(3, Math.floor((_hti >= 0 ? _hti : 4) / 2)));
                    }
                    animStep22();
                  }, 800);
                }
              }, 2500);
              return;
            }
            const idx = autoPlay.idxs[ci];
            const cat2 = hand[idx];
            setSel((prev) => {
              const ns = new Set(prev);
              ns.add(idx);
              return ns;
            });
            Audio.cardSelect(); Haptic.light();
            if (cat2) toast(BREEDS[cat2.breed]?.icon || "\u{1F431}", `${cat2.name.split(" ")[0]} selected (${cat2.breed})`, BREEDS[cat2.breed]?.color || "#fbbf24", 1500);
            setAutoPlay((a) => a ? { ...a, step: ci === 0 ? 1 : 2 } : null);
            ci++;
            autoRef.current = setTimeout(selectNext, 1200);
          }
          autoRef.current = setTimeout(selectNext, 1e3);
        }, 1500);
      }
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 130, pointerEvents: "auto", background: "transparent" }, onClick: (e) => e.stopPropagation() }), /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: mob ? 70 : 60, left: "50%", transform: "translateX(-50%)", zIndex: 150, padding: "16px 28px", borderRadius: 14, background: "#0a0a1aee", border: "1.5px solid #4ade8044", maxWidth: 360, animation: "fadeIn .6s ease-out", textAlign: "center", boxShadow: "0 8px 32px #00000088" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade8066", letterSpacing: 3, marginBottom: 4 } }, "\u{1F440} WATCHING THE DEMO"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, color: "#4ade80", fontWeight: 700, marginBottom: 6 } }, step === 0 ? "Selecting same-season cats..." : step <= 2 ? `Selecting cats... (${Math.min(sel.size, autoPlay.idxs.length)}/${autoPlay.idxs.length})` : "Playing the hand..."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4ade80aa", lineHeight: 1.5 } }, step <= 2 ? "Same season = stronger hand. Watch which cards light up." : "Now watch how chips \xD7 mult builds the score..."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff66", marginTop: 6, fontStyle: "italic" } }, "Sit back. you'll play the next hand yourself."), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (autoRef.current) clearTimeout(autoRef.current);
        if (stRef.current) clearTimeout(stRef.current);
        setSel(/* @__PURE__ */ new Set());
        setAutoPlay(null);
        setGuide({ step: 3, msg: "" });
      }, style: { marginTop: 8, fontSize: 10, background: "none", border: "1px solid #4ade8033", borderRadius: 4, color: "#4ade8066", cursor: "pointer", padding: "3px 10px" } }, "Skip demo \u2192")));
    })(), guide && !autoPlay && ante === 1 && blind === 0 && ph === "playing" && (() => {
      const selCats = [...sel].map((i) => hand[i]).filter(Boolean);
      const breedCounts = {};
      selCats.forEach((c) => {
        breedCounts[c.breed] = (breedCounts[c.breed] || 0) + 1;
      });
      const hasPair = Object.values(breedCounts).some((v) => v >= 2);
      const pairBreed = hand.reduce((acc, c) => {
        acc[c.breed] = (acc[c.breed] || 0) + 1;
        return acc;
      }, {});
      const suggestBreed = Object.entries(pairBreed).sort((a, b) => b[1] - a[1]).find(([, v]) => v >= 2);
      let msg = "", sub = "";
      if (guide.step === 0) {
        const bIcon = suggestBreed ? BREEDS[suggestBreed[0]]?.icon : "";
        msg = `${bIcon} Tap cats of the same season`;
        sub = "Match the colored borders. Same-season cats score much higher together.";
      } else if (guide.step === 1) {
        const ht = evalH?.(selCats);
        msg = `\u2728 ${ht?.name || "Hand"}${ht?.ex ? " (" + ht.ex + ")" : ""} ready! Hit Play \u25B6`;
        sub = "Watch how your cats score. More same-season = bigger numbers.";
      } else if (guide.step === 2) {
        msg = "Each cat adds Power (score) + Trait (bonus).";
        sub = "Blue numbers = Power. Red numbers = Bonus. Same-season groups multiply everything.";
      } else if (guide.step === 3) {
        const need = Math.max(0, tgt - rScore);
        const postAuto = !autoPlay && isFirstRun && ante === 1 && blind === 0 && hLeft >= 2;
        msg = postAuto ? "Your turn! \u{1F3AE}" : need > 0 ? hLeft === 1 ? "\u26A0 LAST HAND" : "Need " + need.toLocaleString() + " more" : "Cleared! \u{1F389}";
        sub = postAuto ? "Tap same-season cats \u2192 Play. Beat the target to survive." : "";
      }
      return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: guide.step >= 2 ? 280 : 220, left: "50%", transform: "translateX(-50%)", zIndex: 150, padding: "12px 20px", borderRadius: 10, background: "#0a0a1aee", border: "1px solid #fbbf2444", maxWidth: 320, animation: "fadeIn .6s ease-out", textAlign: "center", boxShadow: "0 8px 32px #00000088" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#fbbf24", fontWeight: 700 } }, msg), sub && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24aa", marginTop: 4, lineHeight: 1.5 } }, sub), guide.step <= 2 ? /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (guide.step === 0) setGuide((g) => ({ ...g, step: 1 }));
        else if (guide.step === 1) setGuide((g) => ({ ...g, step: 2 }));
        else if (guide.step === 2) setGuide((g) => ({ ...g, step: 3 }));
      }, style: { marginTop: 8, fontSize: 11, background: "#fbbf2422", border: "1px solid #fbbf2444", borderRadius: 6, color: "#fbbf24", cursor: "pointer", padding: "5px 16px", fontWeight: 700, letterSpacing: 1 } }, "Next \u2192") : /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setGuide(null);
        setSeen((s) => ({ ...s, guided: true }));
        setTimeout(() => toast("\u{1F4A1}", "Tip: Discard swaps cats for new draws. Tap it to try!", "#fbbf2488", 4e3), 2e3);
      }, style: { marginTop: 8, fontSize: 11, background: "#fbbf2422", border: "1px solid #fbbf2444", borderRadius: 6, color: "#fbbf24", cursor: "pointer", padding: "5px 16px", fontWeight: 700, letterSpacing: 1 } }, "Got it"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, justifyContent: "center", marginTop: 6 } }, [0, 1, 2, 3].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { width: 6, height: 6, borderRadius: "50%", background: i === guide.step ? "#fbbf24" : i < guide.step ? "#fbbf2444" : "#333", transition: "all .15s" } }))));
    })(), /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 700, padding: mob ? "6px 12px" : "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1, borderBottom: `1px solid ${isBoss ? "#ef444422" : "#ffffff0a"}` } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#888", letterSpacing: 2 } }, "NIGHT ", ante, "/", MX, !mob && /* @__PURE__ */ React.createElement("span", { style: { color: "#666" } }, " Round ", blind + 1, "/3"), !mob && /* @__PURE__ */ React.createElement("span", { style: { color: "#ffffff22", marginLeft: 6, fontSize: 9, letterSpacing: 3 } }, NIGHT_PLACES[Math.min(ante - 1, NIGHT_PLACES.length - 1)])), /* @__PURE__ */ React.createElement("div", { style: { fontSize: mob ? 13 : 14, fontWeight: 700, color: isBoss ? "#ef4444" : "#fbbf24" } }, blindN[blind]), !mob && /* @__PURE__ */ React.createElement(ProgressMap, { ante, blind, mx: MX })), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#888", letterSpacing: 2 } }, "SCORE"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: mob ? 16 : 18, fontWeight: 900 } }, /* @__PURE__ */ React.createElement("span", { style: { color: rScore >= tgt ? "#4ade80" : "#e8e6e3" } }, rScore.toLocaleString()), /* @__PURE__ */ React.createElement("span", { style: { color: "#666", fontSize: 12 } }, " / ", tgt.toLocaleString())), !mob && rScore < tgt && hLeft > 0 && (() => {
      const need = tgt - rScore;
      const nph = Math.ceil(need / hLeft);
      return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: nph > 45e3 ? "#ef4444" : nph > 24e3 ? "#fb923c" : "#aaa", fontWeight: 700, animation: nph > 45e3 ? "fpp 2s ease infinite" : "none" } }, "\u{1F3AF} Need ", need.toLocaleString(), hLeft > 1 ? /* @__PURE__ */ React.createElement("span", { style: { color: "#666", fontWeight: 400 } }, " (", nph.toLocaleString(), "/hand)") : "");
    })()), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#fbbf24", fontWeight: 700, fontSize: 13 } }, "\u{1F41F}", gold), runCount >= 1 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade80" } }, Math.min(5, Math.floor(gold / 5)) > 0 ? `+${Math.min(5, Math.floor(gold / 5))} stores` : ""), /* @__PURE__ */ React.createElement("div", { onClick: () => toast("\u{1F431}", `Colony: ${allC.length} cats (${hand.length} in hand, ${draw.length} in draw)`, "#888", 3e3), style: { fontSize: 10, color: "#666", cursor: "help" } }, allC.length, " \u{1F431}")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, alignItems: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
      e.stopPropagation();
      const htRef = HT.map((h) => `${h.name}: ${h.base}C\xD7${h.baseMult}M`).join("\n");
      toast("\u{1F4D6}", HT.map((h) => h.name + ": " + ({ Stray: "1 alone", Kin: "2 same season", "Two Kin": "2+2 seasons", Clowder: "3 same season", Colony: "4 same season", Litter: "5 same season", "Full Den": "3+2 seasons", Kindred: "3+ same trait" }[h.name] || "")).join(" \xB7 "), "#fbbf24", 6e3);
    }, style: { background: "none", border: "none", fontSize: 14, cursor: "pointer", opacity: 0.4, padding: 4 }, title: "Hand Types" }, "\u{1F4D6}"), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
      e.stopPropagation();
      toggleMute();
    }, style: { background: "none", border: "none", fontSize: 14, cursor: "pointer", opacity: 0.4, padding: 4 }, title: muted ? "Unmute" : "Mute" }, muted ? "\u{1F507}" : "\u{1F50A}"))), mob && rScore < tgt && hLeft > 0 && (() => {
      const need = tgt - rScore;
      const nph = Math.ceil(need / hLeft);
      return /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "3px 0", zIndex: 1, maxWidth: 700, width: "100%" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: nph > 45e3 ? "#ef4444" : nph > 24e3 ? "#fb923c" : "#aaa", fontWeight: 800, letterSpacing: 1 } }, "\u{1F3AF} Need ", need.toLocaleString()), hLeft > 1 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666", marginLeft: 6 } }, "(", nph.toLocaleString(), "/hand)"));
    })(), mob ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, padding: "2px 12px", zIndex: 1, maxWidth: 700, width: "100%", justifyContent: "center", alignItems: "center", flexWrap: "nowrap" } }, !seen.mobBar && (fams.length > 0 || Object.values(devotion).some((v) => v > 0)) && runCount >= 1 && /* @__PURE__ */ React.createElement("span", { onClick: () => {
      setSeen((s) => ({ ...s, mobBar: true }));
      toast("\u2139\uFE0F", "Tap any icon for details", "#fbbf24");
    }, style: { fontSize: 10, color: "#fbbf2466", cursor: "pointer", animation: "breathe 2s ease-in-out infinite", marginRight: 2 } }, "\u2139\uFE0F"), runCount >= 1 && Object.keys(DEVOTION_MILESTONES).map((breed) => {
      const dev = getDevotionLevel(breed, devotion);
      if (breed === "Mixed" && dev.count === 0) return null;
      const icon = breed === "Mixed" ? "\u{1F308}" : BREEDS[breed]?.icon || "?";
      const color = breed === "Mixed" ? "#e8e6e3" : BREEDS[breed]?.color || "#888";
      const pct = dev.next ? Math.min(100, dev.count / dev.next.at * 100) : 100;
      return /* @__PURE__ */ React.createElement("span", { key: breed, onClick: () => toast(icon, `${breed}: ${dev.count}${dev.next ? "/" + dev.next.at + " \u2192 " + dev.next.name : "\u2713 ALL"}`, color), style: { fontSize: 12, cursor: "pointer", opacity: pct >= 100 ? 1 : 0.5, position: "relative" } }, icon, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)", width: 10, height: 2, background: "#ffffff0a", borderRadius: 1, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${pct}%`, background: color, borderRadius: 1 } })));
    }), fams.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 14, background: "#ffffff0a", margin: "0 2px" } }), fams.map((f) => /* @__PURE__ */ React.createElement("span", { key: f.id, onClick: () => toast(f.icon, `${f.name}: ${f.desc}`, "#fbbf24"), style: { fontSize: 13, opacity: cfx.silence ? 0.3 : 1, cursor: "pointer" } }, f.icon)), cfx.silence && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#ef4444bb" } }, "\u{1F910}"), isBoss && curses.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 14, background: "#ffffff0a", margin: "0 2px" } }), isBoss && curses.map((c, i) => /* @__PURE__ */ React.createElement("span", { key: i, onClick: () => toast(c.icon, `${c.name}: ${c.desc}`, "#ef4444"), style: { fontSize: 12, cursor: "pointer" } }, c.icon))) : /* @__PURE__ */ React.createElement(React.Fragment, null, runCount >= 1 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, padding: "2px 16px", zIndex: 1, maxWidth: 700, width: "100%", justifyContent: "center", flexWrap: "wrap" } }, Object.keys(DEVOTION_MILESTONES).map((breed) => {
      const dev = getDevotionLevel(breed, devotion);
      if (breed === "Mixed" && dev.count === 0) return null;
      const icon = breed === "Mixed" ? "\u{1F308}" : BREEDS[breed]?.icon || "?";
      const color = breed === "Mixed" ? "#e8e6e3" : BREEDS[breed]?.color || "#888";
      const pct = dev.next ? Math.min(100, dev.count / dev.next.at * 100) : 100;
      const lastUnlocked = dev.unlocked.length > 0 ? dev.unlocked[dev.unlocked.length - 1] : null;
      return /* @__PURE__ */ React.createElement("div", { key: breed, title: dev.next ? `${breed}: ${dev.count}/${dev.next.at} \u2192 ${dev.next.name}: ${dev.next.desc}` : `${breed}: ALL UNLOCKED`, style: { display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: color + "88" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10 } }, icon), /* @__PURE__ */ React.createElement("span", null, dev.count), /* @__PURE__ */ React.createElement("div", { style: { width: 20, height: 3, background: "#ffffff0a", borderRadius: 2, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width .3s" } })), lastUnlocked && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: color + "66" } }, "\u2713", dev.unlocked.length));
    })), isBoss && curses.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, padding: "3px 16px", zIndex: 1, maxWidth: 700, width: "100%", flexWrap: "wrap" } }, curses.map((c, i) => /* @__PURE__ */ React.createElement("div", { key: i, title: c.desc, style: { display: "flex", alignItems: "center", gap: 2, padding: "2px 6px", borderRadius: 5, background: "#ef444411", border: "1px solid #ef444433", fontSize: 10, color: "#ef4444" } }, c.icon, " ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600 } }, c.name))), cfx.exileBreed && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 2, padding: "2px 6px", borderRadius: 5, background: "#ef444411", border: "1px solid #ef444433", fontSize: 10, color: "#ef4444" } }, BREEDS[cfx.exileBreed].icon, " Exiled"))), hLeft <= 2 && rScore < tgt && ph === "playing" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: hLeft === 1 ? "6px 16px" : "4px 16px", zIndex: 1, maxWidth: 700, width: "100%", animation: hLeft === 1 ? "fpp 1.2s ease infinite" : "none", background: hLeft === 1 ? "#ef444418" : "#fb923c08", borderRadius: 6, border: `1px solid ${hLeft === 1 ? "#ef444444" : "#fb923c22"}` } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: hLeft === 1 ? 12 : 10, fontWeight: 900, color: hLeft === 1 ? "#ef4444" : "#fb923c", letterSpacing: hLeft === 1 ? 4 : 2 } }, hLeft === 1 ? "\u26A0 LAST HAND \u26A0" : "\u26A1 2 HANDS REMAINING")), /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 700, zIndex: 1, padding: "3px 0" } }, /* @__PURE__ */ React.createElement(FM, { level: ferv, prev: pFerv })), !mob && fams.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, padding: "0 16px", zIndex: 1, maxWidth: 700, width: "100%", justifyContent: "center", alignItems: "center", flexWrap: "wrap" } }, fams.map((f) => /* @__PURE__ */ React.createElement("span", { key: f.id, title: `${f.name}: ${f.desc}`, onClick: () => toast(f.icon, `${f.name}: ${f.desc}`, "#fbbf24"), style: { fontSize: 14, opacity: cfx.silence ? 0.3 : 1, cursor: "pointer", padding: "2px" } }, f.icon)), cfx.silence && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#ef4444bb" } }, "\u{1F910}")), denNews.length > 0 && ph === "playing" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, padding: "4px 16px", zIndex: 1, maxWidth: 700, width: "100%", justifyContent: "center", flexWrap: "wrap" } }, denNews.slice(-3).map((n, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      padding: "4px 10px",
      borderRadius: 6,
      background: n.color + "11",
      border: `1px solid ${n.color}33`,
      animation: "fadeIn .4s ease-out"
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, n.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: n.color, fontWeight: 700 } }, n.text))), /* @__PURE__ */ React.createElement("button", { onClick: () => setDenNews([]), style: { background: "none", border: "none", color: "#666", fontSize: 10, cursor: "pointer", padding: "2px 4px" } }, "\u2715")), /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 700, padding: "0 16px", zIndex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { height: 6, background: "#1a1a2e", borderRadius: 3, overflow: "hidden", border: "1px solid #ffffff08" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${Math.min(100, rScore / tgt * 100)}%`, background: isNL ? "linear-gradient(90deg,#b85c2c,#f59e0b,#fef08a,#ffffffcc)" : rScore >= tgt ? "linear-gradient(90deg,#4ade80,#4ade80cc)" : "linear-gradient(90deg,#fbbf24,#4ade80)", borderRadius: 3, transition: "width .5s cubic-bezier(.34,1.56,.64,1)" } }))), ph === "scoring" && sRes && /* @__PURE__ */ React.createElement("div", { onClick: scoringDone ? advanceFromScoring : skipScoring, style: {
      cursor: "pointer",
      position: "fixed",
      inset: 0,
      background: "#000000cc",
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
      willChange: "transform",
      animation: scoreShake > 0 ? `bigShake ${0.2 + scoreShake * 0.08}s ease` : "none"
    } }, scoringFlash && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${scoringFlash}15, ${scoringFlash}08, transparent 70%)`, opacity: 1, pointerEvents: "none", transition: "opacity .2s", zIndex: 101, animation: "flash .4s ease-out" } }), multPop && multPop.mode === "xmult" && (() => {
      const srcColor = multPop.label.includes("Bond") ? "#4ade80" : multPop.label.includes("Nerve") || multPop.label.includes("Blazing") || multPop.label.includes("Fury") || multPop.label.includes("NINTH") || multPop.label.includes("Undying") || multPop.label.includes("Defiant") || multPop.label.includes("Burning") || multPop.label.includes("Cornered") ? "#fb923c" : multPop.label.includes("Phoenix") || multPop.label.includes("Eternal") ? "#fef08a" : multPop.label.includes("Chimera") ? "#c084fc" : multPop.label.includes("Alpha") ? "#60a5fa" : multPop.label.includes("Scarred") ? "#fb923c" : "#fbbf24";
      return /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: "12%", left: 0, right: 0, zIndex: 102, pointerEvents: "none", textAlign: "center", animation: "multFlash .7s ease-out forwards" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, color: srcColor, letterSpacing: 3, fontWeight: 700, marginBottom: 8, textShadow: `0 0 20px ${srcColor}44` } }, multPop.label), /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: multPop.val >= 2 ? 110 : multPop.val >= 1.5 ? 90 : 72,
        fontWeight: 900,
        color: multPop.val >= 2 ? "#fef08a" : "#fbbf24",
        textShadow: `0 0 80px ${multPop.val >= 2 ? "#fef08a" : "#fbbf24"}bb, 0 0 160px ${multPop.val >= 2 ? "#fef08a" : "#fbbf24"}44, 0 6px 0 #00000088`,
        letterSpacing: 12,
        lineHeight: 1
      } }, "\xD7", multPop.val));
    })(), (() => {
      const s = sStep >= 0 && sStep < sRes.bd.length ? sRes.bd[sStep] : null;
      const done = sStep >= sRes.bd.length - 1;
      const curTotal = done ? sRes.total : (runChips || 0) * Math.max(1, runMult || 0);
      const pct = tgt > 0 ? Math.min(100, (curTotal + rScore) / tgt * 100) : 0;
      const nearMiss = pct >= 70 && pct < 100;
      const tier = done ? getScoreTier(sRes.total) : null;
      const _fc = scoreEndRef.current?.isFirstCascade;
      const _earlyRun = meta && meta.stats.w < 2;
      const stepTotalsRef = scoreEndRef.current?.stepTotals || [];
      let annotation = null;
      if (s && !done && (_fc || _earlyRun)) {
        const t = s.type;
        if (t === "hand" && !fcSeenRef.current.hand) {
          fcSeenRef.current.hand = true;
          annotation = "Matching seasons = stronger hand type";
        } else if (t === "cat" && !fcSeenRef.current.cat) {
          fcSeenRef.current.cat = true;
          annotation = `Power ${s.chips || 0} \u2192 +${s.chips || 0} chips`;
        } else if ((t === "trait" || t === "scar") && !fcSeenRef.current.trait) {
          fcSeenRef.current.trait = true;
          annotation = s.mult > 0 ? `Trait adds +${s.mult} mult` : "Traits stack on top of power";
        } else if (t === "trait_rare" && !fcSeenRef.current.rare) {
          fcSeenRef.current.rare = true;
          annotation = "Rare traits MULTIPLY everything";
        } else if (t === "bond" && !fcSeenRef.current.bond) {
          fcSeenRef.current.bond = true;
          annotation = "Bonded pair \u2192 everything \xD7" + (s.xMult || 1.5);
        } else if (t === "nerve" && !fcSeenRef.current.nerve) {
          fcSeenRef.current.nerve = true;
          annotation = `Nerve ${NERVE[ferv]?.name} \u2192 all scores \xD7${NERVE[ferv]?.xM}`;
        } else if (t === "grudge_tension" && !fcSeenRef.current.grudge) {
          fcSeenRef.current.grudge = true;
          annotation = "Grudged cats lose mult when played together";
        } else if (t === "combo" && !fcSeenRef.current.combo) {
          fcSeenRef.current.combo = true;
          annotation = "Hidden power combo! Bonus on top of your hand.";
        }
      }
      const hasX = s && !!s.xMult;
      const counterColor = done ? tier?.color || "#e8e6e3" : !s ? "#e8e6e3" : hasX ? "#fef08a" : s.type === "hand" || s.type === "combo" || s.type === "nerve" || s.type === "fam" ? "#fbbf24" : s.type === "bond" || s.type === "lineage" || s.type === "grudge_prove" ? "#4ade80" : s.type === "grudge_tension" || s.type === "curse" || s.mult < 0 ? "#ef4444" : s.type === "cat" || s.type === "trait" || s.type === "scar" ? "#60a5fa" : s.chips && !s.mult ? "#60a5fa" : "#e8e6e3";
      const prevStepTotal = sStep > 0 && sStep < stepTotalsRef.length ? stepTotalsRef[sStep - 1]?.total ?? stepTotalsRef[sStep - 1] ?? 0 : 0;
      const curStepTotal = sStep >= 0 && sStep < stepTotalsRef.length ? stepTotalsRef[sStep]?.total ?? stepTotalsRef[sStep] ?? 0 : 0;
      const jumpPct = prevStepTotal > 0 ? (curStepTotal - prevStepTotal) / prevStepTotal : 0;
      const counterScale = done ? 1.1 : hasX ? s.xMult >= 2 ? 1.5 : s.xMult >= 1.5 ? 1.35 : 1.25 : jumpPct > 0.5 ? 1.22 : jumpPct > 0.2 ? 1.12 : s?.isBigCat ? 1.1 : 1;
      const pools = {
        bond: ["Love multiplies.", "Together, more.", "The bond holds.", "Stronger as one."],
        lineage: ["Blood remembers.", "Family fights harder.", "Generations deep."],
        grudge_prove: ["Something to prove.", "Rage is fuel.", "They'll show them.", "Spite burns bright."],
        grudge_tension: ["Old wounds fester.", "They can't focus.", "History weighs."],
        nerve: NERVE[ferv]?.desc ? [NERVE[ferv].desc] : [],
        fam: ["A ward watches.", "Silent guardian."],
        cat: ["Holding the line.", "Every cat counts.", "Power becomes chips.", "They add up."],
        trait: ["Instinct kicks in.", "Bred for this.", "It's in their nature.", "Training pays off."],
        trait_rare: ["Power compounds.", "The engine roars.", "It keeps stacking.", "Transcendent."],
        scar: ["What doesn't kill\u2026", "Battle-hardened.", "Scars are armor.", "Earned, not given."],
        curse: ["The dark pushes back.", "A price paid."],
        gold: ["Fortune favors them."],
        provider: ["Resourceful."],
        xp_rank: ["The colony remembers.", "Their name carries weight.", "Known by all.", "Stories told by firelight.", "A living legend.", "They change everything.", "Written into the Hearth."]
      };
      let pool = null;
      if (s) {
        if (s.type === "cat") pool = pools.cat;
        else if (s.type === "xp_rank") pool = pools.xp_rank;
        else if (s.type === "bond") pool = pools.bond;
        else if (s.type === "lineage") pool = pools.lineage;
        else if (s.type === "grudge_prove") pool = pools.grudge_prove;
        else if (s.type === "grudge_tension") pool = pools.grudge_tension;
        else if (s.type === "nerve") pool = pools.nerve;
        else if (s.type === "fam") pool = pools.fam;
        else if (s.type === "trait") pool = pools.trait;
        else if (s.type === "trait_rare") pool = pools.trait_rare;
        else if (s.type === "scar") pool = pools.scar;
        else if (s.type === "curse") pool = pools.curse;
        else if (s.type === "gold") pool = pools.gold;
        else if (s.type === "provider") pool = pools.provider;
      }
      const flavor = pool && pool.length > 0 ? pool[sStep % pool.length] : null;
      const stepColor = !s ? "#888" : s.type === "hand" || s.type === "combo" || s.type === "nerve" || s.type === "gold" || s.type === "xp_rank" || s.type === "fam" ? "#fbbf24" : s.type === "cat" || s.type === "trait" || s.type === "trait_rare" || s.type === "scar" ? "#60a5fa" : s.type === "bond" || s.type === "lineage" || s.type === "grudge_prove" || s.type === "provider" ? "#4ade80" : s.type === "grudge_tension" || s.type === "boss_trait" || s.type === "curse" || s.mult < 0 ? "#ef4444" : "#888";
      return /* @__PURE__ */ React.createElement("div", { style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        transform: `scale(${counterScale})`,
        transition: "transform .3s ease-out",
        padding: "8px 20px",
        borderRadius: 16,
        background: nearMiss && !done ? "#ef444408" : hasX ? "#fbbf2408" : "transparent",
        boxShadow: nearMiss && !done ? `0 0 40px #ef444422` : hasX ? `0 0 60px ${counterColor}22` : "none",
        border: nearMiss && !done ? "1px solid #ef444422" : hasX ? "1px solid #fbbf2422" : "1px solid transparent"
      } }, (() => {
        const dh = meta?.stats?.dh || [];
        const disc2 = handDiscovery || [];
        const htObj = HT.find((h) => h.name === sRes.ht) || POWER_COMBOS.find((p) => p.name === sRes.ht);
        const isHidden = htObj && htObj.hidden;
        const wasKnown = !isHidden || dh.includes(sRes.ht);
        const justDisc = disc2.includes(sRes.ht);
        const showName = wasKnown || justDisc;
        const hasCombo = sRes.combo;
        const comboKnown = hasCombo && dh.includes(sRes.combo);
        const comboJustDisc = hasCombo && disc2.includes(sRes.combo);
        const showCombo = hasCombo && (comboKnown || comboJustDisc);
        const anyDisc = justDisc || comboJustDisc;
        const displayPrimary = showName ? sRes.ht : "????";
        const displayCombo = hasCombo ? showCombo ? sRes.combo : "????" : null;
        const isReveal = sStep === -1;
        const htBd = sRes.bd.find((b) => b.type === "hand");
        const htLvMatch = htBd?.label?.match(/Lv(\d+)$/);
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: isReveal ? 20 : 0, marginBottom: isReveal ? 12 : 0, transition: "margin .4s" } }, /* @__PURE__ */ React.createElement("div", { style: {
          fontSize: done ? 14 : isReveal ? 26 : 20,
          fontWeight: 900,
          letterSpacing: done ? 3 : isReveal ? 10 : 6,
          color: anyDisc ? "#c084fc" : sRes.bd.some((b) => b.type === "nerve") ? NERVE[ferv].color : "#fbbf24",
          textShadow: `0 0 ${isReveal ? 40 : 20}px ${anyDisc ? "#c084fc" : sRes.bd.some((b) => b.type === "nerve") ? NERVE[ferv].color : "#fbbf24"}${isReveal ? "77" : "44"}`,
          transition: "font-size .3s, letter-spacing .3s",
          opacity: done ? 0.6 : 1,
          animation: isReveal ? "comboBurst .6s ease-out" : anyDisc ? "newBestPop .6s ease-out" : "none"
        } }, displayPrimary, displayCombo ? /* @__PURE__ */ React.createElement("span", { style: { color: "#c084fc" } }, " + ", displayCombo) : ""), htLvMatch && !done && /* @__PURE__ */ React.createElement("span", { style: { fontSize: isReveal ? 13 : 11, fontWeight: 700, color: "#fbbf24", background: "#fbbf2418", padding: isReveal ? "3px 9px" : "2px 7px", borderRadius: 6, letterSpacing: 1, border: "1px solid #fbbf2433", animation: isReveal ? "fadeIn .8s ease-out" : "none" } }, "LV", htLvMatch[1])), !isReveal && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: done ? 2 : 4 } }), anyDisc && done && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc", fontWeight: 700, letterSpacing: 2, animation: "fadeIn .5s ease-out", marginBottom: 2 } }, "\u2728 SECRET COMBO DISCOVERED \u2728"), anyDisc && done && (() => {
          const comboObj = sRes.combo ? POWER_COMBOS.find((p) => p.name === sRes.combo) : null;
          const htEx = htObj?.ex;
          const comboEx = comboObj?.ex;
          const lines = [];
          if (justDisc && htEx) lines.push(sRes.ht + ": " + htEx);
          if (comboJustDisc && comboEx) lines.push(sRes.combo + ": " + comboEx);
          return lines.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fcaa", fontStyle: "italic", animation: "fadeIn 1s ease-out .3s both", marginBottom: 4, textAlign: "center", lineHeight: 1.6 } }, lines.map((l, i) => /* @__PURE__ */ React.createElement("div", { key: i }, l))) : null;
        })(), done && showCombo && !comboJustDisc && (() => {
          const comboObj = POWER_COMBOS.find((p) => p.name === sRes.combo);
          return comboObj?.ex ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c084fc66", fontStyle: "italic", letterSpacing: 1, animation: "fadeIn 1s ease-out", marginBottom: 2 } }, comboObj.ex) : null;
        })(), done && !anyDisc && (() => {
          const eo = htObj?.echo;
          return eo ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff66", fontStyle: "italic", letterSpacing: 2, animation: "fadeIn 1s ease-out", marginBottom: 2 } }, eo) : null;
        })());
      })(), (() => {
        const isReveal = sStep === -1;
        const isChipStep = s && s.chips > 0 && !s.xMult;
        const isMultStep = s && (s.mult > 0 || s.mult < 0) && !s.xMult;
        const isXStep = s && !!s.xMult;
        const isFirstStep = sStep === 0;
        const displayChips = runChips || 0;
        const displayMult = runMult || 1;
        const displayTotal = curTotal;
        if (isReveal) return null;
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", animation: isFirstStep ? "fadeIn .4s ease-out" : "none" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", transition: "transform .2s", transform: (isChipStep || isFirstStep) && !done ? "scale(1.2)" : "scale(1)" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6", fontWeight: 900, fontSize: done ? 26 : 22, transition: "font-size .2s", textShadow: (isChipStep || isFirstStep) && !done ? "0 0 12px #3b82f644" : "none", animation: isFirstStep ? "countUp .4s ease-out" : "none" } }, displayChips), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3b82f688", letterSpacing: 2 } }, "POWER")), /* @__PURE__ */ React.createElement("span", { style: { color: "#ffffff55", fontSize: 16 } }, "\xD7"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", transition: "transform .2s", transform: (isMultStep || isFirstStep) && !done ? "scale(1.2)" : "scale(1)" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444", fontWeight: 900, fontSize: done ? 26 : 22, transition: "font-size .2s", textShadow: (isMultStep || isFirstStep) && !done ? "0 0 12px #ef444444" : "none", animation: isFirstStep ? "countUp .4s ease-out" : "none" } }, displayMult), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef444488", letterSpacing: 2 } }, "BONUS")), /* @__PURE__ */ React.createElement("span", { style: { color: "#ffffff55", fontSize: 16 } }, "="), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement(AnimatedScore, { value: displayTotal, style: {
          fontWeight: 900,
          fontSize: done ? 38 : 28,
          color: counterColor,
          textShadow: `0 0 20px ${counterColor}66${done ? ", 0 0 60px " + counterColor + "33" : ""}`,
          animation: done ? "scorePop .5s ease-out" : isFirstStep ? "countUp .4s ease-out" : isXStep ? "multFlash .4s ease-out" : "none",
          transition: "all .15s",
          display: "inline-block"
        } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: counterColor + "44", letterSpacing: 2 } }, "SCORE")));
      })(), !done && s?.reason && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: stepColor + "cc", letterSpacing: 0.5, marginTop: 1, animation: "fadeIn .15s ease-out", maxWidth: 280, textAlign: "center", lineHeight: 1.3 } }, s.reason), !done && flavor && !s?.reason && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: counterColor + "bb", fontStyle: "italic", letterSpacing: 1.5, marginTop: 2, animation: "fadeIn .15s ease-out", maxWidth: 260, textAlign: "center", lineHeight: 1.3 } }, flavor), !done && annotation && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade80", marginTop: 4, padding: "3px 12px", borderRadius: 8, background: "#4ade800a", border: "1px solid #4ade8022", animation: "fadeIn .3s ease-out", maxWidth: 280, textAlign: "center", lineHeight: 1.4, letterSpacing: 0.5 } }, "\u{1F4A1} ", annotation), s && !done && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 } }, s.type === "hand" || s.type === "combo" ? /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
        const htIdx = s.type === "hand" ? HT.findIndex((h) => s.label.startsWith(h.name)) : -1;
        const rarity = s.type === "combo" ? 4 : Math.max(0, htIdx);
        const nameSize = rarity >= 6 ? 30 : rarity >= 4 ? 24 : rarity >= 2 ? 20 : 16;
        const numSize = rarity >= 6 ? 26 : rarity >= 4 ? 22 : rarity >= 2 ? 18 : mob ? 16 : 15;
        const glowSize = rarity >= 4 ? 40 : rarity >= 2 ? 25 : 15;
        const shakeAnim = rarity >= 6 ? "bigShake .5s ease-out" : rarity >= 4 ? "comboBurst .6s ease-out" : "comboBurst .5s ease-out";
        const htColor = s.type === "combo" ? "#c084fc" : rarity >= 6 ? "#fef08a" : rarity >= 4 ? "#fbbf24" : "#fbbf24";
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, animation: shakeAnim } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: {
          fontSize: nameSize,
          letterSpacing: rarity >= 4 ? 6 : 4,
          fontWeight: 900,
          color: htColor,
          textShadow: `0 0 ${glowSize}px ${htColor}66, 0 0 ${glowSize * 2}px ${htColor}22`
        } }, s.type === "combo" ? "\u26A1 " : rarity >= 6 ? "\u{1F31F} " : rarity >= 4 ? "\u{1F0CF} " : "", s.label.replace(/ Lv\d+$/, "")), (() => {
          const lvMatch = s.label.match(/Lv(\d+)$/);
          return lvMatch ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: rarity >= 4 ? 14 : 12, fontWeight: 700, color: htColor, background: `${htColor}18`, padding: "2px 8px", borderRadius: 6, letterSpacing: 1, border: `1px solid ${htColor}33` } }, "LV", lvMatch[1]) : null;
        })()), s.chips || s.mult ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: numSize, fontWeight: 900, display: "flex", gap: 12, animation: `scorePopFade .5s ease-out .1s both` } }, s.chips > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6" } }, "+", s.chips, /* @__PURE__ */ React.createElement("span", { style: { fontSize: Math.max(10, numSize - 8), opacity: 0.7, letterSpacing: 1, marginLeft: 2 } }, "P")), s.mult > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "+", s.mult, /* @__PURE__ */ React.createElement("span", { style: { fontSize: Math.max(10, numSize - 8), opacity: 0.7, letterSpacing: 1, marginLeft: 2 } }, "B"))) : null);
      })()) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: hasX ? 14 : s.type === "nerve" ? 13 : s.isBigCat ? 12 : s.type === "bond" ? 11 : 10,
        letterSpacing: hasX ? 2 : 1,
        fontWeight: 900,
        color: stepColor,
        opacity: 0.85,
        animation: hasX ? "multFlash .4s ease-out" : s.type === "nerve" ? "comboBurst .4s ease-out" : s.isBigCat ? "comboBurst .35s ease-out" : "fadeIn .15s ease-out"
      } }, (() => {
        const nl = narrativeLabel(s, allC);
        return nl || s.label;
      })()), hasX && (() => {
        const xColor = s.type === "bond" ? "#4ade80" : s.type === "nerve" ? "#fb923c" : s.type === "fam" ? "#c084fc" : "#fef08a";
        return /* @__PURE__ */ React.createElement("div", { style: {
          fontSize: s.xMult >= 2 ? 30 : s.xMult >= 1.5 ? 24 : 20,
          fontWeight: 900,
          color: xColor,
          letterSpacing: s.xMult >= 2 ? 6 : 4,
          animation: "multFlash .5s ease-out",
          textShadow: `0 0 ${s.xMult >= 2 ? 30 : 20}px ${xColor}cc`
        } }, "\xD7", s.xMult);
      })(), s.type !== "hand" && s.type !== "combo" && !hasX && (s.chips || s.mult) ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, display: "flex", gap: 6 } }, s.chips > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6" } }, "+", s.chips), s.mult > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "+", s.mult), s.mult < 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, s.mult)) : null)), done && /* @__PURE__ */ React.createElement("div", { style: { width: 200, height: 6, background: "#ffffff0a", borderRadius: 3, overflow: "hidden", marginTop: 6 } }, /* @__PURE__ */ React.createElement("div", { style: {
        height: "100%",
        width: `${pct}%`,
        borderRadius: 3,
        background: pct >= 100 ? "linear-gradient(90deg,#4ade80,#22d3ee)" : "linear-gradient(90deg,#fb923c,#ef4444)",
        boxShadow: pct >= 100 ? "0 0 16px #4ade8088" : "0 0 12px #ef444488"
      } })), done && pct >= 100 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#4ade80", letterSpacing: 4, fontWeight: 900, animation: "targetCross 1.2s ease-out, comboBurst .6s ease-out", marginTop: 4, textShadow: "0 0 16px #4ade8066" } }, "TARGET PASSED \u2726"), done && pct < 100 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ef4444", letterSpacing: 3, fontWeight: 900, animation: "fpp 1.5s ease infinite", marginTop: 4 } }, "BELOW TARGET"), !done && nearMiss && pct < 100 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444aa", letterSpacing: 2, animation: "fpp 1.5s ease infinite", marginTop: 2 } }, "CLOSE..."), done && tier?.label && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", animation: "tierReveal .5s ease-out", marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: 20,
        fontWeight: 900,
        letterSpacing: 8,
        color: tier.color,
        textShadow: `0 0 30px ${tier.color}aa, 0 0 60px ${tier.color}44`
      } }, tier.label), tier.sub && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: tier.color, opacity: 0.7, letterSpacing: 3, marginTop: 2 } }, tier.sub), tier.nar && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa", fontStyle: "italic", marginTop: 3, opacity: 0.7 } }, tier.nar)), done && newBest && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: "#fbbf24", letterSpacing: 3, animation: "newBestPop .5s ease-out", background: "#fbbf2418", padding: "3px 12px", borderRadius: 20, border: "1px solid #fbbf2433", marginTop: 4 } }, "NEW BEST ", newBest.toUpperCase()), done && _fc && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4ade80", marginTop: 6, padding: "8px 16px", borderRadius: 8, background: "#4ade800a", border: "1px solid #4ade8022", animation: "fadeIn .6s ease-out .3s both", maxWidth: 320, textAlign: "center", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, marginBottom: 4 } }, "Power \xD7 Bonus = Score"), /* @__PURE__ */ React.createElement("div", { style: { color: "#4ade80bb", fontSize: 10 } }, "Each cat's ", /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6" } }, "Power adds Chips"), ". Traits and bonds add ", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "Mult"), ". More same-season cats = stronger hand type = bigger base numbers. Stack everything.")));
    })(), /* @__PURE__ */ React.createElement("div", { style: { height: scoringDone ? 8 : 16 } }), !scoringDone && sStep >= 2 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff55", letterSpacing: 2, animation: "fadeIn 1.5s ease-out" } }, "TAP TO SKIP \u23ED"), scoringDone && /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
      e.stopPropagation();
      advanceFromScoring();
    }, style: { background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#0a0a1a", border: "none", borderRadius: 10, padding: "10px 32px", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 1, boxShadow: "0 0 24px #fbbf2444", animation: "fadeIn .3s ease-out" } }, "Continue"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: mob ? 4 : 8, justifyContent: "center", alignItems: "flex-start", padding: "4px 8px", flexWrap: "wrap", maxWidth: "100%", opacity: sStep < 0 ? 0 : 1, transition: "opacity .3s", animation: sStep === 0 ? "fadeIn .4s ease-out" : "none" } }, scoringCats.map((cat2, ci) => {
      const curStep = sStep >= 0 && sStep < sRes.bd.length ? sRes.bd[sStep] : null;
      const mySteps = sRes.bd.filter((s, si) => s.catIdx === ci && si <= sStep);
      const isActive = curStep?.catIdx === ci;
      const activeStep = isActive ? curStep : null;
      const hasFired = mySteps.length > 0;
      const isInvolved = curStep && !isActive && (curStep.allCats || curStep.catIdxs && curStep.catIdxs.includes(ci));
      const totalC = mySteps.reduce((a, s) => a + (s.chips || 0), 0);
      const totalM = mySteps.reduce((a, s) => a + (s.mult || 0), 0);
      const xVals = mySteps.filter((s) => s.xMult).map((s) => s.xMult);
      const hlColor = isActive ? "#fbbf24" : isInvolved ? curStep.type === "hand" ? "#fbbf24" : curStep.type === "bond" ? "#4ade80" : curStep.type === "grudge_tension" ? "#ef4444" : curStep.type === "combo" ? "#c084fc" : curStep.type === "bench" ? "#67e8f9" : curStep.type === "nerve" ? NERVE[ferv].color || "#fbbf24" : "#fbbf24" : null;
      return /* @__PURE__ */ React.createElement("div", { key: cat2.id, style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        transform: isActive ? "scale(1.1)" : isInvolved ? "scale(1.04)" : "scale(1)",
        transition: "transform .25s ease, opacity .3s",
        animation: isActive ? "cardSquash .25s ease-out" : "none",
        opacity: isActive ? 1 : isInvolved ? 0.95 : hasFired ? 0.65 : 0.12,
        flexShrink: 0
      } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(CC, { cat: cat2, sel: isActive || isInvolved, hl: hasFired && !isActive && !isInvolved, sm: scoringCats.length > 4, cw: vw < 500 ? 56 : void 0 }), (isActive || isInvolved) && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: -3, borderRadius: 14, border: `2px solid ${hlColor}`, boxShadow: `0 0 ${isActive ? 20 : 12}px ${hlColor}66,0 0 ${isActive ? 40 : 20}px ${hlColor}22`, pointerEvents: "none", animation: isActive ? "glow 1s ease infinite" : "none" } })), /* @__PURE__ */ React.createElement("div", { style: { minHeight: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 } }, hasFired && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, alignItems: "center", animation: isActive ? "countUp .3s ease-out" : "none" } }, totalC !== 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#3b82f6", fontWeight: 700 } }, totalC > 0 ? "+" : "", totalC), totalM !== 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#ef4444", fontWeight: 800 } }, totalM > 0 ? "+" : "", totalM)), xVals.map((x, xi) => /* @__PURE__ */ React.createElement("span", { key: xi, style: { fontSize: 14, color: "#fbbf24", fontWeight: 900, animation: "scorePop .3s ease", textShadow: "0 0 10px #fbbf2466" } }, "\xD7", x))), isActive && activeStep?.reason && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff66", textAlign: "center", maxWidth: 100, lineHeight: 1.3, animation: "fadeIn .2s ease-out" } }, activeStep.reason));
    })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: 400, marginTop: 4 } }, sRes.bd.slice(0, sStep + 1).filter((s) => s.catIdx === void 0 && s.type !== "hand" && s.type !== "combo" && s.type !== "boss_trait").map((s, i) => {
      const isCurrentStep = sRes.bd.indexOf(s) === sStep;
      const color = s.type === "nerve" ? "#fbbf24" : s.type === "bond" || s.type === "lineage" || s.type === "grudge_prove" ? "#4ade80" : s.type === "grudge_tension" ? "#ef4444" : s.type === "fam" || s.type === "devotion" ? "#fbbf24" : "#888";
      return /* @__PURE__ */ React.createElement("div", { key: i, style: {
        display: "flex",
        gap: 4,
        alignItems: "center",
        animation: isCurrentStep ? "slideIn .3s ease-out" : "none",
        fontSize: isCurrentStep ? 12 : 10,
        padding: isCurrentStep ? "4px 10px" : "2px 6px",
        borderRadius: 6,
        background: color + "11",
        border: `1px solid ${color}33`,
        transform: isCurrentStep ? "scale(1.05)" : "scale(1)",
        transition: "all .15s"
      } }, /* @__PURE__ */ React.createElement("span", { style: { color, fontWeight: 700 } }, s.label), s.xMult && /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24", fontWeight: 900, fontSize: isCurrentStep ? 14 : 11 } }, "\xD7", s.xMult), !s.xMult && s.mult > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444", fontWeight: 700 } }, "+", s.mult, "M"), !s.xMult && s.mult < 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444", fontWeight: 700 } }, s.mult, "M"), s.chips > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6", fontWeight: 700 } }, "+", s.chips, "C"));
    })), sStep >= sRes.bd.length - 1 && aftermath.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3, alignItems: "center", marginTop: 2, padding: "6px 12px", borderRadius: 8, background: "#ffffff06", border: "1px solid #ffffff0a" } }, aftermath.map((a, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      fontSize: 10,
      color: a.color,
      fontWeight: 600,
      animation: `fadeIn .4s ease-out ${i * 0.15}s both`
    } }, a.icon, " ", a.text)))), deckView && /* @__PURE__ */ React.createElement("div", { onClick: () => setDeckView(false), style: { position: "fixed", inset: 0, zIndex: 140, display: "flex", alignItems: "center", justifyContent: "center", background: "#000000cc", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { background: "linear-gradient(145deg,#1a1a2e,#0d0d1a)", border: "1px solid #ffffff11", borderRadius: 14, padding: "16px 20px", maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", animation: "fadeIn .15s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", letterSpacing: 3 } }, "COLONY \xB7 ", allC.length, " CATS"), /* @__PURE__ */ React.createElement("button", { onClick: () => setDeckView(false), style: { background: "none", border: "none", color: "#666", fontSize: 16, cursor: "pointer" } }, "\u2715")), (() => {
      const byCounts = {};
      allC.forEach((c) => { byCounts[c.breed] = (byCounts[c.breed] || 0) + 1; });
      const traitCounts = {};
      allC.forEach((c) => { const tn = (c.trait || PLAIN).name; if (tn !== "Plain") traitCounts[tn] = (traitCounts[tn] || 0) + 1; });
      const injCount = allC.filter((c) => c.injured).length;
      const scarCount = allC.filter((c) => c.scarred).length;
      const bondCount = Math.floor(allC.filter((c) => c.bondedTo).length / 2);
      return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2, height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 } }, BK.map((b) => /* @__PURE__ */ React.createElement("div", { key: b, style: { flex: byCounts[b] || 0, background: BREEDS[b]?.color || "#888", transition: "flex .3s" }, title: `${b}: ${byCounts[b] || 0}` }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", fontSize: 10 } }, BK.map((b) => /* @__PURE__ */ React.createElement("span", { key: b, style: { color: BREEDS[b]?.color || "#888" } }, BREEDS[b]?.icon, " ", byCounts[b] || 0)), scarCount > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24" } }, "\u2694", scarCount), bondCount > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#f472b6" } }, "\u{1F495}", bondCount), injCount > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "\u{1FA79}", injCount)), Object.keys(traitCounts).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", fontSize: 9, color: "#888", marginTop: 4 } }, Object.entries(traitCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, n]) => /* @__PURE__ */ React.createElement("span", { key: t }, t, ":", n))));
    })(), (() => {
      const sections = [
        { label: "IN HAND", cats: hand, color: "#4ade80" },
        { label: "DRAW PILE", cats: draw, color: "#fbbf24" },
        { label: "DISCARD", cats: disc, color: "#888" }
      ];
      return sections.map((s) => s.cats.length > 0 && /* @__PURE__ */ React.createElement("div", { key: s.label, style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: s.color, letterSpacing: 2, marginBottom: 6, opacity: 0.7 } }, s.label, " (", s.cats.length, ")"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } }, [...s.cats].sort((a, b) => b.power - a.power).map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, onClick: () => {
        setTraitTip(c);
      }, style: { cursor: "pointer" } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sm: true }))))));
    })())), traitTip && /* @__PURE__ */ React.createElement("div", { onClick: () => setTraitTip(null), style: { position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", background: "#000000aa", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { background: "linear-gradient(145deg,#1a1a2e,#0d0d1a)", border: `2px solid ${tierColor(traitTip.trait || { tier: "common" })}`, borderRadius: 14, padding: "20px 24px", maxWidth: 340, width: "100%", animation: "fadeIn .15s ease-out", boxShadow: `0 12px 48px #00000099,0 0 30px ${BREEDS[traitTip.breed]?.glow || "#fff"}11` } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 36, lineHeight: 1, marginBottom: 4, filter: `drop-shadow(0 0 8px ${BREEDS[traitTip.breed]?.glow || "#fff"}44)` } }, catHas(traitTip, "Chimera") || catHas(traitTip, "Wild") ? "\u2728" : BREEDS[traitTip.breed]?.icon || "\u{1F431}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: BREEDS[traitTip.breed]?.color || "#888", letterSpacing: 2 } }, traitTip.name?.split(" ")[0]), traitTip.name?.includes(" ") && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", fontStyle: "italic" } }, traitTip.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: BREEDS[traitTip.breed]?.color || "#888", marginTop: 4 } }, BREEDS[traitTip.breed]?.icon, " ", traitTip.breed, " \xB7 Power ", traitTip.power, " \xB7 ", traitTip.sex === "M" ? "\u2642 Male" : "\u2640 Female"), traitTip.quirk && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#999", fontStyle: "italic", marginTop: 4, lineHeight: 1.4 } }, '"', traitTip.quirk, '"')), (() => {
      const allT = catAllTraits(traitTip);
      return allT.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#666", textAlign: "center", padding: "8px 0", lineHeight: 1.5 } }, "Plain. Unwritten. Every scar, bond, and battle ahead will shape what they become.") : allT.map((t, ti) => {
        const tl = traitTierLabel(t);
        return /* @__PURE__ */ React.createElement("div", { key: ti, style: { marginTop: ti > 0 ? 12 : 0, paddingTop: ti > 0 ? 12 : 0, borderTop: ti > 0 ? "1px solid #ffffff0a" : "none" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, textAlign: "center" } }, t.icon), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: tl.color, textAlign: "center", letterSpacing: 2 } }, t.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: tl.color, textAlign: "center", letterSpacing: 2, textTransform: "uppercase", marginTop: 2, opacity: 0.7 } }, tl.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#c8c8c8", textAlign: "center", lineHeight: 1.5, marginTop: 6 } }, TRAIT_DETAIL[t.name] || t.desc));
      });
    })(), (() => {
      const dev = getDevotionLevel(traitTip.breed, devotion);
      return dev.count > 0 || dev.next ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#ffffff06", border: "1px solid #ffffff0a" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 3 } }, "SEASON DEVOTION \xB7 ", dev.count, " played"), dev.unlocked.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 11, color: BREEDS[traitTip.breed]?.color || "#888" } }, "\u2713 ", m.name, ": ", m.desc)), dev.next && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#666" } }, "\u25CB ", dev.next.at, " plays: ", dev.next.name, ". ", dev.next.desc)) : null;
    })(), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginTop: 8 } }, traitTip.epithet && (() => {
      const epDef = traitTip.epithetKey ? Object.values(EPITHETS).find((e) => e.key === traitTip.epithetKey) : null;
      return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24", textAlign: "center", lineHeight: 1.6 } }, "\u{1F3F7}\uFE0F ", /* @__PURE__ */ React.createElement("b", null, '"', traitTip.epithet, '"'), epDef?.desc ? /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24aa" } }, ": ", epDef.desc) : "", epDef?.flavor && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf2466", fontStyle: "italic", marginTop: 2 } }, '"', epDef.flavor, '"'), (traitTip.earnedEpithets || []).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 4, fontSize: 10, color: "#ffffff55" } }, traitTip.earnedEpithets.map((e, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: { marginRight: 6 } }, "\u25CB ", e.title))));
    })(), traitTip.bondedTo && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#f472b6", textAlign: "center" } }, "\u{1F495} Bonded. \xD71.5 mult", traitTip.epithetKey === "bonded" ? " (+2 from epithet)" : "", ", \xD71.25 for second pair"), (traitTip.grudgedWith || []).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fb923c", textAlign: "center" } }, "\u26A1 ", (traitTip.grudgedWith || []).length, " Grudge", (traitTip.grudgedWith || []).length > 1 ? "s" : "", ". 75% tension / 25% prove per pair"), traitTip.epithetKey === "grudgeResolved" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4ade80", textAlign: "center" } }, "\u{1F54A}\uFE0F Immune to future grudges"), traitTip.scarred && !traitTip.injured && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24", textAlign: "center" } }, "\u2694 Battle-Hardened. \xD71.25 mult"), traitTip.injured && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444", textAlign: "center" } }, "\u{1FA79} Injured. Half power, less mult (heals in ", traitTip.injuryTimer || 1, ")"), traitTip._hearthChild && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24aa", textAlign: "center" } }, "\u{1F525} Hearth Legend. Cannot be saved back.")), (traitTip.story || []).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#ffffff04", border: "1px solid #ffffff08" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 2, marginBottom: 4 } }, "STORY"), (traitTip.story || []).slice(-3).map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 11, color: "#999", lineHeight: 1.5 } }, s))), traitTip.stats && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "#ffffff04", border: "1px solid #ffffff08" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 2, marginBottom: 4 } }, "BIOGRAPHY"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, fontSize: 11, color: "#999", lineHeight: 1.5 } }, traitTip.stats.tp > 0 && /* @__PURE__ */ React.createElement("div", null, "Played ", traitTip.stats.tp, " hand", traitTip.stats.tp > 1 ? "s" : "", ". ", traitTip.stats.bs > 0 ? `Best: ${traitTip.stats.bs.toLocaleString()}.` : ""), traitTip.stats.tp === 0 && /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontStyle: "italic" } }, "Hasn't played a hand yet. Waiting for a chance."), traitTip.bondedTo && (() => {
      const mate = allC.find((c) => c.id === traitTip.bondedTo);
      return mate ? /* @__PURE__ */ React.createElement("div", { style: { color: "#f472b6" } }, "Bonded to ", mate.name.split(" ")[0], ".") : null;
    })(), traitTip._mateDied && /* @__PURE__ */ React.createElement("div", { style: { color: "#ef4444" } }, "Lost their partner. Carries the weight."), traitTip.scarred && /* @__PURE__ */ React.createElement("div", { style: { color: "#fbbf24" } }, "Carries a scar. The colony remembers how."), traitTip._bornNight && /* @__PURE__ */ React.createElement("div", { style: { color: "#c084fc" } }, "Born Night ", traitTip._bornNight, ". ", traitTip._hearthParents ? "Child of " + traitTip._hearthParents + "." : "Grew up in the dark."), traitTip.hearthDescendant && /* @__PURE__ */ React.createElement("div", { style: { color: "#fbbf24aa" } }, "Descended from the Hearth. The bloodline continues."), traitTip.epithet && /* @__PURE__ */ React.createElement("div", { style: { color: "#fbbf24" } }, 'Earned the title "', traitTip.epithet, '."'), (traitTip.earnedEpithets || []).length > 1 && /* @__PURE__ */ React.createElement("div", { style: { color: "#666" } }, "Also qualified for: ", traitTip.earnedEpithets.filter((e) => e !== traitTip.epithetKey).map((e) => {
      const ep = Object.values(EPITHETS).find((x) => x.key === e);
      return ep ? pk(ep.titles) : e;
    }).join(", ")), (() => {
      const xp = getCatXP(traitTip.stats?.tp || 0, !!getMB().xp);
      return xp ? /* @__PURE__ */ React.createElement("div", { style: { color: xp.color, fontWeight: 700 } }, xp.icon, " ", xp.label) : null;
    })())))), inspectCat && (() => {
      const ic = inspectCat;
      const b = BREEDS[ic.breed];
      const n = ic.name.split(" ")[0];
      const mate = ic.bondedTo ? allC.find((c) => c.id === ic.bondedTo) : null;
      const grudges = (ic.grudgedWith || []).map((gid) => allC.find((c) => c.id === gid)).filter(Boolean);
      const xp = getCatXP(ic.stats?.tp || 0, !!getMB().xp);
      const timeline = [];
      if (ic.origin && !ic._bornNight && !ic._hearthParents) timeline.push({ night: "", text: ic.origin, color: "#ffffff44", icon: "\u{1F43E}" });
      if (ic._bornNight) timeline.push({ night: ic._bornNight, text: "Born in the dark.", color: "#c084fc", icon: "\u{1F423}" });
      if (ic._hearthParents) timeline.push({ night: 0, text: `Child of ${ic._hearthParents}.`, color: "#fbbf24", icon: "\u{1F3E0}" });
      if (ic.hearthDescendant) timeline.push({ night: 0, text: "Descended from the Hearth.", color: "#fbbf24aa", icon: "\u{1F525}" });
      if (ic.scarred) timeline.push({ night: ic._hardenedNight || "?", text: "Hardened. Came out tougher.", color: "#fbbf24", icon: "\u2694" });
      if (mate) timeline.push({ night: "", text: `Bonded with ${mate.name.split(" ")[0]}.`, color: "#f472b6", icon: "\u{1F495}" });
      if (ic._mateDied) timeline.push({ night: "", text: "Lost their partner.", color: "#ef4444", icon: "\u{1F494}" });
      if (ic.epithet) timeline.push({ night: "", text: `Earned "${ic.epithet}."`, color: "#fbbf24", icon: "\u{1F3F7}\uFE0F" });
      (ic.story || []).forEach((s) => timeline.push({ night: "", text: s, color: "#888", icon: "\xB7" }));
      if (ic.stats?.tp > 0) timeline.push({ night: "", text: `Best hand: ${(ic.stats.bs || 0).toLocaleString()}.`, color: "#fbbf24", icon: "\u2726" });
      return /* @__PURE__ */ React.createElement("div", { onClick: () => setInspectCat(null), style: { position: "fixed", inset: 0, zIndex: 250, background: "#000000dd", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .2s ease-out", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { maxWidth: 340, width: "90%", maxHeight: "85vh", overflowY: "auto", padding: "20px 18px", borderRadius: 16, background: "linear-gradient(145deg,#0d1117,#0a0a14)", border: `2px solid ${b?.color || "#fbbf24"}33`, boxShadow: `0 8px 40px #00000088, 0 0 30px ${b?.color || "#fbbf24"}22`, animation: "scorePop .3s ease-out", cursor: "default" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 14, alignItems: "center", marginBottom: 14 } }, /* @__PURE__ */ React.createElement(CC, { cat: ic, cw: 80 }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 800, color: b?.color || "#e8e6e3", letterSpacing: 1 } }, n), ic.epithet && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#fbbf24", fontStyle: "italic" } }, ic.epithet), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginTop: 2 } }, b?.icon, " ", ic.breed, " \xB7 P", ic.power, " \xB7 ", ic.sex === "M" ? "\u2642 Male" : "\u2640 Female"), xp && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: xp.color, fontWeight: 700, marginTop: 2 } }, xp.icon, " ", xp.label))), /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 12px", borderRadius: 8, background: ic.trait?.name !== "Plain" ? "#ffffff06" : "#ffffff03", border: `1px solid ${ic.trait?.name !== "Plain" ? "#ffffff15" : "#ffffff08"}`, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: tierColor(ic.trait || PLAIN) } }, ic.trait?.icon || "", " ", ic.trait?.name || "Plain"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#999", lineHeight: 1.5, marginTop: 2 } }, TRAIT_DETAIL[ic.trait?.name] || ic.trait?.desc || "No special ability yet.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "6px 10px", borderRadius: 6, background: "#ffffff04", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 900, color: "#e8e6e3" } }, ic.stats?.tp || 0), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#666", letterSpacing: 1 } }, "HANDS")), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "6px 10px", borderRadius: 6, background: "#ffffff04", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 900, color: "#fbbf24" } }, (ic.stats?.bs || 0).toLocaleString()), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#666", letterSpacing: 1 } }, "BEST")), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "6px 10px", borderRadius: 6, background: "#ffffff04", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 900, color: ic.injured ? "#ef4444" : ic.scarred ? "#fbbf24" : "#4ade80" } }, ic.injured ? "HURT" : ic.scarred ? "HARD" : "OK"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#666", letterSpacing: 1 } }, "STATUS"))), (mate || grudges.length > 0) && /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 12px", borderRadius: 8, background: "#ffffff04", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 2, marginBottom: 4 } }, "RELATIONSHIPS"), mate && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#f472b6" } }, "\u{1F495} Bonded to ", mate.name.split(" ")[0], " (", BREEDS[mate.breed]?.icon, " P", mate.power, ")"), grudges.map((g) => /* @__PURE__ */ React.createElement("div", { key: g.id, style: { fontSize: 11, color: "#fb923c" } }, "\u26A1 Grudge with ", g.name.split(" ")[0]))), timeline.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 12px", borderRadius: 8, background: "#ffffff04" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 2, marginBottom: 6 } }, "RECORD"), timeline.map((t, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 6, alignItems: "flex-start", fontSize: 11, color: t.color, lineHeight: 1.5, marginBottom: 2 } }, /* @__PURE__ */ React.createElement("span", { style: { flexShrink: 0, opacity: 0.6 } }, t.icon), /* @__PURE__ */ React.createElement("span", null, t.text)))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 12 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setInspectCat(null), style: { fontSize: 11, padding: "6px 20px", borderRadius: 6, border: "1px solid #ffffff22", background: "#ffffff08", color: "#888", cursor: "pointer" } }, "Close"))));
    })(), clutch && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle,#fbbf2422,transparent 60%)", pointerEvents: "none" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, fontWeight: 900, color: "#fbbf24", letterSpacing: 8, textShadow: "0 0 40px #fbbf24cc", animation: "clutchBurst .6s ease-out" } }, "THEY SHOULD HAVE STAYED DOWN")), /* @__PURE__ */ React.createElement("div", { style: { minHeight: 36, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 1, gap: 2 } }, preview ? (() => {
      if (blind === 2 && bossTraits.some((bt) => bt.fx.noStrength)) {
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#fbbf24", letterSpacing: 2 } }, preview.type.name, runCount < 3 && preview.type.ex ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#fbbf24aa", fontWeight: 400, marginLeft: 3 } }, "(", preview.type.ex, ")") : null), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ef4444bb", fontStyle: "italic" } }, "\u{1F441}\uFE0F Watchful. it sees your hand"));
      }
      let baseC = preview.type.base.c + (preview.combo?.bonus?.c || 0);
      let baseM = preview.type.base.m + (preview.combo?.bonus?.m || 0);
      if (preview.combo && preview.comboIdxs) {
        const pComboCats = preview.comboIdxs.map((i) => selC[i]).filter(Boolean);
        if (pComboCats.length >= 2 && pComboCats.every((c) => c.breed === pComboCats[0].breed)) {
          baseC = preview.type.base.c + Math.round(preview.combo.bonus.c * 1.5);
          baseM = preview.type.base.m + Math.round(preview.combo.bonus.m * 1.5);
        }
      }
      const catPow = selC.reduce((s, c) => s + (c.injured ? 0 : c.power), 0);
      const traitCount = selC.filter((c) => !catIsPlain(c)).length;
      const bondedInHand = selC.filter((c) => c.bondedTo && selC.find((x) => x.id === c.bondedTo)).length;
      const injuredCount = selC.filter((c) => c.injured).length;
      const scarredCount = selC.filter((c) => c.scarred && !c.injured).length;
      const scarredXM = Math.pow(1.25, scarredCount);
      const bondPairCount = selC.filter((c) => c.bondedTo && selC.find((x) => x.id === c.bondedTo)).length / 2;
      const ubActive = getMB().bondBoost || 0;
      const bondPairXM = bondPairCount >= 2 ? ubActive ? 1.75 * 1.4 : 1.5 * 1.25 : bondPairCount >= 1 ? ubActive ? 1.75 : 1.5 : 1;
      const focusPreview = selC.length >= 1 && selC.length <= 4 ? [0, 1.5, 1.3, 1.2, 1.1][selC.length] : 1;
      const sig = (baseC + catPow + 0) * (baseM + traitCount * 2) * Math.max(1, NERVE[ferv].xM) * scarredXM * bondPairXM * focusPreview;
      const tgt2 = eTgt();
      const need = Math.max(0, tgt2 - rScore);
      const pacePerHand = hLeft > 0 ? need / hLeft : need;
      const ratio = pacePerHand > 0 ? sig / pacePerHand : 99;
      const tier = ratio >= 3 ? { w: "Crushing", c: "#fbbf24", p: 100 } : ratio >= 1.8 ? { w: "Strong", c: "#4ade80", p: 80 } : ratio >= 1 ? { w: "Decent", c: "#e8e6e3", p: 55 } : ratio >= 0.5 ? { w: "Risky", c: "#fb923c", p: 35 } : { w: "Weak", c: "#ef4444", p: 15 };
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: "#fbbf24", letterSpacing: 2 } }, preview.type.name, runCount < 3 && preview.type.ex ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#fbbf24aa", fontWeight: 400, marginLeft: 4 } }, "(", preview.type.ex, ")") : null), preview.combo && (() => {
        const known = (meta?.stats?.dh || []).includes(preview.combo.name);
        return /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#c084fc", letterSpacing: 1 } }, "+ ", known ? preview.combo.name : "????", known && preview.combo.ex ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#c084fc88", fontWeight: 400, marginLeft: 4 } }, "(", preview.combo.ex, ")") : null);
      })(), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#888" } }, baseC, "\xD7", baseM), selC.length <= 4 && selC.length >= 1 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#c084fcaa" } }, "Focus \xD7", selC.length === 1 ? "1.5" : selC.length === 2 ? "1.3" : selC.length === 3 ? "1.2" : "1.1"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, fontWeight: 900, color: tier.c, letterSpacing: 1, textShadow: `0 0 8px ${tier.c}44` } }, tier.w)), (() => {
        if (Math.random() > 0.2 || selC.length < 2) return null;
        const bondPair = selC.find((c) => c.bondedTo && selC.find((x) => x.id === c.bondedTo));
        const mate = bondPair ? selC.find((x) => x.id === bondPair.bondedTo) : null;
        const kitten = selC.find((c) => catIsKitten(c));
        const allSame = selC.length >= 3 && selC.every((c) => c.breed === selC[0].breed);
        const scarCount = selC.filter((c) => c.scarred).length;
        const line = bondPair && mate ? `${bondPair.name.split(" ")[0]} and ${mate.name.split(" ")[0]} together again.` : kitten ? `First hand for ${kitten.name.split(" ")[0]}. Everything starts here.` : allSame ? `All ${BREEDS[selC[0].breed]?.name}. The season runs deep.` : scarCount >= 2 ? `${scarCount} scars in this hand. They've earned whatever comes next.` : selC.length === 1 ? `${selC[0].name.split(" ")[0]} alone. Sometimes that's enough.` : null;
        return line ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ffffff44", fontStyle: "italic", animation: "fadeIn .5s ease-out" } }, line) : null;
      })(), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 100, height: 4, background: "#1a1a2e", borderRadius: 3, overflow: "hidden", border: "1px solid #ffffff08" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${tier.p}%`, borderRadius: 3, background: `linear-gradient(90deg,${tier.c}66,${tier.c})`, transition: "width .3s" } })), need > 0 && hLeft > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: ratio >= 1 ? "#4ade80" : "#ef4444", letterSpacing: 0.5 } }, "\u{1F3AF} Need ", need.toLocaleString())), sel.size > 1 && /* @__PURE__ */ React.createElement("button", { onClick: () => setSel(/* @__PURE__ */ new Set()), style: { background: "none", border: "1px solid #ffffff12", borderRadius: 4, color: "#666", fontSize: 10, cursor: "pointer", padding: "2px 8px" } }, "Clear"), hLeft <= 1 && need > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444", fontWeight: 700, animation: "fpp 1.5s ease infinite" } }, "LAST HAND"), (() => {
        const warnings = [];
        const injured = selC.filter((c) => c.injured);
        if (injured.length) warnings.push({ icon: "\u{1FA79}", text: `${injured.map((c) => c.name.split(" ")[0]).join(", ")} injured (half power)`, color: "#ef4444" });
        const grudgePairs = getGrudges(selC);
        if (grudgePairs.length) warnings.push({ icon: "\u26A1", text: `${grudgePairs.map(([a, b]) => a.name.split(" ")[0] + "+" + b.name.split(" ")[0]).join(", ")} grudge (\u22122M)`, color: "#fb923c" });
        const cursedNotAlone = selC.filter((c) => catHas(c, "Cursed") && selC.some((x) => x.id !== c.id && getCatBreeds(x).some((b) => getCatBreeds(c).includes(b))));
        if (cursedNotAlone.length) warnings.push({ icon: "\u{1F480}", text: `${cursedNotAlone[0].name.split(" ")[0]} Cursed, not alone (penalty)`, color: "#ef4444" });
        return warnings.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1 } }, warnings.map((w, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 10, color: w.color } }, w.icon, " ", w.text))) : null;
      })());
    })() : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#666", fontSize: 10 } }, "Select up to 5 cats to play"))), sel.size >= 1 && (() => {
      const ordered = [...sel].map((idx) => hand[idx]).filter(Boolean);
      const benchCats = hand.filter((c) => !ordered.find((x) => x.id === c.id));
      const benchTraited = benchCats.filter((c) => !catIsPlain(c) && !catIsKitten(c));
      return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, padding: "4px 16px", zIndex: 1, maxWidth: 700, width: "100%", justifyContent: "center", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, alignItems: "flex-end" } }, ordered.map((cat2, pos) => {
        if (!cat2) return null;
        const b = BREEDS[cat2.breed];
        return /* @__PURE__ */ React.createElement("div", { key: cat2.id, style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 0 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#fbbf24", fontWeight: 700 } }, pos + 1), /* @__PURE__ */ React.createElement("div", { style: { width: 24, height: 28, borderRadius: 4, background: b.bg, border: `1px solid ${b.color}44`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 10 } }, /* @__PURE__ */ React.createElement("span", null, b.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: b.color, fontWeight: 700 } }, cat2.power)));
      })), benchTraited.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2, alignItems: "center", padding: "2px 6px", borderRadius: 4, background: "#ffffff06", border: "1px solid #ffffff0a" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#888" } }, "\u{1FA91}"), benchTraited.slice(0, 3).map((c) => /* @__PURE__ */ React.createElement("span", { key: c.id, style: { fontSize: 10 }, title: `${c.name.split(" ")[0]}: unplayed bonus` }, (c.trait || {}).icon || "\xB7"))), benchCats.length > 0 && (() => {
        const never = benchCats.filter((c) => (c.stats?.tp || 0) === 0);
        const veteran = benchCats.find((c) => (c.stats?.tp || 0) >= 8);
        const mourner = benchCats.find((c) => c._mateDied);
        const line = mourner ? `${mourner.name.split(" ")[0]} watches. Still carrying two names.` : never.length >= 2 ? `${never[0].name.split(" ")[0]} and ${never[1].name.split(" ")[0]} haven't played yet. They're waiting.` : never.length === 1 ? `${never[0].name.split(" ")[0]} hasn't played a hand. Still waiting for a chance.` : veteran ? `${veteran.name.split(" ")[0]} rests. ${veteran.stats.tp} hands played. They've earned it.` : null;
        return line ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#ffffff1a", fontStyle: "italic", maxWidth: 200, textAlign: "center", lineHeight: 1.3 } }, line) : null;
      })());
    })(), (() => {
      const selCats = [...sel].map((idx) => hand[idx]).filter(Boolean);
      const relatedMap = {};
      selCats.forEach((sc) => {
        if (sc.bondedTo) {
          const mate = hand.find((h) => h.id === sc.bondedTo);
          if (mate && !sel.has(hand.indexOf(mate))) relatedMap[mate.id] = "mate";
        }
        hand.forEach((h) => {
          if (!sel.has(hand.indexOf(h)) && (h.parentIds?.includes(sc.id) || sc.parentIds?.includes(h.id) || h.stats?.par && h.stats.par.includes(sc.name.split(" ")[0]))) relatedMap[h.id] = "kin";
        });
      });
      hand.forEach((cat2) => {
        if (cat2.bondedTo) {
          const mate = [...hand, ...draw, ...disc].find((h) => h.id === cat2.bondedTo);
          cat2._mateName = mate ? mate.name.split(" ")[0][0] : "";
        } else {
          cat2._mateName = "";
        }
      });
      const _gHL = /* @__PURE__ */ new Set();
      if (guide && !autoPlay && guide.step === 0 && ante === 1 && blind === 0) {
        const bc = {};
        hand.forEach((c, i) => {
          bc[c.breed] = (bc[c.breed] || 0) + 1;
        });
        const best = Object.entries(bc).sort((a, b) => b[1] - a[1]).find(([, v]) => v >= 2);
        if (best) hand.forEach((c, i) => {
          if (c.breed === best[0] && _gHL.size < best[1]) _gHL.add(i);
        });
      }
      hand._guideHL = _gHL;
      return null;
    })(), ph === "playing" && !autoPlay && runCount >= 1 && (() => {
      const allPlay = [...hand, ...draw, ...disc];
      const sc = {};
      allPlay.forEach((c) => {
        sc[c.breed] = (sc[c.breed] || 0) + 1;
      });
      const tc = {};
      allPlay.forEach((c) => {
        if (c.trait?.name !== "Plain") {
          const tn = c.trait?.name || "";
          tc[tn] = (tc[tn] || 0) + 1;
        }
      });
      const topTrait = Object.entries(tc).sort((a, b) => b[1] - a[1])[0];
      const bonds = allPlay.filter((c) => c.bondedTo).length / 2;
      const hardened = allPlay.filter((c) => c.scarred).length;
      return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: mob ? 6 : 4, justifyContent: "center", flexWrap: "wrap", marginBottom: 2, zIndex: 1 } }, Object.entries(sc).sort(([, a], [, b]) => b - a).map(
        ([br, ct]) => /* @__PURE__ */ React.createElement("span", { key: br, style: { fontSize: 9, color: BREEDS[br]?.color || "#888", padding: "1px 4px", borderRadius: 3, background: BREEDS[br]?.color + "11", border: `1px solid ${BREEDS[br]?.color}22` } }, BREEDS[br]?.icon, ct)
      ), topTrait && topTrait[1] >= 2 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#c084fc", padding: "1px 4px", borderRadius: 3, background: "#c084fc11", border: "1px solid #c084fc22" } }, topTrait[1], "\xD7", topTrait[0]), bonds > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#f472b6", padding: "1px 4px", borderRadius: 3, background: "#f472b611", border: "1px solid #f472b622" } }, "\u{1F495}", Math.floor(bonds)), hardened > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#fbbf24", padding: "1px 4px", borderRadius: 3, background: "#fbbf2411", border: "1px solid #fbbf2422" } }, "\u2694", hardened), weather && /* @__PURE__ */ React.createElement("span", { onClick: () => toast("\u{1F324}", `${weather.season === "Autumn" ? "Falling Leaves" : weather.season === "Winter" ? "Cold Snap" : weather.season === "Spring" ? "Fresh Growth" : "Long Light"}: ${weather.season} cats get +2 base score tonight.`, BREEDS[weather.season]?.color || "#fbbf24", 4e3), style: { fontSize: 9, color: BREEDS[weather.season]?.color || "#888", padding: "1px 4px", borderRadius: 3, background: BREEDS[weather.season]?.color + "11", border: `1px solid ${BREEDS[weather.season]?.color}22`, cursor: "help" } }, "\u{1F324}", BREEDS[weather.season]?.icon), nightMod && /* @__PURE__ */ React.createElement("span", { onClick: () => toast(nightMod.icon, `${nightMod.name}: ${nightMod.desc}`, "#c084fc", 4e3), style: { fontSize: 9, color: "#c084fc", padding: "1px 4px", borderRadius: 3, background: "#c084fc11", border: "1px solid #c084fc22", cursor: "help" } }, nightMod.icon));
    })(), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: mob ? 2 : 3,
      padding: "0 4px",
      zIndex: 1,
      justifyContent: hand.length > (mob ? 5 : 8) ? "flex-start" : "center",
      flexWrap: "nowrap",
      maxWidth: mob ? vw - 8 : 840,
      width: "100%",
      overflowX: hand.length > (mob ? 5 : 8) ? "auto" : "visible",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
      animation: hLeft === 1 && rScore < tgt && isBoss ? "shake .5s ease-in-out infinite" : "none"
    } }, (() => {
      const seasonOrder = { Autumn: 0, Winter: 1, Spring: 2, Summer: 3 };
      const indexed = hand.map((c, i) => ({ c, i }));
      const sorted = handSort === "season" ? [...indexed].sort((a, b) => (seasonOrder[a.c.breed] || 0) - (seasonOrder[b.c.breed] || 0) || b.c.power - a.c.power) : [...indexed].sort((a, b) => b.c.power - a.c.power);
      const _cw = mob ? Math.max(56, Math.min(80, Math.floor((vw - 32) / Math.max(5, hand.length)))) : 0;
      return sorted.map(({ c, i }) => {
        const selCats = [...sel].map((idx) => hand[idx]).filter(Boolean);
        const selSeasons = (() => {
          if (selCats.length === 0) return null;
          const bc = {};
          selCats.forEach((sc) => {
            bc[sc.breed] = (bc[sc.breed] || 0) + 1;
          });
          const top = Object.entries(bc).sort((a, b) => b[1] - a[1])[0];
          return top ? top[0] : null;
        })();
        const isDimmed = selSeasons && !sel.has(i) && c.breed !== selSeasons && !catHas(c, "Wild") && !catHas(c, "Chimera");
        const isRelated = !sel.has(i) && selCats.some((sc) => sc.bondedTo === c.id || c.parentIds?.includes(sc.id) || sc.parentIds?.includes(c.id) || c.stats?.par && c.stats.par.includes(sc.name.split(" ")[0]));
        const relType = isRelated ? selCats.some((sc) => sc.bondedTo === c.id) ? "mate" : "kin" : null;
        const isGuideHL = hand._guideHL?.has(i) && !sel.has(i);
        return /* @__PURE__ */ React.createElement("div", { key: c.id, style: { position: "relative", flexShrink: 0, animation: isGuideHL ? "guidePulse 1.5s ease-in-out infinite" : injuredFlash === c.id ? "shake .5s ease-out" : "none", opacity: isDimmed ? 0.55 : 1, transition: "opacity .15s", boxShadow: injuredFlash === c.id ? "0 0 20px #ef444488" : "none", borderRadius: 8 } }, /* @__PURE__ */ React.createElement(CC, { cat: c, sel: sel.has(i), onClick: () => toggleS(i), dis: ph !== "playing" || !!autoPlay, fog: cfx.fog && !sel.has(i), chemHint: !sel.has(i) ? getHint(c) : null, hl: isRelated || isGuideHL, onTraitClick: (ct) => setTraitTip(ct), sm: mob, cw: _cw || void 0 }), injuredFlash === c.id && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, borderRadius: 8, background: "#ef444433", border: "2px solid #ef444488", animation: "fadeIn .3s ease-out", pointerEvents: "none", zIndex: 5 } }), isRelated && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, background: relType === "mate" ? "#f472b622" : "#4ade8022", padding: "1px 6px", borderRadius: 4, border: `1px solid ${relType === "mate" ? "#f472b644" : "#4ade8044"}`, whiteSpace: "nowrap", animation: "countUp .3s ease-out", zIndex: 10, color: relType === "mate" ? "#f472b6" : "#4ade80" } }, relType === "mate" ? "\u{1F495} mate" : "\u{1F46A} kin"), isGuideHL && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, background: "#fbbf2422", padding: "1px 6px", borderRadius: 4, border: "1px solid #fbbf2444", whiteSpace: "nowrap", animation: "guidePulse 1.5s ease-in-out infinite", zIndex: 10, color: "#fbbf24" } }, "\u{1F446} select"));
      });
    })()), sel.size >= 1 && ph === "playing" && !autoPlay && (() => {
      const selCatsP = [...sel].map((i) => hand[i]).filter(Boolean);
      const evald = evalH?.(selCatsP);
      if (!evald) return null;
      const htLv = getHtLevel?.(evald.name, htLevels || {}) || 1;
      const scaled = getHtScaled?.(evald, htLv);
      const baseC = scaled?.c || evald.base?.c || 0;
      const baseM = scaled?.m || evald.base?.m || 0;
      const bonds = selCatsP.filter((c) => c.bondedTo && selCatsP.find((x) => x.id === c.bondedTo));
      const grudges = selCatsP.filter((c) => (c.grudgedWith || []).some((gid) => selCatsP.find((x) => x.id === gid)));
      return /* @__PURE__ */ React.createElement("div", { onClick: () => {
        const htDescs = { Stray: "1 cat played alone", Kin: "2 cats, same season", ["Two Kin"]: "2 of one season + 2 of another", Clowder: "3 cats, same season", Colony: "4 cats, same season", Litter: "5 cats, same season", ["Full Den"]: "3 of one season + 2 of another", Kindred: "3+ cats with the same trait" };
        toast("\u{1F0CF}", `${evald.name}: ${htDescs[evald.name] || ""}${runCount >= 1 ? `. Base ${baseC}C \xD7 ${baseM}M = ${baseC * baseM}.` : ""}`, "#fbbf24");
      }, style: { textAlign: "center", padding: "2px 0", zIndex: 1, animation: "fadeIn .15s ease-out", cursor: "help" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#fbbf24", letterSpacing: 2 } }, evald.name, htLv > 1 ? ` Lv${htLv}` : ""), runCount >= 1 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#3b82f6", fontWeight: 700, marginLeft: 8 } }, baseC, "C"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#ffffff55", margin: "0 2px" } }, "\xD7"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#ef4444", fontWeight: 700 } }, baseM, "M")), bonds.length > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#4ade80", marginLeft: 6 } }, "\u{1F495}\xD71.5"), grudges.length > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#fb923c", marginLeft: 6 } }, "\u26A1\u22122M"), evald.combo && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#c084fc", marginLeft: 6 } }, "+\u26A1", evald.combo.name));
    })(), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: mob ? 12 : 8, padding: mob ? "10px 8px calc(10px + env(safe-area-inset-bottom, 0px))" : "8px", zIndex: 10, alignItems: "center", position: mob ? "sticky" : "static", bottom: mob ? 0 : "auto", background: mob ? "#0a0a1aee" : "transparent", borderTop: mob ? "1px solid #ffffff0a" : "none", justifyContent: "center" } }, ph === "playing" && hLeft <= 0 && rScore < tgt ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => endRun(false, rScore), style: { ...BTN("linear-gradient(135deg,#ef4444,#dc2626)", "#fff"), padding: mob ? "12px 24px" : "10px 20px", fontSize: 14, animation: "fpp 1.5s ease infinite" } }, "Face the Dark"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444bb", marginTop: 4 } }, rScore > 0 ? `${rScore.toLocaleString()} scored. ${Math.max(0, tgt - rScore).toLocaleString()} short.` : "No hands remaining")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, runCount >= 1 ? (() => {
      const cost = recruitCost();
      const canRecruit = ph === "playing" && !autoPlay && gold >= cost && (draw.length > 0 || disc.length > 0);
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: recruitCat, disabled: !canRecruit, style: { ...BTN(canRecruit ? "#1a2e1a" : "#111", canRecruit ? "#4ade80" : "#444", canRecruit), border: `1px solid ${canRecruit ? "#4ade8044" : "#222"}`, minWidth: mob ? 56 : 50, padding: mob ? "10px 10px" : "8px 10px", fontSize: 10 } }, "+1 Cat"), /* @__PURE__ */ React.createElement("div", { onClick: () => toast("\u{1F431}", "Recruit: draw an extra cat into your hand. Cost doubles each time (1\u21922\u21924\u21928\u{1F41F}). More cats = better hands. Unplayed cats with traits give passive bonuses.", "#4ade80", 5500), style: { fontSize: 10, color: cost === 0 ? "#4ade80" : gold >= cost ? "#fbbf24" : "#ef4444", marginTop: 2, cursor: "help" } }, cost === 0 ? "Free!" : cost + "\u{1F41F}"));
    })() : null), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: discardH, disabled: !sel.size || sel.size > MAX_DISCARD || dLeft <= 0 || ph !== "playing" || cfx.noDisc, style: { ...BTN(sel.size && sel.size <= MAX_DISCARD && dLeft > 0 && ph === "playing" && !cfx.noDisc ? "#1a1a2e" : "#111", sel.size && sel.size <= MAX_DISCARD && dLeft > 0 && ph === "playing" && !cfx.noDisc ? "#ef4444" : "#444", sel.size > 0 && sel.size <= MAX_DISCARD && dLeft > 0 && ph === "playing" && !cfx.noDisc), border: `1px solid ${sel.size && sel.size <= MAX_DISCARD && dLeft > 0 && !cfx.noDisc ? "#ef444444" : "#222"}`, minWidth: mob ? 56 : 60, padding: mob ? "10px 10px" : "8px 14px" } }, "Discard", cfx.noDisc ? " \u{1F6AB}" : ""), /* @__PURE__ */ React.createElement("div", { onClick: () => toast("\u267B\uFE0F", `Discard: swap up to ${MAX_DISCARD} selected cats for new draws. Free!`, "#ef4444"), style: { fontSize: 10, color: cfx.noDisc ? "#ef4444bb" : sel.size > MAX_DISCARD ? "#ef4444" : dLeft <= 0 ? "#ef4444" : "#888", marginTop: 2, cursor: "help" } }, cfx.noDisc ? "Disabled" : sel.size > MAX_DISCARD ? `Max ${MAX_DISCARD}` : `${dLeft} left`), dLeft > 0 && draw.length >= 1 && !cfx.fog && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, justifyContent: "center", marginTop: 2 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ffffff33" } }, "Next:"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, padding: "1px 5px", borderRadius: 3, background: BREEDS[draw[0].breed]?.color + "15", border: `1px solid ${BREEDS[draw[0].breed]?.color}22`, color: BREEDS[draw[0].breed]?.color || "#888" } }, BREEDS[draw[0].breed]?.icon, " P", draw[0].power)), sel.size > 0 && dLeft > 0 && !cfx.noDisc && ph === "playing" && (() => {
      const selCats2 = [...sel].map((i) => hand[i]).filter(Boolean);
      const hints = [];
      selCats2.forEach((c) => {
        if (catHas(c, "Scrapper")) hints.push({ icon: "\u{1F94A}", text: "+1 Nerve", color: "#fb923c" });
        else if (catHas(c, "Cursed")) hints.push({ icon: "\u{1F480}", text: "+1 Nerve", color: "#d97706" });
        else if (catHas(c, "Nocturnal")) hints.push({ icon: "\u{1F319}", text: "+2 Nerve", color: "#c084fc" });
        else if (catHas(c, "Devoted") && c.bondedTo) hints.push({ icon: "\u{1FAC0}", text: "mate +P", color: "#f472b6" });
        else if (catHas(c, "Guardian")) hints.push({ icon: "\u{1F6E1}\uFE0F", text: "heal", color: "#4ade80" });
        else if (catHas(c, "Stubborn")) hints.push({ icon: "\u{1FAA8}", text: "+1 Nerve", color: "#9ca3af" });
        else if (catHas(c, "Stray")) hints.push({ icon: "\u{1F408}", text: "+1 draw", color: "#67e8f9" });
        else if (catHas(c, "Loyal")) hints.push({ icon: "\u{1FAC2}", text: "+1 mult all", color: "#f472b6" });
        else if (catHas(c, "Scavenger")) hints.push({ icon: "\u{1F33E}", text: "+2\u{1F41F}", color: "#4ade80" });
      });
      return hints.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4ade80", marginTop: 1 } }, hints.slice(0, 2).map((h, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: { color: h.color } }, h.icon, h.text, " "))) : null;
    })(), undoRef.current && ph === "playing" && !isDailyRun && /* @__PURE__ */ React.createElement("button", { onClick: undoDiscard, style: { fontSize: 9, padding: "2px 8px", borderRadius: 4, border: "1px solid #ffffff15", background: "#ffffff06", color: "#888", cursor: "pointer", marginTop: 2 } }, "\u21A9 Undo")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, sel.size >= 2 && ph === "playing" && !autoPlay && runCount >= 3 && (() => {
      const cats = [...sel].map((i) => hand[i]).filter(Boolean);
      if (cats.length < 1) return null;
      const preview2 = calcScore(cats, fams, ferv, cfx, { gold, deckSize: allC.length, discSize: disc.length, handSize: hs(), beatingPace: rScore >= tgt, bossTraitFx: [], scarMult: getMB().scarMult || 0, grudgeWisdom: getMB().grudgeWisdom || 0, hasMastery: !!getMB().xp, bondBoost: getMB().bondBoost || 0, comboBoost: getMB().comboBoost || 0, doubleBench: getMB().doubleBench || 0, kindredMult: tempMods.kindredMult || 0, weatherSeason: weather?.season || null, nightModFx: nightMod?.fx || {}, lastHandIds, lastHandLost, lastHandType, htLevels, devotion, bench: hand.filter((c) => !cats.find((x) => x.id === c.id)) });
      const htName = preview2.ht || "?";
      return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24aa", marginBottom: 2, letterSpacing: 1 } }, htName, " \xB7 ~", preview2.total.toLocaleString());
    })(), /* @__PURE__ */ React.createElement("button", { onClick: playH, disabled: !sel.size || hLeft <= 0 || ph !== "playing" || !!autoPlay, style: { ...BTN(sel.size && ph === "playing" && !autoPlay ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "#222", sel.size && ph === "playing" && !autoPlay ? "#0a0a1a" : "#555", sel.size > 0 && ph === "playing" && !autoPlay), minWidth: mob ? 80 : 70, padding: mob ? "12px 18px" : "8px 16px", fontSize: mob ? 15 : 14, animation: hLeft === 1 && rScore < tgt ? "fpp 1.2s ease infinite" : "none", boxShadow: hLeft === 1 && rScore < tgt ? "0 0 20px #ef444488" : "none" } }, "Play", hLeft === 1 && rScore < tgt ? " \u26A0" : ""), /* @__PURE__ */ React.createElement("div", { onClick: () => toast("\u{1F0CF}", `Hands: ${hLeft} remaining this round. Each hand plays up to 5 cats. Score \u2265 target to clear.`, "#3b82f6", 4500), style: { fontSize: 10, color: hLeft <= 1 && rScore < tgt ? "#ef4444" : "#888", marginTop: 2, fontWeight: hLeft <= 1 && rScore < tgt ? 900 : 400, animation: hLeft <= 1 && rScore < tgt ? "fpp 1s ease infinite" : "none", cursor: "help" } }, hLeft <= 1 && rScore < tgt ? "\u26A0 FINAL" : hLeft === 0 ? "Done" : `Hands: ${hLeft}`)), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setDeckView(true), style: { ...BTN("#1a1a2e", "#888"), border: "1px solid #ffffff12", padding: mob ? "10px 10px" : "8px 10px", fontSize: 10, minWidth: mob ? 44 : 45 } }, allC.length > 0 ? `${allC.length} \u{1F431}` : "Deck"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#666", marginTop: 1 } }, draw.length, "\u2191 ", disc.length, "\u2193"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", marginTop: 1, cursor: "pointer" }, onClick: () => setHandSort((s) => s === "season" ? "power" : "season") }, handSort === "season" ? "\u2600 szn" : "\u26A1 pwr")))), meta && meta.stats.w < 3 && ph === "playing" && !autoPlay && (() => {
      const isVeryNew = !meta || meta.stats.r <= 1;
      const PLAY_HINTS = isVeryNew ? [
        "Match season icons (\u{1F342}\u2600\uFE0F\u2744\uFE0F\u{1F331}) for bigger scores. More matches = more points!",
        "2 matching = Kin. 3 = Clowder. 4 = Colony. 5 = Litter!",
        "Tap cats to select, then Play. Match 3+ of one season (\u{1F342}\u{1F342}\u{1F342}) for a Clowder. That's your bread and butter.",
        "+1 Cat button: spend \u{1F41F} to draw an extra cat. More cats = better combos + bench bonuses!",
        "Discard swaps selected cats for new ones. It's free! Use it to fish for better matches."
      ] : [
        "Match season icons for bigger scores. Same-season cats resonate. 3+ of one season = Clowder or Colony.",
        "Bonded cats (\u2661) score \xD71.5 when played together.",
        "Scarred cats (\u2694) score \xD71.25. Scars are power, not damage.",
        "Wards boost your score every hand. Buy one at the Market.",
        "Nerve grows every time you clear a blind. Boss clears give more if you're fast.",
        "Unplayed cats in your hand give bench bonuses. Traits work from the bench too.",
        "Unspent rations earn interest. Save 5+ for a bonus each round.",
        "+1 Cat: spend rations to recruit extra cats. Great for boss rounds!",
        "Shelter a \u2642 + \u2640 pair in the den to breed kittens. Check the sex symbols!",
        "Cats earn epithets from events: scars, bonds, boss clears. Check the Hearth."
      ];
      const hIdx = Math.floor(((ante - 1) * 3 + blind + Math.floor(rScore / 2e3)) % PLAY_HINTS.length);
      return /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "4px 16px", maxWidth: 400, margin: "0 auto", animation: "fadeIn 1s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: isVeryNew ? 12 : 10, color: isVeryNew ? "#fbbf24aa" : "#ffffff44", lineHeight: 1.5, padding: isVeryNew ? "4px 12px" : "0", borderRadius: 8, background: isVeryNew ? "#fbbf2408" : "transparent", border: isVeryNew ? "1px solid #fbbf2415" : "none" } }, isVeryNew ? "\u{1F3AF} " : "", PLAY_HINTS[hIdx]));
    })(), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 700, width: "100%", padding: "2px 16px", zIndex: 1, marginTop: "auto" } }, /* @__PURE__ */ React.createElement("details", { style: { cursor: "pointer" } }, /* @__PURE__ */ React.createElement("summary", { style: { fontSize: 10, color: "#666", letterSpacing: 2 } }, "REFERENCE"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 2, marginTop: 4 } }, HT.slice(1).map((h) => {
      const best = handBests[h.name];
      const isHidden = h.hidden;
      const discovered = (meta?.stats?.dh || []).includes(h.name);
      const show = !isHidden || discovered;
      return /* @__PURE__ */ React.createElement("div", { key: h.name, style: { fontSize: 10, color: show ? "#555" : "#333" } }, show ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: discovered ? "#c084fc" : "#888", fontWeight: 600 } }, h.name, discovered ? " \u2728" : ""), " ", /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6" } }, h.base.c), "x", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, h.base.m), " ", h.ex, best ? /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24bb" } }, " best:", best.toLocaleString()) : "") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "#666", fontWeight: 600 } }, "????"), " ", /* @__PURE__ */ React.createElement("span", { style: { fontStyle: "italic", color: "#666666bb" } }, "Trait combo")));
    }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 1, marginTop: 4, borderTop: "1px solid #ffffff08", paddingTop: 3 } }, "POWER COMBOS ", /* @__PURE__ */ React.createElement("span", { style: { color: "#666", fontStyle: "italic" } }, "(stack on season hands)")), POWER_COMBOS.map((p) => {
      const best = handBests[p.name];
      const discovered = (meta?.stats?.dh || []).includes(p.name);
      return /* @__PURE__ */ React.createElement("div", { key: p.name, style: { fontSize: 10, color: discovered ? "#555" : "#333" } }, discovered ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "#c084fc", fontWeight: 600 } }, p.name, " \u2728"), " +", /* @__PURE__ */ React.createElement("span", { style: { color: "#3b82f6" } }, p.bonus.c), "C +", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, p.bonus.m), "M ", p.ex, best ? /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24bb" } }, " best:", best.toLocaleString()) : "") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "#666", fontWeight: 600 } }, "????"), " ", /* @__PURE__ */ React.createElement("span", { style: { fontStyle: "italic", color: "#666666bb" } }, p.ex.includes("consecutive") ? "Consecutive combo" : "Matching combo")));
    })), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid #ffffff0a", marginTop: 4, paddingTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", letterSpacing: 1, marginBottom: 2 } }, "TRAITS"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 1 } }, TRAITS.map((t) => {
      const tl = traitTierLabel(t);
      return /* @__PURE__ */ React.createElement("div", { key: t.name, style: { fontSize: 10, color: tl.color } }, t.icon, " ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600 } }, t.name), " ", /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.6, fontSize: 10 } }, "(", tl.label, ")"), " ", t.desc);
    }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, paddingTop: 4, fontSize: 10, color: "#666", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", null, "\u2694 Scarred: \xD71.25 mult"), /* @__PURE__ */ React.createElement("span", null, "\u{1FA79} Injured: Half power, \u22122 mult (heals in 2 rounds)"), /* @__PURE__ */ React.createElement("span", null, "\u{1F525} Nerve: \xD71.0 to \xD72.3 (clear with unused hands to build)")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, paddingBottom: 4, fontSize: 10, color: "#666", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F495} Bonded pair: \xD7", getMB().bondBoost ? "1.75" : "1.5", " mult (from den shelter)"), /* @__PURE__ */ React.createElement("span", null, "\u26A1 Grudge: Always \u2212", (getMB().grudgeWisdom || 0) > 0 ? "1" : "2", " mult when grudged cats play together"), /* @__PURE__ */ React.createElement("span", null, "\u{1FA91} Bench: Unplayed hand cats give passive bonuses (traits or power as chips)")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, paddingBottom: 4, fontSize: 10, color: "#666", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F4E3} Recruit: Pay \u{1F41F} to draw extra cats (1\u21922\u21924\u21928\u{1F41F}). More cards = better combos + bench"), /* @__PURE__ */ React.createElement("span", null, "\u{1F3F7}\uFE0F Epithets: Cats earn titles from events (scars, bonds, boss clears). Shown in Hearth")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, paddingBottom: 6, fontSize: 10, color: "#666", flexWrap: "wrap" } }, Object.keys(DEVOTION_MILESTONES).map((k) => /* @__PURE__ */ React.createElement("span", { key: k, style: { color: BREEDS[k]?.color || "#888" } }, BREEDS[k]?.icon, " ", k, ": Play ", k, " cats to unlock devotion bonuses"))))), showAbandon && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 8, left: 8, zIndex: 200, display: "flex", gap: 4, alignItems: "center" } }, abandonConfirm ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setAbandonConfirm(false);
      setPh("title");
      setTab("play");
    }, style: { background: "#ef444433", border: "1px solid #ef4444", borderRadius: 6, fontSize: 10, cursor: "pointer", padding: "4px 10px", color: "#ef4444", animation: "fadeIn .2s ease-out" } }, "Abandon Run"), /* @__PURE__ */ React.createElement("button", { onClick: () => setAbandonConfirm(false), style: { background: "none", border: "1px solid #ffffff22", borderRadius: 6, fontSize: 10, cursor: "pointer", padding: "4px 8px", color: "#888" } }, "\u2715")) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setAbandonConfirm(true), style: { background: "#ffffff08", border: "1px solid #ffffff22", borderRadius: 8, fontSize: 11, cursor: "pointer", padding: "6px 10px", color: "#aaa", display: "flex", alignItems: "center", gap: 4 }, title: "Abandon run" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, "\u2630"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, letterSpacing: 1 } }, "MENU")), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowLog((l) => !l), style: { background: showLog ? "#fbbf2412" : "#ffffff08", border: `1px solid ${showLog ? "#fbbf2444" : "#ffffff22"}`, borderRadius: 8, fontSize: 11, cursor: "pointer", padding: "6px 10px", color: showLog ? "#fbbf24" : "#aaa", display: "flex", alignItems: "center", gap: 4 }, title: "Run log" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, "\u{1F4CB}"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, letterSpacing: 1 } }, "LOG")))), showLog && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 0, left: 0, bottom: 0, width: Math.min(320, vw - 40), zIndex: 250, background: "#0d1117f8", borderRight: "1px solid #ffffff15", overflowY: "auto", padding: "40px 12px 20px", animation: "slideIn .2s ease-out" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#fbbf24", letterSpacing: 3, fontWeight: 700 } }, "\u{1F4CB} RUN LOG"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowLog(false), style: { background: "none", border: "none", color: "#666", fontSize: 14, cursor: "pointer" } }, "\u2715")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#666", marginBottom: 8 } }, "Night ", ante, " \xB7 Round ", blind + 1, "/3 \xB7 ", runLog.length, " events"), runLog.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#666", fontStyle: "italic" } }, "Nothing has happened yet.") : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } }, [...runLog].reverse().map((e, i) => {
      const icons = { hand: "\u{1F0CF}", draft: "\u{1F4E6}", buy: "\u{1F6D2}", night: "\u{1F319}", fight: "\u2694", death: "\u{1F480}", bond: "\u{1F495}", grudge: "\u26A1", reconcile: "\u{1F54A}\uFE0F", breed: "\u{1F423}", mentor: "\u{1F4D6}", growth: "\u2B50", found: "\u{1F41F}", wanderer: "\u{1F431}", trait: "\u2728", phoenix: "\u{1F525}", teach: "\u{1F46A}", reward: "\u{1F381}", exile: "\u{1F6AB}", training: "\u2694\uFE0F", sell: "\u{1F3F7}\uFE0F" };
      const icon = icons[e.type] || "\u2022";
      const colors = { hand: "#fbbf24", death: "#ef4444", fight: "#ef4444", grudge: "#fb923c", bond: "#f472b6", breed: "#4ade80", reconcile: "#67e8f9", growth: "#4ade80", phoenix: "#fbbf24", trait: "#fbbf24", buy: "#fbbf24", night: "#888", draft: "#888", mentor: "#c084fc", teach: "#34d399" };
      const color = colors[e.type] || "#666";
      let text = "";
      const d = e.data;
      if (e.type === "hand") text = `${d.type}: ${d.score.toLocaleString()} (${d.cats})`;
      else if (e.type === "death") text = `${d.victim} lost`;
      else if (e.type === "fight") text = `${d.loser} hurt (\u2212${d.dmg}P)`;
      else if (e.type === "bond") text = `${d.c1} + ${d.c2} bonded`;
      else if (e.type === "grudge") text = `${d.c1} \u26A1 ${d.c2} grudge`;
      else if (e.type === "reconcile") text = `${d.c1} + ${d.c2} reconciled${d.bonded ? " + bonded" : ""}`;
      else if (e.type === "breed") text = `${d.baby} born (${d.parents})`;
      else if (e.type === "buy") text = `Bought ${d.name} (${d.cost}\u{1F41F})`;
      else if (e.type === "draft") text = `Drafted: ${d.picked}`;
      else if (e.type === "night") text = `Night ${d.from} \u2192 ${d.to}`;
      else if (e.type === "growth") text = `${d.cat} +1P`;
      else if (e.type === "mentor") text = `${d.elder} \u2192 ${d.young}`;
      else if (e.type === "found") text = `${d.cat} found ${d.gold}\u{1F41F}`;
      else if (e.type === "wanderer") text = `${d.cat} joined`;
      else if (e.type === "trait") text = `${d.cat} gained ${d.trait}`;
      else if (e.type === "phoenix") text = `${d.risen} rose!`;
      else if (e.type === "teach") text = `${d.parent} taught ${d.child} ${d.trait}`;
      else if (e.type === "reward") text = `Reward: ${d.name}`;
      else if (e.type === "exile") text = d.victim;
      else if (e.type === "training") text = `${d.c1} & ${d.c2} sparred`;
      else text = JSON.stringify(d).slice(0, 40);
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 10, color, lineHeight: 1.4, padding: "2px 0", borderBottom: "1px solid #ffffff06" } }, /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.5 } }, icon), " ", text, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#666", marginLeft: 4 } }, "N", e.ante, ".", e.blind + 1));
    }))), toasts.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: mob ? "auto" : 12, bottom: mob ? 80 : "auto", left: mob ? "50%" : "auto", right: mob ? "auto" : 12, transform: mob ? "translateX(-50%)" : "none", zIndex: 300, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none", maxWidth: mob ? 320 : 280, alignItems: mob ? "center" : "flex-end" } }, toasts.slice(0, mob ? 2 : 3).map((t) => /* @__PURE__ */ React.createElement("div", { key: t.id, style: { display: "flex", gap: 8, alignItems: "center", padding: t.big ? "12px 18px" : "8px 14px", borderRadius: t.big ? 10 : 8, background: "#1a1a2eee", border: `1.5px solid ${t.color}${t.big ? "66" : "44"}`, boxShadow: `0 4px 16px #00000066,0 0 ${t.big ? 16 : 8}px ${t.color}${t.big ? "44" : "22"}`, animation: `${t.neg ? "slideInLeft" : "slideInRight"} .3s ease-out` }, className: t.neg ? "toast-enter-neg" : "toast-enter" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: t.big ? 22 : 16, flexShrink: 0 } }, t.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: t.big ? 14 : 12, color: t.color, fontWeight: t.big ? 700 : 600, lineHeight: 1.3 } }, t.text)))));
  }
  class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error("Ninth Life crashed:", error, info); }
    render() {
      if (this.state.hasError) {
        return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0a0a1a", color: "#e8e6e3", gap: 16, padding: 20, textAlign: "center" } },
          React.createElement("div", { style: { fontSize: 48 } }, "\u{1F525}"),
          React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: "#fbbf24", letterSpacing: 4 } }, "NINTH LIFE"),
          React.createElement("div", { style: { fontSize: 14, color: "#ef4444", maxWidth: 320, lineHeight: 1.6 } }, "Something broke. Your save data is safe."),
          React.createElement("div", { style: { fontSize: 11, color: "#666", maxWidth: 300, lineHeight: 1.5 } }, "The Hearth still burns. Tap below to return."),
          React.createElement("button", { onClick: () => { this.setState({ hasError: false, error: null }); }, style: { background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#0a0a1a", border: "none", borderRadius: 10, padding: "14px 44px", fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: 3, marginTop: 8 } }, "Restart"),
          React.createElement("div", { style: { fontSize: 9, color: "#444", maxWidth: 280, marginTop: 8 } }, String(this.state.error?.message || "Unknown error").slice(0, 120))
        );
      }
      return this.props.children;
    }
  }
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(ErrorBoundary, null, React.createElement(NinthLife)));
})();
