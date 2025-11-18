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

export default function ChartsSection({ analytics }) {
  return (
    <section className="grid two-up">
      <article className="card">
        <div className="section-header">
          <div>
            <h3>Category split</h3>
            <p className="muted">Balance incomes vs expenses per category.</p>
          </div>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.categories} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
      <article className="card">
        <div className="section-header">
          <div>
            <h3>Monthly trend</h3>
            <p className="muted">Visualize burn rate throughout the year.</p>
          </div>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={analytics.trend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
    </section>
  );
}
