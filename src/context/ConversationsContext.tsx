
'use client';

import React, { createContext, ReactNode, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  getDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser } from '@/firebase';
import { Conversation, Message } from '@/lib/mock-data';

// Type for a message object stored in Firestore
type FirestoreMessage = Omit<Message, 'id' | 'timestamp'> & {
    timestamp: any; // Will be a Firestore Timestamp or ServerTimestampValue
};

// Type used in the UI
type UIMessage = Omit<Message, 'timestamp'> & {
    timestamp: string; // Formatted string
    serverTimestamp: Timestamp | null;
};

type UIConversation = Omit<Conversation, 'messages'> & {
    messages: UIMessage[];
};

interface ConversationsContextType {
    conversations: WithId<UIConversation>[];
    handleSendMessage: (text: string, conversationId: string, senderId: string) => void;
    handleStartNewConversation: (recipientId: string, text: string, senderId: string) => Promise<string | undefined>;
    deleteConversation: (conversationId: string) => void;
    markConversationAsRead: (conversationId: string) => void;
    loading: boolean;
    error: Error | null;
}

export const ConversationsContext = createContext<ConversationsContextType>({
    conversations: [],
    handleSendMessage: () => {},
    handleStartNewConversation: async () => undefined,
    deleteConversation: () => {},
    markConversationAsRead: () => {},
    loading: true,
    error: null,
});

function formatTimestamp(timestamp: any): string {
    if (!timestamp?.toDate) return 'ahora';
    const date = timestamp.toDate();
    const diff = (new Date().getTime() - date.getTime()) / 1000; // difference in seconds
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

// Generates a consistent, predictable conversation ID for any two users
const getConversationId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
};


export const ConversationsProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    // Correctly query for conversations where the current user is a participant.
    const conversationsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'conversations'), where('participants', 'array-contains', user.uid));
    }, [firestore, user?.uid]); // Depend on user.uid to re-run the query when user changes

    const { data: conversationsData, isLoading: loading, error } = useCollection<Conversation>(
      conversationsQuery,
      { enabled: !!user && !isUserLoading } // Ensure query runs only when user is loaded
    );

    const conversations: WithId<UIConversation>[] = useMemo(() => {
        return (conversationsData || []).map(conv => ({
            ...conv,
            id: conv.id,
            readBy: conv.readBy || [],
            messages: (conv.messages || []).map(msg => ({
                ...msg,
                timestamp: formatTimestamp(msg.timestamp),
                serverTimestamp: msg.timestamp instanceof Timestamp ? msg.timestamp : null
            })).sort((a,b) => {
                const timeA = a.serverTimestamp?.toMillis() || 0;
                const timeB = b.serverTimestamp?.toMillis() || 0;
                return timeA - timeB;
            })
        }));
    }, [conversationsData]);
    
    const markConversationAsRead = async (conversationId: string) => {
        if (!firestore || !user) return;
        const conversationRef = doc(firestore, 'conversations', conversationId);
        try {
            await updateDoc(conversationRef, {
                readBy: arrayUnion(user.uid)
            });
        } catch (e) {
            console.error("Error marking conversation as read: ", e);
        }
    };
    
    const handleSendMessage = async (text: string, conversationId: string, senderId: string) => {
        if (!firestore || !text.trim()) return;

        const conversationRef = doc(firestore, 'conversations', conversationId);

        const newMessage: FirestoreMessage = {
            senderId,
            text,
            timestamp: Timestamp.now(),
        };

        try {
            await updateDoc(conversationRef, {
                messages: arrayUnion(newMessage),
                readBy: [senderId] // Reset readBy to only the sender
            });
        } catch(e) {
            console.error("Error sending message: ", e);
        }
    };

    const handleStartNewConversation = async (recipientId: string, text: string, senderId: string): Promise<string | undefined> => {
        if (!firestore || !recipientId || !text.trim()) return undefined;
    
        const conversationId = getConversationId(senderId, recipientId);
        const conversationRef = doc(firestore, 'conversations', conversationId);
    
        const newMessage: FirestoreMessage = {
            senderId,
            text,
            timestamp: Timestamp.now(),
        };
    
        try {
            const docSnap = await getDoc(conversationRef);
    
            if (docSnap.exists()) {
                await updateDoc(conversationRef, {
                    messages: arrayUnion(newMessage),
                    readBy: [senderId]
                });
            } else {
                const newConversation = {
                    participants: [senderId, recipientId],
                    createdAt: serverTimestamp(),
                    messages: [newMessage],
                    readBy: [senderId]
                };
                await setDoc(conversationRef, newConversation);
            }
            return conversationId;
        } catch (e) {
            console.error("Error starting or sending message in new conversation: ", e);
            throw e;
        }
    }

    const deleteConversation = async (conversationId: string) => {
        if (!firestore) return;
        try {
            const conversationRef = doc(firestore, 'conversations', conversationId);
            await deleteDoc(conversationRef);
        } catch (e) {
            console.error("Error deleting conversation: ", e);
            throw e;
        }
    };

    const isLoading = loading || isUserLoading;

    return (
        <ConversationsContext.Provider value={{ conversations, handleSendMessage, handleStartNewConversation, deleteConversation, markConversationAsRead, loading: isLoading, error }}>
            {children}
        </ConversationsContext.Provider>
    );
};
