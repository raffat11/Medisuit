
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PlusCircle, Check } from 'lucide-react';
import type { Medication } from '@/lib/types';
import { useDialog } from '@/context/dialog-context';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

type MedicationSelectorProps = {
    onSelectMedication: (medication: Medication) => void;
    excludedMedicationIds?: string[];
};

export function MedicationSelector({ onSelectMedication, excludedMedicationIds = [] }: MedicationSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [allMedications, setAllMedications] = React.useState<Medication[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'medications'), (snapshot) => {
        setAllMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)))
    }, (error) => {
        console.error("Error fetching medications: ", error);
        toast({ title: 'Error', description: 'No se pudieron cargar los medicamentos.', variant: 'destructive'});
    });
    return () => unsub();
  }, [toast]);

  const sortedMedications = React.useMemo(() => {
    return [...allMedications].sort((a,b) => a.name.localeCompare(b.name));
  }, [allMedications]);

  const filteredMedications = React.useMemo(() => {
      if (!searchQuery) return sortedMedications;
      return sortedMedications.filter(med => med.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, sortedMedications]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-4 min-h-0">
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Buscar medicamento..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <ScrollArea className="h-72 w-full rounded-md border">
            <div className="p-2 space-y-2">
                {filteredMedications.map(med => {
                    const isExcluded = excludedMedicationIds.includes(med.id);
                    return (
                        <div key={med.id} className={cn("flex items-center justify-between p-2 rounded-md", isExcluded ? "opacity-50" : "hover:bg-muted/50 cursor-pointer")} onClick={() => !isExcluded && onSelectMedication(med)}>
                            <div>
                                <p className="font-medium">{med.name}</p>
                                <p className="text-sm text-muted-foreground">{formatCurrency(med.price)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={med.stock > med.lowStockThreshold ? 'secondary' : 'destructive'}>
                                    Stock: {med.stock}
                                </Badge>
                                {isExcluded ? (
                                    <Button size="sm" disabled>
                                        <Check className="mr-2 h-4 w-4" /> Añadido
                                    </Button>
                                ) : (
                                     <Button size="sm" variant="outline">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
                 {filteredMedications.length === 0 && (
                    <p className="text-center text-muted-foreground p-4">No se encontraron medicamentos.</p>
                )}
            </div>
        </ScrollArea>
    </div>
  );
}
