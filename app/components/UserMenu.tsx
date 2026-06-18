'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { signout } from '@/app/auth/actions'
import type { User } from '@supabase/supabase-js'

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (loading) return <div className="h-10 w-24 bg-neutral-200 animate-pulse rounded-full" />

  if (!user) {
    return (
      <div className="flex items-center gap-2 sm:gap-4 animate-fade-in">
        <Link 
          href="/auth/login" 
          className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-bold text-[#262626] transition-all rounded-full border border-[#262626]/10 hover:border-[#0FF7D0]/40 hover:bg-[#0FF7D0]/5 active:scale-95 shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-[#0FF7D0] transition-colors sm:w-[18px] sm:h-[18px]"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="hidden xs:inline">Sign In</span>
          <span className="xs:hidden">Login</span>
        </Link>
        <Link 
          href="/auth/signup" 
          className="group relative flex items-center gap-1.5 sm:gap-2 bg-[#262626] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-sm font-bold hover:bg-[#1f1f1f] transition-all shadow-md hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          <span className="hidden xs:inline">Join Free</span>
          <span className="xs:hidden">Join</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform sm:w-[16px] sm:h-[16px]"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <Link 
        href="/garage" 
        className="group hidden sm:flex items-center gap-2 text-sm font-bold text-[#262626] hover:text-[#0FF7D0] transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-[-6deg] transition-transform"><path d="M3 11l2-5h14l2 5"/><path d="M5 11h14v7H5z"/><path d="M7 18v2"/><path d="M17 18v2"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/></svg>
        <span>My Garage</span>
      </Link>
      <Link 
        href="/history" 
        className="group hidden sm:flex items-center gap-2 text-sm font-bold text-[#262626] hover:text-[#0FF7D0] transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-[-10deg] transition-transform"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
        <span>My History</span>
      </Link>
      <div className="relative group">
        <button className="flex items-center gap-2 rounded-full border border-[#0FF7D0]/20 bg-white p-1 pr-3 hover:border-[#0FF7D0]/50 transition-all shadow-sm">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0FF7D0] to-[#0FF7D0] flex items-center justify-center text-[#07181b] font-black text-xs shadow-inner">
            {user.email?.[0].toUpperCase()}
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-[#0FF7D0] transition-colors"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        
        <div className="absolute right-0 top-full mt-3 w-56 bg-white border border-[#0FF7D0]/10 rounded-2xl shadow-xl py-2 invisible group-hover:visible transition-all opacity-0 group-hover:opacity-100 z-50 translate-y-2 group-hover:translate-y-0">
          <div className="px-4 py-3 border-b border-neutral-50 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Signed in as</p>
            <p className="text-xs font-semibold text-[#262626] truncate mt-0.5">{user.email}</p>
          </div>
          
          <Link href="/garage" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-[#0FF7D0]/10 hover:text-[#0FF7D0] transition-colors font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l2-5h14l2 5"/><path d="M5 11h14v7H5z"/><path d="M7 18v2"/><path d="M17 18v2"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/></svg>
            My Garage
          </Link>

          <Link href="/history" className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-[#0FF7D0]/10 hover:text-[#0FF7D0] transition-colors font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
            Search History
          </Link>
          
          <button 
            onClick={() => signout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium mt-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
