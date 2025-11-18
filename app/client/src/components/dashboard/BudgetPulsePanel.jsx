import { FiArrowUpRight, FiCalendar, FiTrendingUp } from 'react-icons/fi';

export default function BudgetPulsePanel({ budgetHealth, transactionTotals, eventsCount }) {
  return (
    <article className="card metric-panel">
      <div className="section-header">
        <div>
          <h3>Budget pulse</h3>
          <p className="muted">Live health indicators</p>
        </div>
        <FiTrendingUp />
      </div>
      <div className="metric-panel__grid">
        <div className="metric-panel__item">
          <span className="metric-icon">
            <FiTrendingUp />
          </span>
          <p className="muted">Actual balance</p>
          <h3>${transactionTotals.actual.toFixed(2)}</h3>
        </div>
        <div className="metric-panel__item">
          <span className="metric-icon">
            <FiArrowUpRight />
          </span>
          <p className="muted">Projected balance</p>
          <h3>${transactionTotals.projected.toFixed(2)}</h3>
        </div>
        {budgetHealth ? (
          <div className="metric-panel__item">
            <span className="metric-icon">
              <FiCalendar />
            </span>
            <p className="muted">Allocation used</p>
            <h3>{Math.round(Math.min(budgetHealth.utilization, 1) * 100)}%</h3>
            <div className="progress">
              <div className="progress__bar" style={{ width: `${Math.min(budgetHealth.utilization, 1) * 100}%` }} />
            </div>
          </div>
        ) : null}
        <div className="metric-panel__item">
          <span className="metric-icon">
            <FiTrendingUp />
          </span>
          <p className="muted">Events planned</p>
          <h3>{eventsCount}</h3>
        </div>
      </div>
    </article>
  );
}
