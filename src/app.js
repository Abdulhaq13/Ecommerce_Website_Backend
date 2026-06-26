import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.js";
import userRouter from "./routes/user.routes.js";
import categoryRouter from "./routes/category.routes.js";

const app = express();

//Body parser
app.use(express.json()); //reading json data
app.use(express.urlencoded({ extended: true })); //reading forms
app.use(cookieParser()); //read cookies

//CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

//Test route
app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

//default error handler
app.use(errorHandler);

//routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/categories", categoryRouter);

export default app;
