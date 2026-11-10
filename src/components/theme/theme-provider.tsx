"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeScope({
  children,
  defaultTheme,
  cookieName,
  className,
}: {
  children: ReactNode;
  defaultTheme: Theme;
  cookieName: string;
  className?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      document.cookie = `${cookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.style.colorScheme = next;
    },
    [cookieName],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div
        data-theme={theme}
        className={cn(
          "min-h-screen bg-background text-foreground",
          theme === "dark" && "dark",
          className,
        )}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeScope");
  }
  return context;
}
