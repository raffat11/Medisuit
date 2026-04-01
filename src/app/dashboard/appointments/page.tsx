
'use client';

import * as React from 'react';
import { AppointmentClient } from './components/appointment-client';
import { type Appointment, type Patient, type Invoice } from '@/lib/types'; // <--- OJO: Asegúrate de importar Invoice
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AppointmentsPage() {
    const { toast } = useToast();
    const [appointments, setAppointments] = React.useState<Appointment[]>([]);
    const [patients, setPatients] = React.useState<Patient[]>([]);
    const [invoices, setInvoices] = React.useState<Invoice[]>([]); // <--- NUEVO ESTADO PARA FACTURAS
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        // 1. Cargar Citas
        const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
            setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
        }, (error) => {
            console.error("Error fetching appointments: ", error);
            toast({ title: 'Error', description: 'No se pudieron cargar las citas.', variant: 'destructive'});
        });

        // 2. Cargar Pacientes
        const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
            setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
        }, (error) => {
            console.error("Error fetching patients: ", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los pacientes.', variant: 'destructive'});
        });

        // 3. Cargar Facturas (NUEVO)
        // Esto es necesario para saber qué citas ya fueron pagadas
        const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
            setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
        }, (error) => {
            console.error("Error fetching invoices: ", error);
            // No mostramos error al usuario si fallan las facturas para no bloquear la agenda, pero lo registramos
        });
        
        // Simulación simple de carga (esperamos un poco a que Firebase responda)
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        return () => {
            unsubAppointments();
            unsubPatients();
            unsubInvoices(); // <--- Limpiamos el listener de facturas
            clearTimeout(timer);
        };
    }, [toast]);

    if (isLoading) {
        return (
             <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    // Pasamos las facturas (invoices) al componente cliente
    // NOTA: Si te sale error aquí abajo, es normal, lo arreglaremos en el Paso 2
    return <AppointmentClient 
        appointments={appointments} 
        patients={patients} 
        invoices={invoices} // <--- PASAMOS LAS FACTURAS AQUÍ
    />;
}