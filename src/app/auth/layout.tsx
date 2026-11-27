import { BrandMark } from "@/components/brand-mark";

// Login y registro: la única pantalla a sangre en petróleo (el mismo tono
// plano de la barra lateral, sin degradado) con la tarjeta blanca encima.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sidebar px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-5 flex justify-center">
          <BrandMark className="size-14" idPrefix="fe-auth" />
        </div>
        {children}
      </div>
    </div>
  );
}
