import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { dashboardPath } from '../lib/utils.js';

export default function NotFound() {
  const { user } = useAuth();
  const destination = user ? dashboardPath(user.role) : '/login';
  const label = user ? 'Back to dashboard' : 'Go to sign in';

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Compass className="h-7 w-7" />
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Page not found
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
            This page does not exist
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The link may be broken, or the page may have moved. Your work is still safe.
          </p>
          <Link to={destination} className="btn-primary mt-6 w-full">
            <ArrowLeft className="h-4 w-4" />
            {label}
          </Link>
        </div>
      </div>
    </div>
  );
}
