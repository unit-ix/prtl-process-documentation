// → tblProcessEvent / process_events

import type { EventKind, ProcessStatus } from './enums.js';

export interface ProcessEvent {
    id: string;
    process: { id: string };
    processVersion: { id: string } | null;
    eventKind: EventKind;
    newStatus: ProcessStatus;
    actor: { id: string };
    comment: string | null;
    recipientEmail: string | null;
    readonly isSent: boolean;
    readonly sentAt: string | null;
    readonly sendError: string | null;
    createdAt: string;
}
