
'use client';

import * as React from 'react';
import type { Invoice, Patient } from '@/lib/types';
import * as htmlToImage from 'html-to-image';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageIcon, Loader2, Printer } from 'lucide-react';
import { InvoiceImage } from './invoice-image';
import { InvoiceReceipt } from './invoice-receipt';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type InvoiceDetailsProps = {
  invoice: Invoice;
  patient?: Patient;
  onDone: () => void;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};


// Function to fetch and inline font styles
const getFontEmbedCSS = async () => {
    const fontUrl = 'https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap';
    try {
        const response = await fetch(fontUrl);
        const cssText = await response.text();

        const fontFaces = await Promise.all(
            (cssText.match(/@font-face\s*{[^}]+}/g) || []).map(async (rule: string) => {
                const urlMatch = rule.match(/url\(([^)]+)\)/);
                if (!urlMatch) return rule;

                const fontUrl = urlMatch[1].replace(/"/g, '');
                const fontResponse = await fetch(fontUrl);
                const fontBuffer = await fontResponse.arrayBuffer();
                const base64Font = btoa(new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                
                return rule.replace(urlMatch[0], `url(data:${fontResponse.headers.get('content-type')};base64,${base64Font})`);
            })
        );

        return fontFaces.join('\n');
    } catch (error) {
        console.error("Failed to fetch and embed fonts:", error);
        return '';
    }
};


export function InvoiceDetails({ invoice, onDone, patient }: InvoiceDetailsProps) {
  const invoiceImageRef = React.useRef<HTMLDivElement>(null);
  const invoiceReceiptRef = React.useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = React.useState(false);
  const { toast } = useToast();
  const invoiceIdentifier = invoice.invoiceNumber || invoice.id;
  
  const generateAndOpenImage = async (ref: React.RefObject<HTMLDivElement>, width: number, title: string) => {
      if (!ref.current) {
        toast({
            title: "Error al generar imagen",
            description: "No se pudo encontrar la plantilla de la factura.",
            variant: "destructive",
        })
      return;
    }

    setIsGenerating(true);
    try {
        const fontEmbedCss = await getFontEmbedCSS();
        
        const dataUrl = await htmlToImage.toPng(ref.current, { 
            cacheBust: true,
            fontEmbedCSS: fontEmbedCss,
            width,
        });
        const newWindow = window.open();
        newWindow?.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { margin: 0; background-color: #f0f4f7; display: flex; justify-content: center; align-items: flex-start; padding-top: 2rem; padding-bottom: 2rem; min-height: 100vh; }
                        img { max-width: 100%; height: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    </style>
                </head>
                <body>
                    <img src="${dataUrl}" alt="${title}" />
                </body>
            </html>
        `);
    } catch(err) {
        console.error('oops, something went wrong!', err);
         toast({
            title: "Error al generar imagen",
            description: "Ocurrió un problema al crear la imagen. Por favor, inténtalo de nuevo.",
            variant: "destructive",
        })
    } finally {
        setIsGenerating(false);
    }
  }

  const handleGenerateImage = () => generateAndOpenImage(invoiceImageRef, 800, `Factura ${invoiceIdentifier}`);
  const handlePrintReceipt = () => generateAndOpenImage(invoiceReceiptRef, 320, `Recibo ${invoiceIdentifier}`);


  return (
    <>
      {/* Hidden components for image generation */}
      <div className="absolute -left-[9999px] top-0">
           <InvoiceImage ref={invoiceImageRef} invoice={invoice} patient={patient} />
           <InvoiceReceipt ref={invoiceReceiptRef} invoice={invoice} patient={patient} />
      </div>

      <div className="space-y-4">
        {/* Info del paciente */}
        <div className="space-y-1">
          <p><span className="text-sm font-semibold text-muted-foreground">Paciente: </span>{invoice.patientName}</p>
          <p><span className="text-sm font-semibold text-muted-foreground">Fecha: </span>{invoice.date}</p>
           <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Estado: </span>
            <Badge
              variant={
                invoice.status === 'Paid'
                  ? 'default'
                  : invoice.status === 'Pending'
                  ? 'secondary'
                  : 'destructive'
              }
              className={cn(
                'capitalize',
                invoice.status === 'Paid' && 'bg-green-100 text-green-800',
                invoice.status === 'Pending' && 'bg-yellow-100 text-yellow-800'
              )}
            >
              {invoice.status === 'Paid' ? 'Pagada' : invoice.status === 'Pending' ? 'Pendiente' : 'Vencida'}
            </Badge>
          </div>
        </div>

        {/* Tabla con scroll si se pasa */}
        <div className="w-full overflow-x-auto rounded-md border">
            <table className="w-full table-fixed text-sm">
                <thead className="bg-muted/50">
                <tr>
                    <th className="px-4 py-2 text-left font-semibold w-1/2">Descripción</th>
                    <th className="px-4 py-2 text-center font-semibold w-[70px]">Cant.</th>
                    <th className="px-4 py-2 text-right font-semibold w-[100px]">P. Unit.</th>
                    <th className="px-4 py-2 text-right font-semibold w-[110px]">Subtotal</th>
                </tr>
                </thead>
                <tbody>
                {invoice.items.map((item, index) => (
                    <tr key={index} className="border-t">
                        <td className="px-4 py-2 break-words font-medium">{item.description}</td>
                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>


        {/* Total */}
        <div className="flex justify-end text-lg font-bold">
          <span>Total: {formatCurrency(invoice.amount)}</span>
        </div>
      </div>
          
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          Genera una imagen o un recibo para imprimir.
        </p>
        <div className="flex w-full sm:w-auto justify-end gap-2">
          <Button onClick={onDone} variant="outline" className="w-full sm:w-auto">Listo</Button>
           <Button onClick={handleGenerateImage} disabled={isGenerating} className="w-full sm:w-auto">
              {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                  <ImageIcon className="mr-2 h-4 w-4" />
              )}
              Crear Imagen
          </Button>
          <Button onClick={handlePrintReceipt} disabled={isGenerating} className="w-full sm:w-auto">
              {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                  <Printer className="mr-2 h-4 w-4" />
              )}
              Imprimir Recibo
          </Button>
        </div>
      </div>
    </>
  );
}
