/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MenuItem {
  id: string;
  name: string;
  jpName: string;
  price: number;
  preparationTime: number; // 調理時間(秒)
  color: string; // メニューのイメージ色
  icon: string; // アイコン名
  description: string;
}

export type PlayerItem = 
  | { type: 'none' }
  | { type: 'food'; foodId: string; tableName: string; tableId: number }
  | { type: 'dirty_plate'; tableId: number }
  | { type: 'cleaning_cloth' };

export type TableStatus =
  | 'empty'           // 空席。客を案内できる
  | 'waiting_order'   // 着席したばかり。注文ボタンを押して注文を取る
  | 'ordering'        // 注文決定アニメーション中、または自動で注文決定
  | 'cooking'         // 厨房で調理中
  | 'serving_ready'   // 料理ができて配膳を待っている
  | 'eating'          // お食事中 (ゲージが減っていく)
  | 'dirty'           // 食べ終わり、汚れたお皿が残っている(片付け待ち)
  | 'needs_wipe'      // お皿は片付いたが、テーブルを拭く必要がある(清掃待ち)
  | 'cleaning'        // 拭き掃除中
  | 'waiting_checkout'// 食事が終わり、お会計アイコンを表示してレジに向かおうとしている、またはレジへ移動済み
  ;

export interface Table {
  id: number;
  name: string; // 「No.1」「No.2」など
  status: TableStatus;
  currentCustomer: {
    size: number;
    patience: number; // 満足度/待てる時間 (0-100)
    maxPatience: number;
    gender: 'male' | 'female' | 'family';
    avatarSeed: number;
  } | null;
  currentOrder: MenuItem | null;
  eatingProgress: number; // 0 to 100
  wipeProgress: number; // 0 to 100 (拭き掃除の進捗)
}

export interface KitchenOrder {
  id: string; // Unique queue item ID
  tableId: number;
  menuItem: MenuItem;
  progress: number; // 0 to 100
  status: 'cooking' | 'done';
}

export interface RegisterQueueItem {
  id: string;
  tableId: number;
  tableName: string;
  amount: number;
  patience: number;
  maxPatience: number;
  changeAnswer: number; // 正解のお釣り
  paidAmount: number; // お客さんが支払ったお札/コインの合計
}

export interface GameScore {
  money: number;       // 現在の売上（お給料/スコア）
  day: number;         // 現在の日数、またはレベル
  reputation: number;  // 評価（ハートライフ 0〜5 または 0〜100）
  servedCount: number; // 配膳に成功した数
  cleanCount: number;  // 掃除した数
  penaltyCount: number;// タイムオーバーなどで失った数
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'burg_regular',
    name: 'Regular Burg Dish',
    jpName: 'レギュラーバーグディッシュ',
    price: 880,
    preparationTime: 7,
    color: 'amber',
    icon: '🍖',
    description: '木製プレートにのったおなじみのジューシーな150gハンバーグとふっくらご飯、大根サラダ。'
  },
  {
    id: 'burg_cheese',
    name: 'Cheese Burg Dish',
    jpName: 'チーズバーグディッシュ',
    price: 1050,
    preparationTime: 9,
    color: 'yellow',
    icon: '🧀',
    description: 'とろける特製チーズが十字にトッピングされた大人気ハンバーグディッシュ！'
  },
  {
    id: 'burg_orishoso',
    name: 'Oroshiso Burg Dish',
    jpName: 'おろしそバーグディッシュ',
    price: 980,
    preparationTime: 8,
    color: 'emerald',
    icon: '🥬',
    description: '青じそとたっぷりの大根おろしでさっぱり。絶妙な和風ソース仕立て。'
  },
  {
    id: 'fries',
    name: 'Merry Fries',
    jpName: 'びっくりフライドポテト',
    price: 440,
    preparationTime: 4,
    color: 'orange',
    icon: '🍟',
    description: 'ホクホク厚切りの大人気ポテト！マヨネーズタイプソースとオリジナルトマトソース付き。'
  },
  {
    id: 'strawberry_parfait',
    name: 'Strawberry Soft Parfait',
    jpName: '北海道ミニソフト（イチゴ）',
    price: 350,
    preparationTime: 3,
    color: 'pink',
    icon: '🍓',
    description: '濃厚な北海道ミルクソフトクリームに、つぶつぶイチゴソースをあしらった甘美なパフェ。'
  },
  {
    id: 'big_cola',
    name: 'Bikkuri Cola',
    jpName: 'びっくりコーラ',
    price: 490,
    preparationTime: 2,
    color: 'stone',
    icon: '🥤',
    description: '圧巻の超巨大特製グラスでグビグビ飲める、爽快炭酸コーラ！'
  }
];
