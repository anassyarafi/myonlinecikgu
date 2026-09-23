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

const PLATFORM_COMMISSION_RATE = 0.15

export default function TutorDashboard() {
  const router = useRouter()
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (notTutor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">This page is only for tutor accounts.</p>
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
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {fullName}</h1>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Earnings Dashboard</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Gross Earnings</p>
              <p className="text-2xl font-bold text-blue-600">RM{grossEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{activeStudents}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Upcoming Classes</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Completed Classes</p>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            </div>
          </div>

          {bookings.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Bookings</h3>
              <ul className="space-y-2">
                {bookings.map((b) => (
                  <li key={b.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                    <p className="font-medium">{b.classes?.title}</p>
                    <p className="text-gray-500">
                      Student: {b.profiles?.full_name ?? 'Unknown'} · {b.payment_status} · {b.booking_status}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Commission & Payouts</h2>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Gross Earnings</span>
              <span className="font-medium">RM{grossEarnings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Platform Commission ({(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)</span>
              <span>- RM{platformCommission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
              <span>Net Payable to You</span>
              <span>RM{netPayable.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-green-50 rounded-lg p-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Available for Payout</p>
              <p className="text-2xl font-bold text-green-700">RM{availableForPayout.toFixed(2)}</p>
            </div>
            <button
              onClick={() => handleRequestPayout(availableForPayout)}
              disabled={availableForPayout <= 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Request Payout
            </button>
          </div>

          {payouts.length === 0 ? (
            <p className="text-gray-500 text-sm">No payout requests yet.</p>
          ) : (
            <ul className="space-y-2">
              {payouts.map((p) => (
                <li key={p.id} className="flex justify-between border border-gray-200 rounded-lg p-3 text-sm">
                  <span>RM{p.amount.toFixed(2)} · requested {new Date(p.requested_at).toLocaleDateString()}</span>
                  <span
                    className={`font-medium capitalize ${
                      p.status === 'paid'
                        ? 'text-green-600'
                        : p.status === 'approved'
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Verification Documents</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
              {profilePhotoSignedUrl && (
                <img
                  src={profilePhotoSignedUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover mb-2 border border-gray-200"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="text-sm"
              />
              {uploadingPhoto && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Document (e.g. degree certificate, IC)
              </label>
              {verificationDocPath && (
                <p className="text-sm text-green-600 mb-2">✓ Document uploaded</p>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleDocUpload}
                disabled={uploadingDoc}
                className="text-sm"
              />
              {uploadingDoc && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
            </div>

            {uploadMessage && <p className="text-sm text-gray-600">{uploadMessage}</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Tutor Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTutorType('teacher')}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                    tutorType === 'teacher'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  Teacher
                </button>
                <button
                  type="button"
                  onClick={() => setTutorType('university_student')}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                    tutorType === 'university_student'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  University Student
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (RM)</label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
              {profileSaved ? 'Update Profile' : 'Save Profile'}
            </button>
          </form>
          {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Create a Class</h2>
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                required
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="e.g. Form 5 Add Maths - Differentiation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (RM)</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
              Create Class
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Classes</h2>
          {classes.length === 0 ? (
            <p className="text-gray-500">No classes created yet.</p>
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                <li key={c.id} className="border border-gray-200 rounded-lg p-3">
                  <p className="font-medium">{c.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(c.scheduled_at).toLocaleString()} - RM{c.price} - {c.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}