import { Injectable } from '@nestjs/common';
import { CatalogSource, ExternalCatalogItem } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../../database/prisma.service';
import { BrandItemWithBrand } from '../pipeline/brand-selector.service';

type ProductCategory = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory';

type ProductCatalogEntry = {
  name: string;
  query: string;
};

type OpenverseResult = {
  title?: string;
  url?: string;
  thumbnail?: string;
  mature?: boolean;
  width?: number;
};

type OpenverseResponse = {
  results?: OpenverseResult[];
};

const BRAND_DOMAINS: Record<string, string> = {
  Nike: 'nike.com',
  Adidas: 'adidas.com',
  Uniqlo: 'uniqlo.com',
  COS: 'cos.com',
  Arket: 'arket.com',
  "Levi's": 'levis.com',
  'Acne Studios': 'acnestudios.com',
  'A.P.C.': 'apcstore.com',
  'Off-White': 'off---white.com',
  Jacquemus: 'jacquemus.com',
  'Ami Paris': 'amiparis.com',
  Represent: 'representclo.com',
  Balenciaga: 'balenciaga.com',
  Prada: 'prada.com',
  'Saint Laurent': 'ysl.com',
  Dior: 'dior.com',
  Gucci: 'gucci.com',
  'Bottega Veneta': 'bottegaveneta.com',
};

