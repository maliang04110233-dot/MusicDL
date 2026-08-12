/**
 * MusicDL i18n 国际化
 * 
 * ES Module — export 供其他模块 import，同时保留 window 全局
 */

import zh from './lang/zh.json';
import en from './lang/en.json';

const LANGUAGES = { zh, en };
let _lang = 'zh';

export function loadLanguage(code) {
  if (!LANGUAGES[code]) code = 'zh';
  _lang = code;
}

export function getLang() {
  return _lang;
}

export function t(key, params = {}) {
  const msg = LANGUAGES[_lang]?.[key] || key;
  // 替换 {param}
  for (const [k, v] of Object.entries(params)) {
    const regex = new RegExp(`\\{${k}\\}`, 'g');
    // eslint-disable-next-line no-param-reassign
    msg = msg.replace(regex, v);
  }
  return msg;
}

export async function applyTranslations() {
  const code = await api.getPref('language') || 'zh';
  loadLanguage(code);
  // 用 data-i18n 属性替换文本
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else if (el.tagName === 'OPTION') {
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });
}

window.i18n = { t, getLang, applyTranslations, loadLanguage };
