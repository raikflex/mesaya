import * as React from 'react';
import { cn } from './cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'block w-full h-11 px-3.5 rounded-[var(--radius-md)] bg-[var(--color-paper)] ' +
          'border border-[var(--color-border-strong)] text-[var(--color-ink)] ' +
          'placeholder:text-[var(--color-muted)] ' +
          'transition-colors duration-150 ' +
          'focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)] ' +
          'disabled:opacity-60 disabled:cursor-not-allowed ' +
          'aria-[invalid=true]:border-[var(--color-danger)] aria-[invalid=true]:ring-[var(--color-danger)]',
        className,
      )}
      {...rest}
    />
  );
});
