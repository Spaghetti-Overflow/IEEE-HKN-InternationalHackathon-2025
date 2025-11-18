import { format } from 'date-fns';

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
  return (
    <article className="card">
      <div className="section-header">
        <div>
          <h3>Deadlines</h3>
          <p className="muted">Keep funding milestones in sight.</p>
        </div>
        <div className="deadline-pills">
          {deadlineStatusOrder.map((status) => (
            <span key={status} className="tag">
              {deadlineStatusLabels[status]}: {deadlineBreakdown[status] || 0}
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
          <input
            type="datetime-local"
            value={deadlineForm.dueTimestamp}
            onChange={(e) => setDeadlineForm((prev) => ({ ...prev, dueTimestamp: e.target.value }))}
            required
          />
        </label>
        <label>
          Category
          <input value={deadlineForm.category} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, category: e.target.value }))} />
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
        <label>
          Link
          <input value={deadlineForm.link} onChange={(e) => setDeadlineForm((prev) => ({ ...prev, link: e.target.value }))} />
        </label>
        <label>
          Notes
          <textarea
            value={deadlineForm.description}
            onChange={(e) => setDeadlineForm((prev) => ({ ...prev, description: e.target.value }))}
          />
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
              <p className="muted">
                {format(deadline.dueTimestamp * 1000, 'PPpp')} · {deadline.status}
              </p>
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
  );
}
