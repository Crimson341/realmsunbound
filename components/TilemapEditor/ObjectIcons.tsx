'use client';

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// ============================================
// CONTAINERS
// ============================================

export const ChestClosedIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="8" width="18" height="12" rx="2" fill="#8B5A2B" stroke="#5C3D1E" strokeWidth="1.5"/>
    <rect x="3" y="8" width="18" height="5" rx="1" fill="#A67C52"/>
    <rect x="10" y="10" width="4" height="3" rx="0.5" fill="#FFD700" stroke="#B8860B" strokeWidth="0.5"/>
    <path d="M3 13h18" stroke="#5C3D1E" strokeWidth="1"/>
  </svg>
);

export const ChestOpenIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="12" width="18" height="8" rx="1" fill="#8B5A2B" stroke="#5C3D1E" strokeWidth="1.5"/>
    <path d="M3 12L5 5h14l2 7" fill="#A67C52" stroke="#5C3D1E" strokeWidth="1"/>
    <circle cx="12" cy="8" r="1.5" fill="#FFD700"/>
    <rect x="8" y="14" width="2" height="2" fill="#FFD700"/>
    <rect x="12" y="15" width="2" height="2" fill="#FFD700"/>
  </svg>
);

export const ChestLockedIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="8" width="18" height="12" rx="2" fill="#6B4423" stroke="#4A2F17" strokeWidth="1.5"/>
    <rect x="3" y="8" width="18" height="5" rx="1" fill="#8B5A2B"/>
    <rect x="9" y="9" width="6" height="5" rx="1" fill="#4A4A4A" stroke="#333" strokeWidth="0.5"/>
    <circle cx="12" cy="11.5" r="1" fill="#FFD700"/>
    <path d="M3 13h18" stroke="#4A2F17" strokeWidth="1"/>
  </svg>
);

export const BarrelIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <ellipse cx="12" cy="5" rx="6" ry="2" fill="#A67C52"/>
    <path d="M6 5v14c0 1.1 2.7 2 6 2s6-.9 6-2V5" fill="#8B5A2B" stroke="#5C3D1E" strokeWidth="1"/>
    <ellipse cx="12" cy="19" rx="6" ry="2" fill="#6B4423"/>
    <path d="M6 8h12M6 12h12M6 16h12" stroke="#5C3D1E" strokeWidth="1.5"/>
  </svg>
);

export const CrateIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="4" width="16" height="16" fill="#A67C52" stroke="#5C3D1E" strokeWidth="1.5"/>
    <path d="M4 4l16 16M20 4L4 20" stroke="#8B5A2B" strokeWidth="2"/>
    <rect x="4" y="4" width="16" height="16" stroke="#5C3D1E" strokeWidth="1.5" fill="none"/>
  </svg>
);

export const UrnIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8 20h8l1-6c.5-3-1-6-1-6H8s-1.5 3-1 6l1 6z" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
    <ellipse cx="12" cy="8" rx="4" ry="1.5" fill="#D1D5DB" stroke="#6B7280" strokeWidth="1"/>
    <path d="M9 6c0-1 1-2 3-2s3 1 3 2" stroke="#6B7280" strokeWidth="1" fill="none"/>
  </svg>
);

export const SackIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M7 8c-1 4-1 8 0 12h10c1-4 1-8 0-12" fill="#B8860B" stroke="#8B6914" strokeWidth="1"/>
    <path d="M7 8c0-2 2-4 5-4s5 2 5 4" fill="#D4A84B" stroke="#8B6914" strokeWidth="1"/>
    <path d="M10 6v-2M14 6v-2M12 4h-2M12 4h2" stroke="#8B6914" strokeWidth="1.5"/>
  </svg>
);

// ============================================
// FURNITURE
// ============================================

export const TableIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="8" width="18" height="3" rx="1" fill="#8B5A2B" stroke="#5C3D1E" strokeWidth="1"/>
    <rect x="5" y="11" width="2" height="9" fill="#6B4423"/>
    <rect x="17" y="11" width="2" height="9" fill="#6B4423"/>
  </svg>
);

