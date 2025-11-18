import { useEffect, useMemo, useState } from 'react';
import useDashboardData from '../hooks/useDashboardData.js';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import BudgetSwitcher from '../components/dashboard/BudgetSwitcher.jsx';
import TransactionsPanel from '../components/dashboard/TransactionsPanel.jsx';
import DeadlinesPanel from '../components/dashboard/DeadlinesPanel.jsx';
import EventsPanel from '../components/dashboard/EventsPanel.jsx';
import BudgetPulsePanel from '../components/dashboard/BudgetPulsePanel.jsx';
import UpcomingPanel from '../components/dashboard/UpcomingPanel.jsx';
import InsightsPanel from '../components/dashboard/InsightsPanel.jsx';
import ChartsSection from '../components/dashboard/ChartsSection.jsx';
import ArchivedBudgets from '../components/dashboard/ArchivedBudgets.jsx';

const datetimeLocal = (timestamp = Date.now()) => new Date(timestamp).toISOString().slice(0, 16);
const toUnix = (value) => Math.floor(new Date(value).getTime() / 1000);

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
      <DashboardHeader
        user={user}
        logout={logout}
        exportsBaseUrl={exportsBaseUrl}
        activeBudget={activeBudget}
        transactionTotals={transactionTotals}
        deadlineBreakdown={deadlineBreakdown}
        nextDeadline={nextDeadline}
        upcomingSummary={upcomingSummary}
        projectionWindowDays={projectionWindowDays}
        topCategory={topCategory}
      />

      {error ? <p className="error-text">{error}</p> : null}

      <section className="dashboard-grid">
        <div className="dashboard-main">
          <div className="anchor-section" id="budgets">
            <BudgetSwitcher
              budgets={budgets}
              selectedBudgetId={selectedBudgetId}
              setSelectedBudgetId={setSelectedBudgetId}
              budgetForm={budgetForm}
              setBudgetForm={setBudgetForm}
              handleBudgetCreate={handleBudgetCreate}
            />
            <ArchivedBudgets archivedBudgets={archivedBudgets} setSelectedBudgetId={setSelectedBudgetId} />
          </div>

          <div className="anchor-section" id="transactions">
            <TransactionsPanel
              transactionForm={transactionForm}
              setTransactionForm={setTransactionForm}
              handleTransactionSubmit={handleTransactionSubmit}
              selectedBudgetId={selectedBudgetId}
              events={events}
              editingTransaction={editingTransaction}
              setEditingTransaction={setEditingTransaction}
              transactions={transactions}
              onEditTransaction={onEditTransaction}
              deleteTransaction={deleteTransaction}
              uploadReceipt={uploadReceipt}
            />
          </div>

          <section className="grid two-up stack-panels anchor-section" id="planning">
            <DeadlinesPanel
              deadlineForm={deadlineForm}
              setDeadlineForm={setDeadlineForm}
              handleDeadlineSubmit={handleDeadlineSubmit}
              editingDeadline={editingDeadline}
              setEditingDeadline={setEditingDeadline}
              deadlines={deadlines}
              deleteDeadline={deleteDeadline}
              onEditDeadline={onEditDeadline}
              deadlineStatusOrder={DEADLINE_STATUS_ORDER}
              deadlineStatusLabels={DEADLINE_STATUS_LABELS}
              deadlineBreakdown={deadlineBreakdown}
            />
            <EventsPanel
              eventForm={eventForm}
              setEventForm={setEventForm}
              handleEventSubmit={handleEventSubmit}
              editingEvent={editingEvent}
              setEditingEvent={setEditingEvent}
              events={events}
              deleteEvent={deleteEvent}
              onEditEvent={onEditEvent}
            />
          </section>
        </div>

        <aside className="dashboard-sidebar">
          {activeBudget ? (
            <>
              <BudgetPulsePanel budgetHealth={budgetHealth} transactionTotals={transactionTotals} eventsCount={events.length} />
              <UpcomingPanel
                projectionWindowDays={projectionWindowDays}
                upcomingSummary={upcomingSummary}
                upcomingList={analytics.upcoming}
              />
              <InsightsPanel
                deadlineStatusOrder={DEADLINE_STATUS_ORDER}
                deadlineStatusLabels={DEADLINE_STATUS_LABELS}
                deadlineBreakdown={deadlineBreakdown}
                topCategory={topCategory}
                nextDeadline={nextDeadline}
              />
            </>
          ) : (
            <article className="card text-center">
              <h3>Set up a budget</h3>
              <p className="muted">Create your first academic year budget to unlock analytics, exports, and insights.</p>
            </article>
          )}
        </aside>
      </section>

      <div id="analytics" className="anchor-section">
        <ChartsSection analytics={analytics} />
      </div>

      {loading ? <p className="muted">Refreshing data…</p> : null}
    </main>
  );
}
