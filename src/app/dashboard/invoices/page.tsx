'use client';

import * as React from 'react';
// 1. Corregido: Se cambió 'importent' por 'InvoiceClient' (el nombre real del componente)
import { InvoiceClient } from './components/invoice-client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Invoice } from '@/lib/types';

export default function InvoicesPage() {
    const { toast } = useToast();
    const [invoices, setInvoices] = React.useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const unsub = onSnapshot(collection(db, 'invoices'), (snapshot) => {
            setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching invoices: ", error);
            toast({ title: 'Error', description: 'No se pudieron cargar las facturas.', variant: 'destructive'});
            setIsLoading(false);
        });

        return () => unsub();
    }, [toast]);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        // 2. Corregido: Se agregó el nombre del componente 'InvoiceClient'
        <InvoiceClient 
            invoices={invoices}
        />
    );
}