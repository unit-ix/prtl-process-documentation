import type { ProcessDetailView } from '@app/domain';
import { Building2, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { categoryShortLabel, NO_IDENTIFIER, versionPill } from '../../mappings/processMappings';
import { ProcessStatusBadge } from '../ProcessStatusBadge';
import { HiddenDraftNote } from './ProcessBanners';

function MetaLine({ process }: { process: ProcessDetailView }) {
    return (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono">{process.identifier ?? NO_IDENTIFIER}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
                <Building2 className="size-3" /> {process.area.title}
            </span>
            <span>·</span>
            <span className="text-foreground font-medium">{process.area.shortCode}</span>
            <span>·</span>
            <span>{categoryShortLabel(process.area.categoryNumber)}</span>
            <span>·</span>
            <span>{versionPill(process)}</span>
        </div>
    );
}

function TypeBadges({ process }: { process: ProcessDetailView }) {
    const codes: (string | null)[] = [
        process.templateType,
        process.specificationType,
        process.scope,
        process.confidentiality,
    ];
    return (
        <div className="flex flex-wrap items-center gap-2 pt-1">
            <ProcessStatusBadge status={process.version.status} />
            {codes
                .filter((code): code is string => code !== null)
                .map((code) => (
                    <Badge key={code} variant="outline" className="h-5 text-[10px]">
                        {code}
                    </Badge>
                ))}
        </div>
    );
}

export function ProcessDetailHeader({ process, actions }: { process: ProcessDetailView; actions: ReactNode }) {
    return (
        <Card className="glass-elevated border-border/40 rounded-3xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                    <MetaLine process={process} />
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{process.title}</h1>
                    {process.shortDescription ? (
                        <p className="text-muted-foreground max-w-2xl text-sm">{process.shortDescription}</p>
                    ) : null}
                    <TypeBadges process={process} />
                    <HiddenDraftNote process={process} />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {process.permissions.canEditContent ? (
                        <Button asChild variant="outline" className="gap-2">
                            <Link to={`/processes/${process.id}/edit`}>
                                <Pencil className="size-4" /> Bearbeiten
                            </Link>
                        </Button>
                    ) : null}
                    {actions}
                </div>
            </div>
        </Card>
    );
}
