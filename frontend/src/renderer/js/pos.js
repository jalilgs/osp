// ------------------------------------------------------------
// ETAT GLOBAL
// ------------------------------------------------------------
let allProducts = [];
let categories = [];
let currentCategory = 'all';
let searchTimeout = null;
let currentUserId = null;
let currentUserRole = 'Cashier';

// ----- État des onglets clients (6 onglets) -----
const MAX_TABS = 6;
let customerTabs = Array.from({ length: MAX_TABS }, (_, i) => ({
  id: i,
  name: `Client ${i + 1}`,
  cart: []
}));
let activeTabIndex = 0; // 0-based
let selectedCartItemIndex = -1;

// ============================================================
// NOTIFICATIONS (toast)
// ============================================================
function showNotification(message, type = 'success') {
  const existing = document.getElementById('globalNotification');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'globalNotification';
  div.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    padding: 16px 24px;
    border-radius: 12px;
    background: ${type === 'success' ? '#28a745' : '#dc3545'};
    color: white;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 9999;
    max-width: 400px;
    transition: opacity 0.3s ease;
  `;
  div.textContent = message;
  document.body.appendChild(div);

  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 500);
  }, 3000);
}

// ============================================================
// FONCTIONS D'ACCÈS AU PANIER ACTIF
// ============================================================
function getActiveCart() {
  return customerTabs[activeTabIndex].cart;
}

function setActiveCart(newCart) {
  customerTabs[activeTabIndex].cart = newCart;
}

function getActiveTabName() {
  return customerTabs[activeTabIndex].name;
}

// ============================================================
// NAVIGATION (Sidebar)
// ============================================================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    const viewName = item.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');

    const titles = {
      dashboard: 'Tableaux de bord',
      counter: 'Point de Vente',
      billing: 'Facturation',
      apps: 'Apps',
      settings: 'Paramètres',
      history: 'Historique',
      users: 'Utilisateurs'
    };
    document.getElementById('pageTitle').textContent = titles[viewName] || viewName;

    if (viewName === 'dashboard') loadDashboard();
    if (viewName === 'counter') loadData();
    if (viewName === 'history') loadHistory();
    if (viewName === 'users') loadUsers();
  });
});

// ============================================================
// TOGGLE SIDEBAR
// ============================================================
const toggleBtn = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
  });
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  try {
    const sales = await window.api.getSales();
    const today = new Date().toDateString();
    let todayTotal = 0,
      todayItems = 0,
      todayTransactions = 0;

    sales.forEach(sale => {
      const saleDate = new Date(sale.timestamp).toDateString();
      if (saleDate === today) {
        todayTotal += parseFloat(sale.total) || 0;
        todayTransactions++;
        if (sale.items) {
          sale.items.forEach(item => {
            todayItems += item.qty || 0;
          });
        }
      }
    });

    document.getElementById('todayTotal').textContent = `$${todayTotal.toFixed(2)}`;
    document.getElementById('todayItems').textContent = todayItems;
    document.getElementById('todayTransactions').textContent = todayTransactions;

    const products = await window.api.getProducts();
    const lowStock = products.filter(p => (parseInt(p.stock_qty) || 0) < 5);
    document.getElementById('lowStockCount').textContent = lowStock.length;

    const recentSales = sales.slice(-5).reverse();
    const list = document.getElementById('recentSalesList');
    if (recentSales.length === 0) {
      list.innerHTML = '<p style="color:#aaa;">Aucune vente aujourd\'hui</p>';
    } else {
      list.innerHTML = recentSales.map(s => `
        <div class="recent-sale-item">
          <span class="sale-id">#${s.id}</span>
          <span>${new Date(s.timestamp).toLocaleTimeString()}</span>
          <span class="sale-total">$${parseFloat(s.total).toFixed(2)}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

// ============================================================
// VUE 1 : COMPTOIR (avec onglets clients)
// ============================================================
async function loadData() {
  try {
    allProducts = await window.api.getProducts();
    const catSet = new Set(allProducts.map(p => p.category?.name).filter(Boolean));
    categories = ['all', ...catSet];
    renderCategoryButtons();
    renderProducts(allProducts);
    renderTabs();
    renderCart();
  } catch (err) {
    const tbody = document.getElementById('productTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Erreur: ${err.message}</td></tr>`;
  }
}

// ----- Catégories -----
function renderCategoryButtons() {
  const container = document.getElementById('categoryFilters');
  if (!container) return;
  container.innerHTML = categories.map(cat => `
    <button class="cat-btn ${cat === currentCategory ? 'active' : ''}" data-cat="${cat}">
      ${cat === 'all' ? '📦 Tous' : cat}
    </button>
  `).join('');
  container.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      renderCategoryButtons();
      applyFilters();
    });
  });
}

