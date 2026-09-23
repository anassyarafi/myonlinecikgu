'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type ClassListing = {
  id: string
  title: string
  scheduled_at: string
  price: number
  status: string
  subjects: { name: string; education_level: string } | null
  tutor_profiles: {
    id: string
    hourly_rate: number
    qualification: string | null
    profiles: { full_name: string } | null
  } | null
}

type BookingState = 'idle' | 'awaiting_payment' | 'paid'

export default function BrowsePage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassListing[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Record<string, { id: string; state: BookingState }>>({})
  const [message, setMessage] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({})

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setRole(profile?.role ?? null)
      }

      const { data, error } = await supabase
        .from('classes')
        .select(
          'id, title, scheduled_at, price, status, subjects(name, education_level), tutor_profiles(id, hourly_rate, qualification, profiles(full_name))'
        )
        .eq('status', 'open')
        .order('scheduled_at')

      if (!error && data) {
        setClasses(data as unknown as ClassListing[])
      }

      const { data: reviewsData } = await supabase.from('reviews').select('tutor_id, rating')
      if (reviewsData) {
        const grouped: Record<string, number[]> = {}
        reviewsData.forEach((r) => {
          if (!grouped[r.tutor_id]) grouped[r.tutor_id] = []
          grouped[r.tutor_id].push(r.rating)
        })
        const avgMap: Record<string, { avg: number; count: number }> = {}
        Object.entries(grouped).forEach(([tutorId, ratingsArr]) => {
          const sum = ratingsArr.reduce((a, b) => a + b, 0)
          avgMap[tutorId] = { avg: sum / ratingsArr.length, count: ratingsArr.length }
        })
        setRatings(avgMap)
      }

      setLoading(false)
    }

    init()
  }, [])

  const subjectOptions = useMemo(() => {
    const names = classes.map((c) => c.subjects?.name).filter(Boolean) as string[]
    return Array.from(new Set(names)).sort()
  }, [classes])

  const filtered = classes.filter((c) => {
    if (levelFilter && c.subjects?.education_level !== levelFilter) return false
    if (subjectFilter && c.subjects?.name !== subjectFilter) return false
    if (maxPrice && c.price > Number(maxPrice)) return false
    return true
  })

  const handleBookNow = async (classId: string) => {
    setMessage('')

    if (!userId) {
      router.push('/login')
      return
    }

    if (role !== 'student') {
      setMessage('Only student accounts can book classes.')
      return
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        class_id: classId,
        student_id: userId,
        payment_status: 'pending',
        booking_status: 'confirmed',
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setBookings((prev) => ({ ...prev, [classId]: { id: data.id, state: 'awaiting_payment' } }))
  }

  const handleConfirmPayment = async (classId: string) => {
    const booking = bookings[classId]
    if (!booking) return

    const { error } = await supabase
      .from('bookings')
      .update({ payment_status: 'paid' })
      .eq('id', booking.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setBookings((prev) => ({ ...prev, [classId]: { ...prev[classId], state: 'paid' } }))
    setMessage('Payment confirmed! Class booked.')
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Find a Tutor</h1>
          <p className="text-gray-500">Browse available classes</p>
        </div>

        <div className="flex gap-2">
          {['', 'primary', 'secondary', 'university'].map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                levelFilter === level
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {level === '' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
          >
            <option value="">All Subjects</option>
            {subjectOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Max price (RM)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm w-40"
          />
        </div>

        {message && <p className="text-sm text-blue-600">{message}</p>}

        {loading ? (
          <p className="text-gray-500">Loading classes...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500">No classes available yet.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((c) => {
              const booking = bookings[c.id]
              const tutorRating = c.tutor_profiles?.id ? ratings[c.tutor_profiles.id] : undefined

              return (
                <div key={c.id} className="bg-white rounded-2xl shadow p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{c.title}</h2>
                      <p className="text-sm text-gray-500">
                        {c.subjects?.name} · {c.subjects?.education_level}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Tutor: {c.tutor_profiles?.profiles?.full_name ?? 'Unknown'}
                        {c.tutor_profiles?.qualification ? ` · ${c.tutor_profiles.qualification}` : ''}
                        {tutorRating && (
                          <> · ⭐ {tutorRating.avg.toFixed(1)} ({tutorRating.count})</>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(c.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">RM{c.price}</p>

                      {!booking && (
                        <button
                          onClick={() => handleBookNow(c.id)}
                          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          Book Now
                        </button>
                      )}

                      {booking?.state === 'awaiting_payment' && (
                        <button
                          onClick={() => handleConfirmPayment(c.id)}
                          className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                          Confirm Payment (Mock)
                        </button>
                      )}

                      {booking?.state === 'paid' && (
                        <div className="mt-2">
                          <p className="text-green-600 font-medium text-sm">✓ Booked & Paid</p>
                          <Link
                            href={`/classroom/${booking.id}`}
                            className="text-blue-600 underline text-sm"
                          >
                            Enter Classroom
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}