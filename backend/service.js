const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ LOG ALL REQUESTS FOR DEBUGGING
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// ✅ STATIC FILE SERVING - ALL FILES FROM FRONTEND FOLDER
app.use(express.static(path.join(__dirname, "frontend")));

// ✅ EMAIL SETUP
const createTransporter = () => {
    console.log("📧 Creating email transporter...");
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'kenightgallaza@gmail.com',
            pass: 'rnbq ytju tjoc apnv'
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

let transporter = createTransporter();

// ✅ MAIN ROUTES

// Root -> Admin Login
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/login/admin-login.html"));
});

// Login page
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/login/admin-login.html"));
});

// Dashboard
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dashboard/dashboard.html"));
});

// Pending Approvals
app.get("/pending", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/pendingApproval/approvals.html"));
});

// Parking History
app.get("/parking-history", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/parking-history/parking-history.html"));
});

// Account Management
app.get("/account-management", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/account-management/account-management.html"));
});

// QR Scanner
app.get("/qrscanner", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/Qrscanner/Qrscanner.html"));
});

// ✅ SPECIFIC FILE ROUTES (for files that might need explicit routing)

// Dashboard JavaScript files
app.get("/dashboard.js", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dashboard/dashboard.js"));
});

app.get("/dashboard-charts.js", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dashboard/dashboard-charts.js"));
});

app.get("/admin-logger.js", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dashboard/admin-logger.js"));
});

// Login assets
app.get("/admin-login.css", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/login/admin-login.css"));
});

app.get("/admin-login.js", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/login/admin-login.js"));
});

// Dashboard CSS
app.get("/dashboard.css", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dashboard/dashboard.css"));
});

// Pending Approvals assets
app.get("/approvals.css", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/pendingApproval/approvals.css"));
});

app.get("/approvals.js", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/pendingApproval/approvals.js"));
});

// Firebase.js (important - it's in frontend root)
app.get("/firebase.js", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/firebase.js"));
});

// Images - serve from img folder
app.get("/img/:filename", (req, res) => {
    const filename = req.params.filename;
    const imgPath = path.join(__dirname, "frontend/img", filename);
    
    if (fs.existsSync(imgPath)) {
        res.sendFile(imgPath);
    } else {
        // Try with .png extension if not found
        const pngPath = path.join(__dirname, "frontend/img", filename + '.png');
        if (fs.existsSync(pngPath)) {
            res.sendFile(pngPath);
        } else {
            res.status(404).send("Image not found");
        }
    }
});

