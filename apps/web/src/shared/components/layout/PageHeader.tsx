import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
}

// Fünf Seiten bauten ihren Kopf vorher einzeln — mit leicht verschiedenen Abständen und
// Schriftgrössen. Eine Stelle, ein Rhythmus.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                    PRETTL electronics
                </p>
                <h1 className="text-gradient-primary text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
                {description ? <p className="text-muted-foreground max-w-2xl text-sm">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    );
}
