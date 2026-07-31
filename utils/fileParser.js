const fs = require('fs');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

/**
 * 解析PDF文件
 * @param {string} filePath - PDF文件路径
 * @returns {Promise<string>} 提取的文本内容
 */
async function parsePDFFile(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    throw new Error(`PDF解析失败: ${error.message}`);
  }
}

/**
 * 解析图片文件（OCR识别）
 * @param {string} filePath - 图片文件路径
 * @returns {Promise<string>} OCR识别的文本内容
 */
async function parseImageFile(filePath) {
  try {
    const { data } = await Tesseract.recognize(filePath, 'chi_sim+eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR进度: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    return data.text || '';
  } catch (error) {
    throw new Error(`图片OCR识别失败: ${error.message}`);
  }
}

/**
 * 解析TXT文本文件
 * @param {string} filePath - TXT文件路径
 * @returns {string} 文本内容
 */
function parseTxtFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`文本文件读取失败: ${error.message}`);
  }
}

module.exports = {
  parsePDFFile,
  parseImageFile,
  parseTxtFile
};
