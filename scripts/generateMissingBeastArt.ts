import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

interface BeastCatalogEntry {
  id: string;
  name: string;
  title: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  skillName: string;
  skillText: string;
  portraitKey?: string | null;
  fallbackPortraitKey?: string | null;
}

interface BeastAuditEntry {
  beastId: string;
  displayName: string;
  expectedKey: string;
  expectedFilename: string;
  targetFolder: string;
  fallbackTexture: string;
  rarity: BeastCatalogEntry['rarity'];
  hasDedicatedPortrait: boolean;
  existingPath?: string;
  generated: boolean;
  generationError?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const beastsJsonPath = path.join(rootDir, 'src', 'game', 'data', 'beasts.json');
const beastsAssetRoot = path.join(rootDir, 'public', 'assets', 'beasts');
const generatedManifestPath = path.join(rootDir, 'src', 'game', 'config', 'generatedBeastAssetManifest.ts');
const reportPath = path.join(rootDir, 'docs', 'beast-art-report.md');
const imageApiBase = 'https://image.pollinations.ai/prompt';
const execFileAsync = promisify(execFile);

const baseStylePrompt = [
  'painterly xianxia fantasy beast portrait',
  'mobile RPG companion beast portrait',
  'centered subject',
  'readable at small size',
  'mystical and elegant',
  'dark jade gold and moonlit fantasy palette',
  'premium fantasy tone',
  'visually coherent across the same beast portrait pack',
  'illustrated portrait feel',
  'clean subdued background',
  'strong creature silhouette'
].join(', ');

function sanitizeName(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function humanizeId(id: string): string {
  return id.split('_').join(' ');
}

function getExpectedFilename(beastId: string): string {
  return `beast_portrait_${beastId}_01.png`;
}

function getExpectedKey(beastId: string): string {
  return `beast_portrait_${beastId}_01`;
}

function getConsistencySeed(beastId: string): number {
  let hash = 0;
  for (const char of beastId) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }
  return (hash % 900000) + 2000;
}

function getRarityDescriptor(rarity: BeastCatalogEntry['rarity']): string {
  switch (rarity) {
    case 'legendary':
      return 'majestic transcendent presence, exalted sacred beast feeling';
    case 'epic':
      return 'high-status mythic beast presence, striking and rare';
    case 'rare':
      return 'rare refined spirit beast presence';
    case 'uncommon':
      return 'distinct trained spirit companion presence';
    default:
      return 'simple but readable spirit creature presence';
  }
}

function getBeastSpecificDescriptor(entry: BeastCatalogEntry): string {
  const sourceName = /[Ã�ÆÅâ]/.test(entry.name) ? humanizeId(entry.id) : entry.name;
  const descriptors = [`creature identity "${sourceName}"`, getRarityDescriptor(entry.rarity)];
  const id = entry.id;

  if (id.includes('lang')) {
    descriptors.push('wolf-like spirit beast portrait', 'alert eyes', 'wind-aligned agile silhouette');
  }
  if (id.includes('thach') || id.includes('giap')) {
    descriptors.push('stone-armored beast portrait', 'rock plating', 'earth-aligned guardian mood');
  }
  if (id.includes('xich') || id.includes('nha')) {
    descriptors.push('fiery beast portrait', 'fang emphasis', 'scarlet ember accents');
  }
  if (entry.skillText) {
    const skillHint = /[Ã�ÆÅâ]/.test(entry.skillText) ? sanitizeName(humanizeId(entry.id)) : sanitizeName(entry.skillText);
    descriptors.push(`subtle skill mood inspired by "${skillHint.slice(0, 80)}"`);
  }

  return descriptors.join(', ');
}

function buildBeastPrompt(entry: BeastCatalogEntry): string {
  return [
    baseStylePrompt,
    'fantasy creature portrait suitable for a beast card',
    'avoid realistic photography',
    'avoid busy scenery',
    'face or bust portrait focus',
    getBeastSpecificDescriptor(entry),
    'cohesive premium xianxia creature pack style'
  ].join(', ');
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return listFilesRecursive(fullPath);
        }
        return [fullPath];
      })
    );
    return files.flat();
  } catch {
    return [];
  }
}

