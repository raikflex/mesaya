import * as React from 'react';
import { cn } from './cn';

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wrapper para inputs en formularios. Maneja label, hint, error en una unidad.
 *
 * Uso:
 *   <Field id="nit" label="NIT" hint="Sin guion ni dígito de verificación" error={errors.nit}>
 *     <Input id="nit" name="nit" />
 *   </Field>
 */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[var(--color-ink)] tracking-[-0.005em]"
      >
        {label}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            'aria-describedby': describedBy,
            'aria-invalid': error ? true : undefined,
          })
        : children}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-[var(--color-muted)] leading-relaxed">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-[var(--color-danger)] leading-relaxed">
          {error}
        </p>
      ) : null}
    </div>
  );
}
