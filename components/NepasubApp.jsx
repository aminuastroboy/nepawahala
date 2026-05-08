'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function NepasubApp() {
  const [feed, setFeed] = useState([])
  const [name, setName] = useState('')
  const [area, setArea] = useState('Kubwa, Abuja')
  const [status, setStatus] = useState('OFF')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let channel

    async function init() {
      try {
        if (!supabase) {
          console.error('Supabase client not initialized')
          setLoading(false)
          return
        }

        const savedName = localStorage.getItem('nepasub_name')
        const savedArea = localStorage.getItem('nepasub_area')

        if (savedName) setName(savedName)
        if (savedArea) setArea(savedArea)

        // Ensure anonymous auth exists
        const {
          data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
          const { error } =
            await supabase.auth.signInAnonymously()

          if (error) {
            console.error('Auth error:', error.message)
          }
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
      } catch (err) {
        console.error('Init error:', err)
      } finally {
        setLoading(false)
      }
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

    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch error:', error.message)
      return
    }

    setFeed(data ?? [])
  }

  async function submitCheckin(type) {
    if (!supabase) {
      console.error('Supabase not ready')
      return
    }

    setStatus(type)

    localStorage.setItem('nepasub_name', name)
    localStorage.setItem('nepasub_area', area)

    // Get fresh session directly
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session?.user) {
      console.error('No active session')
      return
    }

    const { error } = await supabase
      .from('checkins')
      .insert([
        {
          user_id: session.user.id,
          name: name || 'Anonymous',
          area,
          status: type
        }
      ])

    if (error) {
      console.error('Insert error:', error.message)
      return
    }

    await fetchFeed()
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
          ) : feed.length === 0 ? (
            <p>No reports yet.</p>
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
