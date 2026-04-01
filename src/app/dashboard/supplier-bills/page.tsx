
'use client';

import * as React from 'react';
import { SupplierBillsClient } from './components/supplier-bills-client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Bill } from '@/lib/types';
import { useData } from '@/context/data-context';

export default function SupplierBillsPage() {
    const { toast } = useToast();
    const [supplierBills, setSupplierBills] = React.useState<Bill[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const q = query(collection(db, 'bills'), where('category', '==', 'Proveedor'));
        
        const unsub = onSnapshot(q, (snapshot) => {
            setSupplierBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching supplier bills: ", error);
            toast({ title: 'Error', description: 'No se pudieron cargar las facturas de proveedores.', variant: 'destructive'});
            setIsLoading(false);
        });

        return () => unsub();
    }, [toast]);

    if (isLoading) {
        return (
             <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <SupplierBillsClient 
            bills={supplierBills}
        />
    );
}
