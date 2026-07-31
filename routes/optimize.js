const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

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
  // 移除尾部逗号
  let fixed = str.replace(/,(\s*})/g, '$1').replace(/,(\s*\])/g, '$1');
  
  // 逐字符处理，正确转义字符串内的特殊字符
  let result = '';
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < fixed.length; i++) {
    const char = fixed[i];
    
    if (!inString) {
      result += char;
      if (char === '"') {
        inString = true;
      }
    } else {
      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === '\\') {
        result += char;
        escaped = true;
      } else if (char === '"') {
        // 判断是否为字符串结束
        // 查看后面是否跟着 : , } ] 或空白+这些
        let j = i + 1;
        while (j < fixed.length && /\s/.test(fixed[j])) j++;
        if (j >= fixed.length || [':', ',', '}', ']'].includes(fixed[j])) {
          // 合法的字符串结束
          result += char;
          inString = false;
        } else {
          // 字符串内的引号，需要转义
          result += '\\"';
        }
      } else if (char === '\n') {
        // 字符串内的换行符
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
 * 修复截断的JSON - 尝试补全缺失的括号和引号
 */
function fixTruncatedJson(str) {
  let fixed = str;
  
  // 步骤1: 找到最后一个完整的引号闭合位置
  // 计算所有引号的位置
  const quotePositions = [];
  for (let i = 0; i < fixed.length; i++) {
    if (fixed[i] === '"' && (i === 0 || fixed[i-1] !== '\\')) {
      quotePositions.push(i);
    }
  }
  
  // 如果引号数量是奇数，说明有未闭合的字符串
  if (quotePositions.length % 2 !== 0) {
    // 截断到最后一个完整的字符串对
    const lastCompleteQuote = quotePositions[quotePositions.length - 2];
    if (lastCompleteQuote) {
      fixed = fixed.substring(0, lastCompleteQuote + 1);
    }
  }
  
  // 步骤2: 移除最后一个不完整的逗号和值
  const lastComma = fixed.lastIndexOf(',');
  const lastNewline = fixed.lastIndexOf('\n');
  const cutPoint = Math.max(lastComma, lastNewline);
  
  // 检查截断点后面是否还有未完成的内容
  const afterCut = cutPoint >= 0 ? fixed.substring(cutPoint + 1).trim() : '';
  if (afterCut && !afterCut.match(/^[\]\}]/)) {
    // 截断到最后一个完整的部分
    if (cutPoint > 0) {
      fixed = fixed.substring(0, cutPoint);
    }
  }
  
  // 步骤3: 移除尾部逗号
  fixed = fixed.replace(/,\s*$/, '');
  
  // 步骤4: 计算并补全缺失的大括号
  let openBraces = (fixed.match(/\{/g) || []).length;
  let closeBraces = (fixed.match(/\}/g) || []).length;
  let openBrackets = (fixed.match(/\[/g) || []).length;
  let closeBrackets = (fixed.match(/\]/g) || []).length;
  
  // 添加闭合的方括号
  if (openBrackets > closeBrackets) {
    const missingBrackets = openBrackets - closeBrackets;
    for (let i = 0; i < missingBrackets; i++) {
      fixed += ']';
    }
  }
  
  // 添加闭合的大括号
  if (openBraces > closeBraces) {
    const missingBraces = openBraces - closeBraces;
    for (let i = 0; i < missingBraces; i++) {
      fixed += '}';
    }
  }
  
  return fixed;
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
  
  // 方法2: 修复截断后解析
  try {
    const fixed = fixTruncatedJson(cleaned);
    const result = JSON.parse(fixed);
    console.log('[JSON解析] 方法2成功(截断修复)');
    return result;
  } catch (e) {
    console.log('[JSON解析] 方法2失败:', e.message.substring(0, 80));
  }
  
  // 方法3: 修复后解析
  try {
    const fixed = fixJsonString(cleaned);
    const result = JSON.parse(fixed);
    console.log('[JSON解析] 方法3成功');
    return result;
  } catch (e) {
    console.log('[JSON解析] 方法3失败:', e.message.substring(0, 80));
  }
  
  // 方法4: 正则提取 + 解析
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const result = JSON.parse(jsonMatch[0]);
      console.log('[JSON解析] 方法4成功(正则)');
      return result;
    } catch (e) {
      try {
        const fixed = fixTruncatedJson(jsonMatch[0]);
        const result = JSON.parse(fixed);
        console.log('[JSON解析] 方法5成功(正则+截断修复)');
        return result;
      } catch (e2) {
        try {
          const fixed2 = fixJsonString(jsonMatch[0]);
          const result = JSON.parse(fixed2);
          console.log('[JSON解析] 方法6成功(正则+修复)');
          return result;
        } catch (e3) {
          console.log('[JSON解析] 方法6失败');
        }
      }
    }
  }
  
  // 方法7: 宽松解析
  try {
    // eslint-disable-next-line no-eval
    const result = eval('(' + cleaned + ')');
    if (result && typeof result === 'object') {
      console.log('[JSON解析] 方法7成功(eval)');
      return result;
    }
  } catch (e) {
    console.log('[JSON解析] 方法7失败');
  }
  
  // 方法8: 修复后宽松解析
  try {
    const fixed = fixJsonString(cleaned);
    // eslint-disable-next-line no-eval
    const result = eval('(' + fixed + ')');
    if (result && typeof result === 'object') {
      console.log('[JSON解析] 方法8成功(eval+修复)');
      return result;
    }
  } catch (e) {
    console.log('[JSON解析] 方法8失败');
  }
  
  console.log('[JSON解析] 所有方法均失败');
  return null;
}

