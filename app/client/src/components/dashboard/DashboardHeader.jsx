import { useState } from 'react';
import { FiDownloadCloud, FiFileText, FiLogOut, FiMenu, FiShield, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import useMediaQuery from '../../hooks/useMediaQuery.js';

const NAV_ITEMS = [
  { label: 'Overview', target: 'overview' },
  { label: 'Budgets', target: 'budgets' },
  { label: 'Transactions', target: 'transactions' },
  { label: 'Planning', target: 'planning' },
  { label: 'Analytics', target: 'analytics' }
];

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatCurrency = (value = 0) => usd.format(Number(value || 0));

export default function DashboardHeader({
  user,
  logout,
  exportsBaseUrl,
  activeBudget,
  transactionTotals,
  deadlineBreakdown,
  nextDeadline,
  upcomingSummary,
  projectionWindowDays,
  topCategory
}) {
  const [navOpen, setNavOpen] = useState(false);
  const isCompactHero = useMediaQuery('(max-width: 640px)');
  const scrollToSection = (target) => {
    if (typeof window === 'undefined') return;
    const anchor = target === 'overview' ? document.querySelector('.dashboard') : document.getElementById(target);
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const handleNavClick = (target) => {
    scrollToSection(target);
    setNavOpen(false);
  };
  const closeNav = () => setNavOpen(false);
  const deadlineCounts = deadlineBreakdown || {};
  const totalDeadlines = Object.values(deadlineCounts).reduce((acc, count) => acc + count, 0);
  const openDeadlines = deadlineCounts.open || 0;
  const deadlineLabel = totalDeadlines ? `${openDeadlines}/${totalDeadlines} deadlines open` : 'No deadlines logged yet';
  const upcomingNet = upcomingSummary?.net ?? 0;
  const upcomingIncome = upcomingSummary?.incomes ?? 0;
  const upcomingExpense = upcomingSummary?.expenses ?? 0;
  const upcomingCount = upcomingSummary?.count ?? 0;
  const upcomingIsPositive = upcomingNet >= 0;
  const nextDeadlineDate = nextDeadline ? new Date(nextDeadline.dueTimestamp * 1000) : null;
  const topCategoryIncome = topCategory?.incomes ?? 0;
  const topCategoryExpense = topCategory?.expenses ?? 0;
  const topCategoryTotal = topCategoryIncome + topCategoryExpense;
  const hasTopCategory = Boolean(topCategory);

  return (
    <header className="dashboard-header">
      <nav className={`app-nav card card--glass ${navOpen ? 'app-nav--open' : ''}`}>
        <div className="nav-header-row">
          <div className="brand nav-brand">
            <span className="brand__dot" />
            <div>
              <p className="muted text-uppercase mb-0">IEEE-HKN</p>
              <h2>Budget HQ</h2>
            </div>
          </div>
          <button
            type="button"
            className="nav-toggle mobile-only"
            aria-expanded={navOpen}
            aria-controls="dashboard-nav-sections"
            onClick={() => setNavOpen((prev) => !prev)}
          >
            {navOpen ? <FiX /> : <FiMenu />}
            <span>{navOpen ? 'Close' : 'Menu'}</span>
          </button>
        </div>
        <div id="dashboard-nav-sections" className="nav-collapsible" data-open={navOpen}>
          <div className="nav-links">
            {NAV_ITEMS.map((item) => (
              <button key={item.target} type="button" onClick={() => handleNavClick(item.target)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="nav-actions">
            {exportsBaseUrl ? (
              <div className="btn-group flex-wrap">
                <a className="btn btn-primary-soft" href={`${exportsBaseUrl}/csv`} target="_blank" rel="noreferrer" onClick={closeNav}>
                  <FiDownloadCloud /> CSV
                </a>
                <a className="btn btn-outline-primary" href={`${exportsBaseUrl}/pdf`} target="_blank" rel="noreferrer" onClick={closeNav}>
                  <FiFileText /> PDF
                </a>
              </div>
            ) : (
              <span className="muted small">Create a budget to enable exports</span>
            )}
            <Link className="btn btn-outline-primary" to="/security" onClick={closeNav}>
              <FiShield /> Security
            </Link>
            <button className="btn btn-outline-dark" onClick={() => { closeNav(); logout(); }}>
              <FiLogOut /> Logout ({user?.displayName || user?.username})
            </button>
          </div>
        </div>
      </nav>

      <section id="overview" className={`hero card hero-card ${isCompactHero ? 'hero--compact' : ''}`}>
        <div className="hero__text">
          <p className="muted text-uppercase">Smart Budget Scheduler</p>
          <h1>{activeBudget ? activeBudget.name : 'Plan your first chapter budget'}</h1>
          <p className={`hero__subtitle ${isCompactHero ? 'hero__subtitle--compact' : ''}`}>
            {activeBudget
              ? `Academic year ${activeBudget.academicLabel}`
              : 'Create a budget to unlock tracking, deadlines, and analytics.'}
          </p>
          <div className={`hero__meta ${isCompactHero ? 'hero__meta--scroll' : ''}`}>
            <span className="pill pill--light">Actual {formatCurrency(transactionTotals.actual)}</span>
            <span className="pill pill--light">Projected {formatCurrency(transactionTotals.projected)}</span>
            <span className="pill pill--outline">{deadlineLabel}</span>
          </div>
        </div>
        <div className={`hero-panels ${isCompactHero ? 'hero-panels--carousel' : ''}`}>
          <article className={`hero-panel ${isCompactHero ? 'hero-panel--compact' : ''}`}>
            <p className="hero-panel__eyebrow">Next milestone</p>
            {nextDeadlineDate ? (
              <>
                <h3>{nextDeadline.title}</h3>
                <p className="hero-panel__value">{format(nextDeadlineDate, 'PP')}</p>
                <p className="hero-panel__muted">
                  {format(nextDeadlineDate, 'p')} · {formatDistanceToNow(nextDeadlineDate, { addSuffix: true })}
                </p>
                <div className="hero-panel__footer">
                  <span className="hero-chip">{openDeadlines} open</span>
                  <button type="button" className="ghost-link ghost-link--light" onClick={() => scrollToSection('planning')}>
                    View planning →
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Plan the next win</h3>
                <p className="hero-panel__muted">
                  No deadlines on the radar. Schedule grants or dues reminders to stay ahead.
                </p>
                <button type="button" className="ghost-link ghost-link--light" onClick={() => scrollToSection('planning')}>
                  Add milestone →
                </button>
              </>
            )}
          </article>
          <article className={`hero-panel ${isCompactHero ? 'hero-panel--compact' : ''}`}>
            <p className="hero-panel__eyebrow">Upcoming cash flow</p>
            <p className={`hero-panel__value ${upcomingIsPositive ? 'hero-panel__value--positive' : 'hero-panel__value--negative'}`}>
              {upcomingIsPositive ? '+' : '-'}
              {formatCurrency(Math.abs(upcomingNet))}
            </p>
            <p className="hero-panel__muted">
              {upcomingCount ? `${upcomingCount} entries next ${projectionWindowDays} days` : `Nothing scheduled for next ${projectionWindowDays} days`}
            </p>
            <div className="hero-panel__split">
              <div>
                <span className="hero-chip hero-chip--soft">In</span>
                <strong>{formatCurrency(upcomingIncome)}</strong>
              </div>
              <div>
                <span className="hero-chip hero-chip--soft hero-chip--danger">Out</span>
                <strong>{formatCurrency(upcomingExpense)}</strong>
              </div>
            </div>
          </article>
          <article className={`hero-panel ${isCompactHero ? 'hero-panel--compact' : ''}`}>
            <p className="hero-panel__eyebrow">Top category</p>
            {hasTopCategory ? (
              <>
                <h3>{topCategory.category}</h3>
                <p className="hero-panel__value">{formatCurrency(topCategoryTotal)}</p>
                <p className="hero-panel__muted">
                  {formatCurrency(topCategoryExpense)} out · {formatCurrency(topCategoryIncome)} in
                </p>
                <button type="button" className="ghost-link ghost-link--light" onClick={() => scrollToSection('analytics')}>
                  Review analytics →
                </button>
              </>
            ) : (
              <>
                <h3>No category leader</h3>
                <p className="hero-panel__muted">Categorize a few transactions to surface spending hot spots.</p>
                <button type="button" className="ghost-link ghost-link--light" onClick={() => scrollToSection('transactions')}>
                  Review transactions →
                </button>
              </>
            )}
          </article>
        </div>
      </section>
    </header>
  );
}
