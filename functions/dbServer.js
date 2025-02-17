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
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");


cloudinary.config({
  cloud_name: "dkss75pdn",
  api_key: "923284762234956",
  api_secret: "Pfz_9rdD34UbcTfHsbQVhoXb8LI"
});

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
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "images",  // Save images in 'images/' folder
    allowed_formats: ["jpg", "png", "jpeg"],
    resource_type: "image"
  }
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "images",  // Save images in 'images/' folder
    allowed_formats: ["jpg", "png", "jpeg"],
    resource_type: "image"
  }
});

const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "videos",  // Save videos in 'videos/' folder
    allowed_formats: ["mp4", "avi", "mov"],
    resource_type: "video"
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
    imageUrl: req.file.path // Cloudinary URL
  });
});

// API: Upload Video
router.post("/upload-video", uploadVideo.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No video file uploaded!" });
  }

  res.json({
    message: "Video uploaded successfully!",
    videoUrl: req.file.path // Cloudinary URL
  });
});

// API: Get All Uploaded Images
router.get("/images", async  (req, res) => {
  try {
    const { resources } = await cloudinary.api.resources({
      type: "upload",
      prefix: "images/",
      max_results: 20
    });

    const images = resources.map(file => file.secure_url);
    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error retrieving images" });
  }
});

// API: Get All Uploaded Videos
router.get("/videos", async(req, res) => {
  try {
    const { resources } = await cloudinary.api.resources({
      type: "upload",
      prefix: "videos/",
      max_results: 20
    });

    const videos = resources.map(file => file.secure_url);
    res.json({ videos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error retrieving videos" });
  }
});

// API: Remove Image
router.delete("/delete-image", async(req, res) => {
  const { public_id } = req.body;
  if (!public_id) {
    return res.status(400).json({ message: "No image public_id provided" });
  }

  try {
    await cloudinary.uploader.destroy(public_id);
    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting the image" });
  }
});

// API: Remove Video
router.delete("/delete-video", async(req, res) => {
  const { public_id } = req.body;
  if (!public_id) {
    return res.status(400).json({ message: "No video public_id provided" });
  }

  try {
    await cloudinary.uploader.destroy(public_id, { resource_type: "video" });
    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting the video" });
  }
});



  router.post("/add-offer", upload.single("image"), (req, res) => {
    const { title, description, discount } = req.body;
    const imageUrl = req.file ? req.file.path : ""; // Cloudinary URL

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
  router.delete("/delete-offer/:id", async (req, res) => {
    const offerId = parseInt(req.params.id);
    const index = offers.findIndex(o => o.id === offerId);
  
    if (index !== -1) {
      const deletedOffer = offers.splice(index, 1)[0];
      
      if (deletedOffer.image) {
        const public_id = deletedOffer.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(public_id);
      }
      
      res.json({ success: true, message: "Offer deleted successfully" });
    } else {
      res.json({ success: false, message: "Offer not found" });
    }
  });
  


app.use("/api", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports.handler = serverless(app);
