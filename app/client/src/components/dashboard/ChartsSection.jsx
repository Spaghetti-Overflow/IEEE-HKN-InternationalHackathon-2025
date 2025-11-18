import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function ChartsSection({ analytics }) {
  const [windowMonths, setWindowMonths] = useState(12);
  const categories = analytics?.categories || [];
  const trend = analytics?.trend || [];
  const balance = analytics?.balance || {};

  const filteredTrend = useMemo(() => {
    if (!trend.length) return [];
    return trend.slice(-windowMonths);
  }, [trend, windowMonths]);

  const topCategories = useMemo(() => categories.slice(0, 3), [categories]);
  const net = Number(balance.actualNet || 0);
  const utilization = Math.max(0, Math.min(100, balance.utilization ?? 0));

  return (
    <section className="analytics-board card">
      <div className="section-header analytics-board__header">
        <div>
          <h3>Financial patterns</h3>
          <p className="muted">Quick cues plus charts that explain what changed.</p>
        </div>
        <div className="chip-group">
          {[6, 12].map((window) => (
            <button
              key={window}
              type="button"
              className={`chip ${windowMonths === window ? 'chip--active' : ''}`}
              onClick={() => setWindowMonths(window)}
            >
              Last {window} mo
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-metrics">
        <article>
          <p className="muted">Allocated</p>
          <strong>{currency.format(Number(balance.allocated || 0))}</strong>
          <span>{utilization}% utilized</span>
        </article>
        <article>
          <p className="muted">Actual net</p>
          <strong className={net >= 0 ? 'text-success' : 'text-danger'}>{currency.format(net)}</strong>
          <span>{currency.format(Number(balance.actualIncome || 0))} in · {currency.format(Number(balance.actualExpense || 0))} out</span>
        </article>
        <article>
          <p className="muted">Top categories</p>
          {topCategories.length ? (
            <ul>
              {topCategories.map((cat) => (
                <li key={cat.category}>
                  {cat.category}: {currency.format(cat.expenses)} out / {currency.format(cat.incomes)} in
                </li>
              ))}
            </ul>
          ) : (
            <span>No categorized data yet</span>
          )}
        </article>
      </div>

      <div className="analytics-board__grid">
        <article className="chart-card">
          <div className="chart-card__header">
            <h4>Category split</h4>
            <p className="muted">Stacked view of income vs expenses.</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categories} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="incomes" fill="#22c55e" name="Incomes" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="chart-card">
          <div className="chart-card__header">
            <h4>Cash flow trend</h4>
            <p className="muted">Compare the latest {windowMonths} months.</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={filteredTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="incomes" stroke="#2563eb" name="Incomes" />
                <Line type="monotone" dataKey="expenses" stroke="#dc2626" name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
