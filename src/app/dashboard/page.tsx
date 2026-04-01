'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarCheck,
  PackageOpen,
  Users,
  CreditCard,
  Loader2,
} from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Invoice, type Appointment } from '@/lib/types';
import { collection, query, where, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/context/data-context';


export default function DashboardPage() {
    const { allPatients, allMedications, isLoading, allUsers } = useData();
    const { toast } = useToast();
    const [recentInvoices, setRecentInvoices] = React.useState<Invoice[]>([]);
    const [todaysAppointments, setTodaysAppointments] = React.useState<Appointment[]>([]);
    const [isAppointmentsLoading, setIsAppointmentsLoading] = React.useState(true);
    
    React.useEffect(() => {
        const qInvoices = query(collection(db, 'invoices'), orderBy('date', 'desc'), limit(5));
        const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
            setRecentInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
        }, (error) => {
             console.error(`Error fetching recent invoices: `, error);
             toast({ title: `Error al cargar facturas recientes`, description: 'No se pudieron obtener los datos.', variant: 'destructive' });
        });
        
        const qAppointments = query(collection(db, 'appointments'), where('date', '==', format(new Date(), 'yyyy-MM-dd')));
        const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
            setTodaysAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
            setIsAppointmentsLoading(false);
        }, (error) => {
            console.error(`Error fetching today's appointments: `, error);
            toast({ title: `Error al cargar citas de hoy`, description: 'No se pudieron obtener los datos.', variant: 'destructive' });
            setIsAppointmentsLoading(false);
        });

        return () => {
            unsubInvoices();
            unsubAppointments();
        };
    }, [toast]);
    
    if (isLoading || isAppointmentsLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    
  const lowStockMedication = allMedications.filter(m => m.stock < m.lowStockThreshold);
  
  const pendingInvoices = recentInvoices.filter(i => i.status === 'Pending');
  
  const pendingTodaysAppointments = todaysAppointments.filter(apt => apt.status !== 'Completada' && apt.status !== 'Cancelada');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel de Control</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Link href="/dashboard/appointments">
          <Card className="hover:bg-card/90 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Citas de Hoy
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTodaysAppointments.length}</div>
              <p className="text-xs text-muted-foreground">
                pendientes para hoy
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/inventory">
          <Card className="hover:bg-card/90 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Artículos con Stock Bajo
              </CardTitle>
              <PackageOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockMedication.length}</div>
              <p className="text-xs text-muted-foreground">
                medicamentos necesitan ser reordenados
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/invoices">
          <Card className="hover:bg-card/90 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingInvoices.length}
              </div>
              <p className="text-xs text-muted-foreground">
                esperando pago (de las últimas 5)
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/patients">
          <Card className="hover:bg-card/90 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pacientes Totales</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allPatients.length}</div>
              <p className="text-xs text-muted-foreground">
                registrados en el sistema
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Próximas Citas</CardTitle>
              <CardDescription>
                Aquí están las citas pendientes para hoy.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/appointments">
                Ver Todas
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="text-right">Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTodaysAppointments.slice(0, 5).map(appointment => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <div className="font-medium">{appointment.patientName}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">{appointment.time}</div>
                    </TableCell>
                  </TableRow>
                ))}
                 {pendingTodaysAppointments.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center">
                            No hay citas pendientes para hoy.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Facturas Recientes</CardTitle>
              <CardDescription>
                Un resumen de las facturas recientes de los pacientes.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/invoices">
                Ver Todas
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Factura</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map(invoice => (
                  <TableRow key={invoice.id}>
                     <TableCell className="font-medium">
                       {invoice.invoiceNumber || invoice.id}
                     </TableCell>
                    <TableCell>
                      <div className="font-medium">{invoice.patientName}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          invoice.status === 'Paid'
                            ? 'default'
                            : invoice.status === 'Pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className="capitalize"
                      >
                        {invoice.status === 'Paid' ? 'Pagada' : invoice.status === 'Pending' ? 'Pendiente' : 'Vencida'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                 {recentInvoices.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No hay facturas recientes.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