/**
 * STAR原则简历优化
 * Situation - 情境
 * Task - 任务
 * Action - 行动
 * Result - 结果
 */
async function optimizeResume(resumeText, jdText) {
  if (!AI_API_KEY || AI_API_KEY === 'your_api_key_here') {
    console.log('[Mock模式] 使用模拟数据进行简历优化');
    return generateMockOptimization(resumeText, jdText);
  }

  const systemPrompt = `你是资深招聘专家，精通简历STAR优化。
规则：
1. 严禁虚构经历，只优化表达方式
2. 项目用STAR结构：情境-任务-行动-结果
3. 强化量化成果和业务价值
4. 紧扣岗位JD要求
5. 简洁有力，去除冗余
6. 只输出JSON`;

  const userPrompt = `任务：基于JD优化简历（STAR原则）

【岗位JD】：
${jdText}

【候选人简历】：
${resumeText}

请输出JSON格式：
{
  "optimizedProjects": [{ "original": "原文", "optimized": "STAR优化后", "highlights": ["亮点"], "matchedSkills": ["技能"] }],
  "optimizedExperience": [{ "role": "职位", "company": "公司", "period": "时间", "original": "原文", "optimized": "优化后", "achievements": ["成果"] }],
  "optimizedSkills": { "technical": [{ "skill": "技能", "level": "熟练度" }], "soft": [{ "skill": "软技能", "evidence": "证据" }] },
  "optimizedSummary": { "original": "原文", "optimized": "优化后", "keywords": ["关键词"], "positioning": "定位" },
  "comparison": { "beforeCount": { "projects": 0, "experiences": 0, "skills": 0 }, "afterCount": { "projects": 0, "experiences": 0, "skills": 0 }, "improvements": ["优化点"] },
  "finalVersion": { "summary": "总结", "projects": "项目", "experience": "经历", "skills": "技能" }
}

要求：
1. 项目用STAR：情境-任务-行动-结果
2. 强化量化成果
3. 紧扣JD要求
4. 严禁虚构`;

  try {
    console.log('[优化] 调用AI API...');
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
      timeout: 60000
    });

    let aiResult = response.data.choices[0].message.content;
    console.log('[优化] AI返回成功，长度:', aiResult.length);
    
    // 保存AI原始输出到文件，方便调试
    const fs = require('fs');
    fs.writeFileSync('ai-debug-output.json', aiResult, 'utf-8');
    console.log('[优化] AI原始输出已保存到 ai-debug-output.json');
    
    // 显示前200字符
    console.log('[优化] AI输出前200字符:', aiResult.substring(0, 200));
    
    // 使用多策略解析
    const parsed = parseAiJson(aiResult);
    if (parsed) {
      console.log('[优化] JSON解析成功');
      return parsed;
    }
    
    // 解析失败，显示错误位置附近的内容
    console.error('[优化] 所有解析方法均失败');
    console.error('[优化] 位置7000-7100内容:', aiResult.substring(7000, 7100));
    console.error('[优化] 位置7500-7600内容:', aiResult.substring(7500, 7600));
    console.error('[优化] 位置7800-7900内容:', aiResult.substring(7800, 7900));
    throw new Error('JSON解析失败');
  } catch (error) {
    console.error('[优化] AI调用失败:', error.message);
    console.error('[优化] 错误详情:', error.response ? JSON.stringify(error.response.data).substring(0, 200) : error.message);
    // 降级到mock，但标记为mock，保留真实错误信息
    const mock = generateMockOptimization(resumeText, jdText);
    mock.isMock = true;
    mock.note = `AI优化失败，使用演示数据。错误: ${error.message}`;
    return mock;
  }
}

/**
 * Mock优化结果
 */
