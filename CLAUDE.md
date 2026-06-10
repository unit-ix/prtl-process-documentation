# Projekt-Konfiguration

> Projektspezifische Claude-Konfiguration für DIESES Repo.
> Geteilte UNIT-IX-Standards inkl. Pflicht-Lektüre: [`.claude/CLAUDE.md`](.claude/CLAUDE.md) (wird automatisch zusätzlich geladen).

## Projektkontext

<!-- Wird im Verlauf des Projekts gefüllt: Kunde, Hauptdomäne, gewählte Connectoren,
     projektspezifische Abweichungen von den UNIT-IX-Standards. -->

## Workflow-Regeln

- **Gated by default**: ein Schritt → Prüfung → nächster Schritt. Autopilot ist **opt-in pro Plan** (`Autopilot: true` im Header, vom `/plan`-Interview vorgeschlagen, vom Dev bestätigt) und läuft Phasen am Stück, stoppt nur bei rotem verify oder am Ende. Keine impliziten autonomen Ketten ohne dieses Flag.
- Lovable liefert das Grundgerüst, Claude iteriert — Build muss nach jedem Schritt grün bleiben.
- `pnpm verify` muss vor jedem Commit grün sein (`pnpm lint && pnpm tsc --noEmit && pnpm build`). Das Gate sitzt im `/commit`-Skill.
- **Einmalig nach dem Lovable-Import:** `/bootstrap <pm-pfad>` — importiert PRD/Datenmodell/Architektur nach `docs/`, fährt den Standards-Audit und erzeugt den ersten Konformitäts-Plan (`Autopilot: false`).
- Für nicht-triviale Änderungen danach: `/plan <slug> [<beschreibung>]` (interview-first, lädt Pflicht-Kontext) → Plan-File inline editieren → `/execute docs/plans/<file>.md` (eine Phase gated, oder alle bei Autopilot) → ggf. nachjustieren → `/commit` (erzeugt mehrere geordnete Phasen-Commits) → `/ship`.
- **Kanonische Workflow-Quelle:** [`.claude/CLAUDE.md`](.claude/CLAUDE.md) Sektion „Workflow-Skills" (5-Kette `/bootstrap → /plan → /execute → /commit → /ship`). Diese Datei führt nur die projektspezifische Kurz-Summary — Details und Repo-Mode-Detection dort.

## Projekt-Doku

| Thema         | Datei                                          |
| ------------- | ---------------------------------------------- |
| Anforderungen | [`docs/prd.md`](docs/prd.md)                   |
| Datenmodell   | [`docs/datamodel.md`](docs/datamodel.md) + [`docs/datamodel.mmd`](docs/datamodel.mmd) |
| Architektur   | [`docs/architecture.md`](docs/architecture.md) |
