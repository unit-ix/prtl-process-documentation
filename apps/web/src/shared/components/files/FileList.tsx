import type { FileOwner } from '@/data/ports/FileStore';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { useFiles, useOpenFile } from '@/shared/hooks/useFiles';

const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,application/pdf,.xlsx,.xls,.docx,.doc';

const formatSize = (bytes: number): string =>
    bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface FileListProps {
    owner: FileOwner;
    ownerId: string;
    canManage: boolean;
    emptyText?: string;
}

function UploadButton({ onPick, isPending }: { onPick: (file: File) => void; isPending: boolean }) {
    const input = useRef<HTMLInputElement>(null);

    return (
        <div>
            <input
                ref={input}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onPick(file);
                    event.target.value = '';
                }}
            />
            <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={isPending}
                onClick={() => input.current?.click()}
            >
                <Upload className="size-4" /> {isPending ? 'Wird hochgeladen …' : 'Datei hochladen'}
            </Button>
        </div>
    );
}

function DeleteDialog({
    file,
    onCancel,
    onConfirm,
}: {
    file: { id: string; fileName: string } | null;
    onCancel: () => void;
    onConfirm: (id: string) => void;
}) {
    return (
        <Dialog open={file !== null} onOpenChange={(isOpen) => (isOpen ? undefined : onCancel())}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dokument entfernen</DialogTitle>
                    <DialogDescription>
                        „{file?.fileName}" wird entfernt. Das lässt sich nicht rückgängig machen.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        Abbrechen
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (file) onConfirm(file.id);
                            onCancel();
                        }}
                    >
                        Entfernen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function FileList({ owner, ownerId, canManage, emptyText = 'Noch keine Dokumente hochgeladen.' }: FileListProps) {
    const { data, isPending, upload, remove } = useFiles(owner, ownerId);
    const open = useOpenFile();
    const [pendingDelete, setPendingDelete] = useState<{ id: string; fileName: string } | null>(null);
    const files = data ?? [];

    return (
        <div className="space-y-4">
            {canManage ? <UploadButton isPending={upload.isPending} onPick={(file) => upload.mutate(file)} /> : null}

            {isPending ? null : files.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">{emptyText}</p>
            ) : (
                <ul className="divide-border/40 divide-y">
                    {files.map((file) => (
                        <li key={file.id} className="flex items-center justify-between gap-3 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <FileText className="text-muted-foreground size-4 shrink-0" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm">{file.fileName}</p>
                                    <p className="text-muted-foreground text-xs">{formatSize(file.sizeBytes)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" aria-label="Öffnen" onClick={() => open.mutate(file.id)}>
                                    <Download className="size-4" />
                                </Button>
                                {canManage ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Löschen"
                                        className="text-destructive"
                                        onClick={() => setPendingDelete(file)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                ) : null}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <DeleteDialog
                file={pendingDelete}
                onCancel={() => setPendingDelete(null)}
                onConfirm={(id) => remove.mutate(id)}
            />
        </div>
    );
}
