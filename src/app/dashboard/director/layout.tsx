
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  BookOpen,
  ChevronDown,
  GraduationCap,
  Home,
  LogOut,
  MessageCircle,
  User,
  UserPlus,
  Users,
  Calendar,
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
import { useContext, useEffect, useMemo } from 'react';
import { ConversationsContext } from '@/context/ConversationsContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { doc } from 'firebase/firestore';
import { User as UserType } from '@/lib/mock-data';

export default function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { conversations } = useContext(ConversationsContext);
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: directorUser, isLoading: userProfileLoading } = useDoc<UserType>(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const unreadMessagesCount = useMemo(() => {
    if (!user) return 0;
    return conversations.filter(conv => !conv.readBy?.includes(user.uid) && conv.messages[conv.messages.length - 1]?.senderId !== user.uid).length;
  }, [conversations, user]);

  const menuItems = [
    { href: '/dashboard/director', icon: <Home />, label: 'Panel de control', tooltip: 'Panel de control', exact: true },
    { href: '/dashboard/director/enroll', icon: <UserPlus />, label: 'Inscribir alumnos', tooltip: 'Inscribir alumnos' },
    { href: '/dashboard/director/students', icon: <Users />, label: 'Estudiantes', tooltip: 'Estudiantes' },
    { href: '/dashboard/director/teachers', icon: <User />, label: 'Profesores', tooltip: 'Gestionar Profesores' },
    { href: '/dashboard/director/grades', icon: <GraduationCap />, label: 'Grados', tooltip: 'Gestionar Grados y Cursos' },
    { href: '/dashboard/director/courses', icon: <BookOpen />, label: 'Cursos', tooltip: 'Cursos' },
    { href: '/dashboard/director/calendar', icon: <Calendar />, label: 'Calendario escolar', tooltip: 'Calendario escolar' },
    { href: '/dashboard/director/messages', icon: <MessageCircle />, label: 'Mensajes', tooltip: 'Mensajes', badge: unreadMessagesCount },
    { href: '/dashboard/director/notifications', icon: <Bell />, label: 'Notificaciones', tooltip: 'Notificaciones' },
  ]

  const UserProfile = () => {
    if (isUserLoading || userProfileLoading || !directorUser) {
        return (
            <div className="flex items-center gap-3 p-2">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse"></div>
                <div className="flex flex-col gap-1">
                    <div className="h-4 w-20 rounded-md bg-muted animate-pulse"></div>
                    <div className="h-3 w-28 rounded-md bg-muted animate-pulse"></div>
                </div>
            </div>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto w-full justify-start gap-3 p-2">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={(directorUser as any)?.photoURL || ""} alt={directorUser?.name || ''} data-ai-hint="user avatar" />
                        <AvatarFallback>{directorUser?.name?.charAt(0) || 'D'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left">
                        <p className="font-medium capitalize">{directorUser.role}</p>
                        <p className="text-xs text-muted-foreground">{directorUser.email}</p>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2 z-50" align="end" side="top">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/director/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <Link href="/login">Cerrar sesión</Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
  }
  
  if (isUserLoading || userProfileLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <GraduationCap className="h-12 w-12 animate-pulse text-primary" />
        </div>
    );
  }

  return (
      <SidebarProvider>
        <Sidebar
          header={
            <SidebarHeader>
              <Link href="/dashboard/director" className="flex items-center gap-3">
                <div className="rounded-lg bg-primary p-2 text-primary-foreground">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <span className="text-lg font-semibold">Escuela Los Arrozales</span>
              </Link>
            </SidebarHeader>
          }
          footer={
            <SidebarFooter>
              <UserProfile />
            </SidebarFooter>
          }
        >
          <SidebarContent>
            <ScrollArea>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton href={item.href} tooltip={item.tooltip} isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}>
                      {item.icon}
                      <span>{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </ScrollArea>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-xl font-semibold">Portal del director</h1>
            </div>
          </header>
          <ScrollArea className="flex-1">
            <main className="p-4 sm:p-6">{children}</main>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
  );
}
