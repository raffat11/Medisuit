"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export type SearchListItem = {
  value: string;
  label: string;
}

type SearchListProps = {
  items: SearchListItem[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
}

export function SearchList({
  items,
  value,
  onChange,
  placeholder = "Selecciona una opción",
  searchPlaceholder = "Buscar...",
  noResultsText = "No se encontraron resultados.",
}: SearchListProps) {
  const [filter, setFilter] = React.useState("")
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState(items.find(item => item.value === value)?.label || "");

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(filter.toLowerCase())
  );
  
  const handleSelect = (item: SearchListItem) => {
    onChange(item.value);
    setSelectedLabel(item.label);
    setOpen(false);
  }

  const handleClear = () => {
      onChange("");
      setSelectedLabel("");
      setOpen(true);
  }

  if (!open) {
    return (
       <div className="flex items-center justify-between rounded-md border p-2 h-10">
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value ? selectedLabel : placeholder}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          {value ? "Cambiar" : "Seleccionar"}
        </Button>
      </div>
    )
  }

  return (
    <div className="border rounded-md">
       <Command>
        <CommandInput
          placeholder={searchPlaceholder}
          value={filter}
          onValueChange={setFilter}
        />
        <CommandList className="max-h-48 overflow-y-auto">
          <CommandEmpty>{noResultsText}</CommandEmpty>
          <CommandGroup>
            {filteredItems.map((item) => (
                <div key={item.value} onClick={() => handleSelect(item)} className="p-2 hover:bg-accent cursor-pointer">
                    {item.label}
                </div>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}

// Minimalist button component for internal use
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost'; size?: 'sm' }
>(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(
        'text-sm text-primary hover:bg-accent rounded-md px-2 py-1',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"
