'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, collection, query, where, onSnapshot, updateDoc, addDoc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Patient, Appointment, Invoice, ClinicalNote } from '@/lib/types';
import { Loader2, ArrowLeft, User, Mail, Phone, Calendar, FileText, MoreVertical, Edit, CheckCircle, Star, Notebook, Trash2, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { useDialog } from '@/context/dialog-context';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { openAppointmentDialog, openPatientDialog, openInvoiceViewDialog } = useDialog();
  const { toast } = useToast();

  const [patient, setPatient] = React.useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = React.useState<Appointment[]>([]);
  const [patientInvoices, setPatientInvoices] = React.useState<Invoice[]>([]);
  const [clinicalNotes, setClinicalNotes] = React.useState<ClinicalNote[]>([]);
  const [newNote, setNewNote] = React.useState('');
  const [isSavingNote, setIsSavingNote] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    const unsubPatient = onSnapshot(doc(db, 'patients', id), (docSnap) => {
        if (docSnap.exists()) {
            setPatient({ id: docSnap.id, ...docSnap.data() } as Patient);
        } else {
            toast({ title: 'Error', description: 'Paciente no encontrado.', variant: 'destructive'});
            router.push('/dashboard/patients');
        }
    }, (error) => {
        console.error("Error fetching patient details:", error);
        toast({ title: 'Error', description: 'No se pudo cargar la información del paciente.', variant: 'destructive'});
    });
    
    let isInitialLoad = true;
    const unsubAppointments = onSnapshot(query(collection(db, 'appointments'), where('patientId', '==', id)), (snapshot) => {
        const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        setPatientAppointments(appointments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('patientId', '==', id)), (snapshot) => {
        const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
        setPatientInvoices(invoices.sort((a,b) => (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '')));
    });

    const unsubNotes = onSnapshot(query(collection(db, 'clinicalNotes'), where('patientId', '==', id)), (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClinicalNote));
        notes.sort((a, b) => {
            const dateA = a.createdAt?.toDate()?.getTime() || 0;
            const dateB = b.createdAt?.toDate()?.getTime() || 0;
            return dateB - dateA;
        });
        setClinicalNotes(notes);
        if (isInitialLoad) {
            setIsLoading(false);
            isInitialLoad = false;
        }
    }, (error) => {
        console.error("Error fetching clinical notes:", error);
        toast({ title: 'Error', description: 'No se pudieron cargar las notas clínicas.', variant: 'destructive'});
        if (isInitialLoad) {
            setIsLoading(false);
            isInitialLoad = false;
        }
    });
    
    return () => {
        unsubPatient();
        unsubAppointments();
        unsubInvoices();
        unsubNotes();
    }
  }, [id, router, toast]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
        const invoiceDoc = doc(db, "invoices", invoiceId);
        await updateDoc(invoiceDoc, { status: 'Paid' });
        toast({
          title: 'Factura Actualizada',
          description: `La factura ha sido marcada como pagada.`,
        });
    } catch (error) {
        console.error("Error marking as paid: ", error);
        toast({ title: 'Error', description: 'No se pudo actualizar la factura.', variant: 'destructive' });
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim() || !patient) {
        toast({ title: 'Nota Vacía', description: 'No puedes guardar una nota vacía.', variant: 'destructive' });
        return;
    }
    setIsSavingNote(true);
    try {
        // Create a reference to a new document in 'clinicalNotes'
        const newNoteRef = doc(collection(db, 'clinicalNotes'));

        await addDoc(collection(db, 'clinicalNotes'), {
            id: newNoteRef.id,
            patientId: patient.id,
            notes: newNote,
            createdAt: serverTimestamp(),
            // appointmentId is omitted for general notes
        });

        setNewNote('');
        toast({ title: 'Nota Guardada', description: 'La nota clínica se ha guardado exitosamente.' });
    } catch (error) {
        console.error("Error saving clinical note:", error);
        toast({ title: 'Error', description: 'No se pudo guardar la nota clínica.', variant: 'destructive' });
    } finally {
        setIsSavingNote(false);
    }
  };
  
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'clinicalNotes', noteId));
      toast({
        title: 'Nota Eliminada',
        description: 'La nota clínica ha sido eliminada.',
        variant: 'destructive',
      });
    } catch (error) {
       console.error("Error deleting clinical note:", error);
       toast({ title: 'Error', description: 'No se pudo eliminar la nota clínica.', variant: 'destructive' });
    }
  };


  if (isLoading || !patient) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Atrás</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          {patient.name}
        </h1>
        {patient.isBlacklisted && <Badge variant="destructive">En Lista Negra</Badge>}
        <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => openPatientDialog(patient)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Paciente
            </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Avatar className="h-24 w-24 text-3xl">
                  <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <Separator />
               <div className="space-y-2 text-sm">
                 <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.name}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${patient.email}`} className="text-primary hover:underline">
                        {patient.email}
                    </a>
                 </div>
                 <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                     <a href={`tel:${patient.phone}`} className="text-primary hover:underline">
                        {patient.phone}
                    </a>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Tabs defaultValue="appointments">
            <TabsList className="mb-4">
                <TabsTrigger value="appointments">
                    <Calendar className="mr-2 h-4 w-4"/>
                    Citas ({patientAppointments.length})
                </TabsTrigger>
                 <TabsTrigger value="clinical-history">
                    <Notebook className="mr-2 h-4 w-4" />
                    Historia Clínica ({clinicalNotes.length})
                </TabsTrigger>
                <TabsTrigger value="invoices">
                    <FileText className="mr-2 h-4 w-4"/>
                    Facturas ({patientInvoices.length})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="appointments">
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Citas</CardTitle>
                        <CardDescription>Un registro de todas las citas del paciente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Hora</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patientAppointments.length > 0 ? patientAppointments.map(apt => (
                                    <TableRow key={apt.id}>
                                        <TableCell>
                                           <div className="flex items-center gap-2">
                                            {format(new Date(apt.date + 'T00:00:00'), 'PPP')}
                                            {apt.isPriority && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                                          </div>
                                        </TableCell>
                                        <TableCell>{apt.time}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={
                                                    apt.status === 'Programada' ? 'secondary' :
                                                    apt.status === 'Completada' ? 'default' :
                                                    apt.status === 'Confirmada' ? 'outline' :
                                                    'destructive'
                                                }
                                                className={cn(
                                                    'capitalize',
                                                    apt.status === 'Confirmada' && 'border-blue-500 text-blue-600'
                                                )}
                                            >
                                                {apt.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/appointments/${apt.id}`)}>
                                                Ir a Consulta
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No hay citas registradas.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="clinical-history">
                 <Card>
                    <CardHeader>
                        <CardTitle>Historia Clínica</CardTitle>
                        <CardDescription>Notas y observaciones sobre la evolución del paciente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                             <Textarea
                                placeholder="Escribe una nueva nota clínica aquí..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                className="min-h-24"
                                disabled={isSavingNote}
                            />
                            <div className="flex justify-end">
                                <Button onClick={handleSaveNote} disabled={isSavingNote || !newNote.trim()}>
                                    {isSavingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Nota
                                </Button>
                            </div>
                        </div>
                        <Separator />
                        <ScrollArea className="h-96">
                            <div className="space-y-4 pr-4">
                                {clinicalNotes.length > 0 ? clinicalNotes.map(note => (
                                    <div key={note.id} className="relative p-4 border rounded-lg bg-muted/50 group">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro de que quieres eliminar esta nota?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la nota clínica.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="bg-destructive hover:bg-destructive/90"
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {note.createdAt ? format(note.createdAt.toDate(), 'PPP, h:mm a') : 'Fecha no disponible'}
                                        </p>
                                        <p className="whitespace-pre-wrap">{note.notes}</p>
                                    </div>
                                )) : (
                                    <p className="text-center text-muted-foreground py-8">No hay notas clínicas registradas.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="invoices">
                 <Card>
                    <CardHeader>
                        <CardTitle>Historial de Facturación</CardTitle>
                        <CardDescription>Un registro de todas las facturas del paciente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nº Factura</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Monto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 {patientInvoices.length > 0 ? patientInvoices.map(inv => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-medium">{inv.invoiceNumber || inv.id}</TableCell>
                                        <TableCell>{format(new Date(inv.date + 'T00:00:00'), 'PPP')}</TableCell>
                                        <TableCell>{formatCurrency(inv.amount)}</TableCell>
                                        <TableCell>
                                            <Badge variant={inv.status === 'Paid' ? 'default' : inv.status === 'Overdue' ? 'destructive' : 'secondary'}>
                                                {inv.status === 'Paid' ? 'Pagada' : inv.status === 'Pending' ? 'Pendiente' : 'Vencida'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button
                                                    aria-haspopup="true"
                                                    size="icon"
                                                    variant="ghost"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => openInvoiceViewDialog(inv)}>Ver Factura</DropdownMenuItem>
                                                    {inv.status !== 'Paid' && (
                                                        <DropdownMenuItem onClick={() => handleMarkAsPaid(inv.id)}>
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Marcar como Pagada
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                 )) : (
                                     <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No hay facturas registradas.</TableCell>
                                    </TableRow>
                                 )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
