import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { UIProvider } from "@/lib/ui-store";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { Toast } from "@/components/toast";
import { APP_NAME } from "@/lib/config";

const spaceGrotesk = Space_Grotesk({
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
        className={`${spaceGrotesk.className} min-h-dvh bg-page text-ink antialiased`}
      >
        <UIProvider>
          <div className="flex min-h-dvh flex-col md:bg-app">
            <TopNav />
            <div className="flex flex-1 justify-center">
              <div className="relative flex min-h-full w-full max-w-[430px] flex-col bg-app shadow-[0_0_40px_rgba(10,31,63,.18)] md:max-w-6xl md:bg-transparent md:px-6 md:pb-12 md:shadow-none">
                {children}
                <BottomNav />
              </div>
            </div>
          </div>
          <Toast />
        </UIProvider>
      </body>
    </html>
  );
}
