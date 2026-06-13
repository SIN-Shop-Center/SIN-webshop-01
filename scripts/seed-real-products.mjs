import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.delqhi.com',
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const categories = [
  { id: 'cat-1', name: 'Tech & Gadgets', slug: 'tech-gadgets' },
  { id: 'cat-2', name: 'Lifestyle & Accessories', slug: 'lifestyle-accessories' },
  { id: 'cat-3', name: 'Home & Living', slug: 'home-living' },
];

const products = [
  {
    id: 'prod-1',
    title: 'SIN Neon X ANC Headphones',
    description: 'Premium kabellose Kopfhörer mit aktivem Noise Cancelling, 40h Akkulaufzeit und kristallklarem Sound. Perfekt für Musik, Calls und Fokus.',
    price: 149.99,
    original_price: 199.99,
    category_id: 'cat-1',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    image_gallery: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',
    ],
    stock: 15,
    rating: 4.8,
    rating_count: 124,
    sold_count: 450,
    is_featured: true,
    is_active: true,
    metadata: {
      features: ['Aktives Noise Cancelling', '40h Akkulaufzeit', 'Bluetooth 5.3', 'Faltbares Design'],
      specifications: { 'Gewicht': '250g', 'Treibereinheit': '40mm', 'Frequenzbereich': '20Hz - 20kHz' },
    },
  },
  {
    id: 'prod-2',
    title: 'Minimalist Mechanical Keyboard',
    description: 'Kompakte mechanische Tastatur mit Hot-Swap-Switches, RGB-Beleuchtung und USB-C. Ideal für Gaming und produktives Arbeiten.',
    price: 89.99,
    original_price: null,
    category_id: 'cat-1',
    image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
    image_gallery: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800'],
    stock: 8,
    rating: 4.6,
    rating_count: 89,
    sold_count: 230,
    is_featured: true,
    is_active: true,
    metadata: {
      features: ['Hot-Swap-Switches', 'RGB-Beleuchtung', 'USB-C', 'Kompaktes 75%-Layout'],
      specifications: { 'Switches': 'Gateron Brown', 'Layout': '75%', 'Kabel': '1.8m USB-C' },
    },
  },
  {
    id: 'prod-3',
    title: 'Smart Watch Pro',
    description: 'Fitness-Tracker mit Herzfrequenzmessung, GPS und 7 Tagen Akkulaufzeit. Wasserdicht bis 50m.',
    price: 199.99,
    original_price: 249.99,
    category_id: 'cat-1',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    image_gallery: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    stock: 22,
    rating: 4.7,
    rating_count: 203,
    sold_count: 890,
    is_featured: true,
    is_active: true,
    metadata: {
      features: ['Herzfrequenzmessung', 'GPS', '7 Tage Akku', '50m wasserdicht'],
      specifications: { 'Display': '1.4" AMOLED', 'Akku': '7 Tage', 'Gewicht': '45g' },
    },
  },
  {
    id: 'prod-4',
    title: 'Leather Wallet Minimal',
    description: 'Handgefertigte Geldbörse aus echtem Leder. Schlankes Design für Karten und Scheine.',
    price: 49.99,
    original_price: null,
    category_id: 'cat-2',
    image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800',
    image_gallery: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=800'],
    stock: 35,
    rating: 4.9,
    rating_count: 67,
    sold_count: 180,
    is_featured: true,
    is_active: true,
    metadata: {
      features: ['Echtes Leder', 'Handgefertigt', 'RFID-Schutz', 'Schlankes Design'],
      specifications: { 'Material': 'Rindsleder', 'Fächer': '6 Karten, 2 Scheine', 'Farbe': 'Braun' },
    },
  },
  {
    id: 'prod-5',
    title: 'Ceramic Coffee Mug Set',
    description: 'Set aus 4 handgefertigten Keramiktassen. Perfekt für Kaffee, Tee oder Cappuccino.',
    price: 34.99,
    original_price: 44.99,
    category_id: 'cat-3',
    image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800',
    image_gallery: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800'],
    stock: 18,
    rating: 4.5,
    rating_count: 45,
    sold_count: 120,
    is_featured: true,
    is_active: true,
    metadata: {
      features: ['Handgefertigt', 'Spülmaschinenfest', 'Set aus 4 Tassen', '350ml Fassungsvermögen'],
      specifications: { 'Material': 'Keramik', 'Volumen': '350ml', 'Farben': 'Weiß, Grau, Beige, Blau' },
    },
  },
  {
    id: 'prod-6',
    title: 'Wireless Charging Pad',
    description: 'Schnelles kabelloses Laden für alle Qi-fähigen Geräte. Elegantes Aluminium-Design mit LED-Indikator.',
    price: 29.99,
    original_price: 39.99,
    category_id: 'cat-1',
    image_url: 'https://images.unsplash.com/photo-1615526675159-e248c3021d3f?w=800',
    image_gallery: ['https://images.unsplash.com/photo-1615526675159-e248c3021d3f?w=800'],
    stock: 42,
    rating: 4.4,
    rating_count: 156,
    sold_count: 670,
    is_featured: false,
    is_active: true,
    metadata: {
      features: ['15W Schnellladen', 'Qi-kompatibel', 'LED-Indikator', 'Aluminium-Gehäuse'],
      specifications: { 'Leistung': '15W', 'Kompatibilität': 'Qi', 'Material': 'Aluminium' },
    },
  },
  {
    id: 'prod-7',
    title: 'Canvas Backpack Urban',
    description: 'Robuster Rucksack aus Bio-Baumwolle mit Laptopfach. Perfekt für Stadt, Uni und Reisen.',
    price: 79.99,
    original_price: null,
    category_id: 'cat-2',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    image_gallery: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
    stock: 12,
    rating: 4.7,
    rating_count: 92,
    sold_count: 340,
    is_featured: true,
    is_active: true,
    metadata: {
      features: ['Bio-Baumwolle', 'Laptopfach 15"', 'Wasserabweisend', 'Ergonomische Träger'],
      specifications: { 'Material': 'Bio-Baumwolle', 'Volumen': '25L', 'Laptop': 'bis 15"' },
    },
  },
  {
    id: 'prod-8',
    title: 'Scented Candle Collection',
    description: 'Set aus 3 handgegossenen Soja-Wachs-Kerzen mit ätherischen Ölen. Lange Brenndauer.',
    price: 24.99,
    original_price: 34.99,
    category_id: 'cat-3',
    image_url: 'https://images.unsplash.com/photo-1602607688737-cef3c33bd608?w=800',
    image_gallery: ['https://images.unsplash.com/photo-1602607688737-cef3c33bd608?w=800'],
    stock: 28,
    rating: 4.8,
    rating_count: 78,
    sold_count: 290,
    is_featured: false,
    is_active: true,
    metadata: {
      features: ['Soja-Wachs', 'Ätherische Öle', 'Handgegossen', '40h Brenndauer'],
      specifications: { 'Material': 'Soja-Wachs', 'Brenndauer': '40h', 'Set': '3 Kerzen' },
    },
  },
  {
    id: 'prod-9',
    title: 'Bluetooth Speaker Portable',
    description: 'Kompakter Lautsprecher mit 360° Sound, wasserdicht und 12h Akkulaufzeit. Ideal für unterwegs.',
    price: 59.99,
    original_price: 79.99,
    category_id: 'cat-1',
    image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
    image_gallery: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800'],
    stock: 19,
    rating: 4.6,
    rating_count: 134,
    sold_count: 520,
    is_featured: true,
    is_active: true,
    metadata: {
      features: ['360° Sound', 'IPX7 wasserdicht', '12h Akku', 'Bluetooth 5.0'],
      specifications: { 'Leistung': '20W', 'Akku': '12h', 'Schutz': 'IPX7' },
    },
  },
  {
    id: 'prod-10',
    title: 'Silk Scarf Premium',
    description: 'Luxuriöser Seidenschal mit handbedrucktem Muster. 100% Maulbeerseide.',
    price: 89.99,
    original_price: null,
    category_id: 'cat-2',
    image_url: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800',
    image_gallery: ['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800'],
    stock: 15,
    rating: 4.9,
    rating_count: 43,
    sold_count: 150,
    is_featured: false,
    is_active: true,
    metadata: {
      features: ['100% Maulbeerseide', 'Handbedruckt', '90x90cm', 'Geschenkbox'],
      specifications: { 'Material': 'Maulbeerseide', 'Größe': '90x90cm', 'Pflege': 'Handwäsche' },
    },
  },
];

async function seed() {
  console.log('🌱 Seeding categories...');
  for (const cat of categories) {
    const { error } = await supabase.from('shop.categories').upsert(cat, { onConflict: 'id' });
    if (error) console.error('Category error:', error.message);
    else console.log(`✅ Category: ${cat.name}`);
  }

  console.log('\n🌱 Seeding products...');
  for (const product of products) {
    const { error } = await supabase.from('shop.products').upsert(product, { onConflict: 'id' });
    if (error) console.error('Product error:', error.message);
    else console.log(`✅ Product: ${product.title}`);
  }

  console.log('\n🎉 Seeding complete!');
  process.exit(0);
}

seed();
