// → tblInstruction / instructions

import type { InstructionType, Recurrence } from './enums.js';

export interface Instruction {
    id: string;
    process: { id: string };
    instructionType: InstructionType;
    dueDate: string | null;
    recurrence: Recurrence;
    note: string | null;
    createdBy: { id: string };
    createdAt: string;
    isActive: boolean;
}
