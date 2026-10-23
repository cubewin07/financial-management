import { useState } from 'react';
import { Send, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { CustomTextarea } from '../ui/forms';
import { CARD, FOCUS } from './styles';

const QUICK_PROMPTS = [
  { label: 'Pacing well', text: 'Great pacing this month, keep it up!' },
  { label: 'High discretionary', text: 'Discretionary spend looks high this week — check dining out.' },
  { label: 'Goal progress', text: 'Solid progress towards your monthly savings goal!' },
];

export default function AdviceComposer({
  onSubmit,
  suggestedNote = '',
  disabled = false,
  name = '',
}) {
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleApplySuggested = () => {
    if (!suggestedNote) return;
    setDraft((prev) => (prev.trim() ? `${prev.trim()}\n${suggestedNote}` : suggestedNote));
  };

  const handleApplyPrompt = (promptText) => {
    setDraft((prev) => (prev.trim() ? `${prev.trim()} ${promptText}` : promptText));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSubmitting || disabled || !onSubmit) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await onSubmit(text);
      setDraft('');
      setSuccessMessage('Advice posted');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to post advice note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`${CARD} p-5 sm:p-6 space-y-4`} aria-label="Leave Monthly Advice">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Leave Monthly Advice
        </h3>
        <span className="text-[11px] text-slate-400">
          Shown on {name ? `${name}'s` : "the owner's"} dashboard.
        </span>
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.label}
            type="button"
            onClick={() => handleApplyPrompt(prompt.text)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] shrink-0 transition-colors cursor-pointer ${FOCUS}`}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <CustomTextarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (errorMessage) setErrorMessage('');
          }}
          rows={3}
          placeholder="Share constructive guidance, observations, or encouragement for this month..."
          disabled={disabled || isSubmitting}
        />

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {suggestedNote ? (
            <button
              type="button"
              onClick={handleApplySuggested}
              disabled={disabled || isSubmitting}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 transition-colors cursor-pointer ${FOCUS}`}
            >
              <Sparkles size={14} className="text-purple-400" />
              <span>Suggested note</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={!draft.trim() || disabled || isSubmitting}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_18px_rgba(124,58,237,0.35)] transition-all cursor-pointer ${FOCUS}`}
          >
            <Send size={14} />
            <span>{isSubmitting ? 'Posting...' : 'Post advice'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
