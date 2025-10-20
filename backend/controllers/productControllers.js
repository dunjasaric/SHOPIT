import Product from "../models/product.js"
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import APIFilters from "../utils/apiFilters.js"; 
import qs from "qs"; 

export const getProducts = catchAsyncErrors (async(req, res) => {

  const resPerPage = 4;
  const parsedQuery = qs.parse(req.query);
  const apiFilters = new APIFilters(Product, parsedQuery).search().filters();




  let products = await apiFilters.query;
  let filteredProductsCount = products.length;

  apiFilters.pagination(resPerPage);
  products = await apiFilters.query.clone();
  
  res.status(200).json({
      resPerPage,
      filteredProductsCount,
      products,
    });
});

// Create new product => /api
export const newProduct = catchAsyncErrors (async(req, res) => {
  req.body.user = req.user._id;

  const product = await Product.create(req.body)
  res.status(200).json({
      product,
  });
});

//Get single product
export const getProductDetails = catchAsyncErrors (async (req, res, next) => {
  const product = await Product.findById(req?.params?.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  res.status(200).json({
    product,
  });
});

// Update product details   =>  /api/v1/products/:id
export const updateProduct = catchAsyncErrors (async (req, res) => {
  let product = await Product.findById(req?.params?.id);

  if (!product) {
   return next(new ErrorHandler("Product not found", 404));
  }

  product = await Product.findByIdAndUpdate(req?.params?.id, req.body, {
    new: true,
  });

  res.status(200).json({
    product,
  });
});

// Delete product details   =>  /api/v1/products/:id
export const deleteProduct = catchAsyncErrors (async (req, res) => {
  const product = await Product.findById(req?.params?.id);

  if (!product) {
   return next(new ErrorHandler("Product not found", 404));
  }

  await product.deleteOne()


  res.status(200).json({
    message: "Product Deleted"
  });
});