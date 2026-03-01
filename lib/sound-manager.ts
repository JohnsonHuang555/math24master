import { useSoundStore } from '@/stores/sound-store';

export type SoundType =
  | 'select'
  | 'correct'
  | 'wrong'
  | 'skip'
  | 'gameOverWin'
  | 'gameOverEnd';

let _audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_audioContext) {
    _audioContext = new AudioContext();
  }
  if (_audioContext.state === 'suspended') {
    _audioContext.resume();
  }
  return _audioContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainValue: number = 0.3,
  startTime: number = ctx.currentTime,
) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(gainValue, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playSelectSound(ctx: AudioContext) {
  playTone(ctx, 880, 0.06, 'sine', 0.12);
}

function playCorrectSound(ctx: AudioContext) {
  const t = ctx.currentTime;
  playTone(ctx, 523.25, 0.12, 'sine', 0.3, t);
  playTone(ctx, 659.25, 0.12, 'sine', 0.3, t + 0.12);
  playTone(ctx, 783.99, 0.22, 'sine', 0.35, t + 0.24);
}

function playWrongSound(ctx: AudioContext) {
  const t = ctx.currentTime;
  playTone(ctx, 280, 0.08, 'sawtooth', 0.2, t);
  playTone(ctx, 220, 0.18, 'sawtooth', 0.18, t + 0.1);
}

function playSkipSound(ctx: AudioContext) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(500, ctx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(250, ctx.currentTime + 0.18);
  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);
}

function playGameOverWinSound(ctx: AudioContext) {
  const t = ctx.currentTime;
  playTone(ctx, 523.25, 0.1, 'sine', 0.3, t);
  playTone(ctx, 659.25, 0.1, 'sine', 0.3, t + 0.13);
  playTone(ctx, 783.99, 0.1, 'sine', 0.3, t + 0.26);
  playTone(ctx, 1046.5, 0.4, 'sine', 0.35, t + 0.4);
}

function playGameOverEndSound(ctx: AudioContext) {
  const t = ctx.currentTime;
  playTone(ctx, 440, 0.15, 'sine', 0.3, t);
  playTone(ctx, 349.23, 0.15, 'sine', 0.3, t + 0.17);
  playTone(ctx, 261.63, 0.35, 'sine', 0.3, t + 0.34);
}

export function playSound(type: SoundType): void {
  if (!useSoundStore.getState().soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  switch (type) {
    case 'select':
      playSelectSound(ctx);
      break;
    case 'correct':
      playCorrectSound(ctx);
      break;
    case 'wrong':
      playWrongSound(ctx);
      break;
    case 'skip':
      playSkipSound(ctx);
      break;
    case 'gameOverWin':
      playGameOverWinSound(ctx);
      break;
    case 'gameOverEnd':
      playGameOverEndSound(ctx);
      break;
  }
}
