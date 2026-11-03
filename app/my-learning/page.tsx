'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

type Notice = { type: 'success' | 'error'; text: string }
type Tab = 'upcoming' | 'past' | 'cancelled'

const fieldClass =
  'w-full h-12 px-3.5 rounded-[10px] border border-[#C5CDD6] bg-white text-base text-[#0F1B2D] outline-none focus:border-[#0A7B83] focus:ring-4 focus:ring-[#E1F1F2]'
const primaryButton =
  'h-11 px-4 rounded-[10px] bg-[#0A7B83] text-white text-sm font-bold hover:bg-[#075A61] disabled:opacity-50 inline-flex items-center justify-center'
const secondaryButton =
  'h-11 px-4 rounded-[10px] border border-[#0A7B83] bg-white text-[#075A61] text-sm font-bold hover:bg-[#E1F1F2] inline-flex items-center justify-center'
const quietButton =
  'h-11 px-3 rounded-[10px] text-sm font-semibold text-[#566274] hover:bg-[#F3F5F7] inline-flex items-center justify-center'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

function Chip({ tone, children }: { tone: 'good' | 'wait' | 'bad' | 'neutral'; children: React.ReactNode }) {
  const styles = {
    good: 'bg-[#E1F1F2] text-[#075A61]',
    wait: 'bg-[#FCEFD2] text-[#8A6111]',
    bad: 'bg-[#F6DAD5] text-[#A23E2A]',
    neutral: 'bg-[#EBEEF2] text-[#566274]',
  }[tone]
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-bold ${styles}`}>{children}</span>
  )
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
  const [notice, setNotice] = useState<Notice | null>(null)
  const [tab, setTab] = useState<Tab>('upcoming')
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportSubject, setReportSubject] = useState('')
  const [reportDescription, setReportDescription] = useState('')

  const showNotice = (type: Notice['type'], text: string) => setNotice({ type, text })

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

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

  const handlePayNow = async (bookingId: string) => {
    const record = records.find((r) => r.id === bookingId)

    const { error } = await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', bookingId)

    if (error) {
      showNotice('error', error.message)
      return
    }

    setRecords((prev) => prev.map((r) => (r.id === bookingId ? { ...r, payment_status: 'paid' } : r)))
    showNotice('success', 'Payment confirmed. Your class is booked.')

    if (record?.classes?.tutor_profiles?.id) {
      await supabase.from('notifications').insert({
        user_id: record.classes.tutor_profiles.id,
        title: 'Payment Received',
        message: `Payment confirmed for "${record.classes.title}". RM${record.classes.price} added to your earnings.`,
      })
    }
  }

  const handleCancelBooking = async (bookingId: string, wasPaid: boolean) => {
    const cancelledRecord = records.find((r) => r.id === bookingId)

    const { error } = await supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        payment_status: wasPaid ? 'refunded' : 'pending',
      })
      .eq('id', bookingId)

    if (error) {
      showNotice('error', error.message)
      return
    }

    if (cancelledRecord?.classes?.tutor_profiles?.id) {
      await supabase.from('notifications').insert({
        user_id: cancelledRecord.classes.tutor_profiles.id,
        title: 'Booking Cancelled',
        message: `A student cancelled their booking for "${cancelledRecord.classes.title}".${wasPaid ? ' Refund processed.' : ''}`,
      })
    }

    setRecords((prev) =>
      prev.map((r) =>
        r.id === bookingId
          ? { ...r, booking_status: 'cancelled', payment_status: wasPaid ? 'refunded' : r.payment_status }
          : r
      )
    )
    setConfirmingCancelId(null)
    showNotice('success', wasPaid ? 'Booking cancelled and refunded.' : 'Booking cancelled.')
  }

  const handleSubmitReview = async (bookingId: string, tutorId: string | undefined) => {
    if (!userId || !tutorId) return
    const rating = ratingInputs[bookingId]
    if (!rating) {
      showNotice('error', 'Choose a star rating first.')
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
      showNotice('error', error.message)
      return
    }

    setReviews((prev) => ({ ...prev, [bookingId]: data }))
    showNotice('success', 'Review submitted. Thank you.')
  }

  const handleSubmitReport = async (e: React.FormEvent, bookingId: string) => {
    e.preventDefault()
    if (!userId) return

    const { error } = await supabase.from('complaints').insert({
      booking_id: bookingId,
      filed_by: userId,
      subject: reportSubject,
      description: reportDescription,
    })

    if (error) {
      showNotice('error', error.message)
      return
    }

    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((a) => ({
          user_id: a.id,
          title: 'New Complaint',
          message: `A student reported an issue: "${reportSubject}".`,
        }))
      )
    }

    setReportingId(null)
    setReportSubject('')
    setReportDescription('')
    showNotice('success', 'Issue reported. Our team will review it.')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5">
        <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
          <div className="h-10 w-48 bg-[#E6EAEE] rounded-lg" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 bg-[#E6EAEE] rounded-[14px]" />
            ))}
          </div>
          <div className="h-40 bg-[#E6EAEE] rounded-[14px]" />
        </div>
      </main>
    )
  }

  if (notStudent) {
    return (
      <main className="min-h-screen bg-[#F3F5F7] flex items-center justify-center px-4">
        <p className="text-[#566274]">This page is only for student accounts.</p>
      </main>
    )
  }

  const now = new Date()
  const isCancelledRec = (r: LearningRecord) => r.booking_status === 'cancelled'
  const isUpcomingRec = (r: LearningRecord) =>
    r.classes?.scheduled_at ? new Date(r.classes.scheduled_at) > now : false

  const upcoming = records.filter((r) => !isCancelledRec(r) && isUpcomingRec(r))
  const past = records.filter((r) => !isCancelledRec(r) && !isUpcomingRec(r))
  const cancelled = records.filter((r) => isCancelledRec(r))

  const lists: Record<Tab, LearningRecord[]> = { upcoming, past, cancelled }
  const visible = lists[tab]

  const totalClasses = records.length
  const attendedCount = records.filter((r) => r.attendance[0]?.attended).length
  const subjectsCovered = new Set(records.map((r) => r.classes?.subjects?.name).filter(Boolean)).size

  const emptyText: Record<Tab, { title: string; body: string }> = {
    upcoming: { title: 'No upcoming classes', body: 'Find a tutor and book your next class.' },
    past: { title: 'No past classes yet', body: 'Classes you have finished show up here, with notes and ratings.' },
    cancelled: { title: 'No cancelled classes', body: 'Anything you cancel will be listed here.' },
  }

  return (
    <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5 pb-10">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-[#0F1B2D]">My learning</h1>
          <p className="text-sm text-[#566274] mt-1">Your classes, notes and ratings in one place.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Booked</p>
            <p className="text-[22px] font-extrabold text-[#075A61] mt-1">{totalClasses}</p>
          </div>
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Attended</p>
            <p className="text-[22px] font-extrabold mt-1">{attendedCount}</p>
          </div>
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Subjects</p>
            <p className="text-[22px] font-extrabold mt-1">{subjectsCovered}</p>
          </div>
        </div>

        <div className="flex gap-6 border-b border-[#DDE2E8]">
          {(
            [
              { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
              { id: 'past', label: 'Past', count: past.length },
              { id: 'cancelled', label: 'Cancelled', count: cancelled.length },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`pt-2 pb-3 -mb-px text-sm border-b-[3px] flex items-center gap-1.5 ${
                tab === t.id
                  ? 'font-bold text-[#0A7B83] border-[#0A7B83]'
                  : 'font-semibold text-[#566274] border-transparent'
              }`}
            >
              {t.label}
              <span
                className={`min-w-5 h-5 px-1.5 rounded-full text-xs flex items-center justify-center ${
                  tab === t.id ? 'bg-[#E1F1F2] text-[#075A61]' : 'bg-[#EBEEF2] text-[#566274]'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-8 text-center">
            <p className="font-bold">{emptyText[tab].title}</p>
            <p className="text-sm text-[#566274] mt-1">{emptyText[tab].body}</p>
            {tab === 'upcoming' && (
              <Link href="/browse" className={`${primaryButton} mt-4`}>
                Find a tutor
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((r) => {
              const attendance = r.attendance[0]
              const existingReview = reviews[r.id]
              const tutorId = r.classes?.tutor_profiles?.id
              const cancelledRow = isCancelledRec(r)
              const upcomingRow = isUpcomingRec(r)
              const paid = r.payment_status === 'paid'
              const canCancel = upcomingRow && !cancelledRow
              const isConfirming = confirmingCancelId === r.id
              const isReporting = reportingId === r.id

              let chip: React.ReactNode
              if (cancelledRow) {
                chip = <Chip tone="bad">{r.payment_status === 'refunded' ? 'Cancelled and refunded' : 'Cancelled'}</Chip>
              } else if (attendance?.attended) {
                chip = <Chip tone="good">Attended</Chip>
              } else if (!paid) {
                chip = <Chip tone="wait">Payment pending</Chip>
              } else if (upcomingRow) {
                chip = <Chip tone="good">Confirmed</Chip>
              } else {
                chip = <Chip tone="neutral">Not marked</Chip>
              }

              return (
                <li key={r.id} className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-[15px] text-[#0F1B2D]">{r.classes?.title}</h2>
                      <p className="text-[13px] text-[#566274] mt-0.5">
                        {r.classes?.subjects?.name}, with{' '}
                        {r.classes?.tutor_profiles?.profiles?.full_name ?? 'unknown tutor'}
                      </p>
                      <p className="text-[13px] text-[#566274]">
                        {r.classes?.scheduled_at && formatDate(r.classes.scheduled_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right space-y-1.5">
                      {chip}
                      {r.classes?.price !== undefined && (
                        <p className="text-[15px] font-extrabold">RM{r.classes.price}</p>
                      )}
                    </div>
                  </div>

                  {attendance?.notes && !cancelledRow && (
                    <div className="mt-3 bg-[#F3F5F7] rounded-[10px] p-3">
                      <p className="text-[13px] font-semibold">Tutor notes</p>
                      <p className="text-sm text-[#566274] mt-0.5">{attendance.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {!cancelledRow && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!paid && (
                        <button onClick={() => handlePayNow(r.id)} className={primaryButton}>
                          Pay now (mock)
                        </button>
                      )}
                      {paid && (
                        <>
                          <Link href={`/classroom/${r.id}`} className={primaryButton}>
                            Enter classroom
                          </Link>
                          <Link href={`/receipt/${r.id}`} className={secondaryButton}>
                            View receipt
                          </Link>
                        </>
                      )}
                    </div>
                  )}

                  {/* Cancel */}
                  {canCancel && (
                    <div className="mt-3 border-t border-[#EBEEF2] pt-3">
                      {isConfirming ? (
                        <div className="bg-[#FDF3F1] rounded-[10px] p-3">
                          <p className="text-sm font-semibold text-[#A23E2A]">
                            Cancel this booking?{paid ? ' You will get a refund.' : ''}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <button
                              onClick={() => handleCancelBooking(r.id, paid)}
                              className="h-11 px-4 rounded-[10px] bg-[#A23E2A] text-white text-sm font-bold hover:bg-[#8A3322]"
                            >
                              Yes, cancel
                            </button>
                            <button onClick={() => setConfirmingCancelId(null)} className={quietButton}>
                              Keep booking
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingCancelId(r.id)}
                          className="h-11 px-1 text-sm font-bold text-[#A23E2A] hover:underline"
                        >
                          Cancel booking{paid ? ' and get refund' : ''}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Rating */}
                  {!cancelledRow && paid && !upcomingRow && (
                    <div className="mt-3 border-t border-[#EBEEF2] pt-3">
                      {existingReview ? (
                        <div>
                          <p className="text-[13px] font-semibold">Your rating</p>
                          <p className="text-xl text-[#E8A317]" aria-label={`${existingReview.rating} out of 5 stars`}>
                            {'★'.repeat(existingReview.rating)}
                            <span className="text-[#C5CDD6]">{'★'.repeat(5 - existingReview.rating)}</span>
                          </p>
                          {existingReview.comment && (
                            <p className="text-sm text-[#566274] mt-1">{existingReview.comment}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[13px] font-semibold">How was this class?</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                                aria-pressed={(ratingInputs[r.id] || 0) >= star}
                                onClick={() => setRatingInputs((prev) => ({ ...prev, [r.id]: star }))}
                                className={`w-11 h-11 text-3xl leading-none ${
                                  (ratingInputs[r.id] || 0) >= star ? 'text-[#E8A317]' : 'text-[#C5CDD6]'
                                }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Add a comment (optional)"
                            aria-label="Comment"
                            value={commentInputs[r.id] || ''}
                            onChange={(e) => setCommentInputs((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            className={fieldClass}
                          />
                          <button onClick={() => handleSubmitReview(r.id, tutorId)} className={primaryButton}>
                            Submit review
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Report an issue */}
                  {!cancelledRow && paid && (
                    <div className="mt-3 border-t border-[#EBEEF2] pt-3">
                      {isReporting ? (
                        <form onSubmit={(e) => handleSubmitReport(e, r.id)} className="space-y-3">
                          <div>
                            <label htmlFor={`rs-${r.id}`} className="block text-[13px] font-semibold mb-1.5">
                              What went wrong?
                            </label>
                            <input
                              id={`rs-${r.id}`}
                              type="text"
                              required
                              value={reportSubject}
                              onChange={(e) => setReportSubject(e.target.value)}
                              placeholder="e.g. Tutor did not join"
                              className={fieldClass}
                            />
                          </div>
                          <div>
                            <label htmlFor={`rd-${r.id}`} className="block text-[13px] font-semibold mb-1.5">
                              Details
                            </label>
                            <textarea
                              id={`rd-${r.id}`}
                              required
                              rows={3}
                              value={reportDescription}
                              onChange={(e) => setReportDescription(e.target.value)}
                              placeholder="Tell us what happened."
                              className="w-full px-3.5 py-3 rounded-[10px] border border-[#C5CDD6] bg-white text-base text-[#0F1B2D] outline-none focus:border-[#0A7B83] focus:ring-4 focus:ring-[#E1F1F2]"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="submit" className={primaryButton}>
                              Send report
                            </button>
                            <button type="button" onClick={() => setReportingId(null)} className={quietButton}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => {
                            setReportingId(r.id)
                            setReportSubject('')
                            setReportDescription('')
                          }}
                          className="h-11 px-1 text-sm font-semibold text-[#566274] hover:underline"
                        >
                          Report an issue
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className={`fixed z-50 left-4 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:left-auto md:right-6 md:bottom-6 md:w-96 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg flex items-start justify-between gap-3 ${
            notice.type === 'success' ? 'bg-[#075A61] text-white' : 'bg-[#A23E2A] text-white'
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 -mt-1 -mr-1 w-8 h-8 text-lg leading-none">
            ×
          </button>
        </div>
      )}
    </main>
  )
}