// Bootstrap form validation
(() => {
  'use strict';
  const forms = document.querySelectorAll('.needs-validation');
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
})();

// Dark Mode Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');

  function updateThemeUI(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (themeIcon) {
      if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
      } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
      }
    }
  }

  // Initialize UI based on current attribute
  const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
  updateThemeUI(currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-bs-theme');
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      updateThemeUI(newTheme);
    });
  }

  // Auto dismiss toast alerts after 4 seconds
  const customToasts = document.querySelectorAll('.custom-toast');
  customToasts.forEach(toast => {
    setTimeout(() => {
      const alert = bootstrap.Alert.getOrCreateInstance(toast);
      if (alert) alert.close();
    }, 4000);
  });
});