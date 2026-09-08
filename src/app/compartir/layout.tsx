import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { APP_NAME } from "@/lib/config";

// Vista pública (sin sesión) de una cuenta compartida por código. Fuera del
// grupo (app): sin sidebar, bottom nav ni validación de sesión. El
// middleware deja pasar /compartir sin cookie.
export const metadata: Metadata = {
  title: `Cuenta compartida · ${APP_NAME}`,
  robots: { index: false, follow: false },
};

export default function CompartirLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh justify-center bg-page">
      <div className="relative flex min-h-dvh w-full max-w-[430px] flex-col bg-app shadow-[0_0_40px_rgba(7,39,46,.16)] md:max-w-2xl md:px-6 md:pb-12 md:shadow-none">
        {children}
        <footer className="mt-auto flex items-center justify-center gap-2 px-5 py-6 text-[11px] text-muted">
          <BrandMark className="size-5" idPrefix="fe-share" />
          <span>
            Vista de solo lectura ·{" "}
            <Link href="/" className="font-semibold text-brand">
              {APP_NAME}
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
