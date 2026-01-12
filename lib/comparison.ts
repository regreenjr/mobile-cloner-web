/**
 * Comparison Utility Functions
 * ============================
 *
 * This module provides utility functions for comparing analyzed reference apps
 * and exporting comparison results as markdown.
 *
 * ## Features
 *
 * - Build feature matrices from multiple apps
 * - Compare design patterns across apps
 * - Compare user flows across apps
 * - Compare color palettes and typography
 * - Export comparison results as markdown
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   buildComparisonData,
 *   generateComparisonMarkdown,
 *   downloadComparisonAsMarkdown,
 * } from '@/lib/comparison';
 *
 * // Build comparison data
 * const comparisonData = buildComparisonData(selectedApps);
 *
 * // Generate markdown
 * const markdown = generateComparisonMarkdown(comparisonData, insights);
 *
 * // Download as file
 * downloadComparisonAsMarkdown(comparisonData, insights);
 * ```
 *
 * @module lib/comparison
 */

import { generateUUID } from '@/lib/utils';
import type { ReferenceAppRow } from '@/types/database';
import type {
  AppComparison,
  AppComparisonItem,
  ComparisonCategory,
  ColorPalette,
  UIPattern,
  UserFlow,
  FeatureSet,
  AnalysisTypography,
} from '@/types/analyze';
import type { ComparisonInsights } from '@/components/ComparisonTable';

// ============================================================================
// Types
// ============================================================================

/**
 * Feature comparison item with presence tracking
 */
export interface FeatureComparisonItem {
  /** Feature name */
  feature: string;
  /** Feature category */
  category: 'core' | 'niceToHave' | 'differentiator';
  /** Which app IDs have this feature */
  presentIn: string[];
  /** Whether this feature is shared across all apps */
  isShared: boolean;
  /** Whether this feature is unique to one app */
  isUnique: boolean;
}

/**
 * Pattern comparison item with frequency details
 */
export interface PatternComparisonItem {
  /** Pattern name */
  patternName: string;
  /** Apps that use this pattern */
  apps: {
    appId: string;
    appName: string;
    frequency: 'single_screen' | 'multiple_screens' | 'all_screens';
    components: string[];
  }[];
  /** Whether all apps use this pattern */
  isShared: boolean;
}

/**
 * Flow comparison item with complexity details
 */
export interface FlowComparisonItem {
  /** Flow name */
  flowName: string;
  /** Apps that have this flow */
  apps: {
    appId: string;
    appName: string;
    complexity: 'simple' | 'moderate' | 'complex';
    stepCount: number;
  }[];
  /** Whether all apps have this flow */
  isShared: boolean;
}

/**
 * Color comparison data for a single color role
 */
export interface ColorComparisonData {
  /** Color role name */
  role: keyof ColorPalette;
  /** Label for display */
  label: string;
  /** Colors per app */
  colors: Record<string, string>;
}

/**
 * Full comparison data structure
 */
export interface ComparisonData {
  /** Comparison ID */
  id: string;
  /** Apps being compared */
  apps: AppComparisonItem[];
  /** Full app data */
  fullApps: ReferenceAppRow[];
  /** Feature comparison matrix */
  features: FeatureComparisonItem[];
  /** Pattern comparison data */
  patterns: PatternComparisonItem[];
  /** Flow comparison data */
  flows: FlowComparisonItem[];
  /** Color comparison data */
  colors: ColorComparisonData[];
  /** Typography comparison */
  typography: {
    appId: string;
    appName: string;
    typography: AnalysisTypography | null;
  }[];
  /** Summary statistics */
  summary: {
    totalFeatures: number;
    sharedFeatures: number;
    uniqueFeatures: number;
    totalPatterns: number;
    sharedPatterns: number;
    totalFlows: number;
    sharedFlows: number;
  };
  /** Comparison timestamp */
  comparedAt: string;
}

// ============================================================================
// Color Labels
// ============================================================================

/**
 * Human-readable labels for color palette roles
 * Using Partial since many ColorPalette fields are optional
 */
