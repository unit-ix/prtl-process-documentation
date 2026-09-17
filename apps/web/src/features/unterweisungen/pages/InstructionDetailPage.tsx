import type { InstructionDetailView } from '@app/domain';
import { ArrowLeft, Mail, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { instructionRepository } from '@/data';
import { FileList } from '@/shared/components/files/FileList';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { AcknowledgeCard } from '../components/AcknowledgeCard';
import { AttendanceSheet } from '../components/AttendanceSheet';
import { InstructionHeader } from '../components/InstructionHeader';
import { ParticipantTable } from '../components/ParticipantTable';
import { useInstruction, useInstructionAction } from '../hooks/useInstructions';

const SAMMEL_HINT =
    'Sammelunterweisung: Vorlage drucken, von allen Teilnehmern unterschreiben lassen, unterschriebene Liste hier hochladen und anschließend über „Bestätigungen" alle Teilnehmer bestätigen.';

type Action = ReturnType<typeof useInstructionAction>;

function HeaderActions({ instruction, action }: { instruction: InstructionDetailView; action: Action }) {
    // Benachrichtigen lohnt nur, solange jemand offen ist UND eine Adresse hat; und nie, während
    // eine Mail bereits in der Warteschlange steht — sonst geht sie zweimal raus (§7.3).
    const notifiable = instruction.participants.filter(
        (participant) => participant.status === 'Offen' && participant.hasMail && participant.notifyStatus !== 'In Bearbeitung',
    );

    return (
        <>
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <Printer className="size-4" /> Liste drucken
            </Button>
            {instruction.permissions.canManage ? (
                <Button
                    variant="outline"
                    className="gap-2"
                    disabled={action.isPending || notifiable.length === 0}
                    title={notifiable.length === 0 ? 'Alle Teilnehmer sind benachrichtigt oder haben geantwortet.' : undefined}
                    onClick={() =>
                        action.mutate({
                            action: (id) => instructionRepository.notify(id),
                            success: `${notifiable.length} Benachrichtigung(en) eingereiht.`,
                        })
                    }
                >
                    <Mail className="size-4" /> Alle benachrichtigen
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
        </>
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
                onNotify={(participantId) =>
                    action.mutate({
                        action: (id) => instructionRepository.notifyParticipant(id, participantId),
                        success: 'Benachrichtigung eingereiht.',
                    })
                }
            />
        </Card>
    );
}

// §7.3/§7.4: die Unterschriftenliste ist der Nachweis der SAMMEL-Unterweisung. Bei einer
// Einzelunterweisung bestätigt jeder selbst per Mail — eine Liste zum Unterschreiben hat dort
// nichts zu suchen.
function SignatureListCard({ instruction }: { instruction: InstructionDetailView }) {
    if (instruction.instructionType !== 'Sammel') return null;

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
            <InstructionHeader
                instruction={instruction}
                actions={<HeaderActions instruction={instruction} action={action} />}
            />

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
