// dashboard-charts.js
import { 
    auth, 
    db, 
    getUserStats, 
    getYearLevelDistribution, 
    getRecentActivity, 
    getParkingAnalytics 
} from "../firebase.js";

// Chart instances
let parkingEntryChart, yearLevelChart, verifiedChart, approvedChart, totalChart;
let currentParkingTimeframe = 'day';
let activityPage = 1;
let activityLimit = 10;

// Initialize all charts
export async function initializeCharts() {
    try {
        console.log("📊 Initializing admin dashboard charts...");
        
        // Check if admin is logged in
        if (!auth.currentUser) {
            console.error("No admin user logged in");
            window.location.href = "../login/index.html";
            return;
        }

        showLoadingOverlay();
        
        await Promise.all([
            loadAllStats(),
            loadParkingEntryChart(),
            loadYearLevelChart(),
            loadSmallCharts(),
            loadRecentActivity()
        ]);
        
        setupTimeframeTabs();
        setupRefreshButtons();
        setupEventListeners();
        hideLoadingOverlay();
        
        console.log("✅ All charts initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing charts:", error);
        hideLoadingOverlay();
        showErrorMessage("Failed to load dashboard data. Please refresh.");
    }
}

// Load all stats from database
async function loadAllStats() {
    try {
        console.log("📈 Loading all stats from database...");
        
        const stats = await getUserStats();
        
        // Update main stats
        document.getElementById('totalStudents').textContent = stats.total;
        document.getElementById('verifiedAccounts').textContent = stats.verified;
        document.getElementById('pendingApprovals').textContent = stats.pending;
        document.getElementById('approvedAccounts').textContent = stats.approved;
        
        // Update navbar stats
        const totalStudentsNav = document.getElementById('totalStudentsNav');
        const pendingApprovalsNav = document.getElementById('pendingApprovalsNav');
        if (totalStudentsNav) totalStudentsNav.textContent = stats.total;
        if (pendingApprovalsNav) pendingApprovalsNav.textContent = stats.pending;
        
        // Update mobile pending count
        const pendingCountMobile = document.getElementById('pendingCountMobile');
        if (pendingCountMobile) pendingCountMobile.textContent = stats.pending;
        
        console.log(`✅ Stats loaded: Total=${stats.total}, Verified=${stats.verified}, Pending=${stats.pending}, Approved=${stats.approved}`);
        
        return stats;
        
    } catch (error) {
        console.error("❌ Error loading stats:", error);
        return {
            total: 0,
            verified: 0,
            pending: 0,
            approved: 0
        };
    }
}

// Load small charts for stats cards
async function loadSmallCharts() {
    try {
        console.log("📊 Loading small charts...");
        
        const stats = await getUserStats();
        
        // Total Students Trend Chart (mini line chart)
        const totalCtx = document.getElementById('totalChart');
        if (totalCtx && totalChart) {
            totalChart.destroy();
        }
        
        if (totalCtx) {
            totalChart = new Chart(totalCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        data: [50, 75, 85, 90, 120, stats.total],
                        borderColor: '#1f8012',
                        backgroundColor: 'rgba(31, 128, 18, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    elements: {
                        line: {
                            borderWidth: 2
                        }
                    }
                }
            });
        }
        
        // Verified Accounts Chart (mini donut)
        const verifiedCtx = document.getElementById('verifiedChart');
        if (verifiedCtx && verifiedChart) {
            verifiedChart.destroy();
        }
        
        if (verifiedCtx) {
            const verifiedPercentage = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;
            verifiedChart = new Chart(verifiedCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [verifiedPercentage, 100 - verifiedPercentage],
                        backgroundColor: ['#2196f3', '#f5f5f5'],
                        borderWidth: 0,
                        cutout: '70%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    rotation: -90,
                    circumference: 180
                }
            });
        }
        
        // Approved Accounts Chart (mini donut)
        const approvedCtx = document.getElementById('approvedChart');
        if (approvedCtx && approvedChart) {
            approvedChart.destroy();
        }
        
        if (approvedCtx) {
            const approvedPercentage = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
            approvedChart = new Chart(approvedCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [approvedPercentage, 100 - approvedPercentage],
                        backgroundColor: ['#4caf50', '#f5f5f5'],
                        borderWidth: 0,
                        cutout: '70%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    rotation: -90,
                    circumference: 180
                }
            });
        }
        
    } catch (error) {
        console.error("❌ Error loading small charts:", error);
    }
}

