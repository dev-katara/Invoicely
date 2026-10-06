import { type Invoice, type Contact, totals, today } from './domain';
const parties = ['Aegean Creative', 'Northstar Studio', 'Helios Digital', 'Menta Design', 'Bluewave IKE', 'Atelier Athens'];
export function demoInvoices(workspaceId: string): Invoice[] {
  const now = new Date(today() + 'T12:00:00Z');
  const result: Invoice[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-offset, 1));
    const prefix = d.toISOString().slice(0, 7);
    for (let j = 0; j < 10; j++) {
      const expense = j >= 6;
      const current = offset === 0;
      const maxDay = current ? now.getUTCDate() : 27;
      const date = `${prefix}-${String(Math.min(maxDay, j*3+1)).padStart(2,'0')}`;
      const due = new Date(date + 'T12:00:00Z'); due.setUTCDate(due.getUTCDate() + (j===1 ? 0 : 20));
      const descriptions = expense ? ['Ετήσια συνδρομή λογισμικού', 'Εξοπλισμός γραφείου', 'Ενοίκιο επαγγελματικού χώρου', 'Υπηρεσίες τηλεπικοινωνίας'] : ['Σχεδιασμός εταιρικής ταυτότητας', 'Κατασκευή ιστοσελίδας', 'Υπηρεσίες συμβουλευτικής', 'Ψηφιακή επικοινωνία', 'Σχεδιασμός εφαρμογής', 'Μηνιαία υποστήριξη'];
      const unitCents = expense ? [89000, 64000, 85000, 42000][j-6] : [320000, 245000, 185000, 420000, 148000, 96000][j];
      const items = [{ description: descriptions[expense ? j-6 : j], quantity: 1, unitCents: Math.round(unitCents * (1-offset*.06)), vatRate: 24 }];
      result.push({ id: `${workspaceId}-sample-${offset}-${j}`, reference: `${expense?'EXP':'INV'}-${now.getUTCFullYear()}-${String((6-offset)*10+j+1).padStart(3,'0')}`, kind: expense?'expense':'income', counterparty: expense?['Cloudware', 'Office Lab', 'Athens Spaces', 'Connect Telecom'][j-6]:parties[j], vatNumber: '000000000', email: '', date, dueDate: due.toISOString().slice(0,10), category: expense?['Λογισμικό','Εξοπλισμός','Ενοίκιο','Τηλεπικοινωνίες'][j-6]:'Υπηρεσίες', items, ...totals(items), status: current && j===5 ? 'draft' : current && (j===1||j===2) ? 'issued':'paid', notes: 'Ενδεικτικό παραστατικό του δοκιμαστικού χώρου.', fileId: null, createdAt: date+'T12:00:00Z', updatedAt: date+'T12:00:00Z' });
    }
  }
  return result;
}
export function demoContacts(workspaceId: string): Contact[] {
  return parties.map((name,i)=>({id:`${workspaceId}-contact-${i}`, name, vatNumber:`DEMO-${i+1}`, email:`hello@${name.toLowerCase().replace(/ /g,'')}.example`, address: 'Αθήνα, Ελλάδα'}));
}
