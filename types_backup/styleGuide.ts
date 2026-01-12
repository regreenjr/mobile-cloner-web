/**
 * Style Guide Types
 * Types for the style guide builder feature that generates production-ready
 * design systems from selected design directions.
 */

/** Represents a single color value with its name and hex code */
export interface ColorValue {
  name: string;
  value: string; // hex color code
  hsl?: {
    h: number;
    s: number;
    l: number;
  };
}

/** Color palette with semantic color groups */
export interface ColorPalette {
  primary: ColorValue[];
  secondary: ColorValue[];
  accent: ColorValue[];
  neutral: ColorValue[];
  success: ColorValue[];
  warning: ColorValue[];
  error: ColorValue[];
  background: ColorValue[];
  foreground: ColorValue[];
}

/** Dark mode color overrides */
export interface DarkModeColors {
  background: ColorValue[];
  foreground: ColorValue[];
  primary?: ColorValue[];
  secondary?: ColorValue[];
  neutral?: ColorValue[];
}

/** Complete color tokens with light and dark mode support */
export interface ColorTokens {
  light: ColorPalette;
  dark: DarkModeColors;
}

/** Typography font family configuration */
export interface FontFamily {
  name: string;
  weights: {
    light?: string;
    regular: string;
    medium?: string;
    semibold?: string;
    bold: string;
  };
}

/** Typography scale entry */
export interface TypographyScale {
  name: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: string;
  letterSpacing?: number;
}

/** Complete typography configuration */
export interface TypographyConfig {
  fontFamily: FontFamily;
  scale: {
    xs: TypographyScale;
    sm: TypographyScale;
    base: TypographyScale;
    lg: TypographyScale;
    xl: TypographyScale;
    '2xl': TypographyScale;
    '3xl': TypographyScale;
    '4xl': TypographyScale;
    '5xl': TypographyScale;
  };
}

/** Spacing scale values in pixels */
export interface SpacingScale {
  '0': number;
  '0.5': number;
  '1': number;
  '1.5': number;
  '2': number;
  '2.5': number;
  '3': number;
  '3.5': number;
  '4': number;
  '5': number;
  '6': number;
  '7': number;
  '8': number;
  '9': number;
  '10': number;
  '11': number;
  '12': number;
  '14': number;
  '16': number;
  '20': number;
  '24': number;
  '28': number;
  '32': number;
  '36': number;
  '40': number;
  '44': number;
  '48': number;
  '52': number;
  '56': number;
  '60': number;
  '64': number;
  '72': number;
  '80': number;
  '96': number;
}

/** Border radius scale */
export interface BorderRadiusScale {
  none: number;
  sm: number;
  base: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  full: number;
}

/** Shadow configuration */
export interface ShadowConfig {
  name: string;
  value: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number; // Android
  };
}

/** Component variant style */
export interface ComponentVariant {
  name: string;
  className: string;
  description: string;
}

/** Component size style */
export interface ComponentSize {
  name: string;
  className: string;
  description: string;
}

/** Component pattern definition */
export interface ComponentPattern {
  name: string;
  description: string;
  variants: ComponentVariant[];
  sizes: ComponentSize[];
  defaultVariant: string;
  defaultSize: string;
}

/** Design direction input from Phase 5 */
export interface DesignDirection {
  id: string;
  projectId: string;
  directionNumber: number;
  name: string; // e.g., "Bold & Playful", "Minimal & Clean"
  colorPalette: ColorPalette;
  typography: {
    fontFamily: string;
    headingWeight: string;
    bodyWeight: string;
  };
  componentPatterns: {
    buttonStyle: 'rounded' | 'pill' | 'square';
    cardStyle: 'elevated' | 'outlined' | 'flat';
    inputStyle: 'outlined' | 'filled' | 'underlined';
  };
  votes: number;
  isSelected: boolean;
}

/** Generated style guide package */
export interface StyleGuidePackage {
  id: string;
  designDirectionId: string;
  name: string;
  version: string;
  generatedAt: string;
  files: {
    tailwindConfig: string;
    colorTokens: string;
    typography: string;
    spacing: string;
    buttonComponent: string;
    cardComponent: string;
    inputComponent: string;
    indexExport: string;
  };
  tokens: {
    colors: ColorTokens;
    typography: TypographyConfig;
    spacing: SpacingScale;
    borderRadius: BorderRadiusScale;
    shadows: ShadowConfig[];
  };
}

/** Export format options */
export type ExportFormat = 'zip' | 'json' | 'individual';

/** Export options configuration */
export interface ExportOptions {
  format: ExportFormat;
  includeComponents: boolean;
  includeConfig: boolean;
  includeTokens: boolean;
  minify: boolean;
}

/** Style guide generation options */
export interface StyleGuideGenerationOptions {
  includeButtonComponent: boolean;
  includeCardComponent: boolean;
  includeInputComponent: boolean;
  generateDarkMode: boolean;
  useCustomSpacing: boolean;
  customSpacing?: Partial<SpacingScale>;
}
