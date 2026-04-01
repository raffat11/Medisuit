
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import type { Patient } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  email: z.string().email({ message: "Email inválido." }).optional().or(z.literal('')),
  phone: z.string().min(1, 'El teléfono es requerido.'),
});

type PatientFormProps = {
  patient: Patient | null;
  allPatients: Patient[];
  onSave: (data: Omit<Patient, 'id' | 'isBlacklisted'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export function PatientForm({
  patient,
  allPatients,
  onSave,
  onCancel,
  isLoading = false,
}: PatientFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: patient?.name || '',
      email: patient?.email || '',
      phone: patient?.phone || '',
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    if (!patient) { // Only check for duplicates when creating a new patient
      const nameExists = allPatients.some(
        (p) => p.name.trim().toLowerCase() === data.name.trim().toLowerCase()
      );
      if (nameExists) {
        toast({
          title: 'Paciente Duplicado',
          description: 'Ya existe un paciente con este nombre.',
          variant: 'destructive',
        });
        return;
      }
    }
    onSave({
      ...data,
      email: data.email || ""
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="123-456-7890" {...field} disabled={isLoading} />
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
            Guardar
          </Button>
        </div>
      </form>
    </Form>
  );
}
