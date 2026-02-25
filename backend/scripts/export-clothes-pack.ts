import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

type PackRow = {
  pack_id: string;
  source: 'LOCAL' | 'END';
  brand: string;
  title: string;
  category: string;
  price: number | null;
  currency: string | null;
  product_url: string;
  image_file: string;
  image_original_url: string;
  style_tags: string;
};

const prisma = new PrismaClient();

const PACK_ROOT = path.resolve(__dirname, '../../PACK_ALL_CLOTHES');
const PACK_IMAGES = path.join(PACK_ROOT, 'images');
const PACK_JSON = path.join(PACK_ROOT, 'items.json');
const PACK_CSV = path.join(PACK_ROOT, 'items.csv');
const PACK_README = path.join(PACK_ROOT, 'README.txt');

type CatalogItem = {
  id: string;
  source: 'LOCAL' | 'END';
  brand: string;
  title: string;
  category: string;
  price: number | null;
  currency: string | null;
  productUrl: string;
  imageUrl: string;
  styleTags: string[];
};

type DownloadedImage = {
  ext: string;
  bytes: Buffer;
  sourceUrl: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function csvCell(input: string | number | null) {
  if (input === null) {
    return '';
  }
  const raw = String(input);
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function decodeSvgDataUri(dataUri: string) {
  if (!dataUri.startsWith('data:image/svg+xml')) {
    return null;
  }
  const commaIndex = dataUri.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }
  const meta = dataUri.slice(0, commaIndex);
  const payload = dataUri.slice(commaIndex + 1);
  if (meta.includes(';base64')) {
    return Buffer.from(payload, 'base64').toString('utf8');
  }
  return decodeURIComponent(payload);
}

function fallbackSvg(item: { brand: string; title: string; category: string; price: number | null }) {
  const brand = item.brand
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const title = item.title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const category = item.category.toUpperCase();
  const price = item.price ? `$${item.price}` : 'N/A';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="#0b1220"/>
  <rect x="70" y="70" width="1060" height="760" rx="34" fill="#111827" stroke="#334155" stroke-width="3"/>
  <text x="120" y="220" font-size="46" font-family="Arial" fill="#a3e635">${brand}</text>
  <text x="120" y="300" font-size="42" font-family="Arial" fill="#f8fafc">${title}</text>
  <text x="120" y="370" font-size="32" font-family="Arial" fill="#93c5fd">${category}</text>
  <text x="120" y="430" font-size="32" font-family="Arial" fill="#38bdf8">${price}</text>
</svg>`;
}

async function saveImageFile(
  item: {
    source: 'LOCAL' | 'END';
    brand: string;
    title: string;
    category: string;
    price: number | null;
    imageUrl: string;
  },
  index: number,
  downloadCache: Map<string, DownloadedImage | null>,
) {
  const baseName = `${String(index + 1).padStart(5, '0')}-${slugify(item.brand)}-${slugify(item.category)}-${slugify(item.title).slice(0, 80)}`;

  const getFromUrl = async (url: string) => {
    if (downloadCache.has(url)) {
      return downloadCache.get(url) ?? null;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        downloadCache.set(url, null);
        return null;
      }

      const contentType = response.headers.get('content-type') ?? '';
      const ext = contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
          ? 'webp'
          : contentType.includes('svg')
            ? 'svg'
            : contentType.includes('avif')
              ? 'avif'
              : 'jpg';
      const bytes = Buffer.from(await response.arrayBuffer());
      const downloaded = { ext, bytes, sourceUrl: url };
      downloadCache.set(url, downloaded);
      return downloaded;
    } catch {
      downloadCache.set(url, null);
      return null;
    }
  };

  if (item.source === 'LOCAL') {
    const svgFromData = decodeSvgDataUri(item.imageUrl);
    if (svgFromData) {
      const fileName = `${baseName}.svg`;
      const filePath = path.join(PACK_IMAGES, fileName);
      await writeFile(filePath, svgFromData, 'utf8');
      return {
        imageFile: `images/${fileName}`,
        imageOriginalUrl: item.imageUrl,
      };
    }

    const fallback = fallbackSvg(item);
    const fileName = `${baseName}.svg`;
    const filePath = path.join(PACK_IMAGES, fileName);
    await writeFile(filePath, fallback, 'utf8');
    return {
      imageFile: `images/${fileName}`,
      imageOriginalUrl: 'generated-local-svg',
    };
  }

  if (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')) {
    const downloaded = await getFromUrl(item.imageUrl);
    if (downloaded) {
      const fileName = `${baseName}.${downloaded.ext}`;
      const filePath = path.join(PACK_IMAGES, fileName);
      await writeFile(filePath, downloaded.bytes);
      return {
        imageFile: `images/${fileName}`,
        imageOriginalUrl: downloaded.sourceUrl,
      };
    }
  }

  const fallback = fallbackSvg(item);
  const fileName = `${baseName}.svg`;
  const filePath = path.join(PACK_IMAGES, fileName);
  await writeFile(filePath, fallback, 'utf8');
  return {
    imageFile: `images/${fileName}`,
    imageOriginalUrl: 'generated-fallback-svg',
  };
}

async function main() {
  await rm(PACK_IMAGES, { recursive: true, force: true });
  await mkdir(PACK_IMAGES, { recursive: true });

  const items = (await prisma.externalCatalogItem.findMany({
    where: { isActive: true },
    orderBy: [{ source: 'asc' }, { brand: 'asc' }, { category: 'asc' }, { title: 'asc' }],
  })) as CatalogItem[];

  const downloadCache = new Map<string, DownloadedImage | null>();

  const rows: PackRow[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const image = await saveImageFile(
      {
        source: item.source,
        brand: item.brand,
        title: item.title,
        category: item.category,
        price: item.price,
        imageUrl: item.imageUrl,
      },
      index,
      downloadCache,
    );

    rows.push({
      pack_id: item.id,
      source: item.source,
      brand: item.brand,
      title: item.title,
      category: item.category,
      price: item.price,
      currency: item.currency,
      product_url: item.productUrl,
      image_file: image.imageFile,
      image_original_url: image.imageOriginalUrl,
      style_tags: item.styleTags.join('|'),
    });
  }

  const csvHeader = [
    'pack_id',
    'source',
    'brand',
    'title',
    'category',
    'price',
    'currency',
    'product_url',
    'image_file',
    'image_original_url',
    'style_tags',
  ];
  const csvLines = [
    csvHeader.join(','),
    ...rows.map((row) =>
      [
        row.pack_id,
        row.source,
        row.brand,
        row.title,
        row.category,
        row.price,
        row.currency,
        row.product_url,
        row.image_file,
        row.image_original_url,
        row.style_tags,
      ]
        .map(csvCell)
        .join(','),
    ),
  ];

  await writeFile(PACK_JSON, JSON.stringify(rows, null, 2), 'utf8');
  await writeFile(PACK_CSV, csvLines.join('\n'), 'utf8');
  await writeFile(
    PACK_README,
    [
      'GOTHYXAN PACK_ALL_CLOTHES',
      '',
      `Total items: ${rows.length}`,
      '',
      'Files:',
      '- items.csv     -> table with all clothes from DB',
      '- items.json    -> JSON version',
      '- images/*      -> local image files for every row',
      '',
      'Columns:',
      'pack_id, source, brand, title, category, price, currency, product_url, image_file, image_original_url, style_tags',
      '',
      'Open items.csv in Excel/Google Sheets.',
    ].join('\n'),
    'utf8',
  );

  console.log(`Pack exported: ${rows.length} items`);
  console.log(`CSV: ${PACK_CSV}`);
  console.log(`JSON: ${PACK_JSON}`);
  console.log(`Images: ${PACK_IMAGES}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
