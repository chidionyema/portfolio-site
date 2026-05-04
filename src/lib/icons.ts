/**
 * Icon vocabulary — the single source of truth.
 *
 * Same concept always renders the same icon, site-wide.
 * Add new icons here, not at call sites, so the visual language stays coherent.
 */
import {
  // bounded contexts
  Package,
  ShoppingCart,
  CreditCard,
  FileText,
  KeyRound,
  Boxes,
  Bell,
  GitBranch,
  // demo categories
  ArrowRightLeft,
  Zap,
  Lock,
  Fingerprint,
  Layers,
  RefreshCw,
  Shuffle,
  Gauge,
  Telescope,
  // states
  Check,
  X,
  Loader2,
  Circle,
  Inbox,
  Radio,
  AlertTriangle,
  // actions
  Play,
  Pause,
  RotateCw,
  Send,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Dices,
  Sparkles,
  ArrowRight,
  // links
  Download,
  // deep-dives
  GitFork,
  FlaskConical,
} from 'lucide-react';
import { GithubIcon } from './brand-icons';

/** Bounded contexts (architecture grid + event-stream chips). */
export const ContextIcon = {
  Catalog: Package,
  Orders: ShoppingCart,
  Payments: CreditCard,
  Content: FileText,
  Identity: KeyRound,
  Inventory: Boxes,
  Notifications: Bell,
  Orchestrator: GitBranch,
  Outbox: Send,
} as const;

/** Demo categories — used in tabs and the future sidebar. */
export const DemoIcon = {
  checkout: ArrowRightLeft,
  events: Send,
  circuit: Zap,
  vault: Lock,
  idempotency: Fingerprint,
  stampede: Layers,
  cache: RefreshCw,
  concurrency: Shuffle,
  ratelimit: Gauge,
  tracing: Telescope,
} as const;

/** Run-state semantics for streams, requests, and cache results. */
export const StateIcon = {
  success: Check,
  error: X,
  pending: Loader2,
  processing: Circle,
  empty: Inbox,
  signal: Radio,
  warning: AlertTriangle,
} as const;

/** Action verbs on buttons. */
export const ActionIcon = {
  play: Play,
  pause: Pause,
  replay: RotateCw,
  send: Send,
  reset: RefreshCw,
  show: Eye,
  hide: EyeOff,
  edit: Pencil,
  delete: Trash2,
  random: Dices,
  sparkle: Sparkles,
  arrow: ArrowRight,
} as const;

/** External-link affordances. */
export const LinkIcon = {
  github: GithubIcon,
  download: Download,
} as const;

/** Deep-dive topic glyphs. */
export const DeepDiveIcon = {
  outbox: Send,
  cqrs: GitFork,
  circuit: Zap,
  vault: Lock,
  testing: FlaskConical,
  architecture: Layers,
} as const;
