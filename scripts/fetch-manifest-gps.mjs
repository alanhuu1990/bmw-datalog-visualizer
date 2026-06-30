#!/usr/bin/env node
/**
 * Batch-fetch GPS from Home Assistant for each row in apexlog_datalog_manifest.csv.
 *
 * Usage:
 *   $env:HA_TOKEN = "<long-lived-access-token>"
 *   node scripts/fetch-manifest-gps.mjs --manifest "path/to/apexlog_datalog_manifest.csv"
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseCsvLine } from '../src/lib/parseDatalog.js';
import {
  buildHaHistoryUrl,
  parseHaHistoryResponse,
} from '../src/lib/integrations/homeassistant.js';
import { mergeHaSamplesToGpsTrack } from '../src/lib/integrations/gpsMerge.js';
import {
  DEFAULT_HA_ENTITY_ID,
  DEFAULT_HA_URL,
  haTokenFromEnv,
} from '../src/lib/integrations/haSettings.js';

function parseArgs(argv) {
  const opts = {
    manifest: null,
    outputDir: null,
    entity: null,
    dryRun: false,
    logId: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--manifest' && argv[i + 1]) {
      opts.manifest = argv[++i];
    } else if (arg === '--output-dir' && argv[i + 1]) {
      opts.outputDir = argv[++i];
    } else if (arg === '--entity' && argv[i + 1]) {
      opts.entity = argv[++i];
    } else if (arg === '--log-id' && argv[i + 1]) {
      opts.logId = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`Usage: node scripts/fetch-manifest-gps.mjs --manifest <path> [options]

Options:
  --manifest <path>   Path to apexlog_datalog_manifest.csv (required)
  --output-dir <path> Write sidecars here (default: manifest directory)
  --entity <id>       Override ha_entity_id for all rows
  --log-id <id>       Fetch only one log_id
  --dry-run           Print windows without HTTP
  --help              Show this help

Environment:
  HA_TOKEN            Home Assistant long-lived access token (required unless --dry-run)
`);
}

function parseManifestCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = fields[j] ?? '';
    }
    rows.push(row);
  }

  return rows;
}

async function fetchHaHistory(baseUrl, token, entityId, startIso, endIso) {
  const url = buildHaHistoryUrl(baseUrl, entityId, startIso, endIso);
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    throw new Error(`Could not reach Home Assistant at ${baseUrl}: ${err.message}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Home Assistant returned ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`,
    );
  }

  const json = await response.json();
  return parseHaHistoryResponse(json);
}

async function processRow(row, opts, token) {
  const logId = row.log_id?.trim();
  const startIso = row.start_time_iso?.trim();
  const endIso = row.end_time_iso?.trim();
  const durationSeconds = Number(row.duration_seconds);
  const baseUrl = row.ha_base_url?.trim() || DEFAULT_HA_URL;
  const entityId =
    opts.entity?.trim() ||
    row.ha_entity_id?.trim() ||
    DEFAULT_HA_ENTITY_ID;

  if (!logId || !startIso || !endIso || !Number.isFinite(durationSeconds)) {
    throw new Error('Missing log_id, start_time_iso, end_time_iso, or duration_seconds');
  }

  if (opts.dryRun) {
    return {
      logId,
      status: 'dry-run',
      pointCount: 0,
      entityId,
      window: `${startIso} → ${endIso} (${durationSeconds}s)`,
    };
  }

  const samples = await fetchHaHistory(baseUrl, token, entityId, startIso, endIso);
  const track = mergeHaSamplesToGpsTrack(samples, startIso, durationSeconds);

  const sidecar = {
    logId,
    logStartIso: startIso,
    endIso,
    durationSeconds,
    entityId,
    pointCount: track.length,
    track,
    fetchedAt: new Date().toISOString(),
  };

  const outPath = join(opts.outputDir, `${logId}.gps.json`);
  writeFileSync(outPath, JSON.stringify(sidecar, null, 2), 'utf8');

  return {
    logId,
    status: track.length >= 2 ? 'ok' : 'sparse',
    pointCount: track.length,
    entityId,
    outPath,
  };
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.manifest) {
    console.error('Error: --manifest is required.\n');
    printHelp();
    process.exit(1);
  }

  const manifestPath = resolve(opts.manifest);
  const manifestText = readFileSync(manifestPath, 'utf8');
  opts.outputDir = resolve(opts.outputDir ?? dirname(manifestPath));
  mkdirSync(opts.outputDir, { recursive: true });

  let rows = parseManifestCsv(manifestText);
  if (opts.logId) {
    rows = rows.filter(r => r.log_id?.trim() === opts.logId);
    if (rows.length === 0) {
      console.error(`No manifest row with log_id=${opts.logId}`);
      process.exit(1);
    }
  }

  const token = haTokenFromEnv();
  if (!opts.dryRun && !token) {
    console.error('Error: HA_TOKEN environment variable is required (unless --dry-run).');
    process.exit(1);
  }

  console.log(`Manifest: ${manifestPath}`);
  console.log(`Output:   ${opts.outputDir}`);
  console.log(`Rows:     ${rows.length}${opts.dryRun ? ' (dry-run)' : ''}\n`);

  const results = [];
  let failures = 0;

  for (const row of rows) {
    try {
      const result = await processRow(row, opts, token);
      results.push(result);
      if (opts.dryRun) {
        console.log(`  ${result.logId}: ${result.window} [${result.entityId}]`);
      } else {
        const label = result.status === 'ok' ? 'ok' : result.status;
        console.log(`  ${result.logId}: ${label} (${result.pointCount} points) → ${result.outPath}`);
      }
    } catch (err) {
      failures++;
      const logId = row.log_id ?? '(unknown)';
      results.push({ logId, status: 'error', pointCount: 0, error: err.message });
      console.error(`  ${logId}: ERROR — ${err.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(
    'log_id'.padEnd(24) +
      'status'.padEnd(10) +
      'points',
  );
  for (const r of results) {
    console.log(
      String(r.logId).padEnd(24) +
        String(r.status).padEnd(10) +
        String(r.pointCount ?? '-'),
    );
  }

  if (failures > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
