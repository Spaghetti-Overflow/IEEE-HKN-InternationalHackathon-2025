import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function SecurityPanel({ user }) {
  const { requestTotpSetup, verifyTotpSetup, disableTotp } = useAuth();
  const [setupInfo, setSetupInfo] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.totpEnabled) {
      setSetupInfo(null);
      setCode('');
    }
  }, [user?.totpEnabled]);

  const beginSetup = async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const data = await requestTotpSetup();
      setSetupInfo(data);
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to start setup';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyTotpSetup({ code });
      setSetupInfo(null);
      setCode('');
      setFeedback('Two-factor authentication enabled.');
    } catch (err) {
      const message = err?.response?.data?.message || 'Code did not match';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await disableTotp({ code });
      setCode('');
      setFeedback('Two-factor authentication disabled.');
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to disable two-factor';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderSetup = () => (
    <>
      <p className="muted">
        Scan the QR code below with Google Authenticator, 1Password, or any TOTP-compatible app. Enter the 6-digit code to
        confirm enrollment.
      </p>
      {setupInfo?.qrDataUrl ? (
        <img src={setupInfo.qrDataUrl} alt="Authenticator QR code" className="totp-qr" />
      ) : null}
      {setupInfo?.secret ? (
        <p className="tiny muted">Manual entry code: {setupInfo.secret}</p>
      ) : null}
      <form className="stack" onSubmit={confirmSetup}>
        <label>
          Verification code
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{6}"
            required
          />
        </label>
        <div className="form-utility-row form-utility-row--split">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setSetupInfo(null)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify & enable'}
          </button>
        </div>
      </form>
    </>
  );

  const renderDisable = () => (
    <form className="stack" onSubmit={handleDisable}>
      <p className="muted">
        Enter a current code from your authenticator app to turn off two-factor. We recommend disabling only if you have a
        backup plan in place.
      </p>
      <label>
        Verification code
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="123456"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]{6}"
          required
        />
      </label>
      <div className="form-utility-row">
        <span className="muted tiny">Need to disable? Confirm with a fresh code below.</span>
        <button className="btn btn-outline-danger" type="submit" disabled={loading}>
          {loading ? 'Disabling…' : 'Disable two-factor'}
        </button>
      </div>
    </form>
  );

  return (
    <article className="card security-card">
      <h3>Account security</h3>
      <p className="muted">
        Protect chapter funds with TOTP-based multi-factor authentication. Only hardware or authenticator apps can produce the
        rotating codes.
      </p>
      {feedback ? <p className="text-success small">{feedback}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {user?.totpEnabled ? (
        <>
          <p className="pill pill--soft">Two-factor is active</p>
          {renderDisable()}
        </>
      ) : setupInfo ? (
        renderSetup()
      ) : (
        <button className="btn btn-outline-primary" onClick={beginSetup} disabled={loading}>
          {loading ? 'Generating…' : 'Enable two-factor login'}
        </button>
      )}
    </article>
  );
}
