const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message"); // Import the new model
const User = require("./models/User");       // Import User model

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/vault", require("./routes/vault"));

// --- NEW: API TO GET ALL USERS (CONTACT LIST) ---
app.get("/api/users", async (req, res) => {
    try {
        // Return id and username of all users
        const users = await User.find({}, "username _id"); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// --- NEW: API TO GET CHAT HISTORY BETWEEN TWO USERS ---
app.get("/api/messages/:user1/:user2", async (req, res) => {
    try {
        const { user1, user2 } = req.params;
        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// Serve HTML pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public/chat.html")));
app.use(express.static(path.join(__dirname, "public")));

// --- UPDATED SOCKET LOGIC FOR PRIVATE CHAT ---
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // 1. Join a Private Room
  socket.on("join_room", ({ senderId, receiverId }) => {
    // Create a unique room name by sorting IDs (so A->B and B->A use same room)
    const roomName = [senderId, receiverId].sort().join("_");
    socket.join(roomName);
    console.log(`User ${senderId} joined room: ${roomName}`);
  });

  // 2. Handle Private Message
  socket.on("private_message", async (data) => {
    const { senderId, receiverId, text, cipherType } = data;
    
    // Save to Database
    try {
        const newMessage = new Message({ 
            sender: senderId, 
            receiver: receiverId, 
            text, 
            cipherType 
        });
        await newMessage.save();

        // Send to the specific room
        const roomName = [senderId, receiverId].sort().join("_");
        io.to(roomName).emit("receive_message", data);
        
    } catch (err) {
        console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));