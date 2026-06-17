/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { GameScore, PlayerItem } from '../types';
import { Volume2, VolumeX, Heart, BookOpen, Clock, Target } from 'lucide-react';
import { toggleMute, getMutedState, playClick } from '../utils/audio';

interface GameStatsProps {
  score: GameScore;
  timeLeft: number;
  maxTime: number;
  playerItem: PlayerItem;
  targetMoney: number;
  soundMuted: boolean;
  onToggleMute: () => void;
  onResetCloth: () => void;
}

export const GameStats: React.FC<GameStatsProps> = ({
  score,
  timeLeft,
  maxTime,
  playerItem,
  targetMoney,
  soundMuted,
  onToggleMute,
  onResetCloth
}) => {
  // プレイヤーが現在手に持っているものの日本語名
  const getCarryingItemName = () => {
    switch (playerItem.type) {
      case 'none':
        return <span className="text-stone-400 font-medium">両手は空いています</span>;
      case 'food':
        return (
          <span className="text-yellow-600 font-extrabold flex items-center gap-1">
            🍳 #{playerItem.tableName}への配膳料理
          </span>
        );
      case 'dirty_plate':
        return (
          <span className="text-amber-800 font-extrabold flex items-center gap-1">
            🍽️ #{playerItem.tableId}番卓の汚れ皿 (バッシング中)
          </span>
        );
      case 'cleaning_cloth':
        return (
          <span className="text-sky-600 font-extrabold flex items-center gap-1">
            🧼 ダスター（お掃除用の布）
          </span>
        );
      default:
        return null;
    }
  };

  // タイムパーセンテージ
  const timePercent = (timeLeft / maxTime) * 100;

  return (
    <div id="game-stats-hud" className="bg-[#4e342e] border-4 border-[#2b1704] rounded-2xl p-4 shadow-2xl text-[#f7f2e5] relative overflow-hidden select-none">
      {/* 木製フレームあしらい */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2d1500]/10 to-[#2d1500]/30 pointer-events-none" />
      <div className="absolute inset-1.5 border border-dashed border-[#bfa275]/30 rounded-lg pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* 左セクション: 本日の営業日数・売上・目標額 */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          {/* 日数バッジ */}
          <div className="bg-[#3e2723] px-3.5 py-1.5 rounded-xl border border-amber-800 flex items-center gap-2">
            <span className="text-amber-400 text-sm">📅</span>
            <div className="text-left leading-none">
              <span className="text-[9px] text-stone-400 font-bold block mb-0.5">本日の営業</span>
              <span className="text-sm font-black font-serif text-amber-100">{score.day} 日目</span>
            </div>
          </div>

          {/* 現在の売上（お給料） */}
          <div className="bg-stone-950/70 py-1 px-4 rounded-xl border border-amber-900 flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div className="text-left">
              <span className="text-[9px] text-stone-500 font-bold block mb-0.5">本日の売上</span>
              <div className="flex items-baseline gap-1 leading-none">
                <span className="text-xl font-black font-mono text-emerald-400">¥{score.money.toLocaleString()}</span>
                <span className="text-[10px] text-stone-400 font-mono">/ ¥{targetMoney.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* お仕事目標ステータス */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-amber-200">
            <Target className="w-4 h-4 text-[#f5bf58]" />
            <span>営業目標: {score.money >= targetMoney ? '✨ 達成中！ 🎉' : 'お会計を急ごう！'}</span>
          </div>
        </div>

        {/* 中央セクション: 評価（残りライフ - ハート）とタイムリミット */}
        <div className="flex flex-1 max-w-sm flex-col gap-1.5 px-0 md:px-4">
          
          {/* 残り時間 (タイマー) */}
          <div className="flex justify-between text-xs font-extrabold text-amber-100 leading-none mb-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              営業時間残り:
            </span>
            <span className="font-mono text-orange-400">{timeLeft}秒 / {maxTime}秒</span>
          </div>
          <div className="w-full bg-stone-950 rounded-full h-3 overflow-hidden border border-[#5d4037]">
            <motion.div
              initial={false}
              animate={{ width: `${timePercent}%` }}
              className={`h-full transition-all duration-1000 ${
                timePercent > 50 
                  ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-amber-500' 
                  : timePercent > 20 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                  : 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
              }`}
            />
          </div>

          {/* 顧客の総合満足度 (ライフ) */}
          <div className="flex items-center gap-2 select-none mt-1">
            <span className="text-xs font-extrabold text-[#f7f2e5]/80">レストランの評判:</span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const filledValue = (score.reputation / 100) * 5;
                const isHalf = filledValue > i && filledValue < i + 1;
                const isFull = filledValue >= i + 1;
                return (
                  <Heart
                    key={i}
                    className={`w-4 h-4 ${
                      isFull 
                        ? 'fill-rose-500 text-rose-500 animate-pulse' 
                        : isHalf 
                        ? 'fill-rose-300 text-rose-400' 
                        : 'text-stone-500'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-xs font-mono font-bold text-rose-300">({score.reputation}%)</span>
          </div>
        </div>

        {/* 右セクション: プレイヤーが持っているもの ＆ 設定 */}
        <div className="flex items-center justify-between md:justify-end gap-3 min-w-[200px]">
          {/* 所持アイテム */}
          <div className="font-sans text-xs bg-stone-950/50 hover:bg-stone-950/80 transition-colors p-2 rounded-xl flex-1 md:flex-initial text-center md:text-right border border-[#bfa275]/20">
            <span className="text-[9px] text-stone-500 block font-bold">手に持っているもの</span>
            <div className="mt-0.5 flex items-center justify-center md:justify-end gap-1.5 h-4 select-all">
              {getCarryingItemName()}
              
              {playerItem.type !== 'none' && (
                <button
                  id="drop-carrying-item-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    playClick();
                    onResetCloth();
                  }}
                  className="bg-red-900 hover:bg-red-700 text-white font-extrabold text-[8px] px-1 py-0.5 rounded border border-red-700 cursor-pointer transition-all ml-1.5"
                  title="手持ちのアイテムを捨てる、または両手を空にします"
                >
                  捨てる
                </button>
              )}
            </div>
          </div>

          {/* ミュート切り替え */}
          <button
            id="bgm-mute-button"
            onClick={() => {
              playClick();
              onToggleMute();
            }}
            className="p-2 bg-stone-950 hover:bg-stone-800 text-amber-400 hover:text-amber-300 rounded-xl border border-amber-900 cursor-pointer shadow-md transition-all active:scale-95"
            title={soundMuted ? "音声を有効にする" : "ミュートにする"}
          >
            {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 animate-pulse" />}
          </button>
        </div>

      </div>
    </div>
  );
};
