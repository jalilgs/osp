ipcMain.handle('checkout', async (event, payload) => {
  console.log('Main process received payload:', payload);
  if (!authToken) throw new Error('Not authenticated');
  const res = await fetch('http://localhost:8000/api/v1/sales/checkout/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${authToken}`
    },
    body: JSON.stringify(payload)  // payload = { items: [...], customer_id: ... }
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Checkout failed');
  }
  return res.json();
});
