// STATE MANAGEMENT & DATABASE SYNC
let PRODUCTS = [];
let ordersList = [];
let usersList = [];
let CATEGORIES = [];
let BRANDS = [];
let SUPPLIERS = [];
let INVOICES = [];
let cart = [];

// Admin Panel State
let currentAdminDept = ""; // "Men", "Women", "Kids", "Global"
let currentAdminStaff = null; // Active logged in staff details
let adminActiveTab = "overview";
let posCart = [];

// Customer Accounts State
let currentUser = null;

let activeDepartment = "All";
let activeCategory = "All";
let searchQuery = "";
let currentCurrency = "USD"; // "USD" or "LBP"
const LBP_RATE = 89500; // Static conversion rate $1 = 89,500 LBP
let selectedSize = "";
let activeModalProduct = null;

// DOM ELEMENTS
const productGrid = document.getElementById("productGrid");
const filterTagsContainer = document.getElementById("filterTags");
const departmentControls = document.getElementById("departmentControls");
const sortSelect = document.getElementById("sortSelect");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchBox = document.querySelector(".search-box");
const cartToggleBtn = document.getElementById("cartToggleBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const cartBackdrop = document.getElementById("cartBackdrop");
const cartItemsContainer = document.getElementById("cartItemsContainer");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartCountBadge = document.getElementById("cartCount");
const cartHeaderCount = document.getElementById("cartHeaderCount");
const cartDrawerFooter = document.getElementById("cartDrawerFooter");
const currencyBtn = document.getElementById("currencyBtn");
const currencyDropdown = document.getElementById("currencyDropdown");
const navbar = document.getElementById("navbar");

// MODAL DOM ELEMENTS
const productModalBackdrop = document.getElementById("productModalBackdrop");
const modalProductImg = document.getElementById("modalProductImg");
const modalProductCategory = document.getElementById("modalProductCategory");
const modalProductName = document.getElementById("modalProductName");
const modalProductPrice = document.getElementById("modalProductPrice");
const modalProductDesc = document.getElementById("modalProductDesc");
const sizeSelectorGrid = document.getElementById("sizeSelectorGrid");
const modalAddToCartBtn = document.getElementById("modalAddToCartBtn");

// CHECKOUT DOM ELEMENTS
const checkoutModalBackdrop = document.getElementById("checkoutModalBackdrop");
const checkoutOrderSummary = document.getElementById("checkoutOrderSummary");
const checkoutForm = document.getElementById("checkoutForm");
const successModalBackdrop = document.getElementById("successModalBackdrop");
const orderNumberText = document.getElementById("orderNumber");

// MOBILE MENU DOM ELEMENTS
const menuToggle = document.getElementById("menuToggle");
const mobileDrawer = document.getElementById("mobileDrawer");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const drawerBackdrop = document.getElementById("drawerBackdrop");

// DATABASE SYNC ACTIONS
async function loadProductsFromServer() {
    try {
        const [resProd, resCat, resBrand, resSupp, resInv] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/categories'),
            fetch('/api/brands'),
            fetch('/api/suppliers'),
            fetch('/api/invoices')
        ]);
        
        if (resProd.ok) PRODUCTS = await resProd.json();
        if (resCat.ok) CATEGORIES = await resCat.json();
        if (resBrand.ok) BRANDS = await resBrand.json();
        if (resSupp.ok) SUPPLIERS = await resSupp.json();
        if (resInv.ok) INVOICES = await resInv.json();

        updateCategoriesDatalist();
        
        renderProducts();
        renderBrandSlider();
        renderCategoryTags();
    } catch (err) {
        console.error("Failed to load store data from server:", err);
    }
}

function updateCategoriesDatalist() {
    const datalist = document.getElementById("categoriesDatalist");
    if (!datalist) return;
    datalist.innerHTML = "";
    CATEGORIES.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.name;
        datalist.appendChild(opt);
    });
}

async function loadOrdersFromServer() {
    try {
        const response = await fetch('/api/orders');
        ordersList = await response.json();
    } catch (err) {
        console.error("Failed to load orders from server:", err);
    }
}

async function loadUsersFromServer() {
    try {
        const response = await fetch('/api/users');
        usersList = await response.json();
    } catch (err) {
        console.error("Failed to load users from server:", err);
    }
}

// INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    
    // Load database records and config
    await loadServerConfig();
    await loadProductsFromServer();
    await loadOrdersFromServer();

    // Render interactive brand slider and dynamic subcategories
    renderBrandSlider();
    renderCategoryTags();
    updateWhatsAppPill("All");
    
    setupEventListeners();
    loadCartFromLocalStorage();
    updateCartUI();

    // Handle redirect-based social login (for mobile/in-app browsers)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('social_login')) {
        const email = urlParams.get('email');
        const name = urlParams.get('name');
        if (email && name) {
            handleSocialLoginSuccess({ name, email });
            // Clean URL query parameters
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }
    
    // Auto-resume customer session from localStorage
    const savedUser = localStorage.getItem("styluxe_user");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserSessionUI();
        closeAuthModal(); // Auto-bypass login landing screen
    }
    
    // Add event listener to filter out department selectors
    const deptBtnNavs = document.querySelectorAll(".nav-links a, .drawer-links a");
    deptBtnNavs.forEach(link => {
        if (link.getAttribute("onclick") && link.getAttribute("onclick").includes("filterByDepartment")) {
            link.addEventListener("click", () => {
                const navLinks = document.getElementById("navLinks").querySelectorAll("a");
                navLinks.forEach(n => n.classList.remove("active"));
                link.classList.add("active");
            });
        }
    });
});

// EVENT LISTENERS SETUP
function setupEventListeners() {
    // Navbar scroll effect
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    });

    // Search Box Interaction
    searchBtn.addEventListener("click", (e) => {
        if (!searchBox.classList.contains("active")) {
            e.preventDefault();
            searchBox.classList.add("active");
            searchInput.focus();
        } else if (searchInput.value.trim() === "") {
            searchBox.classList.remove("active");
        }
    });

    // Close search box if clicking outside
    document.addEventListener("click", (e) => {
        if (!searchBox.contains(e.target) && searchBox.classList.contains("active") && searchInput.value === "") {
            searchBox.classList.remove("active");
        }
    });

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderProducts();
    });

    // Cart Drawer Interactions
    cartToggleBtn.addEventListener("click", () => toggleCartDrawer(true));
    closeCartBtn.addEventListener("click", () => toggleCartDrawer(false));
    cartBackdrop.addEventListener("click", () => toggleCartDrawer(false));

    // Currency selector click (guarded for deletion)
    if (currencyBtn) {
        currencyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            currencyDropdown.classList.toggle("active");
        });
    }
    
    document.addEventListener("click", () => {
        if (currencyDropdown) {
            currencyDropdown.classList.remove("active");
        }
    });

    // Product Modal Image Zoom & Pan interactions for mobile/desktop details view
    const gallery = document.querySelector(".modal-gallery");
    const img = document.getElementById("modalProductImg");
    if (gallery && img) {
        // Toggle Zoom on click
        gallery.addEventListener("click", () => {
            gallery.classList.toggle("zoomed");
            if (!gallery.classList.contains("zoomed")) {
                img.style.transform = "scale(1)";
                img.style.transformOrigin = "center";
            } else {
                img.style.transform = "scale(2.2)";
            }
        });

        // Track mouse or touch panning inside zoomed container
        const handleMove = (e) => {
            if (!gallery.classList.contains("zoomed")) return;
            const rect = gallery.getBoundingClientRect();
            let pointerX = 0;
            let pointerY = 0;

            if (e.touches && e.touches[0]) {
                pointerX = e.touches[0].clientX - rect.left;
                pointerY = e.touches[0].clientY - rect.top;
            } else {
                pointerX = e.clientX - rect.left;
                pointerY = e.clientY - rect.top;
            }

            const xPercent = Math.max(0, Math.min(100, (pointerX / rect.width) * 100));
            const yPercent = Math.max(0, Math.min(100, (pointerY / rect.height) * 100));
            img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
        };

        gallery.addEventListener("mousemove", handleMove);
        gallery.addEventListener("touchmove", handleMove, { passive: true });
    }

    // Mobile Menu Drawer
    menuToggle.addEventListener("click", toggleMobileDrawer);
    closeDrawerBtn.addEventListener("click", toggleMobileDrawer);
    drawerBackdrop.addEventListener("click", toggleMobileDrawer);

    // Live Image Upload Previews for Admin Panel
    const prodImgFile = document.getElementById("newProdImgFile");
    if (prodImgFile) {
        prodImgFile.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                getFileBase64(file).then(base64 => {
                    const previewDiv = document.getElementById("newProdImgPreview");
                    const previewImg = previewDiv.querySelector("img");
                    previewImg.src = base64;
                    previewDiv.style.display = "block";
                });
            }
        });
    }

    const brandImgFile = document.getElementById("newBrandImgFileInput");
    if (brandImgFile) {
        brandImgFile.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                getFileBase64(file).then(base64 => {
                    const previewDiv = document.getElementById("newBrandImgPreview");
                    const previewImg = previewDiv.querySelector("img");
                    previewImg.src = base64;
                    previewDiv.style.display = "block";
                });
            }
        });
    }

    const catImgFile = document.getElementById("newCategoryImgFileInput");
    if (catImgFile) {
        catImgFile.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                getFileBase64(file).then(base64 => {
                    const previewDiv = document.getElementById("newCategoryImgPreview");
                    const previewImg = previewDiv.querySelector("img");
                    previewImg.src = base64;
                    previewDiv.style.display = "block";
                });
            }
        });
    }
}

