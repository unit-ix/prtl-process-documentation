import { Building2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface AreaOption {
    readonly id: string;
    readonly title: string;
}

interface AreaPillsProps {
    areas: readonly AreaOption[];
    selected: string | undefined;
    onSelect: (areaId: string | undefined) => void;
}

// Nur Bereiche, in denen es auch Prozesse gibt — bei 18 Bereichen wäre eine vollständige Leiste
// eine Wand aus Knöpfen, von denen die meisten leere Listen zeigen.
export function AreaPills({ areas, selected, onSelect }: AreaPillsProps) {
    if (areas.length === 0) return null;

    const pill = (isActive: boolean) =>
        cn(
            'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
            isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border/60 text-muted-foreground hover:bg-accent/40',
        );

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground mr-1 flex items-center gap-1.5 text-xs font-medium">
                <Building2 className="size-3.5" /> Bereich:
            </span>
            <button type="button" className={pill(selected === undefined)} onClick={() => onSelect(undefined)}>
                Alle
            </button>
            {areas.map((area) => (
                <button
                    key={area.id}
                    type="button"
                    className={pill(selected === area.id)}
                    onClick={() => onSelect(selected === area.id ? undefined : area.id)}
                >
                    {area.title}
                </button>
            ))}
        </div>
    );
}
