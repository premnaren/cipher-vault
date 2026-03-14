const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- REGISTER LOGIC ---
router.post('/register', async (req, res) => {
    try {
        const userExist = await User.findOne({ username: req.body.username });
        if(userExist) return res.status(400).json({ message: "Username already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const user = new User({
            username: req.body.username,
            password: hashedPassword,
            setupComplete: true // Standard registration completes setup immediately
        });
        
        await user.save();
        res.json({ message: "Registration Successful" });
    } catch (err) {
        res.status(500).json({ message: "Server Error during registration" });
    }
});

// --- LOGIN LOGIC ---
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if(!user) return res.status(400).json({ message: "User not found" });

        const validPass = await bcrypt.compare(req.body.password, user.password);
        if(!validPass) return res.status(400).json({ message: "Invalid password" });

        const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET);
        res.json({ token: token, setupComplete: user.setupComplete });
    } catch (err) {
        res.status(500).json({ message: "Server Error during login" });
    }
});

// --- GOOGLE OAUTH ROUTE ---
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        let user = await User.findOne({ email: payload.email });
        
        if (!user) {
            const tempUsername = payload.email.split('@')[0];
            const randomPassword = crypto.randomBytes(16).toString('hex'); 
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);
            
            user = new User({
                username: tempUsername,
                email: payload.email,
                password: hashedPassword,
                setupComplete: false 
            });
            await user.save();
        }

        const token = jwt.sign(
            { _id: user._id, username: user.username }, 
            process.env.JWT_SECRET
        );
        
        res.status(200).json({ 
            token, 
            setupComplete: user.setupComplete, 
            message: "Google Auth successful" 
        });
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(400).json({ message: "Invalid Google Security Token" });
    }
});

// --- NEW: ALIAS UPDATE ROUTE ---
// This handles users picking their custom codename after Google Login
router.post('/update-alias', async (req, res) => {
    try {
        const token = req.header('auth-token');
        if (!token) return res.status(401).json({ message: "Unauthorized Entry" });

        // Verify the user session
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const { newUsername } = req.body;

        // Check if the chosen codename is already taken
        const nameTaken = await User.findOne({ username: newUsername });
        if (nameTaken) return res.status(400).json({ message: "Alias already claimed by another agent." });

        // Update user and finalize setup
        const updatedUser = await User.findByIdAndUpdate(
            verified._id, 
            { username: newUsername, setupComplete: true },
            { new: true }
        );

        // We issue a NEW token with the updated username so the frontend is current
        const newToken = jwt.sign(
            { _id: updatedUser._id, username: updatedUser.username }, 
            process.env.JWT_SECRET
        );

        res.json({ token: newToken, message: "Identity Finalized." });
    } catch (err) {
        res.status(400).json({ message: "Session Expired or Invalid." });
    }
});

module.exports = router;