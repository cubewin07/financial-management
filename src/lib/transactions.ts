import { supabase } from './supabaseClient';

interface ExpenseRow {
  id: string;
  user_id: string;
  amount: number | string;
  category: string;
  date: string;
  note: string | null;
  created_at: string;
}

export interface ExpenseTransaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  date: string;
  note: string;
  createdAt: string;
}

export async function fetchUserTransactions(
  userId: string,
  limit = 25,
): Promise<ExpenseTransaction[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id,user_id,amount,category,date,note,created_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ExpenseRow[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    note: row.note ?? '',
    createdAt: row.created_at,
  }));
}
