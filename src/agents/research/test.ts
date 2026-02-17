/**
 * Research Agent Test Suite
 * 
 * Comprehensive tests with validation
 */

import { ResearchAgent } from "./index.js";
import {
  MockMemoryLayerEngine,
  AgentTestRunner,
  AgentTestAssertions,
  ResearchAgentTestScenarios
} from "../test-framework.js";
import type { ResearchAgentInput, ResearchAgentOutput } from "../types/index.js";

// ============================================================================
// Test Runner
// ============================================================================

async function runResearchAgentTests() {
  console.log("🧪 Running Research Agent Test Suite\n");
  
  const runner = new AgentTestRunner();
  
  for (const scenario of ResearchAgentTestScenarios) {
    await runner.runScenario<ResearchAgentInput, ResearchAgentOutput>(
      scenario,
      {
        execute: async (input: ResearchAgentInput) => {
          const mockEngine = new MockMemoryLayerEngine();
          mockEngine.configure(scenario.mockConfig);
          
          const agent = new ResearchAgent({
            engine: mockEngine,
            projectPath: "/test",
            llmProvider: null,
            maxSearchQueries: 5
          });
          
          return await agent.research(input);
        }
      },
      (output, expected) => {
        // Run assertions
        AgentTestAssertions.assertResearchQuality(output);
        AgentTestAssertions.assertApproaches(output);
        AgentTestAssertions.assertRiskAssessment(output);
        
        // Additional assertions
        if (expected.shouldFindPriorArt && output.prior_art.existing_code.length === 0 &&
            output.prior_art.reusable_components.length === 0) {
          throw new Error("Expected to find prior art but found none");
        }
        
        if (expected.maxRiskLevel) {
          const riskLevels = ["low", "medium", "high", "critical"];
          const actualRisk = output.options.approach_a.risk_level;
          const maxRiskIndex = riskLevels.indexOf(expected.maxRiskLevel);
          const actualRiskIndex = riskLevels.indexOf(actualRisk);
          
          if (actualRiskIndex > maxRiskIndex) {
            throw new Error(`Risk level ${actualRisk} exceeds max ${expected.maxRiskLevel}`);
          }
        }
      }
    );
  }
  
  runner.printReport();
  return runner.getResults();
}

// ============================================================================
// Advanced Test Scenarios
// ============================================================================

async function runAdvancedTests() {
  console.log("\n🔬 Running Advanced Research Tests\n");
  
  const testCases = [
    {
      name: "Multi-category feature",
      input: { 
        feature_request: "Add authentication API with database storage",
        why_output: { verdict: "proceed" } as any
      },
      mockConfig: {
        searchResults: [
          { path: "src/auth/login.ts", similarity_score: 0.9, summary: "Auth logic" },
          { path: "src/api/routes.ts", similarity_score: 0.85, summary: "API routes" },
          { path: "src/db/models.ts", similarity_score: 0.8, summary: "Database models" }
        ],
        patterns: [
          { id: "1", name: "JWT Auth", category: "authentication", description: "Token-based auth" },
          { id: "2", name: "Repository", category: "database", description: "Data access" }
        ]
      },
      validate: (output: ResearchAgentOutput) => {
        if (output.prior_art.existing_code.length < 2) {
          throw new Error("Should find multiple categories of prior art");
        }
        if (output.constraints.patterns_to_follow.length < 1) {
          throw new Error("Should identify patterns from multiple categories");
        }
        console.log("  ✅ Multi-category feature: Found cross-cutting concerns");
      }
    },
    {
      name: "Feature with web research need",
      input: { 
        feature_request: "Add Stripe payment integration",
        why_output: { verdict: "proceed" } as any
      },
      mockConfig: {
        searchResults: [],
        patterns: []
      },
      validate: (output: ResearchAgentOutput) => {
        // Should identify need for external research
        const hasExternalUnknown = output.unknowns.some(u => 
          u.toLowerCase().includes("stripe") || 
          u.toLowerCase().includes("api") ||
          u.toLowerCase().includes("integration")
        );
        if (!hasExternalUnknown) {
          console.log("  ⚠️  Should identify external integration unknowns");
        } else {
          console.log("  ✅ External integration: Identified research needs");
        }
      }
    },
    {
      name: "Feature with high-risk history",
      input: { 
        feature_request: "Add real-time notifications",
        why_output: { verdict: "proceed" } as any
      },
      mockConfig: {
        searchResults: [],
        failures: [
          { 
            id: "1", 
            feature: "WebSocket notifications", 
            approach: "Native WebSockets", 
            why_failed: "Scaling issues", 
            lesson: "Use Redis" 
          },
          { 
            id: "2", 
            feature: "Push notifications", 
            approach: "Polling", 
            why_failed: "Performance", 
            lesson: "Use WebSockets" 
          }
        ]
      },
      validate: (output: ResearchAgentOutput) => {
        if (output.warnings.past_failures.length < 2) {
          throw new Error("Should find multiple past failures");
        }
        if (output.options.approach_b.risk_level !== "high") {
          throw new Error("Should flag innovative approach as high risk");
        }
        console.log("  ✅ High-risk history: Correctly identified and warned");
      }
    },
    {
      name: "Feature with architectural constraints",
      input: { 
        feature_request: "Add microservices for user management",
        why_output: { verdict: "proceed" } as any
      },
      mockConfig: {
        decisions: [
          { id: "1", title: "Monolith Architecture", description: "Keep monolith for simplicity", status: "active" }
        ]
      },
      validate: (output: ResearchAgentOutput) => {
        // Should identify constraint
        const hasMonolithDecision = output.constraints.architectural_decisions.some(
          d => d.title.toLowerCase().includes("monolith")
        );
        if (hasMonolithDecision) {
          console.log("  ✅ Constraints: Identified architectural constraints");
        } else {
          console.log("  ⚠️  Should identify architectural constraints");
        }
      }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const mockEngine = new MockMemoryLayerEngine();
      mockEngine.configure(testCase.mockConfig);
      
      const agent = new ResearchAgent({
        engine: mockEngine,
        projectPath: "/test",
        enableWebResearch: true
      });
      
      const output = await agent.research(testCase.input as ResearchAgentInput);
      testCase.validate(output);
      
    } catch (error) {
      console.log(`  ❌ ${testCase.name}: ${error}`);
    }
  }
}

