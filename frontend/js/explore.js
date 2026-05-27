// ============================================
// iStay Explore Module (99acres-style)
// Handles sidebar filters, horizontal cards, quick filters
// ============================================

let currentPage = 0;
let totalPages = 0;
let currentFilters = {};
let pageCategory = '';

document.addEventListener('DOMContentLoaded', () => {
    pageCategory = document.body.getAttribute('data-category') || '';
    if (pageCategory) currentFilters.category = pageCategory;

    const urlParams = new URLSearchParams(window.location.search);
    const urlLoc = urlParams.get('location');
    const urlType = urlParams.get('type');

    if (urlLoc) {
        const locInput = document.getElementById('searchLocation');
        if (locInput) locInput.value = urlLoc;
        currentFilters.location = urlLoc;
    }
    if (urlType) {
        const typeInput = document.getElementById('searchType');
        if (typeInput) typeInput.value = urlType;
        currentFilters.type = urlType;
        
        // Update UI chips if they exist
        const typeRadios = document.querySelectorAll(`input[name="propType"]`);
        typeRadios.forEach(r => {
            if (r.value === urlType) {
                r.checked = true;
                r.closest('.filter-chip').classList.add('active');
            } else if (r.value === '') {
                r.checked = false;
                r.closest('.filter-chip').classList.remove('active');
            }
        });
    }

    loadProperties();
    setupSidebarFilters();
    setupQuickFilters();
    setupSorting();
    setupAutocomplete();
    updateNavbar();

    // Initialize map view if the container exists
    if (document.getElementById('propertyMapView')) {
        MapView.init('propertyMapView');
    }
});

