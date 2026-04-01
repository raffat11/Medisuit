'use client';

import * as React from 'react';
import { useDialog } from '@/context/dialog-context';
import { useData } from '@/context/data-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppointmentForm } from '@/app/dashboard/appointments/components/appointment-form';
import { ClinicalSessionClient } from '@/app/dashboard/appointments/components/appointment-details';
import { PatientForm } from '@/app/dashboard/patients/components/patient-form';
import { MedicationForm } from '@/app/dashboard/inventory/components/medication-form';
import { ServiceForm } from '@/app/dashboard/inventory/components/service-form';
import { MedicationSelector } from '@/app/dashboard/appointments/[id]/components/medication-selector';
import { PatientSelector } from '@/app/dashboard/invoices/components/patient-selector';
import { ItemSelector } from '@/app/dashboard/invoices/components/item-selector';
import { InvoiceForm } from '@/app/dashboard/invoices/components/invoice-form';
import { InvoiceDetails } from '@/app/dashboard/invoices/components/invoice-details';
import { BillForm } from '@/app/dashboard/finance/components/bill-form';
import { BillItemSelector } from '@/app/dashboard/finance/components/bill-item-selector';
import { type Patient, type Appointment, type Medication, type Service, type Invoice, type Bill, type ClinicalNote } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, addDoc, updateDoc, doc, where, query, onSnapshot, runTransaction, getCountFromServer, writeBatch, increment, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SupplierMerger } from './supplier-merger';
import { DailySummary } from '../finance/components/daily-summary';
import { MedicationHistory } from '../inventory/components/medication-history';
import { format } from 'date-fns';

