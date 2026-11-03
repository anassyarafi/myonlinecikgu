'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const fieldClass =
  'w-full h-12 px-3.5 rounded-[10px] border border-[#C5CDD6] bg-white text-base text-[#0F1B2D] outline-none focus:border-[#0A7B83] focus:ring-4 focus:ring-[#E1F1F2]'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      setLoading(false)

      if (profile?.role === 'tutor') {
        router.push('/tutor-dashboard')
      } else if (profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/browse')
      }
      return
    }

    setLoading(false)
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-start sm:items-center justify-center bg-[#F3F5F7] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F1B2D]">Log in</h1>
          <p className="text-sm text-[#566274] mt-1 mb-6">Welcome back to MyOnlineCikgu.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[13px] font-semibold text-[#0F1B2D] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-semibold text-[#0F1B2D] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 px-3 rounded-lg text-sm font-semibold text-[#0A7B83] hover:bg-[#E1F1F2]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-[#A23E2A] bg-[#FDF3F1] rounded-[10px] px-3.5 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-[10px] bg-[#0A7B83] text-white font-bold hover:bg-[#075A61] disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>

        <p className="text-sm text-[#566274] text-center mt-5">
          New to MyOnlineCikgu?{' '}
          <Link href="/signup" className="font-bold text-[#0A7B83] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}