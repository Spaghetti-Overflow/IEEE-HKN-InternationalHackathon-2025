import { format } from 'date-fns';

export default function UpcomingPanel({ projectionWindowDays, upcomingSummary, upcomingList }) {
  return (
    <article className="card">
      <div className="section-header">
        <div>
          <h3>Upcoming cash flow</h3>
          <p className="muted">Next {projectionWindowDays} days</p>
        </div>
        <span className="badge bg-light text-dark">{upcomingSummary.count} entries</span>
      </div>
      {upcomingList?.length ? (
        <ul className="timeline">
          {upcomingList.map((tx) => (
            <li key={tx.id}>
              <div>
                <strong>{format(tx.timestamp * 1000, 'PPpp')}</strong>
                <p className="muted">
                  {tx.category}
                  {tx.eventName ? ` · ${tx.eventName}` : ''}
                </p>
              </div>
              <div className="timeline__meta">
                <span className={`tag tag--${tx.type}`}>{tx.type}</span>
                <span className="timeline__amount">{tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No planned or recurring transactions yet.</p>
      )}
    </article>
  );
}
