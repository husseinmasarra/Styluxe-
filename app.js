// STATE MANAGEMENT & DATABASE SYNC
let PRODUCTS = [];
let ordersList = [];
let usersList = [];
let CATEGORIES = [];
let BRANDS = [];
let SUPPLIERS = [];
let INVOICES = [];
let STORE_SETTINGS = {};
let COUPONS = [];
let activeCoupon = null;
let cart = [];

// Admin Panel State
let currentAdminDept = ""; // "Men", "Women", "Kids", "Global"
let currentAdminStaff = null; // Active logged in staff details
let currentAdminPassword = ""; // Active logged in staff password for returns auth
let posMode = "sales"; // "sales" or "return"
let dailyReportCashierFilter = "current"; // Cashier selection filter for daily report
let adminActiveTab = "overview";
let posCart = [];
let isEditingProduct = false;
let editingProductId = null;
let isEditingBrand = false;
let editingBrandOldName = "";

function splitProductImages(imgStr) {
    if (!imgStr || typeof imgStr !== "string") return [];
    if (imgStr.startsWith("data:image/")) {
        return imgStr.split(/,(?=data:image\/|https?:\/\/|\/assets\/|assets\/)/i).map(p => p.trim()).filter(Boolean);
    }
    return imgStr.split(",").map(url => url.trim()).filter(Boolean);
}
window.splitProductImages = splitProductImages;

// Utility to get the primary image from a product (supports comma-separated multiple images & Base64 data URLs)
function getProductMainImage(product) {
    if (product && product.image) {
        const imgs = splitProductImages(product.image);
        return imgs.length > 0 ? imgs[0] : product.image;
    }
    return "";
}
window.getProductMainImage = getProductMainImage;

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
        const fetchSafe = async (url) => {
            try {
                const res = await fetch(url);
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`Failed to fetch ${url}:`, e);
            }
            return null;
        };

        const [prods, cats, brands, supps, invs, settings, coupons] = await Promise.all([
            fetchSafe('/api/products'),
            fetchSafe('/api/categories'),
            fetchSafe('/api/brands'),
            fetchSafe('/api/suppliers'),
            fetchSafe('/api/invoices'),
            fetchSafe('/api/settings'),
            fetchSafe('/api/coupons')
        ]);

        if (Array.isArray(prods)) {
            PRODUCTS = prods;
        }
        if (Array.isArray(cats)) CATEGORIES = cats;
        if (Array.isArray(brands)) BRANDS = brands;
        if (Array.isArray(supps)) SUPPLIERS = supps;
        if (Array.isArray(invs)) INVOICES = invs;
        if (settings && typeof settings === 'object') STORE_SETTINGS = settings;
        if (Array.isArray(coupons)) COUPONS = coupons;

        updateCategoriesDatalist();
        populateBrandOptions();
        
        renderProducts();
        renderBrandSlider();
        renderCategoryTags();
        updateWhatsAppPill(activeDepartment);
        updateSocialFooterLinks();
        renderAdminCoupons();
        populateSettingsFields();
        applyHeroBackgroundFromSettings();
    } catch (err) {
        console.error("Failed to load store data from server:", err);
    }
}

