const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = {};
const world = {
  gravity: 0.7,
  floorY: 430,
  shake: 0,
  timer: 0,
  gameOver: false,
  winner: null
};

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if ([" ", "w", "arrowup"].includes(e.key)) e.preventDefault();
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rectIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

const HEROES = {
  werebeast: {
    name: "Werebeast",
    color: "#c95d3d",
    speed: 3.1,
    jump: 12.6,
    maxHp: 130,
    lightDamage: 9,
    heavyDamage: 15,
    specialDamage: 28,
    specialCost: 50,
    specialText: "Claw Burst",
    attackRange: 58,
    attackHeight: 36,
    specialRadius: 90,
    specialColor: "#ff7a59",
    description: "Fast claw slashes with rage charge"
  },
  slayer: {
    name: "Slayer",
    color: "#4ba1ff",
    speed: 2.8,
    jump: 12.2,
    maxHp: 120,
    lightDamage: 8,
    heavyDamage: 17,
    specialDamage: 30,
    specialCost: 55,
    specialText: "Blue Katana Surge",
    attackRange: 62,
    attackHeight: 36,
    specialRadius: 100,
    specialColor: "#7ed0ff",
    description: "Long reach with powerful blue charge"
  },
  fighter: {
    name: "Fighter",
    color: "#f3d24c",
    speed: 3.2,
    jump: 12.4,
    maxHp: 140,
    lightDamage: 10,
    heavyDamage: 18,
    specialDamage: 25,
    specialCost: 52,
    specialText: "Orb Volley",
    attackRange: 56,
    attackHeight: 30,
    specialRadius: 110,
    specialColor: "#fbe66f",
    description: "Fists and energy orbs"
  },
  webrunner: {
    name: "Web Runner",
    color: "#b488ff",
    speed: 3.5,
    jump: 13.2,
    maxHp: 110,
    lightDamage: 8,
    heavyDamage: 14,
    specialDamage: 24,
    specialCost: 48,
    specialText: "Web Burst",
    attackRange: 70,
    attackHeight: 34,
    specialRadius: 120,
    specialColor: "#d4a7ff",
    description: "Swift spider abilities with webs"
  },
  mechaman: {
    name: "Mechaman",
    color: "#8fe3ff",
    speed: 2.7,
    jump: 11.8,
    maxHp: 160,
    lightDamage: 9,
    heavyDamage: 16,
    specialDamage: 33,
    specialCost: 60,
    specialText: "Arc Pulse",
    attackRange: 72,
    attackHeight: 38,
    specialRadius: 125,
    specialColor: "#8ae4ff",
    description: "Heavy armor with ranged blasts"
  }
};

function makePlayer(type, x, side) {
  const data = HEROES[type];
  return {
    type,
    name: data.name,
    x,
    y: world.floorY - 90,
    vx: 0,
    vy: 0,
    width: 28,
    height: 72,
    color: data.color,
    facing: side,
    side,
    hp: data.maxHp,
    maxHp: data.maxHp,
    charge: 0,
    attackTimer: 0,
    attackType: "",
    attackCooldown: 0,
    hurtTimer: 0,
    specialReady: false,
    isGrounded: true,
    isAttacking: false,
    attackHit: false,
    data
  };
}

let p1 = makePlayer("werebeast", 220, 1);
let p2 = makePlayer("slayer", 680, -1);

