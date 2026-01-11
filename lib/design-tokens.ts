/**
 * Design Token Export Utilities
 * ==============================
 *
 * This module provides utilities for exporting design directions to various formats:
 * - Tailwind CSS configuration
 * - CSS custom properties (variables)
 * - Design Tokens Community Group (DTCG) compliant JSON
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   exportToTailwindConfig,
 *   exportToCSSVariables,
 *   exportToDesignTokensJSON,
 *   downloadDesignTokens,
 * } from '@/lib/design-tokens';
 *
 * // Export to various formats
 * const tailwindConfig = exportToTailwindConfig(designDirection);
 * const cssVariables = exportToCSSVariables(designDirection);
 * const tokensJSON = exportToDesignTokensJSON(designDirection);
 *
 * // Download as file
 * downloadDesignTokens(designDirection, 'tailwind');
 * ```
 *
 * @module lib/design-tokens
 */

import type {
  DesignDirection,
  DesignColorPalette,
  DesignDarkModeColors,
  DesignTypography,
  ComponentPatterns,
  DesignTokens,
  DesignToken,
  DesignTokenCategory,
  ComponentTokens,
} from '@/types/design';

// ============================================================================
// Type Definitions
// ============================================================================

export type ExportFormat = 'tailwind' | 'css' | 'json';

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert camelCase to kebab-case for CSS variable names
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert camelCase to snake_case for Tailwind config keys
 */
function toSnakeCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Safely escape a string for use in JavaScript/JSON output
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Format a number value with appropriate unit suffix for CSS
 */
function formatCSSValue(value: number, type: 'px' | 'rem' | 'em' | 'none' = 'px'): string {
  if (type === 'none') return String(value);
  return `${value}${type}`;
}

/**
 * Get the current ISO timestamp
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// Tailwind CSS Export
// ============================================================================

/**
 * Export a design direction to Tailwind CSS configuration format
 *
 * Generates a valid tailwind.config.js content string that can be used
 * to extend or replace Tailwind's default theme.
 *
 * @param direction - The design direction to export
 * @returns A string containing valid Tailwind CSS configuration
 *
 * @example
 * ```typescript
 * const config = exportToTailwindConfig(designDirection);
 * // Write to tailwind.config.js or use with Tailwind's preset system
 * ```
 */
export function exportToTailwindConfig(direction: DesignDirection): string {
  const { colorPalette, darkModeColors, typography, componentPatterns } = direction;

  // Build color tokens
  const colors = buildTailwindColors(colorPalette);
  const darkColors = buildTailwindDarkColors(darkModeColors);

  // Build typography tokens
  const fontFamily = buildTailwindFontFamily(typography);
  const fontSize = buildTailwindFontSize(typography);
  const fontWeight = buildTailwindFontWeight(typography);
  const lineHeight = buildTailwindLineHeight(typography);
  const letterSpacing = buildTailwindLetterSpacing(typography);

  // Build component tokens
  const borderRadius = buildTailwindBorderRadius(componentPatterns);
  const spacing = buildTailwindSpacing(componentPatterns);
  const boxShadow = buildTailwindBoxShadow(componentPatterns);

  const config = `/**
 * Tailwind CSS Configuration
 * Generated from Design Direction: ${escapeString(direction.name)}
 * Generated at: ${getCurrentTimestamp()}
 *
 * 🤖 Generated with Claude Code (https://claude.com/claude-code)
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
${colors}
      },
      fontFamily: {
${fontFamily}
      },
      fontSize: {
${fontSize}
      },
      fontWeight: {
${fontWeight}
      },
      lineHeight: {
${lineHeight}
      },
      letterSpacing: {
${letterSpacing}
      },
      borderRadius: {
${borderRadius}
      },
      spacing: {
${spacing}
      },
      boxShadow: {
${boxShadow}
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};

/**
 * Dark mode color overrides
 * Use these with Tailwind's dark: variant or CSS custom properties
 */
export const darkModeColors = {
${darkColors}
};
`;

  return config;
}

function buildTailwindColors(palette: DesignColorPalette): string {
  const colorEntries = Object.entries(palette).map(([key, value]) => {
    const kebabKey = toKebabCase(key);
    return `        '${kebabKey}': '${value}',`;
  });
  return colorEntries.join('\n');
}

