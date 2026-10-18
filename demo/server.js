'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Readable } = require('stream');
const iconv = require('iconv-lite');

const ROOT = path.resolve(__dirname, '..');
const DEMO = __dirname;
const PORT = Number(process.env.PORT || 8080);
const PUBLIC_ORIGIN = (process.env.PUBLIC_ORIGIN || 'http://localhost:' + PORT).replace(/\/+$/, '');
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'localhost';
const DANMAKU_PORT = Number(process.env.DANMAKU_PORT || 88);
const SESSION_FILE = path.join(DEMO, '.login-sessions.enc');
const LEGACY_SESSION_FILE = path.join(DEMO, '.login-sessions.json');
const SESSION_KEY_FILE = path.join(DEMO, '.session-key');
let sessionKey = null;

const AID = '116895554473263';
const CID = '39824328708';

const BILI_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Referer: 'https://www.bilibili.com/video/av' + AID + '/',
  Origin: 'https://www.bilibili.com',
};

const LOGIN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Referer: 'https://www.bilibili.com/',
  Origin: 'https://www.bilibili.com',
};

const loginQrSessions = new Map();
const loginUserSessions = new Map();

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim();
    }
  }
  return '';
}

function getLoginSession(req) {
  const sid = getCookie(req, 'BCSESS');
  if (!sid) return null;
  const session = loginUserSessions.get(sid);
  if (!session) return null;
  if (session.expires <= Date.now()) {
    loginUserSessions.delete(sid);
    return null;
  }
  if (!session.sid) session.sid = sid;
  return session;
}

function getLatestLoginSession() {
  let found = null;
  for (const session of loginUserSessions.values()) {
    if (session.expires > Date.now() && (!found || session.expires > found.expires)) {
      found = session;
    }
  }
  return found;
}

function getSessionKey() {
  if (sessionKey) return sessionKey;

  const secret = String(process.env.SESSION_SECRET || '').trim();
  if (secret) {
    sessionKey = crypto.createHash('sha256').update(secret).digest();
    return sessionKey;
  }

  try {
    const stored = fs.readFileSync(SESSION_KEY_FILE, 'utf8').trim();
    if (/^[0-9a-f]{64}$/i.test(stored)) {
      sessionKey = Buffer.from(stored, 'hex');
      return sessionKey;
    }
  } catch (error) {}

  sessionKey = crypto.randomBytes(32);
  try {
    fs.writeFileSync(SESSION_KEY_FILE, sessionKey.toString('hex'), { mode: 0o600 });
  } catch (error) {}
  return sessionKey;
}

function saveLoginSessions() {
  try {
    const rows = Array.from(loginUserSessions.entries());
    if (!rows.length) {
      try {
        fs.unlinkSync(SESSION_FILE);
      } catch (error) {}
      return;
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getSessionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(rows), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    fs.writeFileSync(
      SESSION_FILE,
      Buffer.concat([Buffer.from('BCS1'), iv, tag, encrypted]),
      { mode: 0o600 }
    );
  } catch (error) {}
}

function loadLoginSessions() {
  try {
    const payload = fs.readFileSync(SESSION_FILE);
    if (payload.subarray(0, 4).toString('latin1') !== 'BCS1') return;
    const iv = payload.subarray(4, 16);
    const tag = payload.subarray(16, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getSessionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(payload.subarray(32)),
      decipher.final(),
    ]);
    const rows = JSON.parse(decrypted.toString('utf8'));
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!Array.isArray(row) || !row[0] || !row[1]) continue;
      if (Number(row[1].expires) > Date.now()) loginUserSessions.set(row[0], row[1]);
    }
    return;
  } catch (error) {}

  try {
    const legacy = fs
      .readFileSync(LEGACY_SESSION_FILE, 'utf8')
      .replace(/^\uFEFF/, '');
    const rows = JSON.parse(legacy);
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!Array.isArray(row) || !row[0] || !row[1]) continue;
      if (Number(row[1].expires) > Date.now()) loginUserSessions.set(row[0], row[1]);
    }
    saveLoginSessions();
    try {
      fs.unlinkSync(LEGACY_SESSION_FILE);
    } catch (error) {}
  } catch (error) {}
}

function defaultSpaceProfile(mid) {
  if (String(mid) !== '2') return {};
  return {
    nickname: '碧诗',
    sex: '男',
    birthday: '1989-09-19',
    intro: '=w=',
    qq: '.',
    msn: 'h@loli.my',
    phone: '0',
    mobile: '0',
    address: '',
    constellation: '处女座',
    blood: 'O',
    height: '>168 厘米',
    body: '苗条',
    languages: '普通话,英语,日语,德语',
    income: '低于1000元',
    education: '博士以上',
    housing: '租房',
    industry: '虚心',
  };
}

function setCookiesFromResponse(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const combined = response.headers.get('set-cookie');
  return combined ? [combined] : [];
}

function cookieHeaderFrom(setCookies) {
  return setCookies
    .map((cookie) => cookie.split(';')[0])
    .filter(Boolean)
    .join('; ');
}

function sendJson(res, status, data, headers) {
  const body = JSON.stringify(data);
  res.writeHead(
    status,
    Object.assign(
      {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      },
      headers || {}
    )
  );
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const APP_KEY = 'dfca71928277209b';
const APP_SEC = 'b5475a8825547a4fc26c7d518eaaa02e';
const APP_UA =
  'Mozilla/5.0 BiliDroid/2.0.1 (bbcallen@gmail.com) os/android model/android_hd' +
  ' mobi_app/android_hd build/2001100 channel/master innerVer/2001100 osVer/15 network/2';
const APP_STATISTICS = '{"appId":5,"platform":3,"version":"2.0.1","abtest":""}';

const smsLoginSessions = new Map();
const biliCookieJar = new Map();
let biliCookiesReady = null;

function md5Hex(value) {
  return crypto.createHash('md5').update(String(value), 'utf8').digest('hex');
}

function javaUrlEncode(value) {
  return encodeURIComponent(value == null ? '' : String(value))
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase())
    .replace(/~/g, '%7E');
}

function appSign(params) {
  params.appkey = APP_KEY;
  params.ts = String(Math.floor(Date.now() / 1000));
  const query = Object.keys(params)
    .sort()
    .map((key) => javaUrlEncode(key) + '=' + javaUrlEncode(params[key]))
    .join('&');
  params.sign = md5Hex(query + APP_SEC);
  return params;
}

function appHeaders(buvid) {
  return {
    'User-Agent': APP_UA,
    Accept: 'application/json, text/plain, */*',
    buvid: buvid,
    env: 'prod',
    'app-key': 'android_hd',
    'x-bili-trace-id': '11111111111111111111111111111111:1111111111111111:0:0',
    'x-bili-aurora-eid': '',
    'x-bili-aurora-zone': '',
    'bili-http-engine': 'cronet',
    Referer: 'https://www.bilibili.com/',
    Origin: 'https://www.bilibili.com',
  };
}

function randomBuvid() {
  const md5 = md5Hex(crypto.randomBytes(16).toString('hex'));
  return 'XY' + md5[2] + md5[12] + md5[22] + md5;
}

function randomDeviceId() {
  const bytes = crypto.randomBytes(31);
  const now = new Date();
  const bcd = (value) => ((Math.floor(value / 10) << 4) | (value % 10)) & 0xff;
  bytes[16] = bcd(now.getFullYear() / 100);
  bytes[17] = bcd(now.getFullYear() % 100);
  bytes[18] = bcd(now.getMonth() + 1);
  bytes[19] = bcd(now.getDate());
  bytes[20] = bcd(now.getHours());
  bytes[21] = bcd(now.getMinutes());
  bytes[22] = bcd(now.getSeconds());
  let sum = 0;
  for (let i = 0; i < 31; i++) sum += bytes[i];
  const check = (sum & 0xff).toString(16).padStart(2, '0');
  return crypto.createHash('md5').update(bytes).digest('hex') + check;
}

function cookieJarString() {
  return Array.from(biliCookieJar, ([name, value]) => name + '=' + value).join('; ');
}

function cookieJarGet(name) {
  return biliCookieJar.get(name) || '';
}

function mergeSetCookiesIntoJar(response) {
  for (const cookie of setCookiesFromResponse(response)) {
    const part = String(cookie).split(';')[0];
    const index = part.indexOf('=');
    if (index > 0) biliCookieJar.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
}

function genUuidInfoc() {
  const chars = '0123456789ABCDEF';
  const groups = [8, 4, 4, 4, 12];
  const mapped = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', '10'];
  let out = '';
  for (const length of groups) {
    for (let i = 0; i < length; i++) {
      out += mapped[Math.floor(Math.random() * 16)];
    }
    out += '-';
  }
  out = out.slice(0, -1);
  const suffix = String(Date.now() % 100000).padStart(5, '0');
  return out + suffix + 'infoc';
}

function genBlsid() {
  const chars = '0123456789ABCDEF';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * 16)];
  return out + '_' + Date.now().toString(16).toUpperCase();
}

function genBuvidFp() {
  const now = BigInt(Date.now());
  return (
    (now ^ 0x52dce729n).toString(16).padStart(16, '0') +
    (now ^ 0x38495ab5n).toString(16).padStart(16, '0')
  );
}

function webRequestHeaders() {
  return {
    'User-Agent': LOGIN_HEADERS['User-Agent'],
    Accept: 'application/json, text/plain, */*',
    Referer: 'https://www.bilibili.com/',
    Origin: 'https://www.bilibili.com',
  };
}

async function ensureBiliCookies() {
  if (biliCookiesReady) return biliCookiesReady;
  biliCookiesReady = (async () => {
    try {
      const response = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
        headers: webRequestHeaders(),
      });
      const json = await response.json();
      if (json.code === 0 && json.data) {
        if (json.data.b_3) biliCookieJar.set('buvid3', json.data.b_3);
        if (json.data.b_4) biliCookieJar.set('buvid4', json.data.b_4);
      }
      mergeSetCookiesIntoJar(response);
    } catch (error) {}
    if (!cookieJarGet('buvid3')) biliCookieJar.set('buvid3', randomBuvid());
    biliCookieJar.set('_uuid', genUuidInfoc());
    biliCookieJar.set('b_lsid', genBlsid());
    biliCookieJar.set('buvid_fp', genBuvidFp());
    biliCookieJar.set('b_nut', String(Math.floor(Date.now() / 1000)));
    biliCookieJar.set('LIVE_BUVID', 'AUTO' + String(Date.now()).slice(-10));
    biliCookieJar.set('browser_resolution', '1280-720');
    biliCookieJar.set('enable_web_push', 'DISABLE');
    biliCookieJar.set('home_feed_column', '4');
    biliCookieJar.set('PVID', '1');
    try {
      const ts = Math.floor(Date.now() / 1000);
      const hexsign = crypto
        .createHmac('sha256', 'XgwSnGZ1p')
        .update('ts' + ts)
        .digest('hex');
      const response = await fetch(
        'https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket' +
          '?key_id=ec02&hexsign=' +
          hexsign +
          '&context[ts]=' +
          ts,
        {
          method: 'POST',
          headers: Object.assign({}, webRequestHeaders(), {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
            Cookie: cookieJarString(),
          }),
        }
      );
      const json = await response.json();
      if (json.code === 0 && json.data && json.data.ticket) {
        biliCookieJar.set('bili_ticket', json.data.ticket);
        biliCookieJar.set(
          'bili_ticket_expires',
          String((json.data.created_at || ts) + 3 * 24 * 60 * 60)
        );
      }
      mergeSetCookiesIntoJar(response);
    } catch (error) {}
    return biliCookieJar;
  })();
  return biliCookiesReady;
}

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function postAppForm(url, params, buvid) {
  await ensureBiliCookies();
  const body = Object.keys(params)
    .map((key) => javaUrlEncode(key) + '=' + javaUrlEncode(params[key]))
    .join('&');
  const headers = Object.assign({}, appHeaders(buvid), {
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    Cookie: cookieJarString(),
  });
  const response = await fetch(url, { method: 'POST', headers, body });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error('哔哩哔哩返回了非 JSON 数据');
  }
  return { json, response };
}

async function getWebLoginKey() {
  const response = await fetch('https://passport.bilibili.com/x/passport-login/web/key', {
    headers: LOGIN_HEADERS,
  });
  const json = await response.json();
  if (json.code !== 0 || !json.data || !json.data.key) {
    throw new Error('获取登录密钥失败');
  }
  return json.data.key;
}

function rsaEncrypt(publicKey, plain) {
  return crypto
    .publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(plain, 'utf8')
    )
    .toString('base64');
}

function parseGeeParams(rawUrl) {
  const out = { gt: '', challenge: '', token: '' };
  if (!rawUrl) return out;
  try {
    const url = new URL(String(rawUrl).replace(/&amp;/g, '&'), 'https://www.bilibili.com');
    out.gt = url.searchParams.get('gee_gt') || '';
    out.challenge = url.searchParams.get('gee_challenge') || '';
    out.token = url.searchParams.get('recaptcha_token') || '';
  } catch (error) {}
  return out;
}

async function getAppPreCaptcha(buvid) {
  await ensureBiliCookies();
  const params = appSign({ disable_rcmd: '0' });
  const { json } = await postAppForm(
    'https://passport.bilibili.com/x/safecenter/captcha/pre',
    params,
    cookieJarGet('buvid3') || buvid
  );
  if (json.code === 0 && json.data) return json.data;
  return null;
}

function mergeCookies(existing, setCookies, cookieInfo) {
  const map = new Map();
  const add = (part) => {
    const index = part.indexOf('=');
    if (index <= 0) return;
    map.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  };
  for (const part of String(existing || '').split(';')) if (part.trim()) add(part.trim());
  for (const cookie of setCookies || []) add(String(cookie).split(';')[0]);
  if (cookieInfo && Array.isArray(cookieInfo.cookies)) {
    for (const cookie of cookieInfo.cookies) {
      if (cookie && cookie.name) map.set(cookie.name, cookie.value || '');
    }
  }
  return Array.from(map, ([name, value]) => name + '=' + value).join('; ');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'text/xml; charset=utf-8',
  '.swf': 'application/x-shockwave-flash',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
};

const videoUrlCache = new Map();
const videoInfoCache = new Map();
const bangumiCidMap = new Map();
const bangumiAidMap = new Map();
const bangumiInfoCache = new Map();
const cidInfoMap = new Map();
const wrappedCidMap = new Map();

const PAGE_TEMPLATE = fs.readFileSync(path.join(DEMO, 'video-page', 'index.html'), 'utf8');
const SPACE_TEMPLATE = fs.readFileSync(path.join(DEMO, 'space', 'index.html'), 'utf8');
const SPACE_INFO_TEMPLATE = fs.readFileSync(path.join(DEMO, 'space', 'info.html'), 'utf8');
const FAVLIST_TEMPLATE = fs.readFileSync(path.join(DEMO, 'favlist', 'index.html'), 'utf8');
const HISTORY_TEMPLATE = fs.readFileSync(path.join(DEMO, 'history', 'index.html'), 'utf8');
const SEARCH_TEMPLATE = fs.readFileSync(path.join(DEMO, 'search', 'index.html'), 'utf8');

function wrapInt32(value) {
  let n = BigInt(value) & 0xffffffffn;
  if (n >= 0x80000000n) n -= 0x100000000n;
  return n.toString();
}

function getRequestCookies(req) {
  const session = getLoginSession(req) || getLatestLoginSession();
  return session && session.cookies ? session.cookies : '';
}

async function getVideoUrl(aid, cid, cookies) {
  const authKey = cookies ? md5Hex(cookies).slice(0, 10) : 'anon';
  const epId = bangumiCidMap.get(String(cid)) || '';
  const key = aid + ':' + cid + ':' + authKey + (epId ? ':ep' + epId : '');
  const cached = videoUrlCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.url;
  }
  const headers = Object.assign({}, BILI_HEADERS, cookies ? { Cookie: cookies } : {});
  let api;
  if (epId) {
    headers.Referer = 'https://www.bilibili.com/bangumi/play/ep' + epId;
    api =
      'https://api.bilibili.com/pgc/player/web/playurl?ep_id=' +
      epId +
      '&cid=' +
      cid +
      '&qn=64&fnver=0&fourk=1&fnval=0';
  } else {
    api =
      'https://api.bilibili.com/x/player/playurl?avid=' +
      aid +
      '&cid=' +
      cid +
      '&qn=64&fnver=0&fourk=1&platform=html5&high_quality=1';
  }
  const resp = await fetch(api, { headers });
  const json = await resp.json();
  const payload = json.result || json.data;
  if (json.code !== 0 || !payload || !payload.durl || !payload.durl[0]) {
    throw new Error('playurl failed: ' + JSON.stringify(json).slice(0, 300));
  }
  const url = payload.durl[0].url;
  videoUrlCache.set(key, { url, expires: Date.now() + 5 * 60 * 1000 });
  return url;
}

