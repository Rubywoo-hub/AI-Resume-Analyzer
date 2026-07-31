const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parsePDFFile, parseImageFile, parseTxtFile } = require('../utils/fileParser');

const router = express.Router();

// 配置文件存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${ext}。支持的类型: PDF, JPG, PNG, TXT`));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

// POST /api/upload/resume - 上传简历文件
router.post('/resume', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let extractedText = '';

    // 根据文件类型解析文本
    switch (fileExt) {
      case '.pdf':
        extractedText = await parsePDFFile(filePath);
        break;
      case '.jpg':
      case '.jpeg':
      case '.png':
        extractedText = await parseImageFile(filePath);
        break;
      case '.txt':
        extractedText = parseTxtFile(filePath);
        break;
      default:
        return res.status(400).json({ error: '不支持的文件类型' });
    }

    res.json({
      success: true,
      fileInfo: {
        filename: req.file.originalname,
        size: req.file.size,
        type: fileExt
      },
      extractedText: extractedText,
      message: '文件上传并解析成功'
    });
  } catch (error) {
    console.error('上传处理错误:', error);
    res.status(500).json({
      error: '文件处理失败',
      message: error.message
    });
  }
});

// GET /api/upload/types - 获取支持的文件类型
router.get('/types', (req, res) => {
  res.json({
    supportedTypes: [
      { ext: '.pdf', name: 'PDF文档' },
      { ext: '.jpg', name: 'JPG图片' },
      { ext: '.png', name: 'PNG图片' },
      { ext: '.txt', name: 'TXT文本' }
    ],
    maxSize: '10MB'
  });
});

module.exports = router;
