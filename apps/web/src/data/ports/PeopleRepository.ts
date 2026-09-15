import type { EmployeeDetailView, EmployeeListItem } from '@app/domain';

export interface QualificationInput {
    userId: string;
    title: string;
    description?: string | null;
    acquiredAt?: string | null;
    expiresAt?: string | null;
    skillPoints?: number | null;
}

export interface TaskInput {
    userId: string;
    title: string;
    description?: string | null;
}

export interface UserRoleInput {
    isAuthor?: boolean;
    isProcessOwner?: boolean;
    isQm?: boolean;
    isAdministrator?: boolean;
    areaId?: string | null;
}

export interface PeopleRepository {
    employees(): Promise<EmployeeListItem[]>;
    employee(id: string): Promise<EmployeeDetailView>;
    saveQualification(input: QualificationInput, id?: string): Promise<{ id: string }>;
    removeQualification(id: string): Promise<void>;
    saveTask(input: TaskInput, id?: string): Promise<{ id: string }>;
    removeTask(id: string): Promise<void>;
    updateArea(id: string, processOwnerId: string | null): Promise<void>;
    updateUser(id: string, input: UserRoleInput): Promise<void>;
}
