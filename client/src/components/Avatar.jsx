import { cn, initials } from '../lib/utils.js';

const sizes = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-lg',
};

export default function Avatar({ name, size = 'md', className }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary ring-1 ring-inset ring-[#FCD9C4]',
        sizes[size],
        className
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
