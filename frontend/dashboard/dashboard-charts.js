import { auth, db } from "../firebase.js";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Chart instances
let activityChart, courseChart, registrationChart;
let currentTimeframe = 'week';

// Initialize all charts
export async function initializeCharts() {
    try {
        await loadDashboardData();
        setupTimeframeSelector();
        setupRefreshButton();
        hideLoadingOverlay();
    } catch (error) {
        console.error("Error initializing charts:", error);
        hideLoadingOverlay();
    }
}

// Load all dashboard data
async function loadDashboardData() {
    await Promise.all([
        loadQuickStats(),
        loadActivityChart(),
        loadCourseChart(),
        loadRegistrationChart(),
        loadRecentActivity()
    ]);
}

// Quick Stats - FIXED to match your Firestore structure
async function loadQuickStats() {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        
        // Query using approval_status field (matches your Firestore)
        const pendingSnapshot = await getDocs(
            query(collection(db, "users"), where("approval_status", "==", "pending"))
        );
        const approvedSnapshot = await getDocs(
            query(collection(db, "users"), where("approval_status", "==", "approved"))
        );
        
        // Today's date for active users
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);
        
        // Query parking activity if you have this collection
        let activeTodayCount = 0;
        try {
            const activeTodaySnapshot = await getDocs(
                query(collection(db, "ParkingHistory"), 
                where("timestamp", ">=", todayTimestamp))
            );
            activeTodayCount = activeTodaySnapshot.size;
        } catch (error) {
            console.log("ParkingHistory collection not found or empty");
        }

        // Update header stats (these exist in your HTML)
        const totalUsersElement = document.getElementById('totalUsers');
        const pendingApprovalsElement = document.getElementById('pendingApprovals');
        
        if (totalUsersElement) {
            totalUsersElement.textContent = `${usersSnapshot.size} Total Users`;
        }
        if (pendingApprovalsElement) {
            pendingApprovalsElement.textContent = `${pendingSnapshot.size} Pending`;
        }

        console.log(`✅ Stats loaded: ${usersSnapshot.size} total, ${pendingSnapshot.size} pending, ${approvedSnapshot.size} approved`);

    } catch (error) {
        console.error("Error loading quick stats:", error);
    }
}

// Activity Chart (Parking Entries)
async function loadActivityChart() {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        let snapshot;
        try {
            const activityQuery = query(
                collection(db, "ParkingHistory"),
                where("timestamp", ">=", Timestamp.fromDate(oneWeekAgo)),
                orderBy("timestamp", "asc")
            );
            snapshot = await getDocs(activityQuery);
        } catch (error) {
            console.log("ParkingHistory collection not found, using empty data");
            snapshot = { docs: [] };
        }
        
        const activityByDay = {};
        
        // Group by day
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.timestamp) {
                const date = data.timestamp.toDate().toDateString();
                activityByDay[date] = (activityByDay[date] || 0) + 1;
            }
        });
        
        // Prepare chart data
        const labels = [];
        const data = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            data.push(activityByDay[dateString] || 0);
        }
        
        // Update stats
        const weeklyTotal = data.reduce((sum, value) => sum + value, 0);
        const weeklyActivityElement = document.getElementById('weeklyActivity');
        if (weeklyActivityElement) {
            weeklyActivityElement.textContent = `${weeklyTotal} entries`;
        }
        
        // Create or update chart
        const ctx = document.getElementById('activityChart');
        if (!ctx) {
            console.error("activityChart canvas not found");
            return;
        }
        
        if (activityChart) {
            activityChart.destroy();
        }
        
        activityChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Parking Entries',
                    data: data,
                    borderColor: '#1f8012',
                    backgroundColor: 'rgba(31, 128, 18, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error("Error loading activity chart:", error);
    }
}

