import type { ReactNode } from 'react';
import { TableCell, TableRow } from '@/shared/components/ui/table';

interface EmptyRowProps {
    colSpan: number;
    text: string;
    hint?: string;
    action?: ReactNode;
}

// Eine leere Liste ist ein Zustand, kein Fehler — und sie sollte sagen, was als Nächstes zu tun ist.
export function EmptyRow({ colSpan, text, hint, action }: EmptyRowProps) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="py-16 text-center">
                <p className="text-sm font-medium">{text}</p>
                {hint ? <p className="text-muted-foreground mt-1 text-sm">{hint}</p> : null}
                {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
            </TableCell>
        </TableRow>
    );
}
