const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { verifyClient } = require('../middleware/auth.middleware');

router.get('/client/products', verifyClient, productController.getProducts);
router.post('/client/products', verifyClient, productController.createProduct);
router.post('/client/products/crawl', verifyClient, productController.crawlProductSim);

module.exports = router;
