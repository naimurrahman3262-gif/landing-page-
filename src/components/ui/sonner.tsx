"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toasts with icon + text (colour is never the only signal). */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      icons={{
        success: <CircleCheck aria-hidden className="size-5 text-success" />,
        error: <CircleAlert aria-hidden className="size-5 text-danger" />,
        warning: <TriangleAlert aria-hidden className="size-5 text-warning" />,
        info: <Info aria-hidden className="size-5 text-info" />,
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-md! border! border-border-strong! bg-surface-2! text-text-1! shadow-2! font-sans!",
          description: "text-text-2!",
          actionButton: "bg-primary! text-on-primary! font-display!",
        },
      }}
      {...props}
    />
  );
}
