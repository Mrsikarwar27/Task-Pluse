import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getApiErrorMessage } from '../lib/api.js';
import { dashboardPath } from '../lib/utils.js';
import { PageLoader } from '../components/LoadingState.jsx';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign in · TaskPulse';
  }, []);

  if (loading) return <PageLoader label="Checking your session…" />;
  if (user) return <Navigate to={dashboardPath(user.role)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password to sign in.');
      return;
    }
    setSubmitting(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      navigate(dashboardPath(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary-soft blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-accent-soft/70 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-1/4 h-24 w-24 rounded-full border border-[#F3DFCF]" />

      <div className="relative w-full max-w-[430px]">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>

        <div className="card p-6 sm:p-8">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              Welcome back
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
              Sign in to TaskPulse
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Manage assigned work, status updates and queries in one place.
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#FCD9C4] bg-primary-soft px-3.5 py-3 text-sm font-medium text-primary"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input pl-10 pr-11"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-primary-soft hover:text-primary"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary mt-2 w-full py-3" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-line pt-5 text-center">
            <p className="text-xs leading-relaxed text-muted">
              Access is created by your administrator. There is no public sign-up.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] font-medium text-muted">
          TaskPulse · Work assignments, kept in sync
        </p>
      </div>
    </div>
  );
}
