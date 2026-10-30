import { cn } from '../lib/utils.js';

const tones = {
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent-soft text-primary',
  success: 'bg-successSoft text-success',
  danger: 'bg-dangerSoft text-danger',
  warning: 'bg-warningSoft text-warning',
};

export default function StatCard({ icon: Icon, label, value, footer, tone = 'primary', loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted">{label}</p>
          {loading ? (
            <div className="skeleton mt-2 h-9 w-16" />
          ) : (
            <p className="mt-1 text-3xl font-extrabold tracking-[-0.04em] text-ink">
              {value ?? 0}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            tones[tone] || tones.primary
          )}
        >
          {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
        </div>
      </div>
      {footer ? <div className="mt-3 border-t border-line pt-3 text-xs text-muted">{footer}</div> : null}
    </div>
  );
}