// 1. PARKING ENTRY ANALYTICS CHART (Connected to database)
async function loadParkingEntryChart() {
    try {
        console.log("📊 Loading parking entry chart from database...");
        
        // Get parking analytics from database
        const { labels, data, summary } = await getParkingAnalytics(currentParkingTimeframe);
        
        // Update stats in chart footer
        if (data.length > 0) {
            const todayEntries = document.getElementById('todayEntries');
            const weekEntries = document.getElementById('weekEntries');
            
            if (todayEntries && currentParkingTimeframe === 'day') {
                todayEntries.textContent = data[data.length - 1] || 0;
            }
            if (weekEntries && currentParkingTimeframe === 'week') {
                const weekTotal = data.reduce((sum, val) => sum + val, 0);
                weekEntries.textContent = weekTotal;
            }
        }
        
        // Create or update chart
        const ctx = document.getElementById('parkingEntryChart');
        if (!ctx) {
            console.error("parkingEntryChart canvas not found");
            return;
        }
        
        if (parkingEntryChart) {
            parkingEntryChart.destroy();
        }
        
        const chartType = currentParkingTimeframe === 'month' ? 'line' : 'bar';
        const colors = {
            bar: 'rgba(31, 128, 18, 0.8)',
            line: 'rgba(31, 128, 18, 0.2)',
            border: '#1f8012'
        };
        
        parkingEntryChart = new Chart(ctx.getContext('2d'), {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Parking Entries',
                    data: data,
                    backgroundColor: chartType === 'bar' ? colors.bar : colors.line,
                    borderColor: colors.border,
                    borderWidth: chartType === 'line' ? 3 : 1,
                    fill: chartType === 'line',
                    tension: 0.4,
                    pointBackgroundColor: colors.border,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Entries',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: getXAxisLabel(currentParkingTimeframe),
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error("❌ Error loading parking entry chart:", error);
        // Fallback to empty chart
        const ctx = document.getElementById('parkingEntryChart');
        if (ctx) {
            parkingEntryChart = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [0],
                        backgroundColor: 'rgba(200, 200, 200, 0.5)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    }
}

function getXAxisLabel(timeframe) {
    switch(timeframe) {
        case 'day': return 'Day';
        case 'week': return 'Week';
        case 'month': return 'Month';
        default: return 'Time Period';
    }
}

// 2. YEAR LEVEL DISTRIBUTION CHART (Connected to database)
async function loadYearLevelChart() {
    try {
        console.log("📊 Loading year level chart from database...");
        
        const yearLevels = await getYearLevelDistribution();
        
        // Update stats
        const yearLevelStatsElement = document.getElementById('yearLevelStats');
        if (yearLevelStatsElement) {
            const total = Object.values(yearLevels).reduce((a, b) => a + b, 0);
            yearLevelStatsElement.textContent = `Total: ${total}`;
        }
        
        const ctx = document.getElementById('yearLevelChart');
        if (!ctx) {
            console.error("yearLevelChart canvas not found");
            return;
        }
        
        if (yearLevelChart) {
            yearLevelChart.destroy();
        }
        
        // Prepare data
        const labels = Object.keys(yearLevels);
        const data = Object.values(yearLevels);
        const colors = ['#1f8012', '#4caf50', '#8bc34a', '#cddc39', '#9e9e9e'];
        
        yearLevelChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Students',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(color => darkenColor(color, 20)),
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Students',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year Level',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error("❌ Error loading year level chart:", error);
    }
}

// Helper function to darken color
function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
}

// Recent Activity Table (Connected to database)
async function loadRecentActivity() {
    try {
        console.log("📝 Loading recent activity from database...");
        
        const tbody = document.getElementById('activityTableBody');
        if (!tbody) {
            console.error("activityTableBody not found");
            return;
        }
        
        // Show loading state
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="5">
                    <div class="loading-spinner-small"></div>
                    <span>Loading activities...</span>
                </td>
            </tr>
        `;
        
        // Get recent activity from database
        const activities = await getRecentActivity(activityLimit * activityPage);
        
        if (activities.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-inbox" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        <p>No recent activity found</p>
                    </td>
                </tr>
            `;
            updateActivityCount(0, 0);
            return;
        }
        
        // Filter activities for current page
        const startIndex = (activityPage - 1) * activityLimit;
        const endIndex = startIndex + activityLimit;
        const pageActivities = activities.slice(startIndex, endIndex);
        
        tbody.innerHTML = '';
        
        pageActivities.forEach((activity, index) => {
            const data = activity;
            const time = data.created_at ? 
                data.created_at.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                'Recent';
            
            const date = data.created_at ? 
                data.created_at.toDate().toLocaleDateString() : 
                'Today';
            
            // Determine status and activity type
            let statusClass = 'status-pending';
            let statusText = 'New';
            let activityType = 'Registration';
            
            if (data.approval_status === 'approved') {
                statusClass = 'status-approved';
                statusText = 'Approved';
                activityType = 'Account Approved';
            } else if (data.approval_status === 'rejected') {
                statusClass = 'status-rejected';
                statusText = 'Rejected';
                activityType = 'Account Rejected';
            }
            
            // Determine if account is verified
            if (data.is_verified || data.email_verified) {
                activityType = 'Account Verified';
            }
            
            const row = document.createElement('tr');
            row.style.animationDelay = `${index * 0.1}s`;
            row.innerHTML = `
                <td>
                    <div class="user-info">
                        <div class="user-avatar-small">
                            ${data.email ? data.email[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                            <div class="user-name">${data.first_name || data.username || 'New Student'}</div>
                            <div class="user-email">${data.email || 'No email'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="activity-type">${activityType}</span>
                </td>
                <td><time datetime="${time}">${date} ${time}</time></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn view-btn" data-id="${activity.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Update pagination info
        updateActivityCount(pageActivities.length, activities.length);
        updatePaginationControls(activities.length);
        
        // Add event listeners to action buttons
        addActionButtonListeners();
        
    } catch (error) {
        console.error("❌ Error loading recent activity:", error);
        const tbody = document.getElementById('activityTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p style="margin-top: 10px;">Unable to load activity data</p>
                    </td>
                </tr>
            `;
        }
        updateActivityCount(0, 0);
    }
}

function updateActivityCount(current, total) {
    const activityCount = document.getElementById('activityCount');
    const totalActivities = document.getElementById('totalActivities');
    if (activityCount) activityCount.textContent = current;
    if (totalActivities) totalActivities.textContent = total;
}

function updatePaginationControls(total) {
    const totalPages = Math.ceil(total / activityLimit);
    const currentPageElement = document.getElementById('currentPage');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    
    if (currentPageElement) currentPageElement.textContent = activityPage;
    if (prevButton) prevButton.disabled = activityPage <= 1;
    if (nextButton) nextButton.disabled = activityPage >= totalPages;
}

function addActionButtonListeners() {
    // View buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.dataset.id;
            console.log('View user activity:', userId);
            // Navigate to user details page
            window.location.href = `../account-management/user-details.html?id=${userId}`;
        });
    });
}