export const COLOR_LABELS: Partial<Record<keyof ColorPalette, string>> = {
  primary: 'Primary',
  primaryLight: 'Primary Light',
  primaryDark: 'Primary Dark',
  secondary: 'Secondary',
  secondaryLight: 'Secondary Light',
  secondaryDark: 'Secondary Dark',
  accent: 'Accent',
  background: 'Background',
  backgroundSecondary: 'Background Alt',
  surface: 'Surface',
  surfaceSecondary: 'Surface Alt',
  text: 'Text',
  textSecondary: 'Text Secondary',
  textMuted: 'Text Muted',
  border: 'Border',
  borderLight: 'Border Light',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
};

// ============================================================================
// Comparison Building Functions
// ============================================================================

/**
 * Builds feature comparison data from multiple apps
 *
 * @param apps - Array of reference apps to compare
 * @returns Array of feature comparison items
 */
export function buildFeatureComparison(apps: ReferenceAppRow[]): FeatureComparisonItem[] {
  const featureMap = new Map<string, FeatureComparisonItem>();

  apps.forEach((app) => {
    if (!app.analysis?.featureSet) return;

    const { core, niceToHave, differentiators } = app.analysis.featureSet;

    // Process core features
    core?.forEach((feature) => {
      const existing = featureMap.get(feature);
      if (existing) {
        existing.presentIn.push(app.id);
      } else {
        featureMap.set(feature, {
          feature,
          category: 'core',
          presentIn: [app.id],
          isShared: false,
          isUnique: false,
        });
      }
    });

    // Process nice-to-have features
    niceToHave?.forEach((feature) => {
      const existing = featureMap.get(feature);
      if (existing) {
        existing.presentIn.push(app.id);
      } else {
        featureMap.set(feature, {
          feature,
          category: 'niceToHave',
          presentIn: [app.id],
          isShared: false,
          isUnique: false,
        });
      }
    });

    // Process differentiator features
    differentiators?.forEach((feature) => {
      const existing = featureMap.get(feature);
      if (existing) {
        existing.presentIn.push(app.id);
      } else {
        featureMap.set(feature, {
          feature,
          category: 'differentiator',
          presentIn: [app.id],
          isShared: false,
          isUnique: false,
        });
      }
    });
  });

  // Calculate shared/unique status
  const totalApps = apps.length;
  featureMap.forEach((item) => {
    item.isShared = item.presentIn.length === totalApps;
    item.isUnique = item.presentIn.length === 1;
  });

  // Sort: shared first, then by category, then by feature count
  return Array.from(featureMap.values()).sort((a, b) => {
    if (a.isShared !== b.isShared) return a.isShared ? -1 : 1;
    const categoryOrder = { core: 0, niceToHave: 1, differentiator: 2 };
    if (a.category !== b.category) return categoryOrder[a.category] - categoryOrder[b.category];
    if (a.presentIn.length !== b.presentIn.length) return b.presentIn.length - a.presentIn.length;
    return a.feature.localeCompare(b.feature);
  });
}

/**
 * Builds pattern comparison data from multiple apps
 *
 * @param apps - Array of reference apps to compare
 * @returns Array of pattern comparison items
 */
export function buildPatternComparison(apps: ReferenceAppRow[]): PatternComparisonItem[] {
  const patternMap = new Map<string, PatternComparisonItem>();

  apps.forEach((app) => {
    app.analysis?.designPatterns?.forEach((pattern) => {
      const existing = patternMap.get(pattern.name);
      if (existing) {
        existing.apps.push({
          appId: app.id,
          appName: app.name,
          frequency: pattern.frequency,
          components: pattern.components,
        });
      } else {
        patternMap.set(pattern.name, {
          patternName: pattern.name,
          apps: [
            {
              appId: app.id,
              appName: app.name,
              frequency: pattern.frequency,
              components: pattern.components,
            },
          ],
          isShared: false,
        });
      }
    });
  });

  // Calculate shared status
  const totalApps = apps.length;
  patternMap.forEach((item) => {
    item.isShared = item.apps.length === totalApps;
  });

  // Sort: shared first, then by number of apps
  return Array.from(patternMap.values()).sort((a, b) => {
    if (a.isShared !== b.isShared) return a.isShared ? -1 : 1;
    return b.apps.length - a.apps.length;
  });
}

/**
 * Builds flow comparison data from multiple apps
 *
 * @param apps - Array of reference apps to compare
 * @returns Array of flow comparison items
 */
