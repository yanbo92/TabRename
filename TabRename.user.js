// ==UserScript==
// @name        Title Manager
// @namespace   grom
// @description Manage page titles per (sub)domain. On any website, click Greasemonkey > User Script Commands > Title Manager's menu.
// @include     *
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @version     1.2.0.20240630
// @run-at      document-end
// @downloadURL https://update.greasyfork.org/scripts/194/Title%20Manager.user.js
// @updateURL https://update.greasyfork.org/scripts/194/Title%20Manager.meta.js
// ==/UserScript==

if (typeof GM_getValue === 'undefined' || typeof GM_setValue === 'undefined') {
  alert('=== Title Manager ===\n\nUnable to load or store values.\nPlease use supported script managers:\nGreasemonkey, Tampermonkey...');
}

/**
 * 获取元素的快捷方式
 * @param {string} id - 元素ID
 * @param {Document} [context] - 可选的上下文
 * @returns {Element} - 匹配的元素
 */
function getById(id, context) { return (context || document).getElementById(id); }

/**
 * 获取元素的快捷方式
 * @param {string} tag - 标签名
 * @param {Document} [context] - 可选的上下文
 * @returns {HTMLCollection} - 匹配的元素集合
 */
function getByTag(tag, context) { return (context || document).getElementsByTagName(tag); }

/**
 * 初始化页面标题
 * 根据匹配规则替换页面标题
 */
function initializeTitle() {
  var domainPatterns = GM_getValue('domains-deletable-buffer', '') || GM_getValue('domains', '').replace(/\./g, '\\.');
  var domainMatch = window.location.host.toLowerCase().match(domainPatterns);
  var originalTitle = document.title;

  if (domainMatch) {
    var searchPattern = GM_getValue(domainMatch[0] + '-find', '');
    if (searchPattern.match(/^regex:/)) {
      searchPattern = searchPattern.replace(/^regex:/, '');
      searchPattern = new RegExp(searchPattern, 'i');
    }
    var replacePattern = GM_getValue(domainMatch[0] + '-with', '');
  }
  if (originalTitle && searchPattern) {
    document.title = originalTitle.replace(searchPattern, replacePattern);
  }
}

/**
 * 添加标题规则
 * @param {string} searchType - 搜索类型（字符串或正则表达式）
 * @param {string} shouldEscape - 是否转义
 * @param {boolean} isImport - 是否导入
 * @param {string} domain - 域名
 * @param {string} findPattern - 搜索模式
 * @param {string} replacePattern - 替换模式
 */
function addTitleRule(searchType, shouldEscape, isImport, domain, findPattern, replacePattern) {
  var errorNotifier = getById('error-notifier');
  if (!isImport) {
    domain = getById('domain-input').value.toLowerCase();
    findPattern = getById('find-input').value;
    replacePattern = getById('replace-input').value;
  }
  if (!validateDomain(domain)) {
    errorNotifier.innerHTML = '域名无效。请使用字母 a-z、数字 0-9、下划线 _、减号 - 或点 .';
    return;
  }
  if (searchType === 'regex') {
    if (!findPattern.match(/^regex:/)) findPattern = findPattern.replace(/^/, 'regex:');
  }
  if (findPattern) {
    var existingDomains = GM_getValue('domains', '');
    if (!existingDomains) {
      GM_setValue('domains', domain);
    } else {
      existingDomains = addDomainToList(existingDomains, domain);
      GM_setValue('domains', existingDomains);
    }
    GM_setValue(domain + '-find', findPattern);
    if (replacePattern) {
      replacePattern = escapeReplacePattern(shouldEscape, replacePattern);
      GM_setValue(domain + '-with', replacePattern);
    } else if (GM_getValue(domain + '-with', '')) {
      GM_deleteValue(domain + '-with');
    }
    if (!isImport) {
      GM_setValue('domains-deletable-buffer', existingDomains.replace(/\./g, '\\.'));
      errorNotifier.innerHTML = '成功！规则已添加。';
    }
  }
}

/**
 * 验证域名
 * @param {string} domain - 要验证的域名
 * @returns {boolean} - 域名是否有效
 */
function validateDomain(domain) {
  var domainCheck = /^[a-z0-9_\.-]+$/;
  return domain.match(domainCheck);
}

