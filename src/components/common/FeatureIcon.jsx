import React from 'react'

/**
 * A single visual language for prominent feature icons.
 * The glyph stays simple and familiar, while the tile gives it the same
 * dimensional accent treatment used by the navigation and workout screens.
 */
export default function FeatureIcon({ Icon, size = 22, className = '' }) {
  return (
    <span className={`featureIcon ${className}`.trim()} aria-hidden="true">
      <span className="featureIconSurface">
        <Icon size={size} strokeWidth={2.15} />
        <i />
      </span>
    </span>
  )
}
