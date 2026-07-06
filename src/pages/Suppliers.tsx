import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'

// Tedarikçileri çek
const fetchSuppliers = async () => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('ad')
  
  if (error) throw new Error(error.message)
  return data
}

// Tedarikçi ekle
const addSupplier = async (newSupplier: { ad: string; iletisim: string; telefon: string; email: string }) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{
      ad: newSupplier.ad,
      iletisim: newSupplier.iletisim || null,
      telefon: newSupplier.telefon || null,
      email: newSupplier.email || null
    }])
    .select()
  
  if (error) throw new Error(error.message)
  return data
}

// Tedarikçi güncelle
const updateSupplier = async ({ id, ad, iletisim, telefon, email }: { id: string; ad: string; iletisim: string; telefon: string; email: string }) => {
  const { data, error } = await supabase
    .from('suppliers')
    .update({ ad, iletisim, telefon, email })
    .eq('id', id)
    .select()
  
  if (error) throw new Error(error.message)
  return data
}

// Tedarikçi sil
const deleteSupplier = async (id: string) => {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
  return id
}

export default function Suppliers() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ ad: '', iletisim: '', telefon: '', email: '' })
  const [isAdding, setIsAdding] = useState(false)

  // Tedarikçileri çek
  const { data: suppliers, isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers
  })

  // Tedarikçi ekleme mutasyonu
  const addMutation = useMutation({
    mutationFn: addSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setIsAdding(false)
      setFormData({ ad: '', iletisim: '', telefon: '', email: '' })
    }
  })

  // Tedarikçi güncelleme mutasyonu
  const updateMutation = useMutation({
    mutationFn: updateSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setEditingId(null)
      setFormData({ ad: '', iletisim: '', telefon: '', email: '' })
    }
  })

  // Tedarikçi silme mutasyonu
  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ad.trim()) return
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData })
    } else {
      addMutation.mutate(formData)
    }
  }

  const startEdit = (supplier: any) => {
    setEditingId(supplier.id)
    setFormData({
      ad: supplier.ad,
      iletisim: supplier.iletisim || '',
      telefon: supplier.telefon || '',
      email: supplier.email || ''
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ ad: '', iletisim: '', telefon: '', email: '' })
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
        <h1 className="text-3xl font-bold text-gray-800">🏢 Tedarikçi Yönetimi</h1>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Yeni Tedarikçi
          </button>
        )}
      </div>

      {/* Ekleme / Düzenleme Formu */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editingId ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi Ekle'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tedarikçi Adı *
              </label>
              <input
                type="text"
                value={formData.ad}
                onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: TeknoTedarik A.Ş."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İletişim Kişisi
              </label>
              <input
                type="text"
                value={formData.iletisim}
                onChange={(e) => setFormData({ ...formData, iletisim: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Yetkili kişi adı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="text"
                value={formData.telefon}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0212-555-0101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-posta
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="info@tedarikci.com"
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

      {/* Tedarikçi Listesi */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tedarikçi Adı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İletişim</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-posta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers?.map((supplier: any) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{supplier.ad}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{supplier.iletisim || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{supplier.telefon || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{supplier.email || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(supplier)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✏️ Düzenle
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) {
                          deleteMutation.mutate(supplier.id)
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz tedarikçi eklenmemiş.
          </div>
        )}
      </div>
    </div>
  )
}