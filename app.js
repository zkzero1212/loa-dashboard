import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC99EjAdUeO8982J2yN7zpr63_BT9hRDuY",
  authDomain: "hwanhyang-b1d4e.firebaseapp.com",
  databaseURL: "https://hwanhyang-b1d4e.firebaseio.com",
  projectId: "hwanhyang-b1d4e",
  storageBucket: "hwanhyang-b1d4e.firebasestorage.app",
  messagingSenderId: "430049446799",
  appId: "1:430049446799:web:906c20fd4333f6c4d219fa"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'loaDashboardData');

window.charactersData = [];
window.cpmData = { inputs: { recordName: '', skillName: '', min: '', sec: '', casts: '', target: '', scarecrow: '', exclude: '0' }, records: [] };
window.partyData = [];
window.oState = { craftType: 'normal', inv: {w:0, g:0, b:0, p:0, t:0}, prices: {w:0, g:0, b:0, t:0, low:0, high:0} };
window.appState = { title: '💻 로스트아크 클라우드 대시보드' };

window.activeHighlightPartyId = null;
window.activeHighlightCharId = null;
window.lastWeeklyResetId = null;
window.hasCheckedWeeklyReset = false;
window.configSelectedPlayers = new Set();
window.selectedCategories = new Set();
let editingDbId = null;
let editingCpmId = null;
window.dashboardMode = 'party';
window.summaryStates = {}; 
window.partyBoardFilters = new Set(['4막', '종막', '성당', '세르카', '벨가']); 

const dungeonCategories = [
    { id: '4막', label: '4막', diffs: ['4막싱글', '4막하드'] },
    { id: '종막', label: '종막', diffs: ['종막싱글', '종막하드'] },
    { id: '성당', label: '성당', diffs: ['성당1단', '성당2단', '성당3단'] },
    { id: '세르카', label: '세르카', diffs: ['세르카싱글', '세르카하드', '세르카나메'] },
    { id: '벨가', label: '벨가르딘', diffs: ['벨가노말', '벨가하드', '벨가나메'] }
];

const globalDungeonOrder = ['4막싱글', '4막하드', '종막싱글', '종막하드', '성당1단', '성당2단', '성당3단', '세르카싱글', '세르카하드', '세르카나메', '벨가노말', '벨가하드', '벨가나메'];

const partyDungeonCategories = [
    { id: '4막', name: '4막', diffs: [{name:'하드', level:1720, color:'bg-purple-100 text-purple-700 border border-purple-200'}] },
    { id: '종막', name: '종막', diffs: [{name:'하드', level:1730, color:'bg-purple-100 text-purple-700 border border-purple-200'}] },
    { id: '성당', name: '성당', diffs: [{name:'1단', level:1700, color:'bg-green-100 text-green-700 border border-green-200'}, {name:'2단', level:1720, color:'bg-blue-100 text-blue-700 border border-blue-200'}, {name:'3단', level:1750, color:'bg-purple-100 text-purple-700 border border-purple-200'}] },
    { id: '세르카', name: '세르카', diffs: [{name:'하드', level:1730, color:'bg-purple-100 text-purple-700 border border-purple-200'}, {name:'나메', level:1740, color:'bg-red-100 text-red-700 border border-red-200'}] },
    { id: '벨가', name: '벨가르딘', diffs: [{name:'노말', level:1750, color:'bg-blue-100 text-blue-700 border border-blue-200'}, {name:'하드', level:1770, color:'bg-purple-100 text-purple-700 border border-purple-200'}, {name:'나메', level:1780, color:'bg-red-100 text-red-700 border border-red-200'}] }
];

window.saveToCloud = function() {
  set(dbRef, {
    charactersData: window.charactersData || [],
    partyData: window.partyData || [],
    cpmData: window.cpmData || { inputs: {}, records: [] },
    oState: window.oState || { craftType: 'normal', inv: {w:0, g:0, b:0, p:0, t:0}, prices: {w:0, g:0, b:0, t:0, low:0, high:0} },
    appState: window.appState || { title: '💻 로스트아크 클라우드 대시보드' }
  });
};

window.calculateContents = function(level) {
    let contents = [];
    if (level < 1700) return ['1700미만'];
    if (level >= 1720) contents.push('4막하드'); else if (level >= 1700) contents.push('4막싱글');
    if (level >= 1730) contents.push('종막하드'); else if (level >= 1710) contents.push('종막싱글');
    if (level >= 1750) contents.push('성당3단'); else if (level >= 1720) contents.push('성당2단'); else if (level >= 1700) contents.push('성당1단');
    if (level >= 1740) contents.push('세르카나메'); else if (level >= 1730) contents.push('세르카하드'); else if (level >= 1710) contents.push('세르카싱글');
    if (level >= 1780) contents.push('벨가나메'); else if (level >= 1770) contents.push('벨가하드'); else if (level >= 1750) contents.push('벨가노말');
    return contents;
};

const supporters = ["바드", "홀나", "발키리", "도화가"];
const playerColors = {
    '건희': { border: 'border-yellow-400', text: 'text-yellow-700', header: 'bg-yellow-400', bg: 'bg-yellow-50', label: 'bg-yellow-100' },
    '상욱': { border: 'border-blue-400', text: 'text-blue-700', header: 'bg-blue-500', bg: 'bg-blue-50', label: 'bg-blue-100' },
    '슬가': { border: 'border-orange-400', text: 'text-orange-700', header: 'bg-orange-500', bg: 'bg-orange-50', label: 'bg-orange-100' },
    '정명': { border: 'border-emerald-400', text: 'text-emerald-700', header: 'bg-emerald-500', bg: 'bg-emerald-50', label: 'bg-emerald-100' }
};
const fallbackColor = { border: 'border-slate-400', text: 'text-slate-700', header: 'bg-slate-500', bg: 'bg-slate-50', label: 'bg-slate-200' };

function getPlayerColor(playerName) { return playerColors[playerName] || fallbackColor; }

function getDiffStyle(diff) {
    if (diff.includes('싱글')) return 'bg-slate-100 text-slate-700 border-slate-300 font-bold hover:bg-slate-200';
    if (diff.includes('나메')) return 'text-red-700 bg-red-100 border-red-300 hover:bg-red-200';
    if (diff.includes('3단') || diff.includes('하드') || diff.includes('벨가하드')) return 'text-purple-700 bg-purple-100 border-purple-300 hover:bg-purple-200';
    if (diff.includes('2단') || diff.includes('노말')) return 'text-blue-700 bg-blue-100 border-blue-300 hover:bg-blue-200';
    if (diff.includes('1단')) return 'text-green-700 bg-green-100 border-green-300 hover:bg-green-200';
    return 'text-slate-700 bg-slate-100 border-slate-300';
}

window.isCharClearedDungeon = function(char, fullDiffStr) {
    let catId = fullDiffStr;
    for (const cat of dungeonCategories) {
        if (fullDiffStr.startsWith(cat.id)) {
            catId = cat.id;
            break;
        }
    }

    if (char.completed && char.completed.some(c => c.startsWith(catId))) return true;
    
    if (Array.isArray(window.partyData)) {
        return window.partyData.some(p => p.cat === catId && p.isCleared && p.slots && p.slots.includes(char.dbId));
    }
    
    return false;
};

window.dragStartPartyBox = function(e, partyId, catId) {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'partyBox', partyId: partyId, catId: catId }));
    window.closeDropdown();
};

window.allowDropPartyBox = function(e) {
    e.preventDefault();
    e.stopPropagation();
};

window.dropPartyBox = function(e, targetPartyId, targetCatId) {
    e.preventDefault();
    e.stopPropagation();
    
    let dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    try {
        let data = JSON.parse(dataStr);
        if (data.type === 'partyBox' && data.catId === targetCatId) {
            const sourcePartyId = data.partyId;
            if (sourcePartyId === targetPartyId) return;

            const catParties = window.partyData.filter(p => p.cat === targetCatId);
            const sourceIndex = catParties.findIndex(p => p.id === sourcePartyId);
            const targetIndex = catParties.findIndex(p => p.id === targetPartyId);

            if (sourceIndex > -1 && targetIndex > -1) {
                const movedParty = catParties.splice(sourceIndex, 1)[0];
                catParties.splice(targetIndex, 0, movedParty);
                
                const otherParties = window.partyData.filter(p => p.cat !== targetCatId);
                window.partyData = [...otherParties, ...catParties];
                
                if(typeof window.saveToCloud === 'function') window.saveToCloud();
                window.renderDashboard(); 
            }
        }
    } catch(err) {
        console.error(err);
    }
};

window.toggleHighlight = function(e, partyId) {
    if (e && e.target) {
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'button' || tag === 'input' || (tag === 'span' && e.target.onclick)) return;
        if (e.target.closest('button') || e.target.closest('input')) return;
    }

    window.activeHighlightCharId = null; 
    if (window.activeHighlightPartyId === partyId) { window.activeHighlightPartyId = null; } 
    else { window.activeHighlightPartyId = partyId; }
    window.updateHighlightDOM();
};

window.updateHighlightDOM = function() {
    const partyId = window.activeHighlightPartyId;
    const trackCharId = window.activeHighlightCharId;

    document.querySelectorAll('.party-box-element').forEach(el => {
        el.classList.remove('party-box-highlight', 'char-track-party');
        if (partyId && el.id === 'party-box-' + partyId) {
            el.classList.add('party-box-highlight');
        } else if (trackCharId) {
            const pId = el.id.replace('party-box-', '');
            const party = window.partyData.find(p => p.id === pId);
            if (party && party.slots && party.slots.includes(trackCharId)) {
                el.classList.add('char-track-party');
            }
        }
    });

    document.querySelectorAll('.roster-char-element').forEach(el => {
        el.classList.remove('roster-dimmed', 'roster-highlight', 'char-track-slot');
        const charId = el.getAttribute('data-char-id');

        if (partyId) {
            const char = window.charactersData.find(c => c.dbId === charId);
            const party = window.partyData.find(p => p.id === partyId);
            if (char && party && window.isCharEligibleForParty(char, party)) { 
                el.classList.add('roster-highlight'); 
            } else { 
                el.classList.add('roster-dimmed'); 
            }
        } else if (trackCharId) {
            if (charId === trackCharId) {
                el.classList.add('char-track-slot');
            } else {
                el.classList.add('roster-dimmed');
            }
        }
    });

    document.querySelectorAll('.party-slot-element').forEach(el => {
        el.classList.remove('char-track-slot');
        if (trackCharId) {
            const slotCharId = el.getAttribute('data-char-id');
            if (slotCharId === trackCharId) {
                el.classList.add('char-track-slot');
            }
        }
    });
};

window.isCharEligibleForParty = function(char, party) {
    if (char.level < party.level) return false;
    if (party.slots && party.slots.includes(char.dbId)) return false;
    const inOtherParty = window.partyData.some(p => p.cat === party.cat && p.id !== party.id && p.slots && p.slots.includes(char.dbId));
    if (inOtherParty) return false;
    const playerInThisParty = party.slots.some((sId) => {
        if (!sId) return false;
        const c = window.charactersData.find(x => x.dbId === sId);
        return c && c.player === char.player;
    });
    if (playerInThisParty) return false;
    return true;
};

window.editAppTitle = function() {
    const currentTitle = window.appState ? window.appState.title : '💻 로스트아크 클라우드 대시보드';
    const newTitle = prompt("메인 화면의 타이틀을 입력해주세요:", currentTitle);
    if (newTitle !== null && newTitle.trim() !== '') {
        window.appState.title = newTitle.trim();
        document.getElementById('display-app-title').innerText = newTitle.trim();
        if(typeof window.saveToCloud === 'function') window.saveToCloud();
        window.showToast('타이틀이 변경되었습니다.');
    }
};

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : (type === 'warning' ? 'bg-orange-500' : 'bg-blue-600');
    toast.className = 'toast-enter flex items-center text-white px-4 py-3 rounded-lg shadow-xl backdrop-blur text-[13px] font-bold ' + bgColor;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.replace('toast-enter', 'toast-exit'); setTimeout(() => toast.remove(), 500); }, 3000);
};

window.showTooltip = function(e, element) {
    const tooltip = document.getElementById('custom-tooltip');
    if (!tooltip) return;
    const assignedStr = element.getAttribute('data-assigned');
    const remainingStr = element.getAttribute('data-remaining');
    let html = '<div class="font-bold text-slate-700 mb-1.5 border-b border-slate-200 pb-1">상세 정보</div>';
    html += '<div class="mb-1.5 text-[12px] bg-yellow-50 p-2 rounded border border-yellow-200 shadow-sm whitespace-nowrap">';
    html += '<span class="text-yellow-700 font-bold block mb-0.5">남은 캐릭터</span>';
    html += '<span class="text-slate-800 font-black tracking-wide block leading-snug">' + (remainingStr || '없음') + '</span></div>';
    html += '<div class="text-[11px] pl-1 whitespace-nowrap"><span class="text-slate-500 font-bold block mb-0.5">배정된 캐릭터</span>';
    html += '<span class="text-slate-600 block leading-snug">' + (assignedStr || '없음') + '</span></div>';
    tooltip.innerHTML = html;
    const rect = element.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = (rect.top - 8) + 'px';
    tooltip.classList.remove('opacity-0');
    tooltip.classList.add('opacity-100');
};

window.hideTooltip = function() {
    const tooltip = document.getElementById('custom-tooltip');
    if (tooltip) { tooltip.classList.remove('opacity-100'); tooltip.classList.add('opacity-0'); }
};

