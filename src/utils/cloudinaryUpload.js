import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// Uploads a local file to Cloudinary, then deletes the local temp copy
const uploadOnCloudinary = async (localFilePath, folder = "general") => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);

    return {
      public_id: response.public_id,
      url: response.secure_url,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

// Deletes an image from Cloudinary using its public_id
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.log("Error deleting file from Cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
