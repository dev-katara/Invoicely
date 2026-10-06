import { z } from 'zod';
import { categories, isValidDate, validVat } from './domain';
const date = z.string().refine(isValidDate, 'Μη έγκυρη ημερομηνία.');
const vat = z.string().refine(v => v === '' || validVat(v), 'Το ΑΦΜ δεν είναι έγκυρο.');
const email = z.union([z.literal(''), z.string().email('Μη έγκυρο email.')]);
export const lineSchema = z.object({ description: z.string().trim().min(1).max(300), quantity: z.number().positive().max(10000).multipleOf(0.01), unitCents: z.number().int().min(0).max(100000000), vatRate: z.union([z.literal(24), z.literal(13), z.literal(6)]) });
export const invoiceSchema = z.object({ id: z.string().uuid(), reference: z.string().trim().min(1).max(50).regex(/^[\p{L}\p{N} _./-]+$/u), kind: z.enum(['income', 'expense']), counterparty: z.string().trim().min(2).max(150), vatNumber: vat, email, date, dueDate: date, category: z.string().refine(v => categories.includes(v)), items: z.array(lineSchema).min(1).max(100), notes: z.string().max(2000).default(''), fileId: z.string().uuid().nullable().default(null) }).refine(v => v.dueDate >= v.date, { path: ['dueDate'], message: 'Η λήξη πρέπει να είναι μετά την έκδοση.' });
export const workspaceSchema = z.object({ name: z.string().trim().min(2).max(150), vatNumber: vat, email, address: z.string().max(300) });
export const contactSchema = workspaceSchema.extend({ id: z.string().uuid(), vatNumber: z.string().refine(validVat, 'Το ΑΦΜ δεν είναι έγκυρο.') });