window.requestResetWeekly = function(btnElement) {
    if (btnElement.innerText.includes("정말 초기화")) {
        window.charactersData.forEach(c => { c.completed = []; });
        window.partyData.forEach(p => { p.isCleared = false; });
        if(typeof window.saveToCloud === 'function') window.saveToCloud();
        btnElement.innerHTML = '<span>🔄</span> 주간 숙제 전체 초기화';
        btnElement.className = "text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded border border-slate-300 transition shadow-sm font-bold flex items-center gap-1";
        window.showToast('주간 숙제가 수동으로 완전 초기화되었습니다.');
    } else {
        btnElement.innerHTML = '<span>⚠️</span> 정말 초기화할까요?';
        btnElement.className = "text-[11px] bg-red-600 text-white px-3 py-1.5 rounded border border-red-700 transition shadow-sm font-bold flex items-center gap-1";
        setTimeout(() => {
            if (btnElement && btnElement.innerText.includes("정말 초기화")) {
                btnElement.innerHTML = '<span>🔄</span> 주간 숙제 전체 초기화';
                btnElement.className = "text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded border border-slate-300 transition shadow-sm font-bold flex items-center gap-1";
            }
        }, 3000);
    }
};

window.renderAll = function() {
    window.renderDashboard(); 
    window.renderFilterResults(); 
    window.renderConfigFilters(); 
    window.renderConfigTable(); 
    window.renderCpmRecords(); 
    if(typeof window.renderOrehaUI === 'function') window.renderOrehaUI();
    if(typeof window.renderGoldCalculator === 'function') window.renderGoldCalculator(); // ★ 추가됨
};

window.switchTab = function(tabName) {
    ['dashboard', 'filter', 'config', 'tools'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        const view = document.getElementById('view-' + t);
        if (btn) btn.classList.toggle('active', tabName === t);
        if (view) view.classList.toggle('hidden', tabName !== t);
    });
    if (tabName === 'config') { window.renderConfigFilters(); window.renderConfigTable(); } 
    else if (tabName !== 'tools') { window.renderAll(); }
};

window.switchToolTab = function(tabName) {
    const tabCpm = document.getElementById('tool-tab-cpm'); 
    const tabOreha = document.getElementById('tool-tab-oreha');
    const tabGold = document.getElementById('tool-tab-gold');
    
    const viewCpm = document.getElementById('tool-view-cpm'); 
    const viewOreha = document.getElementById('tool-view-oreha');
    const viewGold = document.getElementById('tool-view-gold');
    
    if(tabCpm) tabCpm.className = "text-slate-500 font-bold px-1 py-1 text-sm cursor-pointer hover:text-blue-600 transition shrink-0";
    if(tabOreha) tabOreha.className = "text-slate-500 font-bold px-1 py-1 text-sm cursor-pointer hover:text-orange-500 transition shrink-0";
    if(tabGold) tabGold.className = "text-slate-500 font-bold px-1 py-1 text-sm cursor-pointer hover:text-emerald-600 transition shrink-0";
    
    if(viewCpm) viewCpm.classList.add('hidden');
    if(viewOreha) viewOreha.classList.add('hidden');
    if(viewGold) viewGold.classList.add('hidden');

    if (tabName === 'cpm') {
        if(tabCpm) tabCpm.className = "text-blue-600 font-bold px-1 py-1 border-b-2 border-blue-600 text-sm transition shrink-0";
        if(viewCpm) viewCpm.classList.remove('hidden');
    } else if (tabName === 'oreha') {
        if(tabOreha) tabOreha.className = "text-orange-500 font-bold px-1 py-1 border-b-2 border-orange-500 text-sm transition shrink-0";
        if(viewOreha) viewOreha.classList.remove('hidden'); 
        if(typeof window.renderOrehaUI === 'function') window.renderOrehaUI(); 
    } else if (tabName === 'gold') {
        if(tabGold) tabGold.className = "text-emerald-600 font-bold px-1 py-1 border-b-2 border-emerald-500 text-sm transition shrink-0";
        if(viewGold) viewGold.classList.remove('hidden');
        if(typeof window.renderGoldCalculator === 'function') window.renderGoldCalculator();
    }
};

window.toggleDashboardMode = function() {
    window.dashboardMode = window.dashboardMode === 'personal' ? 'party' : 'personal';
    const btn = document.getElementById('btn-toggle-view');
    const desc = document.getElementById('dashboard-desc');
    if(window.dashboardMode === 'party') {
        btn.innerHTML = '<span>👤</span> 개인 숙제 보기';
        btn.className = "text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded border border-slate-300 transition shadow-sm font-bold flex items-center gap-1";
        desc.innerHTML = "원하는 던전 열 아래의 <b>+ 파티 추가</b>를 눌러 파티를 짜보세요.";
    } else {
        btn.innerHTML = '<span>📊</span> 파티 짜기 보드';
        btn.className = "text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded border border-blue-200 transition shadow-sm font-bold flex items-center gap-1";
        desc.innerHTML = "버튼화된 던전 뱃지를 클릭하면 체크(취소선) 처리됩니다.";
    }
    window.renderDashboard();
};

window.toggleSummary = function(player) {
    window.summaryStates[player] = !window.summaryStates[player];
    window.renderDashboard();
};

window.togglePartyBoardFilter = function(catId) {
    if (window.partyBoardFilters.has(catId)) window.partyBoardFilters.delete(catId);
    else window.partyBoardFilters.add(catId);
    window.renderDashboard();
};

window.renderDashboard = function() {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = '';
    if (!window.charactersData || window.charactersData.length === 0) {
        container.className = "grid grid-cols-1";
        container.innerHTML = '<div class="col-span-1 text-center text-slate-500 py-10 glass-panel text-sm font-bold">등록된 캐릭터가 없습니다. 설정 탭에서 직접 추가해주세요.</div>';
        return;
    }
    if (window.dashboardMode === 'personal') window.renderPersonalDashboard(container);
    else window.renderPartyDashboard(container);
};

window.renderPersonalDashboard = function(container) {
    container.className = "grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-7xl mx-auto";
    const groupedByPlayer = window.charactersData.reduce((acc, char) => {
        if (!acc[char.player]) acc[char.player] = [];
        acc[char.player].push(char);
        return acc;
    }, {});

    for (let player in groupedByPlayer) groupedByPlayer[player].sort((a, b) => b.level - a.level);

    for (const [player, chars] of Object.entries(groupedByPlayer)) {
        const pColor = getPlayerColor(player);
        const isExpanded = window.summaryStates[player] === true; 
        
        let html = '<div class="glass-panel border-t-4 ' + pColor.border + ' p-3 md:p-4 ' + pColor.bg + '">';
        html += '<h2 class="text-base md:text-lg font-black mb-2.5 ' + pColor.text + ' border-b border-slate-100 pb-1.5 flex justify-between items-center">';
        html += '<span>' + player + '</span>';
        html += '<button onclick="toggleSummary(\'' + player + '\')" class="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shadow-sm">';
        html += '요약보기 ' + (isExpanded ? '▲' : '▼') + '</button></h2>';
        
        let summaryHtml = '<div id="summary-' + player + '" class="' + (isExpanded ? 'block' : 'hidden') + '">';
        summaryHtml += '<div class="bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-200 text-xs shadow-sm">';
        summaryHtml += '<div class="font-bold text-slate-600 mb-1.5 border-b border-slate-200 pb-1 flex items-center gap-1.5"><span class="text-[10px]">📋</span> 주간 숙제 요약</div>';
        summaryHtml += '<div class="space-y-1.5">';
        let hasAnySummary = false;
        
        const getSummaryStyleInfo = (diffName) => {
            if(diffName.includes('싱글')) return { col: 1, color: 'text-slate-700', bg: 'bg-white border border-slate-300' };
            if(diffName.includes('1단')) return { col: 1, color: 'text-green-700', bg: 'bg-green-100 border border-green-200' };
            if(diffName.includes('노말')) return { col: 1, color: 'text-blue-700', bg: 'bg-blue-100 border border-blue-200' };
            if(diffName.includes('2단')) return { col: 2, color: 'text-blue-700', bg: 'bg-blue-100 border border-blue-200' };
            if(diffName.includes('하드')) return { col: 2, color: 'text-purple-700', bg: 'bg-purple-100 border border-purple-200' };
            if(diffName.includes('3단')) return { col: 3, color: 'text-purple-700', bg: 'bg-purple-100 border border-purple-200' };
            if(diffName.includes('나메')) return { col: 3, color: 'text-red-700', bg: 'bg-red-100 border border-red-200' };
            return { col: 1, color: 'text-slate-700', bg: 'bg-slate-100 border border-slate-300' };
        };

        dungeonCategories.forEach(cat => {
            let catParts = [];
            cat.diffs.forEach(diff => {
                let totalAssigned = 0;
                let totalRemaining = 0;
                let assignedNames = [];
                let remainingNames = [];
                
                chars.forEach(char => {
                    if (char.contents && char.contents.includes(diff)) {
                        totalAssigned++;
                        assignedNames.push(char.name);
                        if (!window.isCharClearedDungeon(char, diff)) {
                            totalRemaining++;
                            remainingNames.push(char.name);
                        }
                    }
                });
                
                if (totalAssigned > 0) {
                    let diffName = diff.replace(cat.id, ''); 
                    if (!diffName) diffName = diff;
                    let style = getSummaryStyleInfo(diffName);
                    
                    let boxClass = 'col-start-' + style.col + ' flex items-center justify-between gap-1 px-1.5 py-0.5 rounded border border-slate-200 w-full max-w-[90px] cursor-help transition-all';
                    let badgeClass = style.color + ' font-bold text-[10px] ' + style.bg + ' px-1 rounded whitespace-nowrap';
                    let remainingClass = "text-slate-800 font-black text-[12px]";
                    let totalClass = "text-slate-400 font-medium text-[9px]";
                    
                    if (totalRemaining === 0) {
                        boxClass += " bg-slate-100 opacity-50 grayscale border-slate-200";
                        badgeClass = "text-slate-400 font-bold text-[10px] bg-slate-200 px-1 rounded whitespace-nowrap line-through border-transparent";
                        remainingClass = "text-slate-400 font-bold text-[12px] line-through";
                        totalClass = "text-slate-400 font-medium text-[9px] line-through";
                    } else { boxClass += " bg-white shadow-sm"; }
                    
                    let tooltipData = 'data-assigned="' + assignedNames.join(', ') + '" data-remaining="' + remainingNames.join(', ') + '"';
                    let partHtml = '<div onmouseenter="showTooltip(event, this)" onmouseleave="hideTooltip()" ' + tooltipData + ' class="' + boxClass + '">';
                    partHtml += '<span class="' + badgeClass + '">' + diffName + '</span>';
                    partHtml += '<div class="flex items-baseline gap-0.5 whitespace-nowrap"><span class="' + remainingClass + '">' + totalRemaining + '</span><span class="' + totalClass + '">/' + totalAssigned + '</span></div></div>';
                    catParts.push(partHtml);
                }
            });
            
            if (catParts.length > 0) {
                hasAnySummary = true;
                let displayLabel = cat.label === '벨가르딘' ? '벨가' : cat.label;
                summaryHtml += '<div class="flex items-center gap-2 border-b border-slate-200 last:border-0 pb-1.5 last:pb-0">';
                summaryHtml += '<span class="text-slate-600 font-bold w-9 shrink-0 text-center bg-slate-200 rounded py-0.5 text-[11px]">' + displayLabel + '</span>';
                summaryHtml += '<div class="grid grid-cols-3 gap-x-2 gap-y-1 items-center flex-1">' + catParts.join('') + '</div></div>';
            }
        });
        summaryHtml += '</div></div></div>';
        if (hasAnySummary) html += summaryHtml;

        html += '<div class="flex flex-col gap-1.5">'; 
        chars.forEach(char => {
            let contentsHtml = '<div class="grid grid-cols-5 gap-1 md:gap-1.5 w-full sm:w-[280px] md:w-[380px] shrink-0 sm:ml-auto">';
            contentsHtml += dungeonCategories.map(cat => {
                const c = cat.diffs.find(diff => char.contents && char.contents.includes(diff));
                if (c) {
                    const isCompleted = window.isCharClearedDungeon(char, c);
                    const cls = 'dungeon-badge w-full !m-0 h-full text-[9px] md:text-[11px] px-0.5 py-1 md:py-1.5 rounded font-medium tracking-tighter ' + getDiffStyle(c) + ' ' + (isCompleted ? 'completed' : '');
                    return '<span onclick="toggleCompletion(\'' + char.dbId + '\', \'' + c + '\')" class="' + cls + '">' + c + '</span>';
                }
                return '<span></span>';
            }).join('');
            contentsHtml += '</div>';
            
            const isSupp = supporters.includes(char.name);
            const isAllCleared = char.contents && char.contents.length > 0 && char.contents.every(content => window.isCharClearedDungeon(char, content));
            const cardClass = (isSupp && !isAllCleared) ? 'supporter-glow border-slate-200 bg-white' : 'bg-white border-slate-200 hover:bg-slate-50';
            const opacityClass = isAllCleared ? 'opacity-40 grayscale !bg-slate-50' : '';

            html += '<div class="rounded-lg p-2 md:p-2.5 border flex flex-col sm:flex-row sm:items-center justify-between transition gap-1.5 shadow-sm ' + cardClass + ' ' + opacityClass + '">';
            html += '<div class="flex items-center gap-1.5 whitespace-nowrap min-w-max">';
            html += '<span class="font-bold text-[13px] ' + (isAllCleared ? 'line-through text-slate-400' : 'text-slate-800') + '">' + (isSupp ? '<span class="text-yellow-500 mr-0.5 text-xs">✨</span>' : '') + char.name + '</span>';
            html += '<span class="text-[11px] md:text-xs text-slate-500 font-medium">Lv.' + char.level + '</span></div>';
            html += contentsHtml + '</div>';
        });
        html += '</div></div>';
        container.innerHTML += html;
    }
};

