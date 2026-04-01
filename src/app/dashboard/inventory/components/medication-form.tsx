
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import type { Medication } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDialog } from '@/context/dialog-context';

const PRESET_CLASSIFICATIONS = ['Tabletas', 'Cápsulas', 'Gotas', 'Inyectable'];

const FormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo.'),
  lowStockThreshold: z.coerce.number().int().min(0, 'El umbral no puede ser negativo.'),
  classification: z.string().min(1, 'La clasificación es requerida.'),
  customClassification: z.string().optional(),
  supplier: z.string().min(1, 'El proveedor es requerido.'),
  price: z.coerce.number().min(0, 'El precio debe ser un número positivo.'),
  cost: z.coerce.number().min(0, 'El costo debe ser un número positivo.').optional(),
}).superRefine((data, ctx) => {
  if (data.classification === 'Otros' && !data.customClassification) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Por favor, especifica la clasificación personalizada.',
      path: ['customClassification'],
    });
  }
});

type MedicationFormProps = {
  medication: Medication | null;
  allMedications: Medication[];
  onSave: (data: Omit<Medication, 'id'>) => void;
  onCancel: () => void;
};

export function MedicationForm({
  medication,
  allMedications,
  onSave,
  onCancel,
}: MedicationFormProps) {
  
  const { toast } = useToast();
  const { prefilledSupplier } = useDialog();
  const isCustomClassification = medication && !PRESET_CLASSIFICATIONS.includes(medication.classification) && medication.classification !== 'Otros';
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: medication?.name || '',
      stock: medication?.stock || 0,
      lowStockThreshold: medication?.lowStockThreshold || 5,
      classification: isCustomClassification ? 'Otros' : (medication?.classification || ''),
      customClassification: isCustomClassification ? medication.classification : '',
      supplier: medication?.supplier || prefilledSupplier || '',
      price: medication?.price || 0,
      cost: medication?.cost || 0,
    },
  });

  const selectedClassification = form.watch('classification');

  function onSubmit(data: z.infer<typeof FormSchema>) {
    // Check for duplicate name when creating a new medication
    if (!medication) {
      const nameExists = allMedications.some(
        (med) => med.name.trim().toLowerCase() === data.name.trim().toLowerCase()
      );
      if (nameExists) {
        toast({
          title: 'Medicamento Duplicado',
          description: 'Ya existe un medicamento con este nombre en el inventario.',
          variant: 'destructive',
        });
        return;
      }
    }

    const finalClassification = data.classification === 'Otros' ? data.customClassification! : data.classification;
    const submissionData = {
        ...data,
        classification: finalClassification,
    }
    onSave(submissionData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Medicamento</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Paracetamol 500mg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Precio de Venta</FormLabel>
                <FormControl>
                <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Costo del Proveedor</FormLabel>
                <FormControl>
                <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
          />
        </div>
         <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Actual</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="lowStockThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umbral Stock Bajo</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="classification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Clasificación</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una clasificación" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRESET_CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="Otros">Otros (especificar)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {selectedClassification === 'Otros' && (
          <FormField
            control={form.control}
            name="customClassification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Clasificación Personalizada</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Jarabe, Ungüento, etc." {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Pharma Inc." {...field} />
              </FormControl>
              <FormMessage />
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
