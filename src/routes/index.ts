import express from 'express';
import productRoutes from "./products";
import stockRoutes from "./stocks";
import billingRoutes from "./billing";

// Create a router to combine all routes
const apiRouter = express.Router();

apiRouter.use("/products", productRoutes);
apiRouter.use("/stocks", stockRoutes);
apiRouter.use("/billing", billingRoutes);

export default apiRouter;