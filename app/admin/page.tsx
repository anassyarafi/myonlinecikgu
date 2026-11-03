'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type UserRow = { id: string; full_name: string; role: string }
type TutorRow = {
  id: string
  qualification: string | null
  verified: boolean
  verification_document_url: string | null
  profile_photo_url: string | null
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

type Notice = { type: 'success' | 'error'; text: string }
type Tab = 'complaints' | 'tutors' | 'subjects' | 'refunds' | 'users'

const fieldClass =
  'w-full h-12 px-3.5 rounded-[10px] border border-[#C5CDD6] bg-white text-base text-[#0F1B2D] outline-none focus:border-[#0A7B83] focus:ring-4 focus:ring-[#E1F1F2]'
const primaryButton =
  'h-11 px-4 rounded-[10px] bg-[#0A7B83] text-white text-sm font-bold hover:bg-[#075A61] disabled:opacity-50 inline-flex items-center justify-center'
const secondaryButton =
  'h-11 px-4 rounded-[10px] border border-[#0A7B83] bg-white text-[#075A61] text-sm font-bold hover:bg-[#E1F1F2] inline-flex items-center justify-center'
const quietButton =
  'h-11 px-3 rounded-[10px] text-sm font-semibold text-[#566274] hover:bg-[#F3F5F7] inline-flex items-center justify-center'

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const levelLabel = (level: string) => level.charAt(0).toUpperCase() + level.slice(1)

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

function Avatar({ name, url, size = 56 }: { name: string; url: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className="rounded-full overflow-hidden bg-[#CFE6E7] text-[#0A7B83] font-extrabold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Photo of ${name}`}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        initialsOf(name) || '?'
      )}
    </div>
  )
}