export const ChairIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="3" width="12" height="10" rx="1" fill="#8B5A2B" stroke="#5C3D1E" strokeWidth="1"/>
    <rect x="6" y="13" width="12" height="3" fill="#A67C52" stroke="#5C3D1E" strokeWidth="1"/>
    <rect x="7" y="16" width="2" height="5" fill="#6B4423"/>
    <rect x="15" y="16" width="2" height="5" fill="#6B4423"/>
  </svg>
);

export const BedIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="10" width="20" height="8" rx="1" fill="#8B0000" stroke="#5C0000" strokeWidth="1"/>
    <rect x="2" y="14" width="20" height="4" fill="#6B4423" stroke="#4A2F17" strokeWidth="1"/>
    <rect x="3" y="11" width="6" height="3" rx="1" fill="#F5F5DC"/>
    <rect x="4" y="18" width="2" height="3" fill="#4A2F17"/>
    <rect x="18" y="18" width="2" height="3" fill="#4A2F17"/>
  </svg>
);

export const BookshelfIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="2" width="18" height="20" fill="#6B4423" stroke="#4A2F17" strokeWidth="1"/>
    <rect x="4" y="3" width="3" height="5" fill="#DC2626"/>
    <rect x="7" y="3" width="2" height="5" fill="#2563EB"/>
    <rect x="9" y="4" width="3" height="4" fill="#16A34A"/>
    <rect x="12" y="3" width="2" height="5" fill="#9333EA"/>
    <rect x="14" y="4" width="4" height="4" fill="#CA8A04"/>
    <path d="M3 9h18M3 15h18" stroke="#4A2F17" strokeWidth="1"/>
    <rect x="5" y="10" width="4" height="4" fill="#DC2626"/>
    <rect x="10" y="10" width="3" height="4" fill="#2563EB"/>
    <rect x="14" y="11" width="4" height="3" fill="#16A34A"/>
    <rect x="4" y="16" width="3" height="5" fill="#9333EA"/>
    <rect x="8" y="16" width="4" height="5" fill="#CA8A04"/>
    <rect x="13" y="17" width="3" height="4" fill="#DC2626"/>
    <rect x="17" y="16" width="3" height="5" fill="#2563EB"/>
  </svg>
);

export const ThroneIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 22V8L4 2h16l-2 6v14H6z" fill="#FFD700" stroke="#B8860B" strokeWidth="1"/>
    <rect x="8" y="14" width="8" height="8" fill="#8B0000"/>
    <circle cx="12" cy="5" r="2" fill="#DC2626"/>
    <circle cx="7" cy="4" r="1" fill="#DC2626"/>
    <circle cx="17" cy="4" r="1" fill="#DC2626"/>
    <path d="M6 8h12" stroke="#B8860B" strokeWidth="1"/>
  </svg>
);

// ============================================
// LIGHT SOURCES
// ============================================

export const TorchWallIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="10" y="12" width="4" height="10" fill="#6B4423" stroke="#4A2F17" strokeWidth="1"/>
    <path d="M12 12c-3-2-4-5-3-8 1 2 3 3 3 3s2-1 3-3c1 3 0 6-3 8z" fill="#FF6B00" stroke="#FF4500" strokeWidth="0.5"/>
    <path d="M12 10c-1.5-1-2-2.5-1.5-4 .5 1 1.5 1.5 1.5 1.5s1-.5 1.5-1.5c.5 1.5 0 3-1.5 4z" fill="#FFD700"/>
    <ellipse cx="12" cy="4" rx="2" ry="1" fill="#FFFF00" opacity="0.5"/>
  </svg>
);

export const TorchGroundIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="10" y="10" width="4" height="12" fill="#6B4423" stroke="#4A2F17" strokeWidth="1"/>
    <path d="M12 10c-3-2-4-5-3-8 1 2 3 3 3 3s2-1 3-3c1 3 0 6-3 8z" fill="#FF6B00" stroke="#FF4500" strokeWidth="0.5"/>
    <path d="M12 8c-1.5-1-2-2.5-1.5-4 .5 1 1.5 1.5 1.5 1.5s1-.5 1.5-1.5c.5 1.5 0 3-1.5 4z" fill="#FFD700"/>
    <ellipse cx="12" cy="21" rx="4" ry="1" fill="#4A2F17"/>
  </svg>
);

