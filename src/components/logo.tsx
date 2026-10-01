'use client';

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Building2 } from 'lucide-react';

export function Logo({ size }: { size?: "small" | "default" }) {
  const [entityName, setEntityName] = useState('Cargando...');
  const [logoUrl, setLogoUrl] = useState<string>('/apple-icon.png');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'clinic_profile'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEntityName(data.entityName || 'Consultorio Médico');
        setLogoUrl(data.logoURL || '/apple-icon.png');
      } else {
        setEntityName('Consultorio Médico');
        setLogoUrl('/apple-icon.png');
      }
    });

    return () => unsub();
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 py-4 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:gap-0" aria-label={entityName}>
      
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={`Logo de ${entityName}`}
          className="h-20 w-20 rounded-lg object-contain transition-all duration-200 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:w-14" 
        />
      ) : (
        <div className="h-20 w-20 flex items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all duration-200 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:w-14">
          <Building2 className="h-10 w-10 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7" />
        </div>
      )}

      {/* Agregamos la clase "uppercase" a ambos h1 para forzar la mayúscula */}
      <h1 className="uppercase text-2xl font-bold tracking-tight text-foreground transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 hidden group-data-[collapsible=icon]:block line-clamp-2">
        {entityName}
      </h1>
      <h1 className="uppercase text-2xl font-bold tracking-tight text-foreground transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden block line-clamp-2">
        {entityName}
      </h1>
      
    </div>
  );
}