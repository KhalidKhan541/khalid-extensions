// Focus Zone Sound Manager
// Uses Web Audio API for all sounds - no external files needed

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.ambientSource = null;
    this.ambientGain = null;
    this.tickOscillator = null;
    this.isAmbientPlaying = false;
    this.currentAmbientSound = null;
    this.volume = 0.5;
    
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }

  resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Generate tick sound
  playTick() {
    if (!this.audioContext) return;
    this.resumeContext();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1 * this.volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  // Generate completion chime
  playCompletion() {
    if (!this.audioContext) return;
    this.resumeContext();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const duration = 0.3;
    const noteGap = 0.15;

    notes.forEach((freq, index) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = this.audioContext.currentTime + (index * noteGap);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3 * this.volume, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  // Generate break chime
  playBreak() {
    if (!this.audioContext) return;
    this.resumeContext();

    const notes = [392, 329.63, 261.63]; // G4, E4, C4
    const duration = 0.4;
    const noteGap = 0.2;

    notes.forEach((freq, index) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = this.audioContext.currentTime + (index * noteGap);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3 * this.volume, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  // Generate ambient sounds
  startAmbient(type = 'rain', volume = 0.5) {
    this.stopAmbient();
    this.volume = volume;
    this.currentAmbientSound = type;

    if (!this.audioContext) return;
    this.resumeContext();

    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate different noise types
    switch (type) {
      case 'rain':
        this.generateRainNoise(output, bufferSize);
        break;
      case 'forest':
        this.generateForestNoise(output, bufferSize);
        break;
      case 'coffee':
        this.generateCoffeeShopNoise(output, bufferSize);
        break;
      default:
        this.generateRainNoise(output, bufferSize);
    }

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Create filters for different ambient sounds
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';

    switch (type) {
      case 'rain':
        filter.frequency.value = 2000;
        break;
      case 'forest':
        filter.frequency.value = 800;
        break;
      case 'coffee':
        filter.frequency.value = 1500;
        break;
    }

    this.ambientGain = this.audioContext.createGain();
    this.ambientGain.gain.value = volume * 0.3;

    noiseSource.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.audioContext.destination);

    noiseSource.start();
    this.ambientSource = noiseSource;
    this.isAmbientPlaying = true;
  }

  generateRainNoise(output, bufferSize) {
    for (let i = 0; i < bufferSize; i++) {
      // White noise with occasional louder drops
      const white = Math.random() * 2 - 1;
      const rainDrop = Math.random() > 0.99 ? (Math.random() * 2 - 1) * 2 : 0;
      output[i] = (white * 0.3 + rainDrop) * 0.5;
    }
  }

  generateForestNoise(output, bufferSize) {
    for (let i = 0; i < bufferSize; i++) {
      // Gentle noise with periodic bird-like sounds
      const noise = Math.random() * 2 - 1;
      const birdChirp = Math.sin(i * 0.1) * Math.sin(i * 0.03) * 0.2;
      output[i] = (noise * 0.1 + birdChirp) * 0.5;
    }
  }

  generateCoffeeShopNoise(output, bufferSize) {
    for (let i = 0; i < bufferSize; i++) {
      // Murmur with occasional clinks
      const murmur = Math.random() * 2 - 1;
      const clink = Math.random() > 0.999 ? (Math.random() * 2 - 1) * 0.5 : 0;
      output[i] = (murmur * 0.2 + clink) * 0.5;
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.ambientSource = null;
    }
    this.isAmbientPlaying = false;
    this.currentAmbientSound = null;
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.ambientGain) {
      this.ambientGain.gain.value = volume * 0.3;
    }
  }

  changeAmbient(type, volume) {
    this.startAmbient(type, volume);
  }
}

// Create global sound manager instance
const soundManager = new SoundManager();

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'playTickSound':
      soundManager.playTick();
      sendResponse({ success: true });
      break;
      
    case 'playCompletionSound':
      soundManager.playCompletion();
      sendResponse({ success: true });
      break;
      
    case 'playBreakSound':
      soundManager.playBreak();
      sendResponse({ success: true });
      break;
      
    case 'startAmbient':
      soundManager.startAmbient(message.sound, message.volume);
      sendResponse({ success: true });
      break;
      
    case 'stopAmbient':
      soundManager.stopAmbient();
      sendResponse({ success: true });
      break;
      
    case 'changeAmbient':
      soundManager.changeAmbient(message.sound, message.volume);
      sendResponse({ success: true });
      break;
      
    case 'setVolume':
      soundManager.setVolume(message.volume);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true;
});