function buildTailwindDarkColors(darkColors: DesignDarkModeColors): string {
  const colorEntries = Object.entries(darkColors).map(([key, value]) => {
    const kebabKey = toKebabCase(key);
    return `  '${kebabKey}': '${value}',`;
  });
  return colorEntries.join('\n');
}

function buildTailwindFontFamily(typography: DesignTypography): string {
  const { fontFamily } = typography;
  return `        'primary': ['${escapeString(fontFamily.primary)}', 'sans-serif'],
        'secondary': ['${escapeString(fontFamily.secondary)}', 'sans-serif'],
        'mono': ['${escapeString(fontFamily.mono)}', 'monospace'],`;
}

function buildTailwindFontSize(typography: DesignTypography): string {
  const { fontSize } = typography;
  const entries = Object.entries(fontSize).map(([key, value]) => {
    return `        '${key}': '${value}px',`;
  });
  return entries.join('\n');
}

function buildTailwindFontWeight(typography: DesignTypography): string {
  const { fontWeight } = typography;
  const entries = Object.entries(fontWeight).map(([key, value]) => {
    return `        '${key}': '${value}',`;
  });
  return entries.join('\n');
}

function buildTailwindLineHeight(typography: DesignTypography): string {
  const { lineHeight } = typography;
  const entries = Object.entries(lineHeight).map(([key, value]) => {
    return `        '${key}': '${value}',`;
  });
  return entries.join('\n');
}

function buildTailwindLetterSpacing(typography: DesignTypography): string {
  const { letterSpacing } = typography;
  const entries = Object.entries(letterSpacing).map(([key, value]) => {
    return `        '${key}': '${value}em',`;
  });
  return entries.join('\n');
}

function buildTailwindBorderRadius(patterns: ComponentPatterns): string {
  const { buttons, cards, inputs, modals } = patterns;
  return `        'button': '${buttons.borderRadius}px',
        'card': '${cards.borderRadius}px',
        'input': '${inputs.borderRadius}px',
        'modal': '${modals.borderRadius}px',`;
}

function buildTailwindSpacing(patterns: ComponentPatterns): string {
  const { buttons, cards, inputs, lists } = patterns;
  return `        'button-x': '${buttons.paddingHorizontal}px',
        'button-y': '${buttons.paddingVertical}px',
        'card': '${cards.padding}px',
        'input': '${inputs.padding}px',
        'list-item': '${lists.itemSpacing}px',`;
}

function buildTailwindBoxShadow(patterns: ComponentPatterns): string {
  const { cards } = patterns;
  const shadowMap: Record<string, string> = {
    subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    strong: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  };

  const shadow = cards.hasShadow ? shadowMap[cards.shadowIntensity] : 'none';
  return `        'card': '${shadow}',`;
}

// ============================================================================
// CSS Variables Export
// ============================================================================

/**
 * Export a design direction to CSS custom properties (variables)
 *
 * Generates CSS that can be included in a stylesheet to define
 * design tokens as CSS custom properties on :root.
 *
 * @param direction - The design direction to export
 * @returns A string containing valid CSS with custom properties
 *
 * @example
 * ```typescript
 * const css = exportToCSSVariables(designDirection);
 * // Include in your global styles or inject via <style> tag
 * ```
 */
export function exportToCSSVariables(direction: DesignDirection): string {
  const { colorPalette, darkModeColors, typography, componentPatterns } = direction;

  const lightColors = buildCSSColorVariables(colorPalette, '');
  const darkColors = buildCSSDarkModeVariables(darkModeColors);
  const typographyVars = buildCSSTypographyVariables(typography);
  const componentVars = buildCSSComponentVariables(componentPatterns);

  return `/**
 * CSS Custom Properties (Design Tokens)
 * Generated from Design Direction: ${escapeString(direction.name)}
 * Generated at: ${getCurrentTimestamp()}
 *
 * 🤖 Generated with Claude Code (https://claude.com/claude-code)
 */

:root {
  /* ===========================
   * Color Tokens
   * =========================== */
${lightColors}

  /* ===========================
   * Typography Tokens
   * =========================== */
${typographyVars}

  /* ===========================
   * Component Tokens
   * =========================== */
${componentVars}
}

/* Dark Mode Overrides */
@media (prefers-color-scheme: dark) {
  :root {
${darkColors}
  }
}

/* Dark mode class-based override (for manual toggle) */
.dark {
${darkColors}
}
`;
}

