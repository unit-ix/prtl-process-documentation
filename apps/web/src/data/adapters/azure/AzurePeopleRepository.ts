import type { EmployeeDetailView, EmployeeListItem } from '@app/domain';
import type {
    DirectoryUser,
    NewUserInput,
    PeopleRepository,
    QualificationInput,
    TaskInput,
    UserRoleInput,
} from '@/data/ports/PeopleRepository';
import { apiDelete, apiGet, apiSend } from './client';

export class AzurePeopleRepository implements PeopleRepository {
    async directoryUsers(): Promise<DirectoryUser[]> {
        const { items } = await apiGet<{ items: DirectoryUser[] }>('/directory/users');
        return items;
    }

    createUser(input: NewUserInput): Promise<{ id: string }> {
        return apiSend<{ id: string }>('POST', '/users', input);
    }

    async employees(): Promise<EmployeeListItem[]> {
        const { items } = await apiGet<{ items: EmployeeListItem[] }>('/employees');
        return items;
    }

    employee(id: string): Promise<EmployeeDetailView> {
        return apiGet<EmployeeDetailView>(`/employees/${id}`);
    }

    saveQualification(input: QualificationInput, id?: string): Promise<{ id: string }> {
        return id === undefined
            ? apiSend<{ id: string }>('POST', '/qualifications', input)
            : apiSend<{ id: string }>('PATCH', `/qualifications/${id}`, input);
    }

    removeQualification(id: string): Promise<void> {
        return apiDelete(`/qualifications/${id}`);
    }

    saveTask(input: TaskInput, id?: string): Promise<{ id: string }> {
        return id === undefined
            ? apiSend<{ id: string }>('POST', '/tasks', input)
            : apiSend<{ id: string }>('PATCH', `/tasks/${id}`, input);
    }

    removeTask(id: string): Promise<void> {
        return apiDelete(`/tasks/${id}`);
    }

    async updateArea(id: string, processOwnerId: string | null): Promise<void> {
        await apiSend<void>('PATCH', `/areas/${id}`, { processOwnerId });
    }

    async updateUser(id: string, input: UserRoleInput): Promise<void> {
        await apiSend<void>('PATCH', `/users/${id}`, input);
    }
}