function applyFilters() {
  const query = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';
  let filtered = allProducts;
  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category?.name === currentCategory);
  }
  if (query) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query)
    );
  }
  renderProducts(filtered);
}

function renderProducts(products) {
  const tbody = document.getElementById('productTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#8a8aaa;">Aucun produit trouvé</td></tr>';
    return;
  }
  products.forEach(p => {
    const price = parseFloat(p.price) || 0;
    const stock = parseInt(p.stock_qty) || 0;
    const isOutOfStock = stock === 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="${isOutOfStock ? 'color:#dc3545;' : ''}">${p.name} ${isOutOfStock ? '⚠️' : ''}</strong></td>
      <td>${p.sku}</td>
      <td>$${price.toFixed(2)}</td>
      <td style="${isOutOfStock ? 'color:#dc3545;font-weight:bold;' : ''}">${stock}</td>
      <td><button class="add-btn-table" data-id="${p.id}" ${isOutOfStock ? 'disabled style="background:#ccc;cursor:not-allowed;"' : ''}>
        ${isOutOfStock ? '⚠️ Rupture' : '➕ Ajouter'}
      </button></td>
    `;
    const btn = tr.querySelector('.add-btn-table');
    if (!isOutOfStock) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(p.id, 1);
      });
      tr.addEventListener('click', () => addToCart(p.id, 1));
    }
    tbody.appendChild(tr);
  });
}

// ----- Recherche & scan -----
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 200);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      const product = allProducts.find(p => p.sku === query || p.name.toLowerCase() === query.toLowerCase());
      if (product) {
        addToCart(product.id, 1);
        e.target.value = '';
        applyFilters();
      } else {
        applyFilters();
      }
    }
  });
}

// ----- Onglets clients -----
function renderTabs() {
  const tabBar = document.getElementById('tabBar');
  if (!tabBar) return;

  tabBar.innerHTML = customerTabs.map((tab, index) => {
    const itemCount = tab.cart.reduce((sum, item) => sum + item.qty, 0);
    const isActive = index === activeTabIndex;
    const badge = itemCount > 0 ? `<span class="tab-badge">${itemCount}</span>` : '';
    const indicator = isActive ? `<span class="tab-indicator">●</span>` : '';
    return `<button class="tab-btn ${isActive ? 'active' : ''}" data-index="${index}">
      ${indicator} ${tab.name} ${badge}
    </button>`;
  }).join('');

  tabBar.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTabIndex = parseInt(btn.dataset.index);
      renderTabs();
      renderCart();
      const msg = document.getElementById('checkoutMessage');
      if (msg) msg.textContent = '';
      updateActiveCustomerDisplay();
    });
  });

  updateActiveCustomerDisplay();
}

function updateActiveCustomerDisplay() {
  const display = document.getElementById('currentCustomerDisplay');
  if (display) {
    const activeTab = customerTabs[activeTabIndex];
    display.textContent = `Client actuel : ${activeTab.name}`;
  }
}

// ----- Gestion du panier -----
function addToCart(productId, qty = 1) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  const cart = getActiveCart();
  const existing = cart.find(item => item.product.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ product, qty });
  }
  renderCart();
  renderTabs();
}

function removeFromCart(productId) {
  const cart = getActiveCart();
  const newCart = cart.filter(item => item.product.id !== productId);
  setActiveCart(newCart);
  renderCart();
  renderTabs();
}

function updateQty(productId, delta) {
  const cart = getActiveCart();
  const item = cart.find(i => i.product.id === productId);
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  item.qty = newQty;
  renderCart();
  renderTabs();
}

function clearActiveCart() {
  if (getActiveCart().length === 0) return;
  if (confirm(`Vider le panier de "${getActiveTabName()}" ?`)) {
    setActiveCart([]);
    renderCart();
    renderTabs();
    const msg = document.getElementById('checkoutMessage');
    if (msg) msg.textContent = '';
  }
}

// Rendre les fonctions globales pour les onclick inline
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.clearActiveCart = clearActiveCart;

// ----- Rendu du panier -----
function renderCart() {
  const list = document.getElementById('cartList');
  const totalSpan = document.getElementById('totalAmount');
  const itemsSpan = document.getElementById('totalItems');
  const countSpan = document.getElementById('itemCount');
  if (!list) return;

  const cart = getActiveCart();

  if (cart.length === 0) {
    list.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;font-size:14px;">Panier vide</div>';
    if (totalSpan) totalSpan.textContent = '$0.00';
    if (itemsSpan) itemsSpan.textContent = '0';
    if (countSpan) countSpan.textContent = '(0)';
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  let html = '';
  let total = 0,
    totalItems = 0;

  cart.forEach((item, index) => {
    const price = parseFloat(item.product.price) || 0;
    const stock = parseInt(item.product.stock_qty) || 0;
    const isOutOfStock = stock < item.qty;
    const subtotal = price * item.qty;
    total += subtotal;
    totalItems += item.qty;
    const isSelected = (index === selectedCartItemIndex);

    html += `
      <li class="cart-item ${isSelected ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}" 
          data-index="${index}" 
          style="${isOutOfStock ? 'border-left:4px solid #dc3545;' : ''}">
        <div class="item-info">
          <span class="item-name" style="${isOutOfStock ? 'color:#dc3545;' : ''}">
            ${item.product.name} ${isOutOfStock ? `⚠️ (stock: ${stock})` : ''}
          </span>
          <span class="item-price">$${price.toFixed(2)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="qty-ctrl">
            <button onclick="updateQty(${item.product.id}, -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button onclick="updateQty(${item.product.id}, 1)">+</button>
          </div>
          <span class="item-subtotal">$${subtotal.toFixed(2)}</span>
          <button class="remove-btn" onclick="removeFromCart(${item.product.id})">✕</button>
        </div>
      </li>
    `;
  });

  list.innerHTML = html;

  list.querySelectorAll('.cart-item').forEach(li => {
    li.addEventListener('click', () => {
      const idx = parseInt(li.dataset.index);
      if (!isNaN(idx)) {
        selectedCartItemIndex = idx;
        renderCart();
      }
    });
  });

  if (totalSpan) totalSpan.textContent = `$${total.toFixed(2)}`;
  if (itemsSpan) itemsSpan.textContent = totalItems;
  if (countSpan) countSpan.textContent = `(${totalItems})`;
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) checkoutBtn.disabled = false;
}

// ----- Sélection d'article (pour F2-F4) -----
function getSelectedCartItem() {
  const cart = getActiveCart();
  if (selectedCartItemIndex >= 0 && selectedCartItemIndex < cart.length) {
    return cart[selectedCartItemIndex];
  }
  return null;
}

function increaseSelectedQty() {
  const item = getSelectedCartItem();
  if (item) updateQty(item.product.id, 1);
}

function decreaseSelectedQty() {
  const item = getSelectedCartItem();
  if (item) updateQty(item.product.id, -1);
}

function removeSelectedItem() {
  const item = getSelectedCartItem();
  if (item) {
    if (confirm(`Retirer ${item.product.name} du panier ?`)) {
      removeFromCart(item.product.id);
    }
  }
}

// ----- CHECKOUT (Paiement) -----
const checkoutBtn = document.getElementById('checkoutBtn');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async () => {
    const cart = getActiveCart();
    if (cart.length === 0) return;

    const btn = checkoutBtn;
    btn.disabled = true;
    btn.textContent = '⏳ Traitement...';
    const msg = document.getElementById('checkoutMessage');
    if (msg) {
      msg.style.color = '#007bff';
      msg.textContent = 'Traitement en cours...';
    }

    try {
      const cartItems = cart.map(item => ({
        product_id: item.product.id,
        qty: item.qty
      }));

      const payload = {
        items: cartItems,
        customer_id: null
      };

      const saleResult = await window.api.checkout(payload);

      if (msg) {
        msg.style.color = '#28a745';
        msg.textContent = `✅ Vente #${saleResult.id} – $${parseFloat(saleResult.total).toFixed(2)}`;
      }

      showReceipt(saleResult, cart);

      setActiveCart([]);
      renderCart();
      renderTabs();
      await loadData();

    } catch (err) {
      const errorMsg = err.message || 'Erreur inconnue';

      if (errorMsg.includes('Insufficient stock')) {
        const match = errorMsg.match(/Insufficient stock for (.+?)\. Available: (\d+)/);
        if (match) {
          const productName = match[1];
          const available = match[2];
          if (msg) {
            msg.style.color = '#dc3545';
            msg.innerHTML = `
              ⚠️ <strong>Stock insuffisant</strong><br>
              "${productName}" : disponible ${available} unité(s)<br>
              <button id="removeOutOfStockBtn" class="secondary" style="margin-top:6px;padding:4px 12px;border-radius:4px;border:none;cursor:pointer;background:#f0f2f6;">
                🗑 Retirer les articles en rupture
              </button>
            `;
            const removeBtn = document.getElementById('removeOutOfStockBtn');
            if (removeBtn) {
              removeBtn.addEventListener('click', () => {
                const outOfStockItems = cart.filter(item => (parseInt(item.product.stock_qty) || 0) < item.qty);
                outOfStockItems.forEach(item => {
                  const cart = getActiveCart();
                  const idx = cart.findIndex(i => i.product.id === item.product.id);
                  if (idx !== -1) cart.splice(idx, 1);
                });
                setActiveCart(getActiveCart());
                renderCart();
                renderTabs();
                if (msg) {
                  msg.style.color = '#28a745';
                  msg.textContent = '✅ Articles en rupture retirés du panier. Veuillez réessayer.';
                }
                btn.disabled = false;
                btn.textContent = '💳 Payer';
              });
            }
          }
        } else {
          if (msg) {
            msg.style.color = '#dc3545';
            msg.textContent = `❌ ${errorMsg}`;
          }
        }
      } else {
        if (msg) {
          msg.style.color = '#dc3545';
          msg.textContent = `❌ ${errorMsg}`;
        }
      }
    } finally {
      if (!document.getElementById('removeOutOfStockBtn')) {
        btn.disabled = false;
        btn.textContent = '💳 Payer';
      }
    }
  });
}

