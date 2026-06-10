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
- Für nicht-triviale Änderungen: `/plan <slug> [<beschreibung>]` (interview-first, lädt Pflicht-Kontext) → Plan-File inline editieren → `/execute docs/plans/<file>.md` (eine Phase gated, oder alle bei Autopilot) → ggf. nachjustieren → `/commit` (erzeugt mehrere geordnete Phasen-Commits) → `/ship`. Details: [`.claude/CLAUDE.md`](.claude/CLAUDE.md) Sektion "Workflow-Skills (4-Kette)".

## Projekt-Doku

| Thema         | Datei                                          |
| ------------- | ---------------------------------------------- |
| Anforderungen | [`docs/prd.md`](docs/prd.md)                   |
| Datenmodell   | [`docs/datamodel.md`](docs/datamodel.md) + [`docs/datamodel.mmd`](docs/datamodel.mmd) |
| Architektur   | [`docs/architecture.md`](docs/architecture.md) |
