import ExpenseForm from '../components/ExpenseForm';

function AddExpensePage({ onAddExpense }) {
  return (
    <main className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="premium-card rounded-2xl p-8 transition duration-200 hover:scale-[1.02] hover:-translate-y-0.5">
        <p className="text-sm text-gray-400">Add expense</p>
        <h2 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Capture spending fast.
        </h2>
        <p className="mt-4 max-w-md text-sm text-gray-400">
          Add the amount, choose a category, and keep a short note if you need context later.
        </p>
      </section>

      <ExpenseForm onSubmit={onAddExpense} />
    </main>
  );
}

export default AddExpensePage;
