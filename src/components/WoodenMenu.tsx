/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playClick, playWoodDoorSound, playFanfare } from '../utils/audio';

interface WoodenMenuProps {
  isOpen: boolean;
  onOpenToggle: () => void;
  title: string;
  gameStatus: 'start' | 'gameover' | 'victory';
  score?: {
    money: number;
    servedCount: number;
    cleanCount: number;
    day: number;
  };
  onStartGame: () => void;
}

export const WoodenMenu: React.FC<WoodenMenuProps> = ({
  isOpen,
  onOpenToggle,
  title,
  gameStatus,
  score,
  onStartGame
}) => {
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleStart = () => {
    playWoodDoorSound();
    setHasInteracted(true);
    // メニューを開く
    onOpenToggle();
    // 少し遅れてゲーム開始をトリガー
    setTimeout(() => {
      onStartGame();
    }, 800);
  };

  return (
    <div id="wooden-menu-container" className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-auto bg-stone-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[85vh] flex justify-center items-center overflow-hidden select-none px-4">
        
        {/* 左の扉 */}
        <motion.div
          id="wooden-door-left"
          initial={false}
          animate={{ x: isOpen ? '-100%' : '0%', rotateY: isOpen ? -85 : 0 }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-[#2b1704] via-[#4e2c0e] to-[#391e0a] border-r-8 border-[#1f0e02] shadow-2xl origin-left flex flex-col justify-between p-4 z-20 rounded-l-2xl overflow-hidden"
          style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
        >
          {/* 木目プレートの装飾枠 */}
          <div className="absolute inset-2 border-2 border-dashed border-[#a87f43]/40 rounded-lg pointer-events-none" />
          
          {/* アンティーク飾り・蝶番(ヒンジ) */}
          <div className="absolute top-8 right-0 w-4 h-12 bg-gradient-to-b from-yellow-700 to-amber-900 border border-amber-600 rounded-l-md" />
          <div className="absolute bottom-8 right-0 w-4 h-12 bg-gradient-to-b from-yellow-700 to-amber-900 border border-amber-600 rounded-l-md" />

          {/* 左側のコンテンツ（文字やレトロイラスト調） */}
          <div className="my-auto text-center px-4 flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-amber-950/80 border-4 border-[#cda250] flex items-center justify-center shadow-lg">
              <span className="text-4xl">🍖</span>
            </div>
            <div className="font-serif text-[#f4e2c6]">
              <p className="text-sm tracking-wider text-amber-400">SINCE 1968 STYLE</p>
              <h2 className="text-2xl font-black mt-1">びっくりウッド</h2>
              <div className="h-[2px] w-20 bg-amber-500 mx-auto my-2" />
              <p className="text-xs text-amber-200/80 leading-relaxed font-sans">
                木の温もりあふれる店内で、まごころ込めたハンバーグディッシュを皆様へお届けします。
              </p>
            </div>
          </div>

          <div className="text-center text-[10px] text-amber-600/60 font-mono">
            WOODY RESTAURANT v1.0
          </div>
        </motion.div>

        {/* 右の扉 */}
        <motion.div
          id="wooden-door-right"
          initial={false}
          animate={{ x: isOpen ? '100%' : '0%', rotateY: isOpen ? 85 : 0 }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-[#2b1704] via-[#4e2c0e] to-[#391e0a] border-l-8 border-[#1f0e02] shadow-2xl origin-right flex flex-col justify-between p-4 z-20 rounded-r-2xl overflow-hidden"
          style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
        >
          {/* 木目プレートの装飾枠 */}
          <div className="absolute inset-2 border-2 border-dashed border-[#a87f43]/40 rounded-lg pointer-events-none" />
          
          {/* 蝶番 */}
          <div className="absolute top-8 left-0 w-4 h-12 bg-gradient-to-b from-yellow-700 to-amber-900 border border-amber-600 rounded-r-md" />
          <div className="absolute bottom-8 left-0 w-4 h-12 bg-gradient-to-b from-yellow-700 to-amber-900 border border-amber-600 rounded-r-md" />

          {/* 取っ手 (アンティークハンドル) */}
          <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 flex flex-col items-center z-30">
            <div className="w-3 h-20 bg-gradient-to-r from-yellow-600 via-amber-800 to-amber-950 border border-amber-600 rounded-full shadow-md cursor-pointer hover:brightness-110 active:scale-95 flex items-center justify-center" onClick={handleStart}>
              <div className="w-1 h-12 bg-yellow-500 rounded-full" />
            </div>
          </div>

          <div className="my-auto text-center px-4 flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-amber-950/80 border-4 border-[#cda250] flex items-center justify-center shadow-lg">
              <span className="text-4xl">🍹</span>
            </div>
            <div className="font-serif text-[#f4e2c6]">
              <p className="text-sm tracking-wider text-amber-400">HANDCRAFTED DIAL</p>
              <h2 className="text-2xl font-black mt-1">パタパタ店員ゲーム</h2>
              <div className="h-[2px] w-20 bg-amber-500 mx-auto my-2" />
              <button
                id="wood-start-button"
                onClick={handleStart}
                className="mt-2 px-6 py-2.5 bg-gradient-to-b from-[#b18337] to-[#734b12] hover:from-[#c29241] hover:to-[#835616] text-[#fcfaee] font-bold text-sm tracking-widest rounded-lg border-2 border-[#ffdf7b] shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-sans"
              >
                扉を開いてお仕事開始！
              </button>
            </div>
          </div>

          <div className="text-center text-[10px] text-amber-600/60 font-mono">
            CLICK METAL HANDLE TO START
          </div>
        </motion.div>

        {/* 扉が開いたときに見える中身 (ボード・メニュー用紙) */}
        <div id="wooden-menu-content-board" className="w-[95%] h-[95%] bg-[#f7f2e5] border-8 border-[#522b0c] rounded-2xl shadow-inner p-6 md:p-8 flex flex-col justify-between overflow-y-auto text-[#3e2723] relative z-10">
          {/* 背景のうっすらとした木の年輪やクラシックな模様を表現 */}
          <div className="absolute inset-0 bg-[radial-gradient(#ebdcb9_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* メニューの見出し */}
            <div className="text-center border-b-2 border-stone-400 pb-4">
              <div className="flex justify-center items-center gap-2 mb-1">
                <span className="text-2xl md:text-3xl">🪓</span>
                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-widest text-[#4e2c0e]">
                  {gameStatus === 'start' ? '本日の業務マニュアル' : '本日の営業報告'}
                </h1>
                <span className="text-2xl md:text-3xl">🪓</span>
              </div>
              <p className="text-xs text-stone-600 tracking-wider">WOOD LAND RESTAURANT BUSINESS REPORT</p>
            </div>

            {/* ゲームステータス：スタート画面の本日のマニュアル */}
            {gameStatus === 'start' && (
              <div className="my-6 space-y-4 text-sm md:text-base leading-relaxed max-w-2xl mx-auto overflow-y-auto">
                <p className="font-bold text-[#7a481c] text-center text-base md:text-lg mb-2">
                  〜 びっくりウッドレストランへようこそ！ 〜
                </p>
                <p className="text-center text-stone-800 text-xs md:text-sm">
                  お客様を案内し、美味しい料理をお届けして、笑顔でお会計をするまでの一連のお仕事に挑戦しましょう。
                </p>

                {/* 職種ステップ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs md:text-sm">
                  <div className="p-3 bg-[#eedcb3]/40 border border-[#bfa275] rounded-xl flex gap-3">
                    <span className="text-2xl md:text-3xl shrink-0">①</span>
                    <div>
                      <h4 className="font-bold text-[#4e2c0e]">お客様のご案内 ＆ 注文</h4>
                      <p className="text-stone-700 text-xs mt-1">入口でお客さんが待っています。空いたテーブルをタップしてご案内し、注文を取りましょう！</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#eedcb3]/40 border border-[#bfa275] rounded-xl flex gap-3">
                    <span className="text-2xl md:text-3xl shrink-0">②</span>
                    <div>
                      <h4 className="font-bold text-[#4e2c0e]">料理の配膳 (サーブ)</h4>
                      <p className="text-stone-700 text-xs mt-1">キッチン（上部）で料理が完成したらチリンと鳴ります。完成した料理をタップで持ち、正しいテーブルへ届けましょう！</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#eedcb3]/40 border border-[#bfa275] rounded-xl flex gap-3">
                    <span className="text-2xl md:text-3xl shrink-0">③</span>
                    <div>
                      <h4 className="font-bold text-[#4e2c0e]">片付け ＆ テーブル拭き</h4>
                      <p className="text-stone-700 text-xs mt-1">食べ終わったテーブルからお皿を回収（バッシング）して洗い場へ！その後、テーブルをタップ連打でピカピカに拭いてください。</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#eedcb3]/40 border border-[#bfa275] rounded-xl flex gap-3">
                    <span className="text-2xl md:text-3xl shrink-0">④</span>
                    <div>
                      <h4 className="font-bold text-[#4e2c0e]">レジお会計ミニゲーム</h4>
                      <p className="text-stone-700 text-xs mt-1">食べ終わったお客様がレジでお支払い。代金に対して「お釣り」を計算し、テンキーやコインを選んでお渡しします！</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#fb923c]/10 border border-[#f97316]/40 p-2.5 rounded-lg text-xs flex justify-center items-center gap-2">
                  <span className="text-orange-600 font-bold">⚠️ 注意：</span>
                  <p className="text-orange-950 font-medium">お客様を長く待たせて満足度（ハート）がゼロになると、営業終了（ゲームオーバー）になります！</p>
                </div>
              </div>
            )}

            {/* ゲームステータス：リザルト・ゲームオーバー画面 */}
            {(gameStatus === 'gameover' || gameStatus === 'victory') && score && (
              <div className="my-6 text-center space-y-6 flex-1 flex flex-col justify-center">
                <div className="space-y-1">
                  <div className="text-sm font-bold tracking-widest text-[#7a481c]">RESULT SUMMARY</div>
                  <div className={`text-3xl md:text-4xl font-extrabold font-serif ${gameStatus === 'victory' ? 'text-green-800' : 'text-red-800'}`}>
                    {gameStatus === 'victory' ? '🎉 本日の営業目標 達成！' : '😭 ライフがなくなりました（閉店）'}
                  </div>
                </div>

                {/* スコア・詳細 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl mx-auto w-full">
                  <div className="bg-[#ebd9bd] border-2 border-[#b89569] p-3 rounded-xl shadow-sm">
                    <div className="text-xs text-stone-600 font-bold mb-1">本日の総売上</div>
                    <div className="text-xl md:text-2xl font-black text-amber-950 font-mono">¥{score.money.toLocaleString()}</div>
                  </div>
                  <div className="bg-[#ebd9bd] border-2 border-[#b89569] p-3 rounded-xl shadow-sm">
                    <div className="text-xs text-stone-600 font-bold mb-1">配膳成功したお皿</div>
                    <div className="text-xl md:text-2xl font-black text-amber-950 font-mono">{score.servedCount} 皿</div>
                  </div>
                  <div className="bg-[#ebd9bd] border-2 border-[#b89569] p-3 rounded-xl shadow-sm">
                    <div className="text-xs text-stone-600 font-bold mb-1">ピカピカにした席</div>
                    <div className="text-xl md:text-2xl font-black text-amber-950 font-mono">{score.cleanCount} 席</div>
                  </div>
                  <div className="bg-[#ebd9bd] border-2 border-[#b89569] p-3 rounded-xl shadow-sm">
                    <div className="text-xs text-stone-600 font-bold mb-1">稼働した日数</div>
                    <div className="text-xl md:text-2xl font-black text-amber-950 font-mono">{score.day} 日目</div>
                  </div>
                </div>

                <div className="p-4 bg-[#f1ebd9] border border-stone-300 rounded-xl inline-block max-w-md mx-auto text-xs md:text-sm text-stone-700 leading-relaxed">
                  {gameStatus === 'victory' ? (
                    <p>
                      素晴らしい！ウッドレストランの看板店員としてパーフェクトなお仕事でした！
                      お客様もびっくりドンキー顔負けの丸い木のお皿ハンバーグに大満足して笑顔で帰られました！
                    </p>
                  ) : (
                    <p>
                      お疲れ様でした。お客さんを待たせすぎて怒らせてしまいました。
                      次は、お皿の回収とレジ、料理の配膳をうまくパタパタ両立させましょう！
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 下部アクションボタン */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-auto pt-4 border-t border-stone-300">
              {gameStatus === 'start' ? (
                <button
                  id="wooden-start-inside-button"
                  onClick={handleStart}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-800 to-green-700 hover:from-emerald-700 hover:to-green-600 text-white font-extrabold text-lg rounded-xl shadow-md border-b-4 border-emerald-950 transform hover:-translate-y-0.5 active:translate-y-0 active:border-b-0 cursor-pointer tracking-widest transition-all"
                >
                  はい、お仕事に入ります！ 👋🏼
                </button>
              ) : (
                <button
                  id="wooden-restart-inside-button"
                  onClick={() => {
                    playClick();
                    onStartGame();
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-[#f7f2e5] font-extrabold text-lg rounded-xl shadow-md border-b-4 border-amber-950 transform hover:-translate-y-0.5 active:translate-y-0 active:border-b-0 cursor-pointer tracking-widest transition-all"
                >
                  もう一度お店を開く 🔄
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