function updatePlayer(player, enemy, input) {
  if (world.gameOver) return;

  const d = player.data;

  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.attackTimer > 0) player.attackTimer--;
  if (player.hurtTimer > 0) player.hurtTimer--;

  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  player.vx = moveDir * d.speed;
  player.x += player.vx;

  if (input.jump && player.isGrounded) {
    player.vy = -d.jump;
    player.isGrounded = false;
  }

  player.vy += world.gravity;
  player.y += player.vy;
  if (player.y >= world.floorY - player.height) {
    player.y = world.floorY - player.height;
    player.vy = 0;
    player.isGrounded = true;
  }

  if (moveDir !== 0) player.facing = moveDir;
  if (player.facing === 1) player.side = 1;
  if (player.facing === -1) player.side = -1;

  if (input.light && player.attackCooldown <= 0) {
    player.attackCooldown = 180;
    player.attackTimer = 18;
    player.attackType = "light";
    player.attackHit = false;
    player.isAttacking = true;
    player.specialReady = false;
  }

  if (input.heavy && player.attackCooldown <= 0) {
    player.attackCooldown = 240;
    player.attackTimer = 26;
    player.attackType = "heavy";
    player.attackHit = false;
    player.isAttacking = true;
    player.specialReady = false;
  }

  if (input.special && player.charge >= d.specialCost && player.attackCooldown <= 0) {
    player.attackCooldown = 320;
    player.attackTimer = 34;
    player.attackType = "special";
    player.attackHit = false;
    player.isAttacking = true;
    player.charge -= d.specialCost;
  }

  if (player.isAttacking && player.attackTimer <= 0) {
    player.isAttacking = false;
  }

  // Handle hit detection
  if (player.isAttacking && !player.attackHit) {
    const range = player.attackType === "light" ? d.attackRange
                : player.attackType === "heavy" ? d.attackRange + 18
                : d.specialRadius;

    const hitBoxX = player.x + player.width / 2 + player.facing * 18;
    const hitBoxY = player.y + 10;
    const hitBoxW = player.attackType === "special" ? d.specialRadius : range;
    const hitBoxH = player.attackType === "special" ? 55 : d.attackHeight;

    const enemyBox = {
      x: enemy.x,
      y: enemy.y,
      width: enemy.width,
      height: enemy.height
    };

    const overlap = rectIntersect(
      hitBoxX + (player.facing > 0 ? 0 : -hitBoxW),
      hitBoxY,
      hitBoxW,
      hitBoxH,
      enemyBox.x,
      enemyBox.y,
      enemyBox.width,
      enemyBox.height
    );

    if (overlap) {
      const dmg =
        player.attackType === "light" ? d.lightDamage :
        player.attackType === "heavy" ? d.heavyDamage :
        d.specialDamage;

      enemy.hp = clamp(enemy.hp - dmg, 0, enemy.maxHp);
      enemy.hurtTimer = 12;
      enemy.vx += player.facing * 7;
      player.attackHit = true;
      world.shake = 8;

      // Charge gain on hit
      player.charge = clamp(player.charge + 8, 0, 100);
      if (player.attackType === "special") {
        world.shake = 18;
      }
    }
  }

  // Charge meter gain over time
  player.charge = clamp(player.charge + 0.18, 0, 100);

  // Keep within arena
  player.x = clamp(player.x, 30, canvas.width - player.width - 30);

  // Collision prevention
  if (Math.abs(player.x - enemy.x) < 32 && Math.abs(player.y - enemy.y) < 120) {
    const push = 1.5;
    if (player.x < enemy.x) {
      player.x -= push;
      enemy.x += push;
    } else {
      player.x += push;
      enemy.x -= push;
    }
  }
}

function drawPlayer(player) {
  const d = player.data;
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.scale(player.facing, 1);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(-18, 38, 36, 6);

  // body
  ctx.fillStyle = player.color;
  ctx.fillRect(-14, -32, 28, 64);

  // head
  ctx.fillStyle = "#f0d7b9";
  ctx.fillRect(-12, -46, 24, 18);

  // attack flash
  if (player.isAttacking) {
    ctx.fillStyle = player.attackType === "special" ? d.specialColor : "#fff7d6";
    const range = player.attackType === "light" ? 38 :
                  player.attackType === "heavy" ? 48 :
                  80;
    ctx.fillRect(16, -22, range, 44);
  }

  ctx.restore();

  // HP bar background
  ctx.fillStyle = "#2f3b4a";
  ctx.fillRect(player.x - 8, player.y - 18, 52, 8);
  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = "#56ff88";
  ctx.fillRect(player.x - 8, player.y - 18, 52 * hpRatio, 8);

  // Charge bar background
  ctx.fillStyle = "#1d2732";
  ctx.fillRect(player.x - 8, player.y - 8, 52, 5);
  ctx.fillStyle = "#7bdcff";
  ctx.fillRect(player.x - 8, player.y - 8, 52 * (player.charge / 100), 5);

  // Hurt flash
  if (player.hurtTimer > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(player.x - 8, player.y - 18, 52, 8);
  }
}

function drawArena() {
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#162b3d");
  bg.addColorStop(1, "#0c1620");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // pixel skyline
  for (let i = 0; i < 30; i++) {
    const x = i * 40;
    const h = 30 + ((i * 17) % 80);
    ctx.fillStyle = "#1a2d3d";
    ctx.fillRect(x, 260 - h, 30, h);
  }

  // floor
  ctx.fillStyle = "#283c2d";
  ctx.fillRect(0, world.floorY, canvas.width, canvas.height - world.floorY);

  // floor pixels
  ctx.fillStyle = "#3c5647";
  for (let i = 0; i < 80; i++) {
    ctx.fillRect(i * 12, world.floorY + 8 + (i % 4) * 2, 6, 6);
  }
}

