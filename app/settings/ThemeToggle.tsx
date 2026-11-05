"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "light-grey" | "dark-black" | "dark-grey" | "system";

const STORAGE_KEY = "hijordan-theme";

const THEMES: {
  value: Theme;
  label: string;
  Icon: typeof Sun;
  swatch?: string;
}[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "light-grey", label: "Grey", Icon: Sun, swatch: "#f5f5f5" },
  { value: "dark-black", label: "Dark", Icon: Moon, swatch: "#000000" },
  { value: "dark-grey", label: "Grey", Icon: Moon, swatch: "#232326" },
  { value: "system", label: "System", Icon: Monitor },
];

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
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

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  useEffect(() => {
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
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-ink">
          {theme === "light" ? (
            <Sun size={18} strokeWidth={1.8} />
          ) : theme === "light-grey" ? (
            <Sun size={18} strokeWidth={1.8} />
          ) : theme === "system" ? (
            <Monitor size={18} strokeWidth={1.8} />
          ) : (
            <Moon size={18} strokeWidth={1.8} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">Appearance</h2>
          <p className="mt-0.5 text-[12px] leading-4 text-muted">
            Choose how HiJordan looks. System follows your device setting.
          </p>

          <div
            role="radiogroup"
            aria-label="Theme"
            className="mt-3 inline-flex flex-wrap gap-0.5 rounded-lg border border-line bg-subtle p-0.5"
          >
            {THEMES.map(({ value, label, Icon, swatch }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(value)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                    active
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon size={14} strokeWidth={1.8} />
                  {swatch && (
                    <span
                      aria-hidden="true"
                      className="size-3 rounded-full border border-line"
                      style={{ backgroundColor: swatch }}
                    />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}