// FORMAT PRICE ACCORDING TO ACTIVE CURRENCY (Always USD)
function formatPrice(priceInUSD) {
    return priceInUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// SWITCH CURRENCY (guarded for deletion)
function changeCurrency(currency) {
    currentCurrency = currency;
    if (currencyBtn) {
        currencyBtn.textContent = currency === "USD" ? "USD ($)" : "LBP (ل.ل)";
    }
    if (currencyDropdown) {
        currencyDropdown.classList.remove("active");
    }
    renderProducts();
    updateCartUI();
    if (activeModalProduct) {
        modalProductPrice.textContent = formatPrice(activeModalProduct.price);
    }
}

// MOBILE DRAWER TOGGLE
function toggleMobileDrawer() {
    mobileDrawer.classList.toggle("active");
    drawerBackdrop.classList.toggle("active");
    document.body.style.overflow = mobileDrawer.classList.contains("active") ? "hidden" : "";
}

// TOGGLE CART SIDEBAR DRAWER
function toggleCartDrawer(isOpen) {
    if (isOpen) {
        cartDrawer.classList.add("active");
        cartBackdrop.classList.add("active");
        document.body.style.overflow = "hidden";
    } else {
        cartDrawer.classList.remove("active");
        cartBackdrop.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// FILTER BY DEPARTMENT
function filterByDepartment(department) {
    activeDepartment = department;
    
    // Reset nested subcategory and brand filters
    activeCategory = "All";
    activeBrand = "All";

    // Update active state in department buttons
    const tags = departmentControls.querySelectorAll(".dept-tag");
    tags.forEach(tag => {
        const text = tag.textContent.trim().toLowerCase();
        const compareText = department.toLowerCase();
        
        if (compareText === "all" && text === "all departments") {
            tag.classList.add("active");
        } else if (text === compareText) {
            tag.classList.add("active");
        } else {
            tag.classList.remove("active");
        }
    });

    // Update navbar active link highlight
    const navLinks = document.getElementById("navLinks").querySelectorAll("a");
    navLinks.forEach(link => {
        const text = link.textContent.trim().toLowerCase();
        if (text === department.toLowerCase()) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    // Render components and filter grid
    renderBrandSlider();
    renderCategoryTags();
    updateWhatsAppPill(department);
    renderProducts();

    // Toggle section visibility in-place without page scrolling!
    const collectionsGridSec = document.getElementById("collections");
    const shopSec = document.getElementById("shop-section");
    const backBtnContainer = document.getElementById("backToCollectionsContainer");

    if (department === "All") {
        if (collectionsGridSec) collectionsGridSec.style.display = "block";
        if (shopSec) shopSec.style.display = "none";
        if (backBtnContainer) backBtnContainer.style.display = "none";
        
        // Smooth scroll back to collections section if we went back
        if (collectionsGridSec) {
            collectionsGridSec.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        if (collectionsGridSec) collectionsGridSec.style.display = "none";
        if (shopSec) shopSec.style.display = "block";
        if (backBtnContainer) backBtnContainer.style.display = "block";
    }
}

function showCollectionsGrid() {
    filterByDepartment("All");
}

// FILTER BY CATEGORY
function filterByCategory(category) {
    activeCategory = category;
    renderCategoryTags();
    renderProducts();
}

// SORT PRODUCTS
function sortProducts() {
    renderProducts();
}

// FILTER AND SORT PRODUCTS COMBINED
function getFilteredAndSortedProducts() {
    let result = [...PRODUCTS];

    // Department Filter
    if (activeDepartment !== "All") {
        result = result.filter(p => p.department.toLowerCase() === activeDepartment.toLowerCase());
    }

    // Category Filter
    if (activeCategory !== "All") {
        result = result.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
    }

    // Brand Filter
    if (activeBrand !== "All") {
        result = result.filter(p => getProductBrand(p).toLowerCase() === activeBrand.toLowerCase());
    }

    // Search Query Filter
    if (searchQuery.trim() !== "") {
        const query = searchQuery.trim().toLowerCase();
        result = result.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.category.toLowerCase().includes(query) ||
            p.department.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.id.toString() === query ||
            (`#${p.id}`) === query
        );
    }

    // Sort Selector
    const sortVal = sortSelect.value;
    if (sortVal === "price-low") {
        result.sort((a, b) => a.price - b.price);
    } else if (sortVal === "price-high") {
        result.sort((a, b) => b.price - a.price);
    }

    return result;
}

// RENDER PRODUCTS TO GRID
function renderProducts() {
    const list = getFilteredAndSortedProducts();
    productGrid.innerHTML = "";

    if (list.length === 0) {
        productGrid.innerHTML = `
            <div class="no-products-message" style="grid-column: 1 / -1; text-align: center; padding: 6rem 0; color: var(--color-text-muted);">
                <i class="fa-solid fa-face-frown" style="font-size: 4rem; margin-bottom: 2rem; display: block;"></i>
                <p style="font-size: 1.6rem; letter-spacing: 0.1em;">NO PRODUCTS FOUND MATCHING YOUR CRITERIA.</p>
            </div>
        `;
        return;
    }

    list.forEach(p => {
        const productCard = document.createElement("div");
        productCard.classList.add("product-card");

        let badgeHTML = "";
        if (p.badge) {
            badgeHTML = `<span class="product-badge">${p.badge}</span>`;
        }

        productCard.innerHTML = `
            ${badgeHTML}
            <div class="product-img-wrapper" onclick="openProductModal(${p.id})">
                <img src="${p.image}" alt="${p.name}" loading="lazy">
                <div class="product-quick-view">
                    <button class="quick-view-btn">QUICK VIEW</button>
                </div>
            </div>
            <div class="product-info" onclick="openProductModal(${p.id})">
                <span class="product-category">${p.department} / ${p.category}</span>
                <h3 class="product-name">${p.name}</h3>
                <span class="product-price">${formatPrice(p.price)}</span>
            </div>
        `;

        productGrid.appendChild(productCard);
    });
}

// OPEN PRODUCT DETAILS MODAL
function openProductModal(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    activeModalProduct = product;
    selectedSize = ""; // Reset size choice

    modalProductImg.src = product.image;
    modalProductImg.alt = product.name;
    modalProductCategory.textContent = `${product.department} / ${product.category}`;
    modalProductName.textContent = product.name;
    modalProductPrice.textContent = formatPrice(product.price);
    modalProductDesc.textContent = product.description;

    // Render Color Swatches
    const colorSelectorGrid = document.getElementById("colorSelectorGrid");
    colorSelectorGrid.innerHTML = "";
    
    const colorMap = {
        "Black": "#000000",
        "Charcoal": "#2b2b2b",
        "Grey": "#808080",
        "Gray": "#808080",
        "Navy": "#000080",
        "Olive": "#808000",
        "White": "#ffffff",
        "Beige": "#f5f5dc",
        "Khaki": "#c3b091",
        "Red": "#ff0000",
        "Blue": "#0000ff"
    };

    const colors = product.colors || ["Black", "Charcoal", "Grey"];
    selectedColor = colors[0]; // Set default color choice

    colors.forEach(color => {
        const dot = document.createElement("div");
        dot.classList.add("color-swatch-dot");
        if (selectedColor === color) dot.classList.add("active");
        
        dot.style.backgroundColor = colorMap[color] || "#888888";
        dot.title = color;
        dot.onclick = () => selectColor(color, dot);
        colorSelectorGrid.appendChild(dot);
    });

    // Render Size Buttons
    renderSizingButtons(product);

    // Initialize premium gallery images
    loadProductGallery(product);

    // Set up hover zoom
    setupHoverZoom();

    // Load customer reviews
    loadProductReviews(product.id);

    // Reset review form collapsed state
    const reviewFormContainer = document.getElementById("writeReviewFormContainer");
    const writeReviewToggleBtn = document.getElementById("writeReviewToggleBtn");
    if (reviewFormContainer) reviewFormContainer.style.display = "none";
    if (writeReviewToggleBtn) writeReviewToggleBtn.textContent = "WRITE A REVIEW";
    resetReviewForm();

    // Add Active class to modal backdrop
    productModalBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
}

// RENDER SIZING BUTTONS BASED ON STOCK
function renderSizingButtons(product) {
    sizeSelectorGrid.innerHTML = "";
    product.sizes.forEach(size => {
        const btn = document.createElement("button");
        btn.classList.add("size-btn");
        
        // Check stock quantity for this size-color
        const key = `${size}-${selectedColor}`;
        const stock = (product.inventory && product.inventory[key] !== undefined) 
            ? product.inventory[key] 
            : 10;
            
        if (stock <= 0) {
            btn.classList.add("out-of-stock");
            btn.textContent = `${size} (OUT)`;
            btn.disabled = true;
        } else {
            btn.textContent = size;
            btn.onclick = () => selectSize(size, btn);
        }
        
        if (selectedSize === size && stock > 0) {
            btn.classList.add("active");
        }
        
        sizeSelectorGrid.appendChild(btn);
    });
}

// SELECT COLOR IN MODAL
function selectColor(color, clickedDot) {
    selectedColor = color;
    
    // Update dot active styling
    const dots = document.querySelectorAll(".color-swatch-dot");
    dots.forEach(d => d.classList.remove("active"));
    clickedDot.classList.add("active");
    
    // Reset selected size when color changes
    selectedSize = "";
    
    // Re-render sizes for the new color
    renderSizingButtons(activeModalProduct);
}

// SELECT SIZE IN MODAL
function selectSize(size, clickedBtn) {
    selectedSize = size;
    
    // Clear active class from all size buttons in modal
    const buttons = sizeSelectorGrid.querySelectorAll(".size-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    
    // Set active on clicked button
    clickedBtn.classList.add("active");
}

// CLOSE PRODUCT DETAILS MODAL
function closeProductModal() {
    productModalBackdrop.classList.remove("active");
    
    // Reset image transform in case it was zoomed
    if (modalProductImg) {
        modalProductImg.style.transform = "scale(1)";
        modalProductImg.style.transformOrigin = "center";
    }

    activeModalProduct = null;
    selectedSize = "";
    document.body.style.overflow = "";
}

// ADD TO CART SYSTEM
function addProductFromModalToCart() {
    if (!activeModalProduct) return;

    if (!selectedSize) {
        alert("PLEASE SELECT A SIZE BEFORE ADDING TO CART.");
        return;
    }

    addToCart(activeModalProduct.id, selectedSize);
    closeProductModal();
    toggleCartDrawer(true);
}

function addToCart(productId, size, quantity = 1) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    // Check if item already in cart with same size
    const existingIndex = cart.findIndex(item => item.id === productId && item.size === size);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            size: size,
            quantity: quantity
        });
    }

    saveCartToLocalStorage();
    updateCartUI();
}

// REMOVE FROM CART
function removeFromCart(productId, size, color = "Black") {
    cart = cart.filter(item => !(item.id === productId && item.size === size && (item.color || "Black") === color));
    saveCartToLocalStorage();
    updateCartUI();
}

// UPDATE QUANTITY
function updateQuantity(productId, size, color = "Black", change = 1) {
    const index = cart.findIndex(item => item.id === productId && item.size === size && (item.color || "Black") === color);
    if (index === -1) return;

    cart[index].quantity += change;

    if (cart[index].quantity <= 0) {
        removeFromCart(productId, size, color);
    } else {
        saveCartToLocalStorage();
        updateCartUI();
    }
}

// SAVE & LOAD LOCAL STORAGE
function saveCartToLocalStorage() {
    localStorage.setItem("styluxe_cart", JSON.stringify(cart));
}

function loadCartFromLocalStorage() {
    const data = localStorage.getItem("styluxe_cart");
    if (data) {
        try {
            cart = JSON.parse(data);
        } catch (e) {
            cart = [];
        }
    }
}

// UPDATE CART UI DRAWER
function updateCartUI() {
    const totalCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    // Update Badges
    cartCountBadge.textContent = totalCount;
    cartHeaderCount.textContent = totalCount;

    // Render Items
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart-message">
                <i class="fa-solid fa-bag-shopping"></i>
                <p>YOUR CART IS EMPTY</p>
                <button onclick="toggleCartDrawer(false)" class="continue-shopping-btn">CONTINUE SHOPPING</button>
            </div>
        `;
        cartDrawerFooter.style.display = "none";
        return;
    }

    cartDrawerFooter.style.display = "block";

    cart.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("cart-item");

        const colorVal = item.color || "Black";

        itemDiv.innerHTML = `
            <img class="cart-item-img" src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4 class="cart-item-name">${item.name}</h4>
                <span class="cart-item-size">SIZE: ${item.size} / COLOR: ${colorVal}</span>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, '${item.size}', '${colorVal}', -1)">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, '${item.size}', '${colorVal}', 1)">+</button>
                </div>
            </div>
            <div class="cart-item-price-delete">
                <span class="cart-item-price">${formatPrice(item.price * item.quantity)}</span>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id}, '${item.size}', '${colorVal}')" aria-label="Remove item"><i class="fa-regular fa-trash-can"></i></button>
            </div>
        `;

        cartItemsContainer.appendChild(itemDiv);
    });

    cartSubtotal.textContent = formatPrice(subtotal);
}

// CHECKOUT SYSTEM SIMULATION
function openCheckoutModal() {
    if (cart.length === 0) return;

    toggleCartDrawer(false);

    // Populate Order Summary inside Checkout
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = subtotal >= 150 ? 0 : 10; // Free shipping over $150
    const total = subtotal + shipping;

    // Pre-fill fields from user profile if logged in, otherwise leave empty
    if (currentUser) {
        document.getElementById("fullName").value = currentUser.name;
        document.getElementById("email").value = currentUser.email;
        document.getElementById("phoneNumber").value = currentUser.phone;
        document.getElementById("address").value = currentUser.address;
    } else {
        document.getElementById("fullName").value = "";
        document.getElementById("email").value = "";
        document.getElementById("phoneNumber").value = "";
        document.getElementById("address").value = "";
    }
    document.getElementById("city").value = "Beirut";

    checkoutOrderSummary.innerHTML = "";
    
    // Add cart items
    cart.forEach(item => {
        const row = document.createElement("div");
        row.classList.add("summary-item-row");
        row.innerHTML = `
            <span>${item.name} (x${item.quantity}) [Size: ${item.size}]</span>
            <span>${formatPrice(item.price * item.quantity)}</span>
        `;
        checkoutOrderSummary.appendChild(row);
    });

    // Add shipping row
    const shippingRow = document.createElement("div");
    shippingRow.classList.add("summary-item-row");
    shippingRow.innerHTML = `
        <span>SHIPPING</span>
        <span>${shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
    `;
    checkoutOrderSummary.appendChild(shippingRow);

    // Add total row
    const totalRow = document.createElement("div");
    totalRow.classList.add("summary-item-row", "total-row");
    totalRow.innerHTML = `
        <span>TOTAL TO PAY</span>
        <span>${formatPrice(total)}</span>
    `;
    checkoutOrderSummary.appendChild(totalRow);

    // Display modal
    checkoutModalBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeCheckoutModal() {
    checkoutModalBackdrop.classList.remove("active");
    document.body.style.overflow = "";
}

// HANDLE CHECKOUT SUBMIT
function handleCheckoutSubmit(event) {
    event.preventDefault();
    
    // Simulate API Call / Processing
    const submitBtn = checkoutForm.querySelector(".place-order-btn");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "PROCESSING ORDER...";

    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = subtotal >= 150 ? 0 : 10;
    const total = subtotal + shipping;
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const firstItemDept = cart[0] ? PRODUCTS.find(p => p.id === cart[0].id).department : "Men";

    const orderData = {
        id: `STX-${randomNum}`,
        customerName: document.getElementById("fullName").value,
        customerEmail: document.getElementById("email").value || (currentUser ? currentUser.email : "guest@example.com"),
        customerPhone: document.getElementById("phoneNumber").value,
        customerAddress: `${document.getElementById("address").value}, ${document.getElementById("city").value}`,
        date: new Date().toISOString().split('T')[0],
        items: [...cart],
        total: total,
        status: "PENDING",
        department: firstItemDept
    };

    fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    })
    .then(async res => {
        if (res.ok) {
            // Fetch latest orders to sync local state
            await loadOrdersFromServer();

            // Clear Cart
            cart = [];
            saveCartToLocalStorage();
            updateCartUI();

            // Close checkout and open success screen
            closeCheckoutModal();
            
            // Generate random order number
            orderNumberText.textContent = `#STX-${randomNum}`;

            // Reset form
            checkoutForm.reset();
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            // Open success modal
            successModalBackdrop.classList.add("active");
            document.body.style.overflow = "hidden";
        } else {
            const errResult = await res.json();
            alert("ORDER CREATION FAILED: " + (errResult.error || "UNKNOWN ERROR"));
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    })
    .catch(err => {
        console.error("Order submit failed:", err);
        alert("SERVER CONNECTION ERROR. PLEASE TRY AGAIN.");
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}

function closeSuccessModal() {
    successModalBackdrop.classList.remove("active");
    document.body.style.overflow = "";
}

// THEME TOGGLE (DAY/NIGHT MODE)
function toggleTheme() {
    const currentTheme = document.body.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("styluxe_theme", newTheme);
    
    updateThemeIcon(newTheme);
}

function initTheme() {
    const savedTheme = localStorage.getItem("styluxe_theme") || "light";
    document.body.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const themeBtnIcon = document.querySelector("#themeToggleBtn i");
    if (themeBtnIcon) {
        if (theme === "light") {
            themeBtnIcon.className = "fa-solid fa-sun";
        } else {
            themeBtnIcon.className = "fa-solid fa-moon";
        }
    }
}

// ==========================================================================
// ADMIN PORTAL & POS WORKSPACE LOGIC
// ==========================================================================

const adminLoginModalBackdrop = document.getElementById("adminLoginModalBackdrop");
const adminPanelOverlay = document.getElementById("adminPanelOverlay");
const adminDeptTitle = document.getElementById("adminDeptTitle");
const adminPasswordInput = document.getElementById("adminPassword");
const loginError = document.getElementById("loginError");
const adminPosNavBtn = document.getElementById("adminPosNavBtn");

const addProductModalBackdrop = document.getElementById("addProductModalBackdrop");
const addProductForm = document.getElementById("addProductForm");

const posProductsGrid = document.getElementById("posProductsGrid");
const posTicketItems = document.getElementById("posTicketItems");
const posSubtotal = document.getElementById("posSubtotal");
const posDiscountInput = document.getElementById("posDiscountInput");
const posDiscountAmount = document.getElementById("posDiscountAmount");
const posTotal = document.getElementById("posTotal");
const posCustomerName = document.getElementById("posCustomerName");
const posCustomerPhone = document.getElementById("posCustomerPhone");

const posReceiptModalBackdrop = document.getElementById("posReceiptModalBackdrop");

// Admin Modals Handlers
function openAdminLoginModal() {
    adminPasswordInput.value = "";
    loginError.style.display = "none";
    adminLoginModalBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeAdminLoginModal() {
    adminLoginModalBackdrop.classList.remove("active");
    document.body.style.overflow = "";
}

// Handle Admin Login Router
async function handleAdminLogin(event) {
    event.preventDefault();
    const email = document.getElementById("adminEmail").value.trim();
    const pass = adminPasswordInput.value.trim();
    loginError.style.display = "none";

    // 1. Check legacy codes first (for convenience and backwards compatibility)
    if (!email) {
        if (pass === "men123") {
            currentAdminDept = "Men";
            currentAdminStaff = { name: "Men Manager", email: "", role: "Manager", permissions: ["manage_products", "manage_orders"] };
        } else if (pass === "women123") {
            currentAdminDept = "Women";
            currentAdminStaff = { name: "Women Manager", email: "", role: "Manager", permissions: ["manage_products", "manage_orders"] };
        } else if (pass === "kids123") {
            currentAdminDept = "Kids";
            currentAdminStaff = { name: "Kids Manager", email: "", role: "Manager", permissions: ["manage_products", "manage_orders"] };
        } else if (pass === "pos123" || pass === "admin123") {
            currentAdminDept = "Global";
            currentAdminStaff = { name: "Global Admin", email: "", role: "Administrator", permissions: ["manage_products", "manage_orders", "pos_access", "manage_staff"] };
        } else {
            loginError.textContent = "INCORRECT ACCESS CODE.";
            loginError.style.display = "block";
            return;
        }
        closeAdminLoginModal();
        initAdminDashboard();
        return;
    }

    // 2. Otherwise, check staff logins in server
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.isStaff) {
                currentAdminDept = "Global";
                currentAdminStaff = data;
                
                closeAdminLoginModal();
                initAdminDashboard();
            } else {
                loginError.textContent = "ACCESS DENIED: NOT A STAFF MEMBER.";
                loginError.style.display = "block";
            }
        } else {
            loginError.textContent = "INCORRECT EMAIL OR PASSWORD.";
            loginError.style.display = "block";
        }
    } catch (err) {
        console.error("Login request failed:", err);
        loginError.textContent = "SERVER CONNECTION ERROR.";
        loginError.style.display = "block";
    }
}

