-- Enforce strict per-user data isolation with RLS.
-- Apply this migration after 001_initial.sql.

-- expenses
DROP POLICY IF EXISTS "owner can manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "reviewer can read expenses" ON public.expenses;

CREATE POLICY "users can manage own expenses"
ON public.expenses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- subscriptions
DROP POLICY IF EXISTS "owner can manage own subscriptions" ON public.subscriptions;

CREATE POLICY "users can manage own subscriptions"
ON public.subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- monthly snapshots
DROP POLICY IF EXISTS "owner can manage own monthly snapshots" ON public.monthly_snapshots;

CREATE POLICY "users can manage own monthly snapshots"
ON public.monthly_snapshots
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- expense comments
DROP POLICY IF EXISTS "owner can manage expense comments for own expenses" ON public.expense_comments;
DROP POLICY IF EXISTS "reviewer can add expense comments" ON public.expense_comments;
DROP POLICY IF EXISTS "reviewer can read expense comments" ON public.expense_comments;

CREATE POLICY "users can manage comments for own expenses"
ON public.expense_comments
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.expenses
    WHERE public.expenses.id = public.expense_comments.expense_id
      AND public.expenses.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.expenses
    WHERE public.expenses.id = public.expense_comments.expense_id
      AND public.expenses.user_id = auth.uid()
  )
);

-- month comments
DROP POLICY IF EXISTS "owner can manage own month comments" ON public.month_comments;
DROP POLICY IF EXISTS "reviewer can add month comments" ON public.month_comments;
DROP POLICY IF EXISTS "reviewer can read month comments" ON public.month_comments;

CREATE POLICY "users can manage own month comments"
ON public.month_comments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
