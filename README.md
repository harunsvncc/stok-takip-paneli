# 📦 Stok & Envanter Takip Paneli

**React + TypeScript + Supabase** ile geliştirilmiş, rol tabanlı (RBAC) stok yönetim sistemidir.

## 🚀 Özellikler

- ✅ **Kimlik Doğrulama** (Supabase Auth) ile giriş/çıkış
- 👥 **Rol Bazlı Yetkilendirme** (Admin, Depo Personeli, Görüntüleyici)
- 🔒 **RLS Politikaları** ile veritabanı güvenliği
- 📦 **Ürün Yönetimi** (Ekle, listele, düzenle, pasifleştir)
- 🏷️ **Kategori ve Tedarikçi Yönetimi**
- 🔄 **Stok Hareketleri** (Giriş/Çıkış/Düzeltme)
- 📊 **Dashboard** (Özet kartlar, Recharts grafikler)
- ⚠️ **Düşük Stok Uyarıları**
- 📋 **Audit Log** (İşlem geçmişi)
- 👥 **Kullanıcı Yönetimi** (Admin paneli)
- 📈 **Raporlama ve CSV Export**

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** React, TypeScript, Vite
- **UI:** Tailwind CSS
- **State Management:** TanStack React Query
- **Form Yönetimi:** React Hook Form, Zod
- **Veritabanı:** Supabase (PostgreSQL + Auth + RLS)
- **Grafik:** Recharts
- **Deploy:** Vercel

## 🏁 Test Hesapları

| Rol | E-posta | Şifre |
|-----|---------|-------|
| **Admin** | `test@deneme.com` | `Test123456` |
| **Depo Personeli** | `depo@test.com` | `depo123456` |
| **Görüntüleyici** | `izleyici@test.com` | `izleyici123456` |

## ⚙️ Kurulum ve Çalıştırma

```bash
# 1. Projeyi klonla
git clone https://github.com/kullanici-adi/stok-takip-paneli.git

# 2. Proje klasörüne gir
cd stok-takip-paneli

# 3. Bağımlılıkları yükle
npm install

# 4. .env dosyasını oluştur ve gerekli değişkenleri ekle
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=...

# 5. Geliştirme sunucusunu başlat
npm run dev