import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3, Bookmark, Database, LayoutList, Search, Sparkles, Upload, Moon, Sun,
} from 'lucide-react';
import { cn } from '~/lib/cn';
import { useEffect, useState } from 'react';

const NAV = [
  { to: '/runs', label: 'Eval Runs', icon: LayoutList },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/imports', label: 'Imports', icon: Upload },
  { to: '/saved-filters', label: 'Saved Filters', icon: Bookmark },
  { to: '/nl', label: 'Natural Language', icon: Sparkles },
];

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('analyzer-theme') as 'dark' | 'light') ?? 'dark'
  );
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('analyzer-theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

export function AppLayout() {
  const { theme, toggle } = useTheme();
  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        data-sidebar="true"
        className="w-60 shrink-0 flex flex-col border-r border-[var(--border-default)]"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-[var(--border-default)]">
          <Database className="text-accent" size={22} />
          <div className="leading-tight">
            <div className="font-semibold text-[var(--text-primary)]">IoNova</div>
            <div className="text-xs text-[var(--text-muted)]">Eval Analyzer</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[var(--sidebar-active-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )
              }
              style={({ isActive }: { isActive: boolean }) =>
                isActive ? { background: 'var(--sidebar-active)' } : undefined
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={toggle}
          className="flex items-center gap-2 m-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
