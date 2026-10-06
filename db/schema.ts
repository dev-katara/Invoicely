import { pgTable, text, integer, bigint, uniqueIndex, index } from 'drizzle-orm/pg-core';
export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  name: text('name').notNull(), vatNumber: text('vat_number').notNull().default(''),
  address: text('address').notNull().default(''), email: text('email').notNull().default(''),
  mode: text('mode', { enum: ['demo', 'live'] }).notNull(), createdAt: text('created_at').notNull(),
}, t => [index('workspace_owner').on(t.ownerId)]);
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(), workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  reference: text('reference').notNull(), kind: text('kind', { enum: ['income', 'expense'] }).notNull(),
  counterparty: text('counterparty').notNull(), vatNumber: text('vat_number').notNull().default(''),
  email: text('email').notNull().default(''), date: text('date').notNull(), dueDate: text('due_date').notNull(),
  category: text('category').notNull(), items: text('items').notNull(),
  netCents: integer('net_cents').notNull(), vatCents: integer('vat_cents').notNull(), totalCents: integer('total_cents').notNull(),
  status: text('status', { enum: ['draft', 'issued', 'paid'] }).notNull().default('draft'),
  notes: text('notes').notNull().default(''), fileId: text('file_id'),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('invoice_reference_workspace').on(t.workspaceId, t.reference), index('invoice_workspace_date').on(t.workspaceId, t.date)]);
export const contacts = pgTable('contacts', {
  id: text('id').primaryKey(), workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  name: text('name').notNull(), vatNumber: text('vat_number').notNull(), email: text('email').notNull().default(''),
  address: text('address').notNull().default(''), createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('contact_vat_workspace').on(t.workspaceId, t.vatNumber)]);
export const uploads = pgTable('uploads', {
  id: text('id').primaryKey(), workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  filename: text('filename').notNull(), mime: text('mime').notNull(), size: integer('size').notNull(),
  objectKey: text('object_key').notNull(), sha256: text('sha256').notNull(),
  createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('upload_hash_workspace').on(t.workspaceId, t.sha256)]);
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(), workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  action: text('action').notNull(), entityId: text('entity_id').notNull(), createdAt: text('created_at').notNull(),
}, t => [index('audit_workspace_date').on(t.workspaceId, t.createdAt)]);
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull(),
});
export const authUsers = pgTable('auth_users', {
  id: text('id').primaryKey(), email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(), passwordHash: text('password_hash').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});
export const authSessions = pgTable('auth_sessions', {
  tokenHash: text('token_hash').primaryKey(), userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
}, t => [index('auth_sessions_expiry').on(t.expiresAt), index('auth_sessions_user').on(t.userId)]);
