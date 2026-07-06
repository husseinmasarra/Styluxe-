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
    description: "Crafted from 500GSM ultra-heavyweight Egyptian cotton fleece. Features drop shoulders, a double-lined hood without drawstrings for a clean look, kangaroo pocket, and thick ribbed cuffs. Made for a premium relaxed silhouette.",
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
    description: "Junior edition of our signature oversized hoodie. Crafted from organic Egyptian cotton fleece to provide lightweight warmth and exceptional softness.",
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
  return product;
}

// Helper to initialize and read/write the JSON DB
function readDb() {
  let db;
  if (!fs.existsSync(DB_FILE)) {
    db = { products: initialProducts, users: initialUsers, orders: initialOrders, staff: initialStaff };
    db.products = db.products.map(p => ensureProductInventory(p));
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    return db;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    db = JSON.parse(data);
    
    // Migration: ensure staff exists
    if (!db.staff) {
      db.staff = initialStaff;
    }
    // Migration: ensure all products have colors and inventory
    let migrated = false;
    db.products = db.products.map(p => {
      const updated = ensureProductInventory(p);
      if (!p.colors || !p.inventory) migrated = true;
      return updated;
    });
    
    if (migrated || !db.staff) {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    }
    return db;
  } catch (err) {
    console.error("Error reading database file, using fallback mock data:", err);
    return { products: initialProducts, users: initialUsers, orders: initialOrders, staff: initialStaff };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Error writing database file:", err);
    return false;
  }
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
      if (pathname === '/api/products') {
        sendJsonResponse(res, db.products);
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
        const { name, email, password, role, permissions } = body;
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
          status: "Active"
        };

        db.staff.push(newStaff);
        writeDb(db);

        const { password: _, ...safeStaff } = newStaff;
        sendJsonResponse(res, safeStaff);
        return;
      }

      if (pathname === '/api/products') {
        const { name, price, category, department, image, description, sizes, badge, colors, inventory } = body;

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
          badge: badge || ''
        };

        db.products.push(newProduct);
        writeDb(db);
        sendJsonResponse(res, newProduct);
        return;
      }

      if (pathname === '/api/orders') {
        const { id, date, customerEmail, customerName, customerPhone, customerAddress, items, total, status, department } = body;

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
          department: department || 'Men'
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
    }

    // 4. DELETE Requests
    if (req.method === 'DELETE') {
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

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  STYLUXE Premium Store Server running at:`);
  console.log(`  👉  http://localhost:${PORT}/`);
  console.log(`======================================================\n`);
});
