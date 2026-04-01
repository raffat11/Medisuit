
'use client';

import * as React from 'react';
import { FinanceClient } from './components/finance-client';
import { Loader2 } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { type Invoice, type Bill } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function FinancePage() {
    const { toast } = useToast();
    
    const [bills, setBills] = React.useState<Bill[]>([]);
    const [invoices, setInvoices] = React.useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        const startDateString = start.toISOString().split('T')[0];
        const endDateString = end.toISOString().split('T')[0];

        const queries = [
            { collection: 'bills', stateSetter: setBills, whereClauses: [where('date', '>=', startDateString), where('date', '<=', endDateString)] },
            { collection: 'invoices', stateSetter: setInvoices, whereClauses: [where('date', '>=', startDateString), where('date', '<=', endDateString)] }
        ];

        let loadedQueries = 0;

        const unsubs = queries.map(q => {
            const dataQuery = query(collection(db, q.collection), ...q.whereClauses);
            return onSnapshot(dataQuery, (snapshot) => {
                q.stateSetter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
                loadedQueries++;
                if (loadedQueries === queries.length) {
                    setIsLoading(false);
                }
            }, (error) => {
                console.error(`Error fetching ${q.collection}: `, error);
                toast({ title: 'Error', description: `No se pudieron cargar los datos de ${q.collection}.`, variant: 'destructive'});
                loadedQueries++;
                if (loadedQueries === queries.length) {
                    setIsLoading(false);
                }
            });
        });

        return () => unsubs.forEach(unsub => unsub());
    }, [toast]);

    if (isLoading) {
        return (
             <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <FinanceClient invoices={invoices} bills={bills} />
    );
}
