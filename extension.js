// Global Preset v2 — Marinara Engine full-page extension
// 프리셋이 없거나 삭제된 채팅방에 글로벌 프리셋을 자동으로 넣어줍니다.
// 글로벌을 바꾸면 "글로벌을 따르는 방"만 같이 바뀌고, 직접 프리셋을 고른 방은 건드리지 않습니다.
// 사용하는 API: GET/PATCH /api/chats, GET /api/prompts (마리나라 앱이 쓰는 것과 같은 경로)

const ACTIVE_CHAT_KEY = "marinara-active-chat-id";
// UI가 shadow DOM 안에 있어서 스타일도 안에 직접 넣음 (extension.css는 비워둠)
const GP_CSS = `
.gp-root { font-family: inherit; font-size: 14px; line-height: 1.4; color: var(--foreground, #222); }
.gp-root *, .gp-root *::before, .gp-root *::after { box-sizing: border-box; }
.gp-root button, .gp-root select, .gp-root input { font-family: inherit; }
.gp-root {
  --gp-card: var(--card, #18181b);
  --gp-fg: var(--foreground, #f4f4f5);
  --gp-border: var(--border, rgba(127, 127, 127, 0.35));
  --gp-accent: var(--primary, #a855f7);
  --gp-accent-fg: var(--primary-foreground, #fff);
  --gp-muted: var(--muted-foreground, rgba(160, 160, 170, 0.9));
  --gp-soft: var(--secondary, rgba(127, 127, 127, 0.15));
  font-family: inherit;
}

.gp-fab {
  position: fixed;
  right: 16px;
  bottom: 88px;
  z-index: 2147482000;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--gp-border);
  background: var(--gp-card);
  color: var(--gp-fg);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  touch-action: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  opacity: 0.85;
}
.gp-fab:hover { opacity: 1; }
.gp-fab-warn { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.35); }

.gp-panel {
  position: fixed;
  right: 12px;
  bottom: 140px;
  z-index: 2147482001;
  width: min(340px, calc(100vw - 24px));
  /* 탭을 바꿔도 창 크기가 변하지 않게 높이 고정 (내용이 많으면 안에서 스크롤) */
  height: min(70vh, 560px);
  max-height: calc(100vh - 160px);
  overflow: hidden;
  padding: 0;
  border-radius: 14px;
  border: 1px solid var(--gp-border);
  background: var(--gp-card);
  color: var(--gp-fg);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gp-panel[hidden] { display: none; }
/* 제목 줄 + 탭: 스크롤해도 항상 보이게 고정 */
.gp-panel-top {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 8px;
  border-bottom: 1px solid var(--gp-border);
  background: var(--gp-card);
}
/* 아래 내용만 스크롤 */
.gp-panel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 14px 14px;
}

.gp-panel-head { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 15px; }
.gp-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--gp-fg);
  opacity: 0.7;
  cursor: pointer;
  flex-shrink: 0;
}
.gp-x:hover { opacity: 1; background: var(--gp-soft); }
.gp-label { margin-top: 8px; font-size: 12px; font-weight: 700; color: var(--gp-muted); text-transform: uppercase; letter-spacing: 0.03em; }
.gp-room-name { font-weight: 600; }
.gp-muted { color: var(--gp-muted); font-size: 13px; margin: 0; }
.gp-warn-text { color: #ef4444; font-size: 13px; }

.gp-select {
  width: 100%;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid var(--gp-border);
  background: var(--gp-soft);
  color: var(--gp-fg);
  font: inherit;
}
.gp-select option { background: var(--gp-card); color: var(--gp-fg); }
.gp-select:disabled { opacity: 0.5; }

.gp-row { display: flex; flex-wrap: wrap; gap: 10px; }
.gp-check { display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 13px; margin: 4px 0; }

.gp-btn {
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--gp-border);
  background: var(--gp-soft);
  color: var(--gp-fg);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.gp-btn-primary { background: var(--gp-accent); color: var(--gp-accent-fg); border-color: transparent; }
.gp-btn-small { padding: 4px 8px; font-size: 12px; }
.gp-full { width: 100%; margin-top: 10px; }



.gp-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147482500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
}
.gp-modal {
  width: min(400px, 100%);
  padding: 18px;
  border-radius: 14px;
  border: 1px solid var(--gp-border);
  background: var(--gp-card);
  color: var(--gp-fg);
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}
.gp-modal p { margin: 0; line-height: 1.45; }
.gp-modal-title { font-weight: 700; font-size: 16px; }
.gp-modal-buttons { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 6px; }

.gp-toast-stack {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 2147482600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: min(440px, calc(100vw - 32px));
  pointer-events: none;
}
.gp-toast {
  pointer-events: auto;
  cursor: pointer;
  max-width: 100%;
  padding: 9px 16px;
  border-radius: 14px;
  background: var(--gp-card);
  color: var(--gp-fg);
  border: 1px solid var(--gp-border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  font-size: 13px;
  line-height: 1.45;
  text-align: center;
  overflow-wrap: anywhere;
  transition: opacity 0.4s;
}
.gp-toast-out { opacity: 0; }

/* 변경 내역 */
.gp-hist-info { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.gp-hist { border-radius: 10px; background: var(--gp-soft); }
.gp-hist > summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  cursor: pointer;
  list-style: none;
  font-size: 12px;
}
.gp-hist > summary::-webkit-details-marker { display: none; }
.gp-hist-time { flex: 0 0 auto; color: var(--gp-muted); font-variant-numeric: tabular-nums; }
.gp-hist-label { flex: 1 1 auto; min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
.gp-hist-count { flex: 0 0 auto; padding: 1px 7px; border-radius: 999px; background: var(--gp-card); color: var(--gp-muted); font-size: 11px; }
.gp-hist-rows { display: flex; flex-direction: column; gap: 4px; padding: 0 8px 8px; }
.gp-hist-row { display: flex; flex-direction: column; gap: 1px; padding: 5px 7px; border-radius: 8px; background: var(--gp-card); font-size: 12px; }
.gp-hist-room { font-weight: 600; overflow-wrap: anywhere; }
.gp-hist-change { color: var(--gp-muted); overflow-wrap: anywhere; }


.gp-tabs { display: flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--gp-soft); margin-top: 4px; }
.gp-tab {
  flex: 1 1 0;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--gp-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.gp-tab-on { background: var(--gp-card); color: var(--gp-fg); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15); }

.gp-room-list { display: flex; flex-direction: column; gap: 6px; }
.gp-room { display: flex; flex-direction: column; gap: 5px; padding: 8px; border-radius: 10px; background: var(--gp-soft); }
.gp-room-current { box-shadow: inset 0 0 0 1px var(--gp-accent); }
.gp-room-head { display: flex; align-items: center; gap: 6px; min-width: 0; }
.gp-room-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 13px; }
.gp-tag { flex: 0 0 auto; padding: 1px 6px; border-radius: 999px; font-size: 11px; background: var(--gp-card); color: var(--gp-muted); white-space: nowrap; }
.gp-tag-current { background: var(--gp-accent); color: var(--gp-accent-fg); }
.gp-room .gp-select { padding: 5px 8px; font-size: 12px; }
.gp-loading { padding: 12px 0; text-align: center; }

.gp-room-check, .gp-bulk-all input { width: 16px; height: 16px; flex: 0 0 16px; margin: 0; accent-color: var(--gp-accent); cursor: pointer; }
.gp-bulk {
  position: sticky;
  top: -8px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  margin: 0 -2px;
  border-radius: 10px;
  border: 1px solid var(--gp-border);
  background: var(--gp-card);
}
.gp-bulk-all { margin: 0; font-weight: 600; gap: 8px; }
.gp-bulk-count { font-size: 13px; }
.gp-bulk-row { display: flex; gap: 6px; }
.gp-bulk-row .gp-select { flex: 1 1 auto; min-width: 0; padding: 5px 8px; font-size: 12px; }
.gp-bulk-apply { flex: 0 0 auto; white-space: nowrap; padding: 5px 12px; }
.gp-btn:disabled, .gp-select:disabled { opacity: 0.45; cursor: default; }

.gp-modal { max-height: calc(100vh - 32px); overflow-y: auto; }
.gp-choice-list { display: flex; flex-direction: column; gap: 12px; }
.gp-choice { display: flex; flex-direction: column; gap: 5px; }
.gp-choice-q { font-weight: 600; font-size: 14px; }
.gp-choice-hint { font-size: 12px; }
.gp-choice-multi { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 8px; background: var(--gp-soft); }

.gp-head-actions { display: inline-flex; gap: 6px; align-items: center; }

.gp-group { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.gp-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px 4px;
  border-bottom: 1px solid var(--gp-border);
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
}
.gp-group-check { width: 16px; height: 16px; flex: 0 0 16px; margin: 0; accent-color: var(--gp-accent); cursor: pointer; }
.gp-group-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-group-count { flex: 0 0 auto; padding: 1px 7px; border-radius: 999px; background: var(--gp-soft); color: var(--gp-muted); font-size: 11px; }
.gp-group-none .gp-group-title { color: #e5484d; }
.gp-tag-global { background: var(--gp-soft); color: var(--gp-fg); }

.gp-icon-btn:hover { filter: brightness(0.92); }
.gp-icon-btn:focus-visible { outline: 2px solid var(--gp-accent); outline-offset: 1px; }

`;
const ADMIN_SECRET_KEY = "marinara_admin_secret";
const ACTIVE_CHECK_MS = 1000; // localStorage만 읽음 (서버 요청 없음)
const MODE_LABELS = { roleplay: "롤플레이", game: "게임", conversation: "대화" };
const GLOBAL_OPTION = "__gp_global__";
const NONE_OPTION = "__gp_none__"; // 글로벌 프리셋 "없음"

