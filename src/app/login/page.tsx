
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { User, Student } from '@/lib/mock-data';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleLogin = async () => {
    if (!auth || !firestore) {
        toast({
            variant: "destructive",
            title: "Error de inicialización",
            description: "Los servicios de Firebase no están disponibles. Inténtalo de nuevo más tarde.",
        });
        return;
    }

    // Special case for admin login
    if (email === 'rox17jacome@gmail.com' && password === 'Asa22123') {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast({
                title: '¡Bienvenido, Administrador!',
                description: 'Ingresando al portal de administración...',
            });
            router.push('/dashboard/admin/users');
            return; // CRITICAL: Stop execution after successful admin login
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                toast({
                    variant: 'destructive',
                    title: 'Error de administrador',
                    description: 'La cuenta de administrador predeterminada no existe o la contraseña es incorrecta.',
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Error de autenticación',
                    description: error.message,
                });
            }
            return; // CRITICAL: Stop execution if admin login fails
        }
    }


    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let userProfile: User | Student | null = null;
      let userDocRef = doc(firestore, 'users', user.uid);
      let userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
          userProfile = userDoc.data() as User;
      } else {
          userDocRef = doc(firestore, 'students', user.uid);
          userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
              userProfile = userDoc.data() as Student;
          }
      }

      if (!userProfile) {
        await signOut(auth);
        toast({
            variant: "destructive",
            title: "Perfil no encontrado",
            description: "No se pudo encontrar un perfil para este usuario. Por favor, contacte al administrador.",
        });
        return;
      }
      
      // Check if user is active
      if (userProfile.status !== 'active') {
        await signOut(auth);
        toast({
          variant: "destructive",
          title: "Cuenta desactivada",
          description: "Su cuenta está inactiva. Por favor, póngase en contacto con el administrador.",
        });
        return;
      }
      
      toast({
        title: '¡Bienvenido!',
        description: `Ingresando como ${userProfile.role}...`,
      });
      
      let destination = '/dashboard/student'; 
      if (userProfile.role === 'director') {
        destination = '/dashboard/director';
      } else if (userProfile.role === 'profesor') {
        destination = '/dashboard/teacher';
      }
      
      router.push(destination);

    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      let description = 'El correo electrónico o la contraseña son incorrectos.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Credenciales incorrectas. Por favor, inténtelo de nuevo.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'El formato del correo electrónico no es válido.';
      } else {
        description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: description,
      });
    }
  };
  
  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-primary p-3 text-primary-foreground">
              <GraduationCap className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Escuela Oficial Rural Mixta Caserío Los Arrozales
            </CardTitle>
            <CardDescription>
              ¡Bienvenido de nuevo! Por favor, inicie sesión en su cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="su.correo@ejemplo.com" 
                    className="pl-10" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(prev => !prev)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">Toggle password visibility</span>
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Iniciar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
