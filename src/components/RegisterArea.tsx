/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RegisterQueueItem } from '../types';
import { playClick, playDing, playBoing } from '../utils/audio';

interface RegisterAreaProps {
  queue: RegisterQueueItem[];
  onCheckoutComplete: (queueId: string, isSuccess: boolean, tip: number) => void;
  onCloseRegister: () => void;
  activeQueueId: string | null;
  setActiveQueueId: (id: string | null) => void;
  onIncorrectChange: (queueId: string, penalty: number) => void;
}

export const RegisterArea: React.FC<RegisterAreaProps> = ({
  queue,
  onCheckoutComplete,
  onCloseRegister,
  activeQueueId,
  setActiveQueueId,
  onIncorrectChange
}) => {
  // 現在お会計中のレジアイテム
  const currentItem = queue.find(q => q.id === activeQueueId) || null;

  // プレイヤーが入力しているお釣り金額
  const [playerChange, setPlayerChange] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // お会計中のアイテムが変わったら入力リセット
  useEffect(() => {
    setPlayerChange(0);
    setErrorMessage(null);
  }, [activeQueueId]);

  // クイック小銭ボタン
  const addChange = (amount: number) => {
    playClick();
    setPlayerChange(prev => Math.max(0, prev + amount));
    setErrorMessage(null);
  };

  const clearChange = () => {
    playClick();
    setPlayerChange(0);
    setErrorMessage(null);
  };

  // 会計確定処理
  const handleConfirm = () => {
    if (!currentItem) return;

    const correctChange = currentItem.changeAnswer;
    if (playerChange === correctChange) {
      // 成功！お釣りが正しい
      playDing();
      // チップ計算：イライラ度が残っているほど高額 (最大 200円)
      const tip = Math.floor((currentItem.patience / 100) * 150);
      onCheckoutComplete(currentItem.id, true, tip);
      setActiveQueueId(null);
    } else {
      // 失敗！お釣りが違う
      playBoing();
      setErrorMessage(`お釣りが違います！(入力: ¥${playerChange} / 正解: ¥${correctChange})`);
      // お客さんのイライラを強制ペナルティ
      onIncorrectChange(currentItem.id, 25);
      const nextPatience = Math.max(0, currentItem.patience - 25);
      if (nextPatience <= 0) {
        // 耐えきれず怒って帰った（ペナルティ扱い、売金・チップなし）
        onCheckoutComplete(currentItem.id, false, 0);
        setActiveQueueId(null);
      }
    }
  };

  return (
    <div id="register-root-container" className="bg-[#5d4037] border-4 border-[#2b1704] rounded-2xl p-3 mx-2.5 mb-2.5 shadow-xl text-[#f7f2e5] relative overflow-hidden flex flex-col justify-between h-[135px] shrink-0 min-h-0">
      {/* びっくりドンキーお洒落アンティークレジ調の木枠背景 */}
      <div className="absolute inset-0 bg-[#3e2723]/25 pointer-events-none" />
      <div className="absolute inset-2 border border-dashed border-[#bfa275]/30 rounded-lg pointer-events-none" />

      {/* ヘッダー */}
      <div className="flex justify-between items-center pb-2 border-b border-[#bfa275]/30 z-10 select-none">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛎️</span>
          <h3 className="font-serif font-black text-sm tracking-widest text-[#f5bf58]">
            レジ会計カウンター (REGISTER)
          </h3>
        </div>
        <span className="text-[10px] text-amber-200/60 font-mono tracking-wide">
          QUEUING: {queue.length} 人
        </span>
      </div>

      {/* キュー並びとタッチ可能ボタン */}
      <div className="flex-1 flex gap-3 h-full pt-3 items-center overflow-x-auto select-none z-10 scrollbar-thin">
        {queue.length === 0 ? (
          <div className="text-stone-400 text-xs text-center italic w-full py-4">
            お会計をお待ちのお客様はいません
          </div>
        ) : (
          queue.map((item, index) => {
            const isTarget = item.id === activeQueueId;
            return (
              <motion.button
                id={`register-queue-item-${item.id}`}
                key={item.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playClick();
                  setActiveQueueId(item.id);
                }}
                className={`shrink-0 p-2.5 h-16 w-32 rounded-xl relative border-2 flex flex-col justify-between cursor-pointer transition-all duration-150 ${
                  isTarget 
                    ? 'bg-amber-100 text-amber-950 border-yellow-400 ring-2 ring-yellow-400/50 scale-105'
                    : 'bg-[#2b1704] text-[#f7f2e5] border-amber-800 hover:brightness-110'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[10px] font-black ${isTarget ? 'text-[#3e2723]' : 'text-[#f5bf58]'}`}>
                    {item.tableName}
                  </span>
                  <span className="text-[10px] font-bold font-mono">
                    ¥{item.amount.toLocaleString()}
                  </span>
                </div>

                {/* 怒り/イライラインジケータ */}
                <div className="w-full bg-stone-950/40 rounded-full h-1 overflow-hidden mt-1 select-none">
                  <div 
                    className={`h-full ${
                      item.patience > 55 ? 'bg-emerald-500' : item.patience > 25 ? 'bg-orange-500' : 'bg-red-500 animate-pulse'
                    }`} 
                    style={{ width: `${item.patience}%` }}
                  />
                </div>

                <div className="text-[9px] text-center font-bold font-sans mt-1">
                  お会計をはじめる 💳
                </div>

                {index === 0 && (
                  <span className="absolute -top-2 -left-1.5 bg-red-600 text-white font-extrabold text-[8px] rounded-full px-1 py-0.5 border border-white animate-bounce">
                    先頭!
                  </span>
                )}
              </motion.button>
            );
          })
        )}
      </div>

      {/* お会計用ミニゲームダイアログ: Portalでなくインポートした画面上で全面オーバーレイモーダルとして表示 */}
      <AnimatePresence>
        {currentItem && (
          <motion.div
            id="register-mini-game-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-[#2d1500]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* アンティークウッドプレートをあしらった本物感溢れる木のレジスターメニュー */}
            <div className="bg-[#ece0c3] border-8 border-gradient border-[#4a2e1d] rounded-3xl w-full max-w-md p-6 relative shadow-[0_15px_30px_rgba(0,0,0,0.6)] text-amber-950 flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#ebdcb9_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
              <div className="absolute inset-[3px] border-2 border-dashed border-amber-900/15 rounded-2xl pointer-events-none" />

              {/* 装飾のヘッダーロゴ */}
              <div className="text-center font-serif tracking-widest pb-3 border-b-2 border-[#b89c72] select-none">
                <span className="text-xs text-amber-800 font-bold">WOODY ANTIQUE REGISTER</span>
                <h4 className="text-xl font-black mt-0.5 text-[#3a1a00] flex justify-center items-center gap-1.5">
                  🪙 びっくりお会計 🪙
                </h4>
              </div>

              {/* イライラ度バー */}
              <div className="my-3 flex items-center justify-between text-xs font-bold px-1 select-none">
                <span className="text-stone-700">顧客のイライラ限界</span>
                <div className="w-1/2 bg-stone-300 rounded-full h-2 overflow-hidden border border-amber-950/20">
                  <div
                    className={`h-full ${
                      currentItem.patience > 50 
                        ? 'bg-gradient-to-r from-emerald-600 to-green-500' 
                        : currentItem.patience > 25 
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                        : 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
                    }`}
                    style={{ width: `${currentItem.patience}%` }}
                  />
                </div>
              </div>

              {/* メイン価格表示エリア */}
              <div className="bg-stone-900 text-[#00ff66] font-mono p-4 rounded-xl shadow-inner border-2 border-[#3a1a00] my-2 select-none">
                <div id="register-sales-display" className="grid grid-cols-2 gap-y-1 text-xs md:text-sm font-bold text-stone-300">
                  <div>お会計テーブル:</div>
                  <div className="text-right text-white font-sans font-black">{currentItem.tableName}</div>

                  <div className="mt-1 text-stone-400">お食事合計代金:</div>
                  <div className="text-right text-yellow-400 font-extrabold text-lg mt-0.5 font-mono">¥{currentItem.amount.toLocaleString()}</div>

                  <div className="mt-1 text-stone-400">お客様のお預かり:</div>
                  <div className="text-right text-sky-400 font-extrabold text-lg mt-0.5 font-mono">¥{currentItem.paidAmount.toLocaleString()}</div>
                </div>

                <div className="h-[1px] bg-stone-800 my-2" />

                <div className="flex justify-between items-center mt-1">
                  <span className="text-stone-400 text-xs">必要なお釣り (計算):</span>
                  <span className="text-xl font-black text-rose-500 animate-pulse font-mono bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900">
                    ？ 円
                  </span>
                </div>
              </div>

              {/* プレイヤーの入力お釣りカウンター */}
              <div className="my-3 p-3 bg-amber-50 rounded-xl border border-[#bca181] text-center shadow-sm">
                <span className="text-xs text-stone-600 font-bold block mb-1">お渡しするお釣り</span>
                <span id="player-change-display" className="text-2xl font-black font-mono text-emerald-800 tracking-wide">
                  ¥ {playerChange.toLocaleString()}
                </span>
              </div>

              {/* エラーメッセージ（間違えた時） */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100 border border-red-400 text-red-800 text-xs font-bold p-2 rounded-lg text-center my-1 select-none"
                >
                  ⚠️ {errorMessage}
                </motion.div>
              )}

              {/* お釣りピッカーボタン (小銭・お札をタップしてジャストなお釣りにする) */}
              <div className="grid grid-cols-3 gap-2 my-2.5">
                <button
                  id="add-change-500"
                  onClick={() => addChange(500)}
                  className="p-2.5 bg-gradient-to-b from-[#cfb53b] to-[#a68c0c] text-white font-extrabold text-xs rounded-xl shadow border-b-2 border-yellow-950 active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center"
                >
                  <span className="text-sm">🪙</span>
                  <span>+500円</span>
                </button>
                <button
                  id="add-change-100"
                  onClick={() => addChange(100)}
                  className="p-2.5 bg-gradient-to-b from-stone-300 to-stone-500 text-stone-900 font-extrabold text-xs rounded-xl shadow border-b-2 border-stone-800 active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center"
                >
                  <span className="text-sm">🪙</span>
                  <span>+100円</span>
                </button>
                <button
                  id="add-change-50"
                  onClick={() => addChange(50)}
                  className="p-2.5 bg-gradient-to-b from-amber-600 to-amber-800 text-white font-extrabold text-xs rounded-xl shadow border-b-2 border-amber-950 active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center"
                >
                  <span className="text-sm">🪙</span>
                  <span>+50円</span>
                </button>

                <button
                  id="add-change-10"
                  onClick={() => addChange(10)}
                  className="p-2.5 bg-gradient-to-b from-orange-400 to-orange-700 text-white font-extrabold text-xs rounded-xl shadow border-b-2 border-orange-950 active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center"
                >
                  <span className="text-sm">🪙</span>
                  <span>+10円</span>
                </button>
                <button
                  id="add-change-1000"
                  onClick={() => addChange(1000)}
                  className="p-2.5 bg-gradient-to-b from-emerald-600 to-emerald-800 text-white font-extrabold text-xs rounded-xl shadow border-b-2 border-emerald-950 active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center col-span-2"
                >
                  <span className="text-sm">💴</span>
                  <span>+1,000円札</span>
                </button>
              </div>

              {/* アクションボタン */}
              <div className="grid grid-cols-2 gap-3 mt-4 border-t-2 border-[#b89c72] pt-4 select-none">
                <button
                  id="clear-change-button"
                  onClick={clearChange}
                  className="py-2.5 bg-stone-400 hover:bg-stone-500 text-white font-extrabold text-xs rounded-xl border-b-2 border-stone-600 active:translate-y-0.5 cursor-pointer transition-all"
                >
                  🧹 クリア (お釣り0に戻す)
                </button>
                <button
                  id="confirm-checkout-button"
                  onClick={handleConfirm}
                  disabled={playerChange < 0}
                  className="py-2.5 bg-gradient-to-r from-amber-800 to-[#4e2c0e] hover:brightness-110 text-white font-black text-xs rounded-xl border-b-2 border-[#1f0e02] active:translate-y-0.5 cursor-pointer transition-all flex justify-center items-center gap-1"
                >
                  💰 お釣りを渡して会計確定
                </button>
              </div>

              {/* モーダルを閉じる(一時停止がわり) */}
              <button
                id="close-register-modal-btn"
                onClick={() => {
                  playClick();
                  onCloseRegister();
                }}
                className="absolute top-3 right-3 text-amber-700 hover:text-amber-950 font-black text-lg p-0.5 rounded-full hover:bg-amber-100/40 cursor-pointer select-none"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