// ───────── 상태 ─────────
const saved = await marinara.storage.get();
const state = {
  globalPresetId: typeof saved.globalPresetId === "string" ? saved.globalPresetId : null,
  globalPresetName: typeof saved.globalPresetName === "string" ? saved.globalPresetName : "",
  globalRooms: Array.isArray(saved.globalRooms) ? saved.globalRooms.filter((x) => typeof x === "string") : [],
  // 사용자가 직접 "없음"으로 정한 방 → 글로벌을 자동으로 넣지 않음
  noneRooms: Array.isArray(saved.noneRooms) ? saved.noneRooms.filter((x) => typeof x === "string") : [],
  modes: Array.isArray(saved.modes) && saved.modes.length ? saved.modes : ["roleplay"],
  setupDone: saved.setupDone === true,
  btnPos: saved.btnPos && typeof saved.btnPos === "object" ? saved.btnPos : null,
  // 확장이 프리셋을 바꿨는데 아직 옵션(프리셋 변수)을 안 고른 방: { chatId: presetId }
  pendingChoices: saved.pendingChoices && typeof saved.pendingChoices === "object" ? saved.pendingChoices : {},
  // 프리셋 id → 이름. 프리셋이 삭제되면 서버에는 id만 남아서, 이름을 미리 기억해 둬야 같은 계열 새 버전을 찾을 수 있음
  knownPresets: saved.knownPresets && typeof saved.knownPresets === "object" ? saved.knownPresets : {},
  // 확장이 바꾼 프리셋 내역 (최근 300건)
  history: Array.isArray(saved.history) ? saved.history.filter((h) => h && typeof h === "object") : [],
  // 새로 만든 방: 설정(마법사/연결 프리셋)을 마칠 때까지 글로벌을 넣지 않고 기다렸다가 물어봄
  newRooms: Array.isArray(saved.newRooms) ? saved.newRooms.filter((x) => typeof x === "string") : [],
  handledNew: Array.isArray(saved.handledNew) ? saved.handledNew.filter((x) => typeof x === "string") : [],
  schema: 2,
};
// v1(고정 기능 버전)에서 넘어온 경우: 고정 안 된 방 중 글로벌을 쓰던 방을 "글로벌 따르는 방"으로 옮김
const needsV1Migration = saved.schema !== 2 && saved.setupDone === true && saved.pins && typeof saved.pins === "object";
const v1Pins = needsV1Migration ? saved.pins : {};
let globalRooms = new Set(state.globalRooms);
let noneRooms = new Set(state.noneRooms);

// 확장 저장소 쓰기는 모아서 한 번만 (연속으로 바꿀 때 서버에 쓰기가 쌓이지 않게)
let persistTimer = null;
const flushPersist = async () => {
  persistTimer = null;
  try {
    await marinara.storage.patch({
      globalPresetId: state.globalPresetId,
      globalPresetName: state.globalPresetName,
      globalRooms: [...globalRooms],
      noneRooms: [...noneRooms],
      modes: state.modes,
      setupDone: state.setupDone,
      btnPos: state.btnPos,
      pendingChoices: state.pendingChoices,
      knownPresets: state.knownPresets,
      history: state.history,
      newRooms: state.newRooms,
      handledNew: state.handledNew,
      schema: 2,
      pins: null,
    });
  } catch (error) {
    marinara.log.warn("설정 저장 실패", error);
  }
};
const persist = () => {
  if (persistTimer) marinara.clearTimeout(persistTimer);
  persistTimer = marinara.setTimeout(flushPersist, 500);
  return Promise.resolve();
};
const persistNow = async () => {
  if (persistTimer) marinara.clearTimeout(persistTimer);
  await flushPersist();
};

let presets = [];
let presetMap = new Map();
let chatCache = new Map();
let currentChatId = null;
let modalOpen = false;
let globalMissingDismissed = false;
let busy = false;
let activeTab = "global";
let prevTab = null;

// ───────── API ─────────
const sleepMs = (ms) => new Promise((resolve) => marinara.setTimeout(resolve, ms));

// 쓰기 요청(PATCH 등)은 한 번에 하나씩, 사이에 짧은 간격을 두고 보냄 → 서버/DB에 겹쳐서 몰리지 않음
const WRITE_GAP_MS = 150;
let writeChain = Promise.resolve();
function enqueueWrite(task) {
  const run = writeChain.then(task);
  writeChain = run.then(
    () => sleepMs(WRITE_GAP_MS),
    () => sleepMs(WRITE_GAP_MS),
  );
  return run;
}

