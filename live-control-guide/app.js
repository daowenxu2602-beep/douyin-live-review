/* ============================================
   抖音电商直播场控与运营全能指南 - 主应用
   ============================================ */

(function() {
'use strict';

// ===== 知识库内容映射 =====
const CONTENT_MAP = {
  'role-framework': { file: 'content/role-framework.md', title: '场控vs运营：角色框架' },
  'pre-live-prep': { file: 'content/pre-live-prep.md', title: '直播前准备' },
  'live-emergency': { file: 'content/live-emergency.md', title: '直播中应急处理' },
  'post-live-review': { file: 'content/post-live-review.md', title: '直播后复盘' },
  'team-collaboration': { file: 'content/team-collaboration.md', title: '团队协作与管理' },
  'career-development': { file: 'content/career-development.md', title: '职业发展' },
  'data-analysis-guide': { file: 'content/data-analysis-guide.md', title: '数据分析诊断指南' },
  'training-template': { file: 'content/training-template.md', title: '培训文档模板' }
};

// ===== AI 配置 =====
const API_DEFAULTS = {
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', vlModel: 'deepseek-chat' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', vlModel: 'gpt-4o' },
  baidu: { baseUrl: 'https://qianfan.baidubce.com/v2', model: 'ernie-4.0-8k', vlModel: 'ernie-4.0-vl' }
};

// 系统提示词（嵌入知识库摘要，让AI回答更精准）
const SYSTEM_PROMPT = `你是一个抖音电商直播场控与运营专家助手。你的任务是帮助场控和运营解决工作中的实际问题。

你具备以下知识体系：
1. 场控与运营的角色区别：场控对单场直播即时结果负责，运营对长期增长和盈利负责
2. 直播前准备：选品排品（引流款→利润款→爆款返场→清仓款）、话术结构（开场钩子→产品讲解→价格锚定→催单逼单→承接）、设备检查、流量预热
3. 直播中应急：流量暴跌（5分钟降30%需排查）、转化异常、主播状态管理、设备故障（断流30秒内处理）、黑粉应对、后台操作异常
4. 直播后复盘：T+0快速复盘、T+1深度复盘、T+7周期复盘；GMV归因（流量×转化率×客单价）
5. 团队协作：场控是主播的"外脑"，运营是场控的"策略大脑"，中控是"操作手"
6. 职业发展：场控→运营需要控场≥100场、独立复盘能力、策略思维；晋升后从执行转向策略+统筹
7. 数据分析：罗盘大屏（GMV/在线人数/转化率/UV价值）、千川（ROI/CTR/CPA）、抖店（退款率/体验分）
8. 行业基准：转化率（服装2-5%/美妆3-8%/食品5-15%）、UV价值（服装2-5元/美妆3-8元）、停留时长（服装>90s/美妆>60s）

回答原则：
- 给具体可执行的动作，不给空洞口号
- 结合抖音电商实际场景
- 回答结构：先给结论/建议，再给原因分析，最后给可执行动作
- 使用行业术语，不额外解释基础概念`;

// ===== DOM 引用 =====
const $ = id => document.getElementById(id);
const navItems = document.querySelectorAll('.nav-item');
const contentView = $('contentView');
const qaView = $('qaView');
const analysisView = $('analysisView');
const breadcrumb = $('breadcrumb');

// ===== 状态 =====
let currentTab = 'content';
let apiKey = '';
let apiProvider = 'deepseek';
let apiBaseUrl = '';
let uploadedImages = [];

// ===== 初始化 =====
function init() {
  // 加载默认内容
  loadContent('role-framework');

  // 导航点击
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const content = item.dataset.content;
      const tab = item.dataset.tab;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      if (content) {
        showTab('content');
        loadContent(content);
      } else if (tab) {
        showTab(tab);
      }
    });
  });

  // 移动端菜单
  $('menuToggle').addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
  });

  // AI问答
  $('qaSendBtn').addEventListener('click', sendQuestion);
  $('qaInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  });

  // 保存API Key
  $('saveKeyBtn').addEventListener('click', () => saveApiKey('qa'));
  $('saveKeyBtn2').addEventListener('click', () => saveApiKey('analysis'));

  // 图片上传
  setupImageUpload();

  // 分析按钮
  $('analyzeBtn').addEventListener('click', analyzeImages);
}

// ===== Tab切换 =====
function showTab(tab) {
  currentTab = tab;
  contentView.style.display = tab === 'content' ? 'block' : 'none';
  qaView.style.display = tab === 'qa' ? 'block' : 'none';
  analysisView.style.display = tab === 'analysis' ? 'block' : 'none';

  const titles = { content: '知识库', qa: 'AI智能问答', analysis: '数据截图分析' };
  breadcrumb.textContent = titles[tab] || '首页';
}

// ===== 加载知识库内容 =====
async function loadContent(key) {
  const config = CONTENT_MAP[key];
  if (!config) return;

  showTab('content');
  breadcrumb.textContent = config.title;
  contentView.innerHTML = '<div class="content-loader">加载中...</div>';

  try {
    const resp = await fetch(config.file);
    if (!resp.ok) throw new Error('File not found');
    const md = await resp.text();
    const html = marked.parse(md);
    contentView.innerHTML = '<div class="markdown-body">' + html + '</div>';
  } catch(e) {
    // 如果fetch失败（如本地file://打开），尝试用内嵌方式
    contentView.innerHTML = '<div class="content-loader"><p>无法加载内容文件。</p><p>如果你是本地打开HTML文件，请使用HTTP服务器（如 python -m http.server）访问，或部署到GitHub Pages。</p></div>';
  }
}

