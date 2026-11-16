# UAV-PAS Design System (`DESIGN.md`)

Canonical design system and frontend UI engineering contract for **UAV-PAS** across Web (`admin`, `customer`, `operations`) and Mobile (`mobile` Expo React Native).

---

## 1. Aesthetic Direction & Palette Guardrail

UAV-PAS uses an **Aviation Precision Monochrome + Brand Signal** aesthetic: cool alabaster/slate surfaces (`#ffffff` / `#f7f7f7` / `#f3f3f3`), deep ink typography (`#1f1f1f`), and surgical semantic accents reserved strictly for primary actions, safety warnings, and errors.

### Allowed vs. Banned Palette
- **Allowed Surfaces & Neutrals**: `bg-background`, `bg-card`, `bg-surface`, `bg-surface-container-low`, `bg-surface-container`, `slate-*`, `stone-*`, `zinc-*`, `neutral-*`.
- **Allowed Primary / Brand Accent**: `--uav-red` (`#ab2523`) / `--primary` (`#c43a4a`). Inside `[data-portal]` workspaces, `.text-primary` resolves to deep ink (`#1f1f1f`) and `.bg-primary/*` resolves to neutral (`#f3f3f3`), keeping solid `.bg-primary` reserved exclusively for primary CTAs.
- **Allowed Semantic Signals**:
  - **Warning / Attention**: `amber-*` / `--warning` (`#f59e0b`)
  - **Danger / Destructive**: `danger` / `red-*` / `rose-*` (`#dc2626`)
  - **Active / Positive Status**: neutral charcoal/slate pill (`bg-slate-900 text-white` or `bg-slate-100 text-slate-800 border-slate-300`) — never neon green.
- **BANNED Utility Classes (Zero-Tolerance)**:
  `emerald-*`, `green-*`, `teal-*`, `indigo-*`, `purple-*`, `violet-*` (`50..950`). Automated tests reject any occurrence in `src/`.

---

## 2. Three-Layer Token Architecture

Defined in `src/styles/globals.css` (single CSS entry point per portal; additional `.css` files in `src/` are forbidden by `check-architecture.mjs`).

### Layer 1 — Primitive Tokens (`:root`)
| Token | Value | Purpose |
|---|---|---|
| `--uav-red` | `#ab2523` | Brand aviation crimson |
| `--uav-red-hover` | `#911e1c` | Brand crimson hover |
| `--uav-blue` | `#404040` | Neutralized precision slate accent |
| `--uav-navy` | `#1f1f1f` | Deep charcoal ink |
| `--uav-sky` | `#5f5f5f` | Secondary graphite |
| `--uav-gold` | `#f59e0b` | Aviation caution amber |
| `--uav-surface` | `#f7f7f7` | App canvas alabaster |

### Layer 2 — Semantic Tokens (`:root` / `[data-portal]`)
| Token | Value | Contrast on `#ffffff` | Usage |
|---|---|---|---|
| `--background` | `#f7f7f7` | — | Root viewport canvas |
| `--card` / `--surface-container-lowest` | `#ffffff` | — | Primary elevated card core |
| `--surface-container-low` | `#f3f3f3` | — | Machined outer bezel tray & muted well |
| `--surface-container` | `#ececec` | — | Segmented tablist track & hover fill |
| `--on-surface` / `--foreground` | `#1f1f1f` | `16.6:1` (AAA) | Headings, values, primary labels |
| `--muted` / `--on-surface-variant` | `#5f5f5f` | `6.4:1` (AA) | Descriptions, helper text, `(Tuỳ chọn)` marker |
| `--border` / `--outline-variant` | `#e2e2e2` | — | Hairline structural dividers |
| `--primary` | `#c43a4a` | `5.3:1` (AA) | Solid CTA background & focus ring |
| `--danger` | `#dc2626` | `4.8:1` (AA) | Validation error, required `*` marker, destructive action |
| `--warning` | `#f59e0b` | — | Degraded telemetry, quota >80%, pending review |

### Layer 3 — Component & Geometry Tokens
| Token | Value | Tailwind Utility | Target Components |
|---|---|---|---|
| `--radius-panel` | `10px` (`0.625rem`) | `rounded-panel` | Cards, outer Double-Bezel shells, workspace panels |
| `--radius-control` | `8px` (`0.5rem`) | `rounded-control` | Inputs, selects, buttons, segmented tab pills |
| `--radius-badge` | `6px` (`0.375rem`) | `rounded-badge` | Status badges, route tags, inline chips |
| `--radius-overlay` | `12px` (`0.75rem`) | `rounded-overlay` | Modal dialogs, drawers, command popovers |
| `--ease-spring` | `cubic-bezier(0.32, 0.72, 0, 1)` | — | Tactile button press, segmented tab & card transitions |