async function requestOnce(path, options) {
  const headers = { "x-marinara-csrf": "1" };
  try {
    const secret = localStorage.getItem(ADMIN_SECRET_KEY)?.trim();
    if (secret) headers["X-Admin-Secret"] = secret;
  } catch {
    /* ignore */
  }
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await marinara.fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "same-origin",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const error = new Error(`${options.method ?? "GET"} ${path} → ${res.status}`);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

// 일시적인 실패(429/5xx/네트워크)는 한 번만 잠깐 뒤에 다시 시도
async function requestWithRetry(path, options) {
  try {
    return await requestOnce(path, options);
  } catch (error) {
    const status = error?.status;
    if (status !== undefined && status !== 429 && status < 500) throw error;
    await sleepMs(700);
    return requestOnce(path, options);
  }
}

function api(path, options = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  return method === "GET" ? requestWithRetry(path, options) : enqueueWrite(() => requestWithRetry(path, options));
}

async function refreshPresets() {
  const list = await api("/prompts");
  presets = Array.isArray(list) ? list.filter((p) => p && typeof p.id === "string") : [];
  presetMap = new Map(presets.map((p) => [p.id, p]));
  replacementCache.clear();
  let namesChanged = false;
  for (const p of presets) {
    const n = typeof p.name === "string" ? p.name : "";
    if (n && state.knownPresets[p.id] !== n) {
      state.knownPresets[p.id] = n;
      namesChanged = true;
    }
  }
  if (namesChanged) await persist();
  if (state.globalPresetId && presetMap.has(state.globalPresetId)) {
    const name = presetMap.get(state.globalPresetId).name ?? "";
    if (name !== state.globalPresetName) {
      state.globalPresetName = name;
      await persist();
    }
  }
}

// GET /api/chats는 마리나라가 채팅 전체를 읽는 무거운 요청이라 결과를 잠깐 재사용함
const CHATS_TTL_MS = 30_000;
let chatsFetchedAt = 0;
let chatsInflight = null;
async function refreshChats({ force = false } = {}) {
  if (!force && chatsFetchedAt && Date.now() - chatsFetchedAt < CHATS_TTL_MS) return [...chatCache.values()];
  if (chatsInflight) return chatsInflight;
  chatsInflight = (async () => {
    const list = await api("/chats");
    const chats = Array.isArray(list) ? list.filter((c) => c && typeof c.id === "string") : [];
    chatCache = new Map(chats.map((c) => [c.id, c]));
    chatsFetchedAt = Date.now();
    return chats;
  })().finally(() => {
    chatsInflight = null;
  });
  return chatsInflight;
}

const getChat = (id) => api(`/chats/${encodeURIComponent(id)}`);

const presetName = (id) => {
  if (!id) return "(없음)";
  return presetMap.get(id)?.name ?? "(삭제된 프리셋)";
};
const chatName = (chat) => (chat?.name && String(chat.name).trim()) || "(이름 없는 방)";
const isManagedMode = (chat) => !!chat && state.modes.includes(chat.mode);
// 글로벌 프리셋: 프리셋 id, 또는 null = "없음"(설정 완료 후)
const globalIsNone = () => state.setupDone && state.globalPresetId === null;
const globalExists = () => globalIsNone() || (!!state.globalPresetId && presetMap.has(state.globalPresetId));
const globalMissing = () => !!state.globalPresetId && presets.length > 0 && !presetMap.has(state.globalPresetId);
const globalLabel = () => (globalIsNone() ? "없음" : state.globalPresetName || "미지정");
const hasValidPreset = (chat) => !!chat.promptPresetId && presetMap.has(chat.promptPresetId);

// ───────── 마리나라 설정창과 맞추기 ─────────
// 지금 열린 방의 설정창이 떠 있으면, 사용자가 고른 것처럼 바꿔서 화면도 같이 갱신
function findPresetSelect() {
  return document.querySelector('[data-chat-settings-section="prompt-preset"] select.mari-preset-native-select');
}
function changeNativeSelect(value) {
  const select = findPresetSelect();
  const target = value ?? "";
  if (!select || ![...select.options].some((o) => o.value === target)) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  if (!setter) return false;
  setter.call(select, value ?? "");
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

// ───────── 마리나라 화면 새로고침 ─────────
// 확장이 서버에서 바꾼 내용을 마리나라 화면(데이터 캐시)이 모르면 설정창/첫 메시지에 옛날 값이 보임.
// 마리나라가 쓰는 React Query 캐시를 찾아서 바뀐 방만 다시 불러오게 함. 못 찾으면 조용히 건너뜀.
let queryClientRef;
function findQueryClient() {
  if (queryClientRef !== undefined) return queryClientRef;
  queryClientRef = null;
  try {
    const rootEl = document.getElementById("root");
    const key = rootEl && Object.keys(rootEl).find((k) => k.startsWith("__reactContainer$"));
    let fiber = key ? rootEl[key] : null;
    const stack = fiber ? [fiber] : [];
    let steps = 0;
    while (stack.length && steps < 200) {
      steps += 1;
      const f = stack.pop();
      const client = f?.memoizedProps?.client;
      if (client && typeof client.invalidateQueries === "function") {
        queryClientRef = client;
        break;
      }
      if (f?.sibling) stack.push(f.sibling);
      if (f?.child) stack.push(f.child);
    }
  } catch (error) {
    marinara.log.debug?.("QueryClient를 찾지 못했어요", error);
  }
  return queryClientRef;
}

const refreshQueue = new Set();
let refreshTimer = null;
function refreshMarinaraChat(chatId) {
  if (!chatId) return;
  refreshQueue.add(chatId);
  if (refreshTimer) return;
  refreshTimer = marinara.setTimeout(() => {
    refreshTimer = null;
    const ids = [...refreshQueue];
    refreshQueue.clear();
    const client = findQueryClient();
    if (!client) return;
    try {
      for (const id of ids) client.invalidateQueries({ queryKey: ["chats", "detail", id] });
      client.invalidateQueries({ queryKey: ["chats", "list"] });
    } catch (error) {
      marinara.log.debug?.("화면 새로고침 실패", error);
    }
  }, 300);
}

const HISTORY_MAX = 300;
let batchSeq = 0;
const newBatch = () => `${Date.now().toString(36)}-${(batchSeq++).toString(36)}`;
const nameAt = (id) => (id ? presetMap.get(id)?.name ?? state.knownPresets[id] ?? "(삭제된 프리셋)" : "(없음)");

function recordChange(chat, from, to, meta) {
  if (from === to) return;
  state.history.push({
    t: Date.now(),
    b: meta?.batch ?? newBatch(),
    r: meta?.reason ?? "panel",
    c: chat.id,
    n: chatName(chat).slice(0, 60),
    f: from,
    fn: nameAt(from).slice(0, 80),
    o: to,
    on: nameAt(to).slice(0, 80),
  });
  if (state.history.length > HISTORY_MAX) state.history.splice(0, state.history.length - HISTORY_MAX);
  persist();
}

async function setChatPreset(chat, presetId, meta = {}) {
  const fromId = chat.promptPresetId ?? null;
  if (chat.id === currentChatId && changeNativeSelect(presetId)) {
    // 마리나라가 직접 저장하고, 옵션 창도 마리나라가 띄움
    delete state.pendingChoices[chat.id];
  } else {
    await api(`/chats/${encodeURIComponent(chat.id)}`, { method: "PATCH", body: { promptPresetId: presetId } });
    // 옵션 창은 그 방에 들어갈 때 확장이 띄움
    if (presetId) state.pendingChoices[chat.id] = presetId;
    else delete state.pendingChoices[chat.id];
    refreshMarinaraChat(chat.id);
  }
  chat.promptPresetId = presetId;
  const cached = chatCache.get(chat.id);
  if (cached && cached !== chat) cached.promptPresetId = presetId;
  recordChange(chat, fromId, presetId ?? null, meta);
}

// ───────── 핵심 규칙 ─────────
// - 프리셋 없음/삭제됨 → 글로벌 넣고 "글로벌 따르는 방"으로 등록
// - 글로벌 따르는 방인데 사용자가 다른 프리셋으로 바꿨으면 → 등록 해제 (개별 프리셋 방)
// - 글로벌 따르는 방인데 글로벌과 다르면(글로벌 변경 후 등) → 글로벌로 맞춤
const remapNotes = new Map(); // "옛 이름 → 새 이름" → 바뀐 방 수
const remapMessage = () => {
  const parts = [...remapNotes].map(([note, n]) => `${note} (${n}개 방)`);
  remapNotes.clear();
  return parts.length ? `삭제된 프리셋을 같은 계열 새 버전으로 바꿨어요: ${parts.slice(0, 2).join(", ")}${parts.length > 2 ? " 외" : ""}` : "";
};

// ───────── 연결(Connection) 프리셋 ─────────
// 롤플레이에서는 연결에 지정된 프리셋이 방 프리셋보다 우선이라, 그런 방엔 글로벌을 넣지 않음
const connCache = new Map(); // connectionId → { presetId, at }
async function connectionPresetOf(chat) {
  if (!chat || chat.mode !== "roleplay" || !chat.connectionId) return null;
  const hit = connCache.get(chat.connectionId);
  if (hit && Date.now() - hit.at < 60_000) return hit.presetId;
  let presetId = null;
  try {
    const conn = await api(`/connections/${encodeURIComponent(chat.connectionId)}`);
    presetId = typeof conn?.promptPresetId === "string" && conn.promptPresetId ? conn.promptPresetId : null;
  } catch (error) {
    marinara.log.warn("연결 정보를 못 읽었어요", error);
  }
  connCache.set(chat.connectionId, { presetId, at: Date.now() });
  return presetId;
}

// ───────── 새로 만든 방 ─────────
const NEW_ROOM_WINDOW_MS = 15 * 60 * 1000;
const isPendingNew = (chatId) => state.newRooms.includes(chatId);
function isFreshRoom(chat) {
  if (!isManagedMode(chat)) return false;
  if (isPendingNew(chat.id)) return true;
  if (state.handledNew.includes(chat.id)) return false;
  const created = Date.parse(chat.createdAt ?? "");
  return Number.isFinite(created) && Date.now() - created < NEW_ROOM_WINDOW_MS;
}
function markNewHandled(chatId) {
  state.newRooms = state.newRooms.filter((id) => id !== chatId);
  if (!state.handledNew.includes(chatId)) state.handledNew.push(chatId);
  if (state.handledNew.length > 200) state.handledNew.splice(0, state.handledNew.length - 200);
  persist();
}

// 방에 지정했던 프리셋이 삭제됐으면 같은 이름 계열 새 버전으로 교체. 바꿨으면 true
async function tryRemap(chat, batch) {
  const p = chat.promptPresetId ?? null;
  if (!p || hasValidPreset(chat) || globalRooms.has(chat.id) || p === state.globalPresetId) return false;
  const repl = findReplacement(p);
  if (!repl) return false;
  await setChatPreset(chat, repl.id, { reason: "remap", batch });
  noneRooms.delete(chat.id);
  const note = `${state.knownPresets[p]} → ${repl.name}`;
  remapNotes.set(note, (remapNotes.get(note) ?? 0) + 1);
  return true;
}

async function reconcileChat(chat, batch) {
  if (!isManagedMode(chat)) return false;
  if (isPendingNew(chat.id)) return false; // 새 방은 설정을 마친 뒤 따로 물어봄
  const p = chat.promptPresetId ?? null;
  if (!hasValidPreset(chat)) {
    // 방에 직접 지정했던 프리셋이 삭제됨 → 같은 이름 계열 새 버전이 있으면 그걸로 (없으면 아래에서 글로벌)
    if (await tryRemap(chat, batch)) return "remap";
    if (noneRooms.has(chat.id)) return false; // 직접 "없음"으로 정한 방
    if (!globalExists()) return false;
    if (!globalRooms.has(chat.id) && (await connectionPresetOf(chat))) return false; // 연결 프리셋이 우선
    globalRooms.add(chat.id);
    if (p === state.globalPresetId) return false; // 글로벌 "없음"이고 이미 없음
    await setChatPreset(chat, state.globalPresetId, { reason: "fill", batch });
    return true;
  }
  // "없음"이던 방에 마리나라 설정창에서 프리셋을 넣었으면 → 일반 개별 프리셋 방으로
  noneRooms.delete(chat.id);
  if (globalRooms.has(chat.id) && p !== state.globalPresetId) {
    // 사용자가 마리나라 설정창에서 다른 프리셋을 고른 방 → 개별 프리셋 방으로
    globalRooms.delete(chat.id);
  }
  return false;
}

async function syncAll({ quiet = false } = {}) {
  if (busy) return 0;
  busy = true;
  let changed = 0;
  try {
    const chats = await refreshChats();
    for (const id of [...globalRooms]) if (!chatCache.has(id)) globalRooms.delete(id);
    for (const id of [...noneRooms]) if (!chatCache.has(id)) noneRooms.delete(id);
    state.newRooms = state.newRooms.filter((id) => {
      const c = chatCache.get(id);
      if (!c) return false;
      const t = Date.parse(c.createdAt ?? "");
      return !Number.isFinite(t) || Date.now() - t < 24 * 3600 * 1000; // 하루 넘게 안 정리된 새 방은 일반 방으로
    });
    // 삭제됐고 더는 어떤 방도 가리키지 않는 프리셋의 이름은 정리
    const referenced = new Set([...chatCache.values()].map((c) => c.promptPresetId).filter(Boolean));
    for (const id of Object.keys(state.knownPresets)) {
      if (!presetMap.has(id) && !referenced.has(id) && id !== state.globalPresetId) delete state.knownPresets[id];
    }
    for (const id of Object.keys(state.pendingChoices)) if (!chatCache.has(id)) delete state.pendingChoices[id];
    remapNotes.clear();
    const batch = newBatch();
    for (const chat of chats) {
      try {
        const result = await reconcileChat(chat, batch);
        if (result && result !== "remap") changed += 1;
      } catch (error) {
        marinara.log.warn("프리셋 변경 실패", chat.id, error);
      }
    }
    await persist();
  } finally {
    busy = false;
  }
  const remapMsg = remapMessage();
  if (remapMsg) toast(remapMsg);
  if (!quiet && changed > 0) toast(`프리셋이 없던 ${changed}개 방을 글로벌(${globalLabel()})로 맞췄어요`);
  renderPanel();
  return changed;
}

async function setGlobal(presetId) {
  presetId = presetId || null; // null = 없음
  const oldGlobal = state.globalPresetId;
  state.globalPresetId = presetId;
  state.globalPresetName = presetId ? presetMap.get(presetId)?.name ?? "" : "";
  globalMissingDismissed = false;
  await persist();
  if (busy) return;
  busy = true;
  let moved = 0;
  const batch = newBatch();
  try {
    const chats = await refreshChats({ force: true });
    remapNotes.clear();
    for (const chat of chats) {
      if (!isManagedMode(chat)) continue;
      if (isPendingNew(chat.id)) continue; // 새 방은 설정 후 따로 물어봄
      if (await tryRemap(chat, batch)) continue; // 삭제된 프리셋 → 같은 계열 새 버전이 우선
      if (!globalRooms.has(chat.id) && !hasValidPreset(chat) && (await connectionPresetOf(chat))) continue; // 연결 프리셋이 우선
      const following =
        globalRooms.has(chat.id) && (chat.promptPresetId === oldGlobal || !hasValidPreset(chat));
      if (following || (!hasValidPreset(chat) && !noneRooms.has(chat.id))) {
        if (chat.promptPresetId !== presetId) {
          await setChatPreset(chat, presetId, { reason: "global", batch });
          moved += 1;
        }
        globalRooms.add(chat.id);
      } else if (globalRooms.has(chat.id) && chat.promptPresetId !== presetId) {
        globalRooms.delete(chat.id);
      }
    }
    await persist();
  } finally {
    busy = false;
  }
  const remapMsg = remapMessage();
  if (remapMsg) toast(remapMsg);
  toast(moved ? `${moved}개 방을 글로벌(${globalLabel()})로 바꿨어요` : `글로벌 프리셋: ${globalLabel()}`);
  renderPanel();
  await askCurrentIfPending();
}

// ───────── 방 입장 감시 ─────────
async function checkActiveChat() {
  let activeId = null;
  try {
    activeId = localStorage.getItem(ACTIVE_CHAT_KEY) || null;
  } catch {
    /* ignore */
  }
  if (activeId === currentChatId) return;
  currentChatId = activeId;
  // 다른 방의 옵션 창이 떠 있으면 닫음 (그 방은 다음에 들어갈 때 다시 물어봄)
  if (choicesModal && choicesModal.chatId !== activeId) choicesModal.close();
  if (!activeId) return renderPanel();
  await refreshPresets();
  if (!modalOpen && globalMissing() && !globalMissingDismissed) {
    showGlobalMissingModal();
    return;
  }
  // 일괄 변경 요청이 아직 줄 서 있으면 끝날 때까지 기다렸다가 확인 (옵션 창 누락 방지)
  await writeChain;
  if (currentChatId !== activeId) return;
  const chat = await getChat(activeId);
  if (!chat || currentChatId !== activeId) return;
  chatCache.set(chat.id, chat);
  if (isFreshRoom(chat)) {
    // 새 방: 지금은 아무것도 안 넣고, 생성 마법사/설정창을 닫은 뒤 물어봄
    if (!isPendingNew(chat.id)) {
      state.newRooms.push(chat.id);
      persist();
    }
    newRoomWatch = { chatId: chat.id, started: Date.now(), sawWizard: false, sawSettings: false, goneSince: null };
    marinara.log.info("새 방 감지", chat.id);
    renderPanel();
    return;
  }
  const before = chat.promptPresetId ?? null;
  remapNotes.clear();
  const filled = await reconcileChat(chat, newBatch());
  if (filled === "remap") toast(remapMessage());
  else if (filled) toast(before ? "삭제된 프리셋 대신 글로벌 프리셋을 넣었어요" : "프리셋이 없어서 글로벌 프리셋을 넣었어요");
  await persist();
  renderPanel();
  await maybeAskChoices(chat);
}

// "설정이 끝났다"를 판단하는 규칙:
//  1) 생성 마법사(빠른 설정)가 닫힘 = Apply & Start / 건너뛰기를 누름 → 바로 (1초 확인 후)
//     마법사가 닫힌 뒤 자동으로 열리는 채팅 설정창은 기다리지 않음
//  2) 마법사 없이 채팅 설정창만 열린 경우 → 설정창이 닫히거나, 열어둔 채 6초 동안 조작이 없으면
//  3) 마법사/설정창이 아예 안 떴으면 8초 뒤
//  4) 📌 버튼을 누르면 바로
const WIZARD_SELECTOR = '[data-component^="ChatSetupWizard"]';
// 마리나라 자체 팝업(프리셋 옵션 창 등). 마법사에서 옵션 있는 프리셋을 고르면 마법사가 잠깐 사라지고 이 창이 뜸
const MARINARA_MODAL_SELECTOR = '[data-component="Modal"][aria-modal="true"]';
// 화면에 따로 고정해 둔 설정 창(ChatControlWindow)도 data-chat-settings-section을 달고 있고 설정창을 닫아도 남아 있음
// → data-docked-chat-control이 붙은 것은 제외해서 "열려 있는 설정창"만 찾음
const SETTINGS_SELECTOR = "[data-chat-settings-section]:not([data-docked-chat-control])";
const NEW_ROOM_FIRST_WAIT_MS = 8000; // 마법사/설정창이 뜰 때까지 기다리는 시간
const NEW_ROOM_SETTLE_MS = 1000; // 창이 닫힌 게 확실한지 잠깐 확인 (마법사 단계 넘김 애니메이션 대비)
const NEW_ROOM_IDLE_MS = 6000; // 마법사 없이 설정창만 열려 있을 때: 마지막 조작 후 이만큼 조용하면 끝난 것으로 봄
let newRoomWatch = null; // { chatId, started, sawWizard, sawSettings, goneSince }
let lastUserInput = 0;
for (const type of ["pointerdown", "keydown", "input", "change", "wheel"]) {
  const handler = () => {
    lastUserInput = Date.now();
  };
  document.addEventListener(type, handler, true);
  marinara.onCleanup(() => document.removeEventListener(type, handler, true));
}

async function checkNewRoomWatch() {
  const w = newRoomWatch;
  if (!w) return;
  if (w.chatId !== currentChatId) {
    newRoomWatch = null; // 다른 방으로 감 → 다시 들어오면 그때 물어봄
    return;
  }
  if (modalOpen) return;
  const now = Date.now();
  if (document.querySelector(WIZARD_SELECTOR)) {
    if (!w.sawWizard) marinara.log.info("새 방: 생성 마법사 열림");
    w.sawWizard = true; // 마법사가 열려 있는 동안은 항상 설정 중
    w.goneSince = null;
    return;
  }
  if (document.querySelector(MARINARA_MODAL_SELECTOR)) {
    w.goneSince = null; // 마리나라 팝업이 떠 있는 동안은 기다림 (그 위에 겹쳐 띄우지 않음)
    return;
  }
  if (!w.sawWizard) {
    // 마법사 없이 만든 방
    if (document.querySelector(SETTINGS_SELECTOR)) {
      w.sawSettings = true;
      if (now - Math.max(lastUserInput, w.started) < NEW_ROOM_IDLE_MS) {
        w.goneSince = null; // 설정창에서 아직 작업 중
        return;
      }
    } else if (!w.sawSettings && now - w.started < NEW_ROOM_FIRST_WAIT_MS) {
      return; // 마법사/설정창이 아직 안 떴을 수 있음
    }
  }
  if (w.goneSince === null) {
    w.goneSince = now;
    return;
  }
  if (now - w.goneSince < NEW_ROOM_SETTLE_MS) return;
  newRoomWatch = null;
  marinara.log.info("새 방 설정이 끝난 것으로 보고 물어봅니다", w.chatId);
  await askNewRoom(w.chatId);
}

async function askNewRoom(chatId) {
  await writeChain;
  const chat = await getChat(chatId);
  if (!chat || currentChatId !== chatId) return;
  chatCache.set(chat.id, chat);
  await refreshPresets();
  const connPreset = await connectionPresetOf(chat);
  if (connPreset) {
    markNewHandled(chat.id);
    toast(`연결 프리셋(${nameAt(connPreset)})을 쓰는 방이라 글로벌 프리셋은 넣지 않았어요`);
    renderPanel();
    return;
  }
  const current = hasValidPreset(chat) ? chat.promptPresetId : null;
  if (!globalExists() || current === state.globalPresetId || (globalIsNone() && !current)) {
    if (globalExists()) globalRooms.add(chat.id);
    markNewHandled(chat.id);
    if (!globalExists()) toast("글로벌 프리셋이 정해져 있지 않아서 새 방은 그대로 뒀어요");
    else if (current === state.globalPresetId) toast("이 방은 이미 글로벌 프리셋이라 그대로 뒀어요");
    else toast("글로벌이 (없음)이고 이 방도 프리셋이 없어서 그대로 뒀어요");
    renderPanel();
    return;
  }
  showModal({
    title: "새 방에 글로벌 프리셋을 적용할까요?",
    body: [
      el("p", { text: chatName(chat) }),
      el("p", { class: "gp-muted", text: `지금 프리셋: ${current ? presetName(current) : "(없음)"}` }),
      el("p", { class: "gp-muted", text: `글로벌 프리셋: ${globalLabel()}` }),
    ],
    buttons: [
      { label: "나중에" }, // 다음에 이 방에 들어오면 다시 물어봄
      {
        label: current ? "지금 프리셋 유지" : "프리셋 없이 두기",
        onClick: async () => {
          if (!current) noneRooms.add(chat.id);
          markNewHandled(chat.id);
          await persist();
          renderPanel();
        },
      },
      {
        label: "글로벌 적용",
        primary: true,
        onClick: async () => {
          markNewHandled(chat.id);
          await setChatPreset(chat, state.globalPresetId, { reason: "new", batch: newBatch() });
          globalRooms.add(chat.id);
          noneRooms.delete(chat.id);
          await persist();
          renderPanel();
          marinara.setTimeout(() => askCurrentIfPending().catch((e) => marinara.log.warn(e)), 400);
        },
      },
    ],
  });
}

// ───────── UI 공통 ─────────
// 확장 UI 전체를 닫힌(closed) shadow DOM 안에 둠.
// 다른 확장/테마 스크립트가 버튼을 수집해 숨기는 일이 있어서(data-addon-collected), 바깥에서 찾지 못하게 막음.
const host = document.createElement("div");
host.setAttribute("data-global-preset-host", "");
host.style.cssText = "position:static;display:block;width:0;height:0;font-family:inherit;";
document.body.appendChild(host);
marinara.onCleanup(() => host.remove());
let shadow = null;
try {
  shadow = host.attachShadow({ mode: "closed" });
} catch {
  shadow = null; // shadow DOM을 못 쓰면 예전처럼 페이지에 바로 붙임
}
const root = document.createElement("div");
root.className = "gp-root";
if (shadow) {
  const style = document.createElement("style");
  style.textContent = GP_CSS;
  shadow.append(style, root);
} else {
  host.appendChild(root);
}
const activeInUi = () => (shadow ? shadow.activeElement : document.activeElement);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, "");
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function presetSelect(selectedId, { globalOption = false, placeholder = null, noneOption = false, noneSelected = false } = {}) {
  const select = el("select", { class: "gp-select" });
  if (placeholder) select.appendChild(el("option", { value: "", text: placeholder }));
  if (globalOption) {
    select.appendChild(el("option", { value: GLOBAL_OPTION, text: `🌐 글로벌 프리셋 (${globalLabel()})` }));
  }
  if (noneOption) {
    const opt = el("option", { value: NONE_OPTION, text: "(없음) — 프리셋 사용 안 함" });
    if (noneSelected) opt.selected = true;
    select.appendChild(opt);
  }
  const sorted = [...presets].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  for (const p of sorted) {
    const opt = el("option", { value: p.id, text: p.name || p.id });
    if (p.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  }
  return select;
}

// 알림은 세로로 쌓이고, 글 길이에 따라 4.5~9초 보이다가 사라짐. 클릭하면 바로 닫힘.
let toastStack = null;
function toast(message) {
  if (!toastStack) {
    toastStack = el("div", { class: "gp-toast-stack" });
    root.appendChild(toastStack);
  }
  const node = el("div", { class: "gp-toast", role: "status", title: "클릭하면 닫혀요", text: message });
  node.addEventListener("click", () => node.remove());
  toastStack.appendChild(node);
  while (toastStack.children.length > 4) toastStack.firstElementChild.remove();
  const life = Math.min(9000, 4500 + String(message).length * 45);
  marinara.setTimeout(() => node.classList.add("gp-toast-out"), life);
  marinara.setTimeout(() => node.remove(), life + 400);
}

function showModal({ title, body = [], buttons = [], onClose = null }) {
  modalOpen = true;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.remove();
    modalOpen = false;
    onClose?.();
  };
  const footer = el(
    "div",
    { class: "gp-modal-buttons" },
    buttons.map((b) =>
      el("button", {
        class: `gp-btn ${b.primary ? "gp-btn-primary" : ""}`,
        text: b.label,
        onclick: async () => {
          try {
            const keepOpen = await b.onClick?.();
            if (keepOpen !== true) close();
          } catch (error) {
            marinara.log.error(error);
            toast("작업 중 오류가 났어요. 콘솔을 확인해 주세요");
          }
        },
      }),
    ),
  );
  const overlay = el("div", { class: "gp-overlay" }, [
    el("div", { class: "gp-modal", role: "dialog" }, [el("div", { class: "gp-modal-title", text: title }), ...body, footer]),
  ]);
  root.appendChild(overlay);
  return close;
}

// ───────── 같은 이름 계열 찾기 ─────────
// 이름에서 버전(v1006, 5.3, [1.1.5] …)을 빼고 남은 글자가 같으면 같은 계열로 봄.
//   "3인칭 FID · 내면체 v1006" → "3인칭 FID · 내면체 v1010" (O)   /   "… 서정체 v1010" (X, 다른 계열)
const VERSION_TOKEN = /(?<![\p{L}\p{N}.])(?:v\s?\d+(?:\.\d+)*|\d+(?:\.\d+)+)(?![\p{L}\p{N}])/giu;
const familyKey = (name) =>
  String(name ?? "")
    .toLowerCase()
    .replace(VERSION_TOKEN, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
const nameTokens = (name) =>
  String(name ?? "")
    .toLowerCase()
    .replace(VERSION_TOKEN, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
// 이름 안의 모든 버전 숫자를 순서대로 이어 붙여 비교 ("Gemini 3.1 책갈피 3.8" → [3,1,3,8])
function versionOf(name) {
  const m = String(name ?? "").match(VERSION_TOKEN);
  if (!m) return [];
  return m.flatMap((tok) =>
    tok
      .replace(/^v\s?/i, "")
      .split(".")
      .map((n) => Number(n) || 0),
  );
}
function compareVersions(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}
function pickNewest(pool) {
  return [...pool].sort(
    (a, b) =>
      compareVersions(versionOf(b.name), versionOf(a.name)) || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
  )[0];
}

// oldName과 같은 계열의 (남아 있는) 프리셋 중 가장 새 버전. 확실하지 않으면 null.
function matchReplacement(oldName) {
  const key = familyKey(oldName);
  if (!key) return null;
  const candidates = presets.filter((p) => p.name);
  // 1) 버전만 다른 경우
  let pool = candidates.filter((p) => familyKey(p.name) === key);
  if (pool.length) return pickNewest(pool);
  // 2) 이름 뒤에 단어가 붙거나 빠진 경우 (짧은 쪽이 충분히 길고 다른 쪽이 그걸로 시작)
  pool = candidates.filter((p) => {
    const k = familyKey(p.name);
    const [shortK, longK] = k.length < key.length ? [k, key] : [key, k];
    return shortK.length >= 8 && longK.startsWith(shortK);
  });
  // 3) 단어가 거의 겹치는 경우
  if (!pool.length) {
    const target = new Set(nameTokens(oldName));
    pool = candidates.filter((p) => {
      const t = new Set(nameTokens(p.name));
      const inter = [...t].filter((x) => target.has(x)).length;
      const union = new Set([...t, ...target]).size;
      return union > 0 && inter / union >= 0.8;
    });
  }
  // 서로 다른 계열이 섞여 있으면(애매하면) 고르지 않음
  if (new Set(pool.map((p) => familyKey(p.name))).size !== 1) return null;
  return pickNewest(pool);
}

const replacementCache = new Map(); // 삭제된 프리셋 id → 대체 프리셋 | null
function findReplacement(oldId) {
  if (replacementCache.has(oldId)) return replacementCache.get(oldId);
  const oldName = state.knownPresets[oldId];
  const found = oldName ? matchReplacement(oldName) : null;
  replacementCache.set(oldId, found);
  return found;
}

// 삭제 알림 창의 미리 선택값: 같은 계열 → 없으면 가장 최근에 만든 프리셋
function suggestReplacement(oldName) {
  return matchReplacement(oldName) || [...presets].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))[0] || null;
}

function modeCheckboxes() {
  return Object.entries(MODE_LABELS).map(([mode, label]) => {
    const box = el("input", { type: "checkbox", checked: state.modes.includes(mode) });
    box.dataset.mode = mode;
    return { box, node: el("label", { class: "gp-check" }, [box, ` ${label}`]) };
  });
}

// ───────── 모달 ─────────
function showGlobalMissingModal() {
  const guess = suggestReplacement(state.globalPresetName);
  const select = presetSelect(guess?.id ?? null, { noneOption: true });
  showModal({
    title: "글로벌 프리셋이 삭제됐어요",
    body: [
      el("p", {
        text: `${state.globalPresetName || "이전 프리셋"} 프리셋을 찾을 수 없어요. 새 글로벌 프리셋을 고르면 글로벌을 쓰던 방과 프리셋이 없는 방에 바로 적용돼요.`,
      }),
      select,
    ],
    buttons: [
      { label: "나중에", onClick: () => (globalMissingDismissed = true) },
      {
        label: "적용",
        primary: true,
        onClick: async () => {
          if (select.value) await setGlobal(select.value === NONE_OPTION ? null : select.value);
        },
      },
    ],
  });
}

async function showSetupModal() {
  const chats = await refreshChats();
  const counts = new Map();
  for (const c of chats) {
    if (c.mode === "roleplay" && hasValidPreset(c)) counts.set(c.promptPresetId, (counts.get(c.promptPresetId) ?? 0) + 1);
  }
  const mostUsed = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const fallback = presets.find((p) => p.isDefault)?.id ?? presets[0]?.id ?? null;
  const select = presetSelect(
    state.globalPresetId && presetMap.has(state.globalPresetId) ? state.globalPresetId : mostUsed ?? fallback,
    { noneOption: true },
  );
  const sameBox = el("input", { type: "checkbox", checked: true });
  const modes = modeCheckboxes();

  showModal({
    title: "Global Preset 시작하기",
    body: [
      el("p", { text: "프리셋이 없거나 삭제된 방에 넣을 글로벌 프리셋을 골라주세요." }),
      select,
      el("label", { class: "gp-check" }, [sameBox, " 이 프리셋을 이미 쓰고 있는 방도 글로벌을 따르게 하기"]),
      el("p", { class: "gp-muted", text: "체크하면 나중에 글로벌을 바꿀 때 이 방들도 같이 바뀌어요." }),
      el("p", { class: "gp-muted", text: "적용할 채팅 모드" }),
      el("div", { class: "gp-row" }, modes.map((m) => m.node)),
    ],
    buttons: [
      {
        label: "시작",
        primary: true,
        onClick: async () => {
          if (!select.value) {
            toast("프리셋을 먼저 골라주세요");
            return true;
          }
          const picked = modes.filter((m) => m.box.checked).map((m) => m.box.dataset.mode);
          state.modes = picked.length ? picked : ["roleplay"];
          const chosen = select.value === NONE_OPTION ? null : select.value;
          state.globalPresetId = chosen;
          state.globalPresetName = chosen ? presetMap.get(chosen)?.name ?? "" : "";
          if (sameBox.checked && chosen) {
            for (const c of chats) if (isManagedMode(c) && c.promptPresetId === chosen) globalRooms.add(c.id);
          }
          state.setupDone = true;
          await persist();
          await syncAll();
          toast("설정 완료! 📌 버튼에서 언제든 바꿀 수 있어요");
        },
      },
    ],
  });
}


// ───────── 프리셋 옵션(변수) 창 ─────────
// 마리나라의 옵션 창은 채팅 설정창이 열려 있을 때만 존재해서, 다른 방은 확장이 대신 띄움.
// 저장 위치는 마리나라와 같음: 채팅 metadata.presetChoices (+ 선택 시 프리셋 defaultChoices)
const parseJson = (v, fallback) => {
  if (v && typeof v === "object") return v;
  if (typeof v !== "string") return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};
const truthy = (v) => v === true || v === "true";

function readVariables(full) {
  return (Array.isArray(full?.choiceBlocks) ? full.choiceBlocks : []).map((cb) => {
    let options = parseJson(cb.options, []);
    if (!Array.isArray(options)) options = [];
    if ((cb.optionSort ?? cb.option_sort) === "alphabetical") {
      options = [...options].sort((a, b) => String(a.label).localeCompare(String(b.label)));
    }
    return {
      name: cb.variableName ?? cb.variable_name ?? "unknown",
      question: cb.question ?? "옵션을 골라주세요",
      options: options.filter((o) => o && typeof o.value === "string"),
      multi: truthy(cb.multiSelect ?? cb.multi_select),
      random: truthy(cb.randomPick ?? cb.random_pick),
    };
  });
}

function initialChoice(v, existing, defaults) {
  const valid = new Set(v.options.map((o) => o.value));
  const clean = (sel) => {
    const list = Array.isArray(sel) ? sel : typeof sel === "string" ? [sel] : [];
    return v.multi ? list.filter((x, i) => valid.has(x) && list.indexOf(x) === i) : list.find((x) => valid.has(x));
  };
  if (existing[v.name] !== undefined) {
    const c = clean(existing[v.name]);
    if (c !== undefined) return c;
  } else if (defaults[v.name] !== undefined && !(v.random && !v.multi)) {
    const c = clean(defaults[v.name]);
    if (c !== undefined) return c;
  }
  if (v.multi) return [];
  if (v.random && v.options.length) return v.options[Math.floor(Math.random() * v.options.length)].value;
  return v.options[0]?.value ?? "";
}

async function maybeAskChoices(chat) {
  const pending = state.pendingChoices[chat.id];
  if (!pending) return;
  if (chat.promptPresetId !== pending) {
    // 그 사이 다른 방법으로 프리셋이 바뀜 → 마리나라가 처리했을 것
    delete state.pendingChoices[chat.id];
    await persist();
    return;
  }
  if (modalOpen) return;
  const full = await api(`/prompts/${encodeURIComponent(pending)}/full`);
  const variables = readVariables(full).filter((v) => v.options.length > 0);
  if (!variables.length) {
    delete state.pendingChoices[chat.id];
    await persist();
    return;
  }
  if (currentChatId !== chat.id || modalOpen) return;
  showChoicesModal(chat, pending, full, variables);
}

let choicesModal = null; // { chatId, close }

function showChoicesModal(chat, presetId, full, variables) {
  const meta = parseJson(chat.metadata, {}) ?? {};
  const existing = parseJson(meta.presetChoices, {}) ?? {};
  const defaults = parseJson(full?.preset?.defaultChoices ?? full?.preset?.default_choices, {}) ?? {};
  const selections = {};
  const fields = variables.map((v) => {
    selections[v.name] = initialChoice(v, existing, defaults);
    let input;
    if (v.multi) {
      input = el(
        "div",
        { class: "gp-choice-multi" },
        v.options.map((o) => {
          const box = el("input", { type: "checkbox", checked: selections[v.name].includes(o.value) });
          box.addEventListener("change", () => {
            const set = new Set(selections[v.name]);
            box.checked ? set.add(o.value) : set.delete(o.value);
            selections[v.name] = v.options.map((x) => x.value).filter((x) => set.has(x));
          });
          return el("label", { class: "gp-check" }, [box, ` ${o.label ?? o.value}`]);
        }),
      );
    } else if (v.options.length === 1) {
      input = el("div", { class: "gp-muted", text: v.options[0].label ?? v.options[0].value });
    } else {
      input = el(
        "select",
        { class: "gp-select" },
        v.options.map((o) => {
          const opt = el("option", { value: o.value, text: o.label ?? o.value });
          if (o.value === selections[v.name]) opt.selected = true;
          return opt;
        }),
      );
      input.addEventListener("change", () => (selections[v.name] = input.value));
    }
    return el("div", { class: "gp-choice" }, [
      el("div", { class: "gp-choice-q", text: v.question }),
      v.multi ? el("div", { class: "gp-muted gp-choice-hint", text: "여러 개 선택 가능" }) : null,
      input,
    ]);
  });
  const defaultBox = el("input", { type: "checkbox" });

  const close = showModal({
    title: "프리셋 옵션 설정",
    onClose: () => {
      choicesModal = null;
      // 창이 닫힌 뒤 지금 보고 있는 방도 옵션이 필요하면 이어서 물어봄
      marinara.setTimeout(() => {
        if (!modalOpen) askCurrentIfPending().catch((error) => marinara.log.warn(error));
      }, 300);
    },
    body: [
      el("p", { class: "gp-muted", text: `${chatName(chat)} · ${presetName(presetId)}` }),
      el("div", { class: "gp-choice-list" }, fields),
      el("label", { class: "gp-check" }, [defaultBox, " 이 선택을 프리셋 기본값으로 저장"]),
    ],
    buttons: [
      { label: "나중에" },
      {
        label: "확인",
        primary: true,
        onClick: async () => {
          await api(`/chats/${encodeURIComponent(chat.id)}/metadata`, {
            method: "PATCH",
            body: { presetChoices: selections },
          });
          if (defaultBox.checked) {
            try {
              await api(`/prompts/${encodeURIComponent(presetId)}`, { method: "PATCH", body: { defaultChoices: selections } });
            } catch (error) {
              marinara.log.warn("기본값 저장 실패 (기본 내장 프리셋은 수정할 수 없어요)", error);
            }
          }
          delete state.pendingChoices[chat.id];
          await persist();
          refreshMarinaraChat(chat.id);
          toast("옵션을 저장했어요");
        },
      },
    ],
  });
  choicesModal = { chatId: chat.id, close };
}

// 지금 보고 있는 방이 방금 바뀌었으면 바로 옵션 창
async function askCurrentIfPending() {
  if (!currentChatId || !state.pendingChoices[currentChatId]) return;
  const chat = await getChat(currentChatId);
  if (chat) await maybeAskChoices(chat);
}

// ───────── 플로팅 버튼 + 패널 ─────────
// 📌 버튼은 일부러 shadow DOM 밖(페이지)에 둠 → 버튼 모으기 같은 다른 확장이 가져갈 수 있게.
// 패널/옵션 창/알림은 shadow DOM 안에 그대로.
const fab = el("button", { type: "button", class: "gp-fab", title: "Global Preset", "aria-label": "Global Preset", text: "📌" });
const panel = el("div", { class: "gp-panel", hidden: true });
document.body.appendChild(fab);
marinara.onCleanup(() => fab.remove());
root.append(panel);

function placeFab() {
  if (state.btnPos) {
    const x = Math.min(Math.max(4, state.btnPos.x), window.innerWidth - 48);
    const y = Math.min(Math.max(4, state.btnPos.y), window.innerHeight - 48);
    Object.assign(fab.style, { left: `${x}px`, top: `${y}px`, right: "auto", bottom: "auto" });
  }
}
placeFab();
const onResize = () => placeFab();
window.addEventListener("resize", onResize);
marinara.onCleanup(() => window.removeEventListener("resize", onResize));

let drag = null;
fab.addEventListener("pointerdown", (e) => {
  const rect = fab.getBoundingClientRect();
  drag = { sx: e.clientX, sy: e.clientY, ox: rect.left, oy: rect.top, moved: false };
  fab.setPointerCapture?.(e.pointerId);
});
fab.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.sx;
  const dy = e.clientY - drag.sy;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true;
  state.btnPos = { x: drag.ox + dx, y: drag.oy + dy };
  placeFab();
});
let lastPointerToggle = 0;
fab.addEventListener("pointerup", () => {
  if (!drag) return;
  const moved = drag.moved;
  drag = null;
  if (moved) return void persist();
  lastPointerToggle = Date.now();
  togglePanel();
});
// 다른 확장이 버튼을 가져가서 click()으로 누르는 경우도 열리게
fab.addEventListener("click", () => {
  if (Date.now() - lastPointerToggle < 600) return; // 방금 터치/마우스로 처리한 클릭
  togglePanel();
});

