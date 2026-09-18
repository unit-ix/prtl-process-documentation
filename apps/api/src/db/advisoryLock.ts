// Skaliert der Plan einmal auf mehrere Instanzen, arbeitet trotzdem nur eine den Lauf ab.
import { sql } from 'drizzle-orm';
import { db } from './client.js';

export async function withAdvisoryLock<T>(key: string, run: () => Promise<T>): Promise<T | null> {
    const result = await db.execute<{ locked: boolean }>(sql`select pg_try_advisory_lock(hashtext(${key})) as locked`);
    if (result.rows[0]?.locked !== true) return null;

    try {
        return await run();
    } finally {
        await db.execute(sql`select pg_advisory_unlock(hashtext(${key}))`);
    }
}
