import type { InstructionDetailView } from '@app/domain';
import { BadgeCheck, CalendarDays, FileText, Layers, Repeat, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { cn } from '@/shared/lib/utils';
import { instructionStatusStyles } from '../mappings/instructionMappings';

const formatDate = (iso: string | null): string =>
    iso === null ? '—' : new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

function Fact({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone?: string }) {
    return (
        <div>
            <div className="text-muted-foreground mb-1 flex items-center gap-1 text-xs tracking-wide uppercase">
                <Icon className="size-3" /> {label}
            </div>
            <div className={cn('text-sm', tone)}>{value}</div>
        </div>
    );
}

function TitleBlock({ instruction }: { instruction: InstructionDetailView }) {
    return (
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                            Unterweisung: {instruction.process.title}
                        </h1>
                        <span
                            className={cn(
                                'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                                instructionStatusStyles[instruction.status],
                            )}
                        >
                            {instruction.status}
                        </span>
                        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                            <Layers className="size-3" />
                            {instruction.instructionType === 'Sammel' ? 'Sammelunterweisung' : 'Einzelunterweisung'}
                        </span>
                    </div>
                    {instruction.note ? (
                        <p className="text-muted-foreground max-w-2xl text-sm">{instruction.note}</p>
                    ) : null}
                    <Link
                        to={`/processes/${instruction.process.id}`}
                        className="text-primary inline-flex items-center gap-2 text-sm hover:underline"
                    >
                        <FileText className="size-4" />
                        {instruction.process.identifier ?? '(noch nicht vergeben)'} · {instruction.process.title}
                    </Link>
                </div>
    );
}

export function InstructionHeader({ instruction, actions }: { instruction: InstructionDetailView; actions: React.ReactNode }) {
    const isOverdue = instruction.status === 'Überfällig';

    return (
        <Card className="glass-elevated border-border/40 rounded-3xl p-6 print:hidden">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <TitleBlock instruction={instruction} />
                <div className="flex flex-wrap gap-2">{actions}</div>
            </div>

            <Separator className="my-5" />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Fact
                    icon={CalendarDays}
                    label="Frist"
                    value={formatDate(instruction.dueDate)}
                    tone={isOverdue ? 'text-destructive font-medium' : undefined}
                />
                <Fact icon={Repeat} label="Wiederholung" value={instruction.recurrence} />
                <Fact icon={Users} label="Teilnehmer" value={String(instruction.counts.total)} />
                <Fact
                    icon={BadgeCheck}
                    label="Bestätigt"
                    value={`${instruction.counts.confirmed} von ${instruction.counts.total}`}
                />
            </div>
        </Card>
    );
}