const clearCartBtn = document.getElementById('clearCartBtn');
if (clearCartBtn) clearCartBtn.addEventListener('click', clearActiveCart);

// ============================================================
// VUE 2 : GESTION DES PRODUITS (CRUD)
// ============================================================
async function loadProductManagement() {
  try {
    const products = await window.api.getProducts();
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    products.forEach(p => {
      const price = parseFloat(p.price) || 0;
      const stock = parseInt(p.stock_qty) || 0;
      const cat = p.category?.name || '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.sku}</td>
        <td>$${price.toFixed(2)}</td>
        <td>${stock}</td>
        <td>${cat}</td>
        <td class="actions">
          <button class="btn-sm btn-edit" data-id="${p.id}">✏️ Modifier</button>
          <button class="btn-sm btn-delete" data-id="${p.id}">🗑 Supprimer</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openProductModal(parseInt(btn.dataset.id)));
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(parseInt(btn.dataset.id)));
    });
  } catch (err) {
    const tbody = document.getElementById('productTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7">Erreur: ${err.message}</td></tr>`;
  }
}

const addProductBtn = document.getElementById('addProductBtn');
if (addProductBtn) {
  addProductBtn.addEventListener('click', () => openProductModal(null));
}

function openProductModal(productId = null) {
  const modal = document.getElementById('productModal');
  if (!modal) return;
  const title = document.getElementById('modalTitle');
  const form = document.getElementById('productForm');
  if (form) form.reset();
  const editId = document.getElementById('editProductId');
  if (editId) editId.value = '';
  const msg = document.getElementById('modalMessage');
  if (msg) msg.textContent = '';
  modal.classList.remove('hidden');

  if (productId) {
    if (title) title.textContent = '✏️ Modifier le produit';
    window.api.getProducts().then(products => {
      const p = products.find(pr => pr.id === productId);
      if (p) {
        if (editId) editId.value = p.id;
        document.getElementById('formName').value = p.name;
        document.getElementById('formSku').value = p.sku;
        document.getElementById('formPrice').value = p.price;
        document.getElementById('formStock').value = p.stock_qty;
        document.getElementById('formCategory').value = p.category?.name || '';
      }
    });
  } else {
    if (title) title.textContent = '➕ Ajouter un produit';
  }
}

