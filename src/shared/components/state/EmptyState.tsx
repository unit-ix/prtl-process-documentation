import { type ComponentType, type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: ComponentType<{ className?: string }>;
    /** Optionale Primär-Aktion (z. B. "Neu anlegen"). */
    action?: ReactNode;
}

// DoD-Pflichtzustand „Empty": eine Liste ohne Datensätze ist nie eine leere Seite,
// sondern erklärt sich + bietet ggf. den nächsten Schritt an.
export function EmptyState({
    title = 'Keine Einträge',
    description = 'Hier gibt es noch nichts zu sehen.',
    icon: Icon = Inbox,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <Icon className="text-muted-foreground size-8" />
            <div className="space-y-1">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            {action}
        </div>
    );
}
