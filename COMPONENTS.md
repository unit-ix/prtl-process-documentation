# COMPONENTS — Design-Vokabular (Tag-1-Basis)

> **Regel (nicht verhandelbar):** Nur die hier gelisteten Komponenten + Tokens verwenden.
> **Kein eigenes CSS-File anlegen**, kein Roh-Hex/px, keine Inline-`style`-Farben.
> Jakobs Design-Registry (Roadmap R3) verfeinert Theme + Set später — dieser Vertrag bleibt.

## Token-Vokabular (`src/index.css`)

Die **einzige** Farb-/Radius-Quelle. Komponenten referenzieren nur diese semantischen
Aliases (z. B. `bg-background`, `text-muted-foreground`, `border-border`, `bg-sidebar`),
nie Roh-Werte. Werte sind in **oklch** (shadcn `new-york`, baseColor `neutral`); `.dark`
liefert den Dark-Mode. Mapping nach Tailwind v4 via `@theme inline`.

| Gruppe | Tokens | Einsatz |
| --- | --- | --- |
| Fläche/Text | `--background` / `--foreground` | Seiten-Hintergrund + Standardtext |
| Karten | `--card` / `--card-foreground` | `Card`-Flächen |
| Popover | `--popover` / `--popover-foreground` | Dropdowns, Tooltips, Sheets |
| Primär | `--primary` / `--primary-foreground` | Haupt-Aktionen (`Button` default) |
| Sekundär | `--secondary` / `--secondary-foreground` | Nebenaktionen |
| Gedämpft | `--muted` / `--muted-foreground` | Hilfstext, Platzhalter |
| Akzent | `--accent` / `--accent-foreground` | Hover/aktive Flächen |
| Destruktiv | `--destructive` | Löschen/Fehler |
| Ränder/Felder | `--border`, `--input`, `--ring` | Border, Inputs, Fokusring |
| Radius | `--radius` (+ `-sm/-md/-lg/-xl`) | `rounded-*` |
| Charts | `--chart-1..5` | Diagrammfarben |
| Sidebar | `--sidebar`, `--sidebar-foreground`, `--sidebar-primary(-foreground)`, `--sidebar-accent(-foreground)`, `--sidebar-border`, `--sidebar-ring` | App-Shell-Sidebar (**`--sidebar`, nicht `--sidebar-background`**) |

## Primitives (`src/shared/components/ui/`)

Kanonische shadcn-Komponenten (nicht editieren, außer beim Registry-Refit). Verfügbar:
`button` (+ `buttonVariants`), `card`, `input`, `table`, `skeleton`, `alert-dialog`,
`sidebar` (+ `separator`, `sheet`, `tooltip` als Sidebar-Abhängigkeiten), `sonner`.
Hook: `use-mobile`. Merge-Helfer: `cn()` aus `@/shared/lib/utils`.

Toasts: **immer `sonner`** (`import { toast } from 'sonner'`, `<Toaster />` aus
`@/shared/components/ui/sonner`). **Nie** die alte `toast`-Komponente.

## Layout (`src/shared/components/layout/`)

- **`AppShell`** — die eine Shell: linke `Sidebar` (Header/Content/Footer/Rail) +
  `SidebarInset` (Kopfzeile mit `SidebarTrigger` + Inhalt als `children`).
  Im `SidebarFooter` sitzt der **PROTOTYPE-ONLY Rollen-Switcher** (an `useRole()`
  verdrahtet). Feature-Seiten rendern in den Inset-Bereich.

## Zustands-Primitives (`src/shared/components/state/`) — die 5 DoD-Pflichtzustände

| Komponente | Zustand | Wann |
| --- | --- | --- |
| `AsyncBoundary` | Loading → Error → Empty → Inhalt | Um jedes TanStack-Query-Ergebnis; reicht `isLoading/error/isEmpty` durch |
| `EmptyState` | Empty | Erfolgreich geladen, aber leer |
| `ErrorState` | Error | Ladefehler; optional `onRetry` |
| `NotFound` | 404 | catch-all-Route (`*`) in `App.tsx` |
| `ConfirmDialog` | Confirm | Vor destruktiven Aktionen (Löschen) — kontrolliert (`open`/`onOpenChange`) |

## Rollen-Gating

`useRole()` (aus `@/shared/lib/role/RoleContext`) liefert `{ persona, setPersona, canSee(key), canEdit(key) }`.
Sichtbarkeit/Editierbarkeit **immer** über `canSee`/`canEdit` — nie verstreute `if (persona === …)`.
