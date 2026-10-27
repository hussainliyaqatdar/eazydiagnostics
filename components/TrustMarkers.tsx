import Image from "next/image";
import { TRUST_MARKERS } from "@/lib/site-config";

// `twoByTwo` keeps the cards in a 2x2 block at every width - for narrower
// columns (e.g. beside the doctor sign-up form) where four across is too tight.
export default function TrustMarkers({ twoByTwo = false }: { twoByTwo?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-4 py-6 ${twoByTwo ? "" : "md:grid-cols-4"}`}>
      {TRUST_MARKERS.map((m) => (
        <div key={m.label} className="w-full bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* w-full is required, not just a max-width, because Image `fill` has no
              intrinsic size of its own - see the hero carousel for the same fix. */}
          <div className="relative w-full aspect-[3/2]">
            <Image src={m.image} alt={m.alt} fill priority sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
          </div>
          <p className="text-center text-xs sm:text-sm font-semibold text-gray-900 px-2 py-2 leading-snug">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
