const router = require('express').Router();
const multer = require('multer');       
const File = require('../models/File'); 
const jwt = require('jsonwebtoken');    
const path = require('path');
const fs = require('fs');

// --- DEBUG MIDDLEWARE: The "Loud Bouncer" ---
const verifyToken = (req, res, next) => {
    // 1. Log Request
    console.log("\n--- 🔒 SECURITY CHECK ---");
    console.log("Request URL:", req.originalUrl);
    
    // 2. Look for token in Header OR URL Query (for "Open" links)
    const token = req.header('auth-token') || req.query.token;
    console.log("Token sent:", token ? "YES (Found)" : "NO (Missing)");

    if(!token) {
        console.log("❌ Result: ACCESS DENIED (No ID Card)");
        return res.status(401).send('Access Denied');
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        console.log("✅ Result: ACCESS GRANTED for User ID:", verified._id);
        next();
    } catch (err) {
        console.log("❌ Result: INVALID TOKEN");
        res.status(400).send('Invalid Token');
    }
};

// --- STORAGE ENGINE ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Secure Rename: fieldname-timestamp.extension
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- ROUTE 1: Upload File ---
router.post('/upload', verifyToken, upload.single('vaultFile'), async (req, res) => {
    try {
        console.log("📂 Starting File Upload...");
        if(!req.file) return res.status(400).send({ message: "No file selected" });

        const file = new File({
            user: req.user._id, 
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            path: req.file.path,
            size: req.file.size
        });
        await file.save();
        console.log("💾 File saved to MongoDB!");
        res.json({ message: "File Encrypted & Stored Successfully" });
    } catch(err) {
        console.log("❌ Upload Error:", err);
        res.status(400).send(err);
    }
});

// --- ROUTE 2: Get Files ---
router.get('/myfiles', verifyToken, async (req, res) => {
    const files = await File.find({ user: req.user._id }).sort({ uploadDate: -1 });
    res.json(files);
});

// --- ROUTE 3: Download/Open File ---
router.get('/file/:filename', verifyToken, (req, res) => {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    res.sendFile(filePath);
});

// --- ROUTE 4: Delete File ---
router.delete('/delete/:id', verifyToken, async (req, res) => {
    try {
        // 1. Find file (ensure user owns it)
        const file = await File.findOne({ _id: req.params.id, user: req.user._id });
        if(!file) return res.status(404).json({ message: "File not found or Access Denied" });

        // 2. Delete from Disk
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        // 3. Delete from Database
        await File.deleteOne({ _id: req.params.id });
        
        console.log(`🗑️ File Deleted: ${file.originalName}`);
        res.json({ message: "File Deleted Permanently" });

    } catch(err) {
        console.log("❌ Delete Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;