'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function NepasubApp() {
  const [feed, setFeed] = useState([])
  const [name, setName] = useState('')
  const [area, setArea] = useState('Kubwa, Abuja')
  const [status, setStatus] = useState('OFF')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let channel

    async function init() {
      if (!supabase) {
        setLoading(false)
        return
      }

      const savedName = localStorage.getItem('nepasub_name')
      const savedArea = localStorage.getItem('nepasub_area')

      if (savedName) setName(savedName)
      if (savedArea) setArea(savedArea)

      const { data } = await supabase.auth.signInAnonymously()

      if (data?.user) {
        setUser(data.user)
      }

      await fetchFeed()

      channel = supabase
        .channel('live-checkins')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'checkins'
          },
          () => fetchFeed()
        )
        .subscribe()

      setLoading(false)
    }

    init()

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  async function fetchFeed() {
    if (!supabase) return

    const { data } = await supabase
      .from('checkins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setFeed(data)
    }
  }

  async function submitCheckin(type) {
    setStatus(type)

    localStorage.setItem('nepasub_name', name)
    localStorage.setItem('nepasub_area', area)

    if (!supabase || !user) return

    await supabase.from('checkins').insert([
      {
        user_id: user.id,
        name: name || 'Anonymous',
        area,
        status: type
      }
    ])
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white p-5 rounded-2xl shadow">
          <h1 className="text-3xl font-bold">⚡ Nepasub</h1>
          <p className="text-gray-500">{area}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full border p-3 rounded-xl"
          />

          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Your area"
            className="w-full border p-3 rounded-xl"
          />
        </div>

        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <div className="text-6xl">
            {status === 'ON' ? '⚡' : '🌑'}
          </div>

          <p className="text-2xl font-bold mt-3">
            Power {status}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => submitCheckin('ON')}
            className="bg-green-500 text-white p-4 rounded-2xl"
          >
            Light Don Come
          </button>

          <button
            onClick={() => submitCheckin('OFF')}
            className="bg-red-500 text-white p-4 rounded-2xl"
          >
            Light Don Go
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <h2 className="font-bold mb-3">Community Feed</h2>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-3">
              {feed.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-xl p-3"
                >
                  <p><strong>{item.name}</strong></p>
                  <p>{item.area}</p>
                  <p>Power {item.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