async function readBeastCatalog(): Promise<BeastCatalogEntry[]> {
  const raw = await readFile(beastsJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as { beasts: BeastCatalogEntry[] };
  return parsed.beasts.map((entry) => ({
    ...entry,
    name: sanitizeName(entry.name),
    title: sanitizeName(entry.title),
    skillName: sanitizeName(entry.skillName),
    skillText: sanitizeName(entry.skillText)
  }));
}

function buildAudit(entries: BeastCatalogEntry[], existingFiles: string[]): BeastAuditEntry[] {
  const fileMap = new Map(existingFiles.map((filePath) => [path.basename(filePath), filePath]));

  return entries.map((entry) => {
    const expectedFilename = getExpectedFilename(entry.id);
    const existingPath = fileMap.get(expectedFilename);

    return {
      beastId: entry.id,
      displayName: entry.name,
      expectedKey: getExpectedKey(entry.id),
      expectedFilename,
      targetFolder: beastsAssetRoot,
      fallbackTexture: entry.fallbackPortraitKey ?? 'enemy_demon_beast',
      rarity: entry.rarity,
      hasDedicatedPortrait: Boolean(existingPath),
      existingPath,
      generated: false
    };
  });
}

function formatManifestEntry(filePath: string): string {
  const relativePath = path.relative(path.join(rootDir, 'public'), filePath).replace(/\\/g, '/');
  const key = path.basename(filePath, path.extname(filePath));
  return `  { key: '${key}', path: '${relativePath}', type: 'image' },`;
}

async function syncGeneratedManifest(): Promise<void> {
  const files = (await listFilesRecursive(beastsAssetRoot))
    .filter((filePath) => /\.(png|jpg|jpeg)$/i.test(filePath))
    .sort((a, b) => a.localeCompare(b));

  const lines = [
    '// Auto-generated by scripts/generateMissingBeastArt.ts.',
    '// Do not hand-edit unless the generation pipeline is unavailable.',
    'export const generatedBeastAssetManifest = [',
    ...files.map(formatManifestEntry),
    '] as const;',
    ''
  ];

  await writeFile(generatedManifestPath, lines.join('\n'), 'utf8');
}

function renderReport(audit: BeastAuditEntry[]): string {
  const unresolved = audit.filter((entry) => !entry.hasDedicatedPortrait);
  const sections = [
    '# Beast Art Report',
    '',
    `Generated on: ${new Date().toISOString()}`,
    '',
    'Generation mode: direct public Pollinations prompt endpoint',
    '',
    `Total beasts in catalog: ${audit.length}`,
    `Dedicated portraits present: ${audit.filter((entry) => entry.hasDedicatedPortrait).length}`,
    `Still unresolved: ${unresolved.length}`,
    '',
    '| beast id | display name | expected filename | fallback texture | rarity | status |',
    '|---|---|---|---|---|---|'
  ];

  for (const entry of audit) {
    const status = entry.generated ? 'generated' : entry.hasDedicatedPortrait ? 'present' : entry.generationError ? `failed: ${entry.generationError}` : 'missing';
    sections.push(`| \`${entry.beastId}\` | ${entry.displayName} | \`${entry.expectedFilename}\` | \`${entry.fallbackTexture}\` | ${entry.rarity} | ${status} |`);
  }

  sections.push('');
  return sections.join('\n');
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function convertJpegToPng(jpegBuffer: Buffer): Promise<Buffer> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'nnkt-beast-art-'));
  const sourcePath = path.join(tempDir, 'source.jpg');
  const outputPath = path.join(tempDir, 'output.png');

  try {
    await writeFile(sourcePath, jpegBuffer);
    const command = [
      'Add-Type -AssemblyName System.Drawing',
      `$img=[System.Drawing.Image]::FromFile('${sourcePath.replace(/'/g, "''")}')`,
      `$img.Save('${outputPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)`,
      '$img.Dispose()'
    ].join('; ');

    await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command], {
      windowsHide: true
    });

    return await readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function requestImage(prompt: string, beastId: string): Promise<Buffer> {
  let lastError: unknown;
  const seed = getConsistencySeed(beastId);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const requestUrl = `${imageApiBase}/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      const response = await fetch(requestUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      const imageBuffer = Buffer.from(await response.arrayBuffer());

      if (contentType.includes('png')) {
        return imageBuffer;
      }

      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        return await convertJpegToPng(imageBuffer);
      }

      throw new Error(`Unsupported image type: ${contentType || 'unknown'}`);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await delay(1400 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function generateMissingPortraits(audit: BeastAuditEntry[], entriesById: Map<string, BeastCatalogEntry>): Promise<void> {
  const missing = audit.filter((entry) => !entry.hasDedicatedPortrait);

  for (const entry of missing) {
    const beast = entriesById.get(entry.beastId);
    if (!beast) {
      entry.generationError = 'Catalog lookup failed';
      continue;
    }

    try {
      await mkdir(entry.targetFolder, { recursive: true });
      const imageBuffer = await requestImage(buildBeastPrompt(beast), beast.id);
      const targetPath = path.join(entry.targetFolder, entry.expectedFilename);
      await writeFile(targetPath, imageBuffer);
      entry.generated = true;
      entry.hasDedicatedPortrait = true;
      entry.existingPath = targetPath;
      console.log(`Generated ${entry.expectedFilename}`);
      await delay(600);
    } catch (error) {
      entry.generationError = error instanceof Error ? error.message : String(error);
      console.error(`Failed ${entry.expectedFilename}: ${entry.generationError}`);
    }
  }
}

async function main(): Promise<void> {
  const entries = await readBeastCatalog();
  const existingFiles = await listFilesRecursive(beastsAssetRoot);
  const audit = buildAudit(entries, existingFiles);
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

  await mkdir(beastsAssetRoot, { recursive: true });
  await syncGeneratedManifest();
  await generateMissingPortraits(audit, entriesById);
  await syncGeneratedManifest();
  await writeFile(reportPath, renderReport(audit), 'utf8');

  const generatedCount = audit.filter((entry) => entry.generated).length;
  const failedCount = audit.filter((entry) => entry.generationError).length;
  console.log(`Generated beast portraits: ${generatedCount}`);
  console.log(`Failed beast generations: ${failedCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
