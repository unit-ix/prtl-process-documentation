export const SPECIFICATION_TYPES = ['VA', 'AA'] as const;
export type SpecificationType = (typeof SPECIFICATION_TYPES)[number];
export const SPEC_TYPE_LABELS: Record<SpecificationType, string> = {
    VA: 'Verfahrensanweisung (VA)',
    AA: 'Arbeitsanweisung (AA)',
};

export const TEMPLATE_TYPES = ['IMS', 'PROD'] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];
export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
    IMS: 'Standard (IMS)',
    PROD: 'Fertigung (PROD)',
};

export const SCOPES = ['PE', 'PER', 'PEL'] as const;
export type Scope = (typeof SCOPES)[number];
export const SCOPE_LABELS: Record<Scope, string> = {
    PE: 'PE – Prettl Electronics',
    PER: 'PER – Standort Radeberg',
    PEL: 'PEL',
};

export const PROCESS_STATUSES = ['backlog', 'in_capture', 'content_review', 'formal_review', 'approved'] as const;
export type ProcessStatus = (typeof PROCESS_STATUSES)[number];
export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
    backlog: 'Backlog',
    in_capture: 'In Erfassung',
    content_review: 'Inhaltliche Prüfung',
    formal_review: 'Formelle Prüfung',
    approved: 'Freigegeben',
};

export const CONFIDENTIALITIES = ['Öffentlich', 'Intern', 'Vertraulich'] as const;
export type Confidentiality = (typeof CONFIDENTIALITIES)[number];

export const CATEGORY_NUMBERS = [1, 2, 3] as const;
export type CategoryNumber = (typeof CATEGORY_NUMBERS)[number];
export const CATEGORY_LABELS: Record<CategoryNumber, string> = {
    1: 'übergeordneter Prozess',
    2: 'Kernprozess',
    3: 'Unterstützungsprozess',
};

export const EVENT_KINDS = [
    'assigned',
    'submitted',
    'content_approved',
    'content_rejected',
    'formally_approved',
    'formally_rejected',
    'revision_started',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const EVENT_LABELS: Record<EventKind, string> = {
    assigned: 'Verfasser zugewiesen',
    submitted: 'Eingereicht',
    content_approved: 'Inhaltlich freigegeben',
    content_rejected: 'Zurückgegeben (inhaltliche Prüfung)',
    formally_approved: 'Formell freigegeben',
    formally_rejected: 'Formell abgelehnt',
    revision_started: 'Überarbeitung gestartet',
};
export const EVENT_TONE: Record<EventKind, 'neutral' | 'success' | 'danger'> = {
    assigned: 'neutral',
    submitted: 'neutral',
    content_approved: 'neutral',
    content_rejected: 'danger',
    formally_approved: 'success',
    formally_rejected: 'danger',
    revision_started: 'neutral',
};

export const LINK_TYPES = ['InternerProzess', 'ExternesDokument'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const INSTRUCTION_TYPES = ['Einzel', 'Sammel'] as const;
export type InstructionType = (typeof INSTRUCTION_TYPES)[number];
export const INSTRUCTION_TYPE_LABELS: Record<InstructionType, string> = {
    Einzel: 'Einzelunterweisung',
    Sammel: 'Sammelunterweisung',
};

export const RECURRENCES = ['Keine Wiederholung', 'Vierteljährlich', 'Halbjährlich', 'Jährlich'] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const PARTICIPANT_STATUSES = ['Offen', 'Bestätigt', 'Abgelehnt'] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const NOTIFY_STATUSES = ['In Bearbeitung', 'Fertig', 'Fehler'] as const;
export type NotifyStatus = (typeof NOTIFY_STATUSES)[number] | null;

export type InstructionStatus = 'Offen' | 'Überfällig' | 'Abgeschlossen';
