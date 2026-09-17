import type { EmployeeListItem } from '@app/domain';
import { ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { EmployeePanel } from '../components/EmployeePanel';
import { useEmployees } from '../hooks/usePeople';

const ALL = 'all';

function Filters({
    search,
    area,
    areas,
    onSearch,
    onArea,
}: {
    search: string;
    area: string;
    areas: readonly string[];
    onSearch: (value: string) => void;
    onArea: (value: string) => void;
}) {
    return (
        <Card className="glass-card border-border/40 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={search}
                        placeholder="Mitarbeiter, Qualifikation oder Aufgabe …"
                        className="pl-9"
                        onChange={(event) => onSearch(event.target.value)}
                    />
                </div>
                <Select value={area} onValueChange={onArea}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Alle Abteilungen" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>Alle Abteilungen</SelectItem>
                        {areas.map((title) => (
                            <SelectItem key={title} value={title}>
                                {title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </Card>
    );
}

function EmployeeRow({ employee, onOpen }: { employee: EmployeeListItem; onOpen: () => void }) {
    return (
        <TableRow className="border-border/40 hover:bg-accent/40 cursor-pointer" onClick={onOpen}>
            <TableCell className="font-medium">{employee.displayName}</TableCell>
            <TableCell className="text-muted-foreground">{employee.areaTitle ?? '—'}</TableCell>
            <TableCell className="text-center tabular-nums">{employee.instructionCount}</TableCell>
            <TableCell className="text-center tabular-nums">{employee.qualificationCount}</TableCell>
            <TableCell className="text-center tabular-nums">{employee.taskCount}</TableCell>
            <TableCell className="text-muted-foreground w-10">
                <ChevronRight className="size-4" />
            </TableCell>
        </TableRow>
    );
}

function EmployeeTable({
    employees,
    onOpen,
}: {
    employees: readonly EmployeeListItem[];
    onOpen: (id: string) => void;
}) {
    return (
                <Card className="glass-elevated border-border/40 overflow-hidden rounded-3xl p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/40 hover:bg-transparent">
                                <TableHead>Mitarbeiter</TableHead>
                                <TableHead>Abteilung</TableHead>
                                <TableHead className="w-36 text-center">Unterweisungen</TableHead>
                                <TableHead className="w-36 text-center">Qualifikationen</TableHead>
                                <TableHead className="w-28 text-center">Aufgaben</TableHead>
                                <TableHead className="w-10" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={6} className="text-muted-foreground py-16 text-center">
                                        Keine Daten vorhanden.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                employees.map((employee) => (
                                    <EmployeeRow
                                        key={employee.id}
                                        employee={employee}
                                        onOpen={() => onOpen(employee.id)}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
    );
}

export function QualificationsPage() {
    const { data, isPending, error, refetch } = useEmployees();
    const [selected, setSelected] = useState('');
    const [search, setSearch] = useState('');
    const [area, setArea] = useState(ALL);

    const employees = useMemo(() => data ?? [], [data]);
    const areas = useMemo(
        () =>
            [
                ...new Set(
                    employees.map((employee) => employee.areaTitle).filter((title): title is string => title !== null),
                ),
            ].sort(),
        [employees],
    );

    const term = search.trim().toLowerCase();
    const visible = employees
        .filter((employee) => area === ALL || employee.areaTitle === area)
        .filter((employee) => employee.displayName.toLowerCase().includes(term));

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                    PRETTL electronics
                </p>
                <h1 className="text-gradient-primary text-2xl font-semibold tracking-tight md:text-3xl">
                    Qualifikationsmatrix
                </h1>
                <p className="text-muted-foreground max-w-2xl text-sm">
                    Mitarbeiterübersicht mit absolvierten Unterweisungen, Qualifikationen und Aufgaben – filterbar und
                    durchsuchbar.
                </p>
            </header>

            <Filters search={search} area={area} areas={areas} onSearch={setSearch} onArea={setArea} />

            <AsyncBoundary isLoading={isPending} error={error} onRetry={() => void refetch()}>
                <EmployeeTable employees={visible} onOpen={setSelected} />
            </AsyncBoundary>

            <EmployeePanel employeeId={selected} onClose={() => setSelected('')} />
        </div>
    );
}
