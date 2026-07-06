import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { logAudit } from '../services/auditLog'

// Kategorileri çek
const fetchCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, ad')
    .eq('aktif', true)
  
  if (error) throw new Error(error.message)
  return data
}

// Tedarikçileri çek
const fetchSuppliers = async () => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, ad')
  
  if (error) throw new Error(error.message)
  return data
}

export default function AddProduct() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Kategorileri ve tedarikçileri çek
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers
  })

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    ad: '',
    category_id: '',
    supplier_id: '',
    birim: 'Adet',
    birim_fiyat: '',
    min_stok: '0',
    mevcut_stok: '0'
  })

  // Ürün ekleme mutasyonu
  const addProductMutation = useMutation({
    mutationFn: async (newProduct: any) => {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          sku: newProduct.sku,
          ad: newProduct.ad,
          category_id: newProduct.category_id || null,
          supplier_id: newProduct.supplier_id || null,
          birim: newProduct.birim,
          birim_fiyat: parseFloat(newProduct.birim_fiyat) || 0,
          min_stok: parseInt(newProduct.min_stok) || 0,
          mevcut_stok: parseInt(newProduct.mevcut_stok) || 0,
          aktif: true
        }])
        .select()
      
      if (error) {
        console.error('❌ Supabase hatası:', error)
        throw new Error(error.message)
      }
      
      // Audit log kaydet
      if (data && data.length > 0) {
        await logAudit({
          tablo: 'products',
          kayit_id: data[0].id,
          islem: 'ekle',
          detay: {
            sku: newProduct.sku,
            ad: newProduct.ad,
            birim_fiyat: newProduct.birim_fiyat,
            mevcut_stok: newProduct.mevcut_stok
          }
        })
      }
      
      console.log('✅ Ürün eklendi:', data)
      return data
    },
    onSuccess: () => {
      console.log('✅ onSuccess çalıştı! Yönlendiriliyor...')
      setLoading(false)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate('/products')
    },
    onError: (err: any) => {
      console.error('❌ Mutasyon hatası:', err)
      setError(err.message)
      setLoading(false)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    addProductMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">➕ Yeni Ürün Ekle</h1>
          <p className="text-gray-500 mt-1">Ürün bilgilerini girerek stok sistemine ekleyin</p>
        </div>
        <button
          onClick={() => navigate('/products')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          ← Geri Dön
        </button>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-xl">❌</span>
            <div>
              <h4 className="font-medium text-red-800">Hata Oluştu</h4>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SKU */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                SKU (Stok Kodu) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                placeholder="Örn: SKU-001"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Ürün Adı */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ürün Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ad"
                value={formData.ad}
                onChange={handleChange}
                required
                placeholder="Ürün adını girin"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Kategori
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="">Kategori Seçin</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.ad}</option>
                ))}
              </select>
            </div>

            {/* Tedarikçi */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tedarikçi
              </label>
              <select
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="">Tedarikçi Seçin</option>
                {suppliers?.map((sup: any) => (
                  <option key={sup.id} value={sup.id}>{sup.ad}</option>
                ))}
              </select>
            </div>

            {/* Birim */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Birim
              </label>
              <select
                name="birim"
                value={formData.birim}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="Adet">Adet</option>
                <option value="Kg">Kg</option>
                <option value="Litre">Litre</option>
                <option value="Paket">Paket</option>
                <option value="Metre">Metre</option>
              </select>
            </div>

            {/* Birim Fiyat */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Birim Fiyat (₺)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₺</span>
                <input
                  type="number"
                  name="birim_fiyat"
                  value={formData.birim_fiyat}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Minimum Stok */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Minimum Stok Eşiği
              </label>
              <input
                type="number"
                name="min_stok"
                value={formData.min_stok}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Mevcut Stok */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Başlangıç Stoku
              </label>
              <input
                type="number"
                name="mevcut_stok"
                value={formData.mevcut_stok}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* Footer - Butonlar */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Ekleniyor...
              </>
            ) : (
              '💾 Ürünü Kaydet'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}