const axios = require('axios');

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_URL = process.env.AI_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'glm-4';

/**
 * 清理JSON字符串
 */
function cleanJsonInput(str) {
  if (str.charCodeAt(0) === 0xFEFF) str = str.slice(1);
  str = str.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonStart = str.indexOf('{');
  if (jsonStart > 0) str = str.substring(jsonStart);
  const jsonEnd = str.lastIndexOf('}');
  if (jsonEnd < str.length - 1) str = str.substring(0, jsonEnd + 1);
  str = str.replace(/"/g, '"').replace(/"/g, '"');
  return str;
}

/**
 * 修复JSON - 处理字符串内未转义的引号和换行
 */
function fixJsonString(str) {
  let fixed = str.replace(/,(\s*})/g, '$1').replace(/,(\s*\])/g, '$1');
  
  let result = '';
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < fixed.length; i++) {
    const char = fixed[i];
    
    if (!inString) {
      result += char;
      if (char === '"') inString = true;
    } else {
      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === '\\') {
        result += char;
        escaped = true;
      } else if (char === '"') {
        let j = i + 1;
        while (j < fixed.length && /\s/.test(fixed[j])) j++;
        if (j >= fixed.length || [':', ',', '}', ']'].includes(fixed[j])) {
          result += char;
          inString = false;
        } else {
          result += '\\"';
        }
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    }
  }
  
  return result;
}

/**
 * 解析JSON - 多种策略尝试
 */
function parseAiJson(str) {
  const cleaned = cleanJsonInput(str);
  console.log('[JSON解析] 清理后长度:', cleaned.length);
  
  // 方法1: 直接解析
  try {
    const result = JSON.parse(cleaned);
    console.log('[JSON解析] 方法1成功');
    return result;
  } catch (e) {
    console.log('[JSON解析] 方法1失败:', e.message.substring(0, 80));
  }
  
  // 方法2: 修复后解析
  try {
    const fixed = fixJsonString(cleaned);
    const result = JSON.parse(fixed);
    console.log('[JSON解析] 方法2成功');
    return result;
  } catch (e) {
    console.log('[JSON解析] 方法2失败:', e.message.substring(0, 80));
  }
  
  // 方法3: 正则提取 + 解析
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const result = JSON.parse(jsonMatch[0]);
      console.log('[JSON解析] 方法3成功(正则)');
      return result;
    } catch (e) {
      try {
        const fixed = fixJsonString(jsonMatch[0]);
        const result = JSON.parse(fixed);
        console.log('[JSON解析] 方法4成功(正则+修复)');
        return result;
      } catch (e2) {
        console.log('[JSON解析] 方法4失败');
      }
    }
  }
  
  // 方法5: 宽松解析
  try {
    // eslint-disable-next-line no-eval
    const result = eval('(' + cleaned + ')');
    if (result && typeof result === 'object') {
      console.log('[JSON解析] 方法5成功(eval)');
      return result;
    }
  } catch (e) {
    console.log('[JSON解析] 方法5失败');
  }
  
  // 方法6: 修复后宽松解析
  try {
    const fixed = fixJsonString(cleaned);
    // eslint-disable-next-line no-eval
    const result = eval('(' + fixed + ')');
    if (result && typeof result === 'object') {
      console.log('[JSON解析] 方法6成功(eval+修复)');
      return result;
    }
  } catch (e) {
    console.log('[JSON解析] 方法6失败');
  }
  
  console.log('[JSON解析] 所有方法均失败');
  return null;
}

