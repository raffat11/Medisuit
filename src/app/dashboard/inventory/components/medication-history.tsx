
'use client';

import * as React from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Medication, type Invoice, type Bill } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackageSearch, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type MedicationHistoryProps = {
  medication: Medication;
  openInvoice: (invoice: Invoice) => void;
  openBill: (bill: Bill, fromInventory: boolean, isExpenseOnly: boolean) => void;
};

type HistoryRecord = {
  id: string;
  type: 'in' | 'out';
  date: string;
  quantity: number;
  relatedDocumentText: string;
  party: string; // Patient or supplier
  document: Invoice | Bill;
}

export function MedicationHistory({ medication, openInvoice, openBill }: MedicationHistoryProps) {
  const [history, setHistory] = React.useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsLoading(true);
    let isInitialLoad = true;
    const allRecords: HistoryRecord[] = [];

    const handleHistoryUpdate = (newRecords: HistoryRecord[], type: 'in' | 'out') => {
        const existingRecords = allRecords.filter(r => r.type !== type);
        allRecords.splice(0, allRecords.length, ...existingRecords, ...newRecords);
        allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistory([...allRecords]);
        if (isInitialLoad) {
            setIsLoading(false);
            isInitialLoad = false;
        }
    };
    
    // Listener for sales (out)
    const invoicesRef = collection(db, 'invoices');
    const unsubInvoices = onSnapshot(invoicesRef, (snapshot) => {
      const allInvoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      const salesRecords: HistoryRecord[] = [];
      allInvoices.forEach(invoice => {
        const soldItem = invoice.items.find(item => item.description === medication.name);
        if (soldItem) {
          salesRecords.push({
            id: `out-${invoice.id}`,
            type: 'out',
            date: invoice.date,
            quantity: soldItem.quantity,
            relatedDocumentText: invoice.invoiceNumber,
            party: invoice.patientName,
            document: invoice,
          });
        }
      });
      handleHistoryUpdate(salesRecords, 'out');
      
    }, (error) => {
      console.error("Error fetching sales history:", error);
      toast({ title: 'Error', description: 'No se pudo cargar el historial de ventas.', variant: 'destructive' });
    });

    // Listener for purchases (in)
    const billsRef = collection(db, 'bills');
    const unsubBills = onSnapshot(billsRef, (snapshot) => {
        const allBills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
        const purchaseRecords: HistoryRecord[] = [];
        allBills.forEach(bill => {
            if (bill.category === 'Proveedor' && bill.items) {
                const purchasedItem = bill.items.find(item => item.medicationId === medication.id);
                if (purchasedItem) {
                    purchaseRecords.push({
                        id: `in-${bill.id}`,
                        type: 'in',
                        date: bill.date,
                        quantity: purchasedItem.quantity,
                        relatedDocumentText: bill.description,
                        party: bill.supplier || 'Proveedor desconocido',
                        document: bill,
                    });
                }
            }
        });
        handleHistoryUpdate(purchaseRecords, 'in');
    }, (error) => {
        console.error("Error fetching purchase history:", error);
        toast({ title: 'Error', description: 'No se pudo cargar el historial de compras.', variant: 'destructive' });
    });

    return () => {
      unsubInvoices();
      unsubBills();
    };
  }, [medication.id, medication.name, toast]);

  const handleDocumentClick = (record: HistoryRecord) => {
    if (record.type === 'out') {
      openInvoice(record.document as Invoice);
    } else {
      openBill(record.document as Bill, true, false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-60">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-96 w-full rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Fecha</TableHead>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="text-right w-[100px]">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length > 0 ? (
              history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.date + 'T00:00'), 'PPP')}</TableCell>
                  <TableCell>
                    <div className={cn("flex items-center gap-2 font-medium", record.type === 'in' ? 'text-green-600' : 'text-red-600')}>
                        {record.type === 'in' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                        <span>{record.type === 'in' ? 'Entrada' : 'Salida'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{record.party}</TableCell>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto text-muted-foreground truncate" onClick={() => handleDocumentClick(record)}>
                      {record.relatedDocumentText}
                    </Button>
                  </TableCell>
                  <TableCell className={cn("text-right font-bold", record.type === 'in' ? 'text-green-600' : 'text-red-600')}>
                    {record.type === 'in' ? '+' : '-'} {record.quantity}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center text-center h-40 gap-2">
                        <PackageSearch className="h-10 w-10 text-muted-foreground" />
                        <p className="text-muted-foreground">No se encontraron movimientos para este medicamento.</p>
                    </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
