// Lesemodelle der Unterweisungen (§7.1–7.4).
import type { InstructionStatus, InstructionType, NotifyStatus, ParticipantStatus, Recurrence } from './enums.js';
import type { ParticipantCounts } from './instructionStatus.js';
import type { ProcessRef, UserRef } from './refs.js';

export interface InstructionParticipantView {
    id: string;
    user: UserRef & { areaTitle: string | null };
    status: ParticipantStatus;
    notifiedAt: string | null;
    confirmedAt: string | null;
    notifyStatus: NotifyStatus;
    hasMail: boolean;
}

export interface InstructionListItem {
    id: string;
    instructionType: InstructionType;
    dueDate: string | null;
    recurrence: Recurrence;
    note: string | null;
    createdAt: string;
    createdBy: UserRef | null;
    process: ProcessRef;
    counts: ParticipantCounts;
    status: InstructionStatus;
}

export interface InstructionDetailView extends InstructionListItem {
    participants: InstructionParticipantView[];
    documentCount: number;
    /** Der eigene Teilnehmer-Datensatz, falls der Aufrufer selbst unterwiesen wird (§7.3). */
    ownParticipant: InstructionParticipantView | null;
    /** Vorrunde, falls diese Unterweisung vom Turnus geöffnet wurde (§7.8). */
    previousRound: { id: string; dueDate: string | null } | null;
    /** Termin der nächsten Runde. Steht erst fest, wenn alle bestätigt haben. */
    nextRoundDueDate: string | null;
    permissions: {
        canManage: boolean;
        /** Sammelunterweisung: ohne hochgeladene Liste darf niemand bestätigt werden. */
        canConfirmForOthers: boolean;
    };
}