export const CampfireIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 20l4-4M20 20l-4-4M7 18l3-2M17 18l-3-2" stroke="#6B4423" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 18c-4-3-5-7-4-12 1.5 3 4 4 4 4s2.5-1 4-4c1 5 0 9-4 12z" fill="#FF6B00" stroke="#FF4500" strokeWidth="0.5"/>
    <path d="M12 15c-2-1.5-2.5-3.5-2-6 .75 1.5 2 2 2 2s1.25-.5 2-2c.5 2.5 0 4.5-2 6z" fill="#FFD700"/>
    <ellipse cx="12" cy="8" rx="2" ry="1.5" fill="#FFFF00" opacity="0.6"/>
  </svg>
);

export const BrazierIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 14h12l2 6H4l2-6z" fill="#4A4A4A" stroke="#333" strokeWidth="1"/>
    <ellipse cx="12" cy="14" rx="6" ry="2" fill="#666" stroke="#333" strokeWidth="1"/>
    <rect x="10" y="20" width="4" height="2" fill="#333"/>
    <path d="M12 14c-3-2-4-5-3-8 1 2 3 3 3 3s2-1 3-3c1 3 0 6-3 8z" fill="#FF6B00"/>
    <path d="M12 12c-1.5-1-2-2.5-1.5-4 .5 1 1.5 1.5 1.5 1.5s1-.5 1.5-1.5c.5 1.5 0 3-1.5 4z" fill="#FFD700"/>
  </svg>
);

export const LanternIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="8" y="6" width="8" height="12" rx="1" fill="#FFD700" fillOpacity="0.3" stroke="#B8860B" strokeWidth="1.5"/>
    <rect x="9" y="4" width="6" height="2" fill="#4A4A4A"/>
    <rect x="9" y="18" width="6" height="2" fill="#4A4A4A"/>
    <path d="M12 2v2" stroke="#4A4A4A" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="#FFD700"/>
    <path d="M8 8h8M8 16h8" stroke="#B8860B" strokeWidth="0.5"/>
  </svg>
);

export const CrystalGlowIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2l4 8-4 12-4-12 4-8z" fill="#66CCFF" fillOpacity="0.7" stroke="#3399CC" strokeWidth="1"/>
    <path d="M12 2l-4 8h8l-4-8z" fill="#99DDFF"/>
    <path d="M8 10l4 12 4-12" fill="#3399CC" fillOpacity="0.5"/>
    <ellipse cx="12" cy="10" rx="6" ry="2" fill="#66CCFF" fillOpacity="0.3"/>
  </svg>
);

// ============================================
// INTERACTABLES
// ============================================

export const AltarIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="14" width="16" height="6" fill="#6B7280" stroke="#4B5563" strokeWidth="1"/>
    <rect x="6" y="10" width="12" height="4" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
    <ellipse cx="12" cy="8" rx="2" ry="1" fill="#FFD700"/>
    <path d="M12 4v4M10 6h4" stroke="#FFD700" strokeWidth="1.5"/>
  </svg>
);

export const FountainIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <ellipse cx="12" cy="18" rx="8" ry="3" fill="#6B7280" stroke="#4B5563" strokeWidth="1"/>
    <ellipse cx="12" cy="16" rx="6" ry="2" fill="#3B82F6" fillOpacity="0.5"/>
    <rect x="10" y="10" width="4" height="8" fill="#9CA3AF"/>
    <path d="M12 4c0 0-2 2-2 4s2 2 2 2 2 0 2-2-2-4-2-4z" fill="#3B82F6" fillOpacity="0.7"/>
    <path d="M10 8c-1 0-2 1-2 2M14 8c1 0 2 1 2 2" stroke="#3B82F6" strokeWidth="1" fill="none"/>
  </svg>
);

