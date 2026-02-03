
import React, { useState, useEffect, useMemo } from 'react';
import { Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Bar, Area, ComposedChart } from 'recharts';
import { AppState, MarketCategory, Transaction, TradingMode, ExecutionType, TradingSource } from '../types.ts';
import { BinanceService } from '../services/binanceService.ts';

interface TerminalProps {
  state: AppState;
  currentPrice: number;
  onTrade?: (amount: number, type: 'BUY' | 'SELL') => void;
  onClosePosition?: (txId: string) => void;
  setActiveAsset: (cat: MarketCategory, id: string) => void;
  setTradingMode: (m: TradingMode) => void;
  setExecutionType: (e: ExecutionType) => void;
  setActiveBrain: (b: any) => void;
  onKillSwitch?: () => void;
  scanningAsset?: string | null;
  onUpdateLeverage: (lev: number) => void;
  selectedCurrency: any;
}

const BROKER_UI_CONFIG: Record<TradingSource, { color: string; accent: string; label: string; icon: string; border: string; glow: string }> = {
  binance: { color: 'yellow', accent: '#facc15', label: 'Binance', icon: 'fa-brands fa-bitcoin', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/10' },
  fbs: { color: 'blue', accent: '#3b82f6', label: 'FBS Broker', icon: 'fa-solid fa-chart-line', border: 'border-blue-500/30', glow: 'shadow-blue-500/10' },
  exness: { color: 'amber', accent: '#f59e0b', label: 'Exness', icon: 'fa-solid fa-crown', border: 'border-amber-500/30', glow: 'shadow-amber-500/10' },
  xm: { color: 'red', accent: '#ef4444', label: 'XM Global', icon: 'fa-solid fa-shield-halved', border: 'border-red-500/30', glow: 'shadow-red-500/10' },
  ic_markets: { color: 'emerald', accent: '#10b981', label: 'IC Markets', icon: 'fa-solid fa-bolt', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10' },
  hfm: { color: 'orange', accent: '#f97316', label: 'HFM', icon: 'fa-solid fa-fire', border: 'border-orange-500/30', glow: 'shadow-orange-500/10' },
  pepperstone: { color: 'rose', accent: '#f43f5e', label: 'Pepperstone', icon: 'fa-solid fa-pepper-hot', border: 'border-rose-500/30', glow: 'shadow-rose-500/10' },
  ig_group: { color: 'indigo', accent: '#6366f1', label: 'IG Group', icon: 'fa-solid fa-building-columns', border: 'border-indigo-500/30', glow: 'shadow-indigo-500/10' },
  plus500: { color: 'sky', accent: '#0ea5e9', label: 'Plus500', icon: 'fa-solid fa-plus', border: 'border-sky-500/30', glow: 'shadow-sky-500/10' },
  octafx: { color: 'teal', accent: '#14b8a6', label: 'OctaFX', icon: 'fa-solid fa-circle-nodes', border: 'border-teal-500/30', glow: 'shadow-teal-500/10' },
  ibkr: { color: 'violet', accent: '#8b5cf6', label: 'Interactive Brokers', icon: 'fa-solid fa-building', border: 'border-violet-500/30', glow: 'shadow-violet-500/10' }
};

const BINANCE_ASSETS = [
  { id: 'BTC', icon: 'fa-brands fa-bitcoin' },
  { id: 'ETH', icon: 'fa-brands fa-ethereum' },
  { id: 'SOL', icon: 'fa-solid fa-bolt-lightning' },
  { id: 'BNB', icon: 'fa-solid fa-coins' }
];

const FOREX_ASSETS = [
  { id: 'EUR', icon: 'fa-solid fa-euro-sign' },
  { id: 'GBP', icon: 'fa-solid fa-sterling-sign' },
  { id: 'JPY', icon: 'fa-solid fa-yen-sign' },
  { id: 'XAU', icon: 'fa-solid fa-gem' }
];

const NOMINAL_PRESETS = [10, 50, 100, 500, 1000, 5000];

const Terminal: React.FC<TerminalProps> = (props) => {
  const { 
    state, 
    currentPrice, 
    onTrade, 
    setActiveAsset, 
    setTradingMode, 
    setExecutionType, 
    onClosePosition, 
    onKillSwitch, 
    scanningAsset,
    onUpdateLeverage,
    selectedCurrency
  } = props;

  const { tradingMode, executionType, activeAssetId, transactions, activeSource, leverage } = state;
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [orderAmount, setOrderAmount] = useState(10);

  const brokerConfig = BROKER_UI_CONFIG[activeSource];
  const currentAssetList = activeSource === 'binance' ? BINANCE_ASSETS : FOREX_ASSETS;

  const activeAsset = useMemo(() => {
    return currentAssetList.find(a => a.id === activeAssetId) || currentAssetList[0];
  }, [activeAssetId, currentAssetList]);

  const activePositions = useMemo(() => transactions.filter(t => t.status === 'OPEN'), [transactions]);

  useEffect(() => {
    if (activeSource === 'binance') {
      const binance = new BinanceService('', '');
      const fetchData = async () => {
        const klines = await binance.getKlines(activeAssetId, '15m', 60);
        if (klines) setRealtimeData(klines.map(d => ({ ...d, volume: Math.random() * 1000 })));
      };
      fetchData();
      const inv = setInterval(fetchData, 4000);
      return () => clearInterval(inv);
    } else {
      const generateMockData = () => {
        const data = [];
        let base = currentPrice || (activeAssetId === 'XAU' ? 2300.50 : 1.0850);
        for (let i = 0; i < 60; i++) {
          base += (Math.random() - 0.5) * (activeAssetId === 'XAU' ? 1.5 : 0.001);
          data.push({ time: i, price: base, volume: Math.random() * 500 });
        }
        setRealtimeData(data);
      };
      generateMockData();
      const inv = setInterval(generateMockData, 10000);
      return () => clearInterval(inv);
    }
  }, [activeAssetId, activeSource, currentPrice]);

  const calculatePnL = (tx: Transaction) => {
    if (!currentPrice || tx.status !== 'OPEN') return 0;
    const diff = currentPrice - tx.price;
    return (tx.type === 'BUY' ? diff : -diff) / tx.price * tx.amount * tx.leverage;
  };

  const formatPrice = (price: number) => {
     if (activeSource === 'binance') {
         // Convert price to selected currency
         return `${selectedCurrency.symbol} ${(price * selectedCurrency.rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
     }
     // Forex usually keeps original pricing or converts. Let's convert for consistency as requested.
     return `${selectedCurrency.symbol} ${(price * selectedCurrency.rate).toFixed(4)}`;
  };

  const formatAmount = (amount: number) => {
      return `${selectedCurrency.symbol} ${(amount * selectedCurrency.rate).toLocaleString()}`;
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-24 max-w-full overflow-hidden">
      
      {/* Autopilot Status Bar */}
      {executionType === 'autopilot' && (
        <div className={`w-full bg-${brokerConfig.color}-600/10 border-${brokerConfig.color}-500/20 border rounded-2xl p-4 flex items-center justify-between animate-pulse shadow-2xl backdrop-blur-md`}>
           <div className="flex items-center gap-4">
              <i className={`fa-solid fa-radar text-${brokerConfig.color}-400 text-lg animate-spin`}></i>
              <div>
                 <p className={`text-[10px] font-black text-${brokerConfig.color}-400 uppercase tracking-widest`}>Neural Autopilot Aktif ({brokerConfig.label})</p>
                 <p className="text-xs text-white font-bold">{scanningAsset ? `Memindai Node Pasar: ${scanningAsset}/USD` : 'Aggregating Global Liquidity...'}</p>
              </div>
           </div>
           <div className="flex gap-2">
              <span className={`w-2 h-2 bg-${brokerConfig.color}-500 rounded-full animate-ping`}></span>
              <span className={`w-2 h-2 bg-${brokerConfig.color}-500 rounded-full animate-ping [animation-delay:0.2s]`}></span>
              <span className={`w-2 h-2 bg-${brokerConfig.color}-500 rounded-full animate-ping [animation-delay:0.4s]`}></span>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 min-w-0">
           
           {/* Dynamic Broker Chart Card */}
           <div className={`quantum-card h-[400px] md:h-[480px] rounded-[2.5rem] glass ${brokerConfig.border} ${brokerConfig.glow} p-6 flex flex-col relative overflow-hidden group/chart transition-all hover:scale-[1.005]`}>
              {executionType === 'autopilot' && <div className="absolute inset-0 pointer-events-none z-0"><div className="neural-scan"></div></div>}
              <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-slate-950 border border-${brokerConfig.color}-500/20 text-${brokerConfig.color}-400 flex items-center justify-center text-xl shadow-lg`}>
                       <i className={activeAsset.icon}></i>
                    </div>
                    <div>
                       <h2 className="text-lg font-orbitron font-black text-white">{activeAsset.id}/{selectedCurrency.code}</h2>
                       <p className={`text-2xl font-mono font-black text-${brokerConfig.color}-400 animate-pulse`}>
                          {formatPrice(currentPrice)}
                       </p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <div className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border ${tradingMode === 'real' ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' : `bg-${brokerConfig.color}-500/20 border-${brokerConfig.color}-500/30 text-${brokerConfig.color}-400`}`}>
                       {tradingMode === 'real' ? `LIVE ${brokerConfig.label.toUpperCase()}` : 'PAPER TRADING'}
                    </div>
                    <button onClick={onKillSwitch} className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase bg-rose-600/20 border border-rose-600/30 text-rose-500 hover:bg-rose-600 hover:text-white transition-all">
                       KILL SWITCH
                    </button>
                 </div>
              </div>

              <div className="flex-1 w-full bg-slate-950/30 rounded-2xl p-1 border border-white/5 overflow-hidden shadow-inner">
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={realtimeData}>
                       <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor={brokerConfig.accent} stopOpacity={0.3}/>
                             <stop offset="95%" stopColor={brokerConfig.accent} stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="1 5" vertical={false} stroke="rgba(255,255,255,0.05)" />
                       <XAxis dataKey="time" hide />
                       <YAxis domain={['auto', 'auto']} hide />
                       <Tooltip contentStyle={{ background: '#020617', border: `1px solid ${brokerConfig.accent}`, borderRadius: '12px', fontSize: '10px', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} />
                       <Bar dataKey="volume" fill="#ffffff" opacity={0.03} />
                       <Area type="monotone" dataKey="price" stroke={brokerConfig.accent} strokeWidth={3} fill="url(#chartGrad)" animationDuration={500} />
                    </ComposedChart>
                 </ResponsiveContainer>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto custom-scrollbar pb-2 relative z-10 shrink-0">
                 {currentAssetList.map(asset => (
                    <button key={asset.id} onClick={() => setActiveAsset(activeSource === 'binance' ? MarketCategory.crypto : MarketCategory.forex, asset.id)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${activeAssetId === asset.id ? `bg-${brokerConfig.color}-600 text-white border-${brokerConfig.color}-600 shadow-lg` : 'bg-slate-950 border-white/5 text-slate-500 hover:text-white'}`}>
                       {asset.id}
                    </button>
                 ))}
              </div>
           </div>

           {/* Position List */}
           <div className="quantum-card rounded-[2.5rem] glass border-white/5 p-6 bg-slate-950/40 min-h-[200px]">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Active Footprints ({brokerConfig.label})</h4>
                 <div className="text-[9px] font-bold text-slate-500 uppercase">{activePositions.length} Posisi Terbuka</div>
              </div>
              
              <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                       <tr className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                          <th className="px-4">Aset</th>
                          <th className="px-4">Sisi</th>
                          <th className="px-4">Entry</th>
                          <th className="px-4">Stake</th>
                          <th className="px-4 text-right">PnL ({selectedCurrency.code})</th>
                          <th className="px-4 text-right">Aksi</th>
                       </tr>
                    </thead>
                    <tbody className="font-mono text-[10px]">
                       {activePositions.length === 0 ? (
                          <tr>
                             <td colSpan={6} className="text-center py-10 text-slate-700 italic uppercase font-black tracking-widest">Menunggu sinyal neural dari node {activeSource}...</td>
                          </tr>
                       ) : (
                          activePositions.map(tx => {
                             const pnl = calculatePnL(tx);
                             return (
                                <tr key={tx.id} className="bg-slate-950/50 rounded-xl overflow-hidden group hover:bg-slate-900/50 transition-colors">
                                   <td className="px-4 py-4 font-black text-white rounded-l-xl">{tx.asset} <span className="text-[8px] text-slate-600 font-normal">x{tx.leverage}</span></td>
                                   <td className="px-4 py-4">
                                      <span className={`px-2 py-0.5 rounded-md ${tx.type === 'BUY' ? `bg-${brokerConfig.color}-500/20 text-${brokerConfig.color}-400` : 'bg-rose-500/20 text-rose-500'}`}>{tx.type}</span>
                                   </td>
                                   <td className="px-4 py-4 text-slate-400">{formatPrice(tx.price)}</td>
                                   <td className="px-4 py-4 text-slate-400">{formatAmount(tx.amount)}</td>
                                   <td className={`px-4 py-4 text-right font-black ${pnl >= 0 ? `text-${brokerConfig.color}-400` : 'text-rose-500'}`}>
                                      {pnl >= 0 ? '+' : ''}{formatAmount(pnl).replace(selectedCurrency.symbol + ' ', '')} {selectedCurrency.symbol}
                                   </td>
                                   <td className="px-4 py-4 text-right rounded-r-xl">
                                      <button onClick={() => onClosePosition?.(tx.id)} className="w-8 h-8 rounded-lg bg-rose-600/10 text-rose-500 border border-rose-600/20 hover:bg-rose-600 hover:text-white transition-all">
                                         <i className="fa-solid fa-xmark"></i>
                                      </button>
                                   </td>
                                </tr>
                             );
                          })
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* Execution Core with Leverage Option */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 min-w-0">
           <div className={`quantum-card rounded-[2.5rem] glass border-${brokerConfig.color}-500/30 p-8 shadow-2xl bg-slate-950/40 transition-all`}>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                 <i className="fa-solid fa-microchip animate-pulse"></i>
                 Execution Core: {brokerConfig.label}
              </h4>
              <div className="space-y-8">
                 {/* Stake Amount */}
                 <div>
                    <div className="flex justify-between items-center mb-3">
                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Stake Nominal (USDT)</label>
                       <input type="number" min="10" value={orderAmount} onChange={(e) => setOrderAmount(parseInt(e.target.value))} className={`bg-transparent border-b border-${brokerConfig.color}-500/50 text-${brokerConfig.color}-400 text-right font-mono font-black text-lg outline-none w-24`} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                       {NOMINAL_PRESETS.map(n => (
                          <button key={n} onClick={() => setOrderAmount(n)} className={`py-2 rounded-lg text-[8px] font-black border transition-all ${orderAmount === n ? `bg-${brokerConfig.color}-600 text-white border-${brokerConfig.color}-600 shadow-md` : 'bg-slate-950 border-white/5 text-slate-500 hover:border-white/20'}`}>${n}</button>
                       ))}
                    </div>
                 </div>

                 {/* Leverage Control - Added per Request */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural Leverage</label>
                       <span className={`text-xs font-mono font-black text-${brokerConfig.color}-400`}>x{leverage}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="500" 
                      step="1" 
                      value={leverage} 
                      onChange={(e) => onUpdateLeverage(parseInt(e.target.value))}
                      className={`w-full h-1.5 bg-slate-900 rounded-full cursor-pointer outline-none transition-all appearance-none`}
                      style={{ 
                        accentColor: brokerConfig.accent,
                        background: `linear-gradient(90deg, ${brokerConfig.accent} ${leverage/5}%, #0f172a ${leverage/5}%)`
                      }}
                    />
                    <div className="flex justify-between text-[7px] font-bold text-slate-700 uppercase">
                       <span>Safe Node (x1)</span>
                       <span>Aggressive (x500)</span>
                    </div>
                 </div>
                 
                 {/* Buy/Sell Actions */}
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => onTrade?.(orderAmount, 'BUY')} className={`py-5 bg-${brokerConfig.color}-600 text-${activeSource === 'binance' ? 'black' : 'white'} rounded-2xl font-orbitron font-black text-[10px] shadow-xl hover:brightness-110 active:scale-95 transition-all uppercase flex flex-col items-center justify-center gap-1`}>
                       <i className="fa-solid fa-arrow-trend-up"></i>
                       Long Node
                    </button>
                    <button onClick={() => onTrade?.(orderAmount, 'SELL')} className="py-5 bg-rose-600 text-white rounded-2xl font-orbitron font-black text-[10px] shadow-xl hover:brightness-110 active:scale-95 transition-all uppercase flex flex-col items-center justify-center gap-1">
                       <i className="fa-solid fa-arrow-trend-down"></i>
                       Short Node
                    </button>
                 </div>

                 {/* Mode Switchers */}
                 <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-600">
                       <span>Neural Intelligence Mode</span>
                       <span className={`text-${brokerConfig.color}-400 font-bold`}>{executionType.toUpperCase()}</span>
                    </div>
                    <div className="flex bg-slate-900/50 rounded-xl p-1.5 border border-white/5 shadow-inner">
                       <button onClick={() => setExecutionType('manual')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${executionType === 'manual' ? `bg-${brokerConfig.color}-600 text-white shadow-lg` : 'text-slate-600 hover:text-slate-400'}`}>Manual</button>
                       <button onClick={() => setExecutionType('autopilot')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${executionType === 'autopilot' ? `bg-${brokerConfig.color}-600 text-white shadow-lg` : 'text-slate-600 hover:text-slate-400'}`}>Autopilot</button>
                    </div>
                 </div>
              </div>
           </div>

           {/* Telemetry Visuals */}
           <div className={`quantum-card flex-1 rounded-[2.5rem] glass border-${brokerConfig.color}-500/10 p-6 flex flex-col shadow-2xl bg-slate-950/40`}>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-6 border-b border-white/5 pb-3">Node Telemetry</h4>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 max-h-[250px]">
                 {[
                   "Liquidity Sweep Engine", "FVG Detection Node", "SMC Bias Analysis", 
                   "Order Flow Imbalance", "Institutional Footprint", "Vol Delta Sensor"
                 ].map((ind, i) => (
                    <div key={i} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950 border border-white/5 text-[8px] font-black uppercase tracking-widest text-slate-500 group hover:border-emerald-500/30 transition-all hover:translate-x-1">
                       <span>{ind}</span>
                       <div className={`w-1.5 h-1.5 rounded-full bg-${brokerConfig.color}-500 animate-pulse group-hover:shadow-[0_0_8px_${brokerConfig.accent}]`}></div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
