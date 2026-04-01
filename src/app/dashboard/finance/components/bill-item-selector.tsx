
'use client';

import * as React from 'react';
import type { Medication, BillItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PlusCircle, Trash2, Package, Pill, Calendar as CalendarIcon } from 'lucide-react';
import { useDialog } from '@/context/dialog-context';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useData } from '@/context/data-context';

type BillItemSelectorProps = {
  initialItems: BillItem[];
  onConfirm: (items: BillItem[]) => void;
  supplierName?: string;
};

type SelectableItem = {
    id: string;
    name: string;
    price: number; // Sale price
    cost: number; // Purchase cost
    stock: number;
}

export function BillItemSelector({ initialItems, onConfirm, supplierName }: BillItemSelectorProps) {
  const [cart, setCart] = React.useState<BillItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { openMedicationDialog, newlyAddedMedication } = useDialog();
  const { allMedications } = useData();
  
  React.useEffect(() => {
    if (newlyAddedMedication) {
        const itemInCart = cart.some(item => item.medicationId === newlyAddedMedication.id);
        if (!itemInCart) {
            setCart(prevCart => [
                ...prevCart,
                { 
                    medicationId: newlyAddedMedication.id, 
                    medicationName: newlyAddedMedication.name, 
                    quantity: 1, 
                    costPerUnit: newlyAddedMedication.cost || 0,
                    expiryDate: format(new Date(), 'yyyy-MM-dd'),
                }
            ]);
        }
    }
  }, [newlyAddedMedication, cart]);

  const allItems: SelectableItem[] = React.useMemo(() => {
    let medicationsToDisplay = allMedications;
    if (supplierName) {
        medicationsToDisplay = allMedications.filter(m => m.supplier === supplierName);
    }
    
    return medicationsToDisplay.map(m => ({ 
        id: m.id, 
        name: m.name, 
        price: m.price, 
        cost: m.cost || 0,
        stock: m.stock || 0,
    })).sort((a, b) => a.name.localeCompare(b.name));
   }, [allMedications, supplierName]);
  
  const filteredItems = React.useMemo(() => {
      if (!searchQuery) return allItems;
      return allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allItems, searchQuery]);


  const addToCart = (item: SelectableItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.medicationId === item.id);
      if (existingItem) {
        return prevCart.map(cartItem => 
          cartItem.medicationId === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { medicationId: item.id, medicationName: item.name, quantity: 1, costPerUnit: item.cost, expiryDate: format(new Date(), 'yyyy-MM-dd') }];
      }
    });
  };

  const updateItem = (medicationId: string, field: 'quantity' | 'costPerUnit' | 'expiryDate', value: number | string) => {
    setCart(prevCart => {
      let processedValue = value;
      if (field === 'quantity' || field === 'costPerUnit') {
        const numValue = typeof value === 'string' ? (field === 'quantity' ? parseInt(value, 10) : parseFloat(value)) : value;
        processedValue = isNaN(numValue) ? 0 : numValue;
      }

      return prevCart.map(item =>
        item.medicationId === medicationId
          ? { ...item, [field]: processedValue }
          : item
      );
    });
  };

  const removeFromCart = (medicationId: string) => {
    setCart(prevCart => prevCart.filter(item => item.medicationId !== medicationId));
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const totalAmount = cart.reduce((acc, item) => acc + item.costPerUnit * item.quantity, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 flex-1">
        {/* Left Side: Item list */}
        <div className="flex flex-col gap-4 min-h-0">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Buscar medicamentos existentes..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
             <Button variant="outline" className="w-full gap-2" onClick={() => openMedicationDialog(null, true, supplierName)}>
                <Pill className="h-4 w-4" />
                Crear Nuevo Medicamento
            </Button>
            <ScrollArea className="flex-grow border rounded-md">
                <div className="p-2 space-y-2">
                    {filteredItems.map(item => (
                         <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                            <p className="font-medium">{item.name}</p>
                            <Button size="sm" onClick={() => addToCart(item)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                            </Button>
                        </div>
                    ))}
                    {filteredItems.length === 0 && (
                        <p className="text-center text-muted-foreground p-4">
                            {supplierName ? 'No se encontraron medicamentos para este proveedor.' : 'No se encontraron medicamentos.'}
                        </p>
                    )}
                </div>
            </ScrollArea>
        </div>

        {/* Right Side: Cart */}
        <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-0">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5"/>
                Items de la Compra
            </h3>
            <ScrollArea className="flex-grow min-h-0">
                 <div className="space-y-3">
                    {cart.map(item => {
                        const medicationDetails = allItems.find(med => med.id === item.medicationId);
                        const currentStock = medicationDetails ? medicationDetails.stock : 0;
                        return (
                        <div key={item.medicationId} className="space-y-2 text-sm p-3 bg-muted rounded-md">
                            <div className="flex justify-between items-center">
                                <p className="font-medium">{item.medicationName}</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.medicationId)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Cantidad Recibida</label>
                                    <p className="text-xs text-muted-foreground">Stock actual: {currentStock}</p>
                                    <Input 
                                      type="number"
                                      value={item.quantity || ''}
                                      onChange={(e) => updateItem(item.medicationId, 'quantity', e.target.value)}
                                      className="h-8"
                                      min="1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Costo Unitario</label>
                                     <p className="text-xs text-muted-foreground">&nbsp;</p>
                                    <Input 
                                      type="number"
                                      value={item.costPerUnit || ''}
                                      onChange={(e) => updateItem(item.medicationId, 'costPerUnit', e.target.value)}
                                      className="h-8"
                                      min="0"
                                    />
                                </div>
                            </div>
                             <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Fecha de Vencimiento del Lote</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn(
                                                'w-full justify-start text-left font-normal h-8',
                                                !item.expiryDate && 'text-muted-foreground'
                                            )}
                                            >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {item.expiryDate ? format(new Date(item.expiryDate + 'T00:00:00'), 'PPP') : <span>Seleccionar fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                        mode="single"
                                        selected={new Date(item.expiryDate + 'T00:00:00')}
                                        onSelect={(date) => date && updateItem(item.medicationId, 'expiryDate', format(date, 'yyyy-MM-dd'))}
                                        captionLayout="dropdown"
                                        fromYear={new Date().getFullYear()}
                                        toYear={new Date().getFullYear() + 20}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        )
                    })}
                     {cart.length === 0 && (
                        <p className="text-center text-muted-foreground pt-10">No hay items en la compra.</p>
                     )}
                 </div>
            </ScrollArea>
            <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center font-bold text-lg">
                    <span>Costo Total:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                </div>
                <Button className="w-full" size="lg" onClick={() => onConfirm(cart)}>
                    Confirmar Items
                </Button>
            </div>
        </div>
    </div>
  );
}
