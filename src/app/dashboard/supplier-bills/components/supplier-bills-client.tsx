

'use client';

import * as React from 'react';
import { MoreHorizontal, PlusCircle, Trash2, CheckCircle, RotateCcw, Truck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Bill } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDialog } from '@/context/dialog-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

type SupplierBillsClientProps = {
    bills: Bill[];
}

const statusConfig: { [key in Bill['status']]: { label: string; color: string; icon: React.ElementType } } = {
  'Paid': { label: 'Pagada', color: 'text-green-600', icon: CheckCircle },
  'Pending': { label: 'Pendiente', color: 'text-yellow-600', icon: RotateCcw },
};

export function SupplierBillsClient({ bills }: SupplierBillsClientProps) {
  const { toast } = useToast();
  const { openBillDialog, handleDeleteBill } = useDialog();

  const sortedBills = React.useMemo(() => {
    if (!bills) return [];
    return bills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bills]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleUpdateStatus = async (billId: string, status: Bill['status']) => {
    try {
        const billDoc = doc(db, "bills", billId);
        await updateDoc(billDoc, { status });
        toast({
          title: 'Factura Actualizada',
          description: `La factura ha sido marcada como ${status === 'Paid' ? 'pagada' : 'pendiente'}.`,
        });
    } catch (error) {
        console.error(`Error updating bill to ${status}:`, error);
        toast({ title: 'Error', description: 'No se pudo actualizar el estado de la factura.', variant: 'destructive' });
    }
  };

  const handleViewDetails = (bill: Bill) => {
    const isExpenseOnly = !bill.items || bill.items.length === 0;
    openBillDialog(bill, true, isExpenseOnly);
  }


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Truck className="h-6 w-6" />Facturas de Proveedores</CardTitle>
              <CardDescription>
                Gestiona y da seguimiento a las facturas y compras de proveedores.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={() => openBillDialog(null, true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Añadir Compra
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBills.map(bill => {
                  const StatusIcon = statusConfig[bill.status].icon;
                  const statusColor = statusConfig[bill.status].color;

                  return (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{format(new Date(bill.date + 'T00:00:00'), 'PPP')}</TableCell>
                    <TableCell>{bill.supplier}</TableCell>
                    <TableCell>{bill.description}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="capitalize w-36 justify-start">
                                <StatusIcon className={cn("mr-2 h-4 w-4", statusColor)} />
                                <span className={cn("truncate", statusColor)}>{statusConfig[bill.status].label}</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              {bill.status === 'Paid' ? (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(bill.id, 'Pending')}>
                                      <RotateCcw className="mr-2 h-4 w-4 text-yellow-600" />
                                      Marcar como Pendiente
                                  </DropdownMenuItem>
                              ) : (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(bill.id, 'Paid')}>
                                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                      Marcar como Pagada
                                  </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(bill.amount)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(bill)}>
                            Editar
                          </DropdownMenuItem>
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
                                    <AlertDialogTitle>¿Estás absolutely seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente la factura y revertirá cualquier cambio de stock asociado.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDeleteBill(bill)}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Eliminar Permanentemente
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})}
                 {sortedBills.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                            No se han registrado facturas de proveedores.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
