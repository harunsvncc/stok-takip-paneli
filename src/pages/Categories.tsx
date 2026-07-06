import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'

// Kategorileri çek
const fetchCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('ad')
  
  if (error) throw new Error(error.message)
  return data
}

// Kategori ekle
const addCategory = async (newCategory: { ad: string; aciklama: string }) => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{
      ad: newCategory.ad,
      aciklama: newCategory.aciklama || null,
      aktif: true
    }])
    .select()
  
  if (error) throw new Error(error.message)
  return data
}

// Kategori güncelle
const updateCategory = async ({ id, ad, aciklama }: { id: string; ad: string; aciklama: string }) => {
  const { data, error } = await supabase
    .from('categories')
    .update({ ad, aciklama })
    .eq('id', id)
    .select()
  
  if (error) throw new Error(error.message)
  return data
}

// Kategori sil (pasif yap)
const deleteCategory = async (id: string) => {
  const { error } = await supabase
    .from('categories')
    .update({ aktif: false })
    .eq('id', id)
  
  if (error) throw new Error(error.message)
  return id
}

export default function Categories() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ ad: '', aciklama: '' })
  const [isAdding, setIsAdding] = useState(false)

  // Kategorileri çek
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  })

  // Kategori ekleme mutasyonu
  const addMutation = useMutation({
    mutationFn: addCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsAdding(false)
      setFormData({ ad: '', aciklama: '' })
    }
  })

  // Kategori güncelleme mutasyonu
  const updateMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setEditingId(null)
      setFormData({ ad: '', aciklama: '' })
    }
  })

  // Kategori silme mutasyonu
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ad.trim()) return
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, ad: formData.ad, aciklama: formData.aciklama })
    } else {
      addMutation.mutate({ ad: formData.ad, aciklama: formData.aciklama })
    }
  }

  const startEdit = (category: any) => {
    setEditingId(category.id)
    setFormData({ ad: category.ad, aciklama: category.aciklama || '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ ad: '', aciklama: '' })
    setIsAdding(false)
  }

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl text-gray-500">Yükleniyor...</div>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
      Hata: {error.message}
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🏷️ Kategori Yönetimi</h1>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Yeni Kategori
          </button>
        )}
      </div>

      {/* Ekleme / Düzenleme Formu */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editingId ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori Adı *
              </label>
              <input
                type="text"
                value={formData.ad}
                onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: Elektronik"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <input
                type="text"
                value={formData.aciklama}
                onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Kategori açıklaması"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={addMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {addMutation.isPending || updateMutation.isPending
                ? 'Kaydediliyor...'
                : editingId
                ? '💾 Güncelle'
                : '💾 Kaydet'
              }
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
      )}

      {/* Kategori Listesi */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori Adı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories?.map((category: any) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.ad}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{category.aciklama || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    category.aktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {category.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(category)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✏️ Düzenle
                    </button>
                    {category.aktif && (
                      <button
                        onClick={() => {
                          if (confirm('Bu kategoriyi pasif yapmak istediğinize emin misiniz?')) {
                            deleteMutation.mutate(category.id)
                          }
                        }}
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
        {categories?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz kategori eklenmemiş.
          </div>
        )}
      </div>
    </div>
  )
}