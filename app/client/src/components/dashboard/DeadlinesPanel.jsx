import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';

const STATUS_ALL = 'all';

export default function DeadlinesPanel({
  deadlineForm,
  setDeadlineForm,
  handleDeadlineSubmit,
  editingDeadline,
  setEditingDeadline,
  deadlines,
  deleteDeadline,
  onEditDeadline,
  deadlineStatusOrder,
  deadlineStatusLabels,
  deadlineBreakdown
}) {
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [showForm, setShowForm] = useState(false);
  const breakdown = deadlineBreakdown || {};
  const previousLengthRef = useRef(deadlines.length);
  const sortedDeadlines = useMemo(() => [...deadlines].sort((a, b) => a.dueTimestamp - b.dueTimestamp), [deadlines]);
  const filteredDeadlines = useMemo(() => {
    if (statusFilter === STATUS_ALL) return sortedDeadlines;
    return sortedDeadlines.filter((deadline) => deadline.status === statusFilter);
  }, [sortedDeadlines, statusFilter]);
  const nextDeadline = sortedDeadlines[0];

  useEffect(() => {
    if (editingDeadline) {
      setShowForm(true);
    }
  }, [editingDeadline]);

  useEffect(() => {
    if (!editingDeadline && deadlines.length > previousLengthRef.current) {
      setShowForm(false);
    }
    previousLengthRef.current = deadlines.length;
  }, [deadlines.length, editingDeadline]);

  const toggleForm = () => setShowForm((prev) => !prev);

  return (
    <article className="card planning-panel">
      <div className="section-header planning-panel__header">
        <div>
          <h3>Milestones</h3>
          <p className="muted">Map grant submissions, dues reminders, and reviews.</p>
        </div>
        <div className="planning-panel__actions">
          <div className="planning-pills">
            <span className="pill pill--light">{sortedDeadlines.length} total</span>
            {nextDeadline ? (
              <span className="pill pill--outline">
                Next due {formatDistanceToNow(nextDeadline.dueTimestamp * 1000, { addSuffix: true })}
              </span>
            ) : (
              <span className="pill pill--outline">No milestones yet</span>
            )}
          </div>
          <button type="button" className="ghost-link" onClick={toggleForm}>
            {showForm ? 'Hide form' : 'New milestone'} →
          </button>
        </div>
      </div>

      <div className="chip-group chip-group--flush">
        {[STATUS_ALL, ...deadlineStatusOrder].map((status) => (
          <button
            key={status}
            type="button"
            className={`chip ${statusFilter === status ? 'chip--active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === STATUS_ALL ? 'All' : deadlineStatusLabels[status]} ·{' '}
            {status === STATUS_ALL ? sortedDeadlines.length : breakdown[status] || 0}
          </button>
        ))}
      </div>

      <div className="planning-panel__body">
        <div className="planning-panel__list">
          <ul className="timeline timeline--stacked">
            {filteredDeadlines.length ? (
              filteredDeadlines.map((deadline) => (
                <li key={deadline.id}>
                  <div>
                    <strong>{deadline.title}</strong>
                    <p className="muted">
                      {format(deadline.dueTimestamp * 1000, 'PPpp')} ·{' '}
                      {deadlineStatusLabels[deadline.status] || deadline.status} · Due{' '}
                      {formatDistanceToNow(deadline.dueTimestamp * 1000, { addSuffix: true })}
                    </p>
                  </div>
                  <div className="row-actions">
                    {deadline.link ? (
                      <a className="link" href={deadline.link} target="_blank" rel="noreferrer">
                        Details
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
              ))
            ) : (
              <li className="empty-state">
                <p className="muted mb-0">No milestones for this view yet. Create one to get started.</p>
              </li>
            )}
          </ul>
        </div>

        <div className={`planning-panel__form ${showForm ? 'is-open' : ''}`}>
          {showForm ? (
            <>
              <div className="form-header">
                <h4>{editingDeadline ? 'Edit milestone' : 'Add milestone'}</h4>
                <p className="muted">Capture the deadline, owner, and helpful context.</p>
              </div>
              <form className="form-grid" onSubmit={handleDeadlineSubmit}>
                <label>
                  Title
                  <input value={deadlineForm.title} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, title: e.target.value }))} required />
                </label>
                <label>
                  Category
                  <input value={deadlineForm.category} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, category: e.target.value }))} />
                </label>
                <label>
                  Due date
                  <input
                    type="datetime-local"
                    value={deadlineForm.dueTimestamp}
                    onChange={(e) => setDeadlineForm((prev) => ({ ...prev, dueTimestamp: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Status
                  <select value={deadlineForm.status} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, status: e.target.value }))}>
                    {deadlineStatusOrder.map((status) => (
                      <option key={status} value={status}>
                        {deadlineStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-grid__span">
                  Link or reference
                  <input value={deadlineForm.link} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, link: e.target.value }))} />
                </label>
                <label className="form-grid__span">
                  Notes
                  <textarea
                    rows={3}
                    value={deadlineForm.description}
                    onChange={(e) => setDeadlineForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </label>
                <div className="form-actions form-grid__span">
                  {editingDeadline ? (
                    <button className="secondary" type="button" onClick={() => setEditingDeadline(null)}>
                      Cancel edit
                    </button>
                  ) : null}
                  <button className="primary" type="submit">
                    {editingDeadline ? 'Update milestone' : 'Create milestone'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="planning-panel__placeholder">
              <p className="muted">Ready to add the next milestone?</p>
              <button type="button" className="secondary" onClick={toggleForm}>
                Launch form →
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
