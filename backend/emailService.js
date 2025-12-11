const nodemailer = require('nodemailer');

// Configure your email service (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use another service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password' // Use app password for Gmail
  }
});

// Email templates
const emailTemplates = {
  parkingEntry: (userData) => ({
    subject: 'Parking Entry Confirmed - ParkQueue',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f8012;">Parking Entry Confirmed</h2>
        <p>Hello ${userData.name},</p>
        <p>Your parking entry has been successfully recorded.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Parking Details:</h3>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Plate Number:</strong> ${userData.plateNumber || 'N/A'}</p>
          <p><strong>Vehicle Type:</strong> ${userData.vehicleType || 'Motorcycle'}</p>
          <p><strong>Location:</strong> School Parking Area</p>
        </div>
        
        <p>Thank you for using ParkQueue!</p>
        <p style="color: #666; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `
  }),

  parkingExit: (userData, duration) => ({
    subject: 'Parking Exit Confirmed - ParkQueue',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f8012;">Parking Exit Confirmed</h2>
        <p>Hello ${userData.name},</p>
        <p>Your parking exit has been successfully recorded.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Parking Summary:</h3>
          <p><strong>Entry Time:</strong> ${userData.entryTime}</p>
          <p><strong>Exit Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Duration:</strong> ${duration} minutes</p>
          <p><strong>Plate Number:</strong> ${userData.plateNumber || 'N/A'}</p>
          <p><strong>Total Parking Slots Available:</strong> ${userData.availableSlots}</p>
        </div>
        
        <p>Thank you for using ParkQueue!</p>
        <p style="color: #666; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `
  }),

  adminNotification: (userData, action) => ({
    subject: `Parking ${action === 'entry' ? 'Entry' : 'Exit'} Alert`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Parking System Notification</h2>
        <p>A user has ${action === 'entry' ? 'entered' : 'exited'} the parking area.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">User Details:</h3>
          <p><strong>Name:</strong> ${userData.name}</p>
          <p><strong>Student ID:</strong> ${userData.studentId}</p>
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Plate Number:</strong> ${userData.plateNumber}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Action:</strong> ${action === 'entry' ? 'Entry' : 'Exit'}</p>
        </div>
        
        <p>Current parking status:</p>
        <ul>
          <li>Available Slots: ${userData.availableSlots}</li>
          <li>Occupied Slots: ${userData.occupiedSlots}</li>
          <li>Total Slots: ${userData.totalSlots}</li>
        </ul>
      </div>
    `
  })
};

// Function to send email
const sendEmail = async (to, templateName, data) => {
  try {
    const template = emailTemplates[templateName](data);
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'parkqueue@yourdomain.com',
      to: to,
      subject: template.subject,
      html: template.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };