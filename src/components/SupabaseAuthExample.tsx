import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { fetchUserTransactions, type ExpenseTransaction } from '../lib/transactions';
import { formatCurrency, formatLongDate } from '../utils/finance';

type AuthMode = 'sign-in' | 'sign-up';

interface AuthFormState {
  email: string;
  password: string;
}

const initialFormState: AuthFormState = {
  email: '',
  password: '',
};

function SupabaseAuthExample() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [form, setForm] = useState<AuthFormState>(initialFormState);
  const [session, setSession] = useState<Session | null>(null);
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSession(data.session ?? null);
    };

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setErrorMessage('');
      setSuccessMessage('');
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      setTransactions([]);
      return;
    }

    const loadTransactions = async () => {
      try {
        setTransactionsLoading(true);
        setErrorMessage('');

        // RLS still applies server-side; the user_id filter narrows the query.
        const userTransactions = await fetchUserTransactions(userId);
        setTransactions(userTransactions);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load transactions.');
      } finally {
        setTransactionsLoading(false);
      }
    };

    loadTransactions();
  }, [session?.user?.id]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (mode === 'sign-up') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        });

        if (error) {
          throw error;
        }

        setSuccessMessage('Sign-up successful. Check your email for the confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

        if (error) {
          throw error;
        }

        setSuccessMessage('Signed in successfully.');
      }

      setForm((current) => ({ ...current, password: '' }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage('Signed out successfully.');
  };

  return (
    <section className="section-shell section-shell-purple rounded-[32px] p-6 sm:p-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Supabase demo</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Email auth + transactions query
          </h2>
        </div>

        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className={`rounded-full px-4 py-2 text-sm transition ${
              mode === 'sign-in'
                ? 'bg-[var(--accent-purple)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('sign-up')}
            className={`rounded-full px-4 py-2 text-sm transition ${
              mode === 'sign-up'
                ? 'bg-[var(--accent-purple)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Sign up
          </button>
        </div>
      </div>

      <form onSubmit={handleAuthSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleInputChange}
          className="input-shell"
          placeholder="you@example.com"
          required
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleInputChange}
          className="input-shell"
          placeholder="At least 6 characters"
          minLength={6}
          required
        />
        <button type="submit" className="btn-primary" disabled={authLoading}>
          {authLoading ? 'Working...' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {session?.user ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-[rgba(45,212,191,0.24)] bg-[rgba(45,212,191,0.12)] px-3 py-1 text-[var(--accent-teal)]">
            Logged in as {session.user.email}
          </span>
          <button type="button" onClick={handleSignOut} className="btn-secondary">
            Sign out
          </button>
        </div>
      ) : null}

      {errorMessage ? <p className="mt-4 text-sm text-[var(--accent-coral)]">{errorMessage}</p> : null}
      {successMessage ? <p className="mt-4 text-sm text-[var(--accent-teal)]">{successMessage}</p> : null}

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent transactions</h3>
          {transactionsLoading ? (
            <span className="text-sm text-[var(--text-secondary)]">Loading...</span>
          ) : null}
        </div>

        {transactions.length === 0 ? (
          <div className="surface-panel rounded-[22px] px-4 py-5 text-sm text-[var(--text-secondary)]">
            {session?.user
              ? 'No expenses found yet for this account.'
              : 'Sign in to fetch your own expenses from Supabase.'}
          </div>
        ) : (
          transactions.map((transaction) => (
            <article
              key={transaction.id}
              className="surface-panel flex flex-col gap-2 rounded-[22px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{transaction.category}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatLongDate(transaction.date)}
                  {transaction.note ? ` • ${transaction.note}` : ''}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {formatCurrency(transaction.amount)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default SupabaseAuthExample;