async function togglePanel() {
  panel.hidden = !panel.hidden;
  if (!panel.hidden && newRoomWatch && newRoomWatch.chatId === currentChatId && !document.querySelector(WIZARD_SELECTOR) && !modalOpen) {
    // 📌를 눌렀다 = 지금 정리하고 싶다는 뜻 → 기다리지 않고 바로 물어봄
    const id = newRoomWatch.chatId;
    newRoomWatch = null;
    askNewRoom(id).catch((error) => marinara.log.warn(error));
  }
  if (panel.hidden) return renderPanel();
  panel.replaceChildren(
    panelTop(),
    el("div", { class: "gp-panel-body" }, [el("div", { class: "gp-muted gp-loading", text: "불러오는 중…" })]),
  );
  lastPanelSig = "";
  try {
    await refreshPresets();
    if (state.setupDone) await syncAll({ quiet: false });
  } catch (error) {
    marinara.log.warn(error);
  }
  renderPanel();
}

// 제목 줄 아이콘 버튼: 글꼴에 의존하지 않도록 SVG로 직접 그림
const SVG_NS = "http://www.w3.org/2000/svg";
const ICONS = {
  refresh: ["M21 12a9 9 0 1 1-2.64-6.36", "M21 3v6h-6"],
  close: ["M18 6 6 18", "M6 6l12 12"],
};
function headerIconButton(label, iconPaths, onActivate) {
  const btn = el("span", { class: "gp-icon-btn", role: "button", tabindex: "0", title: label, "aria-label": label });
  btn.style.cssText =
    "display:inline-flex!important;visibility:visible!important;opacity:1;align-items:center;justify-content:center;" +
    "width:28px;height:28px;flex:0 0 28px;border-radius:8px;cursor:pointer;" +
    "color:var(--foreground,#333);background:var(--secondary,rgba(127,127,127,.15));user-select:none;";
  const svg = document.createElementNS(SVG_NS, "svg");
  for (const [k, v] of Object.entries({
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2.2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  })) svg.setAttribute(k, v);
  svg.style.cssText = "display:block!important;visibility:visible!important;width:16px!important;height:16px!important;flex:none;pointer-events:none;";
  for (const d of iconPaths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  btn.appendChild(svg);
  btn.addEventListener("click", onActivate);
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  });
  return btn;
}

