import { cn, dueInfo } from '../lib/utils.js';

const toneStyles = {
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  neutral: 'text-muted',
};

export default function DueLabel({ deadline, status, className }) {
  const info = dueInfo(deadline, status);
  return (
    <span className={cn('whitespace-nowrap text-xs font-semibold', toneStyles[info.tone], className)}>
      {info.label}
    </span>
  );
}
