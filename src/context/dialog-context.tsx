'use client';

import React, { createContext, useContext, useState, type PropsWithChildren, useCallback } from 'react';
import type { Appointment, Patient, InvoiceItem, Invoice, Bill, BillItem, Medication, Service } from '@/lib/types';
import { collection, deleteDoc, doc, runTransaction, increment, where, query, getDoc, onSnapshot, writeBatch, updateDoc, getDocs, getCountFromServer, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useData } from './data-context';

type QuickInvoiceData = {
    patientId: string;
    patientName: string;
    items: InvoiceItem[];
    appointmentId?: string | null; 
}

type DialogContextType = {
    isAppointmentOpen: boolean;
    setIsAppointmentOpen: (isOpen: boolean) => void;
    appointmentData: Appointment | null;
    openAppointmentDialog: (appointment: Appointment | null) => void;
    closeAppointmentDialog: () => void;
    newlyAddedPatient: Patient | null;
    setConflictingTime: (time: string | null) => void;

    isPatientOpen: boolean;
    setIsPatientOpen: (isOpen: boolean) => void;
    patientData: Patient | null;
    openPatientDialog: (patient: Patient | null, fromAppointment?: boolean) => void;
    closePatientDialog: (options?: { reopenAppointment?: boolean; newPatient?: Patient }) => void;
    fromAppointmentFlow: boolean;
    
    isMedicationOpen: boolean;
    medicationData: Medication | null;
    openMedicationDialog: (medication: Medication | null, fromBillItemSelector?: boolean, supplier?: string) => void;
    closeMedicationDialog: (options?: { newMedication?: Medication }) => void;
    handleDeleteMedication: (medicationId: string) => Promise<void>;
    fromBillItemSelector: boolean;
    prefilledSupplier: string | null;

    isServiceOpen: boolean;
    serviceData: Service | null;
    openServiceDialog: (service: Service | null) => void;
    closeServiceDialog: () => void;

    isAppointmentViewOpen: boolean;
    appointmentViewData: Appointment | null;
    openAppointmentViewDialog: (appointment: Appointment) => void;
    closeAppointmentViewDialog: () => void;
    
    isInvoiceOpen: boolean;
    invoiceData: Invoice | null;
    invoicePrefillData: QuickInvoiceData | null;
    openInvoiceDialog: (invoice: Invoice | null, prefillData?: QuickInvoiceData) => void;
    closeInvoiceDialog: () => void;
    handleDeleteInvoice: (invoice: Invoice) => Promise<void>;

    isInvoiceViewOpen: boolean;
    invoiceViewData: Invoice | null;
    openInvoiceViewDialog: (invoice: Invoice) => void;
    closeInvoiceViewDialog: () => void;
    
    isBillOpen: boolean;
    billData: Bill | null;
    openBillDialog: (bill: Bill | null, fromInventory: boolean, isExpenseOnly?: boolean) => void;
    closeBillDialog: () => void;
    handleDeleteBill: (bill: Bill) => Promise<void>;
    billFromInventory: boolean;
    isBillExpenseOnly: boolean;

    isPatientSelectorOpen: boolean;
    openPatientSelectorForInvoice: () => void;
    openPatientSelectorForAppointment: (patients?: any[]) => void;
    closePatientSelector: () => void;
    onSelectPatient: (patient: Patient) => void;

    selectedPatientForInvoice: Patient | null;
    selectedPatientForAppointment: Patient | null;

    isItemSelectorOpen: boolean;
    openItemSelector: (currentItems: InvoiceItem[]) => void;
    closeItemSelector: () => void;
    selectedItemsForInvoice: InvoiceItem[];
    setSelectedItemsForInvoice: (items: InvoiceItem[]) => void;
    initialItemsForSelector: InvoiceItem[];
    
    isBillItemSelectorOpen: boolean;
    openBillItemSelector: (currentItems: BillItem[], supplierName?: string) => void;
    closeBillItemSelector: () => void;
    selectedItemsForBill: BillItem[];
    setSelectedItemsForBill: (items: BillItem[]) => void;
    initialItemsForBillSelector: BillItem[];
    newlyAddedMedication: Medication | null;
    billItemSelectorSupplier: string | undefined;

    isMedicationSelectorOpen: boolean;
    openMedicationSelector: (excludedIds: string[]) => void;
    closeMedicationSelector: () => void;
    selectedMedicationForPrescription: Medication | null;
    onSelectMedicationForPrescription: (medication: Medication) => void;
    excludedMedicationIds: string[];
    clearPrescriptionSelections: () => void;

    isSupplierMergeOpen: boolean;
    openSupplierMergeDialog: () => void;
    closeSupplierMergeDialog: () => void;
    handleMergeSuppliers: (suppliersToMerge: string[], newName: string) => Promise<void>;

    isDailySummaryOpen: boolean;
    dailySummaryData: any;
    openDailySummaryDialog: (data: any) => void;
    closeDailySummaryDialog: () => void;

    isMedicationHistoryOpen: boolean;
    medicationHistoryData: Medication | null;
    openMedicationHistoryDialog: (medication: Medication) => void;
    closeMedicationHistoryDialog: () => void;

    clearInvoiceSelections: () => void;
    clearAppointmentSelections: () => void;
    clearBillSelections: () => void;
    
    getUnavailableTimesForDate: (date: Date) => string[];
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider = ({ children }: PropsWithChildren) => {
    const { toast } = useToast();
    const { allMedications } = useData();

    // Dialog states
    const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
    const [appointmentData, setAppointmentData] = useState<Appointment | null>(null);
    const [newlyAddedPatient, setNewlyAddedPatient] = useState<Patient | null>(null);
    const [conflictingTime, setConflictingTime] = useState<string | null>(null);

    const [isPatientOpen, setIsPatientOpen] = useState(false);
    const [patientData, setPatientData] = useState<Patient | null>(null);
    const [fromAppointmentFlow, setFromAppointmentFlow] = useState(false);

    const [isMedicationOpen, setIsMedicationOpen] = useState(false);
    const [medicationData, setMedicationData] = useState<Medication | null>(null);
    const [fromBillItemSelector, setFromBillItemSelector] = useState(false);
    const [newlyAddedMedication, setNewlyAddedMedication] = useState<Medication | null>(null);
    const [prefilledSupplier, setPrefilledSupplier] = useState<string | null>(null);

    const [isServiceOpen, setIsServiceOpen] = useState(false);
    const [serviceData, setServiceData] = useState<Service | null>(null);
    
    const [isAppointmentViewOpen, setIsAppointmentViewOpen] = useState(false);
    const [appointmentViewData, setAppointmentViewData] = useState<Appointment | null>(null);

    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
    const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
    const [invoicePrefillData, setInvoicePrefillData] = useState<QuickInvoiceData | null>(null);
    const [isInvoiceViewOpen, setIsInvoiceViewOpen] = useState(false);
    const [invoiceViewData, setInvoiceViewData] = useState<Invoice | null>(null);

    const [isBillOpen, setIsBillOpen] = useState(false);
    const [billData, setBillData] = useState<Bill | null>(null);
    const [billFromInventory, setBillFromInventory] = useState(false);
    const [isBillExpenseOnly, setIsBillExpenseOnly] = useState(false);

    const [isPatientSelectorOpen, setIsPatientSelectorOpen] = useState(false);
    const [patientSelectorCallback, setPatientSelectorCallback] = useState<(patient: Patient) => void>(() => {});

    const [selectedPatientForInvoice, setSelectedPatientForInvoice] = useState<Patient | null>(null);
    const [selectedPatientForAppointment, setSelectedPatientForAppointment] = useState<Patient | null>(null);
    
    const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false);
    const [selectedItemsForInvoice, setSelectedItemsForInvoice] = useState<InvoiceItem[]>([]);
    const [initialItemsForSelector, setInitialItemsForSelector] = useState<InvoiceItem[]>([]);
    
    const [isBillItemSelectorOpen, setIsBillItemSelectorOpen] = useState(false);
    const [selectedItemsForBill, setSelectedItemsForBill] = useState<BillItem[]>([]);
    const [initialItemsForBillSelector, setInitialItemsForBillSelector] = useState<BillItem[]>([]);
    const [billItemSelectorSupplier, setBillItemSelectorSupplier] = useState<string | undefined>();
    
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    const [isSupplierMergeOpen, setIsSupplierMergeOpen] = useState(false);
    
    const [isMedicationSelectorOpen, setIsMedicationSelectorOpen] = useState(false);
    const [selectedMedicationForPrescription, setSelectedMedicationForPrescription] = useState<Medication | null>(null);
    const [excludedMedicationIds, setExcludedMedicationIds] = useState<string[]>([]);

    const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
    const [dailySummaryData, setDailySummaryData] = useState<any>(null);

    const [isMedicationHistoryOpen, setIsMedicationHistoryOpen] = useState(false);
    const [medicationHistoryData, setMedicationHistoryData] = useState<Medication | null>(null);

    const openSupplierMergeDialog = () => {
        setIsSupplierMergeOpen(true);
    };
    const closeSupplierMergeDialog = () => {
        setIsSupplierMergeOpen(false);
    };

    React.useEffect(() => {
        const unsub = onSnapshot(collection(db, 'appointments'), (snapshot) => {
            setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
        });
        return () => unsub();
    }, []);

    const openAppointmentDialog = (appointment: Appointment | null) => {
        setAppointmentData(appointment);
        setNewlyAddedPatient(null);
        setSelectedPatientForAppointment(null);
        setConflictingTime(null);
        setIsAppointmentOpen(true);
    };

    const closeAppointmentDialog = () => {
        setIsAppointmentOpen(false);
        setAppointmentData(null);
        setNewlyAddedPatient(null);
        setConflictingTime(null);
    };
    
    const openPatientDialog = (patient: Patient | null, fromAppointment = false) => {
        setPatientData(patient);
        setFromAppointmentFlow(fromAppointment);
        setIsPatientOpen(true);
    };

    const closePatientDialog = (options: { reopenAppointment?: boolean; newPatient?: Patient } = {}) => {
        const { reopenAppointment = false, newPatient } = options;
        setIsPatientOpen(false);
        setPatientData(null);
        if (reopenAppointment) {
            if (newPatient) {
                setNewlyAddedPatient(newPatient);
            }
            setTimeout(() => {
                setIsAppointmentOpen(true);
            }, 150);
        }
    };
    
    const openMedicationDialog = (medication: Medication | null, fromBill = false, supplier?: string) => {
        setMedicationData(medication);
        setFromBillItemSelector(fromBill);
        setPrefilledSupplier(supplier || null);
        setIsMedicationOpen(true);
    };

    const closeMedicationDialog = (options?: { newMedication?: Medication }) => {
        setIsMedicationOpen(false);
        setMedicationData(null);
        setPrefilledSupplier(null);
        if (fromBillItemSelector) {
            if (options?.newMedication) {
                setNewlyAddedMedication(options.newMedication);
            }
            setIsBillOpen(false);
            setTimeout(() => {
                setIsBillItemSelectorOpen(true);
            }, 150);
        }
    };

    const openServiceDialog = (service: Service | null) => {
        setServiceData(service);
        setIsServiceOpen(true);
    };

    const closeServiceDialog = () => {
        setIsServiceOpen(false);
        setServiceData(null);
    };

    const handleDeleteMedication = async (medicationId: string) => {
        try {
            await deleteDoc(doc(db, "medications", medicationId));
            toast({
              title: 'Medicamento Eliminado',
              description: 'El medicamento ha sido eliminado del inventario.',
              variant: 'destructive',
            });
        } catch(error) {
            console.error("Error deleting medication: ", error);
            toast({ title: 'Error', description: 'No se pudo eliminar el medicamento.', variant: 'destructive' });
        }
    };

    const openAppointmentViewDialog = (appointment: Appointment) => {
        setAppointmentViewData(appointment);
        setIsAppointmentViewOpen(true);
    };

    const closeAppointmentViewDialog = () => {
        setIsAppointmentViewOpen(false);
        setAppointmentViewData(null);
    };

    const openInvoiceDialog = (invoice: Invoice | null, prefillData?: QuickInvoiceData) => {
        setInvoiceData(invoice);
        
        if (prefillData) {
          setInvoicePrefillData({
            ...prefillData,
            appointmentId: prefillData.appointmentId || null
          });
        } else {
          setInvoicePrefillData(null);
        }
        
        setIsInvoiceOpen(true);
    };

    const closeInvoiceDialog = () => {
        setIsInvoiceOpen(false);
        setInvoiceData(null);
        setInvoicePrefillData(null);
        clearInvoiceSelections();
    };

    // ✅ FUNCIÓN CORREGIDA: Solo devuelve al inventario si el ítem realmente FUE ENTREGADO (isProvided !== false)
    const handleDeleteInvoice = async (invoice: Invoice) => {
        try {
            await runTransaction(db, async (transaction) => {
                const invoiceDocRef = doc(db, 'invoices', invoice.id);
                
                for (const item of invoice.items) {
                    if (item.isProvided !== false) {
                        const med = allMedications.find(m => m.name === item.description);
                        if (med) {
                            const medDocRef = doc(db, "medications", med.id);
                            transaction.update(medDocRef, { stock: increment(item.quantity) });
                        }
                    }
                }
                
                transaction.delete(invoiceDocRef);
            });

            toast({
                title: 'Factura Eliminada',
                description: 'La factura ha sido eliminada y el stock ha sido ajustado correctamente.',
                variant: 'destructive',
            });

        } catch (error) {
            console.error('Error deleting invoice:', error);
            toast({
                title: 'Error al Eliminar',
                description: 'No se pudo eliminar la factura. Por favor, inténtelo de nuevo.',
                variant: 'destructive',
            });
        }
    };

    const openInvoiceViewDialog = (invoice: Invoice) => {
        setInvoiceViewData(invoice);
        setIsInvoiceViewOpen(true);
    };
    
    const closeInvoiceViewDialog = () => {
        setIsInvoiceViewOpen(false);
        setInvoiceViewData(null);
    };

    const openBillDialog = (bill: Bill | null, fromInventory: boolean, isExpenseOnly?: boolean) => {
        setBillData(bill);
        setBillFromInventory(fromInventory);
        setIsBillExpenseOnly(isExpenseOnly || false);
        setIsBillOpen(true);
    };

    const closeBillDialog = () => {
        setBillData(null);
        setBillFromInventory(false);
        setIsBillOpen(false);
        setIsBillExpenseOnly(false);
        clearBillSelections();
    };
    
    const handleDeleteBill = async (bill: Bill) => {
        try {
            await runTransaction(db, async (transaction) => {
                const billDocRef = doc(db, 'bills', bill.id);
    
                if (bill.category === 'Proveedor' && bill.items && bill.items.length > 0) {
                     for (const item of bill.items) {
                        const medRef = doc(db, 'medications', item.medicationId);
                        transaction.update(medRef, { stock: increment(-item.quantity) });
                    }
                }
                transaction.delete(billDocRef);
            });
    
            toast({
                title: 'Gasto Eliminado',
                description: 'El gasto ha sido eliminado y el stock, si aplicaba, ha sido ajustado.',
                variant: 'destructive',
            });
    
        } catch (error) {
            console.error('Error deleting bill:', error);
            toast({
                title: 'Error al Eliminar',
                description: 'No se pudo eliminar el gasto. Por favor, inténtelo de nuevo.',
                variant: 'destructive',
            });
        }
    };

    const handleMergeSuppliers = async (suppliersToMerge: string[], newName: string) => {
        if (!newName.trim()) {
            toast({ title: 'Nombre inválido', description: 'El nuevo nombre del proveedor no puede estar vacío.', variant: 'destructive' });
            return;
        }
        
        try {
            const batch = writeBatch(db);
            const medicationsToUpdate = allMedications.filter(med => suppliersToMerge.includes(med.supplier));
            
            medicationsToUpdate.forEach(med => {
                const medRef = doc(db, 'medications', med.id);
                batch.update(medRef, { supplier: newName });
            });
    
            await batch.commit();
            toast({ title: 'Proveedores Fusionados', description: `Los proveedores seleccionados ahora son "${newName}".` });
            closeSupplierMergeDialog();
        } catch(error) {
            console.error("Error merging suppliers:", error);
            toast({ title: 'Error', description: 'No se pudo completar la fusión de proveedores.', variant: 'destructive' });
        }
    };
    
    const openPatientSelector = (callback: (patient: Patient) => void) => {
        setPatientSelectorCallback(() => callback);
        setIsPatientSelectorOpen(true);
    };
    const openPatientSelectorForInvoice = () => openPatientSelector(setSelectedPatientForInvoice);
    const openPatientSelectorForAppointment = (patients?: any[]) => openPatientSelector(setSelectedPatientForAppointment);

    const closePatientSelector = () => {
        setIsPatientSelectorOpen(false);
    }
    
    const onSelectPatient = (patient: Patient) => {
        patientSelectorCallback(patient);
        closePatientSelector();
    };

    const openItemSelector = (currentItems: InvoiceItem[]) => {
        setInitialItemsForSelector(currentItems);
        setIsItemSelectorOpen(true);
    };
    const closeItemSelector = () => {
        setIsItemSelectorOpen(false);
    }
    
    const handleSelectItemsForInvoice = (items: InvoiceItem[]) => {
        setSelectedItemsForInvoice(items);
        closeItemSelector();
    }
    
    const openBillItemSelector = (currentItems: BillItem[], supplierName?: string) => {
        setIsBillOpen(false);
        setInitialItemsForBillSelector(currentItems);
        setBillItemSelectorSupplier(supplierName);
        setIsBillItemSelectorOpen(true);
    };

    const closeBillItemSelector = () => {
        setIsBillItemSelectorOpen(false);
        setNewlyAddedMedication(null);
        setTimeout(() => {
            setIsBillOpen(true);
        }, 150)
    };

    const handleSelectItemsForBill = (items: BillItem[]) => {
        setSelectedItemsForBill(items);
        closeBillItemSelector();
    };

    const clearInvoiceSelections = useCallback(() => {
        setSelectedPatientForInvoice(null);
        setSelectedItemsForInvoice([]);
    }, []);
    
    const clearAppointmentSelections = useCallback(() => {
        setSelectedPatientForAppointment(null);
        setNewlyAddedPatient(null);
        setConflictingTime(null);
    }, []);

    const clearBillSelections = useCallback(() => {
        setSelectedItemsForBill([]);
    }, []);

    const openMedicationSelector = (excludedIds: string[]) => {
        setExcludedMedicationIds(excludedIds);
        setIsMedicationSelectorOpen(true);
    }
    const closeMedicationSelector = () => {
        setIsMedicationSelectorOpen(false);
        setExcludedMedicationIds([]);
    }
    const onSelectMedicationForPrescription = (medication: Medication) => {
        setSelectedMedicationForPrescription(medication);
        closeMedicationSelector();
    }
    const clearPrescriptionSelections = useCallback(() => {
        setSelectedMedicationForPrescription(null);
    }, []);

    const openDailySummaryDialog = (data: any) => {
        setDailySummaryData(data);
        setIsDailySummaryOpen(true);
    };
    const closeDailySummaryDialog = () => {
        setDailySummaryData(null);
        setIsDailySummaryOpen(false);
    };

    const openMedicationHistoryDialog = (medication: Medication) => {
        setMedicationHistoryData(medication);
        setIsMedicationHistoryOpen(true);
    };
    const closeMedicationHistoryDialog = () => {
        setIsMedicationHistoryOpen(false);
        setMedicationHistoryData(null);
    };

    const getUnavailableTimesForDate = useCallback((date: Date): string[] => {
        if (!date) return [];
        const formattedDate = format(date, 'yyyy-MM-dd');
        const unavailable = appointments
            .filter(apt => apt.date === formattedDate && apt.status === 'Programada' && (!appointmentData || apt.id !== appointmentData.id))
            .map(apt => apt.time);
        
        if (conflictingTime) {
            unavailable.push(conflictingTime);
        }
        
        return Array.from(new Set(unavailable));
    }, [appointments, appointmentData, conflictingTime]);

    const value = {
        isAppointmentOpen, setIsAppointmentOpen, appointmentData, openAppointmentDialog, closeAppointmentDialog, newlyAddedPatient, setConflictingTime,
        isPatientOpen, setIsPatientOpen, patientData, openPatientDialog, closePatientDialog, fromAppointmentFlow,
        isMedicationOpen, medicationData, openMedicationDialog, closeMedicationDialog, handleDeleteMedication, fromBillItemSelector, prefilledSupplier,
        isServiceOpen, serviceData, openServiceDialog, closeServiceDialog,
        isAppointmentViewOpen, appointmentViewData, openAppointmentViewDialog, closeAppointmentViewDialog,
        
        isInvoiceOpen, invoiceData, invoicePrefillData, openInvoiceDialog, closeInvoiceDialog, handleDeleteInvoice,
        isInvoiceViewOpen, invoiceViewData, openInvoiceViewDialog, closeInvoiceViewDialog,

        isPatientSelectorOpen, openPatientSelectorForInvoice, openPatientSelectorForAppointment, closePatientSelector, onSelectPatient,
        selectedPatientForInvoice,
        selectedPatientForAppointment,

        isItemSelectorOpen, openItemSelector, closeItemSelector,
        selectedItemsForInvoice, setSelectedItemsForInvoice: handleSelectItemsForInvoice, initialItemsForSelector,

        isBillOpen, billData, openBillDialog, closeBillDialog, billFromInventory, handleDeleteBill, isBillExpenseOnly,
        
        isBillItemSelectorOpen, openBillItemSelector, closeBillItemSelector,
        selectedItemsForBill, setSelectedItemsForBill: handleSelectItemsForBill, initialItemsForBillSelector, newlyAddedMedication, billItemSelectorSupplier,

        isMedicationSelectorOpen, openMedicationSelector, closeMedicationSelector, selectedMedicationForPrescription, onSelectMedicationForPrescription, excludedMedicationIds, clearPrescriptionSelections,

        isSupplierMergeOpen, openSupplierMergeDialog, closeSupplierMergeDialog, handleMergeSuppliers,

        isDailySummaryOpen, dailySummaryData, openDailySummaryDialog, closeDailySummaryDialog,
        
        isMedicationHistoryOpen, medicationHistoryData, openMedicationHistoryDialog, closeMedicationHistoryDialog,

        clearInvoiceSelections, clearAppointmentSelections, clearBillSelections,
        getUnavailableTimesForDate,
    };

    return (
        <DialogContext.Provider value={value}>
            {children}
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (context === undefined) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};