function headerActions() {
  return el("span", { class: "gp-head-actions" }, [refreshButton(), closeButton()]);
}

let refreshing = false;
function refreshButton() {
  const btn = headerIconButton("목록 다시 불러오기", ICONS.refresh, async () => {
    if (refreshing) return;
    refreshing = true;
    btn.style.opacity = "0.45";
    try {
      await refreshPresets();
      await refreshChats({ force: true });
      await syncAll({ quiet: true });
      toast("목록을 새로 불러왔어요");
    } catch (error) {
      marinara.log.warn(error);
      toast("목록을 불러오지 못했어요");
    } finally {
      refreshing = false;
    }
    lastPanelSig = "";
    renderPanel();
  });
  if (refreshing) btn.style.opacity = "0.45";
  return btn;
}

function closeButton() {
  return headerIconButton("닫기", ICONS.close, () => {
    panel.hidden = true;
    renderPanel();
  });
}

const selection = { global: new Set(), bypreset: new Set() };

function roomRow(chat, { tabKey, onToggle }) {
  const picked = selection[tabKey];
  const following = globalRooms.has(chat.id);
  const check = el("input", { type: "checkbox", class: "gp-room-check", checked: picked.has(chat.id), "aria-label": "선택" });
  check.dataset.chatId = chat.id;
  check.addEventListener("change", () => {
    if (check.checked) picked.add(chat.id);
    else picked.delete(chat.id);
    onToggle?.();
  });
  const explicitNone = noneRooms.has(chat.id) && !hasValidPreset(chat);
  const select = presetSelect(following || explicitNone ? null : chat.promptPresetId, {
    globalOption: true,
    noneOption: true,
    noneSelected: explicitNone,
    placeholder: !following && !explicitNone && !hasValidPreset(chat) ? presetName(chat.promptPresetId) : null,
  });
  if (following) select.value = GLOBAL_OPTION;
  select.addEventListener("change", async () => {
    if (!select.value) return;
    try {
      if (select.value === GLOBAL_OPTION && !globalExists()) return toast("글로벌 프리셋을 먼저 지정해 주세요");
      await applyTarget(chat, select.value, { reason: "panel", batch: newBatch() });
      toast(`${chatName(chat)} → ${targetLabel(select.value)}`);
      await persist();
      await askCurrentIfPending();
    } catch (error) {
      marinara.log.error(error);
      toast(`프리셋 변경에 실패했어요 (${error?.status ?? "연결 오류"}) — 잠시 뒤 다시 시도해 주세요`);
    }
    renderPanel();
  });
  const isCurrent = chat.id === currentChatId;
  return el("div", { class: `gp-room ${isCurrent ? "gp-room-current" : ""}` }, [
    el("div", { class: "gp-room-head" }, [
      check,
      el("span", { class: "gp-room-title", title: chatName(chat), text: chatName(chat) }),
      isCurrent ? el("span", { class: "gp-tag gp-tag-current", text: "현재 방" }) : null,
      isPendingNew(chat.id) ? el("span", { class: "gp-tag", title: "설정을 마친 뒤 글로벌 적용 여부를 물어봐요", text: "🆕 새 방" }) : null,
      tabKey === "bypreset" && following ? el("span", { class: "gp-tag gp-tag-global", title: "글로벌을 따르는 방", text: "🌐 글로벌" }) : null,
      state.modes.length > 1 ? el("span", { class: "gp-tag", text: MODE_LABELS[chat.mode] ?? chat.mode }) : null,
    ]),
    select,
  ]);
}