async function initAdminDashboard() {
    // Sync latest database records
    await loadOrdersFromServer();
    await loadUsersFromServer();
    
    // Apply role-based access control permissions
    applyStaffPermissions();
    if (currentAdminStaff && currentAdminStaff.permissions && currentAdminStaff.permissions.includes("manage_staff")) {
        await loadStaffFromServer();
    }

    // Set titles
    if (currentAdminDept === "Global") {
        adminDeptTitle.textContent = "GLOBAL ADMIN & POS";
    } else {
        adminDeptTitle.textContent = `${currentAdminDept} ADMIN`;
    }

    // Toggle overlay
    adminPanelOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    // Switch to overview tab
    switchAdminTab("overview");
}

function logoutAdmin() {
    adminPanelOverlay.classList.remove("active");
    document.body.style.overflow = "";
    currentAdminDept = "";
}

// Switch tabs inside admin panel
function switchAdminTab(tab) {
    adminActiveTab = tab;

    // Toggle active classes on sidebar navigation buttons
    const navButtons = document.querySelectorAll(".admin-nav-btn");
    navButtons.forEach(btn => {
        const idMap = {
            overview: "btnTabOverview",
            products: "btnTabProducts",
            orders: "btnTabOrders",
            customers: "btnTabCustomers",
            staff: "btnTabStaff",
            taxonomy: "btnTabTaxonomy",
            suppliers: "btnTabSuppliers",
            pos: "adminPosNavBtn"
        };
        if (btn.id === idMap[tab]) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Toggle active tab content containers
    const tabContents = document.querySelectorAll(".admin-tab-content");
    tabContents.forEach(content => {
        const idMap = {
            overview: "adminTabOverview",
            products: "adminTabProducts",
            orders: "adminTabOrders",
            customers: "adminTabCustomers",
            staff: "adminTabStaff",
            taxonomy: "adminTabTaxonomy",
            suppliers: "adminTabSuppliers",
            pos: "adminTabPos"
        };
        if (content.id === idMap[tab]) {
            content.classList.add("active");
        } else {
            content.classList.remove("active");
        }
    });

    // Trigger tab specific renders
    if (tab === "overview") {
        renderAdminOverview();
    } else if (tab === "products") {
        renderAdminProducts();
    } else if (tab === "orders") {
        renderAdminOrders();
    } else if (tab === "customers") {
        renderAdminCustomers();
    } else if (tab === "staff") {
        renderStaffList();
    } else if (tab === "taxonomy") {
        renderAdminTaxonomy();
    } else if (tab === "suppliers") {
        renderAdminSuppliers();
    } else if (tab === "pos") {
        renderAdminPos();
    }
}

// 1. Overview Tab Render
function renderAdminOverview() {
    // Sales computation
    const totalSales = ordersList.reduce((sum, order) => sum + order.total, 0);
    const totalOrdersCount = ordersList.length;
    
    let deptSales = 0;
    if (currentAdminDept === "Global") {
        deptSales = totalSales;
    } else {
        deptSales = ordersList
            .filter(o => o.department === currentAdminDept)
            .reduce((sum, order) => sum + order.total, 0);
    }

    document.getElementById("statTotalSales").textContent = formatPrice(totalSales);
    document.getElementById("statTotalOrders").textContent = totalOrdersCount;
    document.getElementById("statDeptSales").textContent = formatPrice(deptSales);

    // Render category bar sales percentage
    const categoryBars = document.getElementById("categorySalesBars");
    categoryBars.innerHTML = "";

    const categories = ["Hoodies", "Jackets", "Jeans", "Footwear"];
    
    // Compute total sales across categories to get ratios
    let catTotals = {};
    categories.forEach(cat => catTotals[cat] = 0);

    ordersList.forEach(order => {
        order.items.forEach(item => {
            // Find category
            const prod = PRODUCTS.find(p => p.id === item.id);
            if (prod && categories.includes(prod.category)) {
                if (currentAdminDept === "Global" || prod.department === currentAdminDept) {
                    catTotals[prod.category] += (item.price * item.quantity);
                }
            }
        });
    });

    const maxSales = Math.max(...Object.values(catTotals), 1);

    categories.forEach(cat => {
        const sales = catTotals[cat];
        const percent = (sales / maxSales) * 100;

        const row = document.createElement("div");
        row.classList.add("chart-bar-row");
        row.innerHTML = `
            <div class="chart-bar-label">
                <span>${cat.toUpperCase()}</span>
                <span>${formatPrice(sales)}</span>
            </div>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width: ${percent}%;"></div>
            </div>
        `;
        categoryBars.appendChild(row);
    });
}

// 2. Product Manager Tab Render
function renderAdminProducts() {
    const tableBody = document.getElementById("adminProductsTableBody");
    tableBody.innerHTML = "";

    const filtered = currentAdminDept === "Global" 
        ? PRODUCTS 
        : PRODUCTS.filter(p => p.department === currentAdminDept);

    filtered.forEach(p => {
        const tr = document.createElement("tr");
        const inventoryStr = Object.entries(p.inventory || {})
            .map(([key, val]) => `${key}: ${val}`)
            .join(" | ");

        tr.innerHTML = `
            <td><strong>#${p.id}</strong></td>
            <td><img src="${p.image}" alt="${p.name}"></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.department.toUpperCase()} / ${p.category.toUpperCase()}</td>
            <td>${formatPrice(p.price)}</td>
            <td>
                <div style="font-weight: 600;">Sizes: ${p.sizes.join(", ")}</div>
                <div style="font-size: 1.1rem; color: var(--color-text-muted); margin-top: 0.3rem;">Colors: ${p.colors ? p.colors.join(", ") : "Black, Charcoal, Grey"}</div>
                <div style="font-size: 1rem; color: var(--color-accent); margin-top: 0.5rem; word-break: break-all; max-height: 45px; overflow-y: auto;">
                    ${inventoryStr}
                </div>
            </td>
            <td>
                <button class="admin-delete-btn" onclick="deleteProduct(${p.id})" aria-label="Delete product"><i class="fa-regular fa-trash-can"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Add/Delete Products helpers
function openAddProductModal() {
    addProductForm.reset();
    addProductModalBackdrop.classList.add("active");
}

function closeAddProductModal() {
    addProductModalBackdrop.classList.remove("active");
}

async function handleNewProductSubmit(event) {
    event.preventDefault();

    const name = document.getElementById("newProdName").value;
    const category = document.getElementById("newProdCategory").value;
    const price = parseFloat(document.getElementById("newProdPrice").value);
    const costPrice = parseFloat(document.getElementById("newProdCostPrice").value) || 0;
    const sizes = document.getElementById("newProdSizes").value;
    const colors = document.getElementById("newProdColors").value;
    const inventory = document.getElementById("newProdInventory").value;
    const desc = document.getElementById("newProdDesc").value;

    const fileInput = document.getElementById("newProdImgFile");
    let img = "";

    if (fileInput.files && fileInput.files[0]) {
        try {
            img = await getFileBase64(fileInput.files[0]);
        } catch (e) {
            alert("Error reading product image file.");
            return;
        }
    } else {
        alert("PLEASE SELECT A PRODUCT IMAGE FILE.");
        return;
    }

    // Determine department
    let department = currentAdminDept;
    if (currentAdminDept === "Global") {
        department = "Men";
    }

    const newProductData = {
        name: name.toUpperCase(),
        category: category,
        department: department,
        price: price,
        costPrice: costPrice,
        image: img,
        description: desc,
        sizes: sizes,
        colors: colors,
        inventory: inventory,
        badge: "NEW"
    };

    fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProductData)
    })
    .then(async res => {
        if (res.ok) {
            closeAddProductModal();
            await loadProductsFromServer(); // reload & sync
            renderAdminProducts(); // Refresh admin table
            event.target.reset();
            const previewDiv = document.getElementById("newProdImgPreview");
            if (previewDiv) previewDiv.style.display = "none";
        } else {
            const err = await res.json();
            alert("Error creating product: " + err.error);
        }
    })
    .catch(err => console.error("Error creating product:", err));
}

function deleteProduct(productId) {
    if (confirm("ARE YOU SURE YOU WANT TO DELETE THIS PRODUCT FROM CATALOG?")) {
        fetch(`/api/products?id=${productId}`, {
            method: 'DELETE'
        })
        .then(async res => {
            if (res.ok) {
                await loadProductsFromServer(); // reload & sync
                renderAdminProducts(); // Refresh admin table
            } else {
                alert("FAILED TO DELETE PRODUCT.");
            }
        })
        .catch(err => {
            console.error("Failed to delete product:", err);
        });
    }
}

// 3. Orders Tab Render
function renderAdminOrders() {
    const tableBody = document.getElementById("adminOrdersTableBody");
    tableBody.innerHTML = "";

    const filtered = currentAdminDept === "Global"
        ? ordersList
        : ordersList.filter(o => o.department === currentAdminDept);

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 4rem 0;">NO ORDERS RECORDED YET.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach(o => {
        const itemSummary = o.items.map(item => `${item.name} (x${item.quantity}) [${item.size}]`).join("<br>");
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>#${o.id}</strong></td>
            <td>
                <div><strong>${o.customer}</strong></div>
                <div style="font-size: 1.1rem; color: var(--color-text-muted);">${o.phone}</div>
                <div style="font-size: 1.1rem; color: var(--color-text-muted);">${o.address}</div>
            </td>
            <td>${o.date}</td>
            <td style="line-height: 1.5; font-size: 1.2rem;">${itemSummary}</td>
            <td><strong>${formatPrice(o.total)}</strong></td>
            <td>
                <span style="font-weight: 700; color: ${o.status.includes("DELIVERED") ? "var(--color-success)" : "var(--color-accent)"}; font-size: 1.1rem;">
                    ${o.status.toUpperCase()}
                </span>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// 4. POS Terminal Render
function renderAdminPos() {
    // Reset inputs
    posCustomerName.value = "";
    posCustomerPhone.value = "";
    posDiscountInput.value = "0";

    updatePosCategorySelect();

    filterPosCatalog();
    updatePosTotals();
}

function updatePosCategorySelect() {
    const select = document.getElementById("posCategorySelect");
    if (!select) return;
    
    // Save current selected value
    const currentVal = select.value;
    
    // Get unique categories from products list
    const uniqueCats = ["All", ...new Set(PRODUCTS.map(p => p.category))];
    
    select.innerHTML = "";
    uniqueCats.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat === "All" ? "ALL CATEGORIES" : cat.toUpperCase();
        select.appendChild(opt);
    });
    
    // Restore previous selection if it still exists
    if (uniqueCats.includes(currentVal)) {
        select.value = currentVal;
    } else {
        select.value = "All";
    }
}

function filterPosCatalog() {
    const query = document.getElementById("posSearchInput").value.toLowerCase();
    const cat = document.getElementById("posCategorySelect").value;
    
    posProductsGrid.innerHTML = "";

    let filtered = PRODUCTS;
    if (cat !== "All") {
        filtered = filtered.filter(p => p.category === cat);
    }
    if (query !== "") {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.department.toLowerCase().includes(query));
    }

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.classList.add("pos-prod-card");
        card.setAttribute("id", `pos-prod-${p.id}`);
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <h4>${p.name}</h4>
            <span>${formatPrice(p.price)}</span>
        `;
        
        card.onclick = () => showPosSizeSelector(p.id);
        posProductsGrid.appendChild(card);
    });
}

// Show size selector popup overlay inside the product card in POS
function showPosSizeSelector(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    // Check if there is already an active size popup
    const existingPopup = document.querySelector(".pos-size-popup");
    if (existingPopup) existingPopup.remove();

    const card = document.getElementById(`pos-prod-${productId}`);
    const popup = document.createElement("div");
    popup.classList.add("pos-size-popup");
    popup.onclick = (e) => e.stopPropagation(); // Stop trigger cards add-to-pos on click

    let btnHtml = "";
    product.sizes.forEach(size => {
        btnHtml += `<button class="pos-size-btn" onclick="addProdToPos(${product.id}, '${size}')">${size}</button>`;
    });

    popup.innerHTML = `
        <h5>SELECT SIZE</h5>
        <div class="pos-size-buttons">
            ${btnHtml}
        </div>
        <button class="pos-size-btn" style="background-color: var(--color-error); border: none; margin-top: 0.5rem; color: white;" onclick="this.parentElement.remove()">CANCEL</button>
    `;
    card.appendChild(popup);
}

function addProdToPos(productId, size) {
    // Remove the popup
    const popup = document.querySelector(".pos-size-popup");
    if (popup) popup.remove();

    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const color = (product.colors && product.colors[0]) || "Black";

    const existingIndex = posCart.findIndex(item => item.id === productId && item.size === size && (item.color || "Black") === color);
    if (existingIndex > -1) {
        posCart[existingIndex].quantity += 1;
    } else {
        posCart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            size: size,
            color: color,
            quantity: 1
        });
    }

    renderPosTicketItems();
}

