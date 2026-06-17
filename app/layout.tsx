import '@/styles/globals.css';
import type { ReactNode } from 'react';
import Script from 'next/script';
import PriceAlertNotifications from '@/app/components/PriceAlertNotifications';

export const metadata = {
  title: 'Parts Seekr',
  description: 'Snap a product photo and find the best prices.',
  icons: {
    icon: '/logos/PS-Favicon.png',
    shortcut: '/logos/PS-Favicon.png',
    apple: '/logos/PS-Favicon-300.png'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Script
          id="gpt-loader"
          async
          strategy="afterInteractive"
          src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
        />
        <Script id="gpt-init" strategy="afterInteractive">
          {`window.googletag = window.googletag || { cmd: [] };`}
        </Script>
        {children}
        <PriceAlertNotifications />
      </body>
    </html>
  );
}
