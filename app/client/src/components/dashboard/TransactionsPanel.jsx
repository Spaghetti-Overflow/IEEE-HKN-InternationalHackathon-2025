import ReceiptUploader from './ReceiptUploader.jsx';

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
  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h3>Transactions</h3>
          <p className="muted">Track incomes, expenses, recurring or planned entries.</p>
        </div>
        <span className="badge bg-light text-dark">{transactions.length} entries</span>
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
                <td>{new Date(tx.timestamp * 1000).toLocaleString()}</td>
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
  );
}
