'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Icon({ children }) {
  return (
    <div className="w-10 h-10 flex items-center justify-center text-xl">
      {children}
    </div>
  )
}

export default function NepasubApp() {
  const [powerStatus, setPowerStatus] = useState('OFF')
  const [feed, setFeed] = useState([])
  const [reporterName, setReporterName] = useState('')
  const [area, setArea] = useState('Kubwa, Abuja')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let channel

    const init = async () => {
      try {
        const savedName = localStorage.getItem('nepasub_name')
        const savedArea = localStorage.getItem('nepasub_area')

        if (savedName) setReporterName(savedName)
        if (savedArea) setArea(savedArea)

        const { data } = await supabase.auth.signInAnonymously()
        if (data?.user) setUser(data.user)

        await fetchCheckins()

        channel = supabase
          .channel('checkins-live')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'checkins' },
            fetchCheckins
          )
          .subscribe()
      } finally {
        setLoading(false)
      }
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  async function fetchCheckins() {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) setFeed(data)
  }

  async function submitCheckin(status) {
    setPowerStatus(status)

    localStorage.setItem('nepasub_name', reporterName)
    localStorage.setItem('nepasub_area', area)

    if (!user) return

    await supabase.from('checkins').insert([
      {
        user_id: user.id,
        name: reporterName || 'Anonymous',
        area,
        status,
      },
    ])
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white shadow-sm p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">⚡ Nepasub</h1>
          <p className="text-sm text-gray-500">📍 {area}</p>
        </div>
        <Icon>🔔</Icon>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        <section className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h2 className="font-semibold">Your Identity</h2>

          <input
            type="text"
            placeholder="Enter your name"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            className="w-full border rounded-xl p-3"
          />

          <input
            type="text"
            placeholder="Enter your area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border rounded-xl p-3"
          />
        </section>

        <section className="bg-white rounded-2xl shadow p-5 text-center">
          <div className="text-5xl">{powerStatus === 'ON' ? '⚡' : '🌑'}</div>
          <p className="text-xl font-bold mt-2">Power {powerStatus}</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button onClick={() => submitCheckin('ON')} className="bg-green-500 text-white rounded-2xl p-4 font-semibold">
            Light Don Come
          </button>

          <button onClick={() => submitCheckin('OFF')} className="bg-red-500 text-white rounded-2xl p-4 font-semibold">
            Light Don Go
          </button>
        </section>

        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold">📰 Live Community Feed</h2>
          <div className="mt-3 space-y-3 text-sm">
            {loading ? (
              <p>Loading reports...</p>
            ) : feed.length === 0 ? (
              <p>No reports yet.</p>
            ) : (
              feed.map((item) => (
                <p key={item.id}>
                  <strong>{item.name || 'Anonymous'}</strong> in {item.area} reported Power {item.status}
                </p>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}