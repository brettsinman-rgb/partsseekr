import '@/styles/globals.css';
import type { ReactNode } from 'react';
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/next';
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
        <footer className="px-4 py-6 text-center text-xs font-medium text-[#262626]/45 sm:text-sm">
          Questions or feedback?{' '}
          <a
            href="mailto:brett@partsseekr.com"
            className="text-[#262626]/65 underline-offset-4 transition hover:text-[#0CC6A6] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0FF7D0]/50"
          >
            Contact us
          </a>
        </footer>
        <PriceAlertNotifications />
        <Analytics />
        <GoogleAnalytics
          gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-LLHSDHHTPB'}
        />
      </body>
    </html>
  );
}