function buildCSSColorVariables(palette: DesignColorPalette, prefix: string): string {
  const entries = Object.entries(palette).map(([key, value]) => {
    const varName = `--color-${toKebabCase(key)}`;
    return `  ${varName}: ${value};`;
  });
  return entries.join('\n');
}

function buildCSSDarkModeVariables(darkColors: DesignDarkModeColors): string {
  const entries = Object.entries(darkColors).map(([key, value]) => {
    const varName = `--color-${toKebabCase(key)}`;
    return `    ${varName}: ${value};`;
  });
  return entries.join('\n');
}

function buildCSSTypographyVariables(typography: DesignTypography): string {
  const lines: string[] = [];

  // Font families
  lines.push(`  --font-family-primary: '${escapeString(typography.fontFamily.primary)}', sans-serif;`);
  lines.push(`  --font-family-secondary: '${escapeString(typography.fontFamily.secondary)}', sans-serif;`);
  lines.push(`  --font-family-mono: '${escapeString(typography.fontFamily.mono)}', monospace;`);
  lines.push('');

  // Font sizes
  Object.entries(typography.fontSize).forEach(([key, value]) => {
    lines.push(`  --font-size-${key}: ${value}px;`);
  });
  lines.push('');

  // Font weights
  Object.entries(typography.fontWeight).forEach(([key, value]) => {
    lines.push(`  --font-weight-${key}: ${value};`);
  });
  lines.push('');

  // Line heights
  Object.entries(typography.lineHeight).forEach(([key, value]) => {
    lines.push(`  --line-height-${key}: ${value};`);
  });
  lines.push('');

  // Letter spacing
  Object.entries(typography.letterSpacing).forEach(([key, value]) => {
    lines.push(`  --letter-spacing-${key}: ${value}em;`);
  });

  return lines.join('\n');
}

function buildCSSComponentVariables(patterns: ComponentPatterns): string {
  const { buttons, cards, inputs, modals, lists, navigation } = patterns;
  const lines: string[] = [];

  // Button tokens
  lines.push(`  --button-border-radius: ${buttons.borderRadius}px;`);
  lines.push(`  --button-padding-x: ${buttons.paddingHorizontal}px;`);
  lines.push(`  --button-padding-y: ${buttons.paddingVertical}px;`);
  lines.push('');

  // Card tokens
  lines.push(`  --card-border-radius: ${cards.borderRadius}px;`);
  lines.push(`  --card-padding: ${cards.padding}px;`);
  lines.push(`  --card-shadow: ${getCardShadowValue(cards)};`);
  lines.push('');

  // Input tokens
  lines.push(`  --input-border-radius: ${inputs.borderRadius}px;`);
  lines.push(`  --input-padding: ${inputs.padding}px;`);
  lines.push(`  --input-border-style: ${inputs.borderStyle};`);
  lines.push('');

  // Modal tokens
  lines.push(`  --modal-border-radius: ${modals.borderRadius}px;`);
  lines.push(`  --modal-overlay-opacity: ${modals.overlayOpacity};`);
  lines.push('');

  // List tokens
  lines.push(`  --list-item-spacing: ${lists.itemSpacing}px;`);
  lines.push(`  --list-divider-style: ${lists.dividerStyle};`);

  return lines.join('\n');
}

function getCardShadowValue(card: ComponentPatterns['cards']): string {
  if (!card.hasShadow) return 'none';

  const shadowMap = {
    subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    strong: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  } as const;

  return shadowMap[card.shadowIntensity];
}

// ============================================================================
// Design Tokens JSON Export (DTCG Compliant)
// ============================================================================

/**
 * Export a design direction to Design Tokens Community Group (DTCG) compliant JSON
 *
 * Generates a JSON structure following the DTCG specification:
 * - Each token has $value, $type, and optional $description
 * - Tokens are organized hierarchically by category
 * - Includes metadata for generation info
 *
 * @param direction - The design direction to export
 * @returns A DesignTokens object that can be serialized to JSON
 *
 * @see https://design-tokens.github.io/community-group/format/
 *
 * @example
 * ```typescript
 * const tokens = exportToDesignTokensJSON(designDirection);
 * const jsonString = JSON.stringify(tokens, null, 2);
 * ```
 */