function updateCategoriesDatalist() {
    const select = document.getElementById("newProdCategory");
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Select Category</option>';
    
    const deptSelect = document.getElementById("newProdDept");
    const activeDept = deptSelect ? deptSelect.value : "";
    
    let filteredCats = CATEGORIES || [];
    if (activeDept) {
        filteredCats = filteredCats.filter(c => c.department && c.department.toLowerCase() === activeDept.toLowerCase());
    }
    
    filteredCats.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.name;
        opt.textContent = cat.name.toUpperCase();
        select.appendChild(opt);
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

    // Auto-resume admin dashboard session from sessionStorage
    const savedAdminStaff = sessionStorage.getItem("styluxe_admin_staff");
    if (savedAdminStaff) {
        currentAdminStaff = JSON.parse(savedAdminStaff);
        currentAdminDept = sessionStorage.getItem("styluxe_admin_dept") || "Global";
        currentAdminPassword = sessionStorage.getItem("styluxe_admin_password") || "";
        
        // Initialize dashboard overlay
        adminPanelOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
        
        // Hide quick-return floating button when dashboard is open
        const floatingBtn = document.getElementById("floatingAdminDashboardBtn");
        if (floatingBtn) floatingBtn.style.display = "none";
        
        initAdminDashboard();
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
        
        const collectionsGridSec = document.getElementById("collections");
        const shopSec = document.getElementById("shop-section");
        const backBtnContainer = document.getElementById("backToCollectionsContainer");
        
        if (searchQuery.trim() !== "") {
            if (collectionsGridSec) collectionsGridSec.style.display = "none";
            if (shopSec) shopSec.style.display = "block";
            if (backBtnContainer) {
                if (activeDepartment !== "All") {
                    backBtnContainer.style.display = "block";
                } else {
                    backBtnContainer.style.display = "none";
                }
            }
        } else {
            // Always keep shop-section visible; just hide collections and back button when All
            if (collectionsGridSec) collectionsGridSec.style.display = "none";
            if (shopSec) shopSec.style.display = "block";
            if (backBtnContainer) backBtnContainer.style.display = activeDepartment !== "All" ? "block" : "none";
        }
        
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
            const previewDiv = document.getElementById("newProdImgPreviews");
            if (!previewDiv) return;
            previewDiv.innerHTML = "";
            
            if (this.files && this.files.length > 0) {
                Array.from(this.files).forEach(file => {
                    getFileBase64(file).then(base64 => {
                        const img = document.createElement("img");
                        img.src = base64;
                        img.alt = "Preview";
                        img.style.maxHeight = "100px";
                        img.style.borderRadius = "4px";
                        img.style.border = "1px solid var(--color-border)";
                        img.style.objectFit = "contain";
                        previewDiv.appendChild(img);
                    });
                });
            }
        });
    }

    // Dynamic stock grid generator
    window.updateDynamicInventoryGrid = function() {
        const sizesInput = document.getElementById("newProdSizes");
        const colorsInput = document.getElementById("newProdColors");
        const gridContainer = document.getElementById("dynamicInventoryGrid");
        
        if (!sizesInput || !colorsInput || !gridContainer) return;
        
        const sizes = sizesInput.value.split(",")
            .map(s => s.trim())
            .filter(Boolean);
            
        const colors = colorsInput.value.split(",")
            .map(c => c.trim())
            .filter(Boolean);
            
        const currentValues = {};
        gridContainer.querySelectorAll(".inv-qty-input").forEach(input => {
            const key = input.dataset.key;
            currentValues[key] = input.value;
        });
        
        gridContainer.innerHTML = "";
        
        if (sizes.length === 0 || colors.length === 0) {
            gridContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--color-text-muted); font-size: 1.2rem; padding: 1rem 0;">Enter sizes and colors first.</div>`;
            return;
        }
        
        sizes.forEach(size => {
            colors.forEach(color => {
                const key = `${size}-${color}`;
                const existingVal = currentValues[key] !== undefined ? currentValues[key] : "10";
                
                const cell = document.createElement("div");
                cell.style.display = "flex";
                cell.style.flexDirection = "column";
                cell.style.gap = "0.5rem";
                cell.style.backgroundColor = "var(--color-surface)";
                cell.style.border = "1px solid var(--color-border)";
                cell.style.padding = "1rem";
                cell.style.borderRadius = "4px";
                
                cell.innerHTML = `
                    <span style="font-size: 1.1rem; font-weight: 700; color: var(--color-accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${key}">${size} - ${color}</span>
                    <input type="number" class="inv-qty-input" data-key="${key}" min="0" value="${existingVal}" style="width: 100%; height: 35px; padding: 0.5rem; background: var(--color-background); border: 1px solid var(--color-border); color: var(--color-text); border-radius: 4px;">
                `;
                gridContainer.appendChild(cell);
            });
        });
    };

    window.updateColorImagesUploadContainer = function() {
        const colorsInput = document.getElementById("newProdColors");
        const container = document.getElementById("colorImagesUploadContainer");
        if (!colorsInput || !container) return;

        const colors = colorsInput.value.split(",")
            .map(c => c.trim())
            .filter(Boolean);

        const currentImages = {};
        container.querySelectorAll(".color-image-row").forEach(row => {
            const color = row.dataset.color;
            const imgPreview = row.querySelector("img");
            if (imgPreview && imgPreview.style.display !== "none") {
                currentImages[color] = imgPreview.src;
            }
        });

        container.innerHTML = "";

        if (colors.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: 1.2rem; padding: 1rem 0;">Enter colors first.</div>`;
            return;
        }

        colors.forEach(color => {
            const existingImg = currentImages[color] || "";

            const row = document.createElement("div");
            row.classList.add("color-image-row");
            row.dataset.color = color;
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.justifyContent = "space-between";
            row.style.gap = "1.5rem";
            row.style.padding = "1.5rem";
            row.style.backgroundColor = "var(--color-surface)";
            row.style.border = "1px solid var(--color-border)";
            row.style.borderRadius = "4px";

            row.innerHTML = `
                <div style="flex: 1;">
                    <span style="font-size: 1.2rem; font-weight: 700; color: var(--color-accent); display: block; margin-bottom: 0.5rem;">${color.toUpperCase()}</span>
                    <input type="file" class="color-img-file-input" accept="image/*" style="width: 100%; font-size: 1.1rem; background: var(--color-background); border: 1px solid var(--color-border); padding: 0.5rem; color: var(--color-text); border-radius: 4px;">
                </div>
                <div class="color-img-preview" style="width: 60px; height: 60px; border-radius: 4px; border: 1px solid var(--color-border); overflow: hidden; background: var(--color-background); display: ${existingImg ? 'block' : 'none'}; position: relative; flex-shrink: 0;">
                    <img src="${existingImg}" style="width: 100%; height: 100%; object-fit: cover;">
                    <button type="button" onclick="clearColorSpecificImage('${color}')" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.8); border: none; color: var(--color-error); width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1rem;"><i class="fa-regular fa-trash-can"></i></button>
                </div>
            `;

            const fileInput = row.querySelector(".color-img-file-input");
            fileInput.addEventListener("change", function() {
                const file = this.files[0];
                if (file) {
                    getFileBase64(file).then(base64 => {
                        const previewDiv = row.querySelector(".color-img-preview");
                        const previewImg = previewDiv.querySelector("img");
                        previewImg.src = base64;
                        previewDiv.style.display = "block";
                    });
                }
            });

            container.appendChild(row);
        });
    };

    window.clearColorSpecificImage = function(color) {
        const row = document.querySelector(`.color-image-row[data-color="${color}"]`);
        if (row) {
            const fileInput = row.querySelector(".color-img-file-input");
            const previewDiv = row.querySelector(".color-img-preview");
            if (fileInput) fileInput.value = "";
            if (previewDiv) {
                previewDiv.style.display = "none";
                const img = previewDiv.querySelector("img");
                if (img) img.src = "";
            }
        }
    };

    const newProdSizesInput = document.getElementById("newProdSizes");
    const newProdColorsInput = document.getElementById("newProdColors");
    if (newProdSizesInput) {
        newProdSizesInput.addEventListener("input", window.updateDynamicInventoryGrid);
    }
    if (newProdColorsInput) {
        newProdColorsInput.addEventListener("input", () => {
            window.updateDynamicInventoryGrid();
            window.updateColorImagesUploadContainer();
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

    window.updateDefaultSizesAndInventoryGrid = function() {
        const deptSelect = document.getElementById("newProdDept");
        const categorySelect = document.getElementById("newProdCategory");
        const sizesInput = document.getElementById("newProdSizes");
        
        if (!deptSelect || !categorySelect || !sizesInput) return;
        
        const dept = deptSelect.value;
        const category = categorySelect.value;
        const catUpper = (category || "").toUpperCase();
        const isFootwear = category === "Footwear" || catUpper.includes("SHOE") || catUpper.includes("SNEAKER") || catUpper.includes("SLIDE") || catUpper.includes("BOOT");
        
        let defaultSizes = "S, M, L, XL";
        
        if (isFootwear) {
            if (dept === "Men") {
                defaultSizes = "40, 41, 42, 43, 44, 45";
            } else if (dept === "Women") {
                defaultSizes = "36, 37, 38, 39, 40, 41";
            } else if (dept === "Kids") {
                defaultSizes = "26, 28, 30, 32, 34";
            } else {
                defaultSizes = "38, 39, 40, 41, 42, 43";
            }
        } else if (dept === "Kids") {
            defaultSizes = "2Y, 4Y, 6Y, 8Y, 10Y";
        }
        
        sizesInput.value = defaultSizes;
        
        if (window.updateDynamicInventoryGrid) {
            window.updateDynamicInventoryGrid();
        }
    };

    const prodDeptSelect = document.getElementById("newProdDept");
    if (prodDeptSelect) {
        prodDeptSelect.addEventListener("change", () => {
            updateCategoriesDatalist();
            window.updateDefaultSizesAndInventoryGrid();
        });
    }

    const prodCategorySelect = document.getElementById("newProdCategory");
    if (prodCategorySelect) {
        prodCategorySelect.addEventListener("change", () => {
            window.updateDefaultSizesAndInventoryGrid();
        });
    }

    document.querySelectorAll(".hero-slide-input").forEach(input => {
        input.addEventListener("change", function() {
            const idx = this.dataset.index;
            const file = this.files[0];
            if (file) {
                getFileBase64(file).then(base64 => {
                    const previewDiv = document.querySelector(`.hero-slide-preview-container[data-index="${idx}"]`);
                    const previewImg = previewDiv ? previewDiv.querySelector("img") : null;
                    if (previewDiv && previewImg) {
                        previewImg.src = base64;
                        previewDiv.style.display = "block";
                        previewDiv.dataset.base64 = base64;
                        previewDiv.dataset.isChanged = "true";
                    }
                });
            }
        });
    });

    // SPA history back/forward control for admin tabs and overlay
    window.addEventListener("popstate", (event) => {
        if (event.state && event.state.admin) {
            if (currentAdminStaff) {
                adminPanelOverlay.classList.add("active");
                document.body.style.overflow = "hidden";
                const floatingBtn = document.getElementById("floatingAdminDashboardBtn");
                if (floatingBtn) floatingBtn.style.display = "none";
                if (event.state.tab) {
                    switchAdminTab(event.state.tab, false);
                }
            } else {
                adminPanelOverlay.classList.remove("active");
                document.body.style.overflow = "";
            }
        } else {
            const container = document.querySelector(".admin-panel-container");
            if (container) container.classList.remove("pos-mode");
            adminPanelOverlay.classList.remove("active");
            document.body.style.overflow = "";
            
            const floatingBtn = document.getElementById("floatingAdminDashboardBtn");
            if (floatingBtn) {
                floatingBtn.style.display = currentAdminStaff ? "flex" : "none";
            }
        }
    });
}

// FORMAT PRICE ACCORDING TO ACTIVE CURRENCY (Always USD)
function formatPrice(priceInUSD) {
    return priceInUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// SWITCH CURRENCY (guarded for deletion)
function changeCurrency(currency) {
    currentCurrency = currency;
    if (currencyBtn) {
        currencyBtn.textContent = currency === "USD" ? "USD ($)" : "LBP (L.L.)";
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
    const select = document.getElementById("brandFilterSelect");
    if (select) select.value = "All";

    syncDepartmentControlsUI();

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
        if (collectionsGridSec) collectionsGridSec.style.display = "none";
        if (shopSec) shopSec.style.display = "block";
        if (backBtnContainer) backBtnContainer.style.display = "none";
    } else {
        if (collectionsGridSec) collectionsGridSec.style.display = "none";
        if (shopSec) shopSec.style.display = "block";
        if (backBtnContainer) backBtnContainer.style.display = "block";
    }
}

function syncDepartmentControlsUI() {
    if (departmentControls) {
        const tags = departmentControls.querySelectorAll(".dept-tag");
        tags.forEach(tag => {
            const text = tag.textContent.trim().toLowerCase();
            const compareText = activeDepartment.toLowerCase();
            
            if (compareText === "all" && text === "all departments") {
                tag.classList.add("active");
            } else if (text === compareText) {
                tag.classList.add("active");
            } else {
                tag.classList.remove("active");
            }
        });
    }

    const navLinksContainer = document.getElementById("navLinks");
    if (navLinksContainer) {
        const navLinks = navLinksContainer.querySelectorAll("a");
        navLinks.forEach(link => {
            const text = link.textContent.trim().toLowerCase();
            if (text === activeDepartment.toLowerCase()) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    }
}

function showHomePage() {
    activeDepartment = "All";
    activeCategory = "All";
    activeBrand = "All";

    const collectionsGridSec = document.getElementById("collections");
    const shopSec = document.getElementById("shop-section");
    const backBtnContainer = document.getElementById("backToCollectionsContainer");

    if (collectionsGridSec) collectionsGridSec.style.display = "block";
    if (shopSec) shopSec.style.display = "none";
    if (backBtnContainer) backBtnContainer.style.display = "none";

    const navLinksContainer = document.getElementById("navLinks");
    if (navLinksContainer) {
        const navLinks = navLinksContainer.querySelectorAll("a");
        navLinks.forEach(link => {
            if (link.textContent.trim().toUpperCase() === "HOME") {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    }
}

function showCollectionsGrid() {
    showHomePage();
}

// FILTER BY CATEGORY
function filterByCategory(category) {
    if (activeCategory.trim().toLowerCase() === category.trim().toLowerCase()) {
        activeCategory = "All";
    } else {
        activeCategory = category;
    }
    renderCategoryTags();
    renderProducts();
}

// SORT PRODUCTS
function sortProducts() {
    renderProducts();
}

// SMART SEARCH HANDLERS
function onSmartSearchInput(val) {
    searchQuery = val.toLowerCase();
    
    // Sync header navbar search input if present
    const navInput = document.getElementById("searchInput");
    if (navInput) navInput.value = val;

    const collectionsGridSec = document.getElementById("collections");
    const shopSec = document.getElementById("shop-section");
    if (searchQuery.trim() !== "") {
        if (collectionsGridSec) collectionsGridSec.style.display = "none";
        if (shopSec) shopSec.style.display = "block";
    }

    renderProducts();
}

function executeSmartSearch() {
    const smartInput = document.getElementById("smartSearchInput");
    if (smartInput) {
        onSmartSearchInput(smartInput.value);
    }
}

// FILTER AND SORT PRODUCTS COMBINED
function getFilteredAndSortedProducts() {
    let result = [...PRODUCTS];

    // Department Filter
    if (activeDepartment && activeDepartment !== "All") {
        result = result.filter(p => p.department && p.department.trim().toLowerCase() === activeDepartment.trim().toLowerCase());
    }

    // Category Filter
    if (activeCategory && activeCategory !== "All") {
        result = result.filter(p => p.category && p.category.trim().toLowerCase() === activeCategory.trim().toLowerCase());
    }

    // Brand Filter
    if (activeBrand && activeBrand !== "All") {
        result = result.filter(p => {
            const b = getProductBrand(p);
            return b && b.trim().toLowerCase() === activeBrand.trim().toLowerCase();
        });
    }

    // Search Query Filter with Multi-Word Tokenized Scoring Relevance System
    if (searchQuery && searchQuery.trim() !== "") {
        const query = searchQuery.trim().toLowerCase();
        const keywords = query.split(/\s+/).filter(w => w.length > 0);
        
        const scoredResults = [];
        result.forEach(p => {
            let score = 0;
            let matchesAllKeywords = true;

            const nameLower = (p.name || "").toLowerCase();
            const brandLower = getProductBrand(p).toLowerCase();
            const categoryLower = (p.category || "").toLowerCase();
            const deptLower = (p.department || "").toLowerCase();
            const descLower = (p.description || "").toLowerCase();
            const sizesLower = (p.sizes || []).map(s => s.toLowerCase()).join(" ");
            const colorsLower = (p.colors || []).map(c => c.toLowerCase()).join(" ");
            const idStr = (p.id || "").toString();

            keywords.forEach(keyword => {
                let keywordMatch = false;

                if (idStr === keyword || `#${idStr}` === keyword) {
                    score += 150;
                    keywordMatch = true;
                }
                if (brandLower.includes(keyword)) {
                    score += 80;
                    keywordMatch = true;
                    if (brandLower === keyword) score += 40;
                }
                if (nameLower.includes(keyword)) {
                    score += 50;
                    keywordMatch = true;
                    if (nameLower.startsWith(keyword) || nameLower.includes(" " + keyword)) score += 20;
                }
                if (categoryLower.includes(keyword)) {
                    score += 30;
                    keywordMatch = true;
                }
                if (deptLower.includes(keyword)) {
                    score += 20;
                    keywordMatch = true;
                }
                if (colorsLower.includes(keyword)) {
                    score += 25;
                    keywordMatch = true;
                }
                if (sizesLower.includes(keyword)) {
                    score += 20;
                    keywordMatch = true;
                }
                if (descLower.includes(keyword)) {
                    score += 10;
                    keywordMatch = true;
                }

                if (!keywordMatch) {
                    matchesAllKeywords = false;
                }
            });

            if (matchesAllKeywords && score > 0) {
                scoredResults.push({ product: p, score: score });
            }
        });

        if (scoredResults.length > 0) {
            result = scoredResults.map(item => item.product);
        }
    }

    // Sort Selector
    const sortVal = (sortSelect && sortSelect.value) ? sortSelect.value : "default";
    if (sortVal === "price-low") {
        result.sort((a, b) => a.price - b.price);
    } else if (sortVal === "price-high") {
        result.sort((a, b) => b.price - a.price);
    } else {
        // Default / Featured: Sort by priority (ascending) and fallback to newest products (descending ID)
        result.sort((a, b) => {
            const pa = a.priority !== undefined ? a.priority : 1000;
            const pb = b.priority !== undefined ? b.priority : 1000;
            if (pa !== pb) return pa - pb;
            return b.id - a.id;
        });
    }

    // FINAL GUARANTEE: If filtering yields 0 items but catalog has items, fallback to all catalog products!
    if (result.length === 0 && PRODUCTS.length > 0) {
        result = [...PRODUCTS];
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
                <img src="${getProductMainImage(p)}" alt="${p.name}" loading="lazy">
                <div class="product-quick-view">
                    <button class="quick-view-btn">QUICK VIEW</button>
                </div>
            </div>
            <div class="product-info" onclick="openProductModal(${p.id})">
                <div class="product-brand">${getProductBrand(p)}</div>
                <span class="product-category">${p.department} / ${p.category}</span>
                <h3 class="product-name">${p.name}</h3>
                <span class="product-price">${formatPrice(p.price)}</span>
            </div>
        `;

        productGrid.appendChild(productCard);
    });
}

// OPEN LOOKBOOK PRODUCT FROM INSTAGRAM
function openLookbookProduct(lookIndex) {
    const product = PRODUCTS[lookIndex - 1] || PRODUCTS[0];
    if (product) {
        openProductModal(product.id);
    }
}

// OPEN PRODUCT DETAILS MODAL
function openProductModal(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    activeModalProduct = product;
    selectedSize = ""; // Reset size choice

    modalProductImg.src = getProductMainImage(product);
    modalProductImg.alt = product.name;
    
    const brandEl = document.getElementById("modalProductBrand");
    if (brandEl) brandEl.textContent = getProductBrand(product);
    
    modalProductCategory.textContent = `${product.department} / ${product.category}`;
    modalProductName.textContent = product.name;
    modalProductPrice.textContent = formatPrice(product.price);
    modalProductDesc.textContent = product.description;

    if (product.preorder) {
        modalAddToCartBtn.textContent = "PRE-ORDER NOW";
    } else {
        modalAddToCartBtn.textContent = "ADD TO CART";
    }

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
            
        const isPreorder = !!product.preorder;
            
        if (stock <= 0 && !isPreorder) {
            btn.classList.add("out-of-stock");
            btn.textContent = `${size} (OUT)`;
            btn.disabled = true;
        } else {
            btn.textContent = size;
            btn.onclick = () => selectSize(size, btn);
        }
        
        if (selectedSize === size && (stock > 0 || isPreorder)) {
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

    // Dynamic color-to-image gallery switching by index mapping
    const colors = activeModalProduct.colors || ["Black", "Charcoal", "Grey"];
    const colorIndex = colors.indexOf(color);
    const galleryImages = getProductGalleryImages(activeModalProduct);
    
    if (galleryImages.length > 0) {
        const selectedImg = galleryImages[colorIndex] || galleryImages[0];
        const mainImg = document.getElementById("modalProductImg");
        if (mainImg) {
            mainImg.src = selectedImg;
            mainImg.style.transform = "scale(1)"; // Reset zoom
        }

        // Highlight matching thumbnail in gallery
        const thumbnailGrid = document.getElementById("thumbnailGrid");
        if (thumbnailGrid) {
            const thumbs = thumbnailGrid.querySelectorAll("img");
            thumbs.forEach((t, idx) => {
                if (idx === colorIndex || t.src === selectedImg) {
                    t.classList.add("active");
                } else {
                    t.classList.remove("active");
                }
            });
        }
    }
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

    addToCart(activeModalProduct.id, selectedSize, 1, selectedColor, !!activeModalProduct.preorder);
    closeProductModal();
    toggleCartDrawer(true);
}

function getItemAvailableStock(product, size, color) {
    if (!product) return 0;
    
    const reqSize = size || "M";
    const reqColor = color || (product.colors && product.colors[0]) || "Black";
    const key = `${reqSize}-${reqColor}`;

    if (product.inventory) {
        if (typeof product.inventory[key] === 'number') {
            return product.inventory[key];
        }
        if (typeof product.inventory[reqSize] === 'number') {
            return product.inventory[reqSize];
        }
    }
    
    if (product.sizes && typeof product.sizes === 'object' && reqSize) {
        if (typeof product.sizes[reqSize] === 'number') {
            return product.sizes[reqSize];
        }
    }

    if (typeof product.stock === 'number') return product.stock;
    if (typeof product.quantity === 'number') return product.quantity;

    return 999;
}

function addToCart(productId, size, quantity = 1, color = "Black", preorder = false) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    if (!preorder && !product.preorder) {
        const avail = getItemAvailableStock(product, size, color);
        const existingIndex = cart.findIndex(item => item.id === productId && item.size === size && (item.color || "Black") === color);
        const currentInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;
        
        if ((currentInCart + quantity) > avail) {
            alert(`❌ لا يمكن إضافة المنتج للسلة!\n\nالكمية المطلوبة من (${product.name} - مقاس ${size}) تجاوزت المتوفر في المخزون.\n\nالمتوفر في المخزون حالياً: ${avail} قطعة فقط.`);
            return;
        }
    }

    // Check if item already in cart with same size and color
    const existingIndex = cart.findIndex(item => item.id === productId && item.size === size && (item.color || "Black") === color);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: getProductMainImage(product),
            size: size,
            color: color,
            quantity: quantity,
            preorder: preorder || !!product.preorder
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
                ${item.preorder ? '<span style="font-size: 0.9rem; font-weight: 700; color: var(--color-accent); letter-spacing: 0.05em; display: block; margin-top: 0.4rem;">PRE-ORDER</span>' : ''}
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

    // Reset coupon code input and active coupon
    activeCoupon = null;
    const couponInput = document.getElementById("checkoutCouponInput");
    if (couponInput) couponInput.value = "";
    const couponMessage = document.getElementById("couponMessage");
    if (couponMessage) {
        couponMessage.style.display = "none";
        couponMessage.innerHTML = "";
    }

    updateCheckoutSummary();

    // Display modal
    checkoutModalBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
}

function updateCheckoutSummary() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Read dynamic settings
    const shippingFee = parseFloat(STORE_SETTINGS.shipping_fee) || 5;
    const freeThreshold = parseFloat(STORE_SETTINGS.free_shipping_threshold) || 150;
    
    const shipping = subtotal >= freeThreshold ? 0 : shippingFee;
    
    let discount = 0;
    if (activeCoupon) {
        if (activeCoupon.discountType === 'percent') {
            discount = (subtotal * activeCoupon.discountValue) / 100;
        } else if (activeCoupon.discountType === 'fixed') {
            discount = Math.min(subtotal, activeCoupon.discountValue);
        }
    }
    
    const total = subtotal - discount + shipping;

    checkoutOrderSummary.innerHTML = "";
    
    // Add cart items
    cart.forEach(item => {
        const row = document.createElement("div");
        row.classList.add("summary-item-row");
        row.innerHTML = `
            <span>${item.name} (x${item.quantity}) [Size: ${item.size}]${item.preorder ? ' <strong style="color: var(--color-accent); font-size: 0.85rem; letter-spacing: 0.05em;">(PRE-ORDER)</strong>' : ''}</span>
            <span>${formatPrice(item.price * item.quantity)}</span>
        `;
        checkoutOrderSummary.appendChild(row);
    });

    // Add subtotal row
    const subtotalRow = document.createElement("div");
    subtotalRow.classList.add("summary-item-row");
    subtotalRow.style.borderTop = "1px solid var(--color-border)";
    subtotalRow.style.paddingTop = "1rem";
    subtotalRow.innerHTML = `
        <span>SUBTOTAL</span>
        <span>${formatPrice(subtotal)}</span>
    `;
    checkoutOrderSummary.appendChild(subtotalRow);

    // Add discount row if coupon active
    if (discount > 0) {
        const discountRow = document.createElement("div");
        discountRow.classList.add("summary-item-row");
        discountRow.style.color = "#2ecc71";
        discountRow.innerHTML = `
            <span>DISCOUNT (${activeCoupon.code})</span>
            <span>-${formatPrice(discount)}</span>
        `;
        checkoutOrderSummary.appendChild(discountRow);
    }

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
        <span id="checkoutGrandTotal">${formatPrice(total)}</span>
    `;
    checkoutOrderSummary.appendChild(totalRow);
}

async function applyCouponCode() {
    const code = document.getElementById("checkoutCouponInput").value.trim().toUpperCase();
    const msgEl = document.getElementById("couponMessage");
    if (!msgEl) return;

    if (!code) {
        msgEl.style.display = "block";
        msgEl.style.color = "var(--color-error)";
        msgEl.textContent = "Please enter coupon code first.";
        return;
    }

    try {
        const response = await fetch(`/api/coupons/validate?code=${code}`);
        const result = await response.json();

        if (response.ok && result.valid) {
            activeCoupon = result;
            msgEl.style.display = "block";
            msgEl.style.color = "#2ecc71";
            msgEl.textContent = `Coupon applied successfully! Discount: ${result.discountType === 'percent' ? result.discountValue + '%' : formatPrice(result.discountValue)}`;
            updateCheckoutSummary();
        } else {
            activeCoupon = null;
            msgEl.style.display = "block";
            msgEl.style.color = "var(--color-error)";
            msgEl.textContent = result.error || "Invalid or expired coupon code.";
            updateCheckoutSummary();
        }
    } catch (e) {
        console.error("Error validating coupon:", e);
        msgEl.style.display = "block";
        msgEl.style.color = "var(--color-error)";
        msgEl.textContent = "Error occurred while validating coupon.";
    }
}

function closeCheckoutModal() {
    checkoutModalBackdrop.classList.remove("active");
    document.body.style.overflow = "";
}

// HANDLE CHECKOUT SUBMIT
function handleCheckoutSubmit(event) {
    event.preventDefault();
    
    // Simulate API Call / Processing
    // Stock Validation Check for Website Checkout
    for (const item of cart) {
        if (!item.preorder) {
            const prod = PRODUCTS.find(p => String(p.id) === String(item.id));
            if (prod) {
                const avail = getItemAvailableStock(prod, item.size, item.color);
                if (item.quantity > avail) {
                    alert(`❌ لا يمكن إتمام الطلب!\n\nالكمية المطلوبة من (${item.name} - مقاس ${item.size}) غير متوفرة في المخزون.\n\nالكمية المطلوبة: ${item.quantity} قطعة | المتوفر في المخزون: ${avail} قطعة فقط.`);
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    return;
                }
            }
        }
    }

    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shippingFee = parseFloat(STORE_SETTINGS.shipping_fee) || 5;
    const freeThreshold = parseFloat(STORE_SETTINGS.free_shipping_threshold) || 150;
    const shipping = subtotal >= freeThreshold ? 0 : shippingFee;
    
    let discount = 0;
    if (activeCoupon) {
        if (activeCoupon.discountType === 'percent') {
            discount = (subtotal * activeCoupon.discountValue) / 100;
        } else if (activeCoupon.discountType === 'fixed') {
            discount = Math.min(subtotal, activeCoupon.discountValue);
        }
    }
    const total = subtotal - discount + shipping;
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
            // Fetch latest orders and products to sync local stock state
            await loadOrdersFromServer();
            await loadProductsFromServer();

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
    const currentTheme = document.body.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("styluxe_theme", newTheme);
    
    updateThemeIcon(newTheme);
}

function initTheme() {
    const savedTheme = localStorage.getItem("styluxe_theme") || "dark";
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
    if (currentAdminStaff) {
        initAdminDashboard();
        return;
    }
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
        } else if (pass === "pos123") {
            currentAdminDept = "Global";
            currentAdminStaff = { name: "POS Operator", email: "", role: "Cashier", permissions: ["pos_access"] };
        } else if (pass === "admin123") {
            currentAdminDept = "Global";
            currentAdminStaff = { name: "Global Admin", email: "", role: "Administrator", permissions: ["manage_products", "manage_orders", "pos_access", "manage_staff"] };
        } else {
            loginError.textContent = "INCORRECT ACCESS CODE.";
            loginError.style.display = "block";
            return;
        }
        currentAdminPassword = pass;
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
                currentAdminPassword = pass;
                
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

    // Hide quick-return floating button when dashboard is open
    const floatingBtn = document.getElementById("floatingAdminDashboardBtn");
    if (floatingBtn) floatingBtn.style.display = "none";

    // Toggle overlay
    adminPanelOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    // Switch to overview tab, or straight to POS if user is cashier only (pos_access only)
    const perms = currentAdminStaff ? currentAdminStaff.permissions || [] : [];
    const isCashierOnly = perms.includes("pos_access") && !perms.includes("manage_products") && !perms.includes("manage_orders");
    
    const urlParams = new URLSearchParams(window.location.search);
    const activeTabFromUrl = urlParams.get("tab");
    const initialTab = activeTabFromUrl || (isCashierOnly ? "pos" : "overview");
    
    if (currentAdminStaff) {
        sessionStorage.setItem("styluxe_admin_staff", JSON.stringify(currentAdminStaff));
        sessionStorage.setItem("styluxe_admin_dept", currentAdminDept);
        sessionStorage.setItem("styluxe_admin_password", currentAdminPassword);
    }
    
    // Push initial history state
    history.pushState({ admin: true, tab: initialTab }, "Admin Dashboard", `?admin=true&tab=${initialTab}`);
    switchAdminTab(initialTab, false);
}

function logoutAdmin() {
    const container = document.querySelector(".admin-panel-container");
    if (container) container.classList.remove("pos-mode");
    currentAdminDept = "";
    currentAdminStaff = null;
    currentAdminPassword = "";
    
    sessionStorage.removeItem("styluxe_admin_staff");
    sessionStorage.removeItem("styluxe_admin_dept");
    sessionStorage.removeItem("styluxe_admin_password");
    
    history.pushState(null, "Styluxe", "?");
    window.dispatchEvent(new Event("popstate"));
}

function exitPosMode() {
    switchAdminTab("overview");
}

function viewStorefrontAsAdmin() {
    history.pushState(null, "Styluxe", "?");
    window.dispatchEvent(new Event("popstate"));
}

// Switch tabs inside admin panel
function switchAdminTab(tab, pushState = true) {
    adminActiveTab = tab;

    const container = document.querySelector(".admin-panel-container");
    if (container) {
        if (tab === "pos") {
            container.classList.add("pos-mode");
        } else {
            container.classList.remove("pos-mode");
        }
    }

    if (pushState && currentAdminStaff) {
        history.pushState({ admin: true, tab: tab }, "Admin Dashboard", `?admin=true&tab=${tab}`);
    }

    // Toggle active classes on sidebar navigation buttons
    const navButtons = document.querySelectorAll(".admin-nav-btn");
    navButtons.forEach(btn => {
        const idMap = {
            overview: "btnTabOverview",
            products: "btnTabProducts",
            categories: "btnTabCategories",
            brands: "btnTabBrands",
            orders: "btnTabOrders",
            customers: "btnTabCustomers",
            staff: "btnTabStaff",
            suppliers: "btnTabSuppliers",
            settings: "btnTabSettings",
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
            categories: "adminTabCategories",
            brands: "adminTabBrands",
            orders: "adminTabOrders",
            customers: "adminTabCustomers",
            staff: "adminTabStaff",
            suppliers: "adminTabSuppliers",
            settings: "adminTabSettings",
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
    } else if (tab === "categories") {
        renderAdminCategories();
    } else if (tab === "brands") {
        renderAdminBrands();
    } else if (tab === "orders") {
        renderAdminOrders();
    } else if (tab === "customers") {
        renderAdminCustomers();
    } else if (tab === "settings") {
        populateSettingsFields();
        renderAdminCoupons();
    } else if (tab === "staff") {
        renderStaffList();
    } else if (tab === "suppliers") {
        renderAdminSuppliers();
    } else if (tab === "pos") {
        renderAdminPos();
    }
}

// 1. Overview Tab Render
function renderAdminOverview() {
    const totalSales = ordersList.reduce((sum, order) => sum + order.total, 0);
    const totalOrdersCount = ordersList.length;
    const avgOrderValue = totalOrdersCount > 0 ? (totalSales / totalOrdersCount) : 0;
    const totalCustCount = usersList.length;

    let totalCost = 0;
    ordersList.forEach(order => {
        (order.items || []).forEach(item => {
            const prod = PRODUCTS.find(p => p.id === item.id);
            const cost = prod && prod.costPrice !== undefined ? prod.costPrice : (item.price * 0.6);
            totalCost += cost * item.quantity;
        });
    });
    const totalProfit = totalSales - totalCost;

    const salesEl = document.getElementById("statTotalSales");
    const profitEl = document.getElementById("statTotalProfit");
    const ordersEl = document.getElementById("statTotalOrders");
    const aovEl = document.getElementById("statAvgOrderValue");
    const custEl = document.getElementById("statTotalCustomers");

    if (salesEl) salesEl.textContent = formatPrice(totalSales);
    if (profitEl) profitEl.textContent = formatPrice(totalProfit);
    if (ordersEl) ordersEl.textContent = totalOrdersCount;
    if (aovEl) aovEl.textContent = formatPrice(avgOrderValue);
    if (custEl) custEl.textContent = totalCustCount;

    // --- Chart 1: Monthly Sales ---
    const monthlySalesContainer = document.getElementById("monthlySalesChartContainer");
    if (monthlySalesContainer) {
        const monthlyTotals = {};
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthName = d.toLocaleString('default', { month: 'short' });
            months.push(monthName);
            monthlyTotals[monthName] = 0;
        }

        ordersList.forEach(o => {
            if (o.status !== 'Cancelled' && o.date) {
                const orderDate = new Date(o.date);
                const mName = orderDate.toLocaleString('default', { month: 'short' });
                if (monthlyTotals[mName] !== undefined) {
                    monthlyTotals[mName] += parseFloat(o.total) || 0;
                }
            }
        });

        const maxVal = Math.max(...Object.values(monthlyTotals), 1);
        let barHtml = `<div style="display: flex; align-items: flex-end; justify-content: space-around; width: 100%; height: 100%; padding: 0 1rem; position: relative;">`;
        barHtml += `
          <div style="position: absolute; left: 0; right: 0; bottom: 50px; height: 1px; background: rgba(255,255,255,0.05); z-index: 1;"></div>
          <div style="position: absolute; left: 0; right: 0; bottom: 100px; height: 1px; background: rgba(255,255,255,0.05); z-index: 1;"></div>
          <div style="position: absolute; left: 0; right: 0; bottom: 150px; height: 1px; background: rgba(255,255,255,0.05); z-index: 1;"></div>
        `;
        months.forEach(m => {
            const val = monthlyTotals[m];
            const heightPercent = (val / maxVal) * 80;
            barHtml += `
                <div style="display: flex; flex-direction: column; align-items: center; width: 14%; z-index: 2; position: relative; height: 100%; justify-content: flex-end;">
                    <div style="font-size: 1rem; font-weight: 700; color: var(--color-accent); margin-bottom: 0.5rem; opacity: 0; transition: opacity 0.2s; position: absolute; bottom: calc(${heightPercent}% + 35px); background: rgba(0,0,0,0.85); border: 1px solid var(--color-border); padding: 0.3rem 0.6rem; border-radius: 4px; white-space: nowrap; pointer-events: none;" class="bar-tooltip">${formatPrice(val)}</div>
                    <div style="width: 100%; height: ${heightPercent}%; background: linear-gradient(to top, var(--color-accent), #b8912e); border-radius: 4px 4px 0 0; transition: height 0.5s ease-out; cursor: pointer;" onmouseover="this.previousElementSibling.style.opacity=1" onmouseout="this.previousElementSibling.style.opacity=0"></div>
                </div>
            `;
        });
        barHtml += `</div>`;
        monthlySalesContainer.innerHTML = barHtml;

        const labelsDiv = document.getElementById("monthlySalesLabels");
        if (labelsDiv) {
            labelsDiv.innerHTML = months.map(m => `<span style="width: 14%; text-align: center;">${m.toUpperCase()}</span>`).join('');
        }
    }

    // --- Chart 2: Category Share ---
    const donutContainer = document.getElementById("categoryDonutChartContainer");
    const legendDiv = document.getElementById("categoryChartLegend");
    if (donutContainer && legendDiv) {
        const categories = ["Hoodies", "Jackets", "Jeans", "Footwear"];
        const catTotals = {};
        categories.forEach(cat => catTotals[cat] = 0);

        ordersList.forEach(order => {
            if (order.status !== 'Cancelled') {
                order.items.forEach(item => {
                    const prod = PRODUCTS.find(p => p.id === item.id);
                    if (prod && categories.includes(prod.category)) {
                        catTotals[prod.category] += item.quantity;
                    }
                });
            }
        });

        const totalQty = Object.values(catTotals).reduce((a, b) => a + b, 0) || 1;
        const colors = ["#c7a369", "#3498db", "#2ecc71", "#9b59b6"];
        
        let svgHtml = `<svg width="200" height="200" viewBox="0 0 200 200" style="transform: rotate(-90deg); width: 100%; height: 100%;">`;
        svgHtml += `<circle cx="100" cy="100" r="70" fill="transparent" stroke="var(--color-border)" stroke-width="16" />`;
        
        let currentOffset = 0;
        categories.forEach((cat, idx) => {
            const qty = catTotals[cat];
            const percent = qty / totalQty;
            const strokeLength = percent * 439.8;
            const strokeOffset = 439.8 - strokeLength + currentOffset;

            svgHtml += `
                <circle cx="100" cy="100" r="70" fill="transparent" 
                    stroke="${colors[idx]}" 
                    stroke-width="16" 
                    stroke-dasharray="439.8" 
                    stroke-dashoffset="${strokeOffset}" 
                    style="transition: stroke-dashoffset 0.6s ease-out; cursor: pointer;"
                    title="${cat}: ${qty} pcs (${Math.round(percent * 100)}%)" />
            `;
            currentOffset -= strokeLength;
        });

        svgHtml += `
            <circle cx="100" cy="100" r="58" fill="var(--color-surface)" />
            <text x="100" y="93" text-anchor="middle" font-family="var(--font-heading)" font-size="14" font-weight="700" fill="var(--color-text-muted)" transform="rotate(90 100 100)">TOTAL ITEMS</text>
            <text x="100" y="115" text-anchor="middle" font-family="var(--font-heading)" font-size="20" font-weight="700" fill="var(--color-accent)" transform="rotate(90 100 100)">${totalQty}</text>
        </svg>`;
        donutContainer.innerHTML = svgHtml;

        let legendHtml = "";
        categories.forEach((cat, idx) => {
            const qty = catTotals[cat];
            const percent = Math.round((qty / totalQty) * 100);
            legendHtml += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.02);">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${colors[idx]}; flex-shrink: 0;"></div>
                        <span style="font-weight: 600; font-size: 1rem;">${cat.toUpperCase()}</span>
                    </div>
                    <div style="text-align: right; font-weight: 700; font-size: 1rem;">
                        <span>${qty} pcs</span>
                        <span style="color: var(--color-text-muted); font-size: 0.85rem; margin-left: 0.5rem;">(${percent}%)</span>
                    </div>
                </div>
            `;
        });
        legendDiv.innerHTML = legendHtml;
    }
}

let currentAdminCategoryFilter = "All";

function filterAdminProductsByCategory(catName) {
    currentAdminCategoryFilter = catName || "All";
    
    // Switch to Products Tab in Admin
    if (typeof switchAdminTab === "function") {
        switchAdminTab("products");
    }
    
    const catSelect = document.getElementById("adminProductCategoryFilter");
    if (catSelect) catSelect.value = currentAdminCategoryFilter;
    
    renderAdminProducts();
}

function onAdminCategoryFilterChange(val) {
    currentAdminCategoryFilter = val;
    renderAdminProducts();
}

// 2. Product Manager Tab Render
function renderAdminProducts() {
    const tableBody = document.getElementById("adminProductsTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    // Populate Category filter dropdown in Admin Products header
    const catSelect = document.getElementById("adminProductCategoryFilter");
    if (catSelect) {
        catSelect.innerHTML = `<option value="All">ALL CATEGORIES</option>`;
        const availableCats = CATEGORIES
            .filter(c => currentAdminDept === "Global" || (c.department && c.department.toLowerCase() === currentAdminDept.toLowerCase()))
            .map(c => c.name);
        
        PRODUCTS.forEach(p => {
            if (p.category && !availableCats.includes(p.category)) {
                availableCats.push(p.category);
            }
        });

        const uniqueCats = [...new Set(availableCats)];
        uniqueCats.forEach(cName => {
            if (cName) {
                const opt = document.createElement("option");
                opt.value = cName;
                opt.textContent = cName.toUpperCase();
                catSelect.appendChild(opt);
            }
        });
        catSelect.value = currentAdminCategoryFilter || "All";
    }

    let filtered = currentAdminDept === "Global" 
        ? PRODUCTS 
        : PRODUCTS.filter(p => p.department && p.department.toLowerCase() === currentAdminDept.toLowerCase());

    // Apply Smart Admin Category Filter
    if (currentAdminCategoryFilter && currentAdminCategoryFilter !== "All") {
        filtered = filtered.filter(p => p.category && p.category.trim().toLowerCase() === currentAdminCategoryFilter.trim().toLowerCase());
    }

    if (filtered.length === 0) {
        const catMsg = (currentAdminCategoryFilter && currentAdminCategoryFilter !== "All")
            ? `NO PRODUCTS RECORDED IN CATEGORY "${currentAdminCategoryFilter.toUpperCase()}".`
            : "NO PRODUCTS RECORDED YET.";

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: 4rem 0;">
                    <i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--color-accent); display: block;"></i>
                    ${catMsg}
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement("tr");
        tr.setAttribute("draggable", "true");
        tr.classList.add("draggable-row");
        tr.setAttribute("data-id", p.id);

        const inventoryStr = Object.entries(p.inventory || {})
            .map(([key, val]) => `${key}: ${val}`)
            .join(" | ");

        tr.innerHTML = `
            <td style="cursor: grab; color: var(--color-text-muted); text-align: center; font-size: 1.4rem;"><i class="fa-solid fa-grip-vertical"></i></td>
            <td><strong>#${p.id}</strong></td>
            <td><img src="${getProductMainImage(p)}" alt="${p.name}"></td>
            <td>
                <strong>${p.name}</strong> ${p.preorder ? '<span style="background-color: var(--color-accent); color: #000; font-size: 0.9rem; font-weight: 700; padding: 0.1rem 0.5rem; border-radius: 3px; margin-left: 0.5rem; vertical-align: middle;">PRE-ORDER</span>' : ''}
                <div style="font-size: 1.1rem; color: var(--color-text-muted); margin-top: 0.3rem; display: flex; align-items: center; gap: 0.8rem;">
                    <span>Priority: ${p.priority !== undefined ? p.priority : 1000}</span>
                    <button onclick="moveProductToTop(${p.id})" style="background: none; color: var(--color-accent); border: none; cursor: pointer; font-size: 1.2rem; padding: 0.2rem;" title="Move to Top"><i class="fa-solid fa-angles-up"></i></button>
                    <button onclick="moveProductToBottom(${p.id})" style="background: none; color: var(--color-accent); border: none; cursor: pointer; font-size: 1.2rem; padding: 0.2rem;" title="Move to Bottom"><i class="fa-solid fa-angles-down"></i></button>
                </div>
            </td>
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
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <button class="admin-edit-btn" onclick="openEditProductModal(${p.id})" aria-label="Edit product" style="background: none; border: none; color: var(--color-accent); font-size: 1.4rem; cursor: pointer;" title="Edit Product"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="admin-delete-btn" onclick="deleteProduct(${p.id})" aria-label="Delete product" style="background: none; border: none; color: #ff4d4d; font-size: 1.4rem; cursor: pointer;" title="Delete Product"><i class="fa-regular fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    setupAdminProductsDragAndDrop();
}

function setupAdminProductsDragAndDrop() {
    const tableBody = document.getElementById("adminProductsTableBody");
    if (!tableBody) return;

    let draggingRow = null;

    tableBody.addEventListener("dragstart", (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;
        draggingRow = tr;
        tr.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/html", tr.innerHTML);
    });

    tableBody.addEventListener("dragover", (e) => {
        e.preventDefault();

        // Auto-scroll window if dragging near top/bottom boundaries of viewport
        const scrollThreshold = 80;
        const scrollSpeed = 15;
        if (e.clientY < scrollThreshold) {
            window.scrollBy(0, -scrollSpeed);
        } else if (window.innerHeight - e.clientY < scrollThreshold) {
            window.scrollBy(0, scrollSpeed);
        }

        const tr = e.target.closest("tr");
        if (!tr || tr === draggingRow || !tr.classList.contains("draggable-row")) return;

        const bounding = tr.getBoundingClientRect();
        const offset = e.clientY - bounding.top;
        if (offset > bounding.height / 2) {
            tr.after(draggingRow);
        } else {
            tr.before(draggingRow);
        }
    });

    tableBody.addEventListener("dragend", async (e) => {
        if (draggingRow) {
            draggingRow.classList.remove("dragging");
            draggingRow = null;
        }

        const rows = tableBody.querySelectorAll("tr.draggable-row");
        const batchOrders = [];
        rows.forEach((row, index) => {
            const pId = row.dataset.id;
            const newPriority = (index + 1) * 10;
            batchOrders.push({ id: pId, priority: newPriority });
        });

        try {
            const res = await fetch("/api/products/reorder-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orders: batchOrders })
            });
            if (res.ok) {
                await loadProductsFromServer();
                batchOrders.forEach(item => {
                    const p = PRODUCTS.find(prod => prod.id === parseInt(item.id));
                    if (p) p.priority = item.priority;
                });
                renderProducts();
                
                rows.forEach((row, index) => {
                    const prioritySpan = row.querySelector("td:nth-child(4) div span");
                    if (prioritySpan) {
                        prioritySpan.textContent = `Priority: ${(index + 1) * 10}`;
                    }
                });
            }
        } catch (err) {
            console.error("Failed to update priorities batch:", err);
        }
    });
}

async function moveProductToTop(productId) {
    const filtered = currentAdminDept === "Global" 
        ? PRODUCTS 
        : PRODUCTS.filter(p => p.department === currentAdminDept);
    
    if (filtered.length === 0) return;

    let minPriority = 1000;
    filtered.forEach(p => {
        const prio = p.priority !== undefined ? p.priority : 1000;
        if (prio < minPriority) {
            minPriority = prio;
        }
    });

    const newPriority = minPriority - 10;

    try {
        const res = await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: productId, priority: newPriority })
        });
        if (res.ok) {
            await loadProductsFromServer();
            renderAdminProducts();
        }
    } catch (err) {
        console.error("Failed to move product to top:", err);
    }
}

async function moveProductToBottom(productId) {
    const filtered = currentAdminDept === "Global" 
        ? PRODUCTS 
        : PRODUCTS.filter(p => p.department === currentAdminDept);
    
    if (filtered.length === 0) return;

    let maxPriority = 0;
    filtered.forEach(p => {
        const prio = p.priority !== undefined ? p.priority : 1000;
        if (prio > maxPriority) {
            maxPriority = prio;
        }
    });

    const newPriority = maxPriority + 10;

    try {
        const res = await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: productId, priority: newPriority })
        });
        if (res.ok) {
            await loadProductsFromServer();
            renderAdminProducts();
        }
    } catch (err) {
        console.error("Failed to move product to bottom:", err);
    }
}

// Add/Delete/Edit Products helpers
function openAddProductModal() {
    isEditingProduct = false;
    editingProductId = null;

    const titleEl = document.getElementById("productModalTitle");
    if (titleEl) titleEl.textContent = "ADD NEW PRODUCT";

    addProductForm.reset();

    const fileInput = document.getElementById("newProdImgFile");
    if (fileInput) {
        fileInput.value = "";
        fileInput.required = false;
    }

    const previewDiv = document.getElementById("newProdImgPreviews");
    if (previewDiv) {
        previewDiv.innerHTML = "";
        delete previewDiv.dataset.existingImages;
    }

    const brandSelect = document.getElementById("newProdBrand");
    if (brandSelect) brandSelect.selectedIndex = 0;

    if (window.updateDefaultSizesAndInventoryGrid) {
        window.updateDefaultSizesAndInventoryGrid();
    }
    if (window.updateColorImagesUploadContainer) {
        window.updateColorImagesUploadContainer();
    }
    addProductModalBackdrop.classList.add("active");
}

function closeAddProductModal() {
    addProductModalBackdrop.classList.remove("active");
}

function openEditProductModal(productId) {
    const prod = PRODUCTS.find(p => p.id === productId);
    if (!prod) return;

    isEditingProduct = true;
    editingProductId = productId;

    const titleEl = document.getElementById("productModalTitle");
    if (titleEl) titleEl.textContent = "EDIT PRODUCT";

    document.getElementById("newProdName").value = prod.name;
    document.getElementById("newProdPriority").value = prod.priority || 1000;
    
    const deptSelect = document.getElementById("newProdDept");
    if (deptSelect) {
        deptSelect.value = prod.department;
        if (currentAdminDept === "Global") {
            deptSelect.disabled = false;
        }
    }
    
    updateCategoriesDatalist();
    
    const catSelect = document.getElementById("newProdCategory");
    if (catSelect) catSelect.value = prod.category;

    const brandSelect = document.getElementById("newProdBrand");
    if (brandSelect) brandSelect.value = prod.brand || "Styluxe";

    document.getElementById("newProdPrice").value = prod.price;
    document.getElementById("newProdCostPrice").value = prod.costPrice || (prod.price * 0.6).toFixed(2);
    document.getElementById("newProdSizes").value = prod.sizes ? prod.sizes.join(", ") : "";
    document.getElementById("newProdColors").value = prod.colors ? prod.colors.join(", ") : "";
    document.getElementById("newProdDesc").value = prod.description || "";
    document.getElementById("newProdPreorder").checked = !!prod.preorder;

    const fileInput = document.getElementById("newProdImgFile");
    if (fileInput) {
        fileInput.value = "";
        fileInput.required = false; 
    }

    const previewDiv = document.getElementById("newProdImgPreviews");
    if (previewDiv) {
        previewDiv.innerHTML = "";
        const imgs = getProductGalleryImages(prod);
        imgs.forEach(imgSrc => {
            const imgEl = document.createElement("img");
            imgEl.src = imgSrc;
            imgEl.style.width = "60px";
            imgEl.style.height = "60px";
            imgEl.style.objectFit = "cover";
            imgEl.style.borderRadius = "4px";
            imgEl.style.border = "1px solid var(--color-border)";
            previewDiv.appendChild(imgEl);
        });
        previewDiv.dataset.existingImages = prod.image || "";
    }

    if (window.updateDynamicInventoryGrid) {
        window.updateDynamicInventoryGrid();
        
        setTimeout(() => {
            const gridContainer = document.getElementById("dynamicInventoryGrid");
            const inputs = gridContainer ? gridContainer.querySelectorAll(".inv-qty-input") : [];
            inputs.forEach(input => {
                const key = input.dataset.key;
                if (prod.inventory && prod.inventory[key] !== undefined) {
                    input.value = prod.inventory[key];
                }
            });
        }, 50);
    }

    if (window.updateColorImagesUploadContainer) {
        window.updateColorImagesUploadContainer();
        const existingImages = prod.image ? splitProductImages(prod.image) : [];
        const colors = prod.colors || ["Black", "Charcoal", "Grey"];
        colors.forEach((color, idx) => {
            const imgUrl = existingImages[idx] || "";
            if (imgUrl) {
                const row = document.querySelector(`.color-image-row[data-color="${color}"]`);
                if (row) {
                    const previewDiv = row.querySelector(".color-img-preview");
                    const img = previewDiv ? previewDiv.querySelector("img") : null;
                    if (previewDiv && img) {
                        img.src = imgUrl;
                        previewDiv.style.display = "block";
                    }
                }
            }
        });
    }

    addProductModalBackdrop.classList.add("active");
}

async function handleNewProductSubmit(event) {
    event.preventDefault();

    const gridContainer = document.getElementById("dynamicInventoryGrid");
    const qtyInputs = gridContainer ? gridContainer.querySelectorAll(".inv-qty-input") : [];
    const inventoryArray = [];
    qtyInputs.forEach(input => {
        const key = input.dataset.key;
        const val = parseInt(input.value) || 0;
        inventoryArray.push(`${key}:${val}`);
    });
    const inventoryStr = inventoryArray.join(", ");
    const inventoryInput = document.getElementById("newProdInventory");
    if (inventoryInput) {
        inventoryInput.value = inventoryStr;
    }

    const name = document.getElementById("newProdName").value;
    const category = document.getElementById("newProdCategory").value;
    const price = parseFloat(document.getElementById("newProdPrice").value);
    const costPrice = parseFloat(document.getElementById("newProdCostPrice").value) || 0;
    const priority = parseInt(document.getElementById("newProdPriority").value) || 1000;
    const sizes = document.getElementById("newProdSizes").value;
    const colors = document.getElementById("newProdColors").value;
    const inventory = document.getElementById("newProdInventory").value;
    const desc = document.getElementById("newProdDesc").value;
    const brand = document.getElementById("newProdBrand").value;

    const colorRows = document.querySelectorAll(".color-image-row");
    const imgArray = [];
    let hasAtLeastOneImg = false;

    for (let row of colorRows) {
        const previewImg = row.querySelector(".color-img-preview img");
        const previewDiv = row.querySelector(".color-img-preview");
        if (previewDiv && previewDiv.style.display !== "none" && previewImg && previewImg.src) {
            imgArray.push(previewImg.src);
            hasAtLeastOneImg = true;
        } else {
            imgArray.push("");
        }
    }

    let img = "";
    if (hasAtLeastOneImg) {
        img = imgArray.join(",");
    } else {
        const fileInput = document.getElementById("newProdImgFile");
        const previewDiv = document.getElementById("newProdImgPreviews");
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            try {
                const base64Promises = Array.from(fileInput.files).map(file => getFileBase64(file));
                const base64Array = await Promise.all(base64Promises);
                img = base64Array.join(",");
            } catch (e) {
                alert("Error reading product image files.");
                return;
            }
        } else if (isEditingProduct && previewDiv && previewDiv.dataset.existingImages) {
            img = previewDiv.dataset.existingImages;
        }
    }

    if (!img) {
        alert("PLEASE SELECT AT LEAST ONE PRODUCT IMAGE FILE.");
        return;
    }

    const deptSelect = document.getElementById("newProdDept");
    const department = deptSelect ? deptSelect.value : (currentAdminDept === "Global" ? "Men" : currentAdminDept);

    const preorder = document.getElementById("newProdPreorder").checked;

    const productData = {
        name: name.toUpperCase(),
        category: category,
        department: department,
        price: price,
        costPrice: costPrice,
        priority: priority,
        image: img,
        description: desc,
        sizes: sizes,
        colors: colors,
        inventory: inventory,
        badge: preorder ? "PRE-ORDER" : "NEW",
        brand: brand || "Styluxe",
        preorder: preorder
    };

    if (isEditingProduct) {
        productData.id = editingProductId;
    }

    const apiUrl = '/api/products';
    const apiMethod = isEditingProduct ? 'PUT' : 'POST';

    fetch(apiUrl, {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
    })
    .then(async res => {
        if (res.ok) {
            closeAddProductModal();
            // Reset active filters so newly created product is immediately visible
            activeCategory = "All";
            activeBrand = "All";
            if (activeDepartment !== "All" && activeDepartment.toLowerCase() !== department.toLowerCase()) {
                activeDepartment = "All";
            }
            await loadProductsFromServer(); 
            renderAdminProducts(); 
            renderProducts();
            event.target.reset();
            const previewDiv = document.getElementById("newProdImgPreviews");
            if (previewDiv) previewDiv.innerHTML = "";
        } else {
            const err = await res.json();
            alert("Error saving product: " + err.error);
        }
    })
    .catch(err => console.error("Error saving product:", err));
}

async function reorderProduct(id, action) {
    try {
        const res = await fetch('/api/products/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action })
        });
        if (res.ok) {
            await loadProductsFromServer();
            renderAdminProducts();
            renderProducts();
        } else {
            alert("FAILED TO REORDER PRODUCT.");
        }
    } catch (err) {
        console.error("Error reordering product:", err);
    }
}

