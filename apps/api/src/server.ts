// API-Skelett — bewusst `node:http` ohne Framework.
//
// Im mock-Prototyp gibt es keine API: die Daten kommen aus dem Mock-Adapter hinter dem
// Data-Port (@/data). Dieses Package existiert, damit das Repo-Layout backend-unabhängig
// ist — der Fork bleibt so ein Swap in apps/web/src/data/index.ts und wird kein Repo-Umbau.
//
// Jede Runtime-Dependency hier wäre Vorwegnahme der Azure-Entscheidungen (Fastify, Drizzle,
// withTenant(), generierter Tabellen-Router). Die trägt der Azure-Fork ein, nicht dieses
// Skelett. Bis dahin: ein Health-Endpoint, der beweist, dass das Package baut und läuft.
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(PORT, () => {
    console.log(`api: http://localhost:${PORT}/health`);
});
