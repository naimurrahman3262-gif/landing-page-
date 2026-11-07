import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { FormatProvider } from "@/lib/format-context";
import messages from "../messages/en.json";

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <FormatProvider timeZone="Asia/Dhaka">{children}</FormatProvider>
    </NextIntlClientProvider>
  );
}

/** Render with i18n + format context, like the app does. */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Wrapper, ...options });
}