const BRAND_PRODUCT_CATALOG: Record<string, Partial<Record<ProductCategory, ProductCatalogEntry>>> = {
  Nike: {
    top: { name: 'Nike Sportswear Club Fleece Hoodie', query: 'Nike Sportswear Club Fleece Hoodie men' },
    bottom: { name: 'Nike Sportswear Club Fleece Joggers', query: 'Nike Sportswear Club Fleece Joggers men' },
    shoes: { name: "Nike Air Force 1 '07", query: "Nike Air Force 1 '07 men" },
    outerwear: { name: 'Nike Windrunner Hooded Jacket', query: 'Nike Windrunner hooded jacket men' },
    accessory: { name: 'Nike Heritage Crossbody Bag', query: 'Nike Heritage crossbody bag' },
  },
  Adidas: {
    top: { name: 'Adidas Adicolor Classics Tee', query: 'Adidas Adicolor Classics tee men' },
    bottom: { name: 'Adidas Firebird Track Pants', query: 'Adidas Firebird track pants men' },
    shoes: { name: 'Adidas Samba OG', query: 'Adidas Samba OG shoes men' },
    outerwear: { name: 'Adidas Essentials Insulated Jacket', query: 'Adidas Essentials insulated jacket men' },
    accessory: { name: 'Adidas Trefoil Baseball Cap', query: 'Adidas Trefoil baseball cap' },
  },
  Uniqlo: {
    top: { name: 'Uniqlo AIRism Cotton Oversized T-Shirt', query: 'Uniqlo AIRism Cotton Oversized T-Shirt men' },
    bottom: { name: 'Uniqlo Smart Ankle Pants', query: 'Uniqlo Smart Ankle Pants men' },
    shoes: { name: 'Uniqlo Canvas Sneakers', query: 'Uniqlo men sneakers' },
    outerwear: { name: 'Uniqlo Ultra Light Down Jacket', query: 'Uniqlo Ultra Light Down Jacket men' },
    accessory: { name: 'Uniqlo Round Mini Shoulder Bag', query: 'Uniqlo Round Mini Shoulder Bag' },
  },
  COS: {
    top: { name: 'COS Relaxed-Fit Heavyweight T-Shirt', query: 'COS relaxed-fit heavyweight t-shirt men' },
    bottom: { name: 'COS Wide-Leg Wool Trousers', query: 'COS wide-leg wool trousers men' },
    shoes: { name: 'COS Minimal Leather Sneakers', query: 'COS minimal leather sneakers men' },
    outerwear: { name: 'COS Oversized Wool Coat', query: 'COS oversized wool coat men' },
    accessory: { name: 'COS Leather Cardholder', query: 'COS leather cardholder' },
  },
  Arket: {
    top: { name: 'Arket Heavyweight T-Shirt', query: 'Arket heavyweight t-shirt men' },
    bottom: { name: 'Arket Relaxed Chino Trousers', query: 'Arket relaxed chino trousers men' },
    shoes: { name: 'Arket Leather Sneakers', query: 'Arket leather sneakers men' },
    outerwear: { name: 'Arket Recycled Down Jacket', query: 'Arket recycled down jacket men' },
    accessory: { name: 'Arket Ribbed Wool Beanie', query: 'Arket ribbed wool beanie' },
  },
  "Levi's": {
    top: { name: "Levi's Authentic Button-Down Shirt", query: "Levi's authentic button-down shirt men" },
    bottom: { name: "Levi's 501 Original Fit Jeans", query: "Levi's 501 Original Fit jeans men" },
    shoes: { name: "Levi's Piper Sneakers", query: "Levi's Piper sneakers men" },
    outerwear: { name: "Levi's Trucker Jacket", query: "Levi's Trucker Jacket men" },
    accessory: { name: "Levi's Batwing Logo Cap", query: "Levi's Batwing logo cap" },
  },
  'Acne Studios': {
    top: { name: 'Acne Studios Face Logo T-Shirt', query: 'Acne Studios Face logo t-shirt men' },
    bottom: { name: 'Acne Studios Tailored Wool Trousers', query: 'Acne Studios tailored wool trousers men' },
    shoes: { name: 'Acne Studios Bolzter Sneakers', query: 'Acne Studios Bolzter sneakers men' },
    outerwear: { name: 'Acne Studios Oversized Puffer', query: 'Acne Studios oversized puffer jacket men' },
    accessory: { name: 'Acne Studios Logo Scarf', query: 'Acne Studios logo scarf' },
  },
  'A.P.C.': {
    top: { name: 'A.P.C. Rue Madame T-Shirt', query: 'A.P.C. Rue Madame t-shirt men' },
    bottom: { name: 'A.P.C. Petit New Standard Jeans', query: 'A.P.C. Petit New Standard jeans' },
    shoes: { name: 'A.P.C. Run Around Sneakers', query: 'A.P.C. Run Around sneakers men' },
    outerwear: { name: 'A.P.C. New Mac Coat', query: 'A.P.C. New Mac coat men' },
    accessory: { name: 'A.P.C. Daniela Tote Bag', query: 'A.P.C. Daniela tote bag' },
  },
  'Off-White': {
    top: { name: 'Off-White Diag Arrow Hoodie', query: 'Off-White Diag Arrow hoodie men' },
    bottom: { name: 'Off-White Cargo Pants', query: 'Off-White cargo pants men' },
    shoes: { name: 'Off-White Out Of Office Sneakers', query: 'Off-White Out Of Office sneakers' },
    outerwear: { name: 'Off-White Diag Denim Jacket', query: 'Off-White Diag denim jacket men' },
    accessory: { name: 'Off-White Industrial Belt', query: 'Off-White Industrial belt' },
  },
  Jacquemus: {
    top: { name: 'Jacquemus Le T-shirt Gros Grain', query: 'Jacquemus Le T-shirt Gros Grain men' },
    bottom: { name: 'Jacquemus Le Pantalon Pago', query: 'Jacquemus Le Pantalon Pago men' },
    shoes: { name: 'Jacquemus Les Sneakers H24', query: 'Jacquemus Les Sneakers H24' },
    outerwear: { name: 'Jacquemus Le Blouson Meunier', query: 'Jacquemus Le Blouson Meunier' },
    accessory: { name: 'Jacquemus Le Bambino Bag', query: 'Jacquemus Le Bambino bag' },
  },
  'Ami Paris': {
    top: { name: 'Ami Paris Ami de Coeur T-Shirt', query: 'Ami Paris Ami de Coeur t-shirt men' },
    bottom: { name: 'Ami Paris Straight-Fit Trousers', query: 'Ami Paris straight-fit trousers men' },
    shoes: { name: 'Ami Paris Low-Top Sneakers', query: 'Ami Paris low-top sneakers men' },
    outerwear: { name: 'Ami Paris Oversized Wool Coat', query: 'Ami Paris oversized wool coat men' },
    accessory: { name: 'Ami Paris Ami de Coeur Cap', query: 'Ami Paris Ami de Coeur cap' },
  },
  Represent: {
    top: { name: 'Represent Owners Club Hoodie', query: 'Represent Owners Club hoodie men' },
    bottom: { name: 'Represent Baggy Denim Jeans', query: 'Represent baggy denim jeans men' },
    shoes: { name: 'Represent Reptor Low Sneakers', query: 'Represent Reptor low sneakers' },
    outerwear: { name: 'Represent Storms In Heaven Puffer', query: 'Represent Storms In Heaven puffer jacket' },
    accessory: { name: 'Represent Initial Cap', query: 'Represent Initial cap' },
  },
  Balenciaga: {
    top: { name: 'Balenciaga Political Campaign T-Shirt', query: 'Balenciaga Political Campaign t-shirt men' },
    bottom: { name: 'Balenciaga Tailored Wool Trousers', query: 'Balenciaga tailored wool trousers men' },
    shoes: { name: 'Balenciaga Triple S Sneakers', query: 'Balenciaga Triple S sneakers men' },
    outerwear: { name: 'Balenciaga Oversized Puffer Jacket', query: 'Balenciaga oversized puffer jacket men' },
    accessory: { name: 'Balenciaga Le Cagole Card Holder', query: 'Balenciaga Le Cagole card holder' },
  },
  Prada: {
    top: { name: 'Prada Re-Nylon T-Shirt', query: 'Prada Re-Nylon t-shirt men' },
    bottom: { name: 'Prada Re-Nylon Gabardine Pants', query: 'Prada Re-Nylon gabardine pants men' },
    shoes: { name: "Prada America's Cup Sneakers", query: "Prada America's Cup sneakers men" },
    outerwear: { name: 'Prada Re-Nylon Hooded Jacket', query: 'Prada Re-Nylon hooded jacket men' },
    accessory: { name: 'Prada Saffiano Card Holder', query: 'Prada Saffiano card holder' },
  },
  'Saint Laurent': {
    top: { name: 'Saint Laurent Logo T-Shirt', query: 'Saint Laurent logo t-shirt men' },
    bottom: { name: 'Saint Laurent Slim-Fit Jeans', query: 'Saint Laurent slim-fit jeans men' },
    shoes: { name: 'Saint Laurent Court Classic SL/06', query: 'Saint Laurent Court Classic SL/06 sneakers men' },
    outerwear: { name: 'Saint Laurent Teddy Jacket', query: 'Saint Laurent Teddy jacket men' },
    accessory: { name: 'Saint Laurent Monogram Card Holder', query: 'Saint Laurent monogram card holder' },
  },
  Dior: {
    top: { name: 'Dior CD Icon T-Shirt', query: 'Dior CD Icon t-shirt men' },
    bottom: { name: 'Dior Oblique Trousers', query: 'Dior Oblique trousers men' },
    shoes: { name: 'Dior B27 Low-Top Sneakers', query: 'Dior B27 low-top sneakers men' },
    outerwear: { name: 'Dior Oblique Jacket', query: 'Dior Oblique jacket men' },
    accessory: { name: 'Dior Saddle Pouch', query: 'Dior Saddle pouch men' },
  },
  Gucci: {
    top: { name: 'Gucci Cotton Jersey Logo T-Shirt', query: 'Gucci cotton jersey logo t-shirt men' },
    bottom: { name: 'Gucci GG Canvas Trousers', query: 'Gucci GG canvas trousers men' },
    shoes: { name: 'Gucci Ace Embroidered Sneakers', query: 'Gucci Ace embroidered sneakers men' },
    outerwear: { name: 'Gucci GG Canvas Jacket', query: 'Gucci GG canvas jacket men' },
    accessory: { name: 'Gucci Ophidia Card Case', query: 'Gucci Ophidia card case' },
  },
  'Bottega Veneta': {
    top: { name: 'Bottega Veneta Cotton T-Shirt', query: 'Bottega Veneta cotton t-shirt men' },
    bottom: { name: 'Bottega Veneta Tailored Wool Trousers', query: 'Bottega Veneta tailored wool trousers men' },
    shoes: { name: 'Bottega Veneta Orbit Sneakers', query: 'Bottega Veneta Orbit sneakers men' },
    outerwear: { name: 'Bottega Veneta Technical Nylon Jacket', query: 'Bottega Veneta technical nylon jacket men' },
    accessory: { name: 'Bottega Veneta Intrecciato Card Holder', query: 'Bottega Veneta Intrecciato card holder' },
  },
};

