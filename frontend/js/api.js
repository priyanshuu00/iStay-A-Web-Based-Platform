// ============================================
// iStay API Layer
// Centralized API configuration and fetch wrapper
// ============================================

const API_BASE_URL = 'http://localhost:8081/api';

// ---- Token Management ----
const Auth = {
    getToken() {
        return localStorage.getItem('istay_token');
    },
    setToken(token) {
        localStorage.setItem('istay_token', token);
    },
    setUser(user) {
        localStorage.setItem('istay_user', JSON.stringify(user));
    },
    getUser() {
        const user = localStorage.getItem('istay_user');
        return user ? JSON.parse(user) : null;
    },
    isLoggedIn() {
        const token = this.getToken();
        if (!token) return false;
        // Check if token is expired
        if (this.isTokenExpired(token)) {
            this.logout(true);
            return false;
        }
        return true;
    },
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // exp is in seconds, Date.now() is in milliseconds
            return payload.exp * 1000 < Date.now();
        } catch (e) {
            return true; // Treat malformed tokens as expired
        }
    },
    logout(silent = false) {
        localStorage.removeItem('istay_token');
        localStorage.removeItem('istay_user');
        if (!silent) {
            window.location.href = 'login.html';
        }
    }
};

// ---- Fetch Wrapper ----
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = { ...options.headers };
    
    // Only set Content-Type if we're not sending FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (Auth.isLoggedIn()) {
        headers['Authorization'] = `Bearer ${Auth.getToken()}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();

        if (!response.ok) {
            // Auto-logout on 401 (token expired/invalid on server side)
            if (response.status === 401) {
                Auth.logout();
            }
            throw { status: response.status, data };
        }

        return data;
    } catch (error) {
        if (error.status) throw error;
        throw { status: 0, data: { message: 'Network error. Please check your connection.' } };
    }
}

// ---- API Methods ----
const API = {
    // Auth
    register(name, email, password, role) {
        return apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role })
        });
    },
    login(email, password) {
        return apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    // Properties
    getProperties(page = 0, size = 12, sortBy = 'createdAt', direction = 'desc') {
        return apiFetch(`/properties?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    },
    getPropertyById(id) {
        return apiFetch(`/properties/${id}`);
    },
    getRecommendations(userId) {
        return apiFetch(`/properties/recommend/${userId}`);
    },
    searchProperties(filters = {}) {
        const params = new URLSearchParams();
        if (filters.location) params.append('location', filters.location);
        if (filters.minPrice) params.append('minPrice', filters.minPrice);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
        if (filters.rooms) params.append('rooms', filters.rooms);
        if (filters.type) params.append('type', filters.type);
        if (filters.suitableFor) params.append('suitableFor', filters.suitableFor);
        if (filters.category) params.append('category', filters.category);
        if (filters.amenities) params.append('amenities', filters.amenities);
        params.append('page', filters.page || 0);
        params.append('size', filters.size || 12);
        params.append('sortBy', filters.sortBy || 'createdAt');
        params.append('direction', filters.direction || 'desc');
        if (Auth.isLoggedIn()) {
            params.append('userId', Auth.getUser().userId);
        }
        return apiFetch(`/properties/search?${params.toString()}`);
    },
    addProperty(propertyData) {
        return apiFetch('/properties', {
            method: 'POST',
            body: JSON.stringify(propertyData)
        });
    },
    updateProperty(id, propertyData) {
        return apiFetch(`/properties/${id}`, {
            method: 'PUT',
            body: JSON.stringify(propertyData)
        });
    },
    getOwnerProperties() {
        return apiFetch('/properties/owner');
    },
    deleteProperty(id) {
        return apiFetch(`/properties/${id}`, { method: 'DELETE' });
    },
    
    // Messages
    sendMessage(receiverId, propertyId, content) {
        return apiFetch('/messages', {
            method: 'POST',
            body: JSON.stringify({ receiverId, propertyId, content })
        });
    },
    getChatHistory(propertyId, otherUserId) {
        return apiFetch(`/messages/${propertyId}/${otherUserId}`);
    },
    getInbox() {
        return apiFetch('/messages/inbox');
    },
    
    // Uploads
    uploadImages(files) {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('images', files[i]);
        }
        return apiFetch('/upload', {
            method: 'POST',
            body: formData
        });
    }
};

