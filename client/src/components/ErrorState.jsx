import { AlertTriangle, RotateCw } from 'lucide-react';

export default function ErrorState({ message, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-[#FCD9C4] bg-primary-soft p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <button type="button" className="btn-secondary btn-sm shrink-0" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Try again
        </button>
      ) : null}
    </div>
  );
}
