import { EVENT_LABELS, type ProcessDetailView } from '@app/domain';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useAreas } from '../../hooks/useMasterData';
import { formatDate } from '../../mappings/processMappings';

const REJECTIONS = new Set(['content_rejected', 'formally_rejected']);

function lastRejection(events: ProcessDetailView['events']) {
    const last = [...events].reverse().find((event) => REJECTIONS.has(event.eventKind));
    return last && last.comment ? last : null;
}

// Der Prototyp speichert den Ablehnungsgrund und zeigt ihn nirgends — ein Verfasser erfährt dort
// nicht, warum sein Prozess zurückkam (§9.6).
export function RejectionBanner({ process }: { process: ProcessDetailView }) {
    if (process.version.status !== 'in_capture') return null;
    const event = lastRejection(process.events);
    if (!event) return null;

    const heading =
        event.eventKind === 'formally_rejected'
            ? 'Von QM abgelehnt — bitte überarbeiten'
            : 'Zurückgegeben (inhaltliche Prüfung) — bitte überarbeiten';

    return (
        <div className="border-destructive/30 bg-destructive/5 rounded-2xl border p-4">
            <div className="text-destructive flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="size-4" /> {heading}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
                von {event.actor?.displayName ?? 'Unbekannt'} · {formatDate(event.createdAt)}
            </p>
            <blockquote className="border-destructive/40 mt-3 border-l-2 pl-3 text-sm whitespace-pre-line">
                {event.comment}
            </blockquote>
        </div>
    );
}

export function ReleaseBanner({ process }: { process: ProcessDetailView }) {
    if (process.version.status !== 'approved' || process.version.approvedAt === null) return null;

    return (
        <div className="border-success/30 bg-success/5 text-success flex items-center gap-2 rounded-2xl border p-4 text-sm font-medium">
            <CheckCircle2 className="size-4" />
            Freigegeben am {formatDate(process.version.approvedAt)}
            {process.version.approvedByQm ? ` von ${process.version.approvedByQm.displayName}` : ''}
        </div>
    );
}

const HEADING_TO_REVIEW = new Set(['backlog', 'in_capture', 'content_review']);

// Ohne Leitung bekommt beim Einreichen niemand eine Mail und niemand außer der Administration darf
// inhaltlich prüfen — der Prozess bliebe unbemerkt liegen (Rollentest 16.10.2026). Ein deaktivierter
// Bereich fehlt in der Liste; dann lieber schweigen als falsch warnen.
export function NoAreaLeadBanner({ process }: { process: ProcessDetailView }) {
    const { data: areas } = useAreas();
    const area = areas?.find((candidate) => candidate.id === process.area.id);
    if (!HEADING_TO_REVIEW.has(process.version.status) || !area || area.processOwner !== null) return null;

    return (
        <div className="border-warning/30 bg-warning/5 rounded-2xl border p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="text-warning size-4" /> Für den Bereich „{area.title}" ist keine Leitung eingetragen
            </div>
            <p className="text-muted-foreground mt-1">
                Nach dem Einreichen wird niemand benachrichtigt, und die inhaltliche Prüfung bleibt liegen. Die Leitung
                trägt die Administration unter Einstellungen → Bereiche ein.
            </p>
        </div>
    );
}

export function HiddenDraftNote({ process }: { process: ProcessDetailView }) {
    if (!process.hasHiddenDraft) return null;
    return (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Info className="size-3.5" /> Eine neue Ausgabe ist in Bearbeitung.
        </p>
    );
}

export const eventLabel = (kind: keyof typeof EVENT_LABELS): string => EVENT_LABELS[kind];
