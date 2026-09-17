import { INSTRUCTION_TYPE_LABELS, type InstructionStatus, type ParticipantStatus } from '@app/domain';

export const instructionStatusStyles: Record<InstructionStatus, string> = {
    Offen: 'bg-muted text-muted-foreground border-border',
    Überfällig: 'bg-destructive/15 text-destructive border-destructive/30',
    Abgeschlossen: 'bg-success/15 text-success border-success/30',
};

export const participantStatusStyles: Record<ParticipantStatus, string> = {
    Offen: 'text-muted-foreground',
    Bestätigt: 'text-success',
    Abgelehnt: 'text-destructive',
};

export const instructionTypeLabel = (type: keyof typeof INSTRUCTION_TYPE_LABELS): string =>
    INSTRUCTION_TYPE_LABELS[type];
