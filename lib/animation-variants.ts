import { type Variants } from 'framer-motion';

export const fadeVariants: Variants = {
  show: {
    opacity: 1,
    scale: 1,
  },
  hidden: {
    opacity: 0,
    scale: 0.1,
  },
};
