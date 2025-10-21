
import type {Metadata} from 'next';
import './globals.css';
import { AppProviders } from '@/context/AppProviders';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'EORM Caserío Los Arrozales',
  description: 'Los Arrozales',
  manifest: '/manifest.json',
  icons: null,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#4a90e2" />
      </head>
      <body className="font-body antialiased">
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
