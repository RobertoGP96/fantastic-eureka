import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appFont } from "./fonts";
import { UIProvider } from "@/lib/ui-store";
import { Toast } from "@/components/toast";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Cuentas, efectivo, tasas y deudas en un solo lugar.",
  applicationName: APP_NAME,
  // Safari iOS: nombre bajo el icono y modo standalone al añadir a inicio.
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
};

// Mismo color que el lienzo (--color-app): la barra de estado del móvil se
// funde con la cabecera plana. También va en src/app/manifest.ts.
export const viewport: Viewport = {
  themeColor: "#f6f8f8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // La variable de la fuente va en <html> (no en <body>): Tailwind resuelve
    // --font-sans en :root y ahí --font-app tiene que existir ya.
    <html lang="es" className={appFont.variable}>
      <body className="min-h-dvh bg-app font-sans text-ink antialiased">
        <UIProvider>
          {children}
          <Toast />
        </UIProvider>
      </body>
    </html>
  );
}
