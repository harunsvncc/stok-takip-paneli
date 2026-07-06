import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'

// Tüm ürünleri çek
const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories:category_id (ad),
      suppliers:supplier_id (ad)
    `)
    .eq('aktif', true)
    .order('ad')
  
  if (error) throw new Error(error.message)
  return data
}

// Tüm stok hareketlerini çek
const fetchMovements = async () => {
  const { data, error } = await supabase
    .from('stock_movements')
    .select(`
      *,
      products:product_id (id, sku, ad)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(error.message)
  return data
}

// CSV dışa aktarma fonksiyonu
const exportToCSV = (data: any[], filename: string, headers: string[]) => {
  if (!data || data.length === 0) {
    alert('Dışa aktarılacak veri yok!')
    return
  }

  // CSV başlıkları
  let csv = headers.join(',') + '\n'
  
  // CSV satırları (ilk 10 alanı al)
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || ''
      // Özel karakterleri temizle
      return `"${String(value).replace(/"/g, '""')}"`
    })
    csv += values.join(',') + '\n'
  })

  // Dosyayı indir
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const { isPersonel } = useAuth()
  const [activeTab, setActiveTab] = useState<'products' | 'movements'>('products')

  // Verileri çek
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['reports-products'],
    queryFn: fetchProducts
  })

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['reports-movements'],
    queryFn: fetchMovements
  })

  const handleExportProducts = () => {
    if (!products) return
    const headers = ['sku', 'ad', 'categories.ad', 'suppliers.ad', 'birim', 'birim_fiyat', 'mevcut_stok', 'min_stok']
    const data = products.map((p: any) => ({
      sku: p.sku,
      ad: p.ad,
      'categories.ad': p.categories?.ad || '',
      'suppliers.ad': p.suppliers?.ad || '',
      birim: p.birim,
      birim_fiyat: p.birim_fiyat,
      mevcut_stok: p.mevcut_stok,
      min_stok: p.min_stok
    }))
    exportToCSV(data, 'urun_listesi', headers)
  }

  const handleExportMovements = () => {
    if (!movements) return
    const headers = ['created_at', 'products.ad', 'tip', 'miktar', 'aciklama']
    const data = movements.map((m: any) => ({
      created_at: new Date(m.created_at).toLocaleString('tr-TR'),
      'products.ad': m.products?.ad || '',
      tip: m.tip === 'giris' ? 'Giriş' : m.tip === 'cikis' ? 'Çıkış' : 'Düzeltme',
      miktar: m.tip === 'duzeltme' ? '-' : m.miktar,
      aciklama: m.aciklama || ''
    }))
    exportToCSV(data, 'stok_hareketleri', headers)
  }

  if (productsLoading || movementsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📊 Raporlama</h1>
        <span className="text-sm text-gray-500">
          Son güncelleme: {new Date().toLocaleString('tr-TR')}
        </span>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'products'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📦 Ürün Raporu
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'movements'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔄 Stok Hareketleri Raporu
        </button>
      </div>

      {/* Ürün Raporu */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">📦 Ürün Listesi</h2>
            <button
              onClick={handleExportProducts}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              📥 CSV İndir
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tedarikçi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiyat</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products?.map((product: any) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.sku}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.ad}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.categories?.ad || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.suppliers?.ad || '-'}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
            {products?.length === 0 && (
              <div className="text-center py-8 text-gray-500">Henüz ürün yok.</div>
            )}
          </div>
        </div>
      )}

      {/* Stok Hareketleri Raporu */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">🔄 Stok Hareketleri</h2>
            <button
              onClick={handleExportMovements}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              📥 CSV İndir
            </button>
          </div>
          <div className="overflow-x-auto">
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
                {movements?.map((movement: any) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(movement.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {movement.products?.ad || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        movement.tip === 'giris' ? 'bg-green-100 text-green-700' :
                        movement.tip === 'cikis' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {movement.tip === 'giris' ? '📥 Giriş' :
                         movement.tip === 'cikis' ? '📤 Çıkış' : '✏️ Düzeltme'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {movement.tip === 'duzeltme' ? '-' : movement.miktar}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {movement.aciklama || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movements?.length === 0 && (
              <div className="text-center py-8 text-gray-500">Henüz stok hareketi yok.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}