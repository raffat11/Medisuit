'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle, Clock, UserSearch } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Appointment, Patient } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDialog } from '@/context/dialog-context';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast'; 

const FormSchema = z.object({
  patientId: z.string({ required_error: 'El paciente es requerido.' }).min(1, 'El paciente es requerido.'),
  patientName: z.string({ required_error: 'El nombre del paciente es requerido.' }).min(1, 'El nombre del paciente es requerido.'),
  date: z.date({ required_error: 'La fecha es requerida.' }),
  time: z.string().min(1, { message: 'La hora es requerida.' }),
  isPriority: z.boolean().default(false),
});

type AppointmentFormProps = {
  appointment: Omit<Appointment, 'doctorName' | 'status'> | null;
  onSave: (data: Omit<Appointment, 'id' | 'doctorName' | 'status'>, patient: Patient) => void;
  onCancel: () => void;
  patients: Patient[];
};

// Helper function to generate time slots
const generateTimeSlots = (start: number, end: number, interval: number) => {
  const slots = [];
  for (let hour = start; hour < end; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const d = new Date(0);
      d.setHours(hour, minute);
      slots.push(format(d, 'HH:mm'));
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots(7, 16, 20);

export function AppointmentForm({
  appointment,
  onSave,
  onCancel,
  patients,
}: AppointmentFormProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const { 
      openPatientDialog, 
      openPatientSelectorForAppointment,
      closeAppointmentDialog, 
      getUnavailableTimesForDate, 
      selectedPatientForAppointment,
      newlyAddedPatient,
      clearAppointmentSelections
  } = useDialog();
  const [unavailableTimes, setUnavailableTimes] = React.useState<string[]>([]);
  const [patient, setPatient] = React.useState<Patient | null>(null);
  
  const { toast } = useToast(); 
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      patientId: appointment?.patientId || '',
      patientName: appointment?.patientName || '',
      date: appointment ? new Date(appointment.date + 'T00:00:00') : new Date(),
      time: appointment?.time || '',
      isPriority: appointment?.isPriority || false,
    },
  });
  
  React.useEffect(() => {
    if (appointment?.patientId) {
      const existingPatient = patients.find(p => p.id === appointment.patientId);
      if (existingPatient) {
        setPatient(existingPatient);
      }
    }
  }, [appointment, patients]);

  React.useEffect(() => {
    return () => {
      clearAppointmentSelections();
      setPatient(null);
    }
  }, [clearAppointmentSelections]);
  
  React.useEffect(() => {
    const patientToSet = selectedPatientForAppointment || newlyAddedPatient;
    if (patientToSet) {
      form.setValue('patientId', patientToSet.id);
      form.setValue('patientName', patientToSet.name);
      form.trigger('patientName');
      setPatient(patientToSet);
    }
  }, [selectedPatientForAppointment, newlyAddedPatient, form]);

  const dateWatcher = form.watch('date');
  React.useEffect(() => {
    setUnavailableTimes(getUnavailableTimesForDate(dateWatcher));
  }, [dateWatcher, getUnavailableTimesForDate]);

  const handleAddNewPatient = () => {
    closeAppointmentDialog();
    openPatientDialog(null, true);
  };

  function onSubmit(data: z.infer<typeof FormSchema>) {
    if (!patient) {
      form.setError('patientName', { type: 'manual', message: 'Por favor, selecciona un paciente válido.' });
      return;
    }

    if (patient.isBlacklisted) {
      toast({
        title: '⚠️ Acción denegada',
        description: `No se puede programar la cita. El paciente ${patient.name} se encuentra en la Lista Negra.`,
        variant: 'destructive',
      });
      return; 
    }

    const appointmentData = { ...data, date: format(data.date, 'yyyy-MM-dd') };
    onSave(appointmentData, patient);
  }

  const formatTimeForDisplay = (time: string) => {
    const [hour, minute] = time.split(':');
    const d = new Date();
    d.setHours(parseInt(hour, 10), parseInt(minute, 10));
    return format(d, 'h:mm a');
  };

  const isPriorityWatcher = form.watch('isPriority');
  const patientNameWatcher = form.watch('patientName');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="patientName"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Paciente</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-11",
                    patient?.isBlacklisted && "border-destructive text-destructive"
                  )}
                  onClick={() => openPatientSelectorForAppointment(patients)}
                >
                  <UserSearch className="mr-2 h-4 w-4" />
                  {patientNameWatcher ? (
                     <span className="flex items-center gap-2 truncate">
                        <span className="truncate">{patientNameWatcher}</span>
                        {patient?.isBlacklisted && (
                          <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Lista Negra
                          </span>
                        )}
                     </span>
                  ) : (
                     <span className="text-muted-foreground">Seleccionar un paciente...</span>
                  )}
                </Button>
               <div className="flex items-center gap-2 pt-2">
                 <span className="text-sm text-muted-foreground">¿Paciente nuevo?</span>
                <Button type="button" variant="outline" size="sm" onClick={handleAddNewPatient} className="shrink-0 gap-1">
                    <PlusCircle className="h-4 w-4" />
                    Añadir
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha</FormLabel>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" portalled={false}>
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      if (date) {
                        field.onChange(date)
                      }
                      setIsCalendarOpen(false)
                    }}
                    disabled={(date) => date < new Date (new Date().setHours(0,0,0,0))}
                    captionLayout="dropdown"
                    fromYear={new Date().getFullYear() - 10}
                    toYear={new Date().getFullYear() + 10}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Controller
            control={form.control}
            name="time"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <FormItem>
                    <FormLabel>Hora</FormLabel>
                     <ScrollArea className="h-40 md:h-48 w-full rounded-md border p-4">
                        <div className="grid grid-cols-3 gap-2">
                            {timeSlots.map((slot) => {
                                const isCurrentAppointmentSlot = appointment?.time === slot && appointment.date === format(dateWatcher, 'yyyy-MM-dd');
                                const isUnavailable = !isPriorityWatcher && unavailableTimes.includes(slot) && !isCurrentAppointmentSlot;
                                const isSelected = value === slot;
                                return (
                                <Button
                                    key={slot}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onChange(slot)}
                                    disabled={isUnavailable}
                                    className={cn(
                                        "font-normal",
                                        isUnavailable
                                        ? "bg-destructive/20 text-destructive-foreground line-through hover:bg-destructive/20"
                                        : "bg-green-100 text-green-900 hover:bg-green-200",
                                        isSelected && "ring-2 ring-primary bg-primary text-primary-foreground hover:bg-primary/90"
                                    )}
                                >
                                    <Clock className="mr-2 h-4 w-4" />
                                    {formatTimeForDisplay(slot)}
                                </Button>
                                );
                            })}
                        </div>
                    </ScrollArea>
                    <FormMessage>{error?.message}</FormMessage>
                </FormItem>
            )}
        />
        
         <FormField
          control={form.control}
          name="isPriority"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Cita Prioritaria</FormLabel>
                 <p className="text-[0.8rem] text-muted-foreground">
                   Permite agendar sobre citas existentes.
                 </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Form>
  );
}