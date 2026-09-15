import type { EmployeeListItem } from '@app/domain';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';
import { EmployeePanel } from '../components/EmployeePanel';
import { useEmployees } from '../hooks/usePeople';

function EmployeeTable({
    employees,
    selected,
    onSelect,
}: {
    employees: readonly EmployeeListItem[];
    selected: string;
    onSelect: (id: string) => void;
}) {
    return (
                    <Card className="glass-elevated border-border/40 overflow-hidden rounded-3xl p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border/40 hover:bg-transparent">
                                    <TableHead>Mitarbeiter</TableHead>
                                    <TableHead className="hidden sm:table-cell">Abteilung</TableHead>
                                    <TableHead className="w-16 text-right">Unt.</TableHead>
                                    <TableHead className="w-16 text-right">Qual.</TableHead>
                                    <TableHead className="w-16 text-right">Aufg.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.map((employee) => (
                                    <TableRow
                                        key={employee.id}
                                        className={cn(
                                            'border-border/40 hover:bg-accent/40 cursor-pointer',
                                            selected === employee.id && 'bg-accent/60',
                                        )}
                                        onClick={() => onSelect(employee.id)}
                                    >
                                        <TableCell className="font-medium">{employee.displayName}</TableCell>
                                        <TableCell className="text-muted-foreground hidden sm:table-cell">
                                            {employee.areaTitle ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right">{employee.instructionCount}</TableCell>
                                        <TableCell className="text-right">{employee.qualificationCount}</TableCell>
                                        <TableCell className="text-right">{employee.taskCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
    );
}

export function QualificationsPage() {
    const { data, isPending, error, refetch } = useEmployees();
    const [selected, setSelected] = useState('');
    const [search, setSearch] = useState('');

    const term = search.trim().toLowerCase();
    const employees = (data ?? []).filter((employee) => employee.displayName.toLowerCase().includes(term));

    return (
        <div className="space-y-8">
            <header className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                    PRETTL electronics
                </p>
                <h1 className="text-gradient-primary text-2xl font-semibold tracking-tight md:text-3xl">
                    Qualifikationsmatrix
                </h1>
                <p className="text-muted-foreground max-w-xl text-sm">
                    Unterweisungen, Qualifikationen und Aufgaben je Mitarbeiter.
                </p>
            </header>

            <div className="relative max-w-sm">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    value={search}
                    placeholder="Mitarbeiter suchen …"
                    className="pl-9"
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>

            <AsyncBoundary isLoading={isPending} error={error} onRetry={() => void refetch()}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <EmployeeTable employees={employees} selected={selected} onSelect={setSelected} />

                    <EmployeePanel employeeId={selected} />
                </div>
            </AsyncBoundary>
        </div>
    );
}
