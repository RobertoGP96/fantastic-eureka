import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyState({
  icon: Icon,
  iconColor = "text-brand",
  title,
  description,
  ctaLabel,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="anim-fade-up flex flex-1 flex-col items-center justify-center gap-3.5 p-10">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-[20px] bg-chip ${iconColor}`}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div className="text-[15px] font-semibold text-navy">{title}</div>
      <div className="text-center text-[13px] text-muted">{description}</div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-1.5 rounded-xl bg-brand px-[22px] py-[11px] text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-mid"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