export function buildFlowComparison(apps: ReferenceAppRow[]): FlowComparisonItem[] {
  const flowMap = new Map<string, FlowComparisonItem>();

  apps.forEach((app) => {
    app.analysis?.userFlows?.forEach((flow) => {
      const existing = flowMap.get(flow.name);
      if (existing) {
        existing.apps.push({
          appId: app.id,
          appName: app.name,
          complexity: flow.complexity,
          stepCount: flow.stepCount,
        });
      } else {
        flowMap.set(flow.name, {
          flowName: flow.name,
          apps: [
            {
              appId: app.id,
              appName: app.name,
              complexity: flow.complexity,
              stepCount: flow.stepCount,
            },
          ],
          isShared: false,
        });
      }
    });
  });

  // Calculate shared status
  const totalApps = apps.length;
  flowMap.forEach((item) => {
    item.isShared = item.apps.length === totalApps;
  });

  // Sort: shared first, then by number of apps
  return Array.from(flowMap.values()).sort((a, b) => {
    if (a.isShared !== b.isShared) return a.isShared ? -1 : 1;
    return b.apps.length - a.apps.length;
  });
}

/**
 * Builds color comparison data from multiple apps
 *
 * @param apps - Array of reference apps to compare
 * @returns Array of color comparison data
 */
export function buildColorComparison(apps: ReferenceAppRow[]): ColorComparisonData[] {
  const colorRoles: (keyof ColorPalette)[] = [
    'primary',
    'secondary',
    'accent',
    'background',
    'surface',
    'text',
    'textSecondary',
    'success',
    'warning',
    'error',
  ];

  return colorRoles.map((role) => ({
    role,
    label: COLOR_LABELS[role],
    colors: apps.reduce((acc, app) => {
      const color = app.analysis?.colorPalette?.[role];
      if (color && color !== 'unknown' && color !== '') {
        acc[app.id] = color;
      }
      return acc;
    }, {} as Record<string, string>),
  }));
}

/**
 * Builds typography comparison data from multiple apps
 *
 * @param apps - Array of reference apps to compare
 * @returns Array of typography data per app
 */
export function buildTypographyComparison(
  apps: ReferenceAppRow[]
): { appId: string; appName: string; typography: AnalysisTypography | null }[] {
  return apps.map((app) => ({
    appId: app.id,
    appName: app.name,
    typography: app.analysis?.typography ?? null,
  }));
}

/**
 * Builds complete comparison data structure from multiple apps
 *
 * @param apps - Array of reference apps to compare (2-4 apps)
 * @returns Complete comparison data structure
 *
 * @example
 * ```typescript
 * const comparisonData = buildComparisonData(selectedApps);
 * console.log(`Comparing ${comparisonData.apps.length} apps`);
 * console.log(`Found ${comparisonData.summary.sharedFeatures} shared features`);
 * ```
 */
