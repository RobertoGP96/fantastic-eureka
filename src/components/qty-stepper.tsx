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
  const iconSize = isLg ? "h-[17px] w-[17px]" : "h-[15px] w-[15px]";
  const btnClass = `flex items-center justify-center rounded-md text-brand-mid transition-[color,transform] hover:text-brand active:scale-90 ${
    isLg ? "h-6 w-6" : "h-5 w-5"
  }`;
  return (
    <div
      className={`flex items-center bg-app ${
        isLg
          ? "gap-3.5 rounded-xl px-3.5 py-2"
          : "gap-2.5 rounded-[10px] px-2.5 py-[5px]"
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
        className={`text-center font-semibold text-navy ${
          isLg ? "min-w-[22px] text-[15px]" : "min-w-4 text-[13.5px]"
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
