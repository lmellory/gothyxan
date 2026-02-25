import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CHUNK_SIZE = 1000;

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toDataUriSvg({
  brand,
  name,
  category,
  price,
}: {
  brand: string;
  name: string;
  category: string;
  price: number;
}) {
  const safeBrand = escapeXml(brand);
  const safeName = escapeXml(name);
  const safeCategory = escapeXml(category.toUpperCase());
  const safePrice = escapeXml(`$${price}`);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)" />
  <rect x="72" y="72" width="1056" height="756" rx="42" fill="url(#card)" />
  <rect x="120" y="140" width="960" height="420" rx="28" fill="#111827" stroke="#334155" stroke-width="3" />
  <circle cx="260" cy="350" r="110" fill="#334155" />
  <rect x="420" y="260" width="590" height="68" rx="16" fill="#1f2937" />
  <rect x="420" y="350" width="420" height="54" rx="16" fill="#1f2937" />
  <rect x="420" y="425" width="300" height="44" rx="14" fill="#1f2937" />
  <text x="120" y="670" font-size="44" font-family="Arial, sans-serif" fill="#a3e635">${safeBrand}</text>
  <text x="120" y="735" font-size="46" font-family="Arial, sans-serif" fill="#f8fafc">${safeName}</text>
  <text x="120" y="790" font-size="34" font-family="Arial, sans-serif" fill="#93c5fd">${safeCategory} • ${safePrice}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

function toProductUrl(input: { referenceLink: string; title: string; brand: string; category: string }) {
  const reference = input.referenceLink?.trim() ?? '';
  const isHttp = reference.startsWith('http://') || reference.startsWith('https://');
  const isFakeLocal =
    reference.includes('gothyxan.local') ||
    reference.includes('localhost') ||
    reference.includes('127.0.0.1');

  if (isHttp && !isFakeLocal) {
    return reference;
  }

  const query = `${input.brand} ${input.title} ${input.category} buy`;
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

async function main() {
  const brandItems = await prisma.brandItem.findMany({
    where: {
      isActive: true,
      brand: { isActive: true },
    },
    include: {
      brand: true,
    },
  });

  const rows = brandItems.map((item) => ({
    source: 'LOCAL' as const,
    brand: item.brand.name,
    category: item.category,
    title: item.name,
    price: item.estimatedPrice,
    currency: 'USD',
    productUrl: toProductUrl({
      referenceLink: item.referenceLink,
      title: item.name,
      brand: item.brand.name,
      category: item.category,
    }),
    imageUrl: toDataUriSvg({
      brand: item.brand.name,
      name: item.name,
      category: item.category,
      price: item.estimatedPrice,
    }),
    styleTags: item.styleTags,
    isActive: true,
  }));

  await prisma.externalCatalogItem.deleteMany({
    where: { source: 'LOCAL' },
  });

  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const chunk = rows.slice(index, index + CHUNK_SIZE);
    await prisma.externalCatalogItem.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  const localExisting = await prisma.externalCatalogItem.findMany({
    where: { source: 'LOCAL' },
    select: { productUrl: true },
  });
  const localSet = new Set(localExisting.map((item) => item.productUrl));
  const missing = rows.filter((row) => !localSet.has(row.productUrl));

  if (missing.length) {
    for (const row of missing) {
      await prisma.externalCatalogItem.upsert({
        where: { productUrl: row.productUrl },
        update: {
          source: row.source,
          brand: row.brand,
          category: row.category,
          title: row.title,
          price: row.price,
          currency: row.currency,
          imageUrl: row.imageUrl,
          styleTags: row.styleTags,
          isActive: true,
        },
        create: row,
      });
    }
  }

  const finalCount = await prisma.externalCatalogItem.count({
    where: { source: 'LOCAL', isActive: true },
  });
  console.log(`Local catalog rebuilt: ${finalCount} items`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
