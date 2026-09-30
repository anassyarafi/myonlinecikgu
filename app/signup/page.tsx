'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'tutor' | 'student'>('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role,
      })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F3EC] px-4">
      <div className="w-full max-w-md bg-white border-2 border-[#D8D2C4] rounded-2xl p-8">
        <h1
          className="text-2xl font-semibold text-[#1C3529] mb-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Create your account
        </h1>
        <p className="text-[#4A4437] mb-6">Join MyOnlineCikgu as a tutor or student</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C3529] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-[#D8D2C4] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5D45]"
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#D8D2C4] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5D45]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C3529] mb-2">I am a...</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex-1 py-2 rounded-full border font-medium ${
                  role === 'student'
                    ? 'bg-[#2B5D45] text-white border-[#2B5D45]'
                    : 'border-[#D8D2C4] text-[#1C3529]'
                }`}
              >
                Student / Parent
              </button>
              <button
                type="button"
                onClick={() => setRole('tutor')}
                className={`flex-1 py-2 rounded-full border font-medium ${
                  role === 'tutor'
                    ? 'bg-[#2B5D45] text-white border-[#2B5D45]'
                    : 'border-[#D8D2C4] text-[#1C3529]'
                }`}
              >
                Tutor
              </button>
            </div>
          </div>

          {error && <p className="text-[#C6503F] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2B5D45] text-white py-2.5 rounded-full font-medium hover:bg-[#1F4634] disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}