async function applyTarget(chat, target, meta) {
  if (isPendingNew(chat.id)) markNewHandled(chat.id);
  if (target === GLOBAL_OPTION) {
    if (chat.promptPresetId !== state.globalPresetId) await setChatPreset(chat, state.globalPresetId, meta);
    globalRooms.add(chat.id);
    noneRooms.delete(chat.id);
  } else if (target === NONE_OPTION) {
    if (chat.promptPresetId !== null) await setChatPreset(chat, null, meta);
    globalRooms.delete(chat.id);
    noneRooms.add(chat.id);
  } else {
    if (chat.promptPresetId !== target) await setChatPreset(chat, target, meta);
    globalRooms.delete(chat.id);
    noneRooms.delete(chat.id);
  }
}
const targetLabel = (target) =>
  target === GLOBAL_OPTION ? "글로벌 프리셋" : target === NONE_OPTION ? "(없음)" : presetName(target);

async function applyBulk(ids, target) {
  if (busy) return;
  if (target === GLOBAL_OPTION && !globalExists()) return toast("글로벌 프리셋을 먼저 지정해 주세요");
  busy = true;
  let done = 0;
  const batch = newBatch();
  try {
    for (const id of ids) {
      const chat = chatCache.get(id);
      if (!chat) continue;
      try {
        await applyTarget(chat, target, { reason: "bulk", batch });
        done += 1;
      } catch (error) {
        marinara.log.warn("프리셋 변경 실패", id, error);
      }
    }
    await persist();
  } finally {
    busy = false;
  }
  toast(`${done}개 방 → ${targetLabel(target)}`);
  await askCurrentIfPending();
}

