/**
 * Memory Record Gateway
 *
 * Routes to: record_decision, record_decision_with_author, learn_pattern,
 * mark_context_useful, set_feature_context, mark_critical, add_pattern_example
 */

import type { MemoryLayerEngine } from '../../core/engine.js';
import type { MemoryRecordInput, MemoryRecordResponse } from './types.js';
import { detectRecordType, validateRecordInput } from './router.js';

/**
 * Handle a memory_record gateway call
 */
export async function handleMemoryRecord(
  engine: MemoryLayerEngine,
  input: MemoryRecordInput
): Promise<MemoryRecordResponse> {
  // Validate input
  const validation = validateRecordInput(input);
  if (!validation.valid) {
    return {
      success: false,
      type: validation.type,
      message: validation.error || 'Invalid input',
    };
  }

  const recordType = validation.type;

  // Pre-check conflicts for decisions
  let warnings: MemoryRecordResponse['warnings'] = undefined;
  if (recordType === 'decision' && input.code) {
    const conflicts = await engine.checkCodeConflicts(input.code);
    if (conflicts.hasConflicts) {
      warnings = conflicts.conflicts.map(c => ({
        type: 'conflict',
        message: `Conflicts with decision "${c.decisionTitle}": ${c.conflictDescription}`,
        severity: c.severity as 'low' | 'medium' | 'high',
      }));
    }
  }

  // Route to appropriate recording method
  switch (recordType) {
    case 'decision':
      return handleRecordDecision(engine, input, warnings);

    case 'pattern':
      return handleRecordPattern(engine, input);

    case 'example':
      return handleRecordPatternExample(engine, input);

    case 'feedback':
      return handleRecordFeedback(engine, input);

    case 'feature':
      return handleRecordFeature(engine, input);

    case 'critical':
      return handleRecordCritical(engine, input);

    default:
      return {
        success: false,
        type: recordType,
        message: `Unknown record type: ${recordType}`,
      };
  }
}

/**
 * Record a decision
 */
async function handleRecordDecision(
  engine: MemoryLayerEngine,
  input: MemoryRecordInput,
  warnings?: MemoryRecordResponse['warnings']
): Promise<MemoryRecordResponse> {
  const title = input.title!;
  const description = input.content;

  let decision;

  if (input.author) {
    // Use author-attributed decision recording
    decision = await engine.recordDecisionWithAuthor(
      title,
      description,
      input.author,
      input.files,
      input.tags,
      input.status || 'accepted'
    );
  } else {
    // Use simple decision recording
    decision = await engine.recordDecision(
      title,
      description,
      input.files,
      input.tags
    );
  }

  return {
    success: true,
    type: 'decision',
    id: decision.id,
    message: `Decision recorded: "${title}"`,
    warnings,
    record: {
      id: decision.id,
      title: decision.title,
      description: decision.description,
      author: decision.author,
      status: decision.status,
      files: decision.files,
      tags: decision.tags,
      created_at: decision.createdAt.toISOString(),
    },
  };
}

/**
 * Record a pattern
 */
async function handleRecordPattern(
  engine: MemoryLayerEngine,
  input: MemoryRecordInput
): Promise<MemoryRecordResponse> {
  const code = input.code!;
  const name = input.pattern_name || input.title!;
  const description = input.content || undefined;
  const category = input.category || undefined;

  const result = engine.learnPattern(code, name, description, category);

  return {
    success: result.success,
    type: 'pattern',
    id: result.patternId,
    message: result.message,
  };
}

/**
 * Add an example to a pattern
 */
async function handleRecordPatternExample(
  engine: MemoryLayerEngine,
  input: MemoryRecordInput
): Promise<MemoryRecordResponse> {
  const patternId = input.pattern_id!;
  const code = input.code!;
  const explanation = input.explanation || input.content;
  const isAntiPattern = input.is_anti_pattern || false;

  const success = engine.addPatternExample(patternId, code, explanation, isAntiPattern);

  if (!success) {
    return {
      success: false,
      type: 'example',
      message: `Pattern not found: ${patternId}`,
    };
  }

  return {
    success: true,
    type: 'example',
    message: `${isAntiPattern ? 'Anti-pattern' : 'Example'} added to pattern ${patternId}`,
    record: {
      pattern_id: patternId,
      is_anti_pattern: isAntiPattern,
    },
  };
}

/**
 * Record feedback about context usefulness
 */
async function handleRecordFeedback(
  engine: MemoryLayerEngine,
  input: MemoryRecordInput
): Promise<MemoryRecordResponse> {
  const query = input.query || input.content;
  const wasUseful = input.was_useful!;

  engine.markContextUsefulness(query, wasUseful);

  return {
    success: true,
    type: 'feedback',
    message: `Feedback recorded: context was ${wasUseful ? 'useful' : 'not useful'}`,
    record: {
      query,
      was_useful: wasUseful,
    },
  };
}

/**
 * Start tracking a feature context
 */
async function handleRecordFeature(
  engine: MemoryLayerEngine,
  input: MemoryRecordInput
): Promise<MemoryRecordResponse> {
  const name = input.content;

  const context = engine.startFeatureContext(name);

  // Track initial files if provided
  if (input.files && input.files.length > 0) {
    for (const file of input.files) {
      engine.trackFileOpened(file);
    }
  }

  return {
    success: true,
    type: 'feature',
    id: context.id,
    message: `Now tracking feature: "${name}"`,
    record: {
      id: context.id,
      name: context.name,
      files: input.files || [],
    },
  };
}

/**
 * Mark content as critical (never compressed)
 */
async function handleRecordCritical(
  engine: MemoryLayerEngine,
  input: MemoryRecordInput
): Promise<MemoryRecordResponse> {
  const content = input.content;
  const type = input.critical_type;
  const reason = input.reason;

  const critical = engine.markCritical(content, { type, reason });

  return {
    success: true,
    type: 'critical',
    id: critical.id,
    message: `Marked as critical: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`,
    record: {
      id: critical.id,
      type: critical.type,
      content: critical.content,
      reason: critical.reason,
      never_compress: critical.neverCompress,
      created_at: critical.createdAt.toISOString(),
    },
  };
}
