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
    // @container/main: las mismas rejillas `@…/main:` que usa (app) funcionan
    // aquí aunque no haya barra lateral.
    <div className="@container/main mx-auto flex min-h-dvh w-full max-w-4xl flex-col md:px-8 md:pb-6">
      {children}
      <footer className="mt-auto flex items-center justify-center gap-2 px-5 py-6 text-[11px] text-muted">
        <BrandMark className="size-5" idPrefix="fe-share" />
        <span>
          Vista de solo lectura ·{" "}
          <Link href="/" className="font-semibold text-brand-ink">
            {APP_NAME}
          </Link>
        </span>
      </footer>
    </div>
  );
}
