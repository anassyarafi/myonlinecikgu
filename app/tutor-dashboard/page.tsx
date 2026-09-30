'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

const PLATFORM_COMMISSION_RATE = 0.15
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const cardClass = 'bg-white border-2 border-[#D8D2C4] rounded-2xl p-6'
const inputClass = 'w-full rounded-lg border border-[#D8D2C4] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5D45]'
const labelClass = 'block text-sm font-medium text-[#1C3529] mb-1'
const primaryButtonClass = 'bg-[#2B5D45] text-white px-4 py-2 rounded-full font-medium hover:bg-[#1F4634] disabled:opacity-50'

export default function TutorDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'earnings'>('profile')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [notTutor, setNotTutor] = useState(false)

  const [bio, setBio] = useState('')
  const [qualification, setQualification] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [tutorType, setTutorType] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  const [profilePhotoPath, setProfilePhotoPath] = useState<string | null>(null)
  const [profilePhotoSignedUrl, setProfilePhotoSignedUrl] = useState<string | null>(null)
  const [verificationDocPath, setVerificationDocPath] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')

  const [availability, setAvailability] = useState<Record<number, AvailabilityDay>>(() => {
    const initial: Record<number, AvailabilityDay> = {}
    for (let i = 0; i < 7; i++) {
      initial[i] = { enabled: false, start: '09:00', end: '17:00' }
    }
    return initial
  })
  const [availabilityMessage, setAvailabilityMessage] = useState('')

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [price, setPrice] = useState('')
  const [classes, setClasses] = useState<ClassItem[]>([])

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [payouts, setPayouts] = useState<PayoutRow[]>([])

  const [message, setMessage] = useState('')

  const refreshPhotoUrl = async (path: string) => {
    const { data } = await supabase.storage.from('tutor-uploads').createSignedUrl(path, 3600)
    if (data) setProfilePhotoSignedUrl(data.signedUrl)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()

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
        .select('bio, qualification, hourly_rate, tutor_type, profile_photo_url, verification_document_url')
        .eq('id', user.id)
        .single()

      if (tutorProfile) {
        setBio(tutorProfile.bio || '')
        setQualification(tutorProfile.qualification || '')
        setHourlyRate(String(tutorProfile.hourly_rate ?? ''))
        setTutorType(tutorProfile.tutor_type || '')
        setProfileSaved(true)

        if (tutorProfile.profile_photo_url) {
          setProfilePhotoPath(tutorProfile.profile_photo_url)
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
        .select('id, payment_status, booking_status, student_id, profiles(full_name), classes!inner(id, title, price, scheduled_at, tutor_id)')
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
    setUploadMessage('')

    const path = `${userId}/photo-${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('tutor-uploads').upload(path, file)

    if (uploadError) {
      setUploadMessage(uploadError.message)
      setUploadingPhoto(false)
      return
    }

    const { error: dbError } = await supabase
      .from('tutor_profiles')
      .update({ profile_photo_url: path })
      .eq('id', userId)

    if (dbError) {
      setUploadMessage(dbError.message)
      setUploadingPhoto(false)
      return
    }

    setProfilePhotoPath(path)
    await refreshPhotoUrl(path)
    setUploadMessage('Profile photo uploaded!')
    setUploadingPhoto(false)
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingDoc(true)
    setUploadMessage('')

    const path = `${userId}/verification-${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('tutor-uploads').upload(path, file)

    if (uploadError) {
      setUploadMessage(uploadError.message)
      setUploadingDoc(false)
      return
    }

    const { error: dbError } = await supabase
      .from('tutor_profiles')
      .update({ verification_document_url: path })
      .eq('id', userId)

    if (dbError) {
      setUploadMessage(dbError.message)
      setUploadingDoc(false)
      return
    }

    setVerificationDocPath(path)
    setUploadMessage('Verification document uploaded!')
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
      setMessage(error.message)
    } else {
      setProfileSaved(true)
      setMessage(wasAlreadySaved ? 'Profile updated!' : 'Profile saved!')
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
    setAvailabilityMessage('')

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
        setAvailabilityMessage(error.message)
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

    setAvailabilityMessage('Availability saved!')
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
      setMessage(error.message)
      return
    }

    setClasses([...classes, data])
    setTitle('')
    setScheduledAt('')
    setPrice('')
    setMessage('Class created!')
  }

  const handleRequestPayout = async (amount: number) => {
    if (!userId || amount <= 0) return

    const { data, error } = await supabase
      .from('payouts')
      .insert({ tutor_id: userId, amount })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setPayouts([data, ...payouts])
    setMessage('Payout requested!')
  }

  if (loading) {
    return <div className="min-h-screen bg-[#F6F3EC] flex items-center justify-center text-[#1C3529]">Loading...</div>
  }

  if (notTutor) {
    return (
      <div className="min-h-screen bg-[#F6F3EC] flex items-center justify-center">
        <p className="text-[#332B1F]">This page is only for tutor accounts.</p>
      </div>
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

  return (
    <div className="min-h-screen bg-[#F6F3EC] px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1
          className="text-3xl font-semibold text-[#1C3529]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Welcome, {fullName}
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-2 rounded-full text-sm font-medium border ${
              activeTab === 'profile'
                ? 'bg-[#2B5D45] text-white border-[#2B5D45]'
                : 'bg-white text-[#1C3529] border-[#D8D2C4]'
            }`}
          >
            Profile Setup
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`px-5 py-2 rounded-full text-sm font-medium border ${
              activeTab === 'earnings'
                ? 'bg-[#2B5D45] text-white border-[#2B5D45]'
                : 'bg-white text-[#1C3529] border-[#D8D2C4]'
            }`}
          >
            Earnings & Classes
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className={cardClass}>
              <h2 className="text-xl font-semibold text-[#1C3529] mb-4">Your Tutor Profile</h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1C3529] mb-2">I am a...</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setTutorType('teacher')}
                      className={`flex-1 py-2 rounded-full border text-sm font-medium ${
                        tutorType === 'teacher'
                          ? 'bg-[#2B5D45] text-white border-[#2B5D45]'
                          : 'border-[#D8D2C4] text-[#1C3529]'
                      }`}
                    >
                      Teacher
                    </button>
                    <button
                      type="button"
                      onClick={() => setTutorType('university_student')}
                      className={`flex-1 py-2 rounded-full border text-sm font-medium ${
                        tutorType === 'university_student'
                          ? 'bg-[#2B5D45] text-white border-[#2B5D45]'
                          : 'border-[#D8D2C4] text-[#1C3529]'
                      }`}
                    >
                      University Student
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={inputClass}
                    rows={3}
                  />
                </div>
                <div>
                  <label className={labelClass}>Qualification</label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Hourly Rate (RM)</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button type="submit" className={primaryButtonClass}>
                  {profileSaved ? 'Update Profile' : 'Save Profile'}
                </button>
              </form>
              {message && <p className="text-sm text-[#4A4437] mt-3">{message}</p>}
            </div>

            <div className={cardClass}>
              <h2 className="text-xl font-semibold text-[#1C3529] mb-4">Verification Documents</h2>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Profile Photo</label>
                  {profilePhotoSignedUrl && (
                    <img
                      src={profilePhotoSignedUrl}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-[#D8D2C4]"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="text-sm"
                  />
                  {uploadingPhoto && <p className="text-xs text-[#4A4437] mt-1">Uploading...</p>}
                </div>

                <div>
                  <label className={labelClass}>
                    Verification Document (e.g. degree certificate, IC)
                  </label>
                  {verificationDocPath && (
                    <p className="text-sm text-[#2B5D45] mb-2">✓ Document uploaded</p>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleDocUpload}
                    disabled={uploadingDoc}
                    className="text-sm"
                  />
                  {uploadingDoc && <p className="text-xs text-[#4A4437] mt-1">Uploading...</p>}
                </div>

                {uploadMessage && <p className="text-sm text-[#4A4437]">{uploadMessage}</p>}
              </div>
            </div>

            <div className={cardClass}>
              <h2 className="text-xl font-semibold text-[#1C3529] mb-4">Weekly Availability</h2>
              <p className="text-sm text-[#4A4437] mb-4">
                Toggle the days you&apos;re generally available and set your hours. This helps students know when to expect you&apos;re free.
              </p>
              <div className="space-y-3">
                {DAY_NAMES.map((name, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 w-28">
                      <input
                        type="checkbox"
                        checked={availability[index].enabled}
                        onChange={() => toggleDay(index)}
                      />
                      <span className="text-sm text-[#1C3529]">{name}</span>
                    </label>
                    {availability[index].enabled && (
                      <>
                        <input
                          type="time"
                          value={availability[index].start}
                          onChange={(e) => updateDayTime(index, 'start', e.target.value)}
                          className="rounded-lg border border-[#D8D2C4] px-2 py-1 text-sm"
                        />
                        <span className="text-[#4A4437] text-sm">to</span>
                        <input
                          type="time"
                          value={availability[index].end}
                          onChange={(e) => updateDayTime(index, 'end', e.target.value)}
                          className="rounded-lg border border-[#D8D2C4] px-2 py-1 text-sm"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleSaveAvailability} className={`mt-4 ${primaryButtonClass}`}>
                Save Availability
              </button>
              {availabilityMessage && <p className="text-sm text-[#4A4437] mt-3">{availabilityMessage}</p>}
            </div>

            <div className={cardClass}>
              <h2 className="text-xl font-semibold text-[#1C3529] mb-4">Create a Class</h2>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className={labelClass}>Subject</label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className={inputClass}
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
                  <label className={labelClass}>Class Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Form 5 Add Maths - Differentiation"
                  />
                </div>
                <div>
                  <label className={labelClass}>Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Price (RM)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button type="submit" className={primaryButtonClass}>
                  Create Class
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className={cardClass}>
              <h2 className="text-xl font-semibold text-[#1C3529] mb-4">Earnings Dashboard</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F6F3EC] rounded-lg p-4">
                  <p className="text-sm text-[#4A4437]">Gross Earnings</p>
                  <p className="text-2xl font-semibold text-[#2B5D45]">RM{grossEarnings.toFixed(2)}</p>
                </div>
                <div className="bg-[#F6F3EC] rounded-lg p-4">
                  <p className="text-sm text-[#4A4437]">Active Students</p>
                  <p className="text-2xl font-semibold text-[#1C3529]">{activeStudents}</p>
                </div>
                <div className="bg-[#F6F3EC] rounded-lg p-4">
                  <p className="text-sm text-[#4A4437]">Upcoming Classes</p>
                  <p className="text-2xl font-semibold text-[#1C3529]">{upcomingCount}</p>
                </div>
                <div className="bg-[#F6F3EC] rounded-lg p-4">
                  <p className="text-sm text-[#4A4437]">Completed Classes</p>
                  <p className="text-2xl font-semibold text-[#1C3529]">{completedCount}</p>
                </div>
              </div>

              {bookings.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-[#1C3529] mb-2">Bookings</h3>
                  <ul className="space-y-2">
                    {bookings.map((b) => (
                      <li key={b.id} className="border border-[#D8D2C4] rounded-lg p-3 text-sm">
                        <p className="font-medium text-[#1C3529]">{b.classes?.title}</p>
                        <p className="text-[#4A4437]">
                          Student: {b.profiles?.full_name ?? 'Unknown'} · {b.payment_status} · {b.booking_status}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className={cardClass}>
              <h2 className="text-xl font-semibold text-[#1C3529] mb-4">Commission & Payouts</h2>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-[#4A4437]">Gross Earnings</span>
                  <span className="font-medium text-[#1C3529]">RM{grossEarnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#C6503F]">
                  <span>Platform Commission ({(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)</span>
                  <span>- RM{platformCommission.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-[#D8D2C4] pt-2 font-semibold text-[#1C3529]">
                  <span>Net Payable to You</span>
                  <span>RM{netPayable.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#F6F3EC] rounded-lg p-4 mb-4">
                <div>
                  <p className="text-sm text-[#4A4437]">Available for Payout</p>
                  <p className="text-2xl font-semibold text-[#2B5D45]">RM{availableForPayout.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => handleRequestPayout(availableForPayout)}
                  disabled={availableForPayout <= 0}
                  className={primaryButtonClass}
                >
                  Request Payout
                </button>
              </div>

              {payouts.length === 0 ? (
                <p className="text-[#4A4437] text-sm">No payout requests yet.</p>
              ) : (
                <ul className="space-y-2">
                  {payouts.map((p) => (
                    <li key={p.id} className="flex justify-between border border-[#D8D2C4] rounded-lg p-3 text-sm">
                      <span className="text-[#1C3529]">RM{p.amount.toFixed(2)} · requested {new Date(p.requested_at).toLocaleDateString()}</span>
                      <span
                        className={`font-medium capitalize ${
                          p.status === 'paid'
                            ? 'text-[#2B5D45]'
                            : p.status === 'approved'
                            ? 'text-[#1C3529]'
                            : 'text-[#4A4437]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={cardClass}>
              <h2 className="text-xl font-semibold text-[#1C3529] mb-4">Your Classes</h2>
              {classes.length === 0 ? (
                <p className="text-[#4A4437]">No classes created yet.</p>
              ) : (
                <ul className="space-y-2">
                  {classes.map((c) => (
                    <li key={c.id} className="border border-[#D8D2C4] rounded-lg p-3">
                      <p className="font-medium text-[#1C3529]">{c.title}</p>
                      <p className="text-sm text-[#4A4437]">
                        {new Date(c.scheduled_at).toLocaleString()} - RM{c.price} - {c.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}