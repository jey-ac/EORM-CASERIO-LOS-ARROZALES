'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Lock, Mail, Eye, EyeOff, Send } from 'lucide-react';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { TOTP } from 'otpauth';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { User, Student } from '@/lib/mock-data';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  // State for 2FA
  const [show2faDialog, setShow2faDialog] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tempUser, setTempUser] = useState<FirebaseUser | null>(null);
  const [userProfileFor2FA, setUserProfileFor2FA] = useState<(User | Student) & { id: string } | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const completeLogin = async (userProfile: (User | Student) & { id: string }) => {
     if (userProfile.status !== 'active') {
        if(auth) await signOut(auth);
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
      } else if (userProfile.role === 'administrador') {
        destination = '/dashboard/admin/users';
      }
      
      router.push(destination);
  }

  const handleLogin = async () => {
    if (!auth || !firestore) {
        toast({
            variant: "destructive",
            title: "Error de inicialización",
            description: "Los servicios de Firebase no están disponibles. Inténtalo de nuevo más tarde.",
        });
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      let userProfile: (User | Student) & { id: string; twoFactorSecret?: string } | null = null;
      
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
          userProfile = { ...userDocSnap.data() as User, id: userDocSnap.id };
      } else {
        const studentByAuthUidQuery = query(collection(firestore, 'students'), where("authUid", "==", firebaseUser.uid));
        const studentByAuthUidSnapshot = await getDocs(studentByAuthUidQuery);

        if (!studentByAuthUidSnapshot.empty) {
            const studentDoc = studentByAuthUidSnapshot.docs[0];
            userProfile = { ...studentDoc.data() as Student, id: studentDoc.id };
        } else {
             // Handle admin special case
            if (email === 'rox17jacome@gmail.com') {
                toast({
                    title: '¡Bienvenido, Administrador!',
                    description: 'Ingresando al portal de administración...',
                });
                router.push('/dashboard/admin/users');
                return;
            }

            await signOut(auth);
            toast({
                variant: "destructive",
                title: "Perfil no encontrado",
                description: "No se pudo encontrar un perfil para este usuario. Por favor, contacte al administrador.",
            });
            return;
        }
      }

      // Check if 2FA is enabled for the user
      if (userProfile?.twoFactorSecret) {
        setTempUser(firebaseUser);
        setUserProfileFor2FA(userProfile);
        setShow2faDialog(true);
      } else {
        await completeLogin(userProfile);
      }

    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      let description = 'El correo electrónico o la contraseña son incorrectos.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Credenciales incorrectas. Por favor, inténtelo de nuevo.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'El formato del correo electrónico no es válido.';
      }
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: description,
      });
    }
  };

  const handleTwoFactorSubmit = async () => {
    if (!userProfileFor2FA || !userProfileFor2FA.twoFactorSecret) {
      toast({ variant: 'destructive', title: "Error", description: "La configuración de 2FA no se encontró." });
      return;
    }

    try {
        const totp = new TOTP({
            issuer: 'Escuela Los Arrozales',
            label: userProfileFor2FA.email || 'Usuario',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: userProfileFor2FA.twoFactorSecret,
        });

        const delta = totp.validate({ token: twoFactorCode, window: 1 });

        if (delta === null) {
            toast({ variant: 'destructive', title: "Código incorrecto", description: "El código de verificación no es válido." });
            setTwoFactorCode('');
        } else {
            toast({ title: "Código correcto", description: "Iniciando sesión..." });
            setShow2faDialog(false);
            await completeLogin(userProfileFor2FA);
        }
    } catch(error) {
        console.error("2FA validation error:", error);
        toast({ variant: 'destructive', title: "Error de verificación", description: "Ocurrió un error al verificar el código." });
    }
  }

  const handlePasswordReset = async () => {
    if (!auth) {
        toast({ variant: 'destructive', title: 'Error', description: 'Servicio de autenticación no disponible.' });
        return;
    }
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: 'Correo necesario',
        description: 'Por favor, ingrese su correo electrónico para restablecer la contraseña.',
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Correo enviado',
        description: `Si existe una cuenta para ${resetEmail}, recibirás un correo electrónico con instrucciones.`,
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      let description = 'Ocurrió un error al intentar enviar el correo.';
      if (error.code === 'auth/invalid-email') {
        description = 'La dirección de correo electrónico no tiene un formato válido.';
      }
      toast({
        variant: 'destructive',
        title: 'Error al enviar correo',
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
                  <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                      <DialogTrigger asChild>
                          <Button variant="link" type="button" className="p-0 h-auto text-xs">
                              ¿Olvidaste tu contraseña?
                          </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                              <DialogTitle>Restablecer contraseña</DialogTitle>
                              <DialogDescription>
                                  Ingrese su dirección de correo electrónico para recibir un enlace de restablecimiento.
                              </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                              <Label htmlFor="reset-email">Correo electrónico</Label>
                              <Input
                                  id="reset-email"
                                  type="email"
                                  placeholder="su.correo@ejemplo.com"
                                  value={resetEmail}
                                  onChange={(e) => setResetEmail(e.target.value)}
                              />
                          </div>
                          <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
                              <Button type="button" onClick={handlePasswordReset}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Enviar enlace
                              </Button>
                          </DialogFooter>
                      </DialogContent>
                  </Dialog>
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

      <Dialog open={show2faDialog} onOpenChange={setShow2faDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verificación de dos factores</DialogTitle>
            <DialogDescription>
              Abra su aplicación de autenticación (ej. Google Authenticator) e ingrese el código de 6 dígitos para esta cuenta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {e.preventDefault(); handleTwoFactorSubmit()}}>
            <div className="space-y-2 py-4">
              <Label htmlFor="2fa-code">Código de 6 dígitos</Label>
              <Input
                id="2fa-code"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                required
                pattern="\d{6}"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                  setShow2faDialog(false);
                  if (auth) signOut(auth);
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                Verificar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
