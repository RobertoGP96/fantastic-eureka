import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-subtle text-ink-soft",
  brand: "bg-chip text-brand-ink",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
} as const;

const SIZES = {
  sm: "size-8 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-12 text-base",
} as const;

export type AvatarTone = keyof typeof TONES;

/** Avatar circular con las iniciales de un contacto. */
export function EntityAvatar({
  name,
  tone = "neutral",
  size = "md",
  className,
}: {
  name: string;
  tone?: AvatarTone;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center rounded-full font-semibold",
        TONES[tone],
        SIZES[size],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
