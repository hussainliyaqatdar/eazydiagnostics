import { CUSTOMER_REVIEWS, GMB_RATING } from "@/lib/site-config";

const AVATAR_COLORS = ["#0F6E6E", "#FF7A45", "#4A7EA0", "#B5654A", "#5C8A6E", "#8A6EB5"];

function initialsAvatar(name: string, idx: number) {
  const initial = name.trim().charAt(0).toUpperCase();
  const bg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-brand-accent" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="w-3.5 h-3.5" fill={i < count ? "currentColor" : "#E5E7EB"} aria-hidden="true">
          <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsCarousel() {
  // Duplicate the list so the CSS scroll animation can loop seamlessly.
  const track = [...CUSTOMER_REVIEWS, ...CUSTOMER_REVIEWS];

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Our patients rate us highly.</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
          <Stars count={5} />
          <span className="font-semibold text-gray-900">{GMB_RATING.value}</span>
          <span>rated on Google</span>
        </div>
      </div>

      <div className="reviews-marquee-mask">
        <div className="reviews-marquee-track">
          {track.map((r, i) => (
            <div key={i} className="bg-white border rounded-lg p-4 flex flex-col gap-3 w-72 shrink-0">
              <div className="flex items-center gap-3">
                {initialsAvatar(r.name, i)}
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                  <Stars count={r.rating} />
                </div>
              </div>
              <p className="text-sm text-gray-600">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
