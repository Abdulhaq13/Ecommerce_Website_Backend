import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    // Display name of the user — shown in profile, emails, admin panel
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    // Primary identity field, used for login and all email notifications
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    // Stores bcrypt HASH, never plain text
    // select: false -> excluded from query results by default
    // must explicitly use .select("+password") when needed (only during login)
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    // Drives RBAC (Role Based Access Control)
    // "admin" role unlocks product/category/order/coupon management routes
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // Profile picture, stored via Cloudinary
    avatar: {
      // public_id is required to DELETE the old image from Cloudinary
      // whenever the user uploads a new avatar
      public_id: {
        type: String,
        default: "",
      },
      // url is the actual image link shown on frontend
      url: {
        type: String,
        default: "",
      },
    },

    // Gate that blocks login until email is confirmed
    // false at registration -> true after clicking verification link
    isVerified: {
      type: Boolean,
      default: false,
    },

    // add soft-delete flag to User schema for admin path
    isActive: {
      type: Boolean,
      default: true,
    },

    // Random token generated at registration, sent in the verification email link
    // select: false -> hidden from normal queries (sensitive)
    emailVerificationToken: {
      type: String,
      select: false,
    },

    // Expiry timestamp for the verification token (e.g. 24 hours from registration)
    // prevents old/leaked verification links from working forever
    emailVerificationExpiry: {
      type: Date,
      select: false,
    },

    // Random token generated on "Forgot Password" request, sent in reset email link
    resetPasswordToken: {
      type: String,
      select: false,
    },

    // Short expiry window for reset token (e.g. 15-30 mins)
    // kept short since password reset is a sensitive action
    resetPasswordExpiry: {
      type: Date,
      select: false,
    },

    // Long-lived JWT (7 days), stored in DB AND sent as httpOnly cookie
    // used to silently issue a new access token when the 15min access token expires
    // cleared on logout to invalidate the cookie server-side
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  },
);

// Runs before every .save() call
// Only re-hashes the password if it was actually changed
// (prevents re-hashing an already-hashed password on unrelated profile updates)
// FIX: removed the unused `next` param — per project rule, async pre-save
// hooks in Mongoose 7+ are promise-based and must not take/call next().
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12); // 12 = salt rounds
});

// Instance method available on every user document
// Compares plain text password (login input) against the stored bcrypt hash
userSchema.methods.isPasswordCorrect = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

// Generates a short-lived access token (15 min)
// Used to authenticate every request via httpOnly cookie
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

// Generates a long-lived refresh token (7 days)
// Stored in DB (this.refreshToken) AND sent as httpOnly cookie
// Used to silently issue a new access token when it expires
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};

export const User = mongoose.model("User", userSchema);
