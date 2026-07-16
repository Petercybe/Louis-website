import express from "express";
import nodemailer from "nodemailer";
import Message from "../models/Message.js";

const router = express.Router();

// Setup Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Set these in your .env file
        pass: process.env.EMAIL_PASS  // Use App Password
    }
});

router.post("/", async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: "Name, email and message are all required." });
    }

    // Save to the database FIRST — this is the source of truth for the admin
    // Messages tab. Email delivery is a nice-to-have notification on top of
    // that, so a failed/misconfigured email must never lose the message.
    let saved;
    try {
        saved = await Message.create({ name, email, message });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }

    try {
        await transporter.sendMail({
            // Gmail's SMTP rejects mail sent "from" an address it didn't
            // authenticate as, so we send from our own account and put the
            // visitor's address in replyTo instead — hitting "Reply" still
            // goes straight to them.
            from: `"${name} (via portfolio)" <${process.env.EMAIL_USER}>`,
            replyTo: email,
            to: process.env.EMAIL_USER,
            subject: `Portfolio Message from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\n\nMessage: ${message}`
        });
        saved.emailSent = true;
        await saved.save();
    } catch (error) {
        // Email failed (e.g. EMAIL_USER/EMAIL_PASS not set up yet) — the
        // message is already safely stored, so don't fail the request.
        console.error("⚠️ Contact email failed to send (message was still saved):", error.message);
    }

    res.status(200).json({ message: "Message sent successfully!" });
});

export default router;