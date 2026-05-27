// ============================================
// iStay Home Module
// Loads properties and handles search
// ============================================

let currentPage = 0;
let totalPages = 0;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProperties();
    if (Auth.isLoggedIn()) {
        loadRecommendations();
    }

    // Setup home search
    const homeSearchForm = document.getElementById('homeSearchForm');
    if (homeSearchForm) {
        homeSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const location = document.getElementById('homeSearchLocation').value.trim();
            const type = document.getElementById('homeSearchType').value;
            
            // Redirect to explore page with params
            const params = new URLSearchParams();
            if (location) params.append('location', location);
            if (type) params.append('type', type);
            
            window.location.href = `explore.html?${params.toString()}`;
        });
    }
});

async function loadFeaturedProperties() {
    loadCategory('HOUSE', 'housesGrid');
    loadCategory('ROOM', 'roomsGrid');
    loadCategory('LAND', 'landsGrid');

    // Load properties for home page map
    loadHomeMap();
}

// ---- Home Page Map ----
let homeMap = null;
let homeMarkersLayer = null;

async function loadHomeMap() {
    const mapContainer = document.getElementById('homePropertyMap');
    if (!mapContainer) return;

    // Initialize map centered on India
    homeMap = L.map('homePropertyMap', { zoomControl: false }).setView([20.5937, 78.9629], 5);
    L.control.zoom({ position: 'topright' }).addTo(homeMap);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(homeMap);

    homeMarkersLayer = L.layerGroup().addTo(homeMap);

    try {
        // Fetch a larger set of properties for the map
        const data = await API.searchProperties({ page: 0, size: 50, sortBy: 'createdAt', direction: 'desc' });
        if (data.properties && data.properties.length > 0) {
            plotHomeMapProperties(data.properties);
        }
    } catch (error) {
        console.error('Failed to load properties for home map:', error);
    }
}

function plotHomeMapProperties(properties) {
    if (!homeMap || !homeMarkersLayer) return;
    homeMarkersLayer.clearLayers();

    const validProps = properties.filter(p => p.latitude && p.longitude);
    if (validProps.length === 0) return;

    const bounds = L.latLngBounds();

    validProps.forEach(property => {
        const isRent = property.type === 'RENT';
        const color = isRent ? '#2563eb' : '#16a34a';
        const imageUrl = (property.imageUrls && property.imageUrls.length > 0) ? property.imageUrls[0] : 'istay1.jpg';

        const icon = L.divIcon({
            html: `<div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="28" height="38">
                    <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
                    <circle cx="18" cy="18" r="8" fill="#fff"/>
                </svg>
            </div>`,
            className: 'custom-map-marker',
            iconSize: [28, 38],
            iconAnchor: [14, 38],
            popupAnchor: [0, -40]
        });

        const popup = `
            <div style="min-width: 220px; max-width: 280px;">
                <img src="${imageUrl}" alt="${property.title}" 
                     style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px 8px 0 0;"
                     onerror="this.src='istay1.jpg'">
                <div style="padding: 10px;">
                    <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 4px;">${property.title}</div>
                    <div style="font-size: 0.8rem; color: #666; margin-bottom: 6px;">
                        <i class="bi bi-geo-alt-fill" style="color: #2563eb;"></i> ${property.location.length > 40 ? property.location.substring(0, 40) + '...' : property.location}
                    </div>
                    <div style="font-weight: 700; font-size: 1rem; color: #2563eb; margin-bottom: 8px;">
                        ${formatPrice(property.price)}
                        <small style="font-size: 0.7rem; font-weight: 400; color: #888;">${isRent ? '/mo' : ''}</small>
                    </div>
                    <a href="property-details.html?id=${property.id}" 
                       style="display: block; text-align: center; padding: 6px; 
                              background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; 
                              border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 600;">
                        View Details →
                    </a>
                </div>
            </div>`;

        const marker = L.marker([property.latitude, property.longitude], { icon })
            .bindPopup(popup, { maxWidth: 300, className: 'custom-popup' });

        homeMarkersLayer.addLayer(marker);
        bounds.extend([property.latitude, property.longitude]);
    });

    if (bounds.isValid()) {
        homeMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
}

function detectHomeLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', true);
        return;
    }

    const btn = document.getElementById('btnDetectLocation');
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Locating...';
        btn.disabled = true;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            if (homeMap) {
                // Add user marker
                const userIcon = L.divIcon({
                    html: '<div class="user-location-marker"><div class="user-pulse"></div><div class="user-dot"></div></div>',
                    className: 'custom-user-marker',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
                    .addTo(homeMap)
                    .bindPopup('<div style="text-align: center; font-weight: 600; padding: 4px;"><i class="bi bi-crosshair me-1"></i>You are here</div>');

                L.circle([lat, lng], {
                    radius: position.coords.accuracy,
                    color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.08, weight: 1
                }).addTo(homeMap);

                homeMap.setView([lat, lng], 13);
            }

            if (btn) {
                btn.innerHTML = '<i class="bi bi-crosshair"></i> My Location';
                btn.disabled = false;
                btn.classList.add('active');
            }
            showToast('Location detected! Showing properties near you.');
        },
        () => {
            if (btn) {
                btn.innerHTML = '<i class="bi bi-crosshair"></i> Detect My Location';
                btn.disabled = false;
            }
            showToast('Unable to detect your location. Please check browser permissions.', true);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function loadCategory(category, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;

    try {
        const data = await API.searchProperties({ category, page: 0, size: 3, sortBy: 'createdAt', direction: 'desc' });
        
        if (data.properties.length === 0) {
            container.innerHTML = `
                <div class="col-12 empty-state">
                    <i class="bi bi-house-slash"></i>
                    <p class="mb-0 mt-2">No new ${category.toLowerCase()}s found at the moment.</p>
                </div>
            `;
        } else {
            container.innerHTML = data.properties.map(createPropertyCard).join('');
        }
    } catch (error) {
        container.innerHTML = `
            <div class="col-12 empty-state">
                <i class="bi bi-exclamation-triangle text-danger"></i>
                <p class="mb-0 mt-2">Failed to load featured ${category.toLowerCase()}s.</p>
            </div>
        `;
    }
}

async function loadRecommendations() {
    const container = document.getElementById('recommendationsGrid');
    const section = document.getElementById('recommended-section');
    if (!container || !section) return;

    try {
        const user = Auth.getUser();
        const data = await API.getRecommendations(user.userId);
        
        if (data && data.length > 0) {
            section.style.display = 'block';
            container.innerHTML = data.map(createPropertyCard).join('');
        } else {
            section.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load recommendations', error);
    }
}
