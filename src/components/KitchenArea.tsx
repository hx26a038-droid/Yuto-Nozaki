/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { KitchenOrder, PlayerItem } from '../types';
import { playClick } from '../utils/audio';

interface KitchenAreaProps {
  orders: KitchenOrder[];
  playerItem: PlayerItem;
  onTakeFood: (orderId: string) => void;
}

export const KitchenArea: React.FC<KitchenAreaProps> = ({
  orders,
  playerItem,
  onTakeFood
}) => {
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-gradient-to-r from-red-500 to-orange-500';
    return 'bg-gradient-to-r from-amber-600 to-yellow-500';
  };

  const activeOrders = orders.filter(o => o.status === 'cooking');
  const readyOrders = orders.filter(o => o.status === 'done');

  return (
    <div id="kitchen-container" className="bg-[#4e342e] border-4 border-[#2b1704] rounded-2xl p-3 shadow-xl text-[#f7f2e5] relative overflow-hidden flex flex-col justify-between h-full min-h-0">
      {/* びっくりドンキーの厨房入り口にあるような「アンティーク木製プレート」を背景にあしらうイメージ */}
      <div className="absolute inset-0 bg-[#2d1500]/20 pointer-events-none" />
      <div className="absolute inset-2 border border-dashed border-[#bfa275]/30 rounded-lg pointer-events-none" />

      {/* ヘッダー */}
      <div className="flex justify-between items-center pb-2 border-b border-[#bfa275]/30 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">👩‍🍳</span>
          <h3 className="font-serif font-black text-sm tracking-widest text-[#f5bf58]">
            森の厨房 (KITCHEN)
          </h3>
        </div>
        <span className="text-[10px] text-amber-200/60 font-mono tracking-wide">
          ACTIVE ORDERS: {orders.length}
        </span>
      </div>

      {/* コンテンツ: 調理場と配膳台 */}
      <div className="grid grid-cols-2 gap-4 h-full pt-3 z-10">
        
        {/* 左半分: 調理中エリア */}
        <div className="border-r border-dashed border-[#bfa275]/20 pr-2 flex flex-col justify-start">
          <div className="text-[10px] text-[#bfa275] font-black tracking-wider mb-2 flex items-center gap-1 select-none">
            <span>🔥</span> 調理中のコンロ
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-1 max-h-[80px]">
            {activeOrders.length === 0 ? (
              <div className="text-stone-400 text-xs text-center italic py-2">
                注文待ち...
              </div>
            ) : (
              activeOrders.map(order => (
                <div id={`kitchen-conro-${order.id}`} key={order.id} className="bg-stone-900/65 rounded-lg p-1.5 border border-[#5d4037] text-[11px] flex flex-col gap-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-yellow-400 font-bold truncate max-w-[90px]">
                      {order.menuItem.jpName}
                    </span>
                    <span className="text-[#ecdcb3] text-[9px] font-mono">
                      {order.tableName}番席
                    </span>
                  </div>
                  
                  {/* 調理バー */}
                  <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-600 to-yellow-500 transition-all duration-300"
                      style={{ width: `${order.progress}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右半分: 完成・配膳カウンター */}
        <div className="pl-1 flex flex-col justify-start">
          <div className="text-[10px] text-[#f5bf58] font-black tracking-wider mb-2 flex items-center gap-1 select-none">
            <span>🔔</span> 出来たて！配膳カウンター
          </div>

          <div className="flex-1 flex gap-2 overflow-x-auto pb-1 max-h-[80px] items-center">
            {readyOrders.length === 0 ? (
              <div className="text-stone-500 text-xs text-center italic w-full py-2">
                料理はまだありません
              </div>
            ) : (
              readyOrders.map(order => {
                const isSelected = playerItem.type === 'food' && playerItem.tableId === order.tableId;
                return (
                  <motion.button
                    id={`kitchen-order-btn-${order.id}`}
                    key={order.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playClick();
                      onTakeFood(order.id);
                    }}
                    className={`shrink-0 h-14 w-[74px] rounded-xl relative flex flex-col items-center justify-center border-2 shadow-md cursor-pointer transition-all duration-150 ${
                      isSelected 
                        ? 'bg-amber-100 text-amber-950 border-yellow-400 scale-105 ring-2 ring-yellow-400/50' 
                        : 'bg-stone-900 text-white border-yellow-600 hover:bg-stone-800'
                    }`}
                  >
                    {/* 木製ディッシュ皿（サークル）を背景に施す */}
                    <div className="absolute inset-1 rounded-full border border-dashed border-amber-800/40 pointer-events-none" />
                    
                    <span className="text-xl filter drop-shadow-sm select-none">
                      {order.menuItem.icon}
                    </span>
                    
                    <div className="text-[9px] font-black bg-amber-950 text-[#fff5e0] px-1 rounded absolute -top-1.5 -right-1 border border-[#a87f43] font-mono shadow-sm">
                      #{order.tableName}
                    </div>

                    <div className="text-[8px] font-black text-amber-200 mt-0.5 truncate max-w-[66px] px-0.5 select-none">
                      {order.menuItem.jpName}
                    </div>
                    
                    {/* キラキラ配膳待ちエフェクト */}
                    <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" />
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
