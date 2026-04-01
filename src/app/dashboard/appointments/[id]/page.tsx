
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, collection, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Patient, Appointment, ClinicalNote, Medication } from '@/lib/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClinicalSessionClient } from './components/clinical-session-client';
import { Button } from '@/components/ui/button';

export default function AppointmentSessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();

  const [appointment, setAppointment] = React.useState<Appointment | null>(null);
  const [patient, setPatient] = React.useState<Patient | null>(null);
  const [clinicalNote, setClinicalNote] = React.useState<ClinicalNote | null>(null);
  const [allMedications, setAllMedications] = React.useState<Medication[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorState, setErrorState] = React.useState(false);

  React.useEffect(() => {
    if (!id) {
        setErrorState(true);
        setIsLoading(false);
        return;
    }

    const unsubAppointment = onSnapshot(doc(db, 'appointments', id), async (appointmentSnap) => {
      if (!appointmentSnap.exists()) {
        toast({ title: 'Error', description: 'Cita no encontrada.', variant: 'destructive' });
        setErrorState(true);
        setIsLoading(false);
        return;
      }
      setAppointment({ id: appointmentSnap.id, ...appointmentSnap.data() } as Appointment);
    }, (error) => {
      console.error("Error fetching appointment:", error);
      toast({ title: 'Error', description: 'No se pudo cargar la cita.', variant: 'destructive' });
      setErrorState(true);
      setIsLoading(false);
    });
    
    const unsubMedications = onSnapshot(collection(db, 'medications'), (snapshot) => {
        setAllMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)));
    });


    return () => {
      unsubAppointment();
      unsubMedications();
    }
  }, [id, router, toast]);


  React.useEffect(() => {
    const fetchPatientAndNote = async () => {
        if (!appointment || !appointment.patientId) {
            if (appointment) { // If appointment is loaded but has no patientId
                 toast({ title: 'Error', description: 'Esta cita no tiene un paciente asociado y no se pudo corregir.', variant: 'destructive' });
                 setErrorState(true);
                 setIsLoading(false);
            }
            return;
        }

        try {
            // Step 2: Fetch Patient
            const patientRef = doc(db, 'patients', appointment.patientId);
            const patientSnap = await getDoc(patientRef);
            if (!patientSnap.exists()) {
              toast({ title: 'Error', description: 'Paciente asociado no encontrado.', variant: 'destructive' });
              setErrorState(true);
              return;
            }
            const patientData = { id: patientSnap.id, ...patientSnap.data() } as Patient;
            setPatient(patientData);

            // Step 3: Fetch or Create Clinical Note
            let noteToSet: ClinicalNote | null = null;
            if (appointment.clinicalNoteId) {
                const noteRef = doc(db, 'clinicalNotes', appointment.clinicalNoteId);
                const noteSnap = await getDoc(noteRef);
                if (noteSnap.exists()) {
                    noteToSet = { id: noteSnap.id, ...noteSnap.data() } as ClinicalNote;
                }
            }
            
            if (!noteToSet) {
               const noteRef = doc(collection(db, 'clinicalNotes'));
               const newNote: ClinicalNote = {
                  id: noteRef.id,
                  patientId: patientData.id,
                  appointmentId: appointment.id,
                  createdAt: serverTimestamp(),
                  notes: '',
                  prescriptions: [],
               };
               await setDoc(noteRef, newNote);
               await updateDoc(doc(db, 'appointments', appointment.id), { clinicalNoteId: noteRef.id });
               noteToSet = newNote;
            }
            setClinicalNote(noteToSet);

        } catch (error) {
            console.error("Error fetching related session data:", error);
            toast({ title: 'Error', description: 'No se pudo cargar la sesión completa.', variant: 'destructive' });
            setErrorState(true);
        } finally {
            if (patient && clinicalNote) {
              setIsLoading(false);
            }
        }
    };
    
    if (appointment) {
        fetchPatientAndNote();
    }
  }, [appointment, toast]);

  
  React.useEffect(() => {
    if (appointment && patient && clinicalNote) {
      setIsLoading(false);
    }
  }, [appointment, patient, clinicalNote]);


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (errorState || !appointment || !patient || !clinicalNote) {
     return (
      <div className="flex flex-col h-full w-full items-center justify-center gap-4">
        <p>No se pudieron cargar todos los datos de la sesión.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/appointments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Citas
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <ClinicalSessionClient patient={patient} appointment={appointment} clinicalNote={clinicalNote} allMedications={allMedications} />
    </div>
  );
}
