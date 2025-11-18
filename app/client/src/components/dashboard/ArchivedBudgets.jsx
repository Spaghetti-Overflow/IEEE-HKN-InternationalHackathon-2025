export default function ArchivedBudgets({ archivedBudgets, setSelectedBudgetId }) {
  if (!archivedBudgets.length) {
    return null;
  }
  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h3>Previous academic years</h3>
          <p className="muted">Browse older budgets without losing access.</p>
        </div>
      </div>
      <div className="archived-grid">
        {archivedBudgets.map((budget) => (
          <article key={budget.id} className="archived-card">
            <h4>{budget.name}</h4>
            <p className="muted">{budget.academicLabel}</p>
            <p>Final balance ${budget.actualBalance.toFixed(2)}</p>
            <button className="secondary" onClick={() => setSelectedBudgetId(budget.id)}>
              Open budget
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
