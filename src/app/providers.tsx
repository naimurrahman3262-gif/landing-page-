"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FormatProvider } from "@/lib/format-context";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
      mutations: { retry: false }, // never retry money-moving POSTs
    },
  });
}

export function Providers({ children, timeZone }: { children: ReactNode; timeZone: string }) {
  const [queryClient] = useState(makeQueryClient);
  // Marks the app as interactive (used by e2e tests to avoid pre-hydration input).
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <FormatProvider timeZone={timeZone}>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </FormatProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
