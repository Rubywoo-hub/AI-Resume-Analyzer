# AI 简历分析师

智能简历诊断与优化平台 - 基于 AI 的专业招聘顾问级简历分析工具

## 功能特性

- 📄 **多格式支持**：PDF、JPG、PNG、TXT 文件上传
- 🎯 **JD 匹配分析**：岗位要求 vs 简历能力的专业评估
- 📊 **5 维度能力矩阵**：技术能力、项目经验、产品能力、行业经验、软技能
- 🔍 **差距分析**：识别致命差距、能力短板、潜在风险
- 💡 **STAR 原则优化**：基于 STAR 原则的简历优化建议
- 🎯 **优先级建议**：P0 紧急 / P1 重要 / P2 锦上添花

## 技术栈

- **前端**：HTML / CSS / JavaScript / TailwindCSS
- **后端**：Node.js / Express
- **AI**：DeepSeek API
- **文件处理**：pdf-parse（PDF）、Tesseract.js（图片 OCR）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/你的用户名/ai-resume-analyzer.git
cd ai-resume-analyzer
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```
# 服务配置
PORT=3000

# AI API 配置
AI_API_KEY=your_api_key_here
AI_API_URL=https://api.deepseek.com/v1/chat/completions
AI_MODEL=deepseek-chat
```

### 4. 启动服务

```bash
node server.js
```

### 5. 访问应用

打开浏览器访问 `http://localhost:3000`

## 使用说明

1. 上传简历文件（支持 PDF / JPG / PNG / TXT）
2. 粘贴岗位 JD 描述
3. 点击「开始 AI 分析」
4. 查看分析报告
5. 点击「优化我的简历」获取 STAR 原则优化建议

## 项目结构

```
├── index.html          # 前端主页面
├── server.js           # 后端入口
├── routes/
│   ├── upload.js       # 文件上传路由
│   └── optimize.js     # 简历优化路由
├── services/
│   └── analyzer.js     # AI 分析服务
├── utils/
│   └── fileParser.js   # 文件解析工具
└── .env                # 环境变量配置（不提交到 Git）
```

## API 说明

### 文件上传
- `POST /api/upload` - 上传简历文件

### 简历分析
- `POST /api/analysis` - 分析简历与岗位匹配度

请求体：
```json
{
  "resumeText": "简历文本",
  "jdText": "岗位JD文本"
}
```

### 简历优化
- `POST /api/optimize` - 基于 STAR 原则优化简历

请求体：
```json
{
  "resumeText": "简历文本",
  "jdText": "岗位JD文本"
}
```

## 部署到云平台

### Railway

1. 注册 [Railway](https://railway.app) 账号
2. 连接 GitHub 仓库
3. 在 Settings → Variables 中配置环境变量
4. 自动部署

### Render

1. 注册 [Render](https://render.com) 账号
2. 创建 Web Service
3. 连接 GitHub 仓库
4. 配置 Build Command: `npm install`
5. 配置 Start Command: `node server.js`
6. 添加环境变量

## 安全说明

- `.env` 文件包含敏感信息，已在 `.gitignore` 中排除
- 代码中不包含任何硬编码的密钥
- API Key 从环境变量读取
- 建议使用 HTTPS 部署

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提交 Issue！
