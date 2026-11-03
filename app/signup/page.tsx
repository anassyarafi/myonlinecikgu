'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const fieldClass =
  'w-full h-12 px-3.5 rounded-[10px] border border-[#C5CDD6] bg-white text-base text-[#0F1B2D] outline-none focus:border-[#0A7B83] focus:ring-4 focus:ring-[#E1F1F2]'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')

      if (admins && admins.length > 0) {
        const roleLabel = role === 'tutor' ? 'tutor' : 'student/parent'
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          title: 'New Sign-Up',
          message: `${fullName} joined as a ${roleLabel}.`,
        }))
        await supabase.from('notifications').insert(notifications)
      }
    }

    setLoading(false)
    router.push('/login')
  }

  const roles: { value: 'student' | 'tutor'; title: string; text: string }[] = [
    { value: 'student', title: 'Student or parent', text: 'Find tutors and book classes.' },
    { value: 'tutor', title: 'Tutor', text: 'Teach classes and get paid.' },
  ]

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-start sm:items-center justify-center bg-[#F3F5F7] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F1B2D]">Create your account</h1>
          <p className="text-sm text-[#566274] mt-1 mb-6">Join MyOnlineCikgu as a student, parent or tutor.</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <fieldset>
              <legend className="block text-[13px] font-semibold text-[#0F1B2D] mb-1.5">I am a</legend>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    aria-pressed={role === r.value}
                    onClick={() => setRole(r.value)}
                    className={`text-left rounded-[10px] p-3 min-h-[76px] ${
                      role === r.value
                        ? 'border-2 border-[#0A7B83] bg-[#E1F1F2]'
                        : 'border border-[#C5CDD6] bg-white'
                    }`}
                  >
                    <span
                      className={`block text-sm ${
                        role === r.value ? 'font-bold text-[#075A61]' : 'font-semibold text-[#0F1B2D]'
                      }`}
                    >
                      {r.title}
                    </span>
                    <span className="block text-[13px] text-[#566274] mt-0.5">{r.text}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="fullName" className="block text-[13px] font-semibold text-[#0F1B2D] mb-1.5">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={fieldClass}
              />
            </div>

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
                  minLength={6}
                  autoComplete="new-password"
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
              <p className="text-[13px] text-[#566274] mt-1.5">At least 6 characters.</p>
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
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <p className="text-[13px] text-[#566274] text-center">
              By creating an account you agree to our{' '}
              <Link href="/privacy" className="font-semibold text-[#0A7B83] hover:underline">
                privacy policy
              </Link>
              .
            </p>
          </form>
        </div>

        <p className="text-sm text-[#566274] text-center mt-5">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-[#0A7B83] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}