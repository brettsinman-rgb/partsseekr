'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="space-y-8 fade-up">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#262626]">Welcome back</h2>
        <p className="mt-2 text-sm text-neutral-500">Sign in to access your search history</p>
      </div>
      
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 animate-shake">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#262626]/60 ml-1">Email Address</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#0FF7D0] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-4 pl-11 outline-none transition-all focus:border-[#0FF7D0] focus:bg-white focus:ring-4 focus:ring-[#0FF7D0]/10"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#262626]/60">Password</label>
            <Link href="/auth/forgot-password" hidden className="text-[11px] text-[#0FF7D0] hover:underline font-bold">Forgot?</Link>
          </div>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#0FF7D0] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-4 pl-11 outline-none transition-all focus:border-[#0FF7D0] focus:bg-white focus:ring-4 focus:ring-[#0FF7D0]/10"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-2xl bg-[#262626] p-4 font-bold text-white transition-all hover:bg-[#1f1f1f] disabled:opacity-50 active:scale-[0.98]"
        >
          <div className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <>
                <span>Sign In</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </>
            )}
          </div>
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-neutral-500">
          New to Parts Seekr?{' '}
          <Link href="/auth/signup" className="font-bold text-[#0FF7D0] hover:text-[#0CC6A6] transition-colors underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
