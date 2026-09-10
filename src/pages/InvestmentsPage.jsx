import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  PieChart,
  Plus,
  Trash2,
  Wallet,
  Coins,
  Building,
  Landmark,
  X,
} from 'lucide-react';
import { formatCurrency } from '../utils/finance';

const DEFAULT_ASSETS = [
  { id: '1', name: 'Emergency Cash Fund', category: 'Cash', value: 12500, isLiquid: true, icon: 'Wallet' },
  { id: '2', name: 'Global Index ETF (US/World)', category: 'Equities', value: 34000, isLiquid: true, icon: 'TrendingUp' },
  { id: '3', name: 'KiwiSaver / Retirement', category: 'Retirement', value: 48500, isLiquid: false, icon: 'Landmark' },
  { id: '4', name: 'Crypto (BTC / ETH)', category: 'Crypto', value: 6800, isLiquid: true, icon: 'Coins' },
  { id: '5', name: 'Property Equity / Real Estate', category: 'Property', value: 120000, isLiquid: false, icon: 'Building' },
];

const CATEGORY_COLORS = {
  Cash: '#00eefc',
  Equities: '#d0bcff',
  Retirement: '#f15999',
  Crypto: '#ffb0ca',
  Property: '#9f78ff',
  Other: '#d3fbff',
};

