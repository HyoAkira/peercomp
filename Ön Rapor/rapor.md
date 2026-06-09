# Özet
PeerComp, dağıtık bir P2P (Peer‑to‑Peer) platformudur; tarayıcı ve Node.js ortamlarında JavaScript fonksiyonlarını güvenli bir şekilde çalıştırır ve şifreli anahtar‑değer depolama sunar. Monorepo yapısı, Kademlia DHT, WebRTC üzerinden PeerJS, ve SES sandbox sayesinde sunucusuz, gizlilik‑korumalı ve offline‑first bir deneyim sağlar.

# Önsöz
Bu rapor, proje süresince gerçekleştirilen çalışmaları, mevcut durumunu ve ileriye dönük önerileri derlemektedir. Bilgi, **Memory Bank** dosyalarından, **progress.md**, **projectbrief.md**, **techContext.md**, **systemPatterns.md** ve kod tabanından alınmıştır.

# İçindekiler
1. [Şekiller Tablosu](#şekiller-tablosu)  
2. [Çizelgeler Tablosu](#çizelgeler-tablosu)  
3. [Simge ve Kısaltmalar](#simge-ve-kısaltmalar)  
4. [Giriş](#giriş)  
5. [Yazılım Yöntemi](#yazılım-yöntemi)  
6. [Uygulama](#uygulama)  
7. [Sonuç ve Öneriler](#sonuç-ve-öneriler)  
8. [Ekler](#ekler)  
9. [Kaynaklar](#kaynaklar)

# Şekiller Tablosu
| Şekil No | Açıklama | Dosya |
|----------|----------|-------|
| Şekil 1 | Yüksek‑seviyeli mimari diyagramı | `memory-bank/systemPatterns.md` (satır 5‑24) |
| Şekil 2 | Kademlia DHT akışı | `memory-bank/systemPatterns.md` (satır 49‑71) |
| Şekil 3 | WebRTC sinyal akışı | `memory-bank/systemPatterns.md` (satır 93‑118) |
| Şekil 4 | GatewayNode HTTP → P2P köprüsü | `memory-bank/systemPatterns.md` (satır 128‑160) |
| Şekil 5 | SES sandbox çalışma modeli | `memory-bank/systemPatterns.md` (satır 171‑225) |

# Çizelgeler Tablosu
| Çizelge No | Açıklama | Dosya |
|------------|----------|-------|
| Tablo 1 | Proje kapsamı ve hedefleri | `memory-bank/projectbrief.md` (satır 1‑16) |
| Tablo 2 | Teknoloji yığını ve sürümler | `memory-bank/techContext.md` (satır 3‑14) |
| Tablo 3 | Bileşen durum matrisi | `memory-bank/progress.md` (satır 11‑23) |
| Tablo 4 | Özellik tamamlama durumu | `memory-bank/progress.md` (satır 26‑84) |
| Tablo 5 | KPI ve metrikler | `memory-bank/progress.md` (satır 199‑207) |

# Simge ve Kısaltmalar
- **P2P** – Peer‑to‑Peer  
- **DHT** – Distributed Hash Table (Kademlia)  
- **SES** – Secure EcmaScript sandbox  
- **K‑Bucket** – Kademlia yönlendirme tablosu (k = 20)  
- **ALPHA** – Paralel lookup sayısı (α = 3)  
- **JWT** – JSON Web Token  
- **ECDSA** – Elliptic Curve Digital Signature Algorithm  
- **ECDH** – Elliptic Curve Diffie‑Hellman  
- **AES‑GCM** – Authenticated Encryption with Associated Data  
- **TTL** – Time‑to‑Live (veri ömrü)  
- **NAT** – Network Address Translation  

# Giriş
PeerComp, modern web uygulamalarının sunucu maliyetlerini azaltmak ve veri gizliliğini artırmak amacıyla tasarlanmıştır. Kullanıcılar fonksiyonlarını kaydeder, bu fonksiyonlar DHT üzerinden dağıtılır ve diğer eşler (browser veya gateway) tarafından çalıştırılır. Aynı zamanda şifreli KV (key‑value) depolama, offline‑first senkronizasyon ve kimlik temelli erişim kontrolü sunar.

# Yazılım Yöntemi
1. **Monorepo & Turborepo** – Tek depo içinde tüm paketler (`apps/*`, `packages/*`) pnpm ile yönetilir.  
2. **Domain‑Driven Design** – `packages/models` ortak veri modelleri, `packages/config` merkezi yapılandırma.  
3. **Test‑First Yaklaşım (planlanan)** – Şu an %0 test kapsamı; ileride Vitest + Playwright entegrasyonu planlanıyor.  
4. **CI/CD** – GitHub Actions henüz yapılandırılmadı; roadmap’te yer alıyor.  
5. **DevOps** – Docker‑Compose ile MongoDB + Nginx; Redis ve TLS henüz prod‑ready değil.  

# Uygulama
## 1. Bileşenler
- **Org API** (`apps/org`) – Kullanıcı, fonksiyon ve KV CRUD, JWT auth.  
- **GatewayNode** (`apps/node-worker-gateway`) – HTTP isteklerini DHT üzerinden yönlendirir, fallback olarak yerel SES worker çalıştırır.  
- **Peer Signal** (`apps/peer_signal`) – WebSocket + Redis tabanlı sinyal sunucusu, PeerJS ID dağıtımı.  
- **Web Frontend** (`apps/web`) – React + Vite, panel UI, Dexie‑tabanlı offline‑first veri katmanı, PeerComponent ile P2P başlatma.  
- **Backbone** – Nginx ingress, TLS sonlandırma, Docker‑Compose içinde MongoDB.  

## 2. Durum Özeti (progress.md)
| Bileşen | Durum | Not |
|---------|-------|-----|
| Org API | ✅ | Tam fonksiyon, auth, KV |
| GatewayNode | 🟡 | DHT çalışıyor, node‑id sabit |
| Peer Signal | 🟡 | WS/Redis çalışıyor, ölçekleme eksik |
| Web UI | 🟡 | Panel tamam, P2P göstergesi eksik |
| Docker/Infra | 🟡 | Nginx ve MongoDB hazır, Redis devre dışı |
| Test Coverage | 🔴 | %0, acil geliştirme ihtiyacı |
| TLS Prod | ⬜ | Let’s Encrypt entegrasyonu yok |

## 3. Performans KPI’ları (progress.md)
- P2P lookup latency p95: **~3‑5 s** (hedef < 2 s)  
- Function cold‑start (gateway fallback): **~800 ms** (hedef < 200 ms)  
- Sync conflict oranı: **~5 %** (hedef < 1 %)  

# Sonuç ve Öneriler
1. **Test altyapısı**: Birim, entegrasyon ve uç‑uç (E2E) testlerini kurarak %80+ kapsama ulaşılmalı.  
2. **TLS & Prod Hazırlığı**: Let’s Encrypt otomasyonu ve Redis prod‑deployment tamamlanmalı.  
3. **Peer İstikrarı**: ICE restart ve TURN sunucusu eklenerek NAT geçişi iyileştirilmeli.  
4. **Kademlia Persistens**: DHT routing tablosu ve veri kalıcılığı için disk‑tabanlı saklama eklenmeli.  
5. **Sandbox KV API**: SES sandbox içinde KV okuma/yazma fonksiyonları sunulmalı.  
6. **Gözlemleme**: pino/winston loglama, health‑check endpointleri ve Prometheus/Grafana entegrasyonu.  

# Ekler
- **Ek A** – Tam bileşen durum matrisi (progress.md).  
- **Ek B** – Kullanılan paket sürüm listesi (techContext.md).  
- **Ek C** – Mimari diyagram ASCII (systemPatterns.md).  

# Kaynaklar
1. **Project Brief** – `memory-bank/projectbrief.md`  
2. **Technology Context** – `memory-bank/techContext.md`  
3. **System Patterns** – `memory-bank/systemPatterns.md`  
4. **Progress Tracker** – `memory-bank/progress.md`  
5. **Kod Deposu** – GitHub: https://github.com/HyoAkira/bitirme2  

---  
*Bu rapor, “Ön Rapor” klasörüne kaydedilmiştir.*