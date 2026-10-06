# Invoicely — ανεξάρτητη εγκατάσταση

Ελληνική εφαρμογή παραστατικών, πελατών και οικονομικής επισκόπησης, **χωρίς AI, λογαριασμό OpenAI, σύνδεση ChatGPT ή Sites hosting**. Ο κώδικας αυτού του φακέλου είναι προσαρμοσμένος για hosting σε **Vercel** με βάση δεδομένων **Supabase**. Δεν χρειάζεστε άδεια ή κλειδί από τον δημιουργό για να τον εγκαταστήσετε.

## Περιεχόμενα

- Next.js App Router, React, TypeScript, Tailwind/shadcn.
- PostgreSQL (Supabase) με Drizzle, συναλλαγές και αυτόματες migrations.
- Ιδιωτικά PDF/JPG/PNG σε private bucket του Supabase Storage, έως 10 MB.
- Τοπικοί λογαριασμοί email/κωδικού, salted scrypt hashes και ανακλητές συνεδρίες 8 ωρών.
- Απομονωμένα δεδομένα ανά λογαριασμό και ξεχωριστές επιχειρήσεις demo/live.
- Παραστατικά, πελάτες, αναφορές, CSV, εκτύπωση/PDF και προσχέδια XML myDATA.

Το ZIP περιλαμβάνει μόνο πηγαίο κώδικα: κανένα πραγματικό κλειδί, λογαριασμό, παραστατικό ή ιδιωτικό αρχείο. Τα δεδομένα της παλιάς εγκατάστασης δεν μεταφέρονται αυτόματα.

## 1. Δημιουργία του Supabase project

