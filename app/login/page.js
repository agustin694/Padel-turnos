'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function iniciarSesion(e) {
    e.preventDefault()
    setError('')
    setCargando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    setCargando(false)

    if (error) {
      setError('Email o contraseña incorrectos.')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#07110d',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <form onSubmit={iniciarSesion} style={{
        width: '100%',
        maxWidth: 360,
        padding: 24,
        background: '#0d1d16',
        border: '1px solid #254536',
        borderRadius: 18
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 18 }}>🔒 Ingresar</h1>

        {error && (
          <div style={{
            background: '#421d22',
            border: '1px solid #74343c',
            color: '#ffb6bd',
            padding: 10,
            borderRadius: 10,
            marginBottom: 12,
            fontSize: 13
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%', padding: 12, background: '#07110d',
              color: 'white', border: '1px solid #355546', borderRadius: 10
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%', padding: 12, background: '#07110d',
              color: 'white', border: '1px solid #355546', borderRadius: 10
            }}
          />
        </div>

        <button
          disabled={cargando}
          style={{
            width: '100%', padding: 14, border: 0, borderRadius: 12,
            background: '#d7ff45', color: '#17200b', fontWeight: 900,
            cursor: 'pointer'
          }}
        >
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
