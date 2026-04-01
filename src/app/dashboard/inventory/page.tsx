
'use client';

import * as React from 'react';
import { 
  PlusCircle, MoreHorizontal, ArrowUpDown, Search, Edit, 
  ShoppingCart, Trash2, History, DollarSign, Pill, 
  Stethoscope, Loader2 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { type Medication, type Service } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useDialog } from '@/context/dialog-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from '@/context/data-context';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

// --- Definición de tipos locales ---
type SortableColumn = keyof Medication | keyof Service;

const getSortIndicator = (columnKey: string, sortConfig: { key: SortableColumn, direction: 'ascending' | 'descending' } | null) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? ' 🔼' : ' 🔽';
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
};


export default function InventoryPage() {
  const { allMedications, allServices, isLoading } = useData();
  const { 
      handleDeleteMedication, 
      openBillDialog, 
      openMedicationDialog, 
      openServiceDialog,
      openMedicationHistoryDialog 
  } = useDialog();
  const { toast } = useToast();
  
  const [sortConfig, setSortConfig] = React.useState<{ key: SortableColumn; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('medications');

  const requestSort = (key: SortableColumn) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteDoc(doc(db, "services", serviceId));
      toast({
        title: 'Servicio Eliminado',
        description: 'El servicio ha sido eliminado permanentemente.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error("Error deleting service: ", error);
      toast({ title: 'Error', description: 'No se pudo eliminar el servicio.', variant: 'destructive' });
    }
  };

  const filteredAndSortedMedications = React.useMemo(() => {
    let items = (allMedications || []).filter(med => 
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Medication] as any;
        const bValue = b[sortConfig.key as keyof Medication] as any;
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [allMedications, searchQuery, sortConfig]);

  const filteredServices = React.useMemo(() => {
    return (allServices || []).filter(service => 
        !service.isFixed && service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allServices, searchQuery]);

  const fixedService = React.useMemo(() => {
    return (allServices || []).find(s => s.isFixed);
  }, [allServices]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Cargando inventario...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-8 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Inventario y Servicios</h1>
          <p className="text-muted-foreground mt-1">
            Gestión centralizada de medicamentos y catálogo de servicios.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => openBillDialog(null, true, true)}>
            <DollarSign className="mr-2 h-4 w-4" /> Gasto
          </Button>
          <Button variant="outline" onClick={() => openBillDialog(null, true, false)}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Pedido
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Item
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openMedicationDialog(null)}>
                <Pill className="mr-2 h-4 w-4" /> Medicamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openServiceDialog(null)}>
                <Stethoscope className="mr-2 h-4 w-4" /> Servicio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex justify-between items-center">
            <TabsList className="grid grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="medications">
                <Pill className="mr-2 h-4 w-4" /> Medicamentos
            </TabsTrigger>
            <TabsTrigger value="services">
                <Stethoscope className="mr-2 h-4 w-4" /> Servicios
            </TabsTrigger>
            </TabsList>
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder={activeTab === 'medications' ? 'Buscar medicamento o proveedor...' : 'Buscar servicio...'}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>

        <Card>
            <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                    <TabsContent value="medications" className="m-0">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50">
                                Nombre {getSortIndicator('name', sortConfig)}
                            </TableHead>
                            <TableHead>Clasificación</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedMedications.map(medication => {
                                const isLowStock = medication.stock < medication.lowStockThreshold;
                                return (
                                    <TableRow key={medication.id} className={isLowStock ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                        <TableCell className="font-medium">{medication.name}</TableCell>
                                        <TableCell>{medication.classification}</TableCell>
                                        <TableCell>
                                            <Badge variant={isLowStock ? 'destructive' : 'secondary'}>
                                            {isLowStock ? 'Bajo Stock' : 'Disponible'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{medication.stock}</TableCell>
                                        <TableCell>{medication.supplier}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(medication.price)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openMedicationDialog(medication)}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openMedicationHistoryDialog(medication)}><History className="mr-2 h-4 w-4"/>Historial</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteMedication(medication.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredAndSortedMedications.length === 0 && (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No se encontraron medicamentos.</TableCell></TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="services" className="m-0 p-6 space-y-8">
                        {fixedService && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Servicio Principal (Consulta)</CardTitle>
                                    <CardDescription>Este es el precio base de la consulta médica.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-between items-center">
                                    <div className="text-2xl font-bold text-primary">{formatCurrency(fixedService.price)}</div>
                                    <Button variant="outline" size="sm" onClick={() => openServiceDialog(fixedService)}><Edit className="mr-2 h-4 w-4" /> Modificar Precio</Button>
                                </CardContent>
                            </Card>
                        )}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Servicios Adicionales</h3>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead>Nombre del Servicio</TableHead>
                                        <TableHead className="text-right">Precio</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredServices.map((service) => (
                                            <TableRow key={service.id}>
                                                <TableCell className="font-medium">{service.name}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(service.price)}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openServiceDialog(service)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                                            <DropdownMenuItem disabled={service.isFixed} onClick={() => handleDeleteService(service.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredServices.length === 0 && (
                                            <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No hay servicios adicionales registrados.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                   </TabsContent>
        </ScrollArea>
      </CardContent>
    </Card>
  </Tabs>
 </div>
 );
}