async function getOnlineCount(aid, cid) {
  try {
    const response = await fetch(
      'https://api.bilibili.com/x/player/online/total?aid=' + aid + '&cid=' + cid,
      { headers: BILI_HEADERS }
    );
    const json = await response.json();
    if (json.code === 0 && json.data) {
      return parseInt(json.data.total || '0', 10) || 0;
    }
  } catch (e) {}
  return 0;
}

function startDanmakuSocket() {
  const socketServer = net.createServer((socket) => {
    let handled = false;

    socket.on('error', () => {});

    socket.on('data', async (data) => {
      if (handled) return;

      if (data.toString('latin1').indexOf('<policy-file-request') >= 0) {
        handled = true;
        socket.end(
          '<?xml version="1.0"?><cross-domain-policy><allow-access-from domain="*" to-ports="' + DANMAKU_PORT + '"/></cross-domain-policy>\0'
        );
        return;
      }

      if (data.length < 4) return;
      handled = true;

      const chatId = data.readInt32BE(0);
      const key = String(chatId);
      const realCid = wrappedCidMap.get(key) || key;
      const info = cidInfoMap.get(realCid);

      if (!info) {
        socket.end();
        return;
      }

      const sendCount = async () => {
        const count = await getOnlineCount(info.aid, realCid);
        if (socket.destroyed) return;
        const packet = Buffer.alloc(6);
        packet.writeInt16BE(1, 0);
        packet.writeInt32BE(count, 2);
        socket.write(packet);
      };

      await sendCount();
      const timer = setInterval(sendCount, 30000);
      socket.on('close', () => clearInterval(timer));
      socket.on('error', () => clearInterval(timer));
    });
  });

  socketServer.on('error', (error) => {
    console.error('[danmaku socket]', error.message);
  });
  socketServer.listen(DANMAKU_PORT, () => {
    console.log('[danmaku socket] listening on :' + DANMAKU_PORT);
  });
}

const danmakuCache = new Map();

function readProtoVarint(buffer, state) {
  let value = 0;
  let shift = 0;
  while (state.index < buffer.length) {
    const byte = buffer[state.index++];
    value += (byte & 0x7f) * Math.pow(2, shift);
    if (!(byte & 0x80)) return value;
    shift += 7;
  }
  return value;
}

function decodeProto(buffer) {
  const fields = [];
  const state = { index: 0 };
  while (state.index < buffer.length) {
    const key = readProtoVarint(buffer, state);
    const fieldNo = Math.floor(key / 8);
    const wireType = key & 7;
    if (!fieldNo) break;
    if (wireType === 0) {
      fields.push({ fieldNo, value: readProtoVarint(buffer, state) });
    } else if (wireType === 2) {
      const length = readProtoVarint(buffer, state);
      const start = state.index;
      fields.push({ fieldNo, value: buffer.subarray(start, start + length) });
      state.index = start + length;
    } else if (wireType === 1) {
      state.index += 8;
    } else if (wireType === 5) {
      state.index += 4;
    } else {
      break;
    }
  }
  return fields;
}

function parseDmElem(buffer) {
  const elem = {
    id: 0,
    idStr: '',
    progress: 0,
    mode: 1,
    fontsize: 25,
    color: 16777215,
    ctime: 0,
    pool: 0,
    midHash: '',
    content: '',
    weight: 0,
  };
  for (const field of decodeProto(buffer)) {
    if (field.fieldNo === 1) elem.id = Number(field.value);
    else if (field.fieldNo === 2) elem.progress = Number(field.value);
    else if (field.fieldNo === 3) elem.mode = Number(field.value);
    else if (field.fieldNo === 4) elem.fontsize = Number(field.value);
    else if (field.fieldNo === 5) elem.color = Number(field.value);
    else if (field.fieldNo === 6) elem.midHash = String(field.value);
    else if (field.fieldNo === 7) elem.content = String(field.value);
    else if (field.fieldNo === 8) elem.ctime = Number(field.value);
    else if (field.fieldNo === 9) elem.weight = Number(field.value);
    else if (field.fieldNo === 11) elem.pool = Number(field.value);
    else if (field.fieldNo === 12) elem.idStr = String(field.value);
  }
  if (!elem.idStr) elem.idStr = String(elem.id);
  return elem;
}

function parseDmSeg(buffer) {
  const entries = [];
  for (const field of decodeProto(buffer)) {
    if (field.fieldNo === 1 && field.value && field.value.length) {
      entries.push(parseDmElem(field.value));
    }
  }
  return entries;
}

function parseDmView(buffer) {
  const view = { specialDms: [] };
  for (const field of decodeProto(buffer)) {
    if (field.fieldNo === 6) {
      view.specialDms.push(String(field.value));
    }
  }
  return view;
}

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getSpecialDanmaku(cid, aid, req) {
  if (!aid) return [];
  const headers = Object.assign({}, BILI_HEADERS, {
    Referer: 'https://www.bilibili.com/video/av' + aid + '/',
    Origin: 'https://www.bilibili.com',
  });
  const cookies = getRequestCookies(req);
  if (cookies) headers.Cookie = cookies;

  const viewResponse = await fetch(
    'https://api.bilibili.com/x/v2/dm/web/view?type=1&oid=' +
      encodeURIComponent(cid) +
      '&pid=' +
      encodeURIComponent(aid),
    { headers }
  );
  if (!viewResponse.ok) return [];
  const view = parseDmView(Buffer.from(await viewResponse.arrayBuffer()));
  const entries = [];
  const seen = new Set();

  for (const url of view.specialDms) {
    try {
      const target = String(url).replace(/^http:\/\//i, 'https://');
      const response = await fetch(target, { headers });
      if (!response.ok) continue;
      const list = parseDmSeg(Buffer.from(await response.arrayBuffer()));
      for (const elem of list) {
        const isM8 = elem.mode === 8;
        const isBasM8 =
          elem.mode === 9 && /^\s*\/\/M8v1/.test(String(elem.content || ''));
        if (!isM8 && !isBasM8) continue;
        const key = elem.idStr || elem.id + '|' + elem.progress;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({
          ...elem,
          mode: 8,
        });
      }
    } catch (error) {}
  }

  let duration = 360;
  try {
    const info = await getVideoInfo(aid, cookies);
    duration = Number(info.view && info.view.duration) || 360;
  } catch (error) {}
  const segmentCount = Math.max(1, Math.ceil(duration / 360));
  for (let index = 1; index <= segmentCount; index++) {
    try {
      const response = await fetch(
        'https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid=' +
          encodeURIComponent(cid) +
          '&pid=' +
          encodeURIComponent(aid) +
          '&segment_index=' +
          index +
          '&fontsize=0&screen_state=1',
        { headers }
      );
      if (!response.ok) continue;
      const list = parseDmSeg(Buffer.from(await response.arrayBuffer()));
      for (const elem of list) {
        if (
          elem.mode !== 9 ||
          !/^\s*\/\/M8v1/.test(String(elem.content || ''))
        ) {
          continue;
        }
        const key = elem.idStr || elem.id + '|' + elem.progress;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({ ...elem, mode: 8 });
      }
    } catch (error) {}
  }
  return entries;
}

function appendSpecialDanmaku(buffer, entries) {
  if (!entries.length) return buffer;
  const rows = entries.map((elem) => {
    const p = [
      (Number(elem.progress || 0) / 1000).toFixed(3),
      '8',
      String(elem.fontsize || 25),
      String(elem.color || 16777215),
      String(elem.ctime || 0),
      String(elem.pool || 0),
      elem.midHash || '',
      elem.idStr || String(elem.id || ''),
      String(elem.weight || 0),
    ].join(',');
    const script = String(elem.content || '');
    const cdata = script.replace(/]]>/g, ']]]]><![CDATA[>');
    return '<d p="' + escapeXml(p) + '"><![CDATA[' + cdata + ']]></d>';
  });
  const text = buffer.toString('utf8');
  const end = text.lastIndexOf('</i>');
  if (end < 0) return buffer;
  return Buffer.from(text.slice(0, end) + rows.join('') + text.slice(end), 'utf8');
}

function emptyDanmakuXml(cid) {
  return Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?><i>' +
      '<chatserver>chat.bilibili.com</chatserver>' +
      '<chatid>' + cid + '</chatid>' +
      '<mission>0</mission><maxlimit>0</maxlimit><state>0</state>' +
      '<real_name>0</real_name><source>k-v</source></i>',
    'utf8'
  );
}

async function getDanmakuXml(cid, req) {
  const key = String(cid);
  const cached = danmakuCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.buffer;

  const info = cidInfoMap.get(key);
  const aid = info && info.aid ? String(info.aid) : '';
  const headers = Object.assign({}, BILI_HEADERS, {
    Referer: aid
      ? 'https://www.bilibili.com/video/av' + aid + '/'
      : 'https://www.bilibili.com/',
    Accept: 'application/xml,text/xml,*/*',
  });
  const cookie = cookieJarString();
  if (cookie) headers.Cookie = cookie;

  const urls = [
    'https://comment.bilibili.com/' + encodeURIComponent(key) + '.xml',
    'https://api.bilibili.com/x/v1/dm/list.so?oid=' + encodeURIComponent(key),
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of urls) {
      try {
        const response = await fetch(url, { headers });
        if (!response.ok) continue;
        let buffer = Buffer.from(await response.arrayBuffer());
        const start = buffer.subarray(0, 200).toString('utf8');
        if (buffer.length > 32 && start.indexOf('<i>') >= 0) {
          try {
            const special = await getSpecialDanmaku(key, aid, req);
            buffer = appendSpecialDanmaku(buffer, special);
          } catch (error) {}
          danmakuCache.set(key, {
            buffer,
            expires: Date.now() + 10 * 60 * 1000,
          });
          return buffer;
        }
      } catch (error) {}
    }
    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
  }

  if (cached) return cached.buffer;
  return emptyDanmakuXml(key);
}

function sendDanmaku(res, buffer) {
  res.writeHead(200, {
    'Content-Type': 'text/xml; charset=utf-8',
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  });
  res.end(buffer);
}

async function pipeFetch(target, req, res, extraHeaders, options) {
  const headers = Object.assign({}, BILI_HEADERS, extraHeaders || {});
  if (req.headers.range) {
    headers.Range = req.headers.range;
  }
  const upstream = await fetch(target, { method: req.method, headers });

  if (options && options.gbk && req.method !== 'HEAD') {
    const buffer = Buffer.from(await upstream.arrayBuffer());
    let text = buffer.toString('utf8');
    text = text.replace(/encoding=(["'])UTF-8\1/gi, 'encoding="GBK"');
    const output = iconv.encode(text, 'gbk');
    res.writeHead(upstream.status, {
      'Content-Type': 'text/xml; charset=GBK',
      'Content-Length': output.length,
    });
    res.end(output);
    return;
  }

  const out = {};
  for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const value = upstream.headers.get(key);
    if (value) {
      out[key.replace(/(^|-)([a-z])/g, (m, a, b) => a + b.toUpperCase())] = value;
    }
  }
  res.writeHead(upstream.status, out);
  if (req.method === 'HEAD' || !upstream.body) {
    res.end();
    return;
  }
  Readable.fromWeb(upstream.body).pipe(res);
}

function serveFile(filePath, req, res) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

function accessConfigXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<root>' +
    '<cid>' + CID + '</cid>' +
    '<chatid>' + CID + '</chatid>' +
    '<aid>' + AID + '</aid>' +
    '<vtype>vupload</vtype>' +
    '<role>0</role>' +
    '<isadmin>false</isadmin>' +
    '<permission></permission>' +
    '<level>0</level>' +
    '<name>guest</name>' +
    '<user>0</user>' +
    '<user_hash></user_hash>' +
    '<money>0</money>' +
    '<face></face>' +
    '<duration>00:03:42</duration>' +
    '<acceptguest>false</acceptguest>' +
    '<acceptaccel>false</acceptaccel>' +
    '<new_broadcast>1</new_broadcast>' +
    '<realtime_dm>1</realtime_dm>' +
    '<options>{}</options>' +
    '</root>'
  );
}

const coinCache = new Map();

async function getSessionCoins(session) {
  if (!session || !session.cookies) return 0;
  const key = String(session.mid || session.cookies);
  const cached = coinCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const response = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      headers: Object.assign({}, LOGIN_HEADERS, { Cookie: session.cookies }),
    });
    const json = await response.json();
    if (json.code === 0 && json.data && json.data.isLogin) {
      const value = Number(json.data.money);
      const money = isFinite(value) ? value : 0;
      coinCache.set(key, { value: money, expires: Date.now() + 60 * 1000 });
      return money;
    }
  } catch (error) {}
  try {
    const response = await fetch('https://account.bilibili.com/site/getCoin', {
      headers: Object.assign({}, LOGIN_HEADERS, { Cookie: session.cookies }),
    });
    const json = await response.json();
    if (json.code === 0 && json.data) {
      const value = Number(json.data.money);
      const money = isFinite(value) ? value : 0;
      coinCache.set(key, { value: money, expires: Date.now() + 60 * 1000 });
      return money;
    }
  } catch (error) {}
  return 0;
}