export const LeverIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="8" y="18" width="8" height="4" rx="1" fill="#4A4A4A" stroke="#333" strokeWidth="1"/>
    <circle cx="12" cy="18" r="2" fill="#666" stroke="#333" strokeWidth="1"/>
    <path d="M12 18L8 8" stroke="#8B5A2B" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="8" cy="8" r="2" fill="#DC2626"/>
  </svg>
);

export const PressurePlateIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="14" width="16" height="4" rx="1" fill="#4A4A4A" stroke="#333" strokeWidth="1"/>
    <rect x="6" y="12" width="12" height="2" fill="#666"/>
    <path d="M8 16h8" stroke="#333" strokeWidth="1"/>
  </svg>
);

export const StatueIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="8" y="18" width="8" height="4" fill="#6B7280" stroke="#4B5563" strokeWidth="1"/>
    <ellipse cx="12" cy="7" rx="3" ry="3" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
    <path d="M10 10h4v8h-4z" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
    <path d="M8 12h2v4H8zM14 12h2v4h-2z" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
  </svg>
);

// ============================================
// LOOT
// ============================================

export const GoldPileIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <ellipse cx="12" cy="16" rx="8" ry="4" fill="#FFD700"/>
    <ellipse cx="10" cy="14" rx="6" ry="3" fill="#FFC107"/>
    <ellipse cx="14" cy="12" rx="5" ry="2.5" fill="#FFD700"/>
    <circle cx="8" cy="14" r="2" fill="#FFD700" stroke="#B8860B" strokeWidth="0.5"/>
    <circle cx="14" cy="12" r="2" fill="#FFC107" stroke="#B8860B" strokeWidth="0.5"/>
    <circle cx="11" cy="10" r="2" fill="#FFD700" stroke="#B8860B" strokeWidth="0.5"/>
  </svg>
);

export const GemIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L4 9l8 13 8-13-8-7z" fill="#EC4899" fillOpacity="0.8" stroke="#BE185D" strokeWidth="1"/>
    <path d="M12 2L4 9h16L12 2z" fill="#F472B6"/>
    <path d="M4 9l8 13V9H4z" fill="#DB2777" fillOpacity="0.7"/>
    <path d="M12 9l8 0-8 13V9z" fill="#EC4899"/>
  </svg>
);

export const PotionIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 8V4h6v4l3 12H6l3-12z" fill="#DC2626" fillOpacity="0.7" stroke="#991B1B" strokeWidth="1"/>
    <rect x="9" y="2" width="6" height="3" fill="#6B7280" stroke="#4B5563" strokeWidth="0.5"/>
    <ellipse cx="12" cy="14" rx="3" ry="1.5" fill="#FCA5A5" fillOpacity="0.5"/>
    <circle cx="10" cy="16" r="1" fill="#FCA5A5" fillOpacity="0.3"/>
  </svg>
);

export const ScrollIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 4c-1 0-2 1-2 2v12c0 1 1 2 2 2h12c1 0 2-1 2-2V6c0-1-1-2-2-2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1"/>
    <ellipse cx="6" cy="6" rx="2" ry="2" fill="#FDE68A" stroke="#D97706" strokeWidth="1"/>
    <ellipse cx="6" cy="18" rx="2" ry="2" fill="#FDE68A" stroke="#D97706" strokeWidth="1"/>
    <path d="M8 8h10M8 11h8M8 14h10M8 17h6" stroke="#92400E" strokeWidth="0.5"/>
  </svg>
);

export const WeaponRackIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="6" width="2" height="14" fill="#6B4423"/>
    <rect x="18" y="6" width="2" height="14" fill="#6B4423"/>
    <rect x="4" y="8" width="16" height="2" fill="#8B5A2B"/>
    <rect x="4" y="14" width="16" height="2" fill="#8B5A2B"/>
    <path d="M8 4v6M12 3v7M16 4v6" stroke="#9CA3AF" strokeWidth="2"/>
    <path d="M7 4h2M11 3h2M15 4h2" stroke="#9CA3AF" strokeWidth="2"/>
  </svg>
);

export const ArmorStandIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="11" y="10" width="2" height="10" fill="#6B4423"/>
    <rect x="8" y="20" width="8" height="2" fill="#6B4423"/>
    <ellipse cx="12" cy="6" rx="3" ry="3" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
    <path d="M6 10h12l-1 6H7l-1-6z" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
    <path d="M6 10l-2 4M18 10l2 4" stroke="#6B7280" strokeWidth="2"/>
  </svg>
);

