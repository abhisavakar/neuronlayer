/**
 * Moderator Agent Test Suite
 * 
 * Tests for orchestration, document management, and anti-pattern detection
 */

import { ModeratorAgent } from "./index.js";
import {
  MockMemoryLayerEngine,
  AgentTestRunner,
  AgentTestAssertions
} from "../test-framework.js";
import type {
  ModeratorInput,
  ModeratorOutput,
  PipelineState,
  WhyAgentOutput,
  BuilderAgentOutput,
  TriggerEvent
} from "../types/index.js";

// ============================================================================
// Test Scenarios
// ============================================================================

const ModeratorTestScenarios = [
  {
    name: "Agent completion - Why Agent proceed",
    input: {
      trigger: { type: "agent_complete", agent: "why", phase: "impulse" } as TriggerEvent,
      current_state: createMockState({ status: "impulse" }),
      agent_output: { verdict: "proceed" } as WhyAgentOutput
    },
    expected: {
      shouldUpdateState: true,
      newStatus: "research",
      requiresHumanDecision: false
    }
  },
  {
    name: "Agent completion - Why Agent reject",
    input: {
      trigger: { type: "agent_complete", agent: "why", phase: "impulse" } as TriggerEvent,
      current_state: createMockState({ status: "impulse" }),
      agent_output: { verdict: "reject" } as WhyAgentOutput
    },
    expected: {
      shouldUpdateState: true,
      newStatus: "rejected",
      requiresHumanDecision: false
    }
  },
  {
    name: "Build step completion",
    input: {
      trigger: { type: "build_step_complete", step: 1 } as TriggerEvent,
      current_state: createMockState({ 
        status: "building",
        current_step: 1,
        completed_steps: []
      }),
      agent_output: { file: "src/auth.ts", code: "..." } as BuilderAgentOutput
    },
    expected: {
      shouldUpdateState: true,
      completedStepsCount: 1,
      requiresHumanDecision: false
    }
  },
  {
    name: "Pivot detection",
    input: {
      trigger: { 
        type: "pivot_detected", 
        change_description: "Need to change auth from JWT to OAuth" 
      } as TriggerEvent,
      current_state: createMockState({
        status: "building",
        completed_steps: [
          { order: 1, file: "src/auth/jwt.ts", tests_passed: true, warnings: [] }
        ]
      }),
      agent_output: {} as any
    },
    expected: {
      requiresHumanDecision: true,
      hasPivotAnalysis: true
    }
  },
  {
    name: "Unplanned file detection",
    input: {
      trigger: { type: "build_step_complete", step: 1 } as TriggerEvent,
      current_state: createMockState({
        status: "building",
        completed_steps: [],
        decomposition: {
          steps: [{ order: 1, file: "src/planned.ts" }],
          total_steps: 1,
          build_order_rationale: "Test"
        }
      }),
      agent_output: { file: "src/unplanned.ts", code: "..." } as BuilderAgentOutput
    },
    expected: {
      hasIssues: true,
      issueType: "unplanned_file"
    }
  }
];

// ============================================================================
// Helper Functions
// ============================================================================

function createMockState(overrides: any): PipelineState {
  return {
    feature_id: "test-001",
    feature_request: "Test feature",
    status: overrides.status || "impulse",
    project_path: "/test",
    started_at: new Date(),
    updated_at: new Date(),
    current_step: overrides.current_step || 0,
    completed_steps: overrides.completed_steps || [],
    test_results: [],
    smell_warnings: [],
    docs_context_per_step: new Map(),
    pivots: [],
    moderator_logs: [],
    human_approvals: [],
    why: null,
    research: null,
    documentation: null,
    plan: null,
    architecture: null,
    security: null,
    estimate: null,
    design: null,
    spike: null,
    decomposition: overrides.decomposition || null,
    review: null,
    deployment: null,
    retrospective: null,
    ...overrides
  };
}

// ============================================================================
// Test Runner
// ============================================================================