function renderPosTicketItems() {
    posTicketItems.innerHTML = "";

    if (posCart.length === 0) {
        posTicketItems.innerHTML = `
            <div style="text-align: center; color: var(--color-text-muted); padding: 4rem 0; font-size: 1.2rem;">
                TICKET IS EMPTY. ADD PRODUCTS.
            </div>
        `;
        updatePosTotals();
        return;
    }

    posCart.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("pos-ticket-item");
        div.innerHTML = `
            <div class="pos-ticket-info">
                <h4>${item.name}</h4>
                <span>SIZE: ${item.size} - ${formatPrice(item.price)}</span>
            </div>
            <div class="pos-ticket-price-del">
                <div class="pos-ticket-qty">
                    <button class="pos-qty-btn" onclick="updatePosQty(${item.id}, '${item.size}', -1)">-</button>
                    <span class="pos-qty-val">${item.quantity}</span>
                    <button class="pos-qty-btn" onclick="updatePosQty(${item.id}, '${item.size}', 1)">+</button>
                </div>
                <span class="pos-ticket-price">${formatPrice(item.price * item.quantity)}</span>
                <button class="pos-ticket-del" onclick="removePosItem(${item.id}, '${item.size}')" aria-label="Delete item"><i class="fa-regular fa-trash-can"></i></button>
            </div>
        `;
        posTicketItems.appendChild(div);
    });

    updatePosTotals();
}

function updatePosQty(productId, size, change) {
    const index = posCart.findIndex(item => item.id === productId && item.size === size);
    if (index === -1) return;

    posCart[index].quantity += change;
    if (posCart[index].quantity <= 0) {
        posCart.splice(index, 1);
    }
    renderPosTicketItems();
}

function removePosItem(productId, size) {
    posCart = posCart.filter(item => !(item.id === productId && item.size === size));
    renderPosTicketItems();
}

function updatePosTotals() {
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(posDiscountInput.value) || 0;
    const discount = (subtotal * discountPercent) / 100;
    const total = subtotal - discount;

    posSubtotal.textContent = formatPrice(subtotal);
    posDiscountAmount.textContent = `-${formatPrice(discount)}`;
    posTotal.textContent = formatPrice(total);
}

function processPosSale() {
    if (posCart.length === 0) {
        alert("PLEASE ADD PRODUCTS TO CHECKOUT FIRST.");
        return;
    }

    const customer = posCustomerName.value.trim() || "WALK-IN CUSTOMER";
    const phone = posCustomerPhone.value.trim() || "N/A";
    const discountPercent = parseFloat(posDiscountInput.value) || 0;
    
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = (subtotal * discountPercent) / 100;
    const total = subtotal - discount;
    const randomId = Math.floor(10000 + Math.random() * 90000);

    // Register sale inside SQLite Database
    const posOrderData = {
        id: `POS-${randomId}`,
        customerName: customer,
        customerEmail: "pos@styluxe.com",
        customerPhone: phone,
        customerAddress: "IN-STORE SALE",
        date: new Date().toISOString().split('T')[0],
        items: [...posCart],
        total: total,
        status: "PAID (POS)",
        department: "Global"
    };

    fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posOrderData)
    })
    .then(async res => {
        if (res.ok) {
            await loadOrdersFromServer();
        }
    })
    .catch(err => {
        console.error("POS order logging failed:", err);
    });

    // Populate Receipt Modal HTML
    document.getElementById("receiptDate").textContent = new Date().toISOString().split('T')[0] + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById("receiptCustomer").textContent = customer;
    
    const receiptItemsContainer = document.getElementById("receiptItems");
    receiptItemsContainer.innerHTML = "";

    posCart.forEach(item => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.innerHTML = `
            <span>${item.name} (x${item.quantity}) [${item.size}]</span>
            <span>${formatPrice(item.price * item.quantity)}</span>
        `;
        receiptItemsContainer.appendChild(div);
    });

    document.getElementById("receiptSubtotal").textContent = formatPrice(subtotal);
    document.getElementById("receiptDiscount").textContent = `-${formatPrice(discount)}`;
    document.getElementById("receiptTotal").textContent = formatPrice(total);

    // Clear POS cart
    posCart = [];
    renderPosTicketItems();

    // Show thermal receipt modal
    posReceiptModalBackdrop.classList.add("active");
}

function closePosReceipt() {
    posReceiptModalBackdrop.classList.remove("active");
}

// ==========================================================================
// CUSTOMER AUTHENTICATION & ORDER ARCHIVE LOGIC
// ==========================================================================

const authPageOverlay = document.getElementById("authPageOverlay");
const authLoginView = document.getElementById("authLoginView");
const authRegisterView = document.getElementById("authRegisterView");
const userMenuDropdown = document.getElementById("userMenuDropdown");
const userMenuLoggedOut = document.getElementById("userMenuLoggedOut");
const userMenuLoggedIn = document.getElementById("userMenuLoggedIn");
const navUserGreeting = document.getElementById("navUserGreeting");

const myOrdersModalBackdrop = document.getElementById("myOrdersModalBackdrop");
const myOrdersTableBody = document.getElementById("myOrdersTableBody");

// Toggle user menu dropdown in navbar
function toggleUserMenu(event) {
    event.stopPropagation();
    userMenuDropdown.classList.toggle("active");
    
    // Close currency dropdown
    currencyDropdown.classList.remove("active");
}

// Click outside to close dropdowns
document.addEventListener("click", () => {
    userMenuDropdown.classList.remove("active");
});

function openAuthModal(view) {
    userMenuDropdown.classList.remove("active");
    switchAuthView(view);
    authPageOverlay.style.display = "block";
    setTimeout(() => {
        authPageOverlay.classList.add("active");
    }, 10);
    document.body.style.overflow = "hidden";
    
    // Auto-fetch saved email & password from browser credentials manager/keychain
    if (view === 'login' && navigator.credentials) {
        navigator.credentials.get({ password: true, mediation: 'optional' })
        .then(cred => {
            if (cred && cred.id) {
                const emailInput = document.getElementById("custLoginEmail");
                const passInput = document.getElementById("custLoginPassword");
                if (emailInput) emailInput.value = cred.id;
                if (passInput && cred.password) passInput.value = cred.password;
            }
        })
        .catch(err => console.warn("Failed to fetch saved credentials:", err));
    }
}

function closeAuthModal() {
    authPageOverlay.classList.remove("active");
    setTimeout(() => {
        authPageOverlay.style.display = "none";
    }, 300);
    document.body.style.overflow = "";
}

function switchAuthView(view) {
    document.getElementById("authLoginError").style.display = "none";
    document.getElementById("authRegisterError").style.display = "none";
    
    if (view === "login") {
        authLoginView.style.display = "block";
        authRegisterView.style.display = "none";
    } else {
        authLoginView.style.display = "none";
        authRegisterView.style.display = "block";
    }
}

// Handle Customer Login
function handleCustomerLogin(event) {
    event.preventDefault();
    const email = document.getElementById("custLoginEmail").value.trim().toLowerCase();
    const pass = document.getElementById("custLoginPassword").value;
    const errorMsg = document.getElementById("authLoginError");

    errorMsg.style.display = "none";

    fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pass })
    })
    .then(async res => {
        const result = await res.json();
        if (res.ok) {
            currentUser = result;
            localStorage.setItem("styluxe_user", JSON.stringify(currentUser));
            updateUserSessionUI();
            closeAuthModal();
            event.target.reset();

            // Store credentials in browser keychain if supported
            if (window.PasswordCredential && navigator.credentials) {
                try {
                    const cred = new PasswordCredential({
                        id: email,
                        password: pass,
                        name: currentUser.name
                    });
                    navigator.credentials.store(cred);
                } catch (e) {
                    console.warn("Failed to store credentials:", e);
                }
            }
            
            if (cart.length > 0) {
                openCheckoutModal();
            }
        } else {
            errorMsg.textContent = result.error || "INVALID EMAIL OR PASSWORD.";
            errorMsg.style.display = "block";
        }
    })
    .catch(err => {
        errorMsg.textContent = "SERVER CONNECTION ERROR.";
        errorMsg.style.display = "block";
    });
}

// Handle Customer Register
function handleCustomerRegister(event) {
    event.preventDefault();
    const name = document.getElementById("custRegName").value.trim();
    const email = document.getElementById("custRegEmail").value.trim().toLowerCase();
    const phone = document.getElementById("custRegPhone").value.trim();
    const pass = document.getElementById("custRegPassword").value;
    const address = document.getElementById("custRegAddress").value.trim();
    const errorMsg = document.getElementById("authRegisterError");

    errorMsg.style.display = "none";

    const newUser = {
        name: name,
        email: email,
        password: pass,
        phone: phone,
        address: address,
        dateJoined: new Date().toISOString().split('T')[0]
    };

    fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
    })
    .then(async res => {
        const result = await res.json();
        if (res.ok) {
            currentUser = result;
            localStorage.setItem("styluxe_user", JSON.stringify(currentUser));
            updateUserSessionUI();
            closeAuthModal();
            event.target.reset();

            // Store credentials in browser keychain if supported
            if (window.PasswordCredential && navigator.credentials) {
                try {
                    const cred = new PasswordCredential({
                        id: email,
                        password: pass,
                        name: currentUser.name
                    });
                    navigator.credentials.store(cred);
                } catch (e) {
                    console.warn("Failed to store credentials:", e);
                }
            }
            
            if (cart.length > 0) {
                openCheckoutModal();
            }
        } else {
            errorMsg.textContent = result.error || "REGISTRATION FAILED.";
            errorMsg.style.display = "block";
        }
    })
    .catch(err => {
        errorMsg.textContent = "SERVER CONNECTION ERROR.";
        errorMsg.style.display = "block";
    });
}

