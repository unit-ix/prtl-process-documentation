import type { AssistantHit } from '@app/domain';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Send, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { assistantRepository } from '@/data';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

interface Turn {
    readonly question: string;
    readonly answer: string;
    readonly hits: AssistantHit[];
}

const FAILURE = 'Es gab ein Problem bei der Suche. Bitte versuche es erneut.';

function HitCard({ hit }: { hit: AssistantHit }) {
    return (
        <div className="border-border/40 flex items-center justify-between gap-3 rounded-xl border p-3">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{hit.title}</p>
                <p className="text-muted-foreground font-mono text-xs">
                    {hit.identifier ?? '(noch nicht vergeben)'} · {hit.areaTitle}
                </p>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={`/processes/${hit.processId}`}>
                    Öffnen <ArrowRight className="size-3.5" />
                </Link>
            </Button>
        </div>
    );
}

function Conversation({ turns }: { turns: readonly Turn[] }) {
    if (turns.length === 0) {
        return (
            <Card className="glass-card border-border/40 space-y-2 rounded-2xl p-8 text-center">
                <Sparkles className="text-primary mx-auto size-6" />
                <p className="text-sm font-medium">Stellen Sie eine Frage zu den freigegebenen Prozessen.</p>
                <p className="text-muted-foreground text-sm">
                    Zum Beispiel: „Wie läuft die Wareneingangsprüfung?" oder „Welche Prozesse gibt es im Einkauf?"
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {turns.map((turn, index) => (
                <Card key={index} className="glass-card border-border/40 space-y-3 rounded-2xl p-6">
                    <p className="text-muted-foreground text-sm">{turn.question}</p>
                    <p className="text-sm font-medium">{turn.answer}</p>
                    {/* Jeder Treffer bekommt eine Karte — Canvas wertet alle aus und zeigt nur den ersten. */}
                    {turn.hits.map((hit) => (
                        <HitCard key={hit.processId} hit={hit} />
                    ))}
                </Card>
            ))}
        </div>
    );
}

export function AssistantPage() {
    const [question, setQuestion] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);

    const askQuestion = useMutation({
        mutationFn: (value: string) => assistantRepository.ask(value),
        onSuccess: (result, value) =>
            setTurns((current) => [...current, { question: value, answer: result.answer, hits: result.hits }]),
        onError: (_error, value) =>
            setTurns((current) => [...current, { question: value, answer: FAILURE, hits: [] }]),
    });

    const submit = () => {
        const value = question.trim();
        if (value === '') return;
        setQuestion('');
        askQuestion.mutate(value);
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <header className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                    PRETTL electronics
                </p>
                <h1 className="text-gradient-primary text-2xl font-semibold tracking-tight md:text-3xl">
                    Chatbot-Assistent
                </h1>
                <p className="text-muted-foreground text-sm">
                    Findet freigegebene Prozesse — durchsucht wird nur, was Sie ohnehin sehen dürfen.
                </p>
            </header>

            <Conversation turns={turns} />

            <div className="flex items-center gap-2">
                <Input
                    value={question}
                    placeholder="Frage stellen …"
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => (event.key === 'Enter' ? submit() : undefined)}
                />
                <Button className="gap-2" disabled={askQuestion.isPending || question.trim() === ''} onClick={submit}>
                    <Send className="size-4" /> Senden
                </Button>
                {turns.length > 0 ? (
                    <Button variant="ghost" className="gap-2" onClick={() => setTurns([])}>
                        <Trash2 className="size-4" /> Chat löschen
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
