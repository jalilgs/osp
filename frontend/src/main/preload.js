const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Auth
  login: (username, password) => ipcRenderer.invoke('login', username, password),
  getUsername: () => ipcRenderer.invoke('getUsername'),
  getRole: () => ipcRenderer.invoke('getRole'),

  // Produits
  getProducts: () => ipcRenderer.invoke('getProducts'),
  createProduct: (data) => ipcRenderer.invoke('createProduct', data),
  updateProduct: (id, data) => ipcRenderer.invoke('updateProduct', id, data),
  deleteProduct: (id) => ipcRenderer.invoke('deleteProduct', id),

  // Ventes
  getSales: () => ipcRenderer.invoke('getSales'),
  checkout: (payload) => ipcRenderer.invoke('checkout', payload),

  // Clients
  getCustomers: () => ipcRenderer.invoke('getCustomers'),
  createCustomer: (data) => ipcRenderer.invoke('createCustomer', data),

  // ========= UTILISATEURS (Admin) =========
  getUsers: () => ipcRenderer.invoke('getUsers'),
  createUser: (data) => ipcRenderer.invoke('createUser', data),
  updateUser: (id, data) => ipcRenderer.invoke('updateUser', id, data),
  deleteUser: (id) => ipcRenderer.invoke('deleteUser', id),
  updateUserRole: (id, role) => ipcRenderer.invoke('updateUserRole', id, role),
  getUserId: () => ipcRenderer.invoke('getUserId'),
});
