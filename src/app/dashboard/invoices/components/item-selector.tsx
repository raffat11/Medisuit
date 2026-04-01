'use client';

import * as React from 'react';
import type { Medication, Service, InvoiceItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PlusCircle, MinusCircle, Trash2, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ItemSelectorProps = {
  medications: Medication[];
  services: Service[];
  initialItems: InvoiceItem[];
  onConfirm: (items: InvoiceItem[]) => void;
};

type SelectableItem = {
    name: string;
    price: number;
    stock?: number;
    type: 'medication' | 'service';
}

const CONSULTA_GENERAL = 'Consulta General';

export function ItemSelector({ medications, services, initialItems, onConfirm }: ItemSelectorProps) {
  const [cart, setCart] = React.useState<InvoiceItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = React.useState('');

  const allItems: SelectableItem[] = React.useMemo(() => {
    const combinedItems = [
      ...medications.map(m => ({ 
          name: m.name, 
          price: m.price, 
          stock: m.stock, 
          type: 'medication' as const 
      })),
      ...services.map(s => ({ name: s.name, price: s.price, type: 'service' as const })),
    ];
    return combinedItems.sort((a, b) => {
        if (a.name === CONSULTA_GENERAL) return -1;
        if (b.name === CONSULTA_GENERAL) return 1;
        return a.name.localeCompare(b.name);
    });
  }, [medications, services]);
  
  const filteredItems = React.useMemo(() => {
      if (!searchQuery) return allItems;
      return allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allItems, searchQuery]);


  const addToCart = (item: SelectableItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.description === item.name);
      if (existingItem) {
        return prevCart.map(cartItem => 
          cartItem.description === item.name 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { description: item.name, price: item.price, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (description: string, change: 1 | -1) => {
    setCart(prevCart => {
      return prevCart.map(item =>
        item.description === description
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      ).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (description: string) => {
    setCart(prevCart => prevCart.filter(item => item.description !== description));
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const totalAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 flex-1">
        {/* Left Side: Item list */}
        <div className="flex flex-col gap-4 min-h-0">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Buscar medicamentos o servicios..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <ScrollArea className="flex-grow border rounded-md">
                <div className="p-2 space-y-2">
                    {filteredItems.map((item, index) => (
                         <div key={`${item.type}-${item.name}-${index}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                            <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {item.type === 'medication' && (
                                     <Badge variant={item.stock && item.stock > 0 ? 'secondary' : 'destructive'}>
                                        Stock: {item.stock || 0}
                                     </Badge>
                                )}
                                <Button size="sm" onClick={() => addToCart(item)} disabled={item.type === 'medication' && (!item.stock || item.stock <= 0)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                                </Button>
                            </div>
                        </div>
                    ))}
                    {filteredItems.length === 0 && (
                        <p className="text-center text-muted-foreground p-4">No se encontraron items.</p>
                    )}
                </div>
            </ScrollArea>
        </div>

        {/* Right Side: Cart */}
        <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-0">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5"/>
                Items de la Factura
            </h3>
            <ScrollArea className="flex-grow min-h-0">
                 <div className="space-y-3">
                    {cart.map(item => (
                        <div key={item.description} className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                            <div className="flex-grow">
                                <p className="font-medium">{item.description}</p>
                                <p className="text-muted-foreground">{formatCurrency(item.price)}</p>
                            </div>
                             <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.description, -1)}>
                                    <MinusCircle className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.description, 1)}>
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.description)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                     {cart.length === 0 && (
                        <p className="text-center text-muted-foreground pt-10">El carrito está vacío.</p>
                     )}
                 </div>
            </ScrollArea>
            <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total:</span>
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