/**
 * 简历分析主函数 - 专业招聘顾问级别的AI分析
 * @param {string} resumeText - 简历文本
 * @param {string} jdText - 岗位JD文本
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeResume(resumeText, jdText) {
  // 如果没有配置API Key，使用mock数据
  if (!AI_API_KEY || AI_API_KEY === 'your_api_key_here') {
    console.log('[Mock模式] 使用模拟数据进行分析');
    return generateMockAnalysis(resumeText, jdText);
  }

  try {
    const systemPrompt = `# 角色设定
你是一位拥有10年以上经验的互联网行业招聘负责人，现任某知名科技公司HR总监。你曾主导招聘过500+名工程师、产品经理、数据分析师等岗位，深刻理解互联网行业的人才评估标准。

# 专业能力
- 精通技术人才评估：能从代码能力、系统设计、技术深度等多维度评估工程师
- 擅长产品判断力分析：评估产品经理的用户思维、数据敏感度、商业理解
- 熟悉全栈能力模型：理解从前端到后端、从技术到产品的完整能力图谱
- 行业洞察力：对AI、大数据、云计算、移动互联网等领域有深刻理解
- 成果导向思维：只认可有数据支撑的成就，拒绝空泛的自我描述

# 评估原则
1. 证据优先：每个判断必须基于简历中的具体内容，不做无依据推测
2. 量化思维：关注成果背后的数字（用户量、增长率、转化率、性能提升等）
3. 深度评估：识别候选人的技术/产品深度，而非表层技能
4. 匹配度本质：判断"能否胜任"而非"是否相似"
5. 发展潜力：评估候选人的成长空间和学习能力

# 输出要求
- 严格按照JSON格式输出，不要添加任何解释性文字
- 所有评估要有具体依据，引用简历原文的关键信息
- 评分要客观，70分以上代表可考虑，85分以上代表强烈推荐`;

    const userPrompt = `# 任务：简历与岗位深度匹配分析

请基于提供的岗位JD和候选人简历，完成以下5步专业分析：

## 第1步：提取JD核心能力要求
从岗位描述中识别并分类：
- 【必备硬技能】：必须具备的技术栈、工具、框架
- 【核心软技能】：沟通、协作、领导力等能力要求
- 【经验门槛】：年限要求、经验类型、项目规模
- 【教育背景】：学历、专业背景要求
- 【加分项】：额外加分的技能或经验

## 第2步：提取候选人能力画像
从简历中挖掘候选人的：
- 【技术栈深度】：不仅列出技能，还要评估掌握程度（入门/熟练/精通/专家）
- 【项目经验质量】：评估项目复杂度、规模、个人贡献角色
- 【成果量化数据】：识别所有可量化的成果指标
- 【产品思维体现】：用户视角、数据驱动、商业理解的证据
- 【行业经验匹配】：是否有相关行业的工作经历

## 第3步：建立能力匹配矩阵
对比JD要求与候选人画像，建立多维度匹配矩阵：
- 技术能力匹配度（权重30%）
- 项目经验匹配度（权重25%）
- 产品/业务理解匹配度（权重20%）
- 行业经验匹配度（权重15%）
- 软技能匹配度（权重10%）

## 第4步：差距与风险分析
识别：
- 【致命差距】：完全缺失的必备能力
- 【能力短板】：具备但深度不够的能力
- 【潜在风险】：可能影响岗位胜任力的隐患
- 【意外惊喜】：简历中超出JD要求的亮点

## 第5步：优先级修改建议
按投入产出比排序的改进建议：
- 【紧急且重要】：简历中必须立即修改的问题
- 【重要不紧急】：能显著提升竞争力的优化点
- 【锦上添花】：可额外加分的改进项

---

# 输入数据

【岗位JD】：
${jdText}

【候选人简历】：
${resumeText}

---

# 输出格式（严格JSON）

{
  "meta": {
    "jdPosition": "岗位名称",
    "candidateName": "候选人姓名",
    "analysisTimestamp": "分析时间戳",
    "confidence": 0.85
  },
  "jdRequirements": {
    "mustHaveSkills": [{"skill": "技能名", "priority": "high|medium"}],
    "mustHaveExperience": ["经验要求"],
    "mustHaveEducation": "学历要求",
    "bonusSkills": ["加分项"],
    "coreResponsibilities": ["核心职责"]
  },
  "candidateProfile": {
    "technicalSkills": [{"skill": "技能名", "level": "入门|熟练|精通|专家", "evidence": "简历证据"}],
    "projectQuality": {
      "totalProjects": 5,
      "complexityLevel": "中高",
      "highlightProject": "最佳项目名称",
      "roleDepth": "核心贡献者"
    },
    "quantifiedResults": ["量化成果1", "量化成果2"],
    "productThinking": ["产品思维证据"],
    "industryMatch": ["相关行业经验"]
  },
  "matchMatrix": {
    "overallScore": 78,
    "dimensionScores": {
      "technical": {"score": 82, "weight": 0.30, "detail": "技术栈匹配，深度略欠"},
      "project": {"score": 75, "weight": 0.25, "detail": "项目经验相关，规模中等"},
      "product": {"score": 70, "weight": 0.20, "detail": "有产品意识，数据支撑不足"},
      "industry": {"score": 85, "weight": 0.15, "detail": "行业高度相关"},
      "softSkills": {"score": 80, "weight": 0.10, "detail": "协作沟通能力良好"}
    },
    "conclusion": "匹配度评估结论"
  },
  "gapAnalysis": {
    "criticalGaps": [{"gap": "缺失项", "impact": "影响程度", "suggestion": "改进建议"}],
    "weaknessAreas": [{"area": "短板领域", "currentLevel": "当前水平", "targetLevel": "目标水平"}],
    "potentialRisks": ["潜在风险"],
    "surpriseHighlights": ["意外亮点"]
  },
  "suggestions": {
    "urgent": [{"action": "立即修改项", "reason": "原因", "priority": "P0"}],
    "important": [{"action": "重要优化项", "reason": "原因", "priority": "P1"}],
    "niceToHave": [{"action": "加分项", "reason": "原因", "priority": "P2"}]
  },
  "finalVerdict": {
    "recommendation": "强烈推荐|推荐|谨慎考虑|不推荐",
    "interviewPriority": 1,
    "keyQuestions": ["面试时应重点了解的问题"],
    "expectedPerformance": "预期表现评级"
  }
}

---

# 重要提醒
1. 所有score基于你的专业判断，0-100分制
2. level字段只能用：入门/熟练/精通/专家
3. priority字段只能用：P0/P1/P2
4. recommendation字段只能用：强烈推荐/推荐/谨慎考虑/不推荐
5. 每个evidence必须引用简历中的具体内容
6. 如果某字段信息不足，用"待补充"表示，不要编造
7. 仅输出JSON，不要添加任何markdown标记或解释`;

    const response = await axios.post(AI_API_URL, {
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    }, {
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 90000 // 90秒超时
    });

    let aiResult = response.data.choices[0].message.content;
    
    // 使用多策略解析
    const parsed = parseAiJson(aiResult);
    if (parsed) {
      console.log('[分析] JSON解析成功');
      return parsed;
    }
    
    // 尝试正则提取后再解析
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const matchParsed = parseAiJson(jsonMatch[0]);
      if (matchParsed) {
        console.log('[分析] 正则提取后解析成功');
        return matchParsed;
      }
    }
    
    // 所有方法都失败
    console.error('[分析] 所有解析方法均失败');
    return buildFallbackResult(aiResult, jdText, resumeText);
  } catch (error) {
    console.error('AI API调用失败:', error.message);
    // AI调用失败时，降级为规则分析
    return ruleBasedAnalysis(resumeText, jdText);
  }
}

/**
 * 构建降级结果（AI返回格式异常时）
 */
