import {requireUser} from '@/lib/auth';
import Invoicely from '@/components/invoicely';
export const dynamic='force-dynamic';
export default async function Page(){await requireUser();return <Invoicely/>;}