const modalCancelBtn = document.getElementById('modalCancelBtn');
if (modalCancelBtn) {
  modalCancelBtn.addEventListener('click', () => {
    document.getElementById('productModal').classList.add('hidden');
  });
}

const modalSaveBtn = document.getElementById('modalSaveBtn');
if (modalSaveBtn) {
  modalSaveBtn.addEventListener('click', async () => {
    const id = document.getElementById('editProductId').value;
    const data = {
      name: document.getElementById('formName').value,
      sku: document.getElementById('formSku').value,
      price: parseFloat(document.getElementById('formPrice').value) || 0,
      stock_qty: parseInt(document.getElementById('formStock').value) || 0,
      category: document.getElementById('formCategory').value ? { name: document.getElementById('formCategory').value } : null
    };
    const msg = document.getElementById('modalMessage');
    try {
      let result;
      if (id) {
        result = await window.api.updateProduct(parseInt(id), data);
        if (msg) msg.textContent = '✅ Produit mis à jour !';
      } else {
        result = await window.api.createProduct(data);
        if (msg) msg.textContent = '✅ Produit ajouté !';
      }
      setTimeout(() => {
        document.getElementById('productModal').classList.add('hidden');
        loadProductManagement();
        loadData();
      }, 800);
    } catch (err) {
      if (msg) {
        msg.style.color = '#dc3545';
        msg.textContent = `❌ Erreur: ${err.message}`;
      }
    }
  });
}

