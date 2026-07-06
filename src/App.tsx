import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { signOut } from './services/auth'
import Products from './pages/Products'
import AddProduct from './pages/AddProduct'
import Categories from './pages/Categories'
import Suppliers from './pages/Suppliers'
import StockMovements from './pages/StockMovements'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Users from './pages/Users'
import Reports from './pages/Reports'
import AuditLog from './pages/AuditLog'

function App() {
  const { user, profile, loading, isAdmin, isPersonel } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Navbar */}
        <nav className="bg-white shadow-md p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📦</span>
              <h1 className="text-xl font-bold text-blue-600">Stok Takip Paneli</h1>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">Dashboard</Link>
              
              {/* Personel ve Admin görebilir */}
              {isPersonel && (
                <>
                  <Link to="/products" className="text-gray-600 hover:text-blue-600 font-medium">Ürünler</Link>
                  <Link to="/categories" className="text-gray-600 hover:text-blue-600 font-medium">Kategoriler</Link>
                  <Link to="/suppliers" className="text-gray-600 hover:text-blue-600 font-medium">Tedarikçiler</Link>
                  <Link to="/movements" className="text-gray-600 hover:text-blue-600 font-medium">Stok Hareketleri</Link>
                  <Link to="/reports" className="text-gray-600 hover:text-blue-600 font-medium">📊 Raporlar</Link>
                </>
              )}
              
              {/* Viewer sadece Dashboard ve Ürünleri görebilir */}
              {!isPersonel && (
                <Link to="/products" className="text-gray-600 hover:text-blue-600 font-medium">Ürünler</Link>
              )}
              
              {/* Admin'e özel linkler */}
              {isAdmin && (
                <>
                  <Link to="/users" className="text-gray-600 hover:text-blue-600 font-medium">
                    👥 Kullanıcılar
                  </Link>
                  <Link to="/audit" className="text-gray-600 hover:text-blue-600 font-medium">
                    📋 Audit Log
                  </Link>
                </>
              )}
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  👤 {profile?.ad_soyad || user.email}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isAdmin ? 'bg-purple-100 text-purple-700' :
                  isPersonel ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {profile?.rol || 'viewer'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Çıkış
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Sayfa içeriği */}
        <div className="container mx-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/add" element={
              isPersonel ? <AddProduct /> : 
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                ⛔ Bu sayfaya erişim yetkiniz yok. Sadece Personel ve Admin ekleme yapabilir.
              </div>
            } />
            <Route path="/categories" element={
              isPersonel ? <Categories /> :
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                ⛔ Bu sayfaya erişim yetkiniz yok.
              </div>
            } />
            <Route path="/suppliers" element={
              isPersonel ? <Suppliers /> :
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                ⛔ Bu sayfaya erişim yetkiniz yok.
              </div>
            } />
            <Route path="/movements" element={
              isPersonel ? <StockMovements /> :
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                ⛔ Bu sayfaya erişim yetkiniz yok.
              </div>
            } />
            <Route path="/reports" element={
              isPersonel ? <Reports /> :
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                ⛔ Bu sayfaya erişim yetkiniz yok.
              </div>
            } />
            <Route path="/users" element={
              isAdmin ? <Users /> :
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                ⛔ Bu sayfaya sadece Admin erişebilir.
              </div>
            } />
            <Route path="/audit" element={
              isAdmin ? <AuditLog /> :
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                ⛔ Bu sayfaya sadece Admin erişebilir.
              </div>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App