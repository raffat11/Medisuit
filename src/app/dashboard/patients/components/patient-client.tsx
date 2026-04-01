
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, ShieldAlert, User, Loader2, Search, History, ShieldCheck } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { type Patient } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { useDialog } from '@/context/dialog-context';

type PatientClientProps = {
    patients: Patient[];
}

export function PatientClient({ patients }: PatientClientProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState('');
  const { openPatientDialog } = useDialog();
  const router = useRouter();
  
  const handleViewDetails = (patientId: string) => {
    router.push(`/dashboard/patients/${patientId}`);
  };

  const handleDeletePatient = async (patientId: string) => {
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "patients", patientId));
      toast({
        title: 'Paciente Eliminado',
        description: 'El paciente ha sido eliminado del sistema.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error("Error deleting patient: ", error);
      toast({ title: 'Error', description: 'No se pudo eliminar el paciente.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const togglePatientBlacklist = async (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if(patient){
      const isBlacklisted = !patient.isBlacklisted;
      setIsLoading(true);
      try {
        const patientDoc = doc(db, "patients", patientId);
        await updateDoc(patientDoc, { isBlacklisted });
         toast({
            title: isBlacklisted ? 'Paciente en Lista Negra' : 'Paciente Removido de Lista Negra',
            description: `El paciente ha sido ${isBlacklisted ? 'añadido a' : 'removido de'} la lista negra.`,
            variant: isBlacklisted ? 'destructive' : 'default',
          });
      } catch (error) {
        console.error("Error updating blacklist status: ", error);
        toast({ title: 'Error', description: 'No se pudo actualizar el estado del paciente.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const filteredPatients = React.useMemo(() => {
    return patients
      .filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, searchQuery]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Pacientes</CardTitle>
              <CardDescription>
                Gestiona los registros de tus pacientes. Haz clic en una fila para ver los detalles.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nombre..."
                        className="pl-8 sm:w-[200px] md:w-[300px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
              <Button size="sm" className="gap-1" onClick={() => openPatientDialog(null)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Añadir Paciente
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map(patient => (
                  <TableRow 
                    key={patient.id} 
                    className={`cursor-pointer ${patient.isBlacklisted ? 'bg-destructive/10 hover:bg-destructive/20' : 'hover:bg-muted/50'}`}
                    onClick={() => handleViewDetails(patient.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        {patient.name}
                      </div>
                    </TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>
                      {patient.isBlacklisted && (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          En Lista Negra
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                              onClick={(e) => e.stopPropagation()}
                            >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(patient.id); }}>
                            <History className="mr-2 h-4 w-4" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPatientDialog(patient); }}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePatientBlacklist(patient.id); }}>
                            {patient.isBlacklisted ? 'Remover de Lista Negra' : 'Añadir a Lista Negra'}
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                onClick={(e) => e.stopPropagation()}
                                className="text-destructive focus:text-destructive"
                              >
                                Eliminar
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente al paciente
                                  y borrará sus datos de nuestros servidores.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePatient(patient.id)} className="bg-destructive hover:bg-destructive/90">
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                 {filteredPatients.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            No se encontraron pacientes.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </>
  );
}
