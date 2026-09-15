import type { InstructionDetailView } from '@app/domain';
import { ArrowLeft, Mail, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { instructionRepository } from '@/data';
import { FileList } from '@/shared/components/files/FileList';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import { AcknowledgeCard } from '../components/AcknowledgeCard';
import { AttendanceSheet } from '../components/AttendanceSheet';
import { ParticipantTable } from '../components/ParticipantTable';
import { useInstruction, useInstructionAction } from '../hooks/useInstructions';
import { instructionStatusStyles } from '../mappings/instructionMappings';

const SAMMEL_HINT =
    'Sammelunterweisung: Vorlage drucken, von allen Teilnehmern unterschreiben lassen, unterschriebene Liste hier hochladen und anschließend über „Bestätigungen" alle Teilnehmer bestätigen.';

type Action = ReturnType<typeof useInstructionAction>;

function HeaderMeta({ instruction }: { instruction: InstructionDetailView }) {
    return (
                <div className="min-w-0 space-y-2">
                    <p className="text-muted-foreground font-mono text-xs">{instruction.process.identifier ?? '—'}</p>
                    <h1 className="text-2xl font-semibold tracking-tight">{instruction.process.title}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="outline"
                            className={cn('rounded-full border font-medium', instructionStatusStyles[instruction.status])}
                        >
                            {instruction.status}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[10px]">
                            {instruction.instructionType}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                            Frist {instruction.dueDate ?? '—'} · {instruction.counts.confirmed} von{' '}
                            {instruction.counts.total} bestätigt
                        </span>
                    </div>
                    {instruction.note ? <p className="text-muted-foreground text-sm">{instruction.note}</p> : null}
                </div>
    );
}

function HeaderActions({ instruction, action }: { instruction: InstructionDetailView; action: Action }) {
    return (
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                        <Printer className="size-4" /> Liste drucken
                    </Button>
                    {instruction.permissions.canManage && instruction.instructionType === 'Einzel' ? (
                        <Button
                            variant="outline"
                            className="gap-2"
                            disabled={action.isPending}
                            onClick={() =>
                                action.mutate({
                                    action: (id) => instructionRepository.notify(id),
                                    success: 'Benachrichtigungen eingereiht.',
                                })
                            }
                        >
                            <Mail className="size-4" /> Benachrichtigen
                        </Button>
                    ) : null}
                    {instruction.permissions.canConfirmForOthers && instruction.counts.open > 0 ? (
                        <Button
                            disabled={action.isPending}
                            onClick={() =>
                                action.mutate({
                                    action: (id) => instructionRepository.confirmAll(id),
                                    success: 'Alle offenen Teilnehmer bestätigt.',
                                })
                            }
                        >
                            Alle bestätigen
                        </Button>
                    ) : null}
                </div>
    );
}

function Header({ instruction, action }: { instruction: InstructionDetailView; action: Action }) {
    return (
        <Card className="glass-elevated border-border/40 rounded-3xl p-6 print:hidden">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <HeaderMeta instruction={instruction} />
                <HeaderActions instruction={instruction} action={action} />
            </div>
        </Card>
    );
}

function ParticipantCard({ instruction, action }: { instruction: InstructionDetailView; action: Action }) {
    return (
        <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6 print:hidden">
            <h2 className="text-sm font-semibold">Teilnehmer</h2>
            <ParticipantTable
                instruction={instruction}
                isPending={action.isPending}
                onConfirm={(participantId) =>
                    action.mutate({
                        action: (id) => instructionRepository.confirmParticipant(id, participantId),
                        success: 'Teilnehmer bestätigt.',
                    })
                }
            />
        </Card>
    );
}

function SignatureListCard({ instruction }: { instruction: InstructionDetailView }) {
    return (
        <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6 print:hidden">
            <div>
                <h2 className="text-sm font-semibold">Unterschriftenliste</h2>
                <p className="text-muted-foreground text-xs">
                    Gescannte Liste hochladen — sie ist der Nachweis für die Bestätigungen.
                </p>
            </div>
            <FileList
                owner="instruction"
                ownerId={instruction.id}
                canManage={instruction.permissions.canManage}
                emptyText="Noch keine unterschriebene Liste hochgeladen."
            />
        </Card>
    );
}

function Body({ instruction }: { instruction: InstructionDetailView }) {
    const action = useInstructionAction(instruction.id);
    const needsList = instruction.instructionType === 'Sammel' && instruction.documentCount === 0;

    return (
        <div className="space-y-4">
            <Header instruction={instruction} action={action} />

            {needsList ? (
                <div className="border-warning/30 bg-warning/5 rounded-2xl border p-4 text-sm print:hidden">
                    {SAMMEL_HINT}
                </div>
            ) : null}

            <div className="print:hidden">
                <AcknowledgeCard
                    instruction={instruction}
                    isPending={action.isPending}
                    onConfirm={() =>
                        action.mutate({
                            action: (id) => instructionRepository.acknowledge(id),
                            success: 'Kenntnisnahme bestätigt.',
                        })
                    }
                />
            </div>

            <ParticipantCard instruction={instruction} action={action} />
            <SignatureListCard instruction={instruction} />
            <AttendanceSheet instruction={instruction} />
        </div>
    );
}

export function InstructionDetailPage() {
    const { id = '' } = useParams();
    const { data, isPending, error, refetch } = useInstruction(id);

    return (
        <div className="space-y-4">
            <Button asChild variant="ghost" size="sm" className="gap-2 print:hidden">
                <Link to="/instructions">
                    <ArrowLeft className="size-4" /> Zurück zu Unterweisungen
                </Link>
            </Button>

            <AsyncBoundary isLoading={isPending} error={error} onRetry={() => void refetch()}>
                {data ? <Body instruction={data} /> : null}
            </AsyncBoundary>
        </div>
    );
}