export function exportToDesignTokensJSON(direction: DesignDirection): DesignTokens {
  const { colorPalette, darkModeColors, typography, componentPatterns } = direction;

  const tokens: DesignTokens = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    version: '1.0.0',
    generatedAt: getCurrentTimestamp(),
    directionName: direction.name,
    colors: buildColorTokens(colorPalette, darkModeColors),
    typography: buildTypographyTokens(typography),
    spacing: buildSpacingTokens(componentPatterns),
    borderRadius: buildBorderRadiusTokens(componentPatterns),
    shadows: buildShadowTokens(componentPatterns),
    components: buildComponentTokens(componentPatterns),
  };

  return tokens;
}

function buildColorTokens(palette: DesignColorPalette, darkColors: DesignDarkModeColors): DesignTokenCategory {
  const tokens: DesignTokenCategory = {};

  // Light mode colors
  Object.entries(palette).forEach(([key, value]) => {
    tokens[key] = {
      $value: value,
      $type: 'color',
      $description: `${toKebabCase(key).replace(/-/g, ' ')} color`,
    };
  });

  // Dark mode colors (nested under 'dark' prefix)
  Object.entries(darkColors).forEach(([key, value]) => {
    tokens[`dark-${key}`] = {
      $value: value,
      $type: 'color',
      $description: `Dark mode ${toKebabCase(key).replace(/-/g, ' ')} color`,
    };
  });

  return tokens;
}

function buildTypographyTokens(typography: DesignTypography): DesignTokenCategory {
  const tokens: DesignTokenCategory = {};

  // Font families
  tokens['font-family-primary'] = {
    $value: typography.fontFamily.primary,
    $type: 'fontFamily',
    $description: 'Primary font family for headings and emphasis',
  };
  tokens['font-family-secondary'] = {
    $value: typography.fontFamily.secondary,
    $type: 'fontFamily',
    $description: 'Secondary font family for body text',
  };
  tokens['font-family-mono'] = {
    $value: typography.fontFamily.mono,
    $type: 'fontFamily',
    $description: 'Monospace font family for code',
  };

  // Font sizes
  Object.entries(typography.fontSize).forEach(([key, value]) => {
    tokens[`font-size-${key}`] = {
      $value: `${value}px`,
      $type: 'dimension',
      $description: `Font size ${key}`,
    };
  });

  // Font weights
  Object.entries(typography.fontWeight).forEach(([key, value]) => {
    tokens[`font-weight-${key}`] = {
      $value: value,
      $type: 'fontWeight',
      $description: `Font weight ${key}`,
    };
  });

  // Line heights
  Object.entries(typography.lineHeight).forEach(([key, value]) => {
    tokens[`line-height-${key}`] = {
      $value: value,
      $type: 'number',
      $description: `Line height ${key}`,
    };
  });

  // Letter spacing
  Object.entries(typography.letterSpacing).forEach(([key, value]) => {
    tokens[`letter-spacing-${key}`] = {
      $value: `${value}em`,
      $type: 'dimension',
      $description: `Letter spacing ${key}`,
    };
  });

  return tokens;
}

function buildSpacingTokens(patterns: ComponentPatterns): DesignTokenCategory {
  const { buttons, cards, inputs, lists } = patterns;

  return {
    'button-padding-x': {
      $value: `${buttons.paddingHorizontal}px`,
      $type: 'dimension',
      $description: 'Horizontal padding for buttons',
    },
    'button-padding-y': {
      $value: `${buttons.paddingVertical}px`,
      $type: 'dimension',
      $description: 'Vertical padding for buttons',
    },
    'card-padding': {
      $value: `${cards.padding}px`,
      $type: 'dimension',
      $description: 'Padding for card components',
    },
    'input-padding': {
      $value: `${inputs.padding}px`,
      $type: 'dimension',
      $description: 'Padding for input fields',
    },
    'list-item-spacing': {
      $value: `${lists.itemSpacing}px`,
      $type: 'dimension',
      $description: 'Spacing between list items',
    },
  };
}

function buildBorderRadiusTokens(patterns: ComponentPatterns): DesignTokenCategory {
  const { buttons, cards, inputs, modals } = patterns;

  return {
    'button': {
      $value: `${buttons.borderRadius}px`,
      $type: 'dimension',
      $description: 'Border radius for buttons',
    },
    'card': {
      $value: `${cards.borderRadius}px`,
      $type: 'dimension',
      $description: 'Border radius for cards',
    },
    'input': {
      $value: `${inputs.borderRadius}px`,
      $type: 'dimension',
      $description: 'Border radius for inputs',
    },
    'modal': {
      $value: `${modals.borderRadius}px`,
      $type: 'dimension',
      $description: 'Border radius for modals',
    },
  };
}

