'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, UserSearch, ShoppingCart, Trash2 } from 'lucide-react';

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
import type { Invoice, InvoiceItem, Patient } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDialog } from '@/context/dialog-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

const FormSchema = z.object({
  patientId: z.string({ required_error: 'El paciente es requerido.' }).min(1, 'El paciente es requerido.'),
  patientName: z.string({ required_error: 'El nombre del paciente es requerido.' }).min(1, 'El nombre del paciente es requerido.'),
  date: z.date({ required_error: 'La fecha es requerida.' }),
  status: z.enum(['Paid', 'Pending', 'Overdue']),
  items: z.array(z.object({
    description: z.string().min(1, 'La descripción es requerida.'),
    quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1.'),
    price: z.coerce.number().min(0, 'El precio debe ser un número positivo.'),
    isProvided: z.boolean().optional().default(true),
  })).min(1, 'Se requiere al menos un item.'),
  // CORRECCIÓN 1: Permitimos explícitamente null para que coincida con el Context
  appointmentId: z.string().nullable().optional(),
});

type InvoiceFormProps = {
  invoice: Invoice | null;
  onSave: (data: Omit<Invoice, 'id' | 'invoiceNumber'>) => void;
  onCancel: () => void;
};

export function InvoiceForm({
  invoice,
  onSave,
  onCancel,
}: InvoiceFormProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const { 
    openPatientSelectorForInvoice, 
    openItemSelector, 
    selectedPatientForInvoice, 
    selectedItemsForInvoice, 
    clearInvoiceSelections,
    invoicePrefillData,
  } = useDialog();
    
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      patientId: invoice?.patientId || invoicePrefillData?.patientId || '',
      patientName: invoice?.patientName || invoicePrefillData?.patientName || '',
      date: invoice ? new Date(invoice.date + 'T00:00:00') : new Date(),
      status: invoice?.status || 'Pending',
      items: invoice?.items?.map(item => ({ ...item, isProvided: item.isProvided !== false })) 
             || invoicePrefillData?.items?.map(item => ({ ...item, isProvided: true })) 
             || [],
      // CORRECCIÓN 2: Aseguramos que si no hay ID, se pase null (que ya es aceptado por el esquema corregido)
      appointmentId: invoice?.appointmentId || invoicePrefillData?.appointmentId || null,
    },
  });

  const { fields, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  React.useEffect(() => {
    return () => {
      clearInvoiceSelections();
    }
  }, [clearInvoiceSelections]);
  
  React.useEffect(() => {
    if (selectedPatientForInvoice) {
      form.setValue('patientId', selectedPatientForInvoice.id);
      form.setValue('patientName', selectedPatientForInvoice.name);
    }
  }, [selectedPatientForInvoice, form]);
  
  React.useEffect(() => {
    if (selectedItemsForInvoice.length > 0) {
      const itemsWithStatus = selectedItemsForInvoice.map(item => ({ ...item, isProvided: true }));
      replace(itemsWithStatus);
    }
  }, [selectedItemsForInvoice, replace]);

  const watchedItems = form.watch('items');

  function onSubmit(data: z.infer<typeof FormSchema>) {
    // Calculamos el monto final ignorando los items que NO se llevaron
    const amount = data.items.reduce((acc, item) => {
        if (item.isProvided === false) return acc;
        return acc + (item.quantity * item.price);
    }, 0);

    // Preparamos el paquete de datos
    const finalData: any = { 
        ...data, 
        date: format(data.date, 'yyyy-MM-dd'), 
        amount 
    };

    // 🚀 EL TRUCO: Si no hay cita (como en Venta Libre), 
    // borramos la propiedad por completo para que Firebase ni siquiera la vea.
    if (!finalData.appointmentId) {
        delete finalData.appointmentId;
    }

    onSave(finalData);
  }

  const totalAmount = watchedItems.reduce((acc, item) => {
    if (item.isProvided === false) return acc;
    return acc + (item.quantity * item.price || 0);
  }, 0);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="patientName"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Paciente</FormLabel>
                 <div className="flex items-center gap-2">
                  <Input {...field} readOnly placeholder="Selecciona un paciente" className="bg-muted" />
                  <Button type="button" variant="outline" onClick={openPatientSelectorForInvoice}>
                    <UserSearch className="mr-2 h-4 w-4" />
                    Buscar
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
                <FormLabel>Fecha de Factura</FormLabel>
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
                        if (date) field.onChange(date);
                        setIsCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <FormLabel>Items y Medicamentos</FormLabel>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => openItemSelector(fields)}
            >
                <ShoppingCart className="h-3.5 w-3.5" />
                Añadir / Editar Items
            </Button>
          </div>
          <ScrollArea className="h-64 w-full rounded-md border p-2">
            <div className="space-y-2">
                {fields.map((field, index) => {
                  const isProvided = watchedItems[index]?.isProvided !== false;

                  return (
                    <div key={field.id} className={cn(
                        "flex gap-3 items-center text-sm p-3 rounded-md border transition-colors",
                        !isProvided ? "bg-muted/30 border-dashed" : "bg-background shadow-sm"
                    )}>
                        <div className="flex flex-col items-center justify-center gap-1.5 border-r pr-3 min-w-[70px]">
                            <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wider",
                                isProvided ? "text-green-600" : "text-muted-foreground"
                            )}>
                                {isProvided ? 'Entregado' : 'Pendiente'}
                            </span>
                            <Controller
                                control={form.control}
                                name={`items.${index}.isProvided`}
                                render={({ field: controllerField }) => (
                                    <Switch
                                        checked={controllerField.value}
                                        onCheckedChange={controllerField.onChange}
                                    />
                                )}
                            />
                        </div>

                        <div className="flex-grow">
                            <p className={cn("font-medium", !isProvided && "text-muted-foreground line-through")}>
                                {field.description}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {field.quantity} x {formatCurrency(field.price)}
                            </p>
                        </div>
                        
                        <div className="font-medium pr-2 text-right">
                            {!isProvided ? (
                                <span className="text-muted-foreground text-[11px] italic bg-muted px-2 py-1 rounded-md">
                                    No cobrado
                                </span>
                            ) : (
                                formatCurrency(field.quantity * field.price)
                            )}
                        </div>
                        
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  );
                })}
                {fields.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-center text-muted-foreground py-4">No hay items en la factura.</p>
                    </div>
                )}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        <div className="flex justify-between items-center pt-2">
           <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="w-1/2">
                  <FormLabel>Estado</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Pending">Pendiente</SelectItem>
                      <SelectItem value="Paid">Pagada</SelectItem>
                      <SelectItem value="Overdue">Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          <div className="text-right">
              <p className="text-sm text-muted-foreground">Monto Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

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