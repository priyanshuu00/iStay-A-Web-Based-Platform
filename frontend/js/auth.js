// ============================================
// iStay Auth Module
// Handles login and registration forms
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (Auth.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            try {
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
                btn.disabled = true;

                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;

                if (!email || !password) {
                    showToast('Please fill in all fields', true);
                    return;
                }

                const data = await API.login(email, password);

                // Check if the user's actual role matches the selected tab
                const selectedRole = document.getElementById('loginRole')?.value || 'BUYER';
                if (data.role && data.role !== selectedRole) {
                    showToast(`This account is registered as a ${data.role}. Please use the "${data.role}" tab to login.`, true);
                    return;
                }

                Auth.setToken(data.token);
                Auth.setUser({ name: data.name, email: data.email, userId: data.userId, role: data.role });
                showToast('Login successful! Redirecting...');
                setTimeout(() => window.location.href = 'index.html', 1000);

            } catch (error) {
                showToast(error.data?.message || 'Login failed. Please check your credentials.', true);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = registerForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            try {
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
                btn.disabled = true;

                const name = document.getElementById('name').value.trim();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const role = document.getElementById('registerRole')?.value || 'BUYER';

                if (!name || !email || !password || !confirmPassword) {
                    showToast('Please fill in all fields', true);
                    return;
                }

                if (password.length < 6) {
                    showToast('Password must be at least 6 characters', true);
                    return;
                }

                if (password !== confirmPassword) {
                    showToast('Passwords do not match', true);
                    return;
                }

                const data = await API.register(name, email, password, role);
                Auth.setToken(data.token);
                Auth.setUser({ name: data.name, email: data.email, userId: data.userId, role: data.role });
                showToast('Registration successful! Redirecting...');
                setTimeout(() => window.location.href = 'index.html', 1000);

            } catch (error) {
                showToast(error.data?.message || 'Registration failed. Please try again.', true);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});