// 체크박스 선택 + 한 번에 바꾸기 바
function bulkBar(tabKey, list, { afterToggle } = {}) {
  const picked = selection[tabKey];
  const allBox = el("input", { type: "checkbox", "aria-label": "전체 선택" });
  const count = el("span", { class: "gp-bulk-count" });
  const target = presetSelect(null, { globalOption: true, noneOption: true, placeholder: "바꿀 프리셋 선택" });
  const applyBtn = el("button", { type: "button", class: "gp-btn gp-btn-primary gp-bulk-apply", text: "적용" });

  const refresh = () => {
    const n = list.filter((c) => picked.has(c.id)).length;
    allBox.checked = list.length > 0 && n === list.length;
    allBox.indeterminate = n > 0 && n < list.length;
    count.textContent = n ? `${n}개 선택` : "전체 선택";
    applyBtn.disabled = n === 0 || !target.value;
    target.disabled = n === 0;
  };
  allBox.addEventListener("change", () => {
    const on = allBox.checked;
    for (const c of list) on ? picked.add(c.id) : picked.delete(c.id);
    syncRowChecks(picked);
    refresh();
    afterToggle?.();
  });
  target.addEventListener("change", refresh);
  applyBtn.addEventListener("click", async () => {
    const ids = list.filter((c) => picked.has(c.id)).map((c) => c.id);
    if (!ids.length || !target.value) return;
    applyBtn.disabled = true;
    await applyBulk(ids, target.value);
    picked.clear();
    lastPanelSig = "";
    renderPanel();
  });
  refresh();
  return {
    node: el("div", { class: "gp-bulk" }, [
      el("label", { class: "gp-check gp-bulk-all" }, [allBox, count]),
      el("div", { class: "gp-bulk-row" }, [target, applyBtn]),
    ]),
    refresh,
  };
}

function syncRowChecks(picked) {
  panel.querySelectorAll(".gp-room-check[data-chat-id]").forEach((b) => (b.checked = picked.has(b.dataset.chatId)));
}

// 프리셋별 그룹 머리글 (그룹 전체 선택 체크박스 포함)
function groupHeader(title, rooms, picked, onToggle, { warn = false, isGlobal = false } = {}) {
  const box = el("input", { type: "checkbox", class: "gp-group-check", "aria-label": `${title} 전체 선택` });
  const refresh = () => {
    const n = rooms.filter((c) => picked.has(c.id)).length;
    box.checked = rooms.length > 0 && n === rooms.length;
    box.indeterminate = n > 0 && n < rooms.length;
  };
  box.addEventListener("change", () => {
    for (const c of rooms) box.checked ? picked.add(c.id) : picked.delete(c.id);
    syncRowChecks(picked);
    onToggle();
  });
  refresh();
  return {
    node: el("label", { class: `gp-group-head ${warn ? "gp-group-none" : ""}` }, [
      box,
      el("span", { class: "gp-group-title", title, text: title }),
      isGlobal ? el("span", { class: "gp-tag gp-tag-global", text: "🌐 현재 글로벌" }) : null,
      el("span", { class: "gp-group-count", text: `${rooms.length}` }),
    ]),
    refresh,
  };
}

// ───────── 변경 내역 탭 ─────────
const REASON_LABELS = {
  fill: "프리셋 없음 → 글로벌 자동 적용",
  remap: "삭제된 프리셋 → 같은 계열 새 버전",
  global: "글로벌 프리셋 변경",
  bulk: "일괄 변경",
  panel: "패널에서 변경",
  new: "새 방에 글로벌 적용",
};
function formatTime(t) {
  const d = new Date(t);
  const two = (n) => String(n).padStart(2, "0");
  const sameDay = d.toDateString() === new Date().toDateString();
  return `${sameDay ? "" : `${two(d.getMonth() + 1)}/${two(d.getDate())} `}${two(d.getHours())}:${two(d.getMinutes())}`;
}

