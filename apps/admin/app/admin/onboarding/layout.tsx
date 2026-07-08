import Link from 'next/link';
import { Stepper } from './stepper';
import { SaltarOperar } from './saltar-operar';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Stepper />
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Header() {
  return (
    <header
      className="border-b px-6 sm:px-10 py-4 flex items-center justify-between gap-4"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <Link href="/admin" className="inline-flex items-center gap-2 shrink-0">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
          <rect
            x="4"
            y="4"
            width="24"
            height="24"
            rx="6"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />
          <circle cx="22" cy="22" r="3" fill="var(--color-accent)" />
        </svg>
        <span
          className="font-[family-name:var(--font-display)] text-xl tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          EnPura
        </span>
      </Link>
      <SaltarOperar />
    </header>
  );
}
