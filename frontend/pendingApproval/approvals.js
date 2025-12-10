import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  Timestamp
} from '../firebase.js';

class ApprovalsManager {
  constructor() {
    this.currentUser = null;
    this.allAccounts = [];
    this.filteredAccounts = [];
    this.currentPage = 1;
    this.accountsPerPage = 10;
    this.currentFilter = 'pending';
    this.isLoading = false;
    this.maxRetries = 3;
    this.currentStudentId = null;
    this.currentStudentName = null;

    this.initializeElements();
    this.setupEventListeners();
    this.checkAuth();
  }

  initializeElements() {
    this.menuToggle = document.getElementById('menuToggle');
    this.closeMenu = document.getElementById('closeMenu');
    this.mobileMenu = document.getElementById('mobileMenu');
    this.profileToggle = document.getElementById('profileToggle');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.logoutBtnMobile = document.getElementById('logoutBtnMobile');

    this.adminNameNav = document.getElementById('adminNameNav');
    this.adminInitialsNav = document.getElementById('adminInitialsNav');
    this.adminName = document.getElementById('adminName');
    this.adminEmail = document.getElementById('adminEmail');
    this.adminInitials = document.getElementById('adminInitials');
    this.mobileAdminName = document.getElementById('mobileAdminName');
    this.mobileAdminEmail = document.getElementById('mobileAdminEmail');
    this.mobileAdminInitials = document.getElementById('mobileAdminInitials');
    this.currentDateElement = document.getElementById('currentDate');

    this.totalStudentsNav = document.getElementById('totalStudentsNav');
    this.pendingCountNav = document.getElementById('pendingCountNav');
    this.pendingCountText = document.getElementById('pendingCountText');
    this.pendingCountBadge = document.getElementById('pendingCountBadge');
    this.pendingCountMobile = document.getElementById('pendingCountMobile');

    this.searchInput = document.getElementById('searchInput');
    this.sortFilter = document.getElementById('sortFilter');
    this.refreshBtn = document.getElementById('refreshBtn');

    this.accountsTableBody = document.getElementById('accountsTableBody');
    this.emptyState = document.getElementById('emptyState');

    this.detailsModal = document.getElementById('detailsModal');
    this.closeDetailsBtn = document.getElementById('closeDetailsBtn');
    this.detailsRejectBtn = document.getElementById('detailsRejectBtn');
    this.detailsApproveBtn = document.getElementById('detailsApproveBtn');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    
    this.successModal = document.getElementById('successModal');
    this.closeSuccessBtn = document.getElementById('closeSuccessBtn');
    this.successOkBtn = document.getElementById('successOkBtn');
    
    this.rejectModal = document.getElementById('rejectModal');
    this.closeRejectBtn = document.getElementById('closeRejectBtn');
    this.rejectCancelBtn = document.getElementById('rejectCancelBtn');
    this.rejectConfirmBtn = document.getElementById('rejectConfirmBtn');
    this.rejectReason = document.getElementById('rejectReason');
    
    this.modalBody = document.getElementById('modalBody');
    this.modalAccountName = document.getElementById('modalAccountName');
  }

