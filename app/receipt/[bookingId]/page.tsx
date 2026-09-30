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
    return (
      <div className="min-h-screen bg-[#F6F3EC] flex items-center justify-center text-[#1C3529]">
        Loading...
      </div>
    )
  }

  if (notAllowed || !receipt) {
    return (
      <div className="min-h-screen bg-[#F6F3EC] flex items-center justify-center">
        <p className="text-[#332B1F]">Receipt not found or you don&apos;t have access.</p>
      </div>
    )
  }

  const price = receipt.classes?.price || 0
  const commission = price * PLATFORM_COMMISSION_RATE
  const isPaid = receipt.payment_status === 'paid'
  const isRefunded = receipt.payment_status === 'refunded'

  return (
    <div className="min-h-screen bg-[#F6F3EC] px-4 py-10 print:bg-white">
      <div className="max-w-md mx-auto bg-white border-2 border-[#D8D2C4] rounded-2xl p-8 print:shadow-none print:border-0">
        <div className="text-center mb-6 border-b-2 border-[#D8D2C4] pb-6">
          <h1
            className="text-2xl font-semibold text-[#2B5D45]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            MyOnlineCikgu
          </h1>
          <p className="text-sm text-[#4A4437]">Digital Receipt</p>
        </div>

        <div className="space-y-2 text-sm pb-4 border-b border-[#EFEAE0]">
          <div className="flex justify-between">
            <span className="text-[#4A4437]">Receipt No.</span>
            <span className="font-mono text-[#1C3529]">{receipt.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4437]">Date Issued</span>
            <span className="text-[#1C3529]">{new Date(receipt.created_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4437]">Status</span>
            <span
              className={`font-semibold ${
                isPaid ? 'text-[#2B5D45]' : isRefunded ? 'text-[#C6503F]' : 'text-[#4A4437]'
              }`}
            >
              {isPaid ? 'Paid' : isRefunded ? 'Refunded' : receipt.payment_status}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm py-4 border-b border-[#EFEAE0]">
          <div className="flex justify-between">
            <span className="text-[#4A4437]">Student</span>
            <span className="text-[#1C3529] font-medium">{receipt.profiles?.full_name ?? 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4437]">Tutor</span>
            <span className="text-[#1C3529] font-medium">
              {receipt.classes?.tutor_profiles?.profiles?.full_name ?? 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4437]">Class</span>
            <span className="text-[#1C3529] text-right">{receipt.classes?.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4437]">Subject</span>
            <span className="text-[#1C3529]">
              {receipt.classes?.subjects?.name} ({receipt.classes?.subjects?.education_level})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4437]">Scheduled</span>
            <span className="text-[#1C3529]">
              {receipt.classes?.scheduled_at && new Date(receipt.classes.scheduled_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm py-4">
          <div className="flex justify-between">
            <span className="text-[#4A4437]">Class Fee</span>
            <span className="text-[#1C3529]">RM{price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[#4A4437]">
            <span>Platform Commission ({(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)</span>
            <span>RM{commission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base text-[#1C3529] border-t-2 border-[#D8D2C4] pt-3 mt-3">
            <span>Total {isRefunded ? 'Refunded' : 'Paid'}</span>
            <span className="text-[#E3A73B]">RM{price.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full mt-4 bg-[#2B5D45] text-white py-2.5 rounded-full font-medium hover:bg-[#1F4634] print:hidden"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  )
}