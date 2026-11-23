import React from 'react';
import { motion } from 'motion/react';

export function Logo({ size = 'default', showWordmark = true, animated = false, className = '' }) {
  const iconSizes = {
    small: 28,
    default: 36,
    large: 50,
  };

  const currentSize = iconSizes[size] || 36;

  return (
    <div
      className={`logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.75rem',
        userSelect: 'none',
      }}
    >
      {/* Geometric Unfolding Facet Emblem */}
      <motion.svg
        width={currentSize}
        height={currentSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        whileHover={{ scale: 1.08, rotate: 3 }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      >
        {/* Top Facet (Forest Green) */}
        <motion.path
          d="M50 12 L84 32 L50 52 L16 32 Z"
          fill="#294C38"
          stroke="currentColor"
          strokeWidth="2.5"
          initial={animated ? { opacity: 0, y: -10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        />

        {/* Left Unfolded Facet (Sage) */}
        <motion.path
          d="M16 32 L50 52 L50 88 L16 68 Z"
          fill="#B8D8A5"
          stroke="currentColor"
          strokeWidth="2.5"
          initial={animated ? { opacity: 0, x: -10 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        />

        {/* Right Unfolded Facet (Acid Yellow) */}
        <motion.path
          d="M50 52 L84 32 L84 68 L50 88 Z"
          fill="#E2FF54"
          stroke="currentColor"
          strokeWidth="2.5"
          initial={animated ? { opacity: 0, x: 10 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        />

        {/* Central Anchor Node */}
        <circle cx="50" cy="52" r="5" fill="#151B17" />
        <circle cx="84" cy="32" r="3" fill="#E2FF54" />
      </motion.svg>

      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: size === 'large' ? '1.75rem' : size === 'small' ? '1.15rem' : '1.4rem',
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
            }}
          >
            UNFOLD
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.625rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginTop: '3px',
            }}
          >
            Beyond Campus
          </span>
        </div>
      )}
    </div>
  );
}
