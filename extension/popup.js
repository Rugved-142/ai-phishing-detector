document.getElementById('check').addEventListener('click', () => {
  document.getElementById('status').textContent = 'Checking...';
  setTimeout(() => {
    document.getElementById('status').textContent = 'Safe';
  }, 1000);
});