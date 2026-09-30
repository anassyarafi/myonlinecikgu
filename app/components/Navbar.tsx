'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setLoggedIn(true)
        setCurrentUserId(user.id)
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
    setCurrentUserId(null)
    router.push('/')
  }

  return (
    <nav className="bg-white border-b-2 border-[#D8D2C4] px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-y-2 gap-x-3">
        <Link
          href="/"
          className="font-semibold text-lg text-[#2B5D45] whitespace-nowrap"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          MyOnlineCikgu
        </Link>

        <div className="flex items-center gap-3 sm:gap-5 text-sm flex-wrap justify-end">
          {role === 'student' && (
            <Link href="/browse" className="text-[#1C3529] hover:text-[#2B5D45] whitespace-nowrap">
              Browse Tutors
            </Link>
          )}

          {role === 'tutor' && (
            <Link href="/tutor-dashboard" className="text-[#1C3529] hover:text-[#2B5D45] whitespace-nowrap">
              Tutor Dashboard
            </Link>
          )}

          {role === 'admin' && (
            <Link href="/admin" className="text-[#1C3529] hover:text-[#2B5D45] whitespace-nowrap">
              Admin
            </Link>
          )}

          <NotificationBell userId={currentUserId} />

          {loggedIn ? (
            <button
              onClick={handleLogout}
              className="border border-[#D8D2C4] text-[#1C3529] px-3 py-1.5 rounded-full font-medium hover:bg-[#F6F3EC] whitespace-nowrap"
            >
              Log out
            </button>
          ) : (
            <>
              <Link href="/login" className="text-[#1C3529] hover:text-[#2B5D45] whitespace-nowrap">
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-[#2B5D45] text-white px-3 py-1.5 rounded-full font-medium hover:bg-[#1F4634] whitespace-nowrap"
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