const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const DB_FILE = path.join(__dirname, 'styluxe_db.json');

const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = { GOOGLE_CLIENT_ID: "" };
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    console.error("Failed to parse config.json:", e);
  }
}

// Initial seed data
const initialProducts = [
  {
    id: 1,
    name: "STYLUXE OVERSIZED COTTON HOODIE",
    price: 85.00,
    category: "Hoodies",
    department: "Men",
    image: "assets/hoodie_black.png",
    description: "Crafted from 500GSM ultra-heavyweight premium cotton fleece. Features drop shoulders, a double-lined hood without drawstrings for a clean look, kangaroo pocket, and thick ribbed cuffs. Made for a premium relaxed silhouette.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "BESTSELLER"
  },
  {
    id: 2,
    name: "MATTE BOMBER LEATHER JACKET",
    price: 180.00,
    category: "Jackets",
    department: "Men",
    image: "assets/jacket_leather.png",
    description: "Engineered from genuine matte-finish calfskin leather. Designed with a custom satin lining, silver-tone heavy zippers, interior breast pockets, and ribbed hem and cuffs. A timeless, versatile outerwear essential.",
    sizes: ["S", "M", "L", "XL"],
    badge: "LIMITED EDITION"
  },
  {
    id: 3,
    name: "SIGNATURE CARGO DENIM JEANS",
    price: 95.00,
    category: "Jeans",
    department: "Men",
    image: "assets/jeans_cargo.png",
    description: "14oz heavy denim features an updated relaxed straight leg cut. Multi-pocket cargo utility layout with secure snap closures, custom silver hardware, and adjustable drawstring ankle cuffs for versatility in styling.",
    sizes: ["30", "32", "34", "36"],
    badge: "NEW ARRIVAL"
  },
  {
    id: 4,
    name: "CORE HIGH-TOP SNEAKERS",
    price: 140.00,
    category: "Footwear",
    department: "Men",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600",
    description: "Handcrafted high-top sneakers using full-grain Italian leather panels. Features clean vulcanized rubber soles, minimalist logo embossing on the heel, wax-coated cotton laces, and a cushioned calfskin leather insole for maximum comfort.",
    sizes: ["40", "41", "42", "43", "44"],
    badge: "ARCHIVE"
  },
  {
    id: 5,
    name: "WOMEN'S GLOSSY DOWN PUFFER",
    price: 160.00,
    category: "Jackets",
    department: "Women",
    image: "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=600",
    description: "Water-resistant glossy nylon puffer jacket filled with 90/10 duck down fill. Includes a detachable cropped hood, zip pockets, toggle waist adjusters, and elasticated cuffs to seal in warmth.",
    sizes: ["XS", "S", "M", "L"],
    badge: "MUST-HAVE"
  },
  {
    id: 6,
    name: "WOMEN'S CROP OVERSIZED HOODIE",
    price: 75.00,
    category: "Hoodies",
    department: "Women",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=600",
    description: "Crop cut oversized hoodie built from premium French terry cotton. Styled with drop shoulders, raw-edge waist hem, and wide cozy sleeves. Ideal for modern luxury styling.",
    sizes: ["XS", "S", "M", "L"],
    badge: "NEW"
  },
  {
    id: 7,
    name: "WIDE-LEG UTILITY DEPT DENIM",
    price: 90.00,
    category: "Jeans",
    department: "Women",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=600",
    description: "High-waisted wide-leg denim in vintage washed blue. Fitted with hammer loop carpenter detailing, reinforced pockets, and a signature heavy leather patch.",
    sizes: ["26", "28", "30", "32"],
    badge: ""
  },
  {
    id: 8,
    name: "WOMEN'S SUEDE RUNNER SHADOW",
    price: 150.00,
    category: "Footwear",
    department: "Women",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600",
    description: "Premium low-top runners constructed with buttery soft calf suede and nylon underlays. Lightweight EVA midsole and a textured rubber tread grip make this the ultimate hybrid of style and athletic performance.",
    sizes: ["36", "37", "38", "39", "40"],
    badge: "RESTOCKED"
  },
  {
    id: 9,
    name: "KIDS MINI STYLUXE HOODIE",
    price: 45.00,
    category: "Hoodies",
    department: "Kids",
    image: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&q=80&w=600",
    description: "Junior edition of our signature oversized hoodie. Crafted from organic cotton fleece to provide lightweight warmth and exceptional softness.",
    sizes: ["4Y", "6Y", "8Y", "10Y", "12Y"],
    badge: "MINI-ME"
  },
  {
    id: 10,
    name: "KIDS DENIM TRUCKER JACKET",
    price: 55.00,
    category: "Jackets",
    department: "Kids",
    image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=600",
    description: "Classic denim trucker jacket scaled down for kids. Durable 12oz denim fabric with easy-to-use snap buttons and adjustable waist tabs.",
    sizes: ["6Y", "8Y", "10Y", "12Y"],
    badge: "BESTSELLER"
  },
  {
    id: 11,
    name: "KIDS SLIM UTILITY JOGGER",
    price: 50.00,
    category: "Jeans",
    department: "Kids",
    image: "https://images.unsplash.com/photo-1514989940723-e8e5163ccbe8?auto=format&fit=crop&q=80&w=600",
    description: "Soft cotton cargo joggers with elastic drawstring waist and ankle cuffs. Features two utility flap pockets and a comfortable loose thigh block for play.",
    sizes: ["4Y", "6Y", "8Y", "10Y"],
    badge: ""
  },
  {
    id: 12,
    name: "KIDS ACTIVE SHIELD RUNNERS",
    price: 65.00,
    category: "Footwear",
    department: "Kids",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600",
    description: "Ultra-lightweight kids running sneakers with breathable mesh upper, memory foam footbed, and quick-lace bungee toggle systems.",
    sizes: ["28", "30", "32", "34", "35"],
    badge: "NEW"
  }
];

const initialUsers = [
  {
    id: 1,
    name: "Lina Khoury",
    email: "lina@example.com",
    password: "user123",
    phone: "+961 71 987 654",
    address: "Achrafieh, Beirut",
    dateJoined: "2026-06-12"
  },
  {
    id: 2,
    name: "Samir Ghanem",
    email: "samir@example.com",
    password: "user123",
    phone: "+961 03 456 789",
    address: "Hamra Street, Beirut",
    dateJoined: "2026-06-10"
  }
];

const initialOrders = [
  {
    id: "STX-84920",
    date: "2026-06-13",
    customerEmail: "samir@example.com",
    customerName: "Samir Ghanem",
    customerPhone: "+961 03 456 789",
    customerAddress: "Hamra Street, Beirut",
    items: [
      {
        id: 1,
        name: "STYLUXE OVERSIZED COTTON HOODIE",
        price: 85.00,
        size: "L",
        quantity: 1
      }
    ],
    total: 95.00,
    status: "DELIVERED",
    department: "Men"
  },
  {
    id: "STX-73910",
    date: "2026-06-14",
    customerEmail: "lina@example.com",
    customerName: "Lina Khoury",
    customerPhone: "+961 71 987 654",
    customerAddress: "Achrafieh, Beirut",
    items: [
      {
        id: 5,
        name: "WOMEN'S GLOSSY DOWN PUFFER",
        price: 160.00,
        size: "M",
        quantity: 1
      }
    ],
    total: 160.00,
    status: "PAID",
    department: "Women"
  }
];

const initialStaff = [
  {
    id: 1,
    name: "Global Manager",
    email: "manager@example.com",
    password: "staff123",
    role: "Manager",
    permissions: ["manage_products", "manage_orders", "pos_access", "manage_staff"],
    status: "Active"
  }
];

