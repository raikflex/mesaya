import * as React from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-ink-soft)] ' +
    'active:translate-y-px',
  secondary:
    'bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-border-strong)] ' +
    'hover:bg-[var(--color-paper-deep)]',
  ghost:
    'bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-paper-deep)]',
  link:
    'bg-transparent text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline ' +
    'underline-offset-4 px-0 py-0 h-auto',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-14 px-7 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        // base
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium ' +
          'tracking-[-0.01em] transition-all duration-150 select-none ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] ' +
          'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] ' +
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
});
