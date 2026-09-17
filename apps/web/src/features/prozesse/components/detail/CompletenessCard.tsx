import type { Completeness } from '@app/domain';
import { Check, Circle } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';

export function CompletenessCard({ completeness }: { completeness: Completeness }) {
    return (
        <Card className="glass-card border-border/40 rounded-2xl p-5">
            <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Vollständigkeit</h2>
                <span className="text-sm">
                    <span
                        className={
                            completeness.percent === 100 ? 'text-success font-semibold' : 'text-foreground font-semibold'
                        }
                    >
                        {completeness.percent} %
                    </span>
                    <span className="text-muted-foreground"> · {completeness.done} von {completeness.total}</span>
                </span>
            </div>
            <Progress value={completeness.percent} className="mt-3" />
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {completeness.checks.map((check) => (
                    <li key={check.key} className="flex items-center gap-2 text-sm">
                        {check.ok ? (
                            <Check className="text-success size-4" />
                        ) : (
                            <Circle className="text-muted-foreground size-4" />
                        )}
                        <span className={check.ok ? '' : 'text-muted-foreground'}>{check.label}</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
