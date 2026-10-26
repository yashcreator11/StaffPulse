import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LeavePageHeader({
  title,
  description,
  actions,
  icon,
  backHref,
  backLabel,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-7 space-y-2">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group mb-1"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          <span>{backLabel || 'Back'}</span>
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex items-start gap-4">
          {icon && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 text-[var(--accent)] border border-[var(--accent)]/20 shadow-sm">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-2xl leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
      </div>
    </div>
  );
}