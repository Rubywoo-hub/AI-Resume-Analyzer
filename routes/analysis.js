const express = require('express');
const { analyzeResume } = require('../services/analyzer');

const router = express.Router();

// POST /api/analyze - 分析简历与岗位匹配度
router.post('/', async (req, res) => {
  try {
    const { resumeText, jdText } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: '简历内容不能为空' });
    }

    if (!jdText || !jdText.trim()) {
      return res.status(400).json({ error: '岗位JD内容不能为空' });
    }

    // 限制输入长度
    if (resumeText.length > 50000) {
      return res.status(400).json({ error: '简历内容过长，请精简后重试' });
    }

    if (jdText.length > 20000) {
      return res.status(400).json({ error: '岗位JD内容过长，请精简后重试' });
    }

    // 调用分析服务
    const result = await analyzeResume(resumeText, jdText);

    res.json({
      success: true,
      analysis: result
    });
  } catch (error) {
    console.error('分析错误:', error);
    res.status(500).json({
      error: '分析失败',
      message: error.message || 'AI分析服务暂时不可用，请稍后重试'
    });
  }
});

module.exports = router;
