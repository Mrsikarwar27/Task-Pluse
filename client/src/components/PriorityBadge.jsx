import { Flag } from 'lucide-react';
import { cn } from '../lib/utils.js';

const priorityStyles = {
  Low: 'border-[#BBF7D0] bg-successSoft text-success',
  Medium: 'border-[#FDE68A] bg-warningSoft text-warning',
  High: 'border-[#FECACA] bg-dangerSoft text-danger',
};

export default function PriorityBadge({ priority, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        priorityStyles[priority] || priorityStyles.Medium,
        className
      )}
    >
      <Flag className="h-3 w-3" aria-hidden="true" />
      {priority}
    </span>
  );
}