// ---- Load Properties ----
async function loadProperties(page = 0) {
    const container = document.getElementById('propertiesGrid');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;

    try {
        const sortBy = document.getElementById('sortBy')?.value || 'createdAt';
        const direction = document.getElementById('sortDirection')?.value || 'desc';

        currentFilters.page = page;
        currentFilters.size = 10;
        currentFilters.sortBy = sortBy;
        currentFilters.direction = direction;

        const data = await API.searchProperties(currentFilters);
        currentPage = data.currentPage;
        totalPages = data.totalPages;

        if (data.properties.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <h5>No properties found</h5>
                    <p>Try adjusting your filters or search a different location</p>
                </div>
            `;
        } else {
            container.innerHTML = data.properties.map(createHorizontalCard).join('');
        }

        // Update map markers if map is available
        if (typeof MapView !== 'undefined' && data.properties.length > 0) {
            MapView.plotProperties(data.properties);
            const pinCount = data.properties.filter(p => p.latitude && p.longitude).length;
            const badge = document.getElementById('mapMarkerCount');
            if (badge) badge.textContent = pinCount + ' pin' + (pinCount !== 1 ? 's' : '');
        }

        renderPagination();
        updateResultCount(data.totalItems);
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <h5>Unable to load properties</h5>
                <p>Please make sure the backend server is running</p>
            </div>
        `;
    }
}

// ---- Horizontal Property Card (99acres-style) ----
function createHorizontalCard(property) {
    const isRent = property.type === 'RENT';
    const imageUrl = (property.imageUrls && property.imageUrls.length > 0) ? property.imageUrls[0] : getDefaultImage();
    const isLand = property.category === 'LAND';

    // Build highlight chips
    let highlights = [];
    if (property.suitableFor && property.suitableFor !== 'ANY') {
        highlights.push(property.suitableFor.replace('_', ' '));
    }
    if (property.amenities) {
        highlights = highlights.concat(property.amenities.split(',').slice(0, 3));
    }
    if (isLand && property.area) {
        highlights.push(`${property.area} ${(property.areaUnit || 'ACRES').replace('_', ' ')}`);
    }

    const highlightHtml = highlights.map(h => `<span class="highlight-chip">${h}</span>`).join('');

    // Description snippet
    const desc = property.description
        ? property.description.substring(0, 100) + (property.description.length > 100 ? '...' : '')
        : '';

    return `
        <div class="property-card-h" onclick="window.location.href='property-details.html?id=${property.id}'">
            <div class="card-img-h">
                <img src="${imageUrl}" alt="${property.title}" onerror="this.src='${getDefaultImage()}'">
                <span class="badge-type-h ${isRent ? 'badge-rent' : 'badge-sale'}">
                    ${isRent ? 'For Rent' : 'For Sale'}
                </span>
            </div>
            <div class="card-body-h">
                <div class="card-top">
                    <div class="card-location-h">
                        <i class="bi bi-geo-alt-fill"></i> ${property.location}
                    </div>
                    <div class="card-title-h">
                        ${!isLand ? (property.rooms || '') + ' Bedroom ' : ''}${property.category ? property.category.charAt(0) + property.category.slice(1).toLowerCase() : ''} ${isRent ? 'for rent' : 'for sale'} in ${property.location.split(',')[0]}
                    </div>
                    <div class="card-price-row">
                        <div>
                            <span class="card-price-h">${formatPrice(property.price)}</span>
                            ${isRent ? '<span class="card-price-unit">/month</span>' : ''}
                        </div>
                        ${!isLand && property.rooms ? `
                            <div class="card-area-h">
                                ${property.rooms} Rooms
                                <small>Bedrooms</small>
                            </div>` : ''}
                        ${isLand && property.area ? `
                            <div class="card-area-h">
                                ${property.area} ${(property.areaUnit || 'ACRES').replace('_', ' ')}
                                <small>Plot Area</small>
                            </div>` : ''}
                    </div>
                </div>
                ${highlightHtml ? `
                    <div class="card-highlights">
                        <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600; margin-right: 4px;">Highlights :</span>
                        ${highlightHtml}
                    </div>` : ''}
                ${desc ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; line-height: 1.4;">${desc}</p>` : ''}
                <div class="card-footer-h">
                    <div class="owner-info">
                        <i class="bi bi-person-circle"></i> Owner
                    </div>
                    <button class="contact-btn" onclick="event.stopPropagation(); window.location.href='property-details.html?id=${property.id}'">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ---- Sidebar Filters ----
function setupSidebarFilters() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', applyFilters);
    }

    // Filter chip radio buttons — update hidden fields
    document.querySelectorAll('.filter-chip input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const name = e.target.name;
            // Update active state
            document.querySelectorAll(`.filter-chip input[name="${name}"]`).forEach(r => {
                r.closest('.filter-chip').classList.remove('active');
            });
            e.target.closest('.filter-chip').classList.add('active');

            // Sync to hidden field
            if (name === 'propType') {
                const h = document.getElementById('searchType');
                if (h) h.value = e.target.value;
            } else if (name === 'bedrooms') {
                const h = document.getElementById('searchRooms');
                if (h) h.value = e.target.value;
            } else if (name === 'suitableFor') {
                const h = document.getElementById('searchSuitableFor');
                if (h) h.value = e.target.value;
            }
        });

        // Set initial active state for checked radios
        if (radio.checked) {
            radio.closest('.filter-chip').classList.add('active');
        }
    });

    // Filter chip checkboxes
    document.querySelectorAll('.filter-chip input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.target.closest('.filter-chip').classList.toggle('active', e.target.checked);
        });
    });

    // Clear buttons
    const clearBtn = document.getElementById('clearFilters');
    const clearBtn2 = document.getElementById('clearFiltersBtn');
    const clearFn = () => {
        // Reset all inputs
        document.querySelectorAll('.explore-sidebar input[type="text"], .explore-sidebar input[type="number"]').forEach(el => el.value = '');
        document.querySelectorAll('.explore-sidebar input[type="hidden"]').forEach(el => {
            // Don't clear the category
            if (el.id !== 'searchType' && el.id !== 'searchRooms' && el.id !== 'searchSuitableFor') return;
            el.value = '';
        });

        // Reset radios to first option
        document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
        document.querySelectorAll('.filter-chip input[type="radio"]').forEach(r => {
            if (r.value === '') { r.checked = true; r.closest('.filter-chip').classList.add('active'); }
            else r.checked = false;
        });
        document.querySelectorAll('.filter-chip input[type="checkbox"]').forEach(cb => { cb.checked = false; });
        document.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));

        if (document.getElementById('searchType')) document.getElementById('searchType').value = '';
        if (document.getElementById('searchRooms')) document.getElementById('searchRooms').value = '';
        if (document.getElementById('searchSuitableFor')) document.getElementById('searchSuitableFor').value = '';

        currentFilters = { category: pageCategory };
        currentPage = 0;
        loadProperties(0);
    };
    if (clearBtn) clearBtn.addEventListener('click', clearFn);
    if (clearBtn2) clearBtn2.addEventListener('click', clearFn);
}