window.renderPartyDashboard = function(container) {
    container.className = "flex flex-col gap-3 h-full";
    
    let filterHtml = '<div class="glass-panel p-2.5 flex flex-wrap gap-2 items-center shadow-sm bg-white mb-1">';
    filterHtml += '<span class="text-[11px] font-bold text-slate-500 mr-1">🔍 보드 필터:</span>';
    
    partyDungeonCategories.forEach(cat => {
        const isActive = window.partyBoardFilters.has(cat.id);
        const btnClass = isActive ? 'bg-slate-600 text-white border-transparent' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-100';
        filterHtml += '<button onclick="togglePartyBoardFilter(\'' + cat.id + '\')" class="px-3 py-1 rounded-full text-[11px] font-bold border transition ' + btnClass + '">' + cat.name + '</button>';
    });
    filterHtml += '</div>';
    
    let mainContent = '<div class="flex flex-col lg:flex-row gap-3 lg:gap-4 overflow-hidden h-full">';

    let rosterHtml = '<div class="lg:w-48 shrink-0 flex flex-col"><div class="glass-panel p-2.5 lg:p-3 sticky top-4 max-h-[85vh] overflow-y-auto">';
    rosterHtml += '<h3 class="text-[11px] font-bold text-slate-500 mb-2 border-b border-slate-200 pb-2 text-center">👥 명단 (드래그)</h3>';
    rosterHtml += '<div id="roster-container" class="space-y-3">';
    
    const grouped = window.charactersData.reduce((acc, char) => {
        if (!acc[char.player]) acc[char.player] = [];
        acc[char.player].push(char);
        return acc;
    }, {});

    for (let player in grouped) {
        grouped[player].sort((a, b) => b.level - a.level);
        const pColor = getPlayerColor(player);
        
        rosterHtml += `<div class="mb-2.5 rounded-lg border ${pColor.border} overflow-hidden shadow-sm flex flex-col">`;
        rosterHtml += `<div class="text-[11px] font-black ${pColor.text} ${pColor.label} px-1.5 py-1 text-center border-b ${pColor.border}">${player}</div>`;
        rosterHtml += `<div class="flex flex-col gap-1 p-1.5 ${pColor.bg}">`;
        
        grouped[player].forEach(char => {
            const isSupp = supporters.includes(char.name);
            const isAllCleared = char.contents && char.contents.length > 0 && char.contents.every(content => window.isCharClearedDungeon(char, content));
            
            const borderClass = (isSupp && !isAllCleared) ? 'supporter-glow border-white bg-white' : 'bg-white border-white';
            const opacityClass = isAllCleared ? 'opacity-50 grayscale !bg-white/50' : '';
            const textStyle = isAllCleared ? 'line-through text-slate-400' : 'text-slate-800';

            rosterHtml += `<div id="roster-char-${char.dbId}" data-char-id="${char.dbId}" draggable="true" ondragstart="dragStart(event, '${char.dbId}')" onclick="handleRosterClick('${char.dbId}')" class="roster-char-element flex justify-between items-center p-1.5 rounded border shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition ${borderClass} ${opacityClass}">`;
            rosterHtml += '<span class="text-[11px] font-bold ' + textStyle + '">' + (isSupp ? '<span class="text-yellow-500 mr-0.5 text-[9px]">✨</span>' : '') + char.name + '</span>';
            rosterHtml += '<span class="text-[9px] text-slate-400 font-medium ' + (isAllCleared ? 'line-through' : '') + '">' + char.level + '</span></div>';
        });
        rosterHtml += '</div></div>';
    }
    rosterHtml += '</div></div></div>';

    let boardHtml = '<div class="flex-grow flex gap-3 xl:gap-4 overflow-x-auto pb-4 items-start h-full">';
    
    partyDungeonCategories.filter(cat => window.partyBoardFilters.has(cat.id)).forEach(cat => {
        boardHtml += '<div class="w-[220px] xl:w-[240px] shrink-0 flex flex-col gap-2.5 bg-slate-100/70 border border-slate-200 rounded-xl p-2 md:p-2.5 shadow-inner min-h-[70vh]">';
        boardHtml += '<div class="bg-white py-2 text-center font-black text-slate-700 rounded-lg shadow-sm border border-slate-200 text-sm">' + cat.name + '</div>';
        boardHtml += `<div id="party-list-container-${cat.id}" class="flex flex-col gap-2.5 flex-grow pb-2">`;
        
        const catParties = window.partyData.filter(p => p.cat === cat.id);
        catParties.forEach(pData => {
            const diffInfo = cat.diffs.find(d => d.name === pData.diff) || {color: 'bg-slate-100 text-slate-700 border-slate-300', level: pData.level};
            const completedCls = pData.isCleared ? 'party-completed' : '';
            const checkedAttr = pData.isCleared ? 'checked' : '';
            
            boardHtml += `<div id="party-box-${pData.id}" onclick="toggleHighlight(event, '${pData.id}')" class="party-box-element glass-panel p-2 xl:p-2.5 transition-all relative group cursor-pointer ${completedCls}">`;
            
            boardHtml += `<div class="flex justify-between items-start mb-2.5 border-b border-slate-100 pb-2 cursor-move" draggable="true" ondragstart="dragStartPartyBox(event, '${pData.id}', '${cat.id}')" ondragover="allowDropPartyBox(event)" ondrop="dropPartyBox(event, '${pData.id}', '${cat.id}')">`;
            
            boardHtml += `<div class="flex items-center gap-1.5"><button onclick="openDiffDropdown(event, '${pData.id}', '${cat.id}')" class="text-[10px] font-bold px-1.5 py-0.5 rounded ${diffInfo.color} hover:brightness-95 hover:shadow-md transition flex items-center gap-1 cursor-pointer pointer-events-auto" title="난이도 변경">${pData.diff} <span class="text-[7px] opacity-60">▼</span></button></div>`;
            
            boardHtml += '<div class="flex items-center gap-1.5"><span class="text-[10px] text-slate-400 font-bold pointer-events-none">Lv.' + pData.level + '</span>';
            boardHtml += '<label class="flex items-center cursor-pointer pointer-events-auto" onclick="event.stopPropagation()"><input type="checkbox" class="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" ' + checkedAttr + ' onchange="togglePartyCleared(\'' + pData.id + '\')"></label>';
            boardHtml += '<div class="flex items-center gap-1 ml-0.5 pl-1.5 border-l border-slate-200 pointer-events-auto" onclick="event.stopPropagation()">';
            boardHtml += `<button onclick="clearPartySlots('${pData.id}')" class="text-blue-500 bg-blue-50 hover:bg-blue-100 p-1 rounded transition text-xs shadow-sm" title="파티 비우기">🔄</button>`;
            boardHtml += `<button onclick="deleteParty('${pData.id}')" class="text-red-500 bg-red-50 hover:bg-red-100 p-1 rounded transition text-xs shadow-sm" title="파티 삭제">❌</button>`;
            boardHtml += '</div></div></div>';
            
            boardHtml += '<div class="grid grid-cols-1 gap-1.5">';
            
            if (!pData.slots) pData.slots = ["", "", "", ""];
            while (pData.slots.length < 4) pData.slots.push("");

            for (let i = 0; i < 4; i++) {
                const slotCharId = pData.slots[i];
                const char = (slotCharId && slotCharId !== "") ? window.charactersData.find(c => c.dbId === slotCharId) : null;
                
                if (char) {
                    const pColor = getPlayerColor(char.player);
                    const isSupp = supporters.includes(char.name);
                    
                    boardHtml += `<div class="party-slot-element flex items-center justify-between p-1.5 rounded border ${pColor.border} ${pColor.bg} shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition" `;
                    boardHtml += `data-char-id="${char.dbId}" `;
                    boardHtml += `onclick="openDropdown(event, '${pData.id}', ${i})" `;
                    boardHtml += `draggable="true" ondragstart="dragStartFromSlot(event, '${char.dbId}', '${pData.id}', ${i})" `;
                    boardHtml += `ondragover="allowDrop(event)" ondragleave="dragLeave(event)" ondrop="drop(event, '${pData.id}', ${i})">`;
                    boardHtml += '<div class="flex items-center gap-1.5 truncate pointer-events-none">';
                    boardHtml += `<span class="text-[9px] font-bold ${pColor.label} ${pColor.text} px-1.5 py-0.5 rounded leading-none flex-shrink-0">${char.player}</span>`;
                    boardHtml += `<span class="text-[12px] font-black text-slate-800 tracking-wide truncate">${(isSupp ? '<span class="text-yellow-500 mr-0.5 text-[10px]">✨</span>' : '')}${char.name}</span></div>`;
                    boardHtml += `<div class="flex items-center gap-1 flex-shrink-0"><span class="text-[9px] text-slate-400 font-medium pointer-events-none">${char.level}</span>`;
                    boardHtml += `<button onclick="removeCharacterFromSlot(event, '${pData.id}', ${i})" class="text-slate-400 hover:text-red-500 font-bold transition px-1 text-[10px] cursor-pointer">✕</button></div></div>`;
                } else {
                    if (slotCharId) pData.slots[i] = "";
                    boardHtml += `<div class="slot-droppable rounded p-1.5 text-center text-[10px] font-bold text-slate-400 cursor-pointer hover:bg-slate-50 transition flex items-center justify-center gap-1 h-[34px]" ondragover="allowDrop(event)" ondragleave="dragLeave(event)" ondrop="drop(event, '${pData.id}', ${i})" onclick="openDropdown(event, '${pData.id}', ${i})"><span>+</span> 빈자리</div>`;
                }
            }
            boardHtml += '</div></div>';
        });

        let diffButtons = '';
        cat.diffs.forEach(d => {
            diffButtons += `<button onclick="addParty('${cat.id}', '${d.name}', ${d.level})" class="px-2 py-1 text-[10px] font-bold rounded ${d.color} hover:brightness-95 shadow-sm transition">${d.name}</button>`;
        });
        
        boardHtml += '</div>';
        boardHtml += '<div class="group relative w-full mt-auto pt-1"><button class="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-bold hover:bg-white hover:text-slate-600 hover:border-slate-400 hover:shadow-sm transition bg-white/40">+ 파티 추가</button>';
        boardHtml += '<div class="hidden group-hover:flex absolute bottom-full left-0 w-full pb-1 z-20"><div class="bg-white border border-slate-200 shadow-xl rounded-lg p-1.5 gap-1 flex-wrap justify-center flex w-full">';
        boardHtml += diffButtons;
        boardHtml += '</div></div></div></div>';
    });
    
    boardHtml += '</div>';
    mainContent += rosterHtml + boardHtml + '</div>';
    container.innerHTML = filterHtml + mainContent;

    setTimeout(() => { if(typeof window.updateHighlightDOM === 'function') window.updateHighlightDOM(); }, 0);
};

window.handleRosterClick = function(charId) {
    if (window.activeHighlightPartyId) {
        const party = window.partyData.find(p => p.id === window.activeHighlightPartyId);
        const char = window.charactersData.find(c => c.dbId === charId);
        if (!party || !char) return;

        if (!window.isCharEligibleForParty(char, party)) {
            window.showToast('배정 조건을 만족하지 않습니다. (레벨 부족 또는 플레이어 중복)', 'warning');
            return;
        }

        if (!party.slots) party.slots = ["", "", "", ""];
        const emptyIdx = party.slots.findIndex(s => s === "" || s === null);
        if (emptyIdx === -1) {
            window.showToast('파티에 빈자리가 없습니다.', 'warning');
            return;
        }

        window.assignCharacterToSlot(charId, party.id, emptyIdx);
    } else {
        if (window.activeHighlightCharId === charId) {
            window.activeHighlightCharId = null;
        } else {
            window.activeHighlightCharId = charId;
        }
        if(typeof window.updateHighlightDOM === 'function') window.updateHighlightDOM();
    }
};

window.addParty = function(catId, diffName, diffLevel) {
    if (!Array.isArray(window.partyData)) window.partyData = [];
    window.partyData.push({ id: 'party_' + Date.now(), cat: catId, diff: diffName, level: diffLevel, slots: ["", "", "", ""], isCleared: false });
    if(typeof window.saveToCloud === 'function') window.saveToCloud();
};

window.deleteParty = function(partyId) {
    window.partyData = window.partyData.filter(p => p.id !== partyId);
    if (window.activeHighlightPartyId === partyId) window.activeHighlightPartyId = null;
    if(typeof window.saveToCloud === 'function') window.saveToCloud();
};

window.clearPartySlots = function(partyId) {
    const party = window.partyData.find(p => p.id === partyId);
    if(party) {
        party.slots = ["", "", "", ""];
        if(typeof window.saveToCloud === 'function') window.saveToCloud();
        window.showToast('파티 슬롯을 모두 비웠습니다.');
    }
};

