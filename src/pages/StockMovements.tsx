import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'

// Stok hareketlerini çek (ROL KONTROLÜ EKLENDİ)
const fetchMovements = async (userId: string | undefined, role: string | undefined) => {
  if (!userId || !role) {
    console.warn('⚠️ Kullanıcı veya rol bulunamadı')
    return []
  }

  let query = supabase
    .from('stock_movements')
    .select(`
      *,
      products:product_id (id, sku, ad, mevcut_stok)
    `)
    .order('created_at', { ascending: false })

  // Personel ise sadece kendi hareketlerini görsün
  if (role === 'personel') {
    query = query.eq('created_by', userId)
  }

  const { data, error } = await query
  
  if (error) throw new Error(error.message)
  return data
}

// Ürünleri çek (dropdown için)
const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, ad, mevcut_stok')
    .eq('aktif', true)
    .order('ad')
  
  if (error) throw new Error(error.message)
  return data
}

// Stok hareketi ekle (created_by EKLENDİ)
const addMovement = async (movement: { 
  product_id: string; 
  tip: 'giris' | 'cikis' | 'duzeltme'; 
  miktar: number; 
  aciklama: string;
  userId: string;
}) => {
  // 1. Ürünün mevcut stokunu bul
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('mevcut_stok')
    .eq('id', movement.product_id)
    .single()
  
  if (productError) throw new Error(productError.message)
  
  let yeniStok = product.mevcut_stok
  
  // 2. Hareket tipine göre stok hesapla
  if (movement.tip === 'giris') {
    yeniStok += movement.miktar
  } else if (movement.tip === 'cikis') {
    if (yeniStok < movement.miktar) {
      throw new Error('Yetersiz stok! Mevcut stok: ' + yeniStok)
    }
    yeniStok -= movement.miktar
  } else if (movement.tip === 'duzeltme') {
    yeniStok = movement.miktar
  }
  
  // 3. Stok hareketini kaydet (created_by EKLENDİ)
  const { data: movementData, error: movementError } = await supabase
    .from('stock_movements')
    .insert([{
      product_id: movement.product_id,
      tip: movement.tip,
      miktar: movement.tip === 'duzeltme' ? 0 : movement.miktar,
      aciklama: movement.aciklama || null,
      created_by: movement.userId
    }])
    .select()
  
  if (movementError) throw new Error(movementError.message)
  
  // 4. Ürün stokunu güncelle
  const { error: updateError } = await supabase
    .from('products')
    .update({ mevcut_stok: yeniStok })
    .eq('id', movement.product_id)
  
  if (updateError) throw new Error(updateError.message)
  
  return movementData
}

export default function StockMovements() {
  const { user, role } = useAuth()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    product_id: '',
    tip: 'giris' as 'giris' | 'cikis' | 'duzeltme',
    miktar: '',
    aciklama: ''
  })
  const [error, setError] = useState('')

  // Verileri çek (userId ve role gönder)
  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['movements', user?.id, role],
    queryFn: () => fetchMovements(user?.id, role),
    enabled: !!user && !!role
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts
  })

  // Stok hareketi ekleme mutasyonu
  const addMutation = useMutation({
    mutationFn: (data: any) => addMovement({ ...data, userId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setFormData({ product_id: '', tip: 'giris', miktar: '', aciklama: '' })
      setError('')
    },
    onError: (err: any) => {
      setError(err.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.product_id) {
      setError('Lütfen bir ürün seçin')
      return
    }
    
    if (!formData.miktar || parseInt(formData.miktar) <= 0) {
      setError('Lütfen geçerli bir miktar girin')
      return
    }
    
    addMutation.mutate({
      product_id: formData.product_id,
      tip: formData.tip,
      miktar: parseInt(formData.miktar),
      aciklama: formData.aciklama
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (movementsLoading || productsLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl text-gray-500">Yükleniyor...</div>
    </div>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">🔄 Stok Hareketleri</h1>

      {/* Hata Mesajı */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          ❌ {error}
        </div>
      )}

      {/* Yeni Hareket Formu */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Yeni Stok Hareketi</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ürün *</label>
              <select
                name="product_id"
                value={formData.product_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ürün Seçin</option>
                {products?.map((product: any) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.ad} (Stok: {product.mevcut_stok})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İşlem Tipi *</label>
              <select
                name="tip"
                value={formData.tip}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="giris">📥 Giriş</option>
                <option value="cikis">📤 Çıkış</option>
                <option value="duzeltme">✏️ Düzeltme</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Miktar *</label>
              <input
                type="number"
                name="miktar"
                value={formData.miktar}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Adet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <input
                type="text"
                name="aciklama"
                value={formData.aciklama}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="İşlem açıklaması"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={addMutation.isPending}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {addMutation.isPending ? 'İşleniyor...' : '✅ Hareketi Kaydet'}
          </button>
        </form>
      </div>

      {/* Hareket Listesi */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movements?.map((movement: any) => {
              const tipRenk = movement.tip === 'giris' ? 'text-green-600 bg-green-50' :
                              movement.tip === 'cikis' ? 'text-red-600 bg-red-50' :
                              'text-yellow-600 bg-yellow-50'
              const tipIcon = movement.tip === 'giris' ? '📥' :
                              movement.tip === 'cikis' ? '📤' : '✏️'
              const tipLabel = movement.tip === 'giris' ? 'Giriş' :
                              movement.tip === 'cikis' ? 'Çıkış' : 'Düzeltme'
              
              return (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(movement.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {movement.products?.ad || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${tipRenk}`}>
                      {tipIcon} {tipLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {movement.tip === 'duzeltme' ? '-' : movement.miktar}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {movement.aciklama || '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {movements?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz stok hareketi yapılmamış.
          </div>
        )}
      </div>
    </div>
  )
}