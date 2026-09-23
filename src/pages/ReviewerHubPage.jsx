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
  ListFilter,
  Send,
  Shield,
  UserPlus,
  Trash2,
  Target,
  Flame,
  Search,
  Sparkles,
  CreditCard,
  Clock,
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
  const candidateMonthNotes = useMemo(() => {
    return getMonthComments(currentMonthKey);
  }, [getMonthComments, currentMonthKey]);

  // Filtered expenses by category & search query
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
    return result;
  }, [periodExpenses, categoryFilter, searchQuery]);

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

  // -------------------------------------------------------------
  // VIEW 1: Candidate Hub Selection List (when no candidateId)
  // -------------------------------------------------------------
  if (!activeCandidate) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Executive Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl border border-white/[0.05]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/[0.07] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-violet-500/[0.05] rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
                <Shield size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                    Reviewer Hub
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300">
                    <Sparkles size={11} /> Multi-Account Sharing
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
                  Seamlessly inspect shared budgets and leave tailored financial guidance, while keeping personal banking assets private.
                </p>
              </div>
            </div>

            {/* Segmented Sub-Tab Switcher */}
            <div className="relative flex items-center p-1 rounded-2xl bg-slate-950/90 shadow-inner self-start md:self-auto border border-white/[0.04]">
              <button
                type="button"
                onClick={() => setHubTab('reviewees')}
                className="relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors duration-150"
              >
                {hubTab === 'reviewees' && (
                  <motion.div
                    layoutId="activeHubTabPill"
                    className="absolute inset-0 bg-slate-800 rounded-xl shadow-md border border-white/[0.08]"
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
                          ? 'bg-cyan-400 text-slate-950'
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
                    layoutId="activeHubTabPill"
                    className="absolute inset-0 bg-slate-800 rounded-xl shadow-md border border-white/[0.08]"
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
                          ? 'bg-cyan-400 text-slate-950'
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
          <div>
            {accessLoading ? (
              <LoadingState message="Connecting to authorized candidate budgets..." />
            ) : revieweeCandidates.length === 0 ? (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-10 sm:p-14 text-center shadow-xl border border-white/[0.05]">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Users size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-100 mb-2">No Budgets to Review Yet</h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  You haven&apos;t been designated as a reviewer by any budget owners yet. When a family member or mentee invites your registered email, their financial breakdown will appear here.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setHubTab('my-reviewers')}
                    className="px-5 py-2.5 rounded-xl font-semibold bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
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
                        className="group cursor-pointer relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-5 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-200 border border-white/[0.05] hover:border-white/[0.12] flex flex-col justify-between"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/[0.04] group-hover:bg-cyan-500/[0.08] rounded-full blur-2xl transition-all pointer-events-none" />

                        <div className="relative z-10 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-cyan-300 flex items-center justify-center font-bold text-lg shadow-inner shrink-0 border border-white/[0.06]">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm sm:text-base font-bold text-slate-100 truncate group-hover:text-white transition-colors">
                                {cand.owner_email}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>Reviewer Access</span>
                                </span>
                                <span className="text-slate-600 text-xs">•</span>
                                <span className="text-[11px] text-slate-400">{addedDate}</span>
                              </div>
                            </div>
                          </div>

                          <div className="w-9 h-9 rounded-2xl bg-slate-800/80 group-hover:bg-white text-slate-400 group-hover:text-slate-900 flex items-center justify-center transition-all duration-150 shrink-0 shadow-sm">
                            <ChevronRight size={18} />
                          </div>
                        </div>

                        <div className="relative z-10 mt-5 pt-4 border-t border-white/[0.04] flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Shield size={13} className="text-slate-500" /> Read-Only Reports & Advice
                          </span>
                          <span className="font-semibold text-cyan-400 group-hover:text-cyan-300 group-hover:underline flex items-center gap-1">
                            Open Report →
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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl border border-white/[0.05] space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100">Invite & Manage Your Reviewers</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
                  Grant trusted mentors or family members read-only access to your budget breakdown and advice notes. Your private bank accounts and investments remain strictly hidden.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-800/90 text-slate-300 border border-white/[0.06] self-start sm:self-auto shrink-0">
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
                    placeholder="e.g. dad@example.com"
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
                  className="py-3 px-6 rounded-xl font-semibold bg-white hover:bg-slate-100 active:scale-[0.99] disabled:opacity-50 text-slate-900 shadow-sm transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <UserPlus size={16} />
                  <span>{isAddingReviewer ? 'Adding...' : 'Add Reviewer'}</span>
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
                <div className="p-6 rounded-2xl bg-slate-950/50 text-center text-xs text-slate-400 border border-white/[0.03]">
                  No reviewers added yet. Only you can view your financial reports.
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-950/60 overflow-hidden divide-y divide-white/[0.04] border border-white/[0.04]">
                  {myReviewers.map((rev) => {
                    const email = rev.member_email || 'Authorized Reviewer';
                    const initial = email.charAt(0).toUpperCase();
                    return (
                      <div
                        key={rev.member_user_id}
                        className="p-4 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
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
  const budgetUtilization =
    monthlyBudget > 0 ? Math.min(100, Math.round((summary.totalSpent / monthlyBudget) * 100)) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Executive Hero Context Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl border border-white/[0.05]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/review-hub')}
              className="p-2.5 rounded-2xl bg-slate-800/80 text-slate-200 hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm shrink-0 border border-white/[0.05]"
              aria-label="Back to all candidates"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-100 truncate">
                  {activeCandidate.owner_email}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400">
                  <Shield size={12} /> Advisor Mode (Read-Only)
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
            <CustomSelect
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full md:w-44 text-xs sm:text-sm py-1.5"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </CustomSelect>
          </div>
        </div>
      </div>

      {reportLoading ? (
        <LoadingState message="Aggregating financial metrics for this period..." />
      ) : reportError ? (
        <ErrorState title="Report Error" message={reportError} onRetry={refreshReport} />
      ) : (
        <div className="space-y-6">
          {/* Top High-Level Health & Pace Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Monthly Budget Target */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl border border-white/[0.05] flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/[0.08] blur-2xl rounded-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-extrabold tracking-widest text-slate-400">
                  Monthly Budget
                </span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                  <Target size={16} />
                </div>
              </div>
              <div className="my-3">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100 tabular-nums">
                  {monthlyBudget > 0 ? formatCurrency(monthlyBudget, defaultCurrency) : 'Not Set'}
                </p>
                {budgetUtilization !== null && (
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        budgetUtilization > 100 ? 'bg-rose-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, budgetUtilization)}%` }}
                    />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {budgetUtilization !== null ? `${budgetUtilization}% target consumed` : 'Declared monthly cap'}
              </p>
            </div>

            {/* Metric 2: Total Spent in Period */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl border border-white/[0.05] flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/[0.08] blur-2xl rounded-full pointer-events-none" />
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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl border border-white/[0.05] flex flex-col justify-between">
              <div
                className={`absolute top-0 right-0 w-28 h-28 blur-2xl rounded-full pointer-events-none ${
                  summary.remaining >= 0 ? 'bg-emerald-500/[0.08]' : 'bg-rose-500/[0.08]'
                }`}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-extrabold tracking-widest text-slate-400">
                  Remaining Balance
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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl border border-white/[0.05] flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/[0.08] blur-2xl rounded-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-extrabold tracking-widest text-slate-400">
                  Daily Burn Rate
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Flame size={16} />
                </div>
              </div>
              <div className="my-3">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100 tabular-nums">
                  {formatCurrency(burnRate.dailyRate, defaultCurrency)}
                  <span className="text-xs font-normal text-slate-400"> / day</span>
                </p>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {burnRate.projectedSpend > 0
                  ? `Projected: ${formatCurrency(burnRate.projectedSpend, defaultCurrency)}`
                  : 'Pace calculation'}
              </p>
            </div>
          </div>

          {/* Category Spending Breakdown Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl border border-white/[0.05] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <PieChart size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">Category Spending Distribution</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Aggregated outflow proportion by category</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-white/[0.05]">
                {categoryData.length} Categories
              </span>
            </div>

            {categoryData.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-400 py-8 text-center">
                No spending data recorded for this selection.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {categoryData.map((cat) => {
                  const catName = cat.name || cat.category || 'Category';
                  const catTotal = Number(cat.value ?? cat.total ?? 0);
                  const percent = summary.totalSpent > 0 ? (catTotal / summary.totalSpent) * 100 : 0;
                  const catColor = getCategoryColor(catName);

                  return (
                    <div
                      key={catName}
                      className="rounded-2xl bg-slate-950/50 p-4 space-y-2.5 hover:bg-slate-950/70 transition-colors border border-white/[0.03]"
                    >
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: catColor }}
                          />
                          <span className="font-bold text-slate-200">{catName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-100 tabular-nums">
                            {formatCurrency(catTotal, defaultCurrency)}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(3, percent))}%`,
                            backgroundColor: catColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly Reviewer Advice & Collaboration Studio */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl border border-white/[0.05] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    Monthly Advisor Advice ({currentMonthKey})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Leave tailored financial guidance for {activeCandidate.owner_email}. This displays on their home dashboard.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-300 self-start sm:self-auto">
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
                className="text-xs px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-white/[0.04]"
              >
                ✅ Pacing Well
              </button>
              <button
                type="button"
                onClick={() => applyQuickPrompt("Spending in Dining Out is running higher than usual. Consider cooking at home this week.")}
                className="text-xs px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-white/[0.04]"
              >
                ⚠️ High Discretionary
              </button>
              <button
                type="button"
                onClick={() => applyQuickPrompt("Great job putting capital into savings goals this cycle!")}
                className="text-xs px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-white/[0.04]"
              >
                🎯 Goal Progress
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
                        ? 'bg-cyan-950/20 border-l-2 border-cyan-400 text-slate-200'
                        : 'bg-slate-950/60 text-slate-300 border border-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-cyan-300">
                        {note.author_role === 'reviewer' ? 'Advisor Note (You)' : 'Owner Note'}
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
            <form onSubmit={handleSaveMonthNote} className="space-y-3 pt-1">
              <CustomTextarea
                value={monthNoteDraft}
                onChange={(e) => setMonthNoteDraft(e.target.value)}
                placeholder="e.g. You're pacing 15% over budget in Dining Out this month. Consider cooking more next week to stay on track!"
                rows={3}
                className="w-full text-xs sm:text-sm"
              />
              <div className="flex items-center justify-between">
                {noteSuccessMessage ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 size={16} /> {noteSuccessMessage}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={savingNote || !monthNoteDraft.trim()}
                  className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 text-xs sm:text-sm font-semibold disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Send size={15} /> Post Advice
                </button>
              </div>
            </form>
          </div>

          {/* Expense Transaction Review List */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl border border-white/[0.05] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
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
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-950/80 border border-white/[0.06] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {uniqueCategories.length > 0 && (
                  <CustomSelect
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full sm:w-36 text-xs py-1"
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </CustomSelect>
                )}
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-slate-400 bg-slate-950/40 rounded-2xl border border-white/[0.03]">
                No transactions matched your current filters.
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredExpenses.map((exp) => {
                  const commentsForExp = getExpenseComments(exp.id);
                  const commentCount = commentsForExp.length;
                  const catColor = getCategoryColor(exp.category);

                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExpense(exp)}
                      className="py-3 px-3.5 sm:px-4 rounded-2xl bg-slate-950/40 hover:bg-slate-800/60 cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 group border border-white/[0.02] hover:border-white/[0.08]"
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
                              {exp.item || 'Expense'}
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
                        <span className="text-xs sm:text-sm font-black text-slate-100 tabular-nums">
                          {formatCurrency(exp.amount, defaultCurrency)}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-colors shadow-sm">
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
