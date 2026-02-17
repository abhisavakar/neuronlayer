/**
 * Agent-MemoryLayer Integration Architecture
 * 
 * This document explains how the 18 agents interact with MemoryLayer
 */

// ============================================================================
// ARCHITECTURE OVERVIEW
// ============================================================================

/*
                    USER
                      │
                      ▼
            ┌─────────────────┐
            │  UI TOOLS       │  ← User interacts with these
            │  (read, search, │     Tools trigger agents
            │   build, etc.)  │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  AGENT          │  ← 18 specialized agents
            │  ORCHESTRATOR   │     Each has specific role
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  MEMORYLAYER    │  ← 51 MCP tools
            │  (MCP Server)   │     Persistent storage
            └─────────────────┘

FLOW:
1. User calls TOOL (e.g., "build")
2. TOOL triggers AGENT (e.g., orchestrator)
3. AGENT uses MEMORYLAYER (e.g., search, get_context)
4. MEMORYLAYER returns data
5. AGENT processes and returns result
6. TOOL formats for user
*/

// ============================================================================
// HOW AGENTS USE MEMORYLAYER
// ============================================================================

/**
 * Example: Why Agent using MemoryLayer
 */
async function whyAgentExample() {
  // 1. Agent receives feature request
  const featureRequest = "Add OAuth authentication";
  
  // 2. Agent queries MemoryLayer for prior art
  const searchResults = await memoryLayer.searchCodebase(
    featureRequest,
    10  // limit
  );
  // Returns: [{path, similarity_score, summary}]
  
  // 3. Agent queries MemoryLayer for past failures
  const failures = await memoryLayer.getFailures(featureRequest);
  // Returns: [{feature, why_failed, lesson}]
  
  // 4. Agent queries MemoryLayer for decision conflicts
  const conflicts = await memoryLayer.checkConflicts(featureRequest);
  // Returns: [{decision_id, title, description}]
  
  // 5. Agent uses this data to make verdict
  const verdict = analyzeData(searchResults, failures, conflicts);
  
  return {
    verdict: verdict.proceed ? "proceed" : "reject",
    existing_code: searchResults,
    past_failures: failures,
    conflicts: conflicts
  };
}

/**
 * Example: Research Agent using MemoryLayer
 */
async function researchAgentExample() {
  // 1. Deep investigation
  const queries = generateSearchQueries(featureRequest);
  
  // 2. Parallel MemoryLayer queries
  const [codeResults, patterns, decisions] = await Promise.all([
    // Search for existing code
    memoryLayer.searchCodebase(queries[0], 10),
    
    // Find applicable patterns
    memoryLayer.listPatterns("authentication"),
    
    // Get architectural decisions
    memoryLayer.listSources()
  ]);
  
  // 3. Get project context
  const recentChanges = await memoryLayer.whatChanged("last week");
  const retrospectives = await memoryLayer.getRetrospectives(featureRequest);
  
  // 4. Synthesize approaches
  return synthesizeApproaches(codeResults, patterns, decisions);
}

/**
 * Example: Builder Agent using MemoryLayer
 */
async function builderAgentExample() {
  // 1. Get context for current file
  const context = await memoryLayer.getContext(
    "Implementing user authentication",
    "src/auth/oauth.ts",
    4000  // max tokens
  );
  
  // 2. Check pattern compliance
  const patterns = await memoryLayer.checkPatternCompliance(
    "src/auth/oauth.ts",
    proposedCode
  );
  
  // 3. Validate against architecture
  const validation = await memoryLayer.validateArchitecture(
    "src/auth/oauth.ts",
    proposedCode
  );
  
  // 4. Generate code with MemoryLayer insights
  return generateCode(context, patterns, validation);
}

// ============================================================================
// MEMORYLAYER TOOLS USED BY EACH AGENT
// ============================================================================

/**
 * PHASE 0: Why Agent
 * Questions: Should this feature exist?
 */
const whyAgentTools = {
  // Find similar existing code
  search_codebase: "Check if feature already exists",
  
  // Learn from past mistakes
  get_failures: "Did similar features fail before?",
  
  // Check architectural alignment
  check_conflicts: "Does this conflict with decisions?",
  
  // Get context
  get_context: "Understand current codebase"
};

/**
 * PHASE 1: Research Agent
 * Investigates: What do we need to know?
 */
const researchAgentTools = {
  // Deep codebase search
  search_codebase: "Find all related code",
  
  // Find reusable components
  suggest_existing: "What can we reuse?",
  
  // Pattern discovery
  list_patterns: "What patterns apply?",
  
  // Historical learning
  get_retrospectives: "What did we learn before?",
  get_failures: "What failed previously?",
  
  // Architecture
  list_sources: "What decisions exist?",
  get_architecture: "Current system design",
  
  // Project context
  what_changed: "Recent activity",
  get_changelog: "What's in flight"
};

