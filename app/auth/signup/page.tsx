'use client'

import { useState } from 'react'
import { signup } from '../actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSignup = async (formData: FormData) => {
    setLoading(true)
    setError(null)
    const result = await signup(formData)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-6 fade-up">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0FF7D0]/20 text-[#0FF7D0]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#262626]">Check your email</h2>
          <p className="text-sm text-neutral-500 leading-relaxed px-4">
            We've sent a verification link to your email. Please click the link to activate your account.
          </p>
        </div>
        <Link 
          href="/auth/login" 
          className="block w-full rounded-2xl bg-[#262626] p-4 font-bold text-white transition-all hover:bg-[#1f1f1f] shadow-lg active:scale-[0.98]"
        >
          Return to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 fade-up">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#262626]">Create account</h2>
        <p className="mt-2 text-sm text-neutral-500">Join Parts Seekr to track your searches</p>
      </div>
      
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 animate-shake">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <form action={handleSignup} className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#262626]/60 ml-1">Email Address</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#0FF7D0] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-4 pl-11 outline-none transition-all focus:border-[#0FF7D0] focus:bg-white focus:ring-4 focus:ring-[#0FF7D0]/10"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#262626]/60 ml-1">Password</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#0FF7D0] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-4 pl-11 outline-none transition-all focus:border-[#0FF7D0] focus:bg-white focus:ring-4 focus:ring-[#0FF7D0]/10"
              placeholder="Min. 6 characters"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-2xl bg-[#0FF7D0] p-4 font-bold text-white transition-all hover:bg-[#0CC6A6] disabled:opacity-50 active:scale-[0.98] shadow-md hover:shadow-lg"
        >
          <div className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <>
                <span>Create Account</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </>
            )}
          </div>
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-neutral-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-bold text-[#0FF7D0] hover:text-[#0CC6A6] transition-colors underline-offset-4 hover:underline">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  )
}
