"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHandle,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePanel } from "@/hooks/use-panel";
import { cn } from "@/lib/utils";

// Drawer de formulario de la app: hoja inferior deslizable en móvil y panel
// lateral derecho en escritorio. Uso típico:
//
//   <PanelDrawer panel="nueva-deuda" title="Nueva deuda">
//     <DebtForm … />   // el form envuelve FormDrawerBody + FormDrawerFooter
//   </PanelDrawer>
//
// El contenido SOLO se monta con el drawer abierto, así que cada apertura
// estrena formulario (no hay que limpiar estado al cerrar).

type Side = "bottom" | "right";

interface FormDrawerContextValue {
  /** true cuando el formulario vive dentro de un drawer. */
  inDrawer: boolean;
  busy: boolean;
  /** Mientras `busy`, el drawer no se puede descartar. */
  setBusy: (busy: boolean) => void;
  /** Cierra el drawer (p. ej. tras guardar sin navegar). */
  close: () => void;
  /** Cierra y navega a `href` (p. ej. al detalle recién creado). */
  closeAndGo: (href: string) => void;
}

const FormDrawerContext = createContext<FormDrawerContextValue | null>(null);

/**
 * Contexto del drawer que envuelve al formulario. Fuera de un drawer
 * devuelve un contexto neutro (`inDrawer: false`): `close` no hace nada y
 * `closeAndGo` navega, así el mismo formulario sirve en una página.
 */
export function useFormDrawer(): FormDrawerContextValue {
  const ctx = useContext(FormDrawerContext);
  const router = useRouter();
  return useMemo(
    () =>
      ctx ?? {
        inDrawer: false,
        busy: false,
        setBusy: () => {},
        close: () => {},
        closeAndGo: (href: string) => router.push(href),
      },
    [ctx, router]
  );
}

interface FormDrawerProps {
  open: boolean;
  /** Petición de cierre (overlay, Escape, botón ✕, arrastre). */
  onClose: () => void;
  /** Por defecto navega con `router.replace` tras cerrar. */
  onCloseAndGo?: (href: string) => void;
  title: string;
  description?: string;
  /** `auto`: abajo en móvil y a la derecha en md+. `bottom`: siempre abajo. */
  side?: "auto" | "bottom";
  /**
   * «Ocupado» controlado desde fuera, para contenido cuyo estado vive por
   * encima del drawer. Lo normal es `useFormDrawer().setBusy` desde dentro.
   */
  busy?: boolean;
  children: ReactNode;
}

export function FormDrawer({
  open,
  onClose,
  onCloseAndGo,
  title,
  description,
  side = "auto",
  busy: externalBusy = false,
  children,
}: FormDrawerProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const contentRef = useRef<HTMLDivElement>(null);
  const [innerBusy, setBusy] = useState(false);
  const busy = innerBusy || externalBusy;

  // No se abre hasta saber el tamaño de pantalla: si no, un enlace directo
  // con `#panel=…` nacería como hoja inferior también en escritorio.
  const visible = open && isDesktop !== undefined;

  // La dirección se fija AL ABRIR: cambiarla con el drawer abierto (girar
  // una tablet) haría saltar la hoja de un borde a otro a mitad de un form.
  const [wasVisible, setWasVisible] = useState(false);
  const [direction, setDirection] = useState<Side>("bottom");
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDirection(side === "auto" && isDesktop ? "right" : "bottom");
    } else {
      setBusy(false);
    }
  }

  const closeAndGo = useCallback(
    (href: string) => {
      if (onCloseAndGo) onCloseAndGo(href);
      else setTimeout(() => router.replace(href), 0);
    },
    [onCloseAndGo, router]
  );

  const context = useMemo<FormDrawerContextValue>(
    () => ({ inDrawer: true, busy, setBusy, close: onClose, closeAndGo }),
    [busy, onClose, closeAndGo]
  );

  return (
    <Drawer
      open={visible}
      onOpenChange={(next) => {
        if (next || busy) return;
        onClose();
      }}
      direction={direction}
      // Imprescindible con formularios: sin `handleOnly` vaul captura el
      // puntero en todo el contenido y rompe los Select y la selección de
      // texto. El arrastre queda en el asa.
      handleOnly
      dismissible={!busy}
      // Recoloca la hoja cuando sale el teclado (solo tiene sentido abajo).
      repositionInputs={direction === "bottom"}
    >
      <DrawerContent
        ref={contentRef}
        // El foco va al contenedor, no al primer campo: así no salta el
        // teclado nada más abrir.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        {direction === "bottom" && <DrawerHandle />}
        <DrawerHeader
          className={cn(
            "shrink-0 flex-row items-start gap-3 px-5 pb-3",
            direction === "bottom" ? "pt-3" : "pt-6"
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DrawerTitle>{title}</DrawerTitle>
            {description ? (
              <DrawerDescription>{description}</DrawerDescription>
            ) : (
              <DrawerDescription className="sr-only">{title}</DrawerDescription>
            )}
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Cerrar"
              disabled={busy}
              className="-mt-1 -mr-1.5 flex size-10 flex-none items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-chip hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            >
              <X className="size-[18px]" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <FormDrawerContext.Provider value={context}>
          {children}
        </FormDrawerContext.Provider>
      </DrawerContent>
    </Drawer>
  );
}

/** Drawer cuyo estado de apertura vive en la URL (`#panel=<panel>`). */
export function PanelDrawer({
  panel,
  ...props
}: Omit<FormDrawerProps, "open" | "onClose" | "onCloseAndGo"> & {
  panel: string;
}) {
  const { isOpen, close, closeAndGo } = usePanel(panel);
  return (
    <FormDrawer
      open={isOpen}
      onClose={close}
      onCloseAndGo={closeAndGo}
      {...props}
    />
  );
}

/**
 * Cuerpo con scroll propio. `select-text` repone la selección de texto que
 * vaul desactiva en todo el drawer con ratón.
 */
export function FormDrawerBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-1 pb-5 select-text",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Pie fijo con las acciones (respeta la zona segura inferior). */
export function FormDrawerFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <DrawerFooter className={className}>{children}</DrawerFooter>;
}

/**
 * Clase del `<form>` que envuelve `FormDrawerBody` + `FormDrawerFooter`:
 * ocupa el alto restante del drawer y deja que solo el cuerpo haga scroll.
 */
export const FORM_DRAWER_FORM = "flex min-h-0 flex-1 flex-col";
