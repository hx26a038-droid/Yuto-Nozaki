/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Table, PlayerItem } from '../types';
import { playCleanSound, playServingSound } from '../utils/audio';

interface TableCardProps {
  table: Table;
  playerItem: PlayerItem;
  onTableAction: (tableId: number) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  playerItem,
  onTableAction
}) => {
  const getStatusColor = () => {
    switch (table.status) {
      case 'empty': return 'border-amber-900 bg-[#5d4037]/20';
      case 'waiting_order': return 'border-orange-500 bg-[#ffb74d]/20 animate-pulse';
      case 'ordering': return 'border-yellow-500 bg-[#fff176]/20';
      case 'cooking': return 'border-stone-400 bg-stone-700/10';
      case 'serving_ready': return 'border-red-500 bg-red-500/15 animate-bounce';
      case 'eating': return 'border-emerald-600 bg-emerald-500/10';
      case 'dirty': return 'border-amber-700 bg-amber-900/30';
      case 'needs_wipe': return 'border-blue-400 bg-blue-300/30';
      case 'cleaning': return 'border-blue-500 bg-blue-400/40';
      case 'waiting_checkout': return 'border-[#b18337] bg-yellow-500/10';
      default: return 'border-amber-900 bg-amber-950/20';
    }
  };

  const getStatusBadge = () => {
    switch (table.status) {
      case 'empty':
        return <span className="bg-stone-700 text-[#f7f2e5] font-bold text-xs px-2 py-0.5 rounded-full select-none">空席</span>;
      case 'waiting_order':
        return <span className="bg-orange-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full animate-pulse shadow-md flex items-center gap-1 select-none">📖 注文取る</span>;
      case 'cooking':
        return (
          <span className="bg-stone-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 select-none">
            <span className="animate-spin text-xs">🍳</span> 調理中...
          </span>
        );
      case 'serving_ready':
        return (
          <span className="bg-red-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full animate-bounce shadow-md flex items-center gap-1 select-none">
            🔔 配膳待ち
          </span>
        );
      case 'eating':
        return (
          <span className="bg-emerald-700 text-white font-bold text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 select-none">
            😋 モグモグ
          </span>
        );
      case 'dirty':
        return (
          <span className="bg-amber-800 text-amber-100 font-extrabold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm select-none">
            🍽️ 汚れた皿
          </span>
        );
      case 'needs_wipe':
        return (
          <span className="bg-sky-500 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full animate-pulse shadow-sm flex items-center gap-1 select-none">
            ✨ テーブル拭き
          </span>
        );
      case 'waiting_checkout':
        return (
          <span className="bg-yellow-600 text-[#1f0e02] font-black text-xs px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1 select-none">
            💰 会計待ち
          </span>
        );
      default:
        return null;
    }
  };

  // お客さんのアバター選択
  const getCustomerAvatar = () => {
    if (!table.currentCustomer) return null;
    const seed = table.currentCustomer.avatarSeed % 4;
    switch (table.currentCustomer.gender) {
      case 'family':
        return { emoji: '👨‍👩‍👦', name: 'ご家族連れ' };
      case 'male':
        if (seed === 0) return { emoji: '👨‍💼', name: 'サラリーマン' };
        if (seed === 1) return { emoji: '🧔', name: 'ひげの紳士' };
        return { emoji: '🧑‍💻', name: '学生さん' };
      case 'female':
        if (seed === 0) return { emoji: '👩‍💼', name: 'OLさん' };
        if (seed === 1) return { emoji: '👩', name: 'お姉さん' };
        return { emoji: '👵', name: '上品なマダム' };
    }
  };

  const handlerClick = () => {
    onTableAction(table.id);
  };

  const avatarInfo = getCustomerAvatar();

  return (
    <motion.div
      id={`table-card-${table.id}`}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={handlerClick}
      className={`relative rounded-2xl border-4 p-4 flex flex-col justify-between h-52 shadow-lg transition-colors duration-200 cursor-pointer overflow-hidden ${getStatusColor()}`}
      style={{
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.3)',
      }}
    >
      {/* 木目の質感を背後に */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-900/10 via-stone-800/10 to-stone-900/20 pointer-events-none" />
      
      {/* テーブル上部: テーブル番号とステータス */}
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col">
          <span className="text-[#3e2723] font-black text-sm tracking-wide font-serif">
            {table.name}
          </span>
          <span className="text-[10px] text-amber-900/60 font-bold">
            {table.currentCustomer ? `${avatarInfo?.name}` : '空き'}
          </span>
        </div>
        {getStatusBadge()}
      </div>

      {/* テーブル中央部: お客さん or 料理などのグラフィック */}
      <div className="flex flex-col items-center justify-center flex-1 my-2 z-10 relative">
        {/* お客さんがいる場合 */}
        {table.currentCustomer && (
          <div className="text-center relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl md:text-5xl filter drop-shadow-md select-none"
            >
              {avatarInfo?.emoji}
            </motion.div>
            
            {/* 待たせることによるイライラ/満足度表示 */}
            {table.status !== 'empty' && table.status !== 'eating' && table.status !== 'dirty' && table.status !== 'needs_wipe' && (
              <div className="absolute -top-3 -right-3 bg-stone-950/80 px-1.5 py-0.5 rounded-md border border-amber-600 flex items-center gap-1 shadow-sm">
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  {Math.round(table.currentCustomer.patience)}%
                </span>
                <span className="text-[8px] animate-pulse">
                  {table.currentCustomer.patience > 60 ? '💚' : table.currentCustomer.patience > 30 ? '💛' : '❤️'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 料理が置かれている場合（食事中） */}
        {table.status === 'eating' && table.currentOrder && (
          <div className="absolute bottom-1 right-2 flex flex-col items-center select-none bg-stone-900/70 py-1 px-2 rounded-lg border border-[#a87f43] text-white">
            <div className="text-lg flex items-center gap-1">
              <span>{table.currentOrder.icon}</span>
              <span className="text-[10px] font-black truncate max-w-[80px]">
                {table.currentOrder.jpName}
              </span>
            </div>
          </div>
        )}

        {/* 汚れたお皿（ハンバーグお皿の残り） */}
        {table.status === 'dirty' && (
          <motion.div
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center justify-center select-none bg-[#ecdcb3] border-4 border-[#8d6e63] w-14 h-14 rounded-full shadow-inner relative"
          >
            {/* 残飯の雰囲気 */}
            <span className="text-xs">🍖🧹</span>
            <div className="absolute -top-1 -right-1 text-[10px] bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">!</div>
          </motion.div>
        )}

        {/* テーブル拭きが必要な状態 */}
        {table.status === 'needs_wipe' && (
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-3xl animate-bounce">🧼</span>
            <span className="text-[11px] text-blue-900 font-bold bg-blue-100 px-1.5 py-0.5 rounded-full select-none animate-pulse">タップ連打でふき拭き！</span>
          </div>
        )}

        {/* テーブルなし、かつ誰もいないとき */}
        {table.status === 'empty' && (
          <div className="border border-dashed border-stone-400 p-3 rounded-lg flex flex-col items-center justify-center">
            <span className="text-stone-400 text-xs text-center font-medium">ご案内できます</span>
            <span className="text-xs mt-1 text-slate-500">（お座席はこちら）</span>
          </div>
        )}
      </div>

      {/* テーブル下部: 進行状況を表すゲージ */}
      <div className="z-10">
        {/* お客さんの注文待ち、調理待ち、会計待ち、配膳待ちによる時間制限バー */}
        {table.currentCustomer && table.status !== 'eating' && table.status !== 'empty' && table.status !== 'dining_complete' && (
          <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-amber-950">
            <div
              className={`h-full transition-all duration-300 ${
                table.currentCustomer.patience > 50 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                  : table.currentCustomer.patience > 25 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                  : 'bg-gradient-to-r from-red-600 to-red-500'
              }`}
              style={{ width: `${table.currentCustomer.patience}%` }}
            />
          </div>
        )}

        {/* 食事中の進捗バー（ごはんが減っていく） */}
        {table.status === 'eating' && (
          <div className="flex flex-col gap-0.5">
            <div className="text-[9px] text-[#3e2723] font-bold flex justify-between select-none">
              <span>食事ペース</span>
              <span>{Math.round(table.eatingProgress)}%</span>
            </div>
            <div className="w-full bg-[#3e2723]/30 rounded-full h-2 w-full overflow-hidden border border-[#5d4037]">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-green-500 transition-all duration-100"
                style={{ width: `${table.eatingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* テーブルふきふきの進捗バー（ピカピカへ） */}
        {(table.status === 'needs_wipe' || table.status === 'cleaning') && table.wipeProgress > 0 && (
          <div className="flex flex-col gap-0.5">
            <div className="text-[9px] text-blue-900 font-bold flex justify-between select-none">
              <span>ピカピカ度</span>
              <span>{Math.round(table.wipeProgress)}%</span>
            </div>
            <div className="w-full bg-blue-950 rounded-full h-2 overflow-hidden border border-blue-900">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-75"
                style={{ width: `${table.wipeProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

    </motion.div>
  );
};
