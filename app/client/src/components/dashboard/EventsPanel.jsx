export default function EventsPanel({
  eventForm,
  setEventForm,
  handleEventSubmit,
  editingEvent,
  setEditingEvent,
  events,
  deleteEvent,
  onEditEvent
}) {
  return (
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
          <input
            type="datetime-local"
            value={eventForm.startTs}
            onChange={(e) => setEventForm((prev) => ({ ...prev, startTs: e.target.value }))}
          />
        </label>
        <label>
          End
          <input
            type="datetime-local"
            value={eventForm.endTs}
            onChange={(e) => setEventForm((prev) => ({ ...prev, endTs: e.target.value }))}
          />
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
                Budget ${event.allocatedAmount?.toFixed(2) ?? '0.00'} · Actual ${event.actualBalance?.toFixed(2) ?? '0.00'} · Projected $
                {event.projectedBalance?.toFixed(2) ?? '0.00'}
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
  );
}
