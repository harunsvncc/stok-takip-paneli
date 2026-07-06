import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllUsers, updateUserRole } from '../services/auth'

export default function Users() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState('')

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: getAllUsers
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingId(null)
    }
  })

  const handleRoleChange = (userId: string, newRole: string) => {
    if (confirm('Bu kullanıcının rolünü değiştirmek istediğinize emin misiniz?')) {
      updateRoleMutation.mutate({ userId, role: newRole })
    }
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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">👥 Kullanıcı Yönetimi</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Soyad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kayıt Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {user.ad_soyad || 'İsimsiz Kullanıcı'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.rol === 'personel' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {user.rol === 'admin' ? 'Admin' :
                     user.rol === 'personel' ? 'Personel' : 'Viewer'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-6 py-4 text-sm">
                  <select
                    value={user.rol}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="personel">Personel</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}