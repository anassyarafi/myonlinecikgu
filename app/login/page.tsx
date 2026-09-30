'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null)

  const roleLabel = (role: string) => {
    if (role === 'student') return 'Student / Parent'
    if (role === 'tutor') return 'Tutor'
    if (role === 'admin') return 'Admin'
    return role
  }

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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      setProfile(profileData)
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setEmail('')
    setPassword('')
  }

  if (profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F3EC] px-4">
        <div className="w-full max-w-md bg-white border-2 border-[#D8D2C4] rounded-2xl p-8 text-center">
          <h1
            className="text-2xl font-semibold text-[#1C3529] mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Welcome back, {profile.full_name}!
          </h1>
          <p className="text-[#4A4437] mb-6">Logged in as: {roleLabel(profile.role)}</p>
          <button
            onClick={handleLogout}
            className="border border-[#D8D2C4] text-[#1C3529] px-5 py-2 rounded-full font-medium hover:bg-[#F6F3EC]"
          >
            Log out
          </button>
        </div>
      </div>
    )
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