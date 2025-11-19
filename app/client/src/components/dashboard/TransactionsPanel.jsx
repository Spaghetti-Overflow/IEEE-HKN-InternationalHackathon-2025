import { useEffect, useState } from 'react';
import ReceiptUploader from './ReceiptUploader.jsx';
import useMediaQuery from '../../hooks/useMediaQuery.js';

export default function TransactionsPanel({
  transactionForm,
  setTransactionForm,
  handleTransactionSubmit,
  selectedBudgetId,
  events,
  editingTransaction,
  setEditingTransaction,
  transactions,
  onEditTransaction,
  deleteTransaction,
  uploadReceipt
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    if (editingTransaction) {
      setShowForm(true);
      return;
    }
    setShowForm(!isMobile);
  }, [isMobile, editingTransaction]);

  return (
    <section className="card">
      <div className="section-header section-header--stack">
        <div>
          <h3>Transactions</h3>
          <p className="muted">Track incomes, expenses, recurring or planned entries.</p>
        </div>
        <div className="section-header__actions">
          <span className="badge bg-light text-dark">{transactions.length} entries</span>
          <button
            type="button"
            className="ghost-link mobile-form-toggle mobile-only"
            onClick={() => setShowForm((prev) => !prev)}
            aria-expanded={showForm}
          >
            {showForm ? 'Hide form' : 'Add transaction'}
          </button>
        </div>
      </div>
      <div className={`panel-form ${showForm ? 'is-open' : 'is-collapsed'}`}>
        {showForm ? (
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
              <input
                value={transactionForm.category}
                onChange={(e) => setTransactionForm((prev) => ({ ...prev, category: e.target.value }))}
                required
              />
            </label>
            <label>
              Timestamp
              <input
                type="datetime-local"
                value={transactionForm.timestamp}
                onChange={(e) => setTransactionForm((prev) => ({ ...prev, timestamp: e.target.value }))}
                required
              />
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
        ) : (
          <p className="muted mobile-only form-hint">Tap “Add transaction” to open the form.</p>
        )}
      </div>

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
                <td data-label="Type">{tx.type}</td>
                <td data-label="Status">
                  <span className={`tag tag--${tx.status}`}>{tx.status}</span>
                </td>
                <td data-label="Amount">${tx.amount.toFixed(2)}</td>
                <td data-label="Category">{tx.category}</td>
                <td data-label="Date">{new Date(tx.timestamp * 1000).toLocaleString()}</td>
                <td data-label="Event">{tx.eventName || '—'}</td>
                <td data-label="Notes">{tx.notes || '—'}</td>
                <td data-label="Receipt">
                  <ReceiptUploader transactionId={tx.id} receiptUrl={tx.receiptUrl} uploadReceipt={uploadReceipt} />
                </td>
                <td className="row-actions" data-label="Actions">
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
  );
}
