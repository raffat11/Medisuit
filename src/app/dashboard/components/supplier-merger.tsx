'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Combine } from 'lucide-react';
import type { Medication } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type SupplierMergerProps = {
  allMedications: Medication[];
  onMerge: (suppliersToMerge: string[], newName: string) => Promise<void>;
  onCancel: () => void;
};

export function SupplierMerger({ allMedications, onMerge, onCancel }: SupplierMergerProps) {
  const [selectedSuppliers, setSelectedSuppliers] = React.useState<string[]>([]);
  const [newSupplierName, setNewSupplierName] = React.useState('');
  const [isMerging, setIsMerging] = React.useState(false);
  const { toast } = useToast();

  const uniqueSuppliers = React.useMemo(() => {
    const suppliers = new Set(allMedications.map(med => med.supplier));
    return Array.from(suppliers).sort();
  }, [allMedications]);

  const handleToggleSupplier = (supplier: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(supplier)
        ? prev.filter(s => s !== supplier)
        : [...prev, supplier]
    );
  };

  const handleMergeClick = async () => {
    if (selectedSuppliers.length < 1) {
      toast({ title: 'Selección Requerida', description: 'Debes seleccionar al menos un proveedor para fusionar.', variant: 'destructive' });
      return;
    }
    if (!newSupplierName.trim()) {
      toast({ title: 'Nombre Requerido', description: 'Por favor, introduce un nuevo nombre final para el proveedor.', variant: 'destructive' });
      return;
    }

    setIsMerging(true);
    await onMerge(selectedSuppliers, newSupplierName);
    setIsMerging(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>1. Selecciona los proveedores a fusionar</Label>
        <ScrollArea className="h-48 w-full rounded-md border p-2 mt-2">
          <div className="space-y-2">
            {uniqueSuppliers.map(supplier => (
              <div key={supplier} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                <Checkbox
                  id={`supplier-${supplier}`}
                  checked={selectedSuppliers.includes(supplier)}
                  onCheckedChange={() => handleToggleSupplier(supplier)}
                />
                <Label htmlFor={`supplier-${supplier}`} className="flex-1 cursor-pointer">
                  {supplier}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {selectedSuppliers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="new-supplier-name">2. Introduce el nuevo nombre final del proveedor</Label>
          <Input
            id="new-supplier-name"
            value={newSupplierName}
            onChange={e => setNewSupplierName(e.target.value)}
            placeholder="Ej: Proveedor Unificado S.A.S"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isMerging}>
          Cancelar
        </Button>
        <Button onClick={handleMergeClick} disabled={isMerging || selectedSuppliers.length === 0 || !newSupplierName.trim()}>
          {isMerging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Combine className="mr-2 h-4 w-4" />}
          Fusionar Seleccionados
        </Button>
      </div>
    </div>
  );
}
