'use client';

import * as React from 'react';
import type { Invoice, Patient } from '@/lib/types';

type InvoiceReceiptProps = {
  invoice: Invoice;
  patient?: Patient;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const InvoiceReceipt = React.forwardRef<HTMLDivElement, InvoiceReceiptProps>(
    ({ invoice, patient }, ref) => {
        
        const statusText = invoice.status === 'Paid' ? 'Pagada' : invoice.status === 'Pending' ? 'Pendiente' : 'Vencida';
        const invoiceIdentifier = invoice.invoiceNumber || invoice.id;
        const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/apple-icon.png` : '/apple-icon.png';

        return (
            <div ref={ref} style={{ width: '320px', padding: '20px', backgroundColor: 'white', fontFamily: '"PT Sans", sans-serif', color: '#374151', fontSize: '12px' }}>
                <header style={{ textAlign: 'center', borderBottom: '1px dashed #9CA3AF', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                         <img src={logoUrl} alt="Logo del Consultorio" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Consultorio Médico Integral</h1>
                    <p style={{ margin: '0', fontSize: '11px' }}>Calle 160 # 21-47, Bogotá</p>
                    <p style={{ margin: '0', fontSize: '11px' }}>Tel: 3115210015</p>
                    <p style={{ margin: '0', fontSize: '11px' }}>NIT: 79126356-6</p>
                </header>

                <main>
                    <div style={{ marginBottom: '10px' }}>
                        <p style={{ margin: '0' }}><strong>Recibo Nº:</strong> {invoiceIdentifier}</p>
                        <p style={{ margin: '0' }}><strong>Fecha:</strong> {invoice.date}</p>
                        <p style={{ margin: '0' }}><strong>Estado:</strong> {statusText}</p>
                    </div>

                    <div style={{ borderTop: '1px dashed #9CA3AF', paddingTop: '10px', marginBottom: '10px' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Cliente:</h2>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>{patient?.name || invoice.patientName}</p>
                    </div>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', borderTop: '1px dashed #9CA3AF', borderBottom: '1px dashed #9CA3AF', padding: '5px 0' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '5px 2px', textAlign: 'left', fontWeight: 'bold' }}>Item</th>
                                <th style={{ padding: '5px 2px', textAlign: 'center', fontWeight: 'bold' }}>Cant</th>
                                <th style={{ padding: '5px 2px', textAlign: 'right', fontWeight: 'bold' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, index) => {
                                const isProvided = item.isProvided !== false; // Lógica del interruptor
                                
                                return (
                                <tr key={index} style={{ color: !isProvided ? '#9CA3AF' : 'inherit' }}>
                                    <td style={{ padding: '2px', wordBreak: 'break-word' }}>
                                        <span style={{ textDecoration: !isProvided ? 'line-through' : 'none' }}>{item.description}</span>
                                        {!isProvided && <div style={{ fontSize: '9px', color: '#EF4444' }}>(No entregado)</div>}
                                    </td>
                                    <td style={{ padding: '2px', textAlign: 'center', verticalAlign: 'top' }}>{item.quantity}</td>
                                    <td style={{ padding: '2px', textAlign: 'right', verticalAlign: 'top' }}>
                                        {isProvided ? formatCurrency(item.price * item.quantity) : '$ 0'}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div style={{ marginTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '5px', borderTop: '1px solid #374151', borderBottom: '1px solid #374151' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>TOTAL:</span>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(invoice.amount)}</span>
                        </div>
                    </div>
                </main>

                <footer style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#6B7280', borderTop: '1px dashed #9CA3AF', paddingTop: '10px' }}>
                    <p style={{margin: '0'}}>Gracias por su confianza.</p>
                </footer>
            </div>
        )
    }
);

InvoiceReceipt.displayName = 'InvoiceReceipt';