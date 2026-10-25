import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Eye,
  EyeOff,
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { CustomInput } from '../ui/forms';
import { useConfirm } from '../../context/ConfirmationContext';
import { displayName } from '../../utils/reviewInsights';
import { CARD, ROW, FOCUS } from './styles';

export default function ReviewerManager({
  myReviewers = [],
  onAddReviewer,
  onRemoveReviewer,
  className = '',
}) {
  const confirm = useConfirm();

  const [reviewerEmail, setReviewerEmail] = useState('');
  const [isAddingReviewer, setIsAddingReviewer] = useState(false);
  const [reviewerError, setReviewerError] = useState('');
  const [reviewerSuccess, setReviewerSuccess] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(myReviewers.length === 0);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = reviewerEmail.trim();
    if (!cleanEmail) {
      setReviewerError('Please enter an email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setReviewerError('Please enter a valid email address.');
      return;
    }

    if (!onAddReviewer) return;

    setIsAddingReviewer(true);
    setReviewerError('');
    setReviewerSuccess('');

    try {
      const res = await onAddReviewer(cleanEmail);
      if (res?.success) {
        setReviewerSuccess(res.message || 'Reviewer added successfully!');
        setReviewerEmail('');
        setTimeout(() => setReviewerSuccess(''), 4000);
      } else {
        setReviewerError(res?.message || 'Failed to add reviewer.');
      }
    } catch (err) {
      setReviewerError(err?.message || 'Error adding reviewer.');
    } finally {
      setIsAddingReviewer(false);
    }
  };

  const handleRemoveClick = async (memberUserId, email) => {
    const isConfirmed = await confirm({
      title: 'Revoke Reviewer Access',
      message: `Are you sure you want to remove ${email} as a reviewer? They will no longer be able to view your financial reports.`,
      description: 'You can re-invite them at any time.',
      confirmText: 'Revoke Access',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (isConfirmed && onRemoveReviewer) {
      setReviewerError('');
      setReviewerSuccess('');
      try {
        const res = await onRemoveReviewer(memberUserId);
        if (res && !res.success) {
          setReviewerError(res.message || 'Failed to remove reviewer.');
        } else {
          setReviewerSuccess('Reviewer access revoked.');
          setTimeout(() => setReviewerSuccess(''), 3000);
        }
      } catch (err) {
        setReviewerError(err?.message || 'Error revoking access.');
      }
    }
  };

  return (
    <div className={`${CARD} p-5 sm:p-7 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">
              Who can review your budget
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Grant trusted reviewers read-only access to your spending breakdown.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteForm((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors shrink-0 cursor-pointer ${FOCUS}`}
        >
          <Plus size={14} className={showInviteForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
          <span>{showInviteForm ? 'Close' : 'Invite'}</span>
        </button>
      </div>

      {/* Collapsible Privacy Details */}
      <details className="group rounded-2xl bg-black/30 border border-white/[0.04] p-3 text-xs transition-all">
        <summary className="flex items-center justify-between cursor-pointer font-bold text-slate-300 select-none py-0.5">
          <span className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-200">
            <Eye size={14} className="text-cyan-400" />
            <span>Privacy breakdown: What reviewers see</span>
          </span>
          <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform" />
        </summary>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-2 border-t border-white/[0.04]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <Eye size={13} />
              <span>Reviewers can see:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Spending by category · Individual transactions · Your monthly budget amount
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-400">
              <EyeOff size={13} />
              <span>Reviewers never see:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Bank accounts · Investments · Savings goals · Income · Receipts
            </p>
          </div>
        </div>
      </details>

      {/* Collapsible Invite Form */}
      <AnimatePresence>
        {showInviteForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddSubmit}
            className="space-y-3 overflow-hidden pt-1"
          >
            <label className="block text-xs font-semibold text-slate-300">
              Invite by Email
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
                className={`h-11 px-5 rounded-xl font-bold bg-white hover:bg-slate-100 active:scale-[0.99] disabled:opacity-40 text-slate-900 shadow-sm transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0 ${FOCUS}`}
              >
                <UserPlus size={16} />
                <span>{isAddingReviewer ? 'Adding...' : 'Add reviewer'}</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Feedback Messages */}
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

      {/* Reviewers List */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
          <span>Active Reviewers</span>
          <span className="text-slate-500 font-medium normal-case">
            {myReviewers.length} {myReviewers.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {myReviewers.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#100d17]/50 border border-white/[0.02] text-center text-xs text-slate-400">
            No reviewers added yet. Only you can view your financial reports.
          </div>
        ) : (
          <div className="space-y-2">
            {myReviewers.map((rev) => {
              const name = displayName(rev.member_email);
              const initial = name.charAt(0).toUpperCase() || 'R';

              return (
                <div
                  key={rev.id || rev.member_user_id}
                  className={`${ROW} p-3 sm:p-4 flex items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/20 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">
                        {name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {rev.member_email} · Read-only + comments
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveClick(rev.member_user_id, rev.member_email)}
                    title="Revoke reviewer access"
                    aria-label={`Revoke access for ${rev.member_email}`}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 ${FOCUS}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
