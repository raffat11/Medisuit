'use client';

import * as React from 'react';
import type { Patient, Appointment, Medication, ClinicalNote, Invoice } from '@/lib/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Save, PlusCircle, Trash2, CheckCircle, CalendarDays, History, Clock } from 'lucide-react';
import { useDialog } from '@/context/dialog-context';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, setDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const calculateAge = (dob: string) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

const clinicalNoteSchema = z.object({
  patientDetails: z.object({
    dateOfBirth: z.string().optional(),
    weight: z.coerce.number().optional(),
    height: z.coerce.number().optional(),
  }),
  appointmentDetails: z.object({
    appointmentType: z.enum(['Primera Cita', 'Terapia', 'Consulta', 'Control', 'Otro']),
  }),
  notes: z.string().optional(),
  prescriptions: z.array(z.object({
    medicationId: z.string(),
    name: z.string(),
    dosage: z.string().min(1, 'La dósis es requerida.'),
  })).optional(),
});

type ClinicalNoteFormValues = z.infer<typeof clinicalNoteSchema>;

type ClinicalSessionClientProps = {
  patient: Patient;
  appointment: Appointment;
  clinicalNote: ClinicalNote;
  allMedications: Medication[];
};

export function ClinicalSessionClient({ patient, appointment, clinicalNote, allMedications }: ClinicalSessionClientProps) {
  const { openMedicationSelector, selectedMedicationForPrescription, clearPrescriptionSelections } = useDialog();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);
  const [historicalDosages, setHistoricalDosages] = React.useState<Record<string, string[]>>({});
  
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [pastNotes, setPastNotes] = React.useState<ClinicalNote[]>([]);
  const [patientInvoices, setPatientInvoices] = React.useState<Invoice[]>([]);

  const form = useForm<ClinicalNoteFormValues>({
    resolver: zodResolver(clinicalNoteSchema),
    defaultValues: {
      patientDetails: {
        dateOfBirth: (patient as any).dateOfBirth || '',
        weight: patient.weight || undefined,
        height: patient.height || undefined,
      },
      appointmentDetails: {
        appointmentType: appointment.appointmentType || 'Consulta',
      },
      notes: clinicalNote.notes || '',
      prescriptions: clinicalNote.prescriptions || [],
    },
  });

  const watchedDOB = form.watch("patientDetails.dateOfBirth");
  const currentAge = React.useMemo(() => calculateAge(watchedDOB || ""), [watchedDOB]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "prescriptions",
  });

  // --- 🛰️ RADAR DE ADHERENCIA EN TIEMPO REAL ---
  const checkAdherence = (medicationName: string, noteTimestamp: any) => {
    if (!noteTimestamp || !medicationName) return false;
    const noteDate = noteTimestamp.toDate();
    noteDate.setHours(0, 0, 0, 0);

    return patientInvoices.some(inv => {
      if (inv.status === 'Pending') return false;
      const invDate = new Date(inv.date + 'T00:00:00');
      invDate.setHours(0, 0, 0, 0);
      if (invDate < noteDate) return false;
      return inv.items?.some((item: any) => 
        item.description?.trim().toLowerCase() === medicationName.trim().toLowerCase()
      );
    });
  };

  // Cargar Facturas e Historial
  React.useEffect(() => {
    // Escuchar facturas del paciente
    const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('patientId', '==', patient.id)), (snapshot) => {
        const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
        setPatientInvoices(invoices);
    });

    const fetchHistory = async () => {
        try {
            const q = query(collection(db, 'clinicalNotes'), where('patientId', '==', patient.id));
            const snap = await getDocs(q);
            const notes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClinicalNote));
            setPastNotes(notes.sort((a, b) => (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0)));
        } catch (e) { console.error(e); }
    };

    fetchHistory();
    return () => unsubInvoices();
  }, [patient.id]);

  // Manejo de medicinas seleccionadas
  React.useEffect(() => {
    if (selectedMedicationForPrescription) {
      const currentFields = form.getValues().prescriptions || [];
      if (currentFields.some(field => field.medicationId === selectedMedicationForPrescription.id)) {
          toast({ title: 'Medicamento ya añadido', variant: 'destructive'});
          clearPrescriptionSelections();
          return;
      }
      append({ medicationId: selectedMedicationForPrescription.id, name: selectedMedicationForPrescription.name, dosage: '' });
      clearPrescriptionSelections();
    }
  }, [selectedMedicationForPrescription, append, toast, clearPrescriptionSelections, form]);

  // Memoria de dosis
  React.useEffect(() => {
    const fetchHistoricalDosages = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'clinicalNotes'));
        const dosagesCache: Record<string, Set<string>> = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.prescriptions && Array.isArray(data.prescriptions)) {
            data.prescriptions.forEach((rx: any) => {
              if (rx.medicationId && rx.dosage) {
                if (!dosagesCache[rx.medicationId]) dosagesCache[rx.medicationId] = new Set();
                dosagesCache[rx.medicationId].add(rx.dosage.trim());
              }
            });
          }
        });
        const finalDosages: Record<string, string[]> = {};
        for (const key in dosagesCache) finalDosages[key] = Array.from(dosagesCache[key]);
        setHistoricalDosages(finalDosages);
      } catch (e) { console.error(e); }
    };
    fetchHistoricalDosages();
    return () => clearPrescriptionSelections();
  }, [clearPrescriptionSelections]);

  const saveClinicalData = async (data: ClinicalNoteFormValues) => {
    await updateDoc(doc(db, 'patients', patient.id), {
      dateOfBirth: data.patientDetails.dateOfBirth,
      weight: data.patientDetails.weight,
      height: data.patientDetails.height,
    });
    await updateDoc(doc(db, 'appointments', appointment.id), {
      appointmentType: data.appointmentDetails.appointmentType,
    });
    await setDoc(doc(db, 'clinicalNotes', clinicalNote.id), {
      ...clinicalNote,
      notes: data.notes,
      prescriptions: data.prescriptions,
      patientId: patient.id,
    }, { merge: true });
  };

  const onSubmit = async (data: ClinicalNoteFormValues) => {
    setIsSaving(true);
    try {
      await saveClinicalData(data);
      toast({ title: 'Datos Guardados' });
    } catch (e) { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setIsSaving(false); }
  };

  const handleSaveAndComplete = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    setIsSaving(true);
    try {
      const data = form.getValues();
      await saveClinicalData(data);
      await updateDoc(doc(db, 'appointments', appointment.id), { status: 'Completada' });
      toast({ title: 'Cita Completada' });
      router.push('/dashboard/appointments');
    } catch (error) { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setIsSaving(false); }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Sesión Clínica</h1>
            <div className="flex gap-2">
                <Button 
                    type="button" 
                    variant="secondary" 
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" 
                    onClick={() => setIsHistoryOpen(true)}
                >
                    <History className="mr-2 h-4 w-4" /> Ver Historia Clínica
                </Button>

                <Button type="submit" variant="outline" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar
                </Button>
                
                <Button type="button" onClick={handleSaveAndComplete} disabled={isSaving} className="bg-slate-800 text-white hover:bg-slate-900">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Finalizar Cita
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {patient.name}</CardTitle>
                <CardDescription>Datos básicos del paciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientDetails.dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex justify-between">
                        <span>Fecha de Nacimiento</span>
                        {currentAge !== null && (
                          <span className="text-blue-600 font-bold bg-blue-50 px-2 rounded-full text-xs flex items-center">
                            <CalendarDays className="h-3 w-3 mr-1" /> {currentAge} años
                          </span>
                        )}
                      </FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="patientDetails.weight" render={({ field }) => (
                        <FormItem><FormLabel>Peso (kg)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )}/>
                    <FormField control={form.control} name="patientDetails.height" render={({ field }) => (
                        <FormItem><FormLabel>Altura (cm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )}/>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
             <Card>
                <CardHeader><CardTitle>Evolución / Notas Clínicas</CardTitle></CardHeader>
                <CardContent>
                     <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem><FormControl><Textarea placeholder="Escribe el diagnóstico y notas aquí..." className="min-h-[200px]" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                     )}/>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Receta Médica</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <ScrollArea className="h-40 w-full rounded-md border bg-slate-50">
                        <div className="space-y-2 p-2">
                            {fields.map((item, index) => {
                                const savedDosages = historicalDosages[item.medicationId] || [];
                                return (
                                <div key={item.id} className="flex items-start gap-2 p-2 border rounded-md bg-white shadow-sm">
                                    <div className="flex-1 space-y-2">
                                        <p className="font-semibold">{item.name}</p>
                                        <FormField
                                            control={form.control}
                                            name={`prescriptions.${index}.dosage`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input placeholder="Dosis..." {...field} list={`dosages-${item.medicationId}`} />
                                                            {savedDosages.length > 0 && (
                                                              <datalist id={`dosages-${item.medicationId}`}>
                                                                {savedDosages.map((d, idx) => <option key={idx} value={d} />)}
                                                              </datalist>
                                                            )}
                                                        </div>
                                                    </FormControl>
                                                    {savedDosages.length > 0 && <p className="text-[10px] text-blue-500">💡 Memoria disponible</p>}
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                    <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openMedicationSelector(fields.map(f => f.medicationId))}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Medicamento
                    </Button>
                </CardContent>
             </Card>
          </div>
        </div>

        {/* DIALOG DE HISTORIAL CLÍNICO FLOTANTE CON INDICADORES */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl">Historia Clínica: {patient.name}</DialogTitle>
                </DialogHeader>
                <Separator />
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                        {pastNotes.length > 0 ? pastNotes.map((note) => (
                            <div key={note.id} className="p-5 border rounded-xl bg-slate-50/50 shadow-sm relative border-slate-200">
                                <div className="flex items-center gap-2 mb-3 text-blue-700">
                                    <CalendarDays className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {note.createdAt ? format(note.createdAt.toDate(), 'PPP, h:mm a') : 'Fecha no disponible'}
                                    </span>
                                </div>
                                <div className="space-y-4 text-sm text-slate-700">
                                    {note.notes && (
                                        <div className="bg-white p-3 rounded border border-slate-100 italic">
                                            {note.notes}
                                        </div>
                                    )}
                                    {note.prescriptions && note.prescriptions.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Prescripciones y Entrega:</p>
                                            <div className="grid gap-2">
                                                {note.prescriptions.map((rx: any, i: number) => {
                                                    const isDispensed = checkAdherence(rx.name, note.createdAt);
                                                    return (
                                                        <div key={i} className="flex justify-between items-center bg-white p-2 px-3 rounded border border-slate-100 shadow-sm">
                                                            <div>
                                                                <span className="font-medium text-slate-800 block">{rx.name}</span>
                                                                <span className="text-slate-500 text-[11px] italic">{rx.dosage}</span>
                                                            </div>
                                                            {isDispensed ? (
                                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] h-6">
                                                                    <CheckCircle className="h-3 w-3 mr-1" /> Entregado
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] h-6">
                                                                    <Clock className="h-3 w-3 mr-1" /> No facturado
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 text-slate-400">
                                <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No se encontraron registros anteriores.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t bg-slate-50 flex justify-end">
                    <Button onClick={() => setIsHistoryOpen(false)}>Cerrar Historial</Button>
                </div>
            </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
}