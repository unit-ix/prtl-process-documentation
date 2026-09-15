import type { ProcessListItem } from '@app/domain';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';
import { NO_IDENTIFIER } from '../mappings/processMappings';
import { AreaCell, AuthorCell } from './ProcessCells';
import { ProcessStatusBadge } from './ProcessStatusBadge';

interface ProcessRowProps {
    item: ProcessListItem;
    isChild?: boolean;
    expander?: ReactNode;
}

export function ProcessRow({ item, isChild = false, expander }: ProcessRowProps) {
    return (
        <TableRow className="border-border/40">
            <TableCell className="text-muted-foreground max-w-[180px] truncate font-mono text-xs">
                {item.identifier ?? NO_IDENTIFIER}
            </TableCell>
            <TableCell>
                <div className={cn('flex items-center gap-2', isChild && 'pl-6')}>
                    {expander ?? <span className="size-6 shrink-0" />}
                    <div className="min-w-0">
                        <div className="truncate leading-tight font-medium">{item.title}</div>
                        <div className="text-muted-foreground text-xs">
                            {item.specificationType}
                            {item.edition === null ? '' : ` · Ausgabe ${item.edition}`}
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <AreaCell area={item.area} />
            </TableCell>
            <TableCell className="hidden md:table-cell">
                <AuthorCell author={item.author} />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
                <span className="text-muted-foreground font-mono text-xs">{item.templateType}</span>
            </TableCell>
            <TableCell>
                <ProcessStatusBadge status={item.status} />
            </TableCell>
            <TableCell className="text-muted-foreground w-10">
                <ChevronRight className="size-4" />
            </TableCell>
        </TableRow>
    );
}
