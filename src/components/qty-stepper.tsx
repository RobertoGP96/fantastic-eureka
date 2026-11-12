"use client";

import { Minus, Plus } from "lucide-react";

interface QtyStepperProps {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  size?: "sm" | "lg";
}

export function QtyStepper({ qty, onInc, onDec, size = "sm" }: QtyStepperProps) {
  const isLg = size === "lg";
  const iconSize = isLg ? "h-5 w-5" : "h-[18px] w-[18px]";
  const btnClass = `flex flex-none items-center justify-center rounded-lg bg-chip text-brand-ink transition-[box-shadow,transform] hover:ring-1 hover:ring-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-90 ${
    isLg ? "h-11 w-11" : "h-9 w-9"
  }`;
  return (
    <div
      className={`flex items-center gap-1 rounded-xl bg-app p-1 ${
        isLg
          ? ""
          : ""
      }`}
    >
      <button
        type="button"
        onClick={onDec}
        aria-label="Disminuir cantidad"
        className={btnClass}
      >
        <Minus className={iconSize} />
      </button>
      <div
        className={`money text-center text-base font-semibold text-heading ${
          isLg ? "min-w-10" : "min-w-8"
        }`}
      >
        {qty}
      </div>
      <button
        type="button"
        onClick={onInc}
        aria-label="Aumentar cantidad"
        className={btnClass}
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
}
