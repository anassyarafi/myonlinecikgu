'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type BookingDetail = {
  id: string
  booking_status: string
  payment_status: string
  classes: {
    id: string
    title: string
    scheduled_at: string
    tutor_id: string
  } | null
}

export default function ClassroomPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.bookingId as string

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [notAllowed, setNotAllowed] = useState(false)

  const [attendanceId, setAttendanceId] = useState<string | null>(null)
  const [attended, setAttended] = useState(false)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_status, payment_status, classes(id, title, scheduled_at, tutor_id)')
        .eq('id', bookingId)
        .single()

      if (error || !data) {
        setNotAllowed(true)
        setLoading(false)
        return
      }

      setBooking(data as unknown as BookingDetail)

      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id, attended, notes')
        .eq('booking_id', bookingId)
        .single()

      if (existingAttendance) {
        setAttendanceId(existingAttendance.id)
        setAttended(existingAttendance.attended)
        setNotes(existingAttendance.notes || '')
      }

      setLoading(false)
    }

    init()
  }, [bookingId, router])

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault()

    if (attendanceId) {
      const { error } = await supabase
        .from('attendance')
        .update({ attended, notes })
        .eq('id', attendanceId)

      if (error) {
        setMessage(error.message)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('attendance')
        .insert({ booking_id: bookingId, attended, notes })
        .select()
        .single()

      if (error) {
        setMessage(error.message)
        return
      }
      setAttendanceId(data.id)
    }

    setMessage('Attendance saved!')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (notAllowed || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">You don&apos;t have access to this classroom.</p>
      </div>
    )
  }

  const roomName = `myonlinecikgu-${bookingId}`

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{booking.classes?.title}</h1>
          <p className="text-gray-500">
            {booking.classes?.scheduled_at && new Date(booking.classes.scheduled_at).toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden" style={{ height: '500px' }}>
          <iframe
            src={`https://meet.jit.si/${roomName}`}
            style={{ width: '100%', height: '100%', border: 0 }}
            allow="camera; microphone; fullscreen; display-capture"
          />
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Attendance & Notes</h2>
          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={attended}
                onChange={(e) => setAttended(e.target.checked)}
              />
              <span className="text-sm text-gray-700">Student attended this class</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="What was covered in this class..."
              />
            </div>

            {message && <p className="text-sm text-green-600">{message}</p>}

            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
              Save Attendance
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}