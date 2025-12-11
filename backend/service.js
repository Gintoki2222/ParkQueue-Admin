const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SERVE ALL STATIC FILES FROM FRONTEND FOLDER
app.use(express.static(path.join(__dirname, "../frontend")));

// ✅ REDIRECT ROOT TO ADMIN LOGIN
app.get("/", (req, res) => {
    console.log("Redirecting to admin login...");
    res.redirect("/login/admin-login.html");
});

// ✅ CATCH-ALL FOR HTML FILES
app.get("/:page", (req, res, next) => {
    const page = req.params.page;
    
    // If it's a known admin page without .html extension
    const adminPages = {
        "admin": "login/admin-login.html",
        "login": "login/admin-login.html",
        "dashboard": "dashboard/dashboard.html",
        "pending": "pendingApproval/approvals.html"
    };
    
    if (adminPages[page]) {
        const filePath = path.join(__dirname, "../frontend", adminPages[page]);
        console.log(`Serving admin page: ${adminPages[page]}`);
        return res.sendFile(filePath);
    }
    
    next(); // Let static middleware handle other files
});

// ✅ EMAIL FUNCTIONALITY (with fallback for Render)
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

let transporter;

// Initialize transporter with error handling
try {
    transporter = createTransporter();
    console.log("✅ Email transporter created");
    
    // Verify connection in background (don't block startup)
    transporter.verify(function(error, success) {
        if (error) {
            console.error('❌ Email transporter verification failed (expected on Render):', error.message);
        } else {
            console.log('✅ Email server is ready to take messages');
        }
    });
} catch (error) {
    console.error("❌ Failed to create email transporter (expected on Render):", error.message);
    transporter = null;
}

// ✅ APPROVAL EMAIL ENDPOINT
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
            console.log("ℹ️ Email service not available on Render - returning mock response");
            return res.json({
                success: true,
                message: "Mock: Approval email would be sent (email disabled on Render)",
                mock: true,
                data: {
                    to: studentEmail,
                    status: status,
                    name: studentName,
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        // Actual email sending code (only works outside Render)
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
            message: "Email sending failed (expected on Render)",
            error: error.message,
            mock: true
        });
    }
});

// ✅ QR SCAN EMAIL ENDPOINT
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
        
        // Check if email is available
        if (!transporter) {
            console.log("ℹ️ Email service not available on Render - returning mock response");
            return res.json({
                success: true,
                message: "Mock: Parking email would be sent (email disabled on Render)",
                mock: true,
                data: req.body
            });
        }
        
        // Actual email sending code
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
            message: "Email sending failed (expected on Render)",
            error: error.message,
            mock: true
        });
    }
});

// ✅ TEST ENDPOINT
app.get("/api/test-parking-email", async (req, res) => {
    try {
        console.log("🧪 Testing email service...");
        
        if (!transporter) {
            return res.json({
                success: true,
                message: "Mock: Test email would be sent (email disabled on Render)",
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
            message: "Test email failed (expected on Render)",
            error: error.message,
            mock: true
        });
    }
});

// ✅ SIMPLE HEALTH CHECK
app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "ParkQueue Admin System",
        timestamp: new Date().toISOString(),
        emailAvailable: !!transporter,
        note: transporter ? "Email service is ready" : "Email disabled (expected on Render)"
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
        hint: "Try visiting /login/admin-login.html directly"
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
    console.log(`🏢 PARKQUEUE ADMIN SYSTEM`);
    console.log(`=================================`);
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Admin Login: https://parkqueue-admin-1.onrender.com/`);
    console.log(`🌐 Direct link: https://parkqueue-admin-1.onrender.com/login/admin-login.html`);
    console.log(`🌐 Dashboard: https://parkqueue-admin-1.onrender.com/dashboard`);
    console.log(`🌐 Pending: https://parkqueue-admin-1.onrender.com/pending`);
    console.log(`📤 Email API: https://parkqueue-admin-1.onrender.com/api/send-approval-email`);
    console.log(`💚 Health: https://parkqueue-admin-1.onrender.com/api/health`);
    console.log(`=================================`);
    if (!transporter) {
        console.log(`⚠️  NOTE: Email functionality is disabled on Render`);
        console.log(`     Emails will return mock responses`);
        console.log(`     For real emails, use different hosting or email service`);
    }
    console.log(`=================================`);
});