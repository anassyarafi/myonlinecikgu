'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Notification = {
  id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationBell({ userId }: { userId: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      return
    }

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      setNotifications(data || [])
    }

    fetchNotifications()

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchNotifications()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleOpen = async () => {
    setOpen(!open)
    if (!open && unreadCount > 0 && userId) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  if (!userId) return null

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative text-gray-700 hover:text-blue-600">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500 p-4">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-3 border-b border-gray-100 text-sm">
                <p className="font-medium text-gray-900">{n.title}</p>
                <p className="text-gray-500">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}