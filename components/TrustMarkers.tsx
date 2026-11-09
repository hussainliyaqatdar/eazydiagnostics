import Image from "next/image";
import { TRUST_MARKERS } from "@/lib/site-config";
import { getBrand } from "@/lib/brand-server";
import { CLINIC_TRUST_MARKERS } from "@/lib/brand";

// `twoByTwo` keeps the cards in a 2x2 block at every width - for narrower
// columns (e.g. beside the doctor sign-up form) where four across is too tight.
export default function TrustMarkers({ twoByTwo = false }: { twoByTwo?: boolean }) {
  // A clinic's version has its own copy and picture in the same grid; the doctor
  // sign-up page (twoByTwo) always shows the standard cards.
  const clinic = !!getBrand() && !twoByTwo;
  const markers: { label: string; alt: string; image: string; crop?: { size: string; position: string } }[] = clinic ? CLINIC_TRUST_MARKERS : TRUST_MARKERS;
  const grid = (
    <div className={`grid grid-cols-2 gap-4 py-6 ${twoByTwo ? "" : "md:grid-cols-4"}`}>
      {markers.map((m) => (
        <div key={m.label} className="w-full bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* w-full is required, not just a max-width, because Image `fill` has no
              intrinsic size of its own - see the hero carousel for the same fix. */}
          <div className="relative w-full aspect-[3/2]">
            {m.crop ? (
              <div
                role="img"
                aria-label={m.alt}
                className="h-full w-full"
                style={{ backgroundImage: `url(${m.image})`, backgroundSize: m.crop.size, backgroundPosition: m.crop.position, backgroundRepeat: "no-repeat" }}
              />
            ) : (
              <Image src={m.image} alt={m.alt} fill priority sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
            )}
          </div>
          <p className="text-center text-xs sm:text-sm font-semibold text-gray-900 px-2 py-2 leading-snug">{m.label}</p>
        </div>
      ))}
    </div>
  );
  // A clinic's version names the section; the main site's markup is left exactly as it was.
  return clinic ? (
    <section aria-labelledby="how-it-works" className="pt-6">
      <h2 id="how-it-works" className="text-xl font-bold text-gray-900">How it works?</h2>
      {grid}
      <p className="-mt-3 text-xs text-gray-500">*For routine tests. Specialised tests can take longer; the time is shown on each test.</p>
    </section>
  ) : (
    grid
  );
}