/**
 * 转义替换模式中的美元符号
 * @param {string} shouldEscape - 是否转义
 * @param {string} replacePattern - 替换模式
 * @returns {string} - 转义后的替换模式
 */
function escapeReplacePattern(shouldEscape, replacePattern) {
  if (shouldEscape === 'escape') return replacePattern.replace(/\$/g, '$$$$');
  return replacePattern;
}

/**
 * 将域名添加到现有列表
 * @param {string} existingDomains - 现有的域名列表
 * @param {string} domain - 要添加的域名
 * @returns {string} - 更新后的域名列表
 */
function addDomainToList(existingDomains, domain) {
  var domainRegex = new RegExp('(^|\\|)' + domain.replace(/\./g, '\\.') + '($|\\|)');
  if (!existingDomains.match(domainRegex)) {
    existingDomains += '|' + domain;
  }
  return existingDomains;
}

/**
 * 管理标题规则
 * 显示现有规则并提供导入、导出、排序功能
 */
function manageTitleRules() {
  var doc = document;
  doc.documentElement.innerHTML = '<head><style>.item{white-space:pre;font-family:monospace;margin:0;padding:0;}html>input{margin-left:1em;}</style></head>';
  var domains = GM_getValue('domains', '');
  if (domains) {
    displayRules(domains);
  }
  createManagementUI(doc, domains);
}

/**
 * 显示现有规则
 * @param {string} domains - 域名列表
 */
function displayRules(domains) {
  var doc = document;
  var domainList = domains.split('|');
  for (var i = 0, len = domainList.length; i < len; i++) {
    var findPattern = GM_getValue(domainList[i] + '-find', '');
    var replacePattern = GM_getValue(domainList[i] + '-with', '');
    var ruleBox = createRuleBox(domainList[i], findPattern, replacePattern);
    if (doc.body) doc.body.appendChild(ruleBox);
    else doc.documentElement.appendChild(ruleBox);
  }
}

/**
 * 创建规则显示框
 * @param {string} domain - 域名
 * @param {string} findPattern - 搜索模式
 * @param {string} replacePattern - 替换模式
 * @returns {Element} - 规则显示框
 */
function createRuleBox(domain, findPattern, replacePattern) {
  var ruleBox = document.createElement('div');
  ruleBox.className = 'item';
  ruleBox.innerHTML = '<span>' + domain + '</span><br /><span>' + findPattern + '</span>\
<br /><span>' + replacePattern + '</span><br /><button>Remove</button><br /><span>========</span>';
  getByTag('button', ruleBox)[0].addEventListener('click', removeTitleRule);
  return ruleBox;
}

/**
 * 创建管理界面
 * @param {Document} doc - 文档对象
 * @param {string} domains - 域名列表
 */
function createManagementUI(doc, domains) {
  var importList = doc.createElement('textarea');
  importList.id = 'import-list';
  doc.documentElement.appendChild(importList);
  var importButton = doc.createElement('input');
  importButton.type = 'button'; importButton.id = 'import'; importButton.value = 'Import';
  doc.documentElement.appendChild(importButton);
  importButton.addEventListener('click', importTitleRules);
  if (domains.split('|').length > 1) {
    var sortButton = doc.createElement('input');
    sortButton.type = 'button'; sortButton.id = 'sort'; sortButton.value = 'Sort';
    doc.documentElement.appendChild(sortButton);
    sortButton.addEventListener('click', sortTitleRules);
    var exportButton = doc.createElement('input');
    exportButton.type = 'button'; exportButton.id = 'export'; exportButton.value = 'Prepare for export';
    doc.documentElement.appendChild(exportButton);
    exportButton.addEventListener('click', exportTitleRules);
  }
}

/**
 * 移除标题规则
 * 从列表中删除规则并更新存储
 */
function removeTitleRule() {
  var item = this.parentNode;
  var domain = getByTag('span', item)[0].innerHTML;
  GM_deleteValue(domain + '-find');
  GM_deleteValue(domain + '-with');
  var domains = GM_getValue('domains', '');
  domains = removeDomainFromList(domains, domain);
  GM_setValue('domains', domains);
  item.parentNode.removeChild(item);
  GM_setValue('domains-deletable-buffer', domains.replace(/\./g, '\\.'));
}