// Setup timeframe tabs
function setupTimeframeTabs() {
    const timeframeBtns = document.querySelectorAll('.timeframe-btn');
    
    timeframeBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            // Remove active class from all buttons
            timeframeBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Update timeframe and reload chart
            currentParkingTimeframe = btn.getAttribute('data-timeframe');
            await loadParkingEntryChart();
        });
    });
}

// Setup refresh buttons
function setupRefreshButtons() {
    // Dashboard refresh
    const refreshDashboard = document.getElementById('refreshDashboard');
    if (refreshDashboard) {
        refreshDashboard.addEventListener('click', async () => {
            refreshDashboard.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshDashboard.disabled = true;
            
            try {
                await Promise.all([
                    loadAllStats(),
                    loadParkingEntryChart(),
                    loadYearLevelChart(),
                    loadSmallCharts(),
                    loadRecentActivity()
                ]);
            } catch (error) {
                console.error('Error refreshing dashboard:', error);
                showErrorMessage('Failed to refresh data. Please try again.');
            }
            
            setTimeout(() => {
                refreshDashboard.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshDashboard.disabled = false;
            }, 1000);
        });
    }
    
    // Activity refresh
    const refreshActivity = document.getElementById('refreshActivity');
    if (refreshActivity) {
        refreshActivity.addEventListener('click', async () => {
            refreshActivity.style.transform = 'rotate(180deg)';
            await loadRecentActivity();
            
            setTimeout(() => {
                refreshActivity.style.transform = '';
            }, 500);
        });
    }
    
    // Export data button
    const exportData = document.getElementById('exportData');
    if (exportData) {
        exportData.addEventListener('click', async () => {
            try {
                exportData.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
                exportData.disabled = true;
                
                // Get all data for export
                const [stats, yearLevels, activities] = await Promise.all([
                    getUserStats(),
                    getYearLevelDistribution(),
                    getRecentActivity(1000) // Get up to 1000 activities
                ]);
                
                // Create CSV data
                const csvData = createExportCSV(stats, yearLevels, activities);
                downloadCSV(csvData, `parkqueue-data-${new Date().toISOString().split('T')[0]}.csv`);
                
                setTimeout(() => {
                    exportData.innerHTML = '<i class="fas fa-download"></i> Export Data';
                    exportData.disabled = false;
                }, 2000);
                
            } catch (error) {
                console.error('Error exporting data:', error);
                showErrorMessage('Failed to export data. Please try again.');
                exportData.innerHTML = '<i class="fas fa-download"></i> Export Data';
                exportData.disabled = false;
            }
        });
    }
    
    // View pending button
    const viewPendingBtn = document.getElementById('viewPendingBtn');
    if (viewPendingBtn) {
        viewPendingBtn.addEventListener('click', () => {
            window.location.href = '../pendingApproval/approvals.html';
        });
    }
    
    // Pagination buttons
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (activityPage > 1) {
                activityPage--;
                loadRecentActivity();
            }
        });
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            activityPage++;
            loadRecentActivity();
        });
    }
    
    // Search filter
    const activitySearch = document.getElementById('activitySearch');
    if (activitySearch) {
        let searchTimeout;
        activitySearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                console.log('Searching for:', e.target.value);
                // Implement search functionality
            }, 300);
        });
    }
    
    // Activity filter
    const activityFilter = document.getElementById('activityFilter');
    if (activityFilter) {
        activityFilter.addEventListener('change', (e) => {
            console.log('Filtering by:', e.target.value);
            // Implement filter functionality
        });
    }
}

