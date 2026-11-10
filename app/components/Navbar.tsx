'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NotificationBell from './NotificationBell'
import Logo from './Logo'

type IconName = 'search' | 'book' | 'dashboard' | 'shield' | 'logout'

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (name === 'search')
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    )
  if (name === 'book')
    return (
      <svg {...common}>
        <path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" />
        <path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" />
      </svg>
    )
  if (name === 'dashboard')
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </svg>
    )
  if (name === 'shield')
    return (
      <svg {...common}>
        <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  )
}

type NavLink = { href: string; label: string; icon: IconName }

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const load = async (uid: string | null) => {
      setUserId(uid)
      if (!uid) {
        setRole(null)
        setReady(true)
        return
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', uid).single()
      setRole(data?.role ?? null)
      setReady(true)
    }

    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user?.id ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const links: NavLink[] =
    role === 'student'
      ? [
          { href: '/browse', label: 'Browse', icon: 'search' },
          { href: '/my-learning', label: 'My learning', icon: 'book' },
        ]
      : role === 'tutor'
      ? [{ href: '/tutor-dashboard', label: 'Dashboard', icon: 'dashboard' }]
      : role === 'admin'
      ? [{ href: '/admin', label: 'Admin', icon: 'shield' }]
      : []

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const hideTabBar = pathname.startsWith('/classroom') || pathname.startsWith('/receipt')

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-[#DDE2E8] pt-[var(--safe-area-inset-top,env(safe-area-inset-top,0px))] print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label="MyOnlineCikgu home">
            <Logo size={36} />
            <span className="font-extrabold text-[17px] tracking-tight text-[#0F1B2D]">MyOnlineCikgu</span>
          </Link>

          <div className="flex items-center gap-2">
            {ready && userId && (
              <nav aria-label="Main" className="hidden md:flex items-center gap-1 mr-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`px-3 h-10 flex items-center rounded-lg text-sm font-semibold ${
                      isActive(l.href)
                        ? 'bg-[#E1F1F2] text-[#075A61]'
                        : 'text-[#566274] hover:bg-[#F3F5F7]'
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            )}

            {ready && userId && <NotificationBell userId={userId} />}

            {ready && userId && (
              <button
                onClick={handleLogout}
                className="hidden md:flex h-10 px-3 items-center rounded-lg text-sm font-semibold text-[#566274] hover:bg-[#F3F5F7]"
              >
                Log out
              </button>
            )}

            {ready && !userId && (
              <>
                <Link href="/login" className="h-10 px-3 flex items-center rounded-lg text-sm font-semibold text-[#0F1B2D] hover:bg-[#F3F5F7]">
                  Log in
                </Link>
                <Link href="/signup" className="h-10 px-4 flex items-center rounded-lg text-sm font-bold bg-[#0A7B83] text-white hover:bg-[#075A61]">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {ready && userId && !hideTabBar && (
        <nav
          aria-label="Main"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#DDE2E8] pb-[var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px))] flex print:hidden"
        >
          {links.map((l) => {
            const active = isActive(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 min-h-[60px] flex flex-col items-center justify-center gap-1 text-xs font-semibold border-t-[3px] -mt-px ${
                  active ? 'text-[#0A7B83] border-[#0A7B83]' : 'text-[#566274] border-transparent'
                }`}
              >
                <Icon name={l.icon} />
                {l.label}
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            className="flex-1 min-h-[60px] flex flex-col items-center justify-center gap-1 text-xs font-semibold text-[#566274] border-t-[3px] border-transparent -mt-px"
          >
            <Icon name="logout" />
            Log out
          </button>
        </nav>
      )}
    </>
  )
}