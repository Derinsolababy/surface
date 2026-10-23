import { cn } from '@/utils/helpers';

/** The StellarPOS mark: a receipt slip with a four-point star. */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-ink" />
      <path
        d="M9 7h14v18l-2.33-1.5L18.33 25 16 23.5 13.67 25l-2.34-1.5L9 25z"
        className="fill-paper"
      />
      <path d="M16 10.5l1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4-2.4-1.1 2.4-1.1z" fill="#3B3FB6" />
      <path d="M12 20h8" className="stroke-ink" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