export function buildComparisonData(apps: ReferenceAppRow[]): ComparisonData {
  const features = buildFeatureComparison(apps);
  const patterns = buildPatternComparison(apps);
  const flows = buildFlowComparison(apps);
  const colors = buildColorComparison(apps);
  const typography = buildTypographyComparison(apps);

  // Build summary statistics
  const summary = {
    totalFeatures: features.length,
    sharedFeatures: features.filter((f) => f.isShared).length,
    uniqueFeatures: features.filter((f) => f.isUnique).length,
    totalPatterns: patterns.length,
    sharedPatterns: patterns.filter((p) => p.isShared).length,
    totalFlows: flows.length,
    sharedFlows: flows.filter((f) => f.isShared).length,
  };

  // Build app comparison items
  const appItems: AppComparisonItem[] = apps.map((app) => ({
    appId: app.id,
    appName: app.name,
    category: app.category,
    screenshotCount: app.screenshots?.length ?? 0,
  }));

  return {
    id: generateUUID(),
    apps: appItems,
    fullApps: apps,
    features,
    patterns,
    flows,
    colors,
    typography,
    summary,
    comparedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Converts ComparisonData to AppComparison format for database storage
 *
 * @param data - ComparisonData to convert
 * @param insights - Optional AI-generated insights
 * @returns AppComparison object ready for database storage
 */
export function toAppComparison(
  data: ComparisonData,
  insights?: ComparisonInsights | null
): AppComparison {
  // Build design pattern comparison
  const designPatternComparison: ComparisonCategory[] = [];
  const patternCategories = new Map<string, ComparisonCategory>();

  data.patterns.forEach((pattern) => {
    const category = pattern.isShared ? 'Shared Patterns' : 'Unique Patterns';
    let categoryData = patternCategories.get(category);
    if (!categoryData) {
      categoryData = { category, apps: [] };
      patternCategories.set(category, categoryData);
    }

    pattern.apps.forEach((appPattern) => {
      let appData = categoryData!.apps.find((a) => a.appId === appPattern.appId);
      if (!appData) {
        appData = { appId: appPattern.appId, appName: appPattern.appName, items: [] };
        categoryData!.apps.push(appData);
      }
      appData.items.push(pattern.patternName);
    });
  });
  designPatternComparison.push(...patternCategories.values());

  // Build user flow comparison
  const userFlowComparison: ComparisonCategory[] = [];
  const flowCategories = new Map<string, ComparisonCategory>();

  data.flows.forEach((flow) => {
    const category = flow.isShared ? 'Shared Flows' : 'Unique Flows';
    let categoryData = flowCategories.get(category);
    if (!categoryData) {
      categoryData = { category, apps: [] };
      flowCategories.set(category, categoryData);
    }

    flow.apps.forEach((appFlow) => {
      let appData = categoryData!.apps.find((a) => a.appId === appFlow.appId);
      if (!appData) {
        appData = { appId: appFlow.appId, appName: appFlow.appName, items: [] };
        categoryData!.apps.push(appData);
      }
      appData.items.push(`${flow.flowName} (${appFlow.stepCount} steps, ${appFlow.complexity})`);
    });
  });
  userFlowComparison.push(...flowCategories.values());

  // Build feature comparison by category
  const featureComparison: AppComparison['featureComparison'] = [];
  const featureCategories: ('core' | 'niceToHave' | 'differentiators')[] = [
    'core',
    'niceToHave',
    'differentiators',
  ];

  featureCategories.forEach((category) => {
    const categoryKey = category === 'differentiators' ? 'differentiator' : category;
    const categoryFeatures = data.features.filter((f) => f.category === categoryKey);

    const appsData = data.apps.map((app) => ({
      appId: app.appId,
      appName: app.appName,
      features: categoryFeatures
        .filter((f) => f.presentIn.includes(app.appId))
        .map((f) => f.feature),
    }));

    featureComparison.push({ category, apps: appsData });
  });

  // Build color palette comparison
  const colorPaletteComparison = data.fullApps.map((app) => ({
    appId: app.id,
    appName: app.name,
    palette: app.analysis?.colorPalette ?? {
      primary: '',
      secondary: '',
      accent: '',
      background: '',
      surface: '',
      text: '',
      textSecondary: '',
    },
  }));

  // Build strengths from insights or analysis
  const strengths = data.fullApps.map((app) => ({
    appId: app.id,
    appName: app.name,
    strengths: app.analysis?.uniqueSellingPoints ?? [],
  }));

  // Build recommendations
  const recommendations = insights?.recommendations ?? [];

  return {
    id: data.id,
    apps: data.apps,
    comparedAt: data.comparedAt,
    designPatternComparison,
    userFlowComparison,
    featureComparison,
    colorPaletteComparison,
    strengths,
    recommendations,
  };
}

// ============================================================================
// Markdown Export Functions
// ============================================================================

/**
 * Formats a date string for display
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generates markdown content for feature comparison
 *
 * @param data - Comparison data
 * @returns Markdown string for feature section
 */
function generateFeatureMarkdown(data: ComparisonData): string {
  const lines: string[] = [];
  lines.push('## Feature Comparison\n');

  // Summary
  lines.push(`**Total Features:** ${data.summary.totalFeatures}`);
  lines.push(`**Shared Features:** ${data.summary.sharedFeatures}`);
  lines.push(`**Unique Features:** ${data.summary.uniqueFeatures}\n`);

  // Feature table
  const appHeaders = data.apps.map((app) => app.appName);
  lines.push('| Feature | Category | ' + appHeaders.join(' | ') + ' |');
  lines.push('|---------|----------|' + appHeaders.map(() => '---').join('|') + '|');

  data.features.forEach((feature) => {
    const categoryLabel =
      feature.category === 'core'
        ? 'Core'
        : feature.category === 'niceToHave'
        ? 'Nice to Have'
        : 'Differentiator';
    const appColumns = data.apps.map((app) =>
      feature.presentIn.includes(app.appId) ? (feature.isShared ? 'All' : 'Yes') : '-'
    );
    lines.push(`| ${feature.feature} | ${categoryLabel} | ${appColumns.join(' | ')} |`);
  });

  lines.push('');
  return lines.join('\n');
}

/**
 * Generates markdown content for pattern comparison
 *
 * @param data - Comparison data
 * @returns Markdown string for pattern section
 */
function generatePatternMarkdown(data: ComparisonData): string {
  const lines: string[] = [];
  lines.push('## UI Pattern Comparison\n');

  // Summary
  lines.push(`**Total Patterns:** ${data.summary.totalPatterns}`);
  lines.push(`**Shared Patterns:** ${data.summary.sharedPatterns}\n`);

  if (data.patterns.length === 0) {
    lines.push('*No patterns detected in the analyzed apps.*\n');
    return lines.join('\n');
  }

  // Shared patterns
  const sharedPatterns = data.patterns.filter((p) => p.isShared);
  if (sharedPatterns.length > 0) {
    lines.push('### Shared Patterns\n');
    sharedPatterns.forEach((pattern) => {
      lines.push(`- **${pattern.patternName}**`);
      pattern.apps.forEach((app) => {
        lines.push(`  - ${app.appName}: ${app.frequency.replace('_', ' ')}`);
      });
    });
    lines.push('');
  }

  // Unique patterns
  const uniquePatterns = data.patterns.filter((p) => !p.isShared);
  if (uniquePatterns.length > 0) {
    lines.push('### App-Specific Patterns\n');
    uniquePatterns.forEach((pattern) => {
      lines.push(`- **${pattern.patternName}**`);
      pattern.apps.forEach((app) => {
        lines.push(`  - ${app.appName}: ${app.frequency.replace('_', ' ')}`);
      });
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates markdown content for flow comparison
 *
 * @param data - Comparison data
 * @returns Markdown string for flow section
 */
function generateFlowMarkdown(data: ComparisonData): string {
  const lines: string[] = [];
  lines.push('## User Flow Comparison\n');

  // Summary
  lines.push(`**Total Flows:** ${data.summary.totalFlows}`);
  lines.push(`**Shared Flows:** ${data.summary.sharedFlows}\n`);

  if (data.flows.length === 0) {
    lines.push('*No user flows detected in the analyzed apps.*\n');
    return lines.join('\n');
  }

  // Flow table
  const appHeaders = data.apps.map((app) => app.appName);
  lines.push('| User Flow | ' + appHeaders.join(' | ') + ' | Status |');
  lines.push('|-----------|' + appHeaders.map(() => '---').join('|') + '|--------|');

  data.flows.forEach((flow) => {
    const appColumns = data.apps.map((app) => {
      const appFlow = flow.apps.find((f) => f.appId === app.appId);
      if (appFlow) {
        return `${appFlow.stepCount} steps (${appFlow.complexity})`;
      }
      return '-';
    });
    const status = flow.isShared ? 'Shared' : 'Unique';
    lines.push(`| ${flow.flowName} | ${appColumns.join(' | ')} | ${status} |`);
  });

  lines.push('');
  return lines.join('\n');
}

/**
 * Generates markdown content for color palette comparison
 *
 * @param data - Comparison data
 * @returns Markdown string for color section
 */
function generateColorMarkdown(data: ComparisonData): string {
  const lines: string[] = [];
  lines.push('## Color Palette Comparison\n');

  // Color table
  const appHeaders = data.apps.map((app) => app.appName);
  lines.push('| Color Role | ' + appHeaders.join(' | ') + ' |');
  lines.push('|------------|' + appHeaders.map(() => '---').join('|') + '|');

  data.colors.forEach((colorData) => {
    if (Object.keys(colorData.colors).length === 0) return;
    const appColumns = data.apps.map((app) => colorData.colors[app.appId] || '-');
    lines.push(`| ${colorData.label} | ${appColumns.join(' | ')} |`);
  });

  lines.push('');
  return lines.join('\n');
}

/**
 * Generates markdown content for typography comparison
 *
 * @param data - Comparison data
 * @returns Markdown string for typography section
 */
function generateTypographyMarkdown(data: ComparisonData): string {
  const lines: string[] = [];
  lines.push('## Typography Comparison\n');

  const hasTypography = data.typography.some((t) => t.typography !== null);
  if (!hasTypography) {
    lines.push('*No typography data detected in the analyzed apps.*\n');
    return lines.join('\n');
  }

  // Typography table
  const appHeaders = data.apps.map((app) => app.appName);
  lines.push('| Property | ' + appHeaders.join(' | ') + ' |');
  lines.push('|----------|' + appHeaders.map(() => '---').join('|') + '|');

  const properties: { key: keyof AnalysisTypography; label: string }[] = [
    { key: 'headingFont', label: 'Heading Font' },
    { key: 'headingSize', label: 'Heading Size' },
    { key: 'headingWeight', label: 'Heading Weight' },
    { key: 'bodyFont', label: 'Body Font' },
    { key: 'bodySize', label: 'Body Size' },
    { key: 'bodyWeight', label: 'Body Weight' },
  ];

  properties.forEach((prop) => {
    const appColumns = data.typography.map((t) => t.typography?.[prop.key] || '-');
    lines.push(`| ${prop.label} | ${appColumns.join(' | ')} |`);
  });

  lines.push('');
  return lines.join('\n');
}

/**
 * Generates markdown content for AI insights
 *
 * @param insights - AI-generated comparison insights
 * @returns Markdown string for insights section
 */
function generateInsightsMarkdown(insights: ComparisonInsights | null): string {
  if (!insights) return '';

  const lines: string[] = [];
  lines.push('## AI-Generated Insights\n');

  if (insights.summary) {
    lines.push('### Summary\n');
    lines.push(insights.summary + '\n');
  }

  if (insights.similarities.length > 0) {
    lines.push('### Key Similarities\n');
    insights.similarities.forEach((item) => {
      lines.push(`- ${item}`);
    });
    lines.push('');
  }

  if (insights.differences.length > 0) {
    lines.push('### Key Differences\n');
    insights.differences.forEach((item) => {
      lines.push(`- ${item}`);
    });
    lines.push('');
  }

  if (insights.recommendations.length > 0) {
    lines.push('### Recommendations\n');
    insights.recommendations.forEach((item) => {
      lines.push(`- ${item}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates complete markdown report for comparison
 *
 * @param data - Comparison data
 * @param insights - Optional AI-generated insights
 * @returns Complete markdown string
 *
 * @example
 * ```typescript
 * const comparisonData = buildComparisonData(selectedApps);
 * const markdown = generateComparisonMarkdown(comparisonData, insights);
 * console.log(markdown);
 * ```
 */
export function generateComparisonMarkdown(
  data: ComparisonData,
  insights?: ComparisonInsights | null
): string {
  const lines: string[] = [];

  // Title
  lines.push('# App Comparison Report\n');

  // Metadata
  lines.push(`**Generated:** ${formatDate(data.comparedAt)}`);
  lines.push(`**Apps Compared:** ${data.apps.length}\n`);

  // Apps list
  lines.push('## Compared Apps\n');
  data.apps.forEach((app, index) => {
    lines.push(`${index + 1}. **${app.appName}** (${app.category}) - ${app.screenshotCount} screenshots`);
  });
  lines.push('');

  // Summary stats
  lines.push('## Comparison Summary\n');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Features | ${data.summary.totalFeatures} |`);
  lines.push(`| Shared Features | ${data.summary.sharedFeatures} |`);
  lines.push(`| Unique Features | ${data.summary.uniqueFeatures} |`);
  lines.push(`| Total UI Patterns | ${data.summary.totalPatterns} |`);
  lines.push(`| Shared Patterns | ${data.summary.sharedPatterns} |`);
  lines.push(`| Total User Flows | ${data.summary.totalFlows} |`);
  lines.push(`| Shared Flows | ${data.summary.sharedFlows} |`);
  lines.push('');

  // AI Insights (if available, placed prominently)
  lines.push(generateInsightsMarkdown(insights ?? null));

  // Features
  lines.push(generateFeatureMarkdown(data));

  // Patterns
  lines.push(generatePatternMarkdown(data));

  // Flows
  lines.push(generateFlowMarkdown(data));

  // Colors
  lines.push(generateColorMarkdown(data));

  // Typography
  lines.push(generateTypographyMarkdown(data));

  // Footer
  lines.push('---\n');
  lines.push('*Generated by Mobile Cloner Web - Reference App Analyzer*');

  return lines.join('\n');
}

/**
 * Downloads comparison report as a markdown file
 *
 * @param data - Comparison data
 * @param insights - Optional AI-generated insights
 * @param filename - Optional custom filename (without extension)
 *
 * @example
 * ```typescript
 * // Download with auto-generated filename
 * downloadComparisonAsMarkdown(comparisonData, insights);
 *
 * // Download with custom filename
 * downloadComparisonAsMarkdown(comparisonData, insights, 'my-comparison');
 * ```
 */
export function downloadComparisonAsMarkdown(
  data: ComparisonData,
  insights?: ComparisonInsights | null,
  filename?: string
): void {
  const markdown = generateComparisonMarkdown(data, insights);

  // Generate filename if not provided
  const appNames = data.apps.map((app) => app.appName.replace(/[^a-zA-Z0-9]/g, '-')).join('-vs-');
  const defaultFilename = `comparison-${appNames}-${new Date().toISOString().split('T')[0]}`;
  const finalFilename = filename || defaultFilename;

  // Create blob and download
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${finalFilename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Copies comparison markdown to clipboard
 *
 * @param data - Comparison data
 * @param insights - Optional AI-generated insights
 * @returns Promise that resolves when copied
 *
 * @example
 * ```typescript
 * await copyComparisonToClipboard(comparisonData, insights);
 * console.log('Copied to clipboard!');
 * ```
 */
export async function copyComparisonToClipboard(
  data: ComparisonData,
  insights?: ComparisonInsights | null
): Promise<void> {
  const markdown = generateComparisonMarkdown(data, insights);
  await navigator.clipboard.writeText(markdown);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that apps can be compared
 *
 * @param apps - Array of apps to validate
 * @returns Validation result with error message if invalid
 */
export function validateAppsForComparison(apps: ReferenceAppRow[]): {
  isValid: boolean;
  error?: string;
} {
  if (apps.length < 2) {
    return {
      isValid: false,
      error: 'At least 2 apps are required for comparison',
    };
  }

  if (apps.length > 4) {
    return {
      isValid: false,
      error: 'Maximum of 4 apps can be compared at once',
    };
  }

  const unanalyzedApps = apps.filter((app) => !app.analysis);
  if (unanalyzedApps.length > 0) {
    const names = unanalyzedApps.map((app) => app.name).join(', ');
    return {
      isValid: false,
      error: `The following apps have not been analyzed: ${names}`,
    };
  }

  return { isValid: true };
}

/**
 * Checks if all selected apps have been analyzed
 *
 * @param apps - Array of apps to check
 * @returns True if all apps have analysis data
 */
export function areAllAppsAnalyzed(apps: ReferenceAppRow[]): boolean {
  return apps.every((app) => app.analysis !== null);
}

/**
 * Gets the number of shared features between apps
 *
 * @param apps - Array of apps to check
 * @returns Number of features shared by all apps
 */
export function getSharedFeatureCount(apps: ReferenceAppRow[]): number {
  const features = buildFeatureComparison(apps);
  return features.filter((f) => f.isShared).length;
}

/**
 * Gets the similarity score between apps (0-100)
 *
 * @param apps - Array of apps to compare
 * @returns Similarity score as a percentage
 */
export function calculateSimilarityScore(apps: ReferenceAppRow[]): number {
  const features = buildFeatureComparison(apps);
  const patterns = buildPatternComparison(apps);
  const flows = buildFlowComparison(apps);

  if (features.length === 0 && patterns.length === 0 && flows.length === 0) {
    return 0;
  }

  const featureScore = features.length > 0
    ? (features.filter((f) => f.isShared).length / features.length) * 100
    : 0;

  const patternScore = patterns.length > 0
    ? (patterns.filter((p) => p.isShared).length / patterns.length) * 100
    : 0;

  const flowScore = flows.length > 0
    ? (flows.filter((f) => f.isShared).length / flows.length) * 100
    : 0;

  // Weighted average: features 50%, patterns 30%, flows 20%
  const totalWeight =
    (features.length > 0 ? 50 : 0) +
    (patterns.length > 0 ? 30 : 0) +
    (flows.length > 0 ? 20 : 0);

  if (totalWeight === 0) return 0;

  const weightedScore =
    ((features.length > 0 ? featureScore * 50 : 0) +
      (patterns.length > 0 ? patternScore * 30 : 0) +
      (flows.length > 0 ? flowScore * 20 : 0)) /
    totalWeight;

  return Math.round(weightedScore);
}
