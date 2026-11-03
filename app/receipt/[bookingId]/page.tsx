'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-[#566274] shrink-0">{label}</span>
      <span className={`text-right ${strong ? 'font-bold' : 'font-semibold'} text-[#0F1B2D]`}>{value}</span>
    </div>
  )
}

export default function ReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.bookingId as string

  const [loading, setLoading] = useState(true)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [notAllowed, setNotAllowed] = useState(false)

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
      <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5">
        <div className="max-w-md mx-auto h-96 bg-[#E6EAEE] rounded-[14px] animate-pulse" />
      </main>
    )
  }

  if (notAllowed || !receipt) {
    return (
      <main className="min-h-screen bg-[#F3F5F7] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-[#0F1B2D]">Receipt not found</p>
          <p className="text-sm text-[#566274] mt-1">It may not exist, or you may not have access to it.</p>
          <Link
            href="/my-learning"
            className="mt-4 h-11 px-5 rounded-[10px] border border-[#0A7B83] bg-white text-[#075A61] text-sm font-bold hover:bg-[#E1F1F2] inline-flex items-center"
          >
            Back to My learning
          </Link>
        </div>
      </main>
    )
  }

  const price = receipt.classes?.price || 0
  const platformFee = price * PLATFORM_COMMISSION_RATE
  const isPaid = receipt.payment_status === 'paid'
  const isRefunded = receipt.payment_status === 'refunded'

  const statusStyle = isPaid
    ? 'bg-[#E1F1F2] text-[#075A61]'
    : isRefunded
    ? 'bg-[#F6DAD5] text-[#A23E2A]'
    : 'bg-[#FCEFD2] text-[#8A6111]'
  const statusLabel = isPaid ? 'Paid' : isRefunded ? 'Refunded' : 'Payment pending'

  return (
    <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5 pb-10 print:bg-white print:p-0">
      <div className="max-w-md mx-auto">
        <Link
          href="/my-learning"
          className="inline-flex items-center gap-1 h-11 text-sm font-semibold text-[#0A7B83] hover:underline print:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 5-7 7 7 7" />
          </svg>
          My learning
        </Link>

        <div className="bg-white border border-[#DDE2E8] rounded-[14px] overflow-hidden print:border-0">
          <div className="p-6 text-center border-b border-[#DDE2E8]">
            <span className="w-11 h-11 rounded-[12px] bg-[#0A7B83] inline-flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" />
                <path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" />
              </svg>
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0F1B2D] mt-3">MyOnlineCikgu</h1>
            <p className="text-sm text-[#566274]">Digital receipt</p>
            <span className={`inline-flex items-center h-7 px-3 rounded-full text-sm font-bold mt-3 ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>

          <div className="p-6 space-y-3 border-b border-[#EBEEF2]">
            <Row label="Receipt no." value={<span className="font-mono">{receipt.id.slice(0, 8).toUpperCase()}</span>} />
            <Row label="Date issued" value={formatDateTime(receipt.created_at)} />
          </div>

          <div className="p-6 space-y-3 border-b border-[#EBEEF2]">
            <Row label="Student" value={receipt.profiles?.full_name ?? 'Unknown'} />
            <Row label="Tutor" value={receipt.classes?.tutor_profiles?.profiles?.full_name ?? 'Unknown'} />
            <Row label="Class" value={receipt.classes?.title} />
            <Row
              label="Subject"
              value={
                receipt.classes?.subjects
                  ? `${receipt.classes.subjects.name}, ${receipt.classes.subjects.education_level}`
                  : '-'
              }
            />
            <Row label="Scheduled" value={receipt.classes?.scheduled_at ? formatDateTime(receipt.classes.scheduled_at) : '-'} />
          </div>

          <div className="p-6 space-y-3">
            <Row label="Class fee" value={`RM${price.toFixed(2)}`} />
            <div className="flex justify-between gap-4 text-[13px] text-[#566274]">
              <span>Includes platform fee ({(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)</span>
              <span>RM{platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-[#DDE2E8] pt-4">
              <span className="font-bold text-[#0F1B2D]">Total {isRefunded ? 'refunded' : 'paid'}</span>
              <span className="text-2xl font-extrabold text-[#0F1B2D]">RM{price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full h-12 mt-4 rounded-[10px] bg-[#0A7B83] text-white font-bold hover:bg-[#075A61] print:hidden"
        >
          Print or save as PDF
        </button>
      </div>
    </main>
  )
}