/**
 * PHASE 2: Planner Agent
 * Plans: What's the vertical slice?
 */
const plannerAgentTools = {
  // Understand current structure
  get_architecture: "System architecture",
  get_context: "Full codebase context",
  
  // Check constraints
  list_sources: "Architectural decisions",
  list_patterns: "Patterns to follow"
};

/**
 * PHASE 2: Architect Agent
 * Designs: Technical architecture
 */
const architectAgentTools = {
  // Pattern validation
  check_pattern_compliance: "Does design follow patterns?",
  list_patterns: "Available patterns",
  
  // Architecture fit
  get_architecture: "Where does this fit?",
  validate_architecture: "Is this valid?",
  
  // Record decisions
  record_decision: "Log new decisions"
};

/**
 * PHASE 2: Security Agent
 * Reviews: Security implications
 */
const securityAgentTools = {
  // Get existing security setup
  get_context: "Current security implementation",
  search_codebase: "Find auth/security code",
  
  // Check patterns
  list_patterns: "Security patterns"
};

/**
 * PHASE 4: Builder Agent
 * Builds: Production code
 */
const builderAgentTools = {
  // Get smart context
  get_context: "Context for current file",
  
  // Pattern validation
  check_pattern_compliance: "Follow patterns",
  validate_architecture: "Validate structure",
  
  // Documentation
  generate_docs: "Generate component docs"
};

/**
 * PHASE 4: Tester Agent
 * Tests: Test generation & validation
 */
const testerAgentTools = {
  // Find related tests
  search_codebase: "Find existing tests",
  
  // Test awareness
  predict_test_failures: "What might break?",
  get_test_coverage: "Current coverage",
  
  // Validate
  check_tests: "Run and validate tests"
};

/**
 * ALWAYS: Moderator Agent
 * Oversees: Everything
 */
const moderatorAgentTools = {
  // Document management
  generate_docs: "Update living docs",
  
  // Pattern learning
  learn_pattern: "Learn new patterns",
  
  // Decision tracking
  record_decision: "Log decisions",
  check_conflicts: "Detect conflicts",
  
  // Learning
  log_failure: "Log failures",
  log_retrospective: "Capture learnings",
  update_estimate: "Track estimates",
  
  // Change tracking
  what_changed: "Detect changes"
};

// ============================================================================
// DATA FLOW EXAMPLE
// ============================================================================

/*
USER: "Add OAuth authentication"
│
▼
┌────────────────────────────────────────────────────────────┐
│ TOOL: build                                                │
│ Action: Trigger orchestrator                               │
└────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────┐
│ AGENT: Why Agent                                           │
│ Uses MemoryLayer:                                          │
│   1. search_codebase("OAuth") → Finds auth/login.ts        │
│   2. get_failures("OAuth") → Finds 1 past failure          │
│   3. check_conflicts("OAuth") → No conflicts               │
│ Result: "simplify" (use existing auth)                     │
└────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────┐
│ AGENT: Research Agent                                      │
│ Uses MemoryLayer:                                          │
│   1. search_codebase() → Finds 5 related files             │
│   2. list_patterns("auth") → Finds JWT pattern             │
│   3. get_retrospectives() → Learned OAuth lessons          │
│ Result: Prior art + 2 approaches                           │
└────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────┐
│ AGENT: Architect Agent                                     │
│ Uses MemoryLayer:                                          │
│   1. check_pattern_compliance() → Validates design         │
│   2. record_decision() → Logs "Use JWT" decision           │
│ Result: File plan + architecture                           │
└────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────┐
│ AGENT: Builder Agent                                       │
│ Uses MemoryLayer (for each file):                          │
│   1. get_context("src/auth/oauth.ts") → Gets context       │
│   2. check_pattern_compliance() → Validates code           │
│   3. generate_docs() → Updates CODEBASE_MAP                │
│ Result: Production code                                    │
└────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────┐
│ AGENT: Moderator Agent (always running)                    │
│ Uses MemoryLayer:                                          │
│   After each agent:                                        │
│   1. generate_docs() → Updates documentation               │
│   After completion:                                        │
│   2. log_retrospective() → Captures learnings              │
│   3. learn_pattern() → Records new patterns                │
└────────────────────────────────────────────────────────────┘
*/

// ============================================================================
// KEY INSIGHT: AGENTS ARE MEMORYLAYER CLIENTS
// ============================================================================

/**
 * Agents don't "own" data - they USE MemoryLayer:
 * 
 * ✓ Agents query MemoryLayer for context
 * ✓ Agents use MemoryLayer to learn from history
 * ✓ Agents validate against MemoryLayer patterns
 * ✓ Moderator updates MemoryLayer with results
 * 
 * This means:
 * - Data is persistent across sessions
 * - Agents get smarter over time
 * - No duplication of knowledge
 * - Single source of truth
 */

export default {};