function buildShadowTokens(patterns: ComponentPatterns): DesignTokenCategory {
  const { cards, buttons } = patterns;

  const SHADOW_SUBTLE = '0 1px 2px 0 rgb(0 0 0 / 0.05)';
  const SHADOW_MEDIUM = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
  const SHADOW_STRONG = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';

  const shadowMap = {
    subtle: SHADOW_SUBTLE,
    medium: SHADOW_MEDIUM,
    strong: SHADOW_STRONG,
  } as const;

  const cardShadow = cards.hasShadow
    ? shadowMap[cards.shadowIntensity]
    : 'none';

  return {
    'card': {
      $value: cardShadow,
      $type: 'shadow',
      $description: 'Shadow for card components',
    },
    'button': {
      $value: buttons.hasShadow ? SHADOW_SUBTLE : 'none',
      $type: 'shadow',
      $description: 'Shadow for button components',
    },
    'subtle': {
      $value: SHADOW_SUBTLE,
      $type: 'shadow',
      $description: 'Subtle shadow for minor elevation',
    },
    'medium': {
      $value: SHADOW_MEDIUM,
      $type: 'shadow',
      $description: 'Medium shadow for standard elevation',
    },
    'strong': {
      $value: SHADOW_STRONG,
      $type: 'shadow',
      $description: 'Strong shadow for high elevation',
    },
  };
}

function buildComponentTokens(patterns: ComponentPatterns): ComponentTokens {
  const { buttons, cards, inputs, navigation, lists, modals } = patterns;

  return {
    button: {
      'border-radius': {
        $value: `${buttons.borderRadius}px`,
        $type: 'dimension',
      },
      'padding-horizontal': {
        $value: `${buttons.paddingHorizontal}px`,
        $type: 'dimension',
      },
      'padding-vertical': {
        $value: `${buttons.paddingVertical}px`,
        $type: 'dimension',
      },
      'has-shadow': {
        $value: buttons.hasShadow ? 'true' : 'false',
        $type: 'number',
        $description: 'Whether buttons have shadow',
      },
      'has-icon': {
        $value: buttons.hasIcon ? 'true' : 'false',
        $type: 'number',
        $description: 'Whether buttons support icons',
      },
    },
    card: {
      'border-radius': {
        $value: `${cards.borderRadius}px`,
        $type: 'dimension',
      },
      'padding': {
        $value: `${cards.padding}px`,
        $type: 'dimension',
      },
      'shadow-intensity': {
        $value: cards.shadowIntensity,
        $type: 'number',
        $description: 'Shadow intensity level: subtle, medium, or strong',
      },
      'has-border': {
        $value: cards.hasBorder ? 'true' : 'false',
        $type: 'number',
        $description: 'Whether cards have a border',
      },
      'has-hover-effect': {
        $value: cards.hasHoverEffect ? 'true' : 'false',
        $type: 'number',
        $description: 'Whether cards have hover effects',
      },
    },
    input: {
      'border-radius': {
        $value: `${inputs.borderRadius}px`,
        $type: 'dimension',
      },
      'padding': {
        $value: `${inputs.padding}px`,
        $type: 'dimension',
      },
      'border-style': {
        $value: inputs.borderStyle,
        $type: 'number',
        $description: 'Border style: solid, none, or underline',
      },
      'label-position': {
        $value: inputs.labelPosition,
        $type: 'number',
        $description: 'Label position: above, floating, or inline',
      },
      'has-icon': {
        $value: inputs.hasIcon ? 'true' : 'false',
        $type: 'number',
        $description: 'Whether inputs support icons',
      },
      'icon-position': {
        $value: inputs.iconPosition,
        $type: 'number',
        $description: 'Icon position: left or right',
      },
    },
  };
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Get the file extension for an export format
 */
function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'tailwind':
      return 'js';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    default:
      return 'txt';
  }
}

/**
 * Get the MIME type for an export format
 */
function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'tailwind':
      return 'application/javascript';
    case 'css':
      return 'text/css';
    case 'json':
      return 'application/json';
    default:
      return 'text/plain';
  }
}

/**
 * Generate a filename for the exported design tokens
 */
