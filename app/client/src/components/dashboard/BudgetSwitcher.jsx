export default function BudgetSwitcher({
  budgets,
  selectedBudgetId,
  setSelectedBudgetId,
  budgetForm,
  setBudgetForm,
  handleBudgetCreate
}) {
  return (
    <section className="card budget-switcher">
      <div>
        <label>
          Active budget
          <select
            value={selectedBudgetId || ''}
            onChange={(e) => setSelectedBudgetId(e.target.value ? Number(e.target.value) : null)}
          >
            {budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.name} — {budget.academicLabel}
              </option>
            ))}
            {!budgets.length ? <option value="">Create your first budget below</option> : null}
          </select>
        </label>
      </div>
      <form className="budget-form" onSubmit={handleBudgetCreate}>
        <label>
          New budget name
          <input
            value={budgetForm.name}
            onChange={(e) => setBudgetForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="2025-2026 Chapter Ops"
          />
        </label>
        <label>
          Allocation (USD)
          <input
            type="number"
            min="0"
            value={budgetForm.allocatedAmount}
            onChange={(e) => setBudgetForm((prev) => ({ ...prev, allocatedAmount: e.target.value }))}
          />
        </label>
        <button className="primary" type="submit">
          Create budget
        </button>
      </form>
    </section>
  );
}