export default function InvestmentsPage({ defaultCurrency = 'NZD' }) {
  const [assets, setAssets] = useState(() => {
    try {
      const saved = localStorage.getItem('financial_mgt_portfolio_assets');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return DEFAULT_ASSETS;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cash',
    value: '',
    isLiquid: true,
  });

  useEffect(() => {
    try {
      localStorage.setItem('financial_mgt_portfolio_assets', JSON.stringify(assets));
    } catch (e) {
      // ignore
    }
  }, [assets]);

  const totalNetWorth = useMemo(() => {
    return assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  }, [assets]);

  const liquidTotal = useMemo(() => {
    return assets.filter((a) => a.isLiquid).reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  }, [assets]);

  const illiquidTotal = totalNetWorth - liquidTotal;
  const liquidPercent = totalNetWorth > 0 ? Math.round((liquidTotal / totalNetWorth) * 100) : 0;

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const map = {};
    for (const a of assets) {
      const cat = a.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(a.value || 0);
    }
    return Object.entries(map)
      .map(([name, total]) => ({
        name,
        total,
        percent: totalNetWorth > 0 ? Math.round((total / totalNetWorth) * 100) : 0,
        color: CATEGORY_COLORS[name] || '#d0bcff',
      }))
      .sort((a, b) => b.total - a.total);
  }, [assets, totalNetWorth]);

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setFormData({ name: '', category: 'Cash', value: '', isLiquid: true });
    setModalOpen(true);
  };

  const handleOpenEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      category: asset.category,
      value: String(asset.value),
      isLiquid: asset.isLiquid,
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || isNaN(Number(formData.value))) return;

    if (editingAsset) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === editingAsset.id
            ? {
                ...a,
                name: formData.name.trim(),
                category: formData.category,
                value: Number(formData.value),
                isLiquid: formData.isLiquid,
              }
            : a
        )
      );
    } else {
      const newAsset = {
        id: `asset-${Date.now()}`,
        name: formData.name.trim(),
        category: formData.category,
        value: Number(formData.value),
        isLiquid: formData.isLiquid,
      };
      setAssets((prev) => [newAsset, ...prev]);
    }
    setModalOpen(false);
  };

  const getAssetIcon = (category) => {
    switch (category) {
      case 'Cash':
        return <Wallet size={16} className="text-cyan-400" />;
      case 'Equities':
        return <TrendingUp size={16} className="text-purple-400" />;
      case 'Retirement':
        return <Landmark size={16} className="text-pink-400" />;
      case 'Crypto':
        return <Coins size={16} className="text-amber-400" />;
      case 'Property':
        return <Building size={16} className="text-indigo-400" />;
      default:
        return <PieChart size={16} className="text-teal-400" />;
    }
  };

  return (
    <main className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md text-[var(--primary)] uppercase tracking-wider mb-1 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
            Net Worth & Portfolio
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">Investments & Assets</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Monitor total net worth, liquid reserves, and long-term asset allocation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn-primary py-2.5 px-5 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.35)] shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {/* Top Stat Cards: Net Worth, Liquid Reserves, Illiquid Capital */}
      <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-3">
        {/* Net Worth Hero */}
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--primary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-slate-400">Total Net Worth</p>
            <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-100">
              {formatCurrency(totalNetWorth, defaultCurrency)}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Across {assets.length} tracked asset classes</p>
          </div>
        </div>

        {/* Liquid Reserves */}
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent">
          <div className="absolute bottom-0 right-0 w-36 h-36 bg-cyan-500 opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-slate-400">Liquid Capital</p>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-cyan-300">
              {formatCurrency(liquidTotal, defaultCurrency)}
            </p>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,238,252,0.5)]"
                style={{ width: `${liquidPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">{liquidPercent}% readily accessible</p>
          </div>
        </div>

        {/* Illiquid / Long-Term Capital */}
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent">
          <div className="absolute top-0 right-0 w-36 h-36 bg-pink-500 opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-slate-400">Locked / Long-Term</p>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-300 border border-pink-500/20">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-pink-300">
              {formatCurrency(illiquidTotal, defaultCurrency)}
            </p>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-pink-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                style={{ width: `${100 - liquidPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">{100 - liquidPercent}% property & superannuation</p>
          </div>
        </div>
      </div>

      {/* Asset Allocation Spectrum Bar */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <PieChart size={16} className="text-purple-400" /> Asset Allocation Breakdown
          </h3>
          <span className="text-xs text-slate-400 font-semibold">{categoryTotals.length} categories</span>
        </div>

        {/* Multi-segment colorful allocation bar */}
        <div className="h-3.5 rounded-full bg-white/10 overflow-hidden flex shadow-inner">
          {categoryTotals.map((cat) => (
            <div
              key={cat.name}
              style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
              title={`${cat.name}: ${cat.percent}% (${formatCurrency(cat.total, defaultCurrency)})`}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all hover:opacity-85"
            />
          ))}
        </div>

        {/* Category Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2">
          {categoryTotals.map((cat) => (
            <div key={cat.name} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{cat.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{cat.percent}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tracked Assets Table / List */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Asset Holdings</h3>
          <span className="text-xs text-slate-400">Click asset to edit balance</span>
        </div>

        <div className="space-y-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => handleOpenEdit(asset)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.05] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                  {getAssetIcon(asset.category)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-100 truncate">{asset.name}</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        asset.isLiquid
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                          : 'bg-slate-800 text-slate-400 border-white/10'
                      }`}
                    >
                      {asset.isLiquid ? 'Liquid' : 'Illiquid'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{asset.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-base sm:text-lg font-mono font-extrabold text-white">
                  {formatCurrency(asset.value, defaultCurrency)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(asset.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove asset"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Asset Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-white/15 p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">
                  {editingAsset ? 'Edit Asset Holding' : 'Add New Asset Holding'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. S&P 500 ETF, Emergency Savings"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-400"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Equities">Equities / ETFs</option>
                      <option value="Retirement">Retirement / Super</option>
                      <option value="Crypto">Crypto</option>
                      <option value="Property">Property / Equity</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Current Value ({defaultCurrency})</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isLiquidCheckbox"
                    checked={formData.isLiquid}
                    onChange={(e) => setFormData({ ...formData, isLiquid: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-800 border-white/15 text-purple-600 focus:ring-purple-400"
                  />
                  <label htmlFor="isLiquidCheckbox" className="text-xs text-slate-300 cursor-pointer">
                    Liquid Asset (can be quickly converted to cash)
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-5 py-2 rounded-xl text-xs font-bold"
                  >
                    {editingAsset ? 'Save Changes' : 'Add Asset'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
