/**
 * Flow Documentation Types
 * Types for documenting user flows, screen specifications, and feature requirements.
 * Used for generating Claude Code handoff specs with mermaid diagrams.
 */

import type { AppAnalysis, ReferenceApp, ScreenAnalysis, UserFlow, FeatureSet } from './analyze';
import type { DesignDirection, ComponentPatterns, Typography } from './design';

// ============================================================================
// User Flow Diagram Types
// ============================================================================

/** A single node in a user flow diagram */
export interface FlowNode {
  id: string;
  label: string;
  type: 'screen' | 'decision' | 'action' | 'start' | 'end';
  screenRef?: string; // Reference to screen specification
  description?: string;
}

/** An edge connecting two flow nodes */
export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  condition?: string; // For decision branches
}

/** A complete user flow diagram */
export interface FlowDiagram {
  id: string;
  name: string;
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
  nodes: FlowNode[];
  edges: FlowEdge[];
  entryPoint: string; // Node ID
  exitPoints: string[]; // Node IDs
  mermaidCode: string; // Generated mermaid syntax
}

/** Collection of all flow diagrams for an app */
export interface FlowDiagramCollection {
  appId: string;
  appName: string;
  flows: FlowDiagram[];
  generatedAt: string;
}

// ============================================================================
// Screen Specification Types
// ============================================================================

/** UI element specification */
export interface UIElement {
  id: string;
  type: 'button' | 'input' | 'text' | 'image' | 'list' | 'card' | 'modal' | 'navigation' | 'icon' | 'container' | 'other';
  label: string;
  description?: string;
  required: boolean;
  props?: Record<string, string | number | boolean>;
  validation?: string[];
  accessibilityLabel?: string;
}

/** Screen action/interaction specification */
export interface ScreenAction {
  id: string;
  trigger: string; // e.g., "tap button", "swipe left"
  target: string; // Element ID that triggers action
  action: string; // What happens
  navigation?: string; // Screen navigated to (if applicable)
  apiCall?: string; // API endpoint called (if applicable)
}

/** Screen state specification */
export interface ScreenState {
  name: string;
  description: string;
  conditions: string[]; // Conditions for this state
  elements: string[]; // Element IDs visible in this state
}

/** Complete screen specification */
export interface ScreenSpecification {
  id: string;
  name: string;
  route: string; // Suggested route path
  type: 'onboarding' | 'home' | 'list' | 'detail' | 'form' | 'settings' | 'profile' | 'modal' | 'other';
  description: string;
  elements: UIElement[];
  actions: ScreenAction[];
  states: ScreenState[];
  layout: {
    type: 'stack' | 'tabs' | 'drawer' | 'modal';
    scrollable: boolean;
    safeArea: boolean;
  };
  dataRequirements: string[];
  apiDependencies: string[];
  screenshotRef?: number; // Index of reference screenshot
}

/** Collection of screen specifications */
export interface ScreenSpecificationCollection {
  appId: string;
  appName: string;
  screens: ScreenSpecification[];
  navigation: {
    type: 'stack' | 'tabs' | 'drawer' | 'hybrid';
    rootScreen: string;
    authScreens: string[];
    mainScreens: string[];
  };
  generatedAt: string;
}

// ============================================================================
// Feature Requirements Types
// ============================================================================

/** Acceptance criterion for a feature */
export interface AcceptanceCriterion {
  id: string;
  description: string;
  type: 'functional' | 'ux' | 'performance' | 'accessibility' | 'security';
  testable: boolean;
  automatable: boolean;
}

/** Feature dependency */
export interface FeatureDependency {
  featureId: string;
  featureName: string;
  type: 'hard' | 'soft'; // hard = required, soft = nice to have
  description: string;
}

/** Technical requirement for implementing a feature */
export interface TechnicalRequirement {
  category: 'api' | 'storage' | 'auth' | 'navigation' | 'state' | 'ui' | 'integration';
  description: string;
  implementation?: string; // Suggested implementation approach
}

/** Complete feature requirement specification */
export interface FeatureRequirement {
  id: string;
  name: string;
  description: string;
  priority: 'core' | 'nice-to-have' | 'differentiator';
  status: 'not-started' | 'in-progress' | 'completed';
  estimatedEffort: 'small' | 'medium' | 'large' | 'xlarge';
  userStory: string;
  acceptanceCriteria: AcceptanceCriterion[];
  technicalRequirements: TechnicalRequirement[];
  dependencies: FeatureDependency[];
  relatedScreens: string[]; // Screen specification IDs
  relatedFlows: string[]; // Flow diagram IDs
  notes?: string;
}

/** Feature requirements collection */
export interface FeatureRequirementCollection {
  appId: string;
  appName: string;
  features: FeatureRequirement[];
  mvpFeatures: string[]; // Feature IDs for MVP
  phaseBreakdown: {
    phase: number;
    name: string;
    featureIds: string[];
    estimatedDuration: string;
  }[];
  generatedAt: string;
}

// ============================================================================
// Spec Export Types
// ============================================================================

/** Markdown section in the exported spec */
export interface SpecSection {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4;
  content: string;
  subsections?: SpecSection[];
}

/** Complete markdown specification */
export interface MarkdownSpec {
  title: string;
  version: string;
  generatedAt: string;
  sections: SpecSection[];
  tableOfContents: string;
  fullDocument: string;
}

/** CLAUDE.md specific structure */
export interface ClaudeMdSpec {
  projectContext: string;
  philosophy: string[];
  techStack: {
    framework: string;
    styling: string;
    stateManagement: string;
    navigation: string;
    backend: string;
    ai?: string;
  };
  codeStyle: {
    typescript: string[];
    reactNative: string[];
    styling: string[];
    stores: string[];
  };
  fileNaming: {
    type: string;
    convention: string;
    example: string;
  }[];
  projectStructure: string;
  databaseSchema?: string;
  testingGuidelines: string[];
  errorHandling: string;
  performanceNotes: string[];
  securityNotes: string[];
  featureNotes: Record<string, string>;
}

// ============================================================================
// Generation Request/Response Types
// ============================================================================

/** Input for generating flow documentation */
export interface FlowDocumentationInput {
  referenceApp: ReferenceApp;
  designDirection?: DesignDirection;
  includeFlowDiagrams: boolean;
  includeScreenSpecs: boolean;
  includeFeatureRequirements: boolean;
  includeClaudeMd: boolean;
}

/** Generated flow documentation package */
export interface FlowDocumentationPackage {
  id: string;
  appId: string;
  appName: string;
  generatedAt: string;
  flowDiagrams?: FlowDiagramCollection;
  screenSpecifications?: ScreenSpecificationCollection;
  featureRequirements?: FeatureRequirementCollection;
  markdownSpec: MarkdownSpec;
  claudeMdSpec?: ClaudeMdSpec;
  claudeMdFile?: string; // Generated CLAUDE.md content
}

/** Generation options */
export interface FlowDocumentationOptions {
  includeFlowDiagrams: boolean;
  includeScreenSpecs: boolean;
  includeFeatureRequirements: boolean;
  generateClaudeMd: boolean;
  mermaidStyle: 'flowchart' | 'stateDiagram' | 'sequenceDiagram';
  specFormat: 'detailed' | 'summary';
  includeEstimates: boolean;
  includeTestCriteria: boolean;
}

// ============================================================================
// Result Pattern
// ============================================================================

export type FlowDocResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
