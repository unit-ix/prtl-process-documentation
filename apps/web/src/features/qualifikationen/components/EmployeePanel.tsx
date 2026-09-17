import type { EmployeeDetailView, QualificationView } from '@app/domain';
import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/shared/components/ui/sheet';
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

export function EmployeePanel({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
    const { data, isPending } = useEmployee(employeeId);
    const [editing, setEditing] = useState<{ open: boolean; existing: QualificationView | null }>({
        open: false,
        existing: null,
    });

    return (
        <Sheet open={employeeId !== ''} onOpenChange={(open) => (open ? undefined : onClose())}>
            <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
                {isPending || !data ? (
                    <div className="p-6">
                        <Skeleton className="h-64 w-full rounded-2xl" />
                    </div>
                ) : (
                    <EmployeeBody data={data} editing={editing} setEditing={setEditing} />
                )}
            </SheetContent>
        </Sheet>
    );
}

type Editing = { open: boolean; existing: QualificationView | null };

function EmployeeTabs({ data, onEdit }: { data: EmployeeDetailView; onEdit: (value: Editing) => void }) {
    return (
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
                            onEdit({
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
    );
}

function EmployeeBody({
    data,
    editing,
    setEditing,
}: {
    data: EmployeeDetailView;
    editing: Editing;
    setEditing: (value: Editing) => void;
}) {
    return (
        <div className="space-y-4">
            <SheetHeader className="pb-2">
                <SheetTitle>{data.employee.displayName}</SheetTitle>
                <SheetDescription>
                    {data.employee.areaTitle ?? 'Ohne Abteilung'}
                    {data.employee.mail ? ` · ${data.employee.mail}` : ''}
                </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-6 pb-6">

            <EmployeeTabs data={data} onEdit={setEditing} />

                <QualificationDialog
                    userId={data.employee.id}
                    open={editing.open}
                    existing={editing.existing}
                    onClose={() => setEditing({ open: false, existing: null })}
                />
            </div>
        </div>
    );
}
