import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils.js';

export function Spinner({ className }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden="true" />;
}

export function PageLoader({ label = 'Loading TaskPulse…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-muted">{label}</p>
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3, className }) {
  return (
    <div className={cn('grid gap-5', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card p-5">
          <div className="flex items-center gap-3">
            <div className="skeleton h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="skeleton h-14" />
            <div className="skeleton h-14" />
            <div className="skeleton h-14" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 5 }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <div className="skeleton h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-2/5" />
            <div className="skeleton h-3 w-1/4" />
          </div>
          <div className="skeleton hidden h-6 w-24 sm:block" />
          <div className="skeleton hidden h-6 w-20 md:block" />
        </div>
      ))}
    </div>
  );
}