function accessConfigXml2012(cid, aid, stat, socketHost, session, money, origin) {
  stat = stat || {};
  const click = Number(stat.view || 0);
  const favourites = Number(stat.favorite || 0);
  const coins = Number(stat.coin || 0);
  const credits = Number(stat.like || 0);
  const danmu = Number(stat.danmaku || 0);
  const loggedIn = !!session;
  const userName = loggedIn ? session.uname || '已登录' : 'guest';
  const userId = loggedIn ? session.mid || '0' : '0';
  const baseOrigin = String(origin || PUBLIC_ORIGIN).replace(/\/+$/, '');
  const facePath =
    loggedIn && session.face
      ? String(session.face)
          .replace(/^https?:\/\//i, '')
          .replace(/^\/\//, '')
          .split('?')[0]
      : '';
  const userFace = facePath ? baseOrigin + '/img/' + facePath : '';
  const sendUrl =
    baseOrigin + '/dm00/dmpost' + (loggedIn && session.sid ? '/' + session.sid : '');
  return (
    '<performance maxonstage="80"/>' +
    '<server load="' + baseOrigin + '/dm00/dm,{$id}" send="' + sendUrl + '" gateway="chat.bilibili.com" onhost="">' + (socketHost || PUBLIC_HOST) + '</server>' +
    '<rgg img="" url="" rggnum="0"/>' +
    '<tips url="' + baseOrigin + '/dm00/msg.xml"/>' +
    '<login>' + (loggedIn ? 'true' : 'false') + '</login>' +
    '<name>' + escapeHtml(userName) + '</name>' +
    '<user>' + escapeHtml(userId) + '</user>' +
    '<user_hash></user_hash>' +
    '<scores>0</scores>' +
    '<money>' + escapeHtml(String(money || 0)) + '</money>' +
    '<pwd></pwd>' +
    '<isadmin>false</isadmin>' +
    '<permission></permission>' +
    '<level>0</level>' +
    '<shot>false</shot>' +
    '<chatid>' + cid + '</chatid>' +
    '<aid>' + aid + '</aid>' +
    '<pid>1</pid>' +
    '<click>' + click + '</click>' +
    '<fw_click>0</fw_click>' +
    '<danmu>' + danmu + '</danmu>' +
    '<acceptguest>false</acceptguest>' +
    '<duration>00:03:42</duration>' +
    '<country>CN</country>' +
    '<acceptaccel>false</acceptaccel>' +
    '<cache>false</cache>' +
    '<favourites>' + favourites + '</favourites>' +
    '<coins>' + coins + '</coins>' +
    '<credits>' + credits + '</credits>' +
    '<typeid>0</typeid>' +
    '<face>' + escapeHtml(userFace) + '</face>' +
    '<sinapi>false</sinapi>' +
    '<arctype></arctype>' +
    '<rank></rank>' +
    '<bottom>0</bottom>' +
    '<role>0</role>' +
    '<vtype>vupload</vtype>' +
    '<options>{}</options>'
  );
}


function sendLegacyDm(res, code) {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(String(code));
}

function pickField(fields, names) {
  for (const name of names) {
    if (fields[name] != null && String(fields[name]).length > 0) return String(fields[name]);
  }
  return '';
}

function cookieValue(cookieString, name) {
  for (const part of String(cookieString || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim();
    }
  }
  return '';
}

async function postDanmaku(fields, session) {
  if (!session) {
    return { code: -101, message: '请先登录' };
  }

  let cid = pickField(fields, ['cid', 'chatid', 'oid', 'id']) || CID;
  cid = wrappedCidMap.get(String(cid)) || String(cid);
  if (cid === '1169623044') cid = '39824328708';
  const msg = pickField(fields, ['msg', 'message', 'text', 'comment', 'content']).trim();
  if (!msg) {
    return { code: -1, message: '弹幕内容不能为空' };
  }

  let progressName = '';
  let progressField = '';
  for (const name of ['progress', 'playTime', 'playtime', 'time', 'position']) {
    if (fields[name] != null && String(fields[name]).length > 0) {
      progressName = name;
      progressField = String(fields[name]);
      break;
    }
  }
  let progress = Number(progressField);
  if (!isFinite(progress) || progress < 0) progress = 0;
  if (
    progressName === 'playTime' ||
    progressName === 'playtime' ||
    progressName === 'time' ||
    progressName === 'position'
  ) {
    progress = Math.round(progress * 1000);
  } else {
    progress = Math.round(progress);
  }

  let color = String(pickField(fields, ['color', 'fontcolor']) || '').trim();
  let colorNumber;
  if (/^0x[0-9a-f]+$/i.test(color)) colorNumber = parseInt(color.slice(2), 16);
  else if (/^[0-9a-f]{6}$/i.test(color)) colorNumber = parseInt(color, 16);
  else colorNumber = parseInt(color, 10);
  if (!isFinite(colorNumber) || colorNumber < 0) colorNumber = 16777215;

  let mode = parseInt(pickField(fields, ['mode']) || '1', 10);
  if (![1, 4, 5, 6, 7, 8, 9].includes(mode)) mode = 1;
  let fontsize = parseInt(
    pickField(fields, ['fontsize', 'fontSize', 'font_size', 'size']) || '25',
    10
  );
  if (!isFinite(fontsize) || fontsize < 12) fontsize = 25;
  let pool = parseInt(pickField(fields, ['pool']) || '0', 10);
  if (!isFinite(pool)) pool = 0;

  let aid = pickField(fields, ['aid']);
  const cidInfo = cidInfoMap.get(String(cid));
  if (!aid) aid = cidInfo ? String(cidInfo.aid) : AID;
  const csrf = session.csrf || cookieValue(session.cookies, 'bili_jct');
  if (!csrf) {
    return { code: -101, message: '登录凭证已失效，请重新登录' };
  }

  const form = new URLSearchParams();
  form.set('type', '1');
  form.set('oid', cid);
  form.set('msg', msg);
  form.set('progress', String(progress));
  form.set('color', String(colorNumber));
  form.set('mode', String(mode));
  form.set('fontsize', String(fontsize));
  form.set('pool', String(pool));
  form.set('rnd', String(Math.floor(Date.now() / 1000)));
  form.set('csrf', csrf);
  form.set('aid', String(aid));

  try {
    const response = await fetch('https://api.bilibili.com/x/v2/dm/post', {
      method: 'POST',
      headers: Object.assign({}, LOGIN_HEADERS, {
        Cookie: session.cookies,
        Origin: 'https://www.bilibili.com',
        Referer: 'https://www.bilibili.com/video/av' + aid + '/',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      }),
      body: form.toString(),
    });
    const json = await response.json();
    const code = Number(json.code);
    if (code === 0) {
      const dmid = Number(json.data && json.data.dmid);
      let result = isFinite(dmid) && dmid > 0 ? dmid : Math.floor(Date.now() / 1000);
      if (result > 2147483647) {
        result = (result % 2147483646) + 1;
      }
      console.error('[dmpost] success', cid, result);
      return { code: 0, message: '发送成功', dmid: result };
    }
    console.error('[dmpost] failed', cid, code, json.message || '');
    return { code: isFinite(code) ? code : -1, message: json.message || '发送失败' };
  } catch (error) {
    console.error('[dmpost] error', error.message);
    return { code: -1, message: error.message || '发送失败' };
  }
}

async function reportVideoHistory(aid, cid, progress, session) {
  if (!session || !aid || !cid) {
    return { code: -101, message: '未登录' };
  }
  const csrf = session.csrf || cookieValue(session.cookies, 'bili_jct');
  if (!csrf) {
    return { code: -101, message: '登录凭证已失效' };
  }
  const form = new URLSearchParams();
  form.set('aid', String(aid));
  form.set('cid', String(cid));
  form.set('progress', String(Math.max(0, Math.floor(Number(progress) || 0))));
  form.set('csrf', csrf);
  try {
    const response = await fetch('https://api.bilibili.com/x/v2/history/report', {
      method: 'POST',
      headers: Object.assign({}, BILI_HEADERS, {
        Referer: 'https://www.bilibili.com/video/av' + aid + '/',
        Origin: 'https://www.bilibili.com',
        Cookie: session.cookies || '',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      }),
      body: form.toString(),
    });
    const json = await response.json();
    return { code: json.code, message: json.message || '' };
  } catch (error) {
    return { code: -1, message: error.message };
  }
}

async function handleDmPost(req, res, fields, sidToken) {
  let session = getLoginSession(req);
  if (!session && sidToken) {
    session = loginUserSessions.get(sidToken) || null;
    if (session && session.expires <= Date.now()) session = null;
  }
  if (!session) session = getLatestLoginSession();
  if (session && !getCookie(req, 'BCSESS') && !sidToken) {
    console.error('[dmpost] using latest login session');
  }
  const result = await postDanmaku(fields, session);
  if (result.code === 0) return sendLegacyDm(res, result.dmid || 0);
  return sendLegacyDm(res, result.code);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function httpsUrl(value) {
  return String(value == null ? '' : value)
    .replace(/^http:\/\//i, 'https://')
    .replace(/^\/\//, 'https://');
}

function imageProxy(value) {
  const url = httpsUrl(value);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return '/img/' + parsed.host + parsed.pathname + parsed.search;
  } catch (e) {
    return url;
  }
}

const WBI_MIXIN_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];
const WBI_FALLBACK_MIXIN = '604f662d63f4ee19c94bd8ac0de3f84d';
const spaceCache = new Map();
let wbiMixinCache = { date: '', key: '' };

function wbiDateKey() {
  const now = new Date();
  return String(now.getFullYear()) + pad2(now.getMonth() + 1) + pad2(now.getDate());
}

function base64Text(value) {
  return Buffer.from(String(value), 'utf8').toString('base64');
}

function dmF114i(a, b, index) {
  const t = Math.floor(Math.random() * (114 * index));
  return [3 * a + 2 * b + t, 4 * a - 5 * b + t, t];
}

function dmF114(a, b) {
  const t = Math.floor(Math.random() * 114);
  return [2 * a + 2 * b + 3 * t, 4 * a - b + t, t];
}

function dmF514(a, b) {
  const t = Math.floor(Math.random() * 514);
  return [3 * a + 2 * b + t, 4 * a - 4 * b + 2 * t, t];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dmImgParams() {
  const timestamps = [2943, 3046, 3152, 3252, 3354, 3454, 3558, 3665, 3767, 5566, 5676, 5778, 5881, 7296, 7573, 135289];
  const list = [{ x: 2355, y: 725, z: 0, timestamp: 2145, k: randomInt(60, 126), type: 0 }];
  const count = randomInt(6, timestamps.length - 1);
  for (let i = 0; i <= count; i++) {
    const xyz = dmF114i(randomInt(0, 199), randomInt(0, 199), i + 1);
    list.push({
      x: xyz[0],
      y: xyz[1],
      z: xyz[2],
      timestamp: timestamps[i],
      k: randomInt(60, 126),
      type: i === count ? 1 : 0,
    });
  }
  const classNames = ['clearfix', 'g-search', 'section', 'loading', 'full-rows', 'n-btn', 'router-link-exact-active', 'router-link-active', 'active'];
  const y = randomInt(-1500, -300);
  const x = randomInt(100, 700);
  const width = randomInt(100, 8000);
  const height = randomInt(20, 500);
  const xyz1 = dmF114(y, x);
  const xyz2 = dmF514(width, height);
  const inter = {
    ds: [
      {
        t: randomInt(0, 5),
        c: base64Text(
          classNames[randomInt(0, classNames.length - 1)] +
            ' ' +
            classNames[randomInt(0, classNames.length - 1)]
        ),
        p: [xyz1[0], xyz1[2], xyz1[1]],
        s: [xyz2[2], xyz2[0], xyz2[1]],
      },
    ],
    wh: [dmF114(width, height)],
    of: [dmF514(y, x)],
  };
  return {
    dm_img_str: 'V2ViR0wgMS4wIChPcGVuR0wgRVMgMi4wIENocm9taXVtKQ',
    dm_cover_img_str:
      'QU5HTEUgKEludGVsLCBJbnRlbChSKSBVSEQgR3JhcGhpY3MgNjMwIERpcmVjdDNEMTEgdnNfNV8wIHBzXzVfMCwgRDNEMTEpR29vZ2xlIEluYy4gKEludGVsKQ',
    dm_img_list: JSON.stringify(list),
    dm_img_inter: JSON.stringify(inter),
  };
}

async function getWbiMixin(cookies) {
  const date = wbiDateKey();
  if (wbiMixinCache.date === date && wbiMixinCache.key) return wbiMixinCache.key;
  try {
    const response = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      headers: Object.assign({}, webRequestHeaders(), {
        Cookie: cookies,
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'identity',
      }),
    });
    const json = await response.json();
    if (json.data && json.data.wbi_img) {
      const img = String(json.data.wbi_img.img_url || '').split('/').pop().split('.')[0];
      const sub = String(json.data.wbi_img.sub_url || '').split('/').pop().split('.')[0];
      const raw = img + sub;
      if (raw.length >= 64) {
        const key = WBI_MIXIN_TAB.slice(0, 32)
          .map((index) => raw[index])
          .join('');
        wbiMixinCache = { date, key };
        return key;
      }
    }
  } catch (error) {}
  return WBI_FALLBACK_MIXIN;
}

function signWbi(url, params, mixin) {
  const entries = [];
  params.forEach((value, key) => entries.push([key, String(value)]));
  entries.push(['wts', String(Math.floor(Date.now() / 1000))]);
  const filtered = entries.map(([key, value]) => [key, value.replace(/[!'()*]/g, '')]);
  filtered.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const query = filtered
    .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value))
    .join('&');
  return url + '?' + query + '&w_rid=' + md5Hex(query + mixin);
}

async function getSpaceCookies(req) {
  const session = getLoginSession(req);
  if (session && session.cookies) return session.cookies;
  await ensureBiliCookies();
  return cookieJarString();
}

async function getSpaceCard(mid, cookies) {
  const cacheKey = 'card:' + mid;
  const cached = spaceCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const response = await fetch('https://api.bilibili.com/x/web-interface/card?mid=' + mid, {
      headers: Object.assign({}, webRequestHeaders(), {
        Cookie: cookies,
        Referer: 'https://space.bilibili.com/' + mid,
        Origin: 'https://space.bilibili.com',
      }),
    });
    const json = await response.json();
    if (json.code === 0 && json.data && json.data.card) {
      const data = json.data;
      const card = data.card;
      const value = {
        mid: String(card.mid || mid),
        name: card.name || '未知用户',
        face: card.face || '',
        sign: card.sign || '这个人很懒，什么都没写',
        level: Number(card.level_info && card.level_info.current_level) || 0,
        fans: Number(data.follower || card.fans || 0),
        following: Number(data.following || card.attention || 0),
        archiveCount: Number(data.archive_count || 0),
        likeNum: Number(data.like_num || 0),
        officialRole: Number(card.Official && card.Official.role) || 0,
        officialTitle:
          (card.Official && (card.Official.title || card.Official.desc)) || '',
        verify: !!card.is_senior_member || Number(card.Official && card.Official.role) > 0,
      };
      spaceCache.set(cacheKey, { value, expires: Date.now() + 60 * 1000 });
      return value;
    }
    spaceCache.set(cacheKey, { value: null, expires: Date.now() + 60 * 1000 });
  } catch (error) {}
  return null;
}

function spaceTimestamp(value) {
  const number = Number(value);
  if (isFinite(number) && number > 0) return number;
  const parsed = Date.parse(value);
  return isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
}

const spaceAccountCache = new Map();

async function getSpaceAccountInfo(mid, cookies) {
  const authKey = cookies ? md5Hex(cookies).slice(0, 10) : 'anon';
  const cacheKey = 'account:' + mid + ':' + authKey;
  const cached = spaceAccountCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const mixin = await getWbiMixin(cookies);
    const params = new URLSearchParams({
      mid: String(mid),
      platform: 'web',
      web_location: '1550101',
    });
    const dm = dmImgParams();
    for (const key of Object.keys(dm)) params.set(key, dm[key]);
    const url = signWbi('https://api.bilibili.com/x/space/wbi/acc/info', params, mixin);
    const response = await fetch(url, {
      headers: Object.assign({}, webRequestHeaders(), {
        Cookie: cookies,
        Referer: 'https://space.bilibili.com/' + mid,
        Origin: 'https://space.bilibili.com',
      }),
    });
    const json = await response.json();
    if (json.code === 0 && json.data) {
      const value = {
        name: json.data.name || '',
        face: json.data.face || '',
        sign: json.data.sign || '',
        sex: json.data.sex || '',
        birthday: json.data.birthday || '',
      };
      spaceAccountCache.set(cacheKey, { value, expires: Date.now() + 2 * 60 * 1000 });
      return value;
    }
  } catch (error) {}
  return null;
}

function parseSpaceVideos(json) {
  const data = json.data || {};
  const list = (data.list && data.list.vlist) || [];
  const videos = list.map((video) => ({
    aid: String(video.aid || ''),
    bvid: video.bvid || '',
    title: video.title || '',
    pic: video.pic || '',
    description: video.description || '',
    pubdate: spaceTimestamp(video.pubdate || video.created || video.ctime),
    tname: video.tname || '',
    author: video.author || '',
  }));
  const total = Number(data.page && data.page.count) || videos.length;
  return { videos, total };
}

function archivedSpaceVideos2() {
  const date = (value) => Math.floor(new Date(value.replace(' ', 'T') + '+08:00').getTime() / 1000);
  return [
    ['318092', '第2届动漫脚本暨插画大赛欢迎投稿&作品选集', 'http://i0.hdslb.com/user/0/2/134320909021c5e2bdbd23ed35.jpg', '2012-07-25 17:38:10', '期刊·其他', 'QQ 第2届动漫脚本暨插画大赛6月16日-7月31日热力征稿中。'],
    ['277380', '一个合格的战士必修技能', 'http://i2.hdslb.com/user/0/2/1338494036b8a427a6be2078cc.jpg', '2012-06-01 03:53:56', '生活娱乐', 'sina 哈哈！！这跟头摔的，神同步啊！！'],
    ['264650', '首届英雄联盟“宅坛撸霸赛”第一轮比赛周末打响', 'http://i0.hdslb.com/user/0/2/1336726894bfdec4a0d49baec9.jpg', '2012-05-11 16:57:16', '游戏视频', '原创 参与竞猜赢Q币'],
    ['220232', '[圆环之理]Sagitta luminis', 'http://i1.hdslb.com/user/0/2/1329921702d6fbb6db2b134ef0.jpg', '2012-02-22 22:41:42', '音乐视频', '魔法少女小圆OST3中的一首单曲'],
    ['140956', '腾讯“首届动漫脚本选秀大赛”10强出炉！', 'http://i1.hdslb.com/user/0/2/1315294352027f20378b1a8012.jpg', '2011-09-06 15:32:32', '期刊·其他', 'tudou 大赛官网传送门'],
    ['120040', '高级语言弹幕测试', 'http://i0.hdslb.com/user/0/2/1311616515175cbdc385415128.jpg', '2011-07-26 01:55:15', '期刊·其他', '1P 2P为演示，所有视频均为黑屏。'],
    ['114453', '[clannad as 18集]压缩画质测试 360P', 'http://i2.hdslb.com/user/0/2/13104204590a84b1ba2207f8f0.jpg', '2011-07-12 05:40:59', '期刊·其他', 'clannad 360P 总码率：360kbps'],
    ['110737', '腾讯动漫脚本大赛100强海选中！', 'http://i2.hdslb.com/user/0/2/13096283529212011f4a4fda6c.jpg', '2011-07-03 01:39:12', '期刊·其他', 'QQ 首届动漫脚本选秀大赛100强全民海选赛。'],
    ['48360', '【侵略木木娘☆】--♂侵略乌贼娘--', 'http://i1.hdslb.com/userup/2/12944C513-W27.jpg', '2011-01-08 14:18:33', '翻唱', '原创 不卖萌就会被爆黑历史。'],
    ['40914', 'the world正确用法', 'http://i2.hdslb.com/userup/2/1291542423-3348.jpg', '2010-12-05 17:47:03', '游戏视频', '原创 no pants.'],
  ].map(([aid, title, pic, dateText, tname, description]) => ({
    aid,
    bvid: '',
    title,
    pic,
    description,
    pubdate: date(dateText),
    tname,
    author: '',
    archived: true,
  }));
}

async function getSpaceVideos(mid, page, cookies, refresh) {
  const cacheKey = 'videos:' + mid + ':' + page;
  const cached = spaceCache.get(cacheKey);
  if (!refresh && cached && cached.expires > Date.now()) return cached.value;

  async function requestLegacy() {
    const url =
      'https://api.bilibili.com/x/space/arc/search?mid=' +
      encodeURIComponent(mid) +
      '&ps=10&pn=' +
      page +
      '&order=pubdate&jsonp=jsonp';
    const response = await fetch(url, {
      headers: Object.assign({}, webRequestHeaders(), {
        Cookie: cookies,
        Referer: 'https://space.bilibili.com/' + mid,
        Origin: 'https://space.bilibili.com',
      }),
    });
    return response.json();
  }

  async function requestWbi() {
    const mixin = await getWbiMixin(cookies);
    const params = new URLSearchParams({
      mid: String(mid),
      order_avoided: 'true',
      order: 'pubdate',
      platform: 'web',
      pn: String(page),
      ps: '10',
      tid: '0',
      web_location: '333.1387',
    });
    const dm = dmImgParams();
    for (const key of Object.keys(dm)) params.set(key, dm[key]);
    const url = signWbi('https://api.bilibili.com/x/space/wbi/arc/search', params, mixin);
    const response = await fetch(url, {
      headers: Object.assign({}, webRequestHeaders(), {
        Cookie: cookies,
        Referer: 'https://space.bilibili.com/' + mid,
        Origin: 'https://space.bilibili.com',
      }),
    });
    return response.json();
  }

  try {
    let json = await requestLegacy();
    if (json.code === 0) {
      const parsed = parseSpaceVideos(json);
      spaceCache.set(cacheKey, { value: parsed, expires: Date.now() + 2 * 60 * 1000 });
      return parsed;
    }
    const legacyError = json.message || ('代码 ' + json.code);
    json = await requestWbi();
    if (json.code === -352 || json.code === -412) {
      wbiMixinCache = { date: '', key: '' };
      json = await requestWbi();
    }
    if (json.code === 0) {
      const parsed = parseSpaceVideos(json);
      spaceCache.set(cacheKey, { value: parsed, expires: Date.now() + 2 * 60 * 1000 });
      return parsed;
    }
    if (String(mid) === '2' && page === 1) {
      const parsed = { videos: archivedSpaceVideos2(), total: 10, archived: true };
      spaceCache.set(cacheKey, { value: parsed, expires: Date.now() + 5 * 60 * 1000 });
      return parsed;
    }
    const error = {
      videos: [],
      total: 0,
      error: legacyError || json.message || ('代码 ' + json.code),
    };
    spaceCache.set(cacheKey, { value: error, expires: Date.now() + 30 * 1000 });
    return error;
  } catch (error) {
    return { videos: [], total: 0, error: error.message };
  }
}

function formatSpaceDate(seconds) {
  const time = Number(seconds);
  if (!time) return '';
  const date = new Date(time * 1000);
  return (
    date.getFullYear() +
    '-' +
    pad2(date.getMonth() + 1) +
    '-' +
    pad2(date.getDate()) +
    ' ' +
    pad2(date.getHours()) +
    ':' +
    pad2(date.getMinutes()) +
    ':' +
    pad2(date.getSeconds())
  );
}

function renderSpaceVideos(videos, mid) {
  if (!videos.length) {
    return (
      '<li class="space-error">这个用户还没有投稿，或投稿接口暂时不可用。 ' +
      '<a href="/space/' + mid + '?refresh=1">重新获取</a></li>'
    );
  }
  return videos
    .map((video) => {
      const link = video.aid ? '/av' + video.aid : '/bv/' + video.bvid;
      const cover = imageProxy(video.pic) || '/space/assets/noface.gif';
      return (
        '<li>' +
        '<a href="' + escapeHtml(link) + '" target="_blank"><img src="' +
        escapeHtml(cover) +
        '" alt="" onerror="this.src=\'/space/assets/noface.gif\'" /></a>' +
        '<a class="l" href="javascript:void(0)">' +
        escapeHtml(video.tname || '视频') +
        '</a>' +
        '<a class="title" href="' +
        escapeHtml(link) +
        '" target="_blank">' +
        escapeHtml(video.title) +
        '</a>' +
        '<div class="c">投稿日期：' +
        escapeHtml(formatSpaceDate(video.pubdate) || '未知') +
        '</div>' +
        '<div class="q">' +
        escapeHtml(video.description || '') +
        '</div>' +
        '</li>'
      );
    })
    .join('');
}

function renderSpacePager(mid, page, total, pageSize) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return '';
  const parts = [];
  if (page > 1) parts.push('<li><a href="/space/' + mid + '?page=' + (page - 1) + '">上一页</a></li>');
  for (let i = 1; i <= pageCount; i++) {
    if (i !== 1 && i !== pageCount && Math.abs(i - page) > 2) {
      if (i === 2 || i === pageCount - 1) parts.push('<li>...</li>');
      continue;
    }
    parts.push(
      i === page
        ? '<li class="current">' + i + '</li>'
        : '<li><a href="/space/' + mid + '?page=' + i + '">' + i + '</a></li>'
    );
  }
  if (page < pageCount) parts.push('<li><a href="/space/' + mid + '?page=' + (page + 1) + '">下一页</a></li>');
  return parts.join('');
}

function formatFavNumber(value) {
  const number = Number(value) || 0;
  if (number >= 100000000) {
    return String(Math.round(number / 10000000) / 10).replace(/\.0$/, '') + '亿';
  }
  if (number >= 10000) {
    return String(Math.round(number / 1000) / 10).replace(/\.0$/, '') + '万';
  }
  return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function getFavFolders(mid, cookies) {
  const headers = Object.assign({}, BILI_HEADERS, {
    Referer: 'https://space.bilibili.com/' + mid,
    Origin: 'https://space.bilibili.com',
  });
  if (cookies) headers.Cookie = cookies;
  const response = await fetch(
    'https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=' +
      encodeURIComponent(mid) +
      '&type=0',
    { headers }
  );
  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(json.message || '收藏夹接口错误 ' + json.code);
  }
  return json.data && Array.isArray(json.data.list) ? json.data.list : [];
}

async function getFavVideos(mid, fid, page, cookies) {
  const headers = Object.assign({}, BILI_HEADERS, {
    Referer: 'https://space.bilibili.com/' + mid,
    Origin: 'https://space.bilibili.com',
  });
  if (cookies) headers.Cookie = cookies;
  const response = await fetch(
    'https://api.bilibili.com/x/space/fav/arc?vmid=' +
      encodeURIComponent(mid) +
      '&ps=30&fid=' +
      encodeURIComponent(fid) +
      '&tid=0&keyword=&pn=' +
      page +
      '&order=fav_time',
    { headers }
  );
  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(json.message || '收藏视频接口错误 ' + json.code);
  }
  const data = json.data || {};
  return {
    videos: Array.isArray(data.archives) ? data.archives : [],
    total: Number(data.total || 0),
    pageCount: Number(data.pagecount || 0),
  };
}

