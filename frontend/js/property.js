// ============================================
// iStay Property Detail Module
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const propertyId = params.get('id');

    if (!propertyId) {
        showToast('Property not found', true);
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    loadPropertyDetail(propertyId);
});

async function loadPropertyDetail(id) {
    const container = document.getElementById('propertyDetail');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status"></div>
        </div>
    `;

    try {
        const property = await API.getPropertyById(id);
        const isRent = property.type === 'RENT';
        const imageUrls = (property.imageUrls && property.imageUrls.length > 0) ? property.imageUrls : [getDefaultImage()];
        const amenities = property.amenities ? property.amenities.split(',').map(a => a.trim()) : [];

        let imageGalleryHtml = '';
        if (imageUrls.length === 1) {
            imageGalleryHtml = `<img src="${imageUrls[0]}" alt="${property.title}" class="detail-hero mb-3" onerror="this.src='${getDefaultImage()}'">`;
        } else {
            // Generate Bootstrap Carousel
            let indicators = '';
            let inner = '';
            imageUrls.forEach((url, idx) => {
                const active = idx === 0 ? 'active' : '';
                indicators += `<button type="button" data-bs-target="#propertyCarousel" data-bs-slide-to="${idx}" class="${active}" aria-label="Slide ${idx+1}"></button>`;
                inner += `
                    <div class="carousel-item ${active}">
                        <img src="${url}" class="d-block w-100 detail-hero" alt="Property Image ${idx+1}" onerror="this.src='${getDefaultImage()}'">
                    </div>
                `;
            });
            imageGalleryHtml = `
                <div id="propertyCarousel" class="carousel slide mb-3" data-bs-ride="carousel">
                    <div class="carousel-indicators">${indicators}</div>
                    <div class="carousel-inner" style="border-radius: var(--radius-lg); overflow: hidden;">${inner}</div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#propertyCarousel" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Previous</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#propertyCarousel" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Next</span>
                    </button>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="row g-4">
                <div class="col-lg-8">
                    ${imageGalleryHtml}
                    
                    <div class="d-flex align-items-center gap-3 mb-3">
                        <span class="detail-badge ${isRent ? 'badge-rent' : 'badge-sale'}">
                            ${isRent ? 'For Rent' : 'For Sale'}
                        </span>
                        <span class="text-muted" style="font-size: 0.85rem;">
                            <i class="bi bi-clock"></i> Listed ${new Date(property.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>

                    <h1 style="font-weight: 700; font-size: 1.8rem; margin-bottom: 0.5rem;">${property.title}</h1>
                    
                    <div class="d-flex align-items-center gap-2 mb-3" style="color: var(--text-muted);">
                        <i class="bi bi-geo-alt-fill"></i>
                        <span>${property.location}</span>
                    </div>

                    <div class="detail-price mb-4">
                        ${formatPrice(property.price)}
                        <small style="font-size: 0.9rem; color: var(--text-muted); font-weight: 400;">${isRent ? '/month' : ''}</small>
                    </div>

                    <div class="detail-info mb-4">
                        ${property.category === 'LAND' ? 
                        `<div class="detail-info-item">
                            <i class="bi bi-bounding-box"></i>
                            <span>${property.area} ${property.areaUnit ? property.areaUnit.replace('_', ' ') : 'Acres'}</span>
                        </div>` :
                        `<div class="detail-info-item">
                            <i class="bi bi-door-open"></i>
                            <span>${property.rooms} ${property.rooms === 1 ? 'Room' : 'Rooms'}</span>
                        </div>`}
                        <div class="detail-info-item">
                            <i class="bi bi-building"></i>
                            <span>${property.type === 'RENT' ? 'For Rent' : 'For Sale'}</span>
                        </div>
                        <div class="detail-info-item">
                            <i class="bi bi-person-check"></i>
                            <span>${property.suitableFor ? property.suitableFor.replace('_', ' ') : 'Any'}</span>
                        </div>
                    </div>

                    ${property.description ? `
                        <div class="mb-4">
                            <h5 style="font-weight: 700; margin-bottom: 0.75rem;">Description</h5>
                            <p style="color: var(--text-secondary); line-height: 1.8;">${property.description}</p>
                        </div>
                    ` : ''}

                    ${amenities.length > 0 ? `
                        <div class="mb-4">
                            <h5 style="font-weight: 700; margin-bottom: 0.75rem;">Amenities</h5>
                            <div>${amenities.map(a => `<span class="amenity-tag"><i class="bi bi-check-circle-fill"></i> ${a}</span>`).join('')}</div>
                        </div>
                    ` : ''}

                    <!-- Map Section -->
                    <div class="mb-4">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 style="font-weight: 700; margin: 0;">Location & Directions</h5>
                            <button id="btnDirections" class="btn btn-outline-custom btn-sm">
                                <i class="bi bi-sign-turn-right me-1"></i> Get Directions
                            </button>
                        </div>
                        <div id="propertyMap" style="height: 350px; border-radius: var(--radius-md); border: 1px solid var(--light-2); z-index: 1;"></div>
                        <div id="routingPanel" class="mt-3 d-none"></div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="form-card sticky-top" style="top: 100px;">
                        <h5 style="font-weight: 700; margin-bottom: 1.25rem;">
                            <i class="bi bi-person-circle me-2" style="color: var(--primary);"></i>Owner Info
                        </h5>
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.2rem;">
                                ${property.owner?.name?.charAt(0)?.toUpperCase() || 'O'}
                            </div>
                            <div>
                                <div style="font-weight: 600;">${property.owner?.name || 'Property Owner'}</div>
                                <div style="font-size: 0.85rem; color: var(--text-muted);">${property.owner?.email || ''}</div>
                            </div>
                        </div>
                        <button type="button" class="btn btn-primary-custom w-100 mb-2" id="openChatBtn" onclick="openChatModal(${property.id}, ${property.owner?.id})">
                            <i class="bi bi-chat-dots me-2"></i>Chat with Owner
                        </button>
                        <a href="index.html" class="btn btn-outline-custom w-100">
                            <i class="bi bi-arrow-left me-2"></i>Back to Listings
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Initialize Map
        setTimeout(() => initMap(property), 100);

    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-house-slash"></i>
                <h5>Property not found</h5>
                <p>The requested property does not exist or has been removed.</p>
                <a href="index.html" class="btn btn-primary-custom mt-3">Browse Properties</a>
            </div>
        `;
    }
}

// Map variables
let map = null;
let routingControl = null;

async function initMap(property) {
    let lat = property.latitude;
    let lng = property.longitude;

    // Fallback: If no coordinates exist, try to geocode the location string using free Nominatim API
    if (!lat || !lng) {
        try {
            console.log('No coords, attempting geocode for:', property.location);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(property.location)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                lat = parseFloat(data[0].lat);
                lng = parseFloat(data[0].lon);
            } else {
                // Ultimate fallback: Center of India
                lat = 20.5937;
                lng = 78.9629;
            }
        } catch (e) {
            lat = 20.5937;
            lng = 78.9629;
        }
    }

    const propLocation = [lat, lng];

    map = L.map('propertyMap').setView(propLocation, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.marker(propLocation).addTo(map)
        .bindPopup(`<b>${property.title}</b><br>${property.location}`)
        .openPopup();

    // Directions Button Logic
    const btnDirections = document.getElementById('btnDirections');
    if (btnDirections) {
        btnDirections.addEventListener('click', () => {
            getDirections(propLocation);
        });
    }
}

function getDirections(destination) {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', true);
        return;
    }

    const btn = document.getElementById('btnDirections');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Locating...';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            btn.innerHTML = '<i class="bi bi-check me-1"></i> Route Found';
            const userLocation = [position.coords.latitude, position.coords.longitude];

            // Calculate route
            routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(userLocation[0], userLocation[1]),
                    L.latLng(destination[0], destination[1])
                ],
                routeWhileDragging: false,
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1' // Free OSRM demo server
                }),
                showAlternatives: true,
                fitSelectedRoutes: true,
                collapsible: true
            }).addTo(map);
        },
        (error) => {
            btn.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i> Failed';
            btn.disabled = false;
            showToast('Unable to get your location. Please check browser permissions.', true);
        }
    );
}

// ============================================
// Chat Logic
// ============================================
let chatPollingInterval = null;
let currentChatPropertyId = null;
let currentChatOwnerId = null;

function openChatModal(propertyId, ownerId) {
    if (!Auth.isLoggedIn()) {
        window.location.href = `login.html`;
        return;
    }

    const user = Auth.getUser();
    if (user.userId === ownerId) {
        showToast('You are the owner of this property. Go to your Inbox to see messages.', true);
        return;
    }

    currentChatPropertyId = propertyId;
    currentChatOwnerId = ownerId;

    const modal = new bootstrap.Modal(document.getElementById('chatModal'));
    modal.show();

    loadChatHistory();

    if (chatPollingInterval) clearInterval(chatPollingInterval);
    chatPollingInterval = setInterval(loadChatHistory, 3000);

    document.getElementById('chatModal').addEventListener('hidden.bs.modal', () => {
        if (chatPollingInterval) clearInterval(chatPollingInterval);
    });
}

async function loadChatHistory() {
    if (!currentChatPropertyId || !currentChatOwnerId) return;

    try {
        const messages = await API.getChatHistory(currentChatPropertyId, currentChatOwnerId);
        const chatMessages = document.getElementById('chatMessages');
        const user = Auth.getUser();

        let html = '';
        if (messages.length === 0) {
            html = `<div class="text-center text-muted mt-3" id="chatLoading">No messages yet. Say hi!</div>`;
        } else {
            html = messages.map(msg => {
                const isMine = msg.senderId === user.userId;
                return `
                    <div class="d-flex w-100 ${isMine ? 'justify-content-end' : 'justify-content-start'}">
                        <div class="p-2 rounded ${isMine ? 'bg-primary text-white' : 'bg-white border'}" style="max-width: 75%; border-radius: var(--radius-md);">
                            <div style="font-size: 0.9rem;">${msg.content}</div>
                            <div style="font-size: 0.7rem; text-align: right; margin-top: 5px; opacity: 0.8;">
                                ${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        chatMessages.innerHTML = html;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Failed to load chat history', error);
    }
}

document.getElementById('chatForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content) return;

    try {
        input.disabled = true;
        await API.sendMessage(currentChatOwnerId, currentChatPropertyId, content);
        input.value = '';
        input.disabled = false;
        input.focus();
        loadChatHistory();
    } catch (error) {
        input.disabled = false;
        showToast('Failed to send message', true);
    }
});
