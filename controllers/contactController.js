const Contact = require("../models/Contact");
const sendEmail = require("../utils/sendEmail");
const { validationResult } = require("express-validator");

/**
 * @desc    Submit contact form
 * @route   POST /api/contact
 * @access  Public
 */
exports.submitContactForm = async (req, res) => {
    try {
        // 1. Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, subject, message } = req.body;

        // 2. Save to database
        const contact = await Contact.create({
            name,
            email,
            subject,
            message
        });

        // 3. Send Notification Email to Admin
        const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7fe;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #edf2f7;">
          <h2 style="color: #6c8eef; margin-top: 0;">New Contact Form Submission</h2>
          <p>You have received a new message from the Wings website contact form.</p>
          <hr style="border: none; border-top: 1px solid #edf2f7; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; color: #718096;"><strong>Name:</strong></td><td style="padding: 10px 0;">${name}</td></tr>
            <tr><td style="padding: 10px 0; color: #718096;"><strong>Email:</strong></td><td style="padding: 10px 0;">${email}</td></tr>
            <tr><td style="padding: 10px 0; color: #718096;"><strong>Subject:</strong></td><td style="padding: 10px 0;">${subject}</td></tr>
            <tr><td style="padding: 10px 0; color: #718096; vertical-align: top;"><strong>Message:</strong></td><td style="padding: 10px 0;">${message}</td></tr>
            <tr><td style="padding: 10px 0; color: #718096;"><strong>Date:</strong></td><td style="padding: 10px 0;">${new Date().toLocaleString()}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #edf2f7; margin: 20px 0;">
          <p style="font-size: 0.9rem; color: #a0aec0; text-align: center;">Wings Toys Admin Dashboard</p>
        </div>
      </div>
    `;

        await sendEmail({
            to: "wingstoys7@gmail.com",
            subject: `New Contact Submission: ${subject}`,
            html: adminEmailHtml
        });

        // 4. Send Confirmation Email to User
        const userEmailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7fe;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #edf2f7;">
          <h2 style="color: #6c8eef; margin-top: 0;">Hi ${name},</h2>
          <p>Thank you for reaching out to Wings Toys! We have received your message and our team will get back to you shortly.</p>
          <hr style="border: none; border-top: 1px solid #edf2f7; margin: 20px 0;">
          <p><strong>Your Message Summary:</strong></p>
          <blockquote style="background: #f8f9fd; padding: 15px; border-left: 4px solid #6c8eef; margin: 10px 0; color: #4a5568;">
            ${message}
          </blockquote>
          <hr style="border: none; border-top: 1px solid #edf2f7; margin: 20px 0;">
          <p>Best Regards,<br><strong>Wings Toys Team</strong></p>
          <p style="font-size: 0.8rem; color: #a0aec0; text-align: center; margin-top: 30px;">
            &copy; ${new Date().getFullYear()} Wings Toys. All rights reserved.
          </p>
        </div>
      </div>
    `;

        await sendEmail({
            to: email,
            subject: "We've received your message - Wings Toys",
            html: userEmailHtml
        });

        res.status(200).json({ success: true, message: "Message sent successfully" });

    } catch (error) {
        console.error("CONTACT_SUBMIT_ERROR:", error);
        res.status(500).json({ success: false, message: "Server Error. Failed to send message." });
    }
};
