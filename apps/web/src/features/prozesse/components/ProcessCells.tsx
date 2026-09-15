import type { ProcessListItem } from '@app/domain';
import { Building2 } from 'lucide-react';
import { authorInitials, categoryShortLabel } from '../mappings/processMappings';

export function AreaCell({ area }: { area: ProcessListItem['area'] }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="bg-primary/10 text-primary inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                <Building2 className="size-3" /> {area.title}
            </span>
            <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {area.shortCode} · {categoryShortLabel(area.categoryNumber)}
            </span>
        </div>
    );
}

export function AuthorCell({ author }: { author: ProcessListItem['author'] }) {
    if (!author) return <span className="text-muted-foreground text-sm">Nicht zugewiesen</span>;

    return (
        <div className="flex items-center gap-2">
            <div className="from-primary to-primary/70 text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-semibold">
                {authorInitials(author.displayName)}
            </div>
            <span className="truncate text-sm">{author.displayName}</span>
        </div>
    );
}
