'use client';

import type { PropsWithChildren } from 'react';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NavMenu } from './components/nav-menu';
import { Logo } from '@/components/logo';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { DialogProvider } from '@/context/dialog-context';
import { GlobalDialogs } from './components/global-dialogs';
import { useUserProfile, UserProfileProvider } from '@/context/user-profile-context';
import { MessageSquare } from 'lucide-react';
import * as React from 'react';
import { DataProvider } from '@/context/data-context';


function DashboardMainLayout({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Force a hard refresh to clear all state
      window.location.href = '/login';
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo cerrar la sesión.', variant: 'destructive' });
    }
  };

  const getInitials = (name?: string | null) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DR';
  }

  return (
    <DialogProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-4 h-48 flex items-center justify-center transition-all duration-200 group-data-[collapsible=icon]:h-16">
             <Logo />
          </SidebarHeader>
          <SidebarContent>
            <NavMenu />
          </SidebarContent>
          <SidebarFooter className="p-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="justify-start gap-2 w-full p-2 h-auto">
                    <Avatar className="h-8 w-8">
                      {userProfile?.photoURL && <AvatarImage src={userProfile.photoURL} alt="User avatar" />}
                      <AvatarFallback>{getInitials(userProfile?.displayName || user?.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left group-data-[collapsible=icon]:hidden">
                      <p className="font-semibold text-sm truncate">{userProfile?.displayName || user?.displayName || 'Doctor'}</p>
                      <p className="text-xs text-muted-foreground truncate">{userProfile?.email || user?.email}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right" sideOffset={16}>
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                   <Link href="/dashboard/settings">
                      <DropdownMenuItem>Configuración</DropdownMenuItem>
                   </Link>
                  <DropdownMenuItem>Soporte</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Cerrar Sesión</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="relative flex min-h-svh flex-1 flex-col bg-background peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow">
          <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="w-full flex-1">
              {/* Future search bar can go here */}
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
            {children}
          </main>
        </main>
      </SidebarProvider>
      <GlobalDialogs />
    </DialogProvider>
  );
}


export default function DashboardLayout({ children }: PropsWithChildren) {
    return (
        <UserProfileProvider>
            <DataProvider>
                <DashboardMainLayout>
                    {children}
                </DashboardMainLayout>
            </DataProvider>
        </UserProfileProvider>
    )
}
