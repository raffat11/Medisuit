
'use client';

import * as React from 'react';
import { MoreHorizontal, PlusCircle, Loader2, Trash2, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { type Invoice } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDialog } from '@/context/dialog-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type InvoiceClientProps = {
    invoices: Invoice[];
}

const statusConfig: { [key in Invoice['status']]: { label: string; color: string; icon: React.ElementType } } = {
  'Paid': { label: 'Pagada', color: 'text-green-600', icon: CheckCircle },
  'Pending': { label: 'Pendiente', color: 'text-yellow-600', icon: RotateCcw },
  'Overdue': { label: 'Vencida', color: 'text-red-600', icon: AlertTriangle },
};

export function InvoiceClient({ invoices }: InvoiceClientProps) {
  const { toast } = useToast();
  const { openInvoiceDialog, openInvoiceViewDialog, handleDeleteInvoice } = useDialog();

  const sortedInvoices = React.useMemo(() => {
    if (!invoices) return [];
    return invoices.sort((a, b) => (b.invoiceNumber || '').localeCompare(a.invoiceNumber || ''));
  }, [invoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleUpdateStatus = async (invoiceId: string, status: Invoice['status']) => {
    try {
        const invoiceDoc = doc(db, "invoices", invoiceId);
        await updateDoc(invoiceDoc, { status });
        toast({
          title: 'Factura Actualizada',
          description: `La factura ha sido marcada como ${status.toLowerCase()}.`,
        });
    } catch (error) {
        console.error(`Error updating invoice to ${status}:`, error);
        toast({ title: 'Error', description: 'No se pudo actualizar el estado de la factura.', variant: 'destructive' });
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Facturación</CardTitle>
              <CardDescription>
                Genera y da seguimiento a las facturas de los pacientes.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={() => openInvoiceDialog(null)}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Crear Factura
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Factura</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map(invoice => {
                  const StatusIcon = statusConfig[invoice.status].icon;
                  const statusColor = statusConfig[invoice.status].color;

                  return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber || invoice.id}</TableCell>
                    <TableCell>{invoice.patientName}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="capitalize w-36 justify-start">
                                <StatusIcon className={cn("mr-2 h-4 w-4", statusColor)} />
                                <span className={cn("truncate", statusColor)}>{statusConfig[invoice.status].label}</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              {invoice.status === 'Paid' ? (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'Pending')}>
                                      <RotateCcw className="mr-2 h-4 w-4 text-yellow-600" />
                                      Marcar como Pendiente
                                  </DropdownMenuItem>
                              ) : (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'Paid')}>
                                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                      Marcar como Pagada
                                  </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.amount)}
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
                          <DropdownMenuItem onClick={() => openInvoiceViewDialog(invoice)}>
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openInvoiceDialog(invoice)}>
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
                                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente la factura y revertirá el stock de los medicamentos vendidos.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDeleteInvoice(invoice)}
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
                 {sortedInvoices.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                            No se han creado facturas.
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
