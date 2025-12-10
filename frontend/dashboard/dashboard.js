// dashboard.js
import { initializeCharts } from './dashboard-charts.js';
import { 
    auth, 
    db 
} from "../firebase.js";
import { 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection,
    query,
    where,
    getDocs,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { AdminLogger } from "./admin-logger.js";

// DOM elements
const adminNameElement = document.getElementById('adminName');
const adminEmailElement = document.getElementById('adminEmail');
const adminInitialsElement = document.getElementById('adminInitials');
const adminNameNavElement = document.getElementById('adminNameNav');
const adminInitialsNavElement = document.getElementById('adminInitialsNav');
const welcomeAdminNameElement = document.getElementById('welcomeAdminName');
const logoutBtn = document.getElementById('logoutBtn');
const logoutBtnMobile = document.getElementById('logoutBtnMobile');
const currentDateElement = document.getElementById('currentDate');

// Navbar elements
const menuToggle = document.getElementById('menuToggle');
const closeMenu = document.getElementById('closeMenu');
const mobileMenu = document.getElementById('mobileMenu');
const mobileAdminNameElement = document.getElementById('mobileAdminName');
const mobileAdminEmailElement = document.getElementById('mobileAdminEmail');
const mobileAdminInitialsElement = document.getElementById('mobileAdminInitials');

// Get admin data from Firestore
async function getAdminData() {
    try {
        const adminQuery = query(
            collection(db, "Admin"),
            where("email", "==", auth.currentUser.email)
        );
        const querySnapshot = await getDocs(adminQuery);
        
        if (!querySnapshot.empty) {
            const adminDoc = querySnapshot.docs[0];
            const adminData = adminDoc.data();
            console.log("Admin data loaded:", adminData);
            
            // Log admin login
            await AdminLogger.login();
            
            return adminData;
        } else {
            console.log("No admin data found");
            return null;
        }
    } catch (error) {
        console.error("Error getting admin data:", error);
        return null;
    }
}

// Update UI with admin data
function updateAdminUI(adminData) {
    const adminName = adminData?.name || auth.currentUser.email.split('@')[0];
    const adminEmail = adminData?.email || auth.currentUser.email;
    
    // Update all admin name elements
    [adminNameElement, adminNameNavElement, mobileAdminNameElement].forEach(element => {
        if (element) element.textContent = adminName;
    });
    
    // Update welcome message
    if (welcomeAdminNameElement) {
        welcomeAdminNameElement.textContent = adminName;
    }
    
    // Update email elements
    [adminEmailElement, mobileAdminEmailElement].forEach(element => {
        if (element) element.textContent = adminEmail;
    });
    
    // Update initials
    const initials = adminData?.name 
        ? adminData.name.split(' ').map(n => n[0]).join('').toUpperCase()
        : auth.currentUser.email[0].toUpperCase();
    
    [adminInitialsElement, adminInitialsNavElement, mobileAdminInitialsElement].forEach(element => {
        if (element) element.textContent = initials;
    });
}

// Update current date
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Asia/Manila' 
    };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    if (currentDateElement) {
        currentDateElement.textContent = formattedDate;
    }
}

// Setup real-time pending approvals listener
function setupPendingApprovalListener() {
    try {
        // Query for users with approval_status "pending"
        const pendingQuery = query(
            collection(db, "users"),
            where("approval_status", "==", "pending")
        );
        
        // Real-time listener for pending approvals
        const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
            const pendingCount = snapshot.size;
            
            // Update mobile menu pending count
            const pendingCountMobileElement = document.getElementById('pendingCountMobile');
            if (pendingCountMobileElement) {
                pendingCountMobileElement.textContent = pendingCount;
            }
            
            console.log(`Pending approvals: ${pendingCount}`);
            
            // Auto-refresh stats when pending count changes
            if (window.refreshStats) {
                window.refreshStats();
            }
            
        }, (error) => {
            console.error("Error listening to pending approvals:", error);
        });
        
        return unsubscribe;
        
    } catch (error) {
        console.error("Error setting up pending listener:", error);
        return () => {};
    }
}
// Navbar menu toggle
function setupNavbarMenu() {
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeMenu) {
        closeMenu.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close menu when clicking outside
    mobileMenu.addEventListener('click', (e) => {
        if (e.target === mobileMenu) {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // Close menu with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}


async function handleLogout() {
    try {
        await AdminLogger.logout();
        await signOut(auth);
        console.log("Admin logged out");
        
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "../login/admin-login.html";
    } catch (error) {
        console.error("Logout error:", error);
        alert("Logout failed. Please try again.");
    }
}

// Check authentication state
let unsubscribePending;
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Admin is logged in:", user.email);
        
        const adminData = await getAdminData();
        updateAdminUI(adminData);
        
        // Store admin data
        sessionStorage.setItem('adminData', JSON.stringify(adminData));
        sessionStorage.setItem('adminEmail', user.email);
        sessionStorage.setItem('adminUID', user.uid);
        
        // Update current date
        updateCurrentDate();
        
        // Setup pending approvals listener
        if (unsubscribePending) {
            unsubscribePending();
        }
        unsubscribePending = setupPendingApprovalListener();
        
        // Initialize charts
        initializeCharts();
        
    } else {
        console.log("No admin logged in, redirecting to login...");
        if (unsubscribePending) {
            unsubscribePending();
        }
        window.location.href = "../login/admin-login.html";
    }
});

// Event listeners
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

if (logoutBtnMobile) {
    logoutBtnMobile.addEventListener('click', handleLogout);
}

// Setup navbar menu
setupNavbarMenu();

// Initialize dashboard - SINGLE DOMContentLoaded EVENT LISTENER
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard initialized");
    
    // Update date every minute
    setInterval(updateCurrentDate, 60000);
    
    // Make refreshStats globally accessible for real-time updates
    window.refreshStats = async function() {
        try {
            console.log("Refreshing stats via real-time update...");
        } catch (error) {
            console.error("Error refreshing stats:", error);
        }
    };
    
    // Add animation styles for export feature
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribePending) {
        unsubscribePending();
    }
});