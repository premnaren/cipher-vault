const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true, 
        minlength: 3 
    },
    password: { 
        type: String, 
        required: true, 
        minlength: 6 
    },
    // Used for the chat's cryptographic features later
    publicKey: { 
        type: String, 
        default: "" 
    },
    // NEW: Helps us track if they need to be sent to the "Alias Setup" screen
    setupComplete: { 
        type: Boolean, 
        default: false 
    },
    // NEW: Good practice to store the email for OAuth users
    email: { 
        type: String, 
        unique: true, 
        sparse: true // Allows multiple users to have NO email, but if they DO, it must be unique
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('User', UserSchema);