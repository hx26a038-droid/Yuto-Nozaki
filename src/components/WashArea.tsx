/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { PlayerItem } from '../types';
import { playClick, playServingSound } from '../utils/audio';

interface WashAreaProps {
  dirtyPlatesCount: number;
  playerItem: PlayerItem;
  onWashPlates: () => void;
  onTakeCloth: () => void;
}

export const WashArea: React.FC<WashAreaProps> = ({
  dirtyPlatesCount,
  playerItem,
  onWashPlates,
  onTakeCloth
}) => {
  const isCarryingDirty = playerItem.type === 'dirty_plate';
  const isCarryingCloth = playerItem.type === 'cleaning_cloth';

  return (
    <div id="wash-area-container" className="bg-[#5d4037] border-4 border-[#2b1704] rounded-2xl p-3 shadow-xl text-[#f7f2e5] relative overflow-hidden flex flex-col justify-between h-full min-h-0">
      {/* びっくりドンキーお馴染みの木製ウォッシュタブや銅製蛇口を模したレトロな調和 */}
      <div className="absolute inset-0 bg-[#3e2723]/30 pointer-events-none" />
      <div className="absolute inset-2 border border-dashed border-[#bfa275]/30 rounded-lg pointer-events-none" />

      {/* ヘッダー */}
      <div className="flex justify-between items-center pb-2 border-b border-[#bfa275]/30 z-10 select-none">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚰</span>
          <h3 className="font-serif font-black text-sm tracking-widest text-[#f5bf58]">
            シンクとバッシング (WASH STATION)
          </h3>
        </div>
        <span className="text-[10px] text-amber-200/60 font-mono tracking-wide">
          SINK TOTAL: {dirtyPlatesCount} 皿
        </span>
      </div>

      {/* アクションエリア */}
      <div className="grid grid-cols-2 gap-3 h-full pt-3 z-10 select-none">
        
        {/* 左: シンクへお皿を返す / 洗うボタン */}
        <motion.div
          id="sink-tap-area"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            onWashPlates();
          }}
          className={`rounded-xl border-2 p-2 relative flex flex-col items-center justify-center cursor-pointer transition-all ${
            isCarryingDirty
              ? 'bg-amber-100 text-amber-950 border-yellow-500 ring-2 ring-yellow-400 animate-pulse'
              : 'bg-stone-900 text-[#f7f2e5] border-amber-800 hover:bg-stone-800'
          }`}
        >
          {/* 水しぶき/泡 */}
          <div className="absolute top-1 right-2 text-xs">🧼🫧</div>
          
          <span className="text-2xl filter drop-shadow">
            {dirtyPlatesCount > 0 ? '🍽️🚰' : '🚰'}
          </span>
          
          <div className="text-xs font-black mt-1 text-center leading-snug">
            {isCarryingDirty ? (
              <span className="text-[#a52a2a] animate-bounce block">皿をシンクに置く！</span>
            ) : dirtyPlatesCount > 0 ? (
              <span>シンクの皿を洗う ({dirtyPlatesCount}枚)</span>
            ) : (
              <span className="text-stone-400">シンクはきれいです</span>
            )}
          </div>
          <span className="text-[9px] text-stone-400 text-center mt-0.5">
            （タップで汚れ皿を戻す / 洗う）
          </span>
        </motion.div>

        {/* 右: ダスター（お掃除用の布）を取る */}
        <motion.div
          id="cloth-tap-area"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            playServingSound();
            onTakeCloth();
          }}
          className={`rounded-xl border-2 p-2 relative flex flex-col items-center justify-center cursor-pointer transition-all ${
            isCarryingCloth
              ? 'bg-sky-100 text-sky-950 border-sky-400 ring-2 ring-sky-400/50 scale-105'
              : 'bg-stone-900 text-[#f7f2e5] border-amber-800 hover:bg-stone-800'
          }`}
        >
          <span className="text-2xl filter drop-shadow">🧼🧽</span>
          <div className="text-xs font-black mt-1 text-center leading-snug">
            {isCarryingCloth ? (
              <span className="text-sky-700 font-bold block">ダスターを所持中 🧼</span>
            ) : (
              <span>ダスターを持つ</span>
            )}
          </div>
          <span className="text-[9px] text-stone-400 text-center mt-0.5">
            （お掃除の時にこれを持ちます）
          </span>
          
          {isCarryingCloth && (
            <div className="absolute -top-1.5 -right-1 bg-sky-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">✓</div>
          )}
        </motion.div>

      </div>
    </div>
  );
};
