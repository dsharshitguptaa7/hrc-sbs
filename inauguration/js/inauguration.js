/**
 * ==========================================================================
 * HARISH-CHANDRA RESEARCH CENTRE — AUDITORIUM INAUGURATION CEREMONY
 * School of Basic Sciences | CSJMU Kanpur × IIT Kanpur
 * ==========================================================================
 */

(function () {
  'use strict';

  // --- Constants ---
  const PORTAL_URL = 'https://hrc-sbs.vercel.app/';

  // --- DOM Elements ---
  const body = document.body;
  const btnAudioToggle = document.getElementById('btnAudioToggle');
  const audioStatusText = document.getElementById('audioStatusText');
  const btnFastForward = document.getElementById('btnFastForward');
  const btnBeginInauguration = document.getElementById('btnBeginInauguration');
  const btnCutRibbon = document.getElementById('btnCutRibbon');
  const btnEnterWebsite = document.getElementById('btnEnterWebsite');
  const btnReplayExperience = document.getElementById('btnReplayExperience');
  const ceremonialScissors = document.getElementById('ceremonialScissors');
  const ribbonSnipSpark = document.getElementById('ribbonSnipSpark');
  const ceremonyCanvas = document.getElementById('ceremonyCanvas');

  // --- State Variables ---
  let isSoundActive = false;
  let isActionInProgress = false;
  let stepTimeouts = [];
  let audioContext = null;

  // ==========================================================================
  // Web Audio Procedural Sound Synthesizer (Zero External Dependencies)
  // ==========================================================================
  function ensureAudioContext() {
    if (!audioContext) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioContext = new AudioCtxClass();
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  function playCurtainSwell() {
    if (!isSoundActive || !audioContext) return;
    try {
      const t = audioContext.currentTime;
      // Warm orchestral low pad triad (C3, G3, C4)
      [130.81, 196.00, 261.63].forEach((f, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, t);
        filter.frequency.exponentialRampToValueAtTime(1100, t + 1.5);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.05 / (idx + 1), t + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(t);
        osc.stop(t + 2.7);
      });
    } catch (e) {
      console.warn('Audio notice:', e);
    }
  }

  function playScissorsSnip() {
    if (!isSoundActive || !audioContext) return;
    try {
      const t = audioContext.currentTime;

      // 1. Friction noise snap
      const bufferSize = audioContext.sampleRate * 0.07;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;

      const bandpass = audioContext.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(3400, t);
      bandpass.Q.setValueAtTime(6, t);

      const noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.2, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      noise.start(t);

      // 2. Metallic resonant click
      const click = audioContext.createOscillator();
      const clickGain = audioContext.createGain();
      click.type = 'sine';
      click.frequency.setValueAtTime(4400, t);
      click.frequency.exponentialRampToValueAtTime(1600, t + 0.05);

      clickGain.gain.setValueAtTime(0.22, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      click.connect(clickGain);
      clickGain.connect(audioContext.destination);
      click.start(t);
      click.stop(t + 0.07);
    } catch (e) {
      console.warn('Audio notice:', e);
    }
  }

  function playFanfareChime() {
    if (!isSoundActive || !audioContext) return;
    try {
      const t = audioContext.currentTime;
      // Restrained golden bell chime: C5, E5, G5, C6
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const startTime = t + idx * 0.1;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.07, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.2);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(startTime);
        osc.stop(startTime + 2.3);
      });
    } catch (e) {
      console.warn('Audio notice:', e);
    }
  }

  function toggleAudio() {
    isSoundActive = !isSoundActive;
    if (isSoundActive) {
      ensureAudioContext();
      btnAudioToggle.classList.add('active');
      btnAudioToggle.setAttribute('aria-pressed', 'true');
      if (audioStatusText) audioStatusText.textContent = 'Sound: On';
    } else {
      btnAudioToggle.classList.remove('active');
      btnAudioToggle.setAttribute('aria-pressed', 'false');
      if (audioStatusText) audioStatusText.textContent = 'Sound: Off';
    }
  }

  // ==========================================================================
  // Restrained Canvas Particle Engine (Ambient Dust & Subtle Cut Sparkle)
  // ==========================================================================
  let canvasContext = null;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let dustParticles = [];
  let cutFlakes = [];

  function resizeCanvas() {
    if (!ceremonyCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    ceremonyCanvas.width = canvasWidth * dpr;
    ceremonyCanvas.height = canvasHeight * dpr;
    ceremonyCanvas.style.width = canvasWidth + 'px';
    ceremonyCanvas.style.height = canvasHeight + 'px';
    canvasContext = ceremonyCanvas.getContext('2d');
    canvasContext.scale(dpr, dpr);
  }

  function initDust() {
    dustParticles = [];
    // Subtle, restrained atmospheric floating dust
    const count = 35;
    for (let i = 0; i < count; i++) {
      dustParticles.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        radius: Math.random() * 1.5 + 0.6,
        speedY: -(Math.random() * 0.25 + 0.1),
        speedX: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.4 + 0.15,
        color: i % 4 === 0 ? '#FFEAA7' : '#D4AF37'
      });
    }
  }

  function triggerCutSparkle() {
    cutFlakes = [];
    const count = 55; // Restrained, academic shower
    const originX = canvasWidth * 0.5;
    const originY = canvasHeight * 0.77; // Exactly at ribbon waist level

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * 120 + 210) * (Math.PI / 180);
      const speed = Math.random() * 6 + 3;
      cutFlakes.push({
        x: originX + (Math.random() * 20 - 10),
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.16 + Math.random() * 0.06,
        drag: 0.97,
        width: Math.random() * 6 + 3,
        height: Math.random() * 4 + 2,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        color: Math.random() > 0.2 ? '#D4AF37' : '#FFF5C2',
        alpha: 1
      });
    }
  }

  function renderAtmosphere() {
    if (!canvasContext) {
      requestAnimationFrame(renderAtmosphere);
      return;
    }

    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Ambient Dust
    for (let i = 0; i < dustParticles.length; i++) {
      const p = dustParticles[i];
      p.y += p.speedY;
      p.x += p.speedX;

      if (p.y < -10) p.y = canvasHeight + 10;
      if (p.x < -10) p.x = canvasWidth + 10;
      if (p.x > canvasWidth + 10) p.x = -10;

      canvasContext.beginPath();
      canvasContext.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      canvasContext.fillStyle = p.color;
      canvasContext.globalAlpha = p.alpha;
      canvasContext.fill();
    }

    // 2. Restrained Cut Flakes
    for (let i = 0; i < cutFlakes.length; i++) {
      const f = cutFlakes[i];
      f.vx *= f.drag;
      f.vy *= f.drag;
      f.vy += f.gravity;
      f.x += f.vx;
      f.y += f.vy;
      f.rotation += f.rotSpeed;

      if (f.y > canvasHeight - 20) {
        f.alpha -= 0.02;
      }

      if (f.alpha > 0.01) {
        canvasContext.save();
        canvasContext.translate(f.x, f.y);
        canvasContext.rotate((f.rotation * Math.PI) / 180);
        canvasContext.fillStyle = f.color;
        canvasContext.globalAlpha = Math.max(0, f.alpha);
        canvasContext.fillRect(-f.width / 2, -f.height / 2, f.width, f.height);
        canvasContext.restore();
      }
    }

    canvasContext.globalAlpha = 1;
    requestAnimationFrame(renderAtmosphere);
  }

  // ==========================================================================
  // Sequential Phased Ceremony Logic
  // ==========================================================================
  function clearAllTimeouts() {
    stepTimeouts.forEach(t => clearTimeout(t));
    stepTimeouts = [];
  }

  /**
   * Phase 2: User clicks "BEGIN INAUGURATION"
   * Curtains slide apart, revealing the stage, backdrop, ribbon, and scissors.
   */
  function executeCurtainReveal() {
    if (isActionInProgress) return;
    isActionInProgress = true;
    ensureAudioContext();

    // Check reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      skipToFinalWelcome();
      return;
    }

    body.dataset.phase = 'curtain-reveal';
    playCurtainSwell();

    // After curtains open (~2.4s), transition to Phase 3: Ribbon prompt
    const t1 = setTimeout(() => {
      body.dataset.phase = 'ribbon-prompt';
      if (ceremonialScissors) {
        ceremonialScissors.classList.add('ready-to-cut');
      }
      isActionInProgress = false;
    }, 2400);
    stepTimeouts.push(t1);
  }

  /**
   * Phase 3: User clicks "CUT THE RIBBON"
   * Physical scissors action, ribbon separates, and grand reveal follows.
   */
  function executeRibbonCut() {
    if (isActionInProgress) return;
    isActionInProgress = true;
    ensureAudioContext();

    body.dataset.phase = 'ribbon-cutting';

    // 1. Move scissors to center knot & snip blades
    if (ceremonialScissors) {
      ceremonialScissors.classList.remove('ready-to-cut');
      ceremonialScissors.classList.add('cutting');
    }
    playScissorsSnip();

    // 2. Ribbon cuts, flash sparks, flakes cascade
    const t1 = setTimeout(() => {
      if (ribbonSnipSpark) {
        ribbonSnipSpark.classList.add('active');
      }
      triggerCutSparkle();
      playFanfareChime();

      // 3. Phase 4: Grand Reveal / Welcome Content appears
      const t2 = setTimeout(() => {
        body.dataset.phase = 'grand-reveal';
        isActionInProgress = false;
      }, 1300);
      stepTimeouts.push(t2);

    }, 380);
    stepTimeouts.push(t1);
  }

  /**
   * Fast-Forward / Skip straight to Phase 4
   */
  function skipToFinalWelcome() {
    clearAllTimeouts();
    isActionInProgress = false;
    body.dataset.phase = 'grand-reveal';
    if (ceremonialScissors) {
      ceremonialScissors.classList.add('cutting');
    }
  }

  /**
   * Replay Ceremony from Phase 1
   */
  function replayCeremony() {
    clearAllTimeouts();
    isActionInProgress = false;
    if (ceremonialScissors) {
      ceremonialScissors.classList.remove('ready-to-cut', 'cutting');
    }
    if (ribbonSnipSpark) {
      ribbonSnipSpark.classList.remove('active');
    }
    cutFlakes = [];
    body.dataset.phase = 'anticipation';
  }

  // ==========================================================================
  // Initialization & Event Listeners
  // ==========================================================================
  function init() {
    body.dataset.phase = 'anticipation';

    resizeCanvas();
    initDust();
    requestAnimationFrame(renderAtmosphere);

    window.addEventListener('resize', () => {
      resizeCanvas();
      initDust();
    }, { passive: true });

    // Audio & Topbar
    if (btnAudioToggle) {
      btnAudioToggle.addEventListener('click', toggleAudio);
    }
    if (btnFastForward) {
      btnFastForward.addEventListener('click', skipToFinalWelcome);
    }

    // Phase 1 -> Phase 2
    if (btnBeginInauguration) {
      btnBeginInauguration.addEventListener('click', executeCurtainReveal);
    }

    // Phase 3 -> Phase 4
    if (btnCutRibbon) {
      btnCutRibbon.addEventListener('click', executeRibbonCut);
    }
    if (ceremonialScissors) {
      ceremonialScissors.addEventListener('click', () => {
        if (body.dataset.phase === 'ribbon-prompt') {
          executeRibbonCut();
        }
      });
    }

    // Replay
    if (btnReplayExperience) {
      btnReplayExperience.addEventListener('click', replayCeremony);
    }

    // Destination Link
    if (btnEnterWebsite) {
      btnEnterWebsite.setAttribute('href', PORTAL_URL);
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.key === 's' || e.key === 'S') && body.dataset.phase !== 'grand-reveal') {
        skipToFinalWelcome();
      }
      if (e.key === 'm' || e.key === 'M') {
        toggleAudio();
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (body.dataset.phase === 'anticipation') {
          executeCurtainReveal();
        } else if (body.dataset.phase === 'ribbon-prompt') {
          executeRibbonCut();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
