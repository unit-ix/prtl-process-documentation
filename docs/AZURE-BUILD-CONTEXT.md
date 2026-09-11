# PRETTL Prozessdokumentation — Build Context for Claude Code

**Repo:** `prtl-process-documentation` (UNIT IX Golden Template + the Lovable prototype pasted in)
**Target:** Azure Static Web App, React + TypeScript
**Release target:** week of **2026-09-14** — *"überwiegend Migration bestehender Funktionalität, wenig Neues"*
**Version:** 2.0 · 2026-09-11 · UNIT IX GmbH

---

## 0. Read this first

### 0.1 What this document is

You are **not** building from scratch. The repo already contains:

- the **UNIT IX Golden Template** — project scaffold, conventions, CI, Azure wiring
- the **Lovable prototype** pasted in — a working React 18 + TypeScript + Vite + Tailwind + shadcn/ui
  app with the finished UI

Your job is to **turn that prototype into the real application** by replacing its invented data model
and workflow with the ones specified here, while keeping its UI.

This document specifies **domain logic only**: the data model, the workflow, permissions, and the
behaviour of each screen. It deliberately does **not** specify infrastructure.

> ### ⚠️ `azure-runbook.md` outranks this document for anything infrastructural
> Database engine and dialect (Azure SQL vs. PostgreSQL), connection strings, resource names,
> hosting, CI/CD, environments, secrets — all of that is defined in **`azure-runbook.md`** in this
> repo. Read it first. Where it and this document disagree on infrastructure, **the runbook wins**.
> The SQL in §3 is written portably; translate it to whatever the runbook specifies.

### 0.2 Priority markers — this is a migration, not a greenfield build

The release window is short and the brief is explicit: migrate what exists, add little. Every
requirement below is tagged:

| Tag | Meaning |
|---|---|
| **MUST** | Required for the 14.09 release. The app is not shippable without it. |
| **SHOULD** | Wanted for the release; cut only under time pressure, and say what you cut. |
| **LATER** | Deliberately out of scope now. Build nothing. Leave the schema able to accept it. |

If you are running out of time, cut **LATER** first, then **SHOULD**. Never silently cut a **MUST** —
stop and report instead.

### 0.3 Authority of sources — when they disagree

| Rank | Source | Applies to |
|---|---|---|
| 1 | **`azure-runbook.md`** | All infrastructure. Absolute. |
| 2 | **Customer change request + Asana tickets** (§10) | Newest decisions. Override everything below. |
| 3 | **The Lovable prototype** | **UI, layout, visual design — and the Prozessbeschreibung editor (§8), which is the source of truth for that feature, not just its looks.** |
| 4 | **The Canvas App in production** (`canvas-app/*.pa.yaml`) | Workflow, data model, permissions, business rules. |
| 5 | **PRD / Architektur / Umsetzungsplan** | Background only. **Do not implement from these** — they describe intent that was deliberately not built. See §0.4. |

### 0.4 Do not "improve" toward the PRD

The PRD describes several things the Canvas app never implemented. A deliberate decision has been
made: **match the Canvas app now, revisit after the Azure build is live.** Specifically, do **not**
build any of these:

| PRD says | Decision |
|---|---|
| Statuses `Abgelöst` and `Zurückgezogen` | **LATER.** Five statuses only (§3.3). |
| QM action "Nachtest anfordern" | **LATER.** Reject is the only return path. |
| An Unterweisung covers **multiple** processes | **No.** Exactly **one process per Unterweisung**, as Canvas. §7. |
| A separate Prozessbibliothek screen | **No.** A filter preset on the process list. §9.3. |
| Word/PDF export of a process | **No.** Explicitly ruled out by the customer. Only the attendance list prints. §7.4. |

### 0.5 Rules for you

1. **Do not invent business logic.** If something is unspecified, it is an open question — list it,
   do not guess. §11 is the current open list.
2. **All UI text is German.** Exact strings are given. Do not translate or reword them.
3. **Every permission is enforced server-side.** The Canvas app has *zero* server-side authorisation —
   every gate is a UI `Visible` expression. Fixing that is the single biggest improvement here.
4. **Every workflow transition is one transactional endpoint.** Never expose a generic PATCH that lets
   a client set `status` directly.
5. **Released editions are immutable.** A released `ProcessVersion` and its snapshot are never updated.
6. **Keep the prototype's UI.** Reuse its components, tokens and layout. Where you need new UI, build it
   from what is already there. The one deliberate visual change is §9.1.
7. Report at the end: what you built, what you cut, what you had to guess.

---

## 1. The application in one page

A German QMS process-documentation tool for **PRETTL Electronics** (Radeberg, ~400 staff, electronics
supplier incl. medical technology), replacing a Power Apps Canvas App running on SharePoint.

Four modules:

1. **Prozesse** — author process documentation against two templates (IMS / PROD), push it through a
   three-stage approval chain, publish immutable editions.
2. **Unterweisungen** — assign staff to be trained on a released process, evidence acknowledgement.
3. **Qualifikationsmatrix** — per-employee instructions, qualifications and tasks.
4. **KI-Assistent** — a finder over released processes.

The app is the **leading authoring system**: no Word/PDF process document is produced, because the
digital approval chain replaces the signature block and the content must stay browser-translatable
(Fertigung staff need Polish — this is a large part of why the app is leaving Canvas at all).

### The four ideas that carry everything

**1 · Shell vs. version.** `Process` holds master data plus a mirror of the last released edition.
`ProcessVersion` holds the content being worked on. **All editing writes the version.** The shell's
content columns are written by exactly one code path: the release transaction.

**2 · `hasActiveDraft` decides what a user sees.** A process can be released at edition 2 *and* in
revision toward edition 3 at the same time. Editors open the draft; everyone else opens the newest
released edition. Getting this wrong means readers see unapproved content — the worst failure mode in
a QMS.

**3 · Rejection is an event, not a status.** Rejecting returns the version to `in_capture` and writes a
`ProcessEvent`. There is no `rejected` status. *(The prototype implements one as a terminal dead end
with no way out. Remove it.)*

**4 · The snapshot is the legal record.** On release the edition is rendered to `snapshotHtml` and
frozen. Audits read the snapshot, not the live fields.

---

## 2. Roles, identity, authorisation — MUST

### 2.1 Identity

Entra ID (per the runbook). Match the token's **`oid`** claim to `User.entraObjectId` — this mirrors
Canvas exactly (`LookUp(tblUser, strAzureId = Text(User().EntraObjectId))`).