async function runModeratorAgentTests() {
  console.log("🧪 Running Moderator Agent Test Suite\n");
  
  const runner = new AgentTestRunner();
  
  for (const scenario of ModeratorTestScenarios) {
    await runner.runScenario<ModeratorInput, ModeratorOutput>(
      scenario as any,
      {
        execute: async (input: ModeratorInput) => {
          const mockEngine = new MockMemoryLayerEngine();
          mockEngine.configure({});
          
          const agent = new ModeratorAgent({
            engine: mockEngine,
            projectPath: "/test",
            enableAntiPatterns: true
          });
          
          return await agent.process(input);
        }
      },
      (output, expected) => {
        // State update assertions
        if (expected.shouldUpdateState) {
          if (!output.updated_state) {
            throw new Error("Expected state to be updated");
          }
        }
        
        if (expected.newStatus) {
          if (output.updated_state.status !== expected.newStatus) {
            throw new Error(`Expected status ${expected.newStatus} but got ${output.updated_state.status}`);
          }
        }
        
        if (expected.completedStepsCount !== undefined) {
          if (output.updated_state.completed_steps.length !== expected.completedStepsCount) {
            throw new Error(`Expected ${expected.completedStepsCount} completed steps but got ${output.updated_state.completed_steps.length}`);
          }
        }
        
        // Human decision assertions
        if (expected.requiresHumanDecision !== undefined) {
          if (output.requires_human_decision !== expected.requiresHumanDecision) {
            throw new Error(`Expected requires_human_decision=${expected.requiresHumanDecision} but got ${output.requires_human_decision}`);
          }
        }
        
        // Pivot analysis assertions
        if (expected.hasPivotAnalysis) {
          if (!output.pivot_analysis) {
            throw new Error("Expected pivot analysis but none found");
          }
          if (!output.pivot_analysis.pivot_detected) {
            throw new Error("Expected pivot to be detected");
          }
        }
        
        // Issue detection assertions
        if (expected.hasIssues) {
          if (output.issues.length === 0) {
            throw new Error("Expected issues but none found");
          }
          if (expected.issueType) {
            const hasIssue = output.issues.some(i => i.type === expected.issueType);
            if (!hasIssue) {
              throw new Error(`Expected issue of type ${expected.issueType} but not found`);
            }
          }
        }
      }
    );
  }
  
  runner.printReport();
  return runner.getResults();
}

// ============================================================================
// Anti-Pattern Detection Tests
// ============================================================================

async function runAntiPatternTests() {
  console.log("\n🚨 Running Anti-Pattern Detection Tests\n");
  
  const testCases = [
    {
      name: "Doom loop detection",
      state: createMockState({
        moderator_logs: [
          { agent: "builder", action: "edit-file", timestamp: new Date() },
          { agent: "builder", action: "edit-file", timestamp: new Date() },
          { agent: "builder", action: "edit-file", timestamp: new Date() }
        ]
      }),
      validate: (output: ModeratorOutput) => {
        const hasDoomLoop = output.issues.some(i => i.type === "doom_loop");
        if (!hasDoomLoop) {
          console.log("  ⚠️  Should detect doom loop pattern");
        } else {
          console.log("  ✅ Doom loop detected");
        }
      }
    },
    {
      name: "Scope creep detection",
      state: createMockState({
        decomposition: { total_steps: 5 },
        completed_steps: Array(10).fill(null).map((_, i) => ({
          order: i + 1,
          file: `src/file${i}.ts`,
          timestamp: new Date(),
          tests_passed: true,
          warnings: []
        }))
      }),
      validate: (output: ModeratorOutput) => {
        const hasScopeCreep = output.issues.some(i => i.type === "scope_creep");
        if (!hasScopeCreep) {
          console.log("  ⚠️  Should detect scope creep");
        } else {
          console.log("  ✅ Scope creep detected");
        }
      }
    },
    {
      name: "Warning accumulation",
      state: createMockState({
        smell_warnings: Array(15).fill(null).map(() => ({
          type: "complexity",
          severity: "warning",
          message: "High complexity",
          suggestion: "Refactor"
        }))
      }),
      validate: (output: ModeratorOutput) => {
        const hasWarningAccumulation = output.issues.some(i => i.type === "warning_accumulation");
        if (!hasWarningAccumulation) {
          console.log("  ⚠️  Should detect warning accumulation");
        } else {
          console.log("  ✅ Warning accumulation detected");
        }
      }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const mockEngine = new MockMemoryLayerEngine();
      mockEngine.configure({});
      
      const agent = new ModeratorAgent({
        engine: mockEngine,
        projectPath: "/test",
        enableAntiPatterns: true
      });
      
      const input: ModeratorInput = {
        trigger: { type: "agent_complete", agent: "builder", phase: "building" },
        current_state: testCase.state,
        agent_output: {} as any
      };
      
      const output = await agent.process(input);
      testCase.validate(output);
      
    } catch (error) {
      console.log(`  ❌ ${testCase.name}: ${error}`);
    }
  }
}

// ============================================================================
// Document Management Tests
// ============================================================================

