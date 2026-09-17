// → tblQualification / qualifications

export interface Qualification {
    id: string;
    user: { id: string };
    title: string;
    description: string | null;
    acquiredAt: string | null;
    expiresAt: string | null;
    skillPoints: 1 | 2 | 3 | 4 | null;
    readonly reminderSentAt: string | null;
    isActive: boolean;
}
