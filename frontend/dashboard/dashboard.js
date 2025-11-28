// admin/dashboard/dashboard.js
import { initializeCharts } from './dashboard-charts.js';
import { auth, db } from "../firebase.js";
import { 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { AdminLogger } from "./admin-logger.js";

// DOM elements
const adminNameElement = document.getElementById('adminName');
const adminEmailElement = document.getElementById('adminEmail');
const adminInitialsElement = document.getElementById('adminInitials');
const welcomeAdminNameElement = document.getElementById('welcomeAdminName');
const logoutBtn = document.getElementById('logoutBtn');
const viewPendingBtn = document.getElementById('viewPendingBtn');
const pendingCountElement = document.getElementById('pendingCount');

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
    if (adminData) {
        if (adminData.name) {
            adminNameElement.textContent = adminData.name;
            welcomeAdminNameElement.textContent = adminData.name;
        } else {
            const username = auth.currentUser.email.split('@')[0];
            adminNameElement.textContent = username;
            welcomeAdminNameElement.textContent = username;
        }
        
        if (adminData.email) {
            adminEmailElement.textContent = adminData.email;
        }
        
        if (adminData.name) {
            const initials = adminData.name.split(' ').map(n => n[0]).join('').toUpperCase();
            adminInitialsElement.textContent = initials;
        } else {
            const emailInitial = auth.currentUser.email[0].toUpperCase();
            adminInitialsElement.textContent = emailInitial;
        }
    }
}

// Get pending approvals count from Firestore
function setupPendingApprovalListener() {
    try {
        // Query for users with approval_status "pending"
        const pendingQuery = query(
            collection(db, "users"),
            where("approval_status", "==", "pending")
        );
        
        // Real-time listener for pending approvals
        onSnapshot(pendingQuery, (snapshot) => {
            const pendingCount = snapshot.size;
            
            // Update the counter
            if (pendingCountElement) {
                pendingCountElement.textContent = `${pendingCount} Student${pendingCount !== 1 ? 's' : ''}`;
            }
            
            // Update header pending count
            const headerPendingElement = document.getElementById('pendingApprovals');
            if (headerPendingElement) {
                headerPendingElement.textContent = `${pendingCount} Pending Approval${pendingCount !== 1 ? 's' : ''}`;
            }
            
            console.log(`Pending approvals: ${pendingCount}`);
        }, (error) => {
            console.error("Error listening to pending approvals:", error);
            if (pendingCountElement) {
                pendingCountElement.textContent = "Error loading";
            }
        });
    } catch (error) {
        console.error("Error setting up pending listener:", error);
        if (pendingCountElement) {
            pendingCountElement.textContent = "Error loading";
        }
    }
}

// Navigate to approvals page
function navigateToApprovals() {
    window.location.href = '../pendingApproval/approvals.html';
}

// Logout function
async function handleLogout() {
    try {
        await AdminLogger.logout();
        await signOut(auth);
        console.log("Admin logged out");
        
        sessionStorage.clear();
        window.location.href = "../login/admin-login.html";
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// Update current date
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        timeZone: 'Asia/Manila' 
    };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    const timeElement = document.getElementById('capacity-time').querySelector('time');
    if (timeElement) {
        timeElement.textContent = formattedDate;
        timeElement.setAttribute('datetime', now.toISOString());
    }
}

// Check authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Admin is logged in:", user.email);
        
        const adminData = await getAdminData();
        updateAdminUI(adminData);
        
        sessionStorage.setItem('adminData', JSON.stringify(adminData));
        sessionStorage.setItem('adminEmail', user.email);
        sessionStorage.setItem('adminUID', user.uid);
        
        // Setup pending approvals listener
        setupPendingApprovalListener();
        
        // Initialize charts
        initializeCharts();
        
    } else {
        console.log("No admin logged in, redirecting to login...");
        window.location.href = "../admin-login.html";
    }
});

// Event listeners
logoutBtn.addEventListener('click', handleLogout);
if (viewPendingBtn) {
    viewPendingBtn.addEventListener('click', navigateToApprovals);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentDate();
    console.log("Dashboard initialized");
    
    setInterval(updateCurrentDate, 60000);
});