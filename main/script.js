// --- INITIALIZATION ---
AOS.init({ duration: 800, once: true });

// --- GLOBAL VARIABLES & CONSTANTS ---
const API_URL = 'http://localhost:3000/api';
const pages = ['homepage', 'campaigns', 'donations', 'about', 'submit-campaign', 'registration', 'login', 'register', 'dashboard', 'edit-campaign', 'event-report', 'edit-report'];
let allEvents = { upcoming: [], conducted: [] };
let myEvents = { upcoming: [], conducted: [] };

// --- CORE UI & ROUTING ---
function showPage(pageId, data = null) {
    pages.forEach(id => {
        const pageElement = document.getElementById(id);
        if (pageElement) pageElement.classList.remove('active');
    });
    const pageElement = document.getElementById(pageId);
    if (!pageElement) return;

    pageElement.classList.add('active');
    window.scrollTo(0, 0);

    const pageRenderer = pageRenderers[pageId];
    if (pageRenderer) {
        pageRenderer(data);
    }
    
    // We add a very short delay before refreshing AOS.
    // This gives the browser time to process the new HTML content.
    setTimeout(() => {
        AOS.refresh();
    }, 50); // 50 milliseconds is usually enough
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = '';
    toast.classList.add(type, 'show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// NEW FUNCTION TO HANDLE VIEWING REPORTS SAFELY
function viewReportById(campaignId) {
    const campaign = [...allEvents.upcoming, ...allEvents.conducted, ...myEvents.upcoming, ...myEvents.conducted].find(e => e.id === campaignId);
    if (campaign) {
        showPage('event-report', campaign);
    } else {
        console.error('Could not find campaign with ID:', campaignId);
        showToast('Sorry, there was an error loading that report.', 'error');
    }
}


// --- THEME HANDLING ---
function applyTheme(theme) {
    document.body.dataset.theme = theme;
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    if (sunIcon && moonIcon) {
        if (theme === 'dark') {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    }
    feather.replace();
}

function handleThemeToggle() {
    const currentTheme = document.body.dataset.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    applyTheme(theme);
}


// --- AUTHENTICATION & NAV ---
function handleLogin(token, ngoName) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('ngoName', ngoName);
    updateNav();
    showPage('dashboard');
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('ngoName');
    updateNav();
    showPage('homepage');
}

function updateNav() {
    const navLinks = document.getElementById('nav-links');
    const token = localStorage.getItem('authToken');
    const ngoName = localStorage.getItem('ngoName');
    const baseLinks = `
        <a class="nav-link" onclick="showPage('homepage')">Home</a>
        <a class="nav-link" onclick="showPage('campaigns')">Events</a>
        <a class="nav-link" onclick="showPage('donations')">Donate</a>
    `;
    if (token) {
        navLinks.innerHTML = baseLinks + `
            <a class="nav-link" onclick="showPage('dashboard')">My Dashboard</a>
            <a class="nav-link" onclick="showPage('submit-campaign')">Submit Campaign</a>
            <span class="nav-link text-gray-800 font-semibold">Welcome, ${ngoName}!</span>
            <a class="button-secondary" onclick="handleLogout()">Logout</a>`;
    } else {
        navLinks.innerHTML = baseLinks + `
            <a class="nav-link" onclick="showPage('login')">Login</a>
            <a class="button-primary" onclick="showPage('register')">Register NGO</a>`;
    }
    feather.replace();
}

// --- DATA HANDLING ---
async function fetchAndStoreEvents() {
    try {
        const response = await fetch(`${API_URL}/campaigns`);
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data.upcoming) && Array.isArray(data.conducted)) {
            allEvents = data;
            return true;
        } else {
            throw new Error('Invalid data format received from server.');
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        displayErrorState(error.message);
        return false;
    }
}

function displayErrorState(errorMessage) {
    const activePage = document.querySelector('.page-section.active');
    if (activePage) {
        activePage.innerHTML = `<div class="placeholder-page text-red-500">
            <h2 class="text-2xl font-bold mb-4">Connection Error</h2>
            <p>Could not load campaign data. Please ensure the backend server is running correctly.</p>
            <p class="mt-2 text-sm text-gray-500">Details: ${errorMessage}</p>
        </div>`;
    }
    showToast(errorMessage, 'error');
}


// --- START: NEW STATISTICS RENDERER ---
function renderStatistics() {
    const container = document.getElementById('statsSection');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastEvents = allEvents.conducted.length;
    let ongoingEvents = 0;
    let futureEvents = 0;

    allEvents.upcoming.forEach(event => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);

        if (eventDate.getTime() === today.getTime()) {
            ongoingEvents++;
        } else if (eventDate.getTime() > today.getTime()) {
            futureEvents++;
        }
    });

    container.innerHTML = `
        <div class="container page-container">
            <div class="stats-grid" data-aos="fade-up">
                <div class="stat-item">
                    <i data-feather="check-circle" class="stat-icon"></i>
                    <p class="stat-value">${pastEvents}</p>
                    <p class="stat-label">Past Events</p>
                </div>
                <div class="stat-item">
                    <i data-feather="zap" class="stat-icon"></i>
                    <p class="stat-value">${ongoingEvents}</p>
                    <p class="stat-label">Events Today</p>
                </div>
                <div class="stat-item">
                    <i data-feather="calendar" class="stat-icon"></i>
                    <p class="stat-value">${futureEvents}</p>
                    <p class="stat-label">Future Events</p>
                </div>
            </div>
        </div>
    `;
    feather.replace();
}
// --- END: NEW STATISTICS RENDERER ---