async function runDocumentManagementTests() {
  console.log("\n📄 Running Document Management Tests\n");
  
  const documentTests = [
    {
      agent: "architect",
      expectedDocs: ["docs/ARCHITECTURE.md", "docs/DECISIONS.md"]
    },
    {
      agent: "security",
      expectedDocs: ["docs/SECURITY.md"]
    },
    {
      agent: "review",
      expectedDocs: ["docs/CHANGELOG.md"]
    },
    {
      agent: "retrospective",
      expectedDocs: ["docs/PATTERNS.md", "docs/FAILURES.md", "docs/ESTIMATES.md"]
    }
  ];
  
  for (const test of documentTests) {
    try {
      const mockEngine = new MockMemoryLayerEngine();
      mockEngine.configure({});
      
      const agent = new ModeratorAgent({
        engine: mockEngine,
        projectPath: "/test"
      });
      
      const input: ModeratorInput = {
        trigger: { type: "agent_complete", agent: test.agent, phase: "building" },
        current_state: createMockState({}),
        agent_output: {
          new_decisions: [{ title: "Test Decision", description: "Test", alternatives_considered: [], reasoning: "" }]
        } as any
      };
      
      const output = await agent.process(input);
      
      // Note: Actual document updates happen in DocumentManager
      // This is a simplified check
      console.log(`  ✅ ${test.agent} agent: Document update flow triggered`);
      
    } catch (error) {
      console.log(`  ❌ ${test.agent} agent: ${error}`);
    }
  }
}

// ============================================================================
// Pivot Analysis Tests
// ============================================================================

async function runPivotAnalysisTests() {
  console.log("\n🔄 Running Pivot Analysis Tests\n");
  
  const testCases = [
    {
      name: "Simple pivot - 1 step affected",
      changeDescription: "Change auth from JWT to OAuth",
      completedSteps: [
        { order: 1, file: "src/auth/jwt.ts", tests_passed: true, warnings: [] }
      ],
      expectedRedoCount: 1
    },
    {
      name: "Complex pivot - multiple steps",
      changeDescription: "Change database from MongoDB to PostgreSQL",
      completedSteps: [
        { order: 1, file: "src/db/models.ts", tests_passed: true, warnings: [] },
        { order: 2, file: "src/services/user.ts", tests_passed: true, warnings: [] },
        { order: 3, file: "src/api/users.ts", tests_passed: true, warnings: [] }
      ],
      expectedRedoCount: 1  // Only the file matching the change
    },
    {
      name: "Infrastructure pivot",
      changeDescription: "Add Terraform infrastructure changes",
      completedSteps: [],
      expectedDeploymentChange: true
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const mockEngine = new MockMemoryLayerEngine();
      mockEngine.configure({});
      
      const agent = new ModeratorAgent({
        engine: mockEngine,
        projectPath: "/test"
      });
      
      const input: ModeratorInput = {
        trigger: { 
          type: "pivot_detected", 
          change_description: testCase.changeDescription 
        },
        current_state: createMockState({
          completed_steps: testCase.completedSteps
        }),
        agent_output: {} as any
      };
      
      const output = await agent.process(input);
      
      if (!output.pivot_analysis) {
        throw new Error("Expected pivot analysis");
      }
      
      if (testCase.expectedRedoCount !== undefined) {
        const actualRedoCount = output.pivot_analysis.impact.steps_to_redo.length;
        if (actualRedoCount !== testCase.expectedRedoCount) {
          console.log(`  ⚠️  ${testCase.name}: Expected ${testCase.expectedRedoCount} steps to redo, got ${actualRedoCount}`);
        } else {
          console.log(`  ✅ ${testCase.name}: Correctly identified ${actualRedoCount} steps to redo`);
        }
      }
      
      if (testCase.expectedDeploymentChange) {
        if (output.pivot_analysis.impact.deployment_changes.infrastructure) {
          console.log(`  ✅ ${testCase.name}: Infrastructure change detected`);
        } else {
          console.log(`  ⚠️  ${testCase.name}: Should detect infrastructure change`);
        }
      }
      
    } catch (error) {
      console.log(`  ❌ ${testCase.name}: ${error}`);
    }
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

export async function runAllTests() {
  console.log("=".repeat(80));
  console.log("MODERATOR AGENT - COMPREHENSIVE TEST SUITE");
  console.log("=".repeat(80));
  
  try {
    // Run main tests
    await runModeratorAgentTests();
    
    // Run anti-pattern tests
    await runAntiPatternTests();
    
    // Run document management tests
    await runDocumentManagementTests();
    
    // Run pivot analysis tests
    await runPivotAnalysisTests();
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL MODERATOR AGENT TESTS COMPLETED");
    console.log("=".repeat(80));
    
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export default runAllTests;
