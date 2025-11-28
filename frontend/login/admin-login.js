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
} from "../firebase.js"; // Changed from '../firebase.js' to './admin-firebase.js'

const form = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const statusEl = document.getElementById("adminStatus");

function setStatus(msg, type = "error") {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
}

async function checkIfAdmin(email) {
  try {
    // Try Admin collection (capital A)
    const adminQuery = query(
      collection(db, "Admin"),
      where("email", "==", email)
    );
    const querySnapshot = await getDocs(adminQuery);
    
    return !querySnapshot.empty;
    
  } catch (error) {
    console.error("Error checking admin:", error);
    
    if (error.code === 'permission-denied') {
      setStatus("Permission denied. Please check Firestore rules.", "error");
    } else {
      setStatus("Error checking admin privileges.", "error");
    }
    
    return false;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("Signing in...", "loading");

  const email = emailInput.value.trim();
  const pass = passwordInput.value;

  try {
    // First check if email exists in Admin collection
    const isAdmin = await checkIfAdmin(email);
    
    if (!isAdmin) {
      return setStatus("Access denied: Not an admin account.", "error");
    }

    // If email is in Admin collection, try to sign in
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    
    setStatus("Login successful! Redirecting...", "success");
    setTimeout(() => {
      location.href = "../dashboard/dashboard.html";
    }, 1000);

  } catch (err) {
    console.error("Login error:", err);
    if (err.code === "auth/invalid-credential") {
      setStatus("Incorrect email or password.", "error");
    } else if (err.code === "auth/user-not-found") {
      setStatus("No account found with this email.", "error");
    } else if (err.code === "auth/too-many-requests") {
      setStatus("Too many failed attempts. Try again later.", "error");
    } else {
      setStatus("Login failed: " + err.message, "error");
    }
  }
});

// Auto redirect if already logged in as admin
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const isAdmin = await checkIfAdmin(user.email);
    if (isAdmin) {
      location.href = "../dashboard/dashboard.html";
    }
  } catch (error) {
    console.error("Auto-redirect error:", error);
  }
});