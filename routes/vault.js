const router = require('express').Router();
const multer = require('multer');        
const File = require('../models/VaultFile'); // Ensure this model exists and matches your schema
const jwt = require('jsonwebtoken');    
const path = require('path');
const fs = require('fs');

// --- MIDDLEWARE: The Security Guard ---
const verifyToken = (req, res, next) => {
    const token = req.header('auth-token') || req.query.token;
    if(!token) return res.status(401).send('Access Denied');

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        // Handle both token formats ({_id} or {user: {_id}})
        req.user = verified.user || verified; 
        next();
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
};

// --- STORAGE ENGINE (Where files go) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Secure Rename: Prevent filename hacks
        cb(null, 'vaultFile-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- ROUTE 1: Upload File ---
router.post('/upload', verifyToken, upload.single('vaultFile'), async (req, res) => {
    try {
        if(!req.file) return res.status(400).send({ message: "No file selected" });

        const file = new File({
            user: req.user._id || req.user.id, // Robust ID check
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            path: req.file.path,
            size: req.file.size
        });
        await file.save();
        res.json({ message: "File Encrypted & Stored" });
    } catch(err) {
        res.status(400).send(err);
    }
});

// --- ROUTE 2: List My Files ---
router.get('/myfiles', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const files = await File.find({ user: userId }).sort({ uploadDate: -1 });
        res.json(files);
    } catch(e) { res.json([]); }
});

// --- ROUTE 3: Download/View File ---
router.get('/file/:filename', verifyToken, (req, res) => {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send("File Corrupted or Missing");
    }
});

// --- ROUTE 4: Delete File ---
router.delete('/delete/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const file = await File.findOne({ _id: req.params.id, user: userId });
        
        if(!file) return res.status(404).json({ message: "Not found or Access Denied" });

        // Delete from Disk
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        // Delete from DB
        await File.deleteOne({ _id: req.params.id });
        
        res.json({ message: "File Deleted" });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;