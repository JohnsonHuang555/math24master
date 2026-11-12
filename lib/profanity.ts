/**
 * 暱稱的不雅字詞檢查（訪客暱稱、多人對戰暱稱）。前端擋下輸入，server 再檢查一次，
 * 避免繞過前端直接送出。
 *
 * 不追求擋下所有變體，目標是擋掉常見髒話與歧視字眼，同時不要誤擋正常名字：
 * - 中文沒有斷詞，用「包含」比對；單字容易誤擋（幹部、操場），所以只列成詞的寫法
 * - 英文短字（ass、cum）只比對完整單字，避免擋到 class、cucumber；長字才用「包含」比對
 *   （已知代價：cunt 會擋到 Scunthorpe 這種極少見的名字）
 * - 比對前先轉小寫、全形轉半形、拿掉空白與符號（f.u.c.k、幹 你 娘），英文再把常見的數字替代還原（sh1t）
 */

// 繁體與簡體都列；中文以「包含」比對
const CHINESE_WORDS = [
  // 幹、操系列（只列成詞的寫法）
  '幹你',
  '幹妳',
  '幹他',
  '幹她',
  '幹林',
  '幹拎',
  '幹恁',
  '干你',
  '干妳',
  '干他',
  '干她',
  '干林',
  '操你',
  '操妳',
  '操他',
  '操她',
  '肏',
  '屄',
  '屌',
  '尻槍',
  '打手槍',
  // 台語髒話
  '靠北',
  '靠杯',
  '靠夭',
  '靠腰',
  '機掰',
  '雞掰',
  '機八',
  '雞八',
  '機歪',
  '雞歪',
  '鸡掰',
  '机掰',
  '機巴',
  '雞巴',
  '鸡巴',
  '懶叫',
  '懶覺',
  '懒叫',
  '洨',
  '三小',
  '殺小',
  '杀小',
  '哭爸',
  '哭么',
  '哭夭',
  '破麻',
  '賽恁娘',
  // 罵人、侮辱
  '你娘',
  '妳娘',
  '恁娘',
  '他媽的',
  '他妈的',
  '你媽',
  '你妈',
  '妳媽',
  '去死',
  '死全家',
  '婊子',
  '婊',
  '賤人',
  '贱人',
  '賤貨',
  '贱货',
  '妓女',
  '娼',
  '淫',
  '強姦',
  '强奸',
  '強暴',
  '智障',
  '腦殘',
  '脑残',
  '白癡',
  '白痴',
  '弱智',
  '低能',
  '廢物',
  '废物',
  '傻逼',
  '傻屄',
  '煞筆',
  '沙比',
  '草泥馬',
  '草泥马',
  '尼瑪',
  '尼玛',
  '你妹',
  '狗娘',
  '王八蛋',
  '混蛋',
  '畜生',
  '畜牲',
  '人渣',
  '雜種',
  '杂种',
  '支那',
  '黑鬼',
  '死gay',
  // 性器官、性行為
  '陰莖',
  '阴茎',
  '陰道',
  '阴道',
  '雞雞',
  '鸡鸡',
  '奶子',
  '做愛',
  '做爱',
  '口交',
  '肛交',
  '性交',
  '自慰',
  '射精',
  '潮吹',
];

// 英文長字：拿掉符號後以「包含」比對（不會出現在正常英文名字裡）
const ENGLISH_SUBSTRINGS = [
  'fuck',
  'fck',
  'shit',
  'bitch',
  'cunt',
  'pussy',
  'penis',
  'vagina',
  'whore',
  'slut',
  'bastard',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'asshole',
  'motherf',
  'wanker',
  'bollock',
  'dildo',
  'blowjob',
  'handjob',
  'jerkoff',
  'cumshot',
  'hitler',
];

// 英文短字：只比對完整單字（避免 class、assess、cucumber、scunthorpe 這類誤擋）
const ENGLISH_WORDS = new Set([
  // 這幾個會出現在正常的字或名字裡（Fukuda、Hancock、Dickens、grape、Nazir），只擋完整單字
  'fuk',
  'dick',
  'dicks',
  'cock',
  'cocks',
  'rape',
  'porn',
  'nazi',
  'ass',
  'arse',
  'cum',
  'fag',
  'fags',
  'tit',
  'tits',
  'twat',
  'prick',
  'piss',
  'wtf',
  'stfu',
  'kys',
  'chink',
  'spic',
  'kike',
  'gook',
  'tmd',
  'nmsl',
  'sb',
]);

// 英文常見的數字與符號替代（只用在英文的比對，中文不受影響）
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

/** 全形轉半形、轉小寫，並拿掉零寬字元 */
function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[​-‍﻿]/g, '');
}

/** 只留下文字（中文、英文字母、數字），其餘符號與空白全部拿掉 */
function lettersOnly(text: string): string {
  return text.replace(/[^\p{L}\p{N}]/gu, '');
}

function deLeet(text: string): string {
  return Array.from(text, ch => LEET[ch] ?? ch).join('');
}

/** 文字裡是否有不雅字詞 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalized = normalize(text);
  const compact = lettersOnly(normalized);
  const compactLatin = lettersOnly(deLeet(normalized));

  if (CHINESE_WORDS.some(word => compact.includes(word))) return true;
  if (ENGLISH_SUBSTRINGS.some(word => compactLatin.includes(word))) return true;

  // 短字依空白、符號、中文與英文的交界切成單字後比對
  const tokens = deLeet(normalized)
    .split(/[^a-z]+/)
    .filter(Boolean);
  return tokens.some(token => ENGLISH_WORDS.has(token));
}
