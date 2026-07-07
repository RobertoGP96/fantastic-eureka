import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { UIProvider } from "@/lib/ui-store";
import { Toast } from "@/components/toast";
import { APP_NAME } from "@/lib/config";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Cuentas, efectivo, tasas y deudas en un solo lugar.",
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
