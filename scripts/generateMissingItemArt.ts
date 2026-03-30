import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

type ItemCategory = 'pill' | 'herb' | 'ore' | 'misc' | 'quest' | 'artifact' | 'material';

interface CatalogItem {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface ItemAuditEntry {
  itemId: string;
  displayName: string;
  category: ItemCategory;
  group: string;
  expectedKey: string;
  expectedFilename: string;
  targetFolder: string;
  currentFallbackTexture: string;
  priority: 'High' | 'Medium' | 'Low';
  hasDedicatedArt: boolean;
  existingPath?: string;
  generated: boolean;
  generationError?: string;
}

interface SampleGenerationResult {
  itemId: string;
  prompt: string;
  outputPath: string;
  ok: boolean;
  error?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const itemsJsonPath = path.join(rootDir, 'src', 'game', 'data', 'items.json');
const itemsAssetRoot = path.join(rootDir, 'public', 'assets', 'items');
const generatedManifestPath = path.join(rootDir, 'src', 'game', 'config', 'generatedItemAssetManifest.ts');
const reportPath = path.join(rootDir, 'docs', 'item-art-missing-report.md');

const imageApiBase = 'https://image.pollinations.ai/prompt';
const baseStylePrompt = [
  'painterly xianxia fantasy RPG item icon',
  'mobile game inventory icon',
  'centered object',
  'strong silhouette',
  'readable at small size',
  'dark jade and gold mystical palette',
  'mystical elegant premium fantasy tone',
  'clean background',
  'visually coherent with the same xianxia RPG asset pack',
  'single object focus',
  'high legibility'
].join(', ');
const execFileAsync = promisify(execFile);
const sampleOutputRoot = path.join(rootDir, 'tmp', 'item-art-samples');

const fallbackTextureByCategory: Record<ItemCategory, string> = {
  pill: 'item_pill_spirit_01',
  herb: 'item_artifact_talisman_01',
  ore: 'item_artifact_talisman_01',
  misc: 'item_artifact_talisman_01',
  quest: 'item_relic_ancient_scroll_01',
  artifact: 'item_artifact_talisman_01',
  material: 'item_artifact_talisman_01'
};

function sanitizeName(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function humanizeId(itemId: string): string {
  return itemId.split('_').join(' ');
}

function isDisplayNameUsable(displayName: string): boolean {
  return !/[Ã�ÆÅâ]/.test(displayName);
}

function getCategoryGroup(category: ItemCategory, itemId: string): string {
  switch (category) {
    case 'pill':
      return 'pills';
    case 'herb':
      return 'herbs';
    case 'ore':
      return 'ores';
    case 'misc':
      return 'talismans';
    case 'quest':
      return itemId.includes('luc') || itemId.includes('chi') ? 'scrolls' : 'relics';
    case 'artifact':
      return itemId.includes('phu') ? 'talismans' : 'equipment';
    case 'material':
      return 'materials';
    default:
      return 'materials';
  }
}

function getExpectedFilename(item: CatalogItem): string {
  switch (item.category) {
    case 'pill':
      return `item_pill_${item.id}_01.png`;
    case 'quest':
      return `item_quest_${item.id}_01.png`;
    case 'artifact':
      return `item_artifact_${item.id}_01.png`;
    case 'material':
      return `item_material_${item.id}_01.png`;
    case 'herb':
      return `item_herb_${item.id}_01.png`;
    case 'ore':
      return `item_ore_${item.id}_01.png`;
    case 'misc':
      return `item_misc_${item.id}_01.png`;
    default:
      return `item_${item.category}_${item.id}_01.png`;
  }
}

function getTargetFolder(item: CatalogItem): string {
  switch (item.category) {
    case 'pill':
      return path.join(itemsAssetRoot, 'pills');
    case 'quest':
      return path.join(itemsAssetRoot, 'relics');
    case 'material':
    case 'herb':
    case 'ore':
      return path.join(itemsAssetRoot, 'materials');
    case 'artifact':
    case 'misc':
    default:
      return itemsAssetRoot;
  }
}

function getPriority(item: CatalogItem): 'High' | 'Medium' | 'Low' {
  if (
    ['tu_khi_dan', 'duong_tuc_dan', 'uong_linh_tan', 'linh_thao_co_ban', 'hoa_linh_thao', 'khoang_thach_tho', 'tan_phien_co_khi', 'tu_linh_ngoc_boi'].includes(item.id)
  ) {
    return 'High';
  }

  return item.rarity === 'rare' ? 'Medium' : 'Low';
}

function getCategoryPromptExtension(group: string): string {
  switch (group) {
    case 'pills':
      return 'mystical cultivation pill, glowing medicinal orb or capsule, alchemical fantasy object, polished vessel or jade dish';
    case 'herbs':
      return 'spiritual herb, fantasy medicinal plant, elegant leaves roots petals, glowing natural details, graceful botanical silhouette';
    case 'ores':
    case 'materials':
      return 'magical ore mineral crafting material, faceted raw mystical resource, readable shape and surface texture';
    case 'talismans':
      return 'ancient protective talisman, paper charm or jade charm, engraved magical seal, sacred mystical calligraphy feeling';
    case 'scrolls':
      return 'ancient cultivation scroll, sacred text, hidden manual, worn parchment or jade slip, old scripture artifact';
    case 'relics':
      return 'ancient relic, sacred artifact, inherited treasure, rare historical object with restrained mystical glow';
    case 'equipment':
      return 'wearable cultivation treasure, jade pendant ring ornament bracelet or charm, refined mystical craftsmanship';
    default:
      return 'xianxia fantasy item, readable silhouette, premium item pack style';
  }
}

function getItemSpecificDescriptor(item: CatalogItem): string {
  const subject = isDisplayNameUsable(item.name) ? item.name : humanizeId(item.id);
  const descriptors: string[] = [`item theme "${subject}"`];
  const id = item.id;

  if (id.includes('hoa')) {
    descriptors.push('subtle ember glow', 'warm cinnabar highlights');
  }
  if (id.includes('am')) {
    descriptors.push('yin-tinged dark ember glow', 'ash and ruby undertone');
  }
  if (id.includes('hac') || id.includes('u_')) {
    descriptors.push('deep blackwood and shadow-infused details');
  }
  if (id.includes('ngoc')) {
    descriptors.push('polished jade material', 'refined carved ornament');
  }
  if (id.includes('phu')) {
    descriptors.push('calligraphic seal marks', 'protective ward motif');
  }
  if (id.includes('luc')) {
    descriptors.push('ancient manuscript feeling', 'sect record atmosphere');
  }
  if (id.includes('linh_bai')) {
    descriptors.push('inherited token form', 'formal sect identity motif');
  }
  if (id.includes('tan_phien')) {
    descriptors.push('broken ancient fragment silhouette', 'weathered relic shard');
  }
  if (id.includes('thao') || id.includes('chi')) {
    descriptors.push('botanical readability', 'medicinal fantasy plant anatomy');
  }
  if (id.includes('dan') || id.includes('tan')) {
    descriptors.push('compact alchemical centerpiece', 'premium medicinal icon clarity');
  }

  return descriptors.join(', ');
}

function buildItemPrompt(item: CatalogItem): string {
  const group = getCategoryGroup(item.category, item.id);
  const promptParts = [
    baseStylePrompt,
    getCategoryPromptExtension(group),
    getItemSpecificDescriptor(item),
    'no character portrait',
    'no environment scene',
    'no cluttered composition',
    'clean isolated presentation'
  ];

  return promptParts.join(', ');
}

async function listFilesRecursive(dir: string): Promise<string[]> {
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
}

async function readCatalogItems(): Promise<CatalogItem[]> {
  const raw = await readFile(itemsJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as { items: CatalogItem[] };
  return parsed.items.map((item) => ({
    ...item,
    name: sanitizeName(item.name)
  }));
}

function buildAudit(items: CatalogItem[], existingFiles: string[]): ItemAuditEntry[] {
  const fileMap = new Map(existingFiles.map((filePath) => [path.basename(filePath), filePath]));

  return items.map((item) => {
    const expectedFilename = getExpectedFilename(item);
    const existingPath = fileMap.get(expectedFilename);

    return {
      itemId: item.id,
      displayName: item.name,
      category: item.category,
      group: getCategoryGroup(item.category, item.id),
      expectedKey: expectedFilename.replace(/\.png$/i, ''),
      expectedFilename,
      targetFolder: getTargetFolder(item),
      currentFallbackTexture: fallbackTextureByCategory[item.category],
      priority: getPriority(item),
      hasDedicatedArt: Boolean(existingPath),
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
  const allItemFiles = (await listFilesRecursive(itemsAssetRoot))
    .filter((filePath) => /\.(png|jpg|jpeg)$/i.test(filePath))
    .sort((a, b) => a.localeCompare(b));

  const lines = [
    '// Auto-generated by scripts/generateMissingItemArt.ts.',
    '// Do not hand-edit unless the generation pipeline is unavailable.',
    'export const generatedItemAssetManifest = [',
    ...allItemFiles.map(formatManifestEntry),
    '] as const;',
    ''
  ];

  await writeFile(generatedManifestPath, lines.join('\n'), 'utf8');
}

function renderReport(audit: ItemAuditEntry[]): string {
  const missing = audit.filter((entry) => !entry.hasDedicatedArt);
  const grouped = new Map<string, ItemAuditEntry[]>();

  for (const entry of missing) {
    const group = entry.group;
    const bucket = grouped.get(group) ?? [];
    bucket.push(entry);
    grouped.set(group, bucket);
  }

  const sections = [
    '# Item Art Missing Report',
    '',
    `Generated on: ${new Date().toISOString()}`,
    '',
    'Generation mode: direct public Pollinations prompt endpoint',
    '',
    `Total catalog items: ${audit.length}`,
    `Dedicated art already present: ${audit.filter((entry) => entry.hasDedicatedArt).length}`,
    `Still missing dedicated art: ${missing.length}`,
    ''
  ];

  for (const [group, entries] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    sections.push(`## ${group}`);
    sections.push('');
    sections.push('| item id | display name | expected filename | target folder | fallback texture | priority | status |');
    sections.push('|---|---|---|---|---|---|---|');
    for (const entry of entries.sort((a, b) => a.itemId.localeCompare(b.itemId))) {
      const status = entry.generated ? 'generated' : entry.generationError ? `failed: ${entry.generationError}` : 'missing';
      sections.push(`| \`${entry.itemId}\` | ${entry.displayName} | \`${entry.expectedFilename}\` | \`${path.relative(rootDir, entry.targetFolder).replace(/\\/g, '/')}\` | \`${entry.currentFallbackTexture}\` | ${entry.priority} | ${status} |`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function convertJpegToPng(jpegBuffer: Buffer): Promise<Buffer> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'nnkt-item-art-'));
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

function getConsistencySeed(itemId: string): number {
  let hash = 0;
  for (const char of itemId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return (hash % 900000) + 1000;
}

async function requestImage(prompt: string, itemId: string): Promise<Buffer> {
  let lastError: unknown;
  const seed = getConsistencySeed(itemId);

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

async function generateMissingArt(audit: ItemAuditEntry[], itemsById: Map<string, CatalogItem>): Promise<void> {
  const missingEntries = audit.filter((entry) => !entry.hasDedicatedArt);

  for (const entry of missingEntries) {
    const item = itemsById.get(entry.itemId);
    if (!item) {
      entry.generationError = 'Catalog lookup failed';
      continue;
    }

    try {
      await mkdir(entry.targetFolder, { recursive: true });
      const imageBuffer = await requestImage(buildItemPrompt(item), item.id);
      const targetPath = path.join(entry.targetFolder, entry.expectedFilename);
      await writeFile(targetPath, imageBuffer);
      entry.hasDedicatedArt = true;
      entry.generated = true;
      entry.existingPath = targetPath;
      console.log(`Generated ${entry.expectedFilename}`);
      await delay(600);
    } catch (error) {
      entry.generationError = error instanceof Error ? error.message : String(error);
      console.error(`Failed ${entry.expectedFilename}: ${entry.generationError}`);
    }
  }
}

async function runSampleGenerationTest(itemsById: Map<string, CatalogItem>): Promise<SampleGenerationResult[]> {
  const sampleIds = ['tu_khi_dan', 'linh_thao_co_ban', 'thua_ke_linh_bai'];
  const results: SampleGenerationResult[] = [];
  await mkdir(sampleOutputRoot, { recursive: true });

  for (const itemId of sampleIds) {
    const item = itemsById.get(itemId);
    if (!item) {
      results.push({
        itemId,
        prompt: '',
        outputPath: '',
        ok: false,
        error: 'Catalog lookup failed'
      });
      continue;
    }

    const prompt = buildItemPrompt(item);
    const outputPath = path.join(sampleOutputRoot, `sample_${getExpectedFilename(item)}`);

    try {
      const imageBuffer = await requestImage(prompt, item.id);
      await writeFile(outputPath, imageBuffer);
      results.push({ itemId, prompt, outputPath, ok: true });
      await delay(400);
    } catch (error) {
      results.push({
        itemId,
        prompt,
        outputPath,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return results;
}

async function main(): Promise<void> {
  const items = await readCatalogItems();
  const existingFiles = await listFilesRecursive(itemsAssetRoot);
  const audit = buildAudit(items, existingFiles);
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const sampleResults = await runSampleGenerationTest(itemsById);

  await syncGeneratedManifest();
  await generateMissingArt(audit, itemsById);
  await syncGeneratedManifest();
  await writeFile(reportPath, renderReport(audit), 'utf8');

  const generatedCount = audit.filter((entry) => entry.generated).length;
  const failedCount = audit.filter((entry) => entry.generationError).length;
  console.log(`Generated item art: ${generatedCount}`);
  console.log(`Failed item generations: ${failedCount}`);
  for (const result of sampleResults) {
    console.log(
      result.ok
        ? `Sample ok: ${result.itemId} -> ${result.outputPath}`
        : `Sample failed: ${result.itemId} -> ${result.error ?? 'unknown error'}`
    );
    if (result.prompt) {
      console.log(`Sample prompt (${result.itemId}): ${result.prompt}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
