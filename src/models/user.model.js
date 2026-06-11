import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be atleast 2 characters"],
      maxlength: [50, "Name cannot exceed characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be atleast 8 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    avatar: {
      public_id: {
        type: String,
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },

    emailVerificationExpiry: {
      type: Date,
      select: false,
    },

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpiry: {
      type: Date,
      select: false,
    },

    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
