import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { applyThemePreference, getThemePreference } from "@/shared/theme";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000 } },
      }),
  );

  useEffect(() => {
    const syncTheme = () => applyThemePreference();
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if (getThemePreference() === "system") syncTheme();
    };

    syncTheme();
    window.addEventListener("inq:theme-change", syncTheme);
    media?.addEventListener("change", syncSystemTheme);

    return () => {
      window.removeEventListener("inq:theme-change", syncTheme);
      media?.removeEventListener("change", syncSystemTheme);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
