// admin/dashboard/admin-logger.js
import { auth, db } from "../firebase.js";
import { 
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Log admin action to Firestore
export async function logAdminAction(action, message, targetUser = null) {
    try {
        // Check if user is authenticated
        if (!auth.currentUser) {
            console.error("No authenticated user for logging");
            return false;
        }

        const logData = {
            action: action,
            message: message,
            performedBy: auth.currentUser.uid,
            timestamp: serverTimestamp(),
            adminEmail: auth.currentUser.email,
            adminName: auth.currentUser.displayName || "Admin"
        };

        // Add target user if provided
        if (targetUser) {
            logData.targetUser = targetUser;
        }

        await addDoc(collection(db, "admin_logs"), logData);
        console.log("✅ Admin action logged:", action, message);
        return true;
    } catch (error) {
        console.error("❌ Error logging admin action:", error);
        return false;
    }
}

// Specific logging functions for common actions
export const AdminLogger = {
    async approveStudent(studentId, studentName) {
        return await logAdminAction(
            "approval", 
            `Approved student account: ${studentName}`,
            studentId
        );
    },
    
    async rejectStudent(studentId, studentName) {
        return await logAdminAction(
            "rejection", 
            `Rejected student account: ${studentName}`,
            studentId
        );
    },
    
    async viewStudent(studentId, studentName) {
        return await logAdminAction(
            "view", 
            `Viewed student account: ${studentName}`,
            studentId
        );
    },
    
    async exportData(dataType) {
        return await logAdminAction(
            "export", 
            `Exported ${dataType} data`
        );
    },
    
    async login() {
        return await logAdminAction(
            "login", 
            `Admin logged into the system`
        );
    },
    
    async logout() {
        return await logAdminAction(
            "logout", 
            `Admin logged out of the system`
        );
    }
};