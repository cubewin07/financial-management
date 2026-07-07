import ExpenseForm from '../components/ExpenseForm';

function AddExpensePage({ onAddExpense, userId }) {
  return (
    <main className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] xl:grid-cols-[0.9fr_1.1fr]">
      <section className="section-shell section-shell-purple rounded-[32px] p-6 sm:p-8 flex flex-col justify-center items-center text-center lg:items-start lg:text-left">
        <div className="inline-flex items-center justify-center rounded-full bg-[rgba(124,111,224,0.12)] p-3 text-[var(--accent-purple)] mb-4 lg:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        </div>
        <p className="text-sm font-medium tracking-wide uppercase text-[var(--accent-purple)] lg:text-[var(--text-secondary)] lg:normal-case lg:tracking-normal">Add expense</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
          Capture spending fast.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          Add the amount, choose a category, and keep a short note so your future self always knows what happened.
        </p>
      </section>

      <ExpenseForm onSubmit={onAddExpense} userId={userId} />
    </main>
  );
}

export default AddExpensePage;
