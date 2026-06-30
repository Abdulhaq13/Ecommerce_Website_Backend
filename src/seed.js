// Seed script — populates the database with a default admin, a test user,
// sample categories, and sample products. Safe to re-run: every entity is
// checked for existence first, nothing is duplicated or overwritten.
import "./config/env.js";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { User } from "./models/user.model.js";
import { Category } from "./models/category.model.js";
import { Product } from "./models/product.model.js";

// Placeholder image, since seeding bypasses Cloudinary entirely —
// real images only ever come through the actual upload routes.
const PLACEHOLDER_IMAGE = {
  public_id: "seed-placeholder",
  url: "https://placehold.co/600x400?text=Product+Image",
};

const seedUsers = async () => {
  // findOne + create only if missing, so re-running this script never
  // creates duplicate accounts or throws on the unique email index.
  let admin = await User.findOne({ email: process.env.SEED_ADMIN_EMAIL });
  if (!admin) {
    // Using User.create (not insertMany) so the password-hashing
    // pre("save") hook actually runs — insertMany skips save middleware.
    admin = await User.create({
      name: process.env.SEED_ADMIN_NAME,
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      role: "admin",
      isVerified: true, // skip email verification for seeded accounts
    });
    console.log(`Admin created: ${admin.email}`);
  } else {
    console.log(`Admin already exists: ${admin.email}`);
  }

  let testUser = await User.findOne({ email: process.env.SEED_USER_EMAIL });
  if (!testUser) {
    testUser = await User.create({
      name: process.env.SEED_USER_NAME,
      email: process.env.SEED_USER_EMAIL,
      password: process.env.SEED_USER_PASSWORD,
      role: "user",
      isVerified: true,
    });
    console.log(`Test user created: ${testUser.email}`);
  } else {
    console.log(`Test user already exists: ${testUser.email}`);
  }

  return { admin, testUser };
};

const seedCategories = async (adminId) => {
  const categoryNames = ["Electronics", "Clothing", "Home & Kitchen", "Books"];

  const categories = [];
  for (const name of categoryNames) {
    // Checked by name, not slug — name is what's unique/meaningful to a human
    // re-running this script, and slug is auto-derived from it anyway.
    let category = await Category.findOne({ name });
    if (!category) {
      category = await Category.create({
        name,
        createdBy: adminId,
      });
      console.log(`Category created: ${category.name}`);
    } else {
      console.log(`Category already exists: ${category.name}`);
    }
    categories.push(category);
  }

  return categories;
};

const seedProducts = async (categories, adminId) => {
  // 2 sample products per category, named after their category so they're
  // easy to recognize during manual testing (e.g. "Electronics Sample 1").
  for (const category of categories) {
    for (let i = 1; i <= 2; i++) {
      const name = `${category.name} Sample ${i}`;

      let product = await Product.findOne({ name });
      if (!product) {
        product = await Product.create({
          name,
          description: `Sample product ${i} for the ${category.name} category, created by the seed script.`,
          price: 499 + i * 100,
          category: category._id,
          images: [PLACEHOLDER_IMAGE],
          stock: 50,
          createdBy: adminId,
        });
        console.log(`Product created: ${product.name}`);
      } else {
        console.log(`Product already exists: ${product.name}`);
      }
    }
  }
};

const runSeed = async () => {
  try {
    await connectDB();

    const { admin } = await seedUsers();
    const categories = await seedCategories(admin._id);
    await seedProducts(categories, admin._id);

    console.log("\nSeeding complete.");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    // Always disconnect, success or failure — this is a one-off script,
    // not a long-running server, so the process should exit cleanly.
    await mongoose.disconnect();
    process.exit(0);
  }
};

runSeed();
