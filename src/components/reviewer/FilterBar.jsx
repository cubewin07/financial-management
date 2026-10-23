import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { FOCUS } from './styles';

export default function FilterBar({
  state = {},
  onChange,
  categories = [],
  needsReviewCount = 0,
}) {
  const {
    filterType = 'all', // 'all' | 'needs-review' | 'has-comments'
    categoryFilter = 'all',
    searchQuery = '',
  } = state;

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleFilterTypeClick = (type) => {
    onChange({ ...state, filterType: type });
  };

  const handleCategoryClick = (cat) => {
    const nextCat = categoryFilter === cat ? 'all' : cat;
    onChange({ ...state, categoryFilter: nextCat });
  };

  const handleSearchChange = (query) => {
    onChange({ ...state, searchQuery: query });
  };

  const clearSearch = () => {
    onChange({ ...state, searchQuery: '' });
    setMobileSearchOpen(false);
  };

  return (
    <div className="sticky top-[calc(var(--topbar-h,64px)+48px)] z-10 py-2.5 bg-[#0e0a14]/90 backdrop-blur-xl border-b border-white/[0.04]">
      {/* Mobile expanded search */}
      {mobileSearchOpen ? (
        <div className="flex items-center gap-2 px-1">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              autoFocus
              placeholder="Search items, categories..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`w-full h-10 pl-9 pr-8 rounded-full bg-white/[0.08] border border-white/10 text-xs text-white placeholder-slate-400 ${FOCUS}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={clearSearch}
            className={`h-10 px-3 text-xs font-semibold text-slate-300 hover:text-white ${FOCUS}`}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          {/* Left search toggle button for mobile */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Open search"
            className={`lg:hidden flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-white shrink-0 ${FOCUS}`}
          >
            <Search size={15} />
          </button>

          {/* Horizontal chip scroller */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 snap-x scrollbar-none flex-1 -mx-1 px-1">
            {/* Status filters */}
            <button
              type="button"
              role="button"
              aria-pressed={filterType === 'all'}
              onClick={() => handleFilterTypeClick('all')}
              className={`snap-start h-9 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${FOCUS} ${
                filterType === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/70 shadow-[0_0_12px_rgba(0,238,252,0.2)]'
                  : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-white/[0.05]'
              }`}
            >
              All
            </button>

            <button
              type="button"
              role="button"
              aria-pressed={filterType === 'needs-review'}
              onClick={() => handleFilterTypeClick('needs-review')}
              className={`snap-start h-9 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${FOCUS} ${
                filterType === 'needs-review'
                  ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/70 shadow-[0_0_12px_rgba(0,238,252,0.2)]'
                  : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-white/[0.05]'
              }`}
            >
              <span>Needs review</span>
              {needsReviewCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300">
                  {needsReviewCount}
                </span>
              )}
            </button>

            <button
              type="button"
              role="button"
              aria-pressed={filterType === 'has-comments'}
              onClick={() => handleFilterTypeClick('has-comments')}
              className={`snap-start h-9 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${FOCUS} ${
                filterType === 'has-comments'
                  ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/70 shadow-[0_0_12px_rgba(0,238,252,0.2)]'
                  : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-white/[0.05]'
              }`}
            >
              Has comments
            </button>

            {/* Separator if categories exist */}
            {categories.length > 0 && (
              <span className="w-px h-5 bg-white/10 shrink-0 mx-1" aria-hidden="true" />
            )}

            {/* Category chips */}
            {categories.map((cat) => {
              const isSelected = categoryFilter === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  role="button"
                  aria-pressed={isSelected}
                  onClick={() => handleCategoryClick(cat)}
                  className={`snap-start h-9 px-3 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${FOCUS} ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/70'
                      : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/[0.04]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Desktop persistent search input */}
          <div className="hidden lg:block relative w-[220px] shrink-0">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`w-full h-9 pl-8 pr-7 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white placeholder-slate-400 ${FOCUS}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
