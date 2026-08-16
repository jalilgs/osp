window.addEventListener('DOMContentLoaded', async () => {
  try {
    const products = await window.api.getProducts();
    const list = document.getElementById('productList');
    products.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} (${p.sku}) - $${p.price} - Stock: ${p.stock_qty}`;
      list.appendChild(li);
    });
  } catch (err) {
    document.body.innerHTML = `<p style="color:red">Error loading products: ${err.message}</p>`;
  }
});

document.getElementById('checkoutNavBtn').addEventListener('click', () => {
  window.location.href = 'checkout.html';
});
