
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, PackagePlus, Trash2 } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Bill } from '@/lib/types';
import { useDialog } from '@/context/dialog-context';
import { Separator } from '@/components/ui/separator';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';


const FormSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida.'),
  amount: z.coerce.number().min(0, 'El monto debe ser al menos cero.'),
  date: z.date({ required_error: 'La fecha es requerida.' }),
  category: z.enum(['Proveedor', 'Servicios', 'Salarios', 'Otros'], {
    required_error: 'La categoría es requerida.',
  }),
  supplier: z.string().min(1, 'El proveedor es requerido.'),
  newSupplier: z.string().optional(),
  items: z.array(z.object({
    medicationId: z.string(),
    medicationName: z.string(),
    quantity: z.coerce.number().min(1),
    costPerUnit: z.coerce.number().min(0),
    expiryDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  })).optional(),
  status: z.enum(['Paid', 'Pending']),
}).superRefine((data, ctx) => {
    if (data.category === 'Proveedor' && data.supplier === 'Otro' && !data.newSupplier) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Por favor, especifica el nombre del nuevo proveedor.",
            path: ['newSupplier'],
        });
    }
});


type BillFormProps = {
  bill: Bill | null;
  onSave: (data: Omit<Bill, 'id'>, updatesStock: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
  fromInventory?: boolean;
  isExpenseOnly?: boolean;
};

export function BillForm({ bill, onSave, onCancel, isLoading = false, fromInventory = false, isExpenseOnly = false }: BillFormProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const { openBillItemSelector, selectedItemsForBill, clearBillSelections } = useDialog();
  const { allMedications } = useData();
  const { toast } = useToast();

  const uniqueSuppliers = React.useMemo(() => {
    const suppliers = new Set(allMedications.map(med => med.supplier).filter(Boolean));
    return Array.from(suppliers).sort();
  }, [allMedications]);

  const defaultCategory = (fromInventory || isExpenseOnly) ? 'Proveedor' : 'Servicios';
  const isCustomSupplier = bill && !uniqueSuppliers.includes(bill.supplier || '') && bill.supplier;
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      description: bill?.description || (fromInventory ? 'Compra de inventario' : ''),
      amount: bill?.amount || 0,
      date: bill ? new Date(bill.date + 'T00:00:00') : new Date(),
      category: bill?.category || defaultCategory,
      supplier: isCustomSupplier ? 'Otro' : bill?.supplier || '',
      newSupplier: isCustomSupplier ? bill.supplier : '',
      items: bill?.items || [],
      status: bill?.status || 'Pending',
    },
  });

  const { fields, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  React.useEffect(() => {
    if (fromInventory || isExpenseOnly) {
      form.setValue('category', 'Proveedor');
    }
  }, [fromInventory, isExpenseOnly, form]);

  React.useEffect(() => {
    return () => {
      clearBillSelections();
    }
  }, [clearBillSelections]);

  React.useEffect(() => {
    if (selectedItemsForBill.length > 0) {
      replace(selectedItemsForBill);
      const totalAmount = selectedItemsForBill.reduce((acc, item) => acc + item.costPerUnit * item.quantity, 0);
      form.setValue('amount', totalAmount);
    }
  }, [selectedItemsForBill, replace, form]);
  
  const categoryWatcher = form.watch('category');
  const supplierWatcher = form.watch('supplier');
  const selectedSupplierName = supplierWatcher === 'Otro' ? form.watch('newSupplier') : supplierWatcher;


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  function onSubmit(data: z.infer<typeof FormSchema>) {
    if (data.supplier === 'Otro' && data.newSupplier) {
      const supplierExists = uniqueSuppliers.some(
        s => s.trim().toLowerCase() === data.newSupplier?.trim().toLowerCase()
      );
      if (supplierExists) {
        toast({
          title: 'Proveedor Duplicado',
          description: 'Este proveedor ya existe. Por favor, selecciónalo de la lista.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    const finalSupplier = data.supplier === 'Otro' ? data.newSupplier : data.supplier;
    const submissionData = { ...data, supplier: finalSupplier || '' };
    
    const updatesStock = fromInventory && !isExpenseOnly;
    onSave({ ...submissionData, date: format(data.date, 'yyyy-MM-dd') }, updatesStock);
  }

  const isCategoryDisabled = fromInventory || isExpenseOnly;
  const isAmountDisabled = fromInventory && fields.length > 0 && !isExpenseOnly;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Pago de servicios públicos" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50000" {...field} disabled={isLoading || isAmountDisabled} />
                </FormControl>
                 {isAmountDisabled && <p className="text-xs text-muted-foreground">El monto se calcula a partir de los items.</p>}
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
                        disabled={isLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP') : <span>Selecciona una fecha</span>}
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

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || isCategoryDisabled}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="Proveedor">Proveedor</SelectItem>
                    <SelectItem value="Servicios">Servicios (Agua, Luz, etc.)</SelectItem>
                    <SelectItem value="Salarios">Salarios</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pendiente</SelectItem>
                          <SelectItem value="Paid">Pagada</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
        </div>
        
        {categoryWatcher === 'Proveedor' && (
            <>
                <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nombre del Proveedor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un proveedor" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {uniqueSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                <SelectItem value="Otro">Otro (Crear nuevo)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {supplierWatcher === 'Otro' && (
                    <FormField
                        control={form.control}
                        name="newSupplier"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nombre del Nuevo Proveedor</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: Pharma Inc." {...field} value={field.value || ''} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <Separator />
                {fromInventory && !isExpenseOnly && (
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <FormLabel>Items de Inventario</FormLabel>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => openBillItemSelector(fields, selectedSupplierName)}
                            disabled={!selectedSupplierName}
                        >
                            <PackagePlus className="h-3.5 w-3.5" />
                            Añadir / Editar Items
                        </Button>
                    </div>
                     <ScrollArea className="h-40 w-full rounded-md border">
                        <div className="space-y-2 p-2">
                            {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-center text-sm p-2 rounded-md bg-muted/50">
                                <div className="flex-grow">
                                    <p className="font-medium">{field.medicationName}</p>
                                    <p className="text-muted-foreground">
                                        {field.quantity} x {formatCurrency(field.costPerUnit)}
                                    </p>
                                </div>
                                <div className="font-medium pr-2">
                                    {formatCurrency(field.quantity * field.costPerUnit)}
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-6 w-6 text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            ))}
                            {fields.length === 0 && (
                                <p className="text-center text-muted-foreground py-3 text-sm">No se han añadido items al inventario.</p>
                            )}
                        </div>
                    </ScrollArea>
                 </div>
                )}
            </>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Gasto
          </Button>
        </div>
      </form>
    </Form>
  );
}
