import { useState, useEffect, useMemo, useRef } from 'react';
import useModalDialog from '../hooks/useModalDialog';
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
import { useConfirm } from '../context/ConfirmationContext';
import { CustomInput, CustomNumberInput, CustomSelect, CustomCheckbox } from '../components/ui/forms';
import EmptyState from '../components/shell/EmptyState';

// Old sample rows may still be saved on this device. Any row the user edited is kept.
const OLD_SAMPLE_ASSETS = {
  1: { name: 'Emergency Cash Fund', value: 12500 },
  2: { name: 'Global Index ETF (US/World)', value: 34000 },
  3: { name: 'KiwiSaver / Retirement', value: 48500 },
  4: { name: 'Crypto (BTC / ETH)', value: 6800 },
  5: { name: 'Property Equity / Real Estate', value: 120000 },
};

const LEGACY_PORTFOLIO_KEY = 'financial_mgt_portfolio_assets';

function getPortfolioStorageKey(userId) {
  return userId ? `${LEGACY_PORTFOLIO_KEY}:${userId}` : LEGACY_PORTFOLIO_KEY;
}

function sanitizeSavedAssets(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((asset) => {
      if (!asset || typeof asset !== 'object') return false;
      const sample = OLD_SAMPLE_ASSETS[asset.id];
      return !(sample && sample.name === asset.name && sample.value === asset.value);
    })
    .map((asset, idx) => ({
      id: asset.id ?? `migrated-${idx}`,
      name: String(asset.name ?? '').trim() || 'Untitled Asset',
      category: String(asset.category || 'Other'),
      value: Math.max(0, Number(asset.value) || 0),
      isLiquid: Boolean(asset.isLiquid),
    }));
}

function loadSavedAssets(userId) {
  const scopedKey = getPortfolioStorageKey(userId);
  try {
    const rawScoped = localStorage.getItem(scopedKey);
    if (rawScoped !== null) {
      return sanitizeSavedAssets(JSON.parse(rawScoped));
    }
    if (userId) {
      const rawLegacy = localStorage.getItem(LEGACY_PORTFOLIO_KEY);
      if (rawLegacy !== null) {
        return sanitizeSavedAssets(JSON.parse(rawLegacy));
      }
    }
    return [];
  } catch {
    return [];
  }
}

const CATEGORY_COLORS = {
  Cash: '#00eefc',
  Equities: '#d0bcff',
  Retirement: '#f15999',
  Crypto: '#ffb0ca',
  Property: '#9f78ff',
  Other: '#d3fbff',
};

const roundMoney = (val) => Math.round((Number(val) || 0) * 100) / 100;

