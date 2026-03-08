// Base palettes define structural colors (background, surface, text)
export const BasePalettes = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    inputBackground: '#F1F5F9',
    success: '#10B981',
    error: '#EF4444',
  },
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    border: '#334155',
    inputBackground: '#334155',
    success: '#34D399',
    error: '#F87171',
  },
};

// Accent palettes define brand/theme colors (primary, secondary, accent)
export const AccentPalettes = {
  classic: {
    primary: '#6366F1',
    secondary: '#0891B2',
    accent: '#E11D48',
  },
  midnight: {
    primary: '#818CF8',
    secondary: '#C084FC',
    accent: '#F472B6',
  },
  sunset: {
    primary: '#F093FB',
    secondary: '#F5576C',
    accent: '#F97316',
  },
  forest: {
    primary: '#4ADE80',
    secondary: '#2DD4BF',
    accent: '#FACC15',
  },
  ruby: {
    primary: '#EF4444',
    secondary: '#F87171',
    accent: '#B91C1C',
  },
  ocean: {
    primary: '#06B6D4',
    secondary: '#22D3EE',
    accent: '#0891B2',
  },
  sunflower: {
    primary: '#EAB308',
    secondary: '#FDE047',
    accent: '#CA8A04',
  },
  emerald: {
    primary: '#10B981',
    secondary: '#34D399',
    accent: '#059669',
  },
  amethyst: {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    accent: '#7C3AED',
  },
  rose: {
    primary: '#F43F5E',
    secondary: '#FB7185',
    accent: '#E11D48',
  },
  amber: {
    primary: '#F59E0B',
    secondary: '#FBBF24',
    accent: '#D97706',
  },
  sapphire: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    accent: '#2563EB',
  },
  fuchsia: {
    primary: '#D946EF',
    secondary: '#E879F9',
    accent: '#C026D3',
  },
  slate: {
    primary: '#64748B',
    secondary: '#94A3B8',
    accent: '#475569',
  }
};

export type AppearanceMode = 'light' | 'dark';
export type AccentName = keyof typeof AccentPalettes;

// Combined Theme type
export type ThemeColors = typeof BasePalettes.light & typeof AccentPalettes.classic;

/**
 * Gets the combined color palette for a given appearance and accent theme.
 */
export const getThemeColors = (appearance: AppearanceMode, accent: AccentName): ThemeColors => {
  const base = BasePalettes[appearance] || BasePalettes.light;
  const colors = AccentPalettes[accent] || AccentPalettes.classic;

  return {
    ...base,
    ...colors,
  };
};

// For backward compatibility during migration
export type ThemeName = 'light' | 'dark' | 'midnight' | 'sunset' | 'forest' | 'ruby' | 'ocean' | 'sunflower' | 'emerald' | 'amethyst' | 'rose' | 'amber' | 'sapphire' | 'fuchsia' | 'slate';
export const Themes: Record<ThemeName, ThemeColors> = {
  light: getThemeColors('light', 'classic'),
  dark: getThemeColors('dark', 'classic'),
  midnight: getThemeColors('dark', 'midnight'),
  sunset: getThemeColors('dark', 'sunset'),
  forest: getThemeColors('dark', 'forest'),
  ruby: getThemeColors('light', 'ruby'),
  ocean: getThemeColors('light', 'ocean'),
  sunflower: getThemeColors('light', 'sunflower'),
  emerald: getThemeColors('light', 'emerald'),
  amethyst: getThemeColors('light', 'amethyst'),
  rose: getThemeColors('light', 'rose'),
  amber: getThemeColors('light', 'amber'),
  sapphire: getThemeColors('light', 'sapphire'),
  fuchsia: getThemeColors('light', 'fuchsia'),
  slate: getThemeColors('light', 'slate'),
};

export const Colors = BasePalettes.light; // Base fallback
export const GlassTheme = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: 'rgba(255, 255, 255, 0.1)',
};

/**
 * Skeuomorphic Design Tokens for depth and tactile feel.
 * Uses dual shadows (light and dark) to create a physical protrusion or recession.
 */
export const Skeuomorphic = {
  light: {
    background: '#E9EEF5',
    surface: '#E9EEF5',
    // Protrusion: Light shadow top-left, Dark shadow bottom-right
    outset: {
      light: {
        shadowColor: 'rgba(255, 255, 255, 0.9)',
        shadowOffset: { width: -6, height: -6 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 12,
      },
      dark: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 12,
      }
    },
    // Recession: Dark shadow top-left, Light shadow bottom-right (simulated inner shadow)
    inset: {
      dark: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: -3, height: -3 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
      light: {
        shadowColor: 'rgba(255, 255, 255, 0.9)',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 6,
      }
    },
    bgGradient: ['#E1E6F0', '#E9EEF5'] as const,
    surfaceGradient: ['#E9EEF5', '#E1E6F0'] as const,
    bezel: '#D1D9E6',
  },
  dark: {
    background: '#1A1D23',
    surface: '#1E232B',
    outset: {
      light: {
        shadowColor: '#2A303C',
        shadowOffset: { width: -6, height: -6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 12,
      },
      dark: {
        shadowColor: '#0A0C10',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 12,
      }
    },
    inset: {
      dark: {
        shadowColor: '#0A0C10',
        shadowOffset: { width: -2, height: -2 },
        shadowOpacity: 0.7,
        shadowRadius: 4,
      },
      light: {
        shadowColor: '#2A303C',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      }
    },
    bgGradient: ['#121419', '#1A1D23'] as const,
    surfaceGradient: ['#1E232B', '#121419'] as const,
    bezel: '#2D343F',
  }
};

