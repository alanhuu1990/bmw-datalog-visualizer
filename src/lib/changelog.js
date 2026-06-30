import rawChangelog from '../../CHANGELOG.md?raw';

const SECTION_HEADING = /^### (Added|Changed|Fixed|Removed|Deprecated|Security)$/;
const RELEASE_HEADING = /^\[(.+?)\](?: - (.+))?$/;

function parseSectionBlock(lines) {
  const sections = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.replace(/\r$/, '');
    const headingMatch = trimmed.match(SECTION_HEADING);
    if (headingMatch) {
      current = { title: headingMatch[1], items: [] };
      sections.push(current);
      continue;
    }
    const itemMatch = trimmed.match(/^- (.+)$/);
    if (itemMatch && current) {
      current.items.push(itemMatch[1]);
    }
  }

  return sections.filter(s => s.items.length > 0);
}

export function parseChangelog(raw) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const blocks = normalized.split(/^## /m).slice(1);
  let unreleased = null;
  const releases = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    const headerLine = lines[0]?.trim() ?? '';
    const headerMatch = headerLine.match(RELEASE_HEADING);
    if (!headerMatch) continue;

    const [, version, date] = headerMatch;
    const sections = parseSectionBlock(lines.slice(1));

    if (version === 'Unreleased') {
      if (sections.length > 0) {
        unreleased = { version: 'Unreleased', date: null, sections };
      }
      continue;
    }

    releases.push({ version, date: date ?? null, sections });
  }

  return { unreleased, releases };
}

export const changelogData = parseChangelog(rawChangelog);
