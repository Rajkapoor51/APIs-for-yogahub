const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const router = express.Router();
const serverless = require('serverless-http');
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const SECRET_KEY = 'rajakpor';

// CORS Configuration
const corsOptions = {
  origin: 'https://hobenhozenyoga.org',
  credentials: true,
  optionSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

const offers = [];
let idCounter = 1;

const images = {}; 

// Serve static files from 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Database Connection
mongoose.connect('mongodb+srv://rajkapoor:WBicsmdqMPeXsedY@bga-pay.hbtsf.mongodb.net/bga-pay?retryWrites=true&w=majority&appName=BGA-PAY', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true }
});

const User = mongoose.model('User', userSchema);

// Multer Storage Setup for Image Uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/images/"); // Save images to 'uploads/images' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/offers/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/videos/"); // Save videos to 'uploads/videos' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

// Initialize multer upload middleware for single file
const uploadImage = multer({ storage: imageStorage });
const uploadVideo = multer({ storage: videoStorage });
const upload = multer({ storage });


// API: Register User
router.post('/register', async (req, res) => {
  try {
    const { name, password, email } = req.body;
    const existingUser = await User.findOne({ $or: [{ username: name }, { email }] });

    if (existingUser) {
      return res.json({ message: 'Username or email already exists' });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username: name,
        password: hashedPassword,
        email
      });

      await user.save();
      res.status(201).json({ message: 'User registered successfully' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const token = jwt.sign(
      { userId: existingUser._id, email: existingUser.email },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ message: 'Logged in successfully.', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// API: Upload Image
router.post("/upload-image", uploadImage.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded!" });
  }

  res.json({
    message: "Image uploaded successfully!",
    imageUrl: `https://yogahubapis.netlify.app/uploads/images/${req.file.filename}`
  });
});

// API: Upload Video
router.post("/upload-video", uploadVideo.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No video file uploaded!" });
  }

  res.json({
    message: "Video uploaded successfully!",
    videoUrl: `https://yogahubapis.netlify.app/uploads/videos/${req.file.filename}`
  });
});

// API: Get All Uploaded Images
router.get("/images", (req, res) => {
  const directoryPath = path.join(__dirname, "..", "uploads/images");

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving images" });
    }

    const images = files.map(file => `https://yogahubapis.netlify.app/uploads/images/${file}`);
    res.json({ images });
  });
});

// API: Get All Uploaded Videos
router.get("/videos", (req, res) => {
  const directoryPath = path.join(__dirname, "..", "uploads/videos");

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving videos" });
    }

    const videos = files.map(file => `https://yogahubapis.netlify.app/uploads/videos/${file}`);
    res.json({ videos });
  });
});

// API: Remove Image
router.delete("/delete-image", (req, res) => {
  const { imageName } = req.body;

  if (!imageName) {
    return res.status(400).json({ message: "No image name provided" });
  }

  const imagePath = path.join(__dirname, "..", "uploads/images", imageName);

  fs.unlink(imagePath, (err) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting the image" });
    }

    res.json({ message: "Image deleted successfully" });
  });
});

// API: Remove Video
router.delete("/delete-video", (req, res) => {
  const { videoName } = req.body;

  if (!videoName) {
    return res.status(400).json({ message: "No video name provided" });
  }

  const videoPath = path.join(__dirname, "..", "uploads/videos", videoName);

  fs.unlink(videoPath, (err) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting the video" });
    }

    res.json({ message: "Video deleted successfully" });
  });
});


router.post("/add-offer", upload.single("image"), (req, res) => {
  const { title, description, discount } = req.body;
  const imageUrl = req.file ? `https://yogahubapis.netlify.app/uploads/offers/${req.file.filename}` : ""; // Empty if no image

  if (!title || !description || !discount) {
    return res.status(400).json({ success: false, message: "Title, description, and discount are required." });
  }

  const newOffer = {
    id: idCounter++, 
    title, 
    description, 
    discount: parseInt(discount, 10), // Ensure it's a number
    image: imageUrl,
    created_at: new Date().toISOString() // Automatically store current date and time
  };

  offers.push(newOffer);

  res.json({ success: true, offer: newOffer });
});


// Get all offers API
router.get("/get-offers", (req, res) => {
  res.json({ offers });
});

// Delete offer API
router.delete("/delete-offer/:id", (req, res) => {
  const offerId = parseInt(req.params.id);
  const index = offers.findIndex(o => o.id === offerId);
  if (index !== -1) {
    offers.splice(index, 1);
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Offer not found" });
  }
});


app.use("/api", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports.handler = serverless(app);
