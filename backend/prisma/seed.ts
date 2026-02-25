import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Tier = 1 | 2 | 3;
type Category = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory';

type BrandSeed = {
  name: string;
  tier: Tier;
  styleTags: string[];
};

type TemplateSeed = {
  name: string;
  styleTags: string[];
  occasionTags: string[];
};

const featuredStyles = [
  { name: 'streetwear', description: 'Relaxed urban silhouettes with statement sneakers.' },
  { name: 'minimal', description: 'Clean lines, simple shapes, restrained palette.' },
  { name: 'old money', description: 'Tailored classics and premium textures.' },
  { name: 'luxury', description: 'High-end statement pieces and accessories.' },
  { name: 'techwear', description: 'Technical layers and utility details.' },
  { name: 'business', description: 'Modern office-ready fits.' },
  { name: 'vintage', description: 'Retro-influenced styling and denim focus.' },
  { name: 'y2k', description: '2000s references and bold sneaker culture.' },
  { name: 'smart casual', description: 'Balanced polished and relaxed pieces.' },
  { name: 'goth', description: 'Dark palette with edgy tailoring.' },
  { name: 'avant-garde', description: 'Directional silhouettes and experimental shapes.' },
];

const brands: BrandSeed[] = [
  { name: 'Nike', tier: 1, styleTags: ['streetwear', 'sport', 'casual', 'y2k'] },
  { name: 'Adidas', tier: 1, styleTags: ['streetwear', 'sport', 'casual'] },
  { name: 'Uniqlo', tier: 1, styleTags: ['minimal', 'casual', 'smart casual'] },
  { name: 'COS', tier: 1, styleTags: ['minimal', 'old money', 'smart casual'] },
  { name: 'Arket', tier: 1, styleTags: ['minimal', 'casual', 'smart casual'] },
  { name: "Levi's", tier: 1, styleTags: ['vintage', 'streetwear', 'casual'] },

  { name: 'Acne Studios', tier: 2, styleTags: ['minimal', 'avant-garde', 'streetwear'] },
  { name: 'A.P.C.', tier: 2, styleTags: ['minimal', 'smart casual', 'old money'] },
  { name: 'Off-White', tier: 2, styleTags: ['streetwear', 'luxury', 'y2k'] },
  { name: 'Jacquemus', tier: 2, styleTags: ['luxury', 'minimal', 'avant-garde'] },
  { name: 'Ami Paris', tier: 2, styleTags: ['smart casual', 'old money', 'minimal'] },
  { name: 'Represent', tier: 2, styleTags: ['streetwear', 'grunge', 'dark'] },

  { name: 'Balenciaga', tier: 3, styleTags: ['luxury', 'streetwear', 'avant-garde'] },
  { name: 'Prada', tier: 3, styleTags: ['luxury', 'minimal', 'techwear'] },
  { name: 'Saint Laurent', tier: 3, styleTags: ['luxury', 'goth', 'dark'] },
  { name: 'Dior', tier: 3, styleTags: ['luxury', 'business', 'smart casual'] },
  { name: 'Gucci', tier: 3, styleTags: ['luxury', 'vintage', 'streetwear'] },
  { name: 'Bottega Veneta', tier: 3, styleTags: ['luxury', 'minimal', 'avant-garde'] },
];

const priceRanges: Record<Tier, Record<Category, [number, number]>> = {
  1: {
    top: [35, 130],
    bottom: [45, 160],
    shoes: [70, 230],
    outerwear: [95, 290],
    accessory: [20, 120],
  },
  2: {
    top: [120, 460],
    bottom: [140, 520],
    shoes: [180, 700],
    outerwear: [260, 1100],
    accessory: [80, 380],
  },
  3: {
    top: [320, 1900],
    bottom: [360, 2100],
    shoes: [420, 2400],
    outerwear: [700, 4600],
    accessory: [180, 1700],
  },
};