async function deleteProduct(id) {
  if (!confirm('Supprimer ce produit définitivement ?')) return;
  try {
    await window.api.deleteProduct(id);
    loadProductManagement();
    loadData();
  } catch (err) {
    alert(`Erreur: ${err.message}`);
  }
}

// ============================================================
// VUE 3 : HISTORIQUE DES VENTES
// ============================================================
let allSales = [];

async function loadHistory(from = null, to = null) {
  try {
    const sales = await window.api.getSales();
    allSales = sales;

    let filtered = sales;
    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter(s => new Date(s.timestamp) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.timestamp) <= toDate);
    }

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const container = document.getElementById('historyList');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#888;padding:40px;">Aucune vente trouvée</p>';
      return;
    }

    container.innerHTML = filtered.map(s => `
      <div class="history-item" data-id="${s.id}">
        <span class="h-id">#${s.id}</span>
        <span class="h-date">${new Date(s.timestamp).toLocaleString()}</span>
        <span class="h-total">$${parseFloat(s.total).toFixed(2)}</span>
        <span style="color:#888;font-size:13px;">${s.items ? s.items.length : 0} articles</span>
        <button class="btn-sm btn-edit" onclick="toggleHistoryDetail(${s.id})">📋 Détail</button>
      </div>
      <div id="detail-${s.id}" class="history-detail" style="display:none;">
        ${s.items ? s.items.map(item => `
          <div class="item-row">
            <span>${item.product_detail?.name || 'Produit #' + item.product} × ${item.qty}</span>
            <span>$${(item.unit_price * item.qty).toFixed(2)}</span>
          </div>
        `).join('') : '<p>Aucun détail</p>'}
      </div>
    `).join('');
  } catch (err) {
    const container = document.getElementById('historyList');
    if (container) container.innerHTML = `<p style="color:red;">Erreur: ${err.message}</p>`;
  }
}