function renderFavFolders(folders, selectedFid) {
  const parts = [
    '<a class="fav-folder' +
      (selectedFid === '0' ? ' on' : '') +
      '" href="/favlist">全部收藏</a>',
  ];
  for (const folder of folders) {
    const fid = String(folder.fid || folder.id || '');
    if (!fid) continue;
    const title =
      (Number(folder.fav_state || 0) !== 0 ? '（私密）' : '') +
      (folder.title || '未命名收藏夹');
    parts.push(
      '<a class="fav-folder' +
        (fid === selectedFid ? ' on' : '') +
        '" href="/favlist?fid=' +
        encodeURIComponent(fid) +
        '">' +
        escapeHtml(title) +
        '<span>' +
        formatFavNumber(folder.media_count || 0) +
        '</span></a>'
    );
  }
  return parts.join('');
}

function renderFavVideos(videos) {
  if (!videos.length) {
    return '<li class="fav-note">这个收藏夹还没有视频。</li>';
  }
  return videos
    .map((video) => {
      const link = video.aid
        ? '/av' + video.aid
        : video.bvid
          ? '/bv/' + video.bvid
          : '#';
      const cover = imageProxy(video.pic) || '/space/assets/noface.gif';
      const owner = video.owner && video.owner.name ? video.owner.name : '未知UP主';
      const views = video.stat && video.stat.view ? video.stat.view : 0;
      const date = formatSpaceDate(video.fav_at || video.pubdate);
      return (
        '<li>' +
        '<a class="cover" href="' + link + '"><img src="' + escapeHtml(cover) + '" alt="" onerror="this.src=\'/space/assets/noface.gif\'" /></a>' +
        '<a class="title" href="' + link + '">' + escapeHtml(video.title || '无标题') + '</a>' +
        '<div class="meta"><span>' + escapeHtml(owner) + '</span><span class="right">' + formatFavNumber(views) + '播放</span></div>' +
        '<div class="meta"><span>' + escapeHtml(date) + '</span></div>' +
        '</li>'
      );
    })
    .join('');
}

function renderFavPager(fid, page, pageCount) {
  if (pageCount <= 1) return '';
  const base = '/favlist?fid=' + encodeURIComponent(fid) + '&page=';
  const parts = [];
  if (page > 1) parts.push('<a href="' + base + (page - 1) + '">上一页</a>');
  for (let i = 1; i <= pageCount; i++) {
    if (i !== 1 && i !== pageCount && Math.abs(i - page) > 2) {
      if (i === 2 || i === pageCount - 1) parts.push('<span>...</span>');
      continue;
    }
    parts.push(
      i === page
        ? '<span>' + i + '</span>'
        : '<a href="' + base + i + '">' + i + '</a>'
    );
  }
  if (page < pageCount) parts.push('<a href="' + base + (page + 1) + '">下一页</a>');
  return '<div class="fav-pager">' + parts.join('') + '</div>';
}

async function renderFavPage(req, fid, page) {
  const session = getLoginSession(req) || getLatestLoginSession();
  if (!session || !session.mid) {
    return FAVLIST_TEMPLATE.split('{{FOLDERS}}')
      .join('')
      .split('{{CONTENT}}')
      .join(
        '<div class="fav-login">登录后才能查看收藏夹。<a href="/login">去登录</a></div>'
      );
  }

  const mid = String(session.mid);
  const selectedFid = String(fid || '0');
  let folders = [];
  let folderError = '';
  try {
    folders = await getFavFolders(mid, session.cookies);
  } catch (error) {
    folderError = error.message;
  }

  const selectedFolder = folders.find(
    (folder) => String(folder.fid || folder.id || '') === selectedFid
  );
  let videoData = { videos: [], total: 0, pageCount: 0 };
  let videoError = '';
  try {
    videoData = await getFavVideos(mid, selectedFid, page, session.cookies);
    const pageCount =
      videoData.pageCount || Math.ceil(videoData.total / 30) || 1;
    if (page > pageCount) {
      page = pageCount;
      videoData = await getFavVideos(mid, selectedFid, page, session.cookies);
    }
  } catch (error) {
    videoError = error.message;
  }

  const pageCount = videoData.pageCount || Math.ceil(videoData.total / 30) || 1;
  const title = selectedFolder
    ? selectedFolder.title
    : selectedFid === '0'
      ? '全部收藏'
      : '收藏夹';
  const note = folderError
    ? '<div class="fav-note">收藏夹列表读取失败：' + escapeHtml(folderError) + '</div>'
    : videoError
      ? '<div class="fav-note">收藏视频读取失败：' + escapeHtml(videoError) + '</div>'
      : '';
  const content =
    '<div class="fav-head"><h2>' +
    escapeHtml(title) +
    '</h2><em>共' +
    formatFavNumber(videoData.total) +
    '个视频</em></div>' +
    note +
    '<ul class="fav-videos">' +
    renderFavVideos(videoData.videos) +
    '</ul>' +
    renderFavPager(selectedFid, page, pageCount);

  return FAVLIST_TEMPLATE.split('{{FOLDERS}}')
    .join(renderFavFolders(folders, selectedFid))
    .split('{{CONTENT}}')
    .join(content);
}

function formatHistoryClock(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hour = Math.floor(total / 3600);
  const minute = Math.floor((total % 3600) / 60);
  const second = Math.floor(total % 60);
  const mm = (minute < 10 ? '0' : '') + minute;
  const ss = (second < 10 ? '0' : '') + second;
  return hour ? hour + ':' + mm + ':' + ss : mm + ':' + ss;
}

async function getHistory(cursor, cookies) {
  const headers = Object.assign({}, BILI_HEADERS, {
    Referer: 'https://www.bilibili.com/',
    Origin: 'https://www.bilibili.com',
  });
  if (cookies) headers.Cookie = cookies;
  const url =
    'https://api.bilibili.com/x/web-interface/history/cursor?type=archive' +
    '&view_at=' +
    encodeURIComponent(cursor.viewAt || 0) +
    '&business=' +
    encodeURIComponent(cursor.business || '') +
    '&max=' +
    encodeURIComponent(cursor.max || 0);
  const response = await fetch(url, { headers });
  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(json.message || '历史记录接口错误 ' + json.code);
  }
  const data = json.data || {};
  const list = Array.isArray(data.list) ? data.list : [];
  const next = data.cursor || {};
  return {
    items: list,
    next: {
      max: next.max || 0,
      viewAt: next.view_at || 0,
      business: next.business || '',
    },
  };
}

function renderHistoryItems(items) {
  if (!items.length) {
    return '<div class="history-note">暂无播放历史。</div>';
  }
  return (
    '<ul class="history-list">' +
    items
      .map((item) => {
        const history = item.history || {};
        const link = history.oid
          ? '/av' + history.oid
          : history.bvid
            ? '/bv/' + history.bvid
            : '#';
        const cover = imageProxy(item.cover) || '/space/assets/noface.gif';
        const progress = Number(item.progress || 0);
        const progressText =
          progress < 0
            ? '已看完'
            : progress === 0
              ? '还没看过'
              : '看到' + formatHistoryClock(progress);
        return (
          '<li>' +
          '<a class="cover" href="' + link + '"><img src="' + escapeHtml(cover) + '" alt="" onerror="this.src=\'/space/assets/noface.gif\'" /></a>' +
          '<div class="info">' +
          '<a class="title" href="' + link + '">' + escapeHtml(item.title || '无标题') + '</a>' +
          '<div class="meta"><span>' + escapeHtml(item.author_name || '未知UP主') + '</span>' +
          '<span>' + escapeHtml(formatSpaceDate(item.view_at) || '') + '</span>' +
          '<span>' + escapeHtml(progressText) + '</span>' +
          '</div>' +
          '</div>' +
          '</li>'
        );
      })
      .join('') +
    '</ul>'
  );
}

function renderHistoryPager(cursor) {
  if (!cursor || !cursor.max) return '';
  const href =
    '/history?max=' +
    encodeURIComponent(cursor.max) +
    '&view_at=' +
    encodeURIComponent(cursor.viewAt) +
    '&business=' +
    encodeURIComponent(cursor.business || '');
  return '<div class="history-pager"><a href="' + href + '">下一页</a></div>';
}

async function searchVideos(keyword, page, order, cookies) {
  async function request() {
    const mixin = await getWbiMixin(cookies);
    const params = new URLSearchParams({
      search_type: 'video',
      keyword: keyword,
      page: String(page),
      page_size: '20',
      order: order,
      duration: '0',
      tids: '0',
    });
    const url = signWbi(
      'https://api.bilibili.com/x/web-interface/wbi/search/type',
      params,
      mixin
    );
    const headers = Object.assign({}, webRequestHeaders(), {
      Referer: 'https://search.bilibili.com/',
      Origin: 'https://search.bilibili.com',
    });
    if (cookies) headers.Cookie = cookies;
    const response = await fetch(url, { headers });
    return response.json();
  }

  let json = await request();
  if (json.code === -352 || json.code === -412) {
    wbiMixinCache = { date: '', key: '' };
    json = await request();
  }
  if (json.code !== 0) {
    throw new Error(json.message || '搜索接口错误 ' + json.code);
  }
  const data = json.data || {};
  return {
    videos: Array.isArray(data.result) ? data.result : [],
    total: Number(data.numResults || 0),
    pageCount: Number(data.numPages || 0),
  };
}

