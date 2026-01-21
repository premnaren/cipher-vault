const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message"); 
const User = require("./models/User");       

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
// app.use("/api/vault", require("./routes/vault")); // Commented out if you don't use vault yet

// --- 1. API TO GET ALL USERS (The Phonebook) ---
app.get("/api/users", async (req, res) => {
    try {
        // Return id, username, AND publicKey
        const users = await User.find({}, "username _id publicKey"); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// --- 2. UPDATE MY PUBLIC KEY (The Sync) ---
app.post("/api/users/key", async (req, res) => {
    const { userId, publicKey } = req.body;
    try {
        await User.findByIdAndUpdate(userId, { publicKey: publicKey });
        res.json({ message: "Key Updated Successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update key" });
    }
});

// --- 3. GET CHAT HISTORY ---
app.get("/api/messages/:senderId/:receiverId", async (req, res) => {
    try {
        const { senderId, receiverId } = req.params;
        const messages = await Message.find({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        }).sort({ timestamp: 1 }); // Oldest first
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// Serve HTML pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public/chat.html")));
app.use(express.static(path.join(__dirname, "public")));

// --- TRACK ONLINE USERS ---
let onlineUsers = new Map(); // Stores { userId: socketId }

// --- SOCKET LOGIC ---
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // 1. Handle User Login
  socket.on("login", (userId) => {
    if (userId) {
        onlineUsers.set(userId, socket.id);
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
    const { senderId, receiverId, text, cipherType, isBurn } = data;
    
    try {
        const newMessage = new Message({ 
            sender: senderId, 
            receiver: receiverId, 
            text, 
            cipherType, 
            isBurn: isBurn || false 
        });
        const savedMsg = await newMessage.save();

        const msgData = { ...data, _id: savedMsg._id };

        const roomName = [senderId, receiverId].sort().join("_");
        io.to(roomName).emit("receive_message", msgData);

        // --- SELF DESTRUCT LOGIC ---
        if (isBurn) {
            console.log(`💣 BURN TIMER STARTED: Message ${savedMsg._id}`);
            setTimeout(async () => {
                await Message.deleteOne({ _id: savedMsg._id });
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
    for (let [id, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(id);
        break;
      }
    }
    io.emit("get_users", Array.from(onlineUsers.keys()));
    console.log("User Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));