import { Link } from 'react-router-dom';
import { FiCheckCircle, FiShield, FiSmartphone } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import SecurityPanel from '../components/dashboard/SecurityPanel.jsx';

export default function SecurityPage() {
  const { user } = useAuth();
  const totpEnabled = Boolean(user?.totpEnabled);

  return (
    <main className="security-page container-xxl">
      <section className="security-hero card card--glass">
        <div className="security-hero__icon">
          <FiShield size={32} />
        </div>
        <div className="security-hero__text">
          <p className="pill pill--soft text-uppercase">Account controls</p>
          <h1>Secure your treasury access</h1>
          <p className="muted">
            Add a rotating 6-digit passcode to your sign-in flow. Scan a QR code with any authenticator app, confirm the code, and keep
            sensitive budget data locked down.
          </p>
          <div className="security-stats">
            <article>
              <p className="muted tiny">Protection status</p>
              <strong className={totpEnabled ? 'text-success' : 'text-warning'}>
                {totpEnabled ? 'Two-factor active' : 'Two-factor off'}
              </strong>
            </article>
            <article>
              <p className="muted tiny">Setup time</p>
              <strong>~2 minutes</strong>
            </article>
          </div>
        </div>
        <Link className="btn btn-outline-light" to="/dashboard">
          ← Back to dashboard
        </Link>
      </section>

      <section className="security-page__body">
        <SecurityPanel user={user} />
        <aside className="security-side">
          <article className="card security-steps">
            <h3>How it works</h3>
            <ol>
              <li>
                <FiSmartphone />
                <div>
                  <strong>Install an authenticator</strong>
                  <p className="muted">Google Authenticator, Authy, Microsoft Authenticator, 1Password, etc.</p>
                </div>
              </li>
              <li>
                <FiShield />
                <div>
                  <strong>Scan the QR code</strong>
                  <p className="muted">Use the in-app camera or enter the manual code to add “Budget HQ.”</p>
                </div>
              </li>
              <li>
                <FiCheckCircle />
                <div>
                  <strong>Confirm with a 6-digit code</strong>
                  <p className="muted">Enter the current code to enable or disable protection.</p>
                </div>
              </li>
            </ol>
            <p className="muted tiny security-note">
              Lost your phone? Ask a chapter admin to reset TOTP in the database, then re-enroll here.
            </p>
          </article>
        </aside>
      </section>
    </main>
  );
}
