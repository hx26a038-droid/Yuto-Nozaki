/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API を使用したレストラン用SE・簡易BGMのジェネレーター
let audioCtx: AudioContext | null = null;
let bgmInterval: number | null = null;
let isMuted: boolean = false;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleMute() {
  isMuted = !isMuted;
  return isMuted;
}

export function getMutedState() {
  return isMuted;
}

// 共通オシレーター再生ヘルパー
function playTone(freq: number, type: OscillatorType, duration: number, gainValue: number = 0.1, delay: number = 0) {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    
    gainNode.gain.setValueAtTime(gainValue, ctx.currentTime + delay);
    // 指数減衰など
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
}

// 1. ボタンクリック (カチッ)
export function playClick() {
  playTone(800, 'sine', 0.08, 0.08);
}

// 2. 配膳音 (カツッ！木製のテーブルにお皿が置かれる音)
export function playServingSound() {
  // 低めのウッドブロック風の音をシミュレート
  playTone(150, 'triangle', 0.1, 0.2);
  playTone(120, 'sine', 0.12, 0.1, 0.02);
}

// 3. ベル音 (チリン！料理ができあがりました)
export function playCookingDoneBell() {
  // ディンッ という透き通った音 (高周波の合成)
  playTone(1500, 'sine', 0.4, 0.1);
  playTone(1800, 'sine', 0.3, 0.05, 0.03);
}

// 4. 清掃音 (シュッ、シュッ)
export function playCleanSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    // ノイズ（摩擦音）をシミュレート
    const bufferSize = ctx.sampleRate * 0.15; // 0.15秒
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + 0.15);
  } catch (err) {
    // フォールバック
    playTone(600, 'triangle', 0.1, 0.05);
  }
}

// 5. お会計音 (チャリンチャリン！)
export function playDing() {
  playTone(987.77, 'sine', 0.15, 0.1); // B5
  playTone(1318.51, 'sine', 0.25, 0.08, 0.08); // E6
}

// 6. エラー・時間切れ音 (ボイン、または警告)
export function playBoing() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.35);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    playTone(180, 'sawtooth', 0.3, 0.08);
  }
}

// 7. ゲームスコア更新 (ファンファーレっぽい)
export function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    playTone(freq, 'sine', 0.15, 0.08, i * 0.1);
  });
}

// 8. びっくりドンキーお馴染みの「木の扉メニュー」を開閉するときのような重厚な音 (ゴゴゴ、バタン)
export function playWoodDoorSound() {
  playTone(80, 'triangle', 0.4, 0.25);
  playTone(55, 'sine', 0.3, 0.25, 0.05);
}

// --- カントリー/ウッディ調のレトロなピコピコ自動BGMループ ---
// スリー音階による陽気なカントリー風ベースライン＆メロディ
const melodyNotes = [
  // どんきー風のお気楽なリズム音
  392.00, 440.00, 493.88, 523.25, 587.33, 523.25, 493.88, 440.00, // G A B C D C B A
  392.00, 493.88, 587.33, 392.00, 440.00, 493.88, 523.25, 587.33
];
const bassNotes = [
  196.00, 196.00, 146.83, 146.83, 164.81, 164.81, 220.00, 196.00,
  196.00, 196.00, 146.83, 146.83, 164.81, 220.00, 196.00, 146.83
];

let bgmStep = 0;

export function startBGM() {
  if (bgmInterval) return;
  
  bgmStep = 0;
  bgmInterval = window.setInterval(() => {
    if (isMuted) return;
    try {
      const step = bgmStep % melodyNotes.length;
      
      // 2拍に1回ベース音
      if (bgmStep % 2 === 0) {
        playTone(bassNotes[step], 'triangle', 0.35, 0.04);
      }
      
      // オブリガート(メロディ)をときおり奏でる
      if (bgmStep % 4 === 0 || (bgmStep % 8 === 1) || (bgmStep % 8 === 3)) {
        // 時折りペンタトニックの軽いメロディをプププ
        const randomMelody = melodyNotes[(step * 3) % melodyNotes.length];
        playTone(randomMelody, 'sine', 0.15, 0.02);
      }

      // ウッドカウベル調の打楽器
      if (bgmStep % 4 === 2) {
        playTone(1200, 'triangle', 0.05, 0.01);
      }

      bgmStep++;
    } catch (e) {
      // ignore
    }
  }, 220); // テンポ 136 くらい
}

export function stopBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}
export function initAudioOnInteraction() {
  try {
    getAudioContext();
  } catch (e) {
    console.warn(e);
  }
}