function buildFallbackResult(rawText, jdText, resumeText) {
  return {
    meta: {
      jdPosition: '未知岗位',
      candidateName: '未知候选人',
      analysisTimestamp: new Date().toISOString(),
      confidence: 0.5
    },
    jdRequirements: {
      mustHaveSkills: [],
      mustHaveExperience: [],
      mustHaveEducation: '待补充',
      bonusSkills: [],
      coreResponsibilities: []
    },
    candidateProfile: {
      technicalSkills: [],
      projectQuality: { totalProjects: 0, complexityLevel: '待评估', highlightProject: '', roleDepth: '' },
      quantifiedResults: [],
      productThinking: [],
      industryMatch: []
    },
    matchMatrix: {
      overallScore: 50,
      dimensionScores: {
        technical: { score: 50, weight: 0.30, detail: 'AI分析结果解析失败' },
        project: { score: 50, weight: 0.25, detail: 'AI分析结果解析失败' },
        product: { score: 50, weight: 0.20, detail: 'AI分析结果解析失败' },
        industry: { score: 50, weight: 0.15, detail: 'AI分析结果解析失败' },
        softSkills: { score: 50, weight: 0.10, detail: 'AI分析结果解析失败' }
      },
      conclusion: '分析结果解析失败，建议重新提交或检查输入内容格式'
    },
    gapAnalysis: {
      criticalGaps: [{ gap: '系统异常', impact: '未知', suggestion: '请重试' }],
      weaknessAreas: [],
      potentialRisks: ['本次分析结果可能不准确'],
      surpriseHighlights: []
    },
    suggestions: {
      urgent: [{ action: '重新提交分析', reason: '系统解析异常', priority: 'P0' }],
      important: [],
      niceToHave: []
    },
    finalVerdict: {
      recommendation: '谨慎考虑',
      interviewPriority: 3,
      keyQuestions: ['建议重新分析以获得准确评估'],
      expectedPerformance: '待评估'
    },
    note: '本次分析结果解析失败，建议重新提交'
  };
}

