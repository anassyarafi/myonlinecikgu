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
    tutor_type: string | null
    verified: boolean | null
    profile_photo_url: string | null
    profiles: { full_name: string } | null
  } | null
}

type BookingState = 'idle' | 'awaiting_payment' | 'paid'

const tones = [
  { bg: '#CFE6E7', fg: '#0A7B83' },
  { bg: '#F5E4C3', fg: '#8A5A0B' },
  { bg: '#E4DFF5', fg: '#4B3E9A' },
  { bg: '#F8DDD6', fg: '#A23E2A' },
]

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

const toneFor = (name: string) => {
  const sum = name.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
  return tones[sum % tones.length]
}

const levelLabel = (level: string) => (level === '' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1))

function TutorPhoto({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false)
  const tone = toneFor(name)

  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={`Photo of ${name}`}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    )
  }
  return (
    <div
      role="img"
      aria-label={`${name} has no photo yet`}
      className="w-full h-full flex items-center justify-center text-4xl font-extrabold"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {initialsOf(name) || '?'}
    </div>
  )
}

export default function BrowsePage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassListing[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [bookings, setBookings] = useState<Record<string, { id: string; state: BookingState }>>({})
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [tutorTypeFilter, setTutorTypeFilter] = useState('')
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({})
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single()
        setRole(profile?.role ?? null)
        setFullName(profile?.full_name ?? '')
      }

      const { data, error } = await supabase
        .from('classes')
        .select(
          'id, title, scheduled_at, price, status, subjects(name, education_level), tutor_profiles(id, hourly_rate, qualification, tutor_type, verified, profile_photo_url, profiles(full_name))'
        )
        .eq('status', 'open')
        .order('scheduled_at')

      if (!error && data) {
        const listings = data as unknown as ClassListing[]
        setClasses(listings)

        const paths = Array.from(
          new Set(listings.map((c) => c.tutor_profiles?.profile_photo_url).filter(Boolean))
        ) as string[]

        if (paths.length > 0) {
          const { data: signed } = await supabase.storage
            .from('tutor-uploads')
            .createSignedUrls(paths, 3600)
          if (signed) {
            const map: Record<string, string> = {}
            signed.forEach((s) => {
              if (s.path && s.signedUrl) map[s.path] = s.signedUrl
            })
            setPhotoUrls(map)
          }
        }
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
    if (tutorTypeFilter && c.tutor_profiles?.tutor_type !== tutorTypeFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const haystack = [c.title, c.subjects?.name, c.tutor_profiles?.profiles?.full_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  const activeFilterCount = [subjectFilter, maxPrice, tutorTypeFilter].filter(Boolean).length

  const clearFilters = () => {
    setLevelFilter('')
    setSubjectFilter('')
    setMaxPrice('')
    setTutorTypeFilter('')
    setSearch('')
  }

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

    const bookedClass = classes.find((c) => c.id === classId)
    if (bookedClass?.tutor_profiles?.id) {
      await supabase.from('notifications').insert({
        user_id: bookedClass.tutor_profiles.id,
        title: 'New Booking',
        message: `A student booked your class "${bookedClass.title}".`,
      })
    }
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
    setMessage('Payment confirmed. Your class is booked.')

    const paidClass = classes.find((c) => c.id === classId)
    if (paidClass?.tutor_profiles?.id) {
      await supabase.from('notifications').insert({
        user_id: paidClass.tutor_profiles.id,
        title: 'Payment Received',
        message: `Payment confirmed for "${paidClass.title}". RM${paidClass.price} added to your earnings.`,
      })
    }
  }

  const inputClass =
    'w-full h-12 px-3.5 rounded-[10px] border border-[#C5CDD6] bg-white text-base text-[#0F1B2D] outline-none focus:border-[#0A7B83] focus:ring-4 focus:ring-[#E1F1F2]'

  return (
    <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5 pb-10">
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          {fullName && <p className="text-sm text-[#566274]">Welcome, {fullName}</p>}
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-[#0F1B2D]">
            Find the right tutor
          </h1>
          <p className="text-sm text-[#566274] mt-1">Every tutor is checked before they teach.</p>
        </div>

        <div className="flex gap-2">
          <label className="flex-1 flex items-center gap-2.5 h-12 px-3.5 bg-white border border-[#DDE2E8] rounded-xl focus-within:border-[#0A7B83] focus-within:ring-4 focus-within:ring-[#E1F1F2]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#566274" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject or tutor"
              aria-label="Search subject or tutor"
              className="flex-1 min-w-0 bg-transparent outline-none text-base text-[#0F1B2D]"
            />
          </label>
          <button
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className="h-12 px-3.5 rounded-xl border border-[#DDE2E8] bg-white text-sm font-semibold flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
              <circle cx="15" cy="7" r="2" />
              <circle cx="9" cy="17" r="2" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-5 h-5 px-1.5 rounded-full bg-[#0A7B83] text-white text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-4 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="f-subject" className="text-[13px] font-semibold">Subject</label>
              <select id="f-subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={inputClass}>
                <option value="">All subjects</option>
                {subjectOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="f-type" className="text-[13px] font-semibold">Tutor type</label>
              <select id="f-type" value={tutorTypeFilter} onChange={(e) => setTutorTypeFilter(e.target.value)} className={inputClass}>
                <option value="">All tutor types</option>
                <option value="teacher">Teacher</option>
                <option value="university_student">University student</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="f-price" className="text-[13px] font-semibold">Max price (RM)</label>
              <input id="f-price" type="number" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="e.g. 60" className={inputClass} />
            </div>
          </div>
        )}

        <div className="flex gap-5 border-b border-[#DDE2E8] overflow-x-auto">
          {['', 'primary', 'secondary', 'university'].map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              aria-pressed={levelFilter === level}
              className={`shrink-0 pt-2 pb-3 -mb-px text-sm border-b-[3px] ${
                levelFilter === level
                  ? 'font-bold text-[#0A7B83] border-[#0A7B83]'
                  : 'font-semibold text-[#566274] border-transparent'
              }`}
            >
              {levelLabel(level)}
            </button>
          ))}
        </div>

        {message && (
          <p role="status" className="text-sm font-medium text-[#075A61] bg-[#E1F1F2] rounded-[10px] px-3.5 py-3">
            {message}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-[#DDE2E8] rounded-[14px] overflow-hidden animate-pulse">
                <div className="h-40 bg-[#E6EAEE]" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-2/3 bg-[#E6EAEE] rounded" />
                  <div className="h-3 w-full bg-[#E6EAEE] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] p-8 text-center space-y-3">
            <p className="font-bold">No classes match your search</p>
            <p className="text-sm text-[#566274]">Try another subject, or remove some filters.</p>
            <button onClick={clearFilters} className="h-11 px-5 rounded-[10px] border border-[#0A7B83] text-[#075A61] font-bold text-sm">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#566274]">
              {filtered.length} {filtered.length === 1 ? 'class' : 'classes'} available
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {filtered.map((c) => {
                const booking = bookings[c.id]
                const tutorName = c.tutor_profiles?.profiles?.full_name ?? 'Unknown tutor'
                const tutorRating = c.tutor_profiles?.id ? ratings[c.tutor_profiles.id] : undefined
                const photoPath = c.tutor_profiles?.profile_photo_url
                const photoUrl = photoPath ? photoUrls[photoPath] ?? null : null

                return (
                  <article key={c.id} className="bg-white border border-[#DDE2E8] rounded-[14px] overflow-hidden flex flex-col">
                    <div className="relative h-40 bg-[#E6EAEE]">
                      <TutorPhoto name={tutorName} url={photoUrl} />
                      {c.tutor_profiles?.verified && (
                        <span className="absolute top-2.5 left-2.5 h-6 px-2 rounded-xl bg-white text-[#0A7B83] text-xs font-bold flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m5 12 5 5 9-10" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <h2 className="text-[15px] font-bold text-[#0F1B2D]">{tutorName}</h2>
                      <p className="text-[13px] text-[#566274] line-clamp-2">{c.title}</p>
                      <p className="text-[13px] text-[#566274]">
                        {c.subjects?.name}
                        {c.subjects?.education_level ? `, ${levelLabel(c.subjects.education_level)}` : ''}
                      </p>
                      <p className="text-[13px] text-[#566274]">
                        {new Date(c.scheduled_at).toLocaleString('en-MY', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <span className="flex items-center gap-1 text-[13px] font-semibold">
                          {tutorRating ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="#E8A317" aria-hidden="true">
                                <polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.5 5.8 21 7.2 14 2 9.3 8.9 8.6" />
                              </svg>
                              {tutorRating.avg.toFixed(1)}
                              <span className="font-normal text-[#566274]">({tutorRating.count})</span>
                            </>
                          ) : (
                            <span className="font-normal text-[#566274]">New</span>
                          )}
                        </span>
                        <span className="text-[15px] font-extrabold">RM{c.price}</span>
                      </div>

                      <div className="mt-auto pt-3">
                        {!booking && (
                          <button
                            onClick={() => handleBookNow(c.id)}
                            className="w-full h-11 rounded-[10px] bg-[#0A7B83] text-white text-sm font-bold hover:bg-[#075A61]"
                          >
                            Book now
                          </button>
                        )}

                        {booking?.state === 'awaiting_payment' && (
                          <button
                            onClick={() => handleConfirmPayment(c.id)}
                            className="w-full h-11 rounded-[10px] bg-[#E8A317] text-[#0F1B2D] text-sm font-bold hover:bg-[#d29512]"
                          >
                            Confirm payment (mock)
                          </button>
                        )}

                        {booking?.state === 'paid' && (
                          <div className="space-y-1">
                            <p className="text-[#075A61] font-bold text-sm">✓ Booked and paid</p>
                            <div className="flex flex-col">
                              <Link href={`/classroom/${booking.id}`} className="min-h-11 flex items-center text-[#0A7B83] font-semibold text-sm underline">
                                Enter classroom
                              </Link>
                              <Link href={`/receipt/${booking.id}`} className="min-h-11 flex items-center text-[#0A7B83] font-semibold text-sm underline">
                                View receipt
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}