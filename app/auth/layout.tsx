import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f8f9fa] p-6">
      {/* Abstract background elements */}
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#0FF7D0]/10 blur-3xl" />
      <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-[#0FF7D0]/10 blur-3xl" />
      
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="group mb-6 transition-transform hover:scale-105">
            <div className="relative h-16 w-48">
              <Image
                src="/logos/PartsSeekr-Logo.png"
                alt="Parts Seekr Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <div className="h-1 w-12 rounded-full bg-[#0FF7D0] mb-4" />
        </div>

        <div className="overflow-hidden rounded-[32px] border border-[#0FF7D0]/20 bg-white p-8 shadow-soft backdrop-blur-sm sm:p-10">
          {children}
        </div>
        
        <p className="mt-8 text-center text-sm text-[#262626]/50">
          &copy; {new Date().getFullYear()} Parts Seekr. All rights reserved.
        </p>
      </div>
    </div>
  )
}