/**
 * 从域名列表中移除域名
 * @param {string} domains - 域名列表
 * @param {string} domain - 要移除的域名
 * @returns {string} - 更新后的域名列表
 */
function removeDomainFromList(domains, domain) {
  var domainRegex = new RegExp('(^|\\|)' + domain.replace(/\./g, '\\.') + '($|\\|)');
  domains = domains.replace(domainRegex, '$1').replace(/(\|)\||\|$/g, '$1');
  return domains;
}

/**
 * 导入标题规则
 * 从文本框导入规则并更新存储
 */
function importTitleRules() {
  var list = getById('import-list').value;
  var rules = list.match(/.+/g).join('--------').replace(/(--------)+========$/, '').split('========--------');
  for (var i = 0, len = rules.length; i < len; i++) {
    var rule = rules[i].split('--------');
    if (rule[0] && rule[1]) addTitleRule('str', 'noescape', true, rule[0], rule[1], rule[2]);
  }
  GM_setValue('domains-deletable-buffer', GM_getValue('domains', '').replace(/\./g, '\\.'));
  manageTitleRules();
}

/**
 * 排序标题规则
 * 对规则进行排序并更新存储
 */
function sortTitleRules() {
  var domains = GM_getValue('domains', '').split('|').sort().join('|');
  GM_setValue('domains', domains);
  GM_setValue('domains-deletable-buffer', domains.replace(/\./g, '\\.'));
  manageTitleRules();
}

/**
 * 导出标题规则
 * 准备导出规则并显示提示
 */
function exportTitleRules() {
  var elementsToRemove = document.querySelectorAll('#grom-TitleManager, button, button+br, textarea, input, body>*:not(.item)');
  for (var i = 0, len = elementsToRemove.length; i < len; i++) {
    elementsToRemove[i].parentNode.removeChild(elementsToRemove[i]);
  }
  alert('=== Title Manager ===\n\n列表已准备导出。你需要：\n选择页面上的所有文本 (Ctrl-A) 并复制它 (Ctrl-C)。\n然后将该文本粘贴到任何地方，可能是一个新文件。')
}

/**
 * 切换快速菜单
 * 显示或隐藏标题管理界面
 */
function toggleQuickMenu() {
  var overlay = getById('overlay');
  var box = getById('grom-TitleManager');

  if (box) {
    box.parentNode.removeChild(box);
    overlay.parentNode.removeChild(overlay);
    return;
  }

  overlay = createOverlay();
  box = createPopupBox();

  getById('add-button').addEventListener('click', function() { addTitleRule('str','escape', false) });
  getById('add-regex-button').addEventListener('click', function() { addTitleRule('regex','noescape', false) });
  getById('manage-button').addEventListener('click', manageTitleRules);
  getById('close-button').addEventListener('click', toggleQuickMenu);
}

/**
 * 创建覆盖层
 * @returns {Element} - 创建的覆盖层
 */
function createOverlay() {
  var overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;';
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * 创建弹出框
 * @returns {Element} - 创建的弹出框
 */
function createPopupBox() {
  var box = document.createElement('div');
  box.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:600px;padding:1em;background:white;border-radius:5px;box-shadow:0 4px 6px rgba(0,0,0,0.5);z-index:1001;text-align:center;';
  box.id = 'grom-TitleManager';
  box.innerHTML = '<h1 style="margin:initial;">Title Manager<input type="button" id="close-button" value="X" style="float:right;" /></h1>\
    <p>完整标题：" <strong>' + document.title + '</strong> "</p>\
    <p id="error-notifier"></p>\
    <p>域名：<input type="text" id="domain-input" value="' + window.location.host.toLowerCase() + '" /></p>\
    <p>搜索：<input type="text" id="find-input" value="' + document.title + '" /></p>\
    <p>替换：<input type="text" id="replace-input" value="" /></p>\
    <p><input type="button" id="add-button" value="添加" /> 或 <input type="button" id="add-regex-button" value="添加为正则表达式" />\
    &nbsp; &nbsp; &nbsp; <input type="button" id="manage-button" value="查看和管理所有标题规则" /></p>\
    <br /><br />';
  document.body.appendChild(box);
  box.scrollIntoView();
  return box;
}

GM_registerMenuCommand("menu", toggleQuickMenu);
initializeTitle();
