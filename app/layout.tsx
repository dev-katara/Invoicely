import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Invoicely — Η επιχείρησή σου, πιο απλά',description:'Ο έξυπνος οικονομικός χώρος για μικρές επιχειρήσεις. Παραστατικά, έξοδα και καθαρές αποφάσεις.',icons:{icon:'/favicon.svg'}};
export const viewport:Viewport={themeColor:'#003375'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="el" suppressHydrationWarning><body>{children}</body></html>}