const templates: Record<Category, TemplateSeed[]> = {
  top: [
    {
      name: 'Boxy Tee',
      styleTags: ['streetwear', 'minimal', 'casual'],
      occasionTags: ['study', 'walk', 'travel', 'party'],
    },
    {
      name: 'Relaxed Hoodie',
      styleTags: ['streetwear', 'y2k', 'casual'],
      occasionTags: ['walk', 'travel', 'party'],
    },
    {
      name: 'Long Sleeve Jersey',
      styleTags: ['streetwear', 'sport', 'y2k'],
      occasionTags: ['walk', 'party', 'event'],
    },
    {
      name: 'Open Collar Shirt',
      styleTags: ['minimal', 'smart casual', 'old money'],
      occasionTags: ['office', 'date', 'event'],
    },
    {
      name: 'Knit Polo',
      styleTags: ['minimal', 'old money', 'smart casual'],
      occasionTags: ['office', 'date', 'event'],
    },
    {
      name: 'Utility Overshirt',
      styleTags: ['techwear', 'streetwear', 'avant-garde'],
      occasionTags: ['walk', 'travel', 'event'],
    },
  ],
  bottom: [
    {
      name: 'Relaxed Denim',
      styleTags: ['streetwear', 'vintage', 'casual'],
      occasionTags: ['study', 'walk', 'travel'],
    },
    {
      name: 'Wide Cargo Pants',
      styleTags: ['streetwear', 'techwear', 'y2k'],
      occasionTags: ['walk', 'travel', 'party'],
    },
    {
      name: 'Tailored Trousers',
      styleTags: ['minimal', 'business', 'old money'],
      occasionTags: ['office', 'date', 'event'],
    },
    {
      name: 'Straight Chinos',
      styleTags: ['smart casual', 'minimal', 'casual'],
      occasionTags: ['study', 'office', 'date'],
    },
    {
      name: 'Track Pants',
      styleTags: ['sport', 'streetwear', 'y2k'],
      occasionTags: ['walk', 'travel', 'party'],
    },
    {
      name: 'Baggy Shorts',
      styleTags: ['streetwear', 'y2k', 'casual'],
      occasionTags: ['study', 'walk', 'travel'],
    },
  ],
  shoes: [
    {
      name: 'Court Sneaker',
      styleTags: ['streetwear', 'casual', 'y2k'],
      occasionTags: ['study', 'walk', 'date'],
    },
    {
      name: 'Retro Runner',
      styleTags: ['streetwear', 'sport', 'vintage'],
      occasionTags: ['walk', 'travel', 'party'],
    },
    {
      name: 'Tech Runner',
      styleTags: ['techwear', 'sport', 'streetwear'],
      occasionTags: ['walk', 'travel', 'event'],
    },
    {
      name: 'Monochrome Leather Sneaker',
      styleTags: ['minimal', 'smart casual', 'old money'],
      occasionTags: ['office', 'date', 'event'],
    },
    {
      name: 'Chunky Sneaker',
      styleTags: ['y2k', 'streetwear', 'avant-garde'],
      occasionTags: ['party', 'walk', 'event'],
    },
    {
      name: 'Trail Sneaker',
      styleTags: ['techwear', 'casual', 'streetwear'],
      occasionTags: ['walk', 'travel', 'weekend'],
    },
  ],
  outerwear: [
    {
      name: 'Coach Jacket',
      styleTags: ['streetwear', 'casual', 'minimal'],
      occasionTags: ['walk', 'study', 'travel'],
    },
    {
      name: 'Bomber Jacket',
      styleTags: ['streetwear', 'y2k', 'goth'],
      occasionTags: ['party', 'walk', 'event'],
    },
    {
      name: 'Wool Coat',
      styleTags: ['old money', 'business', 'minimal'],
      occasionTags: ['office', 'date', 'event'],
    },
    {
      name: 'Shell Jacket',
      styleTags: ['techwear', 'sport', 'streetwear'],
      occasionTags: ['walk', 'travel', 'weekend'],
    },
    {
      name: 'Trucker Jacket',
      styleTags: ['vintage', 'streetwear', 'casual'],
      occasionTags: ['study', 'walk', 'travel'],
    },
    {
      name: 'Puffer Jacket',
      styleTags: ['streetwear', 'minimal', 'goth'],
      occasionTags: ['walk', 'party', 'travel'],
    },
  ],
  accessory: [
    {
      name: 'Crossbody Bag',
      styleTags: ['streetwear', 'techwear', 'casual'],
      occasionTags: ['walk', 'travel', 'party'],
    },
    {
      name: 'Baseball Cap',
      styleTags: ['streetwear', 'sport', 'y2k'],
      occasionTags: ['study', 'walk', 'travel'],
    },
    {
      name: 'Leather Belt',
      styleTags: ['smart casual', 'business', 'old money'],
      occasionTags: ['office', 'date', 'event'],
    },
    {
      name: 'Beanie',
      styleTags: ['streetwear', 'goth', 'casual'],
      occasionTags: ['walk', 'travel', 'weekend'],
    },
    {
      name: 'Card Holder',
      styleTags: ['minimal', 'luxury', 'business'],
      occasionTags: ['office', 'date', 'event'],
    },
    {
      name: 'Tote Bag',
      styleTags: ['minimal', 'streetwear', 'smart casual'],
      occasionTags: ['study', 'travel', 'walk'],
    },
  ],
};