function toggleHistoryDetail(saleId) {
  const detail = document.getElementById(`detail-${saleId}`);
  if (detail) {
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  }
}
window.toggleHistoryDetail = toggleHistoryDetail;

document.getElementById('historyFilterBtn')?.addEventListener('click', () => {
  const from = document.getElementById('historyFrom')?.value || null;
  const to = document.getElementById('historyTo')?.value || null;
  loadHistory(from, to);
});

document.getElementById('historyResetBtn')?.addEventListener('click', () => {
  const from = document.getElementById('historyFrom');
  const to = document.getElementById('historyTo');
  if (from) from.value = '';
  if (to) to.value = '';
  loadHistory();
});

// ============================================================
// VUE 4 : PARAMÈTRES
// ============================================================
function loadSettings() {
  // Rien à charger pour l'instant
}

const saveSettingsBtn = document.getElementById('saveSettingsBtn');
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', () => {
    const storeName = document.getElementById('storeName')?.value || '';
    const msg = document.getElementById('settingsMessage');
    if (msg) {
      msg.style.color = '#28a745';
      msg.textContent = '✅ Paramètres sauvegardés (localement) !';
    }
  });
}

// ============================================================
// GESTION DES UTILISATEURS (Admin)
// ============================================================

// Charger la liste des utilisateurs
async function loadUsers() {
  try {
    const users = await window.api.getUsers();
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    users.forEach(user => {
      const isCurrentUser = (user.id === currentUserId);
      const tr = document.createElement('tr');

      // Colonne Rôle : si c'est l'utilisateur courant, on affiche juste du texte
      let roleCell = '';
      if (isCurrentUser) {
        roleCell = `<span style="font-weight:600; color:#4f46e5;">${user.role} (vous)</span>`;
      } else {
        roleCell = `
          <select class="role-select" data-userid="${user.id}">
            <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
            <option value="Manager" ${user.role === 'Manager' ? 'selected' : ''}>Manager</option>
            <option value="Cashier" ${user.role === 'Cashier' ? 'selected' : ''}>Caissier</option>
          </select>
        `;
      }

      // Colonne Actions : bouton Sauvegarder (masqué pour l'utilisateur courant)
      let actionsCell = '';
      if (isCurrentUser) {
        actionsCell = `<span style="color:#aaa;">—</span>`;
      } else {
        actionsCell = `
          <button class="btn-sm btn-edit" onclick="saveUserRole(${user.id})">💾 Sauvegarder rôle</button>
        `;
      }

      tr.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email || ''}</td>
        <td>${roleCell}</td>
        <td>${actionsCell}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    const tbody = document.getElementById('usersTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Erreur: ${err.message}</td></tr>`;
  }
}

// Sauvegarder le rôle d'un utilisateur (appelé par le bouton)
window.saveUserRole = async function(userId) {
  const select = document.querySelector(`.role-select[data-userid="${userId}"]`);
  if (!select) {
    showNotification('❌ Sélecteur non trouvé', 'error');
    return;
  }
  const newRole = select.value;

  if (userId === currentUserId) {
    showNotification('⚠️ Vous ne pouvez pas modifier votre propre rôle !', 'error');
    loadUsers();
    return;
  }

  try {
    await window.api.updateUserRole(userId, newRole);
    showNotification(`✅ Rôle mis à jour pour l'utilisateur #${userId}`, 'success');
    loadUsers();
  } catch (err) {
    showNotification(`❌ Erreur: ${err.message}`, 'error');
    loadUsers();
  }
};

// Ouvrir le modal (ajout ou modification)
function openUserModal(userId = null) {
  const modal = document.getElementById('userModal');
  const title = document.getElementById('userModalTitle');
  const form = document.getElementById('userForm');
  if (form) form.reset();
  document.getElementById('editUserId').value = '';
  document.getElementById('userModalMessage').textContent = '';
  document.getElementById('userFormPassword').required = true;
  modal.classList.remove('hidden');

  if (userId) {
    title.textContent = '✏️ Modifier l\'utilisateur';
    window.api.getUsers().then(users => {
      const u = users.find(user => user.id === userId);
      if (u) {
        document.getElementById('editUserId').value = u.id;
        document.getElementById('userFormUsername').value = u.username;
        document.getElementById('userFormEmail').value = u.email || '';
        document.getElementById('userFormPassword').value = '';
        document.getElementById('userFormPassword').required = false;
        document.getElementById('userFormRole').value = u.role || 'Cashier';
      }
    });
  } else {
    title.textContent = '➕ Ajouter un utilisateur';
    document.getElementById('userFormPassword').required = true;
  }
}

// Fermer le modal (bouton Annuler)
document.getElementById('userModalCancelBtn').addEventListener('click', () => {
  document.getElementById('userModal').classList.add('hidden');
});

// Sauvegarder (ajout ou modification)
document.getElementById('userModalSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('editUserId').value;
  const username = document.getElementById('userFormUsername').value.trim();
  const email = document.getElementById('userFormEmail').value.trim();
  const password = document.getElementById('userFormPassword').value;
  const role = document.getElementById('userFormRole').value;

  if (!username) {
    document.getElementById('userModalMessage').textContent = '❌ Le nom d\'utilisateur est requis.';
    return;
  }
  if (!id && !password) {
    document.getElementById('userModalMessage').textContent = '❌ Le mot de passe est requis pour un nouvel utilisateur.';
    return;
  }

  const msg = document.getElementById('userModalMessage');
  try {
    let result;
    if (id) {
      const updateData = { username, email, role };
      if (password) updateData.password = password;
      result = await window.api.updateUser(parseInt(id), updateData);
      msg.textContent = '✅ Utilisateur mis à jour !';
    } else {
      result = await window.api.createUser({ username, email, password, role });
      msg.textContent = '✅ Utilisateur créé !';
    }
    setTimeout(() => {
      document.getElementById('userModal').classList.add('hidden');
      loadUsers();
    }, 800);
  } catch (err) {
    msg.style.color = '#dc3545';
    msg.textContent = `❌ Erreur: ${err.message}`;
  }
});

// Supprimer un utilisateur
async function deleteUser(userId) {
  if (!confirm('Supprimer définitivement cet utilisateur ?')) return;
  try {
    await window.api.deleteUser(userId);
    loadUsers();
  } catch (err) {
    showNotification(`❌ Erreur: ${err.message}`, 'error');
  }
}

// Mettre à jour le rôle (si utilisé ailleurs, mais on utilise saveUserRole)
async function updateUserRole(userId, newRole) {
  if (userId === currentUserId) {
    showNotification('⚠️ Vous ne pouvez pas modifier votre propre rôle !', 'error');
    loadUsers();
    return;
  }
  try {
    await window.api.updateUserRole(userId, newRole);
    showNotification(`✅ Rôle mis à jour pour l'utilisateur #${userId}`, 'success');
    loadUsers();
  } catch (err) {
    showNotification(`❌ Erreur: ${err.message}`, 'error');
    loadUsers();
  }
}

// ============================================================
// RÉCÉPISSÉ (RECEIPT)
// ============================================================
function showReceipt(sale, cartItems) {
  const modal = document.getElementById('receiptModal');
  if (!modal) return;
  const body = document.getElementById('receiptBody');
  if (!body) return;
  let html = `
    <div style="text-align:center;margin-bottom:8px;">
      <strong>#${sale.id}</strong><br>
      ${new Date(sale.timestamp).toLocaleString()}
    </div>
  `;
  cartItems.forEach(item => {
    const price = parseFloat(item.product.price) || 0;
    const subtotal = price * item.qty;
    html += `
      <div class="receipt-item">
        <span>${item.product.name} × ${item.qty}</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
    `;
  });
  const total = parseFloat(sale.total) || 0;
  html += `
    <div class="receipt-total">
      <span>TOTAL</span>
      <span>$${total.toFixed(2)}</span>
    </div>
    <div style="text-align:center;margin-top:10px;color:#888;font-size:12px;">Merci !</div>
  `;
  body.innerHTML = html;
  modal.classList.remove('hidden');
}

window.closeReceipt = function() {
  document.getElementById('receiptModal').classList.add('hidden');
};

window.printReceipt = function() {
  const content = document.getElementById('receiptBody')?.innerHTML || '';
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`
      <html><head><title>Reçu</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: auto; }
        .receipt-item { display: flex; justify-content: space-between; padding: 2px 0; }
        .receipt-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; }
      </style>
      </head><body>
      <h2 style="text-align:center;">🧾 Reçu</h2>
      ${content}
      </body></html>
    `);
    win.document.close();
    win.print();
  }
};

