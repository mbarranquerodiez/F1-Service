const loginForm = document.getElementById('loginForm');
   const emailInput = document.getElementById('email');
   const passwordInput = document.getElementById('password');
   const emailError = document.getElementById('emailError');
   const passwordError = document.getElementById('passwordError');
   const successMessage = document.getElementById('successMessage');
   const loginBtn = document.querySelector('.login-btn');
   const btnText = document.querySelector('.btn-text');
   const btnLoader = document.querySelector('.btn-loader');
   const passwordToggle = document.getElementById('passwordToggle');

   // Verificar que los elementos existan
   if (!loginForm || !emailInput || !passwordInput || !emailError || !passwordError || !successMessage || !loginBtn || !btnText || !btnLoader || !passwordToggle) {
       console.error('Uno o más elementos del DOM no se encontraron');
   }

   // Función para mostrar mensajes de error
   function showError(element, message) {
       element.textContent = message;
       element.style.display = 'block';
       element.classList.add('show');
       // Añadir clase error al form-group padre
       element.closest('.form-group').classList.add('error');
   }

   // Función para ocultar mensajes de error
   function clearErrors() {
       emailError.textContent = '';
       passwordError.textContent = '';
       emailError.style.display = 'none';
       passwordError.style.display = 'none';
       emailError.classList.remove('show');
       passwordError.classList.remove('show');
       emailInput.closest('.form-group').classList.remove('error');
       passwordInput.closest('.form-group').classList.remove('error');
   }

   // Función para mostrar el mensaje de éxito
   function showSuccess() {
       successMessage.style.display = 'flex';
       successMessage.classList.add('show');
   }

   // Función para alternar visibilidad de la contraseña
   passwordToggle.addEventListener('click', () => {
       const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
       passwordInput.setAttribute('type', type);
       passwordToggle.querySelector('.eye-icon').classList.toggle('active');
   });

   // Manejar el envío del formulario
   loginForm.addEventListener('submit', async (e) => {
       e.preventDefault();
       clearErrors();

       const username = emailInput.value.trim();
       const password = passwordInput.value.trim();

       // Validar campos vacíos
       let isValid = true;
       if (!username) {
           showError(emailError, 'Enter User');
           isValid = false;
       }
       if (!password) {
           showError(passwordError, 'Enter Password');
           isValid = false;
       }

       if (!isValid) return;

       // Mostrar loader en el botón
       loginBtn.disabled = true;
       loginBtn.classList.add('loading');
       btnText.style.display = 'none';
       btnLoader.style.display = 'inline-block';

       try {
           const response = await fetch('/api/users/login', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ username, password })
           });

           // Manejar respuestas del servidor
            if (response.ok) {
            // Código 200: Login exitoso
            const data = await response.json();
            const token = data.token;
            if (!token) {
                throw new Error('No se recibió token en la respuesta');
            }
            showSuccess();
            
            window.location.href="/home"
/*
          // Realizar solicitud a /api/endpoints/home con el token
            const homeResponse = await fetch('/home', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(homeResponse)
            console.log(homeResponse)

            if (homeResponse.ok) {
                // Renderizar la respuesta de /home
                const homeData = await homeResponse.text();
                document.body.innerHTML = homeData;
                // Redirigir a /home después de mostrar la página
                setTimeout(() => {
                    window.location.href = '/home';
                }, 2000);
            } else if (homeResponse.status === 401) {
                showError(emailError, 'Token inválido o expirado');
            } else {
                showError(emailError, `Error al cargar la página de inicio: ${homeResponse.status}`);
            }*/
            }  else if (response.status === 401) {
               // Código 401: Credenciales incorrectas
               showError(passwordError, 'Usuario o contraseña incorrectos');
            } else if (response.status === 500) {
               // Código 500: Error del servidor
               showError(emailError, 'Error al conectar con el servidor');
            } else {
               // Otros errores
               showError(emailError, 'Error desconocido. Intenta de nuevo.');
            }
       } catch (error) {
           console.error('Error al iniciar sesión:', error);
           showError(emailError, 'Error al conectar con el servidor');
       } finally {
           // Ocultar loader y restaurar botón
           loginBtn.disabled = false;
           loginBtn.classList.remove('loading');
           btnText.style.display = 'inline-block';
           btnLoader.style.display = 'none';
       }
   });