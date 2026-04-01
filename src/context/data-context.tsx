
'use client';

import React, { createContext, useContext, useState, type PropsWithChildren } from 'react';
import type { Patient, Medication, UserProfile, Service } from '@/lib/types';
import { collection, onSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { services as staticServices } from '@/lib/data';

type DataContextType = {
    isLoading: boolean;
    allPatients: Patient[];
    allMedications: Medication[];
    allServices: Service[];
    allUsers: UserProfile[];
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: PropsWithChildren) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [allPatients, setAllPatients] = useState<Patient[]>([]);
    const [allMedications, setAllMedications] = useState<Medication[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

    React.useEffect(() => {
        const seedServices = async () => {
          const servicesRef = collection(db, 'services');
          const snapshot = await getDocs(servicesRef);
          if (snapshot.empty) {
            console.log('Seeding services...');
            const batch = staticServices.map(service => {
              const docRef = doc(servicesRef, service.id);
              return setDoc(docRef, service);
            });
            await Promise.all(batch);
          }
        };

        seedServices();

        const collections: { name: string, setter: React.Dispatch<React.SetStateAction<any>> }[] = [
            { name: 'patients', setter: setAllPatients },
            { name: 'medications', setter: setAllMedications },
            { name: 'users', setter: setAllUsers },
            { name: 'services', setter: setAllServices },
        ];

        let loadedCount = 0;
        const totalCollections = collections.length;
        let initialLoadDone = false;

        const unsubs = collections.map(({ name, setter }) => {
            return onSnapshot(collection(db, name), (snapshot) => {
                const items = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Ensure stock/cost is a number for medications
                    if (name === 'medications') {
                        if (typeof data.stock !== 'number') data.stock = 0;
                        if (typeof data.cost !== 'number') data.cost = 0;
                    }
                    return { id: doc.id, ...data };
                });
                setter(items);
                
                if (!initialLoadDone) {
                    loadedCount++;
                    if (loadedCount === totalCollections) {
                        setIsLoading(false);
                        initialLoadDone = true;
                    }
                }

            }, (error) => {
                console.error(`Error fetching ${name}: `, error);
                toast({ title: 'Error de Carga', description: `No se pudieron cargar datos de ${name}.`, variant: 'destructive'});
                
                if (!initialLoadDone) {
                    loadedCount++;
                    if (loadedCount === totalCollections) {
                        setIsLoading(false);
                        initialLoadDone = true;
                    }
                }
            });
        });

        // Set a timeout to prevent infinite loading state on error
        const timeoutId = setTimeout(() => {
            if (!initialLoadDone) {
                setIsLoading(false);
                initialLoadDone = true;
                toast({
                    title: 'Advertencia de Carga',
                    description: 'Algunos datos pueden no haberse cargado correctamente. Intenta refrescar la página.',
                    variant: 'destructive'
                });
            }
        }, 15000); // 15 seconds

        return () => {
            unsubs.forEach(unsub => unsub());
            clearTimeout(timeoutId);
        };
    }, [toast]);


    const value = {
        isLoading,
        allPatients,
        allMedications,
        allServices,
        allUsers,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
