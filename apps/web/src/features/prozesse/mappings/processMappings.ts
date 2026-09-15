import {
    CATEGORY_LABELS,
    PROCESS_STATUSES,
    PROCESS_STATUS_LABELS,
    SPECIFICATION_TYPES,
    SPEC_TYPE_LABELS,
    TEMPLATE_TYPES,
    TEMPLATE_TYPE_LABELS,
    type ProcessStatus,
} from '@app/domain';

export const processStatusStyles: Record<ProcessStatus, string> = {
    backlog: 'bg-muted text-muted-foreground border-border',
    in_capture: 'bg-secondary/40 text-secondary-foreground border-secondary',
    content_review: 'bg-info/15 text-info border-info/30',
    formal_review: 'bg-primary/15 text-primary border-primary/30',
    approved: 'bg-success/15 text-success border-success/30',
};

export const processStatusOptions = PROCESS_STATUSES.map((value) => ({
    value,
    label: PROCESS_STATUS_LABELS[value],
}));

export const processSpecificationTypeOptions = SPECIFICATION_TYPES.map((value) => ({
    value,
    label: SPEC_TYPE_LABELS[value],
}));

export const processTemplateTypeOptions = TEMPLATE_TYPES.map((value) => ({
    value,
    label: TEMPLATE_TYPE_LABELS[value],
}));

export const categoryShortLabel = (categoryNumber: number): string =>
    CATEGORY_LABELS[categoryNumber as 1 | 2 | 3] ?? '—';

export const NO_IDENTIFIER = '(noch nicht vergeben)';

export const authorInitials = (displayName: string): string =>
    displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

export const formatDate = (iso: string | null): string =>
    iso === null ? '—' : new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatDateTime = (iso: string | null): string =>
    iso === null
        ? '—'
        : new Date(iso).toLocaleString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          });

export function versionPill(process: {
    hasActiveDraft: boolean;
    edition: number | null;
    version: { status: string; edition: number | null };
}): string {
    if (process.hasActiveDraft && process.version.status !== 'approved') {
        return `Version ${(process.edition ?? 0) + 1} · in Bearbeitung`;
    }
    return process.version.edition === null ? 'Entwurf' : `Version ${process.version.edition}`;
}