// ===== API Key 管理 =====
function saveApiKey(context) {
  const isQA = context === 'qa';
  const provider = isQA ? $('apiProvider').value : $('apiProvider2').value;
  const key = isQA ? $('apiKeyInput').value.trim() : $('apiKeyInput2').value.trim();
  const url = isQA ? $('apiBaseUrl').value.trim() : $('apiBaseUrl2').value.trim();

  if (!key) {
    if (isQA) $('keyStatus').textContent = '请填写API Key';
    else $('keyStatus2').textContent = '请填写API Key';
    return;
  }

  apiProvider = provider;
  apiKey = key;
  apiBaseUrl = url || API_DEFAULTS[provider].baseUrl;

  // 同步到两个区域
  $('apiProvider').value = provider;
  $('apiProvider2').value = provider;
  $('apiKeyInput').value = key;
  $('apiKeyInput2').value = key;
  $('apiBaseUrl').value = apiBaseUrl;
  $('apiBaseUrl2').value = apiBaseUrl;

  $('keyStatus').textContent = '已保存';
  $('keyStatus2').textContent = '已保存';
}

// ===== AI问答 =====
async function sendQuestion() {
  const input = $('qaInput');
  const question = input.value.trim();
  if (!question) return;

  if (!apiKey) {
    appendQAMessage('user', question);
    appendQAMessage('assistant', '请先在上方设置API Key，才能使用AI问答功能。');
    return;
  }

  input.value = '';
  appendQAMessage('user', question);
  showTyping();

  try {
    const answer = await callAI(question, SYSTEM_PROMPT);
    removeTyping();
    appendQAMessage('assistant', answer);
  } catch(e) {
    removeTyping();
    appendQAMessage('assistant', '请求失败：' + e.message + '\n\n请检查API Key是否正确、API服务是否可用。');
  }
}

function appendQAMessage(role, text) {
  const chat = $('qaChat');
  const msg = document.createElement('div');
  msg.className = 'qa-message ' + role;
  const avatar = role === 'assistant' ? 'AI' : 'ME';
  const bodyHtml = marked.parse(text);
  msg.innerHTML = '<div class="msg-avatar">' + avatar + '</div><div class="msg-body">' + bodyHtml + '</div>';
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  const chat = $('qaChat');
  const msg = document.createElement('div');
  msg.className = 'qa-message assistant';
  msg.id = 'typingMsg';
  msg.innerHTML = '<div class="msg-avatar">AI</div><div class="typing-indicator"><span></span><span></span><span></span></div>';
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function removeTyping() {
  const el = $('typingMsg');
  if (el) el.remove();
}

// ===== 图片上传 =====
function setupImageUpload() {
  const zone = $('uploadZone');
  const input = $('fileInput');

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  input.addEventListener('change', () => handleFiles(input.files));
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      uploadedImages.push({ name: file.name, data: e.target.result });
      renderPreviews();
      $('analyzeBtn').disabled = uploadedImages.length === 0;
    };
    reader.readAsDataURL(file);
  });
}

function renderPreviews() {
  const area = $('previewArea');
  area.innerHTML = '';
  uploadedImages.forEach((img, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = '<img src="' + img.data + '" alt="' + img.name + '"><button class="remove-btn" data-idx="' + idx + '">x</button>';
    area.appendChild(item);
  });
  area.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      uploadedImages.splice(parseInt(btn.dataset.idx), 1);
      renderPreviews();
      $('analyzeBtn').disabled = uploadedImages.length === 0;
    });
  });
}

// ===== 图片分析 =====
async function analyzeImages() {
  if (uploadedImages.length === 0) return;
  if (!apiKey) {
    $('analysisResult').innerHTML = '<p style="color:var(--danger)">请先设置API Key（需支持图片识别的模型）。</p>';
    return;
  }

  const prompt = $('analysisPrompt').value.trim() || '请分析这些直播数据截图，识别数据来源和核心指标，对照行业基准值诊断问题，并给出优化建议。';
  const result = $('analysisResult');
  result.innerHTML = '<div class="content-loader">正在分析数据，请稍候（可能需要10-30秒）...</div>';

  // 构建多图片消息
  const content = [{ type: 'text', text: prompt + '\n\n参考以下知识库内容进行分析：\n' + SYSTEM_PROMPT }];
  uploadedImages.forEach(img => {
    content.push({
      type: 'image_url',
      image_url: { url: img.data }
    });
  });

  try {
    const answer = await callAIMultimodal(content);
    result.innerHTML = '<div class="markdown-body">' + marked.parse(answer) + '</div>';
  } catch(e) {
    result.innerHTML = '<p style="color:var(--danger)">分析失败：' + e.message + '</p><p style="font-size:13px;color:var(--text-light)">请确保你使用的模型支持图片识别（如GPT-4o、DeepSeek-VL等），且API Key有效。</p>';
  }
}

// ===== AI API调用 =====
async function callAI(userMessage, systemPrompt) {
  const defaults = API_DEFAULTS[apiProvider];
  const base = apiBaseUrl || defaults.baseUrl;
  const url = base + '/chat/completions';

  const body = {
    model: defaults.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 2000
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('HTTP ' + resp.status + ': ' + err.substring(0, 200));
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

async function callAIMultimodal(content) {
  const defaults = API_DEFAULTS[apiProvider];
  const base = apiBaseUrl || defaults.baseUrl;
  const url = base + '/chat/completions';

  const body = {
    model: defaults.vlModel,
    messages: [
      { role: 'user', content: content }
    ],
    temperature: 0.7,
    max_tokens: 3000
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('HTTP ' + resp.status + ': ' + err.substring(0, 200));
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

// ===== 启动 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
