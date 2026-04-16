import ExpenseForm from '../components/ExpenseForm';

function AddExpensePage({ onAddExpense, userId }) {
  return (
    <main className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="section-shell section-shell-purple rounded-[32px] p-7 sm:p-8">
        <p className="text-sm text-[var(--text-secondary)]">Add expense</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
          Capture spending fast.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          Add the amount, choose a category, and keep a short note so your future self always knows what happened.
        </p>
      </section>

      <ExpenseForm onSubmit={onAddExpense} userId={userId} />
    </main>
  );
}

export default AddExpensePage;
