// → tblInstructionParticipant / instruction_participants

import type { NotifyStatus, ParticipantStatus } from './enums.js';

export interface InstructionParticipant {
    id: string;
    instruction: { id: string };
    user: { id: string };
    readonly status: ParticipantStatus;
    readonly notifiedAt: string | null;
    readonly confirmedAt: string | null;
    readonly notifyStatus: NotifyStatus;
    isActive: boolean;
}
