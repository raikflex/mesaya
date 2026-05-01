import * as React from 'react';
import { cn } from './cn';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  function Label({ className, ...rest }, ref) {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-medium text-[var(--color-ink)] tracking-[-0.005em] mb-1.5',
          className,
        )}
        {...rest}
      />
    );
  },
);