const variantsByCategory: Record<Category, Array<{ label: string; styleTags: string[] }>> = {
  top: [
    { label: 'Oversized', styleTags: ['streetwear', 'y2k'] },
    { label: 'Tailored', styleTags: ['smart casual', 'business', 'old money'] },
    { label: 'Utility', styleTags: ['techwear', 'avant-garde'] },
    { label: 'Washed', styleTags: ['vintage', 'streetwear'] },
    { label: 'Monochrome', styleTags: ['minimal', 'goth'] },
  ],
  bottom: [
    { label: 'Relaxed', styleTags: ['streetwear', 'casual'] },
    { label: 'Tailored', styleTags: ['old money', 'business', 'minimal'] },
    { label: 'Utility', styleTags: ['techwear', 'streetwear'] },
    { label: 'Vintage', styleTags: ['vintage', 'streetwear'] },
    { label: 'Dark', styleTags: ['goth', 'minimal'] },
  ],
  shoes: [
    { label: 'Low', styleTags: ['streetwear', 'casual'] },
    { label: 'Premium', styleTags: ['luxury', 'smart casual'] },
    { label: 'Performance', styleTags: ['sport', 'techwear'] },
    { label: 'Retro', styleTags: ['vintage', 'streetwear', 'y2k'] },
    { label: 'Minimal', styleTags: ['minimal', 'smart casual'] },
  ],
  outerwear: [
    { label: 'Lightweight', styleTags: ['minimal', 'casual'] },
    { label: 'Heavy', styleTags: ['streetwear', 'goth'] },
    { label: 'Technical', styleTags: ['techwear', 'avant-garde'] },
    { label: 'Tailored', styleTags: ['old money', 'business'] },
    { label: 'Vintage', styleTags: ['vintage', 'streetwear'] },
  ],
  accessory: [
    { label: 'Core', styleTags: ['minimal', 'casual'] },
    { label: 'Statement', styleTags: ['luxury', 'avant-garde'] },
    { label: 'Utility', styleTags: ['techwear', 'streetwear'] },
    { label: 'Vintage', styleTags: ['vintage', 'streetwear'] },
    { label: 'Dark', styleTags: ['goth', 'minimal'] },
  ],
};

const colorways = ['Black', 'White', 'Olive', 'Stone'];

const categoryOrder: Category[] = ['top', 'bottom', 'shoes', 'outerwear', 'accessory'];

function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

function mergeTags(...groups: string[][]) {
  return [...new Set(groups.flat().map(normalizeTag))];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickPrice(
  brand: string,
  category: Category,
  variant: string,
  itemName: string,
  colorway: string,
  tier: Tier,
) {
  const [min, max] = priceRanges[tier][category];
  const spread = max - min + 1;
  const seed = hashString(`${brand}|${category}|${variant}|${itemName}|${colorway}|${tier}`);
  return min + (seed % spread);
}

function buildReferenceLink(brand: string, category: Category, itemName: string) {
  const query = `${brand} ${itemName} ${category} buy`;
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

async function main() {
  for (const style of featuredStyles) {
    await prisma.featuredStyle.upsert({
      where: { name: style.name },
      update: { description: style.description, isFeatured: true },
      create: { name: style.name, description: style.description, isFeatured: true },
    });
  }

  for (const brandSeed of brands) {
    const brand = await prisma.brand.upsert({
      where: { name: brandSeed.name },
      update: {
        tier: brandSeed.tier,
        isActive: true,
        categories: categoryOrder,
        styleTags: brandSeed.styleTags.map(normalizeTag),
      },
      create: {
        name: brandSeed.name,
        tier: brandSeed.tier,
        isActive: true,
        categories: categoryOrder,
        styleTags: brandSeed.styleTags.map(normalizeTag),
      },
    });

    await prisma.brandItem.deleteMany({ where: { brandId: brand.id } });

    for (const category of categoryOrder) {
      for (const template of templates[category]) {
        for (const variant of variantsByCategory[category]) {
          for (const colorway of colorways) {
            const itemName = `${brandSeed.name} ${variant.label} ${template.name} (${colorway})`;
            const estimatedPrice = pickPrice(
              brandSeed.name,
              category,
              variant.label,
              template.name,
              colorway,
              brandSeed.tier,
            );

            await prisma.brandItem.create({
              data: {
                brandId: brand.id,
                name: itemName,
                category,
                estimatedPrice,
                tier: brandSeed.tier,
                styleTags: mergeTags(brandSeed.styleTags, template.styleTags, variant.styleTags),
                occasionTags: mergeTags(template.occasionTags),
                referenceLink: buildReferenceLink(brandSeed.name, category, itemName),
                isActive: true,
              },
            });
          }
        }
      }
    }
  }

  const totalItems = await prisma.brandItem.count();
  console.log(`Seed completed. Brand items: ${totalItems}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
