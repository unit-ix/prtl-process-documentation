import { EVENT_LABELS, EVENT_TONE, type ProcessDetailView } from '@app/domain';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import { formatDate, formatDateTime } from '../../mappings/processMappings';

const TONE_BORDER = {
    neutral: 'border-border',
    success: 'border-success',
    danger: 'border-destructive',
} as const;

function SignOffTable({ process }: { process: ProcessDetailView }) {
    const { version } = process;
    const rows = [
        { no: 1, label: 'Verfasser', name: version.author?.displayName, date: version.submittedAt },
        { no: 2, label: 'Inhaltliche Prüfung (PV)', name: version.processOwner?.displayName, date: version.contentReviewedAt },
        { no: 3, label: 'Formelle Freigabe (QM)', name: version.approvedByQm?.displayName, date: version.approvedAt },
    ];

    return (
        <table className="w-full text-sm">
            <tbody>
                {rows.map((row) => (
                    <tr key={row.no} className="border-border/40 border-b last:border-0">
                        <td className="text-muted-foreground w-8 py-2">{row.no}</td>
                        <td className="py-2">{row.label}</td>
                        <td className="py-2">
                            {row.name ?? <span className="text-muted-foreground italic">ausstehend</span>}
                        </td>
                        <td className="text-muted-foreground w-28 py-2 text-right">{formatDate(row.date)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function EditionHistory({
    process,
    onShowSnapshot,
}: {
    process: ProcessDetailView;
    onShowSnapshot: (versionId: string, edition: number) => void;
}) {
    return (
            <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6">
                <h2 className="text-sm font-semibold">Ausgaben-Verlauf</h2>
                {process.releasedVersions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Noch keine freigegebene Ausgabe — die erste entsteht mit der Freigabe.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {process.releasedVersions.map((version) => (
                            <li key={version.id} className="flex items-center justify-between gap-3 text-sm">
                                <div>
                                    <span className="font-medium">Ausgabe {version.edition}</span>
                                    {version.edition === process.edition ? (
                                        <span className="bg-success/15 text-success ml-2 rounded-full px-2 py-0.5 text-xs">
                                            aktuell gültig
                                        </span>
                                    ) : null}
                                    <p className="text-muted-foreground text-xs">
                                        freigegeben {formatDate(version.approvedAt)}
                                        {version.approvedByQm ? ` · ${version.approvedByQm.displayName}` : ''}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onShowSnapshot(version.id, version.edition)}
                                >
                                    Ansehen
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
    );
}

function SignOffCard({ process }: { process: ProcessDetailView }) {
    return (
            <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">Genehmigungsverzeichnis</h2>
                    {process.edition === null ? (
                        <span className="bg-warning/15 text-warning-foreground rounded-full px-2.5 py-1 text-xs">
                            Noch keine freigegebene Ausgabe — Genehmigung folgt mit der ersten Freigabe
                        </span>
                    ) : (
                        <span className="bg-success/15 text-success rounded-full px-2.5 py-1 text-xs">
                            Genehmigungsverzeichnis der freigegebenen Ausgabe {process.edition}
                        </span>
                    )}
                </div>
                <SignOffTable process={process} />
            </Card>
    );
}

function EventHistory({ process }: { process: ProcessDetailView }) {
    return (
            <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6">
                <h2 className="text-sm font-semibold">Prüfverlauf</h2>
                {process.events.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Noch kein Prüfverlauf vorhanden.</p>
                ) : (
                    <ul className="space-y-3">
                        {process.events.map((event) => (
                            <li
                                key={event.id}
                                className={cn('border-l-2 pl-3', TONE_BORDER[EVENT_TONE[event.eventKind]])}
                            >
                                <p className="text-sm font-medium">{EVENT_LABELS[event.eventKind]}</p>
                                <p className="text-muted-foreground text-xs">
                                    {event.actor?.displayName ?? 'Unbekannt'} · {formatDateTime(event.createdAt)}
                                </p>
                                {event.comment ? (
                                    <blockquote className="border-destructive/40 bg-destructive/5 mt-2 rounded-md border-l-2 p-2 text-sm whitespace-pre-line">
                                        {event.comment}
                                    </blockquote>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
    );
}

export function ApprovalTab({
    process,
    onShowSnapshot,
}: {
    process: ProcessDetailView;
    onShowSnapshot: (versionId: string, edition: number) => void;
}) {
    return (
        <div className="space-y-4">
            <EditionHistory process={process} onShowSnapshot={onShowSnapshot} />
            <SignOffCard process={process} />
            <EventHistory process={process} />
        </div>
    );
}
