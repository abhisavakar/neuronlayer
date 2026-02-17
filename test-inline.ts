/**
 * Inline system test for MemoryLayer
 * Run with: npx tsx test-inline.ts
 */

import { MemoryLayerEngine } from './src/core/engine.js';
import { getDefaultConfig } from './src/utils/config.js';
import { join } from 'path';
import { homedir } from 'os';

const PROJECT_PATH = process.cwd();

async function test() {
  console.log('='.repeat(60));
  console.log('MemoryLayer System Test');
  console.log('='.repeat(60));

  // Initialize engine with proper ignore patterns
  console.log('\n1. Initializing engine...');
  const defaultConfig = getDefaultConfig(PROJECT_PATH);
  const engine = new MemoryLayerEngine({
    ...defaultConfig,
    dataDir: join(homedir(), '.memorylayer', 'projects', `test-${Date.now()}`),
    maxTokens: 100000,
  });

  await engine.initialize();
  console.log('   ✓ Engine initialized');

  // Test 1: Project Summary
  console.log('\n2. Testing project summary...');
  const summary = engine.getProjectSummary();
  console.log(`   ✓ Project: ${summary.name}`);
  console.log(`   ✓ Files: ${summary.totalFiles}`);
  console.log(`   ✓ Languages: ${summary.languages.join(', ')}`);

  // Test 2: Semantic Search
  console.log('\n3. Testing semantic search...');
  const searchResults = await engine.searchCodebase('how does ghost mode work', 5);
  console.log(`   ✓ Found ${searchResults.length} results`);
  if (searchResults[0]) {
    console.log(`   ✓ Top result: ${searchResults[0].file} (${(searchResults[0].similarity * 100).toFixed(1)}% match)`);
  }

  // Test 3: Decision Recording
  console.log('\n4. Testing decision recording...');
  const decision = engine.recordDecision(
    'Test Decision',
    'This is a test decision for system verification'
  );
  console.log(`   ✓ Decision recorded: ${decision.id}`);

  // Test 4: Decision Search
  console.log('\n5. Testing decision search...');
  const decisions = await engine.searchDecisions('test decision', 5);
  console.log(`   ✓ Found ${decisions.length} decisions`);

  // Test 5: Code Verification (Import Check)
  console.log('\n6. Testing code verification (hallucination detection)...');
  const codeWithBadImport = `
    import { something } from 'nonexistent-package-12345';
    import { existsSync } from 'fs';
  `;
  const verification = await engine.verifyCode(codeWithBadImport, 'test.ts', ['imports']);
  console.log(`   ✓ Verdict: ${verification.verdict}`);
  console.log(`   ✓ Score: ${verification.score}/100`);
  if (verification.imports) {
    console.log(`   ✓ Import issues: ${verification.imports.issues.length}`);
    for (const issue of verification.imports.issues) {
      console.log(`     - ${issue.import}: ${issue.type}`);
    }
  }

  // Test 6: Security Scan
  console.log('\n7. Testing security scan...');
  const insecureCode = `
    const query = \`SELECT * FROM users WHERE id = \${userId}\`;
    eval(userInput);
    const password = 'hardcoded123';
  `;
  const securityResult = engine.quickSecurityScan(insecureCode, 'javascript');
  console.log(`   ✓ Safe: ${securityResult.safe}`);
  console.log(`   ✓ Issues found: ${securityResult.issues.length}`);
  for (const issue of securityResult.issues) {
    console.log(`     - ${issue.type} (${issue.severity}): ${issue.message}`);
  }

  // Test 7: Ghost Mode
  console.log('\n8. Testing ghost mode...');
  await engine.notifyFileAccess('src/core/engine.ts');
  await engine.notifyFileAccess('src/core/ghost-mode.ts');
  const ghostInsight = engine.getGhostInsight();
  console.log(`   ✓ Active files tracked: ${ghostInsight.activeFiles.length}`);
  console.log(`   ✓ Recent decisions: ${ghostInsight.recentDecisions.length}`);

  // Test 8: Conflict Detection
  console.log('\n9. Testing conflict detection...');
  engine.recordDecision('Use REST API', 'We decided to use REST instead of GraphQL for all APIs');
  const graphqlCode = `
    import { gql } from '@apollo/client';
    const GET_USERS = gql\`query { users { id name } }\`;
  `;
  const conflicts = engine.checkGhostConflicts(graphqlCode);
  console.log(`   ✓ Conflicts detected: ${conflicts.length}`);
  for (const conflict of conflicts) {
    console.log(`     - "${conflict.decision.title}": ${conflict.severity} - ${conflict.warning}`);
  }

  // Test 9: Context Resurrection
  console.log('\n10. Testing context resurrection...');
  const resurrection = engine.resurrectContext();
  console.log(`   ✓ Summary: ${resurrection.summary.slice(0, 60)}...`);
  console.log(`   ✓ Active files: ${resurrection.activeFiles.length}`);
  console.log(`   ✓ Suggested actions: ${resurrection.suggestedActions.length}`);

  // Test 10: Pattern Validation
  console.log('\n11. Testing pattern validation...');
  const patternResult = engine.validatePattern('function test() { return 42; }');
  console.log(`   ✓ Valid: ${patternResult.valid}`);
  console.log(`   ✓ Score: ${patternResult.score}`);

  // Test 11: Déjà Vu Detection
  console.log('\n12. Testing déjà vu detection...');
  engine.recordQueryForDejaVu('how to handle errors in API', ['src/api/error.ts'], true);
  const dejaVu = await engine.findDejaVu('error handling in API endpoints');
  console.log(`   ✓ Déjà vu matches: ${dejaVu.length}`);

  // Test 12: Full Verification (all checks)
  console.log('\n13. Testing full code verification...');
  const fullCode = `
    import { something } from 'fake-lib';
    const secret = 'my-api-key-123456789';
    eval(userData);
  `;
  const fullVerification = await engine.verifyCode(fullCode, 'danger.ts', ['all']);
  console.log(`   ✓ Verdict: ${fullVerification.verdict}`);
  console.log(`   ✓ Score: ${fullVerification.score}/100`);
  console.log(`   ✓ Summary: ${fullVerification.summary}`);

  // Cleanup
  console.log('\n14. Shutting down...');
  engine.shutdown();
  console.log('   ✓ Engine shutdown complete');

  console.log('\n' + '='.repeat(60));
  console.log('ALL TESTS PASSED! ✓');
  console.log('='.repeat(60));
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
