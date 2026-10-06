export type Mode = 'demo' | 'live';
export type InvoiceStatus = 'draft' | 'issued' | 'paid';
export type InvoiceKind = 'income' | 'expense';
export type LineItem = { description: string; quantity: number; unitCents: number; vatRate: number };
export type Invoice = {
  id: string; reference: string; kind: InvoiceKind; counterparty: string; vatNumber: string;
  email: string; date: string; dueDate: string; category: string; items: LineItem[];
  netCents: number; vatCents: number; totalCents: number; status: InvoiceStatus;
  notes: string; fileId: string | null; createdAt: string; updatedAt: string;
};
export type Contact = { id: string; name: string; vatNumber: string; email: string; address: string };
export type Workspace = { name: string; vatNumber: string; address: string; email: string; mode: Mode };
export type Upload = { id: string; filename: string; mime: string; size: number; createdAt: string;  };
export type Snapshot = {
  workspace: Workspace; invoices: Invoice[]; contacts: Contact[]; uploads: Upload[];
  activity: { id: string; action: string; entityId: string; createdAt: string }[];
  integrations: { mydata: 'draft_only' }; user: { name: string; email: string };
};
export const categories = ['Υπηρεσίες', 'Πωλήσεις', 'Λογισμικό', 'Εξοπλισμός', 'Μετακινήσεις', 'Ενοίκιο', 'Τηλεπικοινωνίες', 'Λοιπά'];
export const money = (cents: number) => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export const shortMoney = (cents: number) => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100);
export const dayLabel = (date: string) => new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date + 'T12:00:00Z'));
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function validVat(value: string): boolean {
  if (!/^\d{9}$/.test(value) || /^0+$/.test(value)) return false;
  const sum = [...value.slice(0, 8)].reduce((s, digit, i) => s + Number(digit) * 2 ** (8 - i), 0);
  return (sum % 11) % 10 === Number(value[8]);
}
export function totals(items: LineItem[]) {
  let netCents = 0, vatCents = 0;
  for (const line of items) {
    const net = Math.round(line.quantity * line.unitCents);
    netCents += net; vatCents += Math.round(net * line.vatRate / 100);
  }
  return { netCents, vatCents, totalCents: netCents + vatCents };
}
export function statusLabel(invoice: Invoice): string {
  if (invoice.status === 'paid') return 'Εξοφλημένο';
  if (invoice.status === 'draft') return 'Προσχέδιο';
  return invoice.dueDate < today() ? 'Ληξιπρόθεσμο' : 'Σε αναμονή';
}
export function getMetrics(invoices: Invoice[]) {
  const booked = invoices.filter(i => i.status !== 'draft');
  const income = booked.filter(i => i.kind === 'income');
  const expenses = booked.filter(i => i.kind === 'expense');
  const sum = (rows: Invoice[], field: 'netCents' | 'vatCents' | 'totalCents') => rows.reduce((n, i) => n + i[field], 0);
  const revenue = sum(income, 'netCents'), costs = sum(expenses, 'netCents');
  const outstanding = income.filter(i => i.status !== 'paid');
  return { revenue, costs, profit: revenue - costs, outstanding: sum(outstanding, 'totalCents'), outstandingCount: outstanding.length, overdue: sum(outstanding.filter(i => i.dueDate < today()), 'totalCents'), vat: sum(income, 'vatCents') - sum(expenses, 'vatCents'), received: sum(income.filter(i=>i.status==='paid'), 'totalCents'), spent: sum(expenses.filter(i=>i.status==='paid'), 'totalCents') };
}
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