function applyFilters() {
    currentFilters = {
        category: pageCategory,
        location: document.getElementById('searchLocation')?.value || '',
        minPrice: document.getElementById('searchMinPrice')?.value || '',
        maxPrice: document.getElementById('searchMaxPrice')?.value || '',
        rooms: document.getElementById('searchRooms')?.value || '',
        type: document.getElementById('searchType')?.value || '',
        suitableFor: document.getElementById('searchSuitableFor')?.value || '',
        amenities: Array.from(document.querySelectorAll('#searchAmenitiesGroup input:checked')).map(cb => cb.value).join(',')
    };

    currentPage = 0;
    loadProperties(0);
}

// ---- Quick Filters ----
function setupQuickFilters() {
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');

            // Apply type quick filter
            if (btn.dataset.type) {
                const isActive = btn.classList.contains('active');
                const typeField = document.getElementById('searchType');
                if (typeField) typeField.value = isActive ? btn.dataset.type : '';
                // Deactivate other type buttons
                document.querySelectorAll(`.quick-filter-btn[data-type]`).forEach(b => {
                    if (b !== btn) b.classList.remove('active');
                });
            }

            // Apply suitable quick filter
            if (btn.dataset.suitable) {
                const isActive = btn.classList.contains('active');
                const suitField = document.getElementById('searchSuitableFor');
                if (suitField) suitField.value = isActive ? btn.dataset.suitable : '';
                document.querySelectorAll(`.quick-filter-btn[data-suitable]`).forEach(b => {
                    if (b !== btn) b.classList.remove('active');
                });
            }

            // Apply amenity quick filter (toggle checkbox)
            if (btn.dataset.amenity) {
                const cb = document.querySelector(`#searchAmenitiesGroup input[value="${btn.dataset.amenity}"]`);
                if (cb) {
                    cb.checked = btn.classList.contains('active');
                    cb.closest('.filter-chip')?.classList.toggle('active', cb.checked);
                }
            }

            applyFilters();
        });
    });
}

// ---- Sorting ----
function setupSorting() {
    const sortBy = document.getElementById('sortBy');
    const sortDirection = document.getElementById('sortDirection');
    if (sortBy) sortBy.addEventListener('change', () => loadProperties(0));
    if (sortDirection) sortDirection.addEventListener('change', () => loadProperties(0));
}

// ---- Autocomplete ----
function setupAutocomplete() {
    const input = document.getElementById('searchLocation');
    const suggestionsBox = document.getElementById('searchLocationSuggestions');
    if (!input || !suggestionsBox) return;

    let debounceTimer;
    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        if (query.length < 3) { suggestionsBox.style.display = 'none'; return; }

        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
                const data = await response.json();
                if (data && data.length > 0) {
                    suggestionsBox.innerHTML = data.map(item => `
                        <div class="autocomplete-item" data-name="${item.display_name.replace(/"/g, '&quot;')}">
                            <i class="bi bi-geo-alt me-2"></i>${item.display_name}
                        </div>
                    `).join('');
                    suggestionsBox.style.display = 'block';
                    document.querySelectorAll('#searchLocationSuggestions .autocomplete-item').forEach(item => {
                        item.addEventListener('click', () => {
                            input.value = item.getAttribute('data-name');
                            suggestionsBox.style.display = 'none';
                        });
                    });
                } else {
                    suggestionsBox.style.display = 'none';
                }
            } catch (err) { console.error('Autocomplete error:', err); }
        }, 500);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) suggestionsBox.style.display = 'none';
    });
}

// ---- Pagination ----
function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }

    let html = '<nav><ul class="pagination pagination-custom justify-content-center">';
    html += `<li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadProperties(${currentPage - 1}); return false;">&laquo;</a></li>`;
    for (let i = 0; i < totalPages; i++) {
        if (i === 0 || i === totalPages - 1 || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadProperties(${i}); return false;">${i + 1}</a></li>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    html += `<li class="page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadProperties(${currentPage + 1}); return false;">&raquo;</a></li>`;
    html += '</ul></nav>';
    container.innerHTML = html;
}

function updateResultCount(total) {
    const el = document.getElementById('resultCount');
    if (el) el.textContent = total;
}
