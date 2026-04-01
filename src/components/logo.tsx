import Image from 'next/image';

export function Logo({ size }: { size?: "small" | "default" }) {
  // The logic for different sizes is now handled by group variants in layout.tsx
  // This component will now render a single, adaptable logo.
  return (
    <div className="flex items-center justify-center gap-3 py-4 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:gap-0" aria-label="Consultorio Médico Integral">
      <Image 
        src="/apple-icon.png" 
        alt="Logo del Consultorio" 
        width={80} 
        height={80} 
        className="h-20 w-20 rounded-lg object-contain transition-all duration-200 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:w-14" 
      />
      <h1 className="text-2xl font-bold tracking-tight text-foreground transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 hidden group-data-[collapsible=icon]:block">
        Consultorio Médico Integral
      </h1>
      <h1 className="text-2xl font-bold tracking-tight text-foreground transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden block">
        Consultorio Médico Integral
      </h1>
    </div>
  );
}