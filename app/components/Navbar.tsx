'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setLoggedIn(true)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setRole(profile?.role ?? null)
      }
    }
    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkUser()
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setLoggedIn(false)
    setRole(null)
    router.push('/')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-bold text-blue-600">
          MyOnlineCikgu
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {loggedIn && ( <Link href="/browse" className="text-gray-700 hover:text-blue-600"> 
          Browse Tutors 
          </Link> )}

          {role === 'tutor' && (
            <Link href="/tutor-dashboard" className="text-gray-700 hover:text-blue-600">
              Tutor Dashboard
            </Link>
          )}

          {role === 'student' && (
            <Link href="/my-learning" className="text-gray-700 hover:text-blue-600">
              My Learning
            </Link>
          )}

          {role === 'admin' && (
            <Link href="/admin" className="text-gray-700 hover:text-blue-600">
              Admin
            </Link>
          )}

          {loggedIn ? (
            <button
              onClick={handleLogout}
              className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200"
            >
              Log out
            </button>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-blue-600">
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}