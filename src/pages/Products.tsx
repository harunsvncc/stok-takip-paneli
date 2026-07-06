import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { logAudit } from '../services/auditLog'

// Ürünleri çek
const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories:category_id (id, ad),
      suppliers:supplier_id (id, ad)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(error.message)
  return data
}

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

export default function Products() {
  const navigate = useNavigate()
  const { isPersonel, user } = useAuth()
  const queryClient = useQueryClient()
  
  // Düzenleme state'i
  const [editingProduct, setEditingProduct] = useState<any>(null)
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Verileri çek
  const { data: products, isLoading, error: queryError } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers
  })

  // Düzenleme başlat
  const startEdit = (product: any) => {
    setEditingProduct(product)
    setFormData({
      sku: product.sku,
      ad: product.ad,
      category_id: product.category_id || '',
      supplier_id: product.supplier_id || '',
      birim: product.birim || 'Adet',
      birim_fiyat: product.birim_fiyat?.toString() || '',
      min_stok: product.min_stok?.toString() || '0',
      mevcut_stok: product.mevcut_stok?.toString() || '0'
    })
  }

  // Düzenlemeyi iptal et
  const cancelEdit = () => {
    setEditingProduct(null)
    setFormData({
      sku: '',
      ad: '',
      category_id: '',
      supplier_id: '',
      birim: 'Adet',
      birim_fiyat: '',
      min_stok: '0',
      mevcut_stok: '0'
    })
    setError('')
  }

  // Ürün güncelle (Stok hareketi kaydı EKLENDİ)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Önce mevcut stok miktarını al
      const { data: oldProduct, error: fetchError } = await supabase
        .from('products')
        .select('mevcut_stok')
        .eq('id', editingProduct.id)
        .single()

      if (fetchError) throw new Error(fetchError.message)

      const oldStock = oldProduct?.mevcut_stok || 0
      const newStock = parseInt(formData.mevcut_stok) || 0

      // 2. Ürünü güncelle
      const { error } = await supabase
        .from('products')
        .update({
          sku: formData.sku,
          ad: formData.ad,
          category_id: formData.category_id || null,
          supplier_id: formData.supplier_id || null,
          birim: formData.birim,
          birim_fiyat: parseFloat(formData.birim_fiyat) || 0,
          min_stok: parseInt(formData.min_stok) || 0,
          mevcut_stok: newStock
        })
        .eq('id', editingProduct.id)

      if (error) throw new Error(error.message)

      // 3. Eğer stok miktarı değiştiyse, stok hareketi kaydet
      if (oldStock !== newStock) {
        const tip = newStock > oldStock ? 'giris' : 'cikis'
        const miktar = Math.abs(newStock - oldStock)

        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            product_id: editingProduct.id,
            tip: tip,
            miktar: miktar,
            aciklama: `Stok güncellendi: ${oldStock} → ${newStock}`,
            created_by: user?.id
          }])

        if (movementError) {
          console.error('Stok hareketi kaydedilemedi:', movementError)
        }
      }

      // 4. Audit log
      await logAudit({
        tablo: 'products',
        kayit_id: editingProduct.id,
        islem: 'guncelle',
        detay: {
          sku: formData.sku,
          ad: formData.ad,
          birim_fiyat: formData.birim_fiyat,
          mevcut_stok: formData.mevcut_stok
        }
      })

      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['movements'] })
      cancelEdit()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Pasif yap
  const handleDelete = async (id: string, ad: string) => {
    if (confirm(`"${ad}" ürününü pasif yapmak istediğinize emin misiniz?`)) {
      try {
        const { error } = await supabase
          .from('products')
          .update({ aktif: false })
          .eq('id', id)
        
        if (error) throw new Error(error.message)
        
        await logAudit({
          tablo: 'products',
          kayit_id: id,
          islem: 'pasif_yap',
          detay: { ad }
        })
        
        queryClient.invalidateQueries({ queryKey: ['products'] })
      } catch (err) {
        alert('Hata oluştu!')
      }
    }
  }

  // Form değişiklikleri
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl text-gray-500">Yükleniyor...</div>
    </div>
  )

  if (queryError) return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
      Hata: {queryError.message}
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📦 Ürün Yönetimi</h1>
        {isPersonel && (
          <button 
            onClick={() => navigate('/products/add')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Yeni Ürün
          </button>
        )}
      </div>

      {/* Düzenleme Formu */}
      {editingProduct && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            ✏️ Ürün Düzenle: {editingProduct.ad}
          </h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
              ❌ {error}
            </div>
          )}
          <form onSubmit={handleUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU *</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ürün Adı *</label>
                <input
                  type="text"
                  name="ad"
                  value={formData.ad}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kategori</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçin</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.ad}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tedarikçi</label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçin</option>
                  {suppliers?.map((sup: any) => (
                    <option key={sup.id} value={sup.id}>{sup.ad}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Birim</label>
                <select
                  name="birim"
                  value={formData.birim}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Adet">Adet</option>
                  <option value="Kg">Kg</option>
                  <option value="Litre">Litre</option>
                  <option value="Paket">Paket</option>
                  <option value="Metre">Metre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Birim Fiyat (₺)</label>
                <input
                  type="number"
                  name="birim_fiyat"
                  value={formData.birim_fiyat}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Stok</label>
                <input
                  type="number"
                  name="min_stok"
                  value={formData.min_stok}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mevcut Stok</label>
                <input
                  type="number"
                  name="mevcut_stok"
                  value={formData.mevcut_stok}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor...' : '💾 Güncelle'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ürün Listesi */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün Adı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tedarikçi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiyat</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products?.map((product: any) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.sku}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{product.ad}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {product.categories?.ad || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {product.suppliers?.ad || '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.mevcut_stok <= product.min_stok 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {product.mevcut_stok}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">₺{product.birim_fiyat}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    {isPersonel && (
                      <button
                        onClick={() => startEdit(product)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ✏️ Düzenle
                      </button>
                    )}
                    {isPersonel && (
                      <button
                        onClick={() => handleDelete(product.id, product.ad)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️ Pasif Yap
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz ürün eklenmemiş.
          </div>
        )}
      </div>
    </div>
  )
}