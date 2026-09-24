'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type UserRow = { id: string; full_name: string; role: string }
type TutorRow = {
  id: string
  qualification: string | null
  verified: boolean
  profiles: { full_name: string } | null
}
type BookingRow = {
  id: string
  payment_status: string
  booking_status: string
  profiles: { full_name: string } | null
  classes: { title: string; price: number } | null
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [tutors, setTutors] = useState<TutorRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'admin') {
        setLoading(false)
        return
      }
      setIsAdmin(true)

      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name')
      setUsers(usersData || [])

      const { data: tutorsData } = await supabase
        .from('tutor_profiles')
        .select('id, qualification, verified, profiles(full_name)')
      setTutors((tutorsData as unknown as TutorRow[]) || [])

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, payment_status, booking_status, profiles(full_name), classes(title, price)')
        .order('created_at', { ascending: false })
      setBookings((bookingsData as unknown as BookingRow[]) || [])

      setLoading(false)
    }

    init()
  }, [router])

  const toggleVerify = async (tutorId: string, current: boolean) => {
  const { error } = await supabase.from('tutor_profiles').update({ verified: !current }).eq('id', tutorId)
  if (error) {
    setMessage(error.message)
    return
  }
  setTutors((prev) => prev.map((t) => (t.id === tutorId ? { ...t, verified: !current } : t)))

  if (!current) {
    await supabase.from('notifications').insert({
      user_id: tutorId,
      title: 'Account Verified',
      message: 'Congratulations! Your tutor account has been verified by our admin team.',
    })
  }
}

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Admin access only.</p>
      </div>
    )
  }

  const refunds = bookings.filter(
    (b) => b.booking_status === 'cancelled' || b.payment_status === 'refunded'
  )
  const totalRefunded = refunds
    .filter((b) => b.payment_status === 'refunded')
    .reduce((sum, b) => sum + (b.classes?.price || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Tutor Verification</h2>
          {tutors.length === 0 ? (
            <p className="text-gray-500">No tutors yet.</p>
          ) : (
            <ul className="space-y-2">
              {tutors.map((t) => (
                <li key={t.id} className="flex justify-between items-center border border-gray-200 rounded-lg p-3">
                  <div>
                    <p className="font-medium">{t.profiles?.full_name}</p>
                    <p className="text-sm text-gray-500">{t.qualification}</p>
                  </div>
                  <button
                    onClick={() => toggleVerify(t.id, t.verified)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      t.verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t.verified ? 'Verified ✓' : 'Verify'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Refunds & Cancellations</h2>
            <span className="text-sm font-medium text-red-600">
              Total refunded: RM{totalRefunded.toFixed(2)}
            </span>
          </div>
          {refunds.length === 0 ? (
            <p className="text-gray-500 text-sm">No cancellations or refunds yet.</p>
          ) : (
            <ul className="space-y-2">
              {refunds.map((b) => (
                <li key={b.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                  <p className="font-medium">{b.classes?.title}</p>
                  <p className="text-gray-500">
                    {b.profiles?.full_name} · RM{b.classes?.price} ·{' '}
                    <span className={b.payment_status === 'refunded' ? 'text-red-600 font-medium' : ''}>
                      {b.payment_status === 'refunded' ? 'Refunded' : b.payment_status}
                    </span>
                    {' · '}
                    {b.booking_status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">All Users ({users.length})</h2>
          <ul className="space-y-1 text-sm">
            {users.map((u) => (
              <li key={u.id} className="flex justify-between border-b border-gray-100 py-2">
                <span>{u.full_name}</span>
                <span className="text-gray-500 capitalize">{u.role}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">All Bookings ({bookings.length})</h2>
          <ul className="space-y-2">
            {bookings.map((b) => (
              <li key={b.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-medium">{b.classes?.title}</p>
                <p className="text-gray-500">
                  {b.profiles?.full_name} · {b.payment_status} · {b.booking_status}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>
    </div>
  )
}