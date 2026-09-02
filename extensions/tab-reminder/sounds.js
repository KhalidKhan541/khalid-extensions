const TabReminderSounds = (() => {
  'use strict';

  let audioContext = null;
  let volume = 0.5;
  const STORAGE_KEY = 'tab_reminder_sounds';

  function getAudioContext() {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    chrome.storage.local.set({ [STORAGE_KEY]: { volume } });
  }

  async function loadVolume() {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data[STORAGE_KEY] && typeof data[STORAGE_KEY].volume === 'number') {
        volume = data[STORAGE_KEY].volume;
      }
    } catch (e) {}
  }

  function playGentleChime() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(volume * 0.3, now + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.5);
    });
  }

  function playGentleAlert() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    [0, 0.2, 0.4].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  }

  function playUrgentAlert() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const freqs = [880, 1100, 880, 1100, 880];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(volume * 0.25, now + i * 0.12 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.1);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.12);
    });
  }

  function playDigitalBeep() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    [0, 0.15, 0.3, 0.6].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = i < 3 ? 800 : 600;
      gain.gain.setValueAtTime(volume * 0.35, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  }

  function playNotificationChime() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [
      { freq: 392, time: 0, dur: 0.15 },
      { freq: 494, time: 0.1, dur: 0.15 },
      { freq: 587, time: 0.2, dur: 0.15 },
      { freq: 784, time: 0.3, dur: 0.3 },
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0, now + n.time);
      gain.gain.linearRampToValueAtTime(volume * 0.3, now + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur + 0.05);
    });
  }

  function playMelody(melody) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    let time = 0;

    melody.forEach(({ freq, duration, rest }) => {
      if (freq > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume * 0.3, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration * 0.9);
        osc.start(now + time);
        osc.stop(now + time + duration);
      }
      time += (rest || 0.05);
    });
  }

  function playPreset(presetName) {
    switch (presetName) {
      case 'gentle': playGentleChime(); break;
      case 'alert': playGentleAlert(); break;
      case 'urgent': playUrgentAlert(); break;
      case 'beep': playDigitalBeep(); break;
      case 'chime': playNotificationChime(); break;
      default: playGentleChime();
    }
  }

  async function playCustomSound(dataUrl) {
    return new Promise((resolve, reject) => {
      const ctx = getAudioContext();
      const audio = new Audio(dataUrl);
      audio.volume = volume;
      audio.onended = resolve;
      audio.onerror = reject;

      const source = ctx.createMediaElementSource(audio);
      source.connect(ctx.destination);
      audio.play().catch(reject);
    });
  }

  function getSupportedPresets() {
    return [
      { id: 'gentle', name: 'Gentle Chime', description: 'Soft ascending notes' },
      { id: 'alert', name: 'Gentle Alert', description: 'Three soft beeps' },
      { id: 'urgent', name: 'Urgent Alert', description: 'Fast urgent tones' },
      { id: 'beep', name: 'Digital Beep', description: 'Digital notification' },
      { id: 'chime', name: 'Notification Chime', description: 'Melodic chime' },
    ];
  }

  loadVolume();

  return {
    playGentleChime,
    playGentleAlert,
    playUrgentAlert,
    playDigitalBeep,
    playNotificationChime,
    playPreset,
    playCustomSound,
    setVolume,
    getSupportedPresets,
    playMelody
  };
})();

if (typeof window !== 'undefined') {
  window.TabReminderSounds = TabReminderSounds;
}