// --- PAGE RENDERERS ---
const pageRenderers = {
    homepage: () => {
        const container = document.getElementById('homepage');
        container.innerHTML = `
            <div class="hero-gradient"><div class="container hero-content"><h1 class="hero-title">Empowering people to give back</h1><p class="hero-subtitle">Join hands to create meaningful change.</p></div></div>
            <div id="statsSection"></div>
            <div class="container page-container">
                <h2 class="section-title">Featured Campaigns</h2>
                <div id="featuredCampaignsContainer" class="card-grid"></div>
                <div id="howItWorksSection"></div>
            </div>`;
        renderStatistics();
        renderFeaturedCampaigns();
        renderHowItWorks();
    },
    campaigns: () => {
        const container = document.getElementById('campaigns');
        container.innerHTML = `
            <div class="container page-container">
                <div class="page-header"><h1 class="page-title">Find Events & Campaigns</h1></div>
                <div id="filters-container"></div>
                <h2 class="section-title">Upcoming Events</h2>
                <div id="upcomingEventsContainer" class="card-grid"></div>
                <h2 class="section-title mt-12">Conducted Events</h2>
                <div id="conductedEventsContainer" class="card-grid"></div>
            </div>`;
        renderFilters();
        applyFilters();
    },
    dashboard: () => renderDashboard(),
    'edit-campaign': (campaign) => renderEditForm(campaign),
    'event-report': (campaign) => renderEventReport(campaign),
    'edit-report': (campaign) => renderEditReportForm(campaign),
    login: () => renderLoginPage(),
    register: () => renderRegisterPage(),
    donations: () => renderDonationPage(),
    'submit-campaign': () => renderSubmitCampaignForm(),
    registration: (data) => renderRegistrationForm(data)
};

