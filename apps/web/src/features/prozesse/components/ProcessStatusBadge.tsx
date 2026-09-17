import { PROCESS_STATUS_LABELS, type ProcessStatus } from '@app/domain';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import { processStatusStyles } from '../mappings/processMappings';

export function ProcessStatusBadge({ status }: { status: ProcessStatus }) {
    return (
        <Badge variant="outline" className={cn('rounded-full border font-medium', processStatusStyles[status])}>
            {PROCESS_STATUS_LABELS[status]}
        </Badge>
    );
}
