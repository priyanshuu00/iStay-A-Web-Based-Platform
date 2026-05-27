// ============================================
// iStay Dashboard Module
// Owner dashboard for managing listed properties
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isLoggedIn()) {
        showToast('Please login to access the dashboard', true);
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    const user = Auth.getUser();
    if (!user || user.role !== 'OWNER') {
        showToast('Access Denied. Only Owners can access this page.', true);
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    loadDashboard();
});

async function loadDashboard() {
    const tableBody = document.getElementById('propertiesTableBody');
    const statsContainer = document.getElementById('dashboardStats');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary" role="status"></div>
            </td>
        </tr>
    `;

    try {
        const properties = await API.getOwnerProperties();

        // Update stats
        if (statsContainer) {
            const totalProperties = properties.length;
            const forRent = properties.filter(p => p.type === 'RENT').length;
            const forSale = properties.filter(p => p.type === 'SALE').length;

            statsContainer.innerHTML = `
                <div class="col-md-4 mb-3">
                    <div class="stats-card">
                        <div class="d-flex align-items-center gap-3">
                            <div class="stats-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">
                                <i class="bi bi-buildings"></i>
                            </div>
                            <div>
                                <div class="stats-number">${totalProperties}</div>
                                <div class="stats-label">Total Listings</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-3">
                    <div class="stats-card">
                        <div class="d-flex align-items-center gap-3">
                            <div class="stats-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);">
                                <i class="bi bi-key"></i>
                            </div>
                            <div>
                                <div class="stats-number">${forRent}</div>
                                <div class="stats-label">For Rent</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-3">
                    <div class="stats-card">
                        <div class="d-flex align-items-center gap-3">
                            <div class="stats-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--accent);">
                                <i class="bi bi-tag"></i>
                            </div>
                            <div>
                                <div class="stats-number">${forSale}</div>
                                <div class="stats-label">For Sale</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (properties.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="empty-state">
                            <i class="bi bi-house-add"></i>
                            <h5>No properties listed yet</h5>
                            <p>Start by adding your first property</p>
                            <a href="add-property.html" class="btn btn-primary-custom mt-2">
                                <i class="bi bi-plus-lg me-2"></i>Add Property
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = properties.map(property => `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <img src="${property.imageUrl || getDefaultImage()}" 
                             alt="${property.title}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;"
                             onerror="this.src='${getDefaultImage()}'">
                        <strong>${property.title}</strong>
                    </div>
                </td>
                <td>${property.location}</td>
                <td><strong style="color: var(--primary);">${formatPrice(property.price)}</strong></td>
                <td>${property.rooms}</td>
                <td>
                    <span class="badge ${property.type === 'RENT' ? 'badge-rent' : 'badge-sale'}" style="font-size: 0.7rem;">
                        ${property.type}
                    </span>
                </td>
                <td>${new Date(property.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                    <button class="btn btn-danger-custom btn-sm" onclick="deleteProperty(${property.id})">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-danger">
                    Failed to load properties. Please try again.
                </td>
            </tr>
        `;
    }
}

async function deleteProperty(id) {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) return;

    try {
        await API.deleteProperty(id);
        showToast('Property deleted successfully');
        loadDashboard();
    } catch (error) {
        showToast(error.data?.message || 'Failed to delete property', true);
    }
}
