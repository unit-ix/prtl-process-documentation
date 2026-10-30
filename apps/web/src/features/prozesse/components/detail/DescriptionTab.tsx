import type { ProcessDetailView, RichDocument } from '@app/domain';
import { useRef } from 'react';
import { Card } from '@/shared/components/ui/card';
import { RichTextView } from '@/shared/components/richtext/RichTextView';
import { EditLink } from './OverviewTab';

interface Heading {
    readonly level: number;
    readonly text: string;
}

interface DocNode {
    type?: string;
    text?: string;
    attrs?: { level?: unknown };
    content?: DocNode[];
}

const INDENT = ['', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20'];

const textOf = (node: DocNode): string => node.text ?? (node.content ?? []).map(textOf).join('');

// In Dokumentreihenfolge — dieselbe, in der die Lese-Ansicht ihre <h1>…<h6> ausgibt. Der n-te
// Eintrag gehört deshalb zur n-ten Überschrift im HTML, ohne Anker im eingefrorenen Dokument.
function collectHeadings(node: DocNode, found: Heading[]): Heading[] {
    if (node.type === 'heading') found.push({ level: Number(node.attrs?.level ?? 1), text: textOf(node).trim() });
    for (const child of node.content ?? []) collectHeadings(child, found);
    return found;
}

/** Inhaltsverzeichnis für lange Beschreibungen (Termin 30.10.): erst ab zwei Überschriften. */
function Toc({ doc, onJump }: { doc: RichDocument | null; onJump: (index: number) => void }) {
    const headings = doc ? collectHeadings(doc as DocNode, []) : [];
    if (headings.length < 2) return null;
    const top = Math.min(...headings.map((heading) => heading.level));

    return (
        <nav className="border-border/50 space-y-1 rounded-xl border p-4">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Inhalt</h3>
            <ul className="space-y-1 text-sm">
                {headings.map((heading, index) => (
                    <li key={index} className={INDENT[heading.level - top]}>
                        <button type="button" className="text-primary text-left hover:underline" onClick={() => onJump(index)}>
                            {heading.text || 'Ohne Titel'}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export function DescriptionTab({ process }: { process: ProcessDetailView }) {
    const body = useRef<HTMLDivElement>(null);
    const jump = (index: number) =>
        body.current?.querySelectorAll('h1, h2, h3, h4, h5, h6')[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return (
        <Card className="glass-card border-border/40 space-y-5 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Prozessbeschreibung</h2>
                {process.permissions.canEditContent ? (
                    <EditLink to={`/processes/${process.id}/description`} />
                ) : null}
            </div>
            <Toc doc={process.version.descriptionDoc} onJump={jump} />
            <div ref={body}>
                <RichTextView doc={process.version.descriptionDoc} />
            </div>
        </Card>
    );
}
