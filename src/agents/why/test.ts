/**
 * Why Agent Test Suite
 * 
 * Comprehensive tests with mock engine and validation
 */

import { WhyAgent } from "./index.js";
import {
  MockMemoryLayerEngine,
  AgentTestRunner,
  AgentTestAssertions,
  WhyAgentTestScenarios
} from "../test-framework.js";
import type { WhyAgentInput, WhyAgentOutput } from "../types/index.js";

// ============================================================================
// Test Runner
// ============================================================================

async function runWhyAgentTests() {
  console.log("🧪 Running Why Agent Test Suite\n");
  
  const runner = new AgentTestRunner();
  
  for (const scenario of WhyAgentTestScenarios) {
    await runner.runScenario<WhyAgentInput, WhyAgentOutput>(
      scenario,
      {
        execute: async (input: WhyAgentInput) => {
          const mockEngine = new MockMemoryLayerEngine();
          mockEngine.configure(scenario.mockConfig);
          
          const agent = new WhyAgent({
            engine: mockEngine,
            projectPath: "/test",
            llmProvider: null
          });
          
          return await agent.analyze(input);
        }
      },
      (output, expected) => {
        // Run assertions
        if (expected.verdict) {
          AgentTestAssertions.assertVerdict(output, expected.verdict);
        }
        
        AgentTestAssertions.assertReasoning(output);
        
        if (expected.minQuestions) {
          AgentTestAssertions.assertQuestions(output, expected.minQuestions);
        }
        
        // Additional assertions
        if (expected.shouldFindPriorArt && output.existing_code_that_helps.length === 0) {
          throw new Error("Expected to find prior art but found none");
        }
        
        if (expected.shouldWarnAboutFailures && output.past_failures.length === 0) {
          throw new Error("Expected warnings about past failures");
        }
      }
    );
  }
  
  runner.printReport();
  return runner.getResults();
}

// ============================================================================
// Edge Case Tests
// ============================================================================

async function runEdgeCaseTests() {
  console.log("\n🔬 Running Edge Case Tests\n");
  
  const edgeCases = [
    {
      name: "Empty feature request",
      input: { feature_request: "" },
      shouldThrow: true
    },
    {
      name: "Very long feature request",
      input: { 
        feature_request: "Add ".repeat(1000) + "feature"
      },
      shouldThrow: false
    },
    {
      name: "Feature with special characters",
      input: { 
        feature_request: "Add user@auth with password#123 and $pecial chars!"
      },
      shouldThrow: false
    },
    {
      name: "Feature with code snippets",
      input: { 
        feature_request: "Add function calculateTotal() { return a + b; }"
      },
      shouldThrow: false
    }
  ];
  
  for (const testCase of edgeCases) {
    try {
      const mockEngine = new MockMemoryLayerEngine();
      mockEngine.configure({});
      
      const agent = new WhyAgent({
        engine: mockEngine,
        projectPath: "/test",
        llmProvider: null
      });
      
      const output = await agent.analyze(testCase.input as WhyAgentInput);
      
      if (testCase.shouldThrow) {
        console.log(`❌ ${testCase.name}: Expected error but succeeded`);
      } else {
        console.log(`✅ ${testCase.name}: Handled successfully`);
      }
    } catch (error) {
      if (testCase.shouldThrow) {
        console.log(`✅ ${testCase.name}: Threw expected error`);
      } else {
        console.log(`❌ ${testCase.name}: Unexpected error: ${error}`);
      }
    }
  }
}

// ============================================================================
// Performance Tests
// ============================================================================

async function runPerformanceTests() {
  console.log("\n⚡ Running Performance Tests\n");
  
  const iterations = 10;
  const mockEngine = new MockMemoryLayerEngine();
  mockEngine.configure({
    searchResults: Array(20).fill(null).map((_, i) => ({
      path: `src/file${i}.ts`,
      content: `Feature ${i} implementation`,
      similarity_score: 0.5 + (i * 0.02)
    })),
    failures: Array(5).fill(null).map((_, i) => ({
      id: `${i}`,
      feature: `Feature ${i}`,
      approach: "Approach A",
      why_failed: "Failed because...",
      lesson: "Lesson learned"
    }))
  });
  
  const agent = new WhyAgent({
    engine: mockEngine,
    projectPath: "/test",
    llmProvider: null
  });
  
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await agent.analyze({ feature_request: "Add user authentication" });
    times.push(Date.now() - start);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log(`Performance Results (${iterations} iterations):`);
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min}ms`);
  console.log(`  Max: ${max}ms`);
  console.log(`  All under 1000ms: ${times.every(t => t < 1000) ? '✅' : '❌'}`);
}

// ============================================================================
// Quality Metrics
// ============================================================================

async function runQualityMetrics() {
  console.log("\n📊 Running Quality Metrics\n");
  
  const testCases = [
    {
      description: "Should reject duplicates",
      scenarios: [
        {
          input: { feature_request: "Add auth" },
          mock: {
            searchResults: [{ path: "src/auth.ts", similarity_score: 0.98 }]
          }
        }
      ],
      expectedVerdict: "merge_with_existing"
    },
    {
      description: "Should detect conflicts",
      scenarios: [
        {
          input: { feature_request: "Add GraphQL" },
          mock: {
            decisions: [{ id: "1", title: "Use REST", description: "REST over GraphQL", status: "active" }]
          }
        }
      ],
      expectedVerdict: "reject"
    },
    {
      description: "Should suggest simplifications",
      scenarios: [
        {
          input: { feature_request: "Add complex auth with OAuth, SAML, LDAP" },
          mock: {
            searchResults: [{ path: "src/auth/basic.ts", similarity_score: 0.8 }]
          }
        }
      ],
      expectedVerdict: "simplify"
    }
  ];
  
  let correct = 0;
  let total = 0;
  
  for (const testCase of testCases) {
    for (const scenario of testCase.scenarios) {
      const mockEngine = new MockMemoryLayerEngine();
      mockEngine.configure(scenario.mock);
      
      const agent = new WhyAgent({
        engine: mockEngine,
        projectPath: "/test",
        llmProvider: null
      });
      
      const output = await agent.analyze(scenario.input as WhyAgentInput);
      
      const match = output.verdict === testCase.expectedVerdict;
      if (match) correct++;
      total++;
      
      console.log(`  ${match ? '✅' : '❌'} ${testCase.description}: ${output.verdict} (expected ${testCase.expectedVerdict})`);
    }
  }
  
  console.log(`\nAccuracy: ${((correct / total) * 100).toFixed(1)}% (${correct}/${total})`);
}

// ============================================================================
// Main Test Runner
// ============================================================================

export async function runAllTests() {
  console.log("=".repeat(80));
  console.log("WHY AGENT - COMPREHENSIVE TEST SUITE");
  console.log("=".repeat(80));
  
  try {
    // Run scenario tests
    await runWhyAgentTests();
    
    // Run edge cases
    await runEdgeCaseTests();
    
    // Run performance tests
    await runPerformanceTests();
    
    // Run quality metrics
    await runQualityMetrics();
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL TESTS COMPLETED");
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
