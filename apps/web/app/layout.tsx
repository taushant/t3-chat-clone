import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/session-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastProvider } from '@/components/providers/toast-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'T3 Chat Clone',
  description: 'Modern chat application with real-time messaging and AI integration',
  keywords: ['chat', 'messaging', 'ai', 'real-time', 'collaboration'],
  authors: [{ name: 'T3 Chat Clone Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <Providers>
            <ToastProvider>
              <div className="min-h-screen bg-background">
                {children}
              </div>
            </ToastProvider>
          </Providers>
        </QueryProvider>
      </body>
    </html>
  );
}
