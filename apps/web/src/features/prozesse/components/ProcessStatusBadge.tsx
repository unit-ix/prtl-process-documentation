import { PROCESS_STATUS_LABELS, type ProcessStatus } from '@app/domain';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import { processStatusStyles } from '../mappings/processMappings';

export function ProcessStatusBadge({ status, deactivated = false }: { status: ProcessStatus; deactivated?: boolean }) {
    return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn('rounded-full border font-medium', processStatusStyles[status])}>
                {PROCESS_STATUS_LABELS[status]}
            </Badge>
            {deactivated ? (
                <Badge variant="outline" className="bg-muted text-muted-foreground rounded-full border font-medium">
                    Inaktiv
                </Badge>
            ) : null}
        </span>
    );
}