function Chip({ tone, children }: { tone: 'good' | 'wait' | 'bad' | 'neutral'; children: React.ReactNode }) {
  const styles = {
    good: 'bg-[#E1F1F2] text-[#075A61]',
    wait: 'bg-[#FCEFD2] text-[#8A6111]',
    bad: 'bg-[#F6DAD5] text-[#A23E2A]',
    neutral: 'bg-[#EBEEF2] text-[#566274]',
  }[tone]
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-bold capitalize ${styles}`}>
      {children}
    </span>
  )
}

function Panel({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#DDE2E8] rounded-[14px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-bold text-[#0F1B2D]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`h-10 px-4 rounded-[10px] text-sm ${
            value === o.id
              ? 'border-2 border-[#0A7B83] bg-[#E1F1F2] text-[#075A61] font-bold'
              : 'border border-[#C5CDD6] bg-white text-[#0F1B2D] font-medium'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('complaints')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [tutors, setTutors] = useState<TutorRow[]>([])
  const [tutorPhotoUrls, setTutorPhotoUrls] = useState<Record<string, string>>({})
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [complaints, setComplaints] = useState<ComplaintRow[]>([])
  const [notice, setNotice] = useState<Notice | null>(null)

  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectLevel, setNewSubjectLevel] = useState('primary')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [complaintFilter, setComplaintFilter] = useState<'all' | 'open' | 'in_review' | 'resolved'>('all')
  const [tutorFilter, setTutorFilter] = useState<'pending' | 'verified' | 'all'>('pending')
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'student' | 'tutor' | 'admin'>('all')
  const [userSearch, setUserSearch] = useState('')

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
      if (!profile || profile.role !== 'admin') {
        setLoading(false)
        return
      }
      setIsAdmin(true)

      const { data: usersData } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
      setUsers(usersData || [])

      const { data: tutorsData } = await supabase
        .from('tutor_profiles')
        .select('id, qualification, verified, verification_document_url, profile_photo_url, profiles(full_name)')
      const tutorRows = (tutorsData as unknown as TutorRow[]) || []
      setTutors(tutorRows)

      const photoPaths = Array.from(
        new Set(tutorRows.map((t) => t.profile_photo_url).filter(Boolean))
      ) as string[]
      if (photoPaths.length > 0) {
        const { data: signed } = await supabase.storage.from('tutor-uploads').createSignedUrls(photoPaths, 3600)
        if (signed) {
          const map: Record<string, string> = {}
          signed.forEach((s) => {
            if (s.path && s.signedUrl) map[s.path] = s.signedUrl
          })
          setTutorPhotoUrls(map)
        }
      }

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
      showNotice('error', error.message)
      return
    }
    setTutors((prev) => prev.map((t) => (t.id === tutorId ? { ...t, verified: !current } : t)))
    showNotice('success', !current ? 'Tutor verified.' : 'Verification removed.')

    if (!current) {
      await supabase.from('notifications').insert({
        user_id: tutorId,
        title: 'Account Verified',
        message: 'Congratulations! Your tutor account has been verified by our admin team.',
      })
    }
  }

  const handleViewDocument = async (path: string) => {
    const win = window.open('', '_blank')
    const { data, error } = await supabase.storage.from('tutor-uploads').createSignedUrl(path, 600)
    if (error || !data) {
      win?.close()
      showNotice('error', error?.message ?? 'Could not open the document.')
      return
    }
    if (win) {
      win.location.href = data.signedUrl
    } else {
      window.location.href = data.signedUrl
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
      showNotice('error', error.message)
      return
    }

    setSubjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewSubjectName('')
    showNotice('success', 'Subject added.')
  }

  const handleDeleteSubject = async (subjectId: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId)
    if (error) {
      showNotice('error', error.message)
      return
    }
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId))
    setConfirmDeleteId(null)
    showNotice('success', 'Subject removed.')
  }

  const updateComplaintStatus = async (complaint: ComplaintRow, status: string) => {
    const { error } = await supabase.from('complaints').update({ status }).eq('id', complaint.id)
    if (error) {
      showNotice('error', error.message)
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

    showNotice('success', 'Status updated. The student and tutor were notified.')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5">
        <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
          <div className="h-10 w-48 bg-[#E6EAEE] rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#E6EAEE] rounded-[14px]" />
            ))}
          </div>
          <div className="h-48 bg-[#E6EAEE] rounded-[14px]" />
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#F3F5F7] flex items-center justify-center px-4">
        <p className="text-[#566274]">Admin access only.</p>
      </main>
    )
  }

  const refunds = bookings.filter((b) => b.booking_status === 'cancelled' || b.payment_status === 'refunded')
  const totalRefunded = refunds
    .filter((b) => b.payment_status === 'refunded')
    .reduce((sum, b) => sum + (b.classes?.price || 0), 0)

  const isOpenStatus = (s: string) => s !== 'in_review' && s !== 'resolved'
  const openComplaintsCount = complaints.filter((c) => c.status !== 'resolved').length
  const pendingTutors = tutors.filter((t) => !t.verified)

  const visibleComplaints = complaints.filter((c) => {
    if (complaintFilter === 'all') return true
    if (complaintFilter === 'open') return isOpenStatus(c.status)
    return c.status === complaintFilter
  })

  const visibleTutors = tutors
    .filter((t) => {
      if (tutorFilter === 'pending') return !t.verified
      if (tutorFilter === 'verified') return t.verified
      return true
    })
    .sort((a, b) => Number(a.verified) - Number(b.verified))

  const visibleUsers = users.filter((u) => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false
    if (userSearch.trim() && !u.full_name.toLowerCase().includes(userSearch.trim().toLowerCase())) return false
    return true
  })

  const subjectLevels = ['primary', 'secondary', 'university']
  const otherLevels = Array.from(new Set(subjects.map((s) => s.education_level))).filter(
    (l) => !subjectLevels.includes(l)
  )

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'complaints', label: 'Complaints', badge: openComplaintsCount },
    { id: 'tutors', label: 'Tutor verification', badge: pendingTutors.length },
    { id: 'subjects', label: 'Subjects' },
    { id: 'refunds', label: 'Refunds' },
    { id: 'users', label: 'Users & bookings' },
  ]

  return (
    <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5 pb-10">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-[#0F1B2D]">Admin panel</h1>
          <p className="text-sm text-[#566274] mt-1">Review tutors, handle complaints and manage the platform.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Open complaints</p>
            <p className={`text-[22px] font-extrabold mt-1 ${openComplaintsCount > 0 ? 'text-[#A23E2A]' : ''}`}>
              {openComplaintsCount}
            </p>
          </div>
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Tutors to verify</p>
            <p className={`text-[22px] font-extrabold mt-1 ${pendingTutors.length > 0 ? 'text-[#8A6111]' : ''}`}>
              {pendingTutors.length}
            </p>
          </div>
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Users</p>
            <p className="text-[22px] font-extrabold mt-1">{users.length}</p>
          </div>
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Total refunded</p>
            <p className="text-[22px] font-extrabold mt-1">RM{totalRefunded.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-6 border-b border-[#DDE2E8] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={`shrink-0 pt-2 pb-3 -mb-px text-sm border-b-[3px] flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'font-bold text-[#0A7B83] border-[#0A7B83]'
                  : 'font-semibold text-[#566274] border-transparent'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#A23E2A] text-white text-xs flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* COMPLAINTS */}
        {activeTab === 'complaints' && (
          <Panel title="Complaints and disputes">
            <FilterChips
              value={complaintFilter}
              onChange={setComplaintFilter}
              options={[
                { id: 'all', label: `All (${complaints.length})` },
                { id: 'open', label: `Open (${complaints.filter((c) => isOpenStatus(c.status)).length})` },
                { id: 'in_review', label: `In review (${complaints.filter((c) => c.status === 'in_review').length})` },
                { id: 'resolved', label: `Resolved (${complaints.filter((c) => c.status === 'resolved').length})` },
              ]}
            />
            {visibleComplaints.length === 0 ? (
              <div className="text-center py-6">
                <p className="font-bold">No complaints here</p>
                <p className="text-sm text-[#566274] mt-1">New complaints from students will show up in this list.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {visibleComplaints.map((c) => (
                  <li key={c.id} className="border border-[#DDE2E8] rounded-xl p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-[15px]">{c.subject}</p>
                      <Chip tone={c.status === 'resolved' ? 'good' : c.status === 'in_review' ? 'wait' : 'bad'}>
                        {c.status === 'in_review' ? 'In review' : c.status === 'resolved' ? 'Resolved' : 'Open'}
                      </Chip>
                    </div>
                    <p className="text-sm text-[#0F1B2D] mt-1.5">{c.description}</p>
                    <p className="text-[13px] text-[#566274] mt-1.5">
                      From {c.profiles?.full_name ?? 'unknown user'}, {formatDateTime(c.created_at)}
                    </p>
                    {c.status !== 'resolved' && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {c.status !== 'in_review' && (
                          <button onClick={() => updateComplaintStatus(c, 'in_review')} className={secondaryButton}>
                            Mark in review
                          </button>
                        )}
                        <button onClick={() => updateComplaintStatus(c, 'resolved')} className={primaryButton}>
                          Mark resolved
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {/* TUTORS */}
        {activeTab === 'tutors' && (
          <Panel title="Tutor verification">
            <FilterChips
              value={tutorFilter}
              onChange={setTutorFilter}
              options={[
                { id: 'pending', label: `Needs review (${pendingTutors.length})` },
                { id: 'verified', label: `Verified (${tutors.length - pendingTutors.length})` },
                { id: 'all', label: `All (${tutors.length})` },
              ]}
            />
            {visibleTutors.length === 0 ? (
              <div className="text-center py-6">
                <p className="font-bold">Nobody here</p>
                <p className="text-sm text-[#566274] mt-1">
                  {tutorFilter === 'pending' ? 'Every tutor has been reviewed.' : 'No tutors in this list yet.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {visibleTutors.map((t) => {
                  const name = t.profiles?.full_name ?? 'Unknown tutor'
                  const photoUrl = t.profile_photo_url ? tutorPhotoUrls[t.profile_photo_url] ?? null : null
                  return (
                    <li key={t.id} className="border border-[#DDE2E8] rounded-xl p-3.5">
                      <div className="flex items-start gap-3">
                        <Avatar name={name} url={photoUrl} size={64} />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[15px]">{name}</p>
                          <p className="text-[13px] text-[#566274]">{t.qualification || 'No qualification added'}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {t.verified ? (
                              <Chip tone="good">Verified</Chip>
                            ) : (
                              <Chip tone="wait">Needs review</Chip>
                            )}
                            {t.verification_document_url ? (
                              <Chip tone="neutral">Document uploaded</Chip>
                            ) : (
                              <Chip tone="bad">No document</Chip>
                            )}
                            {!t.profile_photo_url && <Chip tone="wait">No photo</Chip>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {t.verification_document_url && (
                          <button
                            onClick={() => handleViewDocument(t.verification_document_url as string)}
                            className={secondaryButton}
                          >
                            View document
                          </button>
                        )}
                        {t.verified ? (
                          <button onClick={() => toggleVerify(t.id, true)} className={quietButton}>
                            Remove verification
                          </button>
                        ) : (
                          <button onClick={() => toggleVerify(t.id, false)} className={primaryButton}>
                            Verify tutor
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        )}

        {/* SUBJECTS */}
        {activeTab === 'subjects' && (
          <Panel title="Manage subjects">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddSubject()
              }}
              className="flex flex-col sm:flex-row gap-2 mb-5"
            >
              <input
                type="text"
                placeholder="Subject name, e.g. Chemistry"
                aria-label="Subject name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className={`${fieldClass} sm:flex-1`}
              />
              <select
                aria-label="Education level"
                value={newSubjectLevel}
                onChange={(e) => setNewSubjectLevel(e.target.value)}
                className={`${fieldClass} sm:w-40`}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="university">University</option>
              </select>
              <button type="submit" className="h-12 px-5 rounded-[10px] bg-[#0A7B83] text-white text-sm font-bold hover:bg-[#075A61]">
                Add subject
              </button>
            </form>

            {subjects.length === 0 ? (
              <div className="text-center py-6">
                <p className="font-bold">No subjects yet</p>
                <p className="text-sm text-[#566274] mt-1">Add the first subject above so tutors can create classes.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {[...subjectLevels, ...otherLevels].map((level) => {
                  const items = subjects.filter((s) => s.education_level === level)
                  if (items.length === 0) return null
                  return (
                    <div key={level}>
                      <h3 className="text-sm font-bold text-[#566274] mb-1">
                        {levelLabel(level)} ({items.length})
                      </h3>
                      <ul className="divide-y divide-[#EBEEF2]">
                        {items.map((s) => (
                          <li key={s.id} className="py-2 flex items-center justify-between gap-3 min-h-14">
                            <span className="text-[15px] font-semibold">{s.name}</span>
                            {confirmDeleteId === s.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteSubject(s.id)}
                                  className="h-11 px-3 rounded-[10px] bg-[#A23E2A] text-white text-sm font-bold"
                                >
                                  Remove
                                </button>
                                <button onClick={() => setConfirmDeleteId(null)} className={quietButton}>
                                  Keep
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(s.id)}
                                className="h-11 px-3 text-sm font-semibold text-[#A23E2A] hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        )}

        {/* REFUNDS */}
        {activeTab === 'refunds' && (
          <Panel
            title="Refunds and cancellations"
            aside={<span className="text-sm font-bold text-[#A23E2A]">Total refunded: RM{totalRefunded.toFixed(2)}</span>}
          >
            {refunds.length === 0 ? (
              <div className="text-center py-6">
                <p className="font-bold">No cancellations yet</p>
                <p className="text-sm text-[#566274] mt-1">Cancelled bookings and refunds will be listed here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#EBEEF2]">
                {refunds.map((b) => (
                  <li key={b.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[15px]">{b.classes?.title}</p>
                      <p className="text-[13px] text-[#566274]">{b.profiles?.full_name}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="font-extrabold text-[15px]">RM{b.classes?.price}</p>
                      <Chip tone={b.payment_status === 'refunded' ? 'bad' : 'neutral'}>
                        {b.payment_status === 'refunded' ? 'Refunded' : b.payment_status}
                      </Chip>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {/* USERS & BOOKINGS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <Panel title={`All users (${users.length})`}>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search by name"
                  aria-label="Search users by name"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className={`${fieldClass} sm:flex-1`}
                />
              </div>
              <FilterChips
                value={userRoleFilter}
                onChange={setUserRoleFilter}
                options={[
                  { id: 'all', label: 'All' },
                  { id: 'student', label: 'Students' },
                  { id: 'tutor', label: 'Tutors' },
                  { id: 'admin', label: 'Admins' },
                ]}
              />
              {visibleUsers.length === 0 ? (
                <p className="text-sm text-[#566274] py-4 text-center">No users match your search.</p>
              ) : (
                <ul className="divide-y divide-[#EBEEF2]">
                  {visibleUsers.map((u) => (
                    <li key={u.id} className="py-2.5 flex items-center gap-3 min-h-14">
                      <div className="w-10 h-10 rounded-full bg-[#EBEEF2] text-[#566274] text-sm font-extrabold flex items-center justify-center shrink-0">
                        {initialsOf(u.full_name) || '?'}
                      </div>
                      <span className="flex-1 min-w-0 truncate text-[15px] font-semibold">{u.full_name}</span>
                      <Chip tone={u.role === 'admin' ? 'bad' : u.role === 'tutor' ? 'good' : 'neutral'}>
                        {u.role}
                      </Chip>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={`All bookings (${bookings.length})`}>
              {bookings.length === 0 ? (
                <p className="text-sm text-[#566274] py-4 text-center">No bookings yet.</p>
              ) : (
                <ul className="divide-y divide-[#EBEEF2]">
                  {bookings.map((b) => (
                    <li key={b.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[15px]">{b.classes?.title}</p>
                        <p className="text-[13px] text-[#566274]">{b.profiles?.full_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Chip tone={b.payment_status === 'paid' ? 'good' : b.payment_status === 'refunded' ? 'bad' : 'wait'}>
                          {b.payment_status}
                        </Chip>
                        {b.booking_status === 'cancelled' && <Chip tone="bad">Cancelled</Chip>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
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