
'use client';

import * as React from 'react';
import { PatientClient } from "./components/patient-client";
import { Loader2 } from 'lucide-react';
import { type Patient } from '@/lib/types';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function PatientsPage() {
    const { toast } = useToast();
    const [patients, setPatients] = React.useState<Patient[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const unsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
            setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching patients: ", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los pacientes.', variant: 'destructive'});
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

    return <PatientClient patients={patients} />;
}