// Mock Social Login Handler
function handleMockSocialLogin(provider) {
    if (provider === 'Google') {
        // Show Google Chooser overlay
        document.getElementById("googleSelectAccountView").style.display = "block";
        document.getElementById("googleLoadingView").style.display = "none";
        document.getElementById("googleAuthOverlay").style.display = "flex";
    } else if (provider === 'Apple') {
        // Show Apple Confirm overlay
        document.getElementById("appleSetupView").style.display = "block";
        document.getElementById("appleBiometricPrompt").style.display = "none";
        document.getElementById("appleSuccessSection").style.display = "none";
        document.getElementById("appleFooterButtons").style.display = "flex";
        
        // Reset Biometrics text
        document.getElementById("appleBiometricText").textContent = "Confirm with Touch ID";
        document.getElementById("appleBiometricSubText").textContent = "Place finger on sensor to authorize";
        
        document.getElementById("appleAuthOverlay").style.display = "flex";
    }
}

function closeMockSocialAuth() {
    document.getElementById("googleAuthOverlay").style.display = "none";
    document.getElementById("appleAuthOverlay").style.display = "none";
}

// Google Account Selection Logic
function selectMockGoogleAccount(name, email) {
    // Show spinner view
    document.getElementById("googleSelectAccountView").style.display = "none";
    document.getElementById("googleLoadingView").style.display = "block";
    
    // Simulate API delay
    setTimeout(() => {
        // Check if user exists in our usersList, else create one
        let user = usersList.find(u => u.email === email);
        if (!user) {
            user = {
                name: name,
                email: email,
                password: "google_oauth_bypass",
                phone: "+961 70 999 999",
                address: "Beirut, Lebanon",
                dateJoined: new Date().toISOString().split('T')[0]
            };
            usersList.push(user);
        }
        
        currentUser = user;
        updateUserSessionUI();
        closeMockSocialAuth();
        closeAuthModal();
        
        if (cart.length > 0) {
            openCheckoutModal();
        }
    }, 1200);
}

// Apple Biometric Auth Simulation
function triggerAppleBiometrics() {
    // Transition views
    document.getElementById("appleSetupView").style.display = "none";
    document.getElementById("appleFooterButtons").style.display = "none";
    document.getElementById("appleBiometricPrompt").style.display = "flex";
    
    // Start confirmation delay
    setTimeout(() => {
        // Fingerprint scanning changes text to authorized
        document.getElementById("appleBiometricText").textContent = "Verifying...";
        document.getElementById("appleBiometricSubText").textContent = "Authenticating fingerprint details...";
        
        setTimeout(() => {
            document.getElementById("appleBiometricPrompt").style.display = "none";
            document.getElementById("appleSuccessSection").style.display = "block";
            
            setTimeout(() => {
                // Find or create Apple user in database
                let email = "styluxe.user@icloud.com";
                let user = usersList.find(u => u.email === email);
                if (!user) {
                    user = {
                        name: "Apple User",
                        email: email,
                        password: "apple_oauth_bypass",
                        phone: "+961 71 888 888",
                        address: "Beirut, Lebanon",
                        dateJoined: new Date().toISOString().split('T')[0]
                    };
                    usersList.push(user);
                }
                
                currentUser = user;
                updateUserSessionUI();
                closeMockSocialAuth();
                closeAuthModal();
                
                if (cart.length > 0) {
                    openCheckoutModal();
                }
            }, 1000);
        }, 1200);
    }, 1000);
}

// Guest Entry Handler (Allows viewing storefront without authentication)
function handleGuestEntry() {
    closeAuthModal();
    currentUser = null;
    updateUserSessionUI();
}

function handleUserLogout() {
    currentUser = null;
    updateUserSessionUI();
    userMenuDropdown.classList.remove("active");
    openAuthModal('login');
}

function updateUserSessionUI() {
    if (currentUser) {
        // Logged In
        userMenuLoggedOut.style.display = "none";
        userMenuLoggedIn.style.display = "block";
        navUserGreeting.textContent = `HI, ${currentUser.name.split(" ")[0].toUpperCase()}`;
        navUserGreeting.style.display = "inline";
    } else {
        // Logged Out
        userMenuLoggedOut.style.display = "block";
        userMenuLoggedIn.style.display = "none";
        navUserGreeting.style.display = "none";
    }
}

// Open Customer Orders History
async function openMyOrdersModal() {
    userMenuDropdown.classList.remove("active");
    await loadOrdersFromServer();
    renderMyOrdersTable();
    myOrdersModalBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeMyOrdersModal() {
    myOrdersModalBackdrop.classList.remove("active");
    document.body.style.overflow = "";
}

function renderMyOrdersTable() {
    myOrdersTableBody.innerHTML = "";

    if (!currentUser) return;

    const userOrders = ordersList.filter(o => o.customerEmail === currentUser.email);

    if (userOrders.length === 0) {
        myOrdersTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 4rem 0;">YOU HAVE NOT PLACED ANY ORDERS YET.</td>
            </tr>
        `;
        return;
    }

    userOrders.forEach(o => {
        const itemsSummary = o.items.map(item => `${item.name} (x${item.quantity}) [${item.size}]`).join("<br>");
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>#${o.id}</strong></td>
            <td>${o.date}</td>
            <td style="line-height: 1.5; font-size: 1.2rem;">${itemsSummary}</td>
            <td><strong>${formatPrice(o.total)}</strong></td>
            <td>
                <span style="font-weight: 700; color: ${o.status.includes("DELIVERED") ? "var(--color-success)" : "var(--color-accent)"}; font-size: 1.1rem;">
                    ${o.status.toUpperCase()}
                </span>
            </td>
        `;
        myOrdersTableBody.appendChild(tr);
    });
}

// ==========================================================================
// UPGRADED ADMIN SIDEBAR SWITCHES & STATUS MANAGEMENT
// ==========================================================================

// Extend switchAdminTab to handle "customers"
const originalSwitchAdminTab = switchAdminTab;
switchAdminTab = function(tab) {
    if (tab === "customers") {
        adminActiveTab = tab;

        // Toggle buttons active classes
        const navButtons = document.querySelectorAll(".admin-nav-btn");
        navButtons.forEach(btn => {
            if (btn.id === "btnTabCustomers") {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Toggle active content divs
        const tabContents = document.querySelectorAll(".admin-tab-content");
        tabContents.forEach(content => {
            if (content.id === "adminTabCustomers") {
                content.classList.add("active");
            } else {
                content.classList.remove("active");
            }
        });

        renderAdminCustomers();
    } else {
        // Handle standard tabs
        originalSwitchAdminTab(tab);
        
        // Ensure customer nav button class is updated
        const custBtn = document.getElementById("btnTabCustomers");
        if (custBtn) custBtn.classList.remove("active");
    }
};

// 1. Upgraded Overview tab render (with AOV and total customer metrics)
function renderAdminOverview() {
    const totalSales = ordersList.reduce((sum, order) => sum + order.total, 0);
    const totalOrdersCount = ordersList.length;
    
    // Average Order Value (AOV)
    const avgOrderValue = totalOrdersCount > 0 ? (totalSales / totalOrdersCount) : 0;
    
    // Active Customers count
    const totalCustCount = usersList.length;

    // Calculate total net profit
    let totalCost = 0;
    ordersList.forEach(order => {
        (order.items || []).forEach(item => {
            const prod = PRODUCTS.find(p => p.id === item.id);
            const cost = prod && prod.costPrice !== undefined ? prod.costPrice : (item.price * 0.6);
            totalCost += cost * item.quantity;
        });
    });
    const totalProfit = totalSales - totalCost;

    document.getElementById("statTotalSales").textContent = formatPrice(totalSales);
    document.getElementById("statTotalProfit").textContent = formatPrice(totalProfit);
    document.getElementById("statTotalOrders").textContent = totalOrdersCount;
    document.getElementById("statAvgOrderValue").textContent = formatPrice(avgOrderValue);
    document.getElementById("statTotalCustomers").textContent = totalCustCount;

    // Render Category Graph Sales bars
    const categoryBars = document.getElementById("categorySalesBars");
    categoryBars.innerHTML = "";

    const categories = ["Hoodies", "Jackets", "Jeans", "Footwear"];
    let catTotals = {};
    categories.forEach(cat => catTotals[cat] = 0);

    ordersList.forEach(order => {
        order.items.forEach(item => {
            const prod = PRODUCTS.find(p => p.id === item.id);
            if (prod && categories.includes(prod.category)) {
                if (currentAdminDept === "Global" || prod.department === currentAdminDept) {
                    catTotals[prod.category] += (item.price * item.quantity);
                }
            }
        });
    });

    const maxSales = Math.max(...Object.values(catTotals), 1);

    categories.forEach(cat => {
        const sales = catTotals[cat];
        const percent = (sales / maxSales) * 100;

        const row = document.createElement("div");
        row.classList.add("chart-bar-row");
        row.innerHTML = `
            <div class="chart-bar-label">
                <span>${cat.toUpperCase()}</span>
                <span>${formatPrice(sales)}</span>
            </div>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width: ${percent}%;"></div>
            </div>
        `;
        categoryBars.appendChild(row);
    });
}

// 2. Render Upgraded Customers List Tab
function renderAdminCustomers() {
    const tableBody = document.getElementById("adminCustomersTableBody");
    tableBody.innerHTML = "";

    if (usersList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 4rem 0;">NO REGISTERED CUSTOMERS FOUND.</td>
            </tr>
        `;
        return;
    }

    usersList.forEach(u => {
        // Compute lifetime spent by this customer
        const userOrders = ordersList.filter(o => o.customerEmail === u.email);
        const totalSpent = userOrders.reduce((sum, order) => sum + order.total, 0);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
            <td>${u.address}</td>
            <td>${u.dateJoined}</td>
            <td><strong>${formatPrice(totalSpent)}</strong></td>
        `;
        tableBody.appendChild(tr);
    });
}

// Dynamic Category & Brand Manager Render
function renderAdminTaxonomy() {
    const catBody = document.getElementById("adminCategoriesTableBody");
    const brandBody = document.getElementById("adminBrandsTableBody");
    if (!catBody || !brandBody) return;

    // Render Categories Table
    catBody.innerHTML = "";
    if (CATEGORIES.length === 0) {
        catBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 2rem 0;">NO CATEGORIES FOUND.</td></tr>`;
    } else {
        CATEGORIES.forEach(cat => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>#${cat.id}</strong></td>
                <td style="width: 50px;">
                    <img src="${cat.img || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=200'}" alt="${cat.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border);">
                </td>
                <td><strong>${cat.name.toUpperCase()}</strong></td>
                <td style="text-align: center;">
                    <button class="delete-btn" onclick="deleteCategory(${cat.id})" aria-label="Delete category">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            catBody.appendChild(tr);
        });
    }

    // Render Brands Table
    brandBody.innerHTML = "";
    if (BRANDS.length === 0) {
        brandBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 2rem 0;">NO BRANDS FOUND.</td></tr>`;
    } else {
        BRANDS.forEach(b => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="width: 50px;">
                    <img src="${b.img}" alt="${b.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%; border: 1px solid var(--color-border);">
                </td>
                <td><strong>${b.name.toUpperCase()}</strong></td>
                <td style="text-align: center;">
                    <button class="delete-btn" onclick="deleteBrand('${b.name}')" aria-label="Delete brand">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            brandBody.appendChild(tr);
        });
    }
}

// Add/Delete Actions
async function handleAddCategory(event) {
    event.preventDefault();
    const input = document.getElementById("newCategoryInput");
    const fileInput = document.getElementById("newCategoryImgFileInput");
    const name = input.value.trim();
    if (!name) return;

    let img = "";
    if (fileInput.files && fileInput.files[0]) {
        try {
            img = await getFileBase64(fileInput.files[0]);
        } catch (e) {
            alert("Error reading category image file.");
            return;
        }
    } else {
        alert("PLEASE SELECT A CATEGORY IMAGE FILE.");
        return;
    }

    fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, img: img })
    })
    .then(async res => {
        if (res.ok) {
            CATEGORIES = await res.json();
            input.value = "";
            fileInput.value = "";
            const previewDiv = document.getElementById("newCategoryImgPreview");
            if (previewDiv) previewDiv.style.display = "none";
            updateCategoriesDatalist();
            renderCategoryTags();
            renderAdminTaxonomy();
        } else {
            alert("FAILED TO ADD CATEGORY.");
        }
    })
    .catch(err => console.error("Error adding category:", err));
}

function deleteCategory(id) {
    const cat = CATEGORIES.find(c => c.id === id);
    if (!cat) return;
    if (!confirm(`ARE YOU SURE YOU WANT TO DELETE THE CATEGORY "${cat.name.toUpperCase()}"?`)) return;

    fetch(`/api/categories?id=${id}`, {
        method: 'DELETE'
    })
    .then(async res => {
        if (res.ok) {
            CATEGORIES = await res.json();
            updateCategoriesDatalist();
            renderCategoryTags();
            renderAdminTaxonomy();
        } else {
            alert("FAILED TO DELETE CATEGORY.");
        }
    })
    .catch(err => console.error("Error deleting category:", err));
}

function getFileBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function handleAddBrand(event) {
    event.preventDefault();
    const nameInput = document.getElementById("newBrandNameInput");
    const fileInput = document.getElementById("newBrandImgFileInput");
    const name = nameInput.value.trim();
    if (!name) return;

    let img = "";
    if (fileInput.files && fileInput.files[0]) {
        try {
            img = await getFileBase64(fileInput.files[0]);
        } catch (e) {
            alert("Error reading image file.");
            return;
        }
    } else {
        alert("PLEASE SELECT A BRAND LOGO FILE.");
        return;
    }

    fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, img: img })
    })
    .then(async res => {
        if (res.ok) {
            BRANDS = await res.json();
            nameInput.value = "";
            fileInput.value = "";
            const previewDiv = document.getElementById("newBrandImgPreview");
            if (previewDiv) previewDiv.style.display = "none";
            renderBrandSlider();
            renderAdminTaxonomy();
        } else {
            alert("FAILED TO ADD BRAND.");
        }
    })
    .catch(err => console.error("Error adding brand:", err));
}

