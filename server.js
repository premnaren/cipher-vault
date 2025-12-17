const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http"); // New
const { Server } = require("socket.io"); // New
const Message = require("./models/Message"); // Import Message Model

// Load Config
dotenv.config();

const app = express();
const server = http.createServer(app); // Wrap Express
const io = new Server(server); // Init Socket

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/vault", require("./routes/vault"));
app.use("/api/chat", require("./routes/chatRoutes")); // New Chat Route

// ------------------------------------------
// 🔥 SOCKET.IO REAL-TIME LOGIC
// ------------------------------------------
io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Join a specific room (Global or Private)
    socket.on("join_room", (room) => {
        socket.join(room);
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
        // 1. Save to Database (So it's there when you reload)
        try {
            const newMessage = new Message({
                conversationId: data.room,
                sender: data.sender,
                text: data.text,
                cipherType: data.cipherType
            });
            await newMessage.save();
        } catch (err) {
            console.error("Error saving message:", err);
        }

        // 2. Send to everyone else in that room
        socket.to(data.room).emit("receive_message", data);
    });

    socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
    });
});
// ------------------------------------------

// Serve HTML pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public/chat.html"))); // New Page

const PORT = process.env.PORT || 5000;
// IMPORTANT: Change app.listen to server.listen
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});