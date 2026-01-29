const mongoose = require("mongoose");

const VaultFileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: { type: String, required: true }, // The random filename on disk
  originalName: { type: String, required: true }, // The real name (e.g. "passwords.txt")
  mimetype: { type: String }, // File type (e.g. image/png)
  path: { type: String, required: true },
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("VaultFile", VaultFileSchema);