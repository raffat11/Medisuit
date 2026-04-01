'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, 
  MoreHorizontal, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Star, 
  Trash2, 
  Phone, 
  ThumbsUp, 
  RotateCcw, 
  Circle, 
  Play, 
  FileText,
  Banknote,    
  AlertCircle,
  UserX // <--- NUEVO ICONO PARA LISTA NEGRA
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';
import {
  type Appointment,
  type Patient,
  type ClinicalNote,
  type InvoiceItem,
  type Invoice, 
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateDoc, doc, deleteDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDialog } from '@/context/dialog-context';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useData } from '@/context/data-context';

type AppointmentClientProps = {
    appointments: Appointment[];
    patients: Patient[];
    invoices: Invoice[]; 
}

const statusConfig = {
    'Programada': { icon: Circle, color: 'text-gray-500', label: 'Programada' },
    'Confirmada': { icon: ThumbsUp, color: 'text-blue-600', label: 'Confirmada' },
    'Completada': { icon: CheckCircle, color: 'text-green-600', label: 'Completada' },
    'Cancelada': { icon: XCircle, color: 'text-red-600', label: 'Cancelada' },
};

export function AppointmentClient({ appointments, patients, invoices }: AppointmentClientProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = React.useState(false);
  
  const { toast } = useToast();
  const { openAppointmentDialog, openInvoiceDialog } = useDialog();
  const { allMedications, allServices } = useData();
  const router = useRouter();

  const handleUpdateStatus = async (appointmentId: string, status: 'Programada' | 'Confirmada' | 'Completada' | 'Cancelada') => {
    setIsLoading(true);
    try {
        const appointmentDoc = doc(db, "appointments", appointmentId);
        await updateDoc(appointmentDoc, { status });
        toast({
          title: `Cita ${status}`,
          description: `La cita ha sido marcada como ${status.toLowerCase()}.`,
          variant: status === 'Cancelada' ? 'destructive' : 'default',
        });
    } catch (error) {
         console.error(`Error updating appointment to ${status}:`, error);
        toast({ title: 'Error', description: `No se pudo actualizar el estado de la cita.`, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDeleteAppointment = async (appointmentId: string) => {
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "appointments", appointmentId));
      toast({
        title: 'Cita Eliminada',
        description: 'La cita ha sido eliminada permanentemente.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error("Error deleting appointment: ", error);
      toast({ title: 'Error', description: 'No se pudo eliminar la cita.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- NUEVA FUNCIÓN: AÑADIR/QUITAR DE LISTA NEGRA ---
  const handleToggleBlacklist = async (patientId: string, currentStatus: boolean, patientName: string) => {
    setIsLoading(true);
    try {
        const patientRef = doc(db, 'patients', patientId);
        await updateDoc(patientRef, { isBlacklisted: !currentStatus });
        toast({
            title: !currentStatus ? 'Añadido a Lista Negra' : 'Removido de Lista Negra',
            description: `${patientName} ahora está ${!currentStatus ? 'en' : 'fuera de'} la lista negra.`,
            variant: !currentStatus ? 'destructive' : 'default',
        });
    } catch (error) {
        console.error("Error updating blacklist status: ", error);
        toast({ title: 'Error', description: 'No se pudo actualizar el estado del paciente.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleQuickInvoice = async (appointment: Appointment) => {
    setIsLoading(true);
    try {
      const existingInvoice = invoices.find(inv => inv.appointmentId === appointment.id);

      if (existingInvoice) {
        toast({
          title: 'Factura Encontrada',
          description: `Abriendo la factura existente ${existingInvoice.invoiceNumber} para esta cita.`,
        });
        const invoiceToEdit = { ...existingInvoice, date: existingInvoice.date }; 
        openInvoiceDialog(invoiceToEdit);
        setIsLoading(false);
        return;
      }
      
      const items: InvoiceItem[] = [];
      
      const generalConsultation = allServices.find(s => s.name === 'Consulta General');
      if (generalConsultation) {
        items.push({
          description: generalConsultation.name,
          price: generalConsultation.price,
          quantity: 1,
        });
      }

      if (appointment.clinicalNoteId) {
        const noteRef = doc(db, 'clinicalNotes', appointment.clinicalNoteId);
        const noteSnap = await getDoc(noteRef);

        if (noteSnap.exists()) {
          const clinicalNote = noteSnap.data() as ClinicalNote;
          clinicalNote.prescriptions.forEach(prescription => {
            const medication = allMedications.find(m => m.id === prescription.medicationId);
            if (medication) {
              items.push({
                description: medication.name,
                price: medication.price,
                quantity: 1,
              });
            }
          });
        }
      }

      openInvoiceDialog(null, {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        items: items,
      });

    } catch (error) {
      console.error("Error in handleQuickInvoice: ", error);
      toast({ title: 'Error', description: 'No se pudo generar la facturación rápida.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };


  const patientsMap = React.useMemo(() => {
    return new Map(patients.map(p => [p.id, p]));
  }, [patients]);
  
  const filteredAppointments = React.useMemo(() => {
    if (!date) return [];
    const formattedDate = format(date, 'yyyy-MM-dd');
    return appointments
      .filter(apt => apt.date === formattedDate)
      .map(apt => ({
          ...apt,
          patient: patientsMap.get(apt.patientId),
      }))
      .sort((a,b) => a.time.localeCompare(b.time));
  }, [date, appointments, patientsMap]);

  const formatTimeForDisplay = (time: string) => {
    if (!time) return '';
    const [hour, minute] = time.split(':');
    const d = new Date();
    d.setHours(parseInt(hour, 10), parseInt(minute, 10));
    return format(d, 'h:mm a');
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const parsedDate = parse(dateValue, 'yyyy-MM-dd', new Date());
      setDate(parsedDate);
    } else {
      setDate(undefined);
    }
  }

  const getPaymentStatus = (appointmentId: string) => {
    const invoice = invoices.find(inv => inv.appointmentId === appointmentId);
    if (!invoice) return 'unbilled'; 
    return invoice.status === 'Paid' ? 'paid' : 'pending'; 
  };

  return (
    <>
      <div className="grid gap-4">
        <Card className="xl:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Agenda de Citas</CardTitle>
                  <CardDescription>
                    Gestiona y programa las citas de los pacientes.
                  </CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <div className="w-[200px]">
                      <Input
                        type="date"
                        value={date ? format(date, 'yyyy-MM-dd') : ''}
                        onChange={handleDateChange}
                        className="w-full pl-3"
                      />
                    </div>
                    <Button size="sm" className="gap-1" onClick={() => openAppointmentDialog(null)}>
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Nueva Cita
                      </span>
                    </Button>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">Citas para {date ? format(date, 'PPP', { locale: es }) : '...'}</h3>
              {isLoading && !filteredAppointments.length ? (
                <div className="flex justify-center items-center h-60">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
               ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                       <TableHead>Contacto</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Pagado</TableHead> 
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.length > 0 ? filteredAppointments.map(appointment => {
                      const StatusIcon = statusConfig[appointment.status].icon;
                      const statusColor = statusConfig[appointment.status].color;
                      const isPastOrCompleted = new Date(appointment.date) < new Date() || appointment.status === 'Completada';
                      
                      const paymentStatus = getPaymentStatus(appointment.id);

                      return (
                      <TableRow key={appointment.id} className={appointment.patient?.isBlacklisted ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">
                           <div className="flex items-center gap-2">
                            {appointment.patientName}
                            {appointment.isPriority && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                            {/* Etiqueta visible en la tabla si el paciente está en lista negra */}
                            {appointment.patient?.isBlacklisted && (
                              <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-2">
                                Lista Negra
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                           {appointment.patient?.phone ? (
                            <div className="flex items-center gap-2">
                              <span>{appointment.patient.phone}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a href={`tel:${appointment.patient.phone}`} onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Llamar a {appointment.patient?.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                           ) : (
                            <span className="text-muted-foreground text-xs">No registrado</span>
                           )}
                        </TableCell>
                         <TableCell>{formatTimeForDisplay(appointment.time)}</TableCell>
                        <TableCell>
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="capitalize w-36 justify-start" disabled={appointment.status === 'Completada' || appointment.status === 'Cancelada'}>
                                  <StatusIcon className={cn("mr-2 h-4 w-4", statusColor)} />
                                  <span className={cn("truncate", statusColor)}>{appointment.status}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {(appointment.status === 'Programada' || appointment.status === 'Confirmada') && (
                                    <>
                                        {appointment.status === 'Programada' && (
                                            <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, 'Confirmada')}>
                                                <ThumbsUp className="mr-2 h-4 w-4 text-blue-600" />
                                                Confirmar
                                            </DropdownMenuItem>
                                        )}
                                        {appointment.status === 'Confirmada' && (
                                            <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, 'Programada')}>
                                                <RotateCcw className="mr-2 h-4 w-4" />
                                                Revertir a Programada
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, 'Cancelada')} className="text-destructive focus:text-destructive">
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Cancelar
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {(appointment.status === 'Completada' || appointment.status === 'Cancelada') && (
                                    <DropdownMenuItem disabled>No hay acciones</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                           </DropdownMenu>
                        </TableCell>

                        {/* --- COLUMNA DE INDICADOR DE PAGO (CON EL BOTÓN QUE ARREGLAMOS) --- */}
                        <TableCell className="text-center">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center">
                                            {paymentStatus === 'paid' ? (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="bg-green-100 hover:bg-green-200 p-1.5 rounded-full h-9 w-9"
                                                    onClick={() => {
                                                        const invoice = invoices.find(inv => inv.appointmentId === appointment.id);
                                                        if (invoice) openInvoiceDialog(invoice);
                                                    }}
                                                >
                                                    <Banknote className="h-5 w-5 text-green-600" />
                                                </Button>
                                            ) : (
                                                <div className="bg-red-50 p-1.5 rounded-full">
                                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                                </div>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{paymentStatus === 'paid' ? 'Ver Factura Pagada' : 'Pago Pendiente / Sin Facturar'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex justify-center items-center gap-1">
                             <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => router.push(`/dashboard/appointments/${appointment.id}`)}>
                                      <Play className="h-4 w-4" />
                                      <span className="sr-only">Iniciar Cita</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Iniciar Cita</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleQuickInvoice(appointment)} disabled={isLoading || !isPastOrCompleted}>
                                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                      <span className="sr-only">Facturación Rápida</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Facturación Rápida</p></TooltipContent>
                                </Tooltip>
                             </TooltipProvider>

                             <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  aria-haspopup="true"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openAppointmentDialog(appointment)}>Editar</DropdownMenuItem>
                                
                                {/* --- NUEVA OPCIÓN: LISTA NEGRA --- */}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={() => handleToggleBlacklist(appointment.patientId, !!appointment.patient?.isBlacklisted, appointment.patientName)}
                                    className={appointment.patient?.isBlacklisted ? "text-green-600 focus:text-green-600" : "text-destructive focus:text-destructive"}
                                >
                                    <UserX className="mr-2 h-4 w-4" />
                                    {appointment.patient?.isBlacklisted ? 'Quitar de Lista Negra' : 'Añadir a Lista Negra'}
                                </DropdownMenuItem>
                                {/* --------------------------------- */}

                                <DropdownMenuSeparator />
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <DropdownMenuItem
                                              onSelect={(e) => e.preventDefault()}
                                              className="text-destructive focus:text-destructive"
                                          >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Eliminar
                                          </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                          <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Esta acción no se puede deshacer. Esto eliminará permanentemente la cita de la base de datos.
                                          </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                              onClick={() => handleDeleteAppointment(appointment.id)}
                                              className="bg-destructive hover:bg-destructive/90"
                                          >
                                              Eliminar
                                          </AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                No hay citas programadas para esta fecha.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
                </>
              )}
            </CardContent>
          </Card>
      </div>
    </>
  );
}