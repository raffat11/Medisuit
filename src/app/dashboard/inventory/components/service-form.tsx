
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
import type { Service } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const FormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  price: z.coerce.number().min(0, 'El precio debe ser un número positivo.'),
});

type ServiceFormProps = {
  service: Service | null;
  onSave: (data: Omit<Service, 'id'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export function ServiceForm({
  service,
  onSave,
  onCancel,
  isLoading = false,
}: ServiceFormProps) {
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: service?.name || '',
      price: service?.price || 0,
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    onSave(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Servicio</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Consulta de seguimiento" {...field} disabled={isLoading || service?.isFixed} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}