export default function InvestmentsPage({ defaultCurrency = 'NZD', userId = null }) {
  const confirm = useConfirm();
  const resolvedCurrency = defaultCurrency || 'NZD';
  const storageKey = getPortfolioStorageKey(userId);
  const loadedKeyRef = useRef(storageKey);
  const [assets, setAssets] = useState(() => loadSavedAssets(userId));

  useEffect(() => {
    loadedKeyRef.current = storageKey;
    setAssets(loadSavedAssets(userId));
  }, [storageKey, userId]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cash',
    value: '',
    isLiquid: true,
  });

  useEffect(() => {
    if (loadedKeyRef.current !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(assets));
    } catch {
      // ignore
    }
  }, [assets, storageKey]);

  const dialogRef = useModalDialog(modalOpen, () => setModalOpen(false));

  const totalNetWorth = useMemo(() => {
    return roundMoney(assets.reduce((sum, a) => sum + Math.max(0, Number(a.value) || 0), 0));
  }, [assets]);

  const liquidTotal = useMemo(() => {
    return roundMoney(assets.filter((a) => a.isLiquid).reduce((sum, a) => sum + Math.max(0, Number(a.value) || 0), 0));
  }, [assets]);

  const illiquidTotal = roundMoney(Math.max(0, totalNetWorth - liquidTotal));
  const liquidPercent = totalNetWorth > 0 ? Math.round((liquidTotal / totalNetWorth) * 100) : 0;
  const illiquidPercent = totalNetWorth > 0 ? 100 - liquidPercent : 0;

  // Category breakdown (keep exact rawPercent for stacked bar widths summing to 100%)
  const categoryTotals = useMemo(() => {
    const map = {};
    for (const a of assets) {
      const cat = a.category || 'Other';
      map[cat] = roundMoney((map[cat] || 0) + Math.max(0, Number(a.value) || 0));
    }
    return Object.entries(map)
      .map(([name, total]) => {
        const rawPercent = totalNetWorth > 0 ? (total / totalNetWorth) * 100 : 0;
        const displayPercent =
          rawPercent > 0 && rawPercent < 1 ? '<1' : String(Math.round(rawPercent));
        return {
          name,
          total,
          rawPercent,
          displayPercent,
          color: CATEGORY_COLORS[name] || '#d0bcff',
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [assets, totalNetWorth]);

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setFormError('');
    setFormData({ name: '', category: 'Cash', value: '', isLiquid: true });
    setModalOpen(true);
  };

  const handleOpenEdit = (asset) => {
    setEditingAsset(asset);
    setFormError('');
    setFormData({
      name: asset.name,
      category: asset.category,
      value: String(asset.value),
      isLiquid: asset.isLiquid,
    });
    setModalOpen(true);
  };

  const handleDelete = async (asset) => {
    const isConfirmed = await confirm({
      title: 'Remove Asset',
      message: `Are you sure you want to remove "${asset.name}" (${formatCurrency(asset.value, resolvedCurrency)})?`,
      description: 'This asset will be removed from your portfolio allocation.',
      confirmText: 'Remove Asset',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (isConfirmed) {
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError('Please enter an asset name.');
      return;
    }

    const parsedValue = Number(formData.value);
    if (formData.value === '' || !Number.isFinite(parsedValue) || parsedValue < 0) {
      setFormError('Please enter a valid asset value of 0 or greater.');
      return;
    }

    const cleanValue = roundMoney(parsedValue);
    setFormError('');

    if (editingAsset) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === editingAsset.id
            ? {
                ...a,
                name: trimmedName,
                category: formData.category,
                value: cleanValue,
                isLiquid: formData.isLiquid,
              }
            : a
        )
      );
    } else {
      const newAsset = {
        id: `asset-${Date.now()}`,
        name: trimmedName,
        category: formData.category,
        value: cleanValue,
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
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md text-[var(--primary)] uppercase tracking-wider mb-1 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
            Net Worth & Portfolio
          </p>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-100">Investments & Assets</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Monitor total net worth, liquid reserves, and long-term asset allocation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn-primary w-full sm:w-auto justify-center min-h-[44px] py-2.5 px-5 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.35)] shrink-0 cursor-pointer"
        >
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {assets.length === 0 && (
        <div className="glass-card">
          <EmptyState
            title="No assets yet"
            description="Add what you own, like cash, shares or KiwiSaver, to see your total."
            action={
              <button type="button" onClick={handleOpenAdd} className="btn-primary min-h-[44px] py-2.5 px-5 text-sm font-bold cursor-pointer">
                Add First Asset
              </button>
            }
          />
        </div>
      )}

      {assets.length > 0 && <>
      {/* Top Stat Cards: Net Worth, Liquid Reserves, Illiquid Capital */}
      <div className="grid gap-2.5 sm:gap-5 grid-cols-2 sm:grid-cols-3">
        {/* Net Worth Hero */}
        <div className="col-span-2 sm:col-span-1 glass-card p-3.5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent min-w-0">
          <div className="hidden sm:block absolute top-0 right-0 w-36 h-36 bg-[var(--primary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-slate-400">Total Net Worth</p>
            <div className="p-1.5 sm:p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <p className="text-xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-100 break-words">
              {formatCurrency(totalNetWorth, resolvedCurrency)}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-medium">Across {assets.length} tracked {assets.length === 1 ? 'asset' : 'assets'}</p>
          </div>
        </div>

        {/* Liquid Reserves */}
        <div className="glass-card p-3.5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent min-w-0">
          <div className="hidden sm:block absolute bottom-0 right-0 w-36 h-36 bg-cyan-500 opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider sm:tracking-widest text-slate-400 truncate">Liquid</p>
            <div className="p-1.5 sm:p-2 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className="flex items-baseline justify-between gap-1.5 flex-wrap min-w-0">
              <p className="text-base min-[400px]:text-lg sm:text-3xl font-black tracking-tight tabular-nums text-cyan-300 break-words">
                {formatCurrency(liquidTotal, resolvedCurrency)}
              </p>
              <span className="text-[11px] sm:hidden text-cyan-400 font-bold shrink-0">{liquidPercent}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1 sm:h-1.5 mt-1.5 sm:mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,238,252,0.5)]"
                style={{ width: `${liquidPercent}%` }}
              />
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400 mt-1.5">{liquidPercent}% readily accessible</p>
          </div>
        </div>

        {/* Illiquid / Long-Term Capital */}
        <div className="glass-card p-3.5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent min-w-0">
          <div className="hidden sm:block absolute top-0 right-0 w-36 h-36 bg-pink-500 opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider sm:tracking-widest text-slate-400 truncate">Long-Term</p>
            <div className="p-1.5 sm:p-2 rounded-xl bg-pink-500/10 text-pink-300 border border-pink-500/20 shrink-0">
              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className="flex items-baseline justify-between gap-1.5 flex-wrap min-w-0">
              <p className="text-base min-[400px]:text-lg sm:text-3xl font-black tracking-tight tabular-nums text-pink-300 break-words">
                {formatCurrency(illiquidTotal, resolvedCurrency)}
              </p>
              <span className="text-[11px] sm:hidden text-pink-400 font-bold shrink-0">{illiquidPercent}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1 sm:h-1.5 mt-1.5 sm:mt-2 overflow-hidden">
              <div
                className="bg-pink-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                style={{ width: `${illiquidPercent}%` }}
              />
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400 mt-1.5">{illiquidPercent}% long-term</p>
          </div>
        </div>
      </div>

      {/* Asset Allocation Spectrum Bar */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <PieChart size={16} className="text-purple-400 shrink-0" /> Asset Allocation Breakdown
          </h3>
          <span className="text-xs text-slate-400 font-semibold shrink-0">
            {categoryTotals.length} {categoryTotals.length === 1 ? 'category' : 'categories'}
          </span>
        </div>

        {/* Multi-segment colorful allocation bar */}
        <div className="h-3.5 rounded-full bg-white/10 overflow-hidden flex shadow-inner">
          {totalNetWorth > 0 && categoryTotals.map((cat) => (
            <div
              key={cat.name}
              style={{ width: `${cat.rawPercent}%`, backgroundColor: cat.color }}
              title={`${cat.name}: ${cat.displayPercent}% (${formatCurrency(cat.total, resolvedCurrency)})`}
              className="h-full transition-all hover:opacity-85"
            />
          ))}
        </div>

        {/* Category Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 sm:pt-2">
          {categoryTotals.map((cat) => (
            <div key={cat.name} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{cat.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{cat.displayPercent}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tracked Assets Table / List */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-100">Asset Holdings</h3>
          <span className="text-xs text-slate-400">Tap asset to edit</span>
        </div>

        <div className="space-y-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between gap-1 sm:gap-2 p-2 sm:p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.05] transition-all group"
            >
              <button
                type="button"
                onClick={() => handleOpenEdit(asset)}
                aria-label={`Edit ${asset.name}`}
                className="flex-1 min-w-0 min-h-[44px] flex items-center justify-between gap-2.5 p-1.5 rounded-xl text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                    {getAssetIcon(asset.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate">{asset.name}</p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${
                          asset.isLiquid
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                            : 'bg-slate-800 text-slate-400 border-white/10'
                        }`}
                      >
                        {asset.isLiquid ? 'Liquid' : 'Illiquid'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{asset.category}</p>
                  </div>
                </div>

                <span className="text-sm sm:text-lg font-mono font-extrabold text-white tabular-nums shrink-0">
                  {formatCurrency(asset.value, resolvedCurrency)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDelete(asset)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 shrink-0 cursor-pointer"
                aria-label={`Remove ${asset.name}`}
                title="Remove asset"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      </>}

      {/* Add / Edit Asset Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="asset-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="outline-none relative w-full max-w-md rounded-3xl bg-slate-900 border border-white/15 p-5 sm:p-6 shadow-2xl z-10 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 id="asset-modal-title" className="text-lg font-bold text-white">
                  {editingAsset ? 'Edit Asset Holding' : 'Add New Asset Holding'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close modal"
                  className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} noValidate className="space-y-4">
                {formError && (
                  <p
                    role="alert"
                    className="text-xs font-medium text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl px-3.5 py-2.5"
                  >
                    {formError}
                  </p>
                )}

                <CustomInput
                  label="Asset Name"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formError) setFormError('');
                  }}
                  placeholder="e.g. S&P 500 ETF, Emergency Savings"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CustomSelect
                    label="Category"
                    options={[
                      { label: 'Cash', value: 'Cash' },
                      { label: 'Equities / ETFs', value: 'Equities' },
                      { label: 'Retirement / Super', value: 'Retirement' },
                      { label: 'Crypto', value: 'Crypto' },
                      { label: 'Property / Equity', value: 'Property' },
                      { label: 'Other', value: 'Other' },
                    ]}
                    value={formData.category}
                    onChange={(val) => setFormData({ ...formData, category: val })}
                  />

                  <CustomNumberInput
                    currency={resolvedCurrency}
                    label={`Current Value (${resolvedCurrency})`}
                    min={0}
                    step="0.01"
                    required
                    value={formData.value}
                    onChange={(e) => {
                      setFormData({ ...formData, value: e.target.value });
                      if (formError) setFormError('');
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div className="pt-1">
                  <CustomCheckbox
                    checked={formData.isLiquid}
                    onChange={(checked) => setFormData({ ...formData, isLiquid: checked })}
                    label="Liquid Asset (can be quickly converted to cash)"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial btn-primary min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
                  >
                    {editingAsset ? 'Save Changes' : 'Add Asset'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
