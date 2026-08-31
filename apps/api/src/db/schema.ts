import { sql } from 'drizzle-orm';
import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const industryEnum = pgEnum('industry', [
    'technology',
    'manufacturing',
    'retail',
    'services',
    'public_sector',
    'other',
]);
export const companyStatusEnum = pgEnum('company_status', ['prospect', 'active', 'inactive']);
export const contactRoleEnum = pgEnum('contact_role', ['decision_maker', 'influencer', 'user', 'other']);

export const companies = pgTable('companies', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    industry: industryEnum('industry').notNull(),
    status: companyStatusEnum('status').notNull(),
    employeeCount: integer('employee_count').notNull().default(0),
    city: text('city').notNull().default(''),
    website: text('website').notNull().default(''),
    createdOn: timestamp('created_on', { withTimezone: true }).notNull().defaultNow(),
});

export const contacts = pgTable('contacts', {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),

    fullName: text('full_name').generatedAlwaysAs(sql`first_name || ' ' || last_name`),

    email: text('email').notNull().default(''),
    phone: text('phone').notNull().default(''),
    role: contactRoleEnum('role').notNull(),
    companyId: uuid('company_id')
        .notNull()
        .references(() => companies.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdOn: timestamp('created_on', { withTimezone: true }).notNull().defaultNow(),
});

export type CompanyRow = typeof companies.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
