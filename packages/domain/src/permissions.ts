// Prädikate wörtlich aus docs/AZURE-BUILD-CONTEXT.md §2.3. Die Klammerung in canEditContent ist
// bewusst enger als in der Canvas-App: dort bindet || lockerer als &&, wodurch die Rollen-Klausel
// bei passendem Status übersprungen wird und jeder bearbeiten darf (§12, Defekt 1).
import type { Process } from './Process.js';
import type { ProcessVersion } from './ProcessVersion.js';
import type { User } from './User.js';

export interface SessionUser extends User {
    readonly ledAreaIds: readonly string[];
}

type ProcessScoped = Pick<Process, 'status' | 'area' | 'author'>;
type VersionScoped = Pick<ProcessVersion, 'status' | 'author'>;
export type Roles = Pick<SessionUser, 'id' | 'isAdministrator' | 'isProcessOwner' | 'isQm' | 'ledAreaIds'>;

export const leadsArea = (u: Roles, areaId: string): boolean => u.ledAreaIds.includes(areaId);

const isAuthorOf = (u: Roles, record: { author: { id: string } | null }): boolean => record.author?.id === u.id;

export const canCreateProcess = (u: Roles): boolean => u.isAdministrator || u.isProcessOwner;

export const canAssignAuthor = (u: Roles, p: ProcessScoped): boolean =>
    p.status === 'backlog' && (u.isAdministrator || (u.isProcessOwner && leadsArea(u, p.area.id)));

export const canEditContent = (u: Roles, p: ProcessScoped, v: VersionScoped): boolean =>
    (v.status === 'backlog' || v.status === 'in_capture') &&
    (u.isAdministrator || isAuthorOf(u, p) || leadsArea(u, p.area.id));

export const canSubmit = (u: Roles, v: VersionScoped): boolean =>
    v.status === 'in_capture' && (u.isAdministrator || isAuthorOf(u, v));

export const canApproveContent = (u: Roles, p: ProcessScoped, v: VersionScoped): boolean =>
    v.status === 'content_review' && (u.isAdministrator || leadsArea(u, p.area.id));

export const canRejectContent = (u: Roles, p: ProcessScoped, v: VersionScoped): boolean =>
    canApproveContent(u, p, v);

export const canApproveFormal = (u: Roles, v: VersionScoped): boolean =>
    v.status === 'formal_review' && (u.isAdministrator || u.isQm);

export const canRejectFormal = (u: Roles, v: VersionScoped): boolean => canApproveFormal(u, v);

export const canReopen = (u: Roles, p: ProcessScoped, v: VersionScoped): boolean =>
    v.status === 'approved' && (u.isAdministrator || isAuthorOf(u, v) || leadsArea(u, p.area.id));

export const canDeleteProcess = (u: Roles): boolean => u.isAdministrator || u.isProcessOwner;

export const canManageInstructions = (u: Roles): boolean => u.isAdministrator || u.isProcessOwner;

export const canSeeQualifications = (u: Roles, employee: Pick<User, 'area'>): boolean =>
    u.isAdministrator || (employee.area !== null && leadsArea(u, employee.area.id));

export const canSeeApprovalTab = (u: Roles): boolean => u.isAdministrator || u.isQm || u.isProcessOwner;

export const canSeeSettings = (u: Roles): boolean => u.isAdministrator || u.isQm;

export const hasAnyRole = (u: Pick<User, 'isAuthor' | 'isProcessOwner' | 'isQm' | 'isAdministrator'>): boolean =>
    u.isAuthor || u.isProcessOwner || u.isQm || u.isAdministrator;