// ============================================================
// RACCOURCIS CLAVIER
// ============================================================
document.addEventListener('keydown', (e) => {
  // Éviter les raccourcis dans les champs de saisie
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
    if (e.key !== 'F1' && e.key !== 'F5') return;
  }

  switch (e.key) {
    case 'F1':
      e.preventDefault();
      const search = document.getElementById('searchInput');
      if (search) { search.focus(); search.select(); }
      break;
    case 'F2':
      e.preventDefault();
      increaseSelectedQty();
      break;
    case 'F3':
      e.preventDefault();
      decreaseSelectedQty();
      break;
    case 'F4':
      e.preventDefault();
      removeSelectedItem();
      break;
    case 'F5':
      e.preventDefault();
      const nextIndex = (activeTabIndex + 1) % MAX_TABS;
      activeTabIndex = nextIndex;
      renderTabs();
      renderCart();
      const msg = document.getElementById('checkoutMessage');
      if (msg) msg.textContent = '';
      break;
    case 'F12':
      e.preventDefault();
      const payBtn = document.getElementById('checkoutBtn');
      if (payBtn && !payBtn.disabled) payBtn.click();
      break;
    case 'Escape':
      const receiptModal = document.getElementById('receiptModal');
      if (receiptModal && !receiptModal.classList.contains('hidden')) {
        closeReceipt();
      }
      const productModal = document.getElementById('productModal');
      if (productModal && !productModal.classList.contains('hidden')) {
        productModal.classList.add('hidden');
      }
      break;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
    e.preventDefault();
    clearActiveCart();
  }
});

