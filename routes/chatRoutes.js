const router = require("express").Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// 1. Get all messages for a specific conversation (Room)
router.get("/:conversationId", async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 2. Create or Get a Conversation between two users
router.post("/conversation", async (req, res) => {
  const { senderId, receiverId } = req.body;
  
  try {
    // Check if conversation already exists
    const conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    });

    if (conversation) {
      return res.status(200).json(conversation);
    }

    // If not, create new one
    const newConversation = new Conversation({
      members: [senderId, receiverId],
    });
    const savedConversation = await newConversation.save();
    res.status(200).json(savedConversation);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;