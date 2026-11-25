import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, ShieldCheck } from 'lucide-react';
import { api, post } from '../../services/api';
import { PageIntro, ErrorNotice, ButtonLink, Loading } from '../../components/ui';
function useLinkToken() {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '',
  );
  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      );
  }, []);
  return token;
}
export function ForgotPassword() {
  return <RequestLink />;
}
function RequestLink({ verification = false }: { verification?: boolean }) {
  const [email, setEmail] = useState(''),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const capabilities = useQuery({
    queryKey: ['auth', 'capabilities'],
    queryFn: () =>
      api<{ passwordReset: boolean; emailVerification: boolean }>('/auth/capabilities'),
  });
  const enabled = verification
    ? capabilities.data?.emailVerification
    : capabilities.data?.passwordReset;
  return (
    <div className="container page narrow">
      <PageIntro
        eyebrow="YOUR ACCOUNT"
        title={verification ? 'Confirm your email.' : 'A fresh start.'}
        description={
          verification
            ? 'Request a link to verify the email address on your account.'
            : 'Enter your account email to request a secure password reset link.'
        }
      />
      <div className="form-panel">
        <Mail size={28} />
        {capabilities.isLoading ? (
          <Loading />
        ) : capabilities.error ? (
          <ErrorNotice error={capabilities.error} retry={() => void capabilities.refetch()} />
        ) : !enabled ? (
          <div className="notice">
            Account email is currently unavailable.{' '}
            <Link to="/support" className="underlined">
              Contact support for help.
            </Link>
          </div>
        ) : sent ? (
          <p role="status">
            If an eligible account uses this email, a link will arrive shortly. Check your spam
            folder. You can close this page.
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(undefined);
              try {
                await post(verification ? '/auth/verification-request' : '/auth/forgot-password', {
                  email,
                });
                setSent(true);
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {!!error && <ErrorNotice error={error} />}
            <button className="button" disabled={busy}>
              {busy ? 'Requesting link…' : 'Send secure link'}
            </button>
          </form>
        )}
        <Link className="text-button" to="/login">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
export function ResetPassword() {
  const token = useLinkToken();
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState<unknown>();
  const qc = useQueryClient();
  return (
    <div className="container page narrow">
      <PageIntro
        eyebrow="ACCOUNT RECOVERY"
        title="Make it a strong one."
        description="Choose a new password with at least 12 characters. Resetting signs out all your existing sessions."
      />
      <div className="form-panel">
        {done ? (
          <>
            <p role="status">Your password is updated. Sign in with your new password.</p>
            <ButtonLink to="/login">Sign in</ButtonLink>
          </>
        ) : !token ? (
          <>
            <p>This page needs the secure link from your email.</p>
            <ButtonLink to="/forgot-password">Request a new link</ButtonLink>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (password !== confirm) {
                setError(new Error('Your passwords must match.'));
                return;
              }
              setBusy(true);
              setError(undefined);
              try {
                await post('/auth/reset-password', { token, newPassword: password });
                qc.clear();
                setDone(true);
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              New password
              <input
                type="password"
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {!!error && <ErrorNotice error={error} />}
            <button className="button" disabled={busy}>
              {busy ? 'Updating…' : 'Reset password'}
            </button>
            <Link className="text-button" to="/forgot-password">
              Request another link
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
export function VerifyEmail() {
  const token = useLinkToken();
  const [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const qc = useQueryClient();
  if (!token) return <RequestLink verification />;
  return (
    <div className="container page narrow">
      <PageIntro
        eyebrow="YOUR ACCOUNT"
        title="One small confirmation."
        description="Confirm that this email address belongs to you."
      />
      <div className="form-panel">
        <ShieldCheck size={28} />
        {done ? (
          <>
            <p role="status">Your email is verified.</p>
            <ButtonLink to="/account">Your account</ButtonLink>
          </>
        ) : (
          <>
            <p>Choose Verify email to complete this step. Links can be used only once.</p>
            {!!error && <ErrorNotice error={error} />}
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(undefined);
                try {
                  await post('/auth/verify-email', { token });
                  await qc.invalidateQueries({ queryKey: ['me'] });
                  setDone(true);
                } catch (e) {
                  setError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Verifying…' : 'Verify email'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
