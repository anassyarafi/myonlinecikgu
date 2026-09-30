'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="min-h-screen flex items-center justify-center bg-[#F6F3EC] px-4">
      <div className="w-full max-w-md bg-white border-2 border-[#D8D2C4] rounded-2xl p-8">
        <h1
          className="text-2xl font-semibold text-[#1C3529] mb-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Log in
        </h1>
        <p className="text-[#4A4437] mb-6">Welcome back to MyOnlineCikgu</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C3529] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#D8D2C4] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5D45]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C3529] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#D8D2C4] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5D45]"
            />
          </div>

          {error && <p className="text-[#C6503F] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2B5D45] text-white py-2.5 rounded-full font-medium hover:bg-[#1F4634] disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  )
}