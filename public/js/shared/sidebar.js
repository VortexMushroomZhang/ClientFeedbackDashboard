// Sidebar collapse/expand toggle — persists across pages via localStorage
(function () {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const icon = document.getElementById('toggle-icon');
  const STORAGE_KEY = 'sidebar-collapsed';

  function updateIcon() {
    icon.textContent = sidebar.classList.contains('collapsed') ? 'chevron_right' : 'chevron_left';
  }

  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
  }
  updateIcon();

  toggle.addEventListener('click', function () {
    sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem(STORAGE_KEY, sidebar.classList.contains('collapsed'));
    updateIcon();
  });
})();
