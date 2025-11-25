// createAccount.js
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('createAccountForm');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const usernameError = document.getElementById('usernameError');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const successMessage = document.getElementById('successMessage');
  const submitBtn = form.querySelector('.login-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');

  // Toggle password visibility (igual que en login)
  const togglePassword = (inputId, toggleId) => {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    const eyeIcon = toggle.querySelector('.eye-icon');
    toggle.addEventListener('click', () => {
      const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', type);
      eyeIcon.classList.toggle('active', type === 'text');
    });
  };
  togglePassword('password', 'passwordToggle');
  togglePassword('confirmPassword', 'confirmPasswordToggle');

  // Validación client-side
  const validateForm = () => {
    let isValid = true;
    clearErrors();

    if (!usernameInput.value.trim()) {
      showError(usernameError, 'Username is required');
      isValid = false;
    } else if (usernameInput.value.length < 3) {
      showError(usernameError, 'Username must be at least 3 characters');
      isValid = false;
    }

    if (!emailInput.value.trim()) {
      showError(emailError, 'Email is required');
      isValid = false;
    } else if (!isValidEmail(emailInput.value)) {
      showError(emailError, 'Invalid email format');
      isValid = false;
    }

    if (!passwordInput.value) {
      showError(passwordError, 'Password is required');
      isValid = false;
    } else if (passwordInput.value.length < 6) {
      showError(passwordError, 'Password must be at least 6 characters');
      isValid = false;
    }

    if (confirmPasswordInput.value !== passwordInput.value) {
      showError(confirmPasswordError, 'Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const showError = (element, message) => {
    element.textContent = message;
    element.classList.add('visible');
  };

  const clearErrors = () => {
    [usernameError, emailError, passwordError, confirmPasswordError].forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
  };

  const showSuccess = () => {
    form.style.display = 'none';
    successMessage.style.display = 'block';
    setTimeout(() => {
      window.location.href = '/login';  // Redirect a login post-creación
    }, 2000);
  };

  const showServerError = (message) => {
    // Asume un div global para errores del server, o usa el primero (usernameError como fallback)
    showError(usernameError, message);  // O crea un <div id="globalError"> en EJS
  };

  // Submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    submitBtn.classList.add('loading');
    btnText.style.opacity = '0';
    btnLoader.style.opacity = '1';

    try {
      const formData = new FormData(form);
      const data = {
        username: usernameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value
      };

      const response = await fetch('/addUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess();
      } else {
        // Manejo de errores del backend (409 Conflict para duplicados)
        const errorMsg = result.message || 'An error occurred';
        if (errorMsg.includes('username')) {
          showError(usernameError, errorMsg);
        } else if (errorMsg.includes('email')) {
          showError(emailError, errorMsg);
        } else {
          showServerError(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      showServerError('Network error. Please try again.');
    } finally {
      submitBtn.classList.remove('loading');
      btnText.style.opacity = '1';
      btnLoader.style.opacity = '0';
    }
  });
});