async function deleteProduct(productId) {
    if (!confirm("ARE YOU SURE YOU WANT TO DELETE THIS PRODUCT PERMANENTLY?")) return;

    try {
        const response = await fetch(`/api/products?id=${productId}`, {
            method: "DELETE"
        });
        if (response.ok) {
            await loadProductsFromServer();
            renderAdminProducts();
            renderProducts();
        } else {
            alert("FAILED TO DELETE PRODUCT.");
        }
    } catch (err) {
        console.error("Error deleting product:", err);
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
        const itemSummary = o.items.map(item => `${item.name} (x${item.quantity}) [${item.size}]${item.preorder ? ' <strong style="color: var(--color-accent);">(PRE-ORDER)</strong>' : ''}`).join("<br>");
        
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.onclick = () => openAdminOrderDetailsModal(o.id);
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
            <td style="text-align: center;">
                <button class="admin-sticker-btn" onclick="event.stopPropagation(); printOrderSticker('${o.id}')" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: #ffffff; border: none; font-weight: 700; padding: 0.55rem 1.1rem; border-radius: 4px; font-size: 1.05rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(46,204,113,0.3);" title="Print Delivery Sticker for Customer Order">
                    <i class="fa-solid fa-print"></i> STICKER
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// 4. POS Terminal Render
let posDeptFilter = "All";

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
    
    // Get unique categories from products list, filtered by POS dept
    let prods = PRODUCTS;
    if (posDeptFilter !== "All") {
        prods = prods.filter(p => p.department.toLowerCase() === posDeptFilter.toLowerCase());
    }
    const uniqueCats = ["All", ...new Set(prods.map(p => p.category))];
    
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

function filterPosByDept(dept, btn) {
    posDeptFilter = dept;
    // Update active tab styling
    document.querySelectorAll(".pos-dept-tab").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    updatePosCategorySelect();
    filterPosCatalog();
}

function filterPosCatalog() {
    const query = document.getElementById("posSearchInput").value.toLowerCase();
    const cat = document.getElementById("posCategorySelect").value;
    
    posProductsGrid.innerHTML = "";

    let filtered = PRODUCTS;

    // Department filter
    if (posDeptFilter !== "All") {
        filtered = filtered.filter(p => p.department.toLowerCase() === posDeptFilter.toLowerCase());
    }

    if (cat !== "All") {
        filtered = filtered.filter(p => p.category === cat);
    }
    if (query !== "") {
        const keywords = query.split(/\s+/).filter(w => w.length > 0);
        filtered = filtered.filter(p => {
            const nameLower = p.name.toLowerCase();
            const brandLower = getProductBrand(p).toLowerCase();
            const categoryLower = p.category.toLowerCase();
            const deptLower = p.department.toLowerCase();
            const idStr = p.id.toString();
            const colorsLower = (p.colors || []).map(c => c.toLowerCase()).join(" ");
            const sizesLower = (p.sizes || []).map(s => s.toLowerCase()).join(" ");

            return keywords.every(keyword => 
                nameLower.includes(keyword) || 
                brandLower.includes(keyword) ||
                categoryLower.includes(keyword) ||
                deptLower.includes(keyword) ||
                colorsLower.includes(keyword) ||
                sizesLower.includes(keyword) ||
                idStr === keyword || 
                (`#${idStr}`) === keyword
            );
        });
    }

    if (filtered.length === 0) {
        posProductsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 4rem 0; color: var(--color-text-muted); font-size: 1.2rem;"><i class="fa-solid fa-box-open" style="font-size: 2.5rem; display: block; margin-bottom: 1rem;"></i>NO PRODUCTS FOUND</div>`;
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.classList.add("pos-prod-card");
        card.setAttribute("id", `pos-prod-${p.id}`);
        card.innerHTML = `
            <img src="${getProductMainImage(p)}" alt="${p.name}">
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
    const currentInCart = existingIndex > -1 ? posCart[existingIndex].quantity : 0;

    if (posMode !== "return") {
        const avail = getItemAvailableStock(product, size, color);
        if ((currentInCart + 1) > avail) {
            alert(`❌ لا يمكن إضافة هذا المنتج للسلة!\n\nالكمية المطلوبة من (${product.name} - مقاس ${size}) تجاوزت المتوفر في المخزون.\n\nالمتوفر في المخزون حالياً: ${avail} قطعة فقط.`);
            return;
        }
    }

    if (existingIndex > -1) {
        posCart[existingIndex].quantity += 1;
    } else {
        posCart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.price,
            discount: 0,
            size: size,
            color: color,
            quantity: 1
        });
    }

    renderPosTicketItems();
}

function renderPosTicketItems() {
    posTicketItems.innerHTML = "";

    // Update item count badge
    const totalQty = posCart.reduce((sum, item) => sum + item.quantity, 0);
    const countEl = document.getElementById("posItemCount");
    if (countEl) countEl.textContent = `${totalQty} ITEM${totalQty !== 1 ? 'S' : ''}`;

    if (posCart.length === 0) {
        posTicketItems.innerHTML = `
            <div style="text-align: center; color: var(--color-text-muted); padding: 4rem 0; font-size: 1.2rem;">
                <i class="fa-solid fa-cart-shopping" style="font-size: 2.5rem; display: block; margin-bottom: 1rem; opacity: 0.3;"></i>
                TICKET IS EMPTY
                <div style="font-size: 1rem; margin-top: 0.5rem; opacity: 0.6;">Tap a product to add it</div>
            </div>
        `;
        updatePosTotals();
        return;
    }

    posCart.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("pos-ticket-item");
        
        if (item.discount === undefined) item.discount = 0;
        if (item.originalPrice === undefined) item.originalPrice = item.price;

        div.innerHTML = `
            <div class="pos-ticket-info">
                <h4 style="font-size: 1.25rem; font-weight: 700; margin: 0 0 0.3rem 0;">${item.name}</h4>
                <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                    <span style="font-size: 1.1rem; color: var(--color-text-muted);">SIZE: ${item.size} / ${formatPrice(item.originalPrice)}</span>
                    <span style="font-size: 1.1rem; color: var(--color-accent); display: flex; align-items: center; gap: 0.3rem; margin-left: 0.5rem;">
                        Hassm: $
                        <input type="number" value="${item.discount}" min="0" max="${item.originalPrice}" onchange="updatePosItemDiscount(${item.id}, '${item.size}', this.value)" style="width: 55px; background: rgba(255,255,255,0.08); border: 1px solid var(--color-border); color: var(--color-text); padding: 0.15rem 0.3rem; font-size: 1.1rem; border-radius: 4px; text-align: center; font-weight: bold;">
                    </span>
                </div>
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

function updatePosItemDiscount(productId, size, discountVal) {
    const index = posCart.findIndex(item => item.id === productId && item.size === size);
    if (index === -1) return;

    const discount = Math.max(0, parseFloat(discountVal) || 0);
    posCart[index].discount = discount;

    const original = posCart[index].originalPrice || posCart[index].price;
    posCart[index].originalPrice = original;
    posCart[index].price = Math.max(0, original - discount);

    renderPosTicketItems();
}

function updatePosQty(productId, size, change) {
    const index = posCart.findIndex(item => item.id === productId && item.size === size);
    if (index === -1) return;

    if (posMode !== "return" && change > 0) {
        const item = posCart[index];
        const prod = PRODUCTS.find(p => p.id === productId);
        if (prod) {
            const avail = getItemAvailableStock(prod, size, item.color);
            if ((item.quantity + change) > avail) {
                alert(`❌ لا يمكن زيادة الكمية!\n\nالكمية المطلوبة من (${item.name} - مقاس ${size}) تجاوزت المتوفر في المخزون.\n\nالكمية المطلوبة: ${item.quantity + change} قطعة | المتوفر في المخزون: ${avail} قطعة فقط.`);
                return;
            }
        }
    }

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
    const addressInput = document.getElementById("posCustomerAddress");
    const address = addressInput ? addressInput.value.trim() || "STORE PICKUP / WALK-IN" : "STORE PICKUP / WALK-IN";
    
    const discountPercent = parseFloat(posDiscountInput.value) || 0;
    
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = (subtotal * discountPercent) / 100;
    const total = subtotal - discount;
    const randomId = Math.floor(10000 + Math.random() * 90000);

    // Stock Validation Check for POS Sales
    if (posMode !== "return") {
        for (const item of posCart) {
            const prod = PRODUCTS.find(p => String(p.id) === String(item.id));
            if (prod) {
                const avail = getItemAvailableStock(prod, item.size, item.color);
                if (item.quantity > avail) {
                    alert(`❌ لا يمكن إتمام عملية البيع!\n\nالكمية المطلوبة من (${item.name} - مقاس ${item.size}) أكبر من المتوفر في المخزون.\n\nالكمية المطلوبة: ${item.quantity} قطعة | المتوفر في المخزون: ${avail} قطعة فقط.`);
                    return;
                }
            }
        }
    }

    if (posMode === "return") {
        const orderId = `REF-${randomId}`;
        
        let managerPassword = "";
        const role = currentAdminStaff ? currentAdminStaff.role : "";
        if (role !== "Manager" && role !== "Administrator") {
            managerPassword = prompt("UNAUTHORIZED: Manager authorization required. Please enter Manager Password to approve this refund:");
            if (managerPassword === null) return;
            if (!managerPassword.trim()) {
                alert("Manager password is required.");
                return;
            }
        }
        
        const payload = {
            id: orderId,
            customerName: customer,
            customerPhone: phone,
            customerAddress: address,
            items: [...posCart],
            total: total,
            staffEmail: currentAdminStaff ? currentAdminStaff.email : "",
            staffPassword: currentAdminPassword || "",
            managerPassword,
            cashierName: currentAdminStaff ? currentAdminStaff.name : "SYSTEM ADMIN"
        };
        
        fetch('/api/orders/pos-return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(async res => {
            const data = await res.json();
            if (res.ok) {
                alert("POS Return completed successfully! Products restocked.");
                await loadOrdersFromServer();
                await loadProductsFromServer();
                showPosReturnReceipt(data.order, subtotal, discount, total);
            } else {
                alert(`POS Return failed: ${data.error}`);
            }
        })
        .catch(err => {
            console.error("POS return failed:", err);
            alert("Connection error. Return failed.");
        });
        
        return;
    }

    const orderId = `POS-${randomId}`;

    // Register sale inside Database
    const posOrderData = {
        id: orderId,
        customerName: customer,
        customerEmail: "pos@styluxe.com",
        customerPhone: phone,
        customerAddress: address,
        date: new Date().toISOString().split('T')[0],
        items: [...posCart],
        total: total,
        status: "PAID (POS)",
        department: "Global",
        cashierName: currentAdminStaff ? currentAdminStaff.name : "SYSTEM ADMIN"
    };

    fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posOrderData)
    })
    .then(async res => {
        if (res.ok) {
            await loadOrdersFromServer();
            await loadProductsFromServer();
        }
    })
    .catch(err => {
        console.error("POS order logging failed:", err);
    });

    // Populate Receipt Modal HTML safely
    const rDate = document.getElementById("receiptDate");
    if (rDate) rDate.textContent = new Date().toISOString().split('T')[0] + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const rCust = document.getElementById("receiptCustomer");
    if (rCust) rCust.textContent = customer;
    
    const cashierName = currentAdminStaff ? currentAdminStaff.name : "SYSTEM ADMIN";
    const cashierEl = document.getElementById("receiptCashier");
    if (cashierEl) cashierEl.textContent = cashierName;
    
    const receiptItemsContainer = document.getElementById("receiptItems");
    if (receiptItemsContainer) {
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
    }

    const rSub = document.getElementById("receiptSubtotal");
    if (rSub) rSub.textContent = formatPrice(subtotal);
    
    const rDisc = document.getElementById("receiptDiscount");
    if (rDisc) rDisc.textContent = `-${formatPrice(discount)}`;
    
    const rTot = document.getElementById("receiptTotal");
    if (rTot) rTot.textContent = formatPrice(total);

    // Populate Shipping Label Sticker Modal HTML safely
    const lName = document.getElementById("labelCustomerName");
    if (lName) lName.textContent = customer;
    
    const lPhone = document.getElementById("labelCustomerPhone");
    if (lPhone) lPhone.textContent = phone;
    
    const lAddr = document.getElementById("labelCustomerAddress");
    if (lAddr) lAddr.textContent = address;
    
    const lDate = document.getElementById("labelDate");
    if (lDate) lDate.textContent = new Date().toISOString().split('T')[0];
    
    const lId = document.getElementById("labelOrderId");
    if (lId) lId.textContent = orderId;

    const lTot = document.getElementById("labelTotalAmount");
    if (lTot) lTot.textContent = `$${total.toFixed(2)}`;

    // Store last POS sale data for independent printing
    lastPosSaleObj = {
        orderData: posOrderData,
        cartItems: [...posCart],
        subtotal: subtotal,
        discount: discount,
        total: total
    };

    // Open Modal backdrop preview
    const modal = document.getElementById("posReceiptModalBackdrop");
    if (modal) modal.classList.add("active");

    // Reset customer info fields
    posCustomerName.value = "";
    posCustomerPhone.value = "";
    if (addressInput) addressInput.value = "";
    posDiscountInput.value = "0";

    // Clear POS cart
    posCart = [];
    renderPosTicketItems();
}

