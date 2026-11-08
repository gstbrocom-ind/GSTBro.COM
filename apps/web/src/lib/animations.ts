import type { Variants, Transition } from 'motion/react';

/**
 * Standard motion transitions engineered for fintech and professional CA platforms.
 * Restrained, elegant, and non-distracting.
 */
export const transitions = {
  smooth: {
    duration: 0.45,
    ease: [0.16, 1, 0.3, 1],
  } as Transition,
  gentle: {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1],
  } as Transition,
  fast: {
    duration: 0.25,
    ease: [0.16, 1, 0.3, 1],
  } as Transition,
  spring: {
    type: 'spring',
    damping: 24,
    stiffness: 260,
  } as Transition,
  springSnappy: {
    type: 'spring',
    damping: 20,
    stiffness: 320,
  } as Transition,
  springHover: {
    type: 'spring',
    damping: 22,
    stiffness: 350,
  } as Transition,
};

/**
 * Entrance fade-up variant for headlines, cards, and section containers.
 */
export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: transitions.fast,
  },
};

/**
 * Delicate fade-in variant (pure opacity, zero layout shift).
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    transition: transitions.fast,
  },
};

/**
 * Staggered container for lists, grids, and hero elements.
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

/**
 * Interactive card hover variants: subtle elevation, soft glow, and fine border emphasis.
 */
export const cardHoverVariants: Variants = {
  initial: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
  },
  hover: {
    y: -3,
    boxShadow: '0 12px 24px -8px rgba(15, 23, 42, 0.12), 0 4px 8px -4px rgba(37, 99, 235, 0.08)',
    transition: transitions.fast,
  },
  tap: {
    y: 0,
    scale: 0.99,
    transition: { duration: 0.1 },
  },
};

/**
 * Interactive button press variant.
 */
export const buttonPressVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.02, transition: transitions.fast },
  tap: { scale: 0.98, transition: { duration: 0.1 } },
};

/**
 * Modal & dialog scale-and-fade entrance.
 */
export const modalScaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 6,
    transition: transitions.fast,
  },
};

/**
 * Tab switcher content animation.
 */
export const tabContentVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: transitions.fast,
  },
};
