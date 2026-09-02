import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'SolarOS Enterprise',
  description: 'India’s all-in-one solar operating system — D2C, B2B, EPC, Inventory & ERP.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