// Course Distribution Chart
async function loadCourseChart() {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const courseCount = {};
        
        usersSnapshot.docs.forEach(doc => {
            const userData = doc.data();
            // Check multiple possible field names for course
            const course = userData.course || userData.program || userData.dept || 'Unknown';
            courseCount[course] = (courseCount[course] || 0) + 1;
        });
        
        const labels = Object.keys(courseCount);
        const data = Object.values(courseCount);
        
        // Update stats
        const totalCoursesElement = document.getElementById('totalCourses');
        if (totalCoursesElement) {
            totalCoursesElement.textContent = `${labels.length} courses`;
        }
        
        const ctx = document.getElementById('courseChart');
        if (!ctx) {
            console.error("courseChart canvas not found");
            return;
        }
        
        if (courseChart) {
            courseChart.destroy();
        }
        
        // Color palette for courses
        const backgroundColors = [
            '#1f8012', '#8f7d35', '#27630f', '#53700f', 
            '#a8c435', '#4caf50', '#8bc34a', '#cddc39'
        ];
        
        courseChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error("Error loading course chart:", error);
    }
}

// Registration Trends Chart
async function loadRegistrationChart() {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const monthlyRegistrations = {};
        
        usersSnapshot.docs.forEach(doc => {
            const userData = doc.data();
            let date;
            
            // Check different timestamp field names
            if (userData.created_at) {
                date = userData.created_at.toDate();
            } else if (userData.createdAt) {
                date = userData.createdAt.toDate();
            } else if (userData.timestamp) {
                date = userData.timestamp.toDate();
            } else {
                // Fallback to current date
                date = new Date();
            }
            
            const monthYear = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short' 
            });
            monthlyRegistrations[monthYear] = (monthlyRegistrations[monthYear] || 0) + 1;
        });
        
        // Get last 6 months
        const labels = [];
        const data = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthYear = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short' 
            });
            labels.push(monthYear);
            data.push(monthlyRegistrations[monthYear] || 0);
        }
        
        // Update stats
        const monthlyTotal = data[data.length - 1] || 0;
        const monthlyRegistrationsElement = document.getElementById('monthlyRegistrations');
        if (monthlyRegistrationsElement) {
            monthlyRegistrationsElement.textContent = `${monthlyTotal} new users`;
        }
        
        const ctx = document.getElementById('registrationChart');
        if (!ctx) {
            console.error("registrationChart canvas not found");
            return;
        }
        
        if (registrationChart) {
            registrationChart.destroy();
        }
        
        registrationChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'New Registrations',
                    data: data,
                    backgroundColor: 'rgba(31, 128, 18, 0.7)',
                    borderColor: '#1f8012',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error("Error loading registration chart:", error);
    }
}

// Recent Activity Table
async function loadRecentActivity() {
    try {
        const activityQuery = query(
            collection(db, "admin_logs"),
            orderBy("timestamp", "desc"),
            limit(10)
        );
        
        const snapshot = await getDocs(activityQuery);
        const tbody = document.getElementById('activityTableBody');
        
        if (!tbody) {
            console.error("activityTableBody not found");
            return;
        }
        
        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #666;">
                        No recent activity found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const time = data.timestamp ? 
                data.timestamp.toDate().toLocaleString() : 
                'Recent';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.adminEmail || 'System'}</td>
                <td>${data.message || data.action}</td>
                <td><time datetime="${time}">${time}</time></td>
                <td><span class="status-badge status-approved">${data.action}</span></td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error("Error loading recent activity:", error);
        const tbody = document.getElementById('activityTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                        Unable to load activity logs
                    </td>
                </tr>
            `;
        }
    }
}

// Timeframe Selector
function setupTimeframeSelector() {
    const button = document.getElementById('timeframeButton');
    const options = document.querySelectorAll('.timeframe-selector__options li');
    
    if (!button || options.length === 0) {
        console.warn("Timeframe selector elements not found");
        return;
    }
    
    options.forEach(option => {
        option.addEventListener('click', async () => {
            const timeframe = option.getAttribute('data-timeframe');
            currentTimeframe = timeframe;
            button.textContent = option.textContent;
            
            // Update active state
            options.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            // Reload charts with new timeframe
            await loadActivityChart();
        });
    });
}

// Refresh Button
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshActivity');
    
    if (!refreshBtn) {
        console.warn("Refresh button not found");
        return;
    }
    
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.style.animation = 'spin 1s linear';
        await loadRecentActivity();
        setTimeout(() => {
            refreshBtn.style.animation = '';
        }, 1000);
    });
}

// Loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}