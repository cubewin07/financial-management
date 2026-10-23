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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = reviewerEmail.trim();
    if (!cleanEmail) {
      setReviewerError('Please enter an email address.');
      return;
    }

    // Basic email format validation
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
      await onRemoveReviewer(memberUserId);
    }
  };

  return (
    <div id="reviewers" className={`${CARD} p-6 sm:p-8 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              Who can review your budget
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Grant trusted reviewers (like parents or mentors) read-only access to your spending breakdown.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-slate-300 self-start sm:self-auto border border-white/5">
          {myReviewers.length} Active Reviewer{myReviewers.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Privacy Preview Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-black/30 border border-white/[0.04]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <Eye size={14} />
            <span>Reviewers can see</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Spending by category · Individual transactions · Your monthly budget amount
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <EyeOff size={14} />
            <span>Reviewers never see</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Bank accounts · Investments · Savings goals · Income · Receipts
          </p>
        </div>
      </div>

      {/* Invite Form */}
      <form onSubmit={handleAddSubmit} className="space-y-3">
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
            className={`h-11 px-5 rounded-xl font-bold bg-white hover:bg-slate-100 active:scale-[0.99] disabled:opacity-40 text-slate-900 shadow-sm transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0 ${FOCUS}`}
          >
            <UserPlus size={16} />
            <span>{isAddingReviewer ? 'Adding...' : 'Add reviewer'}</span>
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

      {/* Reviewers List */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Current Authorized Reviewers ({myReviewers.length})
        </h3>

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
                        {rev.member_email} · Reviewer — read-only + comments
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