/**
 * 基于规则的降级分析（当AI不可用时）
 */
function ruleBasedAnalysis(resumeText, jdText) {
  const resumeLower = resumeText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  // 提取JD关键词
  const jdKeywords = extractKeywords(jdLower);
  const resumeKeywords = new Set(extractKeywords(resumeLower));

  const matched = [];
  const missing = [];

  jdKeywords.forEach(keyword => {
    if (resumeLower.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  const matchRatio = jdKeywords.length > 0 ? matched.length / jdKeywords.length : 0;
  const matchScore = Math.round(matchRatio * 100);

  return {
    meta: {
      jdPosition: '未知岗位',
      candidateName: '未知候选人',
      analysisTimestamp: new Date().toISOString(),
      confidence: 0.4
    },
    jdRequirements: {
      mustHaveSkills: jdKeywords.slice(0, 10).map(kw => ({ skill: kw, priority: 'high' })),
      mustHaveExperience: [],
      mustHaveEducation: '待补充',
      bonusSkills: [],
      coreResponsibilities: []
    },
    candidateProfile: {
      technicalSkills: matched.slice(0, 8).map(kw => ({
        skill: kw,
        level: '熟练',
        evidence: '简历中提及'
      })),
      projectQuality: { totalProjects: 0, complexityLevel: '待评估', highlightProject: '', roleDepth: '' },
      quantifiedResults: [],
      productThinking: [],
      industryMatch: []
    },
    matchMatrix: {
      overallScore: matchScore,
      dimensionScores: {
        technical: { score: matchScore, weight: 0.30, detail: '基于关键词匹配的粗略评估' },
        project: { score: 50, weight: 0.25, detail: '无法评估' },
        product: { score: 50, weight: 0.20, detail: '无法评估' },
        industry: { score: 50, weight: 0.15, detail: '无法评估' },
        softSkills: { score: 50, weight: 0.10, detail: '无法评估' }
      },
      conclusion: `基于关键词匹配的初步评估，匹配度约${matchScore}分。建议配置AI API Key获得更专业的分析。`
    },
    gapAnalysis: {
      criticalGaps: missing.slice(0, 5).map(kw => ({
        gap: kw,
        impact: '未知',
        suggestion: '简历中补充相关内容'
      })),
      weaknessAreas: [],
      potentialRisks: ['当前为规则匹配，结果仅供参考'],
      surpriseHighlights: []
    },
    suggestions: {
      urgent: [],
      important: [
        { action: `补充以下技能相关内容：${missing.slice(0, 3).join('、')}`, reason: '当前简历缺失这些关键词', priority: 'P1' }
      ],
      niceToHave: [
        { action: '添加量化成果数据', reason: '增强简历说服力', priority: 'P2' },
        { action: '使用STAR法则描述项目经验', reason: '提升项目描述质量', priority: 'P2' }
      ]
    },
    finalVerdict: {
      recommendation: matchScore >= 70 ? '推荐' : '谨慎考虑',
      interviewPriority: matchScore >= 70 ? 2 : 3,
      keyQuestions: ['建议使用AI分析获得更精准的评估'],
      expectedPerformance: '待评估'
    },
    note: '本分析基于简单规则匹配，建议配置AI API Key以获得专业级分析'
  };
}

/**
 * 简单的关键词提取
 */
function extractKeywords(text) {
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', 
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', 
    '自己', '这', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 
    'should', 'may', 'might', 'can', 'could', 'to', 'of', 'in', 'for', 'on', 
    'with', 'at', 'by', 'from', 'as'
  ]);
  
  const words = text
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word.toLowerCase()));

  return [...new Set(words)].slice(0, 50);
}

/**
 * 生成Mock分析结果（用于演示）
 */