function createExportCSV(stats, yearLevels, activities) {
    let csv = 'ParkQueue Data Export\n\n';
    
    // Summary stats
    csv += 'SUMMARY STATISTICS\n';
    csv += 'Metric,Value\n';
    csv += `Total Students,${stats.total}\n`;
    csv += `Verified Accounts,${stats.verified}\n`;
    csv += `Pending Approvals,${stats.pending}\n`;
    csv += `Approved Accounts,${stats.approved}\n\n`;
    
    // Year level distribution
    csv += 'YEAR LEVEL DISTRIBUTION\n';
    csv += 'Year Level,Count\n';
    Object.entries(yearLevels).forEach(([level, count]) => {
        csv += `${level},${count}\n`;
    });
    csv += '\n';
    
    // Recent activities
    csv += 'RECENT ACTIVITIES\n';
    csv += 'Date,Time,User,Email,Activity,Status\n';
    activities.forEach(activity => {
        const date = activity.created_at ? 
            activity.created_at.toDate().toLocaleDateString() : 
            'N/A';
        const time = activity.created_at ? 
            activity.created_at.toDate().toLocaleTimeString() : 
            'N/A';
        const user = activity.first_name || activity.username || 'N/A';
        const email = activity.email || 'N/A';
        const status = activity.approval_status || 'pending';
        
        csv += `${date},${time},"${user}","${email}",Registration,${status}\n`;
    });
    
    return csv;
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Setup event listeners
function setupEventListeners() {
    // Profile dropdown toggle
    const profileToggle = document.getElementById('profileToggle');
    const profileDropdown = document.querySelector('.profile-dropdown-menu');
    
    if (profileToggle && profileDropdown) {
        profileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            profileDropdown.classList.remove('show');
        });
        
        // Prevent dropdown from closing when clicking inside
        profileDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// Loading overlay
function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Show error message
function showErrorMessage(message) {
    const header = document.querySelector('.dashboard__header');
    if (header && !document.getElementById('errorMessage')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 15px 25px;
            border-radius: 10px;
            border: 1px solid #f5c6cb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            max-width: 400px;
        `;
        
        errorDiv.innerHTML = `
            <span><i class="fas fa-exclamation-circle"></i> ${message}</span>
            <button onclick="this.parentElement.remove()" 
                    style="background:none; border:none; color:#721c24; cursor:pointer; font-size:20px; padding:0 10px;">
                ×
            </button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

// Add additional styles for activity table
const style = document.createElement('style');
style.textContent = `
    .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .user-avatar-small {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1f8012 0%, #8f7d35 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
    }
    
    .user-name {
        font-weight: 600;
        color: #333;
        margin-bottom: 2px;
        font-size: 0.9rem;
    }
    
    .user-email {
        font-size: 0.8rem;
        color: #666;
    }
    
    .activity-type {
        background: #e3f2fd;
        color: #1565c0;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
        white-space: nowrap;
    }
    
    .action-btn {
        background: transparent;
        border: 1px solid #ddd;
        border-radius: 6px;
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #666;
    }
    
    .view-btn:hover {
        background: #e3f2fd;
        border-color: #2196f3;
        color: #2196f3;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .activity-table tbody tr {
        animation: fadeIn 0.3s ease forwards;
        opacity: 0;
    }
`;
document.head.appendChild(style);

export async function exportDashboard(format) {
    try {
        if (format === 'pdf') {
            await exportToPDF();
        } else if (format === 'excel') {
            await exportToExcel();
        } else if (format === 'csv') {
            exportToCSV();
        }
    } catch (error) {
        console.error('Export error:', error);
        showErrorMessage('Export failed. Please try again.');
    }
}

async function exportToPDF() {
    showExportProcessing('Generating PDF report...');
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'pt', 'a4');
        
        const sections = [
            '.stats-row',
            '.dashboard-card--parking',
            '.dashboard-card--year-level',
            '.dashboard-card--activity'
        ];
        
        let yOffset = 40;
        
        for (let i = 0; i < sections.length; i++) {
            updateProgress((i + 1) * 25);
            
            const element = document.querySelector(sections[i]);
            if (!element) continue;
            
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 750;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            if (yOffset + imgHeight > pdf.internal.pageSize.height - 40) {
                pdf.addPage();
                yOffset = 40;
            }
            
            pdf.addImage(imgData, 'PNG', 40, yOffset, imgWidth, imgHeight);
            yOffset += imgHeight + 20;
        }
        
        pdf.setProperties({
            title: 'ParkQueue Dashboard Report',
            subject: 'Dashboard Analytics',
            author: 'ParkQueue Admin',
            creator: 'ParkQueue System'
        });
        
        pdf.save(`parkqueue-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
        
    } catch (error) {
        console.error('PDF export error:', error);
        throw error;
    } finally {
        hideExportProcessing();
    }
}

async function exportToExcel() {
    showExportProcessing('Generating Excel report with charts...');
    
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ParkQueue System';
        workbook.created = new Date();
        
        const stats = await getUserStats();
        const yearLevels = await getYearLevelDistribution();
        const activities = await getRecentActivity(100);
        
        updateProgress(25);
        
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 25 },
            { header: 'Value', key: 'value', width: 15 }
        ];
        
        summarySheet.addRow({ metric: 'Total Students', value: stats.total });
        summarySheet.addRow({ metric: 'Verified Accounts', value: stats.verified });
        summarySheet.addRow({ metric: 'Pending Approvals', value: stats.pending });
        summarySheet.addRow({ metric: 'Approved Accounts', value: stats.approved });
        
        updateProgress(35);
        
        const yearSheet = workbook.addWorksheet('Year Level Distribution');
        yearSheet.columns = [
            { header: 'Year Level', key: 'level', width: 15 },
            { header: 'Count', key: 'count', width: 15 }
        ];
        
        Object.entries(yearLevels).forEach(([level, count]) => {
            yearSheet.addRow({ level, count });
        });
        
        updateProgress(45);
        
        const activitySheet = workbook.addWorksheet('Recent Activity');
        activitySheet.columns = [
            { header: 'User', key: 'user', width: 20 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Activity', key: 'activity', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Time', key: 'time', width: 12 },
            { header: 'Status', key: 'status', width: 15 }
        ];
        
        activities.forEach(activity => {
            const date = activity.created_at ? 
                activity.created_at.toDate().toLocaleDateString() : 'N/A';
            const time = activity.created_at ? 
                activity.created_at.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';
            
            activitySheet.addRow({
                user: activity.first_name || activity.username || 'N/A',
                email: activity.email || 'N/A',
                activity: 'Registration',
                date: date,
                time: time,
                status: activity.approval_status || 'pending'
            });
        });
        
        updateProgress(60);
        
        const chartsSheet = workbook.addWorksheet('Charts');
        
        const charts = [
            { element: '#parkingEntryChart', name: 'Parking Analytics' },
            { element: '#yearLevelChart', name: 'Year Level Distribution' }
        ];
        
        for (let i = 0; i < charts.length; i++) {
            const canvas = document.querySelector(charts[i].element);
            if (canvas) {
                const imageId = workbook.addImage({
                    base64: canvas.toDataURL('image/png'),
                    extension: 'png',
                });
                
                const row = (i * 15) + 1;
                chartsSheet.addImage(imageId, `A${row}:I${row + 12}`);
                chartsSheet.getCell(`A${row}`).value = charts[i].name;
                chartsSheet.getCell(`A${row}`).font = { bold: true, size: 14 };
            }
            updateProgress(60 + (i + 1) * 15);
        }
        
        updateProgress(95);
        
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        saveAs(blob, `parkqueue-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`);
        
    } catch (error) {
        console.error('Excel export error:', error);
        throw error;
    } finally {
        hideExportProcessing();
    }
}

function exportToCSV() {
    const exportData = document.getElementById('exportData');
    if (exportData) {
        exportData.click();
    }
}

function showExportProcessing(message) {
    const overlay = document.createElement('div');
    overlay.className = 'export-processing';
    overlay.innerHTML = `
        <div class="export-processing-content">
            <i class="fas fa-file-export"></i>
            <h3>Exporting Report</h3>
            <p>${message}</p>
            <div class="progress-bar">
                <div class="progress-fill" id="exportProgress"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

function hideExportProcessing() {
    const overlay = document.querySelector('.export-processing');
    if (overlay) {
        overlay.remove();
    }
    document.body.style.overflow = '';
}

function updateProgress(percent) {
    const progressBar = document.getElementById('exportProgress');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

function showExportSuccess(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'export-success';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    messageDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.getElementById('exportBtn');
    const exportOptions = document.querySelectorAll('.export-option');
    
    if (exportBtn && exportOptions.length > 0) {
        exportOptions.forEach(option => {
            option.addEventListener('click', function() {
                const format = this.getAttribute('data-type');
                exportDashboard(format);
                
                if (format === 'pdf') {
                    setTimeout(() => {
                        showExportSuccess('PDF report downloaded successfully!');
                    }, 1000);
                } else if (format === 'excel') {
                    setTimeout(() => {
                        showExportSuccess('Excel report downloaded successfully!');
                    }, 1500);
                }
            });
        });
        
        if (window.innerWidth <= 768) {
            exportBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelector('.export-dropdown').classList.toggle('active');
            });
            
            document.addEventListener('click', function() {
                document.querySelector('.export-dropdown').classList.remove('active');
            });
        }
    }
});