function generateFilename(directionName: string, format: ExportFormat): string {
  const sanitizedName = directionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const extension = getFileExtension(format);

  switch (format) {
    case 'tailwind':
      return `tailwind.config.${sanitizedName}.${extension}`;
    case 'css':
      return `design-tokens.${sanitizedName}.${extension}`;
    case 'json':
      return `design-tokens.${sanitizedName}.${extension}`;
    default:
      return `design-tokens.${sanitizedName}.${extension}`;
  }
}

/**
 * Export a design direction to the specified format
 *
 * @param direction - The design direction to export
 * @param format - The export format ('tailwind', 'css', or 'json')
 * @returns An ExportResult containing the content, filename, and MIME type
 *
 * @example
 * ```typescript
 * const result = exportDesignTokens(designDirection, 'css');
 * console.log(result.content); // CSS string
 * console.log(result.filename); // 'design-tokens.my-direction.css'
 * ```
 */
export function exportDesignTokens(
  direction: DesignDirection,
  format: ExportFormat
): ExportResult {
  let content: string;

  switch (format) {
    case 'tailwind':
      content = exportToTailwindConfig(direction);
      break;
    case 'css':
      content = exportToCSSVariables(direction);
      break;
    case 'json':
      content = JSON.stringify(exportToDesignTokensJSON(direction), null, 2);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  return {
    content,
    filename: generateFilename(direction.name, format),
    mimeType: getMimeType(format),
  };
}

/**
 * Download design tokens as a file
 *
 * Creates a Blob from the exported content and triggers a browser download.
 * This function only works in browser environments.
 *
 * @param direction - The design direction to export
 * @param format - The export format ('tailwind', 'css', or 'json')
 *
 * @example
 * ```typescript
 * // In a React component
 * const handleDownload = () => {
 *   downloadDesignTokens(selectedDirection, 'tailwind');
 * };
 * ```
 */
export function downloadDesignTokens(
  direction: DesignDirection,
  format: ExportFormat
): void {
  const result = exportDesignTokens(direction, format);

  // Create a Blob from the content
  const blob = new Blob([result.content], { type: result.mimeType });

  // Create a download link and trigger it
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy design tokens to clipboard
 *
 * Copies the exported content to the user's clipboard.
 * This function only works in browser environments with clipboard API support.
 *
 * @param direction - The design direction to export
 * @param format - The export format ('tailwind', 'css', or 'json')
 * @returns A promise that resolves when the content is copied
 *
 * @example
 * ```typescript
 * try {
 *   await copyDesignTokensToClipboard(selectedDirection, 'css');
 *   showToast('Copied to clipboard!');
 * } catch (error) {
 *   showToast('Failed to copy');
 * }
 * ```
 */
export async function copyDesignTokensToClipboard(
  direction: DesignDirection,
  format: ExportFormat
): Promise<void> {
  const result = exportDesignTokens(direction, format);
  await navigator.clipboard.writeText(result.content);
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate that a design direction has all required properties for export
 *
 * @param direction - The design direction to validate
 * @returns An object with isValid boolean and any error messages
 */
export function validateDesignDirection(direction: DesignDirection): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!direction.name || direction.name.trim() === '') {
    errors.push('Design direction name is required');
  }

  if (!direction.colorPalette) {
    errors.push('Color palette is required');
  } else {
    const requiredColors = ['primary', 'secondary', 'background', 'text'];
    requiredColors.forEach(color => {
      if (!direction.colorPalette[color as keyof DesignColorPalette]) {
        errors.push(`Color palette is missing required color: ${color}`);
      }
    });
  }

  if (!direction.typography) {
    errors.push('Typography settings are required');
  } else {
    if (!direction.typography.fontFamily?.primary) {
      errors.push('Primary font family is required');
    }
    if (!direction.typography.fontSize) {
      errors.push('Font sizes are required');
    }
  }

  if (!direction.componentPatterns) {
    errors.push('Component patterns are required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Module Exports Summary
// ============================================================================
//
// Primary export functions:
// - exportToTailwindConfig: Generate Tailwind CSS configuration
// - exportToCSSVariables: Generate CSS custom properties
// - exportToDesignTokensJSON: Generate DTCG-compliant JSON
// - exportDesignTokens: Unified export function for all formats
// - downloadDesignTokens: Trigger browser download
// - copyDesignTokensToClipboard: Copy to clipboard
// - validateDesignDirection: Validate direction before export
//
// Types:
// - ExportFormat: 'tailwind' | 'css' | 'json'
// - ExportResult: { content, filename, mimeType }