function drawHeroSelect() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#7bdcff";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SELECT YOUR HERO", canvas.width / 2, 40);

  ctx.font = "14px monospace";
  const heroNames = Object.keys(HEROES);
  const heroCols = 3;
  const heroWidth = canvas.width / heroCols;
  const startY = 100;

  let idx = 0;
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < heroCols && idx < heroNames.length; x++) {
      const heroType = heroNames[idx];
      const heroData = HEROES[heroType];
      const cx = heroWidth * x + heroWidth / 2;
      const cy = startY + y * 140;

      // Hero box
      ctx.fillStyle = "#1a2d3d";
      ctx.fillRect(cx - 80, cy - 40, 160, 100);
      ctx.strokeStyle = heroData.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 80, cy - 40, 160, 100);

      // Hero name
      ctx.fillStyle = heroData.color;
      ctx.fillText(heroData.name, cx, cy - 15);

      // Hero description
      ctx.fillStyle = "#bbb";
      ctx.font = "10px monospace";
      ctx.fillText(heroData.description, cx, cy + 5);
      ctx.font = "11px monospace";
      ctx.fillText(`HP: ${heroData.maxHp}`, cx, cy + 20);

      // Hero number
      ctx.fillStyle = "#7bdcff";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`Press ${idx + 1}`, cx, cy + 40);

      idx++;
    }
  }

  ctx.fillStyle = "#999";
  ctx.font = "12px monospace";
  ctx.textAlign = "left";
  ctx.fillText("P1: Press 1-5 | P2: Press Q-O", 20, canvas.height - 20);
}

function drawCenterText() {
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${p1.name} vs ${p2.name}`, canvas.width / 2, 26);
}

function checkWin() {
  if (p1.hp <= 0 || p2.hp <= 0) {
    const winner = p1.hp > p2.hp ? p1.name : p2.name;
    world.gameOver = true;
    world.winner = winner;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fbe66f";
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${winner} WINS!", canvas.width / 2, 200);

    ctx.fillStyle = "#7bdcff";
    ctx.font = "16px monospace";
    ctx.fillText("Press R to restart", canvas.width / 2, 280);
    return true;
  }
  return false;
}

let gameState = "heroSelect"; // heroSelect, playing, gameOver

function resetGame() {
  world.gameOver = false;
  world.winner = null;
  world.shake = 0;
  world.timer = 0;
  p1 = makePlayer("werebeast", 220, 1);
  p2 = makePlayer("slayer", 680, -1);
  gameState = "heroSelect";
}

function gameLoop() {
  world.timer++;

  // Handle hero selection
  if (gameState === "heroSelect") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawArena();
    drawHeroSelect();

    // P1 selection
    const p1HeroKeys = ["1", "2", "3", "4", "5"];
    const p1HeroNames = Object.keys(HEROES);
    for (let i = 0; i < p1HeroKeys.length && i < p1HeroNames.length; i++) {
      if (keys[p1HeroKeys[i]]) {
        p1.type = p1HeroNames[i];
        p1.data = HEROES[p1HeroNames[i]];
        p1.name = p1.data.name;
        p1.color = p1.data.color;
        p1.maxHp = p1.data.maxHp;
        p1.hp = p1.maxHp;
      }
    }

    // P2 selection
    const p2HeroKeys = ["q", "w", "e", "r", "t"];
    for (let i = 0; i < p2HeroKeys.length && i < p1HeroNames.length; i++) {
      if (keys[p2HeroKeys[i]]) {
        p2.type = p1HeroNames[i];
        p2.data = HEROES[p1HeroNames[i]];
        p2.name = p2.data.name;
        p2.color = p2.data.color;
        p2.maxHp = p2.data.maxHp;
        p2.hp = p2.maxHp;
      }
    }

    // Start game
    if (keys[" "]) {
      gameState = "playing";
    }
  } else if (gameState === "playing") {
    const shakeX = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;
    const shakeY = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawArena();

    const input1 = {
      left: keys["a"],
      right: keys["d"],
      jump: keys["w"],
      light: keys["j"],
      heavy: keys["k"],
      special: keys["l"]
    };

    const input2 = {
      left: keys["arrowleft"],
      right: keys["arrowright"],
      jump: keys["arrowup"],
      light: keys["1"],
      heavy: keys["2"],
      special: keys["3"]
    };

    updatePlayer(p1, p2, input1);
    updatePlayer(p2, p1, input2);

    drawPlayer(p1);
    drawPlayer(p2);
    drawCenterText();

    ctx.restore();

    world.shake *= 0.75;
    if (world.shake < 0.1) world.shake = 0;

    if (!checkWin()) {
      requestAnimationFrame(gameLoop);
    } else {
      gameState = "gameOver";
      if (keys["r"]) {
        resetGame();
        requestAnimationFrame(gameLoop);
      }
    }
    return;
  }

  // Handle restart
  if (keys["r"]) {
    resetGame();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);