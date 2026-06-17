/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Table, 
  PlayerItem, 
  KitchenOrder, 
  RegisterQueueItem, 
  GameScore, 
  MENU_ITEMS, 
  MenuItem,
  TableStatus
} from './types';
import { 
  startBGM, 
  stopBGM, 
  toggleMute, 
  getMutedState, 
  playClick, 
  playServingSound, 
  playCookingDoneBell, 
  playCleanSound, 
  playBoing, 
  playFanfare, 
  playWoodDoorSound,
  playDing,
  initAudioOnInteraction
} from './utils/audio';

import { WoodenMenu } from './components/WoodenMenu';
import { GameStats } from './components/GameStats';
import { RegisterArea } from './components/RegisterArea';


// 1日のゲーム時間
const MAX_GAME_TIME = 120; // 120秒

// 日ごとの目標金額
const TARGET_MONEY_BY_DAY: Record<number, number> = {
  1: 3000,
  2: 5000,
  3: 8500,
  4: 13000,
  5: 18000,
};

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface DoorWaitingCustomer {
  id: string;
  size: number;
  patience: number;
  maxPatience: number;
  gender: 'male' | 'female' | 'family';
  avatarSeed: number;
}

// 2D座標
interface Coord {
  x: number;
  y: number;
}

// 2Dフロアを移動するアクティブなお客様
interface GameCustomer {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  status: 
    | 'walking_in'          // 入口から待機列へ
    | 'waiting_lobby'        // 入口で案内待ち
    | 'following_player'    // プレイヤーの後を追う案内中
    | 'walking_to_table'    // テーブル席へ歩いている
    | 'sitting'             // 着席中
    | 'waiting_order'       // 注文のオーダー待ち（？付き）
    | 'waiting_food'        // 調理・配膳を待っている
    | 'eating'              // 食事中
    | 'walking_to_register' // レジへ向かって歩いている
    | 'waiting_checkout'    // レジ待機列で順番待ち
    | 'walking_out';        // 退店中
  tableId: number | null;
  size: number;
  gender: 'male' | 'female' | 'family';
  patience: number;
  maxPatience: number;
  avatarSeed: number;
  orderItem: MenuItem | null;
  eatingProgress: number;
}

