import type { EmployeeDetailView, QualificationView } from '@app/domain';
import { useState } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useEmployee } from '../hooks/usePeople';
import { QualificationDialog } from './QualificationDialog';
import { QualificationTab } from './QualificationTab';
import { TaskTab } from './TaskTab';

const formatDate = (iso: string | null): string =>
    iso === null ? '—' : new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

function InstructionHistory({ instructions }: { instructions: EmployeeDetailView['instructions'] }) {
    if (instructions.length === 0) {
        return <p className="text-muted-foreground text-sm italic">Noch keine bestätigten Unterweisungen.</p>;
    }

    return (
        <ul className="divide-border/40 divide-y">
            {instructions.map((instruction) => (
                <li key={instruction.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                        {instruction.process.identifier ? (
                            <span className="text-muted-foreground font-mono text-xs">
                                {instruction.process.identifier}{' '}
                            </span>
                        ) : null}
                        {instruction.process.title}
                    </span>
                    <span className="text-muted-foreground text-xs">{formatDate(instruction.confirmedAt)}</span>
                </li>
            ))}
        </ul>
    );
}

function EmployeeHeading({ employee }: { employee: EmployeeDetailView['employee'] }) {
    return (
        <div>
            <h2 className="text-lg font-semibold">{employee.displayName}</h2>
            <p className="text-muted-foreground text-xs">
                {employee.areaTitle ?? 'Ohne Bereich'}
                {employee.mail ? ` · ${employee.mail}` : ''}
            </p>
        </div>
    );
}

export function EmployeePanel({ employeeId }: { employeeId: string }) {
    const { data, isPending } = useEmployee(employeeId);
    const [editing, setEditing] = useState<{ open: boolean; existing: QualificationView | null }>({
        open: false,
        existing: null,
    });

    if (employeeId === '') {
        return (
            <Card className="glass-card border-border/40 text-muted-foreground rounded-2xl p-6 text-sm">
                Mitarbeiter auswählen, um Unterweisungen, Qualifikationen und Aufgaben zu sehen.
            </Card>
        );
    }

    if (isPending || !data) return <Skeleton className="h-64 w-full rounded-2xl" />;

    return (
        <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6">
            <EmployeeHeading employee={data.employee} />

            <Tabs defaultValue="instructions">
                <TabsList>
                    <TabsTrigger value="instructions">Unterweisungen</TabsTrigger>
                    <TabsTrigger value="qualifications">Qualifikationen</TabsTrigger>
                    <TabsTrigger value="tasks">Aufgaben</TabsTrigger>
                </TabsList>

                <TabsContent value="instructions">
                    <InstructionHistory instructions={data.instructions} />
                </TabsContent>

                <TabsContent value="qualifications">
                    <QualificationTab
                        employee={data}
                        onEdit={(id) =>
                            setEditing({
                                open: true,
                                existing: (data.qualifications ?? []).find((item) => item.id === id) ?? null,
                            })
                        }
                    />
                </TabsContent>

                <TabsContent value="tasks">
                    <TaskTab employee={data} />
                </TabsContent>
            </Tabs>

            <QualificationDialog
                userId={data.employee.id}
                open={editing.open}
                existing={editing.existing}
                onClose={() => setEditing({ open: false, existing: null })}
            />
        </Card>
    );
}
