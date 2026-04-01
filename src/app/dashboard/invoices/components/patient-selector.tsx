
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Patient } from '@/lib/types';
import { Search, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type PatientSelectorProps = {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
};

const VENTA_LIBRE_PATIENT: Patient = {
    id: 'venta-libre',
    name: 'Venta Libre',
    email: '',
    phone: '',
};

export function PatientSelector({ patients, onSelectPatient }: PatientSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredPatients = React.useMemo(() => {
    return patients
      .filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, searchQuery]);
  
  const shouldShowVentaLibre = VENTA_LIBRE_PATIENT.name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <ScrollArea className="h-60 md:h-72 w-full rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shouldShowVentaLibre && (
                <TableRow 
                    key={VENTA_LIBRE_PATIENT.id}
                    className="cursor-pointer bg-accent/50 hover:bg-accent"
                    onClick={() => onSelectPatient(VENTA_LIBRE_PATIENT)}
                >
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                            {VENTA_LIBRE_PATIENT.name}
                        </div>
                    </TableCell>
                    <TableCell>
                        <span className="text-muted-foreground">Opción rápida</span>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button size="sm" onClick={() => onSelectPatient(VENTA_LIBRE_PATIENT)}>
                            Seleccionar
                        </Button>
                    </TableCell>
                </TableRow>
            )}
            
            {filteredPatients.map((patient) => (
              <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectPatient(patient)}>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell>{patient.email}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => onSelectPatient(patient)}>
                    Seleccionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
             {filteredPatients.length === 0 && !shouldShowVentaLibre && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        No se encontraron pacientes.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
