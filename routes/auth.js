const express = require("express");
const crypto = require("crypto"); // Import the crypto module
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Middleware to verify session tokens
const authMiddleware = async (req, res, next) => {
  const authorizationHeader = req.header("Authorization");
  console.log("Authorization Header:", authorizationHeader); // Log the raw header

  if (!authorizationHeader) {
    return res.status(401).json({ message: "Unauthorized: Missing Authorization header" });
  }

  const sessionToken = authorizationHeader.replace("Bearer ", "").trim();
  console.log("Session Token Received:", sessionToken); // Log the token received from the client

  if (!sessionToken) {
    return res.status(401).json({ message: "Unauthorized: Missing session token" });
  }

  try {
    const user = await User.findOne({ sessionToken });
    console.log("User Found:", user); // Log the user object or null if not found

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: Invalid session token" });
    }

    req.user = user; // Attach user to request
    next();
  } catch (err) {
    console.error("Error in authMiddleware:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Endpoint to fetch user ID
router.get("/get-user-id", authMiddleware, async (req, res) => {
  try {
    // The user is already authenticated and available in `req.user` from the authMiddleware
    const userId = req.user._id; // Get the user's ID
    res.json({ userId });
  } catch (err) {
    console.error("Error fetching user ID:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    console.log("Signup Password Input:", password);

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed Password for Signup:", hashedPassword);

    const sessionToken = crypto.randomBytes(64).toString("hex");

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      sessionToken,
    });

    await newUser.save();
    res.status(201).json({ sessionToken });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log("User Found:", user);

    if (!user) return res.status(400).json({ message: "User not found" });

    console.log("Plain Password Input:", password);
    console.log("Hashed Password in DB:", user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password Match:", isMatch);

    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const sessionToken = crypto.randomBytes(64).toString("hex");
    user.sessionToken = sessionToken;
    await user.save();
    console.log("Session Token Saved:", sessionToken);

    res.json({ sessionToken });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