window.toggleCompletion = function(dbId, content) {
    const char = window.charactersData.find(c => c.dbId === dbId);
    if (!char) return;
    
    let catId = content;
    for (const cat of dungeonCategories) {
        if (content.startsWith(cat.id)) {
            catId = cat.id;
            break;
        }
    }

    if (Array.isArray(window.partyData)) {
        const clearedViaParty = window.partyData.some(p => p.cat === catId && p.isCleared && p.slots && p.slots.includes(dbId));
        if (clearedViaParty) { 
            window.showToast('파티 단위로 클리어 된 내역이 있어 개별 상태를 변경할 수 없습니다.', 'warning'); 
            return; 
        }
    }
    
    let completed = char.completed ? [...char.completed] : [];
    const existingIdx = completed.findIndex(c => c.startsWith(catId));
    
    if (existingIdx > -1) {
        const existingContent = completed[existingIdx];
        completed.splice(existingIdx, 1);
        if (existingContent !== content) {
            completed.push(content);
        }
    } else {
        completed.push(content);
    }
    
    char.completed = completed;
    if(typeof window.saveToCloud === 'function') window.saveToCloud();
};

window.dragStart = function(e, charId) { 
    e.dataTransfer.effectAllowed = 'copyMove'; 
    e.dataTransfer.setData('text/plain', JSON.stringify({ charId: charId })); 
    window.closeDropdown(); 
};

window.dragStartFromSlot = function(e, charId, partyId, slotIndex) {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', JSON.stringify({ charId: charId, sourcePartyId: partyId, sourceSlotIndex: slotIndex }));
    window.closeDropdown();
};

window.allowDrop = function(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
window.dragLeave = function(e) { e.currentTarget.classList.remove('drag-over'); };

window.drop = function(e, partyId, slotIndex) {
    e.preventDefault(); 
    e.currentTarget.classList.remove('drag-over');
    let dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) dataStr = e.dataTransfer.getData('Text'); 
    if (dataStr) {
        try {
            let data = JSON.parse(dataStr);
            if (data.charId) window.assignCharacterToSlot(data.charId, partyId, slotIndex, data.sourcePartyId, data.sourceSlotIndex);
        } catch(err) { window.assignCharacterToSlot(dataStr, partyId, slotIndex); }
    } else { window.showToast('데이터를 가져오지 못했습니다. 클릭하여 추가해 보세요.', 'warning'); }
};

window.assignCharacterToSlot = function(charId, targetPartyId, targetSlotIndex, sourcePartyId, sourceSlotIndex) {
    const char = window.charactersData.find(c => c.dbId === charId);
    const targetParty = window.partyData.find(p => p.id === targetPartyId);
    if (!char || !targetParty) return;

    if (char.level < targetParty.level) { window.showToast(`입장 레벨이 부족합니다. (${char.level}/${targetParty.level})`, 'warning'); return; }

    if (!targetParty.slots) targetParty.slots = ["", "", "", ""];
    const targetSlotCharId = targetParty.slots[targetSlotIndex];

    if (charId === targetSlotCharId) return;

    const isPlayerAlreadyInParty = targetParty.slots.some((sId, idx) => {
        if(!sId || idx === targetSlotIndex) return false;
        if(sourcePartyId === targetPartyId && idx === sourceSlotIndex) return false;
        const c = window.charactersData.find(x => x.dbId === sId);
        return c && c.player === char.player;
    });
    if (isPlayerAlreadyInParty) { window.showToast(`한 파티에 동일한 플레이어(${char.player})가 2명 들어갈 수 없습니다.`, 'warning'); return; }

    const existingParty = window.partyData.find(p => p.cat === targetParty.cat && p.id !== targetParty.id && p.slots && p.slots.includes(charId));
    if (existingParty && existingParty.id !== sourcePartyId) { window.showToast(`해당 캐릭터(${char.name})는 이미 다른 ${targetParty.cat} 파티에 참여 중입니다.`, 'warning'); return; }

    let sourceParty = null;
    if (sourcePartyId !== undefined && sourcePartyId !== null) sourceParty = window.partyData.find(p => p.id === sourcePartyId);
    else {
        const existingIndex = targetParty.slots.indexOf(charId);
        if (existingIndex > -1) targetParty.slots[existingIndex] = "";
    }

    if (sourceParty && sourceSlotIndex !== undefined) {
        if (targetSlotCharId) {
            const targetChar = window.charactersData.find(c => c.dbId === targetSlotCharId);
            let canSwap = false;
            if (targetChar && targetChar.level >= sourceParty.level) {
                const isTargetPlayerInSource = sourceParty.slots.some((sId, idx) => {
                    if(!sId || idx === sourceSlotIndex) return false;
                    if(sourcePartyId === targetPartyId && idx === targetSlotIndex) return false;
                    const c = window.charactersData.find(x => x.dbId === sId);
                    return c && c.player === targetChar.player;
                });
                if (!isTargetPlayerInSource) canSwap = true;
            }
            if (canSwap) sourceParty.slots[sourceSlotIndex] = targetSlotCharId;
            else sourceParty.slots[sourceSlotIndex] = "";
        } else { sourceParty.slots[sourceSlotIndex] = ""; }
    }

    targetParty.slots[targetSlotIndex] = charId;
    if(typeof window.saveToCloud === 'function') window.saveToCloud();
};

window.removeCharacterFromSlot = function(e, partyId, slotIndex) {
    e.stopPropagation(); 
    const party = window.partyData.find(p => p.id === partyId);
    if(party && party.slots) party.slots[slotIndex] = "";
    if(typeof window.saveToCloud === 'function') window.saveToCloud();
    window.closeDropdown();
};

window.togglePartyCleared = function(partyId) {
    const party = window.partyData.find(p => p.id === partyId);
    if(party) party.isCleared = !party.isCleared;
    if(typeof window.saveToCloud === 'function') window.saveToCloud();
};

let currentDropdownTarget = null;
window.openDropdown = function(e, partyId, slotIndex) {
    e.stopPropagation();
    const party = window.partyData.find(p => p.id === partyId);
    if(!party) return;
    
    if (window.activeHighlightCharId) {
        const char = window.charactersData.find(c => c.dbId === window.activeHighlightCharId);
        if (char) {
            if (party.slots && party.slots[slotIndex] === char.dbId) {
                window.activeHighlightCharId = null;
                if(typeof window.updateHighlightDOM === 'function') window.updateHighlightDOM();
                return;
            }

            if (!window.isCharEligibleForParty(char, party)) {
                window.showToast('배정 조건을 만족하지 않습니다. (레벨 부족, 플레이어 중복 또는 이미 배정됨)', 'warning');
                return; 
            }
            
            window.assignCharacterToSlot(char.dbId, partyId, slotIndex);
            return; 
        }
    }

    window.activeHighlightCharId = null; 
    window.activeHighlightPartyId = partyId;
    if(typeof window.updateHighlightDOM === 'function') window.updateHighlightDOM();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const menu = document.getElementById('dropdown-menu');
    const list = document.getElementById('dropdown-list');
    const header = document.getElementById('dropdown-header');
    
    if(header) header.innerText = '캐릭터 배정';
    list.innerHTML = '';
    currentDropdownTarget = { partyId, slotIndex };

    let availableChars = window.charactersData.filter(char => {
        if (char.level < party.level) return false;
        const inThisPartyOtherSlot = party.slots.some((sId, idx) => sId === char.dbId && idx !== slotIndex);
        if (inThisPartyOtherSlot) return false;
        if (party.slots[slotIndex] === char.dbId) return false;
        const inOtherParty = window.partyData.some(p => p.cat === party.cat && p.id !== party.id && p.slots && p.slots.includes(char.dbId));
        if (inOtherParty) return false;
        const playerInThisParty = party.slots.some((sId, idx) => {
            if (!sId || idx === slotIndex) return false;
            const c = window.charactersData.find(x => x.dbId === sId);
            return c && c.player === char.player;
        });
        if (playerInThisParty) return false;
        return true;
    });
    
    availableChars.sort((a,b) => b.level - a.level);

    if (availableChars.length === 0) {
        list.innerHTML = '<li class="px-4 py-3 text-xs text-slate-400 text-center">배정 가능한<br>캐릭터가 없습니다.</li>';
    } else {
        availableChars.forEach(char => {
            const pColor = getPlayerColor(char.player);
            const isSupp = supporters.includes(char.name);
            const li = document.createElement('li');
            li.className = "px-3 py-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition";
            li.innerHTML = '<div class="flex items-center gap-1.5"><span class="text-[10px] font-bold ' + pColor.label + ' ' + pColor.text + ' px-1.5 py-0.5 rounded">' + char.player + '</span><span class="text-xs font-bold text-slate-700">' + (isSupp ? '✨' : '') + char.name + '</span></div><span class="text-[10px] text-slate-400 font-medium ml-2">Lv.' + char.level + '</span>';
            li.onclick = () => { window.assignCharacterToSlot(char.dbId, partyId, slotIndex); window.closeDropdown(); };
            list.appendChild(li);
        });
    }

    menu.style.display = 'block'; 
    let topPos = rect.bottom + 5; 
    let leftPos = rect.left;
    
    if (topPos + menu.offsetHeight > window.innerHeight) {
        topPos = rect.top - menu.offsetHeight - 5;
    }
    if (leftPos + menu.offsetWidth > window.innerWidth) {
        leftPos = window.innerWidth - menu.offsetWidth - 10;
    }
    menu.style.top = topPos + 'px'; 
    menu.style.left = leftPos + 'px';
};

window.openDiffDropdown = function(e, partyId, catId) {
    e.stopPropagation();
    
    window.activeHighlightCharId = null;
    window.activeHighlightPartyId = partyId;
    if(typeof window.updateHighlightDOM === 'function') window.updateHighlightDOM();
    
    const party = window.partyData.find(p => p.id === partyId);
    if(!party) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const menu = document.getElementById('dropdown-menu');
    const list = document.getElementById('dropdown-list');
    const header = document.getElementById('dropdown-header');
    
    if(header) header.innerText = '난이도 변경';
    list.innerHTML = '';
    currentDropdownTarget = { partyId, type: 'diff' };

    const cat = partyDungeonCategories.find(c => c.id === catId);
    if(!cat) return;

    cat.diffs.forEach(d => {
        const li = document.createElement('li');
        li.className = "px-3 py-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition";
        
        const isCurrent = party.diff === d.name;
        const checkIcon = isCurrent ? '<span class="text-blue-500 text-[10px] mr-1">✔️</span>' : '<span class="w-[14px] inline-block mr-1"></span>';
        
        li.innerHTML = `<div class="flex items-center">${checkIcon}<span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${d.color}">${d.name}</span></div><span class="text-[10px] text-slate-400 font-medium ml-2">Lv.${d.level}</span>`;
        li.onclick = () => { window.changePartyDifficulty(partyId, d.name, d.level); window.closeDropdown(); };
        list.appendChild(li);
    });

    menu.style.display = 'block'; 
    let topPos = rect.bottom + 5; 
    let leftPos = rect.left;
    
    if (topPos + menu.offsetHeight > window.innerHeight) {
        topPos = rect.top - menu.offsetHeight - 5;
    }
    if (leftPos + menu.offsetWidth > window.innerWidth) {
        leftPos = window.innerWidth - menu.offsetWidth - 10;
    }
    menu.style.top = topPos + 'px'; 
    menu.style.left = leftPos + 'px';
};

window.changePartyDifficulty = function(partyId, newDiff, newLevel) {
    const party = window.partyData.find(p => p.id === partyId);
    if(party) {
        party.diff = newDiff;
        party.level = newLevel;
        
        let removed = false;
        if(party.slots) {
            party.slots.forEach((sId, idx) => {
                if(sId) {
                    const c = window.charactersData.find(char => char.dbId === sId);
                    if(c && c.level < newLevel) {
                        party.slots[idx] = "";
                        removed = true;
                    }
                }
            });
        }

        if(typeof window.saveToCloud === 'function') window.saveToCloud();
        window.renderDashboard();
        if (removed) window.showToast('입장 레벨이 부족한 캐릭터가 파티에서 자동 제외되었습니다.', 'warning');
        else window.showToast('파티 난이도가 변경되었습니다.');
    }
};

window.closeDropdown = function() { document.getElementById('dropdown-menu').style.display = 'none'; currentDropdownTarget = null; };

document.addEventListener('click', (e) => { 
    if (!e.target.closest('#dropdown-menu')) window.closeDropdown(); 
    
    let needsUpdate = false;
    
    if (window.activeHighlightPartyId && !e.target.closest('.party-box-element') && !e.target.closest('.roster-char-element') && !e.target.closest('#dropdown-menu')) {
        window.activeHighlightPartyId = null;
        needsUpdate = true;
    }
    
    if (window.activeHighlightCharId && !e.target.closest('.roster-char-element') && !e.target.closest('.party-slot-element')) {
        window.activeHighlightCharId = null;
        needsUpdate = true;
    }

    if(needsUpdate && typeof window.updateHighlightDOM === 'function') window.updateHighlightDOM();
});

window.toggleFilter = function(categoryId) {
    if (window.selectedCategories.has(categoryId)) window.selectedCategories.delete(categoryId);
    else window.selectedCategories.add(categoryId);
    window.renderFilterResults();
}

window.renderFilters = function() {
    const container = document.getElementById('filter-checkboxes');
    if(!container) return; container.innerHTML = '';
    dungeonCategories.forEach(category => {
        const label = document.createElement('label'); label.className = "cursor-pointer";
        label.innerHTML = `<input type="checkbox" class="checkbox-custom sr-only" value="${category.id}" onchange="toggleFilter('${category.id}')"><div class="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-600 transition-colors text-xs md:text-sm font-bold shadow-sm bg-white">${category.label}</div>`;
        container.appendChild(label);
    });
}

