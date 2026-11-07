"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "light-grey" | "dark-black" | "dark-grey" | "system";

const STORAGE_KEY = "hijordan-theme";

type Preview = {
  canvas: string;
  surface: string;
  bubble: string;
  accent: string;
};

const LIGHT: Preview = {
  canvas: "#fafafa",
  surface: "#ffffff",
  bubble: "#efefef",
  accent: "#3797f0",
};

const LIGHT_GREY: Preview = {
  canvas: "#f5f5f5",
  surface: "#f9f9f9",
  bubble: "#e0e0e0",
  accent: "#3797f0",
};

const DARK: Preview = {
  canvas: "#000000",
  surface: "#121212",
  bubble: "#262626",
  accent: "#3797f0",
};

const DARK_GREY: Preview = {
  canvas: "#1c1c1f",
  surface: "#232326",
  bubble: "#3a3a40",
  accent: "#3797f0",
};

const THEMES: {
  value: Theme;
  label: string;
  Icon: typeof Sun;
  preview: Preview | null;
}[] = [
  { value: "light", label: "Light", Icon: Sun, preview: LIGHT },
  { value: "light-grey", label: "Light grey", Icon: Sun, preview: LIGHT_GREY },
  { value: "dark-black", label: "Dark", Icon: Moon, preview: DARK },
  { value: "dark-grey", label: "Dark grey", Icon: Moon, preview: DARK_GREY },
  { value: "system", label: "System", Icon: Monitor, preview: null },
];

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  // Migrate choices saved by earlier versions of the toggle.
  if (saved === "dark") return "dark-black";
  const found = THEMES.find((theme) => theme.value === saved);
  return found ? found.value : "system";
}

function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark-black" ||
    theme === "dark-grey" ||
    (theme === "system" && systemPrefersDark());
  const style =
    theme === "light-grey" ? "grey" : theme === "dark-grey" ? "grey" : "black";
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.dataset.lightStyle = theme === "light-grey" ? "grey" : "black";
  root.dataset.darkStyle = style;
  root.style.colorScheme = dark ? "dark" : "light";
}

function PreviewCard({ preview }: { preview: Preview | null }) {
  if (!preview) {
    return (
      <span
        aria-hidden="true"
        className="relative block h-[58px] w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(105deg, #fafafa 0 49.5%, #121212 50.5% 100%)",
        }}
      >
        <span
          className="absolute left-2 top-2 h-1.5 w-9 rounded-full"
          style={{ backgroundColor: "#ffffff" }}
        />
        <span
          className="absolute left-2 top-6 h-2.5 w-8 rounded-full"
          style={{ backgroundColor: "#efefef" }}
        />
        <span
          className="absolute right-2 top-2 h-1.5 w-9 rounded-full"
          style={{ backgroundColor: "#2a2a2a" }}
        />
        <span
          className="absolute right-2 top-6 h-2.5 w-9 rounded-full"
          style={{ backgroundColor: "#3797f0" }}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="relative block h-[58px] w-full overflow-hidden"
      style={{ backgroundColor: preview.canvas }}
    >
      <span
        className="absolute inset-x-2 top-2 h-1.5 rounded-full"
        style={{ backgroundColor: preview.surface }}
      />
      <span
        className="absolute left-2 top-[22px] h-2.5 w-9 rounded-full"
        style={{ backgroundColor: preview.bubble }}
      />
      <span
        className="absolute right-2 top-[34px] h-2.5 w-10 rounded-full"
        style={{ backgroundColor: preview.accent }}
      />
    </span>
  );
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);

    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line-soft px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Appearance</h2>
        <p className="mt-0.5 text-[12px] leading-4 text-muted">
          Pick a theme. System follows your device setting.
        </p>
      </div>

      <div className="p-4">
        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {THEMES.map(({ value, label, Icon, preview }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(value)}
                className={`group relative overflow-hidden rounded-xl border text-left transition ${
                  active
                    ? "border-transparent ring-2 ring-accent"
                    : "border-line hover:border-strong"
                }`}
              >
                <PreviewCard preview={preview} />

                <span className="flex items-center gap-1.5 px-2.5 py-2">
                  <Icon
                    size={13}
                    strokeWidth={2}
                    className={active ? "text-ink" : "text-muted"}
                  />
                  <span
                    className={`truncate text-[12px] ${
                      active ? "font-semibold text-ink" : "font-medium text-muted"
                    }`}
                  >
                    {label}
                  </span>
                  {active && (
                    <span className="ml-auto grid size-4 shrink-0 place-items-center rounded-full bg-accent text-white">
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
