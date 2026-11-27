import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Esqueleto de toda pantalla: <Page> (el <main>) con su <ScreenHeader> y un
// <PageBody>. El ancho se decide una vez en Page para que cabecera y cuerpo
// queden alineados:
//  - full: todo el contenedor (rejillas, principal + lateral);
//  - narrow: columna centrada de lectura (catálogos y listas simples);
//  - form: columna centrada estrecha (formularios).
// En móvil siempre ocupa todo el ancho.

type PageWidth = "full" | "narrow" | "form";

const WIDTH: Record<PageWidth, string> = {
  full: "",
  narrow: "md:mx-auto md:w-full md:max-w-3xl",
  form: "md:mx-auto md:w-full md:max-w-xl",
};

interface PageProps {
  width?: PageWidth;
  className?: string;
  children: ReactNode;
}

export function Page({ width = "full", className, children }: PageProps) {
  return (
    <main className={cn("flex flex-1 flex-col pb-8", WIDTH[width], className)}>
      {children}
    </main>
  );
}

interface PageBodyProps {
  className?: string;
  children: ReactNode;
}

export function PageBody({ className, children }: PageBodyProps) {
  return (
    <div
      className={cn(
        "anim-fade-up flex flex-1 flex-col gap-5 px-5 pt-5 md:px-0 md:pt-6",
        className
      )}
    >
      {children}
    </div>
  );
}