// ============================================================
// INITIALISATION
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
  // Récupérer l'ID de l'utilisateur courant
  try {
    currentUserId = await window.api.getUserId();
    console.log('ID utilisateur courant :', currentUserId);
  } catch (err) {
    console.warn('Impossible de récupérer l\'ID utilisateur:', err);
  }

  // Récupérer le nom d'utilisateur
  try {
    const username = await window.api.getUsername();
    document.getElementById('username').textContent = username || 'User';
    document.getElementById('headerUsername').textContent = username || 'User';
  } catch {
    document.getElementById('username').textContent = 'User';
    document.getElementById('headerUsername').textContent = 'User';
  }

  // Charger le rôle et appliquer les permissions
  try {
    currentUserRole = await window.api.getRole();
    console.log('Rôle utilisateur :', currentUserRole);
  } catch {
    currentUserRole = 'Cashier';
  }
  applyPermissions();

  // Charger les données initiales
  await loadDashboard();
  await loadData();

  const search = document.getElementById('searchInput');
  if (search) setTimeout(() => search.focus(), 300);

  renderCart();
  renderTabs();
});

// ============================================================
// PERMISSIONS (Rôles)
// ============================================================
function applyPermissions() {
  const body = document.body;
  body.classList.remove('user-role-admin', 'user-role-manager', 'user-role-cashier');

  if (currentUserRole === 'Admin') {
    body.classList.add('user-role-admin');
  } else if (currentUserRole === 'Manager') {
    body.classList.add('user-role-manager');
  } else {
    body.classList.add('user-role-cashier');
  }

  const addProductBtn = document.getElementById('addProductBtn');
  if (addProductBtn) {
    const isManager = currentUserRole === 'Manager' || currentUserRole === 'Admin';
    addProductBtn.style.display = isManager ? 'inline-block' : 'none';
  }
}
