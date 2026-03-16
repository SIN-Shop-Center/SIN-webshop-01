import type { Category } from '@/types'

export const sampleCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Elektronik',
    slug: 'elektronik',
    description: 'Smartphones, Tablets, Zubehör und mehr',
    image: '/catalog/electronics.svg',
  },
  {
    id: 'cat-2',
    name: 'Mode',
    slug: 'mode',
    description: 'Kleidung, Schuhe und Accessoires',
    image: '/catalog/fashion.svg',
  },
  {
    id: 'cat-3',
    name: 'Haus & Garten',
    slug: 'haus-garten',
    description: 'Möbel, Dekoration und Gartenbedarf',
    image: '/catalog/home-living.svg',
  },
  {
    id: 'cat-4',
    name: 'Sport & Freizeit',
    slug: 'sport-freizeit',
    description: 'Fitnessgeräte, Outdoor und Hobby',
    image: '/catalog/sports.svg',
  },
  {
    id: 'cat-5',
    name: 'Beauty & Gesundheit',
    slug: 'beauty-gesundheit',
    description: 'Kosmetik, Pflege und Wellness',
    image: '/catalog/beauty.svg',
  },
  {
    id: 'cat-6',
    name: 'Spielzeug',
    slug: 'spielzeug',
    description: 'Spiele, Puppen und Kreatives',
    image: '/catalog/kids.svg',
  },
]
