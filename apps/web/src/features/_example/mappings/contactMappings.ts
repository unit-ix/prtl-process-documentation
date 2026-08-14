import type { ContactRole } from '@/domain/Contact';

export const ROLE_LABELS: Record<ContactRole, string> = {
    decision_maker: 'Entscheider',
    influencer: 'Beeinflusser',
    user: 'Anwender',
    other: 'Sonstige',
};

/** Sentinel for "no role filter": Radix Select rejects an empty string as a value. */
export const ALL_ROLES = 'all';

export type RoleFilterValue = ContactRole | typeof ALL_ROLES;

export const contactRoleOptions: { value: RoleFilterValue; label: string }[] = [
    { value: ALL_ROLES, label: 'Alle Rollen' },
    ...(Object.entries(ROLE_LABELS) as [ContactRole, string][]).map(([value, label]) => ({
        value,
        label,
    })),
];
