const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (username, password) => ipcRenderer.invoke('login', username, password),
  getUsername: () => ipcRenderer.invoke('getUsername'),
  getProducts: () => ipcRenderer.invoke('getProducts'),
  getSales: () => ipcRenderer.invoke('getSales'),
  checkout: (payload) => ipcRenderer.invoke('checkout', payload),  // ✅ on attend un objet { items, customer_id }
  // CRUD produits
  createProduct: (data) => ipcRenderer.invoke('createProduct', data),
  updateProduct: (id, data) => ipcRenderer.invoke('updateProduct', id, data),
  deleteProduct: (id) => ipcRenderer.invoke('deleteProduct', id),
  // Clients
  getCustomers: () => ipcRenderer.invoke('getCustomers'),
  createCustomer: (data) => ipcRenderer.invoke('createCustomer', data),
});
