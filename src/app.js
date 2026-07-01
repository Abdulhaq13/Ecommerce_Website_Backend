import express from "express";
import "./config/env.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.js";
import userRouter from "./routes/user.routes.js";
import categoryRouter from "./routes/category.routes.js";
import productRouter from "./routes/product.routes.js";
import cartRouter from "./routes/cart.routes.js";
import orderRouter from "./routes/order.routes.js";
import adminRouter from "./routes/admin.routes.js";

const app = express();

//Body parser
app.use(express.json()); //reading json data
app.use(express.urlencoded({ extended: true })); //reading forms
app.use(cookieParser()); //read cookies

//CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

//Test route
app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

//routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/admin", adminRouter);

//default error handler
app.use(errorHandler);
export default app;
