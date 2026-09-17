import type { z } from 'zod';
import { badRequest } from '../http/errors.js';

export function parseBody<TSchema extends z.ZodType>(schema: TSchema, body: unknown): z.infer<TSchema> {
    const parsed = schema.safeParse(body);
    if (parsed.success) return parsed.data;

    const detail = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
    throw badRequest(detail);
}
