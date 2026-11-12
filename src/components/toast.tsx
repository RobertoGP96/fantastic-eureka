"use client";

import { useUI } from "@/lib/ui-store";

export function Toast() {
  const { toast } = useUI();
  if (!toast) return null;
  return (
    <div className="toast-pop z-50 rounded-xl bg-inverse px-5 py-3 text-sm font-medium whitespace-nowrap text-inverse-foreground shadow-toast">
      {toast}
    </div>
  );
}