// ============================================================================
// Performance Tests
// ============================================================================

async function runPerformanceTests() {
  console.log("\n⚡ Running Research Agent Performance Tests\n");
  
  const iterations = 5;
  const mockEngine = new MockMemoryLayerEngine();
  mockEngine.configure({
    searchResults: Array(30).fill(null).map((_, i) => ({
      path: `src/file${i}.ts`,
      content: `Feature ${i} implementation with various functionality`,
      similarity_score: 0.3 + (Math.random() * 0.6),
      summary: `File ${i} summary`
    })),
    patterns: Array(10).fill(null).map((_, i) => ({
      id: `${i}`,
      name: `Pattern ${i}`,
      category: ["database", "api", "component", "auth"][i % 4],
      description: `Pattern ${i} description`,
      usage_count: Math.floor(Math.random() * 20)
    })),
    failures: Array(5).fill(null).map((_, i) => ({
      id: `${i}`,
      feature: `Feature ${i}`,
      approach: "Approach A",
      why_failed: "Failed because...",
      lesson: "Lesson learned"
    })),
    decisions: Array(5).fill(null).map((_, i) => ({
      id: `${i}`,
      title: `Decision ${i}`,
      description: `Decision ${i} description`,
      status: "active"
    }))
  });
  
  const agent = new ResearchAgent({
    engine: mockEngine,
    projectPath: "/test",
    maxSearchQueries: 5
  });
  
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await agent.research({ 
      feature_request: "Add user authentication with OAuth",
      why_output: { verdict: "proceed" } as any
    });
    times.push(Date.now() - start);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log(`Performance Results (${iterations} iterations):`);
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min}ms`);
  console.log(`  Max: ${max}ms`);
  console.log(`  All under 2000ms: ${times.every(t => t < 2000) ? '✅' : '❌'}`);
}

// ============================================================================
// Approach Quality Tests
// ============================================================================

async function runApproachQualityTests() {
  console.log("\n📊 Running Approach Quality Tests\n");
  
  const testCases = [
    {
      description: "Conservative approach should be recommended with good prior art",
      mockConfig: {
        searchResults: [
          { path: "src/auth/existing.ts", similarity_score: 0.9, summary: "Existing auth" }
        ],
        patterns: [{ id: "1", name: "Auth Pattern", category: "auth", description: "Auth" }]
      },
      expectedRecommendation: "a"
    },
    {
      description: "Conservative approach should be recommended with past failures",
      mockConfig: {
        searchResults: [],
        failures: [
          { id: "1", feature: "Similar", approach: "A", why_failed: "X", lesson: "Y" }
        ]
      },
      expectedRecommendation: "a"
    },
    {
      description: "Should provide 2 distinct approaches",
      mockConfig: {
        searchResults: [],
        patterns: []
      },
      validate: (output: ResearchAgentOutput) => {
        const approachA = output.options.approach_a;
        const approachB = output.options.approach_b;
        
        if (!approachA.description || !approachB.description) {
          throw new Error("Both approaches should have descriptions");
        }
        if (approachA.pros.length === 0 || approachB.pros.length === 0) {
          throw new Error("Both approaches should have pros");
        }
        if (approachA.cons.length === 0 || approachB.cons.length === 0) {
          throw new Error("Both approaches should have cons");
        }
        
        console.log("  ✅ Both approaches are well-defined");
      }
    }
  ];
  
  let correct = 0;
  let total = 0;
  
  for (const testCase of testCases) {
    try {
      const mockEngine = new MockMemoryLayerEngine();
      mockEngine.configure(testCase.mockConfig);
      
      const agent = new ResearchAgent({
        engine: mockEngine,
        projectPath: "/test"
      });
      
      const output = await agent.research({
        feature_request: "Add user authentication",
        why_output: { verdict: "proceed" } as any
      });
      
      if (testCase.validate) {
        testCase.validate(output);
        correct++;
      } else if (testCase.expectedRecommendation) {
        const match = output.options.recommended === testCase.expectedRecommendation;
        if (match) correct++;
        console.log(`  ${match ? '✅' : '❌'} ${testCase.description}`);
      }
      
      total++;
    } catch (error) {
      console.log(`  ❌ ${testCase.description}: ${error}`);
      total++;
    }
  }
  
  console.log(`\nApproach Quality: ${((correct / total) * 100).toFixed(1)}% (${correct}/${total})`);
}

// ============================================================================
// Main Test Runner
// ============================================================================

export async function runAllTests() {
  console.log("=".repeat(80));
  console.log("RESEARCH AGENT - COMPREHENSIVE TEST SUITE");
  console.log("=".repeat(80));
  
  try {
    // Run scenario tests
    await runResearchAgentTests();
    
    // Run advanced tests
    await runAdvancedTests();
    
    // Run performance tests
    await runPerformanceTests();
    
    // Run approach quality tests
    await runApproachQualityTests();
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL RESEARCH AGENT TESTS COMPLETED");
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
