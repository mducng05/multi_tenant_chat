const db = require('../db/database');

// GET /api/client-file/files
exports.getFiles = (req, res) => {
  const files = db.getFilesByClient(req.clientId);
  return res.json({ ok: true, files });
};

// POST /api/client-file/upload
exports.uploadFile = (req, res) => {
  // Hỗ trợ cả file qua multipart hoặc payload JSON demo
  const fileName = (req.file ? req.file.originalname : req.body.fileName) || `Tai_Lieu_${Date.now()}.pdf`;
  const fileContent = req.body.content || 'Nội dung tài liệu demo: Chính sách chiết khấu 10% cho khách hàng mua từ 2 sản phẩm trở lên.';
  const fileSize = req.file ? req.file.size : (fileContent.length * 2);

  const fileId = `file_${Date.now()}`;
  const newFile = {
    _id: fileId,
    clientId: req.clientId, // DATA ISOLATION
    file_name: fileName,
    file_size: fileSize,
    status: 'processing', // AC 3.1: Vào trạng thái processing
    vector_count: 0,
    createdAt: new Date().toISOString()
  };

  db.knowledgeFiles.push(newFile);

  // Giả lập tiến trình background Ingestion của AI Backend (FastAPI + ChromaDB)
  setTimeout(() => {
    // 1. Chunking văn bản
    const sentences = fileContent.split('.').filter(s => s.trim().length > 0);
    sentences.forEach((sentence, idx) => {
      const words = sentence.toLowerCase().split(/\s+/);
      db.knowledgeChunks.push({
        _id: `chunk_${fileId}_${idx}`,
        clientId: req.clientId, // VECTOR NAMESPACE THEO CLIENTID
        fileId: fileId,
        content: sentence.trim() + '.',
        keywords: words.slice(0, 10)
      });
    });

    // 2. Cập nhật trạng thái hoàn thành (AC 3.2: Webhook callback chuyển sang ready/completed)
    newFile.status = 'ready';
    newFile.vector_count = sentences.length || 1;
  }, 1000);

  return res.status(202).json({
    ok: true,
    message: 'Tải lên tài liệu thành công. Đang tiến hành băm nhỏ và vector hóa...',
    file: newFile
  });
};

// DELETE /api/client-file (Cơ chế Hard Delete triệt để 3 tầng)
exports.deleteFile = (req, res) => {
  const { fileId } = req.body;
  if (!fileId) {
    return res.status(400).json({ ok: false, message: 'Thiếu fileId cần xóa' });
  }

  // Tầng 1: Xóa bản ghi trong Database
  const fileIndex = db.knowledgeFiles.findIndex(f => f._id === fileId && f.clientId === req.clientId);
  if (fileIndex === -1) {
    return res.status(404).json({ ok: false, message: 'Không tìm thấy file hoặc bạn không có quyền xóa' });
  }
  db.knowledgeFiles.splice(fileIndex, 1);

  // Tầng 2 & 3: Xóa triệt để các Vector chunks trên VectorDB (ChromaDB/Qdrant)
  db.knowledgeChunks = db.knowledgeChunks.filter(c => !(c.fileId === fileId && c.clientId === req.clientId));

  return res.json({
    ok: true,
    message: 'Đã xóa vĩnh viễn tài liệu và đồng bộ dọn dẹp Vector trên ChromaDB (Hard Delete 3 tầng thành công)'
  });
};

// POST /api/client-file/:id/retrain
exports.retrainFile = (req, res) => {
  const fileId = req.params.id;
  const file = db.knowledgeFiles.find(f => f._id === fileId && f.clientId === req.clientId);
  if (!file) {
    return res.status(404).json({ ok: false, message: 'Không tìm thấy tài liệu' });
  }

  file.status = 'processing';
  setTimeout(() => {
    file.status = 'ready';
  }, 800);

  return res.json({ ok: true, message: 'Đã gửi yêu cầu huấn luyện lại tài liệu' });
};
