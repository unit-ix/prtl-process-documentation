import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Der eine Klassen-Merge-Helfer (clsx + tailwind-merge). Jede shadcn-Komponente
// nutzt `cn(...)` — nie manuelle Template-String-Konkatenation von Klassen.
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
