import { useEffect, useMemo, useRef, useState } from 'react';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatCurrency = (value = 0) => currency.format(Number(value || 0));

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
  const [showForm, setShowForm] = useState(false);
  const { totalAllocated, totalActual, totalProjected } = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        acc.totalAllocated += Number(event.allocatedAmount || 0);
        acc.totalActual += Number(event.actualBalance || 0);
        acc.totalProjected += Number(event.projectedBalance || 0);
        return acc;
      },
      { totalAllocated: 0, totalActual: 0, totalProjected: 0 }
    );
  }, [events]);
  const eventList = useMemo(() => {
    return [...events].sort((a, b) => {
      const startDiff = (b.startTs || 0) - (a.startTs || 0);
      if (startDiff !== 0) return startDiff;
      return b.id - a.id;
    });
  }, [events]);
  const listRef = useRef(null);
  const previousLengthRef = useRef(events.length);

  useEffect(() => {
    if (editingEvent) {
      setShowForm(true);
    }
  }, [editingEvent]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [eventList.length]);

  useEffect(() => {
    if (!editingEvent && events.length > previousLengthRef.current) {
      setShowForm(false);
    }
    previousLengthRef.current = events.length;
  }, [events.length, editingEvent]);

  const toggleForm = () => setShowForm((prev) => !prev);

  return (
    <article className="card event-panel">
      <div className="section-header event-panel__header">
        <div>
          <h3>Event studio</h3>
          <p className="muted">Organize initiatives and see how they track against plan.</p>
        </div>
        <div className="event-stats">
          <span className="pill pill--light">{events.length} active</span>
          <span className="pill pill--outline">Budget {formatCurrency(totalAllocated)}</span>
          <span className="pill pill--outline">Actual {formatCurrency(totalActual)}</span>
          <span className="pill pill--outline">Projected {formatCurrency(totalProjected)}</span>
        </div>
        <button type="button" className="ghost-link" onClick={toggleForm}>
          {showForm ? 'Hide form' : 'New initiative'} →
        </button>
      </div>

      <div className="event-panel__body">
        <div className="event-cards" ref={listRef}>
          {eventList.length ? (
            eventList.map((event) => {
              const allocated = Number(event.allocatedAmount || 0);
              const actual = Number(event.actualBalance || 0);
              const projected = Number(event.projectedBalance || 0);
              const utilization = allocated ? Math.min(100, Math.round((actual / allocated) * 100)) : 0;
              const endTimestamp = Number(event.endTs || 0);
              const endLabel = endTimestamp ? new Date(endTimestamp * 1000).toLocaleDateString() : 'Flexible timeline';

              return (
                <article key={event.id} className="event-card">
                  <div className="event-card__header">
                    <div>
                      <h4>{event.name}</h4>
                      <p className="muted">
                        {allocated ? `${formatCurrency(allocated)} budgeted` : 'No budget yet'} · {formatCurrency(actual)} actual ·{' '}
                        {formatCurrency(projected)} projected
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
                  </div>
                  <div className="progress-bar">
                    <span style={{ width: `${utilization}%` }} />
                  </div>
                  <div className="event-card__meta">
                    <span>Utilization {utilization}%</span>
                    <span>Ends {endLabel}</span>
                  </div>
                </article>
              );
            })
          ) : (
            <article className="empty-state">
              <p className="muted mb-0">No initiatives yet. Start one with the form.</p>
            </article>
          )}
        </div>

        <div className={`event-form ${showForm ? 'is-open' : ''}`}>
          {showForm ? (
            <form className="form-grid" onSubmit={handleEventSubmit}>
              <div className="form-header">
                <h4>{editingEvent ? 'Edit initiative' : 'Create initiative'}</h4>
                <p className="muted">Quickly spin up a budget bucket for retreats, outreach, or fundraisers.</p>
              </div>
              <label className="form-grid__span">
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
              <label className="form-grid__span">
                Notes
                <textarea value={eventForm.notes} onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </label>
              <div className="form-actions form-grid__span">
                {editingEvent ? (
                  <button className="secondary" type="button" onClick={() => setEditingEvent(null)}>
                    Cancel edit
                  </button>
                ) : null}
                <button className="primary" type="submit">
                  {editingEvent ? 'Update initiative' : 'Add initiative'}
                </button>
              </div>
            </form>
          ) : (
            <div className="planning-panel__placeholder">
              <p className="muted">Need a new initiative?</p>
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
