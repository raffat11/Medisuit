
'use client';

import * as React from 'react';
import type { Bill } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Pill, Stethoscope, HandCoins } from 'lucide-react';

type DailySummaryProps = {
    data: {
        incomeFromServices: number;
        incomeFromMedications: number;
        todayExpenses: Bill[];
    } | null;
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount);
};

export function DailySummary({ data }: DailySummaryProps) {
    if (!data) {
        return (
            <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">No hay datos para mostrar.</p>
            </div>
        );
    }
    
    const { incomeFromServices, incomeFromMedications, todayExpenses } = data;
    const totalIncome = incomeFromServices + incomeFromMedications;
    const totalExpenses = todayExpenses.reduce((acc, bill) => acc + bill.amount, 0);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Ingresos Totales del Día: {formatCurrency(totalIncome)}
                </h3>
                <div className="pl-7 space-y-1 text-muted-foreground">
                    <p className="flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Servicios: <span className="font-medium text-foreground">{formatCurrency(incomeFromServices)}</span></p>
                    <p className="flex items-center gap-2"><Pill className="h-4 w-4" /> Medicamentos: <span className="font-medium text-foreground">{formatCurrency(incomeFromMedications)}</span></p>
                </div>
            </div>

            <Separator />

            <div>
                 <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    Gastos Totales del Día: {formatCurrency(totalExpenses)}
                </h3>
                <ScrollArea className="h-48 w-full rounded-md border">
                    <div className="p-2 space-y-2">
                    {todayExpenses.length > 0 ? (
                        todayExpenses.map(bill => (
                            <div key={bill.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                                <div className="flex items-center gap-2">
                                     <HandCoins className="h-4 w-4 text-muted-foreground" />
                                     <div>
                                        <p className="font-medium text-sm">{bill.description}</p>
                                        <p className="text-xs text-muted-foreground">{bill.category}</p>
                                     </div>
                                </div>
                                <p className="font-medium text-sm text-destructive">
                                    -{formatCurrency(bill.amount)}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full p-4">
                            <p className="text-sm text-muted-foreground">No se registraron gastos hoy.</p>
                        </div>
                    )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
