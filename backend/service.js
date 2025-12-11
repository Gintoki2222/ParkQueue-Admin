const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

// Middleware - FIXED CORS to allow all origins during testing
app.use(cors({
    origin: '*', // Allow all during testing
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email transporter setup
const createTransporter = () => {
    console.log("📧 Creating email transporter...");
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'kenightgallaza@gmail.com',
            pass: 'rnbq ytju tjoc apnv' // Your app password
        },
        tls: {
            rejectUnauthorized: false
        },
        debug: true,
        logger: true
    });
};

let transporter;

// Initialize transporter
try {
    transporter = createTransporter();
    console.log("✅ Email transporter created");
    
    // Verify connection
    transporter.verify(function(error, success) {
        if (error) {
            console.error('❌ Email transporter verification failed:', error);
        } else {
            console.log('✅ Email server is ready to take messages');
        }
    });
} catch (error) {
    console.error("❌ Failed to create email transporter:", error);
}

// ✅ APPROVAL EMAIL ENDPOINT
app.post("/api/send-approval-email", async (req, res) => {
    console.log("📨 Approval Email API called at:", new Date().toISOString());
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
        const { studentEmail, studentName, status, adminName, rejectionReason = '' } = req.body;
        
        if (!studentEmail) {
            return res.status(400).json({
                success: false,
                message: "studentEmail is required"
            });
        }
        
        console.log(`📧 Attempting to send approval email to: ${studentEmail}`);
        console.log(`Status: ${status}, Name: ${studentName}, Admin: ${adminName}`);
        
        let emailSubject = '';
        let emailMessage = '';
        
        if (status === "approved") {
            emailSubject = "Account Approved - ParkQueue";
            emailMessage = `
                <p>Congratulations! Your account has been <strong>approved</strong> by the administrator.</p>
                <p>You can now log in to the ParkQueue system and generate your QR code for parking access.</p>
                <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h4 style="margin-top: 0; color: #1f8012;">Next Steps:</h4>
                    <ol>
                        <li>Log in to your ParkQueue student account</li>
                        <li>Generate your personal QR code from your profile</li>
                        <li>Use the QR code to scan at the parking entrance/exit</li>
                    </ol>
                </div>
            `;
        } else if (status === "rejected") {
            emailSubject = "Account Status Update - ParkQueue";
            emailMessage = `
                <p>We regret to inform you that your account request has been <strong>rejected</strong>.</p>
                ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
                <p>Please contact the administrator for more information or to resubmit your application.</p>
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
                        
                        <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #1f8012; margin: 20px 0;">
                            <h3>Account Details:</h3>
                            <p><strong>Name:</strong> ${studentName || 'N/A'}</p>
                            <p><strong>Email:</strong> ${studentEmail}</p>
                            <p><strong>Status:</strong> <span style="color: ${status === 'approved' ? '#1f8012' : '#dc3545'}; font-weight: bold;">${status.toUpperCase()}</span></p>
                            <p><strong>Processed by:</strong> ${adminName || 'Administrator'}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        
                        <p>If you have any questions, please contact the school administration.</p>
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            This is an automated message. Please do not reply.
                        </p>
                    </div>
                </div>
            `
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Approval email sent successfully! Message ID: ${info.messageId}`);
        console.log(`📤 Response from Gmail: ${info.response}`);
        
        res.json({
            success: true,
            message: "Approval email sent successfully",
            messageId: info.messageId,
            response: info.response
        });
        
    } catch (error) {
        console.error("❌ Approval email sending failed:", error);
        console.error("Error stack:", error.stack);
        
        res.status(500).json({
            success: false,
            message: "Failed to send approval email",
            error: error.message,
            errorCode: error.code,
            errorStack: error.stack
        });
    }
});

// ✅ QR SCAN EMAIL ENDPOINT
app.post("/api/send-parking-email", async (req, res) => {
    console.log("📨 Parking Email API called at:", new Date().toISOString());
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
        const { studentEmail, studentName, action, parkingSlot } = req.body;
        
        if (!studentEmail) {
            return res.status(400).json({
                success: false,
                message: "studentEmail is required"
            });
        }
        
        console.log(`📧 Attempting to send parking email to: ${studentEmail}`);
        console.log(`Action: ${action}, Name: ${studentName}, Slot: ${parkingSlot}`);
        
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
                        
                        <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #1f8012; margin: 20px 0;">
                            <h3>Details:</h3>
                            <p><strong>Action:</strong> ${action === "entry" ? "Entry" : "Exit"}</p>
                            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                            ${parkingSlot ? `<p><strong>Parking Slot:</strong> ${parkingSlot}</p>` : ''}
                        </div>
                        
                        <p>Thank you for using ParkQueue!</p>
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            This is an automated message. Please do not reply.
                        </p>
                    </div>
                </div>
            `
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Parking email sent successfully! Message ID: ${info.messageId}`);
        console.log(`📤 Response from Gmail: ${info.response}`);
        
        res.json({
            success: true,
            message: "Email sent successfully",
            messageId: info.messageId,
            response: info.response
        });
        
    } catch (error) {
        console.error("❌ Email sending failed:", error);
        console.error("Error stack:", error.stack);
        
        res.status(500).json({
            success: false,
            message: "Failed to send email",
            error: error.message,
            errorCode: error.code,
            errorStack: error.stack
        });
    }
});

// Test endpoint
app.get("/api/test-parking-email", async (req, res) => {
    try {
        console.log("🧪 Testing email service...");
        
        const testMailOptions = {
            from: '"ParkQueue Test" <kenightgallaza@gmail.com>',
            to: 'kenightgallaza@gmail.com',
            subject: 'Test Email from ParkQueue',
            text: 'This is a test email from ParkQueue parking system.',
            html: '<p>This is a <b>test email</b> from ParkQueue parking system.</p>'
        };
        
        const info = await transporter.sendMail(testMailOptions);
        
        console.log(`✅ Test email sent: ${info.messageId}`);
        console.log(`📤 Response: ${info.response}`);
        
        res.json({
            success: true,
            message: "Test email sent successfully!",
            messageId: info.messageId,
            response: info.response,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("❌ Test email failed:", error);
        res.status(500).json({
            success: false,
            message: "Test email failed",
            error: error.message,
            errorCode: error.code
        });
    }
});

// Simple health check
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "ParkQueue Email Service",
        timestamp: new Date().toISOString(),
        port: PORT,
        emailConfigured: !!transporter
    });
});

// Root endpoint
app.get("/", (req, res) => {
    res.send(`
        <h1>ParkQueue Email Service</h1>
        <p>Service is running on port ${PORT}</p>
        <ul>
            <li><a href="/health">Health Check</a></li>
            <li><a href="/api/test-parking-email">Test Email</a></li>
        </ul>
        <h3>Available Endpoints:</h3>
        <pre>
POST /api/send-approval-email  (NEW - for student approvals)
POST /api/send-parking-email   (for QR scan notifications)
GET  /api/test-parking-email   (test endpoint)
GET  /health                   (health check)
        </pre>
    `);
});

// 404 handler
app.use((req, res) => {
    console.log(`404: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        requestedUrl: req.url,
        method: req.method
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
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`📧 ParkQueue Email Server`);
    console.log(`=================================`);
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📮 Email: kenightgallaza@gmail.com`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`📤 POST to: http://localhost:${PORT}/api/send-approval-email`);
    console.log(`📤 POST to: http://localhost:${PORT}/api/send-parking-email`);
    console.log(`🧪 Test: http://localhost:${PORT}/api/test-parking-email`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
    console.log(`=================================`);
});