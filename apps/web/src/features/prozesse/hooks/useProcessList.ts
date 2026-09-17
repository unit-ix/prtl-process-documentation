import type { ProcessListItem, ProcessSortField } from '@app/domain';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { processRepository } from '@/data';
import type { ProcessFilter } from '@/data/ports/ProcessRepository';
import type { SortDirection } from '@/data/ports/Query';
import { useDebounced } from '@/shared/hooks/useDebounced';

export interface ProcessNode {
    readonly item: ProcessListItem;
    readonly children: readonly ProcessListItem[];
}

function toTree(items: readonly ProcessListItem[]): ProcessNode[] {
    const present = new Set(items.map((item) => item.id));
    const childrenOf = new Map<string, ProcessListItem[]>();

    for (const item of items) {
        if (item.parentProcessId === null || !present.has(item.parentProcessId)) continue;
        const siblings = childrenOf.get(item.parentProcessId) ?? [];
        siblings.push(item);
        childrenOf.set(item.parentProcessId, siblings);
    }

    return items
        .filter((item) => item.parentProcessId === null || !present.has(item.parentProcessId))
        .map((item) => ({ item, children: childrenOf.get(item.id) ?? [] }));
}

export function useProcessList() {
    const [filter, setFilter] = useState<ProcessFilter>({});
    const [sort, setSort] = useState<{ field: ProcessSortField; dir: SortDirection }>({
        field: 'identifier',
        dir: 'asc',
    });
    const debouncedSearch = useDebounced(filter.search ?? '', 300);

    const query = useQuery({
        queryKey: ['processes', { ...filter, search: debouncedSearch }, sort],
        queryFn: () => processRepository.list({ filter: { ...filter, search: debouncedSearch }, sort }),
        placeholderData: keepPreviousData,
    });

    const nodes = useMemo(() => toTree(query.data?.items ?? []), [query.data]);

    // Die Bereichsleiste zeigt, was in den geladenen Prozessen vorkommt — nicht alle 18 Bereiche.
    const areas = useMemo(() => {
        const seen = new Map<string, { id: string; title: string }>();
        for (const item of query.data?.items ?? []) seen.set(item.area.id, { id: item.area.id, title: item.area.title });
        return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title, 'de'));
    }, [query.data]);

    const toggleSort = (field: ProcessSortField) =>
        setSort((current) =>
            current.field === field ? { field, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' },
        );

    return { ...query, nodes, areas, total: query.data?.total ?? null, filter, setFilter, sort, toggleSort };
}
