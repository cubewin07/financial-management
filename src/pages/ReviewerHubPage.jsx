import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Users,
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  PieChart,
  Send,
  Shield,
  ShieldCheck,
  UserPlus,
  Trash2,
  Target,
  Flame,
  Search,
  Sparkles,
  CreditCard,
  Clock,
  ArrowUpRight,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import useCandidateReport from '../hooks/useCandidateReport';
import useComments from '../hooks/useComments';
import CommentDrawer from '../components/CommentDrawer';
import { formatCurrency, PERIOD_OPTIONS, getCategoryColor } from '../utils/finance';
import { CustomSelect, CustomTextarea, CustomInput } from '../components/ui/forms';
import { useConfirm } from '../context/ConfirmationContext';
import LoadingState from '../components/shell/LoadingState';
import ErrorState from '../components/shell/ErrorState';

export default function ReviewerHubPage({
  revieweeCandidates = [],
  myReviewers = [],
  onAddReviewer,
  onRemoveReviewer,
  accessLoading = false,
}) {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const confirm = useConfirm();

  // Active candidate resolved from route param
  const activeCandidate = useMemo(() => {
    if (!candidateId) return null;
    return revieweeCandidates.find((c) => c.owner_user_id === candidateId) || null;
  }, [candidateId, revieweeCandidates]);

  // Main Hub Tabs: 'reviewees' (Budgets I Review) | 'my-reviewers' (My Reviewers)
  const [hubTab, setHubTab] = useState('reviewees');

  // Candidate Report state
  const [period, setPeriod] = useState('current-month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithComments, setOnlyWithComments] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [monthNoteDraft, setMonthNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccessMessage, setNoteSuccessMessage] = useState('');

  // Reviewer Invitation State (for My Reviewers tab)
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [isAddingReviewer, setIsAddingReviewer] = useState(false);
  const [reviewerError, setReviewerError] = useState('');
  const [reviewerSuccess, setReviewerSuccess] = useState('');

  // Handle Add Reviewer
  const handleAddReviewerSubmit = async (e) => {
    e.preventDefault();
    if (!reviewerEmail.trim() || !onAddReviewer) return;

    setIsAddingReviewer(true);
    setReviewerError('');
    setReviewerSuccess('');

    const res = await onAddReviewer(reviewerEmail.trim());
    if (res?.success) {
      setReviewerSuccess(res.message || 'Reviewer added successfully!');
      setReviewerEmail('');
      setTimeout(() => setReviewerSuccess(''), 4000);
    } else {
      setReviewerError(res?.message || 'Failed to add reviewer.');
    }
    setIsAddingReviewer(false);
  };

  // Handle Revoke Reviewer Access
  const handleRemoveReviewerClick = async (memberUserId, email) => {
    const isConfirmed = await confirm({
      title: 'Revoke Reviewer Access',
      message: `Are you sure you want to remove ${email} as a reviewer? They will no longer be able to view your financial reports.`,
      description: 'You can re-invite them at any time.',
      confirmText: 'Revoke Access',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (isConfirmed && onRemoveReviewer) {
      await onRemoveReviewer(memberUserId);
    }
  };

  // Report data hook for the active candidate
  const {
    loading: reportLoading,
    error: reportError,
    refresh: refreshReport,
    defaultCurrency,
    monthlyBudget,
    periodExpenses,
    summary,
    burnRate,
    categoryData,
  } = useCandidateReport({
    candidateOwnerId: activeCandidate?.owner_user_id,
    period,
  });

  // Comments hook for active candidate
  const {
    getExpenseComments,
    addCommentToExpense,
    getMonthComments,
    saveReviewerMonthComment,
  } = useComments({ userId: activeCandidate?.owner_user_id });

  const currentMonthKey = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const currentMonthFormatted = useMemo(() => format(new Date(), 'MMMM yyyy'), []);
  const candidateMonthNotes = useMemo(() => {
    return getMonthComments(currentMonthKey);
  }, [getMonthComments, currentMonthKey]);

  // Filtered expenses by category, search query, and comments toggle
  const filteredExpenses = useMemo(() => {
    let result = periodExpenses || [];
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          (e.item && e.item.toLowerCase().includes(q)) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.payment_method && e.payment_method.toLowerCase().includes(q))
      );
    }
    if (onlyWithComments) {
      result = result.filter((e) => getExpenseComments(e.id).length > 0);
    }
    return result;
  }, [periodExpenses, categoryFilter, searchQuery, onlyWithComments, getExpenseComments]);

  // Unique categories in this period
  const uniqueCategories = useMemo(() => {
    const set = new Set((periodExpenses || []).map((e) => e.category).filter(Boolean));
    return Array.from(set);
  }, [periodExpenses]);

  // Helper for period option label
  const periodLabel = useMemo(() => {
    const opt = PERIOD_OPTIONS.find((o) => o.value === period);
    return opt ? opt.label : 'Period';
  }, [period]);

  // Category breakdown with percentages for the continuous allocation bar
  const categorySpectrum = useMemo(() => {
    if (!categoryData || categoryData.length === 0 || summary.totalSpent <= 0) return [];
    return categoryData
      .map((cat) => {
        const name = cat.name || cat.category || 'Other';
        const total = Number(cat.value ?? cat.total ?? 0);
        const percent = Math.max(1, Math.round((total / summary.totalSpent) * 100));
        return {
          name,
          total,
          percent,
          color: getCategoryColor(name),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [categoryData, summary.totalSpent]);

  // Purposeful pace calculation
  const pacingAnalysis = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
    const monthElapsedPercent = Math.min(100, Math.round((currentDay / daysInMonth) * 100));
    const budgetSpentPercent =
      monthlyBudget > 0 ? Math.min(100, Math.round((summary.totalSpent / monthlyBudget) * 100)) : null;

    const dailyAvg = burnRate.dailyRate || (currentDay > 0 ? summary.totalSpent / currentDay : 0);
    const projectedEndSpend = dailyAvg * daysInMonth;
    const remaining = (monthlyBudget || 0) - summary.totalSpent;
    const safeDailyAllowance = monthlyBudget > 0 ? Math.max(0, remaining / daysRemaining) : 0;
    const isPacingOver = monthlyBudget > 0 && (projectedEndSpend > monthlyBudget || remaining < 0);

    return {
      daysInMonth,
      currentDay,
      daysRemaining,
      monthElapsedPercent,
      budgetSpentPercent,
      dailyAvg,
      projectedEndSpend,
      remaining,
      safeDailyAllowance,
      isPacingOver,
    };
  }, [monthlyBudget, summary.totalSpent, burnRate.dailyRate]);

  // Handle saving monthly review note
  const handleSaveMonthNote = async (e) => {
    e.preventDefault();
    if (!monthNoteDraft.trim() || !activeCandidate) return;

    setSavingNote(true);
    setNoteSuccessMessage('');
    try {
      await saveReviewerMonthComment(currentMonthKey, monthNoteDraft.trim(), 'reviewer');
      setMonthNoteDraft('');
      setNoteSuccessMessage('Monthly reviewer advice posted!');
      setTimeout(() => setNoteSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  // Quick advice prompt insertion
  const applyQuickPrompt = (text) => {
    setMonthNoteDraft((prev) => (prev ? `${prev} ${text}` : text));
  };

  // If navigating directly to a candidate report but access permissions are still resolving
  if (candidateId && accessLoading) {
    return <LoadingState message="Verifying reviewer permissions and loading report..." />;
  }

  // If candidate was specified in route but not found among authorized candidates
  if (candidateId && !activeCandidate) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1b1526]/90 via-[#161120]/95 to-[#110d19]/95 backdrop-blur-2xl p-8 sm:p-12 text-center shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03]">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <AlertCircle size={30} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Candidate Budget Not Found</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
            This budget is either no longer shared with you or reviewer permissions have expired.
          </p>
          <button
            type="button"
            onClick={() => navigate('/review-hub')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[#251e33] hover:bg-[#322845] text-slate-200 border border-white/[0.05] text-xs sm:text-sm transition-all cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Reviewer Hub
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 1: Candidate Directory & Reviewers Manager (when no candidateId)
  // -------------------------------------------------------------
  if (!activeCandidate) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Executive Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1b1526]/90 via-[#161120]/95 to-[#110d19]/95 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/[0.08] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-cyan-500/[0.06] rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 text-cyan-300 ring-1 ring-purple-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldCheck size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Reviewer Hub
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>RLS Protected</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
                  Review and advise on budgets shared with you by family members and mentees, while keeping personal banking balances strictly private.
                </p>
              </div>
            </div>

            {/* Segmented Sub-Tab Switcher (Borderless Pill) */}
            <div className="relative flex items-center p-1.5 rounded-2xl bg-[#0f0c16]/90 shadow-inner self-start md:self-auto border border-white/[0.02]">
              <button
                type="button"
                onClick={() => setHubTab('reviewees')}
                className="relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors duration-150"
              >
                {hubTab === 'reviewees' && (
                  <motion.div
                    layoutId="activeHubTabIndicator"
                    className="absolute inset-0 bg-[#251e33] rounded-xl shadow-md border border-purple-500/20"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 500, damping: 38 }
                    }
                  />
                )}
                <span
                  className={`relative z-10 flex items-center gap-2 font-medium transition-colors duration-200 ${
                    hubTab === 'reviewees' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users size={15} />
                  <span>Budgets I Review</span>
                  {revieweeCandidates.length > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        hubTab === 'reviewees'
                          ? 'bg-cyan-400 text-slate-950 shadow-sm'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {revieweeCandidates.length}
                    </span>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHubTab('my-reviewers')}
                className="relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors duration-150"
              >
                {hubTab === 'my-reviewers' && (
                  <motion.div
                    layoutId="activeHubTabIndicator"
                    className="absolute inset-0 bg-[#251e33] rounded-xl shadow-md border border-purple-500/20"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 500, damping: 38 }
                    }
                  />
                )}
                <span
                  className={`relative z-10 flex items-center gap-2 font-medium transition-colors duration-200 ${
                    hubTab === 'my-reviewers' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield size={15} />
                  <span>My Reviewers</span>
                  {myReviewers.length > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        hubTab === 'my-reviewers'
                          ? 'bg-cyan-400 text-slate-950 shadow-sm'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {myReviewers.length}
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Budgets I Review (Candidate Cards) */}
        {hubTab === 'reviewees' && (
          <div className="space-y-4">
            {accessLoading ? (
              <LoadingState message="Connecting to authorized candidate budgets..." />
            ) : revieweeCandidates.length === 0 ? (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1b1526]/90 via-[#161120]/95 to-[#110d19]/95 backdrop-blur-2xl p-10 sm:p-14 text-center shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03]">
                <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/20 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Users size={30} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No Budgets to Review Yet</h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  You haven&apos;t been designated as a reviewer by any budget owners yet. When a family member or mentee invites your registered email address, their financial breakdown will appear here.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setHubTab('my-reviewers')}
                    className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    Manage My Reviewers Instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs sm:text-sm uppercase font-extrabold tracking-widest text-slate-400">
                    Active Candidates Available ({revieweeCandidates.length})
                  </h2>
                  <span className="text-[11px] text-slate-500 font-medium">Click to inspect financial report</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {revieweeCandidates.map((cand) => {
                    const initial = (cand.owner_email || 'U').charAt(0).toUpperCase();
                    const addedDate = cand.created_at
                      ? format(new Date(cand.created_at), 'MMM d, yyyy')
                      : 'Active';

                    return (
                      <motion.div
                        key={cand.owner_user_id}
                        whileHover={reduceMotion ? undefined : { y: -2 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                        onClick={() => navigate(`/review-hub/${cand.owner_user_id}`)}
                        className="group cursor-pointer relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c1728]/95 via-[#181323]/95 to-[#120e1c]/95 backdrop-blur-2xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_50px_rgba(168,85,247,0.15)] transition-all duration-200 border border-white/[0.03] flex flex-col justify-between"
                      >
                        <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/[0.05] group-hover:bg-purple-500/[0.1] rounded-full blur-2xl transition-all pointer-events-none" />

                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-500/25 to-cyan-500/20 text-cyan-300 ring-1 ring-purple-500/30 flex items-center justify-center font-black text-lg shadow-inner shrink-0">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="text-base font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                  {cand.owner_email}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Authorized Advisor</span>
                                  </span>
                                  <span className="text-slate-600 text-xs">•</span>
                                  <span className="text-[11px] text-slate-400">{addedDate}</span>
                                </div>
                              </div>
                            </div>

                            <div className="w-9 h-9 rounded-2xl bg-[#0f0c16]/80 group-hover:bg-cyan-400 text-slate-400 group-hover:text-slate-950 flex items-center justify-center transition-all duration-150 shrink-0 shadow-sm">
                              <ChevronRight size={18} />
                            </div>
                          </div>

                          {/* Telemetry Permission Badges */}
                          <div className="flex flex-wrap items-center gap-2 mt-4 pt-1">
                            <span className="px-2.5 py-1 rounded-xl bg-white/[0.03] text-[11px] font-medium text-slate-300">
                              📊 Outflow Breakdown
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-white/[0.03] text-[11px] font-medium text-slate-300">
                              💬 Advisor Notes
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-white/[0.03] text-[11px] font-medium text-slate-300">
                              🔒 Bank Assets Hidden
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Shield size={12} /> Confidential Financial Audit
                          </span>
                          <span className="font-bold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                            Open Report <ArrowUpRight size={13} />
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Reviewers */}
        {hubTab === 'my-reviewers' && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1b1526]/90 via-[#161120]/95 to-[#110d19]/95 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03] space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Invite & Manage Your Reviewers</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
                  Grant trusted mentors or family members read-only access to your budget breakdown and advice notes. Your private bank accounts and investments remain strictly hidden.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#251e33] text-purple-300 border border-purple-500/20 self-start sm:self-auto shrink-0">
                {myReviewers.length} Active Reviewer{myReviewers.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Add Reviewer Form */}
            <form onSubmit={handleAddReviewerSubmit} className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-300">
                Invite a Registered User by Email
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <CustomInput
                    type="email"
                    placeholder="e.g. mentor@example.com"
                    value={reviewerEmail}
                    onChange={(e) => {
                      setReviewerEmail(e.target.value);
                      if (reviewerError) setReviewerError('');
                    }}
                    className="w-full text-xs sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAddingReviewer || !reviewerEmail.trim()}
                  className="py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <UserPlus size={16} />
                  <span>{isAddingReviewer ? 'Adding...' : 'Grant Access'}</span>
                </button>
              </div>

              {/* Feedback messages */}
              <AnimatePresence>
                {reviewerError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2"
                  >
                    <AlertCircle size={16} className="shrink-0 text-rose-400" />
                    <span>{reviewerError}</span>
                  </motion.div>
                )}
                {reviewerSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                    <span>{reviewerSuccess}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Current Reviewers List */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Current Authorized Reviewers
              </h3>

              {myReviewers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#100d17]/60 text-center text-xs text-slate-400 border border-white/[0.02]">
                  No reviewers added yet. Only you can view your financial reports.
                </div>
              ) : (
                <div className="space-y-2">
                  {myReviewers.map((rev) => {
                    const email = rev.member_email || 'Authorized Reviewer';
                    const initial = email.charAt(0).toUpperCase();
                    return (
                      <div
                        key={rev.member_user_id}
                        className="p-4 rounded-2xl bg-[#100d17]/60 hover:bg-[#1a1426]/70 flex items-center justify-between gap-3 transition-colors border border-white/[0.02]"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                              {email}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Role: Reviewer (Read-Only Reports + Comments)</span>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveReviewerClick(rev.member_user_id, email)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Revoke access"
                        >
                          <Trash2 size={15} />
                          <span className="hidden sm:inline">Revoke</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: Candidate Financial Performance Report View
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Executive Hero Context Header */}
      <div className="relative z-20 rounded-3xl bg-gradient-to-b from-[#1b1526]/90 via-[#161120]/95 to-[#110d19]/95 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03]">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/[0.07] rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/review-hub')}
              className="p-2.5 rounded-2xl bg-[#0f0c16]/80 text-slate-200 hover:bg-[#251e33] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm shrink-0 border border-white/[0.03]"
              aria-label="Back to all candidates"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                  {activeCandidate.owner_email}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck size={12} /> Advisor Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Financial health report & reviewer feedback studio
              </p>
            </div>
          </div>

          {/* Period Selector Controls */}
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <span className="text-xs text-slate-400 hidden sm:inline font-medium">Reporting Window:</span>
            <div className="w-full md:w-44">
              <CustomSelect
                options={PERIOD_OPTIONS}
                value={period}
                onChange={(val) => setPeriod(val)}
                className="w-full text-xs sm:text-sm py-1.5"
              />
            </div>
          </div>
        </div>
      </div>

      {reportLoading ? (
        <LoadingState message="Aggregating financial metrics for this period..." />
      ) : reportError ? (
        <ErrorState title="Report Error" message={reportError} onRetry={refreshReport} />
      ) : (
        <div className="space-y-6">
          {/* Executive Pace & Verdict Assessment Banner */}
          {monthlyBudget > 0 ? (
            <div
              className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl transition-all border border-white/[0.03] ${
                pacingAnalysis.isPacingOver
                  ? 'bg-gradient-to-r from-rose-950/40 via-[#181323]/95 to-[#120e1c]/95'
                  : 'bg-gradient-to-r from-emerald-950/40 via-[#181323]/95 to-[#120e1c]/95'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                      pacingAnalysis.isPacingOver
                        ? 'bg-rose-500/15 text-rose-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {pacingAnalysis.isPacingOver ? <Flame size={22} /> : <ShieldCheck size={22} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold uppercase tracking-widest ${
                          pacingAnalysis.isPacingOver ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {pacingAnalysis.isPacingOver ? 'Discretionary Alert' : 'Safe Spending Pace'}
                      </span>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-xs text-slate-400">
                        {pacingAnalysis.daysRemaining} days remaining in month
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white mt-0.5">
                      {pacingAnalysis.isPacingOver
                        ? `Projected spend exceeds budget by ${formatCurrency(
                            Math.abs(pacingAnalysis.projectedEndSpend - monthlyBudget),
                            defaultCurrency
                          )}`
                        : `Pacing ${formatCurrency(
                            Math.max(0, monthlyBudget - pacingAnalysis.projectedEndSpend),
                            defaultCurrency
                          )} under target ceiling`}
                    </p>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      At current velocity ({formatCurrency(pacingAnalysis.dailyAvg, defaultCurrency)}/day), safe daily allowance is{' '}
                      <strong className={pacingAnalysis.isPacingOver ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold'}>
                        {formatCurrency(pacingAnalysis.safeDailyAllowance, defaultCurrency)}/day
                      </strong>{' '}
                      for the rest of the cycle.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold shadow-sm ${
                      pacingAnalysis.isPacingOver
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {pacingAnalysis.budgetSpentPercent}% Consumed
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#14101d]/80 text-xs text-slate-400 flex items-center gap-2 border border-white/[0.03]">
              <AlertCircle size={16} className="text-purple-400 shrink-0" />
              <span>
                Candidate has not declared a fixed monthly budget cap. Displaying raw verified outflow metrics.
              </span>
            </div>
          )}

          {/* Top High-Level Health & Pace 4 Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Monthly Budget Target */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c1728]/95 via-[#181323]/95 to-[#120e1c]/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03] flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/[0.06] blur-2xl rounded-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-extrabold tracking-widest text-slate-400">
                  Monthly Budget
                </span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-300">
                  <Target size={16} />
                </div>
              </div>
              <div className="my-3">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
                  {monthlyBudget > 0 ? formatCurrency(monthlyBudget, defaultCurrency) : 'Not Declared'}
                </p>
                {pacingAnalysis.budgetSpentPercent !== null && (
                  <div className="w-full bg-[#100d17] rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pacingAnalysis.isPacingOver ? 'bg-rose-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, pacingAnalysis.budgetSpentPercent)}%` }}
                    />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {pacingAnalysis.budgetSpentPercent !== null
                  ? `${pacingAnalysis.budgetSpentPercent}% target consumed`
                  : 'Declared monthly cap'}
              </p>
            </div>

            {/* Metric 2: Total Spent in Period */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c1728]/95 via-[#181323]/95 to-[#120e1c]/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03] flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/[0.06] blur-2xl rounded-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-extrabold tracking-widest text-slate-400">
                  Total Spent ({periodLabel})
                </span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-300">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="my-3">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-cyan-300 tabular-nums">
                  {formatCurrency(summary.totalSpent, defaultCurrency)}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Across {periodExpenses.length} verified transaction{periodExpenses.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Metric 3: Remaining Balance */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c1728]/95 via-[#181323]/95 to-[#120e1c]/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03] flex flex-col justify-between">
              <div
                className={`absolute top-0 right-0 w-28 h-28 blur-2xl rounded-full pointer-events-none ${
                  summary.remaining >= 0 ? 'bg-emerald-500/[0.06]' : 'bg-rose-500/[0.06]'
                }`}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-extrabold tracking-widest text-slate-400">
                  Remaining Buffer
                </span>
                <div
                  className={`p-2 rounded-xl ${
                    summary.remaining >= 0
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="my-3">
                <p
                  className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
                    summary.remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(summary.remaining, defaultCurrency)}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {summary.remaining >= 0 ? 'Within budget allocation' : 'Pacing over declared budget'}
              </p>
            </div>

            {/* Metric 4: Daily Burn Rate */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c1728]/95 via-[#181323]/95 to-[#120e1c]/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03] flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/[0.06] blur-2xl rounded-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-extrabold tracking-widest text-slate-400">
                  Daily Burn Rate
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Flame size={16} />
                </div>
              </div>
              <div className="my-3">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
                  {formatCurrency(burnRate.dailyRate, defaultCurrency)}
                  <span className="text-xs font-normal text-slate-400"> / day</span>
                </p>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {burnRate.projectedSpend > 0
                  ? `Projected: ${formatCurrency(burnRate.projectedSpend, defaultCurrency)}`
                  : 'Velocity calculation'}
              </p>
            </div>
          </div>

          {/* Category Spending Breakdown Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1b1526]/90 via-[#161120]/95 to-[#110d19]/95 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <PieChart size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Category Spending Distribution</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Aggregated outflow proportion by category</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#14101d] text-slate-300">
                {categorySpectrum.length} Categories
              </span>
            </div>

            {categorySpectrum.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-400 py-8 text-center">
                No spending data recorded for this selection.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Continuous Multi-Segment Allocation Bar (Apple Card style) */}
                <div className="h-3 rounded-full bg-[#100d17] p-0.5 overflow-hidden flex shadow-inner gap-0.5">
                  {categorySpectrum.map((cat) => (
                    <div
                      key={cat.name}
                      style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
                      title={`${cat.name}: ${cat.percent}% (${formatCurrency(cat.total, defaultCurrency)})`}
                      className="h-full rounded-full transition-all hover:opacity-85"
                    />
                  ))}
                </div>

                {/* Category Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {categorySpectrum.map((cat) => (
                    <div
                      key={cat.name}
                      className="rounded-2xl bg-[#100d17]/60 p-4 space-y-2 hover:bg-[#1a1426]/70 transition-colors border border-white/[0.02]"
                    >
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-bold text-slate-200">{cat.name}</span>
                        </div>
                        <span className="font-extrabold text-white tabular-nums">
                          {formatCurrency(cat.total, defaultCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Share of spend</span>
                        <span className="font-semibold text-slate-300">{cat.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Monthly Reviewer Advice & Collaboration Studio */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1b1526]/90 via-[#161120]/95 to-[#110d19]/95 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Advisor Guidance ({currentMonthFormatted})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Leave tailored financial guidance for {activeCandidate.owner_email}. This note displays on their home dashboard.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-300 self-start sm:self-auto">
                Live Channel
              </span>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                Quick Insert:
              </span>
              <button
                type="button"
                onClick={() => applyQuickPrompt("You're pacing well within your budget this month. Keep it up!")}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#14101d] hover:bg-emerald-500/15 hover:text-emerald-300 text-slate-300 transition-all cursor-pointer border border-white/[0.04] hover:border-emerald-500/30 group"
              >
                <CheckCircle2 size={13} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Pacing Well</span>
              </button>
              <button
                type="button"
                onClick={() => applyQuickPrompt("Spending in Dining Out is running higher than usual. Consider cooking at home this week.")}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#14101d] hover:bg-amber-500/15 hover:text-amber-300 text-slate-300 transition-all cursor-pointer border border-white/[0.04] hover:border-amber-500/30 group"
              >
                <AlertTriangle size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
                <span>High Discretionary</span>
              </button>
              <button
                type="button"
                onClick={() => applyQuickPrompt("Great job putting capital into savings goals this cycle!")}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#14101d] hover:bg-purple-500/15 hover:text-purple-300 text-slate-300 transition-all cursor-pointer border border-white/[0.04] hover:border-purple-500/30 group"
              >
                <Target size={13} className="text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Goal Progress</span>
              </button>
            </div>

            {/* Previous Advice & Notes stream */}
            {candidateMonthNotes.length > 0 && (
              <div className="space-y-3 pt-1">
                {candidateMonthNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-2xl text-xs sm:text-sm ${
                      note.author_role === 'reviewer'
                        ? 'bg-purple-950/20 text-slate-200 border border-purple-500/20'
                        : 'bg-[#100d17]/60 text-slate-300 border border-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-cyan-300">
                        {note.author_role === 'reviewer' ? 'Advisor Note (You)' : 'Candidate Response'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {note.created_at ? format(new Date(note.created_at), 'MMM d, h:mm a') : ''}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{note.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Compose new note */}
            <form onSubmit={handleSaveMonthNote} className="space-y-4 pt-2">
              <CustomTextarea
                value={monthNoteDraft}
                onChange={(e) => setMonthNoteDraft(e.target.value)}
                placeholder="e.g. You're pacing 15% over budget in Dining Out this month. Consider cooking more next week to stay on track!"
                rows={3}
                className="w-full text-xs sm:text-sm"
              />
              <div className="flex items-center justify-between pt-2">
                {noteSuccessMessage ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 size={16} /> {noteSuccessMessage}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Your notes are pinned to this candidate&apos;s monthly financial ledger.
                  </span>
                )}
                <button
                  type="submit"
                  disabled={savingNote || !monthNoteDraft.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.35)] disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Send size={15} /> Post Advice
                </button>
              </div>
            </form>
          </div>

          {/* Expense Transaction Review List */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1b1526]/90 via-[#161120]/95 to-[#110d19]/95 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/[0.03] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Transaction Audit ({filteredExpenses.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect expenses and click any line item to leave feedback comments.
                </p>
              </div>

              {/* Search & Category Filter Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search expenses..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#100d17] border border-white/[0.04] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {uniqueCategories.length > 0 && (
                  <div className="w-full sm:w-36">
                    <CustomSelect
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full text-xs py-1"
                    >
                      <option value="all">All Categories</option>
                      {uniqueCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setOnlyWithComments((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    onlyWithComments
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-[#14101d] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageCircle size={13} />
                  <span>Has Comments</span>
                </button>
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-slate-400 bg-[#100d17]/40 rounded-2xl border border-white/[0.02]">
                No transactions matched your current filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredExpenses.map((exp) => {
                  const commentsForExp = getExpenseComments(exp.id);
                  const commentCount = commentsForExp.length;
                  const catColor = getCategoryColor(exp.category);

                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExpense(exp)}
                      className="py-3 px-3.5 sm:px-4 rounded-2xl bg-[#100d17]/50 hover:bg-[#1a1426]/70 cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 group border border-white/[0.02]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: `${catColor}15`, color: catColor }}
                        >
                          <CreditCard size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                              {exp.item || exp.note || 'Expense'}
                            </p>
                            {commentCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300">
                                <MessageCircle size={11} /> {commentCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="font-medium text-slate-300">{exp.category}</span>
                            <span className="text-slate-600">•</span>
                            <span>{exp.date}</span>
                            {exp.payment_method && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span>{exp.payment_method}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs sm:text-sm font-black text-white tabular-nums">
                          {formatCurrency(exp.amount, defaultCurrency)}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-[#14101d] flex items-center justify-center text-slate-400 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-colors shadow-sm">
                          <MessageCircle size={14} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Comment Drawer */}
      <CommentDrawer
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        comments={selectedExpense ? getExpenseComments(selectedExpense.id) : []}
        onSubmitComment={(body) => {
          if (selectedExpense) {
            addCommentToExpense(selectedExpense.id, body, 'reviewer');
          }
        }}
        role="reviewer"
      />
    </div>
  );
}
