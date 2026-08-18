export const THEME_STORAGE_KEY = "inq:theme-preference";

export type ThemePreference = "dark" | "light" | "system";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "dark";

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(saved) ? saved : "dark";
  } catch {
    return "dark";
  }
}

export function applyThemePreference(preference = getThemePreference()) {
  if (typeof document === "undefined") return;

  const isDark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const theme = isDark ? "dark" : "light";

  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", isDark ? "#101511" : "#fcfcfc");
}

export function setThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Keep the selected theme for the current page when storage is unavailable.
  }

  applyThemePreference(preference);
  window.dispatchEvent(new Event("inq:theme-change"));
}