---

## 3. Typography & Numeric Discipline

- **Font Stack**: `Plus Jakarta Sans` (`--font-sans`) for UI & headings; `JetBrains Mono` (`--font-mono`) for telemetry, coordinates, SHA256, tokens, and IDs.
- **Scale & Tracking**:
  - Workspace Title (`h1`): `text-xl sm:text-2xl font-bold tracking-tight text-on-surface`
  - Card / Section Title (`h2`/`h3`): `text-sm` or `text-base font-semibold tracking-tight text-on-surface` (sentence case — avoid shouting `uppercase` on long Vietnamese labels)
  - Field Label: `text-xs font-semibold text-on-surface mb-1.5`
  - Body / Input Text: `text-sm text-on-surface` (`>= 14px` desktop, `16px` mobile inputs where needed)
  - Helper / Optional Marker: `text-xs font-normal text-muted` (`>= 4.5:1` WCAG AA; never `text-slate-400` on white)
- **Tabular Numerals (`tabular-nums`)**: Mandatory on all prices (`₫`), wallet balances, storage quotas (`GB`/`%`), coordinates, countdowns, and KPI metrics so digits never jitter during live updates.

---

## 4. High-Craft Component Patterns

### 4.1 Double-Bezel Machined Containers (`Card variant="machined"` / `.uav-bezel`)
Featured cards (storage drive nodes, booking calculators, escrow wallets, summary decks) use concentric nested geometry instead of heavy drop shadows:
- **Outer Tray**: `rounded-panel bg-surface-container-low p-1 ring-1 ring-black/[0.06]`
- **Inner Core**: `rounded-[calc(var(--radius-panel)-3px)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_2px_rgba(0,0,0,0.04)]`

### 4.2 Tactile Controls & Button-in-Button CTA
- **Sizing & Overflow**: Interactive buttons and pill links use `min-h-8` / `min-h-9` / `min-h-10` + `whitespace-nowrap` (never rigid `h-7` / `h-8` that clips Vietnamese diacritics or Japanese glyphs). Icon-only buttons inside dense rows maintain a `min-h-8 min-w-8` or `min-h-9 min-w-9` hit area with explicit `aria-label` and `title`.
- **High-Craft Primary CTA**: Marketplace & hero conversion CTAs pair a solid capsule with a trailing icon badge (`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5`).
- **Segmented Tabs**: Any `<div role="tablist">` with `<button role="tab" aria-selected={...}>` inside `#workspace`, `#content`, or `[role="dialog"]` automatically inherits the recessed track + elevated active pill styling from `globals.css`.

### 4.3 Form Field Contract (`RequiredMark` / `OptionalMark` + Pure `src/forms/*`)
- Every user-editable field explicitly displays either `<RequiredMark />` (`*` in `text-danger`) or `<OptionalMark />` (`(Tuỳ chọn)` in `text-muted` on Web; `FieldLabel` on Mobile). Read-only/disabled inputs and search/filter toolbars omit markers.
- All validation, trimming, numeric range checks, and DTO payload normalization live in **pure TypeScript modules** under `src/forms/<feature>/*.ts` with **zero imports** from `react`, `next/*`, `@tanstack/react-query`, `@/api/*`, `@/hooks/*`, or `@/components/*`.

---

## 5. Accessibility, Viewport & Motion Guardrails

1. **Modal Focus & Escape (`aria-modal="true"`)**: Every blocking modal dialog MUST wire `useDialogFocusTrap(open, dialogRef)`, close on `Escape`, clamp height with `max-h-[min(90dvh,calc(100dvh-2rem))]`, and label itself via `aria-labelledby` or `aria-label`.
2. **Dynamic Viewport Units (`100dvh`)**: Full-height app shells and modal viewports prefer `min-h-dvh` / `h-dvh` / `max-h-[...dvh]` over `100vh` so iOS Safari / mobile chrome toolbars never clip bottom actions.
3. **GPU-Composited Motion Only**:
   - **Never use `transition-all`**. Specify exact properties (`transition-colors`, `transition-transform`, or `transition-[background-color,border-color,color,box-shadow,transform]`).
   - Progress and quota bars animate via `transform: scaleX(...)` with `origin-left` — never `transition-[width]`.
   - Respect `@media (prefers-reduced-motion: reduce)` globally in `globals.css`.
4. **Modular File Size**: Keep Web `.tsx` UI components `<= 300` lines (and Mobile source files `15..360` lines) by decomposing views into orchestrator, sub-cards, modals, and pure `src/forms/*` logic.
