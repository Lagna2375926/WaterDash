// Global data and state management
let map;
let markers = [];
let allProjects = [];
let filteredProjects = [];
let charts = {};
let projectsData = []; // Will be populated via fetch

// Fetch project data from local JSON
async function fetchProjectData() {
    try {
        const response = await fetch('projects.json'); // or your API endpoint
        const data = await response.json();
        projectsData = data;
        allProjects = [...projectsData];
        filteredProjects = [...projectsData];

        initializeMap();
        createCharts();
        setupToggleButtons();
        setupFilters();
        populateProjectsTable();
        addMapMarkers();
    } catch (error) {
        console.error("Failed to fetch project data:", error);
    }
}

// DOM ready
document.addEventListener('DOMContentLoaded', function () {
    fetchProjectData();
    // Optional: Refresh every 60 sec
    // setInterval(fetchProjectData, 60000);
});

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount * 1000000);
}

function getMarkerColor(type) {
    const colors = {
        'Desalination': '#FF6B35',
        'Wastewater Treatment': '#4ECDC4',
        'Water Distribution': '#45B7D1',
        'Rural Water Access': '#96CEB4',
        'Irrigation Systems': '#FECA57',
        'Groundwater Management': '#A55EEA',
        'Water Storage': '#26C6DA',
        'Flood Management': '#FF7043',
        'Water Recycling': '#66BB6A',
        'Smart Water Networks': '#42A5F5'
    };
    return colors[type] || '#1E90FF';
}

function getStatusClass(status) {
    return `status-${status.toLowerCase()}`;
}

// Map
function initializeMap() {
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Charts
function createCharts() {
    // Compute dynamic chart data
    const regionMap = {};
    const typeMap = {};
    const statusMap = {};

    projectsData.forEach(p => {
        regionMap[p.region] = (regionMap[p.region] || 0) + p.cost_million / 1000;
        typeMap[p.type] = (typeMap[p.type] || 0) + 1;
        statusMap[p.status] = (statusMap[p.status] || 0) + 1;
    });

    // Region Chart
    const investmentCtx = document.getElementById('investment-chart').getContext('2d');
    charts.investment = new Chart(investmentCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(regionMap),
            datasets: [{
                label: 'Investment (Billions USD)',
                data: Object.values(regionMap),
                backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '$' + value + 'B'
                    }
                }
            }
        }
    });

    // Type Chart
    const projectsCtx = document.getElementById('projects-chart').getContext('2d');
    charts.projects = new Chart(projectsCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(typeMap),
            datasets: [{
                data: Object.values(typeMap),
                backgroundColor: Object.keys(typeMap).map(getMarkerColor)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // Status Chart
    const statusCtx = document.getElementById('status-chart').getContext('2d');
    charts.status = new Chart(statusCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(statusMap),
            datasets: [{
                label: 'Projects',
                data: Object.values(statusMap),
                backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
}

// Buttons
function setupToggleButtons() {
    const projectTypes = [...new Set(projectsData.map(p => p.type))];
    const projectStatuses = [...new Set(projectsData.map(p => p.status))];

    const typeTogglesContainer = document.getElementById('type-toggles');
    const statusTogglesContainer = document.getElementById('status-toggles');

    typeTogglesContainer.innerHTML = '';
    statusTogglesContainer.innerHTML = '';

    projectTypes.forEach(type => {
        const btn = document.createElement('button');
        btn.className = 'toggle-btn active';
        btn.textContent = type;
        btn.dataset.type = type;
        btn.addEventListener('click', () => toggleProjectType(btn, type));
        typeTogglesContainer.appendChild(btn);
    });

    projectStatuses.forEach(status => {
        const btn = document.createElement('button');
        btn.className = 'toggle-btn active';
        btn.textContent = status;
        btn.dataset.status = status;
        btn.addEventListener('click', () => toggleProjectStatus(btn, status));
        statusTogglesContainer.appendChild(btn);
    });
}

function toggleProjectType(button, type) {
    button.classList.toggle('active');
    updateMapMarkers();
}
function toggleProjectStatus(button, status) {
    button.classList.toggle('active');
    updateMapMarkers();
}

// Filters
function setupFilters() {
    ['region-filter', 'type-filter', 'status-filter', 'investment-filter'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    const region = document.getElementById('region-filter').value;
    const type = document.getElementById('type-filter').value;
    const status = document.getElementById('status-filter').value;
    const investment = document.getElementById('investment-filter').value;

    filteredProjects = allProjects.filter(p => {
        if (region && p.region !== region) return false;
        if (type && p.type !== type) return false;
        if (status && p.status !== status) return false;

        const cost = p.cost_million;
        switch (investment) {
            case '0-50': if (cost > 50) return false; break;
            case '50-200': if (cost <= 50 || cost > 200) return false; break;
            case '200-500': if (cost <= 200 || cost > 500) return false; break;
            case '500+': if (cost <= 500) return false; break;
        }

        return true;
    });

    populateProjectsTable();
    updateMapMarkers();
}

// Map Markers
function addMapMarkers() {
    updateMapMarkers();
}

function updateMapMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const activeTypes = Array.from(document.querySelectorAll('#type-toggles .toggle-btn.active'))
        .map(btn => btn.dataset.type);
    const activeStatuses = Array.from(document.querySelectorAll('#status-toggles .toggle-btn.active'))
        .map(btn => btn.dataset.status);

    const visibleProjects = filteredProjects.filter(p =>
        activeTypes.includes(p.type) && activeStatuses.includes(p.status)
    );

    visibleProjects.forEach(project => {
        const marker = L.circleMarker([project.latitude, project.longitude], {
            radius: 8,
            fillColor: getMarkerColor(project.type),
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        const popupContent = `
            <div class="popup-content">
                <h4>${project.name}</h4>
                <p><strong>Country:</strong> ${project.country}</p>
                <p><strong>Type:</strong> ${project.type}</p>
                <p><strong>Status:</strong> ${project.status}</p>
                <p><strong>Cost:</strong> ${formatCurrency(project.cost_million)}</p>
                <p><strong>Beneficiaries:</strong> ${project.beneficiaries.toLocaleString()}</p>
                <p><strong>Start Date:</strong> ${project.start_date || 'N/A'}</p>
                <p><strong>End Date:</strong> ${project.end_date || 'N/A'}</p>
                <div class="popup-progress">
                    <p><strong>Progress:</strong> ${project.progress}%</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${project.progress}%"></div>
                    </div>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(map);
        markers.push(marker);
    });
}

// Table
function populateProjectsTable() {
    const tbody = document.getElementById('projects-table-body');
    tbody.innerHTML = '';

    filteredProjects.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.name}</td>
            <td>${p.country}</td>
            <td>${p.region}</td>
            <td>${p.type}</td>
            <td><span class="status-badge ${getStatusClass(p.status)}">${p.status}</span></td>
            <td>${formatCurrency(p.cost_million)}</td>
            <td>${p.start_date || 'N/A'}</td>
            <td>${p.end_date || 'N/A'}</td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${p.progress}%"></div>
                </div>
                <span style="font-size: 11px; color: var(--color-text-secondary)">${p.progress}%</span>
            </td>
        `;
        tbody.appendChild(row);
    });
}
