import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

const TONES = {
  brand: "bg-chip text-brand-ink",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-line-2 text-ink-soft",
} as const;

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-xl",
} as const;

export type AvatarTone = keyof typeof TONES;

/** Avatar circular con las iniciales de un contacto. */
export function EntityAvatar({
  name,
  tone = "brand",
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
        "flex flex-none items-center justify-center rounded-full font-bold",
        TONES[tone],
        SIZES[size],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
