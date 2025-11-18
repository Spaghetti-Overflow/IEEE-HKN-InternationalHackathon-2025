import { format } from 'date-fns';

export default function InsightsPanel({ deadlineStatusOrder, deadlineStatusLabels, deadlineBreakdown, topCategory, nextDeadline }) {
  return (
    <article className="card status-card">
      <div className="section-header">
        <div>
          <h3>Insights</h3>
          <p className="muted">Deadlines & categories</p>
        </div>
      </div>
      <div className="deadline-pills">
        {deadlineStatusOrder.map((status) => (
          <span key={status} className="tag">
            {deadlineStatusLabels[status]}: {deadlineBreakdown[status] || 0}
          </span>
        ))}
      </div>
      <div className="insight-cards">
        {topCategory ? (
          <div className="insight">
            <p className="muted">Top category</p>
            <strong>{topCategory.category}</strong>
            <p className="muted">
              ${topCategory.incomes.toFixed(2)} in · ${topCategory.expenses.toFixed(2)} out
            </p>
          </div>
        ) : (
          <p className="muted">Track some transactions to unlock insights.</p>
        )}
        {nextDeadline ? (
          <div className="insight">
            <p className="muted">Next deadline</p>
            <strong>{nextDeadline.title}</strong>
            <p className="muted">{format(nextDeadline.dueTimestamp * 1000, 'PPpp')}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
