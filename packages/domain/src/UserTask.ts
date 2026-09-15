// → tblUserTask / user_tasks

export interface UserTask {
    id: string;
    user: { id: string };
    title: string;
    description: string | null;
    isActive: boolean;
}
