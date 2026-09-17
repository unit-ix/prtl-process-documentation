// §7.5 — trotz des Namens KEINE Matrix: eine Mitarbeiterliste mit einem Register je Person.
import type { ProcessRef, UserRef } from './refs.js';

export interface EmployeeListItem {
    id: string;
    displayName: string;
    mail: string | null;
    areaTitle: string | null;
    instructionCount: number;
    /** Zählt nur, was nicht abgelaufen ist. */
    qualificationCount: number;
    taskCount: number;
}

export interface QualificationView {
    id: string;
    title: string;
    description: string | null;
    acquiredAt: string | null;
    expiresAt: string | null;
    /** Nur für Admin und den PV des Bereichs — sonst gar nicht erst mitgeschickt. */
    skillPoints: number | null;
    isExpired: boolean;
    documentCount: number;
}

export interface UserTaskView {
    id: string;
    title: string;
    description: string | null;
}

export interface EmployeeInstructionView {
    id: string;
    process: ProcessRef;
    confirmedAt: string | null;
}

export interface EmployeeDetailView {
    employee: UserRef & { areaTitle: string | null };
    instructions: EmployeeInstructionView[];
    tasks: UserTaskView[];
    /** null = der Aufrufer darf Qualifikationen dieser Person nicht sehen (§7.5). */
    qualifications: QualificationView[] | null;
    canManage: boolean;
}

export const isExpired = (expiresAt: string | null, today: string): boolean =>
    expiresAt !== null && expiresAt < today;
