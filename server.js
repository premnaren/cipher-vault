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
app.use("/api/vault", require("./routes/vault")); 

// --- 1. API TO GET ALL USERS (The Phonebook) ---
app.get("/api/users", async (req, res) => {
    try {
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
// Map stores <UserId, SocketId>
let onlineUsers = new Map(); 

// --- SOCKET LOGIC ---
io.on("connection", (socket) => {
  console.log("⚡ New Connection:", socket.id);

  // 1. Handle User Login (Map UserID -> SocketID)
  socket.on("login", (userId) => {
    if (userId) {
        onlineUsers.set(userId, socket.id);
        io.emit("get_users", Array.from(onlineUsers.keys())); // Tell everyone who is online
        console.log(`✅ User Logged In: ${userId} -> ${socket.id}`);
    }
  });

  // 2. Handle Private Message (Direct Routing)
  socket.on("private_message", async (data) => {
    const { senderId, receiverId, text, cipherType, isBurn } = data;
    
    try {
        // A. Save to Database
        const newMessage = new Message({ 
            sender: senderId, 
            receiver: receiverId, 
            text, 
            cipherType, 
            isBurn: isBurn || false 
        });
        const savedMsg = await newMessage.save();

        // Add the real DB ID to the data payload before sending
        const msgData = { ...data, _id: savedMsg._id };

        // B. Find Receiver's Socket ID
        const receiverSocketId = onlineUsers.get(receiverId);

        // C. Send to Receiver (Instant Update)
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("receive_message", msgData);
            console.log(`📨 Message sent to Receiver (${receiverId})`);
        } else {
            console.log(`⚠️ Receiver (${receiverId}) is offline. Message saved to DB.`);
        }

        // D. Send back to Sender (For other tabs/confirmation)
        socket.emit("receive_message", msgData);

        // --- SELF DESTRUCT LOGIC ---
        if (isBurn) {
            console.log(`💣 BURN TIMER STARTED: Message ${savedMsg._id}`);
            setTimeout(async () => {
                await Message.deleteOne({ _id: savedMsg._id });
                
                // Notify both parties to delete from UI
                if(receiverSocketId) io.to(receiverSocketId).emit("message_burnt", savedMsg._id);
                socket.emit("message_burnt", savedMsg._id);
                
                console.log(`💥 BOOM: Message ${savedMsg._id} destroyed.`);
            }, 10000); // 10 Seconds
        }
        
    } catch (err) {
        console.error("Error saving message:", err);
    }
  });

  // 3. Handle Disconnect
  socket.on("disconnect", () => {
    for (let [id, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(id);
        break;
      }
    }
    io.emit("get_users", Array.from(onlineUsers.keys())); // Update everyone's list
    console.log("❌ User Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));