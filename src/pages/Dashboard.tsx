import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316']

// Dashboard verilerini çek (Grafikler için eklendi)
const fetchDashboardData = async () => {
  // Toplam ürün sayısı
  const { count: totalProducts, error: err1 } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('aktif', true)
  
  if (err1) throw new Error(err1.message)

  // Toplam kategori sayısı
  const { count: totalCategories, error: err2 } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('aktif', true)
  
  if (err2) throw new Error(err2.message)

  // Toplam stok değeri
  const { data: products, error: err3 } = await supabase
    .from('products')
    .select('mevcut_stok, birim_fiyat, ad, kategori:category_id (ad)')
    .eq('aktif', true)
  
  if (err3) throw new Error(err3.message)

  const totalStockValue = products?.reduce((sum, p) => 
    sum + (p.mevcut_stok || 0) * (p.birim_fiyat || 0), 0
  ) || 0

  // Düşük stoktaki ürünler
  const { data: lowStockProducts, error: err4 } = await supabase
    .from('products')
    .select('id, sku, ad, mevcut_stok, min_stok')
    .eq('aktif', true)
  
  if (err4) throw new Error(err4.message)

  const filteredLowStock = lowStockProducts?.filter(
    (p: any) => p.mevcut_stok < p.min_stok
  ) || []

  // ---- GRAFİK VERİLERİ ----

  // 1. Stok durumu (ilk 10 ürün)
  const stockData = products
    ?.filter((p: any) => p.mevcut_stok > 0)
    .sort((a: any, b: any) => b.mevcut_stok - a.mevcut_stok)
    .slice(0, 10)
    .map((p: any) => ({
      name: p.ad.length > 15 ? p.ad.substring(0, 15) + '...' : p.ad,
      stok: p.mevcut_stok
    })) || []

  // 2. Kategori dağılımı
  const categoryMap: { [key: string]: number } = {}
  products?.forEach((p: any) => {
    const catName = p.kategori?.ad || 'Kategorisiz'
    categoryMap[catName] = (categoryMap[catName] || 0) + 1
  })
  
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name: name.length > 12 ? name.substring(0, 12) + '...' : name,
    value
  }))

  // 3. Son 7 günlük hareketler
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentMovements, error: err5 } = await supabase
    .from('stock_movements')
    .select(`
      *,
      products:product_id (ad)
    `)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true })
  
  if (err5) throw new Error(err5.message)

  // Günlük hareketleri grupla
  const dailyMovementMap: { [key: string]: { giris: number; cikis: number } } = {}
  recentMovements?.forEach((m: any) => {
    const date = new Date(m.created_at).toLocaleDateString('tr-TR')
    if (!dailyMovementMap[date]) {
      dailyMovementMap[date] = { giris: 0, cikis: 0 }
    }
    if (m.tip === 'giris') {
      dailyMovementMap[date].giris += m.miktar
    } else if (m.tip === 'cikis') {
      dailyMovementMap[date].cikis += m.miktar
    }
  })

  const movementData = Object.entries(dailyMovementMap).map(([date, data]) => ({
    date,
    giris: data.giris,
    cikis: data.cikis
  }))

  // Son 10 stok hareketi
  const { data: lastMovements, error: err6 } = await supabase
    .from('stock_movements')
    .select(`
      *,
      products:product_id (id, sku, ad)
    `)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (err6) throw new Error(err6.message)

  // Renkler
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316']

  return {
    totalProducts: totalProducts || 0,
    totalCategories: totalCategories || 0,
    totalStockValue,
    lowStockCount: filteredLowStock.length,
    lowStockProducts: filteredLowStock,
    recentMovements: lastMovements || [],
    stockData,
    categoryData,
    movementData
  }
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData
  })

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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">📊 Dashboard</h1>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Toplam Ürün</p>
          <p className="text-3xl font-bold text-blue-600">{data?.totalProducts}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Toplam Stok Değeri</p>
          <p className="text-3xl font-bold text-green-600">
            ₺{data?.totalStockValue?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Düşük Stok</p>
          <p className={`text-3xl font-bold ${data?.lowStockCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {data?.lowStockCount}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Kategori</p>
          <p className="text-3xl font-bold text-purple-600">{data?.totalCategories}</p>
        </div>
      </div>

      {/* Grafikler - 2'li Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Stok Durumu Grafiği */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📦 Stok Durumu (İlk 10)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.stockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="stok" fill="#3b82f6" name="Stok Miktarı" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Kategori Dağılımı - Pasta Grafiği */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🏷️ Kategori Dağılımı</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data?.categoryData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Son 7 Gün Hareket Grafiği */}
      {data?.movementData && data.movementData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📈 Son 7 Gün Stok Hareketleri</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.movementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="giris" stroke="#10b981" name="Giriş" strokeWidth={2} />
              <Line type="monotone" dataKey="cikis" stroke="#ef4444" name="Çıkış" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Düşük Stok Uyarıları */}
      {data?.lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-red-800 mb-3">⚠️ Düşük Stok Uyarıları</h2>
          <ul className="space-y-2">
            {data?.lowStockProducts.map((product: any) => (
              <li key={product.id} className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-800">{product.ad}</span>
                <span className="text-red-600 font-semibold">
                  Stok: {product.mevcut_stok} / Min: {product.min_stok}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Son Hareketler */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-800 px-6 py-4 border-b border-gray-200">
          📋 Son Stok Hareketleri
        </h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.recentMovements.map((movement: any) => {
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
                </tr>
              )
            })}
          </tbody>
        </table>
        {data?.recentMovements.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz stok hareketi yapılmamış.
          </div>
        )}
      </div>
    </div>
  )
}