"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 w-10 h-10"></div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-lg transition-all duration-300 ${
          theme === "light"
            ? "bg-white dark:bg-slate-700 shadow-md text-primary-500"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
        aria-label="Light mode"
      >
        <Sun size={18} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-lg transition-all duration-300 ${
          theme === "dark"
            ? "bg-white dark:bg-slate-700 shadow-md text-primary-500"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
        aria-label="Dark mode"
      >
        <Moon size={18} />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-lg transition-all duration-300 ${
          theme === "system"
            ? "bg-white dark:bg-slate-700 shadow-md text-primary-500"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
        aria-label="System theme"
      >
        <Monitor size={18} />
      </button>
    </div>
  );
}
