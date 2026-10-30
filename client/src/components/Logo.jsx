import { Activity } from 'lucide-react';
import { cn } from '../lib/utils.js';

export default function Logo({ compact = false, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_18px_-10px_rgba(163,57,0,0.9)]">
        <Activity className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="text-[19px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
            Task<span className="text-primary">Pulse</span>
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Work assignments
          </div>
        </div>
      )}
    </div>
  );
}
