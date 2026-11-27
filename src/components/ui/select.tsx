"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

type SelectTriggerVariant = "chip" | "form";

const TRIGGER_BASE =
  "flex items-center justify-between gap-1.5 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

// chip: filtro compacto en barras de herramientas. form: campo de formulario,
// misma altura y borde que <Input> (el ancho lo pone quien lo usa: w-full,
// flex-1…). Antes cada formulario repetía estas clases a mano.
const TRIGGER_VARIANTS: Record<SelectTriggerVariant, string> = {
  chip: "min-h-8 rounded-lg border border-line bg-card py-1.5 pr-2 pl-3 text-xs font-medium text-ink-soft hover:bg-subtle",
  form: "h-11 rounded-xl border border-input bg-card px-3.5 text-sm text-ink dense:h-9",
};

function SelectTrigger({
  className,
  children,
  variant = "chip",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  variant?: SelectTriggerVariant;
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(TRIGGER_BASE, TRIGGER_VARIANTS[variant], className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-3.5 w-3.5 flex-none text-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={6}
        className={cn(
          "z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[10rem] overflow-hidden rounded-xl border border-line bg-popover shadow-popover",
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center min-h-10 rounded-lg py-2 pr-9 pl-3 text-sm font-medium text-ink-soft outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle data-[highlighted]:text-heading data-[state=checked]:text-brand-ink dense:min-h-8",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2.5 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
};
