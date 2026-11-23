import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

export function ChromaticReveal() {
  const { isExploding, onExplosionComplete } = useTheme();

  useEffect(() => {
    if (isExploding) {
      const timer = setTimeout(() => {
        onExplosionComplete();
      }, 2350);
      return () => clearTimeout(timer);
    }
  }, [isExploding, onExplosionComplete]);

  if (!isExploding) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          pointerEvents: 'none',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Layer 1: Central Luminous Shockwave (Acid Yellow Ignition) */}
        <motion.div
          style={{
            position: 'absolute',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #E2FF54 0%, #B8D8A5 65%, transparent 100%)',
            boxShadow: '0 0 70px #E2FF54, 0 0 140px #B8D8A5',
            filter: 'blur(12px)',
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 4.5, 36],
            opacity: [1, 0.95, 0],
          }}
          transition={{
            duration: 2.2,
            times: [0, 0.35, 1],
            ease: [0.16, 1, 0.3, 1],
          }}
        />

        {/* Layer 2: Organic Liquid Ink Expansion (Forest Green Deep Core) */}
        <motion.div
          style={{
            position: 'absolute',
            width: '170px',
            height: '170px',
            borderRadius: '45% 55% 60% 40% / 50% 45% 55% 50%',
            background: 'radial-gradient(circle, #294C38 0%, #1E3829 55%, #151B17 100%)',
            filter: 'blur(22px)',
          }}
          initial={{ scale: 0, rotate: 0, opacity: 0.9 }}
          animate={{
            scale: [0, 7.5, 42],
            rotate: [0, 95, 190],
            opacity: [0, 0.88, 0],
          }}
          transition={{
            duration: 2.1,
            delay: 0.1,
            times: [0, 0.45, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
        />

        {/* Layer 3: Radiant Sage & Acid Yellow Liquid Wave */}
        <motion.div
          style={{
            position: 'absolute',
            width: '190px',
            height: '190px',
            borderRadius: '58% 42% 48% 52% / 45% 60% 40% 55%',
            background: 'radial-gradient(circle, #E2FF54 0%, #B8D8A5 45%, #294C38 85%)',
            mixBlendMode: 'screen',
            filter: 'blur(26px)',
          }}
          initial={{ scale: 0, rotate: 0, opacity: 0.9 }}
          animate={{
            scale: [0, 9.5, 48],
            rotate: [0, -110, -230],
            opacity: [0, 0.92, 0],
          }}
          transition={{
            duration: 2.3,
            delay: 0.18,
            times: [0, 0.5, 1],
            ease: [0.16, 1, 0.3, 1],
          }}
        />

        {/* Layer 4: Viewport Corner Coverage (Ultra-oversized expanding canvas to all 4 corners) */}
        <motion.div
          style={{
            position: 'absolute',
            width: '320vw',
            height: '320vh',
            borderRadius: '50%',
            background: 'radial-gradient(circle at center, rgba(226,255,84,0.95) 0%, rgba(184,216,165,0.85) 30%, rgba(41,76,56,0.8) 65%, rgba(21,27,23,0) 100%)',
            mixBlendMode: 'lighten',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 0.15, 1.25],
            opacity: [0, 0.82, 0],
          }}
          transition={{
            duration: 2.25,
            delay: 0.08,
            times: [0, 0.3, 1],
            ease: 'easeOut',
          }}
        />

        {/* Layer 5: Exact Central Luminous Origin Dot (50% / 50%) */}
        <motion.div
          style={{
            position: 'absolute',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 0 35px #FFFFFF, 0 0 70px #E2FF54, 0 0 110px #B8D8A5',
          }}
          initial={{ scale: 0 }}
          animate={{
            scale: [0, 3.2, 0],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 0.65,
            ease: 'easeOut',
          }}
        />
      </div>
    </AnimatePresence>
  );
}
