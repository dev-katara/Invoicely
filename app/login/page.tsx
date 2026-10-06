import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getUser()) redirect('/');
  const error = (await searchParams).error;
  return <main className="login-shell"><section className="login-card"><a href="/" className="brand">Invoicely<span className="brand-dot">.</span></a><h1>Καλώς ήρθες πίσω.</h1><p>Συνδέσου στον χώρο της επιχείρησής σου.</p>{error && <div role="alert" className="login-error">Το email ή ο κωδικός δεν είναι σωστά.</div>}<form action="/api/auth/login" method="post"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" maxLength={254} required autoFocus/><label htmlFor="password">Κωδικός πρόσβασης</label><input id="password" name="password" type="password" autoComplete="current-password" maxLength={1024} required/><button type="submit">Σύνδεση</button></form><small>Για δημιουργία λογαριασμού ή επαναφορά κωδικού, επικοινώνησε με τον διαχειριστή της εγκατάστασης.</small></section></main>;
}