// ---- UI Helpers ----
function showToast(message, isError = false) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-custom ${isError ? 'error' : ''}`;
    toast.innerHTML = `<strong>${isError ? '✕' : '✓'}</strong> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function updateNavbar() {
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');
    if (!authLinks || !userLinks) return;

    if (Auth.isLoggedIn()) {
        const user = Auth.getUser();
        authLinks.classList.remove('d-flex');
        authLinks.style.display = 'none';
        userLinks.style.display = 'flex';
        userLinks.classList.add('d-flex');
        const userName = userLinks.querySelector('.user-name');
        if (userName) userName.textContent = user?.name || 'User';

        // Role-based visibility: hide seller-only links for buyers
        const role = user?.role || 'BUYER';
        const addPropertyLink = userLinks.querySelector('a[href="add-property.html"]');
        const dashboardLink = userLinks.querySelector('a[href="dashboard.html"]');
        const dashboardDropdownItem = userLinks.querySelector('.dropdown-menu a[href="dashboard.html"]');

        if (role === 'BUYER') {
            if (addPropertyLink) addPropertyLink.style.display = 'none';
            if (dashboardLink) dashboardLink.style.display = 'none';
            if (dashboardDropdownItem) dashboardDropdownItem.style.display = 'none';
        } else {
            if (addPropertyLink) addPropertyLink.style.display = '';
            if (dashboardLink) dashboardLink.style.display = '';
            if (dashboardDropdownItem) dashboardDropdownItem.style.display = '';
        }
    } else {
        authLinks.classList.add('d-flex');
        authLinks.style.display = 'flex';
        userLinks.classList.remove('d-flex');
        userLinks.style.display = 'none';
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(price);
}

function getDefaultImage() {
    return 'istay1.jpg';
}

function createPropertyCard(property) {
    const isRent = property.type === 'RENT';
    const imageUrl = (property.imageUrls && property.imageUrls.length > 0) ? property.imageUrls[0] : getDefaultImage();
    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="property-card" onclick="window.location.href='property-details.html?id=${property.id}'">
                <div class="card-img-wrapper">
                    <img src="${imageUrl}" alt="${property.title}" onerror="this.src='${getDefaultImage()}'">
                    <span class="badge-type ${isRent ? 'badge-rent' : 'badge-sale'}">
                        ${isRent ? 'For Rent' : 'For Sale'}
                    </span>
                    ${property.suitableFor && property.suitableFor !== 'ANY' ? 
                        `<span class="badge-type" style="top: 10px; right: auto; left: 10px; background: rgba(0,0,0,0.6); color: white;">
                            <i class="bi bi-person-check-fill me-1"></i>${property.suitableFor.replace('_', ' ')}
                        </span>` : ''}
                </div>
                <div class="card-body">
                    <h5 class="card-title">${property.title}</h5>
                    <div class="card-location">
                        <i class="bi bi-geo-alt-fill"></i> ${property.location}
                    </div>
                    <div class="card-price">
                        ${formatPrice(property.price)}
                        <small>${isRent ? '/month' : ''}</small>
                    </div>
                    <div class="card-meta">
                        ${property.category === 'LAND' ? 
                            `<span><i class="bi bi-bounding-box"></i> ${property.area} ${property.areaUnit ? property.areaUnit.replace('_', ' ') : 'Acres'}</span>` : 
                            `<span><i class="bi bi-door-open"></i> ${property.rooms} Rooms</span>`}
                        <span><i class="bi bi-building"></i> ${property.type}</span>
                        ${property.amenities ? `<span><i class="bi bi-check-circle"></i> ${property.amenities.split(',').length} Amenities</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize navbar on page load
document.addEventListener('DOMContentLoaded', updateNavbar);
