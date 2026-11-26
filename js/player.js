class AudioPortfolioPlayer {
  constructor() {
    this.audioFinal = new Audio();
    this.audioRaw = new Audio();
    this.audioFinal.preload = 'metadata';
    this.audioRaw.preload = 'metadata';

    this.currentProject = null;
    this.mode = 'final'; // 'final' | 'raw'
    this.hasRaw = false;
    this.isPlaying = false;
    this.volume = 0.9;
    this.peaks = this.generateFallbackPeaks(96);

    // DOM
    this.bar = document.getElementById('audio-player');
    this.playBtn = document.getElementById('player-play-btn');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');
    this.titleEl = document.getElementById('player-title');
    this.specsEl = document.getElementById('player-specs');
    this.errorEl = document.getElementById('player-error');
    this.currentTimeEl = document.getElementById('player-current-time');
    this.durationEl = document.getElementById('player-duration');
    this.canvas = document.getElementById('waveform-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.abGroup = document.getElementById('ab-switch-group');
    this.btnFinal = document.getElementById('btn-mode-final');
    this.btnRaw = document.getElementById('btn-mode-raw');
    this.volumeInput = document.getElementById('player-volume');

    this.bindEvents();
    this.drawWaveform(0);
  }

  bindEvents() {
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.btnFinal.addEventListener('click', () => this.setMode('final'));
    this.btnRaw.addEventListener('click', () => this.setMode('raw'));

    this.volumeInput.addEventListener('input', (e) => {
      this.volume = parseFloat(e.target.value);
      this.applyVolumes();
    });

    this.canvas.addEventListener('click', (e) => {
      if (!this.audioFinal.duration) return;
      const rect = this.canvas.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = ratio * this.audioFinal.duration;
      this.audioFinal.currentTime = targetTime;
      if (this.hasRaw) this.audioRaw.currentTime = targetTime;
      this.updateProgressUI();
    });

    this.audioFinal.addEventListener('timeupdate', () => {
      // Resynchronisation fine si dérive > 80ms entre A et B
      if (this.hasRaw && this.isPlaying && Math.abs(this.audioFinal.currentTime - this.audioRaw.currentTime) > 0.08) {
        this.audioRaw.currentTime = this.audioFinal.currentTime;
      }
      this.updateProgressUI();
    });

    this.audioFinal.addEventListener('loadedmetadata', () => {
      this.durationEl.textContent = this.formatTime(this.audioFinal.duration);
    });

    this.audioFinal.addEventListener('ended', () => {
      this.isPlaying = false;
      this.audioRaw.pause();
      this.updatePlayIcon();
    });

    this.audioFinal.addEventListener('error', () => {
      this.errorEl.textContent = 'Fichier audio introuvable (ajoutez-le via l’admin)';
      this.errorEl.classList.remove('hidden');
      this.isPlaying = false;
      this.updatePlayIcon();
    });
  }

  async loadProject(project, autoPlay = true) {
    if (!project || !project.audio_final) return;

    const isSame = this.currentProject && this.currentProject.id === project.id;
    if (isSame) {
      if (autoPlay) this.togglePlay();
      return;
    }

    this.pause();
    this.currentProject = project;
    this.mode = 'final';
    this.hasRaw = Boolean(project.audio_raw && project.audio_raw.trim() !== '');
    this.errorEl.classList.add('hidden');
    this.bar.classList.remove('hidden');

    this.titleEl.textContent = project.title;
    this.titleEl.href = `#projet/${project.id}`;
    this.specsEl.textContent = project.audio_specs || 'AUDIO';
    this.currentTimeEl.textContent = '00:00';
    this.durationEl.textContent = '00:00';

    this.abGroup.classList.toggle('hidden', !this.hasRaw);
    this.updateModeButtons();

    this.audioFinal.src = project.audio_final;
    this.audioFinal.load();

    if (this.hasRaw) {
      this.audioRaw.src = project.audio_raw;
      this.audioRaw.load();
    } else {
      this.audioRaw.removeAttribute('src');
    }

    this.applyVolumes();
    this.peaks = this.generateFallbackPeaks(96, project.id);
    this.drawWaveform(0);
    this.computeRealWaveform(project.audio_final);

    if (autoPlay) {
      await this.play();
    }
  }

  async play() {
    if (!this.currentProject) return;
    try {
      this.applyVolumes();
      await this.audioFinal.play();
      if (this.hasRaw) {
        this.audioRaw.currentTime = this.audioFinal.currentTime;
        this.audioRaw.play().catch(() => {});
      }
      this.isPlaying = true;
      this.updatePlayIcon();
    } catch (err) {
      this.isPlaying = false;
      this.updatePlayIcon();
    }
  }

  pause() {
    this.audioFinal.pause();
    if (this.hasRaw) this.audioRaw.pause();
    this.isPlaying = false;
    this.updatePlayIcon();
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  setMode(newMode) {
    if (!this.hasRaw) return;
    this.mode = newMode;
    this.applyVolumes();
    this.updateModeButtons();
    this.updateProgressUI();
  }

  applyVolumes() {
    if (this.mode === 'final') {
      this.audioFinal.muted = false;
      this.audioFinal.volume = this.volume;
      this.audioRaw.muted = true;
      this.audioRaw.volume = 0;
    } else {
      this.audioFinal.muted = true;
      this.audioFinal.volume = 0;
      this.audioRaw.muted = false;
      this.audioRaw.volume = this.volume;
    }
  }

  updateModeButtons() {
    this.btnFinal.classList.toggle('active', this.mode === 'final');
    this.btnRaw.classList.toggle('active', this.mode === 'raw');
  }

  updatePlayIcon() {
    this.iconPlay.classList.toggle('hidden', this.isPlaying);
    this.iconPause.classList.toggle('hidden', !this.isPlaying);
  }

  updateProgressUI() {
    const cur = this.audioFinal.currentTime || 0;
    const dur = this.audioFinal.duration || 0;
    this.currentTimeEl.textContent = this.formatTime(cur);
    const ratio = dur > 0 ? cur / dur : 0;
    this.drawWaveform(ratio);
  }

  formatTime(sec) {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  generateFallbackPeaks(bars, seedStr = 'audio') {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
    const peaks = [];
    for (let i = 0; i < bars; i++) {
      const val = Math.abs(Math.sin(i * 0.35 + seed) * 0.6 + Math.cos(i * 0.13) * 0.3) + 0.12;
      peaks.push(Math.min(1, val));
    }
    return peaks;
  }

  async computeRealWaveform(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      const rawData = decoded.getChannelData(0);
      const bars = 96;
      const blockSize = Math.floor(rawData.length / bars);
      const peaks = [];
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        const start = i * blockSize;
        for (let j = 0; j < blockSize; j += 16) {
          sum += Math.abs(rawData[start + j] || 0);
        }
        peaks.push(sum / (blockSize / 16));
      }
      const maxPeak = Math.max(...peaks, 0.01);
      this.peaks = peaks.map((p) => Math.max(0.08, p / maxPeak));
      this.updateProgressUI();
      audioCtx.close();
    } catch {
      // Garde la waveform de secours en cas de fichier absent
    }
  }

  drawWaveform(progressRatio) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    const bars = this.peaks.length;
    const gap = 2;
    const barWidth = (width - gap * (bars - 1)) / bars;
    const activeColor = this.mode === 'raw' ? '#f59e0b' : '#38bdf8';
    const inactiveColor = '#3f3f46';

    for (let i = 0; i < bars; i++) {
      const x = i * (barWidth + gap);
      const barHeight = Math.max(4, this.peaks[i] * (height - 6));
      const y = (height - barHeight) / 2;
      const isPlayed = i / bars <= progressRatio;
      ctx.fillStyle = isPlayed ? activeColor : inactiveColor;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }
}

window.audioPlayer = new AudioPortfolioPlayer();