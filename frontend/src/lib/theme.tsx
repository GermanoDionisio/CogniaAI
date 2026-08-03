import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";
export type AccentColor = "blue" | "purple" | "green" | "orange" | "pink" | "cyan";

export type ThemeState = {
  mode: ThemeMode;
  accent: AccentColor;
  animatedBg: boolean;
};

const DEFAULT: ThemeState = { mode: "dark", accent: "blue", animatedBg: true };
const KEY = "cognia:theme";

type Ctx = ThemeState & {
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
  setAnimatedBg: (v: boolean) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export const ACCENTS: Record<
  AccentColor,
  { label: string; from: string; to: string; primary: string }
> = {
  blue: {
    label: "Azul elétrico",
    from: "oklch(0.68 0.19 265)",
    to: "oklch(0.66 0.22 305)",
    primary: "oklch(0.68 0.19 265)",
  },
  purple: {
    label: "Roxo real",
    from: "oklch(0.62 0.25 305)",
    to: "oklch(0.66 0.20 340)",
    primary: "oklch(0.62 0.25 305)",
  },
  green: {
    label: "Verde esmeralda",
    from: "oklch(0.70 0.18 155)",
    to: "oklch(0.72 0.16 190)",
    primary: "oklch(0.70 0.18 155)",
  },
  orange: {
    label: "Laranja solar",
    from: "oklch(0.75 0.18 55)",
    to: "oklch(0.68 0.22 30)",
    primary: "oklch(0.72 0.20 45)",
  },
  pink: {
    label: "Rosa neon",
    from: "oklch(0.72 0.22 355)",
    to: "oklch(0.66 0.24 320)",
    primary: "oklch(0.70 0.22 350)",
  },
  cyan: {
    label: "Ciano futurista",
    from: "oklch(0.75 0.15 210)",
    to: "oklch(0.70 0.18 240)",
    primary: "oklch(0.72 0.16 220)",
  },
};

function apply(state: ThemeState) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("dark", state.mode === "dark");
  html.classList.toggle("light", state.mode === "light");
  html.setAttribute("data-accent", state.accent);
  html.setAttribute("data-animated-bg", state.animatedBg ? "on" : "off");
  const a = ACCENTS[state.accent];
  html.style.setProperty("--brand", a.primary);
  html.style.setProperty("--primary", a.primary);
  html.style.setProperty("--ring", a.primary);
  html.style.setProperty("--gradient-brand", `linear-gradient(135deg, ${a.from}, ${a.to})`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = { ...DEFAULT, ...JSON.parse(raw) } as ThemeState;
        setState(parsed);
        apply(parsed);
        return;
      }
    } catch (_err) {
      // Ignore parsing errors - fall back to default
    }
    apply(DEFAULT);
  }, []);

  useEffect(() => {
    apply(state);
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_err) {
      // Ignore storage errors - some environments may not support localStorage
    }
  }, [state]);

  const value: Ctx = {
    ...state,
    setMode: (mode) => setState((s) => ({ ...s, mode })),
    setAccent: (accent) => setState((s) => ({ ...s, accent })),
    setAnimatedBg: (animatedBg) => setState((s) => ({ ...s, animatedBg })),
  };
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be used inside ThemeProvider");
  return c;
}
