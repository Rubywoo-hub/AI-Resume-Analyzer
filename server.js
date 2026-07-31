const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const uploadRoutes = require('./routes/upload');
const analysisRoutes = require('./routes/analysis');
const optimizeRoutes = require('./routes/optimize');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 静态文件服务
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
app.use('/api/upload', uploadRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/optimize', optimizeRoutes);

// 首页路由 - 确保能正确访问
app.get('/', (req, res) => {
  console.log('有人访问首页');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`静态文件目录: ${path.join(__dirname)}`);
});
