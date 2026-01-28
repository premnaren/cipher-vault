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

// --- API ENDPOINTS ---
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find({}, "username _id publicKey"); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

app.post("/api/users/key", async (req, res) => {
    const { userId, publicKey } = req.body;
    try {
        await User.findByIdAndUpdate(userId, { publicKey: publicKey });
        res.json({ message: "Key Updated Successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update key" });
    }
});

app.get("/api/messages/:senderId/:receiverId", async (req, res) => {
    try {
        const { senderId, receiverId } = req.params;
        const messages = await Message.find({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// Serve Frontend
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public/chat.html")));
app.use(express.static(path.join(__dirname, "public")));

// --- SOCKET LOGIC ---
let onlineUsers = new Map(); 

io.on("connection", (socket) => {
  console.log("⚡ New Connection:", socket.id);

  socket.on("login", (userId) => {
    if (userId) {
        onlineUsers.set(userId, socket.id);
        io.emit("get_users", Array.from(onlineUsers.keys()));
        console.log(`✅ User Logged In: ${userId}`);
    }
  });

  // --- HANDLE MESSAGE ---
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
        const receiverSocketId = onlineUsers.get(receiverId);

        // Send to Receiver
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("receive_message", msgData);
        }
        // Send back to Sender
        socket.emit("receive_message", msgData);

        // NOTE: We DO NOT start the delete timer here anymore.
        // We wait for the 'message_seen' event from the receiver.
        
    } catch (err) {
        console.error("Error saving message:", err);
    }
  });

  // --- HANDLE BURN ON READ ---
  socket.on("message_seen", async (msgId) => {
      try {
          const msg = await Message.findById(msgId);
          if(msg && msg.isBurn) {
              console.log(`🔥 RECIPIENT VIEWED ${msgId}. STARTING 10s TIMER.`);
              
              // Wait 10 seconds, then delete from DB and notify clients
              setTimeout(async () => {
                  await Message.deleteOne({ _id: msgId });
                  io.emit("message_burnt", msgId); // Tell all clients to remove it from UI
                  console.log(`💥 BOOM: Message ${msgId} destroyed.`);
              }, 10000);
          }
      } catch(e) { console.error(e); }
  });

  socket.on("disconnect", () => {
    for (let [id, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(id);
        break;
      }
    }
    io.emit("get_users", Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));