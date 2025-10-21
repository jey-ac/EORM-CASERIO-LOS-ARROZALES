
'use client';

import { TwoFactorAuthSetup } from '@/components/two-factor-auth-setup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentSettingsPage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de la cuenta</CardTitle>
          <CardDescription>
            Administre la configuración de seguridad y los detalles de su cuenta.
          </CardDescription>
        </CardHeader>
      </Card>
       <TwoFactorAuthSetup />
    </div>
  );
}
