
'use client';

import { useState, useEffect } from 'react';
import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, query, collection, where, getDocs, DocumentReference, DocumentData, deleteField } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


async function getUserDocRef(firestore: any, user: any): Promise<DocumentReference<DocumentData> | null> {
  if (!user || !firestore) return null;

  // 1. Check 'users' collection by UID
  let userDocRef = doc(firestore, 'users', user.uid);
  let userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    return userDocRef;
  }

  // 2. Check 'students' collection by authUid field
  const studentQuery = query(collection(firestore, 'students'), where("authUid", "==", user.uid));
  const studentQuerySnapshot = await getDocs(studentQuery);
  if (!studentQuerySnapshot.empty) {
      return studentQuerySnapshot.docs[0].ref;
  }
  
  // 3. Fallback: check 'students' collection by document ID === user.uid
  userDocRef = doc(firestore, 'students', user.uid);
  userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return userDocRef;
  }

  return null;
}


export function TwoFactorAuthSetup() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [totp, setTotp] = useState<TOTP | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);

  // Check current 2FA status from Firestore
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true);
      if (user && firestore) {
        const userDocRef = await getUserDocRef(firestore, user);
        if (userDocRef) {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().twoFactorSecret) {
                setIsTwoFactorEnabled(true);
            } else {
                setIsTwoFactorEnabled(false);
            }
        }
      }
      setShowSetup(false); // Hide setup on user change
      setIsLoading(false);
    };
    checkStatus();
  }, [user, firestore]);
  
  const issuer = 'Escuela Los Arrozales';

  const handleStartSetup = () => {
    if (!user) return;
    
    // Create a new TOTP object.
    const newTotp = new TOTP({
      issuer,
      label: user.email || 'Usuario',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new Secret(),
    });

    setTotp(newTotp);
    
    // Generate QR code
    QRCode.toDataURL(newTotp.toString())
      .then(url => {
        setQrCodeDataURL(url);
        setShowSetup(true);
      })
      .catch(err => {
        console.error(err);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo generar el código QR.'
        });
      });
  };

  const handleDisableConfirm = async () => {
     if (!user || !firestore) return;
     
     const userDocRef = await getUserDocRef(firestore, user);
     if (!userDocRef) {
         toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar el documento del usuario.' });
         return;
     }

     try {
         await updateDoc(userDocRef, {
             twoFactorSecret: deleteField()
         });
         setIsTwoFactorEnabled(false);
         setShowSetup(false);
         toast({
             title: 'Éxito',
             description: 'La autenticación de dos factores ha sido desactivada.',
         });
     } catch (error) {
          toast({
             variant: 'destructive',
             title: 'Error',
             description: 'No se pudo desactivar la autenticación de dos factores.',
         });
     } finally {
        setIsConfirmingDisable(false);
     }
  }

  const handleVerifyAndEnable = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!totp || !user || !firestore) return;

    // Validate the token
    const delta = totp.validate({ token: verificationCode, window: 1 });

    if (delta === null) {
      toast({
        variant: 'destructive',
        title: 'Código incorrecto',
        description: 'El código de verificación no es válido. Inténtelo de nuevo.',
      });
      return;
    }

    // Save the secret to the user's document in Firestore
    const userDocRef = await getUserDocRef(firestore, user);
     if (!userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar el documento del usuario para guardar la configuración.' });
        return;
    }

    try {
        await updateDoc(userDocRef, {
            twoFactorSecret: totp.secret.base32
        });
        
        setIsTwoFactorEnabled(true);
        setShowSetup(false);
        setVerificationCode('');
        setTotp(null);
        toast({
            title: '¡Éxito!',
            description: 'La autenticación de dos factores se ha activado correctamente.',
        });

    } catch (error) {
        console.error("Error saving 2FA secret:", error);
         toast({
            variant: 'destructive',
            title: 'Error al guardar',
            description: 'No se pudo guardar la configuración de 2FA. Inténtelo de nuevo.',
        });
    }
  }

  if (isLoading) {
      return (
          <Card>
              <CardHeader>
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                  <Skeleton className="h-16 w-full" />
              </CardContent>
          </Card>
      )
  }

  return (
    <>
        <Card>
        <CardHeader>
            <CardTitle>Autenticación de dos factores (2FA)</CardTitle>
            <CardDescription>
            Añada una capa adicional de seguridad a su cuenta utilizando una aplicación de autenticación.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
                {isTwoFactorEnabled ? (
                <ShieldCheck className="h-6 w-6 text-green-500" />
                ) : (
                <ShieldOff className="h-6 w-6 text-muted-foreground" />
                )}
                <div>
                <p className="font-medium">
                    {isTwoFactorEnabled ? '2FA está activado' : '2FA está desactivado'}
                </p>
                <p className="text-sm text-muted-foreground">
                    {isTwoFactorEnabled
                    ? 'Se requerirá un código de su aplicación para iniciar sesión.'
                    : 'Se recomienda encarecidamente para proteger su cuenta.'}
                </p>
                </div>
            </div>
            <Button onClick={isTwoFactorEnabled ? () => setIsConfirmingDisable(true) : handleStartSetup} variant={isTwoFactorEnabled ? 'destructive' : 'default'}>
                {isTwoFactorEnabled ? 'Desactivar' : 'Activar'}
            </Button>
            </div>

            {showSetup && (
            <div className="space-y-4 rounded-lg border border-dashed p-4">
                <h3 className="font-semibold text-lg text-center">Configurar 2FA</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <p className="text-sm text-center text-muted-foreground">
                        1. Escanee este código QR con su aplicación de autenticación (ej. Google Authenticator).
                    </p>
                    <div className="p-4 bg-white rounded-md">
                    {qrCodeDataURL ? (
                        <Image src={qrCodeDataURL} alt="Código QR para 2FA" width={128} height={128} />
                    ) : (
                        <Skeleton className="h-32 w-32" />
                    )}
                    </div>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        2. Ingrese el código de 6 dígitos de la aplicación para verificar y completar la configuración.
                    </p>
                    <form onSubmit={handleVerifyAndEnable}>
                        <div className="space-y-2">
                            <Label htmlFor="2fa-code">Código de verificación</Label>
                            <Input 
                                id="2fa-code" 
                                placeholder="123456" 
                                maxLength={6} 
                                required 
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full mt-4">Verificar y activar</Button>
                    </form>
                </div>
                </div>
                <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertTitle>¿No puede escanear?</AlertTitle>
                    <AlertDescription>
                        También puede configurar manualmente su aplicación utilizando esta clave secreta: 
                        <span className="font-mono bg-muted p-1 rounded-md text-xs ml-1">{totp?.secret.base32}</span>
                    </AlertDescription>
                </Alert>
            </div>
            )}
        </CardContent>
        </Card>

        <AlertDialog open={isConfirmingDisable} onOpenChange={setIsConfirmingDisable}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción desactivará la autenticación de dos factores para su cuenta. 
                        Podrá volver a activarla en cualquier momento.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsConfirmingDisable(false)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDisableConfirm}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        Sí, desactivar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
