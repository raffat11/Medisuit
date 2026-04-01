
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  FileText,
  LayoutDashboard,
  Pill,
  Users,
  Sparkles,
  Scale,
  Truck,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';

const links = [
  { name: 'Panel', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { name: 'Citas', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Pacientes', href: '/dashboard/patients', icon: Users },
  { name: 'Inventario', href: '/dashboard/inventory', icon: Pill },
  { name: 'Facturación', href: '/dashboard/invoices', icon: FileText },
  { name: 'Fact. Proveedores', href: '/dashboard/supplier-bills', icon: Truck },
  { name: 'Finanzas', href: '/dashboard/finance', icon: Scale },
];

export function NavMenu() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {links.map(link => {
        const LinkIcon = link.icon;
        const isActive =
          link.exact ? pathname === link.href : pathname.startsWith(link.href) && link.href !== '/dashboard';
        
        const isDashboardActive = link.href === '/dashboard' && pathname === '/dashboard';

        return (
          <SidebarMenuItem key={link.name}>
            <SidebarMenuButton
              asChild
              isActive={isActive || isDashboardActive}
              tooltip={link.name}
              onClick={() => setOpenMobile(false)}
            >
              <Link href={link.href}>
                <LinkIcon />
                <span>{link.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