function historyContent() {
  const info = el("div", { class: "gp-hist-info" }, [
    el("p", { class: "gp-muted", text: `최근 ${state.history.length}건 · 확장이 바꾼 내용만 기록돼요 (마리나라 설정창에서 직접 바꾼 건 제외)` }),
    state.history.length
      ? el("button", {
          type: "button",
          class: "gp-btn gp-btn-small",
          text: "비우기",
          onclick: () =>
            showModal({
              title: "변경 내역을 지울까요?",
              body: [el("p", { text: `기록 ${state.history.length}건이 모두 삭제돼요. 프리셋 자체는 바뀌지 않아요.` })],
              buttons: [
                { label: "취소" },
                {
                  label: "지우기",
                  primary: true,
                  onClick: async () => {
                    state.history = [];
                    await persist();
                    lastPanelSig = "";
                    renderPanel();
                  },
                },
              ],
            }),
        })
      : null,
  ]);
  if (!state.history.length) {
    return [info, el("p", { class: "gp-muted", text: "아직 변경 내역이 없어요. 확장이 프리셋을 바꾸면 여기에 기록돼요." })];
  }
  // 한 번의 작업(일괄 변경, 동기화 등)은 한 묶음으로
  const batches = new Map();
  for (const h of state.history) {
    if (!batches.has(h.b)) batches.set(h.b, []);
    batches.get(h.b).push(h);
  }
  const groups = [...batches.values()].reverse().slice(0, 80);
  const nodes = groups.map((entries) => {
    const reasons = new Set(entries.map((h) => h.r));
    let label = reasons.size === 1 ? REASON_LABELS[entries[0].r] ?? "변경" : "자동 정리";
    const targets = new Set(entries.map((h) => h.on));
    if (entries.length > 1 && targets.size === 1) label += ` → ${entries[0].on}`;
    const rows = [...entries].reverse().map((h) =>
      el("div", { class: "gp-hist-row" }, [
        el("span", { class: "gp-hist-room", text: h.n || "(이름 없는 방)" }),
        el("span", { class: "gp-hist-change", text: `${h.fn} → ${h.on}` }),
      ]),
    );
    const details = el("details", { class: "gp-hist" }, [
      el("summary", {}, [
        el("span", { class: "gp-hist-time", text: formatTime(entries.at(-1).t) }),
        el("span", { class: "gp-hist-label", text: entries.length === 1 ? `${entries[0].n || "(이름 없는 방)"}: ${REASON_LABELS[entries[0].r] ?? "변경"}` : label }),
        el("span", { class: "gp-hist-count", text: `${entries.length}` }),
      ]),
      el("div", { class: "gp-hist-rows" }, rows),
    ]);
    if (entries.length <= 3) details.setAttribute("open", "");
    return details;
  });
  return [info, ...nodes];
}

let lastPanelSig = "";
function renderPanel() {
  fab.classList.toggle("gp-fab-warn", state.setupDone && globalMissing());
  if (panel.hidden) {
    lastPanelSig = "";
    return;
  }
  const managed = [...chatCache.values()].filter(isManagedMode);
  const sig = JSON.stringify([
    activeTab,
    currentChatId,
    state.globalPresetId,
    state.globalPresetName,
    state.modes,
    [...globalRooms].sort(),
    [...noneRooms].sort(),
    state.history.length,
    state.history.at(-1)?.t ?? 0,
    presets.map((p) => [p.id, p.name]),
    managed.map((c) => [c.id, c.name, c.promptPresetId]),
  ]);
  if (sig === lastPanelSig) return;
  const focused = activeInUi();
  if (focused && panel.contains(focused) && focused.tagName === "SELECT") return;
  lastPanelSig = sig;

  const byName = (a, b) => {
    if (a.id === currentChatId) return -1;
    if (b.id === currentChatId) return 1;
    return chatName(a).localeCompare(chatName(b));
  };
  const globalList = managed.filter((c) => globalRooms.has(c.id)).sort(byName);
  const allList = [...managed].sort(byName);
  for (const [key, list] of [["global", globalList], ["bypreset", allList]]) {
    const ids = new Set(list.map((c) => c.id));
    for (const id of [...selection[key]]) if (!ids.has(id)) selection[key].delete(id);
  }

  const tabBtn = (id, label) =>
    el("button", {
      type: "button",
      class: `gp-tab ${activeTab === id ? "gp-tab-on" : ""}`,
      text: label,
      onclick: () => {
        activeTab = id;
        renderPanel();
      },
    });

  let content;
  if (activeTab === "history") {
    content = historyContent();
  } else if (activeTab === "global") {
    const globalSel = presetSelect(globalExists() && !globalIsNone() ? state.globalPresetId : null, {
      placeholder: globalExists() ? null : "(프리셋을 골라주세요)",
      noneOption: true,
      noneSelected: globalIsNone(),
    });
    globalSel.addEventListener("change", async () => {
      if (!globalSel.value) return;
      const next = globalSel.value === NONE_OPTION ? null : globalSel.value;
      if (next === state.globalPresetId && globalExists()) return;
      await setGlobal(next);
    });
    const modes = modeCheckboxes();
    for (const m of modes) {
      m.box.addEventListener("change", async () => {
        const next = modes.filter((x) => x.box.checked).map((x) => x.box.dataset.mode);
        if (!next.length) {
          m.box.checked = true;
          return toast("최소 한 개 모드는 켜져 있어야 해요");
        }
        state.modes = next;
        await persist();
        await syncAll();
      });
    }
    content = [
      el("div", { class: "gp-label", text: "글로벌 프리셋" }),
      globalSel,
      globalMissing() && state.globalPresetName
        ? el("div", { class: "gp-warn-text", text: `⚠ ${state.globalPresetName} 프리셋이 삭제됐어요. 새로 골라주세요.` })
        : null,
      el("div", { class: "gp-label", text: `글로벌 프리셋을 쓰는 방 (${globalList.length})` }),
      ...(() => {
        if (!globalList.length) return [el("p", { class: "gp-muted", text: "글로벌 프리셋을 쓰는 방이 없어요." })];
        const bar = bulkBar("global", globalList);
        return [
          bar.node,
          el("div", { class: "gp-room-list" }, globalList.map((c) => roomRow(c, { tabKey: "global", onToggle: bar.refresh }))),
        ];
      })(),
      el("div", { class: "gp-label", text: "적용할 모드" }),
      el("div", { class: "gp-row" }, modes.map((m) => m.node)),
    ];
  } else {
    content = [
      ...(() => {
        if (!allList.length) return [el("p", { class: "gp-muted", text: "관리 중인 채팅방이 없어요." })];
        const picked = selection.bypreset;
        // 지금 쓰는 프리셋별로 묶기: (없음) → 현재 글로벌 → 나머지 이름순
        const groups = new Map();
        for (const c of allList) {
          const key = hasValidPreset(c) ? c.promptPresetId : "";
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(c);
        }
        const keys = [...groups.keys()].sort((a, b) => {
          if (a === "") return -1;
          if (b === "") return 1;
          if (a === state.globalPresetId) return -1;
          if (b === state.globalPresetId) return 1;
          return presetName(a).localeCompare(presetName(b));
        });
        const headers = [];
        const bar = bulkBar("bypreset", allList, { afterToggle: () => headers.forEach((h) => h.refresh()) });
        const refreshAll = () => {
          bar.refresh();
          headers.forEach((h) => h.refresh());
        };
        const sections = keys.map((key) => {
          const rooms = groups.get(key);
          const header = groupHeader(key ? presetName(key) : "(없음) — 프리셋 없는 방", rooms, picked, refreshAll, {
            warn: key === "",
            isGlobal: !!key && key === state.globalPresetId,
          });
          headers.push(header);
          return el("div", { class: "gp-group" }, [
            header.node,
            el("div", { class: "gp-room-list" }, rooms.map((c) => roomRow(c, { tabKey: "bypreset", onToggle: refreshAll }))),
          ]);
        });
        return [
          el("p", { class: "gp-muted", text: "지금 쓰는 프리셋별로 모든 방을 보여줘요. 🌐 표시는 글로벌을 따르는 방이에요." }),
          bar.node,
          ...sections,
        ];
      })(),
    ];
  }

  // 제목 줄 + 탭은 위에 고정, 아래 목록만 스크롤 (스크롤 위치는 다시 그려도 유지)
  const prevBody = panel.querySelector(".gp-panel-body");
  const prevScroll = prevBody && prevTab === activeTab ? prevBody.scrollTop : 0;
  prevTab = activeTab;
  const body = el("div", { class: "gp-panel-body" }, content.filter(Boolean));
  panel.replaceChildren(
    panelTop([
      el("div", { class: "gp-tabs" }, [
        tabBtn("global", `글로벌 (${globalList.length})`),
        tabBtn("bypreset", `프리셋별 (${allList.length})`),
        tabBtn("history", "내역"),
      ]),
    ]),
    body,
  );
  body.scrollTop = prevScroll;
}

function panelTop(extra = []) {
  return el("div", { class: "gp-panel-top" }, [
    el("div", { class: "gp-panel-head" }, [
      el("span", { text: "Global Preset" }),
      headerActions(),
    ]),
    ...extra,
  ]);
}

// ───────── 시작 ─────────
try {
  await refreshPresets();
} catch (error) {
  marinara.log.error("프리셋 목록을 불러오지 못했어요", error);
}

if (needsV1Migration) {
  try {
    const chats = await refreshChats();
    for (const c of chats) {
      if (isManagedMode(c) && !v1Pins[c.id] && c.promptPresetId === state.globalPresetId) globalRooms.add(c.id);
    }
    await persist();
  } catch (error) {
    marinara.log.warn("v1 설정 옮기기 실패", error);
  }
}

if (!state.setupDone) {
  await showSetupModal();
} else if (globalMissing()) {
  showGlobalMissingModal();
}

let ticking = false;
marinara.setInterval(async () => {
  if (ticking || !state.setupDone || busy) return;
  ticking = true;
  try {
    await checkActiveChat();
  } catch (error) {
    marinara.log.warn("채팅방 확인 실패", error);
  } finally {
    ticking = false;
  }
}, ACTIVE_CHECK_MS);

// 새 방 설정이 끝났는지는 화면만 보면 돼서 짧은 간격으로 확인 (새 방을 지켜보는 동안에만 동작)
let watchTicking = false;
marinara.setInterval(async () => {
  if (!newRoomWatch || watchTicking) return;
  watchTicking = true;
  try {
    await checkNewRoomWatch();
  } catch (error) {
    marinara.log.warn("새 방 확인 실패", error);
  } finally {
    watchTicking = false;
  }
}, 300);

// 다른 탭/앱 갔다가 돌아왔을 때만 프리셋 목록 다시 확인
const onVisible = async () => {
  if (document.visibilityState === "hidden" && persistTimer) {
    persistNow();
    return;
  }
  if (document.visibilityState !== "visible" || !state.setupDone || modalOpen) return;
  try {
    await refreshPresets();
    if (globalMissing() && !globalMissingDismissed) showGlobalMissingModal();
    renderPanel();
  } catch (error) {
    marinara.log.warn("프리셋 확인 실패", error);
  }
};
document.addEventListener("visibilitychange", onVisible);
marinara.onCleanup(() => document.removeEventListener("visibilitychange", onVisible));

marinara.log.info("Global Preset v2 loaded");
