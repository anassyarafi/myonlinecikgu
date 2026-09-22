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
    tutor_profiles: { profiles: { full_name: string } | null } | null
  } | null
  attendance: { attended: boolean; notes: string | null }[]
}

export default function MyLearningPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notStudent, setNotStudent] = useState(false)
  const [records, setRecords] = useState<LearningRecord[]>([])

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

      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, payment_status, booking_status, classes(title, scheduled_at, price, subjects(name), tutor_profiles(profiles(full_name))), attendance(attended, notes)'
        )
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRecords(data as unknown as LearningRecord[])
      }

      setLoading(false)
    }

    init()
  }, [router])

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

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Class History</h2>
          {records.length === 0 ? (
            <p className="text-gray-500">No classes booked yet.</p>
          ) : (
            <ul className="space-y-3">
              {records.map((r) => {
                const attendance = r.attendance[0]
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
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          attendance?.attended
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {attendance?.attended ? 'Attended' : 'Not marked'}
                      </span>
                    </div>
                    {attendance?.notes && (
                      <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">
                        Notes: {attendance.notes}
                      </p>
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