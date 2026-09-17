// → tblProcessAdditionalField / process_additional_fields

export interface ProcessAdditionalField {
    id: string;
    processVersion: { id: string };
    title: string;
    value: string | null;
    sortOrder: number;
    isActive: boolean;
}