function searchPlainText(value) {
  return String(value == null ? '' : value).replace(/<[^>]+>/g, '');
}

function renderSearchResults(videos) {
  if (!videos.length) {
    return '<div class="search-note">没有找到相关视频。</div>';
  }
  return (
    '<ul class="search-list">' +
    videos
      .map((video) => {
        const link = video.aid
          ? '/av' + video.aid
          : video.bvid
            ? '/bv/' + video.bvid
            : '#';
        const cover = imageProxy(video.pic) || '/space/assets/noface.gif';
        const typeName = searchPlainText(video.typename || '').trim();
        const tags = String(video.tag || '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8);
        return (
          '<li>' +
          '<a class="cover" href="' + link + '"><img src="' + escapeHtml(cover) + '" alt="" onerror="this.src=\'/space/assets/noface.gif\'" /></a>' +
          '<div class="info">' +
          '<a class="title" href="' + link + '">' +
          (typeName ? '<span class="search-type">' + escapeHtml(typeName) + '</span>' : '') +
          escapeHtml(searchPlainText(video.title || '无标题')) +
          '</a>' +
          '<div class="meta">' +
          '<span>UP主：<b>' + escapeHtml(searchPlainText(video.author || '未知UP主')) + '</b></span>' +
          '<span>播放：<b>' + formatFavNumber(video.play || 0) + '</b></span>' +
          '<span>收藏：<b>' + formatFavNumber(video.favorites || 0) + '</b></span>' +
          '<span>评论：<b>' + formatFavNumber(video.review || 0) + '</b></span>' +
          '<span>发布日期：<b>' + escapeHtml(formatSpaceDate(video.pubdate) || '') + '</b></span>' +
          '</div>' +
          (tags.length
            ? '<div class="tags"><span>TAG:</span>' +
              tags
                .map((tag) => '<span>' + escapeHtml(tag) + '</span>')
                .join('') +
              '</div>'
            : '') +
          '<div class="desc">' + escapeHtml(searchPlainText(video.description || '')) + '</div>' +
          '</div>' +
          '</li>'
        );
      })
      .join('') +
    '</ul>'
  );
}

function renderSearchSort(keyword, order) {
  const options = [
    ['totalrank', '默认排序'],
    ['click', '播放多'],
    ['pubdate', '最新发布'],
    ['dm', '弹幕多'],
    ['stow', '收藏多'],
  ];
  return options
    .map(([value, label]) => {
      const href =
        '/search?keyword=' + encodeURIComponent(keyword) + '&order=' + value;
      return (
        '<a href="' +
        href +
        '"' +
        (value === order ? ' class="on"' : '') +
        '>' +
        label +
        '</a>'
      );
    })
    .join('');
}

function renderSearchPager(keyword, page, pageCount, order) {
  if (pageCount <= 1) return '';
  const base =
    '/search?keyword=' +
    encodeURIComponent(keyword) +
    '&order=' +
    encodeURIComponent(order) +
    '&page=';
  const parts = [];
  if (page > 1) parts.push('<a href="' + base + (page - 1) + '">上一页</a>');
  for (let i = 1; i <= pageCount; i++) {
    if (i !== 1 && i !== pageCount && Math.abs(i - page) > 2) {
      if (i === 2 || i === pageCount - 1) parts.push('<span>...</span>');
      continue;
    }
    parts.push(
      i === page
        ? '<span>' + i + '</span>'
        : '<a href="' + base + i + '">' + i + '</a>'
    );
  }
  if (page < pageCount) parts.push('<a href="' + base + (page + 1) + '">下一页</a>');
  return '<div class="search-pager">' + parts.join('') + '</div>';
}

async function renderSearchPage(req, keyword, page, order) {
  let count = '';
  let content = '';
  let pager = '';
  let summary = '';
  if (!keyword) {
    content = '<div class="search-note">请输入关键词后搜索。</div>';
  } else {
    try {
      const started = Date.now();
      const result = await searchVideos(keyword, page, order, getRequestCookies(req));
      const elapsed = ((Date.now() - started) / 1000).toFixed(3);
      count = result.total ? '共' + formatFavNumber(result.total) + '个视频' : '';
      summary =
        '<div class="search-summary">本次搜索总共耗时<b>' +
        elapsed +
        's</b> 共为您搜到<b>' +
        formatFavNumber(result.total) +
        '</b>个相关视频</div>';
      content = renderSearchResults(result.videos);
      pager = renderSearchPager(keyword, page, result.pageCount, order);
    } catch (error) {
      content = '<div class="search-note">搜索失败：' + escapeHtml(error.message) + '</div>';
    }
  }
  return SEARCH_TEMPLATE.split('{{COUNT}}')
    .join(count)
    .split('{{SORT}}')
    .join(renderSearchSort(keyword, order))
    .split('{{SUMMARY}}')
    .join(summary)
    .split('{{CONTENT}}')
    .join(content)
    .split('{{PAGER}}')
    .join(pager);
}

async function renderHistoryPage(req, cursor) {
  const session = getLoginSession(req);
  if (!session) {
    return HISTORY_TEMPLATE.split('{{CONTENT}}').join(
      '<div class="history-login">登录后才能查看播放历史。<a href="/login">去登录</a></div>'
    );
  }
  let content =
    '<div class="history-head"><h2>播放历史</h2><em>按最近观看排序</em></div>';
  try {
    const result = await getHistory(cursor, session.cookies);
    content += renderHistoryItems(result.items);
    content += renderHistoryPager(result.next);
  } catch (error) {
    content += '<div class="history-note">播放历史读取失败：' + escapeHtml(error.message) + '</div>';
  }
  return HISTORY_TEMPLATE.split('{{CONTENT}}').join(content);
}

async function renderSpacePage(mid, page, req, refresh) {
  const cookies = await getSpaceCookies(req);
  const card = await getSpaceCard(mid, cookies);
  const videoData = await getSpaceVideos(mid, page, cookies, refresh);
  const name = card ? card.name : '未知用户';
  const face = card && card.face ? imageProxy(card.face) : '/space/assets/noface.gif';
  const officialBadge = card && card.verify ? '<img class="space-verify-icon" src="/space/assets/vertified-Ico.png" title="官方认证用户" alt="" />' : '';
  const officialTitle = card && card.officialTitle ? card.officialTitle : '';
  const verifyStyle = officialTitle ? 'display:block;' : 'display:none;';
  const values = {
    TITLE: escapeHtml(name) + '的空间 - 哔哩哔哩',
    MID: String(mid),
    NAME: escapeHtml(name),
    FACE: escapeHtml(face),
    LEVEL: '普通会员',
    FANS: String(card ? card.fans : 0),
    FOLLOWING: String(card ? card.following : 0),
    VERIFY: card && card.verify ? '1' : '0',
    VERIFY_STYLE: verifyStyle,
    OFFICIAL_BADGE: officialBadge,
    OFFICIAL_TITLE: escapeHtml(officialTitle || '暂无认证资料'),
    VIDEOS: renderSpaceVideos(videoData.videos, mid),
    VIDEO_NOTE: videoData.archived
      ? '<div class="space-note">哔哩哔哩投稿接口暂时受限，以下显示 2012 年存档内容。' +
        '<a href="/space/' + mid + '?refresh=1">重新获取</a></div>'
      : '',
    PAGER: renderSpacePager(mid, page, videoData.total, 10),
  };
  let html = SPACE_TEMPLATE;
  for (const key of Object.keys(values)) {
    html = html.split('{{' + key + '}}').join(values[key]);
  }
  if (videoData.error) {
    html = html.replace(
      '<li class="space-error">',
      '<li class="space-error">投稿加载失败：' + escapeHtml(videoData.error) + '；'
    );
  }
  return html;
}

function renderInfoRow(label, value) {
  return (
    '<tr><td width="101">' +
    escapeHtml(label) +
    '</td><td width="593">' +
    (escapeHtml(String(value || '')) || '&nbsp;') +
    '</td></tr>'
  );
}

async function renderSpaceInfo(mid, req) {
  const cookies = await getSpaceCookies(req);
  const [card, account] = await Promise.all([
    getSpaceCard(mid, cookies),
    getSpaceAccountInfo(mid, cookies),
  ]);
  const profile = defaultSpaceProfile(mid);

  if (!profile.nickname) profile.nickname = (card && card.name) || (account && account.name) || '未知用户';
  if (!profile.sex) profile.sex = (account && account.sex) || '';
  if (!profile.birthday) profile.birthday = (account && account.birthday) || '';
  if (!profile.intro) profile.intro = (account && account.sign) || (card && card.sign) || '';

  const name = profile.nickname || '未知用户';
  const faceSource = (account && account.face) || (card && card.face) || '';
  const face = faceSource ? imageProxy(faceSource) : '/space/assets/noface.gif';
  const officialBadge = card && card.verify ? '<img class="space-verify-icon" src="/space/assets/vertified-Ico.png" title="官方认证用户" alt="" />' : '';
  const officialTitle = card && card.officialTitle ? card.officialTitle : '';
  const verifyStyle = officialTitle ? 'display:block;' : 'display:none;';

  const basicFields = [
    ['nickname', '昵称：'],
    ['sex', '性别：'],
    ['birthday', '出生日期：'],
    ['intro', '个人介绍：'],
  ];
  const detailFields = [
    ['qq', '腾讯QQ：'],
    ['msn', 'MSN：'],
    ['phone', '电话：'],
    ['mobile', '手机：'],
    ['address', '详细地址：'],
    ['constellation', '星座：'],
    ['blood', '血型：'],
    ['height', '身高：'],
    ['body', '体型：'],
    ['languages', '语言：'],
  ];
  const econFields = [
    ['income', '收入状况：'],
    ['education', '教育程度：'],
    ['housing', '住房情况：'],
    ['industry', '所属行业：'],
  ];
  const renderRows = (fields) =>
    fields.map(([key, label]) => renderInfoRow(label, profile[key])).join('');

  const values = {
    TITLE: escapeHtml(name) + '的个人资料 - 哔哩哔哩',
    MID: String(mid),
    NAME: escapeHtml(name),
    FACE: escapeHtml(face),
    FANS: String(card ? card.fans : 0),
    FOLLOWING: String(card ? card.following : 0),
    VERIFY: card && card.verify ? '1' : '0',
    VERIFY_STYLE: verifyStyle,
    OFFICIAL_BADGE: officialBadge,
    OFFICIAL_TITLE: escapeHtml(officialTitle || '暂无认证资料'),
    BASIC_ROWS: renderRows(basicFields),
    DETAIL_ROWS: renderRows(detailFields),
    ECON_ROWS: renderRows(econFields),
  };
  let html = SPACE_INFO_TEMPLATE;
  for (const key of Object.keys(values)) {
    html = html.split('{{' + key + '}}').join(values[key]);
  }
  return html;
}

function loginStatusHtml(session) {
  if (!session) {
    return (
      '<div class="bg" id="hl_status_l">' +
      '<a href="/login">登陆</a> <a href="/register">注册帐号</a> ' +
      '<a href="javascript:;">历史观看</a></div>'
    );
  }
  const mid = String(session.mid || '');
  const name = escapeHtml(session.uname || '已登录');
  const face = imageProxy(session.face) || '/space/assets/noface.gif';
  return (
    '<div class="bg" id="hl_status_l">' +
    '<a class="img" href="/space/' + encodeURIComponent(mid) + '" title="' + name + '">' +
    '<img src="' + escapeHtml(face) + '" alt="" /></a>' +
    '<a href="https://message.bilibili.com/#/at" target="_blank">@我</a>' +
    '<a href="https://space.bilibili.com/' + encodeURIComponent(mid) + '/fans/follow" target="_blank">我关注的</a>' +
    '<a href="https://account.bilibili.com/account/home" target="_blank">会员中心</a>' +
    '<a href="https://message.bilibili.com/" target="_blank">私信</a>' +
    '<a href="/favlist">收藏夹</a>' +
    '<a href="https://member.bilibili.com/" target="_blank">发布视频</a>' +
    '<a href="/history">历史观看</a>' +
    '<a class="out" href="/api/logout">退出&gt;</a>' +
    '</div>'
  );
}

async function getBangumiInfo(epId, cookies) {
  const authKey = cookies ? md5Hex(cookies).slice(0, 10) : 'anon';
  const cacheKey = 'ep:' + epId + ':' + authKey;
  const cached = bangumiInfoCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  const headers = Object.assign({}, BILI_HEADERS, {
    Referer: 'https://www.bilibili.com/bangumi/play/ep' + epId,
  });
  if (cookies) headers.Cookie = cookies;
  const response = await fetch(
    'https://api.bilibili.com/pgc/view/web/season?ep_id=' + epId,
    { headers }
  );
  const json = await response.json();
  if (json.code !== 0 || !json.result) {
    throw new Error('bangumi failed: ' + JSON.stringify(json).slice(0, 300));
  }
  const result = json.result;
  const episodes = [];
  const pushEpisode = (episode) => {
    if (!episode || !episode.cid) return;
    if (episodes.some((item) => String(item.cid) === String(episode.cid))) return;
    episodes.push(episode);
  };
  (result.episodes || []).forEach(pushEpisode);
  (result.section || []).forEach((section) => (section.episodes || []).forEach(pushEpisode));
  if (!episodes.length) throw new Error('番剧没有可用剧集');

  const current =
    episodes.find((episode) => String(episode.ep_id || episode.id) === String(epId)) ||
    episodes[0];
  const pages = episodes.map((episode, index) => {
    const title = String(episode.title || '');
    const longTitle = String(episode.long_title || '');
    return {
      page: index + 1,
      cid: String(episode.cid),
      aid: String(episode.aid || ''),
      epId: String(episode.ep_id || episode.id || ''),
      part: title + (longTitle ? '、' + longTitle : ''),
      duration: Number(episode.duration) / 1000 || 0,
    };
  });

  for (const item of pages) {
    if (!item.cid) continue;
    cidInfoMap.set(item.cid, { aid: item.aid || String(current.aid || '') });
    bangumiCidMap.set(item.cid, item.epId);
    if (item.aid) bangumiAidMap.set(item.aid, item.epId);
  }

  const stat = result.stat || {};
  const up = result.up_info || {};
  const pubdate = Number(current.pub_time);
  const view = {
    aid: String(current.aid || ''),
    cid: String(current.cid || ''),
    title:
      String(result.title || '') +
      (current.title ? ' - ' + current.title : '') +
      (current.long_title ? ' ' + current.long_title : ''),
    pic: current.cover || result.cover || '',
    desc: result.evaluate || result.subtitle || '',
    pubdate: isFinite(pubdate) ? pubdate : 0,
    duration: Number(current.duration) / 1000 || 0,
    owner: {
      mid: up.mid || 0,
      name: up.uname || '哔哩哔哩番剧',
      face: up.avatar || '/space/assets/noface.gif',
    },
    stat: {
      view: stat.views || 0,
      favorite: stat.favorites || 0,
      coin: stat.coins || 0,
      like: stat.likes || 0,
      danmaku: stat.danmakus || 0,
    },
    tid: 13,
    videos: pages.length,
    pages,
  };
  const value = {
    view,
    tags: ['番剧', result.title || ''].filter(Boolean),
    sign: '',
    bangumi: true,
    epId: String(epId),
    seasonId: String(result.season_id || ''),
  };
  bangumiInfoCache.set(cacheKey, { value, expires: Date.now() + 2 * 60 * 1000 });
  return value;
}

async function getVideoInfo(aid, cookies) {
  const authKey = cookies ? md5Hex(cookies).slice(0, 10) : 'anon';
  const cacheKey = aid + ':' + authKey;
  const cached = videoInfoCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const headers = Object.assign({}, BILI_HEADERS, cookies ? { Cookie: cookies } : {});
  const response = await fetch('https://api.bilibili.com/x/web-interface/view/detail?aid=' + aid, { headers });
  const json = await response.json();
  if (json.code !== 0 || !json.data || !json.data.View) {
    throw new Error('view failed: ' + JSON.stringify(json).slice(0, 300));
  }

  const view = json.data.View;
  const redirectUrl = String(view.redirect_url || '');
  const epMatch =
    redirectUrl.match(/[?&]ep_id=(\d+)/) || redirectUrl.match(/\/ep(\d+)/);
  if (epMatch) return getBangumiInfo(epMatch[1], cookies);
  let tags = (json.data.Tags || []).map((t) => t.tag_name);

  if (!tags.length) {
    try {
      const tagResponse = await fetch('https://api.bilibili.com/x/tag/archive/tags?aid=' + aid, { headers });
      const tagJson = await tagResponse.json();
      if (tagJson.code === 0) {
        tags = (tagJson.data || []).map((t) => t.tag_name);
      }
    } catch (e) {}
  }

  tags = tags.filter((tag) => tag && !/^发现《.*》$/.test(tag));

  let sign = '';
  try {
    const cardResponse = await fetch('https://api.bilibili.com/x/web-interface/card?mid=' + view.owner.mid, { headers });
    const cardJson = await cardResponse.json();
    if (cardJson.code === 0 && cardJson.data && cardJson.data.card) {
      sign = cardJson.data.card.sign || '';
    }
  } catch (e) {}

  const data = { view, tags, sign };
  videoInfoCache.set(cacheKey, { data, expires: Date.now() + 5 * 60 * 1000 });
  return data;
}

const VIDEO_CATEGORY_MAP = {
  1: ['动画', '/video/douga.html', '动画', '/video/douga.html'],
  24: ['动画', '/video/douga.html', 'MAD·AMV', '/video/douga-mad-1.html'],
  25: ['动画', '/video/douga.html', 'MMD·3D', '/video/douga-mmd-1.html'],
  26: ['动画', '/video/douga.html', '二次元鬼畜', '/video/douga-kichiku-1.html'],
  27: ['动画', '/video/douga.html', '期刊·其他', '/video/douga-else-1.html'],
  3: ['音乐', '/video/music.html', '音乐', '/video/music.html'],
  28: ['音乐', '/video/music.html', '音乐视频', '/video/music-video-1.html'],
  29: ['音乐', '/video/music.html', '三次元音乐', '/video/music-coordinate-1.html'],
  30: ['音乐', '/video/music.html', 'VOCALOID·UTAU', '/video/music-vocaloid-1.html'],
  31: ['音乐', '/video/music.html', '翻唱', '/video/music-Cover-1.html'],
  4: ['游戏', '/video/game.html', '游戏', '/video/game.html'],
  17: ['游戏', '/video/game.html', '游戏视频', '/video/game-video-1.html'],
  18: ['游戏', '/video/game.html', '游戏攻略·解说', '/video/game-ctary-1.html'],
  19: ['游戏', '/video/game.html', 'MUGEN', '/video/game-mugen-1.html'],
  5: ['娱乐', '/video/ent.html', '娱乐', '/video/ent.html'],
  20: ['娱乐', '/video/ent.html', '舞蹈', '/video/ent-dance-1.html'],
  21: ['娱乐', '/video/ent.html', '生活娱乐', '/video/ent-life-1.html'],
  22: ['娱乐', '/video/ent.html', '三次元鬼畜', '/video/ent-Kichiku-1.html'],
  23: ['娱乐', '/video/ent.html', '影视', '/video/ent-telvisn-1.html'],
  193: ['娱乐', '/video/ent.html', '生活娱乐', '/video/ent-life-1.html'],
  11: ['合集', '/video/part.html', '合集', '/video/part.html'],
  32: ['合集', '/video/part.html', '合集二次元', '/video/part-twoelement-1.html'],
  15: ['合集', '/video/part.html', '合集三次元', '/video/part-coordinate-1.html'],
  13: ['新番连载', '/video/bangumi.html', '新番连载', '/video/bangumi.html'],
  33: ['新番连载', '/video/bangumi.html', '新番二次元', '/video/bangumi-two-1.html'],
  34: ['新番连载', '/video/bangumi.html', '新番三次元', '/video/bangumi-three-1.html'],
  36: ['科学技术', '/video/technology.html', '科学技术', '/video/technology.html'],
  37: ['科学技术', '/video/technology.html', '科普知识', '/video/tech-popular-science-1.html'],
  38: ['科学技术', '/video/technology.html', '人文地理', '/video/tech-geo-1.html'],
  39: ['科学技术', '/video/technology.html', '全球科技', '/video/tech-future-1.html'],
  40: ['科学技术', '/video/technology.html', '野生技术', '/video/tech-wild-1.html'],
  130: ['音乐', '/video/music.html', '音乐视频', '/video/music-video-1.html'],
  129: ['娱乐', '/video/ent.html', '舞蹈', '/video/ent-dance-1.html'],
  138: ['娱乐', '/video/ent.html', '生活娱乐', '/video/ent-life-1.html'],
  160: ['娱乐', '/video/ent.html', '生活娱乐', '/video/ent-life-1.html'],
  181: ['娱乐', '/video/ent.html', '影视', '/video/ent-telvisn-1.html'],
  188: ['科学技术', '/video/technology.html', '全球科技', '/video/tech-future-1.html'],
  211: ['娱乐', '/video/ent.html', '生活娱乐', '/video/ent-life-1.html'],
  217: ['科学技术', '/video/technology.html', '野生技术', '/video/tech-wild-1.html'],
  223: ['科学技术', '/video/technology.html', '野生技术', '/video/tech-wild-1.html'],
  250: ['娱乐', '/video/ent.html', '生活娱乐', '/video/ent-life-1.html'],
  251: ['动画', '/video/douga.html', '二次元鬼畜', '/video/douga-kichiku-1.html'],
  239: ['科学技术', '/video/technology.html', '科普知识', '/video/tech-popular-science-1.html'],
  202: ['娱乐', '/video/ent.html', '生活娱乐', '/video/ent-life-1.html'],
};

function getVideoCategory(view) {
  const mapped = VIDEO_CATEGORY_MAP[Number(view.tid)];
  if (mapped) {
    return {
      parentName: mapped[0],
      parentUrl: mapped[1],
      subName: mapped[2],
      subUrl: mapped[3],
    };
  }
  const subName = String(view.tname || view.tname_v2 || '其他');
  return {
    parentName: '其他',
    parentUrl: '/video/part.html',
    subName,
    subUrl: '/video/part.html',
  };
}

function renderPage(aid, cid, info, pageNo) {
  const view = info.view;
  const owner = view.owner || {};
  const stat = view.stat || {};
  const pages = view.pages || [];
  const page = pages[pageNo - 1] || pages[0] || {};
  const title = String(view.title || '');
  const desc = String(view.desc || '');
  const ownerName = String(owner.name || '');
  const ownerMid = String(owner.mid || '');
  const ownerFace = imageProxy(owner.face);
  const pic = imageProxy(view.pic);
  const category = getVideoCategory(view);
  const tags = info.tags || [];
  const published = new Date((view.pubdate || view.ctime || 0) * 1000);
  const pubText =
    published.getFullYear() +
    '-' +
    pad2(published.getMonth() + 1) +
    '-' +
    pad2(published.getDate()) +
    ' ' +
    pad2(published.getHours()) +
    ':' +
    pad2(published.getMinutes());
  const pubIso =
    published.getFullYear() +
    '-' +
    pad2(published.getMonth() + 1) +
    '-' +
    pad2(published.getDate()) +
    'T' +
    pad2(published.getHours()) +
    ':' +
    pad2(published.getMinutes());
  const duration = Number(page.duration || view.duration || 0);
  const partPageNo = Math.min(Math.max(1, pageNo), Math.max(1, pages.length));
  const partSelect =
    pages.length > 1
      ? '<select id="dedepagetitles" onchange="location.href=this.options[this.selectedIndex].value;">' +
        pages
          .map((item, index) => {
            const number = Number(item.page) || index + 1;
            const label = info.bangumi
              ? item.part || '第' + number + '话'
              : number + '、' + (item.part || 'P' + number);
            const pageUrl =
              info.bangumi && item.epId
                ? '/bangumi/ep' + item.epId
                : '/av' + aid + '?p=' + number;
            return (
              '<option value="' +
              escapeHtml(pageUrl) +
              '"' +
              (number === partPageNo ? ' selected="selected"' : '') +
              '>' +
              escapeHtml(label) +
              '</option>'
            );
          })
          .join('') +
        '</select>'
      : '';
  const tagsHtml = tags
    .map(
      (tag) =>
        '<li><a href="https://search.bilibili.com/all?keyword=' +
        encodeURIComponent(tag) +
        '" target="_blank" rel="noreferrer">' +
        escapeHtml(tag) +
        '</a></li>'
    )
    .join('');
  const descHtml = escapeHtml(desc).replace(/\r?\n/g, '<br>');
  const wbInfo = title + '   UP主：' + ownerName;
  const wbUrl = 'https://www.bilibili.com/video/av' + aid + '/';

  let html = PAGE_TEMPLATE;

  html = html.replace(
    /<div class="alist"><div id="alist"><\/div><\/div>/,
    '<div class="alist"><div id="alist">' + partSelect + '</div></div>'
  );

  html = html.replace(
    /<a href='\/video\/douga\.html' rel="v:url" property="v:title">动画<\/a>/,
    '<a href="' +
      escapeHtml(category.parentUrl) +
      '" rel="v:url" property="v:title">' +
      escapeHtml(category.parentName) +
      '</a>'
  );
  html = html.replace(
    /<a href="\/video\/douga-mad-1\.html" class="on" rel="v:url" property="v:title">MAD·AMV<\/a>/,
    '<a href="' +
      escapeHtml(category.subUrl) +
      '" class="on" rel="v:url" property="v:title">' +
      escapeHtml(category.subName) +
      '</a>'
  );

  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(title) + ' - 哔哩哔哩</title>');
  html = html.replace(/<h2>[\s\S]*?<\/h2>/, '<h2>' + escapeHtml(title) + '</h2>');
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    '<meta name="description" content="' + escapeHtml(desc).replace(/"/g, '&quot;') + '" />'
  );
  html = html.replace(
    /<div class="intro">[\s\S]*?<\/div>/,
    '<div class="intro">' + descHtml + '</div>'
  );
  html = html.replace(/<ul class="tag">[\s\S]*?<\/ul>/, '<ul class="tag"></ul>');
  html = html.replace(
    /<div class="u-face">[\s\S]*?<\/div>/,
    '<div class="u-face"><img src="' + escapeHtml(ownerFace) + '"></div>'
  );
  html = html.replace(
    /<div class="usname"[\s\S]*?<\/div>/,
    '<div class="usname" id="r-info-rank"> <a href="/space/' +
      ownerMid +
      '" card="' +
      escapeHtml(ownerName) +
      '" target="_blank">' +
      escapeHtml(ownerName) +
      '</a></div>'
  );
  html = html.replace(/<div class="sign">[\s\S]*?<\/div>/, '<div class="sign">' + escapeHtml(info.sign || '') + '</div>');
  html = html.replace(/mid="\d+"/, 'mid="' + ownerMid + '"');
  html = html.replace(/http:\/\/space\.bilibili\.tv\/\d+/g, '/space/' + ownerMid);
  html = html.replace(
    /datetime="[^"]*"><i>[^<]*<\/i>/,
    'datetime="' + pubIso + '"><i>' + pubText + '</i>'
  );
  html = html.replace(/content="2012-10-31T15:20"/g, 'content="' + pubIso + '"');
  html = html.replace(
    /flashvars="[^"]*"/,
    'flashvars="file=/media/video/' +
      aid +
      '/' +
      cid +
      '.mp4&id=' +
      cid +
      '&aid=' +
      aid +
      '&as_wide=1&autostart=true"'
  );
  html = html.replace(
    /<meta itemprop="name" property="media:title" content="[^"]*"/,
    '<meta itemprop="name" property="media:title" content="' + escapeHtml(title) + '"'
  );
  html = html.replace(
    /<meta itemprop="thumbnailUrl" rel="media:thumbnail" content="[^"]*"/,
    '<meta itemprop="thumbnailUrl" rel="media:thumbnail" content="' + escapeHtml(pic) + '"'
  );
  html = html.replace(
    /<meta itemprop="duration" content="[^"]*"/,
    '<meta itemprop="duration" content="PT' + Math.floor(duration / 60) + 'M' + (duration % 60) + 'S"'
  );
  html = html.replace(
    /var aid='[^']*';var mid='[^']*';[\s\S]*?var wb_img='[^']*';/,
    "var aid='" +
      aid +
      "';var mid='" +
      ownerMid +
      "';var pageno = '" +
      partPageNo +
      "';var totalpage = '" +
      (pages.length || 1) +
      "';var wb_info=" +
      JSON.stringify(wbInfo) +
      ';var wb_url=' +
      JSON.stringify(wbUrl) +
      ';var wb_full_url=' +
      JSON.stringify(PUBLIC_ORIGIN + '/av' + aid + '/') +
      ';var wb_img=' +
      JSON.stringify(pic) +
      ';'
  );
  html = html.replace(/<i id="dianji"><\/i>/, '<i id="dianji">' + (stat.view || 0) + '</i>');
  html = html.replace(/<i id="stow_count"><\/i>/, '<i id="stow_count">' + (stat.favorite || 0) + '</i>');
  html = html.replace(
    /<span id="v_ctimes" title="硬币数量"><\/span>/,
    '<span id="v_ctimes" title="硬币数量">' + (stat.coin || 0) + '</span>'
  );
  html = html.replace(/<span id="v_cscores"><\/span>/, '<span id="v_cscores">' + (stat.like || 0) + '</span>');
  html = html.replace(/kwtags\([\s\S]*?\);/, 'kwtags(' + JSON.stringify(tags) + ',[]);');
  html = html.replace(
    /<meta name="keywords" content="[^"]*"\s*\/>/,
    '<meta name="keywords" content="' + escapeHtml(tags.join(',')) + '" />'
  );
  html = html.replace(
    /<meta name="title" content="[^"]*"\s*\/>/,
    '<meta name="title" content="' + escapeHtml(title) + '" />'
  );
  html = html.replace(/desc:'[^']*'/, 'desc:' + JSON.stringify(wbInfo));
  html = html.replace(/summary:'[^']*'/, 'summary:' + JSON.stringify(desc));
  html = html.replace(/title:'[^']*'/, 'title:' + JSON.stringify(title));
  html = html.replace(/pics:'[^']*'/, 'pics:' + JSON.stringify(pic));
  html = html.replace(/SinaWeibo\([^;]*\);/, 'SinaWeibo(wb_info, wb_url, wb_img);');

  cidInfoMap.set(String(cid), { aid: String(aid) });
  wrappedCidMap.set(wrapInt32(cid), String(cid));

  return html;
}

function playurlXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<root>' +
    '<result>suee</result>' +
    '<timelength>221123</timelength>' +
    '<accept_quality>64,16</accept_quality>' +
    '<accept_format>mp4720,mp4</accept_format>' +
    '<seek_param>start</seek_param>' +
    '<seek_type>offset</seek_type>' +
    '<durl>' +
    '<order>1</order>' +
    '<length>221123</length>' +
    '<size>0</size>' +
    '<url><![CDATA[/media/video.mp4]]></url>' +
    '</durl>' +
    '<src><![CDATA[/media/video.mp4]]></src>' +
    '</root>'
  );
}

const server = http.createServer(async (req, res) => {
  const rawPath = req.url.split('?')[0];
  const search = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const pathname = decodeURIComponent(rawPath).replace(/\/{2,}/g, '/');

  try {
    if (pathname === '/' || pathname === '/2012' || pathname === '/2012/') {
      return serveFile(path.join(DEMO, 'bili2012', 'index.html'), req, res);
    }

    if (pathname === '/start' || pathname === '/home') {
      return serveFile(path.join(DEMO, 'home.html'), req, res);
    }

    if (pathname === '/register' || pathname === '/register/' || pathname === '/register.html') {
      return serveFile(path.join(DEMO, 'bili2012', 'register.html'), req, res);
    }

    if (pathname === '/login' || pathname === '/login/' || pathname === '/login.html') {
      const loginFile = path.join(DEMO, 'bili2012', 'login.html');
      const session = getLoginSession(req);
      let html = fs.readFileSync(loginFile, 'utf8');
      const statusHtml = loginStatusHtml(session);
      html = html.replace(
        /<div class="bg" id="hl_status_l">[\s\S]*?<\/div>/,
        statusHtml
      );
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(html),
        'Cache-Control': 'no-store',
      });
      return res.end(html);
    }

    if (pathname === '/captcha') {
      return serveFile(path.join(DEMO, 'bili2012', 'assets', 'captcha.png'), req, res);
    }

    if (pathname === '/api/login/sms/pre') {
      try {
        await ensureBiliCookies();
        const buvid = cookieJarGet('buvid3') || randomBuvid();
        const params = appSign({ disable_rcmd: '0' });
        const { json } = await postAppForm(
          'https://passport.bilibili.com/x/safecenter/captcha/pre',
          params,
          buvid
        );
        return sendJson(res, 200, {
          code: json.code,
          message: json.message || '',
          data: json.data || null,
        });
      } catch (error) {
        return sendJson(res, 502, { code: -1, message: error.message });
      }
    }

    if (pathname === '/api/login/sms/send') {
      try {
        const form = new URLSearchParams(await readBody(req));
        const tel = (form.get('tel') || '').trim();
        if (!/^1[3-9]\d{9}$/.test(tel)) {
          return sendJson(res, 400, { code: -1, message: '请输入正确的手机号' });
        }
        const geeChallenge = (form.get('gee_challenge') || '').trim();
        const geeValidate = (form.get('gee_validate') || '').trim();
        const geeSeccode = (form.get('gee_seccode') || '').trim();
        const recaptchaToken = (form.get('recaptcha_token') || '').trim();
        await ensureBiliCookies();
        const old = smsLoginSessions.get(tel);
        const useOld = old && old.expires > Date.now();
        const buvid = cookieJarGet('buvid3') || (useOld ? old.buvid : randomBuvid());
        const deviceId = useOld ? old.deviceId : randomDeviceId();
        const now = Date.now();
        const params = {
          build: '2001100',
          buvid,
          c_locale: 'zh_CN',
          channel: 'master',
          cid: '86',
          disable_rcmd: '0',
          local_id: buvid,
          login_session_id: md5Hex(buvid + now),
          mobi_app: 'android_hd',
          platform: 'android',
          s_locale: 'zh_CN',
          statistics: APP_STATISTICS,
          tel,
        };
        if (geeChallenge) params.gee_challenge = geeChallenge;
        if (geeSeccode) params.gee_seccode = geeSeccode;
        if (geeValidate) params.gee_validate = geeValidate;
        if (recaptchaToken) params.recaptcha_token = recaptchaToken;
        appSign(params);
        const { json } = await postAppForm(
          'https://passport.bilibili.com/x/passport-login/sms/send',
          params,
          buvid
        );
        const data = json.data || {};
        const recaptchaUrl = data.recaptcha_url || '';
        if (json.code === 0 && !recaptchaUrl) {
          smsLoginSessions.set(tel, {
            buvid,
            deviceId,
            captchaKey: data.captcha_key || '',
            expires: now + 10 * 60 * 1000,
          });
          return sendJson(res, 200, { code: 0, message: '验证码已发送' });
        }
        if (json.code === 0 || json.code === -105) {
          let gee = parseGeeParams(recaptchaUrl);
          if (!gee.gt || !gee.challenge || !gee.token) {
            const pre = await getAppPreCaptcha(buvid);
            if (pre) {
              gee = {
                gt: pre.gee_gt || '',
                challenge: pre.gee_challenge || '',
                token: pre.recaptcha_token || '',
              };
            }
          }
          smsLoginSessions.set(tel, {
            buvid,
            deviceId,
            captchaKey: '',
            expires: now + 10 * 60 * 1000,
          });
          if (gee.gt && gee.challenge && gee.token) {
            return sendJson(res, 200, {
              code: -105,
              message: '需要完成滑动验证',
              recaptchaUrl,
              geeGt: gee.gt,
              geeChallenge: gee.challenge,
              recaptchaToken: gee.token,
            });
          }
          return sendJson(res, 200, {
            code: -105,
            message: '需要人机验证，但未取到验证参数',
            recaptchaUrl,
          });
        }
        return sendJson(res, 200, {
          code: json.code,
          message: json.message || '发送失败',
          recaptchaUrl,
        });
      } catch (error) {
        return sendJson(res, 502, { code: -1, message: error.message });
      }
    }

    if (pathname === '/api/login/sms/login') {
      try {
        const form = new URLSearchParams(await readBody(req));
        const tel = (form.get('tel') || '').trim();
        const code = (form.get('code') || '').trim();
        if (!/^1[3-9]\d{9}$/.test(tel)) {
          return sendJson(res, 400, { code: -1, message: '请输入正确的手机号' });
        }
        if (!/^\d{4,8}$/.test(code)) {
          return sendJson(res, 400, { code: -1, message: '请输入短信验证码' });
        }
        const session = smsLoginSessions.get(tel);
        if (!session || session.expires <= Date.now()) {
          return sendJson(res, 400, { code: -1, message: '验证码已失效，请重新获取' });
        }
        await ensureBiliCookies();
        const buvid = cookieJarGet('buvid3') || session.buvid;
        let dt = '';
        try {
          dt = rsaEncrypt(await getWebLoginKey(), randomString(16));
        } catch (error) {}
        const params = {
          bili_local_id: session.deviceId,
          build: '2001100',
          buvid,
          c_locale: 'zh_CN',
          captcha_key: session.captchaKey || '',
          channel: 'master',
          cid: '86',
          code,
          device: 'phone',
          device_id: session.deviceId,
          device_name: 'vivo',
          device_platform: 'Android14vivo',
          disable_rcmd: '0',
          from_pv: 'main.my-information.my-login.0.click',
          from_url: 'bilibili://user_center/mine',
          local_id: buvid,
          mobi_app: 'android_hd',
          platform: 'android',
          s_locale: 'zh_CN',
          statistics: APP_STATISTICS,
          tel,
        };
        if (dt) params.dt = dt;
        appSign(params);
        const { json, response } = await postAppForm(
          'https://passport.bilibili.com/x/passport-login/login/sms',
          params,
          buvid
        );
        if (json.code !== 0) {
          return sendJson(res, 200, { code: json.code, message: json.message || '登录失败' });
        }
        const data = json.data || {};
        const cookieHeader = mergeCookies(
          cookieJarString(),
          setCookiesFromResponse(response),
          data.cookie_info
        );
        if (!cookieHeader) {
          return sendJson(res, 502, { code: -1, message: '登录成功但未取得 Cookie' });
        }
        let uname = '';
        let face = '';
        let mid = String(data.mid || '');
        try {
          const navResponse = await fetch('https://api.bilibili.com/x/web-interface/nav', {
            headers: Object.assign({}, LOGIN_HEADERS, { Cookie: cookieHeader }),
          });
          const navJson = await navResponse.json();
          if (navJson.code === 0 && navJson.data) {
            uname = navJson.data.uname || '';
            face = navJson.data.face || '';
            mid = String(navJson.data.mid || mid);
          }
        } catch (error) {}
        let csrf = '';
        for (const part of cookieHeader.split(';')) {
          const index = part.indexOf('=');
          if (index > 0 && part.slice(0, index).trim() === 'bili_jct') {
            csrf = part.slice(index + 1).trim();
          }
        }
        const sid = crypto.randomBytes(16).toString('hex');
        loginUserSessions.set(sid, {
          cookies: cookieHeader,
          csrf,
          mid,
          uname,
          face,
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
        saveLoginSessions();
        smsLoginSessions.delete(tel);
        return sendJson(
          res,
          200,
          { code: 0, login: true, uname, face, mid },
          { 'Set-Cookie': 'BCSESS=' + sid + '; Path=/; HttpOnly; SameSite=Lax' }
        );
      } catch (error) {
        return sendJson(res, 502, { code: -1, message: error.message });
      }
    }

    if (pathname === '/api/login/qr') {
      try {
        const response = await fetch(
          'https://passport.bilibili.com/x/passport-login/web/qrcode/generate?source=main-fe-header&go_url=https:%2F%2Fwww.bilibili.com%2F',
          { headers: LOGIN_HEADERS }
        );
        const json = await response.json();
        if (json.code !== 0 || !json.data || !json.data.qrcode_key) {
          return sendJson(res, 502, { code: -1, message: '获取二维码失败' });
        }
        const key = json.data.qrcode_key;
        loginQrSessions.set(key, { expires: Date.now() + 3 * 60 * 1000 });
        for (const [oldKey, session] of loginQrSessions) {
          if (session.expires < Date.now()) loginQrSessions.delete(oldKey);
        }
        const qr = await QRCode.toDataURL(json.data.url, {
          margin: 1,
          width: 220,
          errorCorrectionLevel: 'M',
        });
        return sendJson(res, 200, { code: 0, key, qr });
      } catch (error) {
        return sendJson(res, 502, { code: -1, message: error.message });
      }
    }

    if (pathname === '/api/login/poll') {
      const key = new URLSearchParams(search).get('key') || '';
      if (!key || !loginQrSessions.has(key)) {
        return sendJson(res, 400, { code: -1, message: '二维码已失效' });
      }
      try {
        const response = await fetch(
          'https://passport.bilibili.com/x/passport-login/web/qrcode/poll?source=main-fe-header&qrcode_key=' +
            encodeURIComponent(key),
          { headers: LOGIN_HEADERS }
        );
        const json = await response.json();
        if (json.code !== 0 || !json.data) {
          return sendJson(res, 502, { code: -1, message: '轮询失败' });
        }
        const data = json.data;
        const scanCode = Number(data.code);
        if (scanCode === 0) {
          const setCookies = setCookiesFromResponse(response);
          const cookieHeader = cookieHeaderFrom(setCookies);
          let uname = '';
          let face = '';
          let mid = String(data.mid || '');
          try {
            const navResponse = await fetch('https://api.bilibili.com/x/web-interface/nav', {
              headers: Object.assign({}, LOGIN_HEADERS, { Cookie: cookieHeader }),
            });
            const navJson = await navResponse.json();
            if (navJson.code === 0 && navJson.data) {
              uname = navJson.data.uname || '';
              face = navJson.data.face || '';
              mid = String(navJson.data.mid || mid);
            }
          } catch (e) {}
          const sid = crypto.randomBytes(16).toString('hex');
          loginUserSessions.set(sid, {
            cookies: cookieHeader,
            csrf: data.csrf || '',
            mid,
            uname,
            face,
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
          });
          saveLoginSessions();
          loginQrSessions.delete(key);
          return sendJson(
            res,
            200,
            { code: 0, login: true, uname, face, mid },
            { 'Set-Cookie': 'BCSESS=' + sid + '; Path=/; HttpOnly; SameSite=Lax' }
          );
        }
        return sendJson(res, 200, {
          code: 0,
          login: false,
          state: scanCode,
          message: data.message || '',
        });
      } catch (error) {
        return sendJson(res, 502, { code: -1, message: error.message });
      }
    }

    if (pathname === '/api/fav/folders') {
      const aid = String(new URLSearchParams(search).get('aid') || '').replace(/\D/g, '');
      const session = getLoginSession(req);
      if (!session) {
        return sendJson(res, 401, { login: false, message: '请先登录' });
      }
      if (!aid) {
        return sendJson(res, 400, { login: true, code: -400, message: 'aid无效' });
      }
      const mid = String(session.mid || '');
      const headers = Object.assign({}, BILI_HEADERS, {
        Referer: 'https://space.bilibili.com/' + mid,
        Origin: 'https://space.bilibili.com',
        Cookie: session.cookies || '',
      });
      try {
        const response = await fetch(
          'https://api.bilibili.com/x/v3/fav/folder/created/list-all?type=2&jsonp=jsonp&rid=' +
            encodeURIComponent(aid) +
            '&up_mid=' +
            encodeURIComponent(mid),
          { headers }
        );
        const json = await response.json();
        if (json.code !== 0) {
          return sendJson(res, 200, {
            login: true,
            code: json.code,
            message: json.message || '收藏夹读取失败',
            folders: [],
          });
        }
        const list = json.data && Array.isArray(json.data.list) ? json.data.list : [];
        const suffix = mid.slice(-2);
        const folders = list.map((folder) => {
          const fid = String(folder.fid || '');
          return {
            id: String(folder.id || (fid ? fid + suffix : '')),
            fid,
            title: String(folder.title || '未命名收藏夹'),
            count: Number(folder.media_count || 0),
            checked: Number(folder.fav_state || 0) === 1,
          };
        });
        return sendJson(res, 200, { login: true, code: 0, folders });
      } catch (error) {
        return sendJson(res, 502, {
          login: true,
          code: -1,
          message: error.message,
          folders: [],
        });
      }
    }

    if (pathname === '/api/fav/deal') {
      const session = getLoginSession(req);
      if (!session) {
        return sendJson(res, 401, { login: false, code: -101, message: '请先登录' });
      }
      const fields = Object.fromEntries(new URLSearchParams(await readBody(req)));
      const aid = String(fields.aid || '').replace(/\D/g, '');
      const addIds = String(fields.add || '')
        .split(',')
        .map((value) => value.replace(/\D/g, ''))
        .filter(Boolean);
      const delIds = String(fields.del || '')
        .split(',')
        .map((value) => value.replace(/\D/g, ''))
        .filter(Boolean);
      if (!aid) {
        return sendJson(res, 400, { code: -400, message: 'aid无效' });
      }
      if (!addIds.length && !delIds.length) {
        return sendJson(res, 200, { code: 0, message: 'OK' });
      }
      const csrf = session.csrf || cookieValue(session.cookies, 'bili_jct');
      if (!csrf) {
        return sendJson(res, 200, { code: -101, message: '登录凭证已失效，请重新登录' });
      }
      const headers = Object.assign({}, BILI_HEADERS, {
        Referer: 'https://www.bilibili.com/video/av' + aid + '/',
        Origin: 'https://www.bilibili.com',
        Cookie: session.cookies || '',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      });
      const form = new URLSearchParams();
      form.set('rid', aid);
      form.set('type', '2');
      form.set('add_media_ids', addIds.join(','));
      form.set('del_media_ids', delIds.join(','));
      form.set('csrf', csrf);
      try {
        const response = await fetch('https://api.bilibili.com/x/v3/fav/resource/deal', {
          method: 'POST',
          headers,
          body: form.toString(),
        });
        const json = await response.json();
        return sendJson(res, 200, {
          code: json.code,
          message: json.message || (json.code === 0 ? 'OK' : '收藏操作失败'),
        });
      } catch (error) {
        return sendJson(res, 502, { code: -1, message: error.message });
      }
    }

    if (pathname === '/api/history/report') {
      const session = getLoginSession(req) || getLatestLoginSession();
      if (!session) {
        return sendJson(res, 200, { code: 0, reported: false });
      }
      let fields = {};
      try {
        const raw = await readBody(req);
        const contentType = String(req.headers['content-type'] || '');
        fields =
          contentType.indexOf('json') >= 0
            ? JSON.parse(raw) || {}
            : Object.fromEntries(new URLSearchParams(raw));
      } catch (error) {}
      const aid = String(fields.aid || '').replace(/\D/g, '');
      const cid = String(fields.cid || '').replace(/\D/g, '');
      const progress = Number(fields.progress || 0);
      if (!aid || !cid || !isFinite(progress)) {
        return sendJson(res, 200, { code: 0, reported: false });
      }
      const result = await reportVideoHistory(aid, cid, progress, session);
      return sendJson(res, 200, {
        code: result.code,
        reported: result.code === 0,
        message: result.message || '',
      });
    }

    if (pathname === '/api/login/status') {
      const sid = getCookie(req, 'BCSESS');
      const session = sid ? loginUserSessions.get(sid) : null;
      if (session && session.expires > Date.now()) {
        return sendJson(res, 200, {
          login: true,
          uname: session.uname,
          face: session.face,
          mid: session.mid,
        });
      }
      if (sid) loginUserSessions.delete(sid);
      saveLoginSessions();
      return sendJson(res, 200, { login: false });
    }

    if (pathname === '/api/logout') {
      const sid = getCookie(req, 'BCSESS');
      if (sid) loginUserSessions.delete(sid);
      saveLoginSessions();
      res.writeHead(302, {
        Location: '/',
        'Set-Cookie': 'BCSESS=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
      });
      return res.end();
    }

    if (pathname === '/api/danmaku/send') {
      try {
        const fields = Object.fromEntries(new URLSearchParams(await readBody(req)));
        const result = await postDanmaku(fields, getLoginSession(req));
        return sendJson(res, 200, result);
      } catch (error) {
        return sendJson(res, 502, { code: -1, message: error.message });
      }
    }

    if (pathname === '/player' || pathname === '/demo/' || pathname === '/demo/index.html') {
      return serveFile(path.join(DEMO, 'index.html'), req, res);
    }

    if (pathname === '/search') {
      const keyword = (new URLSearchParams(search).get('keyword') || '').trim();
      const bv = keyword.match(/^BV[0-9A-Za-z]+$/i);
      if (bv) {
        res.writeHead(302, { Location: '/bv/' + bv[0] });
        return res.end();
      }
      const av = keyword.match(/^av(\d+)$/i);
      if (av) {
        res.writeHead(302, { Location: '/av' + av[1] });
        return res.end();
      }
      const params = new URLSearchParams(search);
      const pageParam = parseInt(params.get('page') || '1', 10);
      const page = isFinite(pageParam) ? Math.max(1, pageParam) : 1;
      const allowedOrders = ['totalrank', 'click', 'pubdate', 'dm', 'stow'];
      const requestedOrder = params.get('order') || 'totalrank';
      const order = allowedOrders.includes(requestedOrder)
        ? requestedOrder
        : 'totalrank';
      try {
        const html = await renderSearchPage(req, keyword, page, order);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('搜索失败: ' + error.message);
      }
    }

    if (pathname === '/html/cele.html') {
      return serveFile(path.join(DEMO, 'bili2012', 'html', 'cele.html'), req, res);
    }

    if (pathname === '/html/userdel_list.html') {
      return serveFile(path.join(DEMO, 'bili2012', 'html', 'userdel_list.html'), req, res);
    }

    if (pathname === '/html/android.html') {
      return serveFile(path.join(DEMO, 'bili2012', 'html', 'android.html'), req, res);
    }

    if (pathname === '/html/ios.html') {
      return serveFile(path.join(DEMO, 'bili2012', 'html', 'ios.html'), req, res);
    }

    if (pathname.startsWith('/html/assets/')) {
      return serveFile(path.join(DEMO, 'bili2012', 'html', pathname.slice('/html/'.length)), req, res);
    }

    if (pathname.startsWith('/2012/assets/')) {
      return serveFile(path.join(DEMO, 'bili2012', pathname.slice('/2012/'.length)), req, res);
    }

    if (pathname.startsWith('/index/')) {
      return serveFile(path.join(DEMO, 'bili2012', pathname.slice(1)), req, res);
    }

    if (pathname === '/html/js/hot_tag.json') {
      return serveFile(path.join(DEMO, 'bili2012', 'html', 'js', 'hot_tag.json'), req, res);
    }

    if (pathname === '/html/ads-index.js') {
      return serveFile(path.join(DEMO, 'bili2012', 'html', 'ads-index.js'), req, res);
    }

    if (pathname === '/favicon.ico') {
      return serveFile(path.join(DEMO, 'favicon.ico'), req, res);
    }

    if (pathname === '/demo/patched/play.2012.swf') {
      return serveFile(
        path.join(DEMO, 'patched', 'play.2012.relative.swf'),
        req,
        res
      );
    }

    if (pathname === '/history' || pathname === '/history/') {
      const params = new URLSearchParams(search);
      const cursor = {
        max: String(params.get('max') || '0').replace(/\D/g, '') || '0',
        viewAt: String(params.get('view_at') || '0').replace(/\D/g, '') || '0',
        business: String(params.get('business') || '').slice(0, 32),
      };
      try {
        const html = await renderHistoryPage(req, cursor);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('获取播放历史失败: ' + error.message);
      }
    }

    if (pathname === '/favlist' || pathname === '/favlist/') {
      const params = new URLSearchParams(search);
      const fid = params.get('fid') || '0';
      const pageParam = parseInt(params.get('page') || '1', 10);
      const page = isFinite(pageParam) ? Math.max(1, pageParam) : 1;
      try {
        const html = await renderFavPage(req, fid, page);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('获取收藏夹失败: ' + error.message);
      }
    }

    if (pathname === '/space' || pathname === '/space/') {
      res.writeHead(302, { Location: '/space/2' });
      return res.end();
    }

    if (pathname.startsWith('/space/assets/')) {
      return serveFile(path.join(DEMO, 'space', pathname.slice('/space/'.length)), req, res);
    }

    const spaceInfoMatch = pathname.match(/^\/space\/(\d+)\/info(?:\.html)?\/?$/);
    if (spaceInfoMatch) {
      try {
        const html = await renderSpaceInfo(spaceInfoMatch[1], req);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('获取个人资料失败: ' + error.message);
      }
    }

    const spaceMatch = pathname.match(/^\/space\/(\d+)\/?$/);
    if (spaceMatch) {
      const mid = spaceMatch[1];
      const pageParam = parseInt(new URLSearchParams(search).get('page') || '1', 10);
      const page = isFinite(pageParam) ? Math.max(1, pageParam) : 1;
      try {
        const refresh = new URLSearchParams(search).get('refresh') === '1';
        const html = await renderSpacePage(mid, page, req, refresh);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('获取空间信息失败: ' + error.message);
      }
    }

    const bvMatch = pathname.match(/^\/bv\/(BV[0-9A-Za-z]+)\/?$/i);
    if (bvMatch) {
      try {
        const cookies = getRequestCookies(req);
        const response = await fetch(
          'https://api.bilibili.com/x/web-interface/view?bvid=' + encodeURIComponent(bvMatch[1]),
          { headers: Object.assign({}, BILI_HEADERS, cookies ? { Cookie: cookies } : {}) }
        );
        const json = await response.json();
        if (json.code === 0 && json.data && json.data.aid) {
          res.writeHead(302, { Location: '/av' + json.data.aid });
          return res.end();
        }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('找不到这个 BV 号');
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('获取 BV 信息失败: ' + error.message);
      }
    }

    const bangumiMatch = pathname.match(/^\/bangumi\/ep(\d+)\/?$/i);
    if (bangumiMatch) {
      try {
        const epId = bangumiMatch[1];
        const info = await getBangumiInfo(epId, getRequestCookies(req));
        const pages = info.view.pages || [];
        let pageIndex = pages.findIndex((item) => String(item.epId) === String(epId));
        if (pageIndex < 0) pageIndex = 0;
        const page = pages[pageIndex] || {};
        const cid = String(page.cid || info.view.cid);
        const aid = String(page.aid || info.view.aid);
        const html = renderPage(aid, cid, info, pageIndex + 1);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('获取番剧信息失败: ' + error.message);
      }
    }

    const avMatch = pathname.match(/^\/(?:video\/)?av(\d+)\/?$/i);
    if (avMatch) {
      const aid = avMatch[1];
      const knownEp = bangumiAidMap.get(aid);
      if (knownEp) {
        res.writeHead(302, { Location: '/bangumi/ep' + knownEp });
        return res.end();
      }
      const pageNo = Math.max(1, parseInt(new URLSearchParams(search).get('p') || '1', 10));
      try {
        const info = await getVideoInfo(aid, getRequestCookies(req));
        if (info.bangumi) {
          res.writeHead(302, { Location: '/bangumi/ep' + info.epId });
          return res.end();
        }
        const pages = info.view.pages || [];
        const page = pages[pageNo - 1] || pages[0] || {};
        const cid = String(page.cid || info.view.cid);
        const html = renderPage(aid, cid, info, pageNo);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('获取视频信息失败: ' + error.message);
      }
    }

    if (pathname.startsWith('/video-page/assets/')) {
      return serveFile(path.join(DEMO, pathname.slice(1)), req, res);
    }

    if (pathname.startsWith('/dm,')) {
      let cid = pathname.slice('/dm,'.length);
      cid = wrappedCidMap.get(cid) || cid;
      if (cid === '1169623044') cid = '39824328708';
      const target = 'https://comment.bilibili.com/' + cid + '.xml';
      return await pipeFetch(target, req, res);
    }

    const videoMatch = pathname.match(/^\/media\/video\/(\d+)\/(\d+)\.mp4$/);
    if (videoMatch) {
      const target = await getVideoUrl(videoMatch[1], videoMatch[2], getRequestCookies(req));
      return await pipeFetch(target, req, res);
    }

    if (pathname === '/media/video.mp4') {
      const target = await getVideoUrl(AID, CID, getRequestCookies(req));
      return await pipeFetch(target, req, res);
    }

    if (pathname === '/iface00/player') {
      const xml = accessConfigXml();
      res.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8', 'Content-Length': Buffer.byteLength(xml) });
      return res.end(xml);
    }

    if (pathname === '/if0000/rec') {
      let fields = Object.fromEntries(new URLSearchParams(search));
      if (req.method === 'POST') {
        try {
          const raw = await readBody(req);
          const contentType = String(req.headers['content-type'] || '');
          const bodyFields =
            contentType.indexOf('json') >= 0
              ? JSON.parse(raw) || {}
              : Object.fromEntries(new URLSearchParams(raw));
          Object.assign(fields, bodyFields);
        } catch (error) {}
      }

      let cid = String(fields.cid || fields.oid || '').replace(/^cid:/i, '');
      cid = wrappedCidMap.get(cid) || cid;
      const cidInfo = cidInfoMap.get(cid);
      const aid = cidInfo && cidInfo.aid ? String(cidInfo.aid) : '';
      const playMs = Number(fields.playtime || fields.progress || 0);
      const progress = Math.max(0, Math.floor(playMs / 1000));

      if (!aid || !cid || !isFinite(progress)) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('0');
      }

      const session = getLoginSession(req) || getLatestLoginSession();
      const csrf = session
        ? session.csrf || cookieValue(session.cookies, 'bili_jct')
        : '';
      if (!session || !csrf) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('0');
      }

      try {
        const form = new URLSearchParams();
        form.set('aid', aid);
        form.set('cid', cid);
        form.set('progress', String(progress));
        form.set('csrf', csrf);
        await fetch('https://api.bilibili.com/x/v2/history/report', {
          method: 'POST',
          headers: Object.assign({}, BILI_HEADERS, {
            Referer: 'https://www.bilibili.com/video/av' + aid + '/',
            Origin: 'https://www.bilibili.com',
            Cookie: session.cookies || '',
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          }),
          body: form.toString(),
        });
      } catch (error) {}

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('0');
    }

    if (pathname === '/if0000/player' || pathname === '/mb0/player') {
      const params = new URLSearchParams(search);
      let id = params.get('id') || CID;
      if (id.startsWith('cid:')) id = id.slice(4);
      const mapped = cidInfoMap.get(String(id));
      const cid = mapped ? String(id) : CID;
      const aid = mapped ? mapped.aid : AID;
      cidInfoMap.set(String(cid), { aid: String(aid) });
      wrappedCidMap.set(wrapInt32(cid), String(cid));
      let stat = {};
      try {
        const info = await getVideoInfo(aid, getRequestCookies(req));
        stat = info.view.stat || {};
      } catch (e) {}
      const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
        .split(',')[0]
        .trim();
      const forwardedHost = String(
        req.headers['x-forwarded-host'] || req.headers.host || ''
      )
        .split(',')[0]
        .trim();
      const requestHost = forwardedHost || PUBLIC_HOST + ':' + PORT;
      const requestOrigin =
        (forwardedProto || (req.socket.encrypted ? 'https' : 'http')) +
        '://' +
        requestHost;
      const socketHost = String(requestHost).split(':')[0] || PUBLIC_HOST;
      let session = getLoginSession(req);
      if (!session) session = getLatestLoginSession();
      const money = await getSessionCoins(session);
      const xml = accessConfigXml2012(
        cid,
        aid,
        stat,
        socketHost,
        session,
        money,
        requestOrigin
      );
      res.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8', 'Content-Length': Buffer.byteLength(xml) });
      return res.end(xml);
    }

    if (pathname === '/iface00/v2/playurl' || pathname === '/iface00/v2/playurl/') {
      const xml = playurlXml();
      res.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8', 'Content-Length': Buffer.byteLength(xml) });
      return res.end(xml);
    }

    if (pathname.startsWith('/dm000/')) {
      const cid = pathname.slice('/dm000/'.length).replace(/\.xml$/, '');
      const buffer = await getDanmakuXml(cid, req);
      return sendDanmaku(res, buffer);
    }

    const dmPostMatch = pathname.match(
      /^\/(dm00|if0000|iface00)\/dmpost(?:\/([a-f0-9]{16,64}))?$/
    );
    if (dmPostMatch || pathname === '/dmpost') {
      const contentType = String(req.headers['content-type'] || '');
      const raw = await readBody(req);
      console.error(
        '[dmpost]',
        pathname,
        search,
        contentType,
        'session=' + (getLoginSession(req) ? 'yes' : 'no'),
        raw.slice(0, 1000)
      );
      if (contentType.indexOf('amf') >= 0) {
        return sendLegacyDm(res, -1);
      }
      const fields = Object.fromEntries(new URLSearchParams(search));
      try {
        const bodyFields =
          contentType.indexOf('json') >= 0
            ? JSON.parse(raw) || {}
            : Object.fromEntries(new URLSearchParams(raw));
        Object.assign(fields, bodyFields);
      } catch (error) {}
      return await handleDmPost(req, res, fields, dmPostMatch ? dmPostMatch[2] : '');
    }

    if (pathname === '/dm00/msg.xml') {
      const xml =
        '<?xml version="1.0" encoding="UTF-8"?>' +
          '<msg><item catalog="system" bgcolor="#FFFFFF" tooltip="2012冬新番介绍">' +
        '<u><font color="#FFFFFF">[2012冬]新番介绍</font></u>' +
        '</item></msg>';
        res.writeHead(200, {
          'Content-Type': 'text/xml; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        });
        return res.end(xml);
    }

    if (pathname.startsWith('/dm00/cloud/filter/')) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end('{}');
    }

    if (pathname.startsWith('/dm00/dm,')) {
      let cid = pathname.slice('/dm00/dm,'.length);
      cid = wrappedCidMap.get(cid) || cid;
      if (cid === '1169623044') cid = '39824328708';
      const buffer = await getDanmakuXml(cid, req);
      return sendDanmaku(res, buffer);
    }

    if (pathname.startsWith('/dm00/playtag,')) {
      let cid = pathname.slice('/dm00/playtag,'.length);
      cid = wrappedCidMap.get(cid) || cid;
      const cidInfo = cidInfoMap.get(cid);
      const aid = cidInfo && cidInfo.aid ? String(cidInfo.aid) : '';
      if (!aid) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end('[]');
      }
      try {
        const headers = Object.assign({}, BILI_HEADERS, {
          Referer: 'https://www.bilibili.com/',
          Origin: 'https://www.bilibili.com',
        });
        const cookies = getRequestCookies(req);
        if (cookies) headers.Cookie = cookies;
        const response = await fetch(
          'https://api.bilibili.com/x/web-interface/archive/related?aid=' +
            encodeURIComponent(aid),
          { headers }
        );
        const json = await response.json();
        const list = json.code === 0 && Array.isArray(json.data) ? json.data : [];
        const rows = list.map((video) => {
          const stat = video.stat || {};
          return [
            imageProxy(video.pic) || '/space/assets/noface.gif',
            video.aid,
            searchPlainText(video.title || '无标题'),
            Number(stat.view || 0),
            Number(stat.danmaku || 0),
            Number(stat.reply || 0),
            Number(stat.favorite || 0),
          ];
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(rows));
      } catch (error) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end('[]');
      }
    }

    if (pathname.startsWith('/dm00/')) {
      const rest = pathname.slice('/dm00/'.length);
      const id = rest.replace(/\.xml$/, '');
      const real = wrappedCidMap.get(id) || (cidInfoMap.has(id) ? id : null);
      let cid = real || id;
      if (cid === '1169623044') cid = '39824328708';
      const buffer = await getDanmakuXml(cid, req);
      return sendDanmaku(res, buffer);
    }

    if (pathname.startsWith('/a/')) {
      const target = 'https://api.bilibili.com/' + pathname.slice('/a/'.length) + search;
      return await pipeFetch(target, req, res);
    }

    if (pathname.startsWith('/img/')) {
      const target = 'https://' + pathname.slice('/img/'.length) + search;
      return await pipeFetch(target, req, res);
    }

    if (pathname.startsWith('/s/playerLibrary/')) {
      const file = pathname.slice('/s/playerLibrary/'.length);
      return serveFile(path.join(ROOT, 'playerLibrary', file), req, res);
    }

    if (pathname.startsWith('/s/')) {
      const target = 'https://static.hdslb.com/' + pathname.slice('/s/'.length) + search;
      return await pipeFetch(target, req, res);
    }

    if (pathname.startsWith('/sa00000/playerLibrary/')) {
      const file = pathname.slice('/sa00000/playerLibrary/'.length);
      return serveFile(path.join(ROOT, 'playerLibrary', file), req, res);
    }

    const filePath = path.normalize(path.join(ROOT, pathname));
    if (!filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    return serveFile(filePath, req, res);
  } catch (error) {
    console.error('[error]', error);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Proxy error: ' + error.message);
  }
});

loadLoginSessions();
startDanmakuSocket();

  server.listen(PORT, () => {
    console.log('BiliClassic Web');
    console.log('Open ' + PUBLIC_ORIGIN + '/ in a browser');
  console.log('Video: https://www.bilibili.com/video/av' + AID + '/ (cid ' + CID + ')');
});
