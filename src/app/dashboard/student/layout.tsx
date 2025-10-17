
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  Download,
  GraduationCap,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  User,
  Calendar,
} from 'lucide-react';
import { useContext, useEffect, useState, useMemo } from 'react';

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
import { useUser } from '@/firebase';
import { StudentsContext } from '@/context/StudentsContext';
import { ConversationsContext } from '@/context/ConversationsContext';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications } = useContext(NotificationsContext);
  const { students, loading: studentsLoading } = useContext(StudentsContext);
  const { user, isUserLoading } = useUser();
  const { conversations } = useContext(ConversationsContext);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const student = useMemo(() => students.find(s => s.id === user?.uid), [students, user]);
  
  const unreadMessagesCount = useMemo(() => {
    if (!user) return 0;
    return conversations.filter(conv => !conv.readBy?.includes(user.uid) && conv.messages[conv.messages.length - 1]?.senderId !== user.uid).length;
  }, [conversations, user]);


  useEffect(() => {
    // A more realistic approach would check for unread notifications
    if (notifications.length > 0) {
      setHasNewNotifications(true);
    }
  }, [notifications]);
  
  const menuItems = [
    { href: '/dashboard/student', icon: <Home />, label: 'Calificaciones', tooltip: 'Calificaciones', exact: true },
    { href: '/dashboard/student/calendar', icon: <Calendar />, label: 'Calendario', tooltip: 'Calendario escolar' },
    { href: '/dashboard/student/messages', icon: <MessageCircle />, label: 'Mensajes', tooltip: 'Mensajes', badge: unreadMessagesCount },
    { href: '/dashboard/student/notifications', icon: <Bell />, label: 'Notificaciones', tooltip: 'Notificaciones' },
  ];

  const UserProfile = () => {
    if (isUserLoading || studentsLoading || !student) {
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
                        <AvatarImage src="" alt={student.name} data-ai-hint="user avatar" />
                        <AvatarFallback>{student.name.charAt(0) || 'E'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left">
                        <p className="font-medium capitalize">{student.role}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2 z-50" align="end" side="top">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <Link href="/login">Cerrar sesión</Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
  }
  
  if (isUserLoading || studentsLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <GraduationCap className="h-12 w-12 animate-pulse text-primary" />
        </div>
    );
  }

  return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="p-4">
            <Link href="/dashboard/student" className="flex items-center gap-3">
              <div className="rounded-lg bg-primary p-2 text-primary-foreground">
                <GraduationCap className="h-7 w-7" />
              </div>
              <span className="text-lg font-semibold">Escuela Los Arrozales</span>
            </Link>
          </SidebarHeader>
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
          <SidebarFooter className="p-4">
             <UserProfile />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col min-h-svh">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-4">
               <SidebarTrigger className="md:hidden" />
               <h1 className="text-xl font-semibold">Portal del estudiante</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/student/notifications" onClick={() => setHasNewNotifications(false)}>
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