let lastPosSaleObj = null;

// Print ONLY Delivery Sticker WITH COD Total Amount (Natural Compact Sticker Size)
function triggerStickerPrint(name, phone, address, date, orderId, totalAmount) {
    const cleanName = (name || "CUSTOMER").toUpperCase();
    const cleanPhone = phone || "N/A";
    const cleanAddress = address || "N/A";
    const cleanDate = date || new Date().toISOString().split('T')[0];
    const cleanOrderId = String(orderId || "").startsWith('#') ? orderId : `#${orderId || "1001"}`;
    const cleanTotal = totalAmount ? (String(totalAmount).startsWith('$') ? totalAmount : `$${parseFloat(totalAmount).toFixed(2)}`) : "$0.00";

    // Populate label elements in main page modal
    const nameEl = document.getElementById("labelCustomerName");
    const phoneEl = document.getElementById("labelCustomerPhone");
    const addrEl = document.getElementById("labelCustomerAddress");
    const dateEl = document.getElementById("labelDate");
    const idEl = document.getElementById("labelOrderId");
    const totEl = document.getElementById("labelTotalAmount");

    if (nameEl) nameEl.textContent = cleanName;
    if (phoneEl) phoneEl.textContent = cleanPhone;
    if (addrEl) addrEl.textContent = cleanAddress;
    if (dateEl) dateEl.textContent = cleanDate;
    if (idEl) idEl.textContent = cleanOrderId;
    if (totEl) totEl.textContent = cleanTotal;

    const printWin = window.open('', '_blank', 'width=650,height=750,scrollbars=yes,resizable=yes');
    if (printWin) {
        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>STYLUXE Delivery Sticker ${cleanOrderId}</title>
                <style>
                    @page { margin: 0mm; size: auto; }
                    html, body {
                        margin: 0; padding: 0;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    }
                    body { display: flex; justify-content: center; align-items: flex-start; padding: 25px 15px; }
                    .sticker-card {
                        width: 100%; max-width: 380px; border: 2px dashed #000; border-radius: 6px; padding: 25px 20px; background: #fff; box-sizing: border-box;
                    }
                    .brand-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 18px; }
                    .brand-header h1 { font-size: 32px; margin: 0; letter-spacing: 3px; font-weight: 900; }
                    .brand-header p { font-size: 12px; margin: 4px 0 0 0; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
                    .info-group { margin-bottom: 14px; }
                    .info-label { font-size: 11px; text-transform: uppercase; color: #555; font-weight: 700; display: block; margin-bottom: 2px; }
                    .info-value { font-size: 16px; font-weight: 800; color: #000; word-break: break-word; }
                    .cod-box {
                        margin-top: 8px;
                        background: #f0f0f0;
                        border: 1px solid #000;
                        padding: 8px 12px;
                        border-radius: 4px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .sticker-footer { border-top: 2px solid #000; padding-top: 12px; margin-top: 18px; display: flex; justify-content: space-between; align-items: center; }
                    .meta-details { font-size: 12px; font-weight: 800; }
                    .barcode-sim { font-family: monospace; font-size: 22px; letter-spacing: -2px; font-weight: 300; }
                </style>
            </head>
            <body>
                <div class="sticker-card">
                    <div class="brand-header">
                        <h1>STYLUXE</h1>
                        <p>DELIVERY STICKER</p>
                    </div>
                    <div class="info-group">
                        <span class="info-label">Customer Name:</span>
                        <div class="info-value">${cleanName}</div>
                    </div>
                    <div class="info-group">
                        <span class="info-label">Phone Number:</span>
                        <div class="info-value">${cleanPhone}</div>
                    </div>
                    <div class="info-group">
                        <span class="info-label">Delivery Address:</span>
                        <div class="info-value">${cleanAddress}</div>
                    </div>
                    <div class="cod-box">
                        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #000;">COLLECT AMOUNT (COD):</span>
                        <span style="font-size: 20px; font-weight: 900; color: #000;">${cleanTotal}</span>
                    </div>
                    <div class="sticker-footer">
                        <div class="meta-details">
                            <div>DATE: ${cleanDate}</div>
                            <div>ORDER: ${cleanOrderId}</div>
                        </div>
                        <div class="barcode-sim">||||| | |||| ||| |||</div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.focus();
                            window.print();
                        }, 200);
                    };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    } else {
        window.print();
    }
}

// Print ONLY Sales Invoice WITH Product Thumbnails (100% Full A4 Sheet Format)
function triggerInvoicePrint(orderData, cartItems, subtotal, discount, total) {
    const cleanName = (orderData.customerName || orderData.customer || "CUSTOMER").toUpperCase();
    const cleanPhone = orderData.customerPhone || orderData.phone || "N/A";
    const cleanAddress = orderData.customerAddress || orderData.address || "N/A";
    const cleanDate = orderData.date || new Date().toISOString().split('T')[0];
    const cleanOrderId = String(orderData.id).startsWith('#') ? orderData.id : `#${orderData.id}`;
    const cashierName = orderData.cashierName || "SYSTEM ADMIN";

    const calcSubtotal = subtotal !== undefined ? subtotal : (cartItems || []).reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const calcDiscount = discount !== undefined ? discount : 0;
    const calcTotal = total !== undefined ? total : orderData.total;

    let itemsTableRows = "";
    (cartItems || []).forEach(item => {
        const prod = PRODUCTS.find(p => p.id === item.id);
        const imgUrl = item.image || (prod ? getProductMainImage(prod) : 'assets/favicon.jpg');
        itemsTableRows += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 14px 8px; vertical-align: middle; width: 70px;">
                    <img src="${imgUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ccc; display: block;">
                </td>
                <td style="padding: 14px 12px; vertical-align: middle;">
                    <div style="font-weight: 800; font-size: 17px; color: #000; font-family: sans-serif;">${item.name}</div>
                    <div style="font-size: 14px; color: #555; font-family: sans-serif; margin-top: 3px;">Size: <strong>${item.size}</strong> &bull; Qty: <strong>${item.quantity}</strong></div>
                </td>
                <td style="padding: 14px 8px; text-align: right; font-weight: 800; vertical-align: middle; font-size: 18px; color: #000; font-family: sans-serif;">
                    $${(item.price * item.quantity).toFixed(2)}
                </td>
            </tr>
        `;
    });

    const printWin = window.open('', '_blank', 'width=900,height=1000,scrollbars=yes,resizable=yes');
    if (printWin) {
        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>STYLUXE Sales Invoice ${cleanOrderId}</title>
                <style>
                    /* Strip browser header & footer (URL, Date, Page Numbers) */
                    @page {
                        margin: 0;
                        size: A4 portrait;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    }
                    body {
                        padding: 15mm 18mm;
                    }
                    .invoice-wrapper {
                        width: 100%;
                        background: #fff;
                    }
                    .brand-header {
                        text-align: center;
                        border-bottom: 3px solid #000;
                        padding-bottom: 18px;
                        margin-bottom: 25px;
                    }
                    .brand-header h1 {
                        font-size: 48px;
                        margin: 0;
                        letter-spacing: 6px;
                        font-weight: 900;
                        line-height: 1;
                    }
                    .brand-header p {
                        font-size: 16px;
                        margin: 8px 0 0 0;
                        letter-spacing: 4px;
                        text-transform: uppercase;
                        font-weight: 800;
                    }
                    .meta-bar {
                        display: flex;
                        justify-content: space-between;
                        font-size: 15px;
                        font-weight: 700;
                        border-bottom: 2px solid #000;
                        padding-bottom: 14px;
                        margin-bottom: 20px;
                    }
                    .customer-info-box {
                        font-size: 15px;
                        margin-bottom: 25px;
                        background: #f8f8f8;
                        padding: 14px 18px;
                        border-radius: 6px;
                        border: 1px solid #ddd;
                        color: #000;
                        line-height: 1.6;
                    }
                    .invoice-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 25px 0;
                    }
                    .totals-table {
                        width: 100%;
                        border-top: 3px solid #000;
                        padding-top: 18px;
                        margin-top: 25px;
                        font-size: 18px;
                    }
                    .totals-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                    }
                    .totals-row.final {
                        font-size: 26px;
                        font-weight: 900;
                        border-top: 2px solid #000;
                        padding-top: 14px;
                        margin-top: 14px;
                    }
                    .footer-note {
                        text-align: center;
                        margin-top: 45px;
                        border-top: 2px solid #ccc;
                        padding-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="invoice-wrapper">
                    <div class="brand-header">
                        <h1>STYLUXE</h1>
                        <p>OFFICIAL SALES RECEIPT / INVOICE</p>
                    </div>

                    <div class="meta-bar">
                        <div>
                            <div>ORDER: <strong>${cleanOrderId}</strong></div>
                            <div>DATE: <strong>${cleanDate}</strong></div>
                        </div>
                        <div style="text-align: right;">
                            <div>CASHIER: <strong>${cashierName}</strong></div>
                            <div>PAYMENT: <strong>COD (CASH ON DELIVERY)</strong></div>
                        </div>
                    </div>

                    <div class="customer-info-box">
                        <div>CUSTOMER: <strong>${cleanName}</strong></div>
                        <div>PHONE: <strong>${cleanPhone}</strong></div>
                        <div>ADDRESS: <strong>${cleanAddress}</strong></div>
                    </div>

                    <table class="invoice-table">
                        <thead>
                            <tr style="border-bottom: 3px solid #000; text-align: left; font-size: 14px; text-transform: uppercase;">
                                <th style="padding: 10px 8px;">ITEM</th>
                                <th style="padding: 10px 12px;">DETAILS</th>
                                <th style="padding: 10px 8px; text-align: right;">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsTableRows}
                        </tbody>
                    </table>

                    <div class="totals-table">
                        <div class="totals-row">
                            <span>Subtotal:</span>
                            <span>$${calcSubtotal.toFixed(2)}</span>
                        </div>
                        ${calcDiscount > 0 ? `
                        <div class="totals-row" style="color: #c0392b;">
                            <span>Discount:</span>
                            <span>-$${calcDiscount.toFixed(2)}</span>
                        </div>
                        ` : ''}
                        <div class="totals-row final">
                            <span>TOTAL AMOUNT:</span>
                            <span>$${calcTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="footer-note">
                        <p style="margin: 0; font-weight: 900; font-size: 16px; letter-spacing: 2px; color: #000;">THANK YOU FOR SHOPPING AT STYLUXE!</p>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.focus();
                            window.print();
                        }, 200);
                    };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    } else {
        window.print();
    }
}

function printOrderSticker(orderId) {
    const order = ordersList.find(o => String(o.id) === String(orderId));
    if (!order) return;

    const name = order.customer || order.customerName || "CUSTOMER";
    const phone = order.phone || order.customerPhone || "N/A";
    const address = order.address || order.customerAddress || "N/A";
    const date = order.date || new Date().toISOString().split('T')[0];

    triggerStickerPrint(name, phone, address, date, order.id, order.total);
}

function printOrderInvoice(orderId) {
    const order = ordersList.find(o => String(o.id) === String(orderId));
    if (!order) return;

    const subtotal = (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = Math.max(0, subtotal - order.total);

    triggerInvoicePrint(order, order.items, subtotal, discount, order.total);
}

function printStickerOnly() {
    const name = document.getElementById("labelCustomerName")?.textContent || "CUSTOMER";
    const phone = document.getElementById("labelCustomerPhone")?.textContent || "N/A";
    const address = document.getElementById("labelCustomerAddress")?.textContent || "N/A";
    const date = document.getElementById("labelDate")?.textContent || "";
    const orderId = document.getElementById("labelOrderId")?.textContent || "";
    const totalAmount = document.getElementById("labelTotalAmount")?.textContent || "$0.00";

    triggerStickerPrint(name, phone, address, date, orderId, totalAmount);
}

function printInvoiceOnly() {
    if (lastPosSaleObj) {
        triggerInvoicePrint(lastPosSaleObj.orderData, lastPosSaleObj.cartItems, lastPosSaleObj.subtotal, lastPosSaleObj.discount, lastPosSaleObj.total);
    } else if (activeAdminOrder) {
        printOrderInvoice(activeAdminOrder.id);
    } else {
        window.print();
    }
}

function closePosReceipt() {
    const modal = document.getElementById("posReceiptModalBackdrop");
    if (modal) modal.classList.remove("active");
}

async function openDailyReportModal() {
    await loadOrdersFromServer();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById("dailyReportDate").textContent = today;
    
    const cashierName = currentAdminStaff ? currentAdminStaff.name : "SYSTEM ADMIN";
    
    // Find all cashiers who made sales today
    const cashiersToday = new Set();
    ordersList.forEach(o => {
        if (o.date === today && (o.status.includes("POS") || o.status.includes("REFUND (POS)"))) {
            cashiersToday.add(o.cashierName || "SYSTEM ADMIN");
        }
    });

    const selectEl = document.getElementById("dailyReportCashierSelect");
    if (selectEl) {
        selectEl.innerHTML = `
            <option value="current">Current Cashier: ${cashierName}</option>
            <option value="all">All Cashiers (Total Drawer)</option>
        `;
        cashiersToday.forEach(c => {
            if (c !== cashierName) {
                selectEl.innerHTML += `<option value="${c}">${c}</option>`;
            }
        });
        selectEl.value = dailyReportCashierFilter;
    }

    const containerEl = document.getElementById("dailyReportCashierSelectContainer");
    if (containerEl) {
        const role = currentAdminStaff ? currentAdminStaff.role : "";
        containerEl.style.display = (role === "Manager" || role === "Administrator") ? "block" : "none";
    }

    // Determine target cashier name for filtering
    let targetCashier = cashierName;
    if (dailyReportCashierFilter === "all") {
        targetCashier = "all";
    } else if (dailyReportCashierFilter !== "current") {
        targetCashier = dailyReportCashierFilter;
    }

    // Set generated cashier name in report
    document.getElementById("dailyReportUser").textContent = targetCashier === "all" ? "ALL CASHIERS" : targetCashier;

    // Filter today's POS orders
    const todayOrders = ordersList.filter(o => {
        const isTodayPos = o.date === today && (o.status.includes("POS") || o.status.includes("REFUND (POS)"));
        if (!isTodayPos) return false;
        if (targetCashier === "all") return true;
        return (o.cashierName || "SYSTEM ADMIN") === targetCashier;
    });

    const totalOrders = todayOrders.length;
    const grossSales = todayOrders.reduce((sum, o) => {
        // If order was a return/refund (status starts with REFUND), count as negative sales!
        if (o.status && o.status.includes("REFUND")) {
            return sum - o.total;
        }
        return sum + o.total;
    }, 0);

    document.getElementById("dailyReportTotalOrders").textContent = totalOrders;
    document.getElementById("dailyReportGrossSales").textContent = formatPrice(grossSales);
    document.getElementById("dailyReportNetSales").textContent = formatPrice(grossSales);

    // Group sales by department
    let deptMen = 0, deptWomen = 0, deptKids = 0;
    todayOrders.forEach(o => {
        o.items.forEach(item => {
            const prod = PRODUCTS.find(p => p.id === item.id);
            const dept = prod ? prod.department : "Men";
            const itemVal = item.price * item.quantity;
            if (dept === "Men") deptMen += itemVal;
            else if (dept === "Women") deptWomen += itemVal;
            else if (dept === "Kids") deptKids += itemVal;
        });
    });

    document.getElementById("dailyReportDeptMen").textContent = formatPrice(deptMen);
    document.getElementById("dailyReportDeptWomen").textContent = formatPrice(deptWomen);
    document.getElementById("dailyReportDeptKids").textContent = formatPrice(deptKids);

    // Group sold items for inventory count
    const itemsSold = {};
    todayOrders.forEach(o => {
        o.items.forEach(item => {
            const key = `${item.id}-${item.size}`;
            if (!itemsSold[key]) {
                itemsSold[key] = {
                    name: item.name,
                    size: item.size,
                    quantity: 0
                };
            }
            itemsSold[key].quantity += item.quantity;
        });
    });

    const listContainer = document.getElementById("dailyReportItemsSoldList");
    listContainer.innerHTML = "";

    const itemsArray = Object.values(itemsSold);
    if (itemsArray.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; color: #555; padding: 1rem 0;">NO ITEMS SOLD TODAY</div>`;
    } else {
        itemsArray.forEach(item => {
            const div = document.createElement("div");
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.innerHTML = `
                <span>${item.name} [${item.size}]</span>
                <strong>x${item.quantity}</strong>
            `;
            listContainer.appendChild(div);
        });
    }

    // Reset print classes
    const reportPaper = document.getElementById("posDailyReportPaper");
    if (reportPaper) reportPaper.classList.remove("print-section-active");

    // Show modal
    document.getElementById("posDailyReportModalBackdrop").classList.add("active");
}

function printDailyReportOnly() {
    const reportPaper = document.getElementById("posDailyReportPaper");
    if (reportPaper) reportPaper.classList.add("print-section-active");
    window.print();
}

function closeDailyReportModal() {
    document.getElementById("posDailyReportModalBackdrop").classList.remove("active");
    dailyReportCashierFilter = "current";
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
    if (event) event.stopPropagation();
    if (typeof userMenuDropdown !== 'undefined' && userMenuDropdown) {
        userMenuDropdown.classList.toggle("active");
    }
    
    // Close currency dropdown
    if (typeof currencyDropdown !== 'undefined' && currencyDropdown) {
        currencyDropdown.classList.remove("active");
    }
}

// Click outside to close dropdowns
document.addEventListener("click", () => {
    if (typeof userMenuDropdown !== 'undefined' && userMenuDropdown) {
        userMenuDropdown.classList.remove("active");
    }
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
            if (result.isStaff) {
                currentAdminDept = result.department || "Global";
                currentAdminStaff = result;
                closeAuthModal();
                event.target.reset();
                initAdminDashboard();
                return;
            }

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
            } else {
                openMyOrdersModal();
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
        } else {
            openMyOrdersModal();
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
                } else {
                    openMyOrdersModal();
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
// Render Categories Table
function renderAdminCategories() {
    const catBody = document.getElementById("adminCategoriesTableBody");
    if (!catBody) return;

    const filtered = currentAdminDept === "Global" 
        ? CATEGORIES 
        : CATEGORIES.filter(c => c.department && c.department.toLowerCase() === currentAdminDept.toLowerCase());

    // Render Categories Table
    catBody.innerHTML = "";
    if (filtered.length === 0) {
        catBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 2rem 0;">NO CATEGORIES FOUND.</td></tr>`;
    } else {
        filtered.forEach(cat => {
            // Count products in this category
            const count = PRODUCTS.filter(p => p.category && p.category.trim().toLowerCase() === cat.name.trim().toLowerCase() && (currentAdminDept === "Global" || (p.department && p.department.toLowerCase() === currentAdminDept.toLowerCase()))).length;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>#${cat.id}</strong></td>
                <td style="width: 50px;">
                    <img src="${cat.img || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=200'}" alt="${cat.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border); cursor: pointer;" onclick="filterAdminProductsByCategory('${cat.name}')">
                </td>
                <td>
                    <div style="cursor: pointer;" onclick="filterAdminProductsByCategory('${cat.name}')">
                        <strong style="color: var(--color-accent); font-size: 1.1rem; letter-spacing: 0.05em;">${cat.name.toUpperCase()}</strong>
                    </div>
                    <div style="font-size: 1rem; color: var(--color-text-muted);">${cat.department ? cat.department.toUpperCase() : 'MEN'}</div>
                </td>
                <td>
                    <button onclick="filterAdminProductsByCategory('${cat.name}')" style="background: ${count > 0 ? "rgba(199, 163, 105, 0.15)" : "rgba(255, 255, 255, 0.05)"}; color: ${count > 0 ? "var(--color-accent)" : "var(--color-text-muted)"}; border: 1px solid ${count > 0 ? "rgba(199, 163, 105, 0.35)" : "rgba(255, 255, 255, 0.1)"}; border-radius: 20px; padding: 0.4rem 1rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;" title="Click to view products in this category">
                        <i class="fa-solid fa-boxes-stacked"></i> ${count} PRODUCTS
                    </button>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <strong>${cat.priority !== undefined ? cat.priority : 1000}</strong>
                        <button class="priority-btn" onclick="reorderCategory(${cat.id}, 'up')" style="background: none; color: var(--color-accent); border: none; padding: 0.2rem; cursor: pointer; font-size: 1.2rem;" aria-label="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
                        <button class="priority-btn" onclick="reorderCategory(${cat.id}, 'down')" style="background: none; color: var(--color-accent); border: none; padding: 0.2rem; cursor: pointer; font-size: 1.2rem;" aria-label="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="delete-btn" onclick="deleteCategory(${cat.id})" aria-label="Delete category">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            catBody.appendChild(tr);
        });
    }
}

// Render Brands Table
function renderAdminBrands() {
    const brandBody = document.getElementById("adminBrandsTableBody");
    if (!brandBody) return;

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
                    <div style="display: flex; gap: 1rem; justify-content: center; align-items: center;">
                        <button class="admin-edit-btn" onclick="openEditBrand('${b.name}', '${b.img}')" style="background: none; border: none; color: var(--color-accent); font-size: 1.4rem; cursor: pointer;" aria-label="Edit brand">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteBrand('${b.name}')" aria-label="Delete brand" style="background: none; border: none; color: var(--color-error); font-size: 1.4rem; cursor: pointer;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
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
    const deptSelect = document.getElementById("newCategoryDept");
    const priorityInput = document.getElementById("newCategoryPriority");
    const fileInput = document.getElementById("newCategoryImgFileInput");
    const name = input.value.trim();
    const department = deptSelect.value;
    const priority = priorityInput ? parseInt(priorityInput.value) || 1000 : 1000;
    if (!name || !department) return;

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
        body: JSON.stringify({ name: name, img: img, department: department, priority: priority })
    })
    .then(async res => {
        if (res.ok) {
            CATEGORIES = await res.json();
            input.value = "";
            deptSelect.value = "";
            if (priorityInput) priorityInput.value = "1";
            fileInput.value = "";
            const previewDiv = document.getElementById("newCategoryImgPreview");
            if (previewDiv) previewDiv.style.display = "none";
            updateCategoriesDatalist();
            renderCategoryTags();
            renderAdminCategories();
        } else {
            alert("FAILED TO ADD CATEGORY.");
        }
    })
    .catch(err => console.error("Error adding category:", err));
}

async function reorderCategory(id, action) {
    try {
        const res = await fetch('/api/categories/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action })
        });
        if (res.ok) {
            CATEGORIES = await res.json();
            renderAdminCategories();
            renderCategoryTags();
            updateCategoriesDatalist();
        } else {
            alert("FAILED TO REORDER CATEGORY.");
        }
    } catch (err) {
        console.error("Error reordering category:", err);
    }
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
            renderAdminCategories();
        } else {
            alert("FAILED TO DELETE CATEGORY.");
        }
    })
    .catch(err => console.error("Error deleting category:", err));
}

function getFileBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const maxWidth = 1200;
                const maxHeight = 1200;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress image to JPEG at 80% quality (visually lossless but ~80-90% smaller file size)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                resolve(compressedBase64);
            };
            img.onerror = err => reject(err);
        };
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
    } else if (isEditingBrand) {
        const previewDiv = document.getElementById("newBrandImgPreview");
        const previewImg = previewDiv ? previewDiv.querySelector("img") : null;
        if (previewImg) {
            img = previewImg.src;
        }
    }

    if (!img && !isEditingBrand) {
        alert("PLEASE SELECT A BRAND LOGO FILE.");
        return;
    }

    if (isEditingBrand) {
        fetch('/api/brands', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName: editingBrandOldName, name: name, img: img })
        })
        .then(async res => {
            if (res.ok) {
                BRANDS = await res.json();
                cancelBrandEdit();
                renderBrandSlider();
                renderAdminBrands();
                
                await loadProductsFromServer();
                renderProducts();
            } else {
                alert("FAILED TO UPDATE BRAND.");
            }
        })
        .catch(err => console.error("Error updating brand:", err));
    } else {
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
                renderAdminBrands();
            } else {
                alert("FAILED TO ADD BRAND.");
            }
        })
        .catch(err => console.error("Error adding brand:", err));
    }
}

function openEditBrand(name, img) {
    isEditingBrand = true;
    editingBrandOldName = name;

    const titleEl = document.getElementById("brandFormTitle");
    const submitBtn = document.getElementById("brandSubmitBtn");
    const cancelBtn = document.getElementById("cancelBrandEditBtn");
    const nameInput = document.getElementById("newBrandNameInput");
    const fileInput = document.getElementById("newBrandImgFileInput");
    const previewDiv = document.getElementById("newBrandImgPreview");
    const previewImg = previewDiv ? previewDiv.querySelector("img") : null;

    if (titleEl) titleEl.textContent = "EDIT BRAND";
    if (submitBtn) submitBtn.textContent = "UPDATE BRAND";
    if (cancelBtn) cancelBtn.style.display = "block";
    if (nameInput) nameInput.value = name;
    if (fileInput) {
        fileInput.value = "";
        fileInput.removeAttribute("required");
    }
    if (previewDiv && previewImg) {
        previewImg.src = img;
        previewDiv.style.display = "block";
    }
}

