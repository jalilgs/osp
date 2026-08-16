document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const result = await window.api.login(username, password);
  if (result.success) {
    window.location.href = 'pos.html';
  } else {
    document.getElementById('error').textContent = result.error;
  }
});