function generateMockOptimization(resumeText, jdText) {
  return {
    optimizedProjects: [
      {
        original: '负责电商平台前端开发',
        optimized: '【S】电商平台用户增长放缓，转化率需提升30%；【T】负责核心购物流程的前端重构；【A】采用React 18 + TypeScript重构代码，引入虚拟滚动和懒加载优化首屏性能；【R】页面加载速度提升60%，转化率提升25%，日活用户增长15%',
        highlights: ['性能优化60%', '转化率提升25%', '日活增长15%'],
        matchedSkills: ['React', 'TypeScript', '性能优化'],
        note: '使用STAR法则重构，补充量化成果'
      },
      {
        original: '参与管理后台系统开发',
        optimized: '【S】公司内部管理系统效率低下，人工操作耗时严重；【T】主导Admin系统的前端架构设计；【A】基于Vue 3 + Vite搭建组件库，实现权限管理、数据可视化等核心模块；【R】日常操作效率提升70%，新员工上手时间缩短50%',
        highlights: ['效率提升70%', '组件库设计', '权限系统'],
        matchedSkills: ['Vue', '组件库', '权限管理'],
        note: '突出主导角色，量化效率提升'
      }
    ],
    optimizedExperience: [
      {
        role: '高级前端工程师',
        company: '某科技公司',
        period: '2022.06 - 至今',
        original: '负责前端开发工作',
        optimized: '主导核心业务前端架构设计与技术选型；带领5人团队完成3个大型项目交付；推动前端工程化落地，建立CI/CD流水线和代码规范体系；持续优化页面性能，核心指标提升50%+',
        achievements: ['带领5人团队', '3个大型项目交付', '性能提升50%+'],
        note: '从"负责"升级为"主导"，突出团队管理和技术影响力'
      }
    ],
    optimizedSkills: {
      technical: [
        { skill: 'React / Vue', level: '精通', context: '大规模商业项目', relevance: '高' },
        { skill: 'TypeScript', level: '精通', context: '类型安全架构设计', relevance: '高' },
        { skill: 'Node.js', level: '熟练', context: 'BFF层开发', relevance: '中' },
        { skill: '性能优化', level: '精通', context: '首屏加载提升60%', relevance: '高' },
        { skill: '工程化', level: '熟练', context: 'CI/CD体系搭建', relevance: '中' }
      ],
      soft: [
        { skill: '团队管理', evidence: '带领5人团队完成3个项目', relevance: '高' },
        { skill: '技术方案设计', evidence: '主导前端架构选型', relevance: '高' },
        { skill: '跨团队协作', evidence: '与后端/产品/设计紧密协作', relevance: '中' }
      ]
    },
    optimizedSummary: {
      original: '本人热爱前端技术，有多年开发经验',
      optimized: '5年前端开发经验，精通React/Vue技术栈，主导过多个大型商业项目的架构设计与落地；具备强工程化思维，推动CI/CD体系建设，使团队效率提升70%；热爱技术分享，持续关注前端新技术趋势',
      keywords: ['5年经验', 'React/Vue', '架构设计', '工程化', '效率提升70%'],
      positioning: '高级前端工程师 / 技术负责人'
    },
    comparison: {
      beforeCount: { projects: 2, experiences: 1, skills: 5 },
      afterCount: { projects: 2, experiences: 1, skills: 8 },
      improvements: [
        '项目描述从平铺直叙改为STAR结构，可读性提升',
        '新增3项量化成果（性能60%、转化25%、效率70%）',
        '技能分类更清晰，突出与岗位相关性',
        '个人总结从1句话扩展为3个核心亮点'
      ]
    },
    finalVersion: {
      summary: '5年前端开发经验，精通React/Vue技术栈，主导过多个大型商业项目的架构设计与落地；具备强工程化思维，推动CI/CD体系建设，使团队效率提升70%；热爱技术分享，持续关注前端新技术趋势。',
      projects: '1. 【S】电商平台用户增长放缓，转化率需提升30%；【T】负责核心购物流程的前端重构；【A】采用React 18 + TypeScript重构代码，引入虚拟滚动和懒加载优化首屏性能；【R】页面加载速度提升60%，转化率提升25%，日活用户增长15%\n\n2. 【S】公司内部管理系统效率低下，人工操作耗时严重；【T】主导Admin系统的前端架构设计；【A】基于Vue 3 + Vite搭建组件库，实现权限管理、数据可视化等核心模块；【R】日常操作效率提升70%，新员工上手时间缩短50%',
      experience: '高级前端工程师 | 某科技公司 | 2022.06 - 至今\n主导核心业务前端架构设计与技术选型；带领5人团队完成3个大型项目交付；推动前端工程化落地，建立CI/CD流水线和代码规范体系；持续优化页面性能，核心指标提升50%+',
      skills: '技术技能：React/Vue（精通）、TypeScript（精通）、Node.js（熟练）、性能优化（精通）、工程化（熟练）\n软技能：团队管理、技术方案设计、跨团队协作'
    },
    note: '当前为演示模式，配置AI API Key后将获得个性化优化建议'
  };
}

// POST /api/optimize - 优化简历
router.post('/', async (req, res) => {
  try {
    const { resumeText, jdText } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: '简历内容不能为空' });
    }

    if (!jdText || !jdText.trim()) {
      return res.status(400).json({ error: '岗位JD内容不能为空' });
    }

    if (resumeText.length > 50000) {
      return res.status(400).json({ error: '简历内容过长' });
    }

    if (jdText.length > 20000) {
      return res.status(400).json({ error: '岗位JD内容过长' });
    }

    const result = await optimizeResume(resumeText, jdText);

    res.json({
      success: true,
      optimized: result
    });
  } catch (error) {
    console.error('简历优化错误:', error);
    res.status(500).json({
      error: '简历优化失败',
      message: error.message || '服务暂时不可用，请稍后重试'
    });
  }
});

module.exports = router;
