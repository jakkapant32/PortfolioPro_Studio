import { useState, useEffect, useCallback } from 'react';
import {
  HERO_PERSONAS,
  HERO_GRAIN_SVG,
  HERO_TRANSITION,
  HERO_ANIM_LOCK_MS,
} from '../data/heroPersonas';
import { getHeroRole, heroImgFilter, heroRoleStyle } from '../utils/heroCarousel';

function IconArrowLeft() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m12 19-7-7 7-7" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrowRight({ size = 'md', className = '' }) {
  const dim = size === 'lg' ? 32 : 26;
  return (
    <svg
      className={className}
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m12 5 7 7-7 7" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}

export default function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const isMobile = useIsMobile();
  const active = HERO_PERSONAS[activeIndex];

  useEffect(() => {
    HERO_PERSONAS.forEach((item) => {
      const img = new Image();
      img.src = item.src;
    });
  }, []);

  const navigate = useCallback(
    (dir) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setActiveIndex((prev) => (dir === 'next' ? (prev + 1) % 4 : (prev + 3) % 4));
      window.setTimeout(() => setIsAnimating(false), HERO_ANIM_LOCK_MS);
    },
    [isAnimating],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') navigate('next');
      if (e.key === 'ArrowLeft') navigate('prev');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const jumpTo = (i) => {
    if (isAnimating || i === activeIndex) return;
    setIsAnimating(true);
    setActiveIndex(i);
    window.setTimeout(() => setIsAnimating(false), HERO_ANIM_LOCK_MS);
  };

  return (
    <section
      className="hero-carousel"
      style={{
        backgroundColor: active.bg,
        transition: `background-color ${HERO_TRANSITION}`,
      }}
      aria-label="Hero carousel"
    >
      <div className="hero-carousel-pills" aria-label="เลือกกลุ่มเป้าหมาย">
        {HERO_PERSONAS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={`hero-carousel-pill${i === activeIndex ? ' active' : ''}`}
            onClick={() => jumpTo(i)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="hero-carousel-stage">
        <div
          className="hero-carousel-grain"
          style={{ backgroundImage: HERO_GRAIN_SVG }}
          aria-hidden="true"
        />

        <div className="hero-carousel-title-wrap">
          <h1 className="hero-carousel-title">PORTFOLIO</h1>
        </div>

        <div className="hero-carousel-characters">
          {HERO_PERSONAS.map((item, index) => {
            const role = getHeroRole(index, activeIndex);
            return (
              <div
                key={item.id}
                className="hero-carousel-character"
                style={heroRoleStyle(role, isMobile, item)}
              >
                {role === 'center' ? (
                  <div className="hero-carousel-ground-shadow" aria-hidden="true" />
                ) : null}
                <img
                  src={item.src}
                  alt={item.label}
                  draggable={false}
                  style={{
                    filter: heroImgFilter(role, item),
                    transition: `filter ${HERO_TRANSITION}`,
                  }}
                />
              </div>
            );
          })}
        </div>

        {isMobile ? (
          <div className="hero-carousel-mobile-label">{active.labelEn}</div>
        ) : null}

        <div className="hero-carousel-copy">
          <p className="hero-carousel-label-en">{active.labelEn}</p>
          <p className="hero-carousel-desc">{active.desc}</p>
          <div className="hero-carousel-nav">
            <button type="button" className="hero-carousel-nav-btn" onClick={() => navigate('prev')} aria-label="Previous slide">
              <IconArrowLeft />
            </button>
            <button type="button" className="hero-carousel-nav-btn" onClick={() => navigate('next')} aria-label="Next slide">
              <IconArrowRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
