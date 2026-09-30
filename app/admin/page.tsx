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
  filed_by: string
  profiles: { full_name: string } | null
  bookings: { classes: { tutor_id: string } | null } | null
}

const cardClass = 'bg-white border-2 border-[#D8D2C4] rounded-2xl p-6'

type Tab = 'complaints' | 'tutors' | 'subjects' | 'refunds' | 'users'

const TABS: { id: Tab; label: string }[] = [
  { id: 'complaints', label: 'Complaints' },
  { id: 'tutors', label: 'Tutor Verification' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'users', label: 'Users & Bookings' },
]

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('complaints')
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
        .select('id, subject, description, status, created_at, filed_by, profiles(full_name), bookings(classes(tutor_id))')
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

  const updateComplaintStatus = async (complaint: ComplaintRow, status: string) => {
    const { error } = await supabase.from('complaints').update({ status }).eq('id', complaint.id)
    if (error) {
      setMessage(error.message)
      return
    }
    setComplaints((prev) => prev.map((c) => (c.id === complaint.id ? { ...c, status } : c)))

    const statusLabel = status === 'in_review' ? 'is now being reviewed' : 'has been resolved'

    await supabase.from('notifications').insert({
      user_id: complaint.filed_by,
      title: 'Complaint Update',
      message: `Your complaint "${complaint.subject}" ${statusLabel} by our admin team.`,
    })

    const tutorId = complaint.bookings?.classes?.tutor_id
    if (tutorId) {
      await supabase.from('notifications').insert({
        user_id: tutorId,
        title: 'Complaint Update',
        message: `A complaint related to one of your classes ${statusLabel}.`,
      })
    }

    setMessage('Complaint status updated and notifications sent.')
  }

  if (loading) {
    return <div className="min-h-screen bg-[#F6F3EC] flex items-center justify-center text-[#1C3529]">Loading...</div>
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F6F3EC] flex items-center justify-center">
        <p className="text-[#332B1F]">Admin access only.</p>
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
    <div className="min-h-screen bg-[#F6F3EC] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1
          className="text-3xl font-semibold text-[#1C3529]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Admin Panel
        </h1>

        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border relative ${
                activeTab === tab.id
                  ? 'bg-[#2B5D45] text-white border-[#2B5D45]'
                  : 'bg-white text-[#1C3529] border-[#D8D2C4]'
              }`}
            >
              {tab.label}
              {tab.id === 'complaints' && openComplaintsCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center bg-[#C6503F] text-white text-xs rounded-full w-4 h-4">
                  {openComplaintsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {message && <p className="text-sm text-[#C6503F]">{message}</p>}

        {activeTab === 'complaints' && (
          <div className={cardClass}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[#1C3529]">Complaints & Disputes</h2>
              {openComplaintsCount > 0 && (
                <span className="text-sm font-medium text-[#C6503F]">{openComplaintsCount} open</span>
              )}
            </div>
            {complaints.length === 0 ? (
              <p className="text-[#4A4437] text-sm">No complaints filed.</p>
            ) : (
              <ul className="space-y-3">
                {complaints.map((c) => (
                  <li key={c.id} className="border border-[#D8D2C4] rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm text-[#1C3529]">{c.subject}</p>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          c.status === 'resolved'
                            ? 'bg-[#DCEADF] text-[#2B5D45]'
                            : c.status === 'in_review'
                            ? 'bg-[#FCEFD2] text-[#8A6111]'
                            : 'bg-[#F6DAD5] text-[#C6503F]'
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-[#4A4437] mb-1">{c.description}</p>
                    <p className="text-xs text-[#4A4437] mb-2">
                      Filed by {c.profiles?.full_name ?? 'Unknown'} ·{' '}
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                    <div className="flex gap-3">
                      {c.status !== 'in_review' && (
                        <button
                          onClick={() => updateComplaintStatus(c, 'in_review')}
                          className="text-xs text-[#1C3529] hover:underline"
                        >
                          Mark In Review
                        </button>
                      )}
                      {c.status !== 'resolved' && (
                        <button
                          onClick={() => updateComplaintStatus(c, 'resolved')}
                          className="text-xs text-[#2B5D45] hover:underline"
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
        )}

        {activeTab === 'tutors' && (
          <div className={cardClass}>
            <h2 className="text-xl font-semibold text-[#1C3529] mb-4">Tutor Verification</h2>
            {tutors.length === 0 ? (
              <p className="text-[#4A4437]">No tutors yet.</p>
            ) : (
              <ul className="space-y-2">
                {tutors.map((t) => (
                  <li key={t.id} className="flex justify-between items-center border border-[#D8D2C4] rounded-lg p-3">
                    <div>
                      <p className="font-medium text-[#1C3529]">{t.profiles?.full_name}</p>
                      <p className="text-sm text-[#4A4437]">{t.qualification}</p>
                    </div>
                    <button
                      onClick={() => toggleVerify(t.id, t.verified)}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        t.verified ? 'bg-[#DCEADF] text-[#2B5D45]' : 'bg-[#EFEAE0] text-[#4A4437]'
                      }`}
                    >
                      {t.verified ? 'Verified ✓' : 'Verify'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className={cardClass}>
            <h2 className="text-xl font-semibold text-[#1C3529] mb-4">Manage Subjects</h2>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                placeholder="Subject name (e.g. Chemistry)"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="flex-1 rounded-lg border border-[#D8D2C4] px-3 py-2 text-sm"
              />
              <select
                value={newSubjectLevel}
                onChange={(e) => setNewSubjectLevel(e.target.value)}
                className="w-full sm:w-auto rounded-lg border border-[#D8D2C4] px-3 py-2 text-sm"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="university">University</option>
              </select>
              <button
                onClick={handleAddSubject}
                className="w-full sm:w-auto bg-[#2B5D45] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#1F4634]"
              >
                Add
              </button>
            </div>

            <ul className="space-y-1">
              {subjects.map((s) => (
                <li key={s.id} className="flex justify-between items-center border-b border-[#EFEAE0] py-2 text-sm">
                  <span className="text-[#1C3529]">
                    {s.name} <span className="text-[#4A4437]">({s.education_level})</span>
                  </span>
                  <button
                    onClick={() => handleDeleteSubject(s.id)}
                    className="text-[#C6503F] hover:opacity-80 text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'refunds' && (
          <div className={cardClass}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-4">
              <h2 className="text-xl font-semibold text-[#1C3529]">Refunds & Cancellations</h2>
              <span className="text-sm font-medium text-[#C6503F]">
                Total refunded: RM{totalRefunded.toFixed(2)}
              </span>
            </div>
            {refunds.length === 0 ? (
              <p className="text-[#4A4437] text-sm">No cancellations or refunds yet.</p>
            ) : (
              <ul className="space-y-2">
                {refunds.map((b) => (
                  <li key={b.id} className="border border-[#D8D2C4] rounded-lg p-3 text-sm">
                    <p className="font-medium text-[#1C3529]">{b.classes?.title}</p>
                    <p className="text-[#4A4437]">
                      {b.profiles?.full_name} · RM{b.classes?.price} ·{' '}
                      <span className={b.payment_status === 'refunded' ? 'text-[#C6503F] font-medium' : ''}>
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
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className={cardClass}>
              <h2 className="text-xl font-semibold text-[#1C3529] mb-4">All Users ({users.length})</h2>
              <ul className="space-y-1 text-sm">
                {users.map((u) => (
                  <li key={u.id} className="flex justify-between border-b border-[#EFEAE0] py-2">
                    <span className="text-[#1C3529]">{u.full_name}</span>
                    <span className="text-[#4A4437] capitalize">{u.role}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cardClass}>
              <h2 className="text-xl font-semibold text-[#1C3529] mb-4">All Bookings ({bookings.length})</h2>
              <ul className="space-y-2">
                {bookings.map((b) => (
                  <li key={b.id} className="border border-[#D8D2C4] rounded-lg p-3 text-sm">
                    <p className="font-medium text-[#1C3529]">{b.classes?.title}</p>
                    <p className="text-[#4A4437]">
                      {b.profiles?.full_name} · {b.payment_status} · {b.booking_status}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}