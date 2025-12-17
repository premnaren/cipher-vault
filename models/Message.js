const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  sender: { type: String, required: true },
  text: { type: String, required: true },
  
  // Educational Feature: Shows which cipher was used (AES, Caesar, etc.)
  cipherType: { 
    type: String, 
    default: "Plain" 
  }
}, { timestamps: true });

module.exports = mongoose.model("Message", MessageSchema);