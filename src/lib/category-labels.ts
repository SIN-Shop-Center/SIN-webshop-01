// Purpose: German display labels for raw CJ category names
// Docs: AGENTS.md

const CATEGORY_LABELS_DE: Record<string, string> = {
  'Bedding Sets': 'Bettwäsche-Sets',
  Blazers: 'Blazer',
  'Bracelets & Bangles': 'Armbänder & Armreifen',
  Earrings: 'Ohrringe',
  'Facial Care': 'Gesichtspflege',
  'Fashion Backpacks': 'Mode-Rucksäcke',
  'Home Office Storage': 'Büro & Aufbewahrung',
  'Lady Dresses': 'Damenkleider',
  "Men's Shirts": 'Herrenhemden',
  'Necklace & Pendants': 'Halsketten & Anhänger',
  'Pet Clothings': 'Haustierkleidung',
  'Pet Clothing Sets': 'Haustier-Kleidungssets',
  'Pet Collar, Leash & Harness Sets': 'Halsband-, Leinen- & Geschirr-Sets',
  'Pet Collars': 'Halsbänder',
  'Pet Leashes': 'Hundeleinen',
  'Pet Nests': 'Haustierbetten',
  'Pet Tops': 'Haustier-Oberteile',
  'Pet Toy Set': 'Haustier-Spielzeugsets',
  Print: 'Prints & Drucke',
  Pumps: 'Pumps',
  Solid: 'Unifarben',
  Speakers: 'Lautsprecher',
  'Suits & Sets': 'Anzüge & Sets',
  'Vulcanize Shoe': 'Sneaker',
}

/** Übersetzt einen CJ-Kategorienamen ins Deutsche (Fallback: Originalname). */
export function translateCategory(name: string): string {
  return CATEGORY_LABELS_DE[name] ?? name
}
