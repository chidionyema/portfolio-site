import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'dark' | 'light';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.dataset.theme = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch (_) {
    // Storage may be unavailable (private mode, blocked) — toggle still works in-session.
  }
}

export function ThemeToggle() {
  // Initialize from DOM after mount; SSR has no notion of theme.
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  // Render a stable empty shell during SSR / before mount to avoid hydration mismatch.
  if (!mounted) {
    return <div className="w-10 h-10 sm:w-9 sm:h-9" aria-hidden="true" />;
  }

  const Icon = theme === 'dark' ? Sun : Moon;
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggle}
      className="
        w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg
        text-secondary hover:text-primary hover:bg-surface
        border border-border transition-colors focus-ring
      "
      aria-label={label}
      title={label}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
    </button>
  );
}