export default function App() {
  // 1. ゲームの状態管理
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false); // 木製扉メニュー
  const [gameScenario, setGameScenario] = useState<'start' | 'gameover' | 'victory'>('start');

  const [score, setScore] = useState<GameScore>({
    money: 0,
    day: 1,
    reputation: 100, // 評判% (ライフ)
    servedCount: 0,
    cleanCount: 0,
    penaltyCount: 0
  });

  // ピザレディ風自動化・能力アップ状態
  const [upgrades, setUpgrades] = useState({
    playerSpeed: 1,       // 1: 標準, 2: 早い, 3: 超神速 (持てる枚数も増加)
    hasKitchenStaff: false, // 🤖 自動配膳アシスタント
    hasCleanStaff: false,   // 🤖 自動お掃除お片付け係
    hasCashierStaff: false, // 🤖 自動レジ会計主任
  });

  const [timeLeft, setTimeLeft] = useState<number>(MAX_GAME_TIME);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  
  // HUD互換用：プレイヤーが現在手に持っている代表的なアイテム (GameStats描画維持)
  const [playerItem, setPlayerItem] = useState<PlayerItem>({ type: 'none' });

  // ----------------------------------------------------
  // 2Dキャラクタ移動管理
  // ----------------------------------------------------
  // 論理画面：1000 x 750 (aspect 4:3)
  const [playerPos, setPlayerPos] = useState<Coord>({ x: 500, y: 450 });
  const [playerAngle, setPlayerAngle] = useState<number>(0);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  
  // スタックで物を持つシステム (ピザレディ風に積める！)
  interface CarryingStackItem {
    type: 'food' | 'dirty_plate';
    tableId: number;
    name: string;
    icon: string;
  }
  const [playerStack, setPlayerStack] = useState<CarryingStackItem[]>([]);
  const [playerHasCloth, setPlayerHasCloth] = useState<boolean>(false);

  // ショップ購入中の進捗
  const [buyingProgress, setBuyingProgress] = useState<{ id: string; progress: number } | null>(null);

  // 2Dフロア上のアクティブなお客様リスト
  const [customers, setCustomers] = useState<GameCustomer[]>([]);

  // 2. レストラン内のエリア状態
  const [tables, setTables] = useState<Table[]>([
    { id: 1, name: '1番テーブル', status: 'empty', currentCustomer: null, currentOrder: null, eatingProgress: 0, wipeProgress: 0 },
    { id: 2, name: '2番テーブル', status: 'empty', currentCustomer: null, currentOrder: null, eatingProgress: 0, wipeProgress: 0 },
    { id: 3, name: '3番テーブル', status: 'empty', currentCustomer: null, currentOrder: null, eatingProgress: 0, wipeProgress: 0 },
    { id: 4, name: '4番テーブル', status: 'empty', currentCustomer: null, currentOrder: null, eatingProgress: 0, wipeProgress: 0 },
  ]);

  // 入口 queue (HUDテキスト表示向け維持)
  const [doorQueue, setDoorQueue] = useState<DoorWaitingCustomer[]>([]);

  // キッチン(調理キュー)
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);

  // 洗い場(シンクにたまっている汚れた皿の数)
  const [dirtyPlatesInSink, setDirtyPlatesInSink] = useState<number>(0);

  // レジ会計待ちキュー
  const [registerQueue, setRegisterQueue] = useState<RegisterQueueItem[]>([]);
  const [activeRegisterId, setActiveRegisterId] = useState<string | null>(null);

  // フローティングテキスト
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // お化けNPCアシスタントの位置
  const [chefStaffPos, setChefStaffPos] = useState<Coord>({ x: 180, y: 150 });
  const [chefStaffStack, setChefStaffStack] = useState<CarryingStackItem[]>([]);
  
  const [cleanStaffPos, setCleanStaffPos] = useState<Coord>({ x: 450, y: 150 });
  const [cleanStaffStack, setCleanStaffStack] = useState<CarryingStackItem[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerPosRef = useRef<Coord>({ x: 500, y: 450 });
  const keysRef = useRef<Record<string, boolean>>({});
  const targetPosRef = useRef<Coord | null>(null);
  const playerPathRef = useRef<Coord[]>([]);
  const frameTimerRef = useRef<number | null>(null);
  const secondTimerRef = useRef<number | null>(null);
  const autoStaffActionTimerRef = useRef<number | null>(null);

  // スタッキング容量 (アップグレードすると増える)
  const maxStackCapacity = 3 + upgrades.playerSpeed;

  // アリーナ寸法状態維持用 (ResizeObserver)
  const [arenaStyle, setArenaStyle] = useState<React.CSSProperties>({
    width: '100%',
    height: '100%',
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        const targetAspect = 1000 / 750;
        const currentAspect = width / height;

        if (currentAspect > targetAspect) {
          // 横幅に余裕がある（縦が律速）：高さを限界まで伸ばし、横幅をアスペクト比(4:3)に合わせる
          const computedWidth = height * targetAspect;
          setArenaStyle({
            width: `${computedWidth}px`,
            height: `${height}px`
          });
        } else {
          // 縦幅に余裕がある（横が律速）：横幅を限界まで伸ばし、高さをアスペクト比(4:3)に合わせる
          const computedHeight = width / targetAspect;
          setArenaStyle({
            width: `${width}px`,
            height: `${computedHeight}px`
          });
        }
      }
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, []);

  // 手元表示同期
  useEffect(() => {
    if (playerHasCloth && playerStack.length === 0) {
      setPlayerItem({ type: 'cleaning_cloth' });
    } else if (playerStack.length > 0) {
      const topItem = playerStack[playerStack.length - 1];
      if (topItem.type === 'food') {
        setPlayerItem({ type: 'food', foodId: topItem.name, tableName: `${topItem.tableId}番`, tableId: topItem.tableId });
      } else {
        setPlayerItem({ type: 'dirty_plate', tableId: topItem.tableId });
      }
    } else {
      setPlayerItem({ type: 'none' });
    }
  }, [playerStack, playerHasCloth]);

  // 初回ロード
  useEffect(() => {
    setIsMenuOpen(false);
    setSoundMuted(getMutedState());

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    const handleBlur = () => {
      keysRef.current = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (frameTimerRef.current) cancelAnimationFrame(frameTimerRef.current);
      if (secondTimerRef.current) clearInterval(secondTimerRef.current);
      if (autoStaffActionTimerRef.current) clearInterval(autoStaffActionTimerRef.current);
    };
  }, []);

  // ミュートスイッチ
  const handleToggleMute = () => {
    const muted = toggleMute();
    setSoundMuted(muted);
    if (muted) {
      stopBGM();
    } else if (isPlaying) {
      startBGM();
    }
  };

  // 手元をクリアする（捨てる）
  const handleResetCarrying = () => {
    setPlayerStack([]);
    setPlayerHasCloth(false);
    addFloatingText("👐 手荷物をすべて捨てました", playerPos.x, playerPos.y - 40, 'text-stone-300 font-bold');
  };

  // 3. ゲーム開始 / 日数リセット
  const startNewGame = (dayNum: number = 1) => {
    initAudioOnInteraction();
    
    if (!soundMuted) {
      startBGM();
    }

    setScore(prev => ({
      ...prev,
      money: dayNum === 1 ? 0 : prev.money,
      day: dayNum,
      reputation: 100,
      servedCount: dayNum === 1 ? 0 : prev.servedCount,
      cleanCount: dayNum === 1 ? 0 : prev.cleanCount,
      penaltyCount: dayNum === 1 ? 0 : prev.penaltyCount
    }));

    setTimeLeft(MAX_GAME_TIME);
    setPlayerStack([]);
    setPlayerHasCloth(false);
    setPlayerPos({ x: 500, y: 450 });
    playerPosRef.current = { x: 500, y: 450 };
    setPlayerAngle(0);
    setIsMoving(false);
    targetPosRef.current = null;
    playerPathRef.current = Array(150).fill({ x: 500, y: 450 });

    const initRegId = `reg-init-${Date.now()}`;
    const initCust1Id = `cust-init-reg-${Date.now()}`;
    const initCust2Id = `cust-init-t2-${Date.now()}`;
    const initCust3Id = `cust-init-lobby-${Date.now()}`;

    setTables([
      { id: 1, name: '1番テーブル', status: 'dirty' as const, currentCustomer: null, currentOrder: null, eatingProgress: 0, wipeProgress: 0 },
      { 
        id: 2, 
        name: '2番テーブル', 
        status: 'waiting_order' as const, 
        currentCustomer: {
          size: 1,
          patience: 90,
          maxPatience: 100,
          gender: 'male' as const,
          avatarSeed: 12
        }, 
        currentOrder: null, 
        eatingProgress: 0, 
        wipeProgress: 0 
      },
      { id: 3, name: '3番テーブル', status: 'empty' as const, currentCustomer: null, currentOrder: null, eatingProgress: 0, wipeProgress: 0 },
      { id: 4, name: '4番テーブル', status: 'empty' as const, currentCustomer: null, currentOrder: null, eatingProgress: 0, wipeProgress: 0 },
    ]);

    setCustomers([
      {
        id: initCust1Id,
        x: 820,
        y: 150,
        targetX: 820,
        targetY: 150,
        status: 'waiting_checkout' as const,
        tableId: 1,
        size: 2,
        gender: 'female' as const,
        patience: 85,
        maxPatience: 100,
        avatarSeed: 42,
        orderItem: MENU_ITEMS[0],
        eatingProgress: 100
      },
      {
        id: initCust2Id,
        x: 750,
        y: 360,
        targetX: 750,
        targetY: 360,
        status: 'waiting_order' as const,
        tableId: 2,
        size: 1,
        gender: 'male' as const,
        patience: 90,
        maxPatience: 100,
        avatarSeed: 12,
        orderItem: null,
        eatingProgress: 0
      },
      {
        id: initCust3Id,
        x: 80,
        y: 600,
        targetX: 80,
        targetY: 600,
        status: 'waiting_lobby' as const,
        tableId: null,
        size: 3,
        gender: 'family' as const,
        patience: 95,
        maxPatience: 100,
        avatarSeed: 7,
        orderItem: null,
        eatingProgress: 0
      }
    ]);

    setDoorQueue([]);
    setKitchenOrders([]);
    setDirtyPlatesInSink(0);

    setRegisterQueue([
      {
        id: initRegId,
        tableId: 1,
        tableName: '1番席',
        amount: 880,
        patience: 85,
        maxPatience: 100,
        paidAmount: 1000,
        changeAnswer: 120
      }
    ]);
    setActiveRegisterId(null);
    setFloatingTexts([]);

    setIsPlaying(true);
    setIsMenuOpen(true);
  };

  // フローティングテキストの追加
  const addFloatingText = (text: string, x: number, y: number, color: string = 'text-yellow-400') => {
    const id = `float-${Date.now()}-${Math.random()}`;
    const mappedX = (x / 1000) * (containerRef.current?.getBoundingClientRect().width || 600);
    const mappedY = (y / 750) * (containerRef.current?.getBoundingClientRect().height || 450);
    
    setFloatingTexts(prev => {
      const next = [...prev, { id, text, x: mappedX, y: mappedY, color }];
      return next.slice(-12); // 最大12個に物理トリミング、超えたら古いものを即座に消去する
    });
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(f => f.id !== id));
    }, 1300);
  };

  // お客さんデータを作成
  const createNewCustomerData = () => {
    const size = Math.floor(Math.random() * 2) + 1; // 1〜2人席
    const genders: ('male' | 'female' | 'family')[] = ['male', 'female', 'family'];
    const gender = size > 2 ? 'family' : genders[Math.floor(Math.random() * 2)];
    const basePatience = 40 + Math.floor(Math.random() * 20) - (score.day * 2);

    return {
      id: `cust-${Date.now()}-${Math.random()}`,
      size,
      patience: 100,
      maxPatience: Math.max(25, basePatience),
      gender,
      avatarSeed: Math.floor(Math.random() * 100)
    };
  };

  // ====================================================
  // ゲームオーバー＆営業終了
  // ====================================================
  const handleGameOver = () => {
    setIsPlaying(false);
    setGameScenario('gameover');
    setIsMenuOpen(false);
    stopBGM();
    playBoing();
  };

  const handleDayFinished = () => {
    setIsPlaying(false);
    const target = TARGET_MONEY_BY_DAY[score.day] || 20000;
    if (score.money >= target) {
      setGameScenario('victory');
      playFanfare();
    } else {
      setGameScenario('gameover');
      playBoing();
    }
    setIsMenuOpen(false);
    stopBGM();
  };

  const handleCheckoutComplete = (queueId: string, isSuccess: boolean, tip: number) => {
    if (!isPlaying) return;
    const item = registerQueue.find(q => q.id === queueId);
    if (!item) return;

    if (isSuccess) {
      const amount = item.amount;
      const speedBonus = tip + Math.floor(upgrades.playerSpeed * 50);
      setScore(s => ({
        ...s,
        money: s.money + amount + speedBonus,
        reputation: Math.min(100, s.reputation + 4)
      }));
      playDing();
      addFloatingText(`¥${(amount + speedBonus).toLocaleString()} 売上獲得!🛎️`, 820, 180, 'text-emerald-400 font-extrabold text-sm');

      // アクティブキャラを退店させる
      setCustomers(prev => 
        prev.map(c => {
          if (c.tableId === item.tableId && c.status === 'waiting_checkout') {
            return {
              ...c,
              status: 'walking_out',
              targetX: 80,
              targetY: 700
            };
          }
          return c;
        })
      );
    } else {
      // 怒って帰った
      setScore(s => ({
        ...s,
        reputation: Math.max(0, s.reputation - 10),
        penaltyCount: s.penaltyCount + 1
      }));
      setCustomers(prev => 
        prev.map(c => {
          if (c.tableId === item.tableId && c.status === 'waiting_checkout') {
            return {
              ...c,
              status: 'walking_out',
              targetX: 80,
              targetY: 700
            };
          }
          return c;
        })
      );
      addFloatingText(`❗ お客さんが計算に怒って退店しました`, 820, 180, 'text-rose-500 font-bold text-xs');
    }

    setRegisterQueue(prev => prev.filter(q => q.id !== queueId));
    setActiveRegisterId(null);
  };

  // タッチ・ドラッグで移動先を指定するシステム（ジョイスティック感覚）
  const handleFloorTouchOrDrag = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // 比率換算して論理上の x:0-1000, y:0-750 座標にする
    const logicalX = Math.max(40, Math.min(960, (screenX / rect.width) * 1000));
    const logicalY = Math.max(40, Math.min(710, (screenY / rect.height) * 750));

    targetPosRef.current = { x: logicalX, y: logicalY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPlaying) return;
    handleFloorTouchOrDrag(e.clientX, e.clientY);
    const onMouseMove = (moveEv: MouseEvent) => {
      handleFloorTouchOrDrag(moveEv.clientX, moveEv.clientY);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isPlaying) return;
    handleFloorTouchOrDrag(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (moveEv: TouchEvent) => {
      if (moveEv.touches.length > 0) {
        handleFloorTouchOrDrag(moveEv.touches[0].clientX, moveEv.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  // ====================================================
  // AIスタッフ自動化：1秒〜毎定期お助けロジック
  // ====================================================
  useEffect(() => {
    if (!isPlaying) return;

    autoStaffActionTimerRef.current = window.setInterval(() => {
      // 1. レジ主任アシスタント (3秒に1回お会計)
      if (upgrades.hasCashierStaff) {
        setRegisterQueue(prevQueue => {
          if (prevQueue.length > 0) {
            const currentItem = prevQueue[0];
            const earned = currentItem.amount + 120; // チップ適当に
            setScore(s => ({
              ...s,
              money: s.money + earned
            }));
            playDing();
            
            // お札の floating text
            addFloatingText(`(自動)レジお会計完了！ ¥${earned}`, 820, 160, 'text-amber-200 font-bold text-xs');

            // 退店設定
            setCustomers(cList => 
              cList.map(c => {
                if (c.tableId === currentItem.tableId && c.status === 'waiting_checkout') {
                  return { ...c, status: 'walking_out', targetX: 80, targetY: 700 };
                }
                return c;
              })
            );

            return prevQueue.filter((_, idx) => idx !== 0);
          }
          return prevQueue;
        });
      }

      // 2. スタッフ調理・清掃自動実行 (5秒毎)
      if (upgrades.hasCleanStaff) {
        setTables(prevTables => {
          const dirtyTable = prevTables.find(t => t.status === 'dirty');
          if (dirtyTable) {
            setDirtyPlatesInSink(sink => sink + 1);
            playServingSound();
            addFloatingText(`🤖 [自動回収] お皿をシンクに回収`, dirtyTable.id % 2 === 1 ? 250 : 750, dirtyTable.id <= 2 ? 360 : 560, 'text-orange-300 text-[10px] font-bold');
            return prevTables.map(t => t.id === dirtyTable.id ? { ...t, status: 'needs_wipe', currentOrder: null } : t);
          }

          const wipeTable = prevTables.find(t => t.status === 'needs_wipe');
          if (wipeTable) {
            playCleanSound();
            setScore(s => ({ ...s, cleanCount: s.cleanCount + 1 }));
            addFloatingText(`🤖 [自動お掃除] 席をピカピカに床拭き`, wipeTable.id % 2 === 1 ? 250 : 750, wipeTable.id <= 2 ? 360 : 560, 'text-teal-300 text-[10px] font-bold');
            return prevTables.map(t => t.id === wipeTable.id ? { ...t, status: 'empty', wipeProgress: 0 } : t);
          }

          return prevTables;
        });

        // 皿洗い自動化
        setDirtyPlatesInSink(sink => {
          if (sink > 0) {
            playCleanSound();
            addFloatingText(`🤖 [自動皿洗い] シンク清掃完了！`, 450, 150, 'text-sky-300 font-bold text-[10px]');
            return 0;
          }
          return sink;
        });
      }

      // 3. 自動配膳スタッフ (4秒に1回キッチンから自動配膳)
      if (upgrades.hasKitchenStaff) {
        setKitchenOrders(prevOrders => {
          const finishedOrder = prevOrders.find(o => o.status === 'done');
          if (finishedOrder) {
            setTables(prevTables => {
              const targetTable = prevTables.find(t => t.id === finishedOrder.tableId);
              if (targetTable && (targetTable.status === 'cooking' || targetTable.status === 'serving_ready')) {
                playServingSound();
                addFloatingText(`🤖 [自動配膳] 料理をお届け！`, targetTable.id % 2 === 1 ? 250 : 750, targetTable.id <= 2 ? 360 : 560, 'text-green-300 text-[10px] font-bold');
                
                // お客様フラグを食事中に変更
                setCustomers(cList =>
                  cList.map(c => c.tableId === targetTable.id ? { ...c, status: 'eating', eatingProgress: 0 } : c)
                );

                return prevTables.map(t => t.id === targetTable.id ? { ...t, status: 'eating', eatingProgress: 0 } : t);
              }
              return prevTables;
            });

            return prevOrders.filter(o => o.id !== finishedOrder.id);
          }
          return prevOrders;
        });
      }

    }, 1000);

    return () => {
      if (autoStaffActionTimerRef.current) clearInterval(autoStaffActionTimerRef.current);
    };
  }, [isPlaying, upgrades, score.day]);


  // ====================================================
  // システム毎秒Tick (顧客の怒り、来店、調理進捗、お食事など)
  // ====================================================
  useEffect(() => {
    if (!isPlaying) return;

    secondTimerRef.current = window.setInterval(() => {
      // 評判ライフ制限チェック
      if (score.reputation <= 0) {
        handleGameOver();
        return;
      }

      // 時間減少
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleDayFinished();
          return 0;
        }
        return prev - 1;
      });

      // ---- 1. お客さんの新規来店（ロビー待ち） ----
      const shouldSpawn = Math.random() < (0.15 + score.day * 0.03);
      setCustomers(prevCusts => {
        const lobbyCount = prevCusts.filter(c => c.status === 'waiting_lobby' || c.status === 'walking_in').length;
        if (lobbyCount < 3 && shouldSpawn) {
          // ロビー追加
          const cData = createNewCustomerData();
          const targetY = 600;
          const targetX = 80 - lobbyCount * 40; // 順番に詰め詰めに並ぶ
          
          playServingSound();

          return [
            ...prevCusts,
            {
              id: cData.id,
              x: 0,
              y: 600,
              targetX,
              targetY,
              status: 'walking_in',
              size: cData.size,
              gender: cData.gender,
              patience: 100,
              maxPatience: cData.maxPatience,
              avatarSeed: cData.avatarSeed,
              tableId: null,
              eatingProgress: 0,
              orderItem: null,
            } as GameCustomer
          ];
        }
        return prevCusts;
      });

      // ---- 2. 調理調理進捗の進行 ----
      setKitchenOrders(prevOrders => {
        let playBell = false;
        const updated = prevOrders.map(order => {
          if (order.status === 'cooking') {
            const nextProgress = order.progress + (100 / order.menuItem.preparationTime);
            if (nextProgress >= 100) {
              playBell = true;
              return { ...order, progress: 100, status: 'done' as const };
            }
            return { ...order, progress: nextProgress };
          }
          return order;
        });

        if (playBell) {
          playCookingDoneBell();
        }
        return updated;
      });

      // ---- 3. テーブル＆お客様お食事の進行 ----
      setCustomers(prevCusts => {
        return prevCusts.map(cust => {
          // 待機中 / 案内待ち / お会計待ちのイライラ減少
          if (cust.status === 'waiting_lobby' || cust.status === 'waiting_order' || cust.status === 'waiting_food' || cust.status === 'waiting_checkout') {
            const decay = 100 / cust.maxPatience;
            const nextPatience = Math.max(0, cust.patience - decay);
            
            // イライラタイムアウト！
            if (nextPatience <= 0) {
              playBoing();
              setScore(s => ({ 
                ...s, 
                reputation: Math.max(0, s.reputation - 12),
                penaltyCount: s.penaltyCount + 1 
              }));

              // 退席アニメーションへ移行、割り当て席があったらリセット
              if (cust.tableId !== null) {
                const tid = cust.tableId;
                setTables(currentTables => 
                  currentTables.map(t => t.id === tid ? { ...t, status: 'needs_wipe', currentCustomer: null, currentOrder: null } : t)
                );
                // 厨房の調理キューからもこのテーブル宛ての注文を破棄する
                setKitchenOrders(prevK => prevK.filter(o => o.tableId !== tid));
              }

              addFloatingText("❗ お客さんが待たされすぎて怒って帰りました -12%", cust.x, cust.y, 'text-red-500 font-bold');
              return {
                ...cust,
                status: 'walking_out',
                targetX: 80,
                targetY: 700,
                tableId: null,
                patience: 0
              };
            }
            return { ...cust, patience: nextPatience };
          }

          // 食事の進行
          if (cust.status === 'eating') {
            const nextProgress = cust.eatingProgress + 15; // 約6〜7秒で食べ終わる
            if (nextProgress >= 100) {
              // 食べ終わり -> レジ列へ
              const billAmount = cust.orderItem ? cust.orderItem.price : 980;
              
              // テーブルに汚れたお皿を残す、席ステータスを dirty に
              if (cust.tableId !== null) {
                const tid = cust.tableId;
                setTables(currentTables => 
                  currentTables.map(t => t.id === tid ? { ...t, status: 'dirty', eatingProgress: 0 } : t)
                );
              }

              // レジ queue 追加
              const correctChange = 5000 - billAmount; // お預かり5000円固定とするシンプル会計ゲーム設計
              setRegisterQueue(prevReg => [
                ...prevReg,
                {
                  id: `reg-${Date.now()}-${Math.random()}`,
                  tableId: cust.tableId || 1,
                  tableName: `${cust.tableId || 1}番席`,
                  amount: billAmount,
                  patience: cust.patience,
                  maxPatience: cust.maxPatience,
                  paidAmount: 5000,
                  changeAnswer: correctChange
                }
              ]);

              addFloatingText("ごちそうさま！レジへ 🛎️", cust.x, cust.y - 30, 'text-amber-100 font-bold');

              // レジ待ちステータスへ移行
              const queuePosition = registerQueue.length;
              return {
                ...cust,
                status: 'walking_to_register',
                targetX: 820 - queuePosition * 30,
                targetY: 150 + queuePosition * 25,
                eatingProgress: 100
              };
            }
            return { ...cust, eatingProgress: nextProgress };
          }

          return cust;
        });
      });

    }, 1000);

    return () => {
      if (secondTimerRef.current) clearInterval(secondTimerRef.current);
    };
  }, [isPlaying, registerQueue.length, score.day]);


  // ====================================================
  // メイン描画・移動ループ（超なめらか60fps requestAnimationFrame）
  // ====================================================
  useEffect(() => {
    if (!isPlaying) return;

    let localActive = true;
    let lastTime = performance.now();

    const frameUpdate = (now: number) => {
      if (!localActive) return;
      const dt = Math.min(0.1, (now - lastTime) / 1000); // 最大フレーム間隔をキャプチャ(ラグ対策)
      lastTime = now;

      // --------------------------------------------------
      // 1. プレイヤ方向キー＆タッチ移動計算
      // --------------------------------------------------
      let dx = 0;
      let dy = 0;

      if (keysRef.current['w'] || keysRef.current['arrowup']) dy = -1;
      if (keysRef.current['s'] || keysRef.current['arrowdown']) dy = 1;
      if (keysRef.current['a'] || keysRef.current['arrowleft']) dx = -1;
      if (keysRef.current['d'] || keysRef.current['arrowright']) dx = 1;

      let isMovingNow = false;
      let currentSpeedMultiplier = 150 + upgrades.playerSpeed * 65;

      // タッチ・クリックターゲット追従
      if (targetPosRef.current && dx === 0 && dy === 0) {
        const px = playerPosRef.current.x;
        const py = playerPosRef.current.y;
        const tx = targetPosRef.current.x - px;
        const ty = targetPosRef.current.y - py;
        const dist = Math.hypot(tx, ty);

        if (dist > 4) {
          dx = tx / dist;
          dy = ty / dist;
          isMovingNow = true;
          // 目的地の近くではスピードを落として確実に吸着させる
          if (dist < 40) {
            currentSpeedMultiplier *= (dist / 40);
          }
        } else {
          targetPosRef.current = null;
        }
      } else if (dx !== 0 || dy !== 0) {
        targetPosRef.current = null; // キーボード押下時はタッチ指示をキャンセル
        isMovingNow = true;
      }

      setIsMoving(isMovingNow);

      // プレイヤーポジションの適用・クランプ
      if (isMovingNow && (dx !== 0 || dy !== 0)) {
        const norm = Math.hypot(dx, dy);
        const stepX = (dx / norm) * currentSpeedMultiplier * dt;
        const stepY = (dy / norm) * currentSpeedMultiplier * dt;

        setPlayerPos(curr => {
          let nx = curr.x + stepX;
          let ny = curr.y + stepY;

          // 壁バリア
          nx = Math.max(30, Math.min(970, nx));
          ny = Math.max(30, Math.min(720, ny));

          playerPosRef.current = { x: nx, y: ny };

          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          setPlayerAngle(angle);

          // 軌跡の履歴を格納（お客様トレイル用）
          playerPathRef.current.unshift({ x: nx, y: ny });
          if (playerPathRef.current.length > 200) {
            playerPathRef.current.pop();
          }

          return { x: nx, y: ny };
        });
      }

      // --------------------------------------------------
      // 2. お客様NPCの移動計算 & 案内追従
      // --------------------------------------------------
      setCustomers(prevCusts => {
        return prevCusts.map(cust => {
          let nx = cust.x;
          let ny = cust.y;
          let targetX = cust.targetX;
          let targetY = cust.targetY;
          let status = cust.status;

          // プレイヤーガイド（追従）時
          if (cust.status === 'following_player') {
            // トレイル履歴を辿る
            const trailIdx = 18; // ラグ間隔
            const pathNode = playerPathRef.current[trailIdx] || playerPos;
            targetX = pathNode.x;
            targetY = pathNode.y;
          }

          const tx = targetX - nx;
          const ty = targetY - ny;
          const dist = Math.hypot(tx, ty);

          if (dist > 8) {
            const customerSpeed = 200; // 歩く速度
            nx += (tx / dist) * customerSpeed * dt;
            ny += (ty / dist) * customerSpeed * dt;
          } else {
            // 目的地到着時の状態遷移
            if (cust.status === 'walking_in') {
              status = 'waiting_lobby';
            } else if (cust.status === 'walking_to_table') {
              status = 'sitting';
              // テーブルを「オーダー待ち(顧客満足度そのまま維持)」に変更
              if (cust.tableId !== null) {
                const tid = cust.tableId;
                setTables(prevT => 
                  prevT.map(t => t.id === tid ? { 
                    ...t, 
                    status: 'waiting_order', 
                    currentCustomer: {
                      size: cust.size,
                      patience: cust.patience,
                      maxPatience: cust.maxPatience,
                      gender: cust.gender,
                      avatarSeed: cust.avatarSeed
                    }
                  } : t)
                );
              }
            } else if (cust.status === 'walking_to_register') {
              status = 'waiting_checkout';
            } else if (cust.status === 'walking_out') {
              status = 'gone';
            }
          }

          return {
            ...cust,
            x: nx,
            y: ny,
            targetX,
            targetY,
            status
          };
        }).filter(c => c.status !== 'gone');
      });

      // --------------------------------------------------
      // 3. プレイヤーとショップ・各注文との衝突＆作業判定
      // --------------------------------------------------
      const currPlayer = playerPosRef.current;

      // --- A. 客引き (ロビーの案内待ちとすれ違う) ---
      const lobbyGuests = customers.filter(c => c.status === 'waiting_lobby');
      if (lobbyGuests.length > 0) {
        const firstGuest = lobbyGuests[0];
        const distToGuest = Math.hypot(firstGuest.x - currPlayer.x, firstGuest.y - currPlayer.y);
        
        // プレイヤーが入口近くに立ち、現在案内中でない場合、列に割り当て
        const isGuiding = customers.some(c => c.status === 'following_player');
        if (distToGuest < 75 && !isGuiding) {
          setCustomers(prev => 
            prev.map(c => c.id === firstGuest.id ? { ...c, status: 'following_player' } : c)
          );
          playServingSound();
          addFloatingText("ご案内します！テーブルへ導こう 🚶‍♂️", currPlayer.x, currPlayer.y - 40, 'text-yellow-300 font-bold text-xs');
        }
      }

      // --- B. 各テーブルとの接客・拭き掃除アクション ---
      setTables(prevTables => {
        return prevTables.map(t => {
          const tableCoords = [
            { x: 250, y: 360 }, // 1番卓
            { x: 750, y: 360 }, // 2番卓
            { x: 250, y: 560 }, // 3番卓
            { x: 750, y: 560 }, // 4番卓
          ][t.id - 1];

          const distToTable = Math.hypot(tableCoords.x - currPlayer.x, tableCoords.y - currPlayer.y);

          if (distToTable < 85) {
            // 1. お客様案内中 -> テーブルに着席させる
            const guidingGuest = customers.find(c => c.status === 'following_player');
            if (guidingGuest && t.status === 'empty') {
              setCustomers(prev => 
                prev.map(c => 
                  c.id === guidingGuest.id 
                    ? { 
                        ...c, 
                        status: 'walking_to_table', 
                        tableId: t.id,
                        targetX: tableCoords.x,
                        targetY: tableCoords.y 
                      } 
                    : c
                )
              );
              playServingSound();
              addFloatingText(`${t.name}へご案内！🪑`, currPlayer.x, currPlayer.y - 40, 'text-emerald-300 font-bold text-xs');
              return { ...t, status: 'ordering' }; // 席割り当て中
            }
            if (t.status === 'waiting_order') {
              playClick();
              const randomRecipe = MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)];
              
              // テーブルと対応客のオーダーを特定
              setCustomers(cList => 
                cList.map(c => c.tableId === t.id ? { ...c, status: 'waiting_food', orderItem: randomRecipe } : c)
              );

              setKitchenOrders(prevK => [
                ...prevK,
                {
                  id: `cook-${Date.now()}-${Math.random()}`,
                  tableId: t.id,
                  menuItem: randomRecipe,
                  progress: 0,
                  status: 'cooking'
                }
              ]);

              addFloatingText(`オーダー受注 📜: ${randomRecipe.jpName}`, currPlayer.x, currPlayer.y - 45, 'text-amber-300 font-bold text-xs');
              return { ...t, status: 'cooking', currentOrder: randomRecipe };
            }

            // 3. 料理を配膳する (foodをトレイから配る)
            if (t.status === 'cooking' || t.status === 'serving_ready') {
              const foodIdx = playerStack.findIndex(item => item.type === 'food' && item.tableId === t.id);
              if (foodIdx !== -1) {
                // 配膳実施！ プレイヤー手元から取り除く
                playServingSound();
                setPlayerStack(prevStack => prevStack.filter((_, idx) => idx !== foodIdx));
                addFloatingText(`配膳完了！ ${t.currentOrder?.jpName} 🍔`, currPlayer.x, currPlayer.y - 45, 'text-emerald-400 font-extrabold text-xs');

                setCustomers(cList => 
                  cList.map(c => c.tableId === t.id ? { ...c, status: 'eating', eatingProgress: 0 } : c)
                );

                setScore(s => ({ ...s, servedCount: s.servedCount + 1 }));

                return { ...t, status: 'eating', eatingProgress: 0 };
              }
            }

            // 4. お皿を回収/バッシング
            if (t.status === 'dirty') {
              if (playerStack.length < maxStackCapacity) {
                playServingSound();
                setPlayerStack(prev => [...prev, { type: 'dirty_plate', tableId: t.id, name: 'dirty_plate', icon: '🍽️' }]);
                addFloatingText("汚れ皿を回収しました 🧼🗑️", currPlayer.x, currPlayer.y - 40, 'text-orange-300 font-bold text-xs');
                return { ...t, status: 'needs_wipe', currentCustomer: null };
              } else {
                addFloatingText("手元がいっぱいです！シンクへ皿を運ぼう", currPlayer.x, currPlayer.y - 40, 'text-rose-400 font-bold text-xs');
              }
            }

            // 5. 床拭き清掃
            if (t.status === 'needs_wipe') {
              if (playerHasCloth) {
                playCleanSound();
                setScore(s => ({ ...s, cleanCount: s.cleanCount + 1 }));
                addFloatingText("席をフキフキお掃除完了！✨🪑", currPlayer.x, currPlayer.y - 45, 'text-teal-300 font-extrabold text-xs');
                return { ...t, status: 'empty', wipeProgress: 0, currentOrder: null };
              } else {
                addFloatingText("汚れを拭くには【ダスター】が必要です！", currPlayer.x, currPlayer.y - 40, 'text-amber-200 font-bold text-xs');
              }
            }

          }
          return t;
        });
      });

      // --- C. 厨房自動調理カウンターとのインタラクト (今も待っている客の料理だけ積載可能) ---
      const distToKitchen = Math.hypot(180 - currPlayer.x, 150 - currPlayer.y);
      if (distToKitchen < 70) {
        setKitchenOrders(prevOrders => {
          // すでに注文した客が消滅・退店した料理は、自動的にクリーン廃棄する（トレイ詰まり防止）
          const validOrders = prevOrders.filter(o => {
            if (o.status !== 'done') return true;
            return customers.some(c => c.tableId === o.tableId && c.status === 'waiting_food');
          });

          const index = validOrders.findIndex(o => o.status === 'done');
          if (index !== -1) {
            if (playerStack.length < maxStackCapacity) {
              const order = validOrders[index];
              playServingSound();
              setPlayerStack(prev => [...prev, { type: 'food', tableId: order.tableId, name: order.menuItem.id, icon: order.menuItem.icon }]);
              addFloatingText(`${order.menuItem.jpName}を配膳トレイに積載！🍎`, currPlayer.x, currPlayer.y - 40, 'text-emerald-300 font-bold text-xs');
              return validOrders.filter((_, idx) => idx !== index);
            } else {
              addFloatingText("これ以上料理を載せられません！(満載)", currPlayer.x, currPlayer.y - 40, 'text-rose-400 font-bold text-xs');
            }
          } else if (prevOrders.length !== validOrders.length) {
            addFloatingText("注文者が退店した料理を廃棄しました 🗑️", currPlayer.x, currPlayer.y - 40, 'text-pink-300 font-bold text-xs');
          }
          return validOrders;
        });
      }

      // --- D. 洗い場シンクとのインタラクト (汚れ皿格納 ＆ 不要料理廃棄) ---
      const distToSink = Math.hypot(450 - currPlayer.x, 120 - currPlayer.y);
      if (distToSink < 70) {
        const dirtyIdx = playerStack.findIndex(item => item.type === 'dirty_plate');
        const foodIdx = playerStack.findIndex(item => item.type === 'food');

        if (dirtyIdx !== -1) {
          playServingSound();
          setPlayerStack(prevStack => prevStack.filter((_, i) => i !== dirtyIdx));
          setDirtyPlatesInSink(s => s + 1);
          addFloatingText("汚れ皿をシンクに置きました🚰", currPlayer.x, currPlayer.y - 40, 'text-cyan-200 font-bold text-xs');
        } else if (foodIdx !== -1) {
          playServingSound();
          setPlayerStack(prevStack => prevStack.filter((_, i) => i !== foodIdx));
          addFloatingText("不要な料理をシンクに廃棄しました🗑️", currPlayer.x, currPlayer.y - 40, 'text-rose-300 font-bold text-xs');
        } else if (dirtyPlatesInSink > 0) {
          // 洗うアクション
          playCleanSound();
          setDirtyPlatesInSink(0);
          addFloatingText("ジャージャー！お皿をきれいに洗いました！🧼✨", currPlayer.x, currPlayer.y - 40, 'text-sky-300 font-extrabold text-xs');
        }
      }

      // --- E. 雑巾ダスター掛けとのインタラクト ---
      const distToCloth = Math.hypot(650 - currPlayer.x, 120 - currPlayer.y);
      if (distToCloth < 70 && !playerHasCloth) {
        playServingSound();
        setPlayerHasCloth(true);
        addFloatingText("お掃除ダスターを手に持ちました 🧼🧤", currPlayer.x, currPlayer.y - 40, 'text-sky-300 font-bold text-xs');
      }

      // --- F. お会計レジカウンターとのインタラクト (お釣り計算モーダルを開く) ---
      const distToRegister = Math.hypot(820 - currPlayer.x, 120 - currPlayer.y);
      if (distToRegister < 70 && registerQueue.length > 0 && !upgrades.hasCashierStaff) {
        if (activeRegisterId === null) {
          const firstQueue = registerQueue[0];
          setActiveRegisterId(firstQueue.id);
          addFloatingText("🛎️ レジ業務を開始！お釣りを合わせよう", currPlayer.x, currPlayer.y - 45, 'text-yellow-300 font-bold text-xs');
        }
      } else if (distToRegister >= 80 && activeRegisterId !== null) {
        setActiveRegisterId(null);
      }

      // --- G. ショップ・アップグレードパッドの踏みつけ判定 (1秒立ち止まり決済) ---
      const shopPads = [
        { id: 'speed', name: '作業ピカピカLvUP', x: 380, y: 470, cost: upgrades.playerSpeed === 1 ? 800 : upgrades.playerSpeed === 2 ? 1500 : 99999 },
        { id: 'chef', name: '自動配膳雇用', x: 460, y: 470, cost: upgrades.hasKitchenStaff ? 99999 : 1200 },
        { id: 'clean', name: '自動お掃除雇用', x: 540, y: 470, cost: upgrades.hasCleanStaff ? 99999 : 1800 },
        { id: 'cashier', name: '自動レジ雇用', x: 620, y: 470, cost: upgrades.hasCashierStaff ? 99999 : 2400 },
      ];

      let onAnyPad = false;
      shopPads.forEach(pad => {
        const distToPad = Math.hypot(pad.x - currPlayer.x, pad.y - currPlayer.y);
        if (distToPad < 45 && pad.cost <= score.money) {
          onAnyPad = true;
          setBuyingProgress(curr => {
            if (curr?.id === pad.id) {
              const nextProg = curr.progress + 3.5; // 約0.5秒で充填完了
              if (nextProg >= 100) {
                // 決済！
                triggerShopUpgrade(pad.id, pad.cost);
                return null;
              }
              return { id: pad.id, progress: nextProg };
            }
            return { id: pad.id, progress: 0 };
          });
        }
      });

      if (!onAnyPad) {
        setBuyingProgress(null);
      }

      frameTimerRef.current = requestAnimationFrame(frameUpdate);
    };

    frameTimerRef.current = requestAnimationFrame(frameUpdate);
    return () => {
      if (frameTimerRef.current) cancelAnimationFrame(frameTimerRef.current);
    };
  }, [isPlaying, customers, playerStack, playerHasCloth, upgrades, dirtyPlatesInSink, registerQueue, activeRegisterId, score.money]);

  // アップグレード契約の適用
  const triggerShopUpgrade = (id: string, cost: number) => {
    setScore(s => ({ ...s, money: s.money - cost }));
    playWoodDoorSound();
    playDing();

    if (id === 'speed') {
      setUpgrades(u => ({ ...u, playerSpeed: u.playerSpeed + 1 }));
      addFloatingText(`⚡️ 職人の磨き・作業Lv.${upgrades.playerSpeed + 1}!`, playerPos.x, playerPos.y - 50, 'text-green-300 font-extrabold text-sm');
    } else if (id === 'chef') {
      setUpgrades(u => ({ ...u, hasKitchenStaff: true }));
      addFloatingText(`🤖 厨房シェフ助手(自動)を雇用！`, playerPos.x, playerPos.y - 50, 'text-green-300 font-extrabold text-sm');
    } else if (id === 'clean') {
      setUpgrades(u => ({ ...u, hasCleanStaff: true }));
      addFloatingText(`🤖 お掃除クリーンリーダー(自動)を雇用！`, playerPos.x, playerPos.y - 50, 'text-green-300 font-extrabold text-sm');
    } else if (id === 'cashier') {
      setUpgrades(u => ({ ...u, hasCashierStaff: true }));
      addFloatingText(`🤖 全自動キャッシュマスターを契約！`, playerPos.x, playerPos.y - 50, 'text-green-300 font-extrabold text-sm');
    }
  };

  return (
    <div id="game-app-root" className="h-screen bg-[#1c0d02] text-stone-100 flex flex-col font-sans select-none relative overflow-hidden">
      
      {/* びっくりドンキー調のリアル木目調ウッドグラデーション再現 */}
      <div className="absolute inset-0 bg-[#2d1500]" style={{
        backgroundImage: 'radial-gradient(#3c1d02 30%, #150600 100%)',
        opacity: 0.95
      }} />

      {/* フローティングテキスト描画エリア */}
      <div id="floating-texts-layer" className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {floatingTexts.map(f => (
          <div
            key={f.id}
            className={`absolute font-black tracking-wide text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] select-none pointer-events-none text-xs md:text-sm lg:text-base animate-floating-text ${f.color}`}
            style={{ left: f.x, top: f.y }}
          >
            {f.text}
          </div>
        ))}
      </div>

      {/* メインゲームボード：画面に完璧に収まるようにh-full min-h-0 + flex-1を設定 */}
      <main id="game-main-content" className="flex-1 min-h-0 max-w-[1500px] w-full mx-auto p-2.5 flex flex-col gap-2.5 relative z-10 overflow-hidden">

        {/* HUD: ゲームステータス */}
        <div id="game-stats-hud-container" className="shrink-0">
          <GameStats
             score={score}
             timeLeft={timeLeft}
             maxTime={MAX_GAME_TIME}
             playerItem={playerItem}
             targetMoney={TARGET_MONEY_BY_DAY[score.day] || 20000}
             soundMuted={soundMuted}
             onToggleMute={handleToggleMute}
             onResetCloth={handleResetCarrying}
          />
        </div>

        {/* 営業中のフロアビュー：2Dシミュレーター、デスクトップ/AI Studioプレビューでは全画面固定 */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
          
          {/* 1. 左側パネル：自動契約＆日誌概要 (レトロ木製ボード) */}
          <div className="lg:col-span-3 h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
            
            {/* スタッフの採用・稼働サマリー */}
            <section className="flex-[5] min-h-0 bg-[#2e1c0c] border-4 border-[#1f1003] rounded-2xl p-3 shadow-xl flex flex-col overflow-hidden select-none">
              <div className="border-b border-[#ebdcb9]/20 pb-1.5 flex justify-between items-center shrink-0">
                <h3 className="font-serif font-black text-xs text-[#f5bf58] flex items-center gap-1.5">
                  ⚙️ びっくり店舗自動化状況
                </h3>
              </div>
              <div className="flex-1 mt-2 space-y-2 text-stone-200 text-xs overflow-y-auto scrollbar-thin">
                <div className="p-2 bg-[#211105] rounded-xl border border-amber-900/30">
                  <span className="font-bold text-amber-300 block mb-1">🤖 契約中の自動スタッフィング</span>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>• 洗い場＆フロア掃除員:</span>
                      <span className={upgrades.hasCleanStaff ? 'text-green-400 font-bold' : 'text-stone-500'}>
                        {upgrades.hasCleanStaff ? '稼動中 🧹' : '未契約 (床で雇用可)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>• 厨房自動配膳アシスト:</span>
                      <span className={upgrades.hasKitchenStaff ? 'text-green-400 font-bold' : 'text-stone-500'}>
                        {upgrades.hasKitchenStaff ? '稼動中 👩‍🍳' : '未契約 (床で雇用可)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>• 全自動精算レジ主任:</span>
                      <span className={upgrades.hasCashierStaff ? 'text-green-400 font-bold' : 'text-stone-500'}>
                        {upgrades.hasCashierStaff ? '稼動中 💳' : '未契約 (床で雇用可)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-[#211105] rounded-xl border border-amber-900/30">
                  <span className="font-bold text-amber-300 block mb-1">⚡ プレイヤーの職人レベル</span>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div>移動スピード:</div>
                    <div className="text-right text-green-300 font-bold">Lv.{upgrades.playerSpeed}</div>
                    <div>最大トレイ積載:</div>
                    <div className="text-right text-yellow-300 font-bold">{maxStackCapacity} 皿</div>
                  </div>
                </div>

                <div className="p-2 bg-[#3c2514]/40 rounded-xl border border-amber-900/10 text-[10px] space-y-1 text-stone-400 leading-snug">
                  <p>💡 <span className="text-amber-200">ピザレディ風操作</span>: 画面内の床をドラッグ方向にホールド、あるいはWASDキーでキャラクターを動かします！</p>
                  <p>💡 床の上にあるキラキラした <span className="text-[#00ff66] font-bold">【￥緑サークル】</span> の上に立ち止まると、自動的に売上でスタッフ雇用やアップグレードの契約を行います！</p>
                </div>
              </div>
            </section>

            {/* 社員コントロールボード */}
            <section className="flex-[4] min-h-0 bg-[#3a200a] border-4 border-[#2b1704] rounded-2xl p-3 shadow-xl flex flex-col justify-between overflow-hidden">
              <div className="border-b border-[#ebdcb9]/20 pb-1.5 flex justify-between items-center shrink-0">
                <h3 className="font-serif font-black text-xs text-[#ebdba4] flex items-center gap-1.5">
                  🪵 食材搬入 & 道具箱
                </h3>
              </div>
              
              <div className="flex-1 py-2 text-[11px] text-amber-100 flex flex-col justify-between">
                <p className="text-stone-400 leading-relaxed">
                  現在、お皿を {playerStack.filter(v => v.type === 'dirty_plate').length} 枚、
                  料理を {playerStack.filter(v => v.type === 'food').length} 個、
                  ダスターは {playerHasCloth ? '所持 🧼' : '未所持'} です。
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleResetCarrying}
                    disabled={playerStack.length === 0 && !playerHasCloth}
                    className={`py-2 font-bold text-xs rounded-xl shadow cursor-pointer transition-all ${
                      (playerStack.length > 0 || playerHasCloth)
                        ? 'bg-rose-900 border-b-2 border-rose-950 text-white animate-pulse active:translate-y-0.5'
                        : 'bg-stone-800 text-stone-600 border border-stone-700 cursor-not-allowed'
                    }`}
                  >
                    👐 手元の荷物を捨てる
                  </button>
                  <button
                    onClick={handleToggleMute}
                    className="py-2 bg-stone-950 text-amber-300 font-bold text-xs border border-amber-950 rounded-xl shadow cursor-pointer hover:bg-stone-900"
                  >
                    {soundMuted ? '🔇 音声を再生' : '🔊 ミュート'}
                  </button>
                </div>
              </div>
            </section>

          </div>

          {/* 2. 中央・右側を連結した9カラムエリア：完全没入型2Dレストランゲームボード */}
          <div className="lg:col-span-9 h-full flex flex-col bg-[#241305] border-4 border-[#120701] rounded-2xl shadow-2xl relative overflow-hidden select-none min-h-[450px]">
            {/* 木のヘッダー */}
            <div className="bg-[#1f0e02]/85 border-b-2 border-[#bfa275]/20 p-2 flex justify-between items-center z-10 shrink-0">
              <span className="font-serif font-black text-xs text-[#f5bf58] tracking-widest flex items-center gap-1.5">
                🍔 びっくりウッド 2Dフロアシミュレーター (BIKKURI DINER FLOOR)
              </span>
              <span className="text-[10px] text-amber-200/80 font-bold">
                キーボード(WASD / 矢印) または マウスクリック・ドラッグ
              </span>
            </div>

            {/* ==================== 2Dレストランアリーナ床 ==================== */}
            {/* アスペクト比(1000:750)を維持し、見切れを防いで画面中央に配置するラッパー */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 bg-[#211105]/20">
              <div 
                id="restaurant-2d-floor"
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="relative bg-[#4a2e1c] cursor-crosshair overflow-hidden rounded-xl border-4 border-[#120701] shadow-2xl flex-shrink-0"
                style={{
                  width: arenaStyle.width,
                  height: arenaStyle.height,
                  backgroundImage: 'linear-gradient(90deg, rgba(31, 15, 3, 0.25) 50%, transparent 50%), linear-gradient(0deg, rgba(31, 15, 3, 0.25) 50%, transparent 50%)',
                  backgroundSize: '40px 40px'
                }}
              >
              
              {/* ====== A. 上部お仕事施設バックプレード & アセットグラフィック ====== */}
              
              {/* 1. 厨房エリア */}
              <div 
                className="absolute bg-[#5c3e21] border-4 border-[#2b1604] rounded-2xl p-2 select-none text-center shadow-lg flex flex-col justify-between"
                style={{ left: '5%', top: '4%', width: '25%', height: '24%' }}
              >
                <div className="text-[10px] text-amber-400 font-black tracking-wide border-b border-amber-800/50 pb-0.5">
                  👩‍🍳 森の調理場 & 配膳台
                </div>
                <div className="flex justify-around items-center h-full gap-1 mt-1.5">
                  {/* 調理コンロ1 */}
                  <div className="bg-stone-900 rounded-lg p-1 text-[9px] flex-1 text-stone-300 relative overflow-hidden border border-amber-900">
                    <div>1番コンロ</div>
                    <div className="font-bold text-[#ff9900] animate-pulse">
                      {kitchenOrders.length > 0 && kitchenOrders[0].status === 'cooking' ? '🔥調理中' : '💤空き'}
                    </div>
                    {kitchenOrders.length > 0 && kitchenOrders[0].status === 'cooking' && (
                      <div className="absolute bottom-0 left-0 h-1 bg-[#ffcc00]" style={{ width: `${kitchenOrders[0].progress}%` }} />
                    )}
                  </div>
                  {/* 調理コンロ2 */}
                  <div className="bg-stone-900 rounded-lg p-1 text-[9px] flex-1 text-stone-300 relative overflow-hidden border border-amber-900">
                    <div>2番コンロ</div>
                    <div className="font-bold text-[#ff9900] animate-pulse">
                      {kitchenOrders.length > 1 && kitchenOrders[1].status === 'cooking' ? '🔥調理中' : '💤空き'}
                    </div>
                    {kitchenOrders.length > 1 && kitchenOrders[1].status === 'cooking' && (
                      <div className="absolute bottom-0 left-0 h-1 bg-[#ffcc00]" style={{ width: `${kitchenOrders[1].progress}%` }} />
                    )}
                  </div>
                </div>

                {/* 出来たて配膳台 */}
                <div className="mt-1 bg-[#1c0d02] py-0.5 rounded text-[10px] text-yellow-300 font-bold blink flex justify-center items-center gap-1 relative border border-dashed border-yellow-900">
                  <span>🔔 完成配膳:</span>
                  <span className="bg-amber-900 text-white text-[9px] px-1 rounded">
                    {kitchenOrders.filter(o => o.status === 'done').length} 皿
                  </span>
                  {kitchenOrders.some(o => o.status === 'done') && (
                    <span className="absolute top-0 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" />
                  )}
                </div>
              </div>

              {/* 2. 洗い場シンクエリア */}
              <div 
                className="absolute bg-[#5c3e21] border-4 border-[#2b1604] rounded-2xl p-1.5 select-none text-center shadow-lg flex flex-col justify-between"
                style={{ left: '35%', top: '4%', width: '22%', height: '24%' }}
              >
                <div className="text-[10px] text-sky-300 font-black tracking-wide border-b border-sky-900/50 pb-0.5">
                  🚰 洗い場シンク
                </div>
                <div className="my-auto py-1 text-center">
                  <span className="text-2xl block">🫧🧽</span>
                  <span className="text-[10px] text-sky-100 font-bold block mt-1">汚れ皿: {dirtyPlatesInSink} 枚</span>
                </div>
                <div className="text-[8px] text-stone-400 bg-stone-900/60 py-0.5 rounded border border-cyan-900/30">
                  汚れ皿を運び、洗おう！
                </div>
              </div>

              {/* 3. 清掃ダスター掛け */}
              <div 
                className="absolute bg-[#5c3e21] border-4 border-[#2b1604] rounded-2xl p-1.5 select-none text-center shadow-lg flex flex-col justify-between"
                style={{ left: '60%', top: '4%', width: '15%', height: '24%' }}
              >
                <div className="text-[10px] text-sky-300 font-black tracking-wide border-b border-sky-900/50 pb-0.5">
                  🧹 道具箱
                </div>
                <div className="my-auto py-1 text-center">
                  <span className="text-xl block">🧤🧼</span>
                  <span className="text-[9px] text-[#f7f2e5] font-black block mt-0.5">ダスター掛け</span>
                </div>
                <div className="text-[8px] text-green-300 bg-stone-900/60 py-0.5 rounded font-bold">
                  触れると取得
                </div>
              </div>

              {/* 4. レジカウンター */}
              <div 
                className="absolute bg-[#5c3e21] border-4 border-[#2b1604] rounded-2xl p-1.5 select-none text-center shadow-lg flex flex-col justify-between"
                style={{ left: '78%', top: '4%', width: '17%', height: '24%' }}
              >
                <div className="text-[10px] text-yellow-400 font-black tracking-wide border-b border-amber-900/50 pb-0.5">
                  🛎️ レジ精算台
                </div>
                <div className="my-auto text-center py-1">
                  <span className="text-2xl block">🪙</span>
                  <span className="text-[10px] text-stone-300 font-bold block">お会計待ち: {registerQueue.length} 人</span>
                </div>
                <div className="text-[8px] text-[#00ff66] bg-stone-900/60 py-0.5 rounded font-black blink">
                  {upgrades.hasCashierStaff ? '🤖自動稼働中' : '立つとお会計'}
                </div>
              </div>

              {/* ====== B. 客席 ４つの丸テーブル booths ====== */}
              {[
                { id: 1, x: 250, y: 360, name: 'No.1 席' },
                { id: 2, x: 750, y: 360, name: 'No.2 席' },
                { id: 3, x: 250, y: 560, name: 'No.3 席' },
                { id: 4, x: 750, y: 560, name: 'No.4 席' }
              ].map(tableItem => {
                const liveTable = tables.find(t => t.id === tableItem.id)!;
                
                // テーブルステータス別カラー
                const getTableHalo = (status: TableStatus) => {
                  switch (status) {
                    case 'empty': return 'border-emerald-500/30 bg-emerald-500/5 ring-4 ring-emerald-500/10';
                    case 'ordering': 
                    case 'waiting_order': return 'border-yellow-400/90 bg-yellow-500/10 ring-4 ring-yellow-400/40 animate-pulse';
                    case 'cooking': return 'border-orange-500/60 bg-orange-500/5';
                    case 'serving_ready': return 'border-sky-400 bg-sky-500/5 ring-4 ring-sky-400/30 animate-pulse';
                    case 'eating': return 'border-green-500 bg-green-500/5';
                    case 'dirty': return 'border-red-600 bg-red-600/10 ring-4 ring-red-600/40 animate-pulse';
                    case 'needs_wipe': return 'border-sky-300 bg-cyan-400/10 ring-2 ring-sky-300/40';
                    default: return 'border-stone-500 bg-stone-500/5';
                  }
                };

                return (
                  <div 
                    key={tableItem.id} 
                    className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
                    style={{ left: `${tableItem.x / 10}%`, top: `${tableItem.y / 7.5}%` }}
                  >
                    {/* 座席をテーブルの左右に物理レンダリング */}
                    {/* 左椅子 */}
                    <div className="absolute left-[-55px] top-[-15px] w-6 h-8 bg-[#391e0a] border-2 border-[#1f0e02] rounded-lg shadow flex items-center justify-center text-xs">
                      🪑
                    </div>
                    {/* 右椅子 */}
                    <div className="absolute right-[-55px] top-[-15px] w-6 h-8 bg-[#391e0a] border-2 border-[#1f0e02] rounded-lg shadow flex items-center justify-center text-xs">
                      🪑
                    </div>

                    {/* 客席テーブル木目プレート */}
                    <div className={`w-[85px] h-[85px] rounded-full border-4 flex flex-col justify-center items-center shadow-lg transition-all ${getTableHalo(liveTable.status)}`}
                      style={{
                        backgroundImage: 'radial-gradient(#ab7d58 50%, #523018 100%)',
                      }}
                    >
                      {/* 装飾の木目調リング */}
                      <div className="absolute inset-1 border border-[#ffd1a3]/10 rounded-full" />

                      <span className="text-[10px] font-black font-mono text-[#ffd1a3] tracking-widest">{tableItem.name}</span>

                      {/* 真ん中お仕事バッジ */}
                      <div className="mt-1 text-center scale-110">
                        {liveTable.status === 'empty' && <span className="text-xs text-green-300 font-bold block bg-[#241305]/60 pr-1 pl-1 rounded border border-green-900/40">空席</span>}
                        {liveTable.status === 'ordering' && <span className="text-base text-yellow-400 animate-bounce">📜</span>}
                        {liveTable.status === 'waiting_order' && <span className="text-xl animate-bounce">❓</span>}
                        {liveTable.status === 'cooking' && (
                          <div className="flex flex-col items-center">
                            <span className="text-sm">🔥</span>
                            <span className="text-[8px] text-orange-400 font-bold leading-none mt-0.5">調理中</span>
                          </div>
                        )}
                        {liveTable.status === 'eating' && (
                          <div className="flex flex-col items-center">
                            <span className="text-base">{liveTable.currentOrder?.icon}</span>
                            <span className="text-[8px] text-green-400 font-bold mt-0.5">もぐもぐ</span>
                          </div>
                        )}
                        {liveTable.status === 'dirty' && (
                          <div className="flex flex-col items-center">
                            <span className="text-base">🍽️</span>
                            <span className="text-[8px] text-red-400 font-black bg-stone-900 px-1 py-0.5 rounded leading-none">片付け待ち</span>
                          </div>
                        )}
                        {liveTable.status === 'needs_wipe' && (
                          <div className="flex flex-col items-center">
                            <span className="text-base">🫧</span>
                            <span className="text-[8px] text-sky-300 font-bold leading-none mt-0.5">拭き掃除待ち</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ====== C. ご案内待ちロビーエリア (Entrance Bottom Left) ====== */}
              <div 
                className="absolute bg-[#351f11]/60 border-2 border-[#1c0d02] rounded-xl flex flex-col justify-between p-1.5 shadow-md"
                style={{ left: '2%', top: '68%', width: '15%', height: '22%' }}
              >
                <div className="text-[10px] text-amber-200 font-bold tracking-wider text-center border-b border-[#2d1500]/30 select-none">
                  🚪 入口ご案内
                </div>
                <div className="text-center my-auto">
                  <span className="text-xl">🤵💼</span>
                  <div className="text-[9px] text-[#ffd1a3] mt-1 font-bold">案内待ち: {customers.filter(c => c.status === 'waiting_lobby').length} 組</div>
                </div>
                <div className="text-[8px] text-center text-amber-400 font-extrabold bg-[#1c0d02] rounded py-0.5">
                  すれ違いでご案内！
                </div>
              </div>

              {/* ====== D. ピザレディ風・店舗アップグレード円サークル (Bottom Middle) ====== */}
              {[
                { id: 'speed', name: '⚡ 作業LvUP', cost: upgrades.playerSpeed === 1 ? 800 : upgrades.playerSpeed === 2 ? 1500 : 99999, x: 280, y: 470, emoji: '⚡' },
                { id: 'chef', name: '👨‍🍳 自動配膳', cost: upgrades.hasKitchenStaff ? 99999 : 1200, x: 420, y: 470, emoji: '🤖' },
                { id: 'clean', name: '🧹 自動クリーン', cost: upgrades.hasCleanStaff ? 99999 : 1800, x: 560, y: 470, emoji: '🤖' },
                { id: 'cashier', name: '🛎️ 全自動レジ', cost: upgrades.hasCashierStaff ? 99999 : 2400, x: 700, y: 470, emoji: '🤖' },
              ].map(pad => {
                if (pad.cost > 50000) return null; // 最大レベル時はサークルを表示しない
                const activeOnThis = buyingProgress?.id === pad.id;
                
                return (
                  <div
                    key={pad.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${pad.x / 10}%`, top: `${pad.y / 7.5}%` }}
                  >
                    <div className={`w-[75px] h-[75px] rounded-full border-4 flex flex-col justify-center items-center shadow-md transition-all ${
                        activeOnThis
                          ? 'border-green-400 bg-green-500/25 scale-105 ring-4 ring-green-400/50'
                          : 'border-emerald-500/70 bg-emerald-900/10 hover:bg-emerald-900/20'
                      }`}
                    >
                      {/* プログレス充填バー */}
                      {activeOnThis && (
                        <div 
                          className="absolute bottom-0 left-0 h-1.5 bg-[#00ff66] transition-all duration-[50ms]"
                          style={{ width: `${buyingProgress.progress}%` }}
                        />
                      )}

                      <span className="text-xs font-black text-white leading-none tracking-tight">{pad.name}</span>
                      <span className="text-[10px] text-green-300 font-extrabold font-mono mt-1 leading-none">¥{pad.cost.toLocaleString()}</span>
                      <div className="absolute -top-3.5 bg-green-950 border border-green-500 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm">
                        {pad.emoji}
                      </div>

                    </div>
                  </div>
                );
              })}

              {/* ====== E. レジ待ち顧客行列グリッドライン ====== */}
              {/* X:820, Y: 180, 220, 260 で並んで待っている */}

              {/* ====== F. ゲームお客様キャラクタ描画 🚶‍♀️🚶‍♂️ ====== */}
              {customers.map(cust => {
                // 移動状況を視覚化（お散歩スウェー。歩いているときに傾く）
                const wiggle = cust.status !== 'sitting' && isPlaying ? 'animate-bounce' : '';
                return (
                  <div
                    id={`customer-char-${cust.id}`}
                    key={cust.id}
                    className="absolute -translate-x-1/2 -translate-y-1/4 z-20 pointer-events-none transition-all duration-[60ms] ease-out"
                    style={{ left: `${cust.x / 10}%`, top: `${cust.y / 7.5}%` }}
                  >
                    <div className={`flex flex-col items-center ${wiggle}`}>
                      
                      {/* 1. イライラ限界メーターバルーン */}
                      {(cust.status === 'waiting_lobby' || cust.status === 'waiting_order' || cust.status === 'waiting_food' || cust.status === 'waiting_checkout') && (
                        <div className="w-10 bg-[#1c0d02] border border-[#ff6600]/40 rounded-full h-1.5 overflow-hidden mb-1 shadow">
                          <div 
                            className={`h-full ${
                              cust.patience > 55 ? 'bg-green-500' : cust.patience > 25 ? 'bg-orange-500 animate-pulse' : 'bg-red-500'
                            }`}
                            style={{ width: `${cust.patience}%` }}
                          />
                        </div>
                      )}

                      {/* 2. ビジュアルアバターサークル */}
                      <div className="w-11 h-11 rounded-full border-2 border-stone-900 bg-[#7c4dff] flex items-center justify-center text-xl shadow-lg relative transform-gpu hover:scale-105 active:scale-95 transition-all">
                        {cust.gender === 'family' ? '👨‍👩‍👦' : cust.gender === 'male' ? '👨‍💼' : '👩‍💼'}

                        {/* 人数インジケータ */}
                        <div className="absolute -bottom-1 -right-1 bg-amber-950 text-white font-black text-[8px] rounded-full px-1 py-0.5 border border-[#cda250] shadow-sm">
                          {cust.size}名様
                        </div>
                        
                        {/* 食べている時の吹き出し */}
                        {cust.status === 'eating' && (
                          <div className="absolute -top-3.5 -left-1 bg-stone-950 text-[10px] rounded-full p-0.5 shadow border border-yellow-500">🍽️</div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}

              {/* ====== G. プレイヤキャラクター(🧑‍🍳) 描画 ====== */}
              <div
                id="player-character-mesh"
                className="absolute -translate-x-1/2 -translate-y-[60%] z-30 pointer-events-none"
                style={{ left: `${playerPos.x / 10}%`, top: `${playerPos.y / 7.5}%` }}
              >
                <div className="flex flex-col items-center relative gap-0.5">
                  
                  {/* ====== ピザレディ風：積んであるお皿・料理を頭上に物理スタッキングスタック！ ====== */}
                  {playerStack.length > 0 && (
                    <div className="flex flex-col-reverse items-center mb-1 space-y-reverse space-y-[-12px]">
                      {playerStack.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ scale: 0, y: -20 }}
                          animate={{ scale: 1, y: 0 }}
                          className="w-8 h-8 rounded-full bg-white/95 border border-[#2d1500] shadow flex items-center justify-center text-sm transform-gpu"
                          style={{
                            zIndex: idx + 40,
                            boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                          }}
                        >
                          {item.icon}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* ダスターワイプ清掃ツール */}
                  {playerHasCloth && playerStack.length === 0 && (
                    <div className="absolute -top-6 bg-sky-400 border border-white text-white rounded-full text-[9px] font-black px-1 py-0.5 shadow animate-bounce">
                      🧹 CLEANING
                    </div>
                  )}

                  {/* プレイヤアバター本体 */}
                  <div className={`w-12 h-12 rounded-full border-4 border-[#2b1704] bg-gradient-to-b from-amber-200 to-yellow-500 flex items-center justify-center text-3xl shadow-2xl relative select-none ${isMoving ? 'animate-bounce' : ''}`}
                    style={{
                      transform: `rotate(${playerAngle > 90 || playerAngle < -90 ? '0deg' : '0deg'}) scaleX(${playerAngle > 90 || playerAngle < -90 ? -1 : 1})`,
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                    }}
                  >
                    🤵
                    <span className="absolute -top-3.5 text-base select-none">🧑‍🍳</span>

                    {/* 容量カウンターバBadge */}
                    <div className="absolute -bottom-1 text-[8px] bg-amber-950 font-black text-[#f5bf58] rounded-md px-1 py-0.5 border border-[#ffd1a3]/40">
                      トレイ: {playerStack.length}/{maxStackCapacity}
                    </div>
                  </div>

                  {/* プレイヤ影 */}
                  <div className="w-8 h-2.5 bg-black/45 rounded-full blur-[2px] mt-1.5" />
                  
                </div>
              </div>

              {/* ====== H. 自動雇用NPCスタッフ（🤖）描画 ====== */}
              
              {/* 1. 厨房アシスタントシェフ */}
              {upgrades.hasKitchenStaff && (
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-center"
                  style={{ left: `${chefStaffPos.x / 10}%`, top: `${chefStaffPos.y / 7.5}%` }}
                >
                  <div className="w-9 h-9 rounded-full bg-orange-950/90 border-2 border-orange-500 flex items-center justify-center text-lg shadow-md relative">
                    👩‍🍳
                    <div className="absolute -top-2 bg-[#ffa100] text-[7px] text-white font-extrabold px-1 rounded-full leading-none">AUTO</div>
                  </div>
                  <div className="text-[7px] font-bold text-orange-200">配膳ボット</div>
                </div>
              )}

              {/* 2. お掃除クリーンスタッフ */}
              {upgrades.hasCleanStaff && (
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-center"
                  style={{ left: `${cleanStaffPos.x / 10}%`, top: `${cleanStaffPos.y / 7.5}%` }}
                >
                  <div className="w-9 h-9 rounded-full bg-sky-950/90 border-2 border-sky-400 flex items-center justify-center text-lg shadow-md relative animate-bounce">
                    🧹
                    <div className="absolute -top-2 bg-[#00b0ff] text-[7px] text-white font-extrabold px-1 rounded-full leading-none">AUTO</div>
                  </div>
                  <div className="text-[7px] font-bold text-sky-200 font-serif">お掃除ボット</div>
                </div>
              )}

              {/* 3. キャッシャースタッフ (レジ裏待機) */}
              {upgrades.hasCashierStaff && (
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-center"
                  style={{ left: '82%', top: '9.3%' }} // 固定
                >
                  <div className="w-9 h-9 rounded-full bg-yellow-950/90 border-2 border-yellow-400 flex items-center justify-center text-lg shadow-md relative">
                    🛎️
                    <div className="absolute -top-2 bg-[#ffea00] text-black text-[7px] font-extrabold px-1 rounded-full leading-none">CLERK</div>
                  </div>
                  <div className="text-[8px] font-bold text-yellow-300">自動会計主任</div>
                </div>
              )}

              {/* ====== I. マウスクリック目的地インジケータ (ゴーストマーカー) ====== */}
              {targetPosRef.current && (
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 animate-ping"
                  style={{ left: `${targetPosRef.current.x / 10}%`, top: `${targetPosRef.current.y / 7.5}%` }}
                >
                  <div className="w-5 h-5 rounded-full border-4 border-yellow-400 bg-yellow-400/20" />
                </div>
              )}

            </div>
          </div> {/* アスペクトラッパーの閉じタグ */}
        </div> {/* lg:col-span-9 の閉じタグ */}

      </div> {/* グリッドコンテナの閉じタグ */}

      </main>
      
      {/* レジお会計モーダル (お釣り入力ダイアログ 画面中央ポップアップ化) */}
      <AnimatePresence>
        {activeRegisterId !== null && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-[#3e2723] rounded-3xl p-1 shadow-2xl relative border-4 border-[#120701]"
            >
              {/* 閉じるボタン */}
              <button
                onClick={() => {
                  playClick();
                  setActiveRegisterId(null);
                }}
                className="absolute top-2.5 right-2.5 text-stone-405 hover:text-white bg-black/45 hover:bg-stone-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm border border-stone-800 cursor-pointer z-50 transition-colors"
                title="閉じる"
              >
                ✕
              </button>
              
              <RegisterArea
                queue={registerQueue}
                onCheckoutComplete={handleCheckoutComplete}
                onCloseRegister={() => setActiveRegisterId(null)}
                activeQueueId={activeRegisterId}
                setActiveQueueId={setActiveRegisterId}
                onIncorrectChange={(queueId, penalty) => {
                  setRegisterQueue(prev => prev.map(q => q.id === queueId ? { ...q, patience: Math.max(0, q.patience - penalty) } : q));
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 木製の両開き目隠し扉 兼 メニューボード */}
      <AnimatePresence>
        {!isMenuOpen && (
          <WoodenMenu
            isOpen={isMenuOpen}
            onOpenToggle={() => setIsMenuOpen(true)}
            title={gameScenario === 'start' ? 'びっくりウッド' : 'お仕事結果発表'}
            gameStatus={gameScenario}
            score={
              gameScenario !== 'start' 
                ? {
                    money: score.money,
                    servedCount: score.servedCount,
                    cleanCount: score.cleanCount,
                    day: score.day
                  } 
                : undefined
            }
            onStartGame={() => {
              if (gameScenario === 'victory') {
                startNewGame(score.day + 1);
              } else {
                startNewGame(1);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* フッター */}
      <footer className="relative z-10 bg-[#120701] border-t-2 border-[#2b1704] py-2 text-center text-xs text-[#a87f43]/60 font-mono select-none">
        © 2026 びっくりウッドレストラン. すべて日本語で営業中 🧑‍🍳
      </footer>

    </div>
  );
}
