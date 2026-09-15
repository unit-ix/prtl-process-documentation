import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { processRepository } from '@/data';
import { FileList } from '@/shared/components/files/FileList';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ApprovalTab } from '../components/detail/ApprovalTab';
import { CompletenessCard } from '../components/detail/CompletenessCard';
import { OverviewTab } from '../components/detail/OverviewTab';
import { ProcessActions } from '../components/detail/ProcessActions';
import { RejectionBanner, ReleaseBanner } from '../components/detail/ProcessBanners';
import { ProcessDetailHeader } from '../components/detail/ProcessDetailHeader';
import { RejectDialog, type RejectKind } from '../components/detail/RejectDialog';
import { SnapshotDialog } from '../components/detail/SnapshotDialog';
import { useProcessAction, useProcessDetail } from '../hooks/useProcessDetail';
import type { ProcessDetailView } from '@app/domain';

function DetailTabs({
    process,
    onShowSnapshot,
}: {
    process: ProcessDetailView;
    onShowSnapshot: (versionId: string, edition: number) => void;
}) {
    const showApproval = process.permissions.canSeeApprovalTab;

    return (
        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">Übersicht</TabsTrigger>
                <TabsTrigger value="documents">Dokumente</TabsTrigger>
                {showApproval ? <TabsTrigger value="approval">Genehmigung &amp; Versionen</TabsTrigger> : null}
            </TabsList>
            <TabsContent value="overview">
                <OverviewTab process={process} />
            </TabsContent>
            <TabsContent value="documents">
                <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6">
                    <div>
                        <h2 className="text-sm font-semibold">Dokumente</h2>
                        <p className="text-muted-foreground text-xs">
                            Bilder, PDF oder Excel-Tabellen, die den Ablauf beschreiben.
                        </p>
                    </div>
                    <FileList owner="process" ownerId={process.id} canManage={process.permissions.canEditContent} />
                </Card>
            </TabsContent>
            {showApproval ? (
                <TabsContent value="approval">
                    <ApprovalTab process={process} onShowSnapshot={onShowSnapshot} />
                </TabsContent>
            ) : null}
        </Tabs>
    );
}

function DetailBody({ process }: { process: ProcessDetailView }) {
    const [rejectKind, setRejectKind] = useState<RejectKind | null>(null);
    const [snapshot, setSnapshot] = useState<{ id: string; edition: number } | null>(null);
    const action = useProcessAction(process);

    const reject = (comment: string) => {
        const call =
            rejectKind === 'formal'
                ? (id: string) => processRepository.rejectFormal(id, comment)
                : (id: string) => processRepository.rejectContent(id, comment);
        action.mutate(call, { onSuccess: () => setRejectKind(null) });
    };

    return (
        <div className="space-y-4">
            <ProcessDetailHeader
                process={process}
                actions={
                    <ProcessActions
                        process={process}
                        isPending={action.isPending}
                        run={(call) => action.mutate(call)}
                        onReject={setRejectKind}
                    />
                }
            />

            <RejectionBanner process={process} />
            <ReleaseBanner process={process} />

            {process.permissions.canEditContent ? <CompletenessCard completeness={process.completeness} /> : null}

            <DetailTabs process={process} onShowSnapshot={(id, edition) => setSnapshot({ id, edition })} />

            <RejectDialog
                kind={rejectKind}
                isPending={action.isPending}
                onClose={() => setRejectKind(null)}
                onConfirm={reject}
            />
            <SnapshotDialog processId={process.id} version={snapshot} onClose={() => setSnapshot(null)} />
        </div>
    );
}

export function ProcessDetailPage() {
    const { id = '' } = useParams();
    const { data, isPending, error, refetch } = useProcessDetail(id);

    return (
        <div className="space-y-4">
            <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link to="/processes">
                    <ArrowLeft className="size-4" /> Zurück zu Prozesse
                </Link>
            </Button>

            <AsyncBoundary isLoading={isPending} error={error} onRetry={() => void refetch()}>
                {data ? <DetailBody process={data} /> : null}
            </AsyncBoundary>
        </div>
    );
}
