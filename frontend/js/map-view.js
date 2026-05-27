// ============================================
// iStay Map View Module
// Interactive Leaflet map for property visualization
// ============================================

const MapView = (() => {
    let map = null;
    let markersLayer = null;
    let userMarker = null;
    let userCircle = null;
    let isMapVisible = false;
    const DEFAULT_LAT = 20.5937; // Center of India
    const DEFAULT_LNG = 78.9629;
    const DEFAULT_ZOOM = 5;

    // Custom marker icons
    function createMarkerIcon(type) {
        const color = type === 'RENT' ? '#2563eb' : '#16a34a'; // Blue for rent, Green for sale
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="28" height="38">
                <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
                <circle cx="18" cy="18" r="8" fill="#fff"/>
                <text x="18" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}">🏠</text>
            </svg>`;
        return L.divIcon({
            html: `<div class="map-marker-icon" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${svg}</div>`,
            className: 'custom-map-marker',
            iconSize: [28, 38],
            iconAnchor: [14, 38],
            popupAnchor: [0, -40]
        });
    }

    function createUserIcon() {
        return L.divIcon({
            html: `<div class="user-location-marker">
                <div class="user-pulse"></div>
                <div class="user-dot"></div>
            </div>`,
            className: 'custom-user-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    // Initialize the map
    function init(containerId = 'propertyMapView') {
        const container = document.getElementById(containerId);
        if (!container || map) return;

        map = L.map(containerId, {
            zoomControl: false
        }).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);

        // Add zoom control to top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Add tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(map);

        // Initialize marker cluster group (using a simple layer group)
        markersLayer = L.layerGroup().addTo(map);

        return map;
    }

    // Plot properties on the map
    function plotProperties(properties) {
        if (!map || !markersLayer) return;
        
        markersLayer.clearLayers();

        const validProperties = properties.filter(p => p.latitude && p.longitude);
        
        if (validProperties.length === 0) {
            return;
        }

        const bounds = L.latLngBounds();

        validProperties.forEach(property => {
            const lat = property.latitude;
            const lng = property.longitude;
            const isRent = property.type === 'RENT';
            const isLand = property.category === 'LAND';
            const imageUrl = (property.imageUrls && property.imageUrls.length > 0) ? property.imageUrls[0] : 'istay1.jpg';

            const marker = L.marker([lat, lng], {
                icon: createMarkerIcon(property.type)
            });

            // Rich popup content
            const popupContent = `
                <div class="map-popup" style="min-width: 220px; max-width: 280px;">
                    <div class="map-popup-img" style="position: relative;">
                        <img src="${imageUrl}" alt="${property.title}" 
                             style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px 8px 0 0;"
                             onerror="this.src='istay1.jpg'">
                        <span style="position: absolute; top: 6px; right: 6px; background: ${isRent ? '#2563eb' : '#16a34a'}; 
                              color: white; font-size: 0.65rem; padding: 2px 8px; border-radius: 20px; font-weight: 600;">
                            ${isRent ? 'Rent' : 'Sale'}
                        </span>
                    </div>
                    <div style="padding: 10px;">
                        <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 4px; color: #1a1a2e;">
                            ${property.title}
                        </div>
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 6px;">
                            <i class="bi bi-geo-alt-fill" style="color: #2563eb;"></i> ${property.location.length > 40 ? property.location.substring(0, 40) + '...' : property.location}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 700; font-size: 1rem; color: #2563eb;">
                                ${formatPrice(property.price)}
                                <small style="font-size: 0.7rem; font-weight: 400; color: #888;">${isRent ? '/mo' : ''}</small>
                            </span>
                            ${!isLand ? `<span style="font-size: 0.75rem; color: #888;"><i class="bi bi-door-open"></i> ${property.rooms} Rooms</span>` : ''}
                        </div>
                        <a href="property-details.html?id=${property.id}" 
                           style="display: block; text-align: center; margin-top: 8px; padding: 6px; 
                                  background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; 
                                  border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 600;
                                  transition: opacity 0.2s;"
                           onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            View Details →
                        </a>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'custom-popup'
            });

            markersLayer.addLayer(marker);
            bounds.extend([lat, lng]);
        });

        // Include user location in bounds if available
        if (userMarker) {
            bounds.extend(userMarker.getLatLng());
        }

        // Fit map to bounds with padding
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
    }

    // Detect user location
    function detectLocation(callback) {
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

                // Add/update user marker
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                if (userCircle) {
                    map.removeLayer(userCircle);
                }

                userMarker = L.marker([lat, lng], {
                    icon: createUserIcon(),
                    zIndexOffset: 1000
                }).addTo(map);
                userMarker.bindPopup('<div style="text-align: center; font-weight: 600; padding: 4px;"><i class="bi bi-crosshair me-1"></i>You are here</div>');

                // Add accuracy circle
                userCircle = L.circle([lat, lng], {
                    radius: position.coords.accuracy,
                    color: '#2563eb',
                    fillColor: '#2563eb',
                    fillOpacity: 0.08,
                    weight: 1
                }).addTo(map);

                map.setView([lat, lng], 13);

                if (btn) {
                    btn.innerHTML = '<i class="bi bi-crosshair me-1"></i> My Location';
                    btn.disabled = false;
                    btn.classList.add('active');
                }

                showToast('Location detected! Showing nearby properties.');

                if (callback) callback(lat, lng);
            },
            (error) => {
                if (btn) {
                    btn.innerHTML = '<i class="bi bi-crosshair me-1"></i> My Location';
                    btn.disabled = false;
                }
                showToast('Unable to detect your location. Please check browser permissions.', true);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    // Toggle map visibility
    function toggle() {
        const mapSection = document.getElementById('mapViewSection');
        const toggleBtn = document.getElementById('btnToggleMap');
        if (!mapSection) return;

        isMapVisible = !isMapVisible;
        mapSection.style.display = isMapVisible ? 'block' : 'none';
        
        if (toggleBtn) {
            toggleBtn.innerHTML = isMapVisible 
                ? '<i class="bi bi-list-ul me-1"></i> List View'
                : '<i class="bi bi-map me-1"></i> Map View';
            toggleBtn.classList.toggle('active', isMapVisible);
        }

        if (isMapVisible && map) {
            setTimeout(() => map.invalidateSize(), 200);
        }
    }

    // Show map (without toggle)
    function show() {
        const mapSection = document.getElementById('mapViewSection');
        if (!mapSection) return;
        isMapVisible = true;
        mapSection.style.display = 'block';
        if (map) setTimeout(() => map.invalidateSize(), 200);
    }

    function getMap() { return map; }
    function isVisible() { return isMapVisible; }

    // Destroy map
    function destroy() {
        if (map) {
            map.remove();
            map = null;
            markersLayer = null;
            userMarker = null;
            userCircle = null;
            isMapVisible = false;
        }
    }

    return {
        init,
        plotProperties,
        detectLocation,
        toggle,
        show,
        getMap,
        isVisible,
        destroy
    };
})();
