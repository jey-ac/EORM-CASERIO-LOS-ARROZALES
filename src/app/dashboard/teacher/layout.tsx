
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
  Users,
  Calendar,
  Settings,
} from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';

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
import { NotificationsContext } from '@/context/NotificationsContext';
import { useUser, WithId, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ConversationsContext } from '@/context/ConversationsContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User as UserType } from '@/lib/mock-data';

type TeacherAssignment = {
  gradeIds: string[];
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications } = useContext(NotificationsContext);
  const { user, isUserLoading } = useUser();
  const { conversations } = useContext(ConversationsContext);
  const firestore = useFirestore();
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: teacherUser, isLoading: userProfileLoading } = useDoc<UserType>(userDocRef);

  const teacherAssignmentRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'teacherAssignments', user.uid);
  }, [firestore, user]);
  const { data: teacherAssignmentData } = useDoc<TeacherAssignment>(teacherAssignmentRef);

  const relevantNotifications = useMemo(() => {
    if (!user || !teacherAssignmentData) return [];
    
    // This logic is simplified. A real app might need to cross-reference courses.
    return notifications.filter(n => 
        n.recipient.type === 'all' || 
        (n.recipient.type === 'teacher' && n.recipient.id === user.uid)
    );
}, [notifications, teacherAssignmentData, user]);

  const unreadMessagesCount = useMemo(() => {
    if (!user) return 0;
    return conversations.filter(conv => !conv.readBy?.includes(user.uid) && conv.messages[conv.messages.length - 1]?.senderId !== user.uid).length;
  }, [conversations, user]);


  useEffect(() => {
    // A more realistic approach would check for unread notifications
    if (relevantNotifications.length > 0) {
      setHasNewNotifications(true);
    }
  }, [relevantNotifications]);
  
  const menuItems = [
    { href: '/dashboard/teacher', icon: <Home />, label: 'Panel de control', tooltip: 'Panel de control', exact: true },
    { href: '/dashboard/teacher/students', icon: <Users />, label: 'Estudiantes', tooltip: 'Estudiantes y asistencia' },
    { href: '/dashboard/teacher/courses', icon: <BookOpen />, label: 'Cursos', tooltip: 'Cursos' },
    { href: '/dashboard/teacher/calendar', icon: <Calendar />, label: 'Calendario escolar', tooltip: 'Calendario escolar' },
    { href: '/dashboard/teacher/messages', icon: <MessageCircle />, label: 'Mensajes', tooltip: 'Mensajes', badge: unreadMessagesCount },
    { href: '/dashboard/teacher/notifications', icon: <Bell />, label: 'Notificaciones', tooltip: 'Notificaciones' },
  ]

  const UserProfile = () => {
    if (isUserLoading || userProfileLoading || !teacherUser) {
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
                    <AvatarImage src={(teacherUser as any)?.photoURL || ""} alt={teacherUser?.name || 'Profesor'} data-ai-hint="user avatar" />
                    <AvatarFallback>{teacherUser?.name?.charAt(0) || 'P'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                    <p className="font-medium capitalize">{teacherUser?.role}</p>
                    <p className="text-xs text-muted-foreground">{teacherUser?.email}</p>
                </div>
                <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 mb-2 z-50" align="end" side="top">
            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/teacher/settings">
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
              <Link href="/dashboard/teacher" className="flex items-center gap-3">
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
              <h1 className="text-xl font-semibold">Portal del profesor</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/teacher/notifications" onClick={() => setHasNewNotifications(false)}>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {hasNewNotifications && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" />
                  )}
                </Button>
              </Link>
            </div>
          </header>
          <ScrollArea className="flex-1">
            <main className="p-4 sm:p-6">{children}</main>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
  );
}
