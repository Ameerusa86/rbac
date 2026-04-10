"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      closeButton
      expand={false}
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.4)]",
          title: "text-sm font-semibold",
          description: "text-sm text-slate-600",
          actionButton: "!bg-slate-950 !text-white",
          cancelButton: "!bg-slate-100 !text-slate-700",
          success: "border-emerald-200",
          error: "border-red-200",
          warning: "border-amber-200",
          info: "border-sky-200",
        },
      }}
      {...props}
    />
  );
}