  setupEventListeners() {
    if (this.menuToggle) {
      this.menuToggle.addEventListener('click', () => {
        this.mobileMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    }

    if (this.closeMenu) {
      this.closeMenu.addEventListener('click', () => {
        this.mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    this.mobileMenu.addEventListener('click', (e) => {
      if (e.target === this.mobileMenu) {
        this.mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    if (this.profileToggle) {
      const profileDropdown = document.querySelector('.profile-dropdown-menu');
      this.profileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        profileDropdown.classList.remove('show');
      });
    }

    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    if (this.logoutBtnMobile) {
      this.logoutBtnMobile.addEventListener('click', () => this.handleLogout());
    }

    this.searchInput.addEventListener('input', () => this.applyFilters());
    this.sortFilter.addEventListener('change', () => this.applyFilters());
    this.refreshBtn.addEventListener('click', () => this.loadAccounts());

    this.closeDetailsBtn.addEventListener('click', () => {
      this.detailsModal.style.display = 'none';
    });

    this.closeModalBtn.addEventListener('click', () => {
      this.detailsModal.style.display = 'none';
    });

    this.detailsApproveBtn.addEventListener('click', () => {
      this.approveStudent(this.currentStudentId, this.currentStudentName);
    });

    this.detailsRejectBtn.addEventListener('click', () => {
      this.rejectStudent(this.currentStudentId, this.currentStudentName);
    });

    this.closeSuccessBtn.addEventListener('click', () => {
      this.successModal.style.display = 'none';
    });

    this.successOkBtn.addEventListener('click', () => {
      this.successModal.style.display = 'none';
    });

    this.closeRejectBtn.addEventListener('click', () => {
      this.rejectModal.style.display = 'none';
    });

    this.rejectCancelBtn.addEventListener('click', () => {
      this.rejectModal.style.display = 'none';
    });

    this.rejectConfirmBtn.addEventListener('click', () => {
      this.confirmReject();
    });

    window.addEventListener('click', (e) => {
      if (e.target === this.detailsModal) {
        this.detailsModal.style.display = 'none';
      }
      if (e.target === this.successModal) {
        this.successModal.style.display = 'none';
      }
      if (e.target === this.rejectModal) {
        this.rejectModal.style.display = 'none';
      }
    });

    setInterval(() => this.updateCurrentDate(), 60000);
  }

  async checkAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.updateAdminUI();
        await this.loadAccounts();
        this.updateCurrentDate();
      } else {
        window.location.href = "../login/admin-login.html";
      }
    });
  }

  async updateAdminUI() {
    try {
      const adminQuery = query(
        collection(db, "Admin"),
        where("email", "==", this.currentUser.email)
      );
      const querySnapshot = await getDocs(adminQuery);

      let adminData = null;
      if (!querySnapshot.empty) {
        adminData = querySnapshot.docs[0].data();
      }

      const adminName = adminData?.name || this.currentUser.email.split('@')[0];
      const adminEmail = adminData?.email || this.currentUser.email;

      [this.adminName, this.adminNameNav, this.mobileAdminName].forEach(element => {
        if (element) element.textContent = adminName;
      });

      [this.adminEmail, this.mobileAdminEmail].forEach(element => {
        if (element) element.textContent = adminEmail;
      });

      const initials = adminData?.name
        ? adminData.name.split(' ').map(n => n[0]).join('').toUpperCase()
        : this.currentUser.email[0].toUpperCase();

      [this.adminInitials, this.adminInitialsNav, this.mobileAdminInitials].forEach(element => {
        if (element) element.textContent = initials;
      });

    } catch (error) {
      this.showNotification("Error loading admin info", "error");
    }
  }

  updateCurrentDate() {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    };
    const formattedDate = now.toLocaleDateString('en-US', options);

    if (this.currentDateElement) {
      this.currentDateElement.textContent = formattedDate;
    }
  }

  async loadAccounts(retryCount = 0) {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      this.showLoading();

      const usersSnapshot = await getDocs(collection(db, "users"));
      const accounts = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();

        console.log("User data:", userData);

        if (userData.isAdmin === true) continue;

        let isPending = false;
        
        if (userData.approval_status === "pending") {
          isPending = true;
        } else if (!userData.approval_status && 
                   userData.verification_submitted === true && 
                   userData.admin_approved !== true) {
          isPending = true;
        }

        if (!isPending) continue;

        let studentId = "";
        try {
          const personalQuery = query(
            collection(db, "personalInfo"),
            where("user_id", "==", userDoc.id)
          );
          const personalSnapshot = await getDocs(personalQuery);
          
          if (!personalSnapshot.empty) {
            const personalData = personalSnapshot.docs[0].data();
            studentId = personalData.student_id || "";
            console.log(`Student ID found: ${studentId} for user ${userDoc.id}`);
          }
        } catch (error) {
          console.warn("Could not fetch personal info:", error);
        }

        const account = {
          id: userDoc.id,
          uid: userData.uid || "",
          email: userData.email || "",
          displayName: userData.displayName || "",
          username: userData.username || "",
          firstName: userData.first_name || "",
          lastName: userData.last_name || "",
          studentId: studentId,
          status: "pending",
          createdAt: userData.created_at?.toDate() || userData.createdAt?.toDate() || new Date(),
          personalInfo: {}
        };

        accounts.push(account);
      }

      this.allAccounts = accounts;
      this.updatePendingCount();
      this.applyFilters();
      this.hideLoading();
      this.isLoading = false;

    } catch (error) {
      this.isLoading = false;
      
      if (retryCount < this.maxRetries) {
        setTimeout(() => this.loadAccounts(retryCount + 1), 2000 * (retryCount + 1));
      } else {
        this.showError("Failed to load pending accounts");
      }
    }
  }

  async fetchPersonalInfo(userId) {
    try {
      const personalQuery = query(
        collection(db, "personalInfo"),
        where("user_id", "==", userId)
      );
      const personalSnapshot = await getDocs(personalQuery);

      if (!personalSnapshot.empty) {
        return personalSnapshot.docs[0].data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching personal info:", error);
      return null;
    }
  }

  async fetchVehicleInfo(userId) {
    try {
      const vehicleQuery = query(
        collection(db, "motorInfo"),
        where("user_id", "==", userId)
      );
      const vehicleSnapshot = await getDocs(vehicleQuery);

      if (!vehicleSnapshot.empty) {
        const vehicleData = vehicleSnapshot.docs[0].data();
        console.log("Vehicle data fetched:", vehicleData); // Debug log
        
        // FIX: Map the correct field names - your Firestore has motorcycle_brand, motorcycle_model, motorcycle_color
        return {
          brand: vehicleData.motorcycle_brand || vehicleData.brand || '',
          model: vehicleData.motorcycle_model || vehicleData.model || '',
          color: vehicleData.motorcycle_color || vehicleData.color || '',
          plate_number: vehicleData.plate_number || '',
          license_number: vehicleData.license_number || '',
          license_expiry: vehicleData.license_expiry,
          // Include all original data for debugging
          ...vehicleData
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching vehicle info:", error);
      return null;
    }
  }

  async fetchDocuments(userId) {
    try {
      const documentsQuery = query(
        collection(db, "documents"),
        where("user_id", "==", userId)
      );
      const documentsSnapshot = await getDocs(documentsQuery);
      
      return documentsSnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error("Error fetching documents:", error);
      return [];
    }
  }

  updatePendingCount() {
    const pendingCount = this.allAccounts.length;
    
    this.pendingCountText.textContent = `${pendingCount} Pending`;
    
    if (this.pendingCountNav) {
      this.pendingCountNav.textContent = pendingCount;
    }
    
    if (this.pendingCountMobile) {
      this.pendingCountMobile.textContent = pendingCount;
    }

    if (this.totalStudentsNav) {
      this.totalStudentsNav.textContent = pendingCount;
    }
  }

  applyFilters() {
    let filtered = [...this.allAccounts];

    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(account => {
        const searchFields = [
          account.email,
          account.displayName,
          account.username,
          account.firstName,
          account.lastName,
          account.studentId,
          account.id
        ];

        return searchFields.some(field =>
          field && field.toString().toLowerCase().includes(searchTerm)
        );
      });
    }

    const sortValue = this.sortFilter.value;
    switch (sortValue) {
      case "newest":
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        filtered.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "name":
        filtered.sort((a, b) => {
          const nameA = a.displayName || `${a.firstName} ${a.lastName}` || a.username || a.email;
          const nameB = b.displayName || `${b.firstName} ${b.lastName}` || b.username || b.email;
          return nameA.localeCompare(nameB);
        });
        break;
    }

    this.filteredAccounts = filtered;
    this.displayAccounts();
  }

  displayAccounts() {
    if (this.filteredAccounts.length === 0) {
      this.accountsTableBody.innerHTML = '';
      this.accountsTableBody.parentElement.style.display = 'none';
      this.emptyState.style.display = 'block';
      return;
    }

    this.accountsTableBody.parentElement.style.display = 'block';
    this.emptyState.style.display = 'none';

    let tableHTML = '';

    this.filteredAccounts.forEach((account, index) => {
      const accountNumber = index + 1;
      
      let studentId = account.studentId || 'N/A';
      
      if (studentId === 'N/A' || !studentId || studentId.trim() === '') {
        studentId = `<span style="color: #ff9800; font-style: italic;">${account.id.substring(0, 8)}</span>`;
      }
      
      const accountName = account.displayName || `${account.firstName} ${account.lastName}`.trim() || account.username || "Unknown";
      const registrationDate = this.formatDate(account.createdAt);
      const initials = (accountName.charAt(0) || 'U').toUpperCase();

      tableHTML += `
        <tr class="account-row" data-account-id="${account.id}">
          <td class="account-number">${accountNumber}</td>
          <td><span class="account-id">${studentId}</span></td>
          <td class="account-name">
            <div class="user-avatar">${initials}</div>
            <div>
              <div style="font-weight: 600;">${accountName}</div>
              <div style="font-size: 0.8rem; color: #666;">${account.username || ''}</div>
            </div>
          </td>
          <td>${account.email}</td>
          <td class="account-time">${registrationDate}</td>
          <td><span class="status-badge status-pending">Pending</span></td>
          <td class="account-actions">
            <button class="table-action-btn view-btn view-account-btn" 
                    data-account-id="${account.id}">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="table-action-btn approve-btn approve-account-btn" 
                    data-account-id="${account.id}" 
                    data-account-name="${accountName}">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="table-action-btn reject-btn reject-account-btn" 
                    data-account-id="${account.id}" 
                    data-account-name="${accountName}">
              <i class="fas fa-times"></i> Reject
            </button>
          </td>
        </tr>
      `;
    });

    this.accountsTableBody.innerHTML = tableHTML;
    this.addAccountEventListeners();
  }

  addAccountEventListeners() {
    document.querySelectorAll('.view-account-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const accountId = btn.dataset.accountId;
        await this.viewStudentDetails(accountId);
      });
    });

    document.querySelectorAll('.approve-account-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const accountId = btn.dataset.accountId;
        const accountName = btn.dataset.accountName;
        this.approveStudent(accountId, accountName);
      });
    });

    document.querySelectorAll('.reject-account-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const accountId = btn.dataset.accountId;
        const accountName = btn.dataset.accountName;
        this.rejectStudent(accountId, accountName);
      });
    });
  }

  async viewStudentDetails(studentId) {
    try {
      this.currentStudentId = studentId;
      const student = this.allAccounts.find(s => s.id === studentId);
      
      if (!student) {
        this.showNotification("Student not found", "error");
        return;
      }
      
      this.currentStudentName = student.displayName || `${student.firstName} ${student.lastName}`.trim() || student.username;
      
      const [personalInfo, vehicleInfo, documents] = await Promise.all([
        this.fetchPersonalInfo(studentId),
        this.fetchVehicleInfo(studentId),
        this.fetchDocuments(studentId)
      ]);
      
      console.log("Vehicle info fetched:", vehicleInfo); // Debug log
      console.log("Personal info fetched:", personalInfo); // Debug log
      
      this.populateDetailsModal(student, personalInfo, vehicleInfo, documents);
      this.detailsModal.style.display = 'flex';
      
    } catch (error) {
      console.error("Error loading student details:", error);
      this.showNotification("Error loading student details", "error");
    }
  }

  populateDetailsModal(student, personalInfo, vehicleInfo, documents) {
    const fullName = `${personalInfo?.first_name || student.firstName || ''} ${personalInfo?.last_name || student.lastName || ''}`.trim() || 'N/A';
    this.modalAccountName.textContent = fullName || student.username || "Student Details";

    let modalHTML = `
      <div class="section-title">
        <i class="fas fa-user"></i> Personal Information
      </div>
      <div class="user-detail-grid">
        <div class="detail-group">
          <span class="detail-label">Full Name:</span>
          <div class="detail-value">${fullName}</div>
        </div>
        <div class="detail-group">
          <span class="detail-label">Email:</span>
          <div class="detail-value">${student.email}</div>
        </div>
        <div class="detail-group">
          <span class="detail-label">Student ID:</span>
          <div class="detail-value">${personalInfo?.student_id || student.studentId || 'N/A'}</div>
        </div>
        <div class="detail-group">
          <span class="detail-label">Course:</span>
          <div class="detail-value">${personalInfo?.course || 'N/A'}</div>
        </div>
        <div class="detail-group">
          <span class="detail-label">Year Level:</span>
          <div class="detail-value">${personalInfo?.year_level || 'N/A'}</div>
        </div>
        <div class="detail-group">
          <span class="detail-label">Section:</span>
          <div class="detail-value">${personalInfo?.section || 'N/A'}</div>
        </div>
        <div class="detail-group">
          <span class="detail-label">Contact Number:</span>
          <div class="detail-value">${personalInfo?.contact_number || 'N/A'}</div>
        </div>
        <div class="detail-group">
          <span class="detail-label">Date of Birth:</span>
          <div class="detail-value">${personalInfo?.date_of_birth ? 
            personalInfo.date_of_birth.toDate().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'N/A'}</div>
        </div>
        <div class="detail-group">
          <span class="detail-label">Address:</span>
          <div class="detail-value">${personalInfo?.address || 'N/A'}</div>
        </div>
        <div class="detail-group">
          <span class="detail-label">Date Registered:</span>
          <div class="detail-value">${this.formatDate(student.createdAt, true)}</div>
        </div>
      </div>
    `;

    if (vehicleInfo) {
      console.log("Vehicle info available, keys:", Object.keys(vehicleInfo));
      
      // Get brand and model - check both naming conventions
      const brand = vehicleInfo.brand || vehicleInfo.motorcycle_brand || '';
      const model = vehicleInfo.model || vehicleInfo.motorcycle_model || '';
      const color = vehicleInfo.color || vehicleInfo.motorcycle_color || '';
      const plateNumber = vehicleInfo.plate_number || '';
      const licenseNumber = vehicleInfo.license_number || '';
      
      modalHTML += `
        <div class="section-title">
          <i class="fas fa-motorcycle"></i> Vehicle Information
        </div>
        <div class="user-detail-grid">
          <div class="detail-group">
            <span class="detail-label">Plate Number:</span>
            <div class="detail-value">${plateNumber || 'N/A'}</div>
          </div>
          <div class="detail-group">
            <span class="detail-label">License Number:</span>
            <div class="detail-value">${licenseNumber || 'N/A'}</div>
          </div>
          <div class="detail-group">
            <span class="detail-label">Brand/Model:</span>
            <div class="detail-value">
              ${brand} ${model}
            </div>
          </div>
          <div class="detail-group">
            <span class="detail-label">Color:</span>
            <div class="detail-value">${color || 'N/A'}</div>
          </div>
          <div class="detail-group">
            <span class="detail-label">License Expiry:</span>
            <div class="detail-value">
              ${vehicleInfo.license_expiry ? 
                vehicleInfo.license_expiry.toDate().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'N/A'}
            </div>
          </div>
        </div>
      `;
    } else {
      modalHTML += `
        <div class="section-title">
          <i class="fas fa-motorcycle"></i> Vehicle Information
        </div>
        <div class="user-detail-grid">
          <div class="detail-group">
            <span class="detail-label">Status:</span>
            <div class="detail-value" style="color: #ff9800;">
              <i class="fas fa-exclamation-triangle"></i> No vehicle information found
            </div>
          </div>
        </div>
      `;
    }

    if (documents.length > 0) {
      modalHTML += `
        <div class="section-title">
          <i class="fas fa-file-alt"></i> Uploaded Documents
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
      `;
      
      documents.forEach(doc => {
        modalHTML += `
          <div style="display: flex; justify-content: space-between; align-items: center; 
                     padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
            <span style="font-weight: 500; color: #333;">${doc.document_type || 'Document'}</span>
            <a href="${doc.document_url}" target="_blank" style="color: var(--primary-color); 
                     text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 5px;">
              View <i class="fas fa-external-link-alt" style="font-size: 0.8em;"></i>
            </a>
          </div>
        `;
      });
      
      modalHTML += `</div>`;
    }

    this.modalBody.innerHTML = modalHTML;
  }

  async approveStudent(studentId, studentName) {
    if (!confirm(`Approve account for ${studentName}?`)) {
      return;
    }
    
    try {
      // Get student email first
      const studentRef = doc(db, "users", studentId);
      const studentDoc = await getDoc(studentRef);
      const studentEmail = studentDoc.data().email;
      const adminName = this.adminName.textContent;
      
      // Update student status
      await updateDoc(studentRef, {
        approval_status: "approved",
        admin_approved: true,
        admin_reviewed: true,
        approved_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        approved_by: this.currentUser.uid,
        approved_by_name: adminName
      });
      
      console.log("✅ Student approved:", studentName);
      
      // Send approval email
      try {
        await this.sendApprovalEmail(studentEmail, studentName, "approved", adminName);
      } catch (emailError) {
        console.log("Email failed but student approved:", emailError);
      }
      
      this.detailsModal.style.display = 'none';
      this.successModal.style.display = 'flex';
      
      await this.loadAccounts();
      
    } catch (error) {
      console.error("Error approving student:", error);
      this.showNotification("Error approving student. Please try again.", "error");
    }
  }

  rejectStudent(studentId, studentName) {
    this.currentStudentId = studentId;
    this.currentStudentName = studentName;
    
    this.detailsModal.style.display = 'none';
    this.rejectModal.style.display = 'flex';
    this.rejectReason.value = '';
  }

  async confirmReject() {
    const reason = this.rejectReason.value.trim();
    
    try {
      // Get student data
      const studentRef = doc(db, "users", this.currentStudentId);
      const studentDoc = await getDoc(studentRef);
      const studentData = studentDoc.data();
      const studentEmail = studentData.email;
      const adminName = this.adminName.textContent;
      
      await updateDoc(studentRef, {
        approval_status: "rejected",
        admin_approved: false,
        admin_reviewed: true,
        rejection_reason: reason || 'No reason provided',
        rejected_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        rejected_by: this.currentUser.uid,
        rejected_by_name: adminName
      });
      
      console.log("❌ Student rejected:", this.currentStudentName);
      
      // Send rejection email
      try {
        await this.sendApprovalEmail(studentEmail, this.currentStudentName, "rejected", adminName, reason);
      } catch (emailError) {
        console.log("Rejection email failed:", emailError);
      }
      
      this.rejectModal.style.display = 'none';
      
      await this.loadAccounts();
      
      this.showNotification(`Account rejected for ${this.currentStudentName}`, "success");
      
    } catch (error) {
      console.error("Error rejecting student:", error);
      this.showNotification("Error rejecting student. Please try again.", "error");
    }
  }

  async sendApprovalEmail(studentEmail, studentName, status, adminName, rejectionReason = '') {
    try {
      console.log("📧 Attempting to send approval email...");
      console.log("To:", studentEmail);
      console.log("Name:", studentName);
      console.log("Status:", status);
      console.log("Admin:", adminName);

      const response = await fetch('http://localhost:3000/api/send-approval-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentEmail: studentEmail,
          studentName: studentName,
          action: "approval",
          status: status,
          adminName: adminName,
          rejectionReason: rejectionReason,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn("⚠️ Approval email server responded with status:", response.status);
        return false;
      }

      const result = await response.json();
      console.log("📧 Approval email API response:", result);

      if (result.success) {
        console.log("✅ Approval email sent successfully!");
        return true;
      } else {
        console.warn("⚠️ Approval email sending failed:", result.message);
        return false;
      }

    } catch (error) {
      console.error("❌ Approval email fetch error:", error);
      console.log("ℹ️ Approval action was still recorded successfully");
      return false;
    }
  }

  formatDate(date, includeTime = false) {
    if (!date) return "N/A";

    const d = date instanceof Date ? date : date.toDate();

    if (includeTime) {
      return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }

    this.accountsTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="7">
          <div class="loading-spinner-small"></div>
          <span style="color: #666;">Loading pending requests...</span>
        </td>
      </tr>
    `;
  }

  hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }

  showError(message) {
    this.accountsTableBody.innerHTML = `
      <tr class="empty-state">
        <td colspan="7">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error Loading Accounts</h3>
          <p>${message}</p>
          <button onclick="window.location.reload()" 
                  style="margin-top: 15px; padding: 8px 16px; background: var(--primary-color); 
                         color: white; border: none; border-radius: 4px; cursor: pointer;">
            Retry
          </button>
        </td>
      </tr>
    `;
    this.hideLoading();
  }

  showNotification(message, type = "info") {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
      color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
      padding: 15px 25px;
      border-radius: 10px;
      border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.3s ease;
    `;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    notification.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);

    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  async handleLogout() {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "../login/admin-login.html";
    } catch (error) {
      this.showNotification("Logout failed. Please try again.", "error");
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.approvalsManager = new ApprovalsManager();
});