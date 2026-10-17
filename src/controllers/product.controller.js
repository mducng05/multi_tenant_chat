const db = require('../db/database');

// GET /api/client/products
exports.getProducts = (req, res) => {
  const products = db.getProductsByClient(req.clientId);
  return res.json({ ok: true, total: products.length, products });
};

// POST /api/client/products
exports.createProduct = (req, res) => {
  const { name, price, image_url, product_url, attributes } = req.body;
  if (!name || !price) {
    return res.status(400).json({ ok: false, message: 'Thiếu tên sản phẩm hoặc giá tiền' });
  }

  const newProduct = {
    _id: `prod_${Date.now()}`,
    clientId: req.clientId, // DATA ISOLATION
    name,
    price: Number(price),
    image_url: image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=350',
    product_url: product_url || 'https://homenest.vn/san-pham',
    status: 'Active',
    attributes: attributes || {}
  };

  db.products.push(newProduct);
  return res.status(201).json({ ok: true, message: 'Thêm mới sản phẩm thành công', product: newProduct });
};

// POST /api/client/products/crawl (Cào dữ liệu web ngầm - HTTP 202 Accepted)
exports.crawlProductSim = (req, res) => {
  const { sourceUrl } = req.body;
  if (!sourceUrl) {
    return res.status(400).json({ ok: false, message: 'Thiếu thông tin sourceUrl' });
  }

  const jobId = `crawl_job_${Date.now()}`;

  // Giả lập worker chạy ngầm cào sản phẩm sau 1.5 giây
  setTimeout(() => {
    db.products.push({
      _id: `prod_crawled_${Date.now()}`,
      clientId: req.clientId,
      name: 'Căn hộ Duplex Sân Vườn (Tự động cào từ Web)',
      price: 3600000000,
      image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=350',
      product_url: sourceUrl,
      status: 'Active',
      attributes: { area: '92m2', source: sourceUrl }
    });
  }, 1500);

  return res.status(202).json({
    ok: true,
    message: 'Đã bắt đầu tiến trình cào dữ liệu sản phẩm trong nền (Background Worker)',
    jobId,
    sourceUrl
  });
};
