const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  // Array of usernames or User IDs involved in the chat
  members: {
    type: [String], 
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Conversation", ConversationSchema);