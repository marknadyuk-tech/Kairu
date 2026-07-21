// KAIRU Skill Graph loader + player overlay (Track 3a).
// See SKILL_GRAPH_INVARIANT_TEST_BRIEF.md for the seven invariant cases this
// implements (EC1-EC7). Ground truth: data/skill-graph/skill_nodes.json
// (17,587 nodes) + skill_edges.json (23,819 edges), served from
// public/data/skill-graph/ so the fetch works under both file:// script-tag
// loading paths and the hosted Vercel deployment.
//
// Player overlay follows the same two-table shape as
// deriveEconomicAgency/economic_agency_events (assets/kairu-app.js:1978,
// 2004): an append-only raw event log is the sole source of truth, and a
// current-state table is a cache derived from it, never the reverse.
//   - `skill_graph_overlay_events` (SOURCE OF TRUTH): append-only, every
//     logged event kept forever, each stamped with `occurred_at` (ISO) and
//     a monotonic `seq` so "latest" is never dependent on array position.
//   - `skill_graph_overlay` (CACHE): exactly one row per (user_id, node_id)
//     per the locked schema contract -- user_id, node_id, state,
//     current_level, xp, source, initiatedBy -- always rebuilt from the
//     event log, never hand-edited. If deleted, `rebuildSkillGraphOverlayFromEvents`
//     reconstructs it byte-for-byte from the event log alone (rawInputs
//     guarantee).
// Neither table is ever merged into the shared node/edge structures.

const SKILL_GRAPH_SCHEMA_VERSION = '1.0';
const SKILL_GRAPH_OVERLAY_STORAGE_KEY = 'skill_graph_overlay';
const SKILL_GRAPH_EVENTS_STORAGE_KEY = 'skill_graph_overlay_events';
const SKILL_GRAPH_DATA_PATH = 'data/skill-graph';
const SKILL_GRAPH_OVERLAY_REQUIRED_FIELDS = [
  'user_id', 'node_id', 'state', 'current_level', 'xp', 'source', 'initiatedBy'
];
let worldTreeManifestPromise = null;
let careerNodeMapPromise = null;
let fullSkillGraphPromise = null;

function loadWorldTreeManifest(fetchImpl) {
  if (worldTreeManifestPromise) return worldTreeManifestPromise;

  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) {
    return Promise.reject(new Error('world-tree: no fetch implementation available'));
  }

  worldTreeManifestPromise = Promise.resolve(
    doFetch(`${SKILL_GRAPH_DATA_PATH}/skill_render_manifest.json`)
  ).then((response) => {
    if (response && 'ok' in response && !response.ok) {
      throw new Error(`world-tree: manifest request failed (${response.status})`);
    }
    return response.json();
  }).then((manifest) => {
    if (!Array.isArray(manifest)) {
      throw new Error('world-tree: manifest payload must be an array');
    }
    return manifest;
  }).catch((error) => {
    worldTreeManifestPromise = null;
    throw error;
  });

  return worldTreeManifestPromise;
}

function loadCareerNodeMap(fetchImpl) {
  if (careerNodeMapPromise) return careerNodeMapPromise;

  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) {
    return Promise.reject(new Error('world-tree: no fetch implementation available'));
  }

  careerNodeMapPromise = Promise.resolve(
    doFetch(`${SKILL_GRAPH_DATA_PATH}/career_node_map.json`)
  ).then((response) => {
    if (response && 'ok' in response && !response.ok) {
      throw new Error(`world-tree: career node map request failed (${response.status})`);
    }
    return response.json();
  }).then((nodeMap) => {
    if (
      !nodeMap ||
      typeof nodeMap !== 'object' ||
      Array.isArray(nodeMap) ||
      !nodeMap.careers ||
      typeof nodeMap.careers !== 'object' ||
      Array.isArray(nodeMap.careers)
    ) {
      throw new Error('world-tree: career node map payload must include a careers object');
    }
    return nodeMap;
  }).catch((error) => {
    careerNodeMapPromise = null;
    throw error;
  });

  return careerNodeMapPromise;
}

