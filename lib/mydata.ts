import { validVat, totals, type Invoice, type Workspace } from './domain';
const xmlEscape = (value:string) => value.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
const amount = (cents:number) => (cents/100).toFixed(2);
export function mydataDraft(invoice:Invoice,workspace:Workspace) {
  const issues:string[]=[];
  if(workspace.mode==='demo') issues.push('Δοκιμαστικά δεδομένα: δεν επιτρέπεται διαβίβαση.');
  if(!validVat(workspace.vatNumber)) issues.push('Λείπει έγκυρο ΑΦΜ εκδότη.');
  if(!validVat(invoice.vatNumber)) issues.push('Λείπει έγκυρο ΑΦΜ αντισυμβαλλόμενου.');
  if(invoice.kind!=='income'||invoice.category!=='Υπηρεσίες') issues.push('Η παρούσα αντιστοίχιση υποστηρίζει μόνο εγχώρια τιμολόγια υπηρεσιών (2.1).');
  if(invoice.status==='draft') issues.push('Το παραστατικό δεν έχει οριστικοποιηθεί.');
  const parts=/^(.+?)[- /](\d+)$/.exec(invoice.reference);
  if(!parts) issues.push('Η αναφορά πρέπει να περιέχει σειρά και αριθμό, π.χ. A-001.');
  const sum=totals(invoice.items);
  const classification=(cents:number)=>`<incomeClassification><icls:classificationType>E3_561_001</icls:classificationType><icls:classificationCategory>category1_3</icls:classificationCategory><icls:amount>${amount(cents)}</icls:amount></incomeClassification>`;
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<!-- DRAFT ONLY: requires accountant review, current XSD validation and AADE sandbox verification. -->\n<InvoicesDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0" xmlns:icls="https://www.aade.gr/myDATA/incomeClassificaton/v1.0"><invoice><issuer><vatNumber>${xmlEscape(workspace.vatNumber)}</vatNumber><country>GR</country><branch>0</branch></issuer><counterpart><vatNumber>${xmlEscape(invoice.vatNumber)}</vatNumber><country>GR</country><branch>0</branch></counterpart><invoiceHeader><series>${xmlEscape(parts?.[1]??invoice.reference)}</series><aa>${parts?Number(parts[2]):0}</aa><issueDate>${invoice.date}</issueDate><invoiceType>2.1</invoiceType><currency>EUR</currency></invoiceHeader><paymentMethods><paymentMethodDetails><type>5</type><amount>${amount(sum.totalCents)}</amount></paymentMethodDetails></paymentMethods>${invoice.items.map((line,i)=>{const t=totals([line]);return `<invoiceDetails><lineNumber>${i+1}</lineNumber><netValue>${amount(t.netCents)}</netValue><vatCategory>${({24:1,13:2,6:3} as Record<number,number>)[line.vatRate]}</vatCategory><vatAmount>${amount(t.vatCents)}</vatAmount>${classification(t.netCents)}</invoiceDetails>`;}).join('')}<invoiceSummary><totalNetValue>${amount(sum.netCents)}</totalNetValue><totalVatAmount>${amount(sum.vatCents)}</totalVatAmount><totalWithheldAmount>0.00</totalWithheldAmount><totalFeesAmount>0.00</totalFeesAmount><totalStampDutyAmount>0.00</totalStampDutyAmount><totalOtherTaxesAmount>0.00</totalOtherTaxesAmount><totalDeductionsAmount>0.00</totalDeductionsAmount><totalGrossValue>${amount(sum.totalCents)}</totalGrossValue>${classification(sum.netCents)}</invoiceSummary></invoice></InvoicesDoc>`;
  return {xml,issues,status:'draft_only',transmitted:false,mark:null,referenceVersion:'2.0.2',reviewRequired:['Επιβεβαίωση χαρακτηρισμού E3_561_001/category1_3','Επιβεβαίωση τρόπου πληρωμής (προεπιλογή: επί πιστώσει)','Έλεγχος XSD και δοκιμή στο περιβάλλον ΑΑΔΕ']};
}
