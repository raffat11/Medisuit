
'use client';

import * as React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Scale, PlusCircle, MoreHorizontal, Truck, Trash2, CheckCircle, RotateCcw, AlertTriangle, Coins, ChevronDown, ShoppingCart, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { type Invoice, type Bill } from '@/lib/types';
import { useDialog } from '@/context/dialog-context';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useData } from '@/context/data-context';

type FinanceClientProps = {
  invoices: Invoice[];
  bills: Bill[];
};

type Transaction = (Invoice & { type: 'income' }) | (Bill & { type: 'expense' });

const invoiceStatusConfig: { [key in Invoice['status']]: { label: string; color: string; icon: React.ElementType } } = {
  'Paid': { label: 'Pagada', color: 'text-green-600', icon: CheckCircle },
  'Pending': { label: 'Pendiente', color: 'text-yellow-600', icon: RotateCcw },
  'Overdue': { label: 'Vencida', color: 'text-red-600', icon: AlertTriangle },
};

const billStatusConfig = {
    'Paid': { label: 'Pagada', color: 'text-green-600', icon: CheckCircle },
    'Pending': { label: 'Pendiente', color: 'text-yellow-600', icon: RotateCcw },
};

export function FinanceClient({ invoices, bills }: FinanceClientProps) {
  const { openBillDialog, handleDeleteBill, openDailySummaryDialog, openInvoiceViewDialog } = useDialog();
  const { allMedications, allServices } = useData();
  const { toast } = useToast();

  const { totalIncome, totalExpenses, balance, todayIncome, todayExpenses, pendingIncome, pendingSupplierBills, dailySummaryData } = React.useMemo(() => {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const pendingInvoices = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue');
    const paidBills = bills.filter(b => b.status === 'Paid');

    const totalIncome = paidInvoices.reduce((acc, inv) => acc + inv.amount, 0);
    const totalExpenses = paidBills.reduce((acc, bill) => acc + bill.amount, 0);
    const balance = totalIncome - totalExpenses;
    
    const pendingIncome = pendingInvoices.reduce((acc, inv) => acc + inv.amount, 0);

    const todaysPaidInvoices = paidInvoices
      .filter(inv => isWithinInterval(new Date(inv.date + 'T00:00:00'), { start: startOfToday, end: endOfToday }));

    const todaysPaidBills = paidBills
       .filter(bill => isWithinInterval(new Date(bill.date + 'T00:00:00'), { start: startOfToday, end: endOfToday }));

    const todayIncome = todaysPaidInvoices.reduce((acc, inv) => acc + inv.amount, 0);
    const todayExpenses = todaysPaidBills.reduce((acc, bill) => acc + bill.amount, 0);

    const pendingSupplierBills = bills.filter(b => b.status === 'Pending' && b.category === 'Proveedor').reduce((acc, bill) => acc + bill.amount, 0);
    
    let incomeFromServices = 0;
    let incomeFromMedications = 0;

    const medicationNames = new Set(allMedications.map(m => m.name));
    const serviceNames = new Set(allServices.map(s => s.name));

    todaysPaidInvoices.forEach(invoice => {
        invoice.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            if (medicationNames.has(item.description)) {
                incomeFromMedications += itemTotal;
            } else if (serviceNames.has(item.description)) {
                incomeFromServices += itemTotal;
            } else {
                // Default to service if not found in medications, could be a custom item
                incomeFromServices += itemTotal;
            }
        });
    });

    const dailySummaryData = {
        incomeFromServices,
        incomeFromMedications,
        todayExpenses: todaysPaidBills,
    }

    return { totalIncome, totalExpenses, balance, todayIncome, todayExpenses, pendingIncome, pendingSupplierBills, dailySummaryData };
  }, [invoices, bills, allMedications, allServices]);
  
  const dailyBalance = todayIncome - todayExpenses;

  const allTransactions: Transaction[] = React.useMemo(() => {
      const incomeTransactions: Transaction[] = invoices
        .map(inv => ({ ...inv, type: 'income' }));
      const expenseTransactions: Transaction[] = bills.map(bill => ({...bill, type: 'expense'}));
      
      return [...incomeTransactions, ...expenseTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, bills]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleUpdateTransactionStatus = async (id: string, type: 'income' | 'expense', status: 'Paid' | 'Pending') => {
    const collectionName = type === 'income' ? 'invoices' : 'bills';
    const docRef = doc(db, collectionName, id);

    try {
      await updateDoc(docRef, { status });
      toast({
        title: 'Transacción Actualizada',
        description: `El estado ha sido cambiado a ${status === 'Paid' ? 'Pagada' : 'Pendiente'}.`,
      });
    } catch (error) {
      console.error(`Error updating ${type} status:`, error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la transacción.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Balance Financiero</h2>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Gasto
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openBillDialog(null, true, false)}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Registrar Compra de Proveedor
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => openBillDialog(null, false, false)}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Registrar Otro Gasto
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Pagados (Mes)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">
              Total facturas pagadas este mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Pagados (Mes)</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Total gastos pagados este mes
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent" onClick={() => openDailySummaryDialog(dailySummaryData)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance del Día</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className={`text-2xl font-bold ${dailyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(dailyBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Ingresos de hoy - Gastos de hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance General (Mes)</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(balance)}
            </div>
            <p className="text-xs text-muted-foreground">Ingresos pagados - Gastos pagados</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente por Cobrar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingIncome)}</div>
            <p className="text-xs text-muted-foreground">Total de facturas no pagadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda a Proveedores</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(pendingSupplierBills)}</div>
            <p className="text-xs text-muted-foreground">Gastos a proveedores pendientes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {allTransactions.slice(0, 15).map((t) => {
                      const isIncome = t.type === 'income';
                      const statusConfig = isIncome ? invoiceStatusConfig : billStatusConfig;
                      const statusInfo = statusConfig[t.status as keyof typeof statusConfig];
                        
                      return (
                        <TableRow key={`${t.type}-${t.id}`}>
                            <TableCell>{format(new Date(t.date + 'T00:00:00'), 'PPP')}</TableCell>
                            <TableCell className="font-medium">
                                {isIncome ? `Factura ${t.invoiceNumber}` : t.description}
                                {isIncome && <p className="text-xs text-muted-foreground">{t.patientName}</p>}
                                {t.type === 'expense' && t.supplier && <p className="text-xs text-muted-foreground">A: {t.supplier}</p>}
                            </TableCell>
                            <TableCell>
                                <Badge variant={isIncome ? 'default' : 'destructive'} className="bg-opacity-70">
                                    {isIncome ? 'Ingreso' : 'Gasto'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="capitalize w-36 justify-start">
                                            {statusInfo.icon && <statusInfo.icon className={cn("mr-2 h-4 w-4", statusInfo.color)} />}
                                            <span className={cn("truncate", statusInfo.color)}>{statusInfo.label}</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {t.status === 'Paid' ? (
                                            <DropdownMenuItem onClick={() => handleUpdateTransactionStatus(t.id, t.type, 'Pending')}>
                                                <RotateCcw className="mr-2 h-4 w-4 text-yellow-600" />
                                                Marcar como Pendiente
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleUpdateTransactionStatus(t.id, t.type, 'Paid')}>
                                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                                Marcar como Pagada
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button aria-haspopup="true" size="icon" variant="ghost">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                      {t.type === 'expense' && (
                                          <>
                                            <DropdownMenuItem onClick={() => openBillDialog(t, t.category === 'Proveedor' && (!!t.items && t.items.length > 0), t.category === 'Proveedor' && (!t.items || t.items.length === 0))}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Ver / Editar
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
                                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto.
                                                        {t.category === 'Proveedor' && ' Además, se revertirá la entrada de stock en el inventario.'}
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDeleteBill(t)}
                                                        className="bg-destructive hover:bg-destructive/90"
                                                    >
                                                        Eliminar
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                          </>
                                      )}
                                      {t.type === 'income' && (
                                        <DropdownMenuItem onClick={() => openInvoiceViewDialog(t)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Ver Factura
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )})}
                    {allTransactions.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">No hay transacciones este mes.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
