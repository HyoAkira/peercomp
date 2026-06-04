export default function HeroSection() {
  return (
    <section className="relative w-full h-105 overflow-hidden flex items-center justify-center">
      <img
        src="/world.svg"
        className="absolute inset-0 w-full h-full object-cover scale-200"
        alt="world"
      />
      <div className="absolute inset-0 bg-black/30" />

      <h1 className="relative text-center text-white text-2xl md:text-3xl font-semibold px-4">
        Her Noktada Hesaplama,
        <br />
        Tüm Dünyada Dağıtım
      </h1>
    </section>
  );
}
