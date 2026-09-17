import type { EmployeeDetailView } from '@app/domain';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { peopleRepository } from '@/data';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { useEmployeeMutation } from '../hooks/usePeople';

function AddTaskForm({ employee }: { employee: EmployeeDetailView }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const save = useEmployeeMutation(employee.employee.id, 'Aufgabe gespeichert.');

    const submit = () =>
        save.mutate(
            () =>
                peopleRepository.saveTask({
                    userId: employee.employee.id,
                    title: title.trim(),
                    description: description.trim() === '' ? null : description.trim(),
                }),
            {
                onSuccess: () => {
                    setTitle('');
                    setDescription('');
                },
            },
        );

    return (
        <div className="border-border/40 space-y-2 rounded-lg border p-3">
            <Input value={title} placeholder="Neue Aufgabe" onChange={(event) => setTitle(event.target.value)} />
            <Textarea
                rows={2}
                value={description}
                placeholder="Beschreibung (optional)"
                onChange={(event) => setDescription(event.target.value)}
            />
            <Button size="sm" className="gap-1.5" disabled={title.trim() === '' || save.isPending} onClick={submit}>
                <Plus className="size-3.5" /> Hinzufügen
            </Button>
        </div>
    );
}

export function TaskTab({ employee }: { employee: EmployeeDetailView }) {
    const remove = useEmployeeMutation(employee.employee.id, 'Aufgabe entfernt.');

    return (
        <div className="space-y-4">
            {employee.tasks.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Noch keine Aufgaben erfasst.</p>
            ) : (
                <ul className="divide-border/40 divide-y">
                    {employee.tasks.map((task) => (
                        <li key={task.id} className="flex items-start justify-between gap-3 py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium">{task.title}</p>
                                {task.description ? (
                                    <p className="text-muted-foreground mt-0.5 text-xs">{task.description}</p>
                                ) : null}
                            </div>
                            {employee.canManage ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Entfernen"
                                    className="text-destructive"
                                    onClick={() => remove.mutate(() => peopleRepository.removeTask(task.id))}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}

            {employee.canManage ? <AddTaskForm employee={employee} /> : null}

        </div>
    );
}
