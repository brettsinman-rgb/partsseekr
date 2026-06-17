import Image from 'next/image';

const AUTO_BRANDS = [
  { name: 'AMG', logo: '/logos/AMG.png' },
  { name: 'Aston Martin', logo: '/logos/Aston.png' },
  { name: 'Audi', logo: '/logos/Audi.png' },
  { name: 'BMW', logo: '/logos/BMW.png' },
  { name: 'HSV', logo: '/logos/HSV.png' },
  { name: 'Jaguar', logo: '/logos/Jag.png' },
  { name: 'Lamborghini', logo: '/logos/Lambo.png' },
  { name: 'Nissan', logo: '/logos/Nissan.png' },
  { name: 'Porsche', logo: '/logos/Porsche.png' },
  { name: 'Volvo', logo: '/logos/Volvo.png' }
];

export default function AutoBrandTicker() {
  const marqueeItems = [...AUTO_BRANDS, ...AUTO_BRANDS];

  return (
    <section className="rounded-3xl border border-[#0FF7D0] bg-white/80 px-6 py-8 shadow-soft fade-up fade-up-delay-1">
      <div className="mx-auto max-w-3xl text-center">
        <p className="display-font text-xl font-semibold text-[#262626] md:text-2xl">
          Trusted by drivers across <span className="font-bold text-[#0FF7D0]">major auto brands</span>
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#0FF7D0] bg-white/80 p-4">
        <div className="brand-ticker-track flex w-max items-center gap-4">
          {marqueeItems.map((brand, index) => (
            <div
              key={`${brand.name}-${index}`}
              className="flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border border-[#0FF7D0] bg-white px-3"
              title={brand.name}
            >
              <Image
                src={brand.logo}
                alt={`${brand.name} logo`}
                width={96}
                height={40}
                className="h-auto max-h-10 w-auto object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
