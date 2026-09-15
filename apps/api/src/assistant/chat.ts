// Kein Schlüssel: das Token holt DefaultAzureCredential über die Managed Identity — dieselbe
// Mechanik wie bei PostgreSQL und Blob Storage. Canvas-Defekt 25 war ein Azure-AI-Schlüssel im
// Klartext in einer exportierbaren Flow-Definition; genau das kann hier nicht entstehen.
import { DefaultAzureCredential } from '@azure/identity';
import type { ChatMessage } from '@app/domain';
import { foundryEnv } from '../env.js';

const SCOPE = 'https://cognitiveservices.azure.com/.default';
const API_VERSION = '2024-10-21';
const TIMEOUT_MS = 20_000;

const credential = new DefaultAzureCredential();

interface Completion {
    choices?: { message?: { content?: string } }[];
}

export class AssistantUnavailable extends Error {}

/** Der Inhaltsfilter von Azure hat Frage oder Antwort abgelehnt — kein Ausfall, eine Entscheidung. */
export class AssistantRefused extends Error {}

export async function complete(messages: readonly ChatMessage[]): Promise<string> {
    const { FOUNDRY_ENDPOINT, FOUNDRY_DEPLOYMENT } = foundryEnv();
    const token = await credential.getToken(SCOPE);
    if (!token) throw new AssistantUnavailable('Kein Token für Azure AI erhalten.');

    const url = `${FOUNDRY_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${FOUNDRY_DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;

    // Der SWA-Proxy bricht nach 45 s ab; eine hängende Modellantwort darf nicht dorthin laufen.
    const response = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ messages, temperature: 0.2, max_completion_tokens: 500 }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        if (response.status === 400 && detail.includes('content management policy')) {
            throw new AssistantRefused(detail.slice(0, 200));
        }
        throw new AssistantUnavailable(`Azure AI antwortete mit ${response.status}: ${detail.slice(0, 300)}`);
    }

    const body = (await response.json()) as Completion;
    const answer = body.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new AssistantUnavailable('Azure AI lieferte keine Antwort.');
    return answer;
}
