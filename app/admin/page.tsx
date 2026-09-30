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
type SubjectRow = { id: string; name: string; education_level: string }
type ComplaintRow = {
  id: string
  subject: string
  description: string
  status: string
  created_at: string
  profiles: { full_name: string } | null
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [tutors, setTutors] = useState<TutorRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectLevel, setNewSubjectLevel] = useState('primary')
  const [complaints, setComplaints] = useState<ComplaintRow[]>([])
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

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, education_level')
        .order('name')
      setSubjects(subjectsData || [])

      const { data: complaintsData } = await supabase
        .from('complaints')
        .select('id, subject, description, status, created_at, profiles(full_name)')
        .order('created_at', { ascending: false })
      setComplaints((complaintsData as unknown as ComplaintRow[]) || [])

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

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return

    const { data, error } = await supabase
      .from('subjects')
      .insert({ name: newSubjectName.trim(), education_level: newSubjectLevel })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setSubjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewSubjectName('')
  }

  const handleDeleteSubject = async (subjectId: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId)
    if (error) {
      setMessage(error.message)
      return
    }
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId))
  }

  const updateComplaintStatus = async (complaintId: string, status: string) => {
    const { error } = await supabase.from('complaints').update({ status }).eq('id', complaintId)
    if (error) {
      setMessage(error.message)
      return
    }
    setComplaints((prev) => prev.map((c) => (c.id === complaintId ? { ...c, status } : c)))
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

  const openComplaintsCount = complaints.filter((c) => c.status !== 'resolved').length

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>

        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Complaints & Disputes</h2>
            {openComplaintsCount > 0 && (
              <span className="text-sm font-medium text-red-600">{openComplaintsCount} open</span>
            )}
          </div>
          {complaints.length === 0 ? (
            <p className="text-gray-500 text-sm">No complaints filed.</p>
          ) : (
            <ul className="space-y-3">
              {complaints.map((c) => (
                <li key={c.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm">{c.subject}</p>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        c.status === 'resolved'
                          ? 'bg-green-100 text-green-700'
                          : c.status === 'in_review'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{c.description}</p>
                  <p className="text-xs text-gray-400 mb-2">
                    Filed by {c.profiles?.full_name ?? 'Unknown'} ·{' '}
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    {c.status !== 'in_review' && (
                      <button
                        onClick={() => updateComplaintStatus(c.id, 'in_review')}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark In Review
                      </button>
                    )}
                    {c.status !== 'resolved' && (
                      <button
                        onClick={() => updateComplaintStatus(c.id, 'resolved')}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

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
          <h2 className="text-xl font-semibold mb-4">Manage Subjects</h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Subject name (e.g. Chemistry)"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={newSubjectLevel}
              onChange={(e) => setNewSubjectLevel(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="university">University</option>
            </select>
            <button
              onClick={handleAddSubject}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Add
            </button>
          </div>

          <ul className="space-y-1">
            {subjects.map((s) => (
              <li key={s.id} className="flex justify-between items-center border-b border-gray-100 py-2 text-sm">
                <span>
                  {s.name} <span className="text-gray-400">({s.education_level})</span>
                </span>
                <button
                  onClick={() => handleDeleteSubject(s.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
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