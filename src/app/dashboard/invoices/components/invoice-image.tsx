'use client';

import * as React from 'react';
import type { Invoice, Patient } from '@/lib/types';

type InvoiceImageProps = {
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

export const InvoiceImage = React.forwardRef<HTMLDivElement, InvoiceImageProps>(
    ({ invoice, patient }, ref) => {
        
        const statusText = invoice.status === 'Paid' ? 'Pagada' : invoice.status === 'Pending' ? 'Pendiente' : 'Vencida';
        const invoiceIdentifier = invoice.invoiceNumber || invoice.id;
        const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/apple-icon.png` : '/apple-icon.png';

        return (
            <div ref={ref} style={{ width: '800px', padding: '40px', backgroundColor: 'white', fontFamily: '"PT Sans", sans-serif', color: '#374151' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #E5E7EB', paddingBottom: '20px', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={logoUrl} alt="Logo del Consultorio" style={{ width: '180px', height: '180px', borderRadius: '8px', objectFit: 'contain' }} />
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Consultorio Médico Integral</h1>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>Calle 160 # 21-47, Bogotá</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>Tel: 3115210015</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>NIT: 79126356-6</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>FACTURA</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{invoiceIdentifier}</p>
                    </div>
                </header>

                <main>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', marginBottom: '40px' }}>
                        <div>
                            <h3 style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>Facturado a</h3>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{patient?.name || invoice.patientName}</p>
                            {patient?.email && <p style={{ margin: '4px 0 0 0' }}>{patient.email}</p>}
                            {patient?.phone && <p style={{ margin: '4px 0 0 0' }}>{patient.phone}</p>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0 }}><strong style={{ color: '#6B7280' }}>Fecha de Factura:</strong> {invoice.date}</p>
                            <p style={{ margin: '4px 0 0 0' }}><strong style={{ color: '#6B7280' }}>Fecha de Vencimiento:</strong> {invoice.date}</p>
                            <p style={{ margin: '4px 0 0 0' }}><strong style={{ color: '#6B7280' }}>Estado:</strong> {statusText}</p>
                        </div>
                    </div>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ backgroundColor: '#F9FAFB' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #E5E7EB' }}>Descripción</th>
                                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #E5E7EB' }}>Cant.</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #E5E7EB' }}>P. Unitario</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #E5E7EB' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, index) => {
                                const isProvided = item.isProvided !== false; // Si no es false explícito, asumimos true
                                
                                return (
                                <tr key={index} style={{ borderBottom: '1px solid #E5E7EB', color: !isProvided ? '#9CA3AF' : 'inherit' }}>
                                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                        <span style={{ textDecoration: !isProvided ? 'line-through' : 'none' }}>{item.description}</span>
                                        {!isProvided && <span style={{ fontSize: '11px', color: '#EF4444', marginLeft: '8px', fontStyle: 'italic' }}>(Pendiente - No entregado)</span>}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center', verticalAlign: 'top' }}>{item.quantity}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', verticalAlign: 'top' }}>{formatCurrency(item.price)}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', verticalAlign: 'top', fontWeight: isProvided ? 'normal' : 'bold' }}>
                                        {isProvided ? formatCurrency(item.price * item.quantity) : '$ 0'}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <div style={{ width: '280px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                <span>Subtotal:</span>
                                <span>{formatCurrency(invoice.amount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 'bold', fontSize: '20px', borderTop: '2px solid #111827', marginTop: '8px' }}>
                                <span>TOTAL:</span>
                                <span>{formatCurrency(invoice.amount)}</span>
                            </div>
                        </div>
                    </div>
                </main>

                <footer style={{ marginTop: '60px', textAlign: 'center', fontSize: '12px', color: '#6B7280', borderTop: '1px solid #E5E7EB', paddingTop: '20px' }}>
                    <p>Gracias por su confianza. Si tiene alguna pregunta sobre esta factura, contáctenos.</p>
                </footer>
            </div>
        )
    }
);

InvoiceImage.displayName = 'InvoiceImage';