function generateMockAnalysis(resumeText, jdText) {
  const resumeWords = new Set(extractKeywords(resumeText.toLowerCase()));
  const jdWords = extractKeywords(jdText.toLowerCase());

  const matched = jdWords.filter(w => 
    resumeWords.has(w.toLowerCase()) || 
    resumeText.toLowerCase().includes(w.toLowerCase())
  );
  const missing = jdWords.filter(w => !resumeText.toLowerCase().includes(w.toLowerCase()));

  const matchScore = jdWords.length > 0 
    ? Math.round((matched.length / jdWords.length) * 70 + 25)
    : 65;

  // 提取候选人姓名（简单正则）
  const nameMatch = resumeText.match(/([\u4e00-\u9fa5]{2,4})\s*\n/);
  const candidateName = nameMatch ? nameMatch[1] : '候选人';

  // 提取岗位名称
  const positionMatch = jdText.match(/岗位[名称]*[：:]\s*(.+)/);
  const jdPosition = positionMatch ? positionMatch[1].trim() : '目标岗位';

  return {
    meta: {
      jdPosition: jdPosition,
      candidateName: candidateName,
      analysisTimestamp: new Date().toISOString(),
      confidence: 0.6
    },
    jdRequirements: {
      mustHaveSkills: jdWords.slice(0, 10).map(kw => ({ skill: kw, priority: 'high' })),
      mustHaveExperience: ['相关工作经验'],
      mustHaveEducation: '本科及以上',
      bonusSkills: [],
      coreResponsibilities: ['岗位核心职责']
    },
    candidateProfile: {
      technicalSkills: matched.slice(0, 8).map(kw => ({
        skill: kw,
        level: '熟练',
        evidence: '简历中提及相关技能'
      })),
      projectQuality: {
        totalProjects: 3,
        complexityLevel: '中等',
        highlightProject: '简历中列出的项目',
        roleDepth: '参与者/核心贡献者'
      },
      quantifiedResults: ['建议补充量化成果'],
      productThinking: ['具备基本产品思维'],
      industryMatch: ['相关行业经验']
    },
    matchMatrix: {
      overallScore: Math.min(matchScore, 95),
      dimensionScores: {
        technical: { score: Math.min(matchScore + 5, 95), weight: 0.30, detail: '技术栈有一定匹配度' },
        project: { score: Math.min(matchScore - 5, 90), weight: 0.25, detail: '有项目经验，建议补充细节' },
        product: { score: 70, weight: 0.20, detail: '具备基础产品意识' },
        industry: { score: Math.min(matchScore, 90), weight: 0.15, detail: '行业相关性较好' },
        softSkills: { score: 80, weight: 0.10, detail: '具备良好的协作能力' }
      },
      conclusion: `综合匹配度${Math.min(matchScore, 95)}分，候选人基本具备岗位要求，但在项目深度和成果量化方面有提升空间。`
    },
    gapAnalysis: {
      criticalGaps: missing.slice(0, 3).map(kw => ({
        gap: kw,
        impact: '中',
        suggestion: `在简历中补充关于"${kw}"的相关经验`
      })),
      weaknessAreas: [
        { area: '项目深度', currentLevel: '中等', targetLevel: '深入' },
        { area: '成果量化', currentLevel: '较弱', targetLevel: '强' }
      ],
      potentialRisks: ['简历缺乏量化数据可能影响说服力'],
      surpriseHighlights: ['技术栈覆盖较广']
    },
    suggestions: {
      urgent: [
        { action: '补充量化成果数据', reason: '简历中缺乏可衡量的成果指标', priority: 'P0' },
        { action: '用STAR法则重写项目经验', reason: '让项目描述更有说服力', priority: 'P0' }
      ],
      important: [
        { action: `重点补充以下技能：${missing.slice(0, 3).join('、')}`, reason: '这些是JD中的关键要求', priority: 'P1' },
        { action: '调整简历结构，优先展示相关经历', reason: '让HR一眼看到匹配点', priority: 'P1' }
      ],
      niceToHave: [
        { action: '添加技术栈深度说明', reason: '展示技术能力的深度而非广度', priority: 'P2' },
        { action: '补充行业相关案例', reason: '增强行业匹配度', priority: 'P2' }
      ]
    },
    finalVerdict: {
      recommendation: matchScore >= 75 ? '推荐' : '谨慎考虑',
      interviewPriority: matchScore >= 75 ? 2 : 3,
      keyQuestions: [
        '请描述你最有成就感的项目，你在其中的具体贡献是什么？',
        '这个项目的成果如何衡量？你带来了哪些可量化的改进？',
        '在[缺失技能]方面，你的学习路径和实践经验是什么？'
      ],
      expectedPerformance: matchScore >= 75 ? '预期表现良好' : '需要进一步评估'
    },
    note: '当前使用模拟数据，配置AI API Key后将获得真实的专家级分析'
  };
}

module.exports = {
  analyzeResume
};
