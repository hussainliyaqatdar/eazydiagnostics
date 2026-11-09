"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type Slide = { image: string; alt: string; heading: string; subhead: string };

// Three audiences, three messages. The image, heading, and subtext change
// together so each slide reads as one coherent pitch, not a photo swap under
// static text.
const SLIDES: Slide[] = [
  {
    image: "/images/senior-citizen-home-collection.webp",
    alt: "A phlebotomist in gloves and a mask visits a senior citizen at home to draw a blood sample while he sits comfortably on his sofa, using a professional collection kit with labelled sample tubes and a sharps container.",
    heading: "Specialised Tests for Heart Health & Diabetes",
    subhead:
      "From lipid profiles and cardiac risk markers to HbA1c and blood sugar monitoring - specialised heart and diabetes tests, collected gently at home for your parents and loved ones.",
  },
  {
    image: "/images/hero-home-collection.webp",
    alt: "A phlebotomist in gloves and a mask visits a pregnant woman at home to collect a blood sample, using a professional collection kit with labelled sample tubes and a sharps container.",
    heading: "Your Pregnancy, Cared For At Home",
    subhead:
      "Accurate hormone panels, NIPT and other specialised DNA tests - hospital-grade prenatal reports without leaving your couch, trusted by expecting mothers across Bangalore.",
  },
  {
    image: "/images/corporate-professional-home-collection.webp",
    alt: "A phlebotomist in gloves and a mask visits a corporate professional at home to draw a blood sample while he works on his laptop, using a professional collection kit with labelled sample tubes and a sharps container.",
    heading: "Know Where Your Body Needs Attention",
    subhead: "Comprehensive full body checkups for professionals who'd rather catch a problem early than manage one later.",
  },
];

const AUTOPLAY_MS = 4000;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <>
      {/* Text and dots share hero-text's grid slot; image below shares hero-illus's -
          both driven by the same `index` so they change in lockstep. */}
      <div className="hero-text flex flex-col gap-4" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div key={index} className="flex flex-col gap-4 animate-[hero-fade_0.6s_ease-out]">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{SLIDES[index].heading}</h1>
          <p className="text-gray-700">{SLIDES[index].subhead}</p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Hero highlights">
          {SLIDES.map((s, i) => (
            <button
              key={s.image}
              role="tab"
              aria-selected={i === index}
              aria-label={`Show: ${s.heading}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-brand" : "w-1.5 bg-gray-300 hover:bg-gray-400"}`}
            />
          ))}
        </div>
      </div>

      <div
        className="hero-illus w-full max-w-sm mx-auto md:max-w-none md:mx-0"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* fill-mode Image below has zero intrinsic size (unlike a plain <img>),
            so this box needs an explicit width - w-full above, not just
            max-width - or the aspect-ratio here has nothing to size from. */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-sm aspect-[3/2]">
          {SLIDES.map((s, i) => (
            <Image
              key={s.image}
              src={s.image}
              alt={s.alt}
              fill
              priority={i === 0}
              sizes="(min-width: 768px) 50vw, 100vw"
              className={`object-cover transition-opacity duration-700 ease-in-out ${i === index ? "opacity-100" : "opacity-0"}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
