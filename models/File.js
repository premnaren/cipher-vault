const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    // This links the file to the User who uploaded it
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    originalName: String,  // The real name (e.g., "my_photo.jpg")
    filename: String,      // The secure system name (e.g., "172344583.jpg")
    mimetype: String,      // Type of file (image/png, video/mp4)
    path: String,          // Where it lives on disk
    size: Number,
    uploadDate: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('File', FileSchema);