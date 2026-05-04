"use client";
import { useState, useEffect } from 'react';
import AudioWaveform from './AudioWaveform';

export interface CarouselSlide {
  badge?: string;
  title_en: string;
  title_rw: string;
  subtitle_en?: string | null;
  subtitle_rw?: string | null;
  description_en?: string | null;
  description_rw?: string | null;
  cta_label_en?: string | null;
  cta_label_rw?: string | null;
  cta_url?: string | null;
  background_image_url?: string | null;
  background_color?: string | null;
}

const defaultSlides: CarouselSlide[] = [
  {
    badge: 'INKURU · UBUKIRE',
    title_en: 'Prosperity of the Heart',
    title_rw: 'Ubukire bw\'Umutima',
    subtitle_en: 'New Series',
    subtitle_rw: 'Urukurikirane Rushya',
    description_en: 'Discover true wealth that transforms from within',
    description_rw: 'Vugurura ubukire nyabwo buhindura imbere',
  },
  {
    badge: 'INKURU · IJURU',
    title_en: 'Heaven\'s Voice',
    title_rw: 'Ijwi ry\'Ijuru',
    subtitle_en: 'Featured',
    subtitle_rw: 'Byatoranijwe',
    description_en: 'Hear the whispers of divine wisdom in daily life',
    description_rw: 'Umva ijwi ry\'ubwenge bw\'Imana mu buzima bwa buri munsi',
  },
  {
    badge: 'INKURU · URUGO',
    title_en: 'Building Strong Homes',
    title_rw: 'Kubaka Inzu Ikomeye',
    subtitle_en: 'Family Series',
    subtitle_rw: 'Urukurikirane rw\'Umuryango',
    description_en: 'Foundations for families that last generations',
    description_rw: 'Urufatiro rw\'imiryango irambye',
  },
];

export default function HeroCarousel({ language = 'en', slides }: { language?: string; slides?: CarouselSlide[] }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const data = slides && slides.length ? slides : defaultSlides;

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveSlide((prev) => (prev + 1) % data.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    if (index === activeSlide) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveSlide(index);
      setIsTransitioning(false);
    }, 300);
  };

  const currentSlide = data[activeSlide];

  return (
    <div className="relative min-h-[320px] md:min-h-[360px] flex items-end overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-[#0a0a0a]" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-40" />
      
      {/* Waveform */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30">
        <AudioWaveform className="w-full h-full" />
      </div>

      {/* Content */}
      <div className="container relative z-10 pb-12 pt-24">
        <div className="max-w-2xl">
          {/* Slide content with transition */}
          <div
            className={`transition-all duration-300 ${
              isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                {currentSlide.badge}
              </span>
            </div>

            {/* Subtitle */}
            <div className="text-xs font-mono uppercase tracking-wider text-muted/60 mb-2">
              {language === 'rw' ? currentSlide.subtitle_rw || '' : currentSlide.subtitle_en || ''}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-bold mb-3 leading-tight">
              {language === 'rw' ? currentSlide.title_rw : currentSlide.title_en}
            </h1>

            {/* Description */}
            <p className="text-sm md:text-base text-muted mb-6 max-w-lg">
              {language === 'rw' ? currentSlide.description_rw || '' : currentSlide.description_en || ''}
            </p>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <button className="px-5 py-2.5 rounded-lg bg-primary text-black font-semibold text-sm hover:opacity-90 transition flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {language === 'rw' ? (currentSlide.cta_label_rw || 'Tangira Kumva') : (currentSlide.cta_label_en || 'Play Now')}
              </button>
              <button className="px-5 py-2.5 rounded-lg border border-white/20 text-white font-semibold text-sm hover:bg-white/5 transition">
                {language === 'rw' ? 'Reba Byinshi' : 'View Plans'}
              </button>
            </div>
          </div>

          {/* Dots */}
          <div className="flex gap-2 mt-6">
            {data.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1 rounded-full transition-all ${
                  index === activeSlide
                    ? 'w-8 bg-primary'
                    : 'w-5 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
