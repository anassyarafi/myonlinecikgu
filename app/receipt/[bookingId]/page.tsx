'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ReceiptData = {
  id: string
  payment_status: string
  booking_status: string
  created_at: string
  student_id: string
  profiles: { full_name: string } | null
  classes: {
    title: string
    price: number
    scheduled_at: string
    subjects: { name: string; education_level: string } | null
    tutor_profiles: { profiles: { full_name: string } | null } | null
  } | null
}

const PLATFORM_COMMISSION_RATE = 0.15

export default function ReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.bookingId as string

  const [loading, setLoading] = useState(true)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [notAllowed, setNotAllowed] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, payment_status, booking_status, created_at, student_id, profiles(full_name), classes(title, price, scheduled_at, subjects(name, education_level), tutor_profiles(profiles(full_name)))'
        )
        .eq('id', bookingId)
        .single()

      if (error || !data) {
        setNotAllowed(true)
        setLoading(false)
        return
      }

      setReceipt(data as unknown as ReceiptData)
      setLoading(false)
    }

    init()
  }, [bookingId, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (notAllowed || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Receipt not found or you don&apos;t have access.</p>
      </div>
    )
  }

  const price = receipt.classes?.price || 0
  const commission = price * PLATFORM_COMMISSION_RATE
  const isPaid = receipt.payment_status === 'paid'
  const isRefunded = receipt.payment_status === 'refunded'

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 print:bg-white">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-8 print:shadow-none">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">MyOnlineCikgu</h1>
          <p className="text-sm text-gray-500">Digital Receipt</p>
        </div>

        <div className="border-t border-b border-gray-200 py-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Receipt No.</span>
            <span className="font-mono text-gray-900">{receipt.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date Issued</span>
            <span className="text-gray-900">{new Date(receipt.created_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span
              className={`font-medium ${
                isPaid ? 'text-green-600' : isRefunded ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {isPaid ? 'Paid' : isRefunded ? 'Refunded' : receipt.payment_status}
            </span>
          </div>
        </div>

        <div className="py-4 space-y-2 text-sm border-b border-gray-200">
          <div className="flex justify-between">
            <span className="text-gray-500">Student</span>
            <span className="text-gray-900">{receipt.profiles?.full_name ?? 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tutor</span>
            <span className="text-gray-900">
              {receipt.classes?.tutor_profiles?.profiles?.full_name ?? 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Class</span>
            <span className="text-gray-900 text-right">{receipt.classes?.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Subject</span>
            <span className="text-gray-900">
              {receipt.classes?.subjects?.name} ({receipt.classes?.subjects?.education_level})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Scheduled</span>
            <span className="text-gray-900">
              {receipt.classes?.scheduled_at && new Date(receipt.classes.scheduled_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="py-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Class Fee</span>
            <span className="text-gray-900">RM{price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Platform Commission ({(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)</span>
            <span>RM{commission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-2 mt-2">
            <span>Total {isRefunded ? 'Refunded' : 'Paid'}</span>
            <span>RM{price.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 print:hidden"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  )
}