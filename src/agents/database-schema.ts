/**
 * Agent Orchestration Database Schema
 * 
 * Additional tables needed for the 18-agent orchestration layer
 * These tables store learning data, pipeline states, and agent memory
 */

export const AgentOrchestrationSchema = `
  -- ============================================================================
  -- AGENT ORCHESTRATION TABLES
  -- ============================================================================

  -- Pipeline state persistence
  CREATE TABLE IF NOT EXISTS pipeline_states (
    id TEXT PRIMARY KEY,
    feature_request TEXT NOT NULL,
    status TEXT NOT NULL,
    project_path TEXT NOT NULL,
    state_json TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_states(status);
  CREATE INDEX IF NOT EXISTS idx_pipeline_project ON pipeline_states(project_path);
  CREATE INDEX IF NOT EXISTS idx_pipeline_updated ON pipeline_states(updated_at);

  -- Failure memory - never repeat the same mistake
  CREATE TABLE IF NOT EXISTS failures (
    id TEXT PRIMARY KEY,
    feature TEXT NOT NULL,
    approach TEXT NOT NULL,
    why_failed TEXT NOT NULL,
    lesson TEXT NOT NULL,
    related_decision TEXT,
    feature_embedding BLOB,  -- For semantic similarity search
    logged_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_failures_feature ON failures(feature);
  CREATE INDEX IF NOT EXISTS idx_failures_logged ON failures(logged_at);

  -- Estimation tracking - improve estimates over time
  CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY,
    feature TEXT NOT NULL,
    estimated_sessions INTEGER,
    actual_sessions INTEGER,
    complexity_score REAL,
    files_created INTEGER,
    files_modified INTEGER,
    notes TEXT,
    completed_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_estimates_feature ON estimates(feature);
  CREATE INDEX IF NOT EXISTS idx_estimates_completed ON estimates(completed_at);

  -- Retrospectives - learn from every feature
  CREATE TABLE IF NOT EXISTS retrospectives (
    id TEXT PRIMARY KEY,
    feature TEXT NOT NULL,
    surprises TEXT,           -- What was unexpected
    would_change TEXT,        -- What would we do differently
    new_patterns TEXT,        -- JSON array of new patterns discovered
    spike_accuracy REAL,      -- How accurate was the spike
    logged_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_retrospectives_feature ON retrospectives(feature);
  CREATE INDEX IF NOT EXISTS idx_retrospectives_logged ON retrospectives(logged_at);

  -- Spike results - feasibility experiments
  CREATE TABLE IF NOT EXISTS spikes (
    id TEXT PRIMARY KEY,
    feature TEXT NOT NULL,
    question TEXT NOT NULL,
    approach TEXT NOT NULL,
    result TEXT NOT NULL,
    viable BOOLEAN,
    lessons TEXT,
    time_spent INTEGER,       -- In minutes
    logged_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_spikes_feature ON spikes(feature);
  CREATE INDEX IF NOT EXISTS idx_spikes_viable ON spikes(viable);

  -- Documentation cache - prevent outdated API usage
  CREATE TABLE IF NOT EXISTS docs_cache (
    id TEXT PRIMARY KEY,
    library TEXT NOT NULL,
    version TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    fetched_at INTEGER DEFAULT (unixepoch()),
    expires_at INTEGER,
    UNIQUE(library, version)
  );

  CREATE INDEX IF NOT EXISTS idx_docs_library ON docs_cache(library);
  CREATE INDEX IF NOT EXISTS idx_docs_expires ON docs_cache(expires_at);

  -- Complexity tracking - detect code smell early
  CREATE TABLE IF NOT EXISTS complexity_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    lines INTEGER,
    functions INTEGER,
    dependencies INTEGER,
    complexity_score REAL,
    snapshot_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_complexity_file ON complexity_snapshots(file_path);
  CREATE INDEX IF NOT EXISTS idx_complexity_snapshot ON complexity_snapshots(snapshot_at);

  -- Agent execution log - track all agent activities
  CREATE TABLE IF NOT EXISTS agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id TEXT REFERENCES pipeline_states(id),
    agent_name TEXT NOT NULL,
    phase TEXT NOT NULL,
    action TEXT NOT NULL,
    input_summary TEXT,
    output_summary TEXT,
    duration_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    timestamp INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_agent_logs_pipeline ON agent_logs(pipeline_id);
  CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_name);
  CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(timestamp);

  -- Pattern usage tracking - which patterns are actually used
  CREATE TABLE IF NOT EXISTS pattern_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_id TEXT NOT NULL,
    pipeline_id TEXT REFERENCES pipeline_states(id),
    file_path TEXT,
    compliance_score REAL,
    used_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_pattern_usage_pattern ON pattern_usage(pattern_id);
  CREATE INDEX IF NOT EXISTS idx_pattern_usage_pipeline ON pattern_usage(pipeline_id);
`;

export default AgentOrchestrationSchema;
