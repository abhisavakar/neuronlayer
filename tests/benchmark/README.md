# MemoryLayer Automated Testing Framework

Complete automated benchmarking suite for validating MemoryLayer's 100x improvement claim.

## 🎯 Overview

This testing framework provides **100% automated** benchmarking to compare MemoryLayer (WITH MCP) against traditional methods (WITHOUT MCP). No human testing required - everything runs automatically.

### What We Measure

| Dimension | Without MCP | With MemoryLayer | Target |
|-----------|-------------|------------------|--------|
| **Speed** | Grep/file reading | Vector search | 10x faster |
| **Efficiency** | 200K tokens/query | 6K tokens/query | 97% reduction |
| **Quality** | Keyword matching | Semantic understanding | 2x better |
| **Cost** | $0.60/query | $0.018/query | 33x cheaper |

## 📁 Files Created

```
tests/benchmark/
├── test-scenarios.ts      # 70 test queries across 6 categories
├── test-harness.ts        # Core benchmark execution engine
├── run-benchmarks.ts      # CLI runner script
├── analyze-results.ts     # Statistical analysis & reporting
└── README.md              # This file

TESTING.md                 # Complete testing methodologyenchmark-results/         # Generated results (created at runtime)
```

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js >= 18.0.0
node --version

# Install dependencies
npm install

# Build the project
npm run build
```

### Run Benchmarks

```bash
# Quick benchmark (10 iterations, 20 queries) - ~5 minutes
npm run benchmark:quick

# Full benchmark (50 iterations, 70 queries) - ~30 minutes
npm run benchmark

# Run on specific project
npm run benchmark -- --project ./my-project

# Run specific task type only
npm run benchmark -- --task bug_fix

# Custom configuration
npm run benchmark -- --iterations 100 --output ./results
```

### Analyze Results

```bash
# Analyze a results file
npm run benchmark:analyze benchmark-results/raw-results-2026-02-15.json

# Analyze with custom output directory
npm run benchmark:analyze results.json --output ./analysis
```

## 📊 Test Coverage

### 70 Test Queries Across 6 Categories

1. **Information Retrieval** (20 queries)
   - Type definitions
   - Function location
   - Dependencies
   - Configuration
   - Architecture
   - Patterns

2. **Bug Diagnosis** (10 queries)
   - Null reference errors
   - Flow tracing
   - State issues
   - Async problems
   - Security vulnerabilities

3. **Feature Implementation** (10 queries)
   - Code reuse
   - Pattern matching
   - Integration
   - Testing examples
   - Documentation

4. **Code Understanding** (10 queries)
   - Project overview
   - Data flow
   - Business logic
   - Design patterns
   - Architecture decisions

5. **Refactoring** (10 queries)
   - Module extraction
   - Code consolidation
   - Interface segregation
   - Dependency injection
   - Dead code removal

6. **Code Review** (10 queries)
   - Security review
   - Pattern adherence
   - Bug detection
   - Performance review
   - Type safety

### 3 Project Sizes Tested

- **Small**: 10K LOC (Express Todo API)
- **Medium**: 50-100K LOC (MemoryLayer itself)
- **Large**: 1M LOC (VS Code Extension Samples)

## 📈 Metrics Collected

### Performance Metrics
- Search latency (ms)
- Context assembly time (ms)
- Response time (ms)
- Index speed (LOC/minute)

### Efficiency Metrics
- Token usage per query
- Token reduction percentage
- Estimated cost per query
- Cache hit rate

### Quality Metrics
- Precision@10
- Recall
- F1 Score
- Task success rate

### Statistical Metrics
- Mean, median, std dev
- Percentiles (p50, p95, p99)
- Effect size (Cohen's d)
- P-values
- Confidence intervals

## 📊 Output Files

After running benchmarks, you'll find:

```
benchmark-results/
├── raw-results-<timestamp>.json       # All individual query results
├── summary-<timestamp>.json            # Aggregated statistics
├── report-<timestamp>.md               # Human-readable report
├── analysis-<timestamp>.json           # Detailed statistical analysis
├── white-paper-analysis-<timestamp>.md # White paper ready analysis
└── statistics-<timestamp>.md           # Summary statistics
```

## 🎓 Usage Examples

### Example 1: Quick Validation

```bash
# Run quick benchmark on current project
npm run benchmark:quick

# Check results
cat benchmark-results/report-*.md
```

### Example 2: Full White Paper Study

```bash
# 1. Run full benchmark
npm run benchmark

# 2. Analyze results
npm run benchmark:analyze benchmark-results/raw-results-*.json

# 3. Check white paper analysis
cat benchmark-results/white-paper-analysis-*.md
```

### Example 3: Compare Task Types

```bash
# Run each task type separately
npm run benchmark -- --task information_retrieval --output ./results/ir
npm run benchmark -- --task bug_fix --output ./results/bugfix
npm run benchmark -- --task feature_add --output ./results/feature