export function GlobalDialogs() {
    const { 
        isAppointmentOpen, closeAppointmentDialog, appointmentData, setConflictingTime,
        isPatientOpen, closePatientDialog, patientData, fromAppointmentFlow,
        isMedicationOpen, closeMedicationDialog, medicationData, fromBillItemSelector,
        isServiceOpen, closeServiceDialog, serviceData,
        
        isAppointmentViewOpen, closeAppointmentViewDialog, appointmentViewData,
        setIsAppointmentOpen, setIsPatientOpen,
        
        isInvoiceOpen, closeInvoiceDialog, invoiceData, invoicePrefillData,
        isInvoiceViewOpen, closeInvoiceViewDialog, invoiceViewData,
        
        isBillOpen, openBillDialog, closeBillDialog, billData, billFromInventory, isBillExpenseOnly,
        
        isPatientSelectorOpen, closePatientSelector, onSelectPatient,
        isItemSelectorOpen, closeItemSelector, setSelectedItemsForInvoice, initialItemsForSelector,
        isBillItemSelectorOpen, closeBillItemSelector, setSelectedItemsForBill, initialItemsForBillSelector, billItemSelectorSupplier,

        isMedicationSelectorOpen, closeMedicationSelector, onSelectMedicationForPrescription, excludedMedicationIds,

        isSupplierMergeOpen, closeSupplierMergeDialog, handleMergeSuppliers,

        isDailySummaryOpen, closeDailySummaryDialog, dailySummaryData,

        isMedicationHistoryOpen, openInvoiceViewDialog, closeMedicationHistoryDialog, medicationHistoryData,

        newlyAddedPatient,
    } = useDialog();

    const { allPatients, allMedications, allServices } = useData();
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();
    
    const doctorName = 'Dr. Emily Carter';

    const handleSavePatient = async (data: Omit<Patient, 'id' | 'isBlacklisted'>) => {
        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, "patients"), { ...data, isBlacklisted: false });
            const newPatient = { id: docRef.id, ...data, isBlacklisted: false };
            toast({ title: 'Paciente Agregado', description: 'El nuevo paciente ha sido registrado.' });
            closePatientDialog({ reopenAppointment: fromAppointmentFlow, newPatient: newPatient });
        } catch (error) {
            console.error("Error adding patient:", error);
            toast({ title: 'Error', description: 'No se pudo registrar al paciente.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
     const handleUpdatePatient = async (data: Omit<Patient, 'id' | 'isBlacklisted'>) => {
        if (!patientData) return;
        setIsLoading(true);
        try {
            const patientDoc = doc(db, "patients", patientData.id);
            await updateDoc(patientDoc, data);
            toast({ title: 'Paciente Actualizado', description: 'Los datos del paciente han sido actualizados.' });
            closePatientDialog({});
        } catch (error) {
            console.error("Error updating patient: ", error);
            toast({ title: 'Error', description: 'No se pudo actualizar el paciente.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAppointment = async (data: Omit<Appointment, 'id' | 'doctorName' | 'status'>, patient: Patient) => {
        setIsLoading(true);
        const isEditing = !!appointmentData;
        const appointmentDate = (data.date as any) instanceof Date ? format(data.date, 'yyyy-MM-dd') : data.date;

        if (!data.isPriority) {
            const q = query(collection(db, "appointments"), 
                where("date", "==", appointmentDate), 
                where("time", "==", data.time),
                where("status", "in", ["Programada", "Confirmada"])
            );
            const querySnapshot = await getDocs(q);
            
            let conflict = false;
            querySnapshot.forEach((doc) => {
                if (!isEditing || doc.id !== appointmentData.id) {
                    conflict = true;
                }
            });

            if (conflict) {
                setConflictingTime(data.time);
                toast({
                    title: 'Horario Ocupado',
                    description: `Ya existe una cita programada a las ${format(new Date(`1970-01-01T${data.time}`), 'hh:mm a')} en esta fecha. Puede marcarla como prioritaria para omitir.`,
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }
        }

        try {
            const appointmentPayload = { 
                ...data, 
                date: appointmentDate,
                patientId: patient.id,
                patientName: patient.name,
                doctorName, 
                status: 'Programada' as const 
            };
            
            if (isEditing) {
                const appointmentDoc = doc(db, "appointments", appointmentData.id);
                await updateDoc(appointmentDoc, appointmentPayload);
                toast({ title: 'Cita Actualizada', description: 'La cita ha sido actualizada exitosamente.' });
            } else {
                await addDoc(collection(db, "appointments"), appointmentPayload);
                toast({ title: 'Cita Creada', description: 'La nueva cita ha sido agendada.' });
            }
            closeAppointmentDialog();
        } catch(error) {
            console.error("Error saving appointment:", error);
            toast({ title: 'Error', description: 'No se pudo guardar la cita.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const generateInvoiceNumber = async (): Promise<string> => {
        const coll = collection(db, 'invoices');
        const snapshot = await getCountFromServer(coll);
        const count = snapshot.data().count;
        const newNumber = count + 1;
        return `INV-${newNumber.toString().padStart(5, '0')}`;
    };

    const handleSaveInvoice = async (data: Omit<Invoice, 'id' | 'invoiceNumber'>) => {
        setIsLoading(true);
        let newInvoiceObj: Invoice | null = null;
        const isEditing = !!invoiceData;
        const invoiceDate = (data.date as any) instanceof Date ? format(data.date, 'yyyy-MM-dd') : data.date;
        try {
          await runTransaction(db, async (transaction) => {
            const originalInvoiceDoc = isEditing 
                ? await transaction.get(doc(db, 'invoices', invoiceData.id)) 
                : null;

            if (isEditing && !originalInvoiceDoc?.exists()) {
                throw new Error("La factura original no fue encontrada.");
            }

            for (const item of data.items) {
                const med = allMedications.find(m => m.name === item.description);
                if (med) {
                    const medDoc = await transaction.get(doc(db, 'medications', med.id));
                    if (!medDoc.exists()) throw new Error(`Medicamento "${item.description}" no encontrado.`);
                    
                    const originalInvoiceData = originalInvoiceDoc?.data() as Invoice | undefined;
                    const originalQuantity = originalInvoiceData?.items.find(i => i.description === item.description)?.quantity || 0;
                    const currentStock = (medDoc.data() as Medication).stock;
                    
                    if (item.quantity > currentStock + (isEditing ? originalQuantity : 0)) {
                         throw new Error(`No hay suficiente stock para "${item.description}".`);
                    }
                }
            }
    
            if (isEditing) {
              const originalInvoice = originalInvoiceDoc!.data() as Invoice;
              for (const item of originalInvoice.items) {
                const med = allMedications.find(m => m.name === item.description);
                if (med) {
                  const medRef = doc(db, 'medications', med.id);
                  transaction.update(medRef, { stock: increment(item.quantity) });
                }
              }
            }
    
            for (const item of data.items) {
              const med = allMedications.find(m => m.name === item.description);
              if (med) {
                const medRef = doc(db, 'medications', med.id);
                transaction.update(medRef, { stock: increment(-item.quantity) });
              }
            }
    
            if (isEditing) {
              const invoiceDoc = doc(db, "invoices", invoiceData.id);
              transaction.update(invoiceDoc, {...data, date: invoiceDate});
            } else {
              const invoiceNumber = await generateInvoiceNumber();
              const payload: Omit<Invoice, 'id'> = { ...data, date: invoiceDate, invoiceNumber };
              const newInvoiceRef = doc(collection(db, "invoices"));
              transaction.set(newInvoiceRef, payload);
              newInvoiceObj = { id: newInvoiceRef.id, ...payload };
            }
          });
    
          toast({ title: 'Factura Guardada', description: 'La operación se completó exitosamente.' });
          closeInvoiceDialog();
          if (newInvoiceObj) {
            setTimeout(() => { openInvoiceViewDialog(newInvoiceObj!); }, 150);
          }
    
        } catch (error: any) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
          setIsLoading(false);
        }
    };

    const handleSaveBill = async (data: Omit<Bill, 'id'>, updatesStock: boolean) => {
        setIsLoading(true);
        const billDate = (data.date as any) instanceof Date ? format(data.date, 'yyyy-MM-dd') : data.date;
        try {
            await runTransaction(db, async (transaction) => {
                const isEditing = !!billData;
                const billItems = data.items || [];
                const medicationDocs = await Promise.all(
                    (updatesStock && data.category === 'Proveedor') ? billItems.map(item => transaction.get(doc(db, 'medications', item.medicationId))) : []
                );
    
                if (isEditing && billData.category === 'Proveedor' && billData.items) {
                    for (const item of billData.items) {
                        transaction.update(doc(db, 'medications', item.medicationId), { stock: increment(-item.quantity) });
                    }
                }
    
                if (updatesStock && data.category === 'Proveedor') {
                    for (const item of billItems) {
                        transaction.update(doc(db, 'medications', item.medicationId), { stock: increment(item.quantity) });
                    }
                }
    
                if (isEditing) {
                    transaction.update(doc(db, "bills", billData.id), {...data, date: billDate});
                } else {
                    transaction.set(doc(collection(db, "bills")), {...data, date: billDate});
                }
            });
            toast({ title: 'Gasto Guardado' });
            closeBillDialog();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveMedication = async (data: Omit<Medication, 'id'>) => {
        setIsLoading(true);
        try {
          if (medicationData) {
            await updateDoc(doc(db, "medications", medicationData.id), data);
            toast({ title: 'Medicamento Actualizado' });
            closeMedicationDialog();
          } else {
            const docRef = await addDoc(collection(db, "medications"), data);
            toast({ title: 'Medicamento Agregado' });
            closeMedicationDialog({ newMedication: { id: docRef.id, ...data } });
          }
        } catch(error) {
          toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveService = async (data: Omit<Service, 'id'>) => {
        setIsLoading(true);
        try {
            if (serviceData) {
                await updateDoc(doc(db, "services", serviceData.id), data);
            } else {
                await addDoc(collection(db, "services"), data);
            }
            closeServiceDialog();
        } catch(error) {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
      
    const selectedPatientForInvoiceDetails = invoiceViewData ? allPatients.find(p => p.name === invoiceViewData.patientName) : undefined;

    return (
        <>
            <Dialog
                open={isAppointmentOpen}
                onOpenChange={(isOpen) => {if (!isOpen) closeAppointmentDialog()}}
                key={appointmentData?.id || 'new-appointment'}
            >
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{appointmentData ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
                        <DialogDescription>Completa los detalles de la cita.</DialogDescription>
                    </DialogHeader>
                        <AppointmentForm
                            appointment={appointmentData}
                            onSave={handleSaveAppointment}
                            onCancel={closeAppointmentDialog}
                            patients={allPatients}
                        />
                </DialogContent>
            </Dialog>
            
            <Dialog open={isAppointmentViewOpen} onOpenChange={closeAppointmentViewDialog}>
                <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle>Sesión Clínica</DialogTitle>
                        <DialogDescription>Registro de diagnóstico y receta.</DialogDescription>
                    </DialogHeader>
                    {appointmentViewData && (() => {
                        const patient = allPatients.find(p => p.id === appointmentViewData.patientId);
                        const clinicalNote: any = { id: appointmentViewData.id, notes: '', prescriptions: [] };
                        return (
                            <div className="flex-1 overflow-y-auto p-6">
                                <ClinicalSessionClient 
                                    patient={patient!} 
                                    appointment={appointmentViewData} 
                                    clinicalNote={clinicalNote} 
                                    allMedications={allMedications} 
                                />
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {isPatientOpen && (
              <Dialog open={isPatientOpen} onOpenChange={(isOpen) => { if (!isOpen) closePatientDialog({}) }}>
                  <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                      <DialogTitle>{patientData ? 'Editar Paciente' : 'Añadir Paciente'}</DialogTitle>
                  </DialogHeader>
                      <PatientForm
                          patient={patientData}
                          allPatients={allPatients}
                          onSave={patientData ? handleUpdatePatient : handleSavePatient}
                          onCancel={() => closePatientDialog({})}
                          isLoading={isLoading}
                      />
                  </DialogContent>
              </Dialog>
            )}

            {isMedicationOpen && (
              <Dialog open={isMedicationOpen} onOpenChange={(isOpen) => { if(!isOpen) closeMedicationDialog() }}>
                <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{medicationData ? 'Editar Medicamento' : 'Añadir Medicamento'}</DialogTitle>
                </DialogHeader>
                <MedicationForm
                    medication={medicationData}
                    allMedications={allMedications}
                    onSave={handleSaveMedication}
                    onCancel={closeMedicationDialog}
                />
                </DialogContent>
              </Dialog>
            )}

            {isServiceOpen && (
                 <Dialog open={isServiceOpen} onOpenChange={(isOpen) => { if(!isOpen) closeServiceDialog() }}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Servicio</DialogTitle>
                        </DialogHeader>
                        <ServiceForm
                            service={serviceData}
                            onSave={handleSaveService}
                            onCancel={closeServiceDialog}
                            isLoading={isLoading}
                        />
                    </DialogContent>
                 </Dialog>
            )}
            
            {isInvoiceOpen && (
              <Dialog open={isInvoiceOpen} onOpenChange={(isOpen) => { if (!isOpen) closeInvoiceDialog() }}>
                  <DialogContent className="sm:max-w-4xl">
                  <DialogHeader>
                      <DialogTitle>Factura</DialogTitle>
                  </DialogHeader>
                  <InvoiceForm
                      invoice={invoiceData}
                      onSave={handleSaveInvoice}
                      onCancel={closeInvoiceDialog}
                  />
                  </DialogContent>
              </Dialog>
            )}

            {isInvoiceViewOpen && (
                <Dialog open={isInvoiceViewOpen} onOpenChange={closeInvoiceViewDialog}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Detalles de la Factura</DialogTitle>
                        </DialogHeader>
                        {invoiceViewData && <InvoiceDetails invoice={invoiceViewData} patient={selectedPatientForInvoiceDetails} onDone={closeInvoiceViewDialog} />}
                    </DialogContent>
                </Dialog>
            )}

            <Dialog open={isPatientSelectorOpen} onOpenChange={closePatientSelector}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Seleccionar Paciente</DialogTitle>
                    </DialogHeader>
                    <PatientSelector patients={allPatients} onSelectPatient={onSelectPatient} />
                </DialogContent>
            </Dialog>

            <Dialog open={isMedicationSelectorOpen} onOpenChange={closeMedicationSelector}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Seleccionar Medicamento</DialogTitle>
                    </DialogHeader>
                    <MedicationSelector onSelectMedication={onSelectMedicationForPrescription} excludedMedicationIds={excludedMedicationIds} />
                </DialogContent>
            </Dialog>
            
            <Dialog open={isItemSelectorOpen} onOpenChange={closeItemSelector}>
                <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Añadir Items</DialogTitle></DialogHeader>
                    <ItemSelector medications={allMedications} services={allServices} initialItems={initialItemsForSelector} onConfirm={setSelectedItemsForInvoice} />
                </DialogContent>
            </Dialog>
            
            {isBillOpen && (
                <Dialog open={isBillOpen} onOpenChange={(isOpen) => { if (!isOpen) closeBillDialog() }}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader><DialogTitle>Gasto / Compra</DialogTitle></DialogHeader>
                        <BillForm bill={billData} onSave={handleSaveBill} onCancel={closeBillDialog} isLoading={isLoading} fromInventory={billFromInventory} isExpenseOnly={isBillExpenseOnly} />
                    </DialogContent>
                </Dialog>
            )}

             <Dialog open={isBillItemSelectorOpen} onOpenChange={closeBillItemSelector}>
                <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Items de Compra</DialogTitle></DialogHeader>
                    <BillItemSelector initialItems={initialItemsForBillSelector} onConfirm={setSelectedItemsForBill} supplierName={billItemSelectorSupplier} />
                </DialogContent>
            </Dialog>

            <Dialog open={isSupplierMergeOpen} onOpenChange={closeSupplierMergeDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Fusionar Proveedores</DialogTitle></DialogHeader>
                    <SupplierMerger allMedications={allMedications} onMerge={handleMergeSuppliers} onCancel={closeSupplierMergeDialog} />
                </DialogContent>
            </Dialog>

            <Dialog open={isDailySummaryOpen} onOpenChange={closeDailySummaryDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Resumen Diario</DialogTitle></DialogHeader>
                    <DailySummary data={dailySummaryData} />
                </DialogContent>
            </Dialog>

            {isMedicationHistoryOpen && (
              <Dialog open={isMedicationHistoryOpen} onOpenChange={(isOpen) => { if (!isOpen) closeMedicationHistoryDialog() }}>
                  <DialogContent className="sm:max-w-4xl">
                      <DialogHeader><DialogTitle>Historial</DialogTitle></DialogHeader>
                      {medicationHistoryData && <MedicationHistory medication={medicationHistoryData} openInvoice={openInvoiceViewDialog} openBill={openBillDialog} />}
                  </DialogContent>
              </Dialog>
            )}
        </>
    );
}