
'use client';

import React, { useState, useMemo, useContext, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@/lib/mock-data';
import { SendHorizonal, Search, PlusCircle, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ConversationsContext } from '@/context/ConversationsContext';
import { useUser, WithId } from '@/firebase';
import { UsersContext } from '@/context/UsersContext';
import { StudentsContext } from '@/context/StudentsContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function TeacherMessagesPage() {
    const { user } = useUser();
    const { conversations, handleSendMessage, handleStartNewConversation, deleteConversation, markConversationAsRead } = useContext(ConversationsContext);
    const { users } = useContext(UsersContext);
    const { students } = useContext(StudentsContext);
    
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [isNewMessageDialogOpen, setIsNewMessageDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
    const { toast } = useToast();
    
    const selectedConversation = conversations.find(c => c.id === selectedConversationId);

    const handleConversationSelect = (conversationId: string) => {
        setSelectedConversationId(conversationId);
        markConversationAsRead(conversationId);
    };

    const onSendMessage = (text: string) => {
        if (!selectedConversationId || !text.trim() || !user) return;
        handleSendMessage(text, selectedConversationId, user.uid);
    };

     const onStartNewConversation = async (recipientId: string, text: string) => {
        if(!recipientId || !text.trim() || !user) return;
        
        try {
            const newConversationId = await handleStartNewConversation(recipientId, text, user.uid);
            if (newConversationId) {
                handleConversationSelect(newConversationId);
            }
            toast({
                title: 'Éxito',
                description: 'Mensaje enviado.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo enviar el mensaje.',
            });
        }
    }
    
    const getOtherParticipant = (participants: string[]): User | WithId<User> | undefined => {
        if (!user) return undefined;
        const otherId = participants.find(p => p !== user.uid);
        if (!otherId) return undefined;

        const staffUser = users.find(u => u.id === otherId);
        if (staffUser) return staffUser;

        return students.find(s => s.id === otherId);
    }

    const filteredConversations = useMemo(() => {
        if (!searchTerm) return conversations;
        return conversations.filter(conv => {
            const otherUser = getOtherParticipant(conv.participants);
            return otherUser?.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [conversations, searchTerm, user, users, students]);

    const handleDeleteConversation = () => {
        if (!deletingConversationId) return;
        try {
            deleteConversation(deletingConversationId);
            if (selectedConversationId === deletingConversationId) {
                setSelectedConversationId(null);
            }
            toast({
                title: 'Éxito',
                description: 'La conversación ha sido eliminada.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo eliminar la conversación.',
            });
        } finally {
            setDeletingConversationId(null);
        }
    }

    return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 h-[calc(100vh-10rem)]", !selectedConversationId && "md:grid-cols-1 lg:grid-cols-1")}>
        <div className={cn("border-r bg-card text-card-foreground flex-col h-full", selectedConversationId ? "hidden md:flex" : "flex")}>
            <div className="p-4 border-b shrink-0">
                <h2 className="text-xl font-semibold tracking-tight mb-4">Bandeja de entrada</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar conversaciones..." 
                        className="pl-10 bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="p-4 shrink-0">
                <Button className="w-full" variant="outline" onClick={() => setIsNewMessageDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Nuevo mensaje
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <nav className="flex flex-col gap-1 p-2">
                    {filteredConversations.length > 0 ? filteredConversations.map(conv => {
                        const otherUser = getOtherParticipant(conv.participants);
                        const lastMessage = conv.messages[conv.messages.length - 1];
                        const isUnread = user ? !conv.readBy?.includes(user.uid) && lastMessage?.senderId !== user.uid : false;
                        return (
                            <div key={conv.id} className="relative group">
                                <Link
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleConversationSelect(conv.id)
                                    }}
                                    className={cn(
                                        "flex items-start gap-4 rounded-lg p-3 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                                        selectedConversationId === conv.id && "bg-accent text-accent-foreground"
                                    )}
                                >
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarImage src="" data-ai-hint="user avatar" />
                                        <AvatarFallback>{otherUser?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <p className={cn("font-semibold truncate", isUnread && "text-foreground")}>{otherUser?.name}</p>
                                            <span className="text-xs">{lastMessage?.timestamp}</span>
                                        </div>
                                        <p className="text-sm truncate capitalize text-muted-foreground/80">{otherUser?.role}</p>
                                        <p className={cn("text-sm truncate mt-1", isUnread && "font-bold text-foreground")}>{lastMessage?.text}</p>
                                    </div>
                                    {isUnread && <div className="mt-1 h-2 w-2 rounded-full bg-primary"></div>}
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setDeletingConversationId(conv.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Eliminar conversación</span>
                                </Button>
                            </div>
                        )
                    }) : (
                        <div className="text-center text-muted-foreground p-8">No hay conversaciones.</div>
                    )}
                </nav>
            </ScrollArea>
        </div>
        <div className={cn("md:col-span-2 lg:col-span-3", !selectedConversationId && "hidden md:hidden")}>
        {selectedConversation && user ? (
            <div className="flex flex-col h-full bg-muted/20">
            <div className="p-4 border-b flex items-center gap-4 bg-card shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setSelectedConversationId(null)} className="md:hidden">
                    <ArrowLeft className="h-5 w-5"/>
                    <span className="sr-only">Volver a conversaciones</span>
                </Button>
                <Avatar className="h-10 w-10 border">
                    <AvatarImage src="" data-ai-hint="user avatar" />
                    <AvatarFallback>{getOtherParticipant(selectedConversation.participants)?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">{getOtherParticipant(selectedConversation.participants)?.name || 'Usuario desconocido'}</h2>
                    <p className="text-sm text-muted-foreground capitalize">{getOtherParticipant(selectedConversation.participants)?.role || 'Desconocido'}</p>
                </div>
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                    {selectedConversation.messages.map((msg, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex items-end gap-3",
                                msg.senderId === user.uid ? "justify-end" : "justify-start"
                            )}
                        >
                            {msg.senderId !== user.uid && (
                                <Avatar className="h-9 w-9 border">
                                    <AvatarImage src="" data-ai-hint="user avatar" />
                                    <AvatarFallback>{getOtherParticipant(selectedConversation.participants)?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className="flex flex-col gap-1">
                                <Card className={cn(
                                    "max-w-md w-fit rounded-xl px-4 py-3",
                                    msg.senderId === user.uid ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card rounded-bl-none"
                                )}>
                                    <p className="text-sm">{msg.text}</p>
                                </Card>
                                <span className={cn("text-xs text-muted-foreground", msg.senderId === user.uid ? "text-right" : "text-left")}>{msg.timestamp}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <div className="p-4 border-t bg-card shrink-0">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.message as HTMLInputElement;
                    onSendMessage(input.value);
                    input.value = '';
                }} className="flex items-center gap-2">
                    <Input name="message" placeholder="Escribe tu mensaje..." autoComplete='off' className="bg-background"/>
                    <Button type="submit" size="icon" className="flex-shrink-0">
                        <SendHorizonal className="h-5 w-5"/>
                        <span className="sr-only">Enviar</span>
                    </Button>
                </form>
            </div>
            </div>
        ) : (
            <div className="hidden md:flex items-center justify-center h-full text-muted-foreground">
                <p>Seleccione una conversación para empezar a chatear.</p>
            </div>
        )}
        </div>
        <NewMessageDialog 
            isOpen={isNewMessageDialogOpen}
            onClose={() => setIsNewMessageDialogOpen(false)}
            onSendMessage={(recipientId, message) => {
                onStartNewConversation(recipientId, message);
                setIsNewMessageDialogOpen(false);
            }}
        />
        <DeleteConfirmationDialog
            isOpen={!!deletingConversationId}
            onClose={() => setDeletingConversationId(null)}
            onConfirm={handleDeleteConversation}
            conversationPartnerName={deletingConversationId ? getOtherParticipant(conversations.find(c => c.id === deletingConversationId)?.participants || [])?.name : undefined}
        />
    </div>
  );
}


function NewMessageDialog({ isOpen, onClose, onSendMessage }: { isOpen: boolean, onClose: () => void, onSendMessage: (recipientId: string, message: string) => void }) {
    
    const { user } = useUser();
    const { users } = useContext(UsersContext);
    const { students } = useContext(StudentsContext);
    
    const possibleRecipients = useMemo(() => {
        if (!user) return [];
        // Teachers can message the director and students.
        const director = users.find(u => u.role === 'director');
        const allPossible: (User | WithId<User>)[] = director ? [director, ...students] : students;
        return allPossible.filter(recipient => recipient.id !== user.uid);
    }, [users, students, user]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const recipientId = formData.get('recipient') as string;
        const message = formData.get('message') as string;
        onSendMessage(recipientId, message);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Nuevo mensaje</DialogTitle>
                    <DialogDescription>
                        Envía un mensaje al director o a un estudiante.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="recipient" className="text-right">Para:</Label>
                             <Select name="recipient" required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccione un destinatario" />
                                </SelectTrigger>
                                <SelectContent>
                                    {possibleRecipients.map(user => (
                                        <SelectItem key={user.id} value={user.id}>{user.name} - <span className='capitalize text-muted-foreground'>{user.role}</span></SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="message" className="text-right pt-2">Mensaje:</Label>
                            <Textarea id="message" name="message" required className="col-span-3 min-h-[100px]" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">
                            <SendHorizonal className="mr-2 h-4 w-4" />
                            Enviar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )

}

function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, conversationPartnerName }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, conversationPartnerName?: string }) {
    if (!isOpen) return null;

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la conversación con <span className='font-bold'>{conversationPartnerName}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
                        Sí, eliminar conversación
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
