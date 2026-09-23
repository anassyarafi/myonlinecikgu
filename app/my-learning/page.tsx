'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type LearningRecord = {
  id: string
  payment_status: string
  booking_status: string
  classes: {
    title: string
    scheduled_at: string
    price: number
    subjects: { name: string } | null
    tutor_profiles: { id: string; profiles: { full_name: string } | null } | null
  } | null
  attendance: { attended: boolean; notes: string | null }[]
}

type ReviewRow = {
  booking_id: string
  rating: number
  comment: string | null
}

export default function MyLearningPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [notStudent, setNotStudent] = useState(false)
  const [records, setRecords] = useState<LearningRecord[]>([])
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({})
  const [ratingInputs, setRatingInputs] = useState<Record<string, number>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'student') {
        setNotStudent(true)
        setLoading(false)
        return
      }

      setUserId(user.id)
      await loadRecords(user.id)
      setLoading(false)
    }

    init()
  }, [router])

  const loadRecords = async (uid: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        'id, payment_status, booking_status, classes(title, scheduled_at, price, subjects(name), tutor_profiles(id, profiles(full_name))), attendance(attended, notes)'
      )
      .eq('student_id', uid)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setRecords(data as unknown as LearningRecord[])
    }

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('booking_id, rating, comment')
      .eq('student_id', uid)

    const reviewMap: Record<string, ReviewRow> = {}
    ;(reviewsData || []).forEach((r) => {
      reviewMap[r.booking_id] = r
    })
    setReviews(reviewMap)
  }

  const handleCancelBooking = async (bookingId: string, wasPaid: boolean) => {
    setMessage('')

    const { error } = await supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        payment_status: wasPaid ? 'refunded' : 'pending',
      })
      .eq('id', bookingId)

    if (error) {
      setMessage(error.message)
      return
    }

    setRecords((prev) =>
      prev.map((r) =>
        r.id === bookingId
          ? { ...r, booking_status: 'cancelled', payment_status: wasPaid ? 'refunded' : r.payment_status }
          : r
      )
    )
    setMessage(wasPaid ? 'Booking cancelled and refunded.' : 'Booking cancelled.')
  }

  const handleSubmitReview = async (bookingId: string, tutorId: string | undefined) => {
    if (!userId || !tutorId) return
    const rating = ratingInputs[bookingId]
    if (!rating) {
      setMessage('Please select a star rating first.')
      return
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId,
        student_id: userId,
        tutor_id: tutorId,
        rating,
        comment: commentInputs[bookingId] || null,
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setReviews((prev) => ({ ...prev, [bookingId]: data }))
    setMessage('Review submitted!')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (notStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">This page is only for student accounts.</p>
      </div>
    )
  }

  const totalClasses = records.length
  const attendedCount = records.filter((r) => r.attendance[0]?.attended).length
  const subjectsCovered = new Set(records.map((r) => r.classes?.subjects?.name).filter(Boolean)).size

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">My Learning Record</h1>

        <div className="bg-white rounded-2xl shadow p-6 grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Classes Booked</p>
            <p className="text-2xl font-bold text-blue-600">{totalClasses}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Classes Attended</p>
            <p className="text-2xl font-bold text-gray-900">{attendedCount}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Subjects Covered</p>
            <p className="text-2xl font-bold text-gray-900">{subjectsCovered}</p>
          </div>
        </div>

        {message && <p className="text-sm text-blue-600">{message}</p>}

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Class History</h2>
          {records.length === 0 ? (
            <p className="text-gray-500">No classes booked yet.</p>
          ) : (
            <ul className="space-y-3">
              {records.map((r) => {
                const attendance = r.attendance[0]
                const existingReview = reviews[r.id]
                const tutorId = r.classes?.tutor_profiles?.id
                const isCancelled = r.booking_status === 'cancelled'
                const isUpcoming = r.classes?.scheduled_at
                  ? new Date(r.classes.scheduled_at) > new Date()
                  : false
                const canCancel = isUpcoming && !isCancelled

                return (
                  <li key={r.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{r.classes?.title}</p>
                        <p className="text-sm text-gray-500">
                          {r.classes?.subjects?.name} · Tutor:{' '}
                          {r.classes?.tutor_profiles?.profiles?.full_name ?? 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {r.classes?.scheduled_at &&
                            new Date(r.classes.scheduled_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            isCancelled
                              ? 'bg-red-100 text-red-700'
                              : attendance?.attended
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isCancelled
                            ? `Cancelled${r.payment_status === 'refunded' ? ' · Refunded' : ''}`
                            : attendance?.attended
                            ? 'Attended'
                            : 'Not marked'}
                        </span>
                      </div>
                    </div>

                    {attendance?.notes && !isCancelled && (
                      <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">
                        Notes: {attendance.notes}
                      </p>
                    )}

                    {canCancel && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <button
                          onClick={() =>
                            handleCancelBooking(r.id, r.payment_status === 'paid')
                          }
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Cancel Booking{r.payment_status === 'paid' ? ' & Request Refund' : ''}
                        </button>
                      </div>
                    )}

                    {!isCancelled && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        {r.payment_status !== 'paid' ? (
                          <p className="text-xs text-gray-400">Rating available after payment.</p>
                        ) : existingReview ? (
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Your rating: {'★'.repeat(existingReview.rating)}
                              {'☆'.repeat(5 - existingReview.rating)}
                            </p>
                            {existingReview.comment && (
                              <p className="text-sm text-gray-500 mt-1">{existingReview.comment}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() =>
                                    setRatingInputs((prev) => ({ ...prev, [r.id]: star }))
                                  }
                                  className={`text-xl ${
                                    (ratingInputs[r.id] || 0) >= star
                                      ? 'text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Leave a comment (optional)"
                              value={commentInputs[r.id] || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                            />
                            <button
                              onClick={() => handleSubmitReview(r.id, tutorId)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                              Submit Review
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}