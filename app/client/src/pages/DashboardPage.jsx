import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { FiDownloadCloud, FiFileText, FiLogOut, FiArrowUpRight, FiCalendar, FiTrendingUp } from 'react-icons/fi';
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
import useDashboardData from '../hooks/useDashboardData.js';
import { useAuth } from '../context/AuthContext.jsx';

const datetimeLocal = (timestamp = Date.now()) => new Date(timestamp).toISOString().slice(0, 16);
const toUnix = (value) => Math.floor(new Date(value).getTime() / 1000);
const asLocalString = (ts) => new Date(ts * 1000).toLocaleString();

const emptyTransaction = (budgetId) => ({
  budgetId,
  type: 'expense',
  status: 'actual',
  amount: '',
  category: '',
  notes: '',
  eventId: '',
  timestamp: datetimeLocal()
});

const emptyDeadline = (budgetId) => ({
  budgetId,
  title: '',
  description: '',
  dueTimestamp: datetimeLocal(),
  category: 'Grant',
  status: 'open',
  link: ''
});

const emptyEvent = (budgetId) => ({
  budgetId,
  name: '',
  allocatedAmount: '',
  startTs: datetimeLocal(),
  endTs: datetimeLocal(),
  notes: ''
});

const DEADLINE_STATUS_ORDER = ['open', 'submitted', 'won', 'lost'];
const DEADLINE_STATUS_LABELS = {
  open: 'Open',
  submitted: 'Submitted',
  won: 'Won',
  lost: 'Lost'
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const {
    budgets,
    selectedBudgetId,
    setSelectedBudgetId,
    transactions,
    deadlines,
    events,
    analytics,
    loading,
    error,
    createBudget,
    saveTransaction,
    deleteTransaction,
    uploadReceipt,
    saveDeadline,
    deleteDeadline,
    saveEvent,
    deleteEvent,
    exportsBaseUrl
  } = useDashboardData();

  const activeBudget = useMemo(() => budgets.find((b) => b.id === selectedBudgetId), [budgets, selectedBudgetId]);
  const archivedBudgets = useMemo(() => budgets.filter((budget) => budget.isArchived), [budgets]);
  const [budgetForm, setBudgetForm] = useState({ name: '', allocatedAmount: 0 });
  const [transactionForm, setTransactionForm] = useState(emptyTransaction(selectedBudgetId));
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deadlineForm, setDeadlineForm] = useState(emptyDeadline(selectedBudgetId));
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEvent(selectedBudgetId));
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    setTransactionForm(emptyTransaction(selectedBudgetId));
    setDeadlineForm(emptyDeadline(selectedBudgetId));
    setEventForm(emptyEvent(selectedBudgetId));
    setEditingTransaction(null);
    setEditingDeadline(null);
    setEditingEvent(null);
  }, [selectedBudgetId]);

  const handleBudgetCreate = async (event) => {
    event.preventDefault();
    if (!budgetForm.name) return;
    await createBudget({ name: budgetForm.name, allocatedAmount: Number(budgetForm.allocatedAmount || 0) });
    setBudgetForm({ name: '', allocatedAmount: 0 });
  };

  const handleTransactionSubmit = async (event) => {
    event.preventDefault();
    if (!selectedBudgetId) return;
    const payload = {
      ...transactionForm,
      budgetId: selectedBudgetId,
      amount: Number(transactionForm.amount),
      eventId: transactionForm.eventId || undefined,
      timestamp: toUnix(transactionForm.timestamp)
    };
    await saveTransaction(payload, editingTransaction);
    setTransactionForm(emptyTransaction(selectedBudgetId));
    setEditingTransaction(null);
  };

  const handleDeadlineSubmit = async (event) => {
    event.preventDefault();
    if (!selectedBudgetId) return;
    const payload = {
      ...deadlineForm,
      budgetId: selectedBudgetId,
      dueTimestamp: toUnix(deadlineForm.dueTimestamp)
    };
    await saveDeadline(payload, editingDeadline);
    setDeadlineForm(emptyDeadline(selectedBudgetId));
    setEditingDeadline(null);
  };

  const handleEventSubmit = async (event) => {
    event.preventDefault();
    if (!selectedBudgetId) return;
    const payload = {
      ...eventForm,
      budgetId: selectedBudgetId,
      allocatedAmount: Number(eventForm.allocatedAmount || 0),
      startTs: toUnix(eventForm.startTs),
      endTs: toUnix(eventForm.endTs)
    };
    await saveEvent(payload, editingEvent);
    setEventForm(emptyEvent(selectedBudgetId));
    setEditingEvent(null);
  };

  const onEditTransaction = (tx) => {
    setEditingTransaction(tx.id);
    setTransactionForm({
      budgetId: tx.budgetId,
      type: tx.type,
      status: tx.status,
      amount: tx.amount,
      category: tx.category,
      notes: tx.notes || '',
      eventId: tx.eventId || '',
      timestamp: datetimeLocal(tx.timestamp * 1000)
    });
  };

  const onEditDeadline = (dl) => {
    setEditingDeadline(dl.id);
    setDeadlineForm({
      budgetId: dl.budgetId,
      title: dl.title,
      description: dl.description || '',
      dueTimestamp: datetimeLocal(dl.dueTimestamp * 1000),
      category: dl.category || 'Grant',
      status: dl.status || 'open',
      link: dl.link || ''
    });
  };

  const onEditEvent = (ev) => {
    setEditingEvent(ev.id);
    setEventForm({
      budgetId: ev.budgetId,
      name: ev.name,
      allocatedAmount: ev.allocatedAmount,
      startTs: ev.startTs ? datetimeLocal(ev.startTs * 1000) : datetimeLocal(),
      endTs: ev.endTs ? datetimeLocal(ev.endTs * 1000) : datetimeLocal(),
      notes: ev.notes || ''
    });
  };

  const transactionTotals = useMemo(() => {
    if (!activeBudget) return { actual: 0, projected: 0 };
    return {
      actual: activeBudget.actualBalance,
      projected: activeBudget.projectedBalance
    };
  }, [activeBudget]);

  const budgetHealth = useMemo(() => {
    if (!analytics?.balance) return null;
    const { allocated, actualExpense, actualIncome, actualNet, utilization } = analytics.balance;
    return {
      allocated,
      spent: actualExpense,
      net: actualNet,
      utilization: Math.max(0, utilization ?? 0)
    };
  }, [analytics]);

  const projectionWindowDays = analytics?.projectionWindowDays || 30;

  const upcomingSummary = useMemo(() => {
    const list = analytics?.upcoming || [];
    if (!list.length) {
      return { count: 0, incomes: 0, expenses: 0, net: 0 };
    }
    const totals = list.reduce(
      (acc, tx) => {
        if (tx.type === 'income') {
          acc.incomes += tx.amount;
        } else {
          acc.expenses += tx.amount;
        }
        return acc;
      },
      { incomes: 0, expenses: 0 }
    );
    return {
      count: list.length,
      incomes: totals.incomes,
      expenses: totals.expenses,
      net: totals.incomes - totals.expenses
    };
  }, [analytics]);

  const deadlineBreakdown = useMemo(() => analytics?.deadlineCounts || {}, [analytics]);

  const nextDeadline = useMemo(() => {
    if (!deadlines.length) return null;
    const upcoming = [...deadlines].sort((a, b) => a.dueTimestamp - b.dueTimestamp);
    return upcoming[0];
  }, [deadlines]);

  const topCategory = useMemo(() => {
    const list = analytics?.categories || [];
    if (!list.length) return null;
    return [...list].sort((a, b) => b.expenses + b.incomes - (a.expenses + a.incomes))[0];
  }, [analytics]);

  return (
    <main className="dashboard container-xxl">
      <nav className="app-nav card card--glass">
        <div className="brand">
          <span className="brand__dot" />
          <div>
            <p className="muted text-uppercase mb-0">IEEE-HKN</p>
            <h2>Budget HQ</h2>
          </div>
        </div>
        <div className="nav-actions">
          {exportsBaseUrl ? (
            <div className="btn-group flex-wrap">
              <a className="btn btn-primary-soft" href={`${exportsBaseUrl}/csv`} target="_blank" rel="noreferrer">
                <FiDownloadCloud /> CSV
              </a>
              <a className="btn btn-outline-primary" href={`${exportsBaseUrl}/pdf`} target="_blank" rel="noreferrer">
                <FiFileText /> PDF
              </a>
            </div>
          ) : null}
          <button className="btn btn-outline-dark" onClick={logout}>
            <FiLogOut /> Logout ({user?.displayName || user?.username})
          </button>
        </div>
      </nav>

      <section className="hero card hero-card">
        <div className="hero__text">
          <p className="muted text-uppercase">Smart Budget Scheduler</p>
          <h1>{activeBudget ? activeBudget.name : 'Plan your first chapter budget'}</h1>
          <p className="hero__subtitle">
            {activeBudget ? `Academic year ${activeBudget.academicLabel}` : 'Create a budget to unlock tracking, deadlines, and analytics.'}
          </p>
          <div className="hero__meta">
            <span className="pill pill--light">Actual ${transactionTotals.actual.toFixed(2)}</span>
            <span className="pill pill--light">Projected ${transactionTotals.projected.toFixed(2)}</span>
            <span className="pill pill--outline">{deadlineBreakdown.open || 0} open deadlines</span>
          </div>
        </div>
        <div className="hero__actions">
          {nextDeadline ? (
            <div className="next-deadline">
              <p className="muted mb-1">Next milestone</p>
              <strong>{nextDeadline.title}</strong>
              <p className="muted">{format(nextDeadline.dueTimestamp * 1000, 'PPpp')}</p>
            </div>
          ) : (
            <p className="muted">No upcoming deadlines yet.</p>
          )}
        </div>
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="dashboard-grid">
        <div className="dashboard-main">
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
                <input value={budgetForm.name} onChange={(e) => setBudgetForm((prev) => ({ ...prev, name: e.target.value }))} />
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

          {archivedBudgets.length ? (
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
          ) : null}

          <section className="card">
            <div className="section-header">
              <div>
                <h3>Transactions</h3>
                <p className="muted">Track incomes, expenses, recurring or planned entries.</p>
              </div>
              {activeBudget ? <span className="badge bg-light text-dark">{transactions.length} entries</span> : null}
            </div>
            <form className="grid form-grid" onSubmit={handleTransactionSubmit}>
          <label>
            Type
            <select value={transactionForm.type} onChange={(e) => setTransactionForm((prev) => ({ ...prev, type: e.target.value }))}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>
          <label>
            Status
            <select value={transactionForm.status} onChange={(e) => setTransactionForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="actual">Actual</option>
              <option value="planned">Planned</option>
              <option value="recurring">Recurring</option>
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              step="0.01"
              value={transactionForm.amount}
              onChange={(e) => setTransactionForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />
          </label>
          <label>
            Category
            <input value={transactionForm.category} onChange={(e) => setTransactionForm((prev) => ({ ...prev, category: e.target.value }))} required />
          </label>
          <label>
            Timestamp
            <input type="datetime-local" value={transactionForm.timestamp} onChange={(e) => setTransactionForm((prev) => ({ ...prev, timestamp: e.target.value }))} required />
          </label>
          <label>
            Event
            <select value={transactionForm.eventId} onChange={(e) => setTransactionForm((prev) => ({ ...prev, eventId: e.target.value }))}>
              <option value="">— None —</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            Notes
            <textarea value={transactionForm.notes} onChange={(e) => setTransactionForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </label>
          <div className="form-actions span-2">
            {editingTransaction ? (
              <button type="button" className="secondary" onClick={() => setEditingTransaction(null)}>
                Cancel edit
              </button>
            ) : null}
            <button className="primary" type="submit" disabled={!selectedBudgetId}>
              {editingTransaction ? 'Update transaction' : 'Add transaction'}
            </button>
          </div>
        </form>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Notes</th>
                    <th>Receipt</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.type}</td>
                      <td>
                        <span className={`tag tag--${tx.status}`}>{tx.status}</span>
                      </td>
                      <td>${tx.amount.toFixed(2)}</td>
                      <td>{tx.category}</td>
                      <td>{asLocalString(tx.timestamp)}</td>
                      <td>{tx.eventName || '—'}</td>
                      <td>{tx.notes || '—'}</td>
                      <td>
                        <ReceiptUploader transactionId={tx.id} receiptUrl={tx.receiptUrl} uploadReceipt={uploadReceipt} />
                      </td>
                      <td className="row-actions">
                        <button className="link" type="button" onClick={() => onEditTransaction(tx)}>
                          Edit
                        </button>
                        <button className="link danger" type="button" onClick={() => deleteTransaction(tx.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid two-up stack-panels">
            <article className="card">
          <div className="section-header">
            <div>
              <h3>Deadlines</h3>
              <p className="muted">Keep funding milestones in sight.</p>
            </div>
            <div className="deadline-pills">
              {DEADLINE_STATUS_ORDER.map((status) => (
                <span key={status} className="tag">
                  {DEADLINE_STATUS_LABELS[status]}: {deadlineBreakdown[status] || 0}
                </span>
              ))}
            </div>
          </div>
          <form className="stack" onSubmit={handleDeadlineSubmit}>
            <label>
              Title
              <input value={deadlineForm.title} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, title: e.target.value }))} required />
            </label>
            <label>
              Due
              <input type="datetime-local" value={deadlineForm.dueTimestamp} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, dueTimestamp: e.target.value }))} required />
            </label>
            <label>
              Category
              <input value={deadlineForm.category} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, category: e.target.value }))} />
            </label>
            <label>
              Status
              <select value={deadlineForm.status} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="open">Open</option>
                <option value="submitted">Submitted</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </label>
            <label>
              Link
              <input value={deadlineForm.link} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, link: e.target.value }))} />
            </label>
            <label>
              Notes
              <textarea value={deadlineForm.description} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, description: e.target.value }))} />
            </label>
            <div className="form-actions">
              {editingDeadline ? (
                <button className="secondary" type="button" onClick={() => setEditingDeadline(null)}>
                  Cancel edit
                </button>
              ) : null}
              <button className="primary" type="submit">
                {editingDeadline ? 'Update deadline' : 'Add deadline'}
              </button>
            </div>
          </form>
          <ul className="list">
            {deadlines.map((deadline) => (
              <li key={deadline.id}>
                <div>
                  <strong>{deadline.title}</strong>
                  <p className="muted">{format(deadline.dueTimestamp * 1000, 'PPpp')} · {deadline.status}</p>
                </div>
                <div className="row-actions">
                  {deadline.link ? (
                    <a className="link" href={deadline.link} target="_blank" rel="noreferrer">
                      Link
                    </a>
                  ) : null}
                  <button className="link" type="button" onClick={() => onEditDeadline(deadline)}>
                    Edit
                  </button>
                  <button className="link danger" type="button" onClick={() => deleteDeadline(deadline.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
            </article>

            <article className="card">
          <div className="section-header">
            <div>
              <h3>Events</h3>
              <p className="muted">Group transactions by initiatives.</p>
            </div>
          </div>
          <form className="stack" onSubmit={handleEventSubmit}>
            <label>
              Name
              <input value={eventForm.name} onChange={(e) => setEventForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </label>
            <label>
              Allocated amount
              <input
                type="number"
                min="0"
                value={eventForm.allocatedAmount}
                onChange={(e) => setEventForm((prev) => ({ ...prev, allocatedAmount: e.target.value }))}
              />
            </label>
            <label>
              Start
              <input type="datetime-local" value={eventForm.startTs} onChange={(e) => setEventForm((prev) => ({ ...prev, startTs: e.target.value }))} />
            </label>
            <label>
              End
              <input type="datetime-local" value={eventForm.endTs} onChange={(e) => setEventForm((prev) => ({ ...prev, endTs: e.target.value }))} />
            </label>
            <label>
              Notes
              <textarea value={eventForm.notes} onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </label>
            <div className="form-actions">
              {editingEvent ? (
                <button className="secondary" type="button" onClick={() => setEditingEvent(null)}>
                  Cancel edit
                </button>
              ) : null}
              <button className="primary" type="submit">
                {editingEvent ? 'Update event' : 'Add event'}
              </button>
            </div>
          </form>
          <ul className="list">
            {events.map((event) => (
              <li key={event.id}>
                <div>
                  <strong>{event.name}</strong>
                  <p className="muted">
                    Budget ${event.allocatedAmount?.toFixed(2) ?? '0.00'} · Actual ${event.actualBalance?.toFixed(2) ?? '0.00'} · Projected ${
                      event.projectedBalance?.toFixed(2) ?? '0.00'
                    }
                  </p>
                </div>
                <div className="row-actions">
                  <button className="link" type="button" onClick={() => onEditEvent(event)}>
                    Edit
                  </button>
                  <button className="link danger" type="button" onClick={() => deleteEvent(event.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
            </article>
          </section>
        </div>

        <aside className="dashboard-sidebar">
          {activeBudget ? (
            <>
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
                    <h3>{events.length}</h3>
                  </div>
                </div>
              </article>

              <article className="card">
                <div className="section-header">
                  <div>
                    <h3>Upcoming cash flow</h3>
                    <p className="muted">Next {projectionWindowDays} days</p>
                  </div>
                  <span className="badge bg-light text-dark">
                    {upcomingSummary.count} entries
                  </span>
                </div>
                {analytics.upcoming?.length ? (
                  <ul className="timeline">
                    {analytics.upcoming.map((tx) => (
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

              <article className="card status-card">
                <div className="section-header">
                  <div>
                    <h3>Insights</h3>
                    <p className="muted">Deadlines & categories</p>
                  </div>
                </div>
                <div className="deadline-pills">
                  {DEADLINE_STATUS_ORDER.map((status) => (
                    <span key={status} className="tag">
                      {DEADLINE_STATUS_LABELS[status]}: {deadlineBreakdown[status] || 0}
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
            </>
          ) : (
            <article className="card text-center">
              <h3>Set up a budget</h3>
              <p className="muted">Create your first academic year budget to unlock analytics, exports, and insights.</p>
            </article>
          )}
        </aside>
      </section>

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

      {loading ? <p className="muted">Refreshing data…</p> : null}
    </main>
  );
}

function ReceiptUploader({ transactionId, receiptUrl, uploadReceipt }) {
  const [busy, setBusy] = useState(false);
  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await uploadReceipt(transactionId, file);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };
  return (
    <div className="receipt-uploader">
      {receiptUrl ? (
        <a className="link" href={receiptUrl} target="_blank" rel="noreferrer">
          View
        </a>
      ) : (
        <span className="muted">No file</span>
      )}
      <label className="link">
        {busy ? 'Uploading…' : 'Upload'}
        <input type="file" onChange={handleChange} style={{ display: 'none' }} accept="image/*,application/pdf" />
      </label>
    </div>
  );
}
