import {
  auth,
  db,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  query,
  where,
  getDocs
} from "../firebase.js"; 

// DOM Elements
let form, emailInput, passwordInput, passwordToggle, statusEl, btnLoading, loginBtn, currentDate, rememberMe;

// Initialize date
function updateDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    if (currentDate) {
        currentDate.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Toggle password visibility
function setupPasswordToggle() {
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            passwordToggle.innerHTML = type === 'password' ? 
                '<i class="fas fa-eye"></i>' : 
                '<i class="fas fa-eye-slash"></i>';
        });
    }
}

// Set status message
function setStatus(msg, type = "error") {
    if (statusEl) {
        statusEl.textContent = msg;
        statusEl.className = `status-message ${type}`;
        statusEl.classList.add('show');
        
        // Auto hide success messages after redirect
        if (type === 'success') {
            setTimeout(() => {
                statusEl.classList.remove('show');
            }, 2000);
        }
        
        // Auto hide error messages after 5 seconds
        if (type === 'error') {
            setTimeout(() => {
                statusEl.classList.remove('show');
            }, 5000);
        }
    }
}

// Show loading state
function showLoading() {
    if (btnLoading && loginBtn) {
        btnLoading.classList.add('show');
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    }
}

// Hide loading state
function hideLoading() {
    if (btnLoading && loginBtn) {
        btnLoading.classList.remove('show');
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }
}

// Check if user is admin
async function checkIfAdmin(email) {
    try {
        // Check Admin collection
        const adminQuery = query(
            collection(db, "Admin"),
            where("email", "==", email)
        );
        const querySnapshot = await getDocs(adminQuery);
        
        return !querySnapshot.empty;
        
    } catch (error) {
        console.error("Error checking admin:", error);
        
        if (error.code === 'permission-denied') {
            setStatus("Permission denied. Please check database rules.", "error");
        } else {
            setStatus("Error checking admin privileges.", "error");
        }
        
        return false;
    }
}

// Setup form handler
function setupFormHandler() {
    if (form) {
        form.addEventListener("submit", handleLogin);
    }
}

// Login handler
async function handleLogin(e) {
    e.preventDefault();
    
    // Show loading state
    showLoading();
    setStatus("Verifying credentials...", "loading");
    
    const email = emailInput.value.trim();
    const pass = passwordInput.value;
    
    if (!email || !pass) {
        setStatus("Please fill in all fields", "error");
        hideLoading();
        return;
    }
    
    try {
        // First check if email exists in Admin collection
        const isAdmin = await checkIfAdmin(email);
        
        if (!isAdmin) {
            setStatus("Access denied: Not an admin account.", "error");
            hideLoading();
            return;
        }

        // Try to sign in
        await signInWithEmailAndPassword(auth, email, pass);
        
        setStatus("Login successful! Redirecting...", "success");
        
        // Save to localStorage if remember me is checked
        if (rememberMe && rememberMe.checked) {
            localStorage.setItem('adminEmail', email);
        } else {
            localStorage.removeItem('adminEmail');
        }
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = "../dashboard/dashboard.html";
        }, 1000);

    } catch (err) {
        console.error("Login error:", err);
        
        // Handle specific Firebase auth errors
        let errorMessage = "Login failed. Please try again.";
        
        switch (err.code) {
            case "auth/invalid-credential":
            case "auth/wrong-password":
                errorMessage = "Incorrect email or password.";
                break;
            case "auth/user-not-found":
                errorMessage = "Admin account not found.";
                break;
            case "auth/too-many-requests":
                errorMessage = "Too many attempts. Try again later.";
                break;
            case "auth/network-request-failed":
                errorMessage = "Network error. Check connection.";
                break;
            case "auth/user-disabled":
                errorMessage = "Account disabled. Contact administrator.";
                break;
            case "auth/invalid-email":
                errorMessage = "Invalid email format.";
                break;
        }
        
        setStatus(errorMessage, "error");
        hideLoading();
    }
}

// Auto redirect if already logged in as admin
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
        const isAdmin = await checkIfAdmin(user.email);
        if (isAdmin) {
            // Redirect to dashboard immediately
            window.location.href = "../dashboard/dashboard.html";
        } else {
            // If user is not admin, sign them out
            await signOut(auth);
        }
    } catch (error) {
        console.error("Auto-redirect error:", error);
    }
});

// Initialize all elements
function initializeElements() {
    form = document.getElementById("adminLoginForm");
    emailInput = document.getElementById("adminEmail");
    passwordInput = document.getElementById("adminPassword");
    passwordToggle = document.getElementById("passwordToggle");
    statusEl = document.getElementById("adminStatus");
    btnLoading = document.getElementById("btnLoading");
    loginBtn = document.getElementById("loginButton");
    currentDate = document.getElementById("currentDate");
    rememberMe = document.getElementById("rememberMe");
    
    // Check if elements exist
    if (!currentDate) {
        console.error("currentDate element not found!");
        return;
    }
    
    if (!form) {
        console.error("Login form not found!");
        return;
    }
}

// Initialize page
function initializePage() {
    // Initialize DOM elements
    initializeElements();
    
    // Update date
    updateDate();
    
    // Setup event handlers
    setupPasswordToggle();
    setupFormHandler();
    
    // Check for saved email
    const savedEmail = localStorage.getItem('adminEmail');
    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;
        if (rememberMe) {
            rememberMe.checked = true;
        }
    }
    
    // Auto-focus email input
    if (emailInput) {
        setTimeout(() => {
            emailInput.focus();
        }, 300);
    }
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}