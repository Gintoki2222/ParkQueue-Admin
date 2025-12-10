// admin/dashboard/admin-logger.js
import { 
    auth as firebaseAuth,
    db as firebaseDb
} from "../firebase.js";
import { 
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const AdminLogger = {
  async logAdminAction(action, message, targetUser = null) {
    try {
      // Check if user is authenticated
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        console.error("No authenticated user for logging");
        return false;
      }

      const logData = {
        action: action,
        message: message,
        performedBy: currentUser.uid,
        timestamp: serverTimestamp(),
        adminEmail: currentUser.email,
        adminName: currentUser.displayName || "Admin"
      };

      // Add target user if provided
      if (targetUser) {
        logData.targetUser = targetUser;
      }

      await addDoc(collection(firebaseDb, "admin_logs"), logData);
      console.log("✅ Admin action logged:", action, message);
      return true;
    } catch (error) {
      console.error("❌ Error logging admin action:", error);
      return false;
    }
  },

  async approveStudent(studentId, studentName) {
    return await this.logAdminAction(
      "approval", 
      `Approved student account: ${studentName}`,
      studentId
    );
  },
  
  async rejectStudent(studentId, studentName) {
    return await this.logAdminAction(
      "rejection", 
      `Rejected student account: ${studentName}`,
      studentId
    );
  },
  
  async viewStudent(studentId, studentName) {
    return await this.logAdminAction(
      "view", 
      `Viewed student account: ${studentName}`,
      studentId
    );
  },
  
  async exportData(dataType) {
    return await this.logAdminAction(
      "export", 
      `Exported ${dataType} data`
    );
  },
  
  async login() {
    return await this.logAdminAction(
      "login", 
      `Admin logged into the system`
    );
  },
  
  async logout() {
    return await this.logAdminAction(
      "logout", 
      `Admin logged out of the system`
    );
  }
};

// Make it globally available for non-module scripts
window.AdminLogger = AdminLogger;

// Export for ES6 modules
export { AdminLogger };