// ✅ CATCH-ALL FOR OTHER FILES IN SUBFOLDERS
app.get("/:folder/:file", (req, res, next) => {
    const folder = req.params.folder;
    const file = req.params.file;
    
    // Only handle known folders
    const allowedFolders = [
        'login', 'dashboard', 'pendingApproval', 
        'parking-history', 'account-management', 'Qrscanner', 'img'
    ];
    
    if (allowedFolders.includes(folder)) {
        const filePath = path.join(__dirname, "frontend", folder, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ Serving: ${folder}/${file}`);
            return res.sendFile(filePath);
        }
    }
    
    next();
});

// ✅ EMAIL API ENDPOINTS (copy from your original service.js)
app.post("/api/send-approval-email", async (req, res) => {
    console.log("📨 Approval Email API called");
    
    try {
        const { studentEmail, studentName, status, adminName, rejectionReason = '' } = req.body;
        
        if (!studentEmail) {
            return res.status(400).json({
                success: false,
                message: "studentEmail is required"
            });
        }
        
        console.log(`📧 Would send approval email to: ${studentEmail}`);
        
        // Check if email is available
        if (!transporter) {
            console.log("ℹ️ Email service not available - returning mock response");
            return res.json({
                success: true,
                message: "Mock: Approval email would be sent",
                mock: true,
                data: {
                    to: studentEmail,
                    status: status,
                    name: studentName,
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        let emailSubject = '';
        let emailMessage = '';
        
        if (status === "approved") {
            emailSubject = "Account Approved - ParkQueue";
            emailMessage = `
                <p>Congratulations! Your account has been <strong>approved</strong> by the administrator.</p>
                <p>You can now log in to the ParkQueue system and generate your QR code for parking access.</p>
            `;
        } else if (status === "rejected") {
            emailSubject = "Account Status Update - ParkQueue";
            emailMessage = `
                <p>We regret to inform you that your account request has been <strong>rejected</strong>.</p>
                ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
            `;
        }
        
        const mailOptions = {
            from: '"ParkQueue Administration" <kenightgallaza@gmail.com>',
            to: studentEmail,
            subject: emailSubject,
            html: `
                <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1f8012; color: white; padding: 20px; text-align: center;">
                        <h1>ParkQueue Account Status</h1>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <h2>Hello ${studentName || 'Student'},</h2>
                        ${emailMessage}
                        <p>If you have any questions, please contact the school administration.</p>
                    </div>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Approval email sent successfully!`);
        
        res.json({
            success: true,
            message: "Approval email sent successfully",
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error("❌ Email sending failed:", error.message);
        res.json({
            success: false,
            message: "Email sending failed",
            error: error.message,
            mock: true
        });
    }
});

app.post("/api/send-parking-email", async (req, res) => {
    console.log("📨 Parking Email API called");
    
    try {
        const { studentEmail, studentName, action, parkingSlot } = req.body;
        
        if (!studentEmail) {
            return res.status(400).json({
                success: false,
                message: "studentEmail is required"
            });
        }
        
        console.log(`📧 Would send parking email to: ${studentEmail}`);
        
        if (!transporter) {
            return res.json({
                success: true,
                message: "Mock: Parking email would be sent",
                mock: true,
                data: req.body
            });
        }
        
        const mailOptions = {
            from: '"ParkQueue System" <kenightgallaza@gmail.com>',
            to: studentEmail,
            subject: `Parking ${action === "entry" ? "Entry" : "Exit"} Notification`,
            html: `
                <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1f8012; color: white; padding: 20px; text-align: center;">
                        <h1>ParkQueue Parking System</h1>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <h2>Hello ${studentName || 'Valued User'},</h2>
                        <p>Your parking ${action === "entry" ? "entry" : "exit"} has been successfully recorded.</p>
                        <p>Thank you for using ParkQueue!</p>
                    </div>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Parking email sent successfully!`);
        
        res.json({
            success: true,
            message: "Email sent successfully",
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error("❌ Email sending failed:", error.message);
        res.json({
            success: false,
            message: "Email sending failed",
            error: error.message,
            mock: true
        });
    }
});

// ✅ TEST & HEALTH ENDPOINTS
app.get("/api/test-parking-email", async (req, res) => {
    try {
        console.log("🧪 Testing email service...");
        
        if (!transporter) {
            return res.json({
                success: true,
                message: "Mock: Test email would be sent",
                mock: true,
                timestamp: new Date().toISOString()
            });
        }
        
        const testMailOptions = {
            from: '"ParkQueue Test" <kenightgallaza@gmail.com>',
            to: 'kenightgallaza@gmail.com',
            subject: 'Test Email from ParkQueue',
            text: 'This is a test email from ParkQueue parking system.',
            html: '<p>This is a <b>test email</b> from ParkQueue parking system.</p>'
        };
        
        const info = await transporter.sendMail(testMailOptions);
        
        console.log(`✅ Test email sent: ${info.messageId}`);
        
        res.json({
            success: true,
            message: "Test email sent successfully!",
            messageId: info.messageId,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("❌ Test email failed:", error);
        res.json({
            success: false,
            message: "Test email failed",
            error: error.message,
            mock: true
        });
    }
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "ParkQueue Admin System",
        timestamp: new Date().toISOString(),
        emailAvailable: !!transporter,
        routes: [
            "/ - Login page",
            "/dashboard - Dashboard",
            "/pending - Pending Approvals",
            "/parking-history - Parking History",
            "/account-management - Account Management",
            "/qrscanner - QR Scanner"
        ]
    });
});

// ✅ DEBUG ENDPOINT - List all files
app.get("/api/debug-files", (req, res) => {
    const frontendPath = path.join(__dirname, "frontend");
    
    try {
        const files = [];
        
        function scanDir(dir, prefix = "") {
            const items = fs.readdirSync(dir);
            
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                const relativePath = path.relative(frontendPath, fullPath);
                
                if (stat.isDirectory()) {
                    files.push(`📁 ${prefix}${item}/`);
                    scanDir(fullPath, prefix + "  ");
                } else {
                    files.push(`📄 ${prefix}${item} (/${relativePath})`);
                }
            });
        }
        
        scanDir(frontendPath);
        
        res.json({
            success: true,
            frontendPath: frontendPath,
            totalFiles: files.length,
            files: files
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            frontendPath: frontendPath
        });
    }
});

// ✅ DEBUG: Check specific file paths
app.get("/api/debug-paths", (req, res) => {
    const basePath = __dirname;
    const frontendPath = path.join(__dirname, "frontend");
    
    const checkFiles = [
        "frontend/login/admin-login.html",
        "frontend/dashboard/dashboard.html",
        "frontend/firebase.js",
        "frontend/dashboard/dashboard.js",
        "frontend/login/admin-login.css",
        "frontend/login/admin-login.js",
        "frontend/dashboard/dashboard.css",
        "frontend/pendingApproval/approvals.css",
        "frontend/img/logow.png"
    ];
    
    const results = checkFiles.map(file => {
        const fullPath = path.join(__dirname, file);
        return {
            file: file,
            exists: fs.existsSync(fullPath),
            path: fullPath
        };
    });
    
    res.json({
        project: "Admin System",
        baseDir: basePath,
        frontendDir: frontendPath,
        files: results
    });
});

// 404 handler
app.use((req, res) => {
    console.log(`404: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        requestedUrl: req.url,
        method: req.method,
        hint: "Visit /api/health for available routes"
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🏢 PARKQUEUE ADMIN SYSTEM v2.0`);
    console.log(`=================================`);
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Serving from: ${path.join(__dirname, "frontend")}`);
    console.log(`\n🌐 AVAILABLE ROUTES:`);
    console.log(`   • Login: http://localhost:${PORT}/`);
    console.log(`   • Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`   • Pending Approvals: http://localhost:${PORT}/pending`);
    console.log(`   • Parking History: http://localhost:${PORT}/parking-history`);
    console.log(`   • Account Management: http://localhost:${PORT}/account-management`);
    console.log(`   • QR Scanner: http://localhost:${PORT}/qrscanner`);
    console.log(`\n🔧 API ENDPOINTS:`);
    console.log(`   • Health: http://localhost:${PORT}/api/health`);
    console.log(`   • Debug Files: http://localhost:${PORT}/api/debug-files`);
    console.log(`   • Debug Paths: http://localhost:${PORT}/api/debug-paths`);
    console.log(`   • Email API: http://localhost:${PORT}/api/send-approval-email`);
    console.log(`\n📧 Email Status: ${transporter ? '✅ Available' : '❌ Disabled'}`);
    console.log(`=================================`);
});