function deleteBrand(name) {
    if (!confirm(`ARE YOU SURE YOU WANT TO DELETE THE BRAND "${name.toUpperCase()}"?`)) return;

    fetch(`/api/brands?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
    })
    .then(async res => {
        if (res.ok) {
            BRANDS = await res.json();
            renderBrandSlider();
            renderAdminTaxonomy();
        } else {
            alert("FAILED TO DELETE BRAND.");
        }
    })
    .catch(err => console.error("Error deleting brand:", err));
}

// Render Suppliers & Invoices Dashboard
function renderAdminSuppliers() {
    const suppBody = document.getElementById("adminSuppliersTableBody");
    const invBody = document.getElementById("adminInvoicesTableBody");
    const selectSupplier = document.getElementById("newInvoiceSupplier");
    
    if (!suppBody || !invBody) return;

    // Populate dynamic select dropdown for invoices
    if (selectSupplier) {
        selectSupplier.innerHTML = `<option value="" disabled selected>Select Supplier / Merchant *</option>`;
        SUPPLIERS.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.name;
            opt.textContent = s.name;
            selectSupplier.appendChild(opt);
        });
    }

    // Render Suppliers Table
    suppBody.innerHTML = "";
    if (SUPPLIERS.length === 0) {
        suppBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 2rem 0;">NO SUPPLIERS RECORDED.</td></tr>`;
    } else {
        SUPPLIERS.forEach(s => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${s.name.toUpperCase()}</strong></td>
                <td>
                    <div>${s.phone || 'N/A'}</div>
                    <div style="font-size: 1.1rem; color: var(--color-text-muted);">${s.company || 'N/A'}</div>
                </td>
                <td style="text-align: center;">
                    <button class="delete-btn" onclick="deleteSupplier(${s.id})" aria-label="Delete supplier">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            suppBody.appendChild(tr);
        });
    }

    // Render Invoices Table
    invBody.innerHTML = "";
    if (INVOICES.length === 0) {
        invBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 2rem 0;">NO INVOICES RECORDED.</td></tr>`;
    } else {
        INVOICES.forEach(inv => {
            const statusColor = inv.status === "Paid" ? "#25d366" : "#ff3b30";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <div><strong>${inv.invoiceNumber}</strong></div>
                    <div style="font-size: 1rem; color: var(--color-text-muted);">${inv.date}</div>
                </td>
                <td><strong>${inv.supplier.toUpperCase()}</strong></td>
                <td><strong>${formatPrice(inv.total)}</strong></td>
                <td><span class="product-badge" style="background-color: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}30; font-size: 1rem; padding: 0.2rem 0.6rem;">${inv.status.toUpperCase()}</span></td>
                <td style="text-align: center;">
                    <button class="delete-btn" onclick="deleteInvoice(${inv.id})" aria-label="Delete invoice">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }
}

// Supplier CRUD actions
function handleAddSupplier(event) {
    event.preventDefault();
    const name = document.getElementById("newSupplierName").value.trim();
    const company = document.getElementById("newSupplierCompany").value.trim();
    const phone = document.getElementById("newSupplierPhone").value.trim();
    const address = document.getElementById("newSupplierAddress").value.trim();

    if (!name) return;

    fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, phone, address })
    })
    .then(async res => {
        if (res.ok) {
            SUPPLIERS = await res.json();
            event.target.reset();
            renderAdminSuppliers();
        } else {
            alert("FAILED TO ADD SUPPLIER.");
        }
    })
    .catch(err => console.error("Error adding supplier:", err));
}

function deleteSupplier(id) {
    if (!confirm("ARE YOU SURE YOU WANT TO DELETE THIS SUPPLIER?")) return;

    fetch(`/api/suppliers?id=${id}`, {
        method: 'DELETE'
    })
    .then(async res => {
        if (res.ok) {
            SUPPLIERS = await res.json();
            renderAdminSuppliers();
        } else {
            alert("FAILED TO DELETE SUPPLIER.");
        }
    })
    .catch(err => console.error("Error deleting supplier:", err));
}

// Invoice CRUD actions
function handleAddInvoice(event) {
    event.preventDefault();
    const invoiceNumber = document.getElementById("newInvoiceNum").value.trim();
    const supplier = document.getElementById("newInvoiceSupplier").value;
    const total = parseFloat(document.getElementById("newInvoiceTotal").value);
    const status = document.getElementById("newInvoiceStatus").value;
    const notes = document.getElementById("newInvoiceNotes").value.trim();

    if (!invoiceNumber || !supplier || isNaN(total) || !status) {
        alert("PLEASE FILL IN ALL REQUIRED INVOICE FIELDS.");
        return;
    }

    fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber, supplier, total, status, notes })
    })
    .then(async res => {
        if (res.ok) {
            INVOICES = await res.json();
            event.target.reset();
            renderAdminSuppliers();
        } else {
            alert("FAILED TO RECORD INVOICE.");
        }
    })
    .catch(err => console.error("Error recording invoice:", err));
}

function deleteInvoice(id) {
    if (!confirm("ARE YOU SURE YOU WANT TO DELETE THIS INVOICE?")) return;

    fetch(`/api/invoices?id=${id}`, {
        method: 'DELETE'
    })
    .then(async res => {
        if (res.ok) {
            INVOICES = await res.json();
            renderAdminSuppliers();
        } else {
            alert("FAILED TO DELETE INVOICE.");
        }
    })
    .catch(err => console.error("Error deleting invoice:", err));
}

// 3. Render Upgraded Orders Tab with status edit controls
function renderAdminOrders() {
    const tableBody = document.getElementById("adminOrdersTableBody");
    tableBody.innerHTML = "";

    const filtered = currentAdminDept === "Global"
        ? ordersList
        : ordersList.filter(o => o.department === currentAdminDept);

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--color-text-muted); padding: 4rem 0;">NO ORDERS RECORDED YET.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach(o => {
        const itemSummary = o.items.map(item => `${item.name} (x${item.quantity}) [${item.size}]`).join("<br>");
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>#${o.id}</strong></td>
            <td>
                <div><strong>${o.customer}</strong></div>
                <div style="font-size: 1.1rem; color: var(--color-text-muted);">${o.phone}</div>
                <div style="font-size: 1.1rem; color: var(--color-text-muted);">${o.address}</div>
            </td>
            <td>${o.date}</td>
            <td style="line-height: 1.5; font-size: 1.2rem;">${itemSummary}</td>
            <td><strong>${formatPrice(o.total)}</strong></td>
            <td>
                <span style="font-weight: 700; color: ${o.status.includes("DELIVERED") ? "var(--color-success)" : o.status.includes("SHIPPED") ? "#5ac8fa" : "var(--color-accent)"}; font-size: 1.1rem;">
                    ${o.status.toUpperCase()}
                </span>
            </td>
            <td>
                <button class="status-change-btn" onclick="updateOrderStatus('${o.id}', 'shipped')">SHIP</button>
                <button class="status-change-btn delivered" onclick="updateOrderStatus('${o.id}', 'delivered')">DELIVER</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Action button inside admin orders table to progress shipment states
function updateOrderStatus(orderId, newStatus) {
    const order = ordersList.find(o => o.id === orderId);
    if (!order) return;

    const updatedStatus = newStatus === "shipped" ? "SHIPPED" : "DELIVERED";

    fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: updatedStatus })
    })
    .then(res => res.json())
    .then(async result => {
        if (result.success) {
            order.status = updatedStatus;
            // Fetch fresh list to sync other stats if needed
            await loadOrdersFromServer();
            renderAdminOrders();
            renderAdminOverview();
        }
    })
    .catch(err => {
        console.error("Order status update failed:", err);
    });
}

// ==========================================================================
// 11. STYLUXE PREMIUM INTERACTIVE FEATURES
// ==========================================================================

/* 11.1 Enhanced Gallery & Zoom-on-Hover */
const GALLERY_MOCKS = {
    1: [ // Oversized Cotton Hoodie
        "assets/hoodie_black.png",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600", // Cotton detail close-up
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600"  // Hanger product shot
    ],
    2: [ // Leather Jacket
        "assets/jacket_leather.png",
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600", // Heavy zippers & cuff close-up
        "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=600"  // Leather hanger detail
    ],
    3: [ // Cargo Denim Jeans
        "assets/jeans_cargo.png",
        "https://images.unsplash.com/photo-1582552938357-32b906df43c3?auto=format&fit=crop&q=80&w=600", // Heavy denim pocket
        "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=600"  // Indigo denim texture
    ],
    4: [ // Core High-Top Sneakers
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=600"
    ]
};

// Returns an array of gallery images for the specified product
function getProductGalleryImages(product) {
    if (GALLERY_MOCKS[product.id]) {
        return GALLERY_MOCKS[product.id];
    }
    // Dynamic fallbacks based on category to maintain premium feel
    return [
        product.image,
        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600", // Minimalist clothing hanger
        "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=600"  // Cotton styling display
    ];
}

// Populates gallery thumbnails list in modal
function loadProductGallery(product) {
    const thumbnailGrid = document.getElementById("thumbnailGrid");
    const mainImg = document.getElementById("modalProductImg");
    if (!thumbnailGrid || !mainImg) return;

    thumbnailGrid.innerHTML = "";
    const images = getProductGalleryImages(product);

    images.forEach((imgUrl, index) => {
        const thumb = document.createElement("img");
        thumb.src = imgUrl;
        thumb.alt = `${product.name} View ${index + 1}`;
        if (index === 0) thumb.classList.add("active");

        thumb.onclick = () => {
            mainImg.src = imgUrl;
            // Clear active thumbnail class
            thumbnailGrid.querySelectorAll("img").forEach(t => t.classList.remove("active"));
            thumb.classList.add("active");
            // Reset zoom transform
            mainImg.style.transform = "scale(1)";
            mainImg.style.transformOrigin = "center";
        };

        thumbnailGrid.appendChild(thumb);
    });
}

// Implements hover lens zoom on the main product image
function setupHoverZoom() {
    const container = document.getElementById('mainImageContainer');
    const img = document.getElementById('modalProductImg');
    if (!container || !img) return;

    container.onmousemove = (e) => {
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = `${x}% ${y}%`;
        img.style.transform = 'scale(2)';
    };

    container.onmouseleave = () => {
        img.style.transform = 'scale(1)';
        img.style.transformOrigin = 'center';
    };
}

/* 11.2 Size Guide Modal & Sizing Calculator */
let calculatedSizeResult = "";

function openSizeGuide() {
    const backdrop = document.getElementById("sizeGuideModalBackdrop");
    if (backdrop) {
        backdrop.classList.add("active");
        
        // Reset form and output
        document.getElementById("sgHeight").value = "";
        document.getElementById("sgWeight").value = "";
        document.getElementById("calculatorResult").style.display = "none";
        
        // Render size chart table specific to the active category
        renderSizeChartTable();
        switchSgTab('calculator');
    }
}

function closeSizeGuide() {
    const backdrop = document.getElementById("sizeGuideModalBackdrop");
    if (backdrop) {
        backdrop.classList.remove("active");
    }
}

function switchSgTab(tab) {
    const calcTabBtn = document.getElementById("sgTabCalculator");
    const chartTabBtn = document.getElementById("sgTabChart");
    const calcContent = document.getElementById("sgContentCalculator");
    const chartContent = document.getElementById("sgContentChart");

    if (tab === 'calculator') {
        calcTabBtn.classList.add("active");
        chartTabBtn.classList.remove("active");
        calcContent.style.display = "block";
        chartContent.style.display = "none";
    } else {
        calcTabBtn.classList.remove("active");
        chartTabBtn.classList.add("active");
        calcContent.style.display = "none";
        chartContent.style.display = "block";
    }
}

