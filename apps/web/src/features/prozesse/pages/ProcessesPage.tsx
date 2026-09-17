import { canCreateProcess } from '@app/domain';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { useSessionUser } from '@/shared/lib/session/SessionContext';
import { Card } from '@/shared/components/ui/card';
import { AreaPills } from '../components/AreaPills';
import { ProcessCreateSheet } from '../components/ProcessCreateSheet';
import { ProcessFilters } from '../components/ProcessFilters';
import { ProcessTable } from '../components/ProcessTable';
import { useProcessList } from '../hooks/useProcessList';

export function ProcessesPage() {
    const canCreate = canCreateProcess(useSessionUser());
    const { nodes, areas, filter, setFilter, sort, toggleSort, isPending, error, refetch, total } = useProcessList();

    return (
        <div className="space-y-8">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                    PRETTL electronics
                </p>
                <h1 className="text-gradient-primary text-2xl font-semibold tracking-tight md:text-3xl">Prozesse</h1>
                <p className="text-muted-foreground max-w-xl text-sm">
                    Übersicht aller Prozesse – von der Erfassung über die inhaltliche und formelle Prüfung bis zur
                    Freigabe.
                </p>
                </div>
                {canCreate ? <ProcessCreateSheet /> : null}
            </header>

            <div className="space-y-3">
                <ProcessFilters filter={filter} onChange={setFilter} />
                <AreaPills
                    areas={areas}
                    selected={filter.area}
                    onSelect={(area) => setFilter({ ...filter, area })}
                />
            </div>

            <AsyncBoundary isLoading={isPending} error={error} onRetry={() => void refetch()}>
                <Card className="glass-elevated border-border/40 overflow-hidden rounded-3xl p-0">
                    <ProcessTable nodes={nodes} sort={sort} onSort={toggleSort} />
                </Card>
            </AsyncBoundary>

            {total === null || total === undefined ? null : (
                <p className="text-muted-foreground text-xs">{total} Prozesse</p>
            )}
        </div>
    );
}
