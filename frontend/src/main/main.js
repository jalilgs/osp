const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// ----- État de l'application -----
let authToken = null;
let authUsername = null;
let authRole = null;
let authUserId = null;

// ----- Création de la fenêtre -----
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '../renderer/login.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============================================================
// HANDLERS IPC
// ============================================================

// ----- LOGIN -----
ipcMain.handle('login', async (event, username, password) => {
  try {
    const res = await fetch('http://localhost:8000/api/v1/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.detail || 'Identifiants invalides' };
    }
    const data = await res.json();
    authToken = data.token;
    authUsername = data.username;
    authRole = data.role || 'Cashier';
    authUserId = data.user_id;  // <-- ajouter après authRole

    return { success: true, username: data.username, userId: data.user_id, role: authRole };
  } catch (err) {
    return { success: false, error: 'Erreur réseau – Django est-il démarré ?' };
  }
});

ipcMain.handle('getUserId', async () => {
  return authUserId || null;
});


ipcMain.handle('getUsername', async () => {
  return authUsername || 'User';
});

ipcMain.handle('getRole', async () => {
  return authRole || 'Cashier';
});

// ----- PRODUITS -----
ipcMain.handle('getProducts', async () => {
  if (!authToken) throw new Error('Not authenticated');
  const res = await fetch('http://localhost:8000/api/v1/products/', {
    headers: { 'Authorization': `Token ${authToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
});

ipcMain.handle('createProduct', async (event, productData) => {
  if (!authToken) throw new Error('Not authenticated');
  const res = await fetch('http://localhost:8000/api/v1/products/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${authToken}`
    },
    body: JSON.stringify(productData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create product');
  }
  return res.json();
});

ipcMain.handle('updateProduct', async (event, id, productData) => {
  if (!authToken) throw new Error('Not authenticated');
  const res = await fetch(`http://localhost:8000/api/v1/products/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${authToken}`
    },
    body: JSON.stringify(productData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update product');
  }
  return res.json();
});

ipcMain.handle('deleteProduct', async (event, id) => {
  if (!authToken) throw new Error('Not authenticated');
  const res = await fetch(`http://localhost:8000/api/v1/products/${id}/`, {
    method: 'DELETE',
    headers: { 'Authorization': `Token ${authToken}` }
  });
  if (!res.ok) throw new Error('Failed to delete product');
  return { success: true };
});

// ----- VENTES -----
ipcMain.handle('getSales', async () => {
  if (!authToken) throw new Error('Not authenticated');
  const res = await fetch('http://localhost:8000/api/v1/sales/', {
    headers: { 'Authorization': `Token ${authToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch sales');
  return res.json();
});

ipcMain.handle('checkout', async (event, payload) => {
  if (!authToken) throw new Error('Not authenticated');
  const res = await fetch('http://localhost:8000/api/v1/sales/checkout/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${authToken}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Checkout failed');
  }
  return res.json();
});

// ----- CLIENTS -----
ipcMain.handle('getCustomers', async () => {
  if (!authToken) throw new Error('Not authenticated');
  const res = await fetch('http://localhost:8000/api/v1/customers/', {
    headers: { 'Authorization': `Token ${authToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
});

ipcMain.handle('createCustomer', async (event, data) => {
  if (!authToken) throw new Error('Not authenticated');
  const res = await fetch('http://localhost:8000/api/v1/customers/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${authToken}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create customer');
  }
  return res.json();
});

// ----- UTILISATEURS (Admin seulement) -----
ipcMain.handle('getUsers', async () => {
  if (!authToken || authRole !== 'Admin') throw new Error('Permission denied');
  const res = await fetch('http://localhost:8000/api/v1/users/', {
    headers: { 'Authorization': `Token ${authToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
});

ipcMain.handle('createUser', async (event, userData) => {
  if (!authToken || authRole !== 'Admin') throw new Error('Permission denied');
  const res = await fetch('http://localhost:8000/api/v1/users/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${authToken}`
    },
    body: JSON.stringify(userData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create user');
  }
  return res.json();
});

ipcMain.handle('updateUserRole', async (event, userId, role) => {
  if (!authToken || authRole !== 'Admin') throw new Error('Permission denied');
  const res = await fetch(`http://localhost:8000/api/v1/users/${userId}/set_role/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${authToken}`
    },
    body: JSON.stringify({ role })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update user role');
  }
  return res.json();
});


// Récupérer un utilisateur (si besoin)
ipcMain.handle('getUser', async (event, userId) => {
  if (!authToken || authRole !== 'Admin') throw new Error('Permission denied');
  const res = await fetch(`http://localhost:8000/api/v1/users/${userId}/`, {
    headers: { 'Authorization': `Token ${authToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
});

// Mettre à jour un utilisateur
ipcMain.handle('updateUser', async (event, userId, userData) => {
  if (!authToken || authRole !== 'Admin') throw new Error('Permission denied');
  const res = await fetch(`http://localhost:8000/api/v1/users/${userId}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${authToken}`
    },
    body: JSON.stringify(userData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update user');
  }
  return res.json();
});

// Supprimer un utilisateur
ipcMain.handle('deleteUser', async (event, userId) => {
  if (!authToken || authRole !== 'Admin') throw new Error('Permission denied');
  const res = await fetch(`http://localhost:8000/api/v1/users/${userId}/`, {
    method: 'DELETE',
    headers: { 'Authorization': `Token ${authToken}` }
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return { success: true };
});