Χρειάζεστε ένα δωρεάν ή επί πληρωμή [Supabase](https://supabase.com) project — εξυπηρετεί ταυτόχρονα ως βάση δεδομένων (PostgreSQL) και ως αποθήκη αρχείων.

1. Δημιουργήστε project στο [supabase.com/dashboard](https://supabase.com/dashboard).
2. **Database → Connection string**: επιλέξτε **Connection pooler**, mode **Transaction** (port `6543`). Αντιγράψτε το URI — αυτό είναι το `DATABASE_URL`.
3. **Project Settings → API**: αντιγράψτε το **Project URL** (`SUPABASE_URL`) και το **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`, μυστικό, ποτέ στον browser).
4. **Storage**: δημιουργήστε **private** bucket με όνομα `uploads` (χωρίς public access — η εφαρμογή διαβάζει/γράφει αρχεία μόνο μέσω του server, με το service_role key).

Το ίδιο project μπορεί να χρησιμεύσει για τοπική ανάπτυξη, για τα αυτοματοποιημένα tests και για production — δεν χρειάζεται Docker ή τοπική βάση.

## 2. Γρήγορη τοπική δοκιμή

Χρειάζεστε **Node.js 24 LTS** με npm και δίκτυο προς το Supabase project σας.

```sh
npm ci
```

Αντιγράψτε `.env.example` σε `.env` και συμπληρώστε `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` από το βήμα 1. Για τοπική χρήση αφήστε `APP_URL=http://localhost:3000`.

```sh
npm run db:migrate
npm run user:create -- --email admin@example.com --name "Διαχειριστής"
npm run dev
```

Ορίστε δικό σας κωδικό τουλάχιστον 12 χαρακτήρων όταν ζητηθεί. Η πληκτρολόγηση είναι κρυφή. Ανοίξτε **http://localhost:3000** και συνδεθείτε με αυτά τα στοιχεία. Χρησιμοποιήστε ακριβώς το hostname που ορίζει το `APP_URL`.

## 3. Deploy στο Vercel

1. Ανεβάστε τον κώδικα σε ένα Git repository (GitHub/GitLab/Bitbucket) ή χρησιμοποιήστε `vercel` CLI απευθείας από τον φάκελο.
2. Στο [vercel.com](https://vercel.com), **Add New → Project** και επιλέξτε το repository (Next.js αναγνωρίζεται αυτόματα, δεν χρειάζεται ρύθμιση build).
3. Στο **Environment Variables** του project ορίστε:
   - `DATABASE_URL` — το pooled connection string (Transaction mode, port 6543) από το Supabase.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — από το Supabase.
   - `APP_URL` — το πραγματικό production origin, π.χ. `https://invoices.example.com` ή το προεπιλεγμένο `https://το-project.vercel.app`.
4. **Deploy**. Μετά το πρώτο deploy, εφαρμόστε τα migrations και δημιουργήστε τον πρώτο χρήστη **από τον υπολογιστή σας**, δείχνοντας στο ίδιο `DATABASE_URL`:

```sh
npm run db:migrate
npm run user:create -- --email admin@example.com --name "Διαχειριστής"
```

5. Ανοίξτε το `APP_URL` σας. Για δικό σας domain, προσθέστε το στο Vercel (**Project → Settings → Domains**) και ενημερώστε το `APP_URL` env var ανάλογα — το Next.js/Vercel αναλαμβάνουν αυτόματα το TLS πιστοποιητικό.

Δεν υπάρχει προεπιλεγμένος κωδικός, δημόσια εγγραφή ή εξάρτηση από τρίτη υπηρεσία ταυτοποίησης. Κάθε νέος χρήστης δημιουργείται από τον διαχειριστή, με το `DATABASE_URL` να δείχνει στο production Supabase project:

```sh
npm run user:create -- --email second@example.com --name "Δεύτερος χρήστης"
```

Οι λογαριασμοί έχουν **ανεξάρτητες** επιχειρήσεις. Δεν υλοποιούνται κοινές ομάδες, ρόλοι ή προσκλήσεις. Επαναφορά κωδικού με την ίδια διεύθυνση email και `--reset` διατηρεί τα δεδομένα και ακυρώνει τις ενεργές συνεδρίες:

```sh
npm run user:create -- --email admin@example.com --name "Διαχειριστής" --reset
```

## Δεδομένα, αντίγραφα ασφαλείας και ενημερώσεις

Τα δεδομένα ζουν στο Supabase project σας: οι πίνακες στη βάση PostgreSQL, τα αρχεία στο private bucket `uploads`. Το Supabase παρέχει αυτόματα καθημερινά αντίγραφα ασφαλείας στα πληρωμένα πλάνα· στο δωρεάν πλάνο κάντε periodικά `pg_dump` του `DATABASE_URL` (χωρίς το pooler suffix, χρησιμοποιήστε τη direct connection, port 5432) και κατεβάστε τα αρχεία του bucket.

Για ενημέρωση κώδικα, κάντε `git pull`/deploy στο Vercel και μετά `npm run db:migrate` από τον υπολογιστή σας (ή από ένα one-off Vercel deployment) πριν ανοίξει κίνηση η νέα έκδοση. Οι migrations εφαρμόζονται αυτόματα με συναλλαγή, μία φορά ανά αρχείο — οι υπάρχουσες δεν τροποποιούνται μετά τη χρήση τους· νέες αλλαγές προστίθενται σε επόμενο αριθμημένο `.sql` στο `drizzle/`.

## Έλεγχοι

```sh
npm test
npm run typecheck
npm run build
npm run test:smoke
```

Χρειάζονται `DATABASE_URL`, `SUPABASE_URL` και `SUPABASE_SERVICE_ROLE_KEY` στο `.env` (το ίδιο Supabase project της τοπικής ανάπτυξης). Τα `npm test` και `npm run test:smoke` δημιουργούν ένα προσωρινό, τυχαίο Postgres schema (`CREATE SCHEMA`), τρέχουν τα migrations εκεί, και το διαγράφουν (`DROP SCHEMA ... CASCADE`) στο τέλος — δεν αγγίζουν τα πραγματικά σας δεδομένα. Το smoke test ανεβάζει πραγματικά ένα συνθετικό PDF στο bucket `uploads` και το διαγράφει μετά.

Τα smoke tests εκκινούν προσωρινό production server σε ελεύθερη localhost θύρα, με συνθετικούς χρήστες. Ελέγχουν σύνδεση, αποκλεισμό ανώνυμων/πλαστών identity headers, origin checks, απομόνωση χρηστών, ποσά, ιδιωτικά αρχεία και αποσύνδεση.

## Πεδίο λειτουργίας

Το myDATA παραμένει **μόνο προσχέδιο XML**, χωρίς αποστολή στην ΑΑΔΕ ή MARK. Τα PDF είναι προσχέδια/εσωτερικές καταχωρίσεις. Δεν περιλαμβάνονται συνδρομές πληρωμών, email επαναφοράς κωδικού, πιστωτικά/ακυρωτικά ή πλήρης νόμιμη μηχανογράφηση αρίθμησης. Η μεταφορά hosting δεν προσθέτει φορολογική πιστοποίηση ή αυτές τις λειτουργίες.

## Τεκμηρίωση τεχνολογίας

- [Next.js on Vercel](https://nextjs.org/docs/app/getting-started/deploying)
- [Supabase connection pooling (pgbouncer / Transaction mode)](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Drizzle PostgreSQL (postgres-js)](https://orm.drizzle.team/docs/get-started-postgresql#postgresjs)