window.renderFilterResults = function() {
    const container = document.getElementById('filter-results');
    if(!container) return; container.innerHTML = ''; 
    if (window.selectedCategories.size === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 py-8 glass-panel text-sm font-medium">던전을 체크하시면 난이도별로 그룹화되어 나타납니다.</div>';
        return;
    }
    const allPlayers = [...new Set(window.charactersData.map(c => c.player))];
    dungeonCategories.forEach(category => {
        if (!window.selectedCategories.has(category.id)) return;
        let totalCharsInCategory = 0;
        let html = '<div class="glass-panel p-3 md:p-4 mb-6 border-l-4 border-l-blue-500 shadow-sm bg-white"><div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-3"><h3 class="text-base md:text-lg font-black text-slate-800 flex items-center gap-1.5"><span>🚩</span> ' + category.label + '</h3><span id="badge-' + category.id + '" class="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200"></span></div><div class="flex flex-col lg:flex-row gap-3 overflow-x-auto pb-2">';
        category.diffs.forEach(diff => {
            const charsInDiff = window.charactersData.filter(char => char.contents && char.contents.includes(diff));
            totalCharsInCategory += charsInDiff.length;
            const gridColsClass = allPlayers.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-' + (allPlayers.length || 1);
            const isSingleGroup = diff.includes('싱글');
            const borderClass = isSingleGroup ? 'border-slate-300 border-dashed border-[2px]' : 'border-slate-200 border';
            const singleLabel = isSingleGroup ? '<span class="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] ml-1 font-bold">👤 솔로</span>' : '';
            html += '<div class="flex-1 min-w-[280px] bg-slate-50 ' + borderClass + ' rounded-lg shadow-inner flex flex-col h-full"><div class="w-full text-center py-1.5 font-bold border-b ' + getDiffStyle(diff) + ' text-xs flex justify-center items-center gap-1 tracking-wide rounded-t-lg">' + diff + ' ' + singleLabel + ' <span class="bg-slate-800/20 px-1.5 rounded-sm text-[9px] text-slate-800">' + charsInDiff.length + '</span></div><div class="p-2 grid ' + gridColsClass + ' gap-1.5 flex-grow">';
            allPlayers.forEach(player => {
                const playerChars = charsInDiff.filter(char => char.player === player);
                playerChars.sort((a, b) => {
                    const aCleared = window.isCharClearedDungeon(a, diff) ? 1 : 0;
                    const bCleared = window.isCharClearedDungeon(b, diff) ? 1 : 0;
                    if (aCleared !== bCleared) return aCleared - bCleared;
                    return b.level - a.level;
                });
                const pColor = getPlayerColor(player);
                html += '<div class="flex flex-col gap-1.5 bg-white p-1.5 rounded border border-slate-200 shadow-sm h-full"><div class="text-center font-bold py-0.5 rounded ' + pColor.label + ' ' + pColor.text + ' shadow-sm text-[10px] tracking-widest">' + player + '</div><div class="flex flex-col gap-1 flex-grow">';
                if (playerChars.length === 0) { html += '<div class="flex-1 flex items-center justify-center min-h-[30px] bg-slate-50 rounded border border-slate-200 border-dashed"><span class="text-[9px] text-slate-400 font-medium">없음</span></div>'; } 
                else {
                    playerChars.forEach(char => {
                        const isSupp = supporters.includes(char.name);
                        const isCompleted = window.isCharClearedDungeon(char, diff);
                        let cardClass = isSupp ? 'supporter-glow border-slate-200' : 'bg-white border-slate-200';
                        let opacityClass = isCompleted ? 'opacity-40 grayscale bg-slate-100' : '';
                        let nameStyle = isCompleted ? 'text-slate-400 line-through' : 'text-slate-800';
                        let checkIcon = isCompleted ? '<span class="text-green-500 ml-0.5 text-[8px]">✔️</span>' : '';
                        html += '<div class="relative rounded p-1 border flex flex-col justify-center items-center text-center ' + cardClass + ' shadow-sm ' + opacityClass + '"><span class="font-bold text-[11px] flex items-center justify-center w-full ' + nameStyle + '">' + (isSupp ? '<span class="text-yellow-500 mr-0.5 text-[9px]">✨</span>' : '') + char.name + checkIcon + '</span><span class="text-[8px] text-slate-500 mt-0.5 font-medium leading-none">Lv.' + char.level + '</span></div>';
                    });
                }
                html += '</div></div>';
            });
            html += '</div></div>';
        });
        html += '</div></div>';
        const tempDiv = document.createElement('div'); tempDiv.innerHTML = html;
        container.appendChild(tempDiv.firstElementChild);
        document.getElementById('badge-' + category.id).innerText = '총 ' + totalCharsInCategory + '명';
    });
}

