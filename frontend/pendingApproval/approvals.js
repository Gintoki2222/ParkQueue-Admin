// admin/pendingApproval/approvals.js
import { auth, db } from "../firebase.js";
import { AdminLogger } from "../dashboard/admin-logger.js";
import { 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global variables
let currentStudentId = null;
let currentStudentName = null;
let pendingStudents = [];

// Initialize on auth state change
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Admin authenticated:", user.email);
        await loadAdminInfo();
        await loadPendingStudents();
    } else {
        console.log("No admin authenticated, redirecting...");
        window.location.href = "../login/admin-login.html";
    }
});

// Load admin information
async function loadAdminInfo() {
    try {
        const adminQuery = query(
            collection(db, "Admin"),
            where("email", "==", auth.currentUser.email)
        );
        const adminSnapshot = await getDocs(adminQuery);
        
        if (!adminSnapshot.empty) {
            const adminData = adminSnapshot.docs[0].data();
            
            // Update UI
            const adminNameEl = document.getElementById('adminName');
            const adminEmailEl = document.getElementById('adminEmail');
            const adminInitialsEl = document.getElementById('adminInitials');
            
            if (adminData.name) {
                adminNameEl.textContent = adminData.name;
                const initials = adminData.name.split(' ').map(n => n[0]).join('').toUpperCase();
                adminInitialsEl.textContent = initials;
            } else {
                const username = auth.currentUser.email.split('@')[0];
                adminNameEl.textContent = username;
                adminInitialsEl.textContent = username[0].toUpperCase();
            }
            
            adminEmailEl.textContent = auth.currentUser.email;
        }
    } catch (error) {
        console.error("Error loading admin info:", error);
    }
}

// Load pending students
async function loadPendingStudents() {
    try {
        showLoading(true);
        
        // Query for pending users
        const usersQuery = query(
            collection(db, "users"),
            where("approval_status", "==", "pending")
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        pendingStudents = [];
        
        // Collect all pending users
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            pendingStudents.push({
                id: userDoc.id,
                ...userData
            });
        }
        
        // Also check for users without approval_status field but with verification_submitted
        const oldFormatQuery = query(
            collection(db, "users")
        );
        const allUsersSnapshot = await getDocs(oldFormatQuery);
        
        allUsersSnapshot.docs.forEach(userDoc => {
            const userData = userDoc.data();
            // Check if user doesn't have approval_status but should be pending
            if (!userData.approval_status && 
                userData.verification_submitted === true && 
                userData.admin_approved !== true) {
                // Check if not already in list
                if (!pendingStudents.find(s => s.id === userDoc.id)) {
                    pendingStudents.push({
                        id: userDoc.id,
                        ...userData
                    });
                }
            }
        });
        
        // Update pending count
        document.getElementById('pendingCount').textContent = `${pendingStudents.length} Pending`;
        
        // Display students
        if (pendingStudents.length === 0) {
            showEmptyState();
        } else {
            displayPendingStudents();
        }
        
    } catch (error) {
        console.error("Error loading pending students:", error);
        showLoading(false);
        alert("Error loading pending students. Please refresh the page.");
    }
}

