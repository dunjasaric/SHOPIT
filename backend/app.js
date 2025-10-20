import express from "express";
const app = express();
import dotenv from "dotenv";
import { connectDatabase } from "./config/dbConnect.js";
import errorMiddleware from "./middlewares/errors.js"

//import all routes
import productRoutes from './routes/products.js';
import authRoutes from './routes/auth.js';
import cookieParser from "cookie-parser";


//Handle Uncaught exceptions
process.on("uncaughtException", (err) => {
    console.log(`ERROR: ${err}`);
    console.log("Shutting down due to uncaught exception")
    process.exit(1);
});

dotenv.config({path: 'backend/config/config.env'});

//connecting to database
connectDatabase();

app.use(express.json());
app.use(cookieParser());



app.use("/api/v1", productRoutes);
app.use("/api/v1", authRoutes);

//Using error middleware
app.use(errorMiddleware);

const server = app.listen(process.env.PORT, () => {
    console.log(`Server started on PORT: ${process.env.PORT} in ${process.env.NODE_ENV} mode.`);
});

//Handle Unhandled Promise Rejection
process.on("unhandledRejection", (err) => {
    console.log(`ERROR: ${err}`);
    console.log("Shutting down server due to Unhandled Promise Rejection");
    server.close(() => {
        process.exit(1);
    });
});
