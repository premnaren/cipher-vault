const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER LOGIC
router.post('/register', async (req, res) => {
    try {
        // 1. Check if user exists
        const emailExist = await User.findOne({ username: req.body.username });
        if(emailExist) return res.status(400).json({ error: "Username already exists" });

        // 2. Hash the password (scramble it)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        // 3. Create user
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
        // 1. Check if user exists
        const user = await User.findOne({ username: req.body.username });
        if(!user) return res.status(400).json({ error: "User not found" });

        // 2. Check password
        const validPass = await bcrypt.compare(req.body.password, user.password);
        if(!validPass) return res.status(400).json({ error: "Invalid password" });

        // 3. Create and assign a Token (The "Digital ID Card")
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        res.header('auth-token', token).json({ token: token });

    } catch (err) {
        res.status(500).json({ error: "Server Error during login" });
    }
});

module.exports = router;