// --- DASHBOARD & EDIT/DELETE FUNCTIONS ---
async function renderDashboard() {
    const container = document.getElementById('dashboard');
    container.innerHTML = `<div class="placeholder-page">Loading your campaigns...</div>`;
    const token = localStorage.getItem('authToken');
    if (!token) {
        showPage('login');
        showToast('You must be logged in to view your dashboard.', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/my-campaigns`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Could not fetch your campaigns.');
        }
        myEvents = await response.json();
        const upcomingCount = myEvents.upcoming.length;
        const conductedCount = myEvents.conducted.length;
        const totalCount = upcomingCount + conductedCount;
        container.innerHTML = `
            <div class="container page-container">
                <div class="dashboard-header" data-aos="fade-down">
                    <div><h1 class="page-title">My Dashboard</h1><p class="page-subtitle">Manage your organization's campaigns.</p></div>
                    <button class="button-primary" onclick="showPage('submit-campaign')">Create New Campaign</button>
                </div>
                <div class="dashboard-stats" data-aos="fade-up">
                    <div class="stat-card"><p class="stat-card-title">Upcoming Events</p><p class="stat-card-value">${upcomingCount}</p></div>
                    <div class="stat-card"><p class="stat-card-title">Conducted Events</p><p class="stat-card-value">${conductedCount}</p></div>
                    <div class="stat-card"><p class="stat-card-title">Total Campaigns</p><p class="stat-card-value">${totalCount}</p></div>
                </div>
                ${totalCount === 0 ? `
                    <div class="empty-dashboard" data-aos="zoom-in">
                         <h2 class="empty-dashboard-title">No campaigns yet!</h2>
                         <p class="empty-dashboard-text">Get started by creating your first campaign.</p>
                         <button class="button-primary" onclick="showPage('submit-campaign')">Create Campaign</button>
                    </div>
                ` : `
                    <div class="dashboard-section" data-aos="fade-up">
                        <h2 class="section-title">My Upcoming Events</h2>
                        <div id="myUpcomingEventsContainer" class="card-grid"></div>
                    </div>
                    <div class="dashboard-section" data-aos="fade-up">
                        <h2 class="section-title mt-8">My Conducted Events</h2>
                        <div id="myConductedEventsContainer" class="card-grid"></div>
                    </div>
                `}
            </div>`;
        if (totalCount > 0) {
            renderEventCards('myUpcomingEventsContainer', myEvents.upcoming, true);
            renderEventCards('myConductedEventsContainer', myEvents.conducted, true);
        }
    } catch (error) {
        container.innerHTML = `<div class="placeholder-page text-red-500">${error.message}</div>`;
        showToast(error.message, 'error');
    }
}

function renderEditForm(campaign) {
    const container = document.getElementById('edit-campaign');
    const eventDate = new Date(campaign.event_date).toISOString().split('T')[0];
    container.innerHTML = `
        <div class="form-container" data-aos="fade-up">
            <div class="page-header mb-8"><h1 class="page-title">Edit Campaign</h1></div>
            <form onsubmit="handleUpdateCampaign(event, ${campaign.id})" class="space-y-6">
                <div><label class="form-label">Campaign Title</label><input type="text" name="title" class="form-input" value="${campaign.title}" required></div>
                <div><label class="form-label">Full Campaign Description</label><textarea name="description" rows="4" class="form-input" required>${campaign.description}</textarea></div>
                <div><label class="form-label">Short Summary (for cards)</label><textarea name="short_summary" rows="2" class="form-input" required>${campaign.short_summary}</textarea></div>
                <div>
                    <label class="form-label">Cover Image</label>
                    <img id="edit-image-preview" src="${campaign.cover_image_url}" alt="Image preview" class="w-full h-48 object-cover rounded-md mb-2 bg-gray-100">
                    <input type="file" name="coverImageFile" class="form-input" onchange="previewImage(event, 'edit-image-preview')">
                    <input type="hidden" name="existing_cover_image_url" value="${campaign.cover_image_url}">
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="form-label">City</label><input type="text" name="city" class="form-input" value="${campaign.city}" required></div>
                    <div><label class="form-label">Event Type</label><input type="text" name="type" class="form-input" value="${campaign.type}" required></div>
                </div>
                <div><label class="form-label">Event Date</label><input type="date" name="event_date" class="form-input" value="${eventDate}" required></div>
                <div class="flex gap-4 pt-4">
                    <button type="button" onclick="showPage('dashboard')" class="button-secondary w-full">Cancel</button>
                    <button type="submit" class="button-primary w-full">Save Changes</button>
                </div>
            </form>
        </div>`;
}

function showConfirmationModal(title, text, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-text').textContent = text;
    modal.classList.remove('hidden');
    
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        modal.classList.add('hidden');
    });
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'), { once: true });
}

async function handleDeleteCampaign(campaignId) {
    showConfirmationModal('Delete Campaign?', 'This action cannot be undone.', async () => {
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_URL}/campaigns/${campaignId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to delete campaign.');
            }
            showToast('Campaign deleted successfully.', 'success');
            await renderDashboard();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// --- CARD & FILTER RENDERING ---
function renderFilters() {
    const container = document.getElementById('filters-container');
    if (!container) return;
    container.innerHTML = `
        <div class="filter-bar" data-aos="fade-up">
            <div class="relative"><input type="text" id="searchFilter" class="form-input" placeholder="Search by name or NGO..."><i data-feather="search" class="form-icon"></i></div>
            <select id="cityFilter" class="form-input"></select>
            <select id="typeFilter" class="form-input"></select>
            <button id="resetFilters" class="button-secondary">Reset Filters</button>
        </div>`;
    feather.replace();
    populateFilters();
    document.getElementById('searchFilter').addEventListener('input', applyFilters);
    document.getElementById('cityFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', () => {
        document.getElementById('searchFilter').value = '';
        document.getElementById('cityFilter').value = 'all';
        document.getElementById('typeFilter').value = 'all';
        applyFilters();
    });
}

function renderFeaturedCampaigns() {
    const featured = allEvents.upcoming.slice(0, 3);
    renderEventCards('featuredCampaignsContainer', featured);
}

function applyFilters() {
    const searchTerm = document.getElementById('searchFilter')?.value.toLowerCase() || '';
    const city = document.getElementById('cityFilter')?.value.toLowerCase() || 'all cities';
    const type = document.getElementById('typeFilter')?.value.toLowerCase() || 'all types';
    const filterEvent = (event) => (
        (city === 'all cities' || (event.city && event.city.toLowerCase() === city)) &&
        (type === 'all types' || (event.type && event.type.toLowerCase() === type)) &&
        (event.title.toLowerCase().includes(searchTerm) || event.ngo.toLowerCase().includes(searchTerm))
    );
    renderEventCards('upcomingEventsContainer', allEvents.upcoming.filter(filterEvent));
    renderEventCards('conductedEventsContainer', allEvents.conducted.filter(filterEvent));
}

function populateFilters() {
    const allCampaigns = [...allEvents.upcoming, ...allEvents.conducted];
    const cities = [...new Set(allCampaigns.map(e => e.city).filter(Boolean).map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()))];
    const types = [...new Set(allCampaigns.map(e => e.type).filter(Boolean).map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()))];
    populateSelect('cityFilter', cities, 'All Cities');
    populateSelect('typeFilter', types, 'All Types');
}

function populateSelect(selectId, dataSet, defaultOption) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="${defaultOption.toLowerCase()}">${defaultOption}</option>`;
    dataSet.sort().forEach(item => select.add(new Option(item, item)));
}

function renderEventCards(containerId, events, isDashboard = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let cardsHtml = events.length ? events.map(event => {
        const eventData = [...allEvents.upcoming, ...allEvents.conducted, ...myEvents.upcoming, ...myEvents.conducted].find(e => e.id === event.id) || event;
        
        let buttons = '';
        const volunteerInfo = isDashboard ? `<p class="card-meta mt-2"><b>${event.volunteers_registered || 0}</b> volunteers registered</p>` : '';

        if (isDashboard) {
            const isConducted = new Date(event.event_date) < new Date();
            if (isConducted) {
                buttons = `<div class="card-button-group">${volunteerInfo}<button onclick='showPage("edit-report", ${JSON.stringify(eventData)})' class="button-secondary card-button-small">Add/Edit Report</button></div>`;
            } else {
                buttons = `<div class="card-button-group">${volunteerInfo}<button onclick='showPage("edit-campaign", ${JSON.stringify(eventData)})' class="button-secondary card-button-small">Edit</button></div>`;
            }
        } else {
            if (new Date(event.event_date) < new Date()) {
                buttons = `<button onclick="viewReportById(${event.id})" class="button-secondary card-button">View Report</button>`;
            } else {
                buttons = `<button onclick="showPage('registration', { title: '${event.title.replace(/'/g, "\\'")}' })" class="button-primary card-button">Register Now</button>`;
            }
        }

        return `
            <div class="card" data-aos="fade-up">
                <img class="card-image" src="${event.cover_image_url || 'https://placehold.co/600x400'}" alt="${event.title}">
                <div class="card-body">
                    <h3 class="card-title">${event.title}</h3>
                    <p class="card-meta">By ${event.ngo} in ${event.city}</p>
                    <p class="card-summary">${event.short_summary}</p>
                    ${buttons}
                </div>
            </div>`;
    }).join('') : `<p class="text-gray-500 col-span-3 text-center">No events found.</p>`;
    
    container.innerHTML = cardsHtml;
    AOS.refresh();
    feather.replace();
}

// --- FORM SUBMISSION & DYNAMIC PAGE RENDERING ---
function renderLoginPage() {
    const container = document.getElementById('login');
    container.innerHTML = `
        <div class="form-container" data-aos="fade-up">
            <div class="page-header mb-8"><h1 class="page-title">NGO Login</h1></div>
            <form onsubmit="submitLogin(event)" class="space-y-4">
                <input type="email" name="email" class="form-input" placeholder="Email Address" required>
                <input type="password" name="password" class="form-input" placeholder="Password" required>
                <button type="submit" class="button-primary w-full mt-4">Login</button>
                <p class="text-center text-sm text-gray-600">Don't have an account? <a onclick="showPage('register')" class="text-blue-600 hover:underline cursor-pointer">Register here</a>.</p>
            </form>
        </div>`;
}
function renderRegisterPage() {
    const container = document.getElementById('register');
    container.innerHTML = `
        <div class="form-container" data-aos="fade-up">
            <div class="page-header mb-8"><h1 class="page-title">Register Your NGO</h1></div>
            <form onsubmit="submitUserRegistration(event)" class="space-y-4">
                <input type="text" name="ngoName" class="form-input" placeholder="Official NGO Name" required>
                <input type="email" name="email" class="form-input" placeholder="Email Address" required>
                <input type="password" name="password" class="form-input" placeholder="Password" required>
                <button type="submit" class="button-primary w-full mt-4">Register</button>
                <p class="text-center text-sm text-gray-600">Already have an account? <a onclick="showPage('login')" class="text-blue-600 hover:underline cursor-pointer">Login here</a>.</p>
            </form>
        </div>`;
}
async function submitLogin(event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        handleLogin(result.token, result.ngoName);
        showToast(result.message, 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}
async function submitUserRegistration(event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        showToast(result.message, 'success');
        showPage('login');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function uploadImage(file) {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('coverImageFile', file);
    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Image upload failed.');
        }
        const result = await response.json();
        return result.filePath;
    } catch (error) {
        showToast(error.message, 'error');
        return null;
    }
}

async function submitNewCampaign(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const fileInput = form.querySelector('input[name="coverImageFile"]');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Please select a cover image to upload.', 'error');
        return;
    }

    const imageUrl = await uploadImage(file);
    if (!imageUrl) return;

    payload.cover_image_url = imageUrl;
    delete payload.coverImageFile;

    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_URL}/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        await fetchAndStoreEvents();
        showToast('Campaign submitted successfully!', 'success');
        showPage('campaigns');
    } catch (error) {
        showToast(`Submission failed: ${error.message}`, 'error');
    }
}
async function handleUpdateCampaign(event, campaignId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const fileInput = form.querySelector('input[name="coverImageFile"]');
    const file = fileInput.files[0];

    if (file) {
        const newImageUrl = await uploadImage(file);
        if (!newImageUrl) return;
        payload.cover_image_url = newImageUrl;
    } else {
        payload.cover_image_url = payload.existing_cover_image_url;
    }

    delete payload.coverImageFile;
    delete payload.existing_cover_image_url;
    
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_URL}/campaigns/${campaignId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update campaign.');
        }
        showToast('Campaign updated successfully!', 'success');
        await showPage('dashboard');
    } catch (error) {
        showToast(error.message, 'error');
    }
}
async function submitEventRegistration(event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    payload.campaignTitle = event.target.dataset.campaignTitle;
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        showToast('Thank you for registering!', 'success');
        showPage('campaigns');
    } catch (error) {
        showToast(error.message, 'error');
    }
}
async function handleDonation(event) {
    event.preventDefault();
    const customAmount = document.getElementById('customAmount').value;
    const selectedAmount = document.querySelector('.amount-button.active')?.dataset.amount;
    const amount = customAmount || selectedAmount;
    const name = document.getElementById('donorName').value;
    const email = document.getElementById('donorEmail').value;

    if (!amount || amount <= 0) {
        showToast('Please select or enter a valid amount.', 'error');
        return;
    }

    try {
        const orderResponse = await fetch(`${API_URL}/payment/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount })
        });
        if (!orderResponse.ok) throw new Error('Could not create payment order.');
        const order = await orderResponse.json();

        const options = {
            key: 'rzp_test_RKITS6DiBpq5vR', // Replace with your actual Key ID
            amount: order.amount,
            currency: order.currency,
            name: "Traahi Donations",
            description: "Donation for a cause",
            image: "https://i.imgur.com/8mpO2t3.png",
            order_id: order.id,
            handler: function (response) {
                showToast('Payment successful! Thank you.', 'success');
                showPage('homepage');
            },
            prefill: { name: name, email: email, },
            theme: { color: "#2563eb" }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function renderSubmitCampaignForm() {
    const container = document.getElementById('submit-campaign');
    container.innerHTML = `
        <div class="form-container" data-aos="fade-up">
            <div class="page-header mb-8"><h1 class="page-title">Submit a Campaign</h1></div>
            <form onsubmit="submitNewCampaign(event)" class="space-y-6">
                <div><label class="form-label">Campaign Title</label><input type="text" name="campaignTitle" class="form-input" required></div>
                <div><label class="form-label">Full Campaign Description</label><textarea name="description" rows="4" class="form-input" required></textarea></div>
                <div><label class="form-label">Short Summary (for cards)</label><textarea name="short_summary" rows="2" class="form-input" required></textarea></div>
                <div>
                    <label class="form-label">Cover Image</label>
                    <img id="submit-image-preview" src="https://placehold.co/600x400/e2e8f0/e2e8f0?text=+" alt="Image preview" class="w-full h-48 object-cover rounded-md mb-2 bg-gray-100">
                    <input type="file" name="coverImageFile" class="form-input" onchange="previewImage(event, 'submit-image-preview')" required>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="form-label">City</label><input type="text" name="city" class="form-input" required></div>
                    <div><label class="form-label">Event Type</label><input type="text" name="type" class="form-input" required></div>
                </div>
                <div><label class="form-label">Event Date</label><input type="date" name="event_date" class="form-input" required></div>
                <button type="submit" class="button-primary w-full mt-4">Submit for Review</button>
            </form>
        </div>`;
}
function renderRegistrationForm(data) {
    const container = document.getElementById('registration');
    container.innerHTML = `
        <div class="form-container" data-aos="fade-up">
            <div class="page-header mb-8">
                <h1 class="page-title">Register for Event</h1>
                <p class="page-subtitle">You are registering for: <strong>${data.title}</strong></p>
            </div>
            <form onsubmit="submitEventRegistration(event)" data-campaign-title="${data.title}" class="space-y-4">
                <input type="text" name="fullName" class="form-input" placeholder="Full Name" required>
                <input type="email" name="email" class="form-input" placeholder="Email Address" required>
                <input type="tel" name="phone" class="form-input" placeholder="Phone Number" required>
                <button type="submit" class="button-primary w-full mt-4">Confirm Registration</button>
            </form>
        </div>`;
}
function renderDonationPage() {
    const container = document.getElementById('donations');
    container.innerHTML = `
        <div class="form-container" data-aos="fade-up">
            <div class="page-header mb-8"><h1 class="page-title">Make a Donation</h1></div>
            <form onsubmit="handleDonation(event)" class="space-y-6">
                <div>
                    <label class="font-semibold text-gray-700 block mb-2">Select Amount (₹)</label>
                    <div class="amount-options">
                        <div class="amount-button" data-amount="500">₹ 500</div><div class="amount-button" data-amount="1000">₹ 1,000</div>
                        <div class="amount-button" data-amount="2500">₹ 2,500</div><div class="amount-button active" data-amount="5000">₹ 5,000</div>
                    </div>
                    <input type="number" id="customAmount" class="form-input" placeholder="Or enter a custom amount">
                </div>
                <div class="space-y-4">
                    <input type="text" id="donorName" class="form-input" placeholder="Full Name" required>
                    <input type="email" id="donorEmail" class="form-input" placeholder="Email Address" required>
                </div>
                <button type="submit" class="button-primary w-full mt-6">Donate Securely</button>
            </form>
        </div>`;
    document.querySelectorAll('.amount-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.amount-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.getElementById('customAmount').value = '';
        });
    });
    document.getElementById('customAmount').addEventListener('input', () => {
        document.querySelectorAll('.amount-button').forEach(btn => btn.classList.remove('active'));
    });
}
function previewImage(event, previewId) {
    const reader = new FileReader();
    reader.onload = function(){
        const output = document.getElementById(previewId);
        output.src = reader.result;
    };
    reader.readAsDataURL(event.target.files[0]);
}

function renderEventReport(campaign) {
    const container = document.getElementById('event-report');
    try {
        const galleryImages = campaign.gallery_images ? campaign.gallery_images.split(',').map(url => url.trim()) : [];

        let formattedDate = 'an unknown date';
        if (campaign.event_date) {
            const date = new Date(campaign.event_date);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString();
            }
        }

        container.innerHTML = `
        <div class="container page-container">
            <div class="report-container">
                <div class="report-header">
                    <h1 class="report-title">${campaign.title}</h1>
                    <p class="report-meta">Conducted on ${formattedDate} in ${campaign.city} by ${campaign.ngo}</p>
                </div>
                <div>
                    <h2 class="report-section-title">Impact Summary</h2>
                    <p class="report-text">${campaign.impact_report || 'The impact report for this event has not been published yet. Please check back later for updates.'}</p>
                </div>
                ${galleryImages.length > 0 ? `
                <div>
                    <h2 class="report-section-title">Photo Gallery</h2>
                    <div class="report-gallery">
                        ${galleryImages.map(url => `<img src="${url}" alt="Event photo" onerror="this.style.display='none'">`).join('')}
                    </div>
                </div>` : ''}
                 <div class="mt-8 text-center">
                    <button onclick="showPage('campaigns')" class="button-secondary">Back to Events</button>
                </div>
            </div>
        </div>`;

    } catch (error) {
        console.error("Error rendering event report:", error);
        container.innerHTML = `<div class="placeholder-page text-red-500"><h2>Error</h2><p>Could not display this report due to a data error.</p></div>`;
    }
}

function renderHowItWorks() {
    const container = document.getElementById('howItWorksSection');
    container.innerHTML = `
        <div class="mt-20 text-center">
            <h2 class="section-title" style="justify-content: center; display: flex;">How It Works</h2>
            <div class="grid md:grid-cols-3 gap-12 mt-12 text-center">
                <div data-aos="fade-up" data-aos-delay="100">
                    <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600">
                        <i data-feather="search" class="h-8 w-8"></i>
                    </div>
                    <h3 class="mt-4 text-xl font-bold">Find Causes</h3>
                    <p class="mt-2 text-gray-600">Browse campaigns by location or category to find initiatives that resonate with you.</p>
                </div>
                <div data-aos="fade-up" data-aos-delay="200">
                     <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600">
                        <i data-feather="heart" class="h-8 w-8"></i>
                    </div>
                    <h3 class="mt-4 text-xl font-bold">Contribute</h3>
                    <p class="mt-2 text-gray-600">Donate funds, volunteer your time, or share campaigns to amplify their reach.</p>
                </div>
                <div data-aos="fade-up" data-aos-delay="300">
                     <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600">
                        <i data-feather="trending-up" class="h-8 w-8"></i>
                    </div>
                    <h3 class="mt-4 text-xl font-bold">Track Impact</h3>
                    <p class="mt-2 text-gray-600">Receive updates on how your contribution is making a tangible difference.</p>
                </div>
            </div>
        </div>
    `;
    feather.replace();
}

// ** NEW: Function to render the report upload form **
function renderEditReportForm(campaign) {
    const container = document.getElementById('edit-report');
    container.innerHTML = `
        <div class="form-container" data-aos="fade-up">
            <div class="page-header mb-8">
                <h1 class="page-title">Add/Edit Event Report</h1>
                <p class="page-subtitle">For: ${campaign.title}</p>
            </div>
            <form onsubmit="handleReportUpdate(event, ${campaign.id})" class="space-y-6">
                <div>
                    <label class="form-label">Impact Summary</label>
                    <textarea name="impact_report" rows="6" class="form-input" required>${campaign.impact_report || ''}</textarea>
                </div>
                <div>
                    <label class="form-label">Upload Gallery Images (up to 5)</label>
                    <input type="file" name="galleryImages" class="form-input" multiple accept="image/*">
                </div>
                <div class="flex gap-4 pt-4">
                    <button type="button" onclick="showPage('dashboard')" class="button-secondary w-full">Cancel</button>
                    <button type="submit" class="button-primary w-full">Save Report</button>
                </div>
            </form>
        </div>`;
}

// ** NEW: Function to handle the report form submission **
async function handleReportUpdate(event, campaignId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const payload = {};
    payload.impact_report = formData.get('impact_report');

    const files = form.querySelector('input[name="galleryImages"]').files;
    
    if (files.length > 0) {
        const token = localStorage.getItem('authToken');
        const uploadFormData = new FormData();
        for (const file of files) {
            uploadFormData.append('galleryImages', file);
        }
        
        try {
            const uploadResponse = await fetch(`${API_URL}/upload-gallery`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: uploadFormData,
            });
            if (!uploadResponse.ok) throw new Error('Image upload failed.');
            const uploadResult = await uploadResponse.json();
            payload.gallery_images = uploadResult.filePaths.join(', ');
        } catch (error) {
            showToast(error.message, 'error');
            return;
        }
    }
    
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_URL}/campaigns/${campaignId}/report`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (!response.ok) { throw new Error((await response.json()).error); }
        showToast('Report updated successfully!', 'success');
        await showPage('dashboard');

    } catch (error) {
        showToast(error.message, 'error');
    }
}

// --- INITIAL LOAD ---
async function initializeApp() {
    updateNav();
    initializeTheme();
    document.getElementById('theme-toggle-btn').addEventListener('click', handleThemeToggle);

    const homepage = document.getElementById('homepage');
    pages.forEach(id => document.getElementById(id)?.classList.remove('active'));
    homepage.classList.add('active');
    homepage.innerHTML = `<div class="placeholder-page">Loading content...</div>`;

    try {
        const statusResponse = await fetch(`${API_URL}/status`);
        if (!statusResponse.ok) { throw new Error('Backend not responding.'); }
    } catch(error) {
        displayErrorState("Could not connect to backend. Is it running?");
        return;
    }

    const success = await fetchAndStoreEvents();
    if (success) {
        showPage('homepage');
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