// ============================================
// TRAPS
// ============================================

export const SpikeTrapIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="16" width="18" height="4" fill="#4A4A4A" stroke="#333" strokeWidth="1"/>
    <path d="M5 16l2-8 2 8M9 16l2-10 2 10M13 16l2-8 2 8M17 16l2-6 2 6" fill="#6B7280" stroke="#4B5563" strokeWidth="0.5"/>
  </svg>
);

export const ArrowTrapIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="8" width="4" height="8" fill="#4A4A4A" stroke="#333" strokeWidth="1"/>
    <circle cx="4" cy="12" r="1" fill="#333"/>
    <path d="M8 12h10l-3-2v4l3-2z" fill="#8B5A2B" stroke="#5C3D1E" strokeWidth="0.5"/>
    <path d="M18 12h4" stroke="#6B7280" strokeWidth="1"/>
    <path d="M20 10l2 2-2 2" stroke="#6B7280" strokeWidth="1" fill="none"/>
  </svg>
);

export const FireTrapIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="16" width="16" height="4" fill="#4A4A4A" stroke="#333" strokeWidth="1"/>
    <ellipse cx="8" cy="16" rx="1.5" ry="0.5" fill="#333"/>
    <ellipse cx="12" cy="16" rx="1.5" ry="0.5" fill="#333"/>
    <ellipse cx="16" cy="16" rx="1.5" ry="0.5" fill="#333"/>
    <path d="M8 16c-2-2-2-4-1-6 .5 1 1.5 1.5 1.5 1.5s.5-.5 1-1.5c.5 2 0 4-1.5 6z" fill="#FF6B00"/>
    <path d="M12 16c-2-2-2-4-1-6 .5 1 1.5 1.5 1.5 1.5s.5-.5 1-1.5c.5 2 0 4-1.5 6z" fill="#FF6B00"/>
    <path d="M16 16c-2-2-2-4-1-6 .5 1 1.5 1.5 1.5 1.5s.5-.5 1-1.5c.5 2 0 4-1.5 6z" fill="#FF6B00"/>
  </svg>
);

export const PitTrapIcon = ({ className, size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="4" width="16" height="16" fill="#1a1a1a"/>
    <path d="M4 4l2 2h12l2-2M4 20l2-2h12l2 2" stroke="#333" strokeWidth="1"/>
    <path d="M6 6l1 6 1-4 1 5 1-3 1 4 1-5 1 3 1-4 1 6" stroke="#4A4A4A" strokeWidth="0.5"/>
  </svg>
);

// ============================================
// ICON MAP
// ============================================

export const OBJECT_ICONS: Record<number, React.FC<IconProps>> = {
  // Containers
  200: ChestClosedIcon,
  201: ChestOpenIcon,
  202: ChestLockedIcon,
  203: BarrelIcon,
  204: CrateIcon,
  205: UrnIcon,
  206: SackIcon,
  // Furniture
  210: TableIcon,
  211: ChairIcon,
  212: BedIcon,
  213: BookshelfIcon,
  214: ThroneIcon,
  // Light sources
  220: TorchWallIcon,
  221: TorchGroundIcon,
  222: CampfireIcon,
  223: BrazierIcon,
  224: LanternIcon,
  225: CrystalGlowIcon,
  // Interactables
  230: AltarIcon,
  231: FountainIcon,
  232: LeverIcon,
  233: PressurePlateIcon,
  234: StatueIcon,
  // Loot
  240: GoldPileIcon,
  241: GemIcon,
  242: PotionIcon,
  243: ScrollIcon,
  244: WeaponRackIcon,
  245: ArmorStandIcon,
  // Traps
  250: SpikeTrapIcon,
  251: ArrowTrapIcon,
  252: FireTrapIcon,
  253: PitTrapIcon,
};

export function getObjectIcon(objectType: number): React.FC<IconProps> | null {
  return OBJECT_ICONS[objectType] || null;
}
