import { HERO_TRANSITION } from '../data/heroPersonas';

export function getHeroRole(index, activeIndex) {
  if (index === activeIndex) return 'center';
  if (index === (activeIndex + 3) % 4) return 'left';
  if (index === (activeIndex + 1) % 4) return 'right';
  return 'back';
}

export function heroImgFilter(role, item) {
  const extra = item.enhance ? `${item.enhance} ` : '';
  switch (role) {
    case 'center':
      if (item.softShadow) {
        return `${extra}drop-shadow(0 18px 34px rgba(15,45,90,0.32))`;
      }
      if (item.sharpCenter) {
        return `${extra}drop-shadow(0 4px 12px rgba(0,0,0,0.38)) drop-shadow(0 12px 26px rgba(0,0,0,0.32)) drop-shadow(0 26px 48px rgba(15,45,90,0.42))`;
      }
      return `${extra}drop-shadow(0 4px 12px rgba(0,0,0,0.36)) drop-shadow(0 14px 30px rgba(0,0,0,0.28)) drop-shadow(0 28px 50px rgba(15,45,90,0.38)) drop-shadow(0 0 12px rgba(255,255,255,0.15))`;
    case 'left':
    case 'right':
      return `${extra}blur(2px) drop-shadow(0 8px 20px rgba(0,0,0,0.34))`;
    default:
      return `${extra}blur(4px) drop-shadow(0 8px 18px rgba(0,0,0,0.28))`;
  }
}

export function heroRoleStyle(role, isMobile, item) {
  const defaultCenterScale = isMobile ? 1.1 : 1.46;
  const centerScale = item.centerScale ?? defaultCenterScale;
  const centerHeight = item.centerHeight ?? (isMobile ? '50%' : '82%');
  const centerBottom = isMobile
    ? (item.centerBottomMobile ?? '18%')
    : (item.centerBottom ?? '0');

  const base = {
    position: 'absolute',
    aspectRatio: '0.6 / 1',
    overflow: 'visible',
    transition: `transform ${HERO_TRANSITION}, opacity ${HERO_TRANSITION}, left ${HERO_TRANSITION}, height ${HERO_TRANSITION}, bottom ${HERO_TRANSITION}`,
    willChange: 'transform, opacity',
  };

  switch (role) {
    case 'center':
      return {
        ...base,
        left: '50%',
        bottom: centerBottom,
        height: isMobile ? '50%' : centerHeight,
        transform: `translateX(-50%) scale(${centerScale})`,
        opacity: 1,
        zIndex: 20,
      };
    case 'left':
      return {
        ...base,
        left: isMobile ? '20%' : '30%',
        bottom: isMobile ? '32%' : '12%',
        height: isMobile ? '16%' : '28%',
        transform: 'translateX(-50%) scale(1)',
        opacity: 0.85,
        zIndex: 10,
      };
    case 'right':
      return {
        ...base,
        left: isMobile ? '80%' : '70%',
        bottom: isMobile ? '32%' : '12%',
        height: isMobile ? '16%' : '28%',
        transform: 'translateX(-50%) scale(1)',
        opacity: 0.85,
        zIndex: 10,
      };
    default:
      return {
        ...base,
        left: '50%',
        bottom: isMobile ? '32%' : '12%',
        height: isMobile ? '13%' : '22%',
        transform: 'translateX(-50%) scale(1)',
        opacity: 1,
        zIndex: 5,
      };
  }
}
