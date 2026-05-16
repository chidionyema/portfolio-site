import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import {
  Search,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers,
} from 'lucide-react';
import { GithubIcon } from '../../lib/brand-icons';
import { allDemos, demoGroups } from '../demo/DemoSidebar';
import type { LucideIcon } from 'lucide-react';

interface DeepDive {
  slug: string;
  title: string;
  description: string;
  iconKey: string;
}

interface Props {
  deepDives: DeepDive[];
}

type Action = () => void;

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  Icon: LucideIcon | typeof GithubIcon;
  run: Action;
  group: 'Demos' | 'Deep-dives' | 'Navigate' | 'Links';
  keywords?: string;
  persona?: 'EM' | 'Engineer' | 'Recruiter';
}


const PALETTE_HINT_KEY = 'ha_palette_hint_dismissed';

const PERSONA_MAP: Record<string, 'EM' | 'Engineer' | 'Recruiter'> = {
  'demo:checkout': 'EM',
  'demo:tracing': 'Engineer',
  'demo:circuit': 'Recruiter',
  'demo:idempotency': 'EM',
};

export function CommandPalette({ deepDives }: Props) {
  const [open, setOpen] = useState(false);
  // Show a one-time hint near the floating button so first-time visitors
  // discover the ⌘K shortcut. Dismissed on first palette open or explicit X.
  const [hintVisible, setHintVisible] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const dismissHint = useCallback(() => {
    setHintVisible(false);
    try { localStorage.setItem(PALETTE_HINT_KEY, '1'); } catch {}
  }, []);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(PALETTE_HINT_KEY) === '1';
      if (!dismissed) {
        // Delay so the hint appears after the page has settled, not at first paint.
        const t = window.setTimeout(() => setHintVisible(true), 8000);
        return () => window.clearTimeout(t);
      }
    } catch {}
  }, []);

  // ⌘K / ctrl+K toggles. ESC closes (cmdk handles internally too).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        dismissHint();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissHint]);

  // Lock body scroll while open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const go = (href: string): Action => () => {
    close();
    if (href.startsWith('http')) {
      window.open(href, '_blank', 'noopener');
    } else if (href.startsWith('#')) {
      window.location.hash = href;
    } else {
      window.location.href = href;
    }
  };

  const items: PaletteItem[] = [
    // Demos — keyed by group label so the user can search by capability.
    ...allDemos.map((d): PaletteItem => {
      const groupLabel = demoGroups.find((g) => g.demos.some((x) => x.id === d.id))!.label;
      const id = `demo:${d.id}`;
      return {
        id,
        label: d.label,
        hint: groupLabel,
        Icon: d.Icon,
        run: go(`/demos?demo=${d.id}#demo`),
        group: 'Demos',
        keywords: `${groupLabel} ${d.desc}`,
        persona: PERSONA_MAP[id],
      };
    }),
    // Deep-dives, sourced from the content collection.
    ...deepDives.map((dd): PaletteItem => ({
      id: `dd:${dd.slug}`,
      label: dd.title,
      hint: dd.description,
      Icon: Layers,
      run: go(`/deep-dives/${dd.slug}/`),
      group: 'Deep-dives',
    })),
    // Navigate
    { id: 'nav:hero',      label: 'Top of page', Icon: Sparkles,   run: go('#'),           group: 'Navigate' },
    { id: 'nav:demo',      label: 'Demos',       Icon: ArrowRight, run: go('#demo'),       group: 'Navigate' },
    { id: 'nav:deepdives', label: 'Deep-dives',  Icon: Layers,     run: go('#deep-dives'), group: 'Navigate' },
    { id: 'nav:about',     label: 'About',       Icon: ArrowRight, run: go('#about'),      group: 'Navigate' },
    { id: 'nav:contact',   label: 'Get in touch (email)', Icon: ArrowRight, run: go('mailto:hello@chidionyema.dev'), group: 'Navigate' },
    // Theme
    // Light mode is deprecated until the design system has full token parity
    // (see UI_AND_DEMO_PLAN.md T5.1). The toggle was producing low-contrast
    // text and invisible CTAs on the light theme — worse than no toggle.
    // Links
    { id: 'link:github',   label: 'View source on GitHub', Icon: GithubIcon, run: go('https://github.com/chidionyema/haworks'), group: 'Links' },
    { id: 'link:linkedin', label: 'LinkedIn',              Icon: ExternalLink, run: go('https://linkedin.com/in/chidionyema'), group: 'Links' },
    { id: 'link:cv',       label: 'LinkedIn Profile',      Icon: ExternalLink, run: go('https://linkedin.com/in/chidionyema'), group: 'Links' },
  ];

  // Group items by their `group` key, preserving insertion order.
  const grouped = items.reduce<Record<string, PaletteItem[]>>((acc, it) => {
    (acc[it.group] ||= []).push(it);
    return acc;
  }, {});

  return (
    <>
      {/* Floating launcher button — small, in the corner, keyboard-discoverable. */}
      <button
        type="button"
        onClick={() => { setOpen(true); dismissHint(); }}
        aria-label="Open command palette (⌘K)"
        className="
          fixed bottom-5 right-5 z-40
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-surface text-secondary border border-border
          hover:text-primary hover:bg-elevated transition-colors
          text-xs font-mono shadow-lg
          focus-ring
        "
      >
        <Search className="w-3.5 h-3.5" strokeWidth={1.75} />
        <span>Search</span>
        <kbd className="px-1.5 py-0.5 rounded bg-base/70 text-muted text-[10px]">⌘K</kbd>
      </button>

      {/* First-visit hint pointing at the search button. Auto-dismisses on
          first palette open or explicit X. localStorage-gated so it never
          re-appears for the same visitor. */}
      {hintVisible && !open && (
        <div className="fixed bottom-20 right-5 z-40 max-w-[260px] glass border border-accent/30 rounded-lg p-3 shadow-2xl text-xs flex items-start gap-3 animate-fade-in">
          <Search className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed text-secondary">
            Jump to any demo or article fast — press <kbd className="px-1 py-0.5 rounded bg-base/70 text-muted text-[10px] font-mono">⌘K</kbd> from anywhere on the page.
          </div>
          <button
            onClick={dismissHint}
            aria-label="Dismiss hint"
            className="text-muted hover:text-primary transition-colors -mr-1 -mt-1 p-1"
          >
            ×
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-[15vh]"
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <Command
            label="Command palette"
            className="
              relative w-full max-w-xl rounded-xl overflow-hidden
              bg-elevated border border-border shadow-2xl
              animate-fade-in
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 px-4 border-b border-border">
              <Search className="w-4 h-4 text-muted shrink-0" strokeWidth={1.75} />
              <Command.Input
                autoFocus
                placeholder="Search demos, deep-dives, sections…"
                className="flex-1 bg-transparent py-3.5 text-sm text-primary outline-none placeholder:text-muted"
              />
              <kbd className="text-[10px] font-mono text-muted border border-border rounded px-1.5 py-0.5">esc</kbd>
            </div>

            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted">
                Nothing matched.
              </Command.Empty>

              {Object.entries(grouped).map(([group, list]) => (
                <Command.Group key={group} heading={group} className="
                  [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5
                  [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase
                  [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:font-mono
                  [&_[cmdk-group-heading]]:text-muted
                  mb-1
                ">
                  {list.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.hint ?? ''} ${item.keywords ?? ''}`}
                      onSelect={item.run}
                      className="
                        flex items-center gap-3 px-3 py-2 rounded-lg
                        text-sm text-secondary cursor-pointer
                        data-[selected=true]:bg-accent/15 data-[selected=true]:text-primary
                      "
                    >
                      <item.Icon className="w-4 h-4 text-muted shrink-0" strokeWidth={1.75} />
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.persona && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none ${
                            item.persona === 'EM' ? 'bg-primary/10 text-primary border border-primary/20' :
                            item.persona === 'Engineer' ? 'bg-accent/10 text-accent-light border border-accent/20' :
                            'bg-warning/10 text-warning border border-warning/20'
                          }`}>
                            Recommended for {item.persona}s
                          </span>
                        )}
                      </div>
                      {item.hint && (
                        <span className="text-xs text-muted truncate max-w-[30%]">{item.hint}</span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>

            <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[10px] font-mono text-muted">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </Command>
        </div>
      )}
    </>
  );
}
