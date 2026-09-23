import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  PieChart,
  ListFilter,
  Send,
  UserCheck,
  Shield,
  FileText,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import useCandidateReport from '../hooks/useCandidateReport';
import useComments from '../hooks/useComments';
import CommentDrawer from '../components/CommentDrawer';
import { formatCurrency, PERIOD_OPTIONS } from '../utils/finance';
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

  // If candidateId in URL, that candidate is active.
  const activeCandidate = useMemo(() => {
    if (!candidateId) return null;
    return revieweeCandidates.find((c) => c.owner_user_id === candidateId) || null;
  }, [candidateId, revieweeCandidates]);

  const [period, setPeriod] = useState('current-month');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthNoteDraft, setMonthNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccessMessage, setNoteSuccessMessage] = useState('');

  const confirm = useConfirm();
  const [hubTab, setHubTab] = useState('reviewees'); // 'reviewees' | 'my-reviewers'
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [isAddingReviewer, setIsAddingReviewer] = useState(false);
  const [reviewerError, setReviewerError] = useState('');
  const [reviewerSuccess, setReviewerSuccess] = useState('');

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
    fixedVsDisc,
    snapshots,
  } = useCandidateReport({
    candidateOwnerId: activeCandidate?.owner_user_id,
    period,
  });

  // Comments hook for active candidate
  const {
    expenseComments,
    monthComments,
    getExpenseComments,
    addCommentToExpense,
    getMonthComments,
    getReviewerMonthComment,
    saveReviewerMonthComment,
  } = useComments({ userId: activeCandidate?.owner_user_id });

  const currentMonthKey = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const candidateMonthNotes = useMemo(() => {
    return getMonthComments(currentMonthKey);
  }, [getMonthComments, currentMonthKey]);

  // Filtered expense list
  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') return periodExpenses;
    return periodExpenses.filter((e) => e.category === categoryFilter);
  }, [periodExpenses, categoryFilter]);

  // Unique categories in this period
  const uniqueCategories = useMemo(() => {
    const set = new Set(periodExpenses.map((e) => e.category).filter(Boolean));
    return Array.from(set);
  }, [periodExpenses]);

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

  // If no candidate is selected, render Candidate Hub List with Tabs
  if (!activeCandidate) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--outline-variant)]/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-container)] text-[var(--on-primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/10">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-headline-md font-bold text-[var(--on-surface)]">Reviewer Hub</h1>
              <p className="text-body-sm text-[var(--on-surface-variant)]">
                Inspect shared candidate reports and manage reviewers on your budget.
              </p>
            </div>
          </div>

          {/* Top Segmented Tabs Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--surface-container-high)] border border-[var(--outline-variant)]/40 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setHubTab('reviewees')}
              className={`px-3.5 py-2 rounded-xl text-body-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                hubTab === 'reviewees'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-sm'
                  : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
              }`}
            >
              <Users size={16} />
              <span>Budgets I Review</span>
              {revieweeCandidates.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  hubTab === 'reviewees' ? 'bg-black/20 text-white' : 'bg-white/10 text-[var(--on-surface)]'
                }`}>
                  {revieweeCandidates.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setHubTab('my-reviewers')}
              className={`px-3.5 py-2 rounded-xl text-body-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                hubTab === 'my-reviewers'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-sm'
                  : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
              }`}
            >
              <Shield size={16} />
              <span>My Reviewers</span>
              {myReviewers.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  hubTab === 'my-reviewers' ? 'bg-black/20 text-white' : 'bg-white/10 text-[var(--on-surface)]'
                }`}>
                  {myReviewers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Budgets I Review */}
        {hubTab === 'reviewees' && (
          <div>
            {accessLoading ? (
              <LoadingState message="Loading review candidates..." />
            ) : revieweeCandidates.length === 0 ? (
              <div className="rounded-3xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container-low)] p-8 sm:p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-[var(--on-surface-variant)]">
                  <Users size={28} />
                </div>
                <h2 className="text-title-lg font-bold text-[var(--on-surface)] mb-2">No Candidates Yet</h2>
                <p className="text-body-md text-[var(--on-surface-variant)] max-w-md mx-auto">
                  You haven&apos;t been added as a reviewer by any budget owners yet. When a user adds your email address in their Reviewer settings, their financial report will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-title-md font-semibold text-[var(--on-surface)]">
                  Select a Candidate to Inspect Report
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {revieweeCandidates.map((cand) => {
                    const initial = (cand.owner_email || 'U').charAt(0).toUpperCase();
                    const addedDate = cand.created_at
                      ? format(new Date(cand.created_at), 'MMM d, yyyy')
                      : 'Active';

                    return (
                      <motion.div
                        key={cand.owner_user_id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => navigate(`/review-hub/${cand.owner_user_id}`)}
                        className="group cursor-pointer rounded-2xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] p-4 sm:p-5 transition-all flex items-center justify-between shadow-sm hover:shadow-md hover:border-[var(--primary)]/40"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--tertiary)] flex items-center justify-center text-[var(--on-primary)] font-bold text-base shadow-sm shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-body-md font-semibold text-[var(--on-surface)] truncate group-hover:text-[var(--primary)] transition-colors">
                              {cand.owner_email}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center gap-1 text-label-sm text-[var(--on-surface-variant)]">
                                <Shield size={12} className="text-[var(--primary)]" /> Reviewer Access
                              </span>
                              <span className="text-[var(--outline-variant)]">•</span>
                              <span className="text-label-sm text-[var(--on-surface-variant)]">{addedDate}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="hidden sm:inline-block text-label-sm font-semibold text-[var(--primary)]">
                            View Report
                          </span>
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-[var(--on-primary)] transition-colors text-[var(--on-surface-variant)]">
                            <ChevronRight size={18} />
                          </div>
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
          <div className="p-5 sm:p-7 rounded-3xl bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/60 shadow-xl space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-100">Invite & Manage Your Reviewers</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Grant trusted reviewers (like parents or financial mentors) read-only access to your spending breakdown and monthly reports. They can view reports and leave feedback notes, but cannot see your private bank accounts or investments.
              </p>
            </div>

            {/* Add Reviewer Form */}
            <form onSubmit={handleAddReviewerSubmit} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Invite a Registered User by Email
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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
                  className="py-2.5 px-5 rounded-xl font-semibold bg-white hover:bg-slate-100 active:scale-[0.99] disabled:opacity-50 text-slate-900 shadow-sm transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
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
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2"
                  >
                    <AlertCircle size={15} className="shrink-0 text-rose-400" />
                    <span>{reviewerError}</span>
                  </motion.div>
                )}
                {reviewerSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2"
                  >
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                    <span>{reviewerSuccess}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Current Reviewers List */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current Authorized Reviewers ({myReviewers.length})
              </h3>

              {myReviewers.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-slate-400">
                  No reviewers added yet. Only you can view your financial reports.
                </div>
              ) : (
                <div className="divide-y divide-white/10 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
                  {myReviewers.map((rev) => {
                    const email = rev.member_email || 'Authorized Reviewer';
                    const initial = email.charAt(0).toUpperCase();
                    return (
                      <div
                        key={rev.member_user_id}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                              {email}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
                              <span>Role: Reviewer (Read-Only Reports + Comments)</span>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveReviewerClick(rev.member_user_id, email)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Revoke access"
                        >
                          <Trash2 size={14} />
                          <span className="hidden sm:inline text-xs">Revoke</span>
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

  // Active Candidate Report View
  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Sticky Top Context Banner */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[var(--surface-container-lowest)]/90 border-b border-[var(--outline-variant)]/60 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/review-hub')}
            className="p-2 rounded-xl bg-[var(--surface-container-high)] text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors flex items-center justify-center"
            aria-label="Back to all candidates"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-title-md font-bold text-[var(--on-surface)] truncate">
                {activeCandidate.owner_email}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-medium bg-[rgba(208,188,255,0.12)] text-[var(--primary)] border border-[var(--primary)]/20">
                <Shield size={12} /> Reviewer Mode (Read-Only)
              </span>
            </div>
            <p className="text-label-sm text-[var(--on-surface-variant)] truncate">
              Financial performance report & advice channel
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <CustomSelect
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full sm:w-44 text-body-sm py-1.5"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </CustomSelect>
        </div>
      </div>

      {reportLoading ? (
        <LoadingState message="Loading candidate financial metrics..." />
      ) : reportError ? (
        <ErrorState title="Report Error" message={reportError} onRetry={refreshReport} />
      ) : (
        <div className="space-y-6">
          {/* Top High-Level Health & Pace Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Monthly Budget Target */}
            <div className="rounded-2xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container)] p-4">
              <p className="text-label-sm text-[var(--on-surface-variant)]">Monthly Budget Target</p>
              <p className="text-title-lg sm:text-headline-sm font-bold text-[var(--on-surface)] mt-1">
                {monthlyBudget > 0 ? formatCurrency(monthlyBudget, defaultCurrency) : 'Not Configured'}
              </p>
              <p className="text-label-sm text-[var(--on-surface-variant)] mt-1">Declared budget goal</p>
            </div>

            {/* Total Period Spend */}
            <div className="rounded-2xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container)] p-4">
              <p className="text-label-sm text-[var(--on-surface-variant)]">Total Spent ({period})</p>
              <p className="text-title-lg sm:text-headline-sm font-bold text-[var(--primary)] mt-1">
                {formatCurrency(summary.totalSpent, defaultCurrency)}
              </p>
              <p className="text-label-sm text-[var(--on-surface-variant)] mt-1">
                {periodExpenses.length} transaction{periodExpenses.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Remaining Budget */}
            <div className="rounded-2xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container)] p-4">
              <p className="text-label-sm text-[var(--on-surface-variant)]">Remaining Balance</p>
              <p
                className={`text-title-lg sm:text-headline-sm font-bold mt-1 ${
                  summary.remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(summary.remaining, defaultCurrency)}
              </p>
              <p className="text-label-sm text-[var(--on-surface-variant)] mt-1">
                {summary.remaining >= 0 ? 'Within budget' : 'Over budget'}
              </p>
            </div>

            {/* Daily Burn Rate */}
            <div className="rounded-2xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container)] p-4">
              <p className="text-label-sm text-[var(--on-surface-variant)]">Daily Burn Rate</p>
              <p className="text-title-lg sm:text-headline-sm font-bold text-[var(--on-surface)] mt-1">
                {formatCurrency(burnRate.dailyRate, defaultCurrency)}
                <span className="text-body-sm font-normal text-[var(--on-surface-variant)]"> / day</span>
              </p>
              <p className="text-label-sm text-[var(--on-surface-variant)] mt-1">
                {burnRate.projectedSpend > 0
                  ? `Proj: ${formatCurrency(burnRate.projectedSpend, defaultCurrency)}`
                  : 'Pace calculation'}
              </p>
            </div>
          </div>

          {/* Category Spending Breakdown Section */}
          <div className="rounded-3xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container-low)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart size={20} className="text-[var(--primary)]" />
                <h3 className="text-title-md font-bold text-[var(--on-surface)]">Category Distribution</h3>
              </div>
              <span className="text-label-sm text-[var(--on-surface-variant)]">
                {categoryData.length} active categories
              </span>
            </div>

            {categoryData.length === 0 ? (
              <p className="text-body-sm text-[var(--on-surface-variant)] py-4 text-center">
                No spending data recorded for this period.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {categoryData.map((cat) => {
                  const catName = cat.name || cat.category || 'Category';
                  const catTotal = Number(cat.value ?? cat.total ?? 0);
                  const percent = summary.totalSpent > 0 ? (catTotal / summary.totalSpent) * 100 : 0;
                  return (
                    <div
                      key={catName}
                      className="rounded-2xl border border-[var(--outline-variant)]/40 bg-[var(--surface-container)] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-body-sm">
                        <span className="font-semibold text-[var(--on-surface)]">{catName}</span>
                        <span className="font-bold text-[var(--on-surface)]">
                          {formatCurrency(catTotal, defaultCurrency)}{' '}
                          <span className="text-label-sm font-normal text-[var(--on-surface-variant)]">
                            ({percent.toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--surface-container-highest)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(2, percent))}%`,
                            backgroundColor: cat.color || 'var(--primary)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly Reviewer Feedback & Advice Card */}
          <div className="rounded-3xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container-low)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} className="text-[var(--primary)]" />
                <h3 className="text-title-md font-bold text-[var(--on-surface)]">
                  Monthly Reviewer Advice ({currentMonthKey})
                </h3>
              </div>
            </div>

            <p className="text-body-sm text-[var(--on-surface-variant)]">
              Leave structured guidance or recommendations for {activeCandidate.owner_email}. This feedback appears on their dashboard.
            </p>

            {/* Existing feedback messages for this month */}
            {candidateMonthNotes.length > 0 && (
              <div className="space-y-2.5 pt-2">
                {candidateMonthNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3.5 rounded-2xl border text-body-sm ${
                      note.author_role === 'reviewer'
                        ? 'bg-[rgba(208,188,255,0.08)] border-[var(--primary)]/30 text-[var(--on-surface)]'
                        : 'bg-white/5 border-white/10 text-[var(--on-surface-variant)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-label-sm font-semibold capitalize text-[var(--primary)]">
                        {note.author_role === 'reviewer' ? 'Your Review Note' : 'Owner Note'}
                      </span>
                      <span className="text-label-sm text-[var(--on-surface-variant)]">
                        {note.created_at ? format(new Date(note.created_at), 'MMM d, h:mm a') : ''}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Compose new note */}
            <form onSubmit={handleSaveMonthNote} className="space-y-3 pt-2">
              <CustomTextarea
                value={monthNoteDraft}
                onChange={(e) => setMonthNoteDraft(e.target.value)}
                placeholder="e.g. You're pacing 15% over budget in Dining Out this month. Consider cooking more next week to stay on track!"
                rows={3}
                className="w-full text-body-sm"
              />
              <div className="flex items-center justify-between">
                {noteSuccessMessage ? (
                  <span className="inline-flex items-center gap-1.5 text-label-sm text-emerald-400 font-medium">
                    <CheckCircle2 size={15} /> {noteSuccessMessage}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={savingNote || !monthNoteDraft.trim()}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 text-xs sm:text-sm font-semibold disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Send size={15} /> Post Advice
                </button>
              </div>
            </form>
          </div>

          {/* Expense Transaction Review List */}
          <div className="rounded-3xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container-low)] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-title-md font-bold text-[var(--on-surface)]">
                  Transaction Review ({filteredExpenses.length})
                </h3>
                <p className="text-label-sm text-[var(--on-surface-variant)]">
                  Inspect expenses and click any row to leave direct feedback comments.
                </p>
              </div>

              {/* Category Filter */}
              {uniqueCategories.length > 0 && (
                <div className="flex items-center gap-2">
                  <ListFilter size={16} className="text-[var(--on-surface-variant)]" />
                  <CustomSelect
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-36 text-label-sm py-1"
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
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="py-8 text-center text-body-sm text-[var(--on-surface-variant)]">
                No transactions found for this selection.
              </div>
            ) : (
              <div className="divide-y divide-[var(--outline-variant)]/30 overflow-hidden">
                {filteredExpenses.map((exp) => {
                  const commentsForExp = getExpenseComments(exp.id);
                  const commentCount = commentsForExp.length;

                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExpense(exp)}
                      className="py-3 px-2 rounded-xl hover:bg-[var(--surface-container)] cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-body-md font-semibold text-[var(--on-surface)] truncate group-hover:text-[var(--primary)] transition-colors">
                            {exp.item || 'Expense'}
                          </p>
                          {commentCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-semibold bg-[rgba(208,188,255,0.15)] text-[var(--primary)]">
                              <MessageCircle size={12} /> {commentCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-label-sm text-[var(--on-surface-variant)]">
                          <span>{exp.category}</span>
                          <span>•</span>
                          <span>{exp.date}</span>
                          {exp.payment_method && (
                            <>
                              <span>•</span>
                              <span>{exp.payment_method}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-body-md font-bold text-[var(--on-surface)]">
                          {formatCurrency(exp.amount, defaultCurrency)}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[var(--on-surface-variant)] group-hover:bg-[var(--primary)] group-hover:text-[var(--on-primary)] transition-colors">
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
