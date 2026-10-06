import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Invoicely — Η επιχείρησή σου, πιο απλά',description:'Ο έξυπνος οικονομικός χώρος για μικρές επιχειρήσεις. Παραστατικά, έξοδα και καθαρές αποφάσεις.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="el" suppressHydrationWarning><body>{children}</body></html>}