@Injectable()
export class ProductCardResolverService {
  private readonly cacheTtlMs = 1000 * 60 * 60 * 12;
  private readonly endAvailabilityTtlMs = 1000 * 60 * 30;
  private readonly imageCache = new Map<string, { imageUrl: string; expiresAt: number }>();
  private endLaunchesAvailability: { accessible: boolean; expiresAt: number } | null = null;
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    piece: BrandItemWithBrand,
    style: string,
  ): Promise<{
    itemName: string;
    referenceLink: string;
    imageUrl: string;
    resolvedBrand?: string;
    resolvedPrice?: number | null;
  }> {
    const category = this.normalizeCategory(piece.category);
    const localEndMatch = await this.findCatalogSourceItem('END', piece, category, style);
    if (localEndMatch && this.isHttpUrl(localEndMatch.imageUrl)) {
      return {
        itemName: localEndMatch.title,
        referenceLink: await this.resolveProductLink(localEndMatch),
        imageUrl: this.normalizeHttps(localEndMatch.imageUrl),
        resolvedBrand: localEndMatch.brand,
        resolvedPrice: localEndMatch.price,
      };
    }

    const localCatalogMatch = await this.findCatalogSourceItem('LOCAL', piece, category, style);
    if (localCatalogMatch) {
      const resolvedImageUrl = this.isHttpUrl(localCatalogMatch.imageUrl)
        ? this.normalizeHttps(localCatalogMatch.imageUrl)
        : await this.resolveImage(
            `${localCatalogMatch.brand} ${localCatalogMatch.title} ${this.categoryLabel(category)} ${style}`.trim(),
            localCatalogMatch.brand,
          );

      return {
        itemName: localCatalogMatch.title,
        referenceLink: this.normalizeHttps(localCatalogMatch.productUrl),
        imageUrl: resolvedImageUrl,
        resolvedBrand: localCatalogMatch.brand,
        resolvedPrice: localCatalogMatch.price,
      };
    }

    const entry = BRAND_PRODUCT_CATALOG[piece.brand.name]?.[category];
    const itemName = piece.name?.trim() || entry?.name || this.defaultItemName(piece.brand.name, category);
    const query = `${piece.brand.name} ${itemName} ${this.categoryLabel(category)} ${style}`.trim();
    const referenceLink = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
    const imageUrl = await this.resolveImage(query, piece.brand.name);

    return {
      itemName,
      referenceLink,
      imageUrl,
    };
  }

  private async findCatalogSourceItem(
    source: CatalogSource,
    piece: BrandItemWithBrand,
    category: ProductCategory,
    style: string,
  ) {
    const exactBrandAndCategory = await this.queryCatalogItems(source, {
      category,
      brand: piece.brand.name,
    });
    const exactPicked = this.pickCatalogCandidate(exactBrandAndCategory, style, piece.estimatedPrice);
    if (exactPicked) {
      return exactPicked;
    }

    return null;
  }

  private pickByPrice(items: ExternalCatalogItem[], targetPrice: number) {
    const withPrice = items.filter((item) => typeof item.price === 'number' && item.price > 0);
    if (!withPrice.length) {
      return items;
    }

    const sorted = [...withPrice].sort((a, b) => {
      const da = Math.abs((a.price ?? targetPrice) - targetPrice);
      const db = Math.abs((b.price ?? targetPrice) - targetPrice);
      return da - db;
    });

    return sorted.slice(0, Math.min(8, sorted.length));
  }

  private async queryCatalogItems(
    source: CatalogSource,
    filters: { category?: ProductCategory; brand?: string },
  ) {
    const raw = await this.prisma.externalCatalogItem.findMany({
      where: {
        source,
        isActive: true,
        ...(filters.category
          ? {
              category: filters.category,
            }
          : {}),
        ...(filters.brand
          ? {
              OR: [
                { brand: filters.brand },
                {
                  brand: {
                    contains: filters.brand,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      take: 160,
      orderBy: { updatedAt: 'desc' },
    });

    if (!filters.category || source !== 'END') {
      return raw;
    }

    return raw.filter((item) => this.inferCategoryFromTitle(item.title) === filters.category);
  }

  private pickCatalogCandidate(items: ExternalCatalogItem[], style: string, targetPrice: number) {
    if (!items.length) {
      return null;
    }
    const styleMatched = items.filter((item) => item.styleTags.includes(style));
    const pool = styleMatched.length ? styleMatched : items;
    const maxAllowed = Math.ceil(targetPrice * 1.25);
    const minAllowed = Math.max(10, Math.floor(targetPrice * 0.45));
    const budgetMatched = pool.filter((item) => {
      if (typeof item.price !== 'number' || item.price <= 0) {
        return false;
      }
      return item.price >= minAllowed && item.price <= maxAllowed;
    });
    const candidates = budgetMatched.length ? budgetMatched : pool;
    const priceAligned = this.pickByPrice(candidates, targetPrice);
    return this.pickRandom(priceAligned);
  }

  private async resolveProductLink(item: ExternalCatalogItem) {
    const direct = this.normalizeHttps(item.productUrl);
    const mode = (process.env.END_LINK_FALLBACK_MODE ?? 'auto').toLowerCase();
    if (mode === 'direct') {
      return direct;
    }
    if (mode === 'google') {
      return this.googleSearchLink(`${item.title} END Clothing`);
    }

    const isDirectAvailable = await this.isEndLaunchesAvailable();
    return isDirectAvailable ? direct : this.googleSearchLink(`${item.title} END Clothing`);
  }

  private pickRandom<T>(items: T[]) {
    return items[Math.floor(Math.random() * items.length)];
  }

  private normalizeCategory(rawCategory: string): ProductCategory {
    if (rawCategory === 'accessory') {
      return 'accessory';
    }
    if (rawCategory === 'top' || rawCategory === 'bottom' || rawCategory === 'shoes' || rawCategory === 'outerwear') {
      return rawCategory;
    }
    return 'top';
  }

  private categoryLabel(category: ProductCategory) {
    const labels: Record<ProductCategory, string> = {
      top: 't-shirt',
      bottom: 'pants',
      shoes: 'sneakers',
      outerwear: 'jacket',
      accessory: 'accessory',
    };
    return labels[category];
  }

  private defaultItemName(brand: string, category: ProductCategory) {
    const names: Record<ProductCategory, string> = {
      top: `${brand} Essential Top`,
      bottom: `${brand} Essential Bottom`,
      shoes: `${brand} Sneakers`,
      outerwear: `${brand} Jacket`,
      accessory: `${brand} Accessory`,
    };
    return names[category];
  }

  private async resolveImage(query: string, brand: string) {
    const cacheKey = query.toLowerCase();
    const cached = this.imageCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.imageUrl;
    }

    const fromOpenverse = await this.searchOpenverse(query);
    if (fromOpenverse) {
      this.imageCache.set(cacheKey, {
        imageUrl: fromOpenverse,
        expiresAt: Date.now() + this.cacheTtlMs,
      });
      return fromOpenverse;
    }

    const fallback = this.brandLogoFallback(brand);
    this.imageCache.set(cacheKey, {
      imageUrl: fallback,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
    return fallback;
  }

  private async searchOpenverse(query: string) {
    try {
      const response = await axios.get<OpenverseResponse>('https://api.openverse.org/v1/images/', {
        params: {
          q: query,
          page_size: 10,
        },
        timeout: 3500,
        headers: {
          'User-Agent': 'GOTHYXAN/1.0',
        },
      });

      const results = response.data.results ?? [];
      const match = results.find((result) => {
        if (result.mature) {
          return false;
        }
        const width = result.width ?? 0;
        return width >= 300 && this.isHttpUrl(result.url);
      });

      if (match?.url) {
        return match.url;
      }

      const thumbnail = results.find((result) => this.isHttpUrl(result.thumbnail))?.thumbnail;
      return thumbnail ?? null;
    } catch {
      return null;
    }
  }

  private isHttpUrl(value: string | undefined): value is string {
    return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
  }

  private brandLogoFallback(brand: string) {
    const domain = BRAND_DOMAINS[brand] ?? 'nike.com';
    return `https://logo.clearbit.com/${domain}`;
  }

  private async isEndLaunchesAvailable() {
    const cached = this.endLaunchesAvailability;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.accessible;
    }

    try {
      const response = await axios.get('https://launches.endclothing.com', {
        timeout: 2500,
        maxRedirects: 0,
        validateStatus: () => true,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        },
      });
      const accessible = response.status >= 200 && response.status < 400;
      this.endLaunchesAvailability = {
        accessible,
        expiresAt: Date.now() + this.endAvailabilityTtlMs,
      };
      return accessible;
    } catch {
      this.endLaunchesAvailability = {
        accessible: false,
        expiresAt: Date.now() + this.endAvailabilityTtlMs,
      };
      return false;
    }
  }

  private googleSearchLink(query: string) {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  private normalizeHttps(value: string) {
    return value.startsWith('http://') ? `https://${value.slice('http://'.length)}` : value;
  }

  private inferCategoryFromTitle(title: string): ProductCategory {
    const text = title.toLowerCase();

    if (/(sneaker|trainer|shoe|runner|court|retro|low|high|zx|samba|superstar|climacool|taekwondo)/.test(text)) {
      return 'shoes';
    }
    if (/(jacket|coat|parka|bomber|anorak|gilet|trucker|windrunner|shell|puffer)/.test(text)) {
      return 'outerwear';
    }
    if (/(hoodie|t-shirt|tee|shirt|sweatshirt|jersey|polo|knit|crewneck|overshirt)/.test(text)) {
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
}
