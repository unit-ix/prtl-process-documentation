// §4 — die acht Übergänge als Tabelle statt als verstreute ifs. Jeder Übergang ist EIN Endpoint und
// EINE Transaktion, die Version, Hülle und Ereignis zusammen schreibt; nie nur eines davon.
import type { EventKind, ProcessStatus } from '@app/domain';

export type TransitionName =
    | 'assign-author'
    | 'submit'
    | 'approve-content'
    | 'reject-content'
    | 'approve-formal'
    | 'reject-formal'
    | 'reopen';

export interface Transition {
    readonly from: readonly ProcessStatus[];
    readonly to: ProcessStatus;
    readonly eventKind: EventKind;
    readonly requiresComment: boolean;
    /** Zurückgeben löscht die Freigabe-Zeitstempel der laufenden Runde (§4, Defekt 12). */
    readonly clearsSignOff: boolean;
    readonly toast: string;
}

export const TRANSITIONS: Readonly<Record<TransitionName, Transition>> = {
    'assign-author': {
        from: ['backlog'],
        to: 'in_capture',
        eventKind: 'assigned',
        requiresComment: false,
        clearsSignOff: false,
        toast: 'Verfasser zugewiesen. Prozess ist jetzt in Erfassung.',
    },
    submit: {
        from: ['in_capture'],
        to: 'content_review',
        eventKind: 'submitted',
        requiresComment: false,
        clearsSignOff: false,
        toast: 'Zur inhaltlichen Prüfung eingereicht.',
    },
    'approve-content': {
        from: ['content_review'],
        to: 'formal_review',
        eventKind: 'content_approved',
        requiresComment: false,
        clearsSignOff: false,
        toast: 'Inhaltlich freigegeben – liegt beim QM.',
    },
    'reject-content': {
        from: ['content_review'],
        to: 'in_capture',
        eventKind: 'content_rejected',
        requiresComment: true,
        clearsSignOff: true,
        toast: 'Rückfrage an den Verfasser gesendet.',
    },
    'approve-formal': {
        from: ['formal_review'],
        to: 'approved',
        eventKind: 'formally_approved',
        requiresComment: false,
        clearsSignOff: false,
        toast: 'Prozess freigegeben.',
    },
    'reject-formal': {
        from: ['formal_review'],
        to: 'in_capture',
        eventKind: 'formally_rejected',
        requiresComment: true,
        clearsSignOff: true,
        toast: 'Prozess abgelehnt – zurück an den Verfasser.',
    },
    reopen: {
        from: ['approved'],
        to: 'in_capture',
        eventKind: 'revision_started',
        requiresComment: false,
        clearsSignOff: false,
        toast: 'Neue Ausgabe zur Bearbeitung geöffnet.',
    },
};

export const isAllowedFrom = (name: TransitionName, status: ProcessStatus): boolean =>
    TRANSITIONS[name].from.includes(status);
