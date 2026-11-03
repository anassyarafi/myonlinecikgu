'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Subject = { id: string; name: string; education_level: string }
type ClassItem = { id: string; title: string; scheduled_at: string; price: number; status: string }

type BookingRow = {
  id: string
  payment_status: string
  booking_status: string
  student_id: string
  profiles: { full_name: string } | null
  classes: { id: string; title: string; price: number; scheduled_at: string } | null
}

type PayoutRow = {
  id: string
  amount: number
  status: string
  requested_at: string
}

type AvailabilityDay = {
  enabled: boolean
  start: string
  end: string
}

type Notice = { type: 'success' | 'error'; text: string }

const PLATFORM_COMMISSION_RATE = 0.15
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const fieldClass =
  'w-full h-12 px-3.5 rounded-[10px] border border-[#C5CDD6] bg-white text-base text-[#0F1B2D] outline-none focus:border-[#0A7B83] focus:ring-4 focus:ring-[#E1F1F2]'
const labelClass = 'block text-[13px] font-semibold text-[#0F1B2D] mb-1.5'
const primaryButton =
  'h-12 px-5 rounded-[10px] bg-[#0A7B83] text-white text-sm font-bold hover:bg-[#075A61] disabled:opacity-50 disabled:cursor-not-allowed'
const secondaryButton =
  'h-11 px-4 rounded-[10px] border border-[#0A7B83] bg-white text-[#075A61] text-sm font-bold hover:bg-[#E1F1F2] inline-flex items-center justify-center'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white border border-[#DDE2E8] rounded-[14px] p-4 sm:p-5">
      <h2 className="text-base font-bold text-[#0F1B2D]">{title}</h2>
      {description && <p className="text-sm text-[#566274] mt-1">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
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

export default function TutorDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'earnings'>('profile')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [notTutor, setNotTutor] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const [bio, setBio] = useState('')
  const [qualification, setQualification] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [tutorType, setTutorType] = useState('')
  const [verified, setVerified] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [profilePhotoSignedUrl, setProfilePhotoSignedUrl] = useState<string | null>(null)
  const [verificationDocPath, setVerificationDocPath] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const [availability, setAvailability] = useState<Record<number, AvailabilityDay>>(() => {
    const initial: Record<number, AvailabilityDay> = {}
    for (let i = 0; i < 7; i++) {
      initial[i] = { enabled: false, start: '09:00', end: '17:00' }
    }
    return initial
  })

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [price, setPrice] = useState('')
  const [classes, setClasses] = useState<ClassItem[]>([])

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [notified, setNotified] = useState<Record<string, boolean>>({})

  const showNotice = (type: Notice['type'], text: string) => setNotice({ type, text })

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const refreshPhotoUrl = async (path: string) => {
    const { data } = await supabase.storage.from('tutor-uploads').createSignedUrl(path, 3600)
    if (data) setProfilePhotoSignedUrl(data.signedUrl)
  }

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'tutor') {
        setNotTutor(true)
        setLoading(false)
        return
      }

      setUserId(user.id)
      setFullName(profile.full_name)

      const { data: tutorProfile } = await supabase
        .from('tutor_profiles')
        .select('bio, qualification, hourly_rate, tutor_type, verified, profile_photo_url, verification_document_url')
        .eq('id', user.id)
        .single()

      if (tutorProfile) {
        setBio(tutorProfile.bio || '')
        setQualification(tutorProfile.qualification || '')
        setHourlyRate(String(tutorProfile.hourly_rate ?? ''))
        setTutorType(tutorProfile.tutor_type || '')
        setVerified(Boolean(tutorProfile.verified))
        setProfileSaved(true)

        if (tutorProfile.profile_photo_url) {
          refreshPhotoUrl(tutorProfile.profile_photo_url)
        }
        if (tutorProfile.verification_document_url) {
          setVerificationDocPath(tutorProfile.verification_document_url)
        }
      }

      const { data: availabilityData } = await supabase
        .from('tutor_availability')
        .select('day_of_week, start_time, end_time')
        .eq('tutor_id', user.id)

      if (availabilityData && availabilityData.length > 0) {
        setAvailability((prev) => {
          const updated = { ...prev }
          availabilityData.forEach((a) => {
            updated[a.day_of_week] = { enabled: true, start: a.start_time, end: a.end_time }
          })
          return updated
        })
      }

      const { data: subjectsData } = await supabase.from('subjects').select('*').order('name')
      setSubjects(subjectsData || [])

      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('tutor_id', user.id)
        .order('scheduled_at')
      setClasses(classesData || [])

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(
          'id, payment_status, booking_status, student_id, profiles(full_name), classes!inner(id, title, price, scheduled_at, tutor_id)'
        )
        .eq('classes.tutor_id', user.id)

      setBookings((bookingsData as unknown as BookingRow[]) || [])

      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('id, amount, status, requested_at')
        .eq('tutor_id', user.id)
        .order('requested_at', { ascending: false })

      setPayouts(payoutsData || [])

      setLoading(false)
    }

    init()
  }, [router])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingPhoto(true)

    const path = `${userId}/photo-${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('tutor-uploads').upload(path, file)

    if (uploadError) {
      showNotice('error', uploadError.message)
      setUploadingPhoto(false)
      return
    }

    const { error: dbError } = await supabase
      .from('tutor_profiles')
      .update({ profile_photo_url: path })
      .eq('id', userId)

    if (dbError) {
      showNotice('error', dbError.message)
      setUploadingPhoto(false)
      return
    }

    await refreshPhotoUrl(path)
    showNotice('success', 'Profile photo uploaded.')
    setUploadingPhoto(false)
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingDoc(true)

    const path = `${userId}/verification-${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('tutor-uploads').upload(path, file)

    if (uploadError) {
      showNotice('error', uploadError.message)
      setUploadingDoc(false)
      return
    }

    const { error: dbError } = await supabase
      .from('tutor_profiles')
      .update({ verification_document_url: path })
      .eq('id', userId)

    if (dbError) {
      showNotice('error', dbError.message)
      setUploadingDoc(false)
      return
    }

    setVerificationDocPath(path)
    showNotice('success', 'Verification document uploaded.')
    setUploadingDoc(false)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const wasAlreadySaved = profileSaved

    const { error } = await supabase.from('tutor_profiles').upsert({
      id: userId,
      bio,
      qualification,
      hourly_rate: Number(hourlyRate) || 0,
      tutor_type: tutorType,
    })

    if (error) {
      showNotice('error', error.message)
    } else {
      setProfileSaved(true)
      showNotice('success', wasAlreadySaved ? 'Profile updated.' : 'Profile saved.')
    }
  }

  const toggleDay = (day: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }))
  }

  const updateDayTime = (day: number, field: 'start' | 'end', value: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  const handleSaveAvailability = async () => {
    if (!userId) return

    const enabledDays = Object.entries(availability).filter(([, v]) => v.enabled)
    const disabledDays = Object.entries(availability).filter(([, v]) => !v.enabled)

    if (enabledDays.length > 0) {
      const rows = enabledDays.map(([day, v]) => ({
        tutor_id: userId,
        day_of_week: Number(day),
        start_time: v.start,
        end_time: v.end,
      }))

      const { error } = await supabase
        .from('tutor_availability')
        .upsert(rows, { onConflict: 'tutor_id,day_of_week' })

      if (error) {
        showNotice('error', error.message)
        return
      }
    }

    if (disabledDays.length > 0) {
      const dayNumbers = disabledDays.map(([day]) => Number(day))
      await supabase
        .from('tutor_availability')
        .delete()
        .eq('tutor_id', userId)
        .in('day_of_week', dayNumbers)
    }

    showNotice('success', 'Availability saved.')
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const { data, error } = await supabase
      .from('classes')
      .insert({
        tutor_id: userId,
        subject_id: subjectId,
        title,
        scheduled_at: scheduledAt,
        price: Number(price) || 0,
      })
      .select()
      .single()

    if (error) {
      showNotice('error', error.message)
      return
    }

    setClasses([...classes, data])
    setTitle('')
    setScheduledAt('')
    setPrice('')
    showNotice('success', 'Class created. Students can now book it.')
  }

  const handleRequestPayout = async (amount: number) => {
    if (!userId || amount <= 0) return

    const { data, error } = await supabase
      .from('payouts')
      .insert({ tutor_id: userId, amount })
      .select()
      .single()

    if (error) {
      showNotice('error', error.message)
      return
    }

    setPayouts([data, ...payouts])
    showNotice('success', 'Payout requested.')
  }

  const handleNotifyStudent = async (bookingId: string, studentId: string, classTitle: string) => {
    const { error } = await supabase.from('notifications').insert({
      user_id: studentId,
      title: 'Class Reminder',
      message: `Your tutor sent a reminder for "${classTitle}". Go to My Learning to view your class and join when it starts.`,
    })

    if (error) {
      showNotice('error', error.message)
      return
    }

    setNotified((prev) => ({ ...prev, [bookingId]: true }))
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5">
        <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
          <div className="h-24 bg-[#E6EAEE] rounded-[14px]" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#E6EAEE] rounded-[14px]" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (notTutor) {
    return (
      <main className="min-h-screen bg-[#F3F5F7] flex items-center justify-center px-4">
        <p className="text-[#566274]">This page is only for tutor accounts.</p>
      </main>
    )
  }

  const paidBookings = bookings.filter((b) => b.payment_status === 'paid')
  const grossEarnings = paidBookings.reduce((sum, b) => sum + (b.classes?.price || 0), 0)
  const platformCommission = grossEarnings * PLATFORM_COMMISSION_RATE
  const netPayable = grossEarnings - platformCommission

  const now = new Date()
  const upcomingCount = classes.filter((c) => new Date(c.scheduled_at) >= now).length
  const completedCount = classes.filter((c) => new Date(c.scheduled_at) < now).length
  const activeStudents = new Set(paidBookings.map((b) => b.student_id)).size

  const totalRequested = payouts.reduce((sum, p) => sum + p.amount, 0)
  const availableForPayout = netPayable - totalRequested

  const classPrice = Number(price) || 0
  const youReceive = classPrice * (1 - PLATFORM_COMMISSION_RATE)

  const typeLabel =
    tutorType === 'teacher' ? 'Teacher' : tutorType === 'university_student' ? 'University student' : null

  return (
    <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5 pb-10">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <section className="bg-white border border-[#DDE2E8] rounded-[14px] p-4 sm:p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#CFE6E7] shrink-0 flex items-center justify-center text-xl font-extrabold text-[#0A7B83]">
            {profilePhotoSignedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePhotoSignedUrl} alt="Your profile photo" className="w-full h-full object-cover" />
            ) : (
              initialsOf(fullName) || '?'
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-[#566274]">Tutor dashboard</p>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0F1B2D] truncate">{fullName}</h1>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {typeLabel && <Chip tone="neutral">{typeLabel}</Chip>}
              {verified ? (
                <Chip tone="good">Verified</Chip>
              ) : verificationDocPath ? (
                <Chip tone="wait">Waiting for review</Chip>
              ) : (
                <Chip tone="bad">Not verified</Chip>
              )}
            </div>
          </div>
        </section>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Available to withdraw</p>
            <p className="text-[22px] font-extrabold text-[#075A61] mt-1">RM{availableForPayout.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Upcoming classes</p>
            <p className="text-[22px] font-extrabold mt-1">{upcomingCount}</p>
          </div>
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Active students</p>
            <p className="text-[22px] font-extrabold mt-1">{activeStudents}</p>
          </div>
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4">
            <p className="text-[13px] text-[#566274]">Completed classes</p>
            <p className="text-[22px] font-extrabold mt-1">{completedCount}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[#DDE2E8]">
          {(
            [
              { id: 'profile', label: 'Profile & setup' },
              { id: 'earnings', label: 'Earnings & classes' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              aria-pressed={activeTab === t.id}
              className={`pt-2 pb-3 -mb-px text-sm border-b-[3px] ${
                activeTab === t.id
                  ? 'font-bold text-[#0A7B83] border-[#0A7B83]'
                  : 'font-semibold text-[#566274] border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="grid lg:grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              <Panel title="Your tutor profile" description="Students see this before they book you.">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <fieldset>
                    <legend className={labelClass}>I am a</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'teacher', label: 'Teacher' },
                        { value: 'university_student', label: 'University student' },
                      ].map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          aria-pressed={tutorType === o.value}
                          onClick={() => setTutorType(o.value)}
                          className={`h-12 rounded-[10px] text-sm ${
                            tutorType === o.value
                              ? 'border-2 border-[#0A7B83] bg-[#E1F1F2] text-[#075A61] font-bold'
                              : 'border border-[#C5CDD6] bg-white text-[#0F1B2D] font-medium'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="bio" className={labelClass}>Bio</label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      placeholder="Tell students how you teach and what you are good at."
                      className="w-full px-3.5 py-3 rounded-[10px] border border-[#C5CDD6] bg-white text-base text-[#0F1B2D] outline-none focus:border-[#0A7B83] focus:ring-4 focus:ring-[#E1F1F2]"
                    />
                  </div>

                  <div>
                    <label htmlFor="qualification" className={labelClass}>Qualification</label>
                    <input
                      id="qualification"
                      type="text"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      placeholder="e.g. BEd Mathematics, UKM"
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="rate" className={labelClass}>Hourly rate</label>
                    <div className="flex items-center h-12 rounded-[10px] border border-[#C5CDD6] bg-white overflow-hidden focus-within:border-[#0A7B83] focus-within:ring-4 focus-within:ring-[#E1F1F2]">
                      <span className="self-stretch flex items-center px-3.5 bg-[#F3F5F7] border-r border-[#C5CDD6] text-sm font-bold text-[#566274]">
                        RM
                      </span>
                      <input
                        id="rate"
                        type="number"
                        inputMode="decimal"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="flex-1 min-w-0 h-full px-3.5 bg-transparent outline-none text-base"
                      />
                    </div>
                  </div>

                  <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
                    {profileSaved ? 'Update profile' : 'Save profile'}
                  </button>
                </form>
              </Panel>

              <Panel
                title="Photo and verification"
                description="A clear photo helps students trust you. Your document is only seen by our admin team."
              >
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#CFE6E7] shrink-0 flex items-center justify-center text-xl font-extrabold text-[#0A7B83]">
                      {profilePhotoSignedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePhotoSignedUrl} alt="Your profile photo" className="w-full h-full object-cover" />
                      ) : (
                        initialsOf(fullName) || '?'
                      )}
                    </div>
                    <div>
                      <label className={`${secondaryButton} cursor-pointer`}>
                        {uploadingPhoto ? 'Uploading...' : profilePhotoSignedUrl ? 'Change photo' : 'Add photo'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhoto}
                          className="sr-only"
                        />
                      </label>
                      <p className="text-[13px] text-[#566274] mt-1.5">JPG or PNG</p>
                    </div>
                  </div>

                  <div className="border-t border-[#DDE2E8] pt-5">
                    <p className={labelClass}>Verification document</p>
                    <p className="text-[13px] text-[#566274] mb-3">Degree certificate or IC. PDF or image.</p>
                    {verificationDocPath && (
                      <p className="mb-3">
                        <Chip tone={verified ? 'good' : 'wait'}>
                          {verified ? 'Verified' : 'Uploaded, waiting for review'}
                        </Chip>
                      </p>
                    )}
                    <label className={`${secondaryButton} cursor-pointer`}>
                      {uploadingDoc ? 'Uploading...' : verificationDocPath ? 'Replace document' : 'Upload document'}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleDocUpload}
                        disabled={uploadingDoc}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="space-y-4">
              <Panel title="Create a class" description="Students can book it as soon as you create it.">
                <form onSubmit={handleCreateClass} className="space-y-4">
                  <div>
                    <label htmlFor="subject" className={labelClass}>Subject</label>
                    <select
                      id="subject"
                      required
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Select a subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.education_level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="class-title" className={labelClass}>Class title</label>
                    <input
                      id="class-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Form 5 Add Maths: Differentiation"
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="class-when" className={labelClass}>Date and time</label>
                    <input
                      id="class-when"
                      type="datetime-local"
                      required
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="class-price" className={labelClass}>Price</label>
                    <div className="flex items-center h-12 rounded-[10px] border border-[#C5CDD6] bg-white overflow-hidden focus-within:border-[#0A7B83] focus-within:ring-4 focus-within:ring-[#E1F1F2]">
                      <span className="self-stretch flex items-center px-3.5 bg-[#F3F5F7] border-r border-[#C5CDD6] text-sm font-bold text-[#566274]">
                        RM
                      </span>
                      <input
                        id="class-price"
                        type="number"
                        inputMode="decimal"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="flex-1 min-w-0 h-full px-3.5 bg-transparent outline-none text-base"
                      />
                    </div>
                    <p className="text-[13px] text-[#566274] mt-1.5">
                      You receive RM{youReceive.toFixed(2)} after the {(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}% platform fee.
                    </p>
                  </div>

                  <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
                    Create class
                  </button>
                </form>
              </Panel>

              <Panel
                title="Weekly availability"
                description="Turn on the days you are usually free. Students see this before they book."
              >
                <ul className="divide-y divide-[#EBEEF2]">
                  {DAY_NAMES.map((name, index) => {
                    const day = availability[index]
                    return (
                      <li key={index} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-2 min-h-14">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={day.enabled}
                          aria-label={`Available on ${name}`}
                          onClick={() => toggleDay(index)}
                          className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${
                            day.enabled ? 'bg-[#0A7B83]' : 'bg-[#C5CDD6]'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                              day.enabled ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                        <span className="w-24 text-sm font-semibold">{name}</span>
                        {day.enabled ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              aria-label={`${name} start time`}
                              value={day.start}
                              onChange={(e) => updateDayTime(index, 'start', e.target.value)}
                              className="h-11 w-[116px] px-2.5 rounded-[10px] border border-[#C5CDD6] bg-white text-base"
                            />
                            <span className="text-sm text-[#566274]">to</span>
                            <input
                              type="time"
                              aria-label={`${name} end time`}
                              value={day.end}
                              onChange={(e) => updateDayTime(index, 'end', e.target.value)}
                              className="h-11 w-[116px] px-2.5 rounded-[10px] border border-[#C5CDD6] bg-white text-base"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-[#566274]">Not available</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <button onClick={handleSaveAvailability} className={`${primaryButton} mt-4 w-full sm:w-auto`}>
                  Save availability
                </button>
              </Panel>
            </div>
          </div>
        )}

        {/* EARNINGS TAB */}
        {activeTab === 'earnings' && (
          <div className="grid lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Bookings">
                {bookings.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="font-bold">No bookings yet</p>
                    <p className="text-sm text-[#566274] mt-1">
                      When a student books one of your classes, it shows up here.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {bookings.map((b) => {
                      const canJoin = b.payment_status === 'paid' && b.booking_status !== 'cancelled'
                      return (
                        <li key={b.id} className="border border-[#DDE2E8] rounded-xl p-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-[15px]">{b.classes?.title}</p>
                              <p className="text-[13px] text-[#566274] mt-0.5">
                                {b.profiles?.full_name ?? 'Unknown student'}
                                {b.classes?.scheduled_at ? `, ${formatDate(b.classes.scheduled_at)}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <Chip tone={b.payment_status === 'paid' ? 'good' : 'wait'}>{b.payment_status}</Chip>
                              {b.booking_status === 'cancelled' && <Chip tone="bad">Cancelled</Chip>}
                            </div>
                          </div>

                          {canJoin && (
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <Link
                                href={`/classroom/${b.id}`}
                                className="h-11 px-4 rounded-[10px] bg-[#0A7B83] text-white text-sm font-bold hover:bg-[#075A61] inline-flex items-center"
                              >
                                Enter classroom
                              </Link>
                              {notified[b.id] ? (
                                <span className="h-11 px-2 inline-flex items-center text-sm font-bold text-[#075A61]">
                                  ✓ Notified successfully
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleNotifyStudent(b.id, b.student_id, b.classes?.title ?? 'your class')
                                  }
                                  className={secondaryButton}
                                >
                                  Notify student
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Panel>

              <Panel title="Your classes">
                {classes.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="font-bold">No classes yet</p>
                    <p className="text-sm text-[#566274] mt-1">Create your first class in Profile &amp; setup.</p>
                    <button onClick={() => setActiveTab('profile')} className={`${secondaryButton} mt-3`}>
                      Create a class
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#EBEEF2]">
                    {classes.map((c) => (
                      <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[15px]">{c.title}</p>
                          <p className="text-[13px] text-[#566274] mt-0.5">{formatDate(c.scheduled_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-[15px]">RM{c.price}</p>
                          <Chip tone={c.status === 'open' ? 'good' : 'neutral'}>{c.status}</Chip>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="space-y-4 lg:sticky lg:top-20">
              <Panel title="Earnings and payouts">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#566274]">Gross earnings</span>
                    <span className="font-semibold">RM{grossEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#566274]">
                      Platform fee ({(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)
                    </span>
                    <span className="font-semibold text-[#A23E2A]">- RM{platformCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#DDE2E8] pt-2">
                    <span className="font-bold">Net earnings</span>
                    <span className="font-extrabold">RM{netPayable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#566274]">Already requested</span>
                    <span className="font-semibold">- RM{totalRequested.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4 bg-[#E1F1F2] rounded-xl p-4">
                  <p className="text-[13px] text-[#075A61]">Available to withdraw</p>
                  <p className="text-[26px] font-extrabold text-[#075A61]">RM{availableForPayout.toFixed(2)}</p>
                  <button
                    onClick={() => handleRequestPayout(availableForPayout)}
                    disabled={availableForPayout <= 0}
                    className={`${primaryButton} w-full mt-3`}
                  >
                    Request payout
                  </button>
                </div>

                <h3 className="text-sm font-bold mt-5 mb-2">Payout history</h3>
                {payouts.length === 0 ? (
                  <p className="text-sm text-[#566274]">No payout requests yet.</p>
                ) : (
                  <ul className="divide-y divide-[#EBEEF2]">
                    {payouts.map((p) => (
                      <li key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="font-semibold">RM{p.amount.toFixed(2)}</p>
                          <p className="text-[13px] text-[#566274]">
                            {new Date(p.requested_at).toLocaleDateString('en-MY', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <Chip tone={p.status === 'paid' ? 'good' : p.status === 'approved' ? 'neutral' : 'wait'}>
                          {p.status}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        )}
      </div>

      {/* Notice */}
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