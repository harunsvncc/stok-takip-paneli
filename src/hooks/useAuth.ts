import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { getUserProfile } from '../services/auth'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [role, setRole] = useState<string>('viewer')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const profile = await getUserProfile(user.id)
          setProfile(profile)
          setRole(profile?.rol || 'viewer')
        } else {
          setRole('viewer')
        }
      } catch (error) {
        console.error('❌ Kullanıcı yüklenirken hata:', error)
        setRole('viewer')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setUser(session?.user || null)
          
          if (session?.user) {
            const profile = await getUserProfile(session.user.id)
            setProfile(profile)
            setRole(profile?.rol || 'viewer')
          } else {
            setProfile(null)
            setRole('viewer')
          }
        } catch (error) {
          console.error('❌ Auth değişiklik hatası:', error)
          setRole('viewer')
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const isAdmin = role === 'admin'
  const isPersonel = role === 'personel' || role === 'admin'
  const isViewer = role === 'viewer'

  return { user, profile, role, loading, isAdmin, isPersonel, isViewer }
}