function buildSkillGraph(nodes, edges) {
  const nodesById = new Map();
  for (const node of nodes) {
    nodesById.set(node.id, { ...node, parents: [], children: [] });
  }
  for (const edge of edges) {
    const child = nodesById.get(edge.child_id);
    const parent = nodesById.get(edge.parent_id);
    if (!child || !parent) {
      throw new Error(
        `skill-graph: edge references missing node (child_id=${edge.child_id}, parent_id=${edge.parent_id})`
      );
    }
    child.parents.push(edge.parent_id);
    parent.children.push(edge.child_id);
  }
  return {
    schemaVersion: SKILL_GRAPH_SCHEMA_VERSION,
    nodesById,
    nodeCount: nodesById.size,
    edgeCount: edges.length,
    getNode: (id) => nodesById.get(id) || null,
    getParents: (id) => (nodesById.get(id)?.parents || []).slice(),
    getChildren: (id) => (nodesById.get(id)?.children || []).slice(),
  };
}

async function loadSkillGraph(fetchImpl) {
  if (fullSkillGraphPromise) return fullSkillGraphPromise;

  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) {
    throw new Error('skill-graph: no fetch implementation available');
  }

  fullSkillGraphPromise = Promise.all([
    doFetch(`${SKILL_GRAPH_DATA_PATH}/skill_nodes.json`),
    doFetch(`${SKILL_GRAPH_DATA_PATH}/skill_edges.json`),
  ]).then(([nodesRes, edgesRes]) => {
    if (nodesRes && 'ok' in nodesRes && !nodesRes.ok) {
      throw new Error(`skill-graph: nodes request failed (${nodesRes.status})`);
    }
    if (edgesRes && 'ok' in edgesRes && !edgesRes.ok) {
      throw new Error(`skill-graph: edges request failed (${edgesRes.status})`);
    }
    return Promise.all([nodesRes.json(), edgesRes.json()]);
  }).then(([nodes, edges]) => buildSkillGraph(nodes, edges))
    .catch((error) => {
      fullSkillGraphPromise = null;
      throw error;
    });

  return fullSkillGraphPromise;
}

// -- Player overlay: append-only event log (source of truth) + a current-
// -- state cache table, exactly one row per (user_id, node_id).

function readJsonArray(key, storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return [];
  const raw = store.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key, rows, storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return;
  store.setItem(key, JSON.stringify(rows));
}

function readSkillGraphEvents(storage) {
  return readJsonArray(SKILL_GRAPH_EVENTS_STORAGE_KEY, storage);
}

function writeSkillGraphEvents(rows, storage) {
  writeJsonArray(SKILL_GRAPH_EVENTS_STORAGE_KEY, rows, storage);
}

function readSkillGraphOverlay(storage) {
  return readJsonArray(SKILL_GRAPH_OVERLAY_STORAGE_KEY, storage);
}

function writeSkillGraphOverlay(rows, storage) {
  writeJsonArray(SKILL_GRAPH_OVERLAY_STORAGE_KEY, rows, storage);
}

// Pure: derives the current-state cache from the raw event log alone. Used
// both to update the cache after logging an event and to prove the cache is
// fully reconstructable if it were ever deleted (rawInputs guarantee).
//
// RULING (2026-07-04, WORKLOG): current_level here is cumulative earned
// progress and does NOT decay, unlike Economic Agency's
// deriveEconomicAgencyFaculty() current_score/current_level, which applies a
// per-faculty half-life to raw event points. Do not port that decay logic
// here without a fresh ruling -- this was a deliberate decision made after
// checking both CLAUDE.md and the SkillsLayer spec for a skill-decay
// doctrine and finding none, not an oversight inherited from copying the
// event-log-plus-cache storage shape. If revisited: current_level is always
// derived from the immutable event log below, so adding decay later is a new
// derivation function, not a data migration.
function deriveSkillGraphOverlayFromEvents(events) {
  const latestByKey = new Map();
  for (const event of events) {
    const key = `${event.user_id}::${event.node_id}`;
    const existing = latestByKey.get(key);
    if (
      !existing ||
      event.occurred_at > existing.occurred_at ||
      (event.occurred_at === existing.occurred_at && event.seq > existing.seq)
    ) {
      latestByKey.set(key, event);
    }
  }
  return Array.from(latestByKey.values()).map((event) => {
    const row = {};
    for (const field of SKILL_GRAPH_OVERLAY_REQUIRED_FIELDS) row[field] = event[field];
    return row;
  });
}

