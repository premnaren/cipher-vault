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

// --- UPDATED: GET ALL USERS (PLUS THEIR PUBLIC KEYS) ---
app.get("/api/users", async (req, res) => {
    try {
        // Return id, username, AND publicKey
        const users = await User.find({}, "username _id publicKey"); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// --- NEW: UPDATE MY PUBLIC KEY ---
app.post("/api/users/key", async (req, res) => {
    const { userId, publicKey } = req.body;
    try {
        await User.findByIdAndUpdate(userId, { publicKey: publicKey });
        res.json({ message: "Key Updated Successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update key" });
    }
});

// Serve HTML pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public/chat.html")));
app.use(express.static(path.join(__dirname, "public")));

// --- TRACK ONLINE USERS (New Map) ---
let onlineUsers = new Map(); // Stores { userId: socketId }

// --- UPDATED SOCKET LOGIC ---
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // 1. Handle User Login (Client announces "I am here")
  socket.on("login", (userId) => {
    if (userId) {
        onlineUsers.set(userId, socket.id);
        // Broadcast the new list of online user IDs to everyone
        io.emit("get_users", Array.from(onlineUsers.keys()));
        console.log(`User Logged In: ${userId}`);
    }
  });

  // 2. Join a Private Room
  socket.on("join_room", ({ senderId, receiverId }) => {
    const roomName = [senderId, receiverId].sort().join("_");
    socket.join(roomName);
  });

  // 3. Handle Private Message
  socket.on("private_message", async (data) => {
    const { senderId, receiverId, text, cipherType, isBurn } = data; // <--- Get isBurn flag
    
    try {
        const newMessage = new Message({ 
            sender: senderId, 
            receiver: receiverId, 
            text, 
            cipherType,
            isBurn: isBurn || false 
        });
        const savedMsg = await newMessage.save();

        // Add _id so frontend knows what to delete
        const msgData = { ...data, _id: savedMsg._id };

        // Send to the room
        const roomName = [senderId, receiverId].sort().join("_");
        io.to(roomName).emit("receive_message", msgData);

        // --- SPY LOGIC: SELF DESTRUCT ---
        if (isBurn) {
            console.log(`💣 BURN TIMER STARTED: Message ${savedMsg._id}`);
            setTimeout(async () => {
                // 1. Delete from Database
                await Message.deleteOne({ _id: savedMsg._id });
                // 2. Tell Frontend to remove it
                io.to(roomName).emit("message_burnt", savedMsg._id);
                console.log(`💥 BOOM: Message ${savedMsg._id} destroyed.`);
            }, 10000); // 10 Seconds
        }
        
    } catch (err) {
        console.error("Error saving message:", err);
    }
  });

  // 4. Handle Disconnect
  socket.on("disconnect", () => {
    // Find and remove the user who disconnected
    for (let [id, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(id);
        break;
      }
    }
    // Update everyone's list
    io.emit("get_users", Array.from(onlineUsers.keys()));
    console.log("User Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));