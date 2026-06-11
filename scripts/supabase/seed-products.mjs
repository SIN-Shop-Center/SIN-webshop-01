#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { resolve } from "path";

async function seedProducts() {
  try {
    // Load Supabase environment variables
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        "\n⚠️  Missing Supabase environment variables.\n" +
        "\nTo seed products, set:\n" +
        "  SUPABASE_URL=https://your-project.supabase.co\n" +
        "  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n" +
        "\nYou can find these in your Supabase project dashboard under Settings > API.\n" +
        "\nOr use the development mode without Supabase (for testing):\n" +
        "  node scripts/supabase/seed-products.mjs --dev\n\n"
      );
      
      // Check if dev mode is requested
      if (process.argv.includes("--dev")) {
        console.log("\n🚀 Running in DEVELOPMENT mode (without Supabase connection)...");
        console.log("This simulates the seed process for testing purposes.\n");
        
        // Simulate seeding for development/testing
         console.log("📊 Simulating seeding of 15 products to Supabase...");
        console.log("✅ (Would seed products like: SIN Neon X ANC Headphones, Minimalist Mechanical Keyboard, etc.)");
        console.log("✅ (Would create categories like: Tech & Gadgets, Lifestyle & Accessories, Home & Living)");
        console.log("✅ (Products would be available at: /products-explore)");
        
        console.log("\n🎯 To actually seed to a Supabase project:\n");
        console.log("  1. Create a Supabase project at https://supabase.com");
        console.log("  2. Get your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from Settings > API");
        console.log("  3. Set environment variables:");
        console.log("     export SUPABASE_URL='https://your-project.supabase.co'");
        console.log("     export SUPABASE_SERVICE_ROLE_KEY='your_service_role_key'");
        console.log("  4. Run: pnpm seed          (or: node scripts/supabase/seed-products.mjs)");
        
        return;
      }
      
      process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Test connection
    console.log("🔗 Testing Supabase connection...");
    const { data: testData, error: testError } = await supabase
      .from("public.products")
      .select("id", { count: "exact", head: true });

    if (testError) {
      console.error("❌ Failed to connect to Supabase:", testError.message);
      process.exit(1);
    }

    console.log(`✅ Connected to Supabase! Found ${testData?.length || 0} existing products.`);

    // First, clear existing products to start fresh
    console.log("\n🧹 Clearing existing products...");
    const { error: deleteError } = await supabase
      .from("public.products")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Don't delete placeholder

    if (deleteError) {
      console.error("❌ Error clearing products:", deleteError);
      process.exit(1);
    }

    console.log("✅ Products cleared, now seeding...\n");

    // Seed products - simplified version based on the existing data.ts
    const products = [
      {
        id: "00000000-0000-0000-0000-000000001",
        name: "SIN Neon X ANC Headphones",
        slug: "sin-neon-x-anc-headphones",
        description: "Ultra-luxurious active noise cancelling wireless headphones. Handcrafted leather ear cushions, custom-tuned high-fidelity audio drivers, and up to 45 hours of immersive battery life. Ideal for travel, production, and focused work sessions.",
        price: 349.0,
        original_price: 399.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1572569432755-9ea24d26b52c?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({
          colors: ["#000000", "#ffffff", "#e3a857"],
          sizes: ["S", "M", "L"]
        }),
        stock: 12,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0,
          ratingCount: 0,
          features: ["Active Noise Cancelling (ANC)", "45 hours battery life", "Bluetooth 5.3", "High-fidelity audio drivers"],
          specifications: {
            "Gewicht": "250g",
            "Material": "Aluminium, Proteinleder",
            "Ladeanschluss": "USB-C",
            "Ladezeit": "1.5 Stunden"
          },
          category_id: "00000000-0000-0000-0000-000000000001",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000002",
        name: "Minimalist Mechanical Keyboard",
        slug: "minimalist-mechanical-keyboard",
        description: "A masterpiece of tactile responsiveness. Outfitted with premium hotswappable brown switches, dye-sublimated PBT keycaps with high-contrast glyphs, and a sandblasted CNC aluminium chassis. Connecting seamlessly via Bluetooth 5.1 or USB-C.",
        price: 189.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({
          colors: ["#1e293b", "#f1f5f9", "#fca5a5"]
        }),
        stock: 8,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0,
          ratingCount: 0,
          features: ["Hotswappable MX Switches", "PBT Keycaps", "Bluetooth 5.1 & USB-C", "RGB Backlighting"],
          specifications: {
            "Layout": "75% (84 Tasten)",
            "Material": "CNC Aluminium",
            "Akku": "4000mAh",
            "Kompatibilität": "Windows, Mac, Linux"
          },
          category_id: "00000000-0000-0000-0000-000000000001",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000003",
        name: "Slate Leather Carry-All",
        slug: "slate-leather-carry-all",
        description: "Meticulously crafted from full-grain vegetable-tanned Italian leather. Featuring dual-access brass zippers, a dedicated reinforced 16-inch laptop pocket, and an adjustable memory-foam-filled shoulder strap. Weatherproof and built to last a lifetime.",
        price: 260.0,
        original_price: 295.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({
          colors: ["#2e2e2e", "#8b5a2b", "#1e3a8a"],
          sizes: ["13 Zoll", "16 Zoll"]
        }),
        stock: 5,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0,
          ratingCount: 0,
          features: ["Wetterfestes Echtleder", "Verstärktes Laptop-Fach", "Memory-Foam Schultergurt", "Messing-Reißverschlüsse"],
          specifications: {
            "Material": "Vollnarbiges Rindsleder",
            "Innenfutter": "Mikrofaser",
            "Gewicht": "1.2kg",
            "Volumen": "18 Liter"
          },
          category_id: "00000000-0000-0000-0000-000000000002",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000004",
        name: "Chronos Hybrid Smartwatch",
        slug: "chronos-hybrid-smartwatch",
        description: "The elegant fusion of classic luxury horology and modern performance tracking. Pure sapphire glass face housing a discreet organic LED screen for real-time notifications, heart rate monitoring, and automatic activity sleep tracking.",
        price: 299.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({
          colors: ["#000000", "#d4af37", "#c0c0c0"],
          sizes: ["40mm", "44mm"]
        }),
        stock: 15,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0,
          ratingCount: 0,
          features: ["Saphirglas", "OLED Display", "Herzfrequenzmessung", "Schlaftracking"],
          specifications: {
            "Wasserdicht": "5 ATM",
            "Akkulaufzeit": "Bis zu 14 Tage",
            "Gehäuse": "Edelstahl 316L",
            "Armband": "Echtleder / Milanaise"
          },
          category_id: "00000000-0000-0000-0000-000000000001",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000005",
        name: "Nordic Oak Bedside Lamp",
        slug: "nordic-oak-bedside-lamp",
        description: "An elegant sculptural lighting piece carved from sustainably harvested FSC certified white oak. Tap-sensitive warm glowing light with three step dimming levels and an integrated 15W Qi wireless fast charger built into the solid base.",
        price: 125.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: null,
        stock: 20,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0,
          ratingCount: 0,
          features: [],
          specifications: {},
          category_id: "00000000-0000-0000-0000-000000000003",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: false
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000006",
        name: "Double-Walled Horizon Bottle",
        slug: "double-walled-horizon-bottle",
        description: "Stunning double-layered titanium water bottle engineered to keep hot beverages steaming or cold liquids chilled for 24+ hours. Absolutely leakproof ergonomic cap with a solid brushed metal finish and convenient lanyard interface.",
        price: 49.0,
        original_price: 59.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1544464147-3bd05b736b04?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1596541571217-1f91754020c6?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: null,
        stock: 34,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0,
          ratingCount: 0,
          features: [],
          specifications: {},
          category_id: "00000000-0000-0000-0000-000000000002",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: false
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000007",
        name: "Aura Desktop Air Purifier",
        slug: "aura-desktop-air-purifier",
        description: "Compact yet powerful medical-grade HEPA H13 air purifier that filters 99.97% of ultra-fine particulates and pet dander. Features a near-silent night whisper mode, essential oil diffuser chamber, and ambient air quality feedback indicator ring.",
        price: 159.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1584820927699-2917eab02e0b?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: null,
        stock: 11,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0,
          ratingCount: 0,
          features: [],
          specifications: {},
          category_id: "00000000-0000-0000-0000-000000000003",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: false
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000008",
        name: "Brushed Brass Desk Organizer",
        slug: "brushed-brass-desk-organizer",
        description: "Elevate your workspace with this exquisite desktop organizer modular set. Heavy solid brushed brass slots for folders, mobile stands, and fine pens. Lined with black premium micro-suede linings to prevent scratching your devices.",
        price: 85.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: null,
        stock: 7,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0,
          ratingCount: 0,
          features: [],
          specifications: {},
          category_id: "00000000-0000-0000-0000-000000000003",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: false
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000009",
        name: "Ultralight Carbon Fiber Laptop Sleeve",
        slug: "carbon-fiber-laptop-sleeve",
        description: "Weightless protection handcrafted from genuine carbon fiber composite. Shock-absorbing plush microfiber interior with magnetic auto-seal closure. Fits up to 16-inch MacBooks and premium ultrabooks with precision.",
        price: 129.0,
        original_price: 149.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({ sizes: ["13 Zoll", "14 Zoll", "16 Zoll"] }),
        stock: 10,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0, ratingCount: 0,
          features: ["Carbon Fiber Composite", "Magnetic Auto-Seal", "Shock-Absorbing Lining"],
          category_id: "00000000-0000-0000-0000-000000000001",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: false
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000010",
        name: "Merino Wool Travel Wrap",
        slug: "merino-wool-travel-wrap",
        description: "Temperature-regulating Italian-spun merino wool shawl. Crafted to transition seamlessly from flight cabin comfort to outdoor evenings. Hypoallergenic, breathable, and ethically sourced from New Zealand high-country flocks.",
        price: 99.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({ colors: ["#2e2e2e", "#d4c5b9", "#5a7d9a"] }),
        stock: 25,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0, ratingCount: 0,
          features: ["Merino Wool", "Temperature-Regulating", "Ethically Sourced"],
          category_id: "00000000-0000-0000-0000-000000000002",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: false
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000011",
        name: "Artisan Concrete Planter Set",
        slug: "concrete-planter-set",
        description: "Architectural-grade mineral concrete planters hand-poured in small batches. Set of three graduated sizes featuring integrated drainage reservoirs and natural moss patina. Designed to elevate your indoor urban jungle.",
        price: 75.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({ sizes: ["Small (12cm)", "Medium (18cm)", "Large (25cm)"] }),
        stock: 18,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0, ratingCount: 0,
          features: ["Architectural Concrete", "Set of 3", "Drainage Reservoir"],
          category_id: "00000000-0000-0000-0000-000000000003",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000012",
        name: "Biometric Smart Door Lock",
        slug: "biometric-smart-door-lock",
        description: "Fingerprint-scanning titanium-alloy door lock with 0.3-second recognition. Supports 100 unique fingerprints, temporary PIN codes for guests, and full smartphone remote management via Apple HomeKit & Google Home.",
        price: 229.0,
        original_price: 279.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({ colors: ["#1e293b", "#c0c0c0"] }),
        stock: 6,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0, ratingCount: 0,
          features: ["0.3s Fingerprint", "100 Users", "HomeKit & Google Home"],
          specifications: { "Material": "Titanium Alloy", "Battery": "6 Monate", "App": "iOS & Android" },
          category_id: "00000000-0000-0000-0000-000000000001",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000013",
        name: "Japanese Damascus Steel Chef Knife",
        slug: "damascus-steel-chef-knife",
        description: "67-layer VG10 Damascus steel blade, hand-forged in Seki City, Japan. Pakka wood octagonal handle with perfect balance point. Includes genuine leather saya sheath and premium gift box with authenticity certificate.",
        price: 189.0,
        original_price: 230.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({ sizes: ["18cm (Santoku)", "21cm (Gyuto)", "24cm (Chef)"] }),
        stock: 4,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0, ratingCount: 0,
          features: ["67-Layer Damascus", "VG10 Steel", "Seki City Hand-Forged"],
          specifications: { "Stahl": "VG10 67-Lagen", "Griff": "Pakka Wood", "Härte": "60-62 HRC" },
          category_id: "00000000-0000-0000-0000-000000000002",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000014",
        name: "Handblown Murano Glass Vase",
        slug: "murano-glass-vase",
        description: "Authentic Venetian Murano glass vase, mouth-blown by third-generation maestros. Organic flowing silhouette with embedded 24K gold leaf veins. Each piece is uniquely signed and numbered by the artisan.",
        price: 220.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: JSON.stringify({ colors: ["#d4af37 (Gold)", "#1e3a8a (Sapphire)", "#f1f5f9 (Crystal)"] }),
        stock: 3,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0, ratingCount: 0,
          features: ["Venetian Murano Glass", "24K Gold Leaf", "Signed & Numbered"],
          category_id: "00000000-0000-0000-0000-000000000003",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000015",
        name: "Portable Projector Cinema Cube",
        slug: "portable-projector-cinema-cube",
        description: "Pocket-sized 1080p DLP laser projector delivering a 100-inch cinema experience anywhere. Auto-keystone correction, built-in Harman Kardon stereo speakers, and 3-hour battery. HDMI & wireless screen mirroring included.",
        price: 349.0,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=80"
        ]),
        variants: null,
        stock: 9,
        is_active: true,
        metadata: JSON.stringify({
          rating: 0, ratingCount: 0,
          features: ["1080p DLP Laser", "100-Inch Projection", "3h Battery"],
          specifications: { "Auflösung": "1920x1080", "Lautsprecher": "Harman Kardon 2x5W", "Akku": "3 Stunden" },
          category_id: "00000000-0000-0000-0000-000000000001",
          supplier_id: "00000000-0000-0000-0000-000000000001",
          is_featured: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    console.log(`Seeding ${products.length} products...\n`);
    const { data, error } = await supabase
      .from("public.products")
      .insert(products)
      .select();

    if (error) {
      console.error("❌ Error seeding products:", error);
      process.exit(1);
    }

    console.log(`✅ Successfully seeded ${data.length} products to Supabase!`);

    // Verify by fetching and counting
    const { data: verifyData, error: verifyError } = await supabase
      .from("public.products")
      .select("id", { count: "exact", head: true });

    if (verifyError) {
      console.error("Error verifying seed:", verifyError);
    } else {
      console.log(`✅ Verification: Supabase now contains ${verifyData?.length || 0} products`);
    }

    // Log the seeded product IDs for reference
    console.log("\nSeeded Product IDs:", data.map((p) => p.id));

    // Create categories if they don't exist
    console.log("\n🔧 Creating categories...");
    const categories = [
      {
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Products",
        slug: "all-products",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Tech & Gadgets",
        slug: "tech-gadgets",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        name: "Lifestyle & Accessories",
        slug: "lifestyle-accessories",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        name: "Home & Living",
        slug: "home-living",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: cats, error: catsError } = await supabase
      .from("public.categories")
      .insert(categories)
      .select();

    if (catsError) {
      console.log("Note: Categories may already exist or error creating them:", catsError.message);
    } else {
      console.log(`✅ Created ${cats.length} categories`);
    }

    console.log("\n🎉 Supabase seeding completed successfully!");
    console.log("\n📋 Next steps:")
    console.log("   1. Products are now available in the frontend (if credentials are set)")
    console.log("   2. Go API endpoints should work with the Supabase data")
    console.log("   3. Frontend will display products from Supabase instead of localStorage");

  } catch (error) {
    console.error("Unexpected error during seeding:", error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedProducts();
}

export { seedProducts };
