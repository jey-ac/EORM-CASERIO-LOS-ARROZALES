
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  GraduationCap,
  LogOut,
  Users,
  ShieldCheck,
  Settings,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useUser, WithId, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { useEffect } from 'react';
import { User } from '@/lib/mock-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: adminUser, isLoading: userProfileLoading } = useDoc<User>(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  const handleLogout = async () => {
    if(auth) {
        await signOut(auth);
        router.push('/login');
    }
  }

  const menuItems = [
    { href: '/dashboard/admin/users', icon: <Users />, label: 'Gestionar usuarios', tooltip: 'Gestionar usuarios' },
    { href: '/dashboard/admin/students', icon: <ShieldCheck />, label: 'Activar estudiantes', tooltip: 'Activar estudiantes' },
  ]

  const UserProfile = () => {
    if (isUserLoading || userProfileLoading) {
      return (
        <div className="flex items-center gap-3 p-2">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse"></div>
          <div className="flex flex-col gap-1">
            <div className="h-4 w-24 rounded-md bg-muted animate-pulse"></div>
            <div className="h-3 w-20 rounded-md bg-muted animate-pulse"></div>
          </div>
        </div>
      );
    }
    
    const displayUser = adminUser || {
        id: user?.uid || 'admin',
        name: 'Administrador',
        email: user?.email || 'rox17jacome@gmail.com',
        role: 'administrador',
        status: 'active',
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto w-full justify-start gap-3 p-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.photoURL || ""} alt={displayUser.name} data-ai-hint="user avatar" />
              <AvatarFallback>{displayUser.name?.charAt(0) || 'A'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start text-left">
              <p className="font-medium capitalize">{displayUser.role}</p>
              <p className="text-xs text-muted-foreground">{displayUser.email}</p>
            </div>
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 mb-2 z-50" align="end" side="top">
          <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />
           <DropdownMenuItem asChild>
              <Link href="/dashboard/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </Link>
            </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  if (isUserLoading || userProfileLoading && !adminUser) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <GraduationCap className="h-12 w-12 animate-pulse text-primary" />
        </div>
    );
  }

  const sidebarHeader = (
    <SidebarHeader>
      <Link href="/dashboard/admin/users" className="flex items-center gap-3">
        <div className="rounded-lg bg-destructive p-2 text-destructive-foreground">
          <GraduationCap className="h-7 w-7" />
        </div>
        <span className="text-lg font-semibold">Portal del administrador</span>
      </Link>
    </SidebarHeader>
  );

  const sidebarFooter = (
    <SidebarFooter>
      <UserProfile />
    </SidebarFooter>
  );

  const sidebarContent = (
    <SidebarContent>
      <ScrollArea>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton href={item.href} tooltip={item.tooltip} isActive={pathname.startsWith(item.href)}>
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </ScrollArea>
    </SidebarContent>
  );


  return (
    <SidebarProvider>
      <Sidebar header={sidebarHeader} footer={sidebarFooter}>
        {sidebarContent}
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-semibold">Panel de administrador</h1>
          </div>
        </header>
        <ScrollArea className="flex-1">
          <main className="p-4 sm:p-6">{children}</main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
