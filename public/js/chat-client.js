const socket = io();
const currentRoom = "Global"; // Default room
const username = localStorage.getItem("username") || "Anonymous"; // Grab from login if available

// Join the default room on load
socket.emit("join_room", currentRoom);

// Listen for incoming messages
socket.on("receive_message", (data) => {
    displayMessage(data, "received");
});

function sendMessage() {
    const input = document.getElementById("message-input");
    const cipher = document.getElementById("cipher-select").value;
    const msgText = input.value;

    if (msgText === "") return;

    const messageData = {
        room: currentRoom,
        sender: username,
        text: msgText,
        cipherType: cipher,
        time: new Date().toLocaleTimeString()
    };

    // 1. Send to Server (Socket)
    socket.emit("send_message", messageData);

    // 2. Display on my screen
    displayMessage(messageData, "sent");

    input.value = "";
}

function displayMessage(data, type) {
    const chatArea = document.getElementById("messages-area");
    const msgDiv = document.createElement("div");
    
    msgDiv.classList.add("message", type);
    msgDiv.innerHTML = `
        <small style="color: #ccc; font-size: 0.7em;">${data.sender} • ${data.cipherType}</small><br>
        ${data.text}
        <br><small style="font-size: 0.6em; opacity: 0.7;">${data.time || ""}</small>
    `;
    
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight; // Scroll to bottom
}