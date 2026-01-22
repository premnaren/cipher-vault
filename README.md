# 🔐 CIPHER VAULT | Secure Uplink Terminal

> **Zero-Knowledge Communication & Encrypted Storage System**

![Project Status](https://img.shields.io/badge/Status-Active_Development-green)
![Security](https://img.shields.io/badge/Security-End--to--End_Encrypted-blue)
![License](https://img.shields.io/badge/License-MIT-purple)

## 📡 Transmission Incoming...

**Cipher Vault** is a web-based secure communication platform designed with a "Void/Matrix" terminal aesthetic. It prioritizes user privacy by implementing **Client-Side Encryption**.

Unlike traditional chat apps, Cipher Vault uses a **Zero-Knowledge Architecture**: keys are generated in your browser and never stored plainly on the server. The server acts only as a relay for encrypted data—it cannot read your messages or see your files.

---

## 🖥️ Interface Uplink

| Secure Chat (RSA) | The Vault (Storage) |
|:---:|:---:|
| ![Chat UI](path/to/screenshot_chat.png) | ![Vault UI](path/to/screenshot_vault.png) |
> *Visualized: Void Theme running on Secure Channel*

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Tailwind CSS (CDN), Vanilla JavaScript.
* **Encryption Engine:**
    * `JSEncrypt` (RSA Asymmetric Key Exchange).
    * `CryptoJS` (AES & Classical Ciphers).
* **Backend:** Node.js & Express.
* **Real-Time Protocol:** Socket.io (WebSockets).
* **Database:** MongoDB (via Mongoose).
* **Authentication:** JWT (JSON Web Tokens).

---

## ⚡ Key Features

### 💬 Secure Uplink (Chat)
* **RSA Military Grade Encryption:** Messages are locked with the recipient's public key. Only the intended recipient can unlock them.
* **Auto-Key Exchange:** The "Phonebook Protocol" automatically syncs public keys via the database, ensuring seamless connection without manual handshakes.
* **Burn-On-Read:** Optional self-destruct timer that wipes messages from the server and client after 10 seconds.
* **Local Caching:** Sender sees their own messages instantly via secure local cache, while the server only sees cipher text.

### 🔒 The Vault (Storage)
* **Encrypted File Ingestion:** Upload documents and images securely.
* **Access Control:** Files are token-gated; only the owner can list, download, or delete them.
* **Visual Dashboard:** A cyberpunk file explorer interface.

### 🎛️ Encryption Terminal (Tools)
* **Learning Library:** Interactive tools to learn and test classical ciphers (Caesar, Pigpen, Vigenère).
* **Visual Output:** See how plain text transforms into cipher text in real-time.

---

## ⚠️ Maintenance & Roadmap Notice

> **🚧 SYSTEM ALERT: UNDER ACTIVE CONSTRUCTION**
>
> Please be aware that Cipher Vault is currently in a **Beta State**. You may encounter the following limitations:
>
> 1.  **Encryption Library:** The sidebar educational modules (Atbash, Rail Fence details) are currently static and under maintenance. Full interactive tutorials are coming soon.
> 2.  **Mobile Responsiveness:** The UI is currently optimized for Desktop/Tablet terminals. Mobile layouts are being refactored.
> 3.  **Group Chat:** Currently supports 1-on-1 direct messaging only. Multi-agent channels are in development.
> 4.  **Key Cycling:** If you clear your browser cache, you generate a new identity. Old messages sent to your previous identity will become permanently unreadable (security feature).

---

## 🚀 Initialization (How to Run)

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/cipher-vault.git](https://github.com/yourusername/cipher-vault.git)
cd cipher-vault
2. Install Dependencies
Initialize the node modules:

Bash

npm install
3. Configure Environment
Create a .env file in the root directory and add your secrets:

Code snippet

PORT=10000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_super_secret_jwt_key
4. Deploy System
Start the server:

Bash

npm start
# OR for development with auto-restart:
npm run dev
5. Access Terminal
Open your browser and navigate to: http://localhost:10000

🕵️ Usage Guide
Register Identity: Create a unique Agent ID (Username) and Password.

Login: The system will automatically generate your RSA Key Pair (Public/Private) and sync your Public Lock to the Secure Phonebook.

Secure Chat:

Navigate to Secure Chat.

Select an Agent from the sidebar.

Choose RSA (Military Grade) from the protocol dropdown.

Type and Send.

Vault:

Click Secure Vault on the dashboard.

Upload sensitive files.

Use the "Access" button to view decrypted files or "Delete" to wipe them.

🔧 Troubleshooting
"Decryption Error" Popup? If you see decryption errors immediately after a restart or login, your local identity keys might be out of sync with the database.

Fix: Logout → Clear Browser Local Storage (DevTools > Application > Clear) → Login again to regenerate a fresh identity.

🤝 Contributing
Contributions are welcome. Please fork the repository and submit a pull request for review.

Current Priority: Fixing the educational sidebar modules and improving mobile CSS.

⚖️ Disclaimer: This is a proof-of-concept prototype designed for educational purposes. While it uses real cryptographic libraries (AES/RSA), it has not undergone a professional security audit. Use for sensitive data at your own risk.

System Status: ONLINE 🟢