// Rebuilds the skill_graph_overlay cache table from skill_graph_overlay_events
// alone, overwriting whatever cache currently exists. This is the operation
// that proves the cache carries no information the event log doesn't have.
function rebuildSkillGraphOverlayFromEvents(storage) {
  const rows = deriveSkillGraphOverlayFromEvents(readSkillGraphEvents(storage));
  writeSkillGraphOverlay(rows, storage);
  return rows;
}

// Records a raw overlay event (append-only, never overwritten or removed),
// stamped with an ISO timestamp and a monotonic seq so "latest" never
// depends on array position -- then rebuilds the current-state cache from
// the full event log (rawInputs principle, CLAUDE.md §4).
function logSkillGraphEvent(event, storage) {
  for (const field of SKILL_GRAPH_OVERLAY_REQUIRED_FIELDS) {
    if (!(field in event)) {
      throw new Error(`skill-graph overlay event missing required field: ${field}`);
    }
  }
  const events = readSkillGraphEvents(storage);
  const nextSeq = events.length === 0 ? 0 : Math.max(...events.map((e) => e.seq)) + 1;
  const fullEvent = {
    ...event,
    occurred_at: new Date().toISOString(),
    seq: nextSeq,
  };
  events.push(fullEvent);
  writeSkillGraphEvents(events, storage);
  rebuildSkillGraphOverlayFromEvents(storage);
  return fullEvent;
}

// Reads current state for (user_id, node_id) from the cache table -- exactly
// one row per touched node, per the locked schema contract.
function getSkillGraphOverlayState(userId, nodeId, storage) {
  const rows = readSkillGraphOverlay(storage).filter(
    (row) => row.user_id === userId && row.node_id === nodeId
  );
  return rows.length > 0 ? rows[0] : null;
}

// Nodes with any overlay history for a given player (sparse -- only touched nodes).
function getSkillGraphTouchedNodeIds(userId, storage) {
  const rows = readSkillGraphOverlay(storage).filter((row) => row.user_id === userId);
  return Array.from(new Set(rows.map((row) => row.node_id)));
}

if (typeof window !== 'undefined') {
  window.KAIRU = window.KAIRU || {};
  window.KAIRU.skillGraph = {
    schemaVersion: SKILL_GRAPH_SCHEMA_VERSION,
    load: loadSkillGraph,
    loadWorldTreeManifest,
    loadCareerNodeMap,
    build: buildSkillGraph,
    logEvent: logSkillGraphEvent,
    getOverlayState: getSkillGraphOverlayState,
    getTouchedNodeIds: getSkillGraphTouchedNodeIds,
    readOverlay: readSkillGraphOverlay,
    readEvents: readSkillGraphEvents,
    rebuildOverlayFromEvents: rebuildSkillGraphOverlayFromEvents,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SKILL_GRAPH_SCHEMA_VERSION,
    SKILL_GRAPH_OVERLAY_STORAGE_KEY,
    SKILL_GRAPH_EVENTS_STORAGE_KEY,
    buildSkillGraph,
    loadSkillGraph,
    loadWorldTreeManifest,
    loadCareerNodeMap,
    readSkillGraphOverlay,
    writeSkillGraphOverlay,
    readSkillGraphEvents,
    writeSkillGraphEvents,
    deriveSkillGraphOverlayFromEvents,
    rebuildSkillGraphOverlayFromEvents,
    logSkillGraphEvent,
    getSkillGraphOverlayState,
    getSkillGraphTouchedNodeIds,
  };
}