# Compare results
npm run benchmark:analyze ./results/ir/raw-results-*.json
npm run benchmark:analyze ./results/bugfix/raw-results-*.json
npm run benchmark:analyze ./results/feature/raw-results-*.json
```

### Example 4: Custom Project

```bash
# Benchmark a specific project
npm run benchmark -- \
  --project /path/to/my-project \
  --iterations 100 \
  --output ./my-project-benchmark
```

## 📖 Methodology

### How It Works

1. **Baseline (WITHOUT MCP)**
   - Uses grep/ripgrep for file search
   - Reads entire files for context
   - No semantic understanding
   - No persistent memory

2. **Treatment (WITH MemoryLayer)**
   - Uses vector embeddings for semantic search
   - Assembles 6K token context automatically
   - Understands code relationships
   - Remembers architectural decisions

3. **Comparison**
   - Same queries run in both modes
   - Metrics collected for each
   - Statistical analysis performed
   - Improvements calculated

### Statistical Rigor

- **Sample Size**: 50 iterations × 70 queries = 3,500+ data points
- **Significance Testing**: Paired t-tests with p < 0.05
- **Effect Size**: Cohen's d for practical significance
- **Confidence Intervals**: 95% CI for all metrics
- **Reproducibility**: Fixed seeds, version pinning, documented methodology

## 🔬 Validation Criteria

### Minimum Acceptable
- Speedup: ≥ 5x
- Token reduction: ≥ 90%
- Statistical significance: p < 0.05
- Effect size: Cohen's d > 0.5

### Target (100x Claim)
- Speedup: ≥ 10x
- Token reduction: ≥ 97%
- Success rate: ≥ 90%
- Effect size: Cohen's d > 0.8

### Exceptional
- Speedup: ≥ 100x
- Token reduction: ≥ 99%
- Success rate: ≥ 95%
- Effect size: Cohen's d > 1.2

## 📝 Interpreting Results

### Speedup Interpretation

| Speedup | Interpretation |
|---------|----------------|
| 2-5x | Moderate improvement |
| 5-10x | Good improvement |
| 10-50x | Excellent improvement |
| 50-100x | Outstanding improvement |
| 100x+ | Exceptional improvement |

### Effect Size (Cohen's d)

| d value | Effect Size |
|---------|-------------|
| 0.2 | Small |
| 0.5 | Medium |
| 0.8 | Large |
| 1.2 | Very large |
| 2.0+ | Huge |

### Statistical Significance

- **p < 0.05**: Statistically significant
- **p < 0.01**: Highly significant
- **p < 0.001**: Very highly significant

## 🐛 Troubleshooting

### Issue: "Cannot find module"

```bash
# Make sure you've built the project
npm run build

# Or run with ts-node
npx ts-node --esm tests/benchmark/run-benchmarks.ts
```

### Issue: "Out of memory"

```bash
# For large projects, increase Node memory
node --max-old-space-size=4096 ./dist/index.js

# Or run with less iterations
npm run benchmark -- --iterations 10
```

### Issue: "Grep not found"

Windows users may need to install grep:
```bash
# Using Git Bash (recommended)
# Or install via Chocolatey
choco install grep

# Or use WSL
wsl npm run benchmark
```

### Issue: Slow execution

```bash
# Use quick mode for testing
npm run benchmark:quick

# Or reduce iterations
npm run benchmark -- --iterations 10
```

## 🔧 Customization

### Adding Custom Queries

Edit `tests/benchmark/test-scenarios.ts`:

```typescript
export const myCustomQueries: TestQuery[] = [
  {
    id: 'custom-001',
    category: 'my_category',
    description: 'My custom test',
    query: 'Find all functions that...',
    expectedFiles: ['src/myfile.ts'],
    difficulty: 'medium'
  }
];
```

### Changing Iterations

```bash
# Via CLI
npm run benchmark -- --iterations 100

# Or edit test-harness.ts
const config = {
  iterations: 100,  // Change this
  warmupRuns: 10
};
```

### Custom Output Format

Edit `analyze-results.ts` to customize reports:

```typescript
// Add custom metrics
const myCustomMetric = calculateCustomMetric(results);

// Customize report template
const report = `
# My Custom Report
Custom metric: ${myCustomMetric}
`;
```

## 📚 Documentation

- **TESTING.md** - Complete testing methodology
- **test-scenarios.ts** - Query definitions with inline docs
- **test-harness.ts** - Harness API documentation
- **run-benchmarks.ts** - CLI help (`--help`)

## 🤝 Contributing

To improve the testing framework:

1. Add more diverse test queries
2. Support additional programming languages
3. Add visualization generation
4. Implement additional statistical tests
5. Create CI/CD integration

## 📄 License

Part of MemoryLayer project - see main LICENSE file.

## 🎯 Next Steps

1. ✅ Review TESTING.md for full methodology
2. ✅ Run `npm run benchmark:help` for CLI options
3. ✅ Start with `npm run benchmark:quick` for validation
4. ✅ Run full benchmark with `npm run benchmark`
5. ✅ Analyze results with `npm run benchmark:analyze`
6. ✅ Use white-paper-analysis.md for publication

---

**Ready to validate the 100x claim?** Run:

```bash
npm run benchmark
```

Results will be saved to `./benchmark-results/` with full statistical analysis ready for white paper publication.
