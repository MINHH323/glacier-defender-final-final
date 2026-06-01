const vp = document.getElementById('viewport');
const sh = document.getElementById('shield');
const hf = document.getElementById('hp-fill');
const sc = document.getElementById('score');
const al = document.getElementById('albedo');
const lv = document.getElementById('level-num');
const gl = document.getElementById('glacier');
const ts = document.getElementById('toast');
const sb = document.getElementById('stage-bar');
const ni = document.getElementById('user-name');

let game = { score: 0, hp: 100, level: 1, active: false, speed: 4, rate: 800, name: "" };
let spawnTimer;

// [기억 기능] 페이지 로드 시 저장된 닉네임 불러오기
window.addEventListener('load', () => {
    const savedName = localStorage.getItem('last_defender_name');
    if (savedName) ni.value = savedName;
});

function startGame() {
    const nameInput = ni.value.trim();
    if (!nameInput) { alert("Please enter your name!"); return; }
    
    // [기억 기능] 닉네임 로컬 스토리지에 저장
    localStorage.setItem('last_defender_name', nameInput);
    
    game.name = nameInput;
    game.active = true;
    document.getElementById('start-screen').style.display = 'none';
    sh.style.display = 'block';
    
    spawnTimer = setInterval(spawn, game.rate);
}

const move = (e) => {
    if (!game.active) return;
    const rect = vp.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    // 방패가 화면 밖으로 나가지 않게 조절
    sh.style.left = Math.max(50, Math.min(rect.width - 50, x)) + 'px';
};
vp.addEventListener('mousemove', move);
vp.addEventListener('touchmove', move, { passive: true });

function refresh() {
    const r = Math.min(game.score / 1500, 1);
    vp.style.background = `rgb(${44-r*20}, ${62+r*100}, ${80+r*150})`;
    const bonus = Math.min(game.score / 50, 20);
    gl.style.height = (game.hp * 0.35 + bonus) + "%";
    const p1 = 40 - r*25, p2 = 20 - r*15, p3 = 30 - r*20;
    gl.style.clipPath = `polygon(0% 100%, 15% ${p1}%, 35% 65%, 50% ${p2}%, 70% 55%, 85% ${p3}%, 100% 100%)`;
    gl.style.backgroundColor = `hsl(190, 100%, ${Math.min(75+game.score/20, 100)}%)`;
    al.innerText = Math.min(100, 85 + Math.floor(game.score/50));
}

function spawn() {
    if (!game.active) return;
    const p = document.createElement('div');
    p.className = 'drop';
    
    // [위치 수정] 양 끝 20px 안쪽에서만 생성되게 하여 튕김 방지
    const margin = 20;
    p.style.left = (Math.random() * (vp.clientWidth - (margin * 2)) + margin) + 'px';
    p.style.top = '0px';
    vp.appendChild(p);

    let y = 0;
    let drift = (Math.random() - 0.5) * game.level; 
    let currentX = parseFloat(p.style.left);

    let moveInterval = setInterval(() => {
        if (!game.active) { clearInterval(moveInterval); p.remove(); return; }
        
        y += game.speed;
        
        // [벽 충돌 로직] 블랙카본이 벽에 닿으면 튕겨나오게 함
        currentX += drift;
        if (currentX <= 5 || currentX >= vp.clientWidth - 15) {
            drift *= -1; // 방향 반전
        }

        p.style.top = y + 'px';
        p.style.left = currentX + 'px';

        const sRect = sh.getBoundingClientRect();
        const pRect = p.getBoundingClientRect();

        if (pRect.bottom >= sRect.top && pRect.top <= sRect.bottom &&
            pRect.right >= sRect.left && pRect.left <= sRect.right) {
            clearInterval(moveInterval); p.remove();
            hitSuccess();
        } else if (y > vp.clientHeight - 40) {
            clearInterval(moveInterval); p.remove();
            hitFail();
        }
    }, 20);
}

function hitSuccess() {
    game.score += (10 * game.level);
    sc.innerText = game.score;
    
    if (game.hp < 100) { 
        game.hp = Math.min(100, game.hp + 0.5); 
        hf.style.width = game.hp + "%"; 
    }

    let prevGoal = (game.level - 1) * 300;
    let progress = ((game.score - prevGoal) / 300) * 100;
    sb.style.width = Math.min(100, progress) + "%";

    refresh();
    
    if (game.score >= game.level * 300) {
        game.level++;
        game.speed += 0.8;
        game.rate = Math.max(200, game.rate - 100);
        lv.innerText = game.level;
        sb.style.width = "0%"; 
        clearInterval(spawnTimer);
        spawnTimer = setInterval(spawn, game.rate);
        ts.innerText = `LEVEL UP: STAGE ${game.level} 🚀`;
        ts.style.top = "15px"; setTimeout(()=>ts.style.top="-50px", 2000);
    }
}

function hitFail() {
    game.hp -= 8;
    hf.style.width = Math.max(0, game.hp) + "%";
    refresh();
    if (game.hp <= 0) endGame();
}

function endGame() {
    game.active = false;
    clearInterval(spawnTimer);
    document.getElementById('result-screen').style.display = 'flex';
    document.getElementById('final-score').innerText = game.score;

    const title = document.getElementById('result-title');
    const desc = document.getElementById('result-desc');
    if (game.score >= 1500) {
        title.innerText = "MISSION PERFECT! 💎";
        desc.innerText = "You saved the glacier perfectly!";
    } else {
        title.innerText = "MISSION OVER";
        desc.innerText = "The glacier is melting. Try again?";
    }
    saveRank();
    showRanks();
}

function saveRank() {
    let rks = JSON.parse(localStorage.getItem('ggc_final_rk_en') || '[]');
    rks.push({n: game.name, s: game.score});
    rks.sort((a,b) => b.s - a.s);
    localStorage.setItem('ggc_final_rk_en', JSON.stringify(rks.slice(0, 5)));
}

function showRanks() {
    const rks = JSON.parse(localStorage.getItem('ggc_final_rk_en') || '[]');
    const list = document.getElementById('rank-list');
    list.innerHTML = rks.map((r, i) => `
        <div class="rk-item"><span>${i+1}. ${r.n}</span><b style="color:#00ffcc">${r.s}</b></div>
    `).join('') || "No records yet.";
}
