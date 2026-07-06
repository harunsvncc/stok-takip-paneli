import { supabase } from './supabase'

interface AuditLogData {
  tablo: string
  kayit_id: string
  islem: 'ekle' | 'guncelle' | 'sil' | 'pasif_yap'
  detay?: any
}

// Audit log kaydet
export const logAudit = async (data: AuditLogData) => {
  try {
    // Mevcut kullanıcıyı al
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('⚠️ Audit log için kullanıcı bulunamadı')
      return
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        kullanici_id: user.id,
        tablo: data.tablo,
        kayit_id: data.kayit_id,
        islem: data.islem,
        detay: data.detay || {},
        zaman: new Date().toISOString()
      }])

    if (error) {
      console.error('❌ Audit log hatası:', error)
    } else {
      console.log('✅ Audit log kaydedildi:', data.tablo, data.islem)
    }
  } catch (error) {
    console.error('❌ Audit log hatası:', error)
  }
}

// Audit logları getir (Admin için)
export const getAuditLogs = async () => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles: kullanici_id (id, ad_soyad)
    `)
    .order('zaman', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data
}