// ============================================
// iStay Add Property Module
// Handles the property listing form + Map Location Picker
// ============================================

let map, marker;
const DEFAULT_LAT = 20.5937; // Center of India
const DEFAULT_LNG = 78.9629;

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isLoggedIn()) {
        showToast('Please login to add a property', true);
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    const user = Auth.getUser();
    if (!user || user.role !== 'OWNER') {
        showToast('Access Denied. Only Owners can add properties.', true);
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    initMapPicker();
    initImagePreview();

    const form = document.getElementById('addPropertyForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const category = document.getElementById('category').value;
        const btn = document.getElementById('submitBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
            btn.disabled = true;

            const amenities = Array.from(document.querySelectorAll('#amenitiesGroup input:checked'))
                .map(cb => cb.value).join(',');

            const imageFiles = document.getElementById('imageFile').files;
            let uploadedImageUrls = [];

            // If files are selected, upload them first
            if (imageFiles && imageFiles.length > 0) {
                try {
                    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading Images...';
                    const uploadRes = await API.uploadImages(imageFiles);
                    uploadedImageUrls = uploadRes.urls;
                } catch (uploadErr) {
                    showToast('Failed to upload images', true);
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    return;
                }
            }

            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting Property...';

            const propertyData = {
                title: document.getElementById('title').value.trim(),
                description: document.getElementById('description').value.trim(),
                location: document.getElementById('location').value.trim(),
                price: parseFloat(document.getElementById('price').value),
                type: document.getElementById('type').value,
                category: category,
                area: category === 'LAND' ? parseFloat(document.getElementById('area').value) : null,
                areaUnit: category === 'LAND' ? document.getElementById('areaUnit').value : null,
                rooms: category === 'LAND' ? 0 : (category === 'ROOM' ? 1 : parseInt(document.getElementById('rooms').value)),
                suitableFor: category === 'LAND' ? 'ANY' : document.getElementById('suitableFor').value,
                amenities: category === 'LAND' ? '' : amenities,
                imageUrls: uploadedImageUrls
            };

            propertyData.latitude = document.getElementById('latitude').value ? parseFloat(document.getElementById('latitude').value) : null;
            propertyData.longitude = document.getElementById('longitude').value ? parseFloat(document.getElementById('longitude').value) : null;

            if (!propertyData.title || !propertyData.location || !propertyData.price || (category === 'LAND' && !propertyData.area)) {
                showToast('Please fill in all required fields', true);
                return;
            }

            await API.addProperty(propertyData);
            showToast('Property listed successfully!');
            setTimeout(() => window.location.href = 'dashboard.html', 1500);

        } catch (error) {
            showToast(error.data?.message || 'Failed to add property. Please try again.', true);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
});

function initMapPicker() {
    // Initialize map
    map = L.map('pickerMap').setView([DEFAULT_LAT, DEFAULT_LNG], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Try to get user's current location to center map
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 13);
            setMarker(lat, lng);
        }, () => {
            console.log("Geolocation denied or unavailable. Using default center.");
        });
    }

    // Handle map clicks
    map.on('click', function(e) {
        setMarker(e.latlng.lat, e.latlng.lng);
    });

    // Handle Geocode Button
    const btnGeocode = document.getElementById('btnGeocode');
    const locationInput = document.getElementById('location');
    const suggestionsBox = document.getElementById('locationSuggestions');

    // UI Toggle for Category
    const categoryRadios = document.querySelectorAll('input[name="categoryRadio"]');
    const categoryHidden = document.getElementById('category');
    
    const roomsWrapper = document.getElementById('roomsWrapper');
    const areaWrapper = document.getElementById('areaWrapper');
    const suitableForWrapper = document.getElementById('suitableForWrapper');
    const amenitiesSection = document.getElementById('amenitiesWrapper');

    categoryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedCat = e.target.value;
            categoryHidden.value = selectedCat;
            
            if (selectedCat === 'LAND') {
                roomsWrapper.style.display = 'none';
                suitableForWrapper.style.display = 'none';
                if (amenitiesSection) amenitiesSection.style.display = 'none';
                
                areaWrapper.style.display = 'block';
                document.getElementById('area').setAttribute('required', 'true');
                document.getElementById('rooms').removeAttribute('required');
                document.getElementById('suitableFor').removeAttribute('required');
            } else if (selectedCat === 'ROOM') {
                roomsWrapper.style.display = 'none';
                suitableForWrapper.style.display = 'block';
                if (amenitiesSection) amenitiesSection.style.display = 'block';
                
                areaWrapper.style.display = 'none';
                document.getElementById('area').removeAttribute('required');
                document.getElementById('rooms').removeAttribute('required');
                document.getElementById('suitableFor').setAttribute('required', 'true');
            } else {
                // HOUSE
                roomsWrapper.style.display = 'block';
                suitableForWrapper.style.display = 'block';
                if (amenitiesSection) amenitiesSection.style.display = 'block';
                
                areaWrapper.style.display = 'none';
                document.getElementById('area').removeAttribute('required');
                document.getElementById('rooms').setAttribute('required', 'true');
                document.getElementById('suitableFor').setAttribute('required', 'true');
            }
        });
    });

    // Autocomplete logic
    let debounceTimer;
    locationInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length < 3) {
            suggestionsBox.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
                const data = await response.json();
                
                if (data && data.length > 0) {
                    suggestionsBox.innerHTML = data.map(item => `
                        <div class="autocomplete-item" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${item.display_name.replace(/"/g, '&quot;')}">
                            <i class="bi bi-geo-alt me-2"></i>${item.display_name}
                        </div>
                    `).join('');
                    suggestionsBox.style.display = 'block';

                    // Add click listeners to items
                    document.querySelectorAll('.autocomplete-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const lat = parseFloat(item.getAttribute('data-lat'));
                            const lon = parseFloat(item.getAttribute('data-lon'));
                            const name = item.getAttribute('data-name');
                            
                            locationInput.value = name;
                            suggestionsBox.style.display = 'none';
                            map.setView([lat, lon], 15);
                            setMarker(lat, lon);
                        });
                    });
                } else {
                    suggestionsBox.style.display = 'none';
                }
            } catch (err) {
                console.error('Autocomplete error:', err);
            }
        }, 500); // 500ms debounce
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            suggestionsBox.style.display = 'none';
        }
    });

    btnGeocode.addEventListener('click', async () => {
        const address = locationInput.value.trim();
        if (!address) {
            showToast('Please enter an address first', true);
            return;
        }

        btnGeocode.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        btnGeocode.disabled = true;

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                map.setView([lat, lng], 15);
                setMarker(lat, lng);
                showToast('Location found on map!');
            } else {
                showToast('Could not find that location. Please try clicking on the map manually.', true);
            }
        } catch (error) {
            showToast('Error searching for location.', true);
        } finally {
            btnGeocode.innerHTML = '<i class="bi bi-search"></i> Find on Map';
            btnGeocode.disabled = false;
        }
    });

    // Optional: geocode when they press Enter in the location field
    locationInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // prevent form submit
            btnGeocode.click();
        }
    });
}

