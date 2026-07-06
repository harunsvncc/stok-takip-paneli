import { supabase } from './supabase'

// Kayıt ol
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'viewer'
      }
    }
  })
  
  if (error) throw new Error(error.message)
  
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        ad_soyad: fullName,
        rol: 'viewer'
      }])
    
    if (profileError) console.error('Profil oluşturma hatası:', profileError)
  }
  
  return data
}

// Giriş yap
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw new Error(error.message)
  return data
}

// Çıkış yap
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

// Mevcut kullanıcıyı al
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  return user
}

// Kullanıcı profilini al (GÜVENLİ)
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('Profil hatası:', error)
    return null
  }
  
  return data
}

// Kullanıcı rolünü al
export const getUserRole = async (userId: string) => {
  const profile = await getUserProfile(userId)
  return profile?.rol || 'viewer'
}

// Oturum durumunu dinle
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

// Tüm kullanıcıları getir (Admin için)
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      ad_soyad,
      rol,
      created_at
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(error.message)
  return data
}

// Kullanıcı rolünü güncelle (Admin için)
export const updateUserRole = async (userId: string, newRole: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ rol: newRole })
    .eq('id', userId)
    .select()
  
  if (error) throw new Error(error.message)
  return data
}