function cancelBrandEdit() {
    isEditingBrand = false;
    editingBrandOldName = "";

    const titleEl = document.getElementById("brandFormTitle");
    const submitBtn = document.getElementById("brandSubmitBtn");
    const cancelBtn = document.getElementById("cancelBrandEditBtn");
    const nameInput = document.getElementById("newBrandNameInput");
    const fileInput = document.getElementById("newBrandImgFileInput");
    const previewDiv = document.getElementById("newBrandImgPreview");

    if (titleEl) titleEl.textContent = "ADD NEW BRAND";
    if (submitBtn) submitBtn.textContent = "+ ADD BRAND";
    if (cancelBtn) cancelBtn.style.display = "none";
    if (nameInput) nameInput.value = "";
    if (fileInput) {
        fileInput.value = "";
        fileInput.setAttribute("required", "required");
    }
    if (previewDiv) {
        previewDiv.style.display = "none";
        const previewImg = previewDiv.querySelector("img");
        if (previewImg) previewImg.src = "";
    }
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
            renderAdminBrands();
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
        const itemSummary = o.items.map(item => `${item.name} (x${item.quantity}) [${item.size}]${item.preorder ? ' <strong style="color: var(--color-accent);">(PRE-ORDER)</strong>' : ''}`).join("<br>");
        
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.onclick = (e) => {
            if (e.target.closest("button") && e.target.closest("button").classList.contains("status-change-btn")) {
                return;
            }
            openAdminOrderDetailsModal(o.id);
        };
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
                <button class="status-change-btn" style="background: linear-gradient(135deg, #2ecc71, #27ae60); color: #ffffff; border: none; font-weight: 700; padding: 0.6rem 0.9rem; border-radius: 4px; cursor: pointer; margin-right: 0.4rem;" onclick="printOrderSticker('${o.id}')"><i class="fa-solid fa-truck-fast"></i> STICKER 🚚</button>
                <button class="status-change-btn" style="background: linear-gradient(135deg, #c7a369, #a88448); color: #000000; border: none; font-weight: 700; padding: 0.6rem 0.9rem; border-radius: 4px; cursor: pointer; margin-right: 0.4rem;" onclick="printOrderInvoice('${o.id}')"><i class="fa-solid fa-file-invoice-dollar"></i> INVOICE 🧾</button>
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
    if (!product || !product.image) return [];
    const imgs = splitProductImages(product.image);
    if (imgs.length > 1) {
        return imgs;
    }
    if (GALLERY_MOCKS[product.id]) {
        return GALLERY_MOCKS[product.id];
    }
    // Dynamic fallbacks based on category to maintain premium feel
    const mainImg = imgs[0] || product.image;
    return [
        mainImg,
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

// Multi-factor calculator mapping height/weight to sizing letters, including specialized footwear and kids logic
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
    const isFootwear = category === "Footwear" || catUpper.includes("SHOE") || catUpper.includes("SNEAKER") || catUpper.includes("SLIDE") || catUpper.includes("BOOT");
    const isKids = activeModalProduct.department === "Kids";

    if (isKids) {
        if (isFootwear) {
            // Kids shoe sizes: 24 to 35
            if (height < 90) recommendedSize = "24";
            else if (height < 100) recommendedSize = "26";
            else if (height < 110) recommendedSize = "28";
            else if (height < 120) recommendedSize = "30";
            else if (height < 130) recommendedSize = "32";
            else if (height < 140) recommendedSize = "34";
            else recommendedSize = "35";
        } else {
            // Kids clothing: letter sizes or age sizes
            const sizeList = activeModalProduct.sizes || [];
            const hasAgeSizes = sizeList.some(s => s.toUpperCase().includes("Y"));
            
            if (hasAgeSizes) {
                if (height < 95) recommendedSize = "2Y";
                else if (height < 105) recommendedSize = "4Y";
                else if (height < 115) recommendedSize = "6Y";
                else if (height < 125) recommendedSize = "8Y";
                else if (height < 135) recommendedSize = "10Y";
                else recommendedSize = "12Y";
            } else {
                // Letter sizes (S, M, L, XL) for kids
                if (height < 100) recommendedSize = "S";
                else if (height < 120) recommendedSize = "M";
                else if (height < 135) recommendedSize = "L";
                else recommendedSize = "XL";
            }
        }
    } else {
        // Adults (Men & Women)
        if (isFootwear) {
            if (activeModalProduct.department === "Women") {
                if (height < 155) recommendedSize = "36";
                else if (height < 162) recommendedSize = "37";
                else if (height < 168) recommendedSize = "38";
                else if (height < 175) recommendedSize = "39";
                else if (height < 180) recommendedSize = "40";
                else recommendedSize = "41";
            } else { // Men / Unisex
                if (height < 165) recommendedSize = "40";
                else if (height < 172) recommendedSize = "41";
                else if (height < 178) recommendedSize = "42";
                else if (height < 185) recommendedSize = "43";
                else if (height < 190) recommendedSize = "44";
                else recommendedSize = "45";
            }
        } else {
            // Clothing
            if (category === "Jeans" || catUpper.includes("PANT") || catUpper.includes("SHORT") || catUpper.includes("JEAN") || catUpper.includes("TROUSER")) {
                if (weight < 60) recommendedSize = "30";
                else if (weight < 72) recommendedSize = "32";
                else if (weight < 85) recommendedSize = "34";
                else recommendedSize = "36";
            } else { // Tops, Hoodies, Jackets, etc.
                if (weight < 62) recommendedSize = "S";
                else if (weight < 72) recommendedSize = "M";
                else if (weight < 82) recommendedSize = "L";
                else if (weight < 92) recommendedSize = "XL";
                else recommendedSize = "XXL";
            }
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
    
    let descriptionText = `Based on your height of ${height} cm and weight of ${weight} kg, we suggest size **${recommendedSize}** for a premium fit.`;
    if (isKids) {
        descriptionText = `Based on your child's height of ${height} cm and weight of ${weight} kg, we recommend size **${recommendedSize}** for absolute comfort.`;
    }
    
    if (category === "Hoodies") {
        descriptionText += " Our hoodies are designed with an oversized fit, so going with this size will give you a cozy, drop-shoulder look.";
    } else if (category === "Jackets") {
        descriptionText += " Our jackets feature structured fits. If you prefer to layer heavily underneath, consider sizing up.";
    } else if (category === "Jeans") {
        descriptionText += " This corresponds to your waist sizing. The jeans feature an adjustable straight leg cut.";
    } else if (isFootwear) {
        descriptionText += " This matches standard EU sizing benchmarks for footwear.";
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
    const isFootwear = category === "Footwear" || catUpper.includes("SHOE") || catUpper.includes("SNEAKER") || catUpper.includes("SLIDE") || catUpper.includes("BOOT");
    const isKids = activeModalProduct.department === "Kids";
    let html = "";

    if (isKids) {
        if (isFootwear) {
            html = `
                <table class="size-chart-table">
                    <thead>
                        <tr>
                            <th>EURO SIZE</th>
                            <th>US SIZE</th>
                            <th>UK SIZE</th>
                            <th>FOOT LENGTH (CM)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>24</td><td>8C</td><td>7.5</td><td>15.0</td></tr>
                        <tr><td>26</td><td>9.5C</td><td>9</td><td>16.2</td></tr>
                        <tr><td>28</td><td>11C</td><td>10.5</td><td>17.5</td></tr>
                        <tr><td>30</td><td>12.5C</td><td>12</td><td>18.7</td></tr>
                        <tr><td>32</td><td>1Y</td><td>13.5</td><td>20.0</td></tr>
                        <tr><td>34</td><td>2.5Y</td><td>2</td><td>21.2</td></tr>
                        <tr><td>35</td><td>3.5Y</td><td>3</td><td>22.0</td></tr>
                    </tbody>
                </table>
            `;
        } else {
            html = `
                <table class="size-chart-table">
                    <thead>
                        <tr>
                            <th>KIDS SIZE</th>
                            <th>AGE GROUP</th>
                            <th>HEIGHT (CM)</th>
                            <th>CHEST (CM)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>2Y (S)</td><td>1-2 Years</td><td>86-92</td><td>52-54</td></tr>
                        <tr><td>4Y (M)</td><td>3-4 Years</td><td>98-104</td><td>55-57</td></tr>
                        <tr><td>6Y (L)</td><td>5-6 Years</td><td>110-116</td><td>58-60</td></tr>
                        <tr><td>8Y (XL)</td><td>7-8 Years</td><td>122-128</td><td>61-64</td></tr>
                        <tr><td>10Y</td><td>9-10 Years</td><td>134-140</td><td>65-69</td></tr>
                        <tr><td>12Y</td><td>11-12 Years</td><td>146-152</td><td>70-75</td></tr>
                    </tbody>
                </table>
            `;
        }
    } else {
        if (isFootwear) {
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
        } else {
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
        }
    }

    container.innerHTML = html;
}

/* 11.3 Customer Reviews System */
const SEEDED_REVIEWS = {};

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
            const parsed = JSON.parse(store);
            let hasFake = false;
            Object.values(parsed).forEach(list => {
                if (Array.isArray(list) && list.some(r => r.name === "Lina K." || r.name === "Marc A." || r.title === "INSANE FABRIC WEIGHT!")) {
                    hasFake = true;
                }
            });
            if (!hasFake) return parsed;
        } catch (e) {}
    }
    localStorage.setItem("styluxe_reviews", JSON.stringify({}));
    return {};
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
    if (product && product.brand) {
        return product.brand;
    }
    const name = product && product.name ? product.name.toUpperCase() : "";
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

// Renders the circular brand tags filtered specifically for active department
function renderBrandSlider() {
    const brandSlider = document.getElementById("brandSlider");
    if (!brandSlider) return;

    brandSlider.innerHTML = "";

    // 1. Get products belonging to active department
    let availableProducts = [...PRODUCTS];
    if (activeDepartment !== "All") {
        availableProducts = availableProducts.filter(p => p.department && p.department.trim().toLowerCase() === activeDepartment.trim().toLowerCase());
    }

    // 2. Extract unique brand names in current department
    const deptBrandNames = [...new Set(availableProducts.map(p => getProductBrand(p)))];
    const displayBrands = [{ name: "All", img: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=200" }, ...BRANDS];

    // Filter brand badges to ONLY those that belong to current department
    const filteredBrands = displayBrands.filter(b => 
        b.name === "All" || deptBrandNames.some(dbName => dbName && dbName.trim().toLowerCase() === b.name.trim().toLowerCase())
    );

    filteredBrands.forEach(b => {
        const card = document.createElement("div");
        card.classList.add("brand-circle-card");
        if (activeBrand.trim().toLowerCase() === b.name.trim().toLowerCase()) card.classList.add("active");

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
    if (activeBrand.trim().toLowerCase() === brand.trim().toLowerCase()) {
        activeBrand = "All";
    } else {
        activeBrand = brand;
    }
    const select = document.getElementById("brandFilterSelect");
    if (select) select.value = activeBrand;
    renderBrandSlider();
    renderProducts();
}

function filterByBrand(brand) {
    selectBrand(brand);
}

function populateBrandOptions() {
    const newProdBrand = document.getElementById("newProdBrand");
    if (newProdBrand) {
        newProdBrand.innerHTML = `<option value="" disabled selected>Select Brand</option>`;
        BRANDS.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.name;
            opt.textContent = b.name;
            newProdBrand.appendChild(opt);
        });
        if (BRANDS.length === 0 || !BRANDS.some(b => b.name === "Styluxe")) {
            const opt = document.createElement("option");
            opt.value = "Styluxe";
            opt.textContent = "Styluxe";
            newProdBrand.appendChild(opt);
        }
    }

    const brandFilterSelect = document.getElementById("brandFilterSelect");
    if (brandFilterSelect) {
        brandFilterSelect.innerHTML = `<option value="All">ALL BRANDS</option>`;
        
        let availableProducts = [...PRODUCTS];
        if (activeDepartment !== "All") {
            availableProducts = availableProducts.filter(p => p.department && p.department.trim().toLowerCase() === activeDepartment.trim().toLowerCase());
        }

        const deptBrandNames = [...new Set(availableProducts.map(p => getProductBrand(p)))];
        deptBrandNames.forEach(bName => {
            if (bName) {
                const opt = document.createElement("option");
                opt.value = bName;
                opt.textContent = bName.toUpperCase();
                brandFilterSelect.appendChild(opt);
            }
        });
        brandFilterSelect.value = activeBrand || "All";
    }
}

// Renders the category tags specifically for the selected department
function renderCategoryTags() {
    const filterTags = document.getElementById("filterTags");
    if (!filterTags) return;

    let availableProducts = [...PRODUCTS];
    if (activeDepartment !== "All") {
        availableProducts = availableProducts.filter(p => p.department && p.department.trim().toLowerCase() === activeDepartment.trim().toLowerCase());
    }

    const deptCatNames = [...new Set(availableProducts.map(p => p.category).filter(Boolean))];

    if (CATEGORIES && CATEGORIES.length > 0) {
        const dbCatNames = CATEGORIES
            .filter(c => activeDepartment === "All" || (c.department && c.department.trim().toLowerCase() === activeDepartment.trim().toLowerCase()))
            .map(c => c.name);
        dbCatNames.forEach(cn => {
            if (cn && !deptCatNames.includes(cn)) deptCatNames.push(cn);
        });
    }

    const uniqueCategories = ["All", ...deptCatNames];

    filterTags.innerHTML = "";
    uniqueCategories.forEach(cat => {
        const btn = document.createElement("button");
        btn.classList.add("filter-tag");
        if (activeCategory.trim().toLowerCase() === cat.trim().toLowerCase()) {
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
    const btn = document.getElementById("floatingWhatsappBtn");
    const label = document.getElementById("whatsappDeptTag");

    let number = "96171987654";
    let lbl = "GENERAL SUPPORT";

    if (dept === "All") {
        number = STORE_SETTINGS.whatsapp_global || "96101123456";
        lbl = "GENERAL SUPPORT";
    } else if (dept === "Men") {
        number = STORE_SETTINGS.whatsapp_men || "96170123456";
        lbl = "MEN'S SUPPORT";
    } else if (dept === "Women") {
        number = STORE_SETTINGS.whatsapp_women || "96170123456";
        lbl = "WOMEN'S SUPPORT";
    } else if (dept === "Kids") {
        number = STORE_SETTINGS.whatsapp_kids || "96170123456";
        lbl = "KIDS' SUPPORT";
    }

    const cleanNumber = number.replace(/[^\d]/g, "");

    if (btn) {
        const msg = encodeURIComponent(`Hi Styluxe, I'm inquiring about the ${dept === 'All' ? 'collections' : dept + ' collection'}.`);
        btn.href = `https://wa.me/${cleanNumber}?text=${msg}`;
    }
    if (label) {
        label.textContent = lbl;
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
    const btnSettings = document.getElementById("btnTabSettings");
    
    const btnCategories = document.getElementById("btnTabCategories");
    const btnBrands = document.getElementById("btnTabBrands");
    const btnSuppliers = document.getElementById("btnTabSuppliers");
    
    if (btnProducts) {
        btnProducts.style.display = perms.includes("manage_products") ? "flex" : "none";
    }
    if (btnCategories) {
        btnCategories.style.display = perms.includes("manage_products") ? "flex" : "none";
    }
    if (btnBrands) {
        btnBrands.style.display = perms.includes("manage_products") ? "flex" : "none";
    }
    if (btnSuppliers) {
        btnSuppliers.style.display = (currentAdminDept === "Global") ? "flex" : "none";
    }
    if (btnSettings) {
        btnSettings.style.display = (currentAdminDept === "Global") ? "flex" : "none";
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
        btnPos.style.display = "flex"; // Always show POS to all staff/managers
    }

    // Lock department selections for department managers
    const newCategoryDept = document.getElementById("newCategoryDept");
    const newProdDept = document.getElementById("newProdDept");

    if (currentAdminDept !== "Global" && currentAdminDept !== "") {
        // Lock Add Category Department Select to manager's department
        if (newCategoryDept) {
            newCategoryDept.value = currentAdminDept;
            newCategoryDept.disabled = true;
        }
        // Lock Add Product Department Select to manager's department
        if (newProdDept) {
            newProdDept.value = currentAdminDept;
            newProdDept.disabled = true;
            // Update product categories select
            updateCategoriesDatalist();
        }
    } else {
        // Unlock for Global Admin
        if (newCategoryDept) {
            newCategoryDept.disabled = false;
        }
        if (newProdDept) {
            newProdDept.disabled = false;
        }
    }

    // Toggle Exit POS button based on dashboard access
    const posExitBtn = document.getElementById("posExitBtn");
    if (posExitBtn) {
        const hasDashboardAccess = perms.includes("manage_products") || perms.includes("manage_orders");
        posExitBtn.style.display = hasDashboardAccess ? "flex" : "none";
    }

    // Toggle Reset Sales button (Only visible to Global Admin / General Manager)
    const resetBtn = document.getElementById("adminResetSalesBtn");
    if (resetBtn) {
        resetBtn.style.display = (currentAdminDept === "Global") ? "flex" : "none";
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
            <td>
                <span class="product-badge" style="background-color: var(--color-border); color: var(--color-text);">${s.role}</span>
                <div style="font-size: 1.1rem; color: var(--color-accent); margin-top: 0.3rem; font-weight: 600;">Dept: ${(s.department || 'Global').toUpperCase()}</div>
            </td>
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
    const department = document.getElementById("staffDept").value;

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
        permissions,
        department
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
            } else {
                openMyOrdersModal();
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

async function resetAllStoreSales() {
    const confirmation = confirm("Are you sure you want to permanently reset all sales and orders? This action cannot be undone!");
    if (!confirmation) return;

    try {
        const response = await fetch('/api/orders/reset', {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("All sales and orders reset successfully!");
            // Reload dashboard metrics and database
            await initAdminDashboard();
        } else {
            alert("Failed to reset sales. Please try again later.");
        }
    } catch (err) {
        console.error("Failed to reset sales:", err);
        alert("Failed to connect to the server to reset sales.");
    }
}

// ==========================================================================
// GENERAL STORE SETTINGS & COUPON CODES MANAGEMENT FRONTEND LOGIC
// ==========================================================================
function populateSettingsFields() {
    const feeInput = document.getElementById("settingsShippingFee");
    const thresholdInput = document.getElementById("settingsFreeShippingThreshold");
    const returnPassInput = document.getElementById("settingsReturnPassword");
    const smtpHostInput = document.getElementById("settingsSmtpHost");
    const smtpPortInput = document.getElementById("settingsSmtpPort");
    const smtpUserInput = document.getElementById("settingsSmtpUser");
    const smtpPassInput = document.getElementById("settingsSmtpPass");
    const smtpSenderInput = document.getElementById("settingsSmtpSender");
    const twitterCheck = document.getElementById("settingsShowTwitter");
    const tiktokCheck = document.getElementById("settingsShowTiktok");

    if (feeInput) feeInput.value = STORE_SETTINGS.shipping_fee || "5";
    if (thresholdInput) thresholdInput.value = STORE_SETTINGS.free_shipping_threshold || "150";
    if (returnPassInput) returnPassInput.value = STORE_SETTINGS.return_password || "admin123";
    if (smtpHostInput) smtpHostInput.value = STORE_SETTINGS.smtp_host || "";
    if (smtpPortInput) smtpPortInput.value = STORE_SETTINGS.smtp_port || "";
    if (smtpUserInput) smtpUserInput.value = STORE_SETTINGS.smtp_user || "";
    if (smtpPassInput) smtpPassInput.value = STORE_SETTINGS.smtp_pass || "";
    if (smtpSenderInput) smtpSenderInput.value = STORE_SETTINGS.smtp_sender || "";
    
    if (twitterCheck) twitterCheck.checked = (STORE_SETTINGS.show_twitter === "true");
    if (tiktokCheck) tiktokCheck.checked = (STORE_SETTINGS.show_tiktok === "true");

    for (let i = 0; i < 5; i++) {
        const previewDiv = document.querySelector(`.hero-slide-preview-container[data-index="${i}"]`);
        const previewImg = previewDiv ? previewDiv.querySelector("img") : null;
        const fileInput = document.querySelector(`.hero-slide-input[data-index="${i}"]`);

        if (fileInput) fileInput.value = "";
        if (previewDiv) {
            delete previewDiv.dataset.base64;
            delete previewDiv.dataset.isChanged;
            delete previewDiv.dataset.isCleared;
            
            const savedImg = STORE_SETTINGS[`heroImage_${i}`];
            if (savedImg && previewImg) {
                previewImg.src = savedImg;
                previewDiv.style.display = "block";
            } else {
                previewDiv.style.display = "none";
            }
        }
    }

    const suffixes = ["global", "men", "women", "kids"];
    suffixes.forEach(suffix => {
        const uSuffix = suffix.charAt(0).toUpperCase() + suffix.slice(1);
        const whatsappInput = document.getElementById(`settingsWhatsapp${uSuffix}`);
        const instagramInput = document.getElementById(`settingsInstagram${uSuffix}`);
        const facebookInput = document.getElementById(`settingsFacebook${uSuffix}`);
        const twitterInput = document.getElementById(`settingsTwitter${uSuffix}`);
        const tiktokInput = document.getElementById(`settingsTiktok${uSuffix}`);

        if (whatsappInput) whatsappInput.value = STORE_SETTINGS[`whatsapp_${suffix}`] || "";
        if (instagramInput) instagramInput.value = STORE_SETTINGS[`instagram_${suffix}`] || "";
        if (facebookInput) facebookInput.value = STORE_SETTINGS[`facebook_${suffix}`] || "";
        if (twitterInput) twitterInput.value = STORE_SETTINGS[`twitter_${suffix}`] || "";
        if (tiktokInput) tiktokInput.value = STORE_SETTINGS[`tiktok_${suffix}`] || "";
    });
}

let heroSliderInterval = null;

function applyHeroBackgroundFromSettings() {
    const sliderContainer = document.getElementById("heroSlider");
    if (!sliderContainer) return;

    const images = [];
    for (let i = 0; i < 5; i++) {
        const img = STORE_SETTINGS[`heroImage_${i}`];
        if (img) {
            images.push(img);
        }
    }

    if (images.length === 0) {
        if (STORE_SETTINGS.heroImage) {
            images.push(STORE_SETTINGS.heroImage);
        } else {
            images.push('assets/hero_bg.png');
        }
    }

    sliderContainer.innerHTML = "";
    images.forEach((imgSrc, idx) => {
        const slide = document.createElement("div");
        slide.classList.add("hero-slide");
        if (idx === 0) slide.classList.add("active");
        slide.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('${imgSrc}')`;
        sliderContainer.appendChild(slide);
    });

    if (heroSliderInterval) {
        clearInterval(heroSliderInterval);
        heroSliderInterval = null;
    }

    if (images.length > 1) {
        let activeIdx = 0;
        const slides = sliderContainer.querySelectorAll(".hero-slide");
        heroSliderInterval = setInterval(() => {
            if (slides[activeIdx]) slides[activeIdx].classList.remove("active");
            activeIdx = (activeIdx + 1) % slides.length;
            if (slides[activeIdx]) slides[activeIdx].classList.add("active");
        }, 5000);
    }
}

async function saveAllGeneralSettings() {
    const feeInput = document.getElementById("settingsShippingFee");
    const thresholdInput = document.getElementById("settingsFreeShippingThreshold");
    const returnPassInput = document.getElementById("settingsReturnPassword");
    const smtpHostInput = document.getElementById("settingsSmtpHost");
    const smtpPortInput = document.getElementById("settingsSmtpPort");
    const smtpUserInput = document.getElementById("settingsSmtpUser");
    const smtpPassInput = document.getElementById("settingsSmtpPass");
    const smtpSenderInput = document.getElementById("settingsSmtpSender");
    const twitterCheck = document.getElementById("settingsShowTwitter");
    const tiktokCheck = document.getElementById("settingsShowTiktok");

    const payload = {};
    if (feeInput) payload.shipping_fee = feeInput.value;
    if (thresholdInput) payload.free_shipping_threshold = thresholdInput.value;
    if (returnPassInput) payload.return_password = returnPassInput.value.trim();
    if (smtpHostInput) payload.smtp_host = smtpHostInput.value.trim();
    if (smtpPortInput) payload.smtp_port = smtpPortInput.value.trim();
    if (smtpUserInput) payload.smtp_user = smtpUserInput.value.trim();
    if (smtpPassInput) payload.smtp_pass = smtpPassInput.value.trim();
    if (smtpSenderInput) payload.smtp_sender = smtpSenderInput.value.trim();
    if (twitterCheck) payload.show_twitter = String(twitterCheck.checked);
    if (tiktokCheck) payload.show_tiktok = String(tiktokCheck.checked);

    const suffixes = ["global", "men", "women", "kids"];
    suffixes.forEach(suffix => {
        const uSuffix = suffix.charAt(0).toUpperCase() + suffix.slice(1);
        const whatsappInput = document.getElementById(`settingsWhatsapp${uSuffix}`);
        const instagramInput = document.getElementById(`settingsInstagram${uSuffix}`);
        const facebookInput = document.getElementById(`settingsFacebook${uSuffix}`);
        const twitterInput = document.getElementById(`settingsTwitter${uSuffix}`);
        const tiktokInput = document.getElementById(`settingsTiktok${uSuffix}`);

        if (whatsappInput) payload[`whatsapp_${suffix}`] = whatsappInput.value.trim();
        if (instagramInput) payload[`instagram_${suffix}`] = instagramInput.value.trim();
        if (facebookInput) payload[`facebook_${suffix}`] = facebookInput.value.trim();
        if (twitterInput) payload[`twitter_${suffix}`] = twitterInput.value.trim();
        if (tiktokInput) payload[`tiktok_${suffix}`] = tiktokInput.value.trim();
    });

    for (let i = 0; i < 5; i++) {
        const previewDiv = document.querySelector(`.hero-slide-preview-container[data-index="${i}"]`);
        if (previewDiv) {
            if (previewDiv.dataset.isCleared === "true") {
                payload[`heroImage_${i}`] = "";
            } else if (previewDiv.dataset.base64) {
                payload[`heroImage_${i}`] = previewDiv.dataset.base64;
            } else {
                payload[`heroImage_${i}`] = STORE_SETTINGS[`heroImage_${i}`] || "";
            }
        }
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("General settings saved successfully for all departments!");
            const resSettings = await fetch('/api/settings');
            if (resSettings.ok) {
                STORE_SETTINGS = await resSettings.json();
                applyHeroBackgroundFromSettings();
            }
            await loadProductsFromServer();
        } else {
            alert("Failed to save settings.");
        }
    } catch (e) {
        console.error("Error saving general settings:", e);
        alert("Failed to connect to server to save settings.");
    }
}

function clearHeroSlide(index) {
    const previewDiv = document.querySelector(`.hero-slide-preview-container[data-index="${index}"]`);
    const fileInput = document.querySelector(`.hero-slide-input[data-index="${index}"]`);
    if (fileInput) fileInput.value = "";
    if (previewDiv) {
        previewDiv.style.display = "none";
        previewDiv.dataset.isCleared = "true";
        delete previewDiv.dataset.base64;
    }
}

function renderAdminCoupons() {
    const tableBody = document.getElementById("adminCouponsTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (COUPONS.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 1.5rem 0;">No active coupons found.</td></tr>`;
        return;
    }

    COUPONS.forEach(c => {
        const tr = document.createElement("tr");
        const discountStr = c.discountType === 'percent' ? `${c.discountValue}%` : `$${c.discountValue}`;
        tr.innerHTML = `
            <td><strong>${c.code}</strong></td>
            <td>${discountStr}</td>
            <td style="text-align: center;">
                <button onclick="deleteCoupon('${c.code}')" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.3rem;"><i class="fa-regular fa-trash-can"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

async function addCouponSubmit(event) {
    event.preventDefault();
    const code = document.getElementById("newCouponCode").value.trim().toUpperCase();
    const type = document.getElementById("newCouponType").value;
    const value = parseFloat(document.getElementById("newCouponValue").value);

    if (!code || isNaN(value) || value <= 0) {
        alert("Please enter coupon details correctly.");
        return;
    }

    try {
        const response = await fetch('/api/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, discountType: type, discountValue: value })
        });

        if (response.ok) {
            alert("Coupon added successfully!");
            event.target.reset();
            await loadProductsFromServer();
        } else {
            const err = await response.json();
            alert("Failed to add coupon: " + err.error);
        }
    } catch (e) {
        console.error("Error adding coupon:", e);
        alert("Failed to connect to server to add coupon.");
    }
}

async function deleteCoupon(code) {
    if (!confirm(`Are you sure you want to delete coupon ${code} permanently?`)) return;

    try {
        const response = await fetch(`/api/coupons?code=${code}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("Coupon deleted successfully!");
            await loadProductsFromServer();
        } else {
            alert("Failed to delete coupon.");
        }
    } catch (e) {
        console.error("Error deleting coupon:", e);
        alert("Failed to connect to server to delete coupon.");
    }
}

function updateSocialFooterLinks() {
    const instLink = document.getElementById("footerInsta");
    const fbLink = document.getElementById("footerFB");
    const twitterLink = document.getElementById("footerTwitter");
    const tiktokLink = document.getElementById("footerTiktok");

    const suffix = activeDepartment === "All" ? "global" : activeDepartment.toLowerCase();

    if (instLink) {
        instLink.href = STORE_SETTINGS[`instagram_${suffix}`] || "#";
    }
    if (fbLink) {
        fbLink.href = STORE_SETTINGS[`facebook_${suffix}`] || "#";
    }
    if (twitterLink) {
        twitterLink.href = STORE_SETTINGS[`twitter_${suffix}`] || "#";
        twitterLink.style.display = (STORE_SETTINGS.show_twitter === "true") ? "inline-block" : "none";
    }
    if (tiktokLink) {
        tiktokLink.href = STORE_SETTINGS[`tiktok_${suffix}`] || "#";
        tiktokLink.style.display = (STORE_SETTINGS.show_tiktok === "true") ? "inline-block" : "none";
    }
}

function openTermsModal() {
    const backdrop = document.getElementById("termsModalBackdrop");
    if (backdrop) {
        backdrop.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closeTermsModal() {
    const backdrop = document.getElementById("termsModalBackdrop");
    if (backdrop) {
        backdrop.classList.remove("active");
        document.body.style.overflow = "";
    }
}

const INFO_PAGES = {
    "refund": {
        title: "REFUND & RETURNS POLICY",
        content: `
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <div>
                    <h3 style="color: var(--color-accent); font-size: 1.5rem; margin-bottom: 0.8rem; font-weight: 600;">1. RETURNS ELIGIBILITY</h3>
                    <p>We accept returns and exchanges within 14 days of delivery. Items must be unworn, unwashed, and in their original packaging with all tags attached.</p>
                </div>
                <div>
                    <h3 style="color: var(--color-accent); font-size: 1.5rem; margin-bottom: 0.8rem; font-weight: 600;">2. REFUND PROCESS</h3>
                    <p>Once your return is inspected and approved, your refund will be processed. Refunds are issued via the original payment method or store credit.</p>
                </div>
                <div>
                    <h3 style="color: var(--color-accent); font-size: 1.5rem; margin-bottom: 0.8rem; font-weight: 600;">3. CUSTOM PIECES</h3>
                    <p>Please note that custom-made garments or altered items are not eligible for returns or exchanges unless defective.</p>
                </div>
            </div>
        `
    },
    "track": {
        title: "TRACK YOUR ORDER",
        content: `
            <div style="display: flex; flex-direction: column; gap: 2rem; text-align: center; padding: 2rem 0;">
                <i class="fa-solid fa-truck-fast" style="font-size: 4rem; color: var(--color-accent); margin-bottom: 1rem;"></i>
                <p style="font-size: 1.4rem;">Enter your Order ID (e.g. STX-12345) below to track the shipping status of your package.</p>
                <div style="display: flex; gap: 1rem; max-width: 400px; margin: 2rem auto 0; width: 100%;">
                    <input type="text" id="trackOrderInput" placeholder="Order ID (e.g. STX-12345)" style="background-color: var(--color-background); border: 1px solid var(--color-border); padding: 1rem; color: var(--color-text); flex: 1; text-align: center; text-transform: uppercase; border-radius: 4px;">
                    <button onclick="trackOrderSubmit()" style="background-color: var(--color-accent); color: #000; border: none; font-weight: 700; padding: 0 2rem; cursor: pointer; border-radius: 4px;">TRACK</button>
                </div>
                <div id="trackResult" style="margin-top: 2rem; font-size: 1.3rem; font-weight: 600; line-height: 1.6;"></div>
            </div>
        `
    },
    "shipping": {
        title: "SHIPPING & RETURNS",
        content: `
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <div>
                    <h3 style="color: var(--color-accent); font-size: 1.5rem; margin-bottom: 0.8rem; font-weight: 600;">1. SHIPPING DESTINATIONS</h3>
                    <p>We provide swift delivery across Lebanon (and select international regions). Local delivery takes 2-5 business days.</p>
                </div>
                <div>
                    <h3 style="color: var(--color-accent); font-size: 1.5rem; margin-bottom: 0.8rem; font-weight: 600;">2. SHIPPING FEES</h3>
                    <p>Shipping fee is automatically calculated at checkout. Enjoy FREE shipping when your purchase exceeds the free delivery threshold!</p>
                </div>
                <div>
                    <h3 style="color: var(--color-accent); font-size: 1.5rem; margin-bottom: 0.8rem; font-weight: 600;">3. RETURNS</h3>
                    <p>For return pickup requests, please contact our support department on WhatsApp.</p>
                </div>
            </div>
        `
    },
    "faqs": {
        title: "FREQUENTLY ASKED QUESTIONS",
        content: `
            <div style="display: flex; flex-direction: column; gap: 2rem; text-align: left;">
                <div style="border-bottom: 1px solid var(--color-border); padding-bottom: 1.5rem;">
                    <h4 style="color: var(--color-text); font-size: 1.4rem; margin-bottom: 0.6rem; font-weight: 600;">Q: Are your hoodies oversized?</h4>
                    <p style="color: var(--color-text-muted);">A: Yes! Our streetwear pieces are designed with a relaxed, premium oversized fit. Check our size guides in product details.</p>
                </div>
                <div style="border-bottom: 1px solid var(--color-border); padding-bottom: 1.5rem;">
                    <h4 style="color: var(--color-text); font-size: 1.4rem; margin-bottom: 0.6rem; font-weight: 600;">Q: What payment methods do you accept?</h4>
                    <p style="color: var(--color-text-muted);">A: We currently support Cash on Delivery (COD) for all orders.</p>
                </div>
                <div style="border-bottom: 1px solid var(--color-border); padding-bottom: 1.5rem;">
                    <h4 style="color: var(--color-text); font-size: 1.4rem; margin-bottom: 0.6rem; font-weight: 600;">Q: Can I exchange sizes?</h4>
                    <p style="color: var(--color-text-muted);">A: Absolutely. Contact us on WhatsApp within 14 days, and we will swap sizes for you.</p>
                </div>
            </div>
        `
    },
    "support": {
        title: "CONTACT SUPPORT",
        content: `
            <div style="display: flex; flex-direction: column; gap: 2.5rem; text-align: center; padding: 2rem 0;">
                <i class="fa-solid fa-headset" style="font-size: 4rem; color: var(--color-accent); margin-bottom: 1rem;"></i>
                <p style="font-size: 1.4rem;">Our support team is available 24/7. Chat with us directly on WhatsApp or call our support lines.</p>
                <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 300px; margin: 1rem auto 0; width: 100%;">
                    <a href="https://wa.me/96171987654" target="_blank" style="background-color: #2ecc71; color: white; text-decoration: none; padding: 1.2rem 2rem; font-weight: 700; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 0.8rem;"><i class="fa-brands fa-whatsapp"></i> WHATSAPP CHAT</a>
                    <a href="mailto:support@styluxe.com" style="background-color: var(--color-surface); color: var(--color-text); text-decoration: none; border: 1px solid var(--color-border); padding: 1.2rem 2rem; font-weight: 700; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 0.8rem;"><i class="fa-regular fa-envelope"></i> EMAIL SUPPORT</a>
                </div>
            </div>
        `
    }
};

function openInfoModal(type) {
    const data = INFO_PAGES[type];
    if (!data) return;

    const titleEl = document.getElementById("infoModalTitle");
    const bodyEl = document.getElementById("infoModalBody");
    const backdrop = document.getElementById("infoModalBackdrop");

    if (titleEl) titleEl.innerHTML = data.title;
    if (bodyEl) bodyEl.innerHTML = data.content;

    if (backdrop) {
        backdrop.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closeInfoModal() {
    const backdrop = document.getElementById("infoModalBackdrop");
    if (backdrop) {
        backdrop.classList.remove("active");
        document.body.style.overflow = "";
    }
}

function trackOrderSubmit() {
    const inputVal = document.getElementById("trackOrderInput").value.trim();
    const resultEl = document.getElementById("trackResult");
    if (!resultEl) return;

    if (!inputVal) {
        resultEl.style.color = "var(--color-error)";
        resultEl.innerHTML = "Please enter your Order ID or phone number.";
        return;
    }

    resultEl.innerHTML = `<div style="text-align: center; margin-top: 1rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--color-accent);"></i> Searching...</div>`;

    fetch(`/api/orders/track?query=${encodeURIComponent(inputVal)}`)
        .then(res => {
            if (!res.ok) throw new Error("Order not found");
            return res.json();
        })
        .then(orders => {
            if (!orders || orders.length === 0) {
                resultEl.style.color = "var(--color-error)";
                resultEl.innerHTML = "No orders found. Please verify and try again.";
                return;
            }

            if (orders.length === 1) {
                renderSingleOrderTracking(orders[0]);
            } else {
                resultEl.style.color = "var(--color-text)";
                let html = `<div style="text-align: left; margin-top: 2rem;">`;
                html += `<h4 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 1rem; color: var(--color-accent);">We found ${orders.length} orders matching this query:</h4>`;
                html += `<div style="display: flex; flex-direction: column; gap: 1rem;">`;
                orders.forEach(o => {
                    html += `
                        <div onclick="selectOrderToTrack('${o.id}')" style="background: var(--color-surface); border: 1px solid var(--color-border); padding: 1.5rem; border-radius: 6px; cursor: pointer; transition: border-color 0.2s;" onmouseover="this.style.borderColor='var(--color-accent)'" onmouseout="this.style.borderColor='var(--color-border)'">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <strong style="font-size: 1.1rem; color: var(--color-text);">ORDER ID: #${o.id}</strong>
                                <span style="font-size: 1rem; color: var(--color-text-muted);">${o.date}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 1.1rem; font-weight: 700; color: ${o.status === 'Cancelled' ? 'var(--color-error)' : '#2ecc71'}; text-transform: uppercase;">${o.status.toUpperCase()}</span>
                                <strong style="font-size: 1.1rem;">${formatPrice(o.total)}</strong>
                            </div>
                        </div>
                    `;
                });
                html += `</div></div>`;
                resultEl.innerHTML = html;
            }
        })
        .catch(err => {
            console.error("Error tracking order:", err);
            resultEl.style.color = "var(--color-error)";
            resultEl.innerHTML = "Failed to load tracking details. Please try again.";
        });
}

function selectOrderToTrack(orderId) {
    const resultEl = document.getElementById("trackResult");
    if (!resultEl) return;
    resultEl.innerHTML = `<div style="text-align: center; margin-top: 1rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--color-accent);"></i> Loading timeline...</div>`;
    
    fetch(`/api/orders/track?query=${encodeURIComponent(orderId)}`)
        .then(res => res.json())
        .then(orders => {
            if (orders && orders[0]) {
                renderSingleOrderTracking(orders[0]);
            }
        });
}

function renderSingleOrderTracking(order) {
    const resultEl = document.getElementById("trackResult");
    if (!resultEl) return;

    let step = 1;
    let statusText = "ORDER RECEIVED";
    let linePercent = 0;

    const statusUpper = (order.status || "").toLowerCase();
    if (statusUpper === "processing" || statusUpper === "packaged") {
        step = 2;
        statusText = "PROCESSING & PACKAGING";
        linePercent = 33.3;
    } else if (statusUpper === "shipped" || statusUpper === "on the way") {
        step = 3;
        statusText = "SHIPPED & IN TRANSIT";
        linePercent = 66.6;
    } else if (statusUpper === "delivered" || statusUpper === "completed") {
        step = 4;
        statusText = "DELIVERED TO DESTINATION";
        linePercent = 100;
    } else if (statusUpper === "cancelled") {
        step = 0;
        statusText = "ORDER CANCELLED";
    }

    let stepperHtml = "";
    if (step > 0) {
        stepperHtml = `
            <div class="tracking-stepper" style="display: flex; justify-content: space-between; position: relative; margin: 3rem 0 2rem; padding: 0 1rem;">
                <div style="position: absolute; top: 15px; left: 0; right: 0; height: 4px; background: var(--color-border); z-index: 1;"></div>
                <div style="position: absolute; top: 15px; left: 0; width: ${linePercent}%; height: 4px; background: var(--color-accent); z-index: 2; transition: width 0.5s ease;"></div>
                
                <div style="display: flex; flex-direction: column; align-items: center; z-index: 3; flex: 1;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${step >= 1 ? 'var(--color-accent)' : 'var(--color-surface)'}; border: 2px solid ${step >= 1 ? 'var(--color-accent)' : 'var(--color-border)'}; color: ${step >= 1 ? '#000' : 'var(--color-text-muted)'}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem;"><i class="fa-solid fa-check"></i></div>
                    <span style="font-size: 0.95rem; margin-top: 0.8rem; font-weight: 600; color: ${step >= 1 ? 'var(--color-text)' : 'var(--color-text-muted)'};">PLACED</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; z-index: 3; flex: 1;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${step >= 2 ? 'var(--color-accent)' : 'var(--color-surface)'}; border: 2px solid ${step >= 2 ? 'var(--color-accent)' : 'var(--color-border)'}; color: ${step >= 2 ? '#000' : 'var(--color-text-muted)'}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem;"><i class="fa-solid fa-box"></i></div>
                    <span style="font-size: 0.95rem; margin-top: 0.8rem; font-weight: 600; color: ${step >= 2 ? 'var(--color-text)' : 'var(--color-text-muted)'};">PROCESSING</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; z-index: 3; flex: 1;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${step >= 3 ? 'var(--color-accent)' : 'var(--color-surface)'}; border: 2px solid ${step >= 3 ? 'var(--color-accent)' : 'var(--color-border)'}; color: ${step >= 3 ? '#000' : 'var(--color-text-muted)'}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem;"><i class="fa-solid fa-truck"></i></div>
                    <span style="font-size: 0.95rem; margin-top: 0.8rem; font-weight: 600; color: ${step >= 3 ? 'var(--color-text)' : 'var(--color-text-muted)'};">SHIPPED</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; z-index: 3; flex: 1;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${step >= 4 ? 'var(--color-accent)' : 'var(--color-surface)'}; border: 2px solid ${step >= 4 ? 'var(--color-accent)' : 'var(--color-border)'}; color: ${step >= 4 ? '#000' : 'var(--color-text-muted)'}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem;"><i class="fa-solid fa-house-chimney"></i></div>
                    <span style="font-size: 0.95rem; margin-top: 0.8rem; font-weight: 600; color: ${step >= 4 ? 'var(--color-text)' : 'var(--color-text-muted)'};">DELIVERED</span>
                </div>
            </div>
        `;
    } else {
        stepperHtml = `
            <div style="background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.25); padding: 1.5rem; border-radius: 4px; color: var(--color-error); text-align: center; margin: 2rem 0; font-weight: 700;">
                <i class="fa-solid fa-ban" style="font-size: 2rem; margin-bottom: 0.8rem; display: block;"></i>
                ORDER HAS BEEN CANCELLED
            </div>
        `;
    }

    resultEl.style.color = "var(--color-text)";
    resultEl.innerHTML = `
        <div style="background: var(--color-surface); border: 1px solid var(--color-border); padding: 2.5rem; border-radius: 8px; text-align: left; margin-top: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h4 style="font-size: 1.4rem; font-weight: 700; color: var(--color-accent); margin: 0;">ORDER ID: #${order.id}</h4>
                    <p style="font-size: 1rem; color: var(--color-text-muted); margin: 0.5rem 0 0;">Date: ${order.date}</p>
                </div>
                <div style="text-align: right;">
                    <span style="background: ${order.status === 'Cancelled' ? 'rgba(231,76,60,0.1)' : 'rgba(46,204,113,0.1)'}; border: 1px solid ${order.status === 'Cancelled' ? 'rgba(231,76,60,0.25)' : 'rgba(46,204,113,0.25)'}; color: ${order.status === 'Cancelled' ? 'var(--color-error)' : '#2ecc71'}; padding: 0.5rem 1.2rem; border-radius: 4px; font-weight: 700; text-transform: uppercase; font-size: 0.95rem;">${order.status}</span>
                </div>
            </div>
            
            ${stepperHtml}

            <div style="margin-top: 2.5rem;">
                <h5 style="font-size: 1.2rem; font-weight: 700; border-bottom: 1px solid var(--color-border); padding-bottom: 0.8rem; margin-bottom: 1rem;">ITEMS ORDERED</h5>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${order.items.map(item => `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-weight: 600; color: var(--color-text);">${item.name}</span>
                                <span style="font-size: 0.95rem; color: var(--color-text-muted); display: block; margin-top: 0.2rem;">Size: ${item.size} | Qty: ${item.quantity}</span>
                            </div>
                            <span style="font-weight: 600;">${formatPrice(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 1.5rem; margin-top: 1.5rem; font-weight: 700; font-size: 1.2rem;">
                <span>GRAND TOTAL</span>
                <span style="color: var(--color-accent);">${formatPrice(order.total)}</span>
            </div>
        </div>
    `;
}

let activeAdminOrder = null;

function openAdminOrderDetailsModal(orderId) {
    const order = ordersList.find(o => o.id === orderId);
    if (!order) return;

    activeAdminOrder = order;

    const contentDiv = document.getElementById("adminOrderDetailsContent");
    
    // Build items rows with product images!
    let itemsHTML = "";
    order.items.forEach(item => {
        const prod = PRODUCTS.find(p => p.id === item.id);
        const imgUrl = item.image || (prod ? getProductMainImage(prod) : 'assets/favicon.jpg');
        const colorVal = item.color || "Black";
        const returnedQty = item.returnedQty || 0;
        const availableToReturn = item.quantity - returnedQty;
        
        let returnBtnHTML = "";
        if (availableToReturn > 0) {
            returnBtnHTML = `
                <button class="status-change-btn" style="background-color: var(--color-error); color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: all 0.25s ease;" onclick="initiateItemReturn('${order.id}', ${item.id}, '${item.size}', '${colorVal}', ${availableToReturn})">
                    RETURN ITEM
                </button>
            `;
        }
        
        let returnStatusHTML = "";
        if (returnedQty > 0) {
            returnStatusHTML = `
                <div style="font-size: 1.05rem; color: var(--color-error); font-weight: 700; margin-top: 0.3rem;">
                    (Returned: ${returnedQty})
                </div>
            `;
        }
        
        itemsHTML += `
            <div style="display: flex; align-items: center; gap: 1.5rem; padding: 1.2rem 0; border-bottom: 1px solid var(--color-border);">
                <img src="${imgUrl}" alt="${item.name}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border);">
                <div style="flex: 1;">
                    <h4 style="font-size: 1.3rem; font-weight: 700; margin: 0 0 0.4rem 0;">${item.name}</h4>
                    <span style="font-size: 1.1rem; color: var(--color-text-muted);">SIZE: ${item.size} / COLOR: ${colorVal}</span>
                    ${item.preorder ? '<span style="font-size: 0.9rem; font-weight: 700; color: var(--color-accent); letter-spacing: 0.05em; display: inline-block; margin-left: 0.8rem;">PRE-ORDER</span>' : ''}
                    ${returnStatusHTML}
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem;">
                    <div>
                        <div style="font-weight: 700; font-size: 1.3rem;">${formatPrice(item.price * item.quantity)}</div>
                        <div style="font-size: 1.1rem; color: var(--color-text-muted); margin-top: 0.2rem;">${item.quantity} x ${formatPrice(item.price)}</div>
                    </div>
                    ${returnBtnHTML}
                </div>
            </div>
        `;
    });

    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal >= 150 ? 0 : 5;
    const discount = Math.max(0, subtotal + shipping - order.total);

    contentDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2.5rem; padding-bottom: 2rem; border-bottom: 1px solid var(--color-border);">
            <div>
                <h3 style="font-size: 1.4rem; font-weight: 700; color: var(--color-accent); margin-bottom: 1rem;">ORDER INFO</h3>
                <p style="margin: 0.4rem 0; font-size: 1.2rem;"><strong>Order ID:</strong> #${order.id}</p>
                <p style="margin: 0.4rem 0; font-size: 1.2rem;"><strong>Date:</strong> ${order.date}</p>
                <p style="margin: 0.4rem 0; font-size: 1.2rem;"><strong>Status:</strong> <span style="font-weight:700; color: ${order.status.includes("DELIVERED") ? "var(--color-success)" : order.status.includes("SHIPPED") ? "#5ac8fa" : "var(--color-accent)"};">${order.status.toUpperCase()}</span></p>
                <p style="margin: 0.4rem 0; font-size: 1.2rem;"><strong>Payment:</strong> COD (Cash on Delivery)</p>
            </div>
            <div>
                <h3 style="font-size: 1.4rem; font-weight: 700; color: var(--color-accent); margin-bottom: 1rem;">CUSTOMER DETAILS</h3>
                <p style="margin: 0.4rem 0; font-size: 1.2rem;"><strong>Name:</strong> ${order.customer || order.customerName}</p>
                <p style="margin: 0.4rem 0; font-size: 1.2rem;"><strong>Phone:</strong> ${order.phone || order.customerPhone}</p>
                <p style="margin: 0.4rem 0; font-size: 1.2rem;"><strong>Email:</strong> ${order.userEmail || order.customerEmail || 'N/A'}</p>
                <p style="margin: 0.4rem 0; font-size: 1.2rem;"><strong>Address:</strong> ${order.address || order.customerAddress}</p>
            </div>
        </div>

        <h3 style="font-size: 1.4rem; font-weight: 700; color: var(--color-accent); margin-bottom: 1.5rem;">ORDER ITEMS</h3>
        <div style="margin-bottom: 2.5rem;">
            ${itemsHTML}
        </div>

        <div style="width: 280px; margin-left: auto; display: flex; flex-direction: column; gap: 0.8rem; font-size: 1.2rem; padding: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--color-border); border-radius: 6px;">
            <div style="display: flex; justify-content: space-between;">
                <span>Subtotal:</span>
                <span>${formatPrice(subtotal)}</span>
            </div>
            ${discount > 0 ? `
            <div style="display: flex; justify-content: space-between; color: var(--color-error);">
                <span>Discount:</span>
                <span>-${formatPrice(discount)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between;">
                <span>Shipping:</span>
                <span>${shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.4rem; border-top: 1px solid var(--color-border); padding-top: 0.8rem; color: var(--color-accent);">
                <span>Total:</span>
                <span>${formatPrice(order.total)}</span>
            </div>
        </div>

        <div style="margin-top: 2.5rem; text-align: center; display: flex; gap: 1.2rem; justify-content: center; flex-wrap: wrap;">
            <button onclick="printOrderSticker('${order.id}')" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: #ffffff; border: none; font-weight: 700; padding: 1rem 2rem; font-size: 1.1rem; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.6rem; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.35);">
                <i class="fa-solid fa-truck-fast"></i> PRINT DELIVERY STICKER 🚚
            </button>
            <button onclick="printOrderInvoice('${order.id}')" style="background: linear-gradient(135deg, #c7a369 0%, #a88448 100%); color: #000000; border: none; font-weight: 700; padding: 1rem 2rem; font-size: 1.1rem; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.6rem; box-shadow: 0 4px 15px rgba(199, 163, 105, 0.35);">
                <i class="fa-solid fa-file-invoice-dollar"></i> PRINT SALES INVOICE 🧾
            </button>
        </div>
    `;

    document.getElementById("adminOrderDetailsModalBackdrop").classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeAdminOrderDetailsModal() {
    document.getElementById("adminOrderDetailsModalBackdrop").classList.remove("active");
    document.body.style.overflow = "";
    activeAdminOrder = null;
}

function printActiveOrderInvoice() {
    if (!activeAdminOrder) return;
    const order = activeAdminOrder;

    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal >= 150 ? 0 : 5;
    const discount = Math.max(0, subtotal + shipping - order.total);

    let itemsRows = "";
    order.items.forEach(item => {
        const colorVal = item.color || "Black";
        itemsRows += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px; text-align: left;">
                    <div style="font-weight: bold; font-size: 14px;">${item.name}</div>
                    <div style="font-size: 12px; color: #666;">Size: ${item.size} / Color: ${colorVal} ${item.preorder ? '<strong>(PRE-ORDER)</strong>' : ''}</div>
                </td>
                <td style="padding: 12px; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; text-align: right;">$${item.price.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `;
    });

    const invoiceWindow = window.open("", "_blank");
    invoiceWindow.document.write(`
        <html>
        <head>
            <title>Invoice - #${order.id}</title>
            <style>
                body {
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    color: #333;
                    padding: 40px;
                    margin: 0;
                    background-color: #fff;
                }
                .invoice-box {
                    max-width: 800px;
                    margin: auto;
                    border: 1px solid #eee;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
                    padding: 30px;
                    border-radius: 8px;
                }
                .invoice-header {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 0.1em;
                }
                .details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 40px;
                }
                .details-block h3 {
                    margin-top: 0;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 8px;
                    font-size: 16px;
                }
                .details-block p {
                    margin: 6px 0;
                    font-size: 14px;
                    line-height: 1.4;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                    padding: 12px;
                    text-align: left;
                    border-bottom: 2px solid #ddd;
                }
                .totals-box {
                    width: 250px;
                    margin-left: auto;
                    font-size: 14px;
                    line-height: 1.8;
                }
                .totals-box div {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 0;
                }
                .totals-box .grand-total {
                    font-size: 18px;
                    font-weight: bold;
                    border-top: 2px solid #333;
                    padding-top: 10px;
                    margin-top: 10px;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .invoice-box {
                        border: none;
                        box-shadow: none;
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-box">
                <div class="invoice-header">
                    <div>
                        <div class="logo">STYLUXE</div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">Riad Al Solh Street, Beirut, Lebanon</div>
                        <div style="font-size: 12px; color: #666;">Phone: +961 71 987 654</div>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; font-size: 24px; color: #333;">INVOICE</h2>
                        <div style="font-size: 14px; margin-top: 8px;">Order: <strong>#${order.id}</strong></div>
                        <div style="font-size: 14px; color: #666;">Date: ${order.date}</div>
                    </div>
                </div>

                <div class="details-grid">
                    <div class="details-block">
                        <h3>Customer Info</h3>
                        <p><strong>Name:</strong> ${order.customer || order.customerName}</p>
                        <p><strong>Phone:</strong> ${order.phone || order.customerPhone}</p>
                        <p><strong>Email:</strong> ${order.userEmail || order.customerEmail || 'N/A'}</p>
                        <p><strong>Address:</strong> ${order.address || order.customerAddress}</p>
                    </div>
                    <div class="details-block">
                        <h3>Order Status & Payment</h3>
                        <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
                        <p><strong>Payment Method:</strong> Cash on Delivery (COD)</p>
                        <p><strong>Shipping Carrier:</strong> Local Delivery Rider</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left;">Item & Description</th>
                            <th style="text-align: center; width: 80px;">Qty</th>
                            <th style="text-align: right; width: 100px;">Price</th>
                            <th style="text-align: right; width: 120px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <div class="totals-box">
                    <div>
                        <span>Subtotal:</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    ${discount > 0 ? `
                    <div style="color: #c0392b;">
                        <span>Discount:</span>
                        <span>-$${discount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div>
                        <span>Shipping:</span>
                        <span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
                    </div>
                    <div class="grand-total">
                        <span>Total Due:</span>
                        <span>$${order.total.toFixed(2)}</span>
                    </div>
                </div>

                <div style="margin-top: 60px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
                    Thank you for shopping at STYLUXE!
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    invoiceWindow.document.close();
}

async function initiateItemReturn(orderId, productId, size, color, maxQty) {
    let qtyStr = prompt(`Enter quantity to return (Maximum: ${maxQty}):`, "1");
    if (qtyStr === null) return;
    
    let qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0 || qty > maxQty) {
        alert(`Invalid quantity. Must be between 1 and ${maxQty}.`);
        return;
    }

    let managerPassword = "";
    
    const role = currentAdminStaff ? currentAdminStaff.role : "";
    if (role !== "Manager" && role !== "Administrator") {
        managerPassword = prompt("UNAUTHORIZED: Manager authorization required. Please enter Manager Password to approve this return:");
        if (managerPassword === null) return;
        if (!managerPassword.trim()) {
            alert("Manager password is required.");
            return;
        }
    }

    try {
        const response = await fetch('/api/orders/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId,
                productId,
                size,
                color,
                quantity: qty,
                staffEmail: currentAdminStaff ? currentAdminStaff.email : "",
                staffPassword: currentAdminPassword || "",
                managerPassword
            })
        });

        const result = await response.json();
        
        if (response.ok) {
            alert("Item returned successfully! Product inventory has been restocked.");
            
            // Refresh local order list and reopen/update the modal
            if (typeof loadOrdersFromServer === 'function') {
                await loadOrdersFromServer();
            }
            if (typeof loadProductsFromServer === 'function') {
                await loadProductsFromServer();
            }
            
            setTimeout(() => {
                openAdminOrderDetailsModal(orderId);
                if (typeof renderAdminOrders === 'function') {
                    renderAdminOrders();
                }
                if (typeof renderAdminProducts === 'function') {
                    renderAdminProducts();
                }
            }, 500);
        } else {
            alert(`Return failed: ${result.error}`);
        }
    } catch (err) {
        console.error("Failed to process item return:", err);
        alert("Failed to connect to server. Please try again.");
    }
}

function togglePosMode() {
    const titleEl = document.getElementById("posTitleEl");
    const toggleBtn = document.getElementById("posModeToggleBtn");
    
    if (posMode === "sales") {
        posMode = "return";
        if (titleEl) {
            titleEl.innerHTML = `<i class="fa-solid fa-rotate-left"></i> RETURN TERMINAL`;
            titleEl.style.color = "#e74c3c";
        }
        if (toggleBtn) {
            toggleBtn.innerHTML = `<i class="fa-solid fa-cash-register"></i> SWITCH TO SALE`;
            toggleBtn.style.backgroundColor = "rgba(46, 204, 113, 0.12)";
            toggleBtn.style.borderColor = "rgba(46, 204, 113, 0.3)";
            toggleBtn.style.color = "#2ecc71";
        }
        const payBtn = document.querySelector(".pos-pay-btn");
        if (payBtn) {
            payBtn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> COMPLETE RETURN`;
            payBtn.style.background = "linear-gradient(135deg, #e74c3c, #c0392b)";
            payBtn.style.color = "#ffffff";
        }
    } else {
        posMode = "sales";
        if (titleEl) {
            titleEl.innerHTML = `<i class="fa-solid fa-cash-register"></i> POS TERMINAL`;
            titleEl.style.color = "";
        }
        if (toggleBtn) {
            toggleBtn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> SWITCH TO RETURN`;
            toggleBtn.style.backgroundColor = "rgba(231, 76, 60, 0.12)";
            toggleBtn.style.borderColor = "rgba(231, 76, 60, 0.3)";
            toggleBtn.style.color = "#e74c3c";
        }
        const payBtn = document.querySelector(".pos-pay-btn");
        if (payBtn) {
            payBtn.innerHTML = `<i class="fa-solid fa-check-circle"></i> COMPLETE SALE`;
            payBtn.style.background = "";
            payBtn.style.color = "";
        }
    }
    
    posCart = [];
    renderPosTicketItems();
}

function showPosReturnReceipt(order, subtotal, discount, total) {
    document.getElementById("receiptDate").textContent = new Date().toISOString().split('T')[0] + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById("receiptCustomer").textContent = order.customerName;
    
    const cashierName = currentAdminStaff ? currentAdminStaff.name : "SYSTEM ADMIN";
    const cashierEl = document.getElementById("receiptCashier");
    if (cashierEl) cashierEl.textContent = cashierName;
    
    const paper = document.getElementById("posReceiptPaper");
    if (paper) {
        const title = paper.querySelector("h2");
        if (title) title.innerHTML = "STYLUXE - REFUND";
    }
    
    const receiptItemsContainer = document.getElementById("receiptItems");
    receiptItemsContainer.innerHTML = "";

    order.items.forEach(item => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.innerHTML = `
            <span>[RETURN] ${item.name} (x${item.quantity}) [${item.size}]</span>
            <span>-${formatPrice(item.price * item.quantity)}</span>
        `;
        receiptItemsContainer.appendChild(div);
    });

    document.getElementById("receiptSubtotal").textContent = `-${formatPrice(subtotal)}`;
    document.getElementById("receiptDiscount").textContent = `0.00`;
    document.getElementById("receiptTotal").textContent = `-${formatPrice(total)}`;

    document.getElementById("labelOrderId").textContent = order.id;
    document.getElementById("labelName").textContent = order.customerName;
    document.getElementById("labelPhone").textContent = order.customerPhone;
    document.getElementById("labelAddress").textContent = order.customerAddress;
    document.getElementById("labelItems").innerHTML = order.items.map(item => `[RETURN] ${item.name} (${item.size}) x${item.quantity}`).join("<br>");

    document.getElementById("posReceiptModalBackdrop").classList.add("active");
    
    posCart = [];
    renderPosTicketItems();
}

function onDailyReportCashierChange(val) {
    dailyReportCashierFilter = val;
    openDailyReportModal();
}

async function handleNewsletterSubscribe(event, form) {
    event.preventDefault();
    const emailInput = document.getElementById("newsletterEmailInput");
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    if (!email) return;

    try {
        const response = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        if (response.ok) {
            alert("THANK YOU FOR SUBSCRIBING TO OUR NEWSLETTER!");
            form.reset();
        } else {
            const data = await response.json();
            alert(`Subscription failed: ${data.error}`);
        }
    } catch (err) {
        console.error("Newsletter subscription error:", err);
        alert("Subscription failed. Please check your connection.");
    }
}

