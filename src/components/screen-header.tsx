import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface ScreenHeaderProps {
  title: string;
  backHref?: string;
  children?: ReactNode;
}

export function ScreenHeader({ title, backHref, children }: ScreenHeaderProps) {
  return (
    <div className="grad-header rounded-b-[22px] px-5 py-[18px] text-white md:mt-6 md:rounded-[22px] md:px-7 md:py-6">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Volver"
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
        )}
        <div className="text-[17px] font-bold md:text-[19px]">{title}</div>
      </div>
      {children}
    </div>
  );
}