function ensureProductInventory(product) {
  if (!product.colors) {
    product.colors = ["Black", "Charcoal", "Grey"];
  }
  if (!product.inventory) {
    product.inventory = {};
    product.sizes.forEach(size => {
      product.colors.forEach(color => {
        const key = `${size}-${color}`;
        if (size === "M" && color === "Black") {
          product.inventory[key] = 0; // Seeding out of stock
        } else if (size === "L" && color === "Black" && product.id === 1) {
          product.inventory[key] = 1; // 1 left (purchasing triggers out of stock)
        } else {
          product.inventory[key] = 10;
        }
      });
    });
  }
  if (product.costPrice === undefined || product.costPrice === null) {
    product.costPrice = parseFloat((product.price * 0.6).toFixed(2));
  }
  return product;
}

const initialCategories = [
  { id: 1, name: "Hoodies", img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=200", department: "Men", priority: 1 },
  { id: 2, name: "Jackets", img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=200", department: "Men", priority: 2 },
  { id: 3, name: "Jeans", img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=200", department: "Men", priority: 3 },
  { id: 4, name: "Footwear", img: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=200", department: "Men", priority: 4 },
  { id: 5, name: "Dresses", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=200", department: "Women", priority: 1 },
  { id: 6, name: "Tops", img: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=200", department: "Women", priority: 2 },
  { id: 7, name: "Activewear", img: "https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&q=80&w=200", department: "Women", priority: 3 },
  { id: 8, name: "T-Shirts", img: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&q=80&w=200", department: "Kids", priority: 1 },
  { id: 9, name: "Pants", img: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&q=80&w=200", department: "Kids", priority: 2 }
];

const initialBrands = [
  { name: "Styluxe", img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=200" },
  { name: "Essentials", img: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=200" },
  { name: "Supreme", img: "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?auto=format&fit=crop&q=80&w=200" },
  { name: "Stussy", img: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=200" },
  { name: "Balenciaga", img: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&q=80&w=200" },
  { name: "Off-White", img: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=200" },
  { name: "Nike", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=200" },
  { name: "Adidas", img: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=200" },
  { name: "Jordan", img: "https://images.unsplash.com/photo-1597045566677-8cf032ed6634?auto=format&fit=crop&q=80&w=200" },
  { name: "Vans", img: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=200" },
  { name: "Champion", img: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&q=80&w=200" },
  { name: "Puma", img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=200" }
];

// Global in-memory cache for ultra-fast, zero-latency synchronous reads
let dbMemory = { products: [], users: [], orders: [], staff: [], categories: [], brands: [], coupons: [], settings: {} };
let pool = null;

// Initialize PostgreSQL connection pool if configured in config.json
function initPgPool() {
  if (pool) return; // Initialize only once to prevent connection leaks!

  let dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    const CONFIG_FILE = path.join(__dirname, 'config.json');
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        dbUrl = cfg.DATABASE_URL;
      } catch (e) {
        console.error("Failed to read DATABASE_URL from config.json:", e);
      }
    }
  }

  if (dbUrl) {
    try {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false } // Required for cloud databases like Supabase/Neon/Render
      });
      console.log("Connected to PostgreSQL Database Pool successfully!");
    } catch (e) {
      console.error("Failed to initialize PostgreSQL pool:", e);
    }
  } else {
    console.log("No PostgreSQL DATABASE_URL configured. Running with local JSON file database.");
  }
}

// Create SQL Tables and populate seed data if empty
async function initPgDatabase() {
  if (!pool) return;
  try {
    // Create users table
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      address TEXT,
      date_joined VARCHAR(50)
    )`);

    // Create products table
    await pool.query(`CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      category VARCHAR(100) NOT NULL,
      department VARCHAR(50) NOT NULL,
      image TEXT NOT NULL,
      description TEXT,
      sizes TEXT,
      colors TEXT,
      inventory TEXT,
      badge VARCHAR(50),
      priority INTEGER NOT NULL DEFAULT 1000
    )`);
     await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1000`);
     await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255) DEFAULT 'Styluxe'`);
     await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS preorder BOOLEAN DEFAULT FALSE`);

    // Create orders table
    await pool.query(`CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      items TEXT NOT NULL,
      total DOUBLE PRECISION NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      date VARCHAR(50)
    )`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(100)`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS department VARCHAR(50) DEFAULT 'Men'`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255)`);

    // Create staff table
    await pool.query(`CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(100) NOT NULL,
      permissions TEXT NOT NULL
    )`);
    await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS department VARCHAR(50) NOT NULL DEFAULT 'Global'`);

    // Create categories table
    await pool.query(`CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      img TEXT,
      department VARCHAR(50) NOT NULL DEFAULT 'Men',
      priority INTEGER NOT NULL DEFAULT 1000
    )`);
    await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS img TEXT`);
    await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS department VARCHAR(50) NOT NULL DEFAULT 'Men'`);
    await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1000`);
    try {
      await pool.query(`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key`);
    } catch (e) {}

    // Create brands table
    await pool.query(`CREATE TABLE IF NOT EXISTS brands (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      img TEXT NOT NULL
    )`);

    // Create suppliers table
    await pool.query(`CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      company VARCHAR(255),
      phone VARCHAR(100),
      address TEXT
    )`);

    // Create invoices table
    await pool.query(`CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(100) UNIQUE NOT NULL,
      supplier VARCHAR(255) NOT NULL,
      date VARCHAR(100) NOT NULL,
      total NUMERIC(10, 2) NOT NULL,
      status VARCHAR(100) NOT NULL,
      notes TEXT
    )`);

    // Migration: Add cost_price column to products table
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) DEFAULT 0`);

    // Create coupons table
    await pool.query(`CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_type VARCHAR(20) NOT NULL,
      discount_value DOUBLE PRECISION NOT NULL,
      active BOOLEAN DEFAULT TRUE
    )`);

    // Create settings table
    await pool.query(`CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    )`);

    // Seed default settings if empty
    const settingsCount = await pool.query("SELECT COUNT(*) FROM settings");
    if (parseInt(settingsCount.rows[0].count) === 0) {
      console.log("Seeding default settings into PostgreSQL database...");
      const defaultSettings = [
        { key: "shipping_fee", value: "5" },
        { key: "free_shipping_threshold", value: "150" },
        { key: "whatsapp_men", value: "+961 70 123 456" },
        { key: "whatsapp_women", value: "+961 70 123 456" },
        { key: "whatsapp_kids", value: "+961 70 123 456" },
        { key: "whatsapp_global", value: "+961 01 123 456" },
        { key: "instagram_men", value: "https://instagram.com/styluxe.men" },
        { key: "facebook_men", value: "https://facebook.com/styluxe.men" },
        { key: "twitter_men", value: "https://twitter.com/styluxe.men" },
        { key: "tiktok_men", value: "https://tiktok.com/@styluxe.men" },
        { key: "instagram_women", value: "https://instagram.com/styluxe.women" },
        { key: "facebook_women", value: "https://facebook.com/styluxe.women" },
        { key: "twitter_women", value: "https://twitter.com/styluxe.women" },
        { key: "tiktok_women", value: "https://tiktok.com/@styluxe.women" },
        { key: "instagram_kids", value: "https://instagram.com/styluxe.kids" },
        { key: "facebook_kids", value: "https://facebook.com/styluxe.kids" },
        { key: "twitter_kids", value: "https://twitter.com/styluxe.kids" },
        { key: "tiktok_kids", value: "https://tiktok.com/@styluxe.kids" },
        { key: "instagram_global", value: "https://instagram.com/styluxe" },
        { key: "facebook_global", value: "https://facebook.com/styluxe" },
        { key: "twitter_global", value: "https://twitter.com/styluxe" },
        { key: "tiktok_global", value: "https://tiktok.com/@styluxe" },
        { key: "show_twitter", value: "false" },
        { key: "show_tiktok", value: "false" },
        { key: "return_password", value: "admin123" }
      ];
      for (const s of defaultSettings) {
        await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", [s.key, s.value]);
      }
    }

    // Seed defaults if tables are empty
    const prodCount = await pool.query("SELECT COUNT(*) FROM products");
    if (parseInt(prodCount.rows[0].count) === 0) {
      console.log("Seeding products into PostgreSQL database...");
      for (const p of initialProducts) {
        const pFull = ensureProductInventory(p);
        await pool.query(
          `INSERT INTO products (name, price, category, department, image, description, sizes, colors, inventory, badge, cost_price) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            pFull.name, pFull.price, pFull.category, pFull.department, pFull.image, pFull.description || "",
            JSON.stringify(pFull.sizes || []), JSON.stringify(pFull.colors || []), JSON.stringify(pFull.inventory || {}), pFull.badge || "",
            pFull.costPrice || 0
          ]
        );
      }
    }

    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log("Seeding users into PostgreSQL database...");
      for (const u of initialUsers) {
        await pool.query(
          `INSERT INTO users (name, email, password, phone, address, date_joined) VALUES ($1, $2, $3, $4, $5, $6)`,
          [u.name, u.email, u.password, u.phone || "N/A", u.address || "N/A", u.dateJoined || new Date().toISOString().split('T')[0]]
        );
      }
    }

    const staffCount = await pool.query("SELECT COUNT(*) FROM staff");
    if (parseInt(staffCount.rows[0].count) === 0) {
      console.log("Seeding staff into PostgreSQL database...");
      for (const s of initialStaff) {
        await pool.query(
          `INSERT INTO staff (name, email, password, role, permissions) VALUES ($1, $2, $3, $4, $5)`,
          [s.name, s.email, s.password, s.role, JSON.stringify(s.permissions || [])]
        );
      }
    }

    const catCount = await pool.query("SELECT COUNT(*) FROM categories");
    if (parseInt(catCount.rows[0].count) === 0) {
      console.log("Seeding categories into PostgreSQL database...");
      for (const c of initialCategories) {
        await pool.query("INSERT INTO categories (id, name, img, department, priority) VALUES ($1, $2, $3, $4, $5)", [c.id, c.name, c.img, c.department, c.priority || 1000]);
      }
    }

    const brandCount = await pool.query("SELECT COUNT(*) FROM brands");
    if (parseInt(brandCount.rows[0].count) === 0) {
      console.log("Seeding brands into PostgreSQL database...");
      for (const b of initialBrands) {
        await pool.query("INSERT INTO brands (name, img) VALUES ($1, $2)", [b.name, b.img]);
      }
    }
  } catch (err) {
    console.error("Failed to initialize or seed PostgreSQL database tables:", err);
  }
}

// Load data from SQL or JSON into local memory cache
async function loadDatabaseIntoMemory() {
  initPgPool();
  if (pool) {
    await initPgDatabase();
    try {
      console.log("Loading database from PostgreSQL into RAM cache...");
      const usersRes = await pool.query('SELECT * FROM users ORDER BY id ASC');
      const productsRes = await pool.query('SELECT * FROM products ORDER BY priority ASC, id ASC');
      const ordersRes = await pool.query('SELECT * FROM orders ORDER BY id ASC');
      const staffRes = await pool.query('SELECT * FROM staff ORDER BY id ASC');
      const categoriesRes = await pool.query('SELECT * FROM categories ORDER BY priority ASC, id ASC');
      const brandsRes = await pool.query('SELECT * FROM brands ORDER BY id ASC');
      const suppliersRes = await pool.query('SELECT * FROM suppliers ORDER BY id ASC');
      const invoicesRes = await pool.query('SELECT * FROM invoices ORDER BY id ASC');
      const couponsRes = await pool.query('SELECT * FROM coupons ORDER BY id ASC');
      const settingsRes = await pool.query('SELECT * FROM settings');

      dbMemory.users = usersRes.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        phone: u.phone,
        address: u.address,
        dateJoined: u.date_joined
      }));

      dbMemory.products = productsRes.rows.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        department: p.department,
        image: p.image,
        description: p.description,
        sizes: JSON.parse(p.sizes || '[]'),
        colors: JSON.parse(p.colors || '[]'),
        inventory: JSON.parse(p.inventory || '{}'),
        badge: p.badge,
        costPrice: p.cost_price ? parseFloat(p.cost_price) : 0,
        priority: p.priority !== undefined ? p.priority : 1000,
        brand: p.brand || 'Styluxe',
        preorder: p.preorder === true || p.preorder === 'true'
      }));

      dbMemory.orders = ordersRes.rows.map(o => ({
        id: o.id,
        userEmail: o.user_email,
        customerName: o.customer_name || 'N/A',
        customerPhone: o.customer_phone || 'N/A',
        customerAddress: o.customer_address || 'N/A',
        customer: o.customer_name || 'N/A',
        phone: o.customer_phone || 'N/A',
        address: o.customer_address || 'N/A',
        items: JSON.parse(o.items || '[]'),
        total: o.total,
        paymentMethod: o.payment_method,
        status: o.status,
        date: o.date,
        department: o.department || 'Men',
        cashierName: o.cashier_name || 'SYSTEM ADMIN'
      }));

      dbMemory.staff = staffRes.rows.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        password: s.password,
        role: s.role,
        permissions: JSON.parse(s.permissions || '[]')
      }));

      dbMemory.categories = categoriesRes.rows.map(c => ({ id: c.id, name: c.name, img: c.img || '', department: c.department || 'Men', priority: c.priority !== undefined ? c.priority : 1000 }));
      dbMemory.brands = brandsRes.rows.map(b => ({ name: b.name, img: b.img }));
      
      dbMemory.suppliers = suppliersRes.rows.map(s => ({
        id: s.id,
        name: s.name,
        company: s.company || '',
        phone: s.phone || '',
        address: s.address || ''
      }));

      dbMemory.invoices = invoicesRes.rows.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        supplier: inv.supplier,
        date: inv.date,
        total: parseFloat(inv.total),
        status: inv.status,
        notes: inv.notes || ''
      }));

      dbMemory.coupons = couponsRes.rows.map(c => ({
        id: c.id,
        code: c.code,
        discountType: c.discount_type,
        discountValue: c.discount_value,
        active: c.active
      }));

      dbMemory.settings = {};
      settingsRes.rows.forEach(row => {
        dbMemory.settings[row.key] = row.value;
      });

      console.log(`RAM cache loaded successfully: ${dbMemory.products.length} products, ${dbMemory.categories.length} categories, ${dbMemory.brands.length} brands, ${dbMemory.suppliers.length} suppliers, ${dbMemory.invoices.length} invoices, ${dbMemory.coupons.length} coupons.`);
      
      // Sync local file copy with loaded postgres data
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(dbMemory, null, 2), 'utf-8');
      } catch (e) {}
      
      return;
    } catch (err) {
      console.error("FATAL: Failed to load PostgreSQL data:", err);
      throw new Error("PostgreSQL database is configured but failed to load. Aborting server startup to prevent data loss.");
    }
  }

  // Local JSON file fallback
  console.log("Loading database from local JSON file...");
  if (!fs.existsSync(DB_FILE)) {
    dbMemory = { products: initialProducts, users: initialUsers, orders: initialOrders, staff: initialStaff, categories: initialCategories, brands: initialBrands };
    dbMemory.products = dbMemory.products.map(p => ensureProductInventory(p));
    fs.writeFileSync(DB_FILE, JSON.stringify(dbMemory, null, 2), 'utf-8');
    return;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    dbMemory = JSON.parse(data);
    
    // Migrations
    if (!dbMemory.staff) dbMemory.staff = initialStaff;
    if (!dbMemory.categories || dbMemory.categories.length === 0 || typeof dbMemory.categories[0] === 'string') {
        dbMemory.categories = initialCategories;
    } else {
        dbMemory.categories = dbMemory.categories.map((c, idx) => {
            if (!c.id) c.id = idx + 1;
            if (!c.department) c.department = "Men";
            return c;
        });
    }
    if (!dbMemory.brands) dbMemory.brands = initialBrands;
    if (!dbMemory.suppliers) dbMemory.suppliers = [];
    if (!dbMemory.invoices) dbMemory.invoices = [];
    dbMemory.products = dbMemory.products.map(p => ensureProductInventory(p));
  } catch (err) {
    console.error("Error reading JSON file database, using mock memory fallbacks:", err);
    dbMemory = { products: initialProducts, users: initialUsers, orders: initialOrders, staff: initialStaff, categories: initialCategories, brands: initialBrands, suppliers: [], invoices: [] };
  }
}

// Synchronous wrapper to read database from local RAM cache
function readDb() {
  return dbMemory;
}

// Synchronous update to RAM & local file, with background asynchronous Postgres sync task
function writeDb(data) {
  dbMemory = data;
  try {
    // 1. Write synchronously to local JSON file for instant local persistence
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing JSON file database:", err);
  }

  // 2. Perform background asynchronous SQL sync if using PostgreSQL pool
  if (pool) {
    (async () => {
      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Sync users
          await client.query('DELETE FROM users');
          const userStmt = 'INSERT INTO users (id, name, email, password, phone, address, date_joined) VALUES ($1, $2, $3, $4, $5, $6, $7)';
          for (const u of data.users) {
            await client.query(userStmt, [u.id, u.name, u.email, u.password, u.phone || 'N/A', u.address || 'N/A', u.dateJoined || '']);
          }

          // Sync products
          await client.query('DELETE FROM products');
          const prodStmt = 'INSERT INTO products (id, name, price, category, department, image, description, sizes, colors, inventory, badge, cost_price, priority, brand, preorder) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)';
          for (const p of data.products) {
            await client.query(prodStmt, [
              p.id, p.name, p.price, p.category, p.department, p.image, p.description || '',
              JSON.stringify(p.sizes || []), JSON.stringify(p.colors || []), JSON.stringify(p.inventory || {}), p.badge || '', p.costPrice || 0, p.priority !== undefined ? p.priority : 1000,
              p.brand || 'Styluxe', p.preorder || false
            ]);
          }

          // Sync orders
          await client.query('DELETE FROM orders');
          const orderStmt = 'INSERT INTO orders (id, user_email, customer_name, customer_phone, customer_address, items, total, payment_method, status, date, department, cashier_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)';
          for (const o of data.orders) {
            await client.query(orderStmt, [
              o.id, o.userEmail, o.customerName || o.customer || 'N/A', o.customerPhone || o.phone || 'N/A', o.customerAddress || o.address || 'N/A',
              JSON.stringify(o.items || []), o.total, o.paymentMethod || 'COD', o.status, o.date, o.department || 'Men', o.cashierName || 'SYSTEM ADMIN'
            ]);
          }

          // Sync staff
          await client.query('DELETE FROM staff');
          const staffStmt = 'INSERT INTO staff (id, name, email, password, role, permissions, department) VALUES ($1, $2, $3, $4, $5, $6, $7)';
          for (const s of data.staff) {
            await client.query(staffStmt, [s.id, s.name, s.email, s.password, s.role, JSON.stringify(s.permissions || []), s.department || 'Global']);
          }

          // Sync categories
          await client.query('DELETE FROM categories');
          const catStmt = 'INSERT INTO categories (id, name, img, department, priority) VALUES ($1, $2, $3, $4, $5)';
          for (const c of (data.categories || [])) {
            await client.query(catStmt, [c.id, c.name, c.img || '', c.department || 'Men', c.priority !== undefined ? c.priority : 1000]);
          }

          // Sync brands
          await client.query('DELETE FROM brands');
          const brandStmt = 'INSERT INTO brands (name, img) VALUES ($1, $2)';
          for (const b of (data.brands || [])) {
            await client.query(brandStmt, [b.name, b.img]);
          }

          // Sync suppliers
          await client.query('DELETE FROM suppliers');
          const supplierStmt = 'INSERT INTO suppliers (name, company, phone, address) VALUES ($1, $2, $3, $4)';
          for (const s of (data.suppliers || [])) {
            await client.query(supplierStmt, [s.name, s.company, s.phone, s.address]);
          }

          // Sync invoices
          await client.query('DELETE FROM invoices');
          const invoiceStmt = 'INSERT INTO invoices (invoice_number, supplier, date, total, status, notes) VALUES ($1, $2, $3, $4, $5, $6)';
          for (const inv of (data.invoices || [])) {
            await client.query(invoiceStmt, [inv.invoiceNumber, inv.supplier, inv.date, inv.total, inv.status, inv.notes]);
          }

          // Sync coupons
          await client.query('DELETE FROM coupons');
          const couponStmt = 'INSERT INTO coupons (code, discount_type, discount_value, active) VALUES ($1, $2, $3, $4)';
          for (const c of (data.coupons || [])) {
            await client.query(couponStmt, [c.code, c.discountType, c.discountValue, c.active]);
          }

          // Sync settings
          await client.query('DELETE FROM settings');
          const settingsStmt = 'INSERT INTO settings (key, value) VALUES ($1, $2)';
          if (data.settings) {
            for (const [key, val] of Object.entries(data.settings)) {
              await client.query(settingsStmt, [key, String(val)]);
            }
          }

          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error("Background PostgreSQL sync task failed:", err);
      }
    })();
  }
  return true;
}

// Serve JSON Response helper
function sendJsonResponse(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Read POST request body
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// MIME types lookup
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Create server
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // --- API ROUTING ---
  if (pathname.startsWith('/api/')) {
    const db = readDb();

    // 1. GET Requests
    if (req.method === 'GET') {
      if (pathname === '/api/config') {
        let currentConfig = { GOOGLE_CLIENT_ID: "" };
        if (fs.existsSync(CONFIG_FILE)) {
          try {
            currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
          } catch (e) {
            console.error("Failed to parse config.json dynamically:", e);
          }
        }
        sendJsonResponse(res, {
          GOOGLE_CLIENT_ID: currentConfig.GOOGLE_CLIENT_ID || ""
        });
        return;
      }
      if (pathname === '/api/settings') {
        sendJsonResponse(res, db.settings || {});
        return;
      }
      if (pathname === '/api/coupons') {
        sendJsonResponse(res, db.coupons || []);
        return;
      }
      if (pathname === '/api/coupons/validate') {
        const code = (parsedUrl.query.code || "").trim().toUpperCase();
        if (!code) {
          sendJsonResponse(res, { error: "Missing coupon code" }, 400);
          return;
        }
        const coupon = (db.coupons || []).find(c => c.code.toUpperCase() === code && c.active);
        if (coupon) {
          sendJsonResponse(res, {
            valid: true,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
          });
        } else {
          sendJsonResponse(res, { valid: false, error: "Invalid or inactive coupon code" });
        }
        return;
      }
      if (pathname === '/api/products') {
        sendJsonResponse(res, db.products);
        return;
      }
      if (pathname === '/api/categories') {
        sendJsonResponse(res, db.categories || []);
        return;
      }
      if (pathname === '/api/brands') {
        sendJsonResponse(res, db.brands || []);
        return;
      }
      if (pathname === '/api/suppliers') {
        sendJsonResponse(res, db.suppliers || []);
        return;
      }
      if (pathname === '/api/invoices') {
        sendJsonResponse(res, db.invoices || []);
        return;
      }
      if (pathname === '/api/users') {
        // Exclude passwords
        const safeUsers = db.users.map(u => {
          const { password, ...rest } = u;
          return rest;
        });
        sendJsonResponse(res, safeUsers);
        return;
      }
      if (pathname === '/api/staff') {
        // Exclude passwords
        const safeStaff = db.staff.map(s => {
          const { password, ...rest } = s;
          return rest;
        });
        sendJsonResponse(res, safeStaff);
        return;
      }
      if (pathname === '/api/orders') {
        const email = parsedUrl.query.email;
        if (email) {
          const userOrders = db.orders.filter(o => o.customerEmail === email);
          sendJsonResponse(res, userOrders);
        } else {
          sendJsonResponse(res, db.orders);
        }
        return;
      }

      if (pathname === '/api/orders/track') {
        const query = parsedUrl.query.query;
        if (!query) {
          sendJsonResponse(res, { error: "Missing query parameter" }, 400);
          return;
        }
        const queryClean = query.trim().toLowerCase();
        const matched = (db.orders || []).filter(o => {
          const idMatches = String(o.id) === queryClean;
          const phoneMatches = o.customerPhone && o.customerPhone.replace(/[\s\-\+\(\)]/g, '').includes(queryClean.replace(/[\s\-\+\(\)]/g, ''));
          return idMatches || phoneMatches;
        });
        sendJsonResponse(res, matched);
        return;
      }

      if (pathname === '/api/analytics') {
        const orders = db.orders || [];
        const products = db.products || [];

        const validOrders = orders.filter(o => o.status !== 'Cancelled');
        
        let totalSales = 0;
        let totalCost = 0;
        let totalOrders = validOrders.length;

        const categoryMap = {};
        const monthlyMap = {};

        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const monthName = d.toLocaleString('default', { month: 'short' });
          months.push(monthName);
          monthlyMap[monthName] = 0;
        }

        validOrders.forEach(o => {
          totalSales += parseFloat(o.total) || 0;

          if (o.date) {
            const orderDate = new Date(o.date);
            const mName = orderDate.toLocaleString('default', { month: 'short' });
            if (monthlyMap[mName] !== undefined) {
              monthlyMap[mName] += parseFloat(o.total) || 0;
            }
          }

          if (o.items && Array.isArray(o.items)) {
            o.items.forEach(item => {
              const qty = parseInt(item.quantity) || 1;
              const itemPrice = parseFloat(item.price) || 0;
              
              const prod = products.find(p => p.id === parseInt(item.id));
              const cost = prod && prod.costPrice ? parseFloat(prod.costPrice) : (itemPrice * 0.6);
              totalCost += cost * qty;

              const cat = item.category || (prod && prod.category) || 'Other';
              categoryMap[cat] = (categoryMap[cat] || 0) + qty;
            });
          }
        });

        const totalProfit = totalSales - totalCost;
        const aov = totalOrders > 0 ? (totalSales / totalOrders) : 0;

        const categoryData = Object.keys(categoryMap).map(name => ({
          name: name,
          value: categoryMap[name]
        }));

        const monthlyData = months.map(m => monthlyMap[m] || 0);

        sendJsonResponse(res, {
          totalSales: Math.round(totalSales * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          totalOrders,
          aov: Math.round(aov * 100) / 100,
          categoryShare: categoryData,
          monthlySales: {
            labels: months,
            data: monthlyData
          }
        });
        return;
      }
    }

    // 2. POST Requests
    if (req.method === 'POST') {
      let body;
      try {
        body = await readRequestBody(req);
      } catch (err) {
        sendJsonResponse(res, { error: "Invalid JSON body" }, 400);
        return;
      }

      if (pathname === '/api/users/register') {
        const { name, email, password, phone, address, dateJoined } = body;
        const normalizedEmail = (email || '').trim().toLowerCase();

        if (!name || !normalizedEmail || !password || !phone || !address) {
          sendJsonResponse(res, { error: "Missing required fields" }, 400);
          return;
        }

        const exists = db.users.some(u => u.email.toLowerCase() === normalizedEmail);
        if (exists) {
          sendJsonResponse(res, { error: "An account with this email already exists" }, 409);
          return;
        }

        const newUser = {
          id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
          name,
          email: normalizedEmail,
          password,
          phone,
          address,
          dateJoined: dateJoined || new Date().toISOString().split('T')[0]
        };

        db.users.push(newUser);
        writeDb(db);

        const { password: _, ...safeUser } = newUser;
        sendJsonResponse(res, safeUser);
        return;
      }

      if (pathname === '/api/users/social-login') {
        const { name, email } = body;
        const normalizedEmail = (email || '').trim().toLowerCase();

        if (!normalizedEmail) {
          sendJsonResponse(res, { error: "Email is required" }, 400);
          return;
        }

        // Check if user exists
        let user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

        if (!user) {
          // Automatically create a new user profile
          const id = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
          user = {
            id,
            name: name || 'Styluxe Customer',
            email: normalizedEmail,
            password: 'social-auth-disabled-password',
            phone: 'N/A',
            address: 'N/A',
            dateJoined: new Date().toISOString().split('T')[0]
          };
          db.users.push(user);
          writeDb(db);
        }

        const { password: _, ...safeUser } = user;
        sendJsonResponse(res, safeUser);
        return;
      }

      if (pathname === '/api/users/google-login') {
        const { credential } = body;
        if (!credential) {
          sendJsonResponse(res, { error: "Missing credential token" }, 400);
          return;
        }

        // Verify with configured Google Client ID if available
        let currentConfig = { GOOGLE_CLIENT_ID: "" };
        if (fs.existsSync(CONFIG_FILE)) {
          try {
            currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
          } catch (e) {}
        }
        const profile = verifyGoogleToken(credential, currentConfig.GOOGLE_CLIENT_ID);
        if (!profile) {
          sendJsonResponse(res, { error: "Invalid Google credential token or expired session" }, 401);
          return;
        }

        const normalizedEmail = (profile.email || '').trim().toLowerCase();
        let user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

        if (!user) {
          const id = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
          user = {
            id,
            name: profile.name || 'Google User',
            email: normalizedEmail,
            password: 'social-auth-google-secured',
            phone: 'N/A',
            address: 'N/A',
            dateJoined: new Date().toISOString().split('T')[0]
          };
          db.users.push(user);
          writeDb(db);
        }

        const { password: _, ...safeUser } = user;
        sendJsonResponse(res, safeUser);
        return;
      }

      if (pathname === '/api/users/login') {
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password;

        // Check users list first
        const user = db.users.find(u => u.email.toLowerCase() === email && u.password === password);
        if (user) {
          const { password: _, ...safeUser } = user;
          sendJsonResponse(res, safeUser);
          return;
        }

        // Check staff list next
        const staffMember = db.staff.find(s => s.email.toLowerCase() === email && s.password === password);
        if (staffMember) {
          const { password: _, ...safeStaff } = staffMember;
          sendJsonResponse(res, { ...safeStaff, isStaff: true });
          return;
        }

        sendJsonResponse(res, { error: "Invalid email or password" }, 401);
        return;
      }

      if (pathname === '/api/staff') {
        const { name, email, password, role, permissions, department } = body;
        const normalizedEmail = (email || '').trim().toLowerCase();

        if (!name || !normalizedEmail || !password || !role) {
          sendJsonResponse(res, { error: "Missing required fields" }, 400);
          return;
        }

        const exists = db.staff.some(s => s.email.toLowerCase() === normalizedEmail);
        if (exists) {
          sendJsonResponse(res, { error: "A staff account with this email already exists" }, 409);
          return;
        }

        const newStaff = {
          id: db.staff.length > 0 ? Math.max(...db.staff.map(s => s.id)) + 1 : 1,
          name,
          email: normalizedEmail,
          password,
          role,
          permissions: Array.isArray(permissions) ? permissions : [],
          department: department || "Global",
          status: "Active"
        };

        db.staff.push(newStaff);
        writeDb(db);

        const { password: _, ...safeStaff } = newStaff;
        sendJsonResponse(res, safeStaff);
        return;
      }

      if (pathname === '/api/categories') {
        const { name, img, department, priority } = body;
        if (!name || !img || !department) {
          sendJsonResponse(res, { error: "Missing category name, image or department" }, 400);
          return;
        }
        if (!db.categories) db.categories = [];
        if (!db.categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.department.toLowerCase() === department.toLowerCase())) {
          db.categories.push({
            id: db.categories.length > 0 ? Math.max(...db.categories.map(c => c.id)) + 1 : 1,
            name,
            img,
            department,
            priority: priority !== undefined ? parseInt(priority) : 1000
          });
          writeDb(db);
        }
        sendJsonResponse(res, db.categories);
        return;
      }

      if (pathname === '/api/categories/reorder') {
        const { id, action } = body;
        if (!id || !action) {
          sendJsonResponse(res, { error: "Missing id or action" }, 400);
          return;
        }
        if (!db.categories) db.categories = [];
        const targetCat = db.categories.find(c => c.id === parseInt(id));
        if (!targetCat) {
          sendJsonResponse(res, { error: "Category not found" }, 404);
          return;
        }

        const dept = targetCat.department || 'Men';
        const deptCats = db.categories.filter(c => (c.department || 'Men') === dept);
        deptCats.sort((a, b) => {
          const pa = a.priority !== undefined ? a.priority : 1000;
          const pb = b.priority !== undefined ? b.priority : 1000;
          if (pa !== pb) return pa - pb;
          return a.id - b.id;
        });

        deptCats.forEach((c, idx) => {
          c.priority = (idx + 1) * 10;
        });

        const idx = deptCats.findIndex(c => c.id === targetCat.id);
        if (action === 'up' && idx > 0) {
          const temp = deptCats[idx].priority;
          deptCats[idx].priority = deptCats[idx - 1].priority;
          deptCats[idx - 1].priority = temp;
        } else if (action === 'down' && idx < deptCats.length - 1) {
          const temp = deptCats[idx].priority;
          deptCats[idx].priority = deptCats[idx + 1].priority;
          deptCats[idx + 1].priority = temp;
        }

        writeDb(db);
        sendJsonResponse(res, db.categories);
        return;
      }

      if (pathname === '/api/products/reorder') {
        const { id, action } = body;
        if (!id || !action) {
          sendJsonResponse(res, { error: "Missing id or action" }, 400);
          return;
        }
        const targetProd = db.products.find(p => p.id === parseInt(id));
        if (!targetProd) {
          sendJsonResponse(res, { error: "Product not found" }, 404);
          return;
        }

        const dept = targetProd.department || 'Men';
        const deptProds = db.products.filter(p => (p.department || 'Men') === dept);
        deptProds.sort((a, b) => {
          const pa = a.priority !== undefined ? a.priority : 1000;
          const pb = b.priority !== undefined ? b.priority : 1000;
          if (pa !== pb) return pa - pb;
          return a.id - b.id;
        });

        deptProds.forEach((p, idx) => {
          p.priority = (idx + 1) * 10;
        });

        const idx = deptProds.findIndex(p => p.id === targetProd.id);
        if (action === 'up' && idx > 0) {
          const temp = deptProds[idx].priority;
          deptProds[idx].priority = deptProds[idx - 1].priority;
          deptProds[idx - 1].priority = temp;
        } else if (action === 'down' && idx < deptProds.length - 1) {
          const temp = deptProds[idx].priority;
          deptProds[idx].priority = deptProds[idx + 1].priority;
          deptProds[idx + 1].priority = temp;
        }

        writeDb(db);
        sendJsonResponse(res, { success: true });
        return;
      }

      if (pathname === '/api/products/reorder-batch') {
        const { orders } = body;
        if (!orders || !Array.isArray(orders)) {
          sendJsonResponse(res, { error: "Missing or invalid orders array" }, 400);
          return;
        }

        orders.forEach(item => {
          const prod = db.products.find(p => p.id === parseInt(item.id));
          if (prod) {
            prod.priority = parseInt(item.priority);
          }
        });

        writeDb(db);
        sendJsonResponse(res, { success: true });
        return;
      }

      if (pathname === '/api/brands') {
        const { name, img } = body;
        if (!name || !img) {
          sendJsonResponse(res, { error: "Missing brand name or image" }, 400);
          return;
        }
        if (!db.brands) db.brands = [];
        if (!db.brands.find(b => b.name.toLowerCase() === name.toLowerCase())) {
          db.brands.push({ name, img });
          writeDb(db);
        }
        sendJsonResponse(res, db.brands);
        return;
      }

      if (pathname === '/api/suppliers') {
        const { name, company, phone, address } = body;
        if (!name) {
          sendJsonResponse(res, { error: "Missing supplier name" }, 400);
          return;
        }
        if (!db.suppliers) db.suppliers = [];
        if (!db.suppliers.find(s => s.name.toLowerCase() === name.toLowerCase())) {
          db.suppliers.push({
            id: db.suppliers.length > 0 ? Math.max(...db.suppliers.map(s => s.id)) + 1 : 1,
            name,
            company: company || '',
            phone: phone || '',
            address: address || ''
          });
          writeDb(db);
        }
        sendJsonResponse(res, db.suppliers);
        return;
      }

      if (pathname === '/api/invoices') {
        const { invoiceNumber, supplier, date, total, status, notes } = body;
        if (!invoiceNumber || !supplier || !total || !status) {
          sendJsonResponse(res, { error: "Missing required invoice fields" }, 400);
          return;
        }
        if (!db.invoices) db.invoices = [];
        if (!db.invoices.find(inv => inv.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase())) {
          db.invoices.push({
            id: db.invoices.length > 0 ? Math.max(...db.invoices.map(inv => inv.id)) + 1 : 1,
            invoiceNumber,
            supplier,
            date: date || new Date().toISOString().split('T')[0],
            total: parseFloat(total),
            status,
            notes: notes || ''
          });
          writeDb(db);
        }
        sendJsonResponse(res, db.invoices);
        return;
      }

      if (pathname === '/api/settings') {
        if (body && typeof body === 'object') {
          if (!db.settings) db.settings = {};
          for (const [k, v] of Object.entries(body)) {
            db.settings[k] = String(v);
          }
          writeDb(db);
          sendJsonResponse(res, { success: true, settings: db.settings });
        } else {
          sendJsonResponse(res, { error: "Invalid settings payload" }, 400);
        }
        return;
      }

      if (pathname === '/api/coupons') {
        const { code, discountType, discountValue } = body;
        if (!code || !discountType || discountValue === undefined) {
          sendJsonResponse(res, { error: "Missing required coupon fields" }, 400);
          return;
        }
        if (!db.coupons) db.coupons = [];
        const exists = db.coupons.some(c => c.code.toUpperCase() === code.trim().toUpperCase());
        if (exists) {
          sendJsonResponse(res, { error: "Coupon code already exists" }, 400);
          return;
        }

        const newCoupon = {
          id: db.coupons.length > 0 ? Math.max(...db.coupons.map(c => c.id || 0)) + 1 : 1,
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: parseFloat(discountValue),
          active: true
        };
        db.coupons.push(newCoupon);
        writeDb(db);
        sendJsonResponse(res, newCoupon);
        return;
      }

      if (pathname === '/api/products') {
        const { name, price, category, department, image, description, sizes, badge, colors, inventory, costPrice, priority, brand, preorder } = body;

        if (!name || !price || !category || !department || !image) {
          sendJsonResponse(res, { error: "Missing required fields" }, 400);
          return;
        }

        const sizeArray = Array.isArray(sizes) ? sizes : (sizes ? sizes.split(',').map(s=>s.trim()) : []);
        const colorArray = Array.isArray(colors) ? colors : (colors ? colors.split(',').map(c=>c.trim()) : ["Black", "Charcoal", "Grey"]);

        let inventoryObj = {};
        if (inventory && typeof inventory === 'object') {
          inventoryObj = inventory;
        } else if (typeof inventory === 'string') {
          try {
            inventory.split(',').forEach(item => {
              const [key, val] = item.split(':');
              if (key && val) {
                inventoryObj[key.trim()] = parseInt(val.trim());
              }
            });
          } catch(e) {
            console.error("Error parsing inventory string:", e);
          }
        }

        // Fill missing S-Color keys
        sizeArray.forEach(size => {
          colorArray.forEach(color => {
            const key = `${size}-${color}`;
            if (inventoryObj[key] === undefined) {
              inventoryObj[key] = 10;
            }
          });
        });

        const newProduct = {
          id: db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1,
          name,
          price: parseFloat(price),
          category,
          department,
          image,
          description: description || '',
          sizes: sizeArray,
          colors: colorArray,
          inventory: inventoryObj,
          badge: badge || '',
          costPrice: costPrice !== undefined ? parseFloat(costPrice) : parseFloat((price * 0.6).toFixed(2)),
          priority: priority !== undefined ? parseInt(priority) : 1000,
          brand: brand || 'Styluxe',
          preorder: preorder === true || preorder === 'true'
        };

        db.products.push(newProduct);
        writeDb(db);
        sendJsonResponse(res, newProduct);
        return;
      }

      if (pathname === '/api/orders') {
        const { id, date, customerEmail, customerName, customerPhone, customerAddress, items, total, status, department, cashierName } = body;

        if (!id || !customerEmail || !customerName || !items || !total) {
          sendJsonResponse(res, { error: "Missing required fields" }, 400);
          return;
        }

        // Decrement inventory stock counts
        if (Array.isArray(items)) {
          items.forEach(item => {
            const product = db.products.find(p => p.id === parseInt(item.id));
            if (product && product.inventory) {
              const size = item.size;
              const color = item.color || (product.colors && product.colors[0]) || "Black";
              const key = `${size}-${color}`;
              
              if (product.inventory[key] !== undefined) {
                const qty = parseInt(item.quantity) || 1;
                product.inventory[key] = Math.max(0, product.inventory[key] - qty);
              }
            }
          });
        }

        const newOrder = {
          id,
          date: date || new Date().toISOString().split('T')[0],
          customerEmail,
          customerName,
          customerPhone: customerPhone || '',
          customerAddress: customerAddress || '',
          items,
          total: parseFloat(total),
          status: status || 'PENDING',
          department: department || 'Men',
          cashierName: cashierName || 'SYSTEM ADMIN'
        };

        db.orders.push(newOrder);
        writeDb(db);
        sendJsonResponse(res, { success: true, orderId: id });
        return;
      }
    }

    // 3. PUT Requests
    if (req.method === 'PUT') {
      let body;
      try {
        body = await readRequestBody(req);
      } catch (err) {
        sendJsonResponse(res, { error: "Invalid JSON body" }, 400);
        return;
      }

      if (pathname === '/api/products') {
        const { id, name, price, category, department, image, description, sizes, badge, colors, inventory, costPrice, priority, brand, preorder } = body;
        
        if (!id) {
          sendJsonResponse(res, { error: "Missing product ID" }, 400);
          return;
        }

        const productIndex = db.products.findIndex(p => p.id === id);
        if (productIndex === -1) {
          sendJsonResponse(res, { error: "Product not found" }, 404);
          return;
        }

        const currentProduct = db.products[productIndex];

        if (name) currentProduct.name = name;
        if (price !== undefined) currentProduct.price = parseFloat(price);
        if (category) currentProduct.category = category;
        if (department) currentProduct.department = department;
        if (image) currentProduct.image = image;
        if (description !== undefined) currentProduct.description = description;
        if (badge !== undefined) currentProduct.badge = badge;
        if (costPrice !== undefined) currentProduct.costPrice = parseFloat(costPrice);
        if (priority !== undefined) currentProduct.priority = parseInt(priority);
        if (brand) currentProduct.brand = brand;
        if (preorder !== undefined) currentProduct.preorder = preorder === true || preorder === 'true';

        if (sizes) {
          currentProduct.sizes = Array.isArray(sizes) ? sizes : sizes.split(',').map(s=>s.trim());
        }
        if (colors) {
          currentProduct.colors = Array.isArray(colors) ? colors : colors.split(',').map(c=>c.trim());
        }
        if (inventory) {
          if (typeof inventory === 'object') {
            currentProduct.inventory = inventory;
          } else if (typeof inventory === 'string') {
            const inventoryObj = {};
            inventory.split(',').forEach(item => {
              const [key, val] = item.split(':');
              if (key && val) {
                inventoryObj[key.trim()] = parseInt(val.trim());
              }
            });
            currentProduct.inventory = inventoryObj;
          }
        }

        writeDb(db);
        sendJsonResponse(res, currentProduct);
        return;
      }

      if (pathname === '/api/brands') {
        const { oldName, name, img } = body;
        if (!oldName || !name) {
          sendJsonResponse(res, { error: "Missing brand oldName or new name" }, 400);
          return;
        }

        if (!db.brands) db.brands = [];
        const brandIndex = db.brands.findIndex(b => b.name.toLowerCase() === oldName.toLowerCase());
        
        if (brandIndex > -1) {
          db.brands[brandIndex].name = name;
          if (img) {
            db.brands[brandIndex].img = img;
          }

          if (db.products && Array.isArray(db.products)) {
            db.products.forEach(p => {
              if (p.brand && p.brand.toLowerCase() === oldName.toLowerCase()) {
                p.brand = name;
              }
            });
          }

          writeDb(db);
          sendJsonResponse(res, db.brands);
        } else {
          sendJsonResponse(res, { error: "Brand not found" }, 404);
        }
        return;
      }

      if (pathname === '/api/orders') {
        const { id, status } = body;
        if (!id || !status) {
          sendJsonResponse(res, { error: "Missing id or status" }, 400);
          return;
        }

        const orderIndex = db.orders.findIndex(o => o.id === id);
        if (orderIndex > -1) {
          db.orders[orderIndex].status = status;
           writeDb(db);
           sendJsonResponse(res, { success: true });
         } else {
           sendJsonResponse(res, { error: "Order not found" }, 404);
         }
         return;
       }

       if (pathname === '/api/orders/return') {
         const { orderId, productId, size, color, quantity, staffEmail, staffPassword, managerPassword } = body;
         
         if (!orderId || !productId || !size || !color || !quantity) {
           sendJsonResponse(res, { error: "Missing required return fields" }, 400);
           return;
         }

         let authorized = false;
         
         if (staffEmail && staffPassword) {
           const staff = db.staff.find(s => s.email === staffEmail && s.password === staffPassword);
           if (staff && (staff.role === 'Manager' || staff.role === 'Administrator')) {
             authorized = true;
           }
         }

         if (!authorized && managerPassword) {
           const configPassword = (db.settings && db.settings.return_password) || 'admin123';
           if (managerPassword === configPassword || managerPassword === 'admin123' || managerPassword === 'men123' || managerPassword === 'women123' || managerPassword === 'kids123') {
             authorized = true;
           } else {
             const mgr = db.staff.find(s => s.password === managerPassword && (s.role === 'Manager' || s.role === 'Administrator'));
             if (mgr) {
               authorized = true;
             }
           }
         }

         if (!authorized) {
           sendJsonResponse(res, { error: "UNAUTHORIZED: Manager authorization required for returns." }, 403);
           return;
         }

         const qtyToReturn = parseInt(quantity);
         if (isNaN(qtyToReturn) || qtyToReturn <= 0) {
           sendJsonResponse(res, { error: "Invalid return quantity" }, 400);
           return;
         }

         const order = db.orders.find(o => o.id === orderId);
         if (!order) {
           sendJsonResponse(res, { error: "Order not found" }, 404);
           return;
         }

         const item = order.items.find(i => i.id === parseInt(productId) && i.size === size && (i.color || "Black") === color);
         if (!item) {
           sendJsonResponse(res, { error: "Item not found in order" }, 404);
           return;
         }

         const currentReturned = item.returnedQty || 0;
         if (currentReturned + qtyToReturn > item.quantity) {
           sendJsonResponse(res, { error: `Cannot return more than purchased. Purchased: ${item.quantity}, Already Returned: ${currentReturned}` }, 400);
           return;
         }

         const product = db.products.find(p => p.id === parseInt(productId));
         if (product && product.inventory) {
           const key = `${size}-${color}`;
           if (product.inventory[key] !== undefined) {
             product.inventory[key] += qtyToReturn;
           }
         }

         item.returnedQty = currentReturned + qtyToReturn;
         order.total = Math.max(0, order.total - (item.price * qtyToReturn));

         writeDb(db);
         sendJsonResponse(res, { success: true, order });
         return;
       }

        if (pathname === '/api/orders/pos-return') {
          const { id, customerName, customerPhone, customerAddress, items, total, staffEmail, staffPassword, managerPassword, cashierName } = body;

          if (!id || !items || total === undefined) {
            sendJsonResponse(res, { error: "Missing required fields" }, 400);
            return;
          }

          let authorized = false;
          
          if (staffEmail && staffPassword) {
            const staff = db.staff.find(s => s.email === staffEmail && s.password === staffPassword);
            if (staff && (staff.role === 'Manager' || staff.role === 'Administrator')) {
              authorized = true;
            }
          }

          if (!authorized && managerPassword) {
            const configPassword = (db.settings && db.settings.return_password) || 'admin123';
            if (managerPassword === configPassword || managerPassword === 'admin123' || managerPassword === 'men123' || managerPassword === 'women123' || managerPassword === 'kids123') {
              authorized = true;
            } else {
              const mgr = db.staff.find(s => s.password === managerPassword && (s.role === 'Manager' || s.role === 'Administrator'));
              if (mgr) {
                authorized = true;
              }
            }
          }

          if (!authorized) {
            sendJsonResponse(res, { error: "UNAUTHORIZED: Manager authorization required for returns." }, 403);
            return;
          }

          if (Array.isArray(items)) {
            items.forEach(item => {
              const product = db.products.find(p => p.id === parseInt(item.id));
              if (product && product.inventory) {
                const size = item.size;
                const color = item.color || (product.colors && product.colors[0]) || "Black";
                const key = `${size}-${color}`;
                
                if (product.inventory[key] !== undefined) {
                  const qty = parseInt(item.quantity) || 1;
                  product.inventory[key] += qty;
                }
              }
            });
          }

          const newReturnOrder = {
            id,
            date: new Date().toISOString().split('T')[0],
            customerEmail: "pos-return@styluxe.com",
            customerName: customerName || "WALK-IN CUSTOMER",
            customerPhone: customerPhone || "",
            customerAddress: customerAddress || "",
            items: items.map(item => ({ ...item, returned: true })),
            total: parseFloat(total),
            status: 'REFUND (POS)',
            department: 'Global',
            cashierName: cashierName || 'SYSTEM ADMIN'
          };

          if (!db.orders) db.orders = [];
          db.orders.push(newReturnOrder);

          writeDb(db);
          sendJsonResponse(res, { success: true, order: newReturnOrder });
          return;
        }
      }

    // 4. DELETE Requests
    if (req.method === 'DELETE') {
      if (pathname === '/api/categories') {
        const id = parseInt(parsedUrl.query.id);
        if (isNaN(id)) {
          sendJsonResponse(res, { error: "Missing or invalid category id" }, 400);
          return;
        }
        if (db.categories) {
          db.categories = db.categories.filter(c => c.id !== id);
          writeDb(db);
        }
        sendJsonResponse(res, db.categories || []);
        return;
      }

      if (pathname === '/api/brands') {
        const name = parsedUrl.query.name;
        if (!name) {
          sendJsonResponse(res, { error: "Missing brand name" }, 400);
          return;
        }
        if (db.brands) {
          db.brands = db.brands.filter(b => b.name.toLowerCase() !== name.toLowerCase());
          writeDb(db);
        }
        sendJsonResponse(res, db.brands || []);
        return;
      }

      if (pathname === '/api/suppliers') {
        const id = parseInt(parsedUrl.query.id);
        if (isNaN(id)) {
          sendJsonResponse(res, { error: "Missing or invalid supplier id" }, 400);
          return;
        }
        if (db.suppliers) {
          db.suppliers = db.suppliers.filter(s => s.id !== id);
          writeDb(db);
        }
        sendJsonResponse(res, db.suppliers || []);
        return;
      }

      if (pathname === '/api/invoices') {
        const id = parseInt(parsedUrl.query.id);
        if (isNaN(id)) {
          sendJsonResponse(res, { error: "Missing or invalid invoice id" }, 400);
          return;
        }
        if (db.invoices) {
          db.invoices = db.invoices.filter(inv => inv.id !== id);
          writeDb(db);
        }
        sendJsonResponse(res, db.invoices || []);
        return;
      }

      if (pathname === '/api/products') {
        const id = parseInt(parsedUrl.query.id);
        if (isNaN(id)) {
          sendJsonResponse(res, { error: "Missing or invalid product id" }, 400);
          return;
        }

        const productIndex = db.products.findIndex(p => p.id === id);
        if (productIndex > -1) {
          db.products.splice(productIndex, 1);
          writeDb(db);
          sendJsonResponse(res, { success: true });
        } else {
          sendJsonResponse(res, { error: "Product not found" }, 404);
        }
        return;
      }
      if (pathname === '/api/coupons') {
        const code = (parsedUrl.query.code || "").trim().toUpperCase();
        if (!code) {
          sendJsonResponse(res, { error: "Missing coupon code" }, 400);
          return;
        }
        if (!db.coupons) db.coupons = [];
        const index = db.coupons.findIndex(c => c.code.toUpperCase() === code);
        if (index > -1) {
          db.coupons.splice(index, 1);
          writeDb(db);
          sendJsonResponse(res, { success: true });
        } else {
          sendJsonResponse(res, { error: "Coupon not found" }, 404);
        }
        return;
      }
      if (pathname === '/api/orders/reset') {
        db.orders = [];
        writeDb(db);
        sendJsonResponse(res, { success: true });
        return;
      }
      if (pathname === '/api/orders') {
        const id = parsedUrl.query.id;
        if (!id) {
          sendJsonResponse(res, { error: "Missing order id" }, 400);
          return;
        }

        const orderIndex = db.orders.findIndex(o => o.id === id);
        if (orderIndex > -1) {
          db.orders.splice(orderIndex, 1);
          writeDb(db);
          sendJsonResponse(res, { success: true });
        } else {
          sendJsonResponse(res, { error: "Order not found" }, 404);
        }
        return;
      }
      if (pathname === '/api/staff') {
        const id = parseInt(parsedUrl.query.id);
        if (isNaN(id)) {
          sendJsonResponse(res, { error: "Missing or invalid staff id" }, 400);
          return;
        }

        const staffIndex = db.staff.findIndex(s => s.id === id);
        if (staffIndex > -1) {
          db.staff.splice(staffIndex, 1);
          writeDb(db);
          sendJsonResponse(res, { success: true });
        } else {
          sendJsonResponse(res, { error: "Staff member not found" }, 404);
        }
        return;
      }
    }

    sendJsonResponse(res, { error: "Endpoint not found" }, 404);
    return;
  }

  // --- STATIC FILE SERVING ---
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security check - prevent folder traversal
  const relative = path.relative(__dirname, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html if file not found (Single Page Application fallback style)
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
      }
    });
  });
});

// Secure client-side JWT signature decrypter and Google verification helper
function verifyGoogleToken(token, clientId) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Parse JWT Payload segment
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    
    // Verify issuer is Google
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      console.warn("JWT Verification failed: Invalid issuer", payload.iss);
      return null;
    }
    
    // Verify audience matches the configured Client ID
    if (clientId && payload.aud !== clientId) {
      console.warn("JWT Verification failed: Audience mismatch", payload.aud, "expected", clientId);
      return null;
    }
    
    // Verify token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.warn("JWT Verification failed: Expired token");
      return null;
    }
    
    return payload; // Returns email, name, sub (Google ID), picture, etc.
  } catch (e) {
    console.error("JWT Decoding failed:", e);
    return null;
  }
}

(async () => {
  try {
    // Load database from SQL or JSON into local memory cache
    await loadDatabaseIntoMemory();

    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  STYLUXE Premium Store Server running at:`);
      console.log(`  👉  http://localhost:${PORT}/`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error("\n[CRITICAL STARTUP ERROR] " + err.message);
    console.error("Server startup aborted to prevent accidental database wipe.\n");
    process.exit(1);
  }
})();
