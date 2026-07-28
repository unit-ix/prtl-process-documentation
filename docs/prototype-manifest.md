# Prototype-Manifest

> **Zweck:** Ein einziger Ort, der jedes **PROTOTYPE-ONLY**-Artefakt auflistet — was es
> im Prototyp tut, was es am Fork (supabase/dataverse) ersetzt, und ob der Austausch
> erledigt ist. Der Prototyp lügt bewusst an einigen Stellen (Mock-Daten, Fake-Rollen);
> dieses Manifest macht jede Lüge sichtbar, damit keine davon in Produktion durchrutscht.
>
> **Konvention:** Jede PROTOTYPE-ONLY-Stelle im Code trägt den Marker-Kommentar
> `PROTOTYPE-ONLY` **und** eine Zeile in der Tabelle unten. Kein Marker ohne Zeile,
> keine Zeile ohne Marker. Die `/prototype`-Engine (Part E) pflegt diese Tabelle mit.

## Legende — Status

- `prototype` — nur die Prototyp-Variante existiert (Normalfall vor dem Fork)
- `forked` — Production-Ersatz implementiert, Prototyp-Variante entfernt/abgelöst
- `n/a` — bleibt bewusst auch in Produktion (kein Ersatz nötig)

## PROTOTYPE-ONLY-Artefakte

| Artefakt | Ort | Prototyp-Verhalten | Production-Ersatz | Status |
| --- | --- | --- | --- | --- |
| Rollen-Switcher | `src/shared/components/layout/AppShell.tsx` (`RoleSwitcher`) | UI-Buttons wechseln die Persona frei | Switcher entfällt; Persona wird aus dem Host-User abgeleitet | `prototype` |
| Persona-Quelle | `src/shared/lib/role/RoleContext.tsx` (`RoleProvider`) | Persona = lokaler `useState`, Default `admin` | Eine Zeile: Persona aus Host-Identity / Claims lesen | `prototype` |
| Mock-Adapter | `src/data/adapters/mock/*` | In-Memory-Store implementiert die Ports | `Supabase*Repository` (R4) bzw. `Dataverse*Repository` (R5) am selben Port | `prototype` |
| Seed-Daten (faker) | `src/data/adapters/mock/seed.ts` | Deterministische deutsche Fake-Daten (SEED 42, fixe REF_DATE) | Echte Backend-Daten; faker fällt komplett weg | `prototype` |
| Seeded / laufende ids | `src/data/adapters/mock/store.ts` (`nextId`) | `*-new-N` Sequenz + Seed-uuids | Vom Backend vergebene ids (uuid/GUID) | `prototype` |
| Adapter-Swap-Punkt | `src/data/index.ts` | Nur `backend: mock` verdrahtet, sonst `unsupported()` | Fork ergänzt den `supabase`/`dataverse`-Zweig | `prototype` |
| Error-Simulation | `src/features/_example/pages/ContactsPage.tsx` (`simulateError`) + `hooks/useContacts.ts` | Button erzwingt den DoD-Error-Zustand | Entfällt — echte Ladefehler triggern den Zustand | `prototype` |
| Demo-Anlegen | `src/features/_example/pages/ContactsPage.tsx` (`handleCreateDemoContact`) | Legt einen Platzhalter-Kontakt an | Ersetzt durch echtes Formular pro Feature | `prototype` |
| Referenz-Feature `_example` | `src/features/_example/*` | Kanonisches „mirror this, then delete."-Muster | Gelöscht, sobald das erste echte Feature steht | `prototype` |

## Bewusste `ui/`-Ausnahmen (kein PROTOTYPE-ONLY, bleiben in Produktion)

Stellen in `src/shared/components/ui/` (vendored shadcn) weichen bewusst von einer Posture-Regel ab, tragen aber **keinen** `PROTOTYPE-ONLY`-Marker (deshalb nicht in der Tabelle oben) — sie bleiben auch in Produktion:

- **`sidebar.tsx` — `document.cookie`-Persistenz** (`SIDEBAR_COOKIE_NAME`): der shadcn-Sidebar-Block persistiert den Auf/Zu-Zustand in einem Cookie. Das ist eine harmlose UI-Präferenz (kein App-State, kein Secret), bewusst der „kein `localStorage`/Client-State"-Posture entzogen und als vendored shadcn-Standard **unverändert** übernommen. Kein Fork-Handlungsbedarf.

## Fork-Checkliste (beim Übergang mock → supabase/dataverse)

1. `backend` in `.unitix/project.json` umstellen.
2. Backend-Adapter pro Entität am jeweiligen Port implementieren, `src/data/index.ts` um den Zweig ergänzen.
3. `RoleProvider`: Persona-Quelle auf den Host-User umstellen, `RoleSwitcher` aus `AppShell` entfernen.
4. `_example` löschen (falls noch vorhanden), Error-Simulation + Demo-Anlegen aus echten Features entfernen.
5. faker-Abhängigkeit entfernen, sobald kein Mock-Adapter mehr importiert wird.
6. Jede Zeile oben auf `forked`/`n/a` ziehen — bleibt eine auf `prototype`, ist der Fork nicht fertig.