function setMarker(lat, lng) {
    if (marker) {
        map.removeLayer(marker);
    }
    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    
    // Update hidden fields
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lng;

    // Handle marker drag
    marker.on('dragend', function(event) {
        const position = marker.getLatLng();
        document.getElementById('latitude').value = position.lat;
        document.getElementById('longitude').value = position.lng;
    });
}

function initImagePreview() {
    const fileInput = document.getElementById('imageFile');
    const previewContainer = document.getElementById('imagePreviewContainer');

    if (!fileInput || !previewContainer) return;

    fileInput.addEventListener('change', function() {
        previewContainer.innerHTML = ''; // Clear existing previews
        
        const files = Array.from(this.files);
        if (files.length === 0) return;

        files.forEach((file, index) => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const imgWrap = document.createElement('div');
                imgWrap.className = 'position-relative';
                imgWrap.style.width = '120px';
                imgWrap.style.height = '90px';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-100 h-100 object-fit-cover rounded border';
                
                if (index === 0) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-primary position-absolute top-0 start-0 m-1';
                    badge.textContent = 'Cover';
                    imgWrap.appendChild(badge);
                }

                imgWrap.appendChild(img);
                previewContainer.appendChild(imgWrap);
            };
            reader.readAsDataURL(file);
        });
    });
}