// Display pending students in table
function displayPendingStudents() {
    const tbody = document.getElementById('approvalTableBody');
    tbody.innerHTML = '';
    
    pendingStudents.forEach((student, index) => {
        const row = document.createElement('tr');
        
        const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username || 'N/A';
        const email = student.email || 'N/A';
        const registrationDate = student.created_at ? 
            student.created_at.toDate().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            }) : 'N/A';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${fullName}</strong></td>
            <td>${email}</td>
            <td>${registrationDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn--view" onclick="viewStudentDetails('${student.id}')">
                        View Details
                    </button>
                    <button class="btn btn--approve" onclick="approveStudent('${student.id}', '${fullName}')">
                        Approve
                    </button>
                    <button class="btn btn--reject" onclick="rejectStudent('${student.id}', '${fullName}')">
                        Reject
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Show table, hide loading
    showLoading(false);
    document.getElementById('approvalTable').style.display = 'table';
    document.getElementById('emptyState').style.display = 'none';
}

// View student details
async function viewStudentDetails(studentId) {
    try {
        currentStudentId = studentId;
        const student = pendingStudents.find(s => s.id === studentId);
        
        if (!student) {
            alert("Student not found");
            return;
        }
        
        currentStudentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username;
        
        // Get personal info
        const personalInfoQuery = query(
            collection(db, "personalInfo"),
            where("user_id", "==", studentId)
        );
        const personalInfoSnapshot = await getDocs(personalInfoQuery);
        const personalInfo = personalInfoSnapshot.empty ? null : personalInfoSnapshot.docs[0].data();
        
        // Get motor info
        const motorInfoQuery = query(
            collection(db, "motorInfo"),
            where("user_id", "==", studentId)
        );
        const motorInfoSnapshot = await getDocs(motorInfoQuery);
        const motorInfo = motorInfoSnapshot.empty ? null : motorInfoSnapshot.docs[0].data();
        
        // Get documents
        const documentsQuery = query(
            collection(db, "documents"),
            where("user_id", "==", studentId)
        );
        const documentsSnapshot = await getDocs(documentsQuery);
        const documents = documentsSnapshot.docs.map(doc => doc.data());
        
        // Populate modal
        populateDetailsModal(student, personalInfo, motorInfo, documents);
        
        // Show modal
        document.getElementById('detailsModal').style.display = 'flex';
        
    } catch (error) {
        console.error("Error loading student details:", error);
        alert("Error loading student details");
    }
}

// Populate details modal
function populateDetailsModal(student, personalInfo, motorInfo, documents) {
    // Personal Information
    document.getElementById('detailFullName').textContent = 
        `${personalInfo?.first_name || student.first_name || ''} ${personalInfo?.last_name || student.last_name || ''}`.trim() || 'N/A';
    document.getElementById('detailEmail').textContent = student.email || 'N/A';
    document.getElementById('detailContact').textContent = personalInfo?.contact_number || 'N/A';
    document.getElementById('detailDOB').textContent = personalInfo?.date_of_birth ? 
        personalInfo.date_of_birth.toDate().toLocaleDateString() : 'N/A';
    document.getElementById('detailAddress').textContent = personalInfo?.address || 'N/A';
    
    // Motor Information
    document.getElementById('detailBrand').textContent = motorInfo?.brand || 'N/A';
    document.getElementById('detailModel').textContent = motorInfo?.model || 'N/A';
    document.getElementById('detailPlate').textContent = motorInfo?.plate_number || 'N/A';
    document.getElementById('detailVehicleReg').textContent = motorInfo?.registration_date ? 
        motorInfo.registration_date.toDate().toLocaleDateString() : 'N/A';
    
    // Documents
    const documentsContainer = document.getElementById('documentsContainer');
    documentsContainer.innerHTML = '';
    
    if (documents.length === 0) {
        documentsContainer.innerHTML = '<p class="no-documents">No documents uploaded</p>';
    } else {
        documents.forEach(doc => {
            const docElement = document.createElement('div');
            docElement.className = 'document-item';
            docElement.innerHTML = `
                <span class="document-type">${doc.document_type || 'Document'}</span>
                <a href="${doc.document_url}" target="_blank" class="document-link">View Document</a>
            `;
            documentsContainer.appendChild(docElement);
        });
    }
}

// Approve student
async function approveStudent(studentId, studentName) {
    if (!confirm(`Approve account for ${studentName}?`)) {
        return;
    }
    
    try {
        // Update user document
        await updateDoc(doc(db, "users", studentId), {
            approval_status: "approved",
            admin_approved: true,
            admin_reviewed: true,
            approved_at: Timestamp.now(),
            updated_at: Timestamp.now()
        });
        
        // Log the action
        await AdminLogger.approveStudent(studentId, studentName);
        
        console.log("✅ Student approved:", studentName);
        
        // Show success modal
        document.getElementById('successModal').style.display = 'flex';
        
        // Close details modal if open
        document.getElementById('detailsModal').style.display = 'none';
        
        // Reload pending students
        await loadPendingStudents();
        
    } catch (error) {
        console.error("Error approving student:", error);
        alert("Error approving student. Please try again.");
    }
}

// Reject student
function rejectStudent(studentId, studentName) {
    currentStudentId = studentId;
    currentStudentName = studentName;
    
    // Close details modal if open
    document.getElementById('detailsModal').style.display = 'none';
    
    // Show reject modal
    document.getElementById('rejectModal').style.display = 'flex';
    document.getElementById('rejectReason').value = '';
}

// Confirm rejection
async function confirmReject() {
    const reason = document.getElementById('rejectReason').value.trim();
    
    try {
        // Update user document
        await updateDoc(doc(db, "users", currentStudentId), {
            approval_status: "rejected",
            admin_approved: false,
            admin_reviewed: true,
            rejection_reason: reason || 'No reason provided',
            rejected_at: Timestamp.now(),
            updated_at: Timestamp.now()
        });
        
        // Log the action
        await AdminLogger.rejectStudent(currentStudentId, currentStudentName);
        
        console.log("❌ Student rejected:", currentStudentName);
        
        // Close modal
        document.getElementById('rejectModal').style.display = 'none';
        
        // Reload pending students
        await loadPendingStudents();
        
        alert(`Account rejected for ${currentStudentName}`);
        
    } catch (error) {
        console.error("Error rejecting student:", error);
        alert("Error rejecting student. Please try again.");
    }
}

// Show loading state
function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'flex' : 'none';
}

// Show empty state
function showEmptyState() {
    showLoading(false);
    document.getElementById('approvalTable').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
}

// Logout
async function handleLogout() {
    try {
        await AdminLogger.logout();
        await signOut(auth);
        window.location.href = "../login/admin-login.html";
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// Event Listeners
document.getElementById('logoutBtn').addEventListener('click', handleLogout);
document.getElementById('closeDetailsBtn').addEventListener('click', () => {
    document.getElementById('detailsModal').style.display = 'none';
});
document.getElementById('detailsApproveBtn').addEventListener('click', () => {
    approveStudent(currentStudentId, currentStudentName);
});
document.getElementById('detailsRejectBtn').addEventListener('click', () => {
    rejectStudent(currentStudentId, currentStudentName);
});
document.getElementById('successOkBtn').addEventListener('click', () => {
    document.getElementById('successModal').style.display = 'none';
});
document.getElementById('rejectCancelBtn').addEventListener('click', () => {
    document.getElementById('rejectModal').style.display = 'none';
});
document.getElementById('rejectConfirmBtn').addEventListener('click', confirmReject);

// Make functions globally available
window.viewStudentDetails = viewStudentDetails;
window.approveStudent = approveStudent;
window.rejectStudent = rejectStudent;