window.renderConfigFilters = function() {
    const container = document.getElementById('config-player-filters');
    if (!container) return; container.innerHTML = '<span class="text-xs font-bold text-slate-500 mr-1">👤 필터:</span>';
    const allPlayers = [...new Set(window.charactersData.map(c => c.player))];
    const isAll = window.configSelectedPlayers.size === 0;
    const allBtn = document.createElement('button');
    allBtn.className = 'px-3 py-1 rounded-full text-xs font-bold border transition ' + (isAll ? 'bg-slate-600 text-white border-transparent' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-100');
    allBtn.innerText = '전체';
    allBtn.onclick = () => { window.configSelectedPlayers.clear(); window.renderConfigTable(); window.renderConfigFilters(); };
    container.appendChild(allBtn);
    allPlayers.forEach(player => {
        const pColor = getPlayerColor(player);
        const isActive = window.configSelectedPlayers.has(player);
        const btn = document.createElement('button');
        btn.className = 'px-3 py-1 rounded-full text-xs font-bold border transition ' + (isActive ? pColor.header + ' text-white border-transparent' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-100');
        btn.innerText = player;
        btn.onclick = () => {
            if (window.configSelectedPlayers.has(player)) window.configSelectedPlayers.delete(player);
            else window.configSelectedPlayers.add(player);
            window.renderConfigTable(); window.renderConfigFilters();
        };
        container.appendChild(btn);
    });
}

window.renderConfigTable = function() {
    const tbody = document.getElementById('config-table-body');
    if(!tbody) return; tbody.innerHTML = '';
    const allPlayers = [...new Set(window.charactersData.map(c => c.player))];
    const filteredPlayers = window.configSelectedPlayers.size > 0 ? allPlayers.filter(p => window.configSelectedPlayers.has(p)) : allPlayers;
    filteredPlayers.forEach((player) => {
        const playerChars = window.charactersData.filter(c => c.player === player).sort((a,b) => b.level - a.level);
        if(playerChars.length === 0) return;
        const pColor = getPlayerColor(player);
        playerChars.forEach((char, cIndex) => {
            const sortedContents = (char.contents || []).sort((a, b) => globalDungeonOrder.indexOf(a) - globalDungeonOrder.indexOf(b));
            let rowBorder = cIndex === 0 ? 'border-t-[3px] ' + pColor.border : 'border-t border-slate-100'; 
            let rowHtml = '<tr class="hover:bg-slate-50 transition ' + rowBorder + '">';
            rowHtml += '<td class="px-3 py-2 font-bold ' + pColor.text + '">' + (cIndex === 0 ? char.player : '') + '</td>';
            rowHtml += '<td class="px-3 py-2 text-slate-800 font-bold">' + (supporters.includes(char.name) ? '✨ ' : '') + char.name + '</td>';
            rowHtml += '<td class="px-3 py-2 text-slate-500">' + char.level + '</td>';
            rowHtml += '<td class="px-3 py-2 text-[10px] text-slate-400 whitespace-normal min-w-[150px] leading-tight">' + sortedContents.join(', ') + '</td>';
            rowHtml += `<td class="px-3 py-2 text-center flex gap-1 justify-center"><button onclick="startEdit('${char.dbId}')" class="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition">수정</button><button onclick="requestDelete('${char.dbId}', this)" class="text-red-500 bg-red-50 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition">삭제</button></td></tr>`;
            tbody.innerHTML += rowHtml;
        });
    });
}

window.addCharacter = function(event) {
    event.preventDefault();
    const player = document.getElementById('add-player').value.trim();
    const name = document.getElementById('add-name').value.trim();
    const level = parseInt(document.getElementById('add-level').value);
    if(!player || !name || !level) return;
    const autoContents = window.calculateContents(level); 
    if (window.editingDbId) {
        const existingChar = window.charactersData.find(c => c.dbId === window.editingDbId);
        existingChar.player = player; existingChar.name = name; existingChar.level = level; existingChar.contents = autoContents;
        window.cancelEdit(); window.showToast('캐릭터 정보가 수정되었습니다.');
    } else {
        const newId = 'char_' + Date.now().toString();
        window.charactersData.push({ dbId: newId, player, name, level, contents: autoContents, completed: [], timestamp: Date.now() });
        document.getElementById('add-char-form').reset();
        window.showToast('새 캐릭터가 등록되었습니다.');
    }
    if(typeof window.saveToCloud === 'function') window.saveToCloud();
};

window.startEdit = function(dbId) {
    const char = window.charactersData.find(c => c.dbId === dbId);
    if(!char) return;
    document.getElementById('add-player').value = char.player;
    document.getElementById('add-name').value = char.name;
    document.getElementById('add-level').value = char.level;
    window.editingDbId = dbId; 
    document.getElementById('submit-btn').innerText = "수정 반영";
    document.getElementById('submit-btn').className = "w-20 shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded text-sm transition shadow-sm";
    document.getElementById('cancel-edit-btn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelEdit = function() {
    window.editingDbId = null;
    document.getElementById('add-char-form').reset();
    document.getElementById('submit-btn').innerText = "등록";
    document.getElementById('submit-btn').className = "w-20 shrink-0 bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 rounded text-sm transition shadow-sm";
    document.getElementById('cancel-edit-btn').classList.add('hidden');
};

window.requestDelete = function(dbId, btnElement) {
    if (btnElement.innerText === "정말?") {
        window.charactersData = window.charactersData.filter(c => c.dbId !== dbId);
        if(Array.isArray(window.partyData)) { window.partyData.forEach(p => { if(p.slots) p.slots = p.slots.map(sId => sId === dbId ? "" : sId); }); }
        if(typeof window.saveToCloud === 'function') window.saveToCloud();
        window.showToast('캐릭터가 삭제되었습니다.', 'warning');
    } else {
        btnElement.innerText = "정말?"; btnElement.className = "text-white bg-red-600 px-2 py-1 rounded text-[10px] font-bold transition";
        setTimeout(() => { if (btnElement && btnElement.innerText === "정말?") { btnElement.innerText = "삭제"; btnElement.className = "text-red-500 bg-red-50 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition"; } }, 3000);
    }
};

window.requestReset = function(btnElement) {
    if (btnElement.innerText === "확인") {
        window.charactersData = []; window.cpmData = { inputs: {}, records: [] }; window.partyData = [];
        if(typeof window.saveToCloud === 'function') window.saveToCloud();
        btnElement.innerText = "데이터 완전 초기화"; btnElement.className = "text-[11px] bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded border border-red-200 transition font-bold shadow-sm";
        window.showToast('모든 데이터가 초기화되었습니다.');
    } else {
        btnElement.innerText = "확인"; btnElement.className = "text-[11px] bg-red-600 text-white px-3 py-1.5 rounded transition font-bold shadow-sm";
        setTimeout(() => { if (btnElement.innerText === "확인") { btnElement.innerText = "데이터 완전 초기화"; btnElement.className = "text-[11px] bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded border border-red-200 transition font-bold shadow-sm"; } }, 3500);
    }
};

window.runCpmCalculation = function() {
    const min = parseInt(document.getElementById('cpm-min').value) || 0; const sec = parseInt(document.getElementById('cpm-sec').value) || 0; const casts = parseInt(document.getElementById('cpm-casts').value) || 0;
    const target = parseFloat(document.getElementById('cpm-target').value) || 0; const scarecrow = parseFloat(document.getElementById('cpm-scarecrow').value) || 0; const exclude = parseInt(document.getElementById('cpm-exclude').value) || 0;
    if ((min === 0 && sec === 0) || casts === 0) { window.showToast('전투 시간과 시전 횟수를 정확히 입력해주세요.', 'warning'); return; }
    const totalOriginalSec = (min * 60) + sec; const totalSec = totalOriginalSec - exclude;
    if (totalSec <= 0) { window.showToast('제외 시간이 전투 시간보다 길거나 같습니다.', 'warning'); return; }
    const cpm = (casts * 60) / totalSec; const interval = totalSec / casts; const castsPer30s = cpm / 2; const impact = 60 / totalSec;

    document.getElementById('res-current-cpm').innerText = cpm.toFixed(2); document.getElementById('res-interval').innerText = interval.toFixed(2);
    let timeStr = min + '분 ' + sec + '초' + (exclude > 0 ? ` (총 ${totalOriginalSec}초 - 보정 ${exclude}초 = ${totalSec}초)` : ` (${totalSec}초)`);
    document.getElementById('res-time-str').innerText = timeStr; document.getElementById('res-casts').innerText = casts + '회'; document.getElementById('res-formula').innerText = casts + ' × 60 ÷ ' + totalSec + ' = ' + cpm.toFixed(2);
    document.getElementById('res-30s').innerText = '약 ' + castsPer30s.toFixed(2) + '회'; document.getElementById('res-interval-text').innerText = '약 ' + interval.toFixed(2) + '초마다 1회'; document.getElementById('res-impact').innerText = '약 ' + impact.toFixed(3) + ' CPM';

    if (target > 0) {
        const requiredCasts = Math.ceil((target * totalSec) / 60); const realAchievementRate = (cpm / target) * 100;
        let barColorClass = realAchievementRate <= 30 ? "bg-red-500" : realAchievementRate <= 70 ? "bg-blue-500" : realAchievementRate <= 94 ? "bg-purple-500" : "bg-orange-500";
        let textColorClass = realAchievementRate <= 30 ? "text-red-500" : realAchievementRate <= 70 ? "text-blue-500" : realAchievementRate <= 94 ? "text-purple-500" : "text-orange-500";

        const bar = document.getElementById('res-target-bar'); bar.className = 'h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm ' + barColorClass;
        setTimeout(() => { bar.style.width = Math.min(realAchievementRate, 100) + '%'; }, 50); 
        document.getElementById('res-target-percent-text').innerText = realAchievementRate.toFixed(1) + '%'; document.getElementById('res-target-percent-text').className = 'text-[13px] font-bold ' + textColorClass;
        
        const msgEl = document.getElementById('res-target-msg'); const badgeSuccess = document.getElementById('target-success-badge');
        if(casts >= requiredCasts) { msgEl.innerHTML = '<span class="text-slate-700">설정한 목표 CPM을 달성했습니다.</span><br><span class="text-[10px] text-slate-400">같은 조건의 전투 기록을 반복해서 비교하면 일시적인 고점인지 안정적으로 유지되는 수치인지 확인하기 좋습니다.</span>'; badgeSuccess.classList.remove('hidden'); }
        else { msgEl.innerText = '목표 달성까지 ' + (requiredCasts - casts) + '회 부족합니다.'; badgeSuccess.classList.add('hidden'); }
        document.getElementById('target-progress-section').classList.remove('hidden'); document.getElementById('res-target-val').innerText = target; document.getElementById('res-target-min-casts').innerText = requiredCasts + '회';
        
        const extraEl = document.getElementById('res-target-extra');
        if(casts >= requiredCasts) { extraEl.innerText = "추가 시전 없이 목표 달성"; extraEl.className = "text-slate-700"; }
        else { extraEl.innerText = (requiredCasts - casts) + '회 추가 필요'; extraEl.className = "text-red-500 font-bold"; }

        document.getElementById('res-target-rate').innerText = realAchievementRate.toFixed(1) + '%'; document.getElementById('res-target-rate').className = 'font-bold ' + textColorClass;
        ['row-target-val', 'row-target-min-casts', 'row-target-extra', 'row-target-rate'].forEach(id => document.getElementById(id).classList.remove('hidden'));
    } else {
        document.getElementById('target-progress-section').classList.add('hidden'); document.getElementById('target-success-badge').classList.add('hidden');
        ['row-target-val', 'row-target-min-casts', 'row-target-extra', 'row-target-rate'].forEach(id => document.getElementById(id).classList.add('hidden'));
    }

    if (scarecrow > 0) {
        const efficiency = (cpm / scarecrow) * 100;
        document.getElementById('res-scarecrow-cpm').innerText = scarecrow.toFixed(2); document.getElementById('res-efficiency').innerText = efficiency.toFixed(1) + '%';
        document.getElementById('row-scarecrow').classList.remove('hidden'); document.getElementById('row-efficiency').classList.remove('hidden');
    } else { document.getElementById('row-scarecrow').classList.add('hidden'); document.getElementById('row-efficiency').classList.add('hidden'); }

    const tbody = document.getElementById('res-variance-body'); tbody.innerHTML = '';
    for (let i = -2; i <= 2; i++) {
        const vCasts = casts + i; if (vCasts <= 0) continue;
        const vCpm = (vCasts * 60) / totalSec;
        let label = i > 0 ? '+' + i + '회' : i + '회'; let trClass = "border-b border-slate-200 last:border-0"; let valClass = "";
        if (i === 0) { label = "현재"; trClass = "bg-blue-50 font-bold border-b border-slate-200"; valClass = "text-blue-600"; }
        else if (i < 0) { valClass = "text-red-500"; } else { valClass = "text-green-600"; }
        tbody.innerHTML += '<tr class="' + trClass + '"><td class="py-2 ' + valClass + '">' + label + '</td><td class="py-2">' + vCasts + '회</td><td class="py-2">' + (i===0 ? '-' : vCpm.toFixed(2)) + '</td></tr>';
    }
    document.getElementById('cpm-result-area').classList.remove('hidden');
};

window.resetCpmForm = function() {
    ['cpm-record-name', 'cpm-skill-name', 'cpm-min', 'cpm-sec', 'cpm-casts', 'cpm-target', 'cpm-scarecrow'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('cpm-exclude').value = '0'; document.getElementById('cpm-result-area').classList.add('hidden'); window.editingCpmId = null;
    const btnSave = document.getElementById('btn-cpm-save'); if (btnSave) { btnSave.innerHTML = '💾 현재 결과 클라우드에 저장'; btnSave.className = 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-8 rounded shadow-sm transition flex items-center gap-2 text-sm'; }
    const btnCancel = document.getElementById('btn-cpm-cancel'); if (btnCancel) btnCancel.classList.add('hidden');
};

window.saveCpmRecord = function() {
    const min = parseInt(document.getElementById('cpm-min').value) || 0; const sec = parseInt(document.getElementById('cpm-sec').value) || 0; const casts = parseInt(document.getElementById('cpm-casts').value) || 0;
    const target = document.getElementById('cpm-target').value; const scarecrow = document.getElementById('cpm-scarecrow').value; const exclude = parseInt(document.getElementById('cpm-exclude').value) || 0;
    let rName = document.getElementById('cpm-record-name').value.trim(); let sName = document.getElementById('cpm-skill-name').value.trim();
    
    if ((min === 0 && sec === 0) || casts === 0) { window.showToast('전투 시간과 시전 횟수를 정확히 입력한 후 저장해주세요.', 'warning'); return; }
    const totalSec = (min * 60) + sec - exclude; if (totalSec <= 0) return;
    const cpm = (casts * 60) / totalSec;
    if (!rName) { const d = new Date(); rName = (d.getMonth()+1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ' 기록'; }

    if (window.editingCpmId) {
        const idx = window.cpmData.records.findIndex(r => r.id === window.editingCpmId);
        if (idx > -1) { window.cpmData.records[idx] = { ...window.cpmData.records[idx], recordName: rName, skillName: sName, min, sec, casts, target, scarecrow, exclude, cpm: cpm.toFixed(2) }; window.showToast(`'${rName}' 기록이 수정되었습니다.`); }
        window.resetCpmForm();
    } else {
        const newRecord = { id: 'cpm_rec_' + Date.now(), recordName: rName, skillName: sName, min, sec, casts, target, scarecrow, exclude, cpm: cpm.toFixed(2), timestamp: Date.now() };
        window.cpmData.records.unshift(newRecord); window.showToast(`'${rName}'(으)로 기록이 저장되었습니다.`);
    }
    if(typeof window.saveToCloud === 'function') window.saveToCloud();
};

window.renderCpmRecords = function() {
    const container = document.getElementById('cpm-records-container'); const countEl = document.getElementById('cpm-record-count');
    if(!container) return; countEl.innerText = window.cpmData.records.length + '개';
    if (window.cpmData.records.length === 0) { container.innerHTML = '<div class="flex flex-col items-center justify-center h-40 text-slate-400"><span class="text-3xl mb-2 opacity-60">📁</span><span class="text-xs">저장된 기록이 없습니다.</span></div>'; return; }

    let html = '';
    window.cpmData.records.forEach(r => {
        const skillHtml = r.skillName ? `<span class="text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]">${r.skillName}</span>` : '';
        let item = `<div class="bg-white border border-slate-200 hover:border-blue-400 transition-colors p-3 rounded-lg cursor-pointer group relative shadow-sm" onclick="loadCpmRecord('${r.id}')">`;
        item += `<div class="flex justify-between items-start mb-2 pr-6"><div class="flex flex-col"><span class="text-xs font-bold text-slate-800 truncate max-w-[150px]" title="${r.recordName}">${r.recordName}</span>${skillHtml}</div><div class="text-right"><span class="text-sm font-black text-yellow-500 block leading-none">${r.cpm}</span><span class="text-[8px] text-slate-400">CPM</span></div></div>`;
        item += `<div class="flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 rounded px-2 py-1.5 border border-slate-100"><span>⏱️ ${r.min}분 ${r.sec}초</span><span class="text-slate-300">|</span><span class="text-slate-600 font-bold">⚔️ ${r.casts}회</span></div>`;
        item += `<button onclick="deleteCpmRecord(event, '${r.id}', this)" class="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs">❌</button></div>`;
        html += item;
    });
    container.innerHTML = html;
};

window.loadCpmRecord = function(id) {
    const record = window.cpmData.records.find(r => r.id === id); if(!record) return;
    document.getElementById('cpm-record-name').value = record.recordName || ''; document.getElementById('cpm-skill-name').value = record.skillName || ''; document.getElementById('cpm-min').value = record.min || ''; document.getElementById('cpm-sec').value = record.sec || '';
    document.getElementById('cpm-casts').value = record.casts || ''; document.getElementById('cpm-target').value = record.target || ''; document.getElementById('cpm-scarecrow').value = record.scarecrow || ''; document.getElementById('cpm-exclude').value = record.exclude || '0';
    window.editingCpmId = id; const btnSave = document.getElementById('btn-cpm-save');
    if (btnSave) { btnSave.innerHTML = '💾 수정된 기록 덮어쓰기'; btnSave.className = 'bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-8 rounded shadow-sm transition flex items-center gap-2 text-sm'; }
    const btnCancel = document.getElementById('btn-cpm-cancel'); if (btnCancel) btnCancel.classList.remove('hidden');
    window.runCpmCalculation(); const toolTab = document.getElementById('tool-view-cpm'); if (toolTab) window.scrollTo({ top: toolTab.offsetTop - 20, behavior: 'smooth' });
};

window.deleteCpmRecord = function(e, id, btnElement) {
    e.stopPropagation();
    if (btnElement.innerText === "삭제?") {
        window.cpmData.records = window.cpmData.records.filter(r => r.id !== id); 
        if(typeof window.saveToCloud === 'function') window.saveToCloud(); 
        window.showToast('기록이 삭제되었습니다.', 'warning');
    } else {
        const orgHtml = btnElement.innerHTML; btnElement.innerText = "삭제?"; btnElement.className = "absolute top-2 right-2 bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm opacity-100 transition";
        setTimeout(() => { if (btnElement && btnElement.innerText === "삭제?") { btnElement.innerHTML = orgHtml; btnElement.className = "absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs"; } }, 3000);
    }
};

const OREHA_REQ = { normal: { w: 86, g: 45, b: 33, gold: 384, name: '하급 어비도스 융화석' }, advanced: { w: 112, g: 59, b: 43, gold: 499, name: '상급 어비도스 융화석' } };

window.setOrehaType = function(type) { window.oState.craftType = type; if(typeof window.saveToCloud === 'function') window.saveToCloud(); window.renderOrehaUI(); }
window.handleOrehaInput = function(el, field) { let raw = el.value.replace(/[^0-9]/g, ''); let num = parseInt(raw) || 0; el.value = raw ? new Intl.NumberFormat('ko-KR').format(num) : ''; window.oState.inv[field] = num; if(typeof window.saveToCloud === 'function') window.saveToCloud(); window.renderOrehaResult(); };
window.handlePriceInput = function(el, field) { let raw = el.value.replace(/[^0-9]/g, ''); let num = parseInt(raw) || 0; el.value = raw ? new Intl.NumberFormat('ko-KR').format(num) : ''; if(!window.oState.prices) window.oState.prices = {w:0, g:0, b:0, t:0, low:0, high:0}; window.oState.prices[field] = num; if(typeof window.saveToCloud === 'function') window.saveToCloud(); window.renderOrehaResult(); };
function formatNum(n) { return new Intl.NumberFormat('ko-KR').format(n); }

window.renderOrehaUI = function() {
    let typeHtml = `<button onclick="setOrehaType('normal')" class="p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1.5 ${window.oState.craftType === 'normal' ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}"><span class="font-bold text-sm">하급 융화석</span><span class="text-[10px]">흰86 / 초45 / 파33</span></button>`;
    typeHtml += `<button onclick="setOrehaType('advanced')" class="p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1.5 ${window.oState.craftType === 'advanced' ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}"><span class="font-bold text-sm">상급 융화석</span><span class="text-[10px]">흰112 / 초59 / 파43</span></button>`;
    document.getElementById('oreha-type-btns').innerHTML = typeHtml;
    
    const inv = window.oState.inv;
    let inputsHTML = `<div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-200"><label class="text-orange-600 text-xs font-bold w-20">🪵 튼튼한 목재</label><input type="text" value="${inv.t === 0 || inv.t === undefined ? '' : formatNum(inv.t)}" oninput="handleOrehaInput(this, 't')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-2 px-3 text-right text-slate-800 text-sm focus:border-orange-500 outline-none transition"></div>`;
    inputsHTML += `<div class="flex items-center justify-between gap-3"><label class="text-slate-500 text-xs font-bold w-20">⚪ 흰색 재료</label><input type="text" value="${inv.w === 0 ? '' : formatNum(inv.w)}" oninput="handleOrehaInput(this, 'w')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-2 px-3 text-right text-slate-800 text-sm focus:border-slate-500 outline-none transition"></div>`;
    inputsHTML += `<div class="flex items-center justify-between gap-3"><label class="text-green-600 text-xs font-bold w-20">🟢 초록 재료</label><input type="text" value="${inv.g === 0 ? '' : formatNum(inv.g)}" oninput="handleOrehaInput(this, 'g')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-2 px-3 text-right text-green-700 text-sm focus:border-green-500 outline-none transition"></div>`;
    inputsHTML += `<div class="flex items-center justify-between gap-3"><label class="text-blue-600 text-xs font-bold w-20">🔵 파란 재료</label><input type="text" value="${inv.b === 0 ? '' : formatNum(inv.b)}" oninput="handleOrehaInput(this, 'b')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-2 px-3 text-right text-blue-700 text-sm focus:border-blue-500 outline-none transition"></div>`;
    inputsHTML += `<div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-200"><label class="text-purple-600 text-xs font-bold w-20">🟣 가루</label><input type="text" value="${inv.p === 0 ? '' : formatNum(inv.p)}" oninput="handleOrehaInput(this, 'p')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-2 px-3 text-right text-purple-700 text-sm focus:border-purple-500 outline-none transition"></div>`;
    document.getElementById('oreha-inputs-container').innerHTML = inputsHTML;

    const p = window.oState.prices || {w:0, g:0, b:0, t:0, low:0, high:0};
    let pricesHTML = `<div><label class="text-slate-500 text-[10px] font-bold block mb-1">🪵 튼튼한목재 (100개)</label><input type="text" value="${p.t === 0 || p.t === undefined ? '' : formatNum(p.t)}" oninput="handlePriceInput(this, 't')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-1.5 px-2 text-right text-slate-800 text-sm focus:border-orange-500 outline-none transition"></div>`;
    pricesHTML += `<div><label class="text-slate-500 text-[10px] font-bold block mb-1">⚪ 흰색 재료 (100개)</label><input type="text" value="${p.w === 0 || p.w === undefined ? '' : formatNum(p.w)}" oninput="handlePriceInput(this, 'w')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-1.5 px-2 text-right text-slate-800 text-sm focus:border-slate-500 outline-none transition"></div>`;
    pricesHTML += `<div><label class="text-slate-500 text-[10px] font-bold block mb-1">🟢 초록 재료 (100개)</label><input type="text" value="${p.g === 0 || p.g === undefined ? '' : formatNum(p.g)}" oninput="handlePriceInput(this, 'g')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-1.5 px-2 text-right text-slate-800 text-sm focus:border-green-500 outline-none transition"></div>`;
    pricesHTML += `<div><label class="text-slate-500 text-[10px] font-bold block mb-1">🔵 파란 재료 (100개)</label><input type="text" value="${p.b === 0 || p.b === undefined ? '' : formatNum(p.b)}" oninput="handlePriceInput(this, 'b')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-1.5 px-2 text-right text-slate-800 text-sm focus:border-blue-500 outline-none transition"></div>`;
    pricesHTML += `<div><label class="text-slate-500 text-[10px] font-bold block mb-1">📦 하급 어비도스 (1개)</label><input type="text" value="${p.low === 0 || p.low === undefined ? '' : formatNum(p.low)}" oninput="handlePriceInput(this, 'low')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-1.5 px-2 text-right text-purple-700 text-sm focus:border-purple-500 outline-none transition"></div>`;
    pricesHTML += `<div><label class="text-slate-500 text-[10px] font-bold block mb-1">📦 상급 어비도스 (1개)</label><input type="text" value="${p.high === 0 || p.high === undefined ? '' : formatNum(p.high)}" oninput="handlePriceInput(this, 'high')" placeholder="0" class="w-full bg-white border border-slate-300 rounded py-1.5 px-2 text-right text-purple-700 text-sm focus:border-purple-500 outline-none transition"></div>`;
    document.getElementById('oreha-prices-container').innerHTML = pricesHTML;
    window.renderOrehaResult();
}

function calculateOreha() {
    const inv = window.oState.inv; const req = OREHA_REQ[window.oState.craftType];
    let et = Math.floor((inv.t || 0) / 5); let effectiveW = inv.w + et * 50;
    const isPossible = (N) => {
        if (effectiveW < N * req.w) return false;
        if (inv.g < N * req.g) return false;
        const reqB = Math.max(0, N * req.b - inv.b); const ep = Math.ceil(reqB / 10);
        const reqP = ep * 100; const addP = Math.max(0, reqP - inv.p); const addE = Math.ceil(addP / 80);
        const excessW = effectiveW - N * req.w; const excessG = inv.g - N * req.g;
        return (Math.floor(excessW / 100) + Math.floor(excessG / 50)) >= addE;
    };

    let low = 0, high = 2000000000, best = 0;
    while (low <= high) { let mid = Math.floor((low + high) / 2); if (isPossible(mid)) { best = mid; low = mid + 1; } else high = mid - 1; }
    if (best === 0) return null;

    const N = best; const reqB = Math.max(0, N * req.b - inv.b); const ep = Math.ceil(reqB / 10);
    const reqP = ep * 100; const addP = Math.max(0, reqP - inv.p); const addE = Math.ceil(addP / 80);
    let remW = effectiveW - N * req.w; let remG = inv.g - N * req.g; let ew = 0, eg = 0;

    for (let i = 0; i < addE; i++) {
        if (Math.floor(remW / 100) >= Math.floor(remG / 50) && Math.floor(remW / 100) > 0) { ew++; remW -= 100; }
        else if (Math.floor(remG / 50) > 0) { eg++; remG -= 50; }
    }
    
    return {
        crafts: N, gold: N * req.gold, et, ew, eg, ep,
        usedT: et * 5, usedW: N * req.w + ew * 100, usedG: N * req.g + eg * 50, usedB: N * req.b, usedP: ep * 100,
        finalT: (inv.t || 0) - (et * 5), finalW: remW, finalG: remG, finalB: inv.b + ep * 10 - N * req.b, finalP: inv.p + (ew + eg) * 80 - ep * 100
    };
}

window.applyOrehaRemaining = function() {
    const res = calculateOreha(); if (!res) return;
    window.oState.inv = { t: res.finalT, w: res.finalW, g: res.finalG, b: res.finalB, p: res.finalP };
    if(typeof window.saveToCloud === 'function') window.saveToCloud(); 
    window.renderOrehaUI(); window.showToast('남은 수량이 덮어쓰기 되었습니다.');
};

window.renderOrehaResult = function() {
    const resContainer = document.getElementById('oreha-result-container');
    if (!resContainer) return;
    const res = calculateOreha(); const inv = window.oState.inv; const p = window.oState.prices || {w:0, g:0, b:0, t:0, low:0, high:0};

    const rawRevenue = (inv.t / 100) * (p.t || 0) + (inv.w / 100) * (p.w || 0) + (inv.g / 100) * (p.g || 0) + (inv.b / 100) * (p.b || 0);
    const sellRawProfit = rawRevenue * 0.95;

    let craftProfit = sellRawProfit; let expectedOrehas = 0;
    if (res && res.crafts > 0) {
        const targetPrice = window.oState.craftType === 'normal' ? (p.low || 0) : (p.high || 0);
        expectedOrehas = res.crafts * 10.535; const orehaRevenue = expectedOrehas * targetPrice;
        const leftoverRevenue = (res.finalT / 100) * (p.t || 0) + (res.finalW / 100) * (p.w || 0) + (res.finalG / 100) * (p.g || 0) + (res.finalB / 100) * (p.b || 0);
        craftProfit = (orehaRevenue * 0.95) - res.gold + (leftoverRevenue * 0.95);
    }

    const diff = craftProfit - sellRawProfit;

    if (!res) {
        resContainer.innerHTML = '<div class="h-full min-h-[350px] bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-6 text-center shadow-sm"><span class="text-5xl mb-4 opacity-40">⛏️</span><p class="text-sm font-bold text-slate-500">제작 가능한 횟수가 없습니다.</p><p class="text-[11px] mt-1.5 opacity-60">좌측 패널에서 보유하신 재료 수량을 정확히 입력해주세요.</p></div>';
        return;
    }

    let planHtml = '';
    if (res.et === 0 && res.ew === 0 && res.eg === 0 && res.ep === 0) {
        planHtml = '<p class="text-[11px] text-slate-500 text-center py-4 bg-slate-100 rounded border border-slate-200 border-dashed">추가 교환 없이 즉시 제작이 가능합니다.</p>';
    } else {
        if (res.et > 0) planHtml += `<div class="flex justify-between bg-white p-3 rounded-lg border border-orange-200 shadow-sm items-center mb-1.5"><div class="flex items-center gap-3 text-xs"><div class="flex flex-col"><span class="text-orange-600 font-bold">🪵 목재 소모</span><span class="text-slate-400 text-[10px]">${formatNum(res.et*5)}개</span></div><span class="text-slate-300">▶</span><div class="flex flex-col"><span class="text-slate-700 font-bold">⚪ 흰색 획득</span><span class="text-slate-400 text-[10px]">${formatNum(res.et*50)}개</span></div></div><div class="text-right text-orange-600 font-bold text-sm">${formatNum(res.et)}<span class="text-[10px] font-normal ml-0.5 text-slate-500">회 교환</span></div></div>`;
        if (res.ew > 0) planHtml += `<div class="flex justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm items-center mb-1.5"><div class="flex items-center gap-3 text-xs"><div class="flex flex-col"><span class="text-slate-600 font-bold">⚪ 흰색 소모</span><span class="text-slate-400 text-[10px]">${formatNum(res.ew*100)}개</span></div><span class="text-slate-300">▶</span><div class="flex flex-col"><span class="text-purple-600 font-bold">🟣 가루 획득</span><span class="text-slate-400 text-[10px]">${formatNum(res.ew*80)}개</span></div></div><div class="text-right text-slate-800 font-bold text-sm">${formatNum(res.ew)}<span class="text-[10px] font-normal ml-0.5 text-slate-500">회 교환</span></div></div>`;
        if (res.eg > 0) planHtml += `<div class="flex justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm items-center mb-1.5"><div class="flex items-center gap-3 text-xs"><div class="flex flex-col"><span class="text-green-600 font-bold">🟢 초록 소모</span><span class="text-slate-400 text-[10px]">${formatNum(res.eg*50)}개</span></div><span class="text-slate-300">▶</span><div class="flex flex-col"><span class="text-purple-600 font-bold">🟣 가루 획득</span><span class="text-slate-400 text-[10px]">${formatNum(res.eg*80)}개</span></div></div><div class="text-right text-slate-800 font-bold text-sm">${formatNum(res.eg)}<span class="text-[10px] font-normal ml-0.5 text-slate-500">회 교환</span></div></div>`;
        if (res.ep > 0) planHtml += `<div class="flex justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm items-center mb-1.5"><div class="flex items-center gap-3 text-xs"><div class="flex flex-col"><span class="text-purple-600 font-bold">🟣 가루 소모</span><span class="text-slate-400 text-[10px]">${formatNum(res.ep*100)}개</span></div><span class="text-slate-300">▶</span><div class="flex flex-col"><span class="text-blue-600 font-bold">🔵 파란 획득</span><span class="text-slate-400 text-[10px]">${formatNum(res.ep*10)}개</span></div></div><div class="text-right text-slate-800 font-bold text-sm">${formatNum(res.ep)}<span class="text-[10px] font-normal ml-0.5 text-slate-500">회 교환</span></div></div>`;
    }

    const req = OREHA_REQ[window.oState.craftType];
    
    let tableRows = `<tr class="border-b border-slate-100"><td class="py-2.5 text-orange-600 font-bold">🪵 튼튼한 목재</td><td class="py-2.5 text-right text-red-500">-${formatNum(res.usedT)}</td><td class="py-2.5 text-right text-slate-800 font-bold">${formatNum(res.finalT)}</td></tr>`;
    
    let wWarning = res.finalW < req.w ? `<span class="text-[9px] font-normal ml-1">(-${formatNum(req.w - res.finalW)})</span>` : '';
    tableRows += `<tr class="border-b border-slate-100"><td class="py-2.5 text-slate-600 font-bold">⚪ 흰색 재료</td><td class="py-2.5 text-right text-red-500">-${formatNum(res.usedW)}</td><td class="py-2.5 text-right ${res.finalW >= req.w ? 'text-green-600 font-bold':'text-red-500'}">${formatNum(res.finalW)} ${wWarning}</td></tr>`;
    
    let gWarning = res.finalG < req.g ? `<span class="text-[9px] font-normal ml-1">(-${formatNum(req.g - res.finalG)})</span>` : '';
    tableRows += `<tr class="border-b border-slate-100"><td class="py-2.5 text-green-600 font-bold">🟢 초록 재료</td><td class="py-2.5 text-right text-red-500">-${formatNum(res.usedG)}</td><td class="py-2.5 text-right ${res.finalG >= req.g ? 'text-green-600 font-bold':'text-red-500'}">${formatNum(res.finalG)} ${gWarning}</td></tr>`;
    
    let bWarning = res.finalB < req.b ? `<span class="text-[9px] font-normal ml-1">(-${formatNum(req.b - res.finalB)})</span>` : '';
    tableRows += `<tr class="border-b border-slate-100"><td class="py-2.5 text-blue-600 font-bold">🔵 파란 재료</td><td class="py-2.5 text-right text-red-500">-${formatNum(res.usedB)}</td><td class="py-2.5 text-right ${res.finalB >= req.b ? 'text-green-600 font-bold':'text-red-500'}">${formatNum(res.finalB)} ${bWarning}</td></tr>`;
    
    tableRows += `<tr><td class="py-2.5 text-purple-600 font-bold">🟣 가루</td><td class="py-2.5 text-right text-red-500">-${formatNum(res.usedP)}</td><td class="py-2.5 text-right text-slate-800 font-bold">${formatNum(res.finalP)}</td></tr>`;

    let profitBadge = '';
    if (diff > 0 && expectedOrehas > 0) profitBadge = '<span class="bg-green-100 text-green-700 border border-green-300 px-2 py-0.5 rounded text-[10px] font-bold">제작이 이득</span>';
    else if (diff < 0 && expectedOrehas > 0) profitBadge = '<span class="bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded text-[10px] font-bold">단순 판매가 이득</span>';

    let conclusionBox = '';
    if (diff !== 0 && sellRawProfit > 0 && expectedOrehas > 0) {
        let msg = diff > 0 
            ? `제작해서 파는 것이 <span class="text-green-600 font-bold">${formatNum(Math.floor(diff))} 골드</span> 더 이득입니다.`
            : `재료를 그냥 파는 것이 <span class="text-red-500 font-bold">${formatNum(Math.floor(Math.abs(diff)))} 골드</span> 더 이득입니다.`;
        conclusionBox = `<div class="text-center mt-1 p-2 rounded bg-white border border-slate-200 text-xs shadow-sm">${msg}</div>`;
    }

    let html = '<div class="space-y-4 h-full flex flex-col"><div class="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 border border-orange-200 shadow-md text-center relative overflow-hidden">';
    html += `<h3 class="text-orange-700 text-[11px] font-bold mb-2 tracking-wide">거래가능 재료 최대 제작 횟수</h3><div class="text-5xl font-black text-slate-800 mb-5 drop-shadow-sm">${formatNum(res.crafts)}<span class="text-xl text-slate-500 ml-1.5 font-bold">회</span></div>`;
    html += `<div class="grid grid-cols-2 gap-3"><div class="bg-white rounded-lg p-2.5 border border-slate-200 shadow-sm"><p class="text-[10px] text-slate-500 mb-1 font-bold">필요 골드</p><p class="text-sm font-bold text-yellow-600 flex items-center justify-center gap-1"><span>💰</span> ${formatNum(res.gold)}</p></div>`;
    html += `<div class="bg-white rounded-lg p-2.5 border border-slate-200 shadow-sm"><p class="text-[10px] text-slate-500 mb-1 font-bold">제작 목표</p><p class="text-sm font-bold text-slate-800">${req.name}</p></div></div></div>`;
    
    html += `<div class="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col gap-2"><h3 class="text-xs font-bold text-slate-800 mb-1 flex items-center justify-between"><span>⚖️ 수익 비교 결과</span>${profitBadge}</h3>`;
    html += `<div class="grid grid-cols-2 gap-3"><div class="bg-white p-3 rounded-lg border shadow-sm ${diff <= 0 && rawRevenue > 0 && expectedOrehas > 0 ? 'border-red-300' : 'border-slate-200'}"><p class="text-[10px] text-slate-500 mb-1 font-bold">모든 재료 단순 판매 시</p><p class="text-sm font-black text-slate-800">${formatNum(Math.floor(sellRawProfit))} <span class="text-[10px] font-normal text-slate-400">골드</span></p></div>`;
    html += `<div class="bg-white p-3 rounded-lg border shadow-sm ${diff > 0 && expectedOrehas > 0 ? 'border-green-400' : 'border-slate-200'}"><p class="text-[10px] text-slate-500 mb-1 font-bold">최대 제작 후 판매 시</p><p class="text-sm font-black text-slate-800">${formatNum(Math.floor(craftProfit))} <span class="text-[10px] font-normal text-slate-400">골드</span></p></div></div>`;
    html += conclusionBox;
    html += `<p class="text-[9px] text-slate-400 mt-1 font-medium">* 거래소 수수료 5% 및 대성공 5.35% (총 ${formatNum(Math.floor(expectedOrehas))}개 획득 예상) 산출 반영 기준</p></div>`;

    html += `<div class="bg-slate-50 rounded-xl p-4 border border-slate-200"><h3 class="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5"><span>🔄</span> 추천 교환 플랜</h3>${planHtml}</div>`;
    html += `<div class="bg-slate-50 rounded-xl p-4 border border-slate-200 flex-grow"><div class="flex justify-between items-center mb-3 border-b border-slate-200 pb-2"><h3 class="text-xs font-bold text-slate-800">재료 결산</h3><button onclick="applyOrehaRemaining()" class="bg-orange-500 hover:bg-orange-400 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1">✔️ 남은 수량 덮어쓰기</button></div>`;
    html += `<table class="w-full text-left text-xs"><thead class="text-slate-500 border-b border-slate-200 font-bold"><tr><th class="pb-2">재료</th><th class="pb-2 text-right">소모/변환량</th><th class="pb-2 text-right">남는 수량</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
    
    resContainer.innerHTML = html;
};

// ==========================================
// 레이드 골드 계산기 로직
// ==========================================
const raidGoldData = [
    { id: '1710', title: 'Lv. 1710', trade: { trade: 45500, bound: 45500, total: 91000, dungeons: ['4막 노말', '세르카 노말', '종막 노말'] }, bound: { trade: 32000, bound: 62000, total: 94000, dungeons: ['세르카 노말', '종막 노말', '성당 1단'] }, total: { trade: 32000, bound: 62000, total: 94000, dungeons: ['세르카 노말', '종막 노말', '성당 1단'] }, prevId: null },
    { id: '1720', title: 'Lv. 1720', trade: { trade: 70000, bound: 32000, total: 102000, dungeons: ['4막 하드', '세르카 노말', '종막 노말'] }, bound: { trade: 32000, bound: 72000, total: 104000, dungeons: ['세르카 노말', '종막 노말', '성당 2단'] }, total: { trade: 54000, bound: 56000, total: 110000, dungeons: ['4막 하드', '성당 2단', '세르카(또는 종막) 노말'] }, prevId: '1710' },
    { id: '1730', title: 'Lv. 1730', trade: { trade: 130000, bound: 0, total: 130000, dungeons: ['종막 하드', '세르카 하드', '4막 하드'] }, bound: { trade: 32000, bound: 72000, total: 104000, dungeons: ['세르카 노말', '종막 노말', '성당 2단'] }, total: { trade: 92000, bound: 40000, total: 132000, dungeons: ['종막 하드', '세르카 하드', '성당 2단'] }, prevId: '1720' },
    { id: '1750_hm', title: 'Lv. 1750', subtitle: '세르카 하드 (배럭 권장)', trade: { trade: 142000, bound: 0, total: 142000, dungeons: ['벨가르딘', '종막 하드', '세르카 하드'] }, bound: { trade: 32000, bound: 82000, total: 114000, dungeons: ['세르카 노말', '종막 노말', '성당 3단'] }, total: { trade: 98000, bound: 50000, total: 148000, dungeons: ['벨가르딘', '성당 3단', '종막 하드'] }, prevId: '1730' },
    { id: '1750_nm', title: 'Lv. 1750', subtitle: '세르카 나이트메어', trade: { trade: 152000, bound: 0, total: 152000, dungeons: ['세르카 나메', '벨가르딘', '종막 하드'] }, bound: { trade: 32000, bound: 82000, total: 114000, dungeons: ['세르카 노말', '종막 노말', '성당 3단'] }, total: { trade: 104000, bound: 50000, total: 154000, dungeons: ['세르카 나메', '벨가르딘', '성당 3단'] }, prevId: '1730' }
];

window.renderGoldCalculator = function() {
    const container = document.getElementById('tool-view-gold');
    if (!container) return;
    
    const formatGold = (num) => new Intl.NumberFormat('ko-KR').format(num);
    
    const getDiffBadgeHtml = (current, prev) => {
        if (prev === undefined || prev === null) return '<span class="text-slate-400 text-[11px] ml-1 font-mono">(-)</span>';
        const diff = current - prev;
        if (diff === 0) return '<span class="text-slate-400 text-[11px] ml-1 font-mono">(-)</span>';
        const colorClass = diff > 0 ? 'text-emerald-600' : 'text-rose-500';
        const sign = diff > 0 ? '+' : '';
        return `<span class="${colorClass} text-[11px] ml-1 font-mono tracking-tighter">(${sign}${formatGold(diff)})</span>`;
    };

    const getStrategyCardHtml = (title, icon, colorClass, data, prevData) => {
        const textColor = colorClass.replace('border-', 'text-');
        let dungeonsHtml = data.dungeons.map(d => `<span class="bg-white border border-slate-200 text-slate-600 shadow-sm text-[10px] px-1.5 py-0.5 rounded">${d}</span>`).join('');
        
        return `
            <div class="glass-panel rounded-lg border-t-4 p-3 flex flex-col h-full ${colorClass}">
                <div class="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2.5">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center bg-slate-50 ${textColor}">
                        <i class="fa-solid ${icon} text-[10px]"></i>
                    </div>
                    <h3 class="font-bold text-[13px] text-slate-800 tracking-tight">${title}</h3>
                </div>
                <div class="flex-1 space-y-2">
                    <div class="bg-slate-50 p-2 rounded flex flex-wrap items-center gap-1">
                        <span class="text-[11px] font-semibold text-slate-500">총 획득 합계:</span>
                        <div class="flex items-baseline">
                            <span class="text-[13px] font-black text-emerald-600 tracking-tight ml-1">${formatGold(data.total)}</span>
                            ${getDiffBadgeHtml(data.total, prevData?.total)}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs px-1 py-0.5">
                        <div class="flex flex-col">
                            <span class="text-slate-500 text-[10px] mb-0.5">유통 골드</span>
                            <div class="flex items-baseline flex-wrap">
                                <span class="font-bold text-amber-600 text-[12px]">${formatGold(data.trade)}</span>
                                ${getDiffBadgeHtml(data.trade, prevData?.trade)}
                            </div>
                        </div>
                        <div class="flex flex-col border-l border-slate-200 pl-2">
                            <span class="text-slate-500 text-[10px] mb-0.5">귀속 골드</span>
                            <div class="flex items-baseline flex-wrap">
                                <span class="font-bold text-sky-600 text-[12px]">${formatGold(data.bound)}</span>
                                ${getDiffBadgeHtml(data.bound, prevData?.bound)}
                            </div>
                        </div>
                    </div>
                    <div class="pt-2.5 border-t border-slate-100 mt-auto">
                        <div class="flex flex-wrap gap-1">${dungeonsHtml}</div>
                    </div>
                </div>
            </div>
        `;
    };

    let html = `
        <div class="border-b border-slate-300 pb-3 mt-2 mb-6">
            <h2 class="text-xl md:text-2xl font-black text-slate-900 mb-1 tracking-tight">
                <i class="fa-brands fa-d-and-d mr-2 text-emerald-600"></i>로스트아크 골드 효율 계산기
            </h2>
            <p class="text-xs text-slate-500">1710 ~ 1750 레벨 구간별 최적 던전 조합 및 증감량</p>
        </div>
        <div class="space-y-10">
    `;

    raidGoldData.forEach(levelData => {
        const prevData = levelData.prevId ? raidGoldData.find(d => d.id === levelData.prevId) : null;
        let subtitleHtml = levelData.subtitle ? `<span class="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal">${levelData.subtitle}</span>` : '';
        let prevTextHtml = prevData ? `<span class="text-[11px] text-slate-500">(이전 ${prevData.title} 대비)</span>` : '';

        html += `
            <section class="relative">
                <div class="flex items-center gap-2 mb-3">
                    <h2 class="text-[13px] font-bold text-slate-800 bg-white px-3 py-1.5 rounded-md border border-slate-300 shadow-sm flex items-center gap-2">
                        ${levelData.title} ${subtitleHtml}
                    </h2>
                    ${prevTextHtml}
                    <div class="h-px bg-slate-200 flex-1 ml-2 hidden md:block"></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    ${getStrategyCardHtml("유통골드 우선", "fa-coins", "border-amber-600", levelData.trade, prevData?.trade)}
                    ${getStrategyCardHtml("귀속골드 우선", "fa-lock", "border-sky-600", levelData.bound, prevData?.bound)}
                    ${getStrategyCardHtml("총 골드 최대로", "fa-scale-balanced", "border-emerald-600", levelData.total, prevData?.total)}
                </div>
            </section>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
};

// 마지막에 onValue를 등록하여 모든 함수 세팅이 완료된 후 최초 렌더링이 일어나도록 제어
onValue(dbRef, (snapshot) => {
  const data = snapshot.val();
  
  if (data) {
    window.charactersData = data.charactersData || [];
    window.partyData = data.partyData || [];
    window.cpmData = data.cpmData || { inputs: {}, records: [] };
    window.oState = data.oState || { craftType: 'normal', inv: {w:0, g:0, b:0, p:0, t:0}, prices: {w:0, g:0, b:0, t:0, low:0, high:0} };
    window.appState = data.appState || { title: '💻 로스트아크 클라우드 대시보드' };
  } else {
    window.charactersData = [];
    window.partyData = [];
    window.cpmData = { inputs: {}, records: [] };
    window.oState = { craftType: 'normal', inv: {w:0, g:0, b:0, p:0, t:0}, prices: {w:0, g:0, b:0, t:0, low:0, high:0} };
    window.appState = { title: '💻 로스트아크 클라우드 대시보드' };
  }

  const titleEl = document.getElementById('display-app-title');
  if(titleEl && window.appState.title) titleEl.innerText = window.appState.title;

  const indicator = document.getElementById('cloud-indicator');
  const status = document.getElementById('cloud-status');
  if(indicator && status) {
      indicator.classList.remove('bg-orange-400', 'animate-pulse');
      indicator.classList.add('bg-green-500');
      status.innerText = '실시간 동기화 중 ⚡';
      status.classList.replace('text-orange-500', 'text-green-600');
  }

  if(typeof window.renderAll === 'function') {
      window.renderAll();
  }
});
