import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

type Category = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory';

type ParsedItem = {
  brand: string;
  category: Category;
  title: string;
  price: number | null;
  currency: string | null;
  productUrl: string;
  imageUrl: string;
  styleTags: string[];
};

const ROOT_URL = process.env.END_LAUNCHES_URL ?? 'https://launches.endclothing.com';
const SNAPSHOT_PATH = path.resolve(__dirname, '../../data/end/launches-catalog.json');

const BRAND_ALIASES: Array<{ brand: string; aliases: string[] }> = [
  { brand: 'Nike', aliases: ['air jordan', 'jordan', 'nike'] },
  { brand: 'Adidas', aliases: ['adidas'] },
  { brand: "Levi's", aliases: ["levi's", 'levis'] },
  { brand: 'Off-White', aliases: ['off-white', 'off white'] },
  { brand: 'Balenciaga', aliases: ['balenciaga'] },
  { brand: 'Prada', aliases: ['prada'] },
  { brand: 'Saint Laurent', aliases: ['saint laurent', 'ysl'] },
  { brand: 'Dior', aliases: ['dior'] },
  { brand: 'Gucci', aliases: ['gucci'] },
  { brand: 'Bottega Veneta', aliases: ['bottega veneta'] },
  { brand: 'Acne Studios', aliases: ['acne studios'] },
  { brand: 'A.P.C.', aliases: ['a.p.c.', 'apc'] },
  { brand: 'Jacquemus', aliases: ['jacquemus'] },
  { brand: 'Ami Paris', aliases: ['ami paris', 'ami de coeur'] },
  { brand: 'Represent', aliases: ['represent'] },
  { brand: 'Uniqlo', aliases: ['uniqlo'] },
  { brand: 'COS', aliases: [' cos ', 'cos '] },
  { brand: 'Arket', aliases: ['arket'] },
];

const BRAND_TIER: Record<string, number> = {
  Nike: 1,
  Adidas: 1,
  Uniqlo: 1,
  COS: 1,
  Arket: 1,
  "Levi's": 1,
  'Acne Studios': 2,
  'A.P.C.': 2,
  'Off-White': 2,
  Jacquemus: 2,
  'Ami Paris': 2,
  Represent: 2,
  Balenciaga: 3,
  Prada: 3,
  'Saint Laurent': 3,
  Dior: 3,
  Gucci: 3,
  'Bottega Veneta': 3,
};

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectBrand(title: string) {
  const source = ` ${normalizeText(title)} `;
  let best: { brand: string; index: number } | null = null;

  for (const entry of BRAND_ALIASES) {
    for (const alias of entry.aliases) {
      const aliasPattern = alias.includes(' ') ? alias : ` ${alias} `;
      const index = source.indexOf(aliasPattern);
      if (index === -1) {
        continue;
      }
      if (!best || index < best.index) {
        best = { brand: entry.brand, index };
      }
    }
  }

  return best?.brand ?? null;
}

function detectCategory(title: string): Category {
  const text = normalizeText(title);

  if (/(sneaker|trainer|shoe|runner|court|retro|low|high|zx|samba|superstar|climacool|taekwondo)/.test(text)) {
    return 'shoes';
  }
  if (/(jacket|coat|parka|bomber|anorak|gilet|trucker|windrunner|shell)/.test(text)) {
    return 'outerwear';
  }
  if (/(hoodie|t-shirt|tee|shirt|sweatshirt|jersey|polo|knit|crewneck)/.test(text)) {
    return 'top';
  }
  if (/(jean|pants|trouser|cargo pant|short|jogger|track pant|chino)/.test(text)) {
    return 'bottom';
  }
  if (/(cap|bag|belt|beanie|sock|scarf|wallet|card holder|backpack|tote)/.test(text)) {
    return 'accessory';
  }
  return 'shoes';
}

function styleTagsFor(brand: string, category: Category, title: string) {
  const tags = new Set<string>();
  const lower = normalizeText(title);

  if (category === 'shoes') {
    tags.add('streetwear');
    tags.add('casual');
    tags.add('y2k');
  }
  if (category === 'top') {
    tags.add('streetwear');
    tags.add('casual');
    tags.add('smart casual');
  }
  if (category === 'bottom') {
    tags.add('streetwear');
    tags.add('casual');
    tags.add('vintage');
  }
  if (category === 'outerwear') {
    tags.add('streetwear');
    tags.add('minimal');
    tags.add('smart casual');
  }
  if (category === 'accessory') {
    tags.add('streetwear');
    tags.add('minimal');
  }

  if (/(vintage|denim|retro)/.test(lower)) {
    tags.add('vintage');
  }
  if (/(black|mono|minimal)/.test(lower)) {
    tags.add('minimal');
  }
  if (/(goth|dark)/.test(lower)) {
    tags.add('goth');
  }
  if ((BRAND_TIER[brand] ?? 1) >= 3) {
    tags.add('luxury');
  }

  return [...tags];
}

function parsePrice(html: string) {
  const match = html.match(/([$£€])\s?([0-9]{2,5}(?:\.[0-9]{2})?)/);
  if (!match) {
    return { price: null, currency: null };
  }

  const sign = match[1];
  const amount = Number(match[2]);
  const currency = sign === '$' ? 'USD' : sign === '£' ? 'GBP' : sign === '€' ? 'EUR' : null;
  return {
    price: Number.isFinite(amount) ? Math.round(amount) : null,
    currency,
  };
}

