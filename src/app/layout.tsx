import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { UIProvider } from "@/lib/ui-store";
import { Toast } from "@/components/toast";
import { APP_NAME } from "@/lib/config";

// Outfit (SIL OFL) autoalojada: fuente variable con el subconjunto latin.
// Antes venía de next/font/google, pero el build en Vercel fallaba cuando
// Google devolvía URLs de archivo sin extensión (TypeError en el loader).
const outfit = localFont({
  src: "./fonts/outfit-latin.woff2",
  weight: "100 900",
  display: "swap",
});

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

export const viewport: Viewport = {
  themeColor: "#c3d6d3",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body
        className={`${outfit.className} min-h-dvh bg-page text-ink antialiased`}
      >
        <UIProvider>
          {children}
          <Toast />
        </UIProvider>
      </body>
    </html>
  );
}
