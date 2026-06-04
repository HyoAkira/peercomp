export default function FeaturesSection() {
  return (
    <section className="w-[92%] max-w-6xl mx-auto py-14 flex flex-col items-center gap-10">
      <div className="text-center">
        <h2 className="text-xl font-bold">YENİ NESİL BULUT DENEYİMİ</h2>
        <p className="font-semibold">
          Operasyonel yük yok, sunucu ve altyapı yönetimi yok!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="card bg-base-100 shadow-sm">
          <figure className="h-72">
            <img src="/hero2/1.jpg" className="w-full h-full object-cover" />
          </figure>
          <div className="card-body">
            <h2 className="card-title">Yerel ve Küresel erişilebilir</h2>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <figure className="h-72">
            <img src="/hero2/2.jpg" className="w-full h-full object-cover" />
          </figure>
          <div className="card-body">
            <h2 className="card-title">Her yerde çalışan fonksiyonlar</h2>
          </div>
        </div>
      </div>

      {/* FEATURE BLOCKS */}
      <div className="space-y-16 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <img src="/hero2/3.svg" className="w-full max-w-sm object-contain" />
          <div>
            <h3 className="text-3xl font-bold">Yenilikçi Teknoloji</h3>
            <p className="py-4 text-gray-600">
              Sıradan servis sağlayıcılarından farklı olarak, PeerComp yenilikçi
              teknolojisiyle öne çıkar. Dağıtık mimarisi sayesinde, verilerinizi
              dünya genelinde güvenle depolar ve işler.
            </p>
            <button className="btn btn-primary">Get Started</button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row-reverse items-center gap-8">
          <img
            src="/hero2/4.jpg"
            className="w-full max-w-sm object-cover rounded-lg"
          />
          <div>
            <h3 className="text-3xl font-bold">Güvenli ve Hızlı Dağıtım</h3>
            <p className="py-4 text-gray-600">
              Merkeziyetsiz yapısı sayesinde PeerComp verilerinizi erişim
              noktalarına yakın tutar, böylece hızlı ve güvenli bir deneyim
              sunar.
            </p>
            <button className="btn btn-primary">Get Started</button>
          </div>
        </div>
      </div>
    </section>
  );
}