A signed-in user with **no `User` row**, or with all four role flags false, has no access: render a
dedicated page, do not fall through to the process list. *(Canvas shows "Keine Berechtigungen
vorhanden." for 500 ms and then navigates them to the list anyway — a bug.)*

Some Fertigung staff have **no M365 mailbox** (`User.mail` empty). They cannot receive mail and cannot
self-confirm; they are handled through Sammelunterweisung (§7.3). Never assume a mail address exists.

**Delete from the prototype:** `src/lib/accessGate.ts`, the `ACCESS_CODE` constant, the access-code form
in `Login.tsx`, and the `sessionStorage` unlock flag. It is a hard-coded password sitting in the public
bundle.

### 2.2 Roles are four independent booleans

| Flag | German | Meaning |
|---|---|---|
| `isAuthor` | Verfasser | Can be assigned a process to write |
| `isProcessOwner` | Prozessverantwortlicher (= Abteilungsleiter) | Content review, **own Bereich only** |
| `isQm` | Qualitätsmanagement | Formal approval, final document number |
| `isAdministrator` | Administrator | Master data, override |

**Not mutually exclusive** — one person can be QM *and* Administrator. Several rules are
`isAdmin || isQm`, which only works with independent flags. The prototype's single `AppRole` enum
cannot express this: replace it.

**Prozessverantwortlicher is area-scoped.** Being PV of *Einkauf* grants nothing over an *EDV/IT*
process:

```ts
ledAreaIds(user) = Area.where(a => a.processOwnerId === user.id).map(a => a.id)
```

### 2.3 Permission predicates — implement verbatim

Put these in shared code used by both the API (enforcement) and the SPA (UI hints).

```ts
canCreateProcess(u)          = u.isAdministrator || u.isProcessOwner
canAssignAuthor(u, p)        = p.status === "backlog"
                               && (u.isAdministrator || (u.isProcessOwner && leadsArea(u, p.areaId)))
canEditContent(u, p, v)      = ["backlog","in_capture"].includes(v.status)
                               && (u.isAdministrator || p.authorId === u.id || leadsArea(u, p.areaId))
canSubmit(u, v)              = v.status === "in_capture"
                               && (u.isAdministrator || v.authorId === u.id)
canApproveContent(u, p, v)   = v.status === "content_review"
                               && (u.isAdministrator || leadsArea(u, p.areaId))
canRejectContent             = canApproveContent
canApproveFormal(u, v)       = v.status === "formal_review" && (u.isAdministrator || u.isQm)
canRejectFormal              = canApproveFormal
canReopen(u, p, v)           = v.status === "approved"
                               && (u.isAdministrator || v.authorId === u.id || leadsArea(u, p.areaId))
canDeleteProcess(u)          = u.isAdministrator || u.isProcessOwner
canManageInstructions(u)     = u.isAdministrator || u.isProcessOwner
canSeeQualifications(u, emp) = u.isAdministrator || leadsArea(u, emp.areaId)
canSeeApprovalTab(u)         = u.isAdministrator || u.isQm || u.isProcessOwner
canSeeSettings(u)            = u.isAdministrator || u.isQm
```

⚠️ Note the parentheses in `canEditContent`. Canvas has
`status in [...] || IsBlank(status) && (roles)` — because `||` binds looser than `&&`, the role clause
is bypassed whenever the status matches, so **anyone can edit**. Implement the intent above.

### 2.4 Read scope on the process list — enforce in the query

| Role | Sees |
|---|---|
| Administrator **or** QM | all active processes, any status |
| Prozessverantwortlicher | `status = 'approved'` **OR** `areaId ∈ ledAreaIds(u)` |
| Verfasser | `status = 'approved'` **OR** `authorId = u.id` |
| no role | `status = 'approved'` only |

Released processes are **open to everyone** — there is no per-process permission, and
`confidentiality` is a label that must not gate access. The only real restriction in the product is
Qualifikationen + Skill-Punkte (§7.5).

The prototype's `ProcessContext` explicitly does not filter (`"Offen für alle – keine rollenbasierte
Filterung"`). Replace that.

---

## 3. Data model — MUST

### 3.1 Portable schema

Written portably; translate to the dialect `azure-runbook.md` specifies. `NVARCHAR(MAX)` → `TEXT` on
PostgreSQL, `BIT` → `BOOLEAN`, `DATETIME2` → `TIMESTAMPTZ`, `INT IDENTITY` → `SERIAL`/`IDENTITY`.

```sql
-- ========================= Stammdaten =========================

CREATE TABLE Area (
  id                INT IDENTITY PRIMARY KEY,
  title             NVARCHAR(200) NOT NULL,      -- "Purchasing"
  shortCode         NVARCHAR(16)  NOT NULL,      -- "PUR" — feeds the identifier
  categoryNumber    TINYINT NOT NULL,            -- 1 | 2 | 3, see §3.4
  processOwnerId    INT NULL,                    -- FK -> User(id), the PV of this Bereich
  isActive          BIT NOT NULL DEFAULT 1,
  CONSTRAINT CK_Area_cat CHECK (categoryNumber IN (1,2,3))
);

CREATE TABLE [User] (
  id                INT IDENTITY PRIMARY KEY,
  entraObjectId     NVARCHAR(64)  NOT NULL UNIQUE,  -- token oid claim
  displayName       NVARCHAR(200) NOT NULL,
  mail              NVARCHAR(320) NULL,             -- NULL for staff without M365
  isAuthor          BIT NOT NULL DEFAULT 0,
  isProcessOwner    BIT NOT NULL DEFAULT 0,
  isQm              BIT NOT NULL DEFAULT 0,
  isAdministrator   BIT NOT NULL DEFAULT 0,
  areaId            INT NULL REFERENCES Area(id),
  isActive          BIT NOT NULL DEFAULT 1
);

-- ========================= Prozesse =========================

CREATE TABLE Process (                            -- the shell / "Hülle"
  id                  INT IDENTITY PRIMARY KEY,
  title               NVARCHAR(400) NOT NULL,
  shortDescription    NVARCHAR(MAX) NULL,
  identifier          NVARCHAR(64)  NULL,         -- NULL until first release
  documentNumber      INT NULL,                   -- per-area running number, minted ONCE
  edition             INT NULL,                   -- mirror of the released edition
  areaId              INT NOT NULL REFERENCES Area(id),
  authorId            INT NULL REFERENCES [User](id),
  currentVersionId    INT NULL,                   -- FK added after ProcessVersion exists
  approvedByQmId      INT NULL REFERENCES [User](id),
  parentProcessId     INT NULL REFERENCES Process(id),  -- VA -> AA, §6
  specificationType   VARCHAR(2)  NOT NULL,       -- 'VA' | 'AA'
  templateType        VARCHAR(4)  NOT NULL,       -- 'IMS' | 'PROD'
  scope               VARCHAR(3)  NULL,           -- 'PE' | 'PER' | 'PEL'
  status              VARCHAR(20) NOT NULL,
  confidentiality     VARCHAR(20) NULL,           -- LABEL ONLY, never gates access
  hasActiveDraft      BIT NOT NULL DEFAULT 0,
  isActive            BIT NOT NULL DEFAULT 1,
  approvedAt          DATETIME2 NULL,
  createdAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  -- mirrored content, written ONLY by the release transaction:
  purpose             NVARCHAR(MAX) NULL,
  scopeDetail         NVARCHAR(MAX) NULL,
  terms               NVARCHAR(MAX) NULL,
  descriptionDoc      NVARCHAR(MAX) NULL,         -- rich-text JSON, §8
  descriptionText     NVARCHAR(MAX) NULL,         -- plain-text projection, §8
  responsibilities    NVARCHAR(MAX) NULL,
  workSequence        NVARCHAR(MAX) NULL,
  method              NVARCHAR(MAX) NULL,
  processParameters   NVARCHAR(MAX) NULL,
  documentationRef    NVARCHAR(MAX) NULL,
  deviationHandling   NVARCHAR(MAX) NULL,
  maintenanceRef      NVARCHAR(MAX) NULL,
  CONSTRAINT UQ_Process_docnum UNIQUE (areaId, documentNumber)   -- race guard, §5.3
);

CREATE TABLE ProcessVersion (                     -- the working record
  id                  INT IDENTITY PRIMARY KEY,
  processId           INT NOT NULL REFERENCES Process(id),
  edition             INT NULL,                   -- NULL on a draft; stamped at release
  status              VARCHAR(20) NOT NULL,       -- AUTHORITATIVE for the UI
  authorId            INT NULL REFERENCES [User](id),
  processOwnerId      INT NULL REFERENCES [User](id),
  approvedByQmId      INT NULL REFERENCES [User](id),
  changeReason        NVARCHAR(MAX) NULL,         -- "Grund der Änderung"
  submittedAt         DATETIME2 NULL,
  contentReviewedAt   DATETIME2 NULL,
  approvedAt          DATETIME2 NULL,
  snapshotHtml        NVARCHAR(MAX) NULL,         -- frozen at release; immutable
  createdAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  -- content fields (11):
  purpose             NVARCHAR(MAX) NULL,  -- 1 · Zweck
  scopeDetail         NVARCHAR(MAX) NULL,  -- 2 · Geltungsbereich
  terms               NVARCHAR(MAX) NULL,  -- Begriffe                      (IMS only)
  descriptionDoc      NVARCHAR(MAX) NULL,  -- Prozessbeschreibung, rich JSON  §8
  descriptionText     NVARCHAR(MAX) NULL,  -- plain-text projection           §8
  responsibilities    NVARCHAR(MAX) NULL,  -- Zuständigkeiten / Verantwortung §10 C4
  workSequence        NVARCHAR(MAX) NULL,  -- Prozessablauf                 (PROD only)
  method              NVARCHAR(MAX) NULL,  -- Verfahren                     (PROD only)
  processParameters   NVARCHAR(MAX) NULL,  -- Prozessparameter              (PROD only)
  documentationRef    NVARCHAR(MAX) NULL,  -- Dokumentationen               (PROD only)
  deviationHandling   NVARCHAR(MAX) NULL,  -- Reaktionsplan bei Abweichungen (PROD only)
  maintenanceRef      NVARCHAR(MAX) NULL,  -- Wartung (Verweis)             (PROD only)
  CONSTRAINT UQ_PV_edition UNIQUE (processId, edition)
);
ALTER TABLE Process ADD CONSTRAINT FK_Process_currentVersion
  FOREIGN KEY (currentVersionId) REFERENCES ProcessVersion(id);

CREATE TABLE ProcessAdditionalField (             -- VERSION-scoped, cloned on reopen
  id                INT IDENTITY PRIMARY KEY,
  processVersionId  INT NOT NULL REFERENCES ProcessVersion(id),
  title             NVARCHAR(200) NOT NULL,
  value             NVARCHAR(MAX) NULL,           -- always plain text
  sortOrder         INT NOT NULL DEFAULT 0
);

CREATE TABLE ProcessLink (                        -- "Mitgeltende Unterlagen", VERSION-scoped
  id                INT IDENTITY PRIMARY KEY,
  processVersionId  INT NOT NULL REFERENCES ProcessVersion(id),
  linkType          VARCHAR(20) NOT NULL,         -- 'InternerProzess' | 'ExternesDokument'
  linkedProcessId   INT NULL REFERENCES Process(id),
  title             NVARCHAR(400) NULL,
  url               NVARCHAR(2000) NULL
);

CREATE TABLE ProcessEvent (                       -- append-only audit + mail trigger
  id                INT IDENTITY PRIMARY KEY,
  processId         INT NOT NULL REFERENCES Process(id),
  processVersionId  INT NULL REFERENCES ProcessVersion(id),
  createdAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  eventKind         VARCHAR(32) NOT NULL,
  newStatus         VARCHAR(20) NOT NULL,
  actorId           INT NOT NULL REFERENCES [User](id),
  comment           NVARCHAR(MAX) NULL,           -- mandatory on reject
  recipientEmail    NVARCHAR(320) NULL,           -- NULL => no mail
  isSent            BIT NOT NULL DEFAULT 0,
  sentAt            DATETIME2 NULL,
  sendError         NVARCHAR(MAX) NULL
);
CREATE INDEX IX_ProcessEvent_process ON ProcessEvent(processId, createdAt);

CREATE TABLE ProcessDocument (                    -- PROCESS-scoped, shared across editions
  id                INT IDENTITY PRIMARY KEY,
  processId         INT NOT NULL REFERENCES Process(id),
  fileName          NVARCHAR(400) NOT NULL,
  blobPath          NVARCHAR(1000) NOT NULL,
  contentType       NVARCHAR(200) NOT NULL,
  sizeBytes         BIGINT NOT NULL,
  uploadedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  uploadedById      INT NOT NULL REFERENCES [User](id),
  isActive          BIT NOT NULL DEFAULT 1
);

-- ========================= Unterweisungen =========================

CREATE TABLE Instruction (
  id                INT IDENTITY PRIMARY KEY,
  processId         INT NOT NULL REFERENCES Process(id),   -- EXACTLY ONE process, §7
  instructionType   VARCHAR(10) NOT NULL,                  -- 'Einzel' | 'Sammel'
  dueDate           DATE NULL,                             -- default created + 14 days
  recurrence        VARCHAR(30) NOT NULL DEFAULT 'Keine Wiederholung',
  note              NVARCHAR(MAX) NULL,
  createdById       INT NOT NULL REFERENCES [User](id),
  createdAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  isActive          BIT NOT NULL DEFAULT 1
);

CREATE TABLE InstructionParticipant (
  id                INT IDENTITY PRIMARY KEY,
  instructionId     INT NOT NULL REFERENCES Instruction(id),
  userId            INT NOT NULL REFERENCES [User](id),
  status            VARCHAR(20) NOT NULL DEFAULT 'Offen',  -- Offen|Bestätigt|Abgelehnt
  notifiedAt        DATETIME2 NULL,
  confirmedAt       DATETIME2 NULL,
  notifyStatus      VARCHAR(20) NULL,                      -- In Bearbeitung|Fertig|Fehler
  confirmToken      UNIQUEIDENTIFIER NULL,                 -- mail confirm links, §7.3
  tokenExpiresAt    DATETIME2 NULL,
  isActive          BIT NOT NULL DEFAULT 1,
  CONSTRAINT UQ_IP UNIQUE (instructionId, userId)
);

CREATE TABLE InstructionDocument (                -- scanned signature lists
  id                INT IDENTITY PRIMARY KEY,
  instructionId     INT NOT NULL REFERENCES Instruction(id),
  fileName          NVARCHAR(400) NOT NULL,
  blobPath          NVARCHAR(1000) NOT NULL,
  contentType       NVARCHAR(200) NOT NULL,
  sizeBytes         BIGINT NOT NULL,
  uploadedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  uploadedById      INT NOT NULL REFERENCES [User](id),
  isActive          BIT NOT NULL DEFAULT 1
);

-- ========================= Qualifikationsmatrix =========================

CREATE TABLE Qualification (
  id                INT IDENTITY PRIMARY KEY,
  userId            INT NOT NULL REFERENCES [User](id),
  title             NVARCHAR(400) NOT NULL,
  description       NVARCHAR(MAX) NULL,
  acquiredAt        DATE NULL,
  expiresAt         DATE NULL,                    -- NULL = never expires
  skillPoints       TINYINT NULL,                 -- 1..4, capability NOT performance
  reminderSentAt    DATETIME2 NULL,               -- §7.7
  isActive          BIT NOT NULL DEFAULT 1,
  CONSTRAINT CK_Qual_pts CHECK (skillPoints BETWEEN 1 AND 4)
);

CREATE TABLE UserTask (                           -- "Aufgaben / Tätigkeiten"
  id                INT IDENTITY PRIMARY KEY,
  userId            INT NOT NULL REFERENCES [User](id),
  title             NVARCHAR(400) NOT NULL,
  description       NVARCHAR(MAX) NULL,
  isActive          BIT NOT NULL DEFAULT 1
);

CREATE TABLE QualificationDocument (
  id                INT IDENTITY PRIMARY KEY,
  qualificationId   INT NOT NULL REFERENCES Qualification(id),
  fileName          NVARCHAR(400) NOT NULL,
  blobPath          NVARCHAR(1000) NOT NULL,
  contentType       NVARCHAR(200) NOT NULL,
  sizeBytes         BIGINT NOT NULL,
  uploadedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  isActive          BIT NOT NULL DEFAULT 1
);
```

**Everything is a soft delete** (`isActive = false`). Every list query filters on it.

### 3.2 Replacing the prototype's types

Rewrite `src/types/process.ts` to match §3.1 and **delete these invented types together with every UI
that renders them** — none exist in Canvas, the customer's model, or this spec:

`ProcessSection`, `ProcessTask`, `TaskType`, `TASK_TAGS`, `RaciEntry`, `RaciType`,
`COMMON_RACI_ROLES`, `ProcessScope`, `ProcessResponsibilities`, `ProcessKpi`, `ProcessOverview`,
`GlossaryEntry`, `RelatedRegulation`, `Attachment`, `Confidentiality` (keep the column, drop the
enforcement type), `ApprovalEntry`, `VersionEntry`, `HistoryEntry`, `CustomFieldType`,
`ProcessCustomField`, `SiteUnit`, `Department`, `ProcessCategory`, `ProcessArea`, `AppRole`,
`DemoUser`, `ValidationNote`.

Delete these files and their imports/routes: `ProcessBpmDiagram.tsx`, `ProcessVersionSheet.tsx`,
`ValidationNotes.tsx`, `ProcessMap.tsx` (+ `/process-map`), `Library.tsx` + `LibraryDetail.tsx`
(+ `/library` routes — see §9.3), `ProcessAssistant.tsx` (+ route), `assistant/QuestionPanel.tsx`,
`assistant/VoiceOverlay.tsx` (a non-functional fake microphone), `data/processQuestions.ts`,
`lib/processPdf.ts` (§0.4), and the unused brand assets `sab-logo.svg`, `efw-logo.png`,
`unit-ix-logo.png.asset.json`.

There is **no step model** — the "process flow" is plain multi-line text in `workSequence` /
`descriptionDoc`.

### 3.3 Enumerations

```ts
export type SpecificationType = "VA" | "AA";
export const SPEC_TYPE_LABELS = { VA: "Verfahrensanweisung (VA)", AA: "Arbeitsanweisung (AA)" };

export type TemplateType = "IMS" | "PROD";
export const TEMPLATE_TYPE_LABELS = { IMS: "Standard (IMS)", PROD: "Fertigung (PROD)" };

export type Scope = "PE" | "PER" | "PEL";          // single value, not an array
export const SCOPE_LABELS = {
  PE: "PE – Prettl Electronics", PER: "PER – Standort Radeberg", PEL: "PEL",
};

/** Exactly five. Canvas parity. Abgelöst / Zurückgezogen are LATER (§0.4). */
export type ProcessStatus =
  | "backlog" | "in_capture" | "content_review" | "formal_review" | "approved";
export const PROCESS_STATUS_LABELS: Record<ProcessStatus,string> = {
  backlog: "Backlog", in_capture: "In Erfassung", content_review: "Inhaltliche Prüfung",
  formal_review: "Formelle Prüfung", approved: "Freigegeben",
};
/** There is NO "rejected" status — see §1 idea 3. Remove the prototype's. */

export type EventKind =
  | "assigned" | "submitted" | "content_approved" | "content_rejected"
  | "formally_approved" | "formally_rejected" | "revision_started";
export const EVENT_LABELS: Record<EventKind,string> = {
  assigned: "Verfasser zugewiesen",
  submitted: "Eingereicht",
  content_approved: "Inhaltlich freigegeben",
  content_rejected: "Zurückgegeben (inhaltliche Prüfung)",
  formally_approved: "Formell freigegeben",
  formally_rejected: "Formell abgelehnt",
  revision_started: "Überarbeitung gestartet",
};
export const EVENT_TONE: Record<EventKind,"neutral"|"success"|"danger"> = {
  assigned:"neutral", submitted:"neutral", content_approved:"neutral",
  content_rejected:"danger", formally_approved:"success", formally_rejected:"danger",
  revision_started:"neutral",
};

export type LinkType = "InternerProzess" | "ExternesDokument";
export type InstructionType = "Einzel" | "Sammel";
export const INSTRUCTION_TYPE_LABELS = {
  Einzel: "Einzelunterweisung", Sammel: "Sammelunterweisung",
};
export type Recurrence =
  | "Keine Wiederholung" | "Vierteljährlich" | "Halbjährlich" | "Jährlich";
export type ParticipantStatus = "Offen" | "Bestätigt" | "Abgelehnt";
export type NotifyStatus = null | "In Bearbeitung" | "Fertig" | "Fehler";

/** DERIVED, never stored — §7.2 */
export type InstructionStatus = "Offen" | "Überfällig" | "Abgeschlossen";
```

### 3.4 Prozesskategorie

```ts
export const CATEGORY_LABELS: Record<1|2|3, string> = {
  1: "übergeordneter Prozess", 2: "Kernprozess", 3: "Unterstützungsprozess",
};
```

Seed 18 Bereiche from the customer's *Bereiche.md* (2026 structure). Two blockers to resolve before
seeding, both in §11: the shortCode **"F / T"** contains a space and a slash and cannot go into an
identifier; and **POD**'s category is inconsistent (2 vs 3) in the proposal.

---

## 4. The process workflow — MUST

```
                  ┌──────── T7 "Überarbeiten" → NEW version row ────────┐
                  │                                                      │
 [T0] → backlog ─T1 zuweisen→ in_capture ─T2 einreichen→ content_review   │
                                  ▲   ▲                      │  │        │
                                  │   └─ T4 zurückgeben ◄────┘  │        │
                                  │      (Grund pflicht)        T3       │
                                  │                             ▼        │
                                  └── T6 ablehnen ──────── formal_review  │
                                      (Grund pflicht)            │       │
                                                                 T5       │
                                                                 ▼       │
                                                             approved ───┘
```

Every transition is **one endpoint, one transaction**, writing version + shell + event together.
Never write only one of the three.

| # | Endpoint | From → To | Guard | Writes |
|---|---|---|---|---|
| **T0** | `POST /api/processes` | — → `backlog` | `canCreateProcess` | shell (`hasActiveDraft=true`, no identifier/edition) + version (`backlog`) + back-patch `currentVersionId`. **No event, no mail.** Toast `Prozess angelegt (Backlog).` |
| **T1** | `POST /api/processes/{id}/assign-author` | `backlog` → `in_capture` | `canAssignAuthor` | version: `authorId`, `status`. shell: same. event `assigned`, **`actorId` = the assigned author**, recipient = that author's mail. Toast `Verfasser zugewiesen. Prozess ist jetzt in Erfassung.` |
| **T2** | `POST /api/processes/{id}/submit` | `in_capture` → `content_review` | `canSubmit` **and** completeness = 100% (§5.4) | version: `status`, `submittedAt`. shell: `status`. event `submitted`, recipient = **the area's PV**. Toast `Zur inhaltlichen Prüfung eingereicht.` |
| **T3** | `POST /api/processes/{id}/approve-content` | `content_review` → `formal_review` | `canApproveContent` | version: `status`, `contentReviewedAt`, `processOwnerId = actor`. shell: `status`. event `content_approved`, recipient = QM (§7.6). Toast `Inhaltlich freigegeben – liegt beim QM.` |
| **T4** | `POST /api/processes/{id}/reject-content` | `content_review` → `in_capture` | `canRejectContent`, **`comment` required** | version: `status`, **clear `submittedAt` + `contentReviewedAt`**. shell: `status`. event `content_rejected` + comment, recipient = version author. Toast `Rückfrage an den Verfasser gesendet.` |
| **T5** | `POST /api/processes/{id}/approve-formal` | `formal_review` → `approved` | `canApproveFormal` | The release transaction — §5.1 |
| **T6** | `POST /api/processes/{id}/reject-formal` | `formal_review` → `in_capture` | `canRejectFormal`, **`comment` required** | as T4, event `formally_rejected`. Toast `Prozess abgelehnt – zurück an den Verfasser.` |
| **T7** | `POST /api/processes/{id}/reopen` | `approved` → new version `in_capture` | `canReopen` | The clone transaction — §5.5 |
| **T8** | `DELETE /api/processes/{id}` | `backlog`\|`in_capture` → soft-deleted | `canDeleteProcess` | shell `isActive=false`, **cascade** to its versions, links, fields, documents. *(Canvas orphans them.)* |

**On T4 and T6, clear `submittedAt` and `contentReviewedAt`.** Canvas leaves them, so the
Genehmigungsverzeichnis shows sign-off timestamps from a superseded round. The table must describe the
current round.

---

## 5. Release, numbering, completeness — MUST

### 5.1 The release transaction (T5) — the most important code in the app

```ts
async function approveFormal(processId: number, actor: User, tx: Tx) {
  const process = await tx.process.forUpdate(processId);
  const version = await tx.version.forUpdate(process.currentVersionId!);
  assert(canApproveFormal(actor, version), 403);

  // 1 · Edition — per process, monotonic
  const newEdition = ((await tx.version.maxEdition(processId)) ?? 0) + 1;

  // 2 · Document number — per AREA, minted ONCE and never again
  let documentNumber = process.documentNumber;
  if (documentNumber == null) {
    documentNumber = ((await tx.process.maxDocumentNumber(process.areaId)) ?? 0) + 1;
  }

  // 3 · Identifier — stable for the life of the process
  const area = await tx.area.get(process.areaId);
  const identifier = process.identifier ?? [
    process.specificationType,                    // VA | AA
    process.scope,                                // PE | PER | PEL
    area.categoryNumber,                          // 1 | 2 | 3   (stays here — §10 C2)
    `${area.shortCode}.${String(documentNumber).padStart(3, "0")}`,
  ].join(" ");                                    // → "VA PE 1 IMS.001"

  // 4 · Freeze the snapshot
  const snapshotHtml = renderSnapshot({ process, version, area, edition: newEdition,
                                        additionalFields, links });

  // 5 · The version becomes the live edition
  await tx.version.update(version.id, {
    status: "approved", edition: newEdition, approvedAt: now(),
    approvedByQmId: actor.id, snapshotHtml,
  });

  // 6 · Mirror onto the shell — the ONLY place this happens
  await tx.process.update(process.id, {
    status: "approved", edition: newEdition, documentNumber, identifier,
    approvedAt: now(), approvedByQmId: actor.id, hasActiveDraft: false,
    ...pick(version, CONTENT_FIELDS),
  });

  // 7 · Event → queued mail
  await tx.event.insert({
    processId, processVersionId: version.id, eventKind: "formally_approved",
    newStatus: "approved", actorId: actor.id,
    recipientEmail: (await tx.user.get(version.authorId!)).mail,
  });
}
// Toast: `Prozess freigegeben (Ausgabe ${newEdition}, ${identifier}).`
```

`ProcessLink` and `ProcessAdditionalField` are **not** mirrored onto the shell — they stay
version-scoped, and the released version keeps them because the next draft is a clone.

### 5.2 Identifier format

```
{VA|AA} {PE|PER|PEL} {1|2|3} {AreaShortCode}.{NNN}     e.g.  VA PE 1 IMS.001
```

The category number **stays in the identifier** and must **never** appear in a process **title** (§10 C2).

### 5.3 Two Canvas numbering defects to fix

1. **Canvas re-mints `documentNumber` on every release**, so `VA PE 2 EK.001` can become
   `VA PE 2 EK.007` at edition 2. An identifier that changes is not an identifier. **Mint once on first
   release, keep forever** — the `process.identifier ?? …` above does this.
2. **`max()+1` with no uniqueness guard races.** Two simultaneous releases in one area collide. Rely on
   `UQ_Process_docnum` plus row locking (or a per-area sequence), and retry on conflict.

### 5.4 Completeness — the customer changed this

```ts
export function completeness(v: ProcessVersion, t: TemplateType) {
  const checks = [
    { key: "purpose",          label: "Zweck",                           ok: !!v.purpose },
    { key: "scopeDetail",      label: "Geltungsbereich",                 ok: !!v.scopeDetail },
    ...(t === "IMS"
      ? [{ key: "terms",       label: "Begriffe",                        ok: !!v.terms }]
      : []),
    { key: "responsibilities", label: "Zuständigkeiten / Verantwortung", ok: !!v.responsibilities },
    { key: "description",      label: "Prozessbeschreibung",             ok: !!v.descriptionText?.trim() },
  ];
  const done = checks.filter(c => c.ok).length;
  return { checks, done, total: checks.length,
           percent: Math.round((done / checks.length) * 100) };
}
```

**IMS = 5 checks, PROD = 4.** *Mitgeltende Unterlagen* is **removed** from the weighting (§10 C3) — the
customer has documents that would otherwise never reach 100%. The field stays; it just does not count.

This also repairs a Canvas defect: its check set included `terms`, which is IMS-only in the editor, so
a PROD process could never reach 100%. Both templates are now reachable.

Note the Prozessbeschreibung check reads `descriptionText`, not the JSON — an "empty" rich document is
still a non-empty JSON object.

On a blocked submit return 422 `Bitte zuerst alle Pflichtangaben ausfüllen.` and disable the button
client-side with the same text as a tooltip.

### 5.5 The clone transaction (T7 "Überarbeiten")

```ts
async function reopenForRevision(processId, actor, changeReason, tx) {
  const released = await tx.version.latestApproved(processId);
  assert(canReopen(actor, process, released), 403);

  const draft = await tx.version.insert({
    processId, status: "in_capture", edition: null,      // stamped only at release
    authorId: released.authorId, changeReason,
    ...pick(released, CONTENT_FIELDS),
  });
  await tx.additionalField.cloneTo(released.id, draft.id);
  await tx.link.cloneTo(released.id, draft.id);          // BOTH link types
  await tx.process.update(processId, {
    status: "in_capture", hasActiveDraft: true, currentVersionId: draft.id,
  });
  await tx.event.insert({
    processId, processVersionId: draft.id, eventKind: "revision_started",
    newStatus: "in_capture", actorId: actor.id, recipientEmail: null,   // no mail
  });
}
// Toast: "Neue Ausgabe zur Bearbeitung geöffnet."
```

The released edition **stays live and readable** throughout. Documents are process-scoped, not cloned.

### 5.6 The snapshot renderer

Self-contained, inline-styled HTML. Simple and stable — it must render identically in five years.
Render `descriptionDoc` to HTML at snapshot time (§8.3). Escape all user content.

```
header:   {title}
          {identifier} · Ausgabe {edition} · {area.title}
always:   "1 · Zweck"                             purpose
          "2 · Geltungsbereich"                   scopeDetail
IMS:      "3 · Begriffe"                          terms
          "4 · Zuständigkeiten / Verantwortung"   responsibilities
          "5 · Prozessbeschreibung"               descriptionDoc → HTML
PROD:     "3 · Prozessbeschreibung"               descriptionDoc → HTML
          "4 · Prozessablauf"                     workSequence
          "4.1 · Zuständigkeiten / Verantwortung" responsibilities
          "5.1 · Verfahren"                       method
          "5.2 · Prozessparameter"                processParameters
          "5.3 · Dokumentationen"                 documentationRef
          "5.4 · Reaktionsplan bei Abweichungen"  deviationHandling
          "5.5 · Wartung (Verweis)"               maintenanceRef
if any:   "Weitere Felder"                        each additional field
if any:   "Mitgeltende Unterlagen"                one bullet per link
```

Empty values render `—`; preserve line breaks.

---

## 6. VA / AA — two-level structure — SHOULD

Source: Asana *"Prozesse zweistufig gliedern: Verfahrensanweisung und Arbeitsanweisung"*.

> Prozesse werden auf zwei Ebenen gegliedert. Darstellung als gruppierte, aufklappbare Ansicht
> (Baumstruktur mit zwei Stufen). **Vom Design her bewusst einfach halten.**
> Offen: ob technisch eine echte Zuordnung eines Prozesses zu einem bestehenden Prozess nötig ist oder
> ob eine reine Darstellungsebene ausreicht.

**Build:**

- `Process.parentProcessId` (nullable) is already in the schema. Populate it when an **AA** is created
  under a **VA**. This settles the open question in the cheapest safe direction: a real FK costs almost
  nothing and a display-only grouping cannot be upgraded later without a migration.
- Validation: `parentProcessId` may only be set when `specificationType = 'AA'`, and the parent must be
  a `'VA'`. A VA never has a parent. An **AA may stand alone** (null parent) — do not force one.
- The process list renders a **two-level collapsible tree**: VA rows as group headers with their AAs
  nested beneath, standalone processes at top level. Keep it visually plain — a chevron and indentation,
  built from the prototype's existing table. Do not build drag-and-drop, breadcrumbs, or a tree sidebar.
- Assigning the parent is a single optional select **"Übergeordnete Verfahrensanweisung"** in the
  create form and the edit page, listing active `VA` processes.

**Do NOT build:** any numbering derived from the parent. An AA gets its own running number exactly like
a VA. Deriving the identifier from the parent makes re-parenting a breaking change to a legal
identifier, and nobody has asked for it. See §11 Q1.

---

## 7. Modules

### 7.1 Unterweisungen — one process per Unterweisung — MUST

**Exactly one process per Unterweisung**, as the Canvas app has it (`Instruction.processId`). The PRD
describes a multi-process variant; it was not built and is **not** in scope (§0.4).

Creation form — visible only when `canManageInstructions`:

| Field | Rule |
|---|---|
| Art | required, `Einzel` \| `Sammel` |
| Prozess | required, single select, **only `status = 'approved'`**, labelled `{identifier} · {title}` |
| Teilnehmer | required, multi-select over **all active users**, with a whole-Bereich shortcut |
| Frist | date, **default = today + 14 days** |
| Wiederholung | optional (§7.8) |
| Hinweistext | optional, multi-line |

⚠️ Canvas sources its participant picker from `Filter(tblUser, blnIsAuthor)` — only users flagged
*Verfasser* can be picked as training recipients. That is a copy-paste defect from an author picker.
Use all active users.

**Implement create AND update as separate paths.** Canvas always inserts, so editing an instruction
silently creates a duplicate row.

### 7.2 Instruction status is derived, never stored — MUST

```ts
const total = participants.length;
const done  = participants.filter(p => p.status === "Bestätigt").length;
if (total > 0 && done === total)                return "Abgeschlossen";
if (dueDate && dueDate < today && done < total) return "Überfällig";
return "Offen";
```

Canvas stores a status that only one of its three confirmation paths ever writes, so the stored value
drifts. Derive it; expose counts read-only. The prototype's `getTrainingStatus` already does exactly
this — keep it.

### 7.3 The two confirmation paths — MUST

**Einzel — by mail.** This is the real design, and the reason the in-app acknowledgement card in Canvas
is hard-coded invisible. `flw_Instruction_Notify` sends *Send email with options* with two buttons,
**`Bestätigen`** and **`Kann ich nicht bestätigen`**, and the reply writes the participant row.

That connector action is Power-Automate-only: it pauses the flow run until someone clicks, and Microsoft
hosts the waiting. Microsoft Graph only *sends* mail — it has no "wait for a click". So rebuild the same
UX with **signed one-time links**:

```
POST /api/instructions/{id}/notify        → for each open participant WITH a mail address:
                                             mint confirmToken (GUID, 30-day expiry),
                                             set notifyStatus='In Bearbeitung', enqueue mail
GET  /api/confirm/{token}?answer=yes|no   → ANONYMOUS, token-authenticated, single-use
```

The mail carries two buttons pointing at that endpoint; the recipient clicks straight from Outlook, no
login, and lands on a small German confirmation page. On `yes`: `status='Bestätigt'`,
`confirmedAt=now()`. On `no`: `status='Abgelehnt'`. Either way clear the token and set
`notifyStatus='Fertig'`; on send failure `'Fehler'`. This is strictly better than the connector — you
can see who clicked, resend, and expire links.

Also expose an **in-app** path for logged-in participants: a card **"Ihre Kenntnisnahme"** with the
checkbox *"Ich habe den Prozess gelesen und verstanden."*, a **`Bestätigen`** button enabled only when
ticked, and afterwards a green banner *"Sie haben diese Unterweisung am {dd.mm.yyyy} bestätigt."*

**Sammel — on paper.** No mails. Print the attendance template → collect wet signatures → upload the
scan → a manager confirms. **At least one uploaded document is a hard precondition** for both the bulk
and per-row confirm buttons — keep that gate.

Info banner for a Sammel instruction with no documents yet, verbatim:

> Sammelunterweisung: Vorlage drucken, von allen Teilnehmern unterschreiben lassen, unterschriebene
> Liste hier hochladen und anschließend über „Bestätigungen" alle Teilnehmer bestätigen.

**Reminders:** `POST /api/instructions/{id}/remind` (all open) and
`.../participants/{pid}/remind` (one). Disabled while `notifyStatus = 'In Bearbeitung'` so a queued mail
is never double-sent. Hidden for participants with no mail address — show `Keine E-Mail` instead.

### 7.4 The attendance list — the only print artefact — MUST

A4, from the Sammel detail page. Title (`Sammelunterweisung` / `Einzelunterweisung`), the process as
`{identifier} · {title}`, a key/value block (Frist, Wiederholung, Hinweis), then a signature table
**`Name | Abteilung | Unterschrift`** with the third column left blank, and a footer with the creation
date. Server-rendered PDF or a print stylesheet — either is fine.

Participant table columns: `Name | Abteilung | Status | Benachrichtigt | Bestätigt am`.
Status pills: `Bestätigt` green with a check (showing `confirmedAt`), `Abgelehnt` red, `Offen` muted.
Dates `dd.mm.yyyy`, `-` when absent.

**Delete** soft-deletes the instruction *and* its participant rows. *(Canvas hard-deletes the children,
destroying the training record.)*

### 7.5 Qualifikationsmatrix — MUST

Despite the name it is **not a grid**. There is no people × skills matrix, no coloured cells, no 0–4
legend rendered as a matrix anywhere in Canvas. It is an employee list plus a per-employee tabbed panel
— which is what the prototype already builds. **Do not build a matrix grid.**

List columns: `Mitarbeiter | Abteilung | Unterweisungen | Qualifikationen | Aufgaben` — the last three
are counts. **Qualifikationen counts only non-expired records** (`expiresAt IS NULL OR expiresAt >= today`).

Filters: `Alle Abteilungen`, `Alle Qualifikationen`, search (`Mitarbeiter, Qualifikation`),
`Alle Aufgaben`. The qualification and task filters test whether the employee has *any* matching record.

| Tab | Visibility | Content |
|---|---|---|
| **Unterweisungen** | everyone | read-only, derived from confirmed `InstructionParticipant` rows |
| **Qualifikationen** | `canSeeQualifications` — **Admin or the PV of that employee's Bereich** | title, description, `acquiredAt`, `expiresAt`, badge `{n} Pkt.` |
| **Aufgaben** | everyone | title + description, free-text role documentation |

This is the **only genuine access restriction in the product**. Everyone else sees a lock message.

> **Skill points 1–4 measure Prozessstabilität und Vertretbarkeit — who can cover for whom. They are
> explicitly NOT a performance rating.** Say so in the UI. This has works-council and data-protection
> implications: build no ranking, no averages, no leaderboards.

**Expiry is manual** — `expiresAt` is typed by a human; there is no validity-interval arithmetic. Show a
red `abgelaufen` pill and a red date when it is in the past.

⚠️ Canvas lists only `Filter(tblUser, blnIsAuthor)` here too — same defect as §7.1. Use all active users.

Qualifications and tasks: create **and** update (Canvas always inserts → duplicates). `title` required.
Soft delete with a confirmation dialog. *(Canvas's delete button sets a flag that no modal consumes, so
it deletes instantly with no confirmation.)*

### 7.6 Mail — MUST

Replaces `flw_Process_Status_Notify`, which polls SharePoint every 60 seconds. Build a
**queue-triggered function**: on `ProcessEvent` insert with a non-null `recipientEmail`, enqueue
`{eventId}`; the worker renders the template, sends via Microsoft Graph `sendMail`, then sets `isSent`,
`sentAt`, or `sendError`. Immediate instead of up-to-a-minute late, with retry and a dead-letter queue.

| `eventKind` | Subject | Recipient |
|---|---|---|
| `assigned` | `Prozess zur Bearbeitung: {title}` | the assigned author |
| `submitted` | `Inhaltliche Prüfung erforderlich: {title}` | the area's PV |
| `content_approved` | `Formelle Prüfung (QM): {title}` | QM (see below) |
| `content_rejected` | `Rückfrage zu deinem Prozess: {title}` | the version author |
| `formally_approved` | `Prozess freigegeben: {title}` | the version author |
| `formally_rejected` | `Prozess abgelehnt: {title}` | the version author |
| `revision_started` | — | none (`recipientEmail` null) |

Body style, ported from the existing templates: `font-family: Segoe UI, system-ui, sans-serif;
font-size: 15px; color: #1C1917; max-width: 560px`, with a card `background:#FAFAF9; border:1px solid
#E7E5E0; border-radius:12px; padding:16px 20px`. Success uses `#DCFCE7` / `#166534`; rejection quotes
the reason. The release mail includes the **Dokumentnummer**. Every mail ends with a deep link — keep
the parameter name **`?pid={processId}`** so links in old mails still resolve.

⚠️ The current `Formell Abgelehnt` template has an HTML-escaped body (`&lt;div …`) and arrives as
visible markup. Rewrite it properly.

**QM recipient:** Canvas mails `LookUp(tblUser, blnIsQM).strMail` — the *first* QM row found,
arbitrarily. **Mail all active QM users.** If none exist, fall back to Administrators and log.

### 7.7 Qualification expiry sweep — SHOULD

Replaces `flw_Qualification_Expiry_Reminder`: a daily timer. Keep the behaviour exactly —
**60-day lead time**, filter `expiresAt <= today+60 AND expiresAt >= today AND isActive`, recipient =
**the PV of the employee's area**. Subject `Qualifikation läuft ab: {title}`, amber card
(`#FEF3C7` / `#F5D98B` / `#92400E`), naming the employee and the expiry date.

Two defects to fix: Canvas's `blnReminderSent` boolean is **never reset**, so a renewed qualification
never gets a second reminder — use `reminderSentAt` and re-notify when `expiresAt` moved after it. And
if the area has **no PV**, Canvas silently skips — fall back to Administrators and log.

### 7.8 Instruction recurrence — LATER

`Instruction.recurrence` is stored by Canvas and **no flow ever reads it**. Nothing opens the next round.
Keep the column and the picker; build no scheduler. See §11 Q3.

### 7.9 Uploads — MUST

Replaces `flw_Upload_File`, which creates the file, **responds 200 immediately**, and only then sets the
owning lookup — so a failure after the response orphans the file.

`POST /api/{entity}/{id}/documents` → validate → write to blob (`processes/{id}/…`,
`instructions/{id}/…`, `qualifications/{id}/…`) → insert the row → **then** respond. Serve downloads
through the API with a short-lived SAS; the container is private.

Validation Canvas has none of: allow images, PDF, Excel, Word; max 20 MB; reject executables. Deleting a
document asks for confirmation first.

### 7.10 KI-Assistent — SHOULD

A **finder**, not an explainer. One question in, a short German answer plus process cards out.

```
POST /api/assistant/ask   { question }  →  { answer, hits: [{ processId, identifier, title }] }
```

- Retrieval **server-side**. Keep the existing lightweight index — `{id, identifier, shortDescription,
  title, purpose, areaTitle}` over released processes, newline-joined. It works, and the corpus is a few
  hundred processes. Azure AI Search only if recall proves insufficient — **LATER**.
- **Released content only**, and **respect the caller's read scope** (§2.4). Neither the Canvas app nor
  the prototype does this; the assistant must not surface a draft or an out-of-scope process.
- Render **every** hit as a card `{identifier} - {title}` with an **Open** button going to that process's
  newest released edition. *(Canvas parses all hits and renders only the first.)*
- Keep the German empty-state hint and `Chat löschen`. On failure:
  `Es gab ein Problem bei der Suche. Bitte versuche es erneut.`

> 🔴 **The existing Azure AI key is compromised.** It is hard-coded in plaintext in the
> `flw_Process_Assistant` HTTP action, and that flow definition ships inside the exported solution.
> **Rotate it.** In Azure use a managed identity, or Key Vault via app settings — never a header
> literal, never anything that exports in cleartext.

---

## 8. Das Beschreibungsfeld — "das Kernstück der Anwendung" — MUST

Asana: *"Das Beschreibungsfeld ist das Kernstück der Anwendung. Es muss zuverlässig funktionieren und
zuverlässig gespeichert werden. Orientierung am Lovable-Prototyp mit allen Bearbeitungsfunktionen
(Einfügen von Bildern, Tabellen, Texthierarchien...). Ansatz: Speicherung in einer JSON-Spalte."*

**The prototype is the source of truth for this feature — not just its styling, its behaviour.** Keep
`src/features/process-description/` and everything in it: the TipTap editor, the toolbar, the table
context menu (right-click row/column insert/delete, merge/split), the `PanelExtension` callout blocks,
the `SizedImage` node with its width picker, the slash-command menu, and the read-only renderer.

### 8.1 Storage

Two columns, written together, never separately:

| Column | Content | Used by |
|---|---|---|
| `descriptionDoc` | the TipTap/ProseMirror JSON document | the editor, the read view |
| `descriptionText` | a plain-text projection extracted on save | completeness (§5.4), search, the assistant index |

Deriving `descriptionText` server-side on write is preferable to trusting the client.

### 8.2 Images

The prototype embeds images as base64 data URLs inside the JSON, capped around 2 MB each. **That does
not survive production** — it bloats every read of the row and every snapshot.

Upload images to blob storage and store the **URL** in the document node instead. Keep the editor's
paste-and-drop UX and its automatic downscaling exactly as they are; only the persistence changes.
Serve images through the API with a short-lived SAS.

### 8.3 Reliability — the explicit requirement

"Zuverlässig gespeichert" is the actual ticket. Build:

- **Autosave** on a debounce (~2 s idle), with a visible state: `Gespeichert` / `Wird gespeichert…` /
  `Nicht gespeichert`.
- **Optimistic concurrency** — a version stamp on the row; a second editor gets a clear German conflict
  message rather than a silent overwrite.
- **Confirm-on-leave** when the document is dirty (the prototype's `ProcessDescriptionPage` already does
  this — keep it).
- **Never lose content on a failed save.** Keep the unsaved document in memory and retry; surface the
  failure.
- Reject edits server-side when the version's status is not `backlog` or `in_capture`.

### 8.4 Rendering

One renderer, used by the read view, the snapshot (§5.6) and the print output, so the three can never
disagree. Sanitise on render.

---

## 9. UI

**The prototype is the source of truth for look and feel.** Keep its Tailwind theme, PRETTL red
`#e60003`, the `glass-card` / `glass-elevated` utilities, `rounded-3xl` top-level and `rounded-2xl`
sub-cards, the eyebrow + gradient-title page header, `Sheet` for forms, `Dialog` for confirmations, the
sidebar, and every shadcn component already in use. Where you need new UI, build it from what is there.

### 9.1 The one deliberate visual change — SHOULD

Asana: *"Look and Feel des Lovable-Prototypen ist grundsätzlich in Ordnung. Lovable setzt in der Main
Area links und rechts sehr große Abstände. Diese deutlich verkleinern."*

Reduce the horizontal padding of the main content area. In `AppLayout.tsx` the main element carries
roughly `max-w-7xl … px-4 py-6 md:px-10 md:py-10`. Cut the horizontal padding markedly and let content
use the width — target something like `px-4 md:px-6`, and widen or drop the `max-w-7xl` cap. Vertical
rhythm stays as it is.

### 9.2 Navigation — MUST

| Item | Route | Visible to |
|---|---|---|
| Prozesse | `/processes` | everyone |
| Unterweisungen | `/instructions` | Admin \| QM \| PV |
| Qualifikationsmatrix | `/qualifications` | Admin \| QM |
| Chatbot-Assistent | `/assistant` | everyone |
| Einstellungen | `/settings` | Admin \| QM |

Enforce at the route **and** the API. The prototype shows all five to everyone. Keep the `?pid={id}`
deep link.

### 9.3 Prozessbibliothek is a filter preset, not a screen — MUST

The PRD lists it as its own screen; Canvas has none — a released process *is* its own read-only view.
Build it as a preset on `/processes` (`status=approved`). Delete `Library.tsx` and `LibraryDetail.tsx`,
but first port LibraryDetail's "festgeschrieben" locked-view treatment into `ProcessDetail` for the
read-only state.

### 9.4 Edit is a full page — MUST

The prototype already has `ProcessEditPage.tsx`, and this is confirmed as up to date and correct: a
page, not a slide-in, where the author has full freedom over the Prozessbeschreibung (§8).

Sections in order: **ALLGEMEIN → VORLAGE & GELTUNGSBEREICH → PROZESS-ÜBERSICHT → VERANTWORTLICHKEITEN
→ MITGELTENDE UNTERLAGEN → Erstellte Felder**

| Label | Target | Rules |
|---|---|---|
| Titel | `Process.title` | required, ≤400. **Never inject the Prozessart number** (§10 C2) |
| Bezeichnung / Kurzbeschreibung | `Process.shortDescription` | multi-line |
| Anweisungsart | `Process.specificationType` | VA \| AA |
| Übergeordnete Verfahrensanweisung | `Process.parentProcessId` | optional; only when Anweisungsart = AA (§6) |
| Vorlagentyp | `Process.templateType` | required; **disabled for a plain Verfasser** |
| Geltungsbereich (Standorteinheiten) | `Process.scope` | radio PE/PER/PEL; disabled for a plain Verfasser |
| Zweck | `version.purpose` | |
| Geltungsbereich (Text) | `version.scopeDetail` | |
| Begriffe | `version.terms` | **IMS only** |
| Prozessbeschreibung | `version.descriptionDoc` | **the rich editor, §8** |
| Zuständigkeiten / Verantwortung | `version.responsibilities` | merged field, §10 C4 |
| Prozessablauf | `version.workSequence` | **PROD only** |
| Verfahren | `version.method` | PROD only |
| Prozessparameter | `version.processParameters` | PROD only |
| Dokumentationen | `version.documentationRef` | PROD only |
| Reaktionsplan bei Abweichungen | `version.deviationHandling` | PROD only |
| Wartung (Verweis) | `version.maintenanceRef` | PROD only |
| Interne Prozesse verknüpfen | `ProcessLink` (InternerProzess) | multi-select, `{title} · {identifier} · {areaShortCode}` |
| *(inline)* Erstellte Felder | `ProcessAdditionalField.value` | one input per existing field |

**Save = four writes in one transaction:** version ← the content fields (**never the shell**); shell ←
title / shortDescription / specificationType / parentProcessId / templateType / scope; internal links ←
reconcile; additional fields ← update each value. No event on a plain save. Reject with 409 when the
version's status is not `backlog` or `in_capture`.

### 9.5 Process list — MUST

Columns: `Nummer | Prozess | Bereich | Verfasser | Vorlage | Status`, rendered as the two-level tree
from §6.

`Nummer` = `identifier` or the literal `(noch nicht vergeben)` — there is **no draft number**; delete
the prototype's `DRAFT-2026-001` generator. `Bereich` = area pill with subline `{shortCode} · {category}`.
`Verfasser` = the **current version's** author with an initials avatar, falling back to
`Nicht zugewiesen`. `Vorlage` = the raw code `IMS` / `PROD`. `Status` = the **version's** status.

Filters: search over title + identifier (substring, server-side), Bereich, Prozessart, Status,
Vorlagentyp. Sortable headers, default `identifier` ascending, nulls last. *(Canvas has prefix-only
search and no sorting — SharePoint delegation limits that a real database removes.)*
Empty state: `Keine Daten vorhanden.`

**Row click must resolve which version to open** — the behaviour most easily missed:

```ts
const mayEdit = process.hasActiveDraft && (
  user.isAdministrator || process.authorId === user.id || leadsArea(user, process.areaId)
);
const version = mayEdit ? currentVersion(process) : latestApprovedVersion(process);
```

A reader opening a process with a revision in flight sees the last **released** edition, plus one muted
line: `Eine neue Ausgabe ist in Bearbeitung.`
⚠️ Canvas uses the *global* `blnIsAuthor` flag here, so any Verfasser can open anyone's draft. Use
`process.authorId === user.id`.

### 9.6 Process detail — MUST

Header card, then completeness gauge, then three tabs: **Übersicht | Dokumente | Genehmigung &
Versionen** (the third gated on `canSeeApprovalTab`).

Header must include three things the prototype lacks:

- **Rejection banner** — red card when `version.status === 'in_capture'` and the newest event is
  `content_rejected` / `formally_rejected` with a comment. Heading *"Von QM abgelehnt — bitte
  überarbeiten"* (formal) or *"Zurückgegeben (inhaltliche Prüfung) — bitte überarbeiten"* (content),
  then `von {actor} · {dd.mm.yyyy}`, then the comment as a quote. **The prototype stores a rejection
  reason and shows it nowhere** — an author currently cannot find out why their process came back.
- **Release banner** — green: `Freigegeben am {dd.mm.yyyy} von {qmName}`.
- **Version pill:**
  ```
  hasActiveDraft && version.status !== 'approved' → `Version ${(shell.edition ?? 0) + 1} · in Bearbeitung`
  version.edition == null                          → "Entwurf"
  otherwise                                        → `Version ${version.edition}`
  ```

**Übersicht** — read-only fields in this order, branching on template: always Zweck, Geltungsbereich;
IMS only Begriffe; always Prozessbeschreibung (rendered, §8.4); PROD only Prozessablauf, Verfahren,
Prozessparameter, Dokumentationen, Reaktionsplan bei Abweichungen, Wartung (Verweis). Empty values
render italic muted **"Noch nicht erfasst"**. Then Verantwortlichkeiten (*Autor*, *Verantwortlich für
Inhalt* = the area's PV, *Zuständigkeiten / Verantwortung*), Mitgeltende Unterlagen (two lists —
`VERKNÜPFTE PROZESSE`, clickable; `EXTERNE DOKUMENTE` as real links; empty states *"Noch keine
verknüpfte Prozesse."* / *"Noch keine Link hochgeladen."*), and Erstellte Felder.

**Dokumente** — subtitle *"Bilder, PDF oder Excel-Tabellen, die den Ablauf beschreiben."*, upload, list
with per-row delete + confirmation, empty state *"Noch keine Dokumente hochgeladen."*

**Genehmigung & Versionen** — three cards:

*Ausgaben-Verlauf*: released editions only, newest first; green pill `aktuell gültig` when
`edition === shell.edition`; subline `freigegeben {dd.mm.yyyy} · {qmName}`; an `Ansehen` button opening
the frozen `snapshotHtml` in a large dialog titled `Ausgabe {n}` with a muted `nur Ansicht` pill. No
diff/compare. Empty: `Noch keine freigegebene Ausgabe — die erste entsteht mit der Freigabe.`

*Genehmigungsverzeichnis*: if `hasActiveDraft`, read the newest **released** version, else the current
one. Header pill: amber `Noch keine freigegebene Ausgabe — Genehmigung folgt mit der ersten Freigabe`,
or green `Genehmigungsverzeichnis der freigegebenen Ausgabe {n}`. Then exactly three rows:

| # | Label | Name | Date |
|---|---|---|---|
| 1 | Verfasser | `version.author.displayName` | `submittedAt` |
| 2 | Inhaltliche Prüfung (PV) | `version.processOwner.displayName` | `contentReviewedAt` |
| 3 | Formelle Freigabe (QM) | `version.approvedByQm.displayName` | `approvedAt` |

Missing name → italic muted `ausstehend`; missing date → `—`; dates `dd.mm.yyyy`. No fourth signer, no
signature capture — **this table is the signature block that replaces the paper one.**
*(The prototype's `approvals[]` has an "erstellt" row no code ever creates, so real processes get an
incomplete table. Replace it.)*

*Prüfverlauf*: all `ProcessEvent` rows oldest first — a 2 px left border from `EVENT_TONE`, the German
label, `{actor} · {dd.mm.yyyy hh:mm}`, and the comment in a red-tinted quote box when present. Empty:
`Noch kein Prüfverlauf vorhanden.`

**Reject dialog** — one `Dialog` for T4 and T6, replacing the prototype's `window.prompt()`. Content
review: title *"Prozess zurückgeben"*, button *"Zurückgeben"*. Formal: title *"Prozess ablehnen
(formelle Prüfung)"*, button *"Ablehnen"*. Multi-line reason, max 2000 chars, placeholder
*"z. B. Kennzahlen-Definition in Abschnitt 5 fehlt …"*, confirm **disabled while empty** — the reason is
mandatory in both paths.

### 9.7 Einstellungen — MUST

Two tabs, gated on `canSeeSettings`.

**Bereiche** — subtitle: *"Weisen Sie jedem Bereich einen Prozessverantwortlichen zu. Der
Prozessverantwortliche (= Abteilungsleiter) übernimmt die inhaltliche Prüfung der Prozesse seines
Bereichs."* One row per active Area: title, shortCode, and a searchable select assigning
`processOwnerId` from users with `isProcessOwner`. Saves immediately.

**Benutzer** — subtitle: *"Verwalten Sie die Rollen der Mitarbeiter. Rollen steuern, welche Aufgaben im
Freigabe- und Unterweisungsprozess jemand übernehmen darf."* One row per user: displayName, mail, four
checkboxes (`Admin`, `Prozessverantwortlicher`, `QM`, `Verfasser`), and an `Abteilung` select.
`displayName` / `mail` / `entraObjectId` come from provisioning and are read-only.

Both tabs need what Canvas entirely lacks: a saving indicator, a success toast, error handling with
optimistic rollback, and a disabled state while a write is in flight.

Area CRUD is **SHOULD** — `shortCode` and `categoryNumber` feed the identifier and cannot be editable
only in SharePoint. Changing a `shortCode` must **not** retro-change existing identifiers.

---

## 10. Customer change request + Asana tickets — these override everything

From Lysandra's mail (2026-09) and the matching tickets in **Asana → DEVELOPMENT | PRETTL**.

### C1 · VA / AA two-level structure — SHOULD
> *"Struktur übergeordneter Verfahrensanweisungen [VA] und untergeordneter Arbeitsanweisungen [AA]"*

Built as specified in **§6**: nullable `parentProcessId`, a two-level collapsible tree in the list,
deliberately plain, **no derived numbering**. The Asana ticket leaves "echte Zuordnung vs. reine
Darstellungsebene" open; the real FK is chosen because it is nearly free and the display-only variant
cannot be upgraded later without a migration.

### C2 · Prozessart number not in the title — MUST
> *"Kürzel (Nr.) der Prozessart nicht im Titel — 1 = übergeordnet; 2 = Kernprozess;
> 3 = Unterstützungsprozess"*

**Decision: follow the mail.** The number stays in the **Identkennzeichen** (`VA PE 1 IMS.001`) and
**never** appears in a process title. Nothing in the app may compose a title containing it.

⚠️ The Asana ticket records the opposite guess — *"Vermutung aus dem Termin: gewünscht ist, dass die
Prozessart im Titel sichtbar ist"* — and flags the requirement as contradictory. The decision above
stands for this build. Kept as §11 Q2 so it can be confirmed with Lysandra; it is a one-line change.

Note category **1** is labelled **"übergeordneter Prozess"**, not "Führung" (§3.4).

### C3 · Mitgeltende Unterlagen optional — MUST
> *"nicht als Pflichtfeld → wir haben Dokumente, wo wir die 100% sonst nie erreichen werden →
> aus der Gewichtung entfernen [das Feld gerne so beibehalten]"*

Done in **§5.4**. The check is removed; the field stays and behaves as before. IMS = 5 checks,
PROD = 4 — and both are now reachable, which they were not before.

### C4 · Merge Zuständigkeiten / Verantwortung / Aufgabenverteilung — MUST
> *"Zuständigkeiten, Verantwortung und Aufgabenverteilung sollen ein gemeinsames Feld sein statt drei
> getrennter Felder."*

One field: **`responsibilities`**, labelled **"Zuständigkeiten / Verantwortung"**. `taskDistribution`
(Canvas `mstrTaskDistribution`) is dropped from the schema, the editor, the read view and the snapshot.

**Migration:** where a process has text in both, append the old `taskDistribution` to `responsibilities`
separated by a blank line. Where only `taskDistribution` has text, move it. This also removes the
field's odd IMS/PROD behaviour — Canvas showed *Aufgabenverteilung* even for IMS, where the template has
no place for it.

### C5 · Beschreibungsfeld reliability — MUST
See **§8**. Called *"das Kernstück der Anwendung"* in the ticket; JSON-column storage; the prototype is
the behavioural reference.

### C6 · Main-area padding — SHOULD
See **§9.1**.

---

## 11. Open questions — do not guess

| # | Question | Status |
|---|---|---|
| **Q1** | **VA/AA numbering.** §6 gives an AA its own running number. Should an AA's identifier instead derive from its parent VA (`… .003.01`)? | Proceeding as specified. Confirm with Lysandra. Changing it later breaks issued identifiers, so raise it before go-live. |
| **Q2** | **Prozessart in the title** — the mail says no, the Asana ticket guesses yes (C2). | Built per the mail. One-line change either way; confirm with Lysandra. |
| **Q3** | **Instruction recurrence** (§7.8) — build the scheduler, or drop the field? | LATER. The PRD keeps turnus training in Quentic, so dropping it may be right. |
| **Q4** | **Soll/Ist qualification requirements** — nothing links a process to the qualifications it requires, so the matrix cannot show gaps. | LATER. Keep the schema open for a `ProcessRequiredQualification` join. |
| **Q5** | **Bereich shortcodes** — **"F / T"** contains a space and a slash and cannot go in an identifier; **POD**'s category is inconsistent (2 vs 3) in the 2026 proposal. | 🔴 **Resolve before seeding Areas.** Blocks §3.4. |
| **Q6** | When does the **18-Bereiche 2026 structure** become binding? Existing identifiers must not retro-change. | Affects migration ordering. |
| **Q7** | **Initialbefüllung** — Excel import of staff + processes with AI pre-fill from old descriptions is in the PRD and exists nowhere. | LATER, its own work package. |
| **Q8** | `confidentiality` is a pure label today. Will it ever gate access? | Keep as a label. If it must gate, that is a security feature needing its own design. |
| **Q9** | **Does `tblEmployee` exist?** The customer's ER diagram has `User.refEmployee` pointing at a table absent from the Canvas app. | Confirm; if it does not exist, drop the column. |

---

## 12. Canvas defects — fix, do not replicate

Every row is a real defect found in the source. Implement the **Decision**.

| # | Defect | Decision |
|---|---|---|
| 1 | `btnProcessEdit.Visible` precedence: `A in [...] \|\| IsBlank(A) && (roles)` lets anyone edit | Fixed — §2.3 |
| 2 | Row-open uses the global `blnIsAuthor`, not "author of this process" | Fixed — §9.5 |
| 3 | `documentNumber` re-minted on every release ⇒ unstable identifiers | Fixed — §5.1 / §5.3 |
| 4 | `max()+1` with no uniqueness guard ⇒ race on concurrent releases | Fixed — unique constraint + row lock |
| 5 | Instruction / Qualification / Task saves always insert ⇒ silent duplicates | Fixed — §7.1, §7.5 |
| 6 | Participant picker and matrix employee list both filter on `blnIsAuthor` | Fixed — §7.1, §7.5 |
| 7 | Instruction status written by only one of three confirm paths ⇒ drift | Fixed — derived, §7.2 |
| 8 | `colParticipantStatus` holds `Bestaetigt` while reads/writes use `Bestätigt` | Fixed — one canonical spelling |
| 9 | Event written `"Überarbeitung gestartet"`, display matches `"Ueberarbeitung gestartet"` | Fixed — single enum, §3.3 |
| 10 | `dteEvent` written only on the content-rejection path | Fixed — `createdAt` is authoritative |
| 11 | "Genehmigung & Versionen" computes a `Show` flag never applied | Fixed — enforced, §9.6 |
| 12 | Sign-off timestamps not reset on rejection | Fixed — cleared, §4 |
| 13 | No-access users navigated to the process list anyway | Fixed — §2.1 |
| 14 | Assistant parses all hits, renders only the first | Fixed — §7.10 |
| 15 | `Formell Abgelehnt` mail body HTML-escaped, arrives as raw markup | Fixed — §7.6 |
| 16 | `blnReminderSent` never resets ⇒ renewed qualification never re-notified | Fixed — §7.7 |
| 17 | Expiry sweep silently skips areas with no PV | Fixed — §7.7 |
| 18 | QM mail goes to the first QM row found, arbitrarily | Fixed — §7.6 |
| 19 | Upload responds 200 before setting the owning lookup ⇒ orphans | Fixed — §7.9 |
| 20 | No delete confirmation, no link validation, no file type/size limits | Fixed — §7.9, §9.4 |
| 21 | Process soft-delete orphans versions, links, events, documents | Fixed — cascade, T8 |
| 22 | Instruction delete **hard-deletes** participants, destroying the record | Fixed — soft delete, §7.4 |
| 23 | Statuses `Abgelehnt` / `Rückfrage offen` tested but never written | Dropped — §3.3 |
| 24 | Prefix-only search, no sorting anywhere | Fixed — §9.5 |
| 25 | **Azure AI API key in plaintext in a flow definition** | 🔴 Rotate; managed identity — §7.10 |
| 26 | Zero server-side authorisation | Fixed — §2.3, the headline change |

---

## 13. Migration from SharePoint — MUST before go-live

Source site: `prettlelectronics0.sharepoint.com/sites/BackendToolProzessdokumentation`

| List / library | GUID |
|---|---|
| `tblProcess` | `d8801f4e-f7fa-4253-9ca1-fd19d1d6400a` |
| `tblProcessEvent` | `2646fa75-7f31-4b9e-ada2-727ea01f4f0c` |
| `tblInstruction` | `86545ad7-5a7a-44ad-825a-eea22ee837fe` |
| `tblInstructionParticipant` | `c76e83a7-bd10-4e86-9964-250622c4db55` |
| `tblQualification` | `17b91835-798c-4104-8a7c-78306f1d3680` |
| `tblUser` | `682f8f76-5acd-4224-9dc3-4975d8efe57e` |
| `tblArea` | `cfb607ac-68fd-43bd-88f4-72265adf7edd` |
| `libProcessDocument` | `b0f0c0a0-c2fb-4a20-8a0f-97a6052d3c43` |
| `libInstructionDocument` | `a92cdbf1-9a76-421c-850b-ab2780ff518c` |
| `libQualificationDocument` | `087b4b93-2756-4bdb-a882-388d875400e2` |

Order: **Areas → Users → Processes + Versions → Links, AdditionalFields, Events → Instructions +
Participants → Qualifications + Tasks → documents into blob.**

Rules:

- **`snapshotHtml` transfers byte-for-byte. Never re-render it.** Released editions are legal records.
- Preserve `edition`, `identifier`, `documentNumber` exactly. Reseed identity columns above the imported
  maxima.
- Apply the **C4 merge** (`taskDistribution` → `responsibilities`) during import.
- Migrate Canvas's plain-text `mstrProcessDescription` into `descriptionDoc` as a minimal rich document
  (paragraphs split on newlines) and set `descriptionText` to the original text.
- `tblProcessVersion` may be absent for older processes — a shell with content and no version row.
  Synthesise one released version from the shell's mirrored fields so the history is not empty.
- Import events with **`isSent = true`** so the mailer does not re-send history on day one.
  **Verify this in staging first** — a migration that re-mails two years of approvals is the classic
  go-live disaster.
- `parentProcessId` starts null everywhere; the VA/AA structure is assigned afterwards by the customer.

---

## 14. Build order

Given the 14.09 window, in this order. Stop and report if a **MUST** is at risk.

1. **Foundation** — follow `azure-runbook.md` for resources and deployment. Wire Entra auth, create the
   schema (§3), add shared types + enums + permissions (§2.3), `GET /api/me`.
2. **Strip the prototype** — delete everything in §3.2, replace `ProcessContext` with real API calls,
   remove the access gate.
3. **Read path** — Areas, Users, process list with role scoping (§2.4), the tree (§6), version
   resolution (§9.5), process detail read-only (§9.6).
4. **Workflow engine** — T0–T8, the release transaction, the clone transaction, identifier minting,
   completeness. **Test this hardest**; it is the product.
5. **Beschreibungsfeld** — §8. Storage, images to blob, autosave, conflict handling. Do not leave this
   to the end; it is the Kernstück and the most likely thing to be wrong.
6. **Edit page + banners + reject dialog + documents + links + additional fields** — §9.4, §9.6.
7. **Versioning surface** — Ausgaben-Verlauf, snapshot viewer, Genehmigungsverzeichnis, Prüfverlauf.
8. **Mail** — queue function, the six templates, `isSent` write-back, `?pid=` deep links (§7.6).
9. **Unterweisungen** — §7.1–7.4, including the signed confirm links and the attendance list.
10. **Qualifikationsmatrix + Einstellungen** — §7.5, §9.7, plus the expiry sweep (§7.7).
11. **Assistent** — §7.10, with the key rotated.
12. **Migration dry run in staging** — §13. Verify mail suppression. Then cut over.

### Definition of done for the core

- [ ] A reader opening a released process with a draft in flight sees the **released** edition
- [ ] The shell's content columns are written by exactly one code path
- [ ] A released version is never updated after release
- [ ] Every transition endpoint re-checks its permission server-side and refuses on mismatch
- [ ] `identifier` is minted once and never changes across editions
- [ ] Two concurrent releases in one Bereich cannot take the same `documentNumber`
- [ ] Rejection returns to `in_capture`, writes an event, clears sign-off timestamps, and shows the
      author the reason
- [ ] Submitting below 100% completeness is refused by the API, not only hidden in the UI
- [ ] The Prozessbeschreibung survives: reload, a failed save, a second editor, and a snapshot
- [ ] Every mail is traceable: `isSent`, `sentAt`, or `sendError`
- [ ] No secret in client code, in the repo, or in any exportable definition

---

## Appendix — sources behind this document

| Artefact | What it contributed |
|---|---|
| `canvas-app/*.pa.yaml` — 9 screens, 9 components, 13,587 lines | Verified behaviour: state machine, permissions, field maps, snapshot builder, identifier logic |
| `PRETTLProzessdokumentation_1_0_0_2.zip` → the 5 flows | Mail templates + routing, the 60-day expiry sweep, the mail-based confirmation design, the assistant's model and index, the upload sequence, all list GUIDs |
| Asana **DEVELOPMENT \| PRETTL** — 9 open tickets | The VA/AA tree decision, the Beschreibungsfeld as Kernstück, the padding fix, the release target, the Prozessart contradiction |
| Customer mail, 2026-09 (Lysandra) | The four changes in §10 |
| Lovable prototype, 152 files | **UI, layout, design system — and the Prozessbeschreibung editor as a behavioural reference** |
| PRD / Architektur / Umsetzungsplan | Background only. Several items deliberately **not** implemented — §0.4 |
| Customer ER diagram (Mermaid) | Column naming, `isSent` / `reminderSentAt` flags |

**Not used:** `Prozessdokumentation 1.msapp` — its `.yaml` files are identical to the `canvas-app/`
source already analysed, and its 33 MB of `.json` is the serialised control tree, carrying nothing new.
