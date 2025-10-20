import express from "express"
import { authorizeRoles, isAuthenticatedUser } from "../middlewares/auth.js";
import { 
    getProductDetails, 
    getProducts, 
    newProduct, 
    updateProduct, 
    deleteProduct 
} from "../controllers/productControllers.js";

const router = express.Router();

router.route("/products").get(getProducts);
router.route("/admin/products").post(isAuthenticatedUser, authorizeRoles("admin"), newProduct);

router.route("/products/:id").get(getProductDetails);

router.route("/admin/products/:id").put(isAuthenticatedUser, authorizeRoles("admin"), updateProduct);
router.route("/admin/products/:id").delete(isAuthenticatedUser, authorizeRoles("admin"), deleteProduct);

export default router;