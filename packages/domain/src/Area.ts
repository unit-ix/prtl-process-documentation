// → tblArea / areas

import type { CategoryNumber } from './enums.js';

export interface Area {
    id: string;
    title: string;
    shortCode: string;
    categoryNumber: CategoryNumber;
    processOwner: { id: string } | null;
    isActive: boolean;
}