function parseMainImage(html: string) {
  const hero = html.match(
    /https:\/\/launches-media\.endclothing\.com\/[^"')\s]*_launches_hero_(?:portrait|landscape)_[^"')\s]*/i,
  );
  if (hero?.[0]) {
    return hero[0];
  }

  const fallback = html.match(/https:\/\/launches-media\.endclothing\.com\/[^"')\s]+/i);
  return fallback?.[0] ?? null;
}

function parseTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (!titleMatch?.[1]) {
    return null;
  }

  return decodeHtml(titleMatch[1].replace(/\s+\|\s+END\.\s*Launches/i, '').trim());
}

function extractProductUrls(html: string) {
  const urls = new Set<string>();
  const matches = html.matchAll(/href="(?:https:\/\/launches\.endclothing\.com)?\/product\/([a-z0-9\-]+)"/gi);
  for (const match of matches) {
    const slug = match[1];
    urls.add(normalizeHttps(`${ROOT_URL}/product/${slug}`));
  }
  return [...urls];
}

function normalizeHttps(value: string) {
  return value.startsWith('http://') ? `https://${value.slice('http://'.length)}` : value;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 8,
) {
  const results: R[] = [];
  const queue = [...items];
  let index = 0;

  async function run() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) {
        break;
      }
      const currentIndex = index;
      index += 1;
      const result = await worker(item, currentIndex);
      results.push(result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function loadSnapshot() {
  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as ParsedItem[];
    return parsed
      .filter((item) => {
        if (!item || typeof item !== 'object') {
          return false;
        }
        return Boolean(item.brand && item.category && item.title && item.productUrl && item.imageUrl);
      })
      .map((item) => ({
        ...item,
        category: detectCategory(item.title),
        productUrl: normalizeHttps(item.productUrl),
        imageUrl: normalizeHttps(item.imageUrl),
      }))
      .filter((item) => {
        return Boolean(item.productUrl.startsWith('https://'));
      })
      .filter((item) => {
        return Boolean(item.imageUrl.startsWith('https://'));
      });
  } catch {
    return [];
  }
}

async function parseProduct(url: string): Promise<ParsedItem | null> {
  try {
    const html = await fetchHtml(url);
    const title = parseTitle(html);
    if (!title) {
      return null;
    }

    const brand = detectBrand(title);
    if (!brand) {
      return null;
    }

    const imageUrl = parseMainImage(html);
    if (!imageUrl) {
      return null;
    }

    const category = detectCategory(title);
    const { price, currency } = parsePrice(html);

    return {
      brand,
      category,
      title,
      price,
      currency,
      productUrl: normalizeHttps(url),
      imageUrl: normalizeHttps(imageUrl),
      styleTags: styleTagsFor(brand, category, title),
    };
  } catch {
    return null;
  }
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const forceSnapshot =
      process.env.END_SYNC_MODE === 'snapshot' || process.argv.includes('--snapshot');
    let uniqueItems: ParsedItem[] = [];

    if (!forceSnapshot) {
      try {
        const listHtml = await fetchHtml(ROOT_URL);
        const productUrls = extractProductUrls(listHtml);

        if (!productUrls.length) {
          throw new Error('No END launches products found');
        }

        const parsed = await mapWithConcurrency(productUrls, async (url) => parseProduct(url), 8);
        const items = parsed.filter((item): item is ParsedItem => item !== null);

        const uniqueByUrl = new Map<string, ParsedItem>();
        for (const item of items) {
          if (!uniqueByUrl.has(item.productUrl)) {
            uniqueByUrl.set(item.productUrl, item);
          }
        }
        uniqueItems = [...uniqueByUrl.values()];
      } catch (error) {
        const fallbackItems = await loadSnapshot();
        if (!fallbackItems.length) {
          throw error;
        }
        console.warn(
          `END live sync unavailable (${error instanceof Error ? error.message : String(error)}). Using snapshot.`,
        );
        uniqueItems = fallbackItems;
      }
    }

    if (forceSnapshot) {
      const snapshotItems = await loadSnapshot();
      if (!snapshotItems.length) {
        throw new Error('END snapshot is empty; cannot import');
      }
      uniqueItems = snapshotItems;
    }

    if (!uniqueItems.length) {
      throw new Error('No END catalog items available to sync');
    }

    for (const item of uniqueItems) {
      await prisma.externalCatalogItem.upsert({
        where: { productUrl: item.productUrl },
        update: {
          source: 'END',
          brand: item.brand,
          category: item.category,
          title: item.title,
          price: item.price,
          currency: item.currency,
          imageUrl: item.imageUrl,
          styleTags: item.styleTags,
          isActive: true,
        },
        create: {
          source: 'END',
          brand: item.brand,
          category: item.category,
          title: item.title,
          price: item.price,
          currency: item.currency,
          productUrl: item.productUrl,
          imageUrl: item.imageUrl,
          styleTags: item.styleTags,
          isActive: true,
        },
      });
    }

    await prisma.externalCatalogItem.updateMany({
      where: {
        source: 'END',
        productUrl: { notIn: uniqueItems.map((item) => item.productUrl) },
      },
      data: {
        isActive: false,
      },
    });

    await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
    await writeFile(SNAPSHOT_PATH, JSON.stringify(uniqueItems, null, 2), 'utf-8');

    console.log(`Synced END launches catalog: ${uniqueItems.length} items`);
    console.log(`Saved snapshot: ${SNAPSHOT_PATH}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
