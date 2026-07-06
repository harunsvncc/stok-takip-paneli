import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '../services/auditLog'

export default function AuditLog() {
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: getAuditLogs
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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">📋 Audit Log</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zaman</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tablo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detay</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs?.map((log: any) => {
                const islemRenk = log.islem === 'ekle' ? 'text-green-600 bg-green-50' :
                                  log.islem === 'guncelle' ? 'text-blue-600 bg-blue-50' :
                                  log.islem === 'pasif_yap' ? 'text-red-600 bg-red-50' :
                                  'text-gray-600 bg-gray-50'
                const islemIcon = log.islem === 'ekle' ? '➕' :
                                  log.islem === 'guncelle' ? '✏️' :
                                  log.islem === 'pasif_yap' ? '🗑️' : '📝'
                
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(log.zaman).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {log.profiles?.ad_soyad || 'Bilinmeyen Kullanıcı'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.tablo === 'products' ? '📦 Ürün' :
                       log.tablo === 'categories' ? '🏷️ Kategori' :
                       log.tablo === 'suppliers' ? '🏢 Tedarikçi' :
                       log.tablo}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${islemRenk}`}>
                        {islemIcon} {log.islem === 'pasif_yap' ? 'Pasif Yap' :
                                  log.islem === 'ekle' ? 'Ekle' :
                                  log.islem === 'guncelle' ? 'Güncelle' : log.islem}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.detay && (
                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-w-xs">
                          {JSON.stringify(log.detay, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {logs?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz audit log kaydı yok.
          </div>
        )}
      </div>
    </div>
  )
}