// Multi-factor calculator mapping weight range to sizing letters
function calculateRecommendedSize() {
    if (!activeModalProduct) return;

    const heightInput = document.getElementById("sgHeight");
    const weightInput = document.getElementById("sgWeight");
    const height = parseFloat(heightInput.value);
    const weight = parseFloat(weightInput.value);

    if (!height || !weight || height <= 0 || weight <= 0) {
        alert("PLEASE ENTER VALID HEIGHT AND WEIGHT VALUES.");
        return;
    }

    let recommendedSize = "M"; // Default fallback
    const category = activeModalProduct.category;
    const catUpper = category.toUpperCase();

    if (category === "Hoodies" || category === "Jackets" || catUpper.includes("SHIRT") || catUpper.includes("TOP") || catUpper.includes("SWEATER") || catUpper.includes("JACKET") || catUpper.includes("HOOD")) {
        if (weight < 62) recommendedSize = "S";
        else if (weight < 72) recommendedSize = "M";
        else if (weight < 82) recommendedSize = "L";
        else if (weight < 92) recommendedSize = "XL";
        else recommendedSize = "XXL";
    } else if (category === "Jeans" || catUpper.includes("PANT") || catUpper.includes("SHORT") || catUpper.includes("JEAN") || catUpper.includes("TROUSER")) {
        if (weight < 60) recommendedSize = "30";
        else if (weight < 72) recommendedSize = "32";
        else if (weight < 85) recommendedSize = "34";
        else recommendedSize = "36";
    } else { // Footwear/shoes
        if (activeModalProduct.department === "Women") {
            if (height < 160) recommendedSize = "37";
            else if (height < 170) recommendedSize = "38";
            else recommendedSize = "39";
        } else if (activeModalProduct.department === "Kids") {
            recommendedSize = "30";
        } else { // Men
            if (height < 170) recommendedSize = "41";
            else if (height < 180) recommendedSize = "42";
            else recommendedSize = "43";
        }
    }

    // Verify if size recommended is in stock/available for this item
    if (activeModalProduct.sizes && activeModalProduct.sizes.length > 0) {
        if (!activeModalProduct.sizes.includes(recommendedSize)) {
            // Find closest available size
            recommendedSize = activeModalProduct.sizes[0];
        }
    }

    calculatedSizeResult = recommendedSize;

    document.getElementById("recommendedSizeValue").textContent = recommendedSize;
    
    let descriptionText = `Based on your height of ${height} cm and weight of ${weight} kg, we suggest size **${recommendedSize}** for a premium silhouette.`;
    if (category === "Hoodies") {
        descriptionText += " Our hoodies are designed with an oversized fit, so going with this size will give you a cozy, drop-shoulder look.";
    } else if (category === "Jackets") {
        descriptionText += " Our jackets feature structured fits. If you prefer to layer heavily underneath, consider sizing up.";
    } else if (category === "Jeans") {
        descriptionText += " This corresponds to your waist sizing. The jeans feature an adjustable straight leg cut.";
    }

    document.getElementById("recommendedSizeText").innerHTML = descriptionText;
    document.getElementById("calculatorResult").style.display = "block";
}

function applyRecommendedSize() {
    if (!calculatedSizeResult) return;

    // Find size button in detail modal sizing list
    const sizeBtns = sizeSelectorGrid.querySelectorAll(".size-btn");
    let found = false;
    sizeBtns.forEach(btn => {
        if (btn.textContent.trim() === calculatedSizeResult) {
            selectSize(calculatedSizeResult, btn);
            found = true;
        }
    });

    if (found) {
        closeSizeGuide();
    } else {
        alert(`SIZE ${calculatedSizeResult} IS CURRENTLY OUT OF STOCK FOR THIS PRODUCT.`);
    }
}

function renderSizeChartTable() {
    const container = document.getElementById("sizeChartTableContainer");
    if (!container || !activeModalProduct) return;

    const category = activeModalProduct.category;
    const catUpper = category.toUpperCase();
    let html = "";

    if (category === "Hoodies" || category === "Jackets" || catUpper.includes("SHIRT") || catUpper.includes("TOP") || catUpper.includes("SWEATER") || catUpper.includes("JACKET") || catUpper.includes("HOOD")) {
        html = `
            <table class="size-chart-table">
                <thead>
                    <tr>
                        <th>SIZE</th>
                        <th>CHEST (CM)</th>
                        <th>LENGTH (CM)</th>
                        <th>SLEEVE (CM)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>S</td><td>120</td><td>68</td><td>60</td></tr>
                    <tr><td>M</td><td>126</td><td>70</td><td>61</td></tr>
                    <tr><td>L</td><td>132</td><td>72</td><td>62</td></tr>
                    <tr><td>XL</td><td>138</td><td>74</td><td>63</td></tr>
                    <tr><td>XXL</td><td>144</td><td>76</td><td>64</td></tr>
                </tbody>
            </table>
        `;
    } else if (category === "Jeans" || catUpper.includes("PANT") || catUpper.includes("SHORT") || catUpper.includes("JEAN") || catUpper.includes("TROUSER")) {
        html = `
            <table class="size-chart-table">
                <thead>
                    <tr>
                        <th>SIZE</th>
                        <th>WAIST (INCH)</th>
                        <th>HIP (CM)</th>
                        <th>LENGTH (CM)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>30</td><td>30</td><td>104</td><td>106</td></tr>
                    <tr><td>32</td><td>32</td><td>108</td><td>108</td></tr>
                    <tr><td>34</td><td>34</td><td>112</td><td>110</td></tr>
                    <tr><td>36</td><td>36</td><td>116</td><td>112</td></tr>
                </tbody>
            </table>
        `;
    } else { // Default to Footwear/Shoes size chart
        html = `
            <table class="size-chart-table">
                <thead>
                    <tr>
                        <th>EURO SIZE</th>
                        <th>US SIZE (M)</th>
                        <th>US SIZE (W)</th>
                        <th>FOOT LENGTH (CM)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>36</td><td>4.5</td><td>6</td><td>22.5</td></tr>
                    <tr><td>38</td><td>6</td><td>7.5</td><td>24.0</td></tr>
                    <tr><td>40</td><td>7.5</td><td>9</td><td>25.0</td></tr>
                    <tr><td>42</td><td>9</td><td>10.5</td><td>26.5</td></tr>
                    <tr><td>44</td><td>10.5</td><td>12</td><td>28.0</td></tr>
                </tbody>
            </table>
        `;
    }

    container.innerHTML = html;
}

/* 11.3 Customer Reviews System */
const SEEDED_REVIEWS = {
    1: [ // Oversized Cotton Hoodie
        { name: "Lina K.", rating: 5, title: "INSANE FABRIC WEIGHT!", comment: "The thickness of this cotton is incredible. Definitely feels like a $300 designer hoodie. The double lining on the hood gives it a structured fit that is rare to find. Sized down for a slightly less baggy fit, and it's perfect.", date: "2026-06-20" },
        { name: "Marc A.", rating: 5, title: "Best streetwear hoodie I own", comment: "Literally the perfect fit. Drop shoulders, clean pocket layout, no drawstrings. It matches beautifully with cargo pants. Will be purchasing in other colors if they drop.", date: "2026-06-18" },
        { name: "Samer G.", rating: 4, title: "Very premium but heavy", comment: "The quality is outstanding. 500GSM is no joke, it's a very heavy hoodie. Extremely warm. Shipping took about 3 days. Recommend size M if you are around 175cm.", date: "2026-06-15" }
    ],
    2: [ // Leather Jacket
        { name: "Rami H.", rating: 5, title: "Exceptional Leather Quality", comment: "Genuinely surprised by how good the matte finish looks in person. Calfskin is soft but has nice structure. The zipper hardware is heavy and feels durable. Great luxury staple.", date: "2026-06-25" },
        { name: "Yasmin F.", rating: 5, title: "Bought for my husband - Stunning!", comment: "It fits him like a glove. The interior lining is very soft. Looks very expensive and pairs well with basic white tees.", date: "2026-06-22" }
    ],
    3: [ // Cargo Denim Jeans
        { name: "Jad T.", rating: 5, title: "Perfect utility aesthetic", comment: "The pockets are secure and the straight cut fits perfectly over sneakers. The denim is heavy and rigid but has broken in nicely. Drawstring ankles are a great feature.", date: "2026-06-28" }
    ],
    4: [ // Core High-Top Sneakers
        { name: "Nour M.", rating: 5, title: "Super comfortable Italian leather", comment: "Very comfortable right out of the box. Leather smells amazing. Highly recommended for daily wear.", date: "2026-06-29" }
    ]
};

let formActiveRating = 0;

function setFormRating(rating) {
    formActiveRating = rating;
    const stars = document.getElementById("starRatingSelector").querySelectorAll(".star-rating-btn");
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add("active");
            star.querySelector("i").className = "fa-solid fa-star";
        } else {
            star.classList.remove("active");
            star.querySelector("i").className = "fa-regular fa-star";
        }
    });
}

function toggleReviewForm() {
    const container = document.getElementById("writeReviewFormContainer");
    const btn = document.getElementById("writeReviewToggleBtn");
    if (!container || !btn) return;
    
    if (container.style.display === "none" || container.style.display === "") {
        container.style.display = "block";
        btn.textContent = "CANCEL REVIEW";
    } else {
        container.style.display = "none";
        btn.textContent = "WRITE A REVIEW";
        resetReviewForm();
    }
}

function resetReviewForm() {
    const form = document.getElementById("productReviewForm");
    if (form) form.reset();
    
    formActiveRating = 0;
    const starRatingSelector = document.getElementById("starRatingSelector");
    if (starRatingSelector) {
        const stars = starRatingSelector.querySelectorAll(".star-rating-btn");
        stars.forEach(star => {
            star.classList.remove("active");
            star.querySelector("i").className = "fa-regular fa-star";
        });
    }
}

function getReviewsStore() {
    const store = localStorage.getItem("styluxe_reviews");
    if (store) {
        try {
            return JSON.parse(store);
        } catch (e) {
            return SEEDED_REVIEWS;
        }
    }
    localStorage.setItem("styluxe_reviews", JSON.stringify(SEEDED_REVIEWS));
    return SEEDED_REVIEWS;
}

function saveReviewsStore(store) {
    localStorage.setItem("styluxe_reviews", JSON.stringify(store));
}

function loadProductReviews(productId) {
    const store = getReviewsStore();
    const productReviews = store[productId] || [];
    renderReviewsUI(productReviews);
}

function renderReviewsUI(reviews) {
    const listContainer = document.getElementById("reviewsListContainer");
    const avgScoreEl = document.getElementById("reviewsAvgScore");
    const avgStarsEl = document.getElementById("reviewsAvgStars");
    const totalCountEl = document.getElementById("reviewsTotalCount");

    if (!listContainer) return;

    if (reviews.length === 0) {
        if (avgScoreEl) avgScoreEl.textContent = "0.0";
        if (avgStarsEl) avgStarsEl.style.width = "0%";
        if (totalCountEl) totalCountEl.textContent = "(0 reviews)";
        listContainer.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: 1.3rem; padding: 3rem 0;">NO REVIEWS YET. BE THE FIRST TO WRITE A REVIEW!</div>`;
        return;
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = (totalRating / reviews.length).toFixed(1);
    
    if (avgScoreEl) avgScoreEl.textContent = avgRating;
    if (avgStarsEl) avgStarsEl.style.width = `${(parseFloat(avgRating) / 5) * 100}%`;
    if (totalCountEl) totalCountEl.textContent = `(${reviews.length} review${reviews.length > 1 ? 's' : ''})`;

    listContainer.innerHTML = "";
    const sorted = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(r => {
        const card = document.createElement("div");
        card.classList.add("review-card");

        const starsHTML = getStarsHTML(r.rating);

        card.innerHTML = `
            <div class="review-meta">
                <span class="review-user">${r.name.toUpperCase()}</span>
                <span class="review-date">${formatReviewDate(r.date)}</span>
            </div>
            <div class="review-stars">${starsHTML}</div>
            <h4 class="review-title">${r.title.toUpperCase()}</h4>
            <p class="review-text">${r.comment}</p>
        `;
        listContainer.appendChild(card);
    });
}

function getStarsHTML(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            html += '<i class="fa-solid fa-star"></i>';
        } else {
            html += '<i class="fa-regular fa-star"></i>';
        }
    }
    return html;
}

function formatReviewDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

function submitProductReview(event) {
    event.preventDefault();
    if (!activeModalProduct) return;

    const name = document.getElementById("reviewName").value.trim();
    const title = document.getElementById("reviewTitle").value.trim();
    const comment = document.getElementById("reviewComment").value.trim();

    if (!name || !title || !comment) {
        alert("PLEASE FILL IN ALL REQUIRED FIELDS.");
        return;
    }

    if (formActiveRating === 0) {
        alert("PLEASE SELECT A RATING STAR VALUE.");
        return;
    }

    const store = getReviewsStore();
    if (!store[activeModalProduct.id]) {
        store[activeModalProduct.id] = [];
    }

    const newReview = {
        name,
        rating: formActiveRating,
        title,
        comment,
        date: new Date().toISOString().split('T')[0]
    };

    store[activeModalProduct.id].push(newReview);
    saveReviewsStore(store);

    // Reload reviews UI list
    loadProductReviews(activeModalProduct.id);

    // Hide review form
    toggleReviewForm();
    
    // Smooth scroll down to review list container
    document.getElementById("reviewsListContainer").scrollIntoView({ behavior: 'smooth' });
}

// ==========================================================================
// 12. COLLECTIONS, WHATSAPP CHANNELS & BRANDS FILTER
// ==========================================================================

let activeBrand = "All";

const DEPT_WHATSAPP = {
    "All": { number: "96171987654", label: "GENERAL SUPPORT" },
    "Men": { number: "96171987654", label: "MEN'S SUPPORT" },
    "Women": { number: "96103456789", label: "WOMEN'S SUPPORT" },
    "Kids": { number: "96170112233", label: "KIDS' SUPPORT" }
};

// Extract brand names dynamically from product details
function getProductBrand(product) {
    const name = product.name.toUpperCase();
    for (const b of BRANDS) {
        if (name.includes(b.name.toUpperCase())) {
            return b.name;
        }
    }
    const standardBrands = BRANDS.map(b => b.name);
    if (standardBrands.length > 0) {
        return standardBrands[product.id % standardBrands.length];
    }
    return "Styluxe";
}

// Renders the circular brand tags
function renderBrandSlider() {
    const brandSlider = document.getElementById("brandSlider");
    if (!brandSlider) return;

    brandSlider.innerHTML = "";

    // 1. Find unique brands associated with the active department's products
    let availableProducts = [...PRODUCTS];
    if (activeDepartment !== "All") {
        availableProducts = availableProducts.filter(p => p.department.toLowerCase() === activeDepartment.toLowerCase());
    }

    // Set of brands present in current products
    const activeDeptBrands = ["All", ...new Set(availableProducts.map(p => getProductBrand(p)))];

    const displayBrands = [{ name: "All", img: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=200" }, ...BRANDS];
    const filteredBrandData = displayBrands.filter(b => activeDeptBrands.includes(b.name));

    filteredBrandData.forEach(b => {
        const card = document.createElement("div");
        card.classList.add("brand-circle-card");
        if (activeBrand === b.name) card.classList.add("active");

        card.innerHTML = `
            <div class="brand-circle-logo" style="overflow: hidden; padding: 0;">
                <img src="${b.img}" alt="${b.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            </div>
            <div class="brand-circle-name" style="font-size: 0.9rem; letter-spacing: 0.05em;">${b.name === "All" ? "ALL" : b.name.toUpperCase()}</div>
        `;

        card.onclick = () => {
            selectBrand(b.name);
        };

        brandSlider.appendChild(card);
    });
}

function selectBrand(brand) {
    activeBrand = brand;
    renderBrandSlider();
    renderProducts();
}

// Renders the subcategory tabs dynamically based on selected department's products
function renderCategoryTags() {
    const filterTags = document.getElementById("filterTags");
    if (!filterTags) return;

    // Filter products by department to find unique categories
    let availableProducts = [...PRODUCTS];
    if (activeDepartment !== "All") {
        availableProducts = availableProducts.filter(p => p.department.toLowerCase() === activeDepartment.toLowerCase());
    }

    const uniqueCategories = ["All", ...new Set(availableProducts.map(p => p.category))];

    filterTags.innerHTML = "";
    uniqueCategories.forEach(cat => {
        const btn = document.createElement("button");
        btn.classList.add("filter-tag");
        if (activeCategory === cat) {
            btn.classList.add("active");
        }
        
        const labelText = cat === "All" 
            ? (activeDepartment === "All" ? "ALL PRODUCTS" : `ALL ${activeDepartment.toUpperCase()}`) 
            : cat.toUpperCase();
            
        btn.textContent = labelText;
        btn.onclick = () => filterByCategory(cat);
        filterTags.appendChild(btn);
    });
}

// Updates floating WhatsApp action details
function updateWhatsAppPill(dept) {
    const data = DEPT_WHATSAPP[dept] || DEPT_WHATSAPP["All"];
    const btn = document.getElementById("floatingWhatsappBtn");
    const label = document.getElementById("whatsappDeptTag");

    if (btn) {
        const msg = encodeURIComponent(`Hi Styluxe, I'm inquiring about the ${dept === 'All' ? 'collections' : dept + ' collection'}.`);
        btn.href = `https://wa.me/${data.number}?text=${msg}`;
    }
    if (label) {
        label.textContent = data.label;
    }
}

// ==========================================================================
// 13. ADMIN STAFF & ROLE-BASED ACCESS CONTROL PERMISSIONS
// ==========================================================================

let staffList = [];

// Apply permissions to show/hide admin sidebar tabs
function applyStaffPermissions() {
    const perms = currentAdminStaff ? currentAdminStaff.permissions || [] : [];
    
    const btnProducts = document.getElementById("btnTabProducts");
    const btnOrders = document.getElementById("btnTabOrders");
    const btnCustomers = document.getElementById("btnTabCustomers");
    const btnStaff = document.getElementById("btnTabStaff");
    const btnPos = document.getElementById("adminPosNavBtn");
    
    const btnTaxonomy = document.getElementById("btnTabTaxonomy");
    const btnSuppliers = document.getElementById("btnTabSuppliers");
    
    if (btnProducts) {
        btnProducts.style.display = perms.includes("manage_products") ? "flex" : "none";
    }
    if (btnTaxonomy) {
        btnTaxonomy.style.display = perms.includes("manage_products") ? "flex" : "none";
    }
    if (btnSuppliers) {
        btnSuppliers.style.display = perms.includes("manage_products") ? "flex" : "none";
    }
    if (btnOrders) {
        btnOrders.style.display = perms.includes("manage_orders") ? "flex" : "none";
    }
    if (btnCustomers) {
        btnCustomers.style.display = perms.includes("manage_orders") ? "flex" : "none";
    }
    if (btnStaff) {
        btnStaff.style.display = perms.includes("manage_staff") ? "flex" : "none";
    }
    if (btnPos) {
        btnPos.style.display = perms.includes("pos_access") ? "flex" : "none";
    }
}

// Load staff list from server API
async function loadStaffFromServer() {
    try {
        const response = await fetch('/api/staff');
        staffList = await response.json();
    } catch (err) {
        console.error("Failed to load staff list from server:", err);
    }
}

// Render active staff in admin dashboard table
function renderStaffList() {
    const tableBody = document.getElementById("adminStaffTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    staffList.forEach(s => {
        const tr = document.createElement("tr");
        
        // Formatted permissions list
        const permsFormatted = s.permissions && s.permissions.length > 0 
            ? s.permissions.map(p => p.replace('_', ' ').toUpperCase()).join(", ")
            : "NONE";

        tr.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>${s.email}</td>
            <td><span class="product-badge" style="background-color: var(--color-border); color: var(--color-text);">${s.role}</span></td>
            <td style="font-size: 1.1rem; color: var(--color-text-muted);">${permsFormatted}</td>
            <td><span style="color: #25d366; font-weight: 600;">● ${s.status || 'Active'}</span></td>
            <td>
                ${s.id === 1 ? '<span style="font-size: 1.1rem; color: var(--color-text-muted);">SYSTEM OWNER</span>' : `
                <button class="admin-delete-btn" onclick="deleteStaff(${s.id})" aria-label="Suspend employee"><i class="fa-solid fa-user-slash"></i></button>
                `}
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Staff Modal helper actions
function openAddStaffModal() {
    const form = document.getElementById("addStaffForm");
    if (form) form.reset();
    document.getElementById("addStaffModalBackdrop").classList.add("active");
}

function closeAddStaffModal() {
    document.getElementById("addStaffModalBackdrop").classList.remove("active");
}

// Handle Add Staff Form submit
function handleNewStaffSubmit(event) {
    event.preventDefault();

    const name = document.getElementById("staffName").value;
    const email = document.getElementById("staffEmail").value;
    const password = document.getElementById("staffPassword").value;
    const role = document.getElementById("staffRole").value;

    // Read checkboxes
    const checkboxes = document.querySelectorAll('#addStaffForm input[name="permissions"]:checked');
    const permissions = Array.from(checkboxes).map(cb => cb.value);

    if (permissions.length === 0) {
        alert("PLEASE ASSIGN AT LEAST ONE PERMISSION FOR THE STAFF MEMBER.");
        return;
    }

    const staffData = {
        name,
        email,
        password,
        role,
        permissions
    };

    fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
    })
    .then(async res => {
        if (res.ok) {
            closeAddStaffModal();
            await loadStaffFromServer();
            renderStaffList();
        } else {
            const err = await res.json();
            alert("Error creating staff: " + err.error);
        }
    })
    .catch(err => console.error("Error creating staff:", err));
}

// Suspend/delete staff helper
function deleteStaff(staffId) {
    if (confirm("ARE YOU SURE YOU WANT TO SUSPEND THIS STAFF PROFILE?")) {
        fetch(`/api/staff?id=${staffId}`, {
            method: 'DELETE'
        })
        .then(async res => {
            if (res.ok) {
                await loadStaffFromServer();
                renderStaffList();
            } else {
                const err = await res.json();
                alert("Error deleting staff: " + err.error);
            }
        })
        .catch(err => console.error("Error deleting staff:", err));
    }
}

// ==========================================================================
// ==========================================================================
// 14. HIGH-FIDELITY SOCIAL AUTHENTICATION POPUPS (GOOGLE & APPLE SIGN-IN)
// ==========================================================================

// Trigger Google Sign-In (First tries browser-native keychain, then falls back to popup)
function triggerGoogleSignIn() {
    if (navigator.credentials) {
        navigator.credentials.get({
            password: true,
            federated: {
                providers: ["https://accounts.google.com"]
            }
        })
        .then(credential => {
            if (credential) {
                console.log("Native Google Keychain credential selected:", credential);
                handleSocialLoginSuccess({
                    name: credential.name || credential.id.split('@')[0],
                    email: credential.id
                });
            } else {
                openGooglePopup();
            }
        })
        .catch(err => {
            console.warn("Native Credentials API failed or dismissed, falling back to popup:", err);
            openGooglePopup();
        });
    } else {
        openGooglePopup();
    }
}

function openGooglePopup() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        window.location.href = 'mock-google-login.html?redirect=true';
    } else {
        const width = 500;
        const height = 620;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        window.open(
            'mock-google-login.html', 
            'GoogleSignIn', 
            `width=${width},height=${height},left=${left},top=${top},scrollbars=no,resizable=no`
        );
    }
}

// Trigger Apple Sign-In (First tries browser-native keychain, then falls back to popup)
function triggerAppleSignIn() {
    if (navigator.credentials) {
        navigator.credentials.get({
            password: true,
            federated: {
                providers: ["https://appleid.apple.com"]
            }
        })
        .then(credential => {
            if (credential) {
                console.log("Native Apple Keychain credential selected:", credential);
                handleSocialLoginSuccess({
                    name: credential.name || credential.id.split('@')[0],
                    email: credential.id
                });
            } else {
                openApplePopup();
            }
        })
        .catch(err => {
            console.warn("Native Credentials API failed or dismissed, falling back to popup:", err);
            openApplePopup();
        });
    } else {
        openApplePopup();
    }
}

function openApplePopup() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        window.location.href = 'mock-apple-login.html?redirect=true';
    } else {
        const width = 580;
        const height = 580;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        window.open(
            'mock-apple-login.html', 
            'AppleSignIn', 
            `width=${width},height=${height},left=${left},top=${top},scrollbars=no,resizable=no`
        );
    }
}

// Common backend session success route
function handleSocialLoginSuccess(profile) {
    fetch('/api/users/social-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name, email: profile.email })
    })
    .then(async res => {
        const result = await res.json();
        if (res.ok) {
            currentUser = result;
            localStorage.setItem("styluxe_user", JSON.stringify(currentUser));
            updateUserSessionUI();
            closeAuthModal();
            
            if (cart.length > 0) {
                openCheckoutModal();
            }
        } else {
            alert("Social login failed: " + result.error);
        }
    })
    .catch(err => {
        console.error("Social login request failed:", err);
        alert("Failed to connect to server for social login verification.");
    });
}

// Listen for messages sent from Google/Apple popup authentication windows
window.addEventListener("message", (event) => {
    // Only accept messages from same origin
    if (event.origin !== window.location.origin) return;

    if (event.data && event.data.type === 'oauth-success') {
        console.log(`Successfully received ${event.data.provider} profile:`, event.data);
        handleSocialLoginSuccess({
            name: event.data.name,
            email: event.data.email
        });
    }
});

// ==========================================================================
// 15. DYNAMIC SERVER-SIDE OAUTH CONFIG & GOOGLE SDK RUNTIME INITIALIZERS
// ==========================================================================

let googleClientId = "";

async function loadServerConfig() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        googleClientId = data.GOOGLE_CLIENT_ID || "";
    } catch (err) {
        console.warn("Failed to load server configurations:", err);
    }
    renderSocialLoginButtons();
}

function renderSocialLoginButtons() {
    const area = document.getElementById("authSocialButtonsArea");
    if (!area) return;
    area.innerHTML = "";
    
    // Set container layout to side-by-side
    area.style.display = "flex";
    area.style.justifyContent = "center";
    area.style.gap = "1.5rem";
    area.style.width = "100%";
    
    // Render custom popup/redirect simulation buttons as icon only (Bypasses Google Console origin restrictions)
    area.innerHTML = `
        <button type="button" class="auth-social-icon-btn" onclick="triggerGoogleSignIn()">
            <i class="fa-brands fa-google"></i>
        </button>
        <button type="button" class="auth-social-icon-btn" onclick="triggerAppleSignIn()">
            <i class="fa-brands fa-apple"></i>
        </button>
    `;
}

function initGoogleIdentityServices() {
    if (typeof google === 'undefined') return;
    try {
        google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleOfficialCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        const btnContainer = document.getElementById("googleBtnContainer");
        if (btnContainer) {
            google.accounts.id.renderButton(btnContainer, {
                type: "icon", // Render as icon only!
                theme: "outline",
                size: "large",
                shape: "circle" // Render as a beautiful circular icon!
            });
        }
        
        // Display floating One Tap prompt
        google.accounts.id.prompt();
    } catch (err) {
        console.warn("Google Identity Services initialization failed:", err);
    }
}

function handleGoogleOfficialCredentialResponse(response) {
    // Post token to backend secure verification endpoint
    fetch('/api/users/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
    })
    .then(async res => {
        const result = await res.json();
        if (res.ok) {
            currentUser = result;
            localStorage.setItem("styluxe_user", JSON.stringify(currentUser));
            updateUserSessionUI();
            closeAuthModal();
            
            if (cart.length > 0) {
                openCheckoutModal();
            }
        } else {
            alert("Google Sign-In verification failed: " + result.error);
        }
    })
    .catch(err => {
        console.error("Google Sign-In verification failed:", err);
        alert("Failed to connect to server to verify Google token.");
    });
}

