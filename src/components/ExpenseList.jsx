import { formatCurrency, formatLongDate } from '../utils/finance';

function ExpenseList({
  expenses,
  maxItems = 8,
  title = 'Recent expenses',
  subtitle = 'This month',
  emptyMessage = 'No expenses logged for this month yet.',
}) {
  const visibleExpenses = expenses.slice(0, maxItems);

  return (
    <section className="premium-card rounded-2xl p-8 transition duration-200 hover:scale-[1.02] hover:-translate-y-0.5">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {subtitle}
          </h3>
        </div>
        <span className="w-fit rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-gray-400">
          {visibleExpenses.length} of {expenses.length} items
        </span>
      </div>

      <div className="max-h-[31rem] space-y-3 overflow-y-auto pr-1">
        {visibleExpenses.length > 0 ? (
          visibleExpenses.map((expense) => (
            <article
              key={expense.id}
              className="premium-panel flex flex-col gap-4 rounded-2xl px-4 py-4 transition duration-200 hover:bg-white/8 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div>
                <p className="text-base font-medium tracking-tight text-white">
                  {expense.note || expense.category}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {expense.category} • {formatLongDate(expense.date)}
                </p>
              </div>

              <p className="text-lg font-semibold tracking-tight text-white">
                {formatCurrency(expense.amount)}
              </p>
            </article>
          ))
        ) : (
          <div className="premium-panel rounded-2xl px-4 py-10 text-center text-gray-400">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}

export default ExpenseList;
