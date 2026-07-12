import type { Metadata } from 'next';
import { AuthSessionProvider } from '@/components/AuthSessionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ACY Quotation System',
  description: 'ระบบใบเสนอราคาและเอกสารบัญชี - ACY SYSTEMS AND NETWORK CO., LTD.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
