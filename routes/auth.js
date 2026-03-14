const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- 1. ADD THESE GOOGLE REQUIREMENTS AT THE TOP ---
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// REGISTER LOGIC
router.post('/register', async (req, res) => {
    try {
        const emailExist = await User.findOne({ username: req.body.username });
        if(emailExist) return res.status(400).json({ error: "Username already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const user = new User({
            username: req.body.username,
            password: hashedPassword
        });
        
        await user.save();
        res.json({ message: "Registration Successful" });
    } catch (err) {
        res.status(500).json({ error: "Server Error during registration" });
    }
});

// LOGIN LOGIC
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if(!user) return res.status(400).json({ error: "User not found" });

        const validPass = await bcrypt.compare(req.body.password, user.password);
        if(!validPass) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET);
        res.header('auth-token', token).json({ token: token });
    } catch (err) {
        res.status(500).json({ error: "Server Error during login" });
    }
});

// --- 2. PASTE THE GOOGLE OAUTH ROUTE HERE ---
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        // Verify the token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        // Generate username from email
        const generatedUsername = payload.email.split('@')[0];

        // Check if user already exists
        let user = await User.findOne({ username: generatedUsername });
        
        if (!user) {
            // Random password for the DB (never used by the user)
            const randomPassword = crypto.randomBytes(16).toString('hex'); 
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);
            
            user = new User({
                username: generatedUsername,
                password: hashedPassword 
            });
            await user.save();
        }

        // Generate standard CryptPact JWT
        // Note: Adding username to payload so your Terminal knows who is logged in
        const token = jwt.sign(
            { _id: user._id, username: user.username }, 
            process.env.JWT_SECRET
        );
        
        res.status(200).json({ token, message: "Google Auth successful" });
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(400).json({ message: "Invalid Google Security Token" });
    }
});

module.exports = router;