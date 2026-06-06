/** VoltusWave AMI — shared Framer Motion presets */

export const motionEase = [0.22, 1, 0.36, 1] as const;

export const springSnappy = { type: 'spring' as const, damping: 28, stiffness: 380 };

export const springSoft = { type: 'spring' as const, damping: 32, stiffness: 280 };

export const fadeInUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12 },
};

export const listItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const tableRow = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0 },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
};

export const staggerFast = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
};

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
};

export function fadeTransition(delay = 0) {
  return { duration: 0.38, ease: motionEase, delay };
}

export function listItemTransition(index = 0) {
  return { duration: 0.32, ease: motionEase, delay: index * 0.04 };
}
