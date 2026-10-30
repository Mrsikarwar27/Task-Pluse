import { cn } from '../lib/utils.js';

const statusStyles = {
  'Not Started': 'border-[#E7E5E4] bg-[#F5F5F4] text-[#57534E]',
  'In Progress': 'border-[#FCD9C4] bg-primary-soft text-primary',
  Blocked: 'border-[#FECACA] bg-dangerSoft text-danger',
  Completed: 'border-[#BBF7D0] bg-successSoft text-success',
};

export default function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        statusStyles[status] || statusStyles['Not Started'],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
}
