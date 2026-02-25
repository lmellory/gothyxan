import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { CatalogSource, PrismaClient } from '@prisma/client';

type CsvRow = {
  source: CatalogSource;
  brand: string;
  category: string;
  title: string;
  price: number | null;
  currency: string | null;
  productUrl: string;
  imageFile: string;
  styleTags: string[];
};

const prisma = new PrismaClient();
const CHUNK_SIZE = 600;
const apiPublicBase = (process.env.API_PUBLIC_BASE_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
    if (ch === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  fields.push(current);
  return fields;
}

function toSource(value: string): CatalogSource {
  return value.trim().toUpperCase() === 'LOCAL' ? CatalogSource.LOCAL : CatalogSource.END;
}

function normalizeCategory(value: string) {
  const category = value.trim().toLowerCase();
  if (category === 'top' || category === 'bottom' || category === 'shoes' || category === 'outerwear' || category === 'accessory') {
    return category;
  }
  return 'top';
}

function toImageUrl(imageFile: string) {
  const normalized = imageFile.trim().replace(/\\/g, '/');
  return `${apiPublicBase}/api/media/local?file=${encodeURIComponent(normalized)}`;
}

function normalizeProductUrl(value: string) {
  const raw = value.trim();
  if (raw.startsWith('http://')) {
    return `https://${raw.slice('http://'.length)}`;
  }
  return raw;
}

async function loadRows(csvPath: string): Promise<CsvRow[]> {
  const stream = createReadStream(csvPath, { encoding: 'utf-8' });
  const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const rows: CsvRow[] = [];
  let isHeader = true;

  for await (const line of reader) {
    if (!line.trim()) {
      continue;
    }
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const cells = parseCsvLine(line);
    if (cells.length < 11) {
      continue;
    }

    const source = toSource(cells[1] ?? '');
    const brand = (cells[2] ?? '').trim();
    const title = (cells[3] ?? '').trim();
    const category = normalizeCategory(cells[4] ?? '');
    const priceRaw = (cells[5] ?? '').trim();
    const currency = (cells[6] ?? '').trim().toUpperCase() || null;
    const productUrl = normalizeProductUrl(cells[7] ?? '');
    const imageFile = (cells[8] ?? '').trim();
    const styleTags = (cells[10] ?? '')
      .split('|')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const price = /^\d+$/.test(priceRaw) ? Number(priceRaw) : null;
    if (!brand || !title || !productUrl || !imageFile) {
      continue;
    }
    if (!productUrl.startsWith('http://') && !productUrl.startsWith('https://')) {
      continue;
    }

    rows.push({
      source,
      brand,
      category,
      title,
      price,
      currency,
      productUrl,
      imageFile,
      styleTags,
    });
  }

  return rows;
}

async function main() {
  const packRoot = process.env.PACK_CLOTHES_ROOT?.trim()
    ? path.resolve(process.env.PACK_CLOTHES_ROOT)
    : path.resolve(__dirname, '../../PACK_ALL_CLOTHES');
  const csvPath = path.resolve(packRoot, 'items.csv');
  const imagesDir = path.resolve(packRoot, 'images');

  if (!existsSync(csvPath)) {
    throw new Error(`Pack CSV not found: ${csvPath}`);
  }
  if (!existsSync(imagesDir)) {
    throw new Error(`Pack images folder not found: ${imagesDir}`);
  }

  console.log(`Reading pack CSV: ${csvPath}`);
  const parsedRows = await loadRows(csvPath);
  if (!parsedRows.length) {
    throw new Error('No valid rows found in pack CSV');
  }

  const normalized = parsedRows.map((row) => ({
    source: row.source,
    brand: row.brand,
    category: row.category,
    title: row.title,
    price: row.price,
    currency: row.currency,
    productUrl: row.productUrl,
    imageUrl: toImageUrl(row.imageFile),
    styleTags: row.styleTags.length ? row.styleTags : ['streetwear', 'casual'],
    isActive: true,
  }));

  console.log(`Upserting ${normalized.length} pack items...`);
  await prisma.externalCatalogItem.deleteMany({
    where: {
      source: CatalogSource.END,
    },
  });

  for (let index = 0; index < normalized.length; index += CHUNK_SIZE) {
    const chunk = normalized.slice(index, index + CHUNK_SIZE);
    await prisma.externalCatalogItem.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  const totalEnd = await prisma.externalCatalogItem.count({
    where: { source: CatalogSource.END, isActive: true },
  });
  console.log(`Pack import complete. Active END catalog items: ${totalEnd}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
