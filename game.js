const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = {};
const shopState = {
  coins: 0,
  inventory: ["werebeast"],
  selected: "werebeast",
  open: false
};

const world = {
  width: 2200,
  height: 540,
  gravity: 0.7,
  floorY: 430,
  shake: 0,
  timer: 0,
  gameOver: false,
  winner: null,
  cameraX: 0
};

const keyWasDown = {
  b: false,
  r: false
};

const BLOCKS = [
  { x: 0, y: 430, w: world.width, h: 110, color: "#2d4b3a" },
  { x: 150, y: 360, w: 210, h: 18, color: "#4f7f62" },
  { x: 430, y: 310, w: 170, h: 18, color: "#4f7f62" },
  { x: 720, y: 350, w: 180, h: 18, color: "#4f7f62" },
  { x: 1030, y: 285, w: 200, h: 18, color: "#4f7f62" },
  { x: 1330, y: 340, w: 220, h: 18, color: "#4f7f62" },
  { x: 1650, y: 300, w: 180, h: 18, color: "#4f7f62" },
  { x: 1900, y: 260, w: 200, h: 18, color: "#4f7f62" }
];

const shopBooth = { x: 90, y: 300, w: 120, h: 130 };

const coinsList = [
  { x: 220, y: 320, r: 8, collected: false },
  { x: 510, y: 270, r: 8, collected: false },
  { x: 790, y: 300, r: 8, collected: false },
  { x: 1110, y: 240, r: 8, collected: false },
  { x: 1410, y: 290, r: 8, collected: false },
  { x: 1710, y: 250, r: 8, collected: false },
  { x: 1980, y: 210, r: 8, collected: false },
  { x: 2050, y: 210, r: 8, collected: false }
];

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
    description: "Fast claw slashes with rage charge",
    shopCost: 0
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
    description: "Long reach with powerful blue charge",
    shopCost: 12
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
    description: "Fists and energy orbs",
    shopCost: 15
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
    description: "Swift spider abilities with webs",
    shopCost: 18
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
    description: "Heavy armor with ranged blasts",
    shopCost: 22
  }
};

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;
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

function getRandomUnlockedHero() {
  const unlocked = Object.keys(HEROES).filter((type) => shopState.inventory.includes(type));
  if (unlocked.length === 0) return "werebeast";
  return unlocked[Math.floor(Math.random() * unlocked.length)];
}

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
    coins: 0,
    data
  };
}

let p1 = makePlayer(getRandomUnlockedHero(), 180, 1);
let p2 = makePlayer(getRandomUnlockedHero(), 1700, -1);

function resetGame() {
  world.gameOver = false;
  world.winner = null;
  world.shake = 0;
  world.timer = 0;
  p1 = makePlayer(getRandomUnlockedHero(), 180, 1);
  p2 = makePlayer(getRandomUnlockedHero(), 1700, -1);
  shopState.open = false;
}

function buyHero(heroType) {
  if (!HEROES[heroType]) return;
  if (shopState.inventory.includes(heroType)) return;
  const cost = HEROES[heroType].shopCost;
  if (shopState.coins < cost) return;
  shopState.coins -= cost;
  shopState.inventory.push(heroType);
  shopState.selected = heroType;
}

function collectCoins(player) {
  for (const coin of coinsList) {
    if (coin.collected) continue;

    const coinBox = {
      x: coin.x - coin.r,
      y: coin.y - coin.r,
      width: coin.r * 2,
      height: coin.r * 2
    };

    if (rectIntersect(player.x, player.y, player.width, player.height, coinBox.x, coinBox.y, coinBox.width, coinBox.height)) {
      coin.collected = true;
      player.coins += 1;
      shopState.coins += 1;
    }
  }
}

function handleArenaCollision(player) {
  for (const block of BLOCKS) {
    const prevY = player.y - player.vy;
    const prevX = player.x - player.vx;

    if (
      player.x < block.x + block.w &&
      player.x + player.width > block.x &&
      player.y < block.y + block.h &&
      player.y + player.height > block.y
    ) {
      const overlapLeft = player.x + player.width - block.x;
      const overlapRight = block.x + block.w - player.x;
      const overlapTop = player.y + player.height - block.y;
      const overlapBottom = block.y + block.h - player.y;

      if (prevY + player.height <= block.y + 6 && player.vy >= 0) {
        player.y = block.y - player.height;
        player.vy = 0;
        player.isGrounded = true;
      } else if (prevY >= block.y + block.h - 6 && player.vy < 0) {
        player.y = block.y + block.h;
        player.vy = 0;
      } else if (overlapLeft < overlapRight) {
        player.x = block.x - player.width;
      } else {
        player.x = block.x + block.w;
      }
    }
  }
}

function updatePlayer(player, enemy, input) {
  if (world.gameOver) return;

  const d = player.data;

  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.attackTimer > 0) player.attackTimer--;
  if (player.hurtTimer > 0) player.hurtTimer--;

  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  player.vx = moveDir * d.speed;
  player.x += player.vx;
  handleArenaCollision(player);

  const startedGrounded = player.isGrounded;
  player.isGrounded = false;
  if (input.jump && startedGrounded) {
    player.vy = -d.jump;
    player.isGrounded = false;
  }

  player.vy += world.gravity;
  player.y += player.vy;
  handleArenaCollision(player);

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
      player.charge = clamp(player.charge + 8, 0, 100);
      if (player.attackType === "special") {
        world.shake = 18;
      }
    }
  }

  player.charge = clamp(player.charge + 0.18, 0, 100);
  player.x = clamp(player.x, 30, world.width - player.width - 30);

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

  collectCoins(player);
}

function drawCoin(coin) {
  if (coin.collected) return;
  ctx.fillStyle = "#ffd76a";
  ctx.beginPath();
  ctx.arc(coin.x - world.cameraX, coin.y, coin.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff4bc";
  ctx.fillRect(coin.x - world.cameraX - 2, coin.y - 2, 4, 4);
}

function drawPlayer(player) {
  const d = player.data;
  const screenX = player.x - world.cameraX;

  ctx.save();
  ctx.translate(screenX + player.width / 2, player.y + player.height / 2);
  ctx.scale(player.facing, 1);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(-18, 38, 36, 6);

  ctx.fillStyle = player.color;
  ctx.fillRect(-14, -32, 28, 64);

  ctx.fillStyle = "#f0d7b9";
  ctx.fillRect(-12, -46, 24, 18);

  if (player.isAttacking) {
    ctx.fillStyle = player.attackType === "special" ? d.specialColor : "#fff7d6";
    const range = player.attackType === "light" ? 38 :
      player.attackType === "heavy" ? 48 :
      80;
    ctx.fillRect(16, -22, range, 44);
  }

  ctx.restore();

  ctx.fillStyle = "#2f3b4a";
  ctx.fillRect(screenX - 8, player.y - 18, 52, 8);
  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = "#56ff88";
  ctx.fillRect(screenX - 8, player.y - 18, 52 * hpRatio, 8);

  ctx.fillStyle = "#1d2732";
  ctx.fillRect(screenX - 8, player.y - 8, 52, 5);
  ctx.fillStyle = "#7bdcff";
  ctx.fillRect(screenX - 8, player.y - 8, 52 * (player.charge / 100), 5);

  if (player.hurtTimer > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(screenX - 8, player.y - 18, 52, 8);
  }
}

function drawBlocks() {
  for (const block of BLOCKS) {
    const x = block.x - world.cameraX;
    ctx.fillStyle = block.color;
    ctx.fillRect(x, block.y, block.w, block.h);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, block.y, block.w, 4);
  }

  const shopX = shopBooth.x - world.cameraX;
  ctx.fillStyle = "#74572c";
  ctx.fillRect(shopX, shopBooth.y, shopBooth.w, shopBooth.h);
  ctx.fillStyle = "#d9b15d";
  ctx.fillRect(shopX + 12, shopBooth.y + 10, shopBooth.w - 24, 24);
  ctx.fillStyle = "#1d1a15";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("BEAST", shopX + shopBooth.w / 2, shopBooth.y + 26);
  ctx.fillText("SHOP", shopX + shopBooth.w / 2, shopBooth.y + 38);
}

function drawArena() {
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#162b3d");
  bg.addColorStop(1, "#0c1620");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 40; i++) {
    const x = i * 50 - (world.cameraX * 0.4) % 50;
    const h = 35 + ((i * 17) % 90);
    ctx.fillStyle = "#1a2d3d";
    ctx.fillRect(x, 260 - h, 30, h);
  }

  ctx.fillStyle = "#283c2d";
  ctx.fillRect(0, world.floorY, canvas.width, canvas.height - world.floorY);

  ctx.fillStyle = "#3c5647";
  for (let i = 0; i < 100; i++) {
    ctx.fillRect(i * 12 - (world.cameraX * 0.5) % 12, world.floorY + 8 + (i % 4) * 2, 6, 6);
  }

  drawBlocks();
  for (const coin of coinsList) drawCoin(coin);
}

function drawCenterText() {
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${p1.name} vs ${p2.name}`, canvas.width / 2, 26);
}

function drawHud() {
  ctx.fillStyle = "rgba(9, 14, 24, 0.7)";
  ctx.fillRect(12, 12, 180, 52);
  ctx.fillStyle = "#f7d35d";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`Coins: ${shopState.coins}`, 24, 34);
  ctx.fillStyle = "#7bdcff";
  ctx.fillText(`Hero: ${shopState.selected}`, 24, 52);

  ctx.fillStyle = "rgba(9, 14, 24, 0.7)";
  ctx.fillRect(canvas.width - 180, 12, 160, 52);
  ctx.fillStyle = "#7bdcff";
  ctx.fillText("B: Beast Shop", canvas.width - 168, 34);
  ctx.fillStyle = "#7bdcff";
  ctx.fillText("R: Restart", canvas.width - 168, 52);
}

function drawShopOverlay() {
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#7bdcff";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillText("BEAST SHOP", canvas.width / 2, 60);

  const items = Object.keys(HEROES);
  const cols = 2;
  const startX = 120;
  const startY = 110;
  const boxW = 300;
  const boxH = 120;

  items.forEach((type, index) => {
    const item = HEROES[type];
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = startX + col * (boxW + 40);
    const y = startY + row * (boxH + 24);

    const owned = shopState.inventory.includes(type);
    const available = shopState.coins >= item.shopCost && !owned;

    ctx.fillStyle = owned ? "#1d2a33" : "#172639";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, boxW, boxH);

    ctx.fillStyle = item.color;
    ctx.font = "bold 18px monospace";
    ctx.fillText(item.name, x + boxW / 2, y + 28);

    ctx.fillStyle = "#d8d8d8";
    ctx.font = "12px monospace";
    ctx.fillText(`HP ${item.maxHp}  |  Speed ${item.speed.toFixed(1)}`, x + 20, y + 52);
    ctx.fillText(`${item.description}`, x + 20, y + 72);

    if (owned) {
      ctx.fillStyle = "#7dff9a";
      ctx.fillText("OWNED", x + boxW - 74, y + 28);
    } else {
      const label = `BUY ${item.shopCost}`;
      ctx.fillStyle = available ? "#ffd76a" : "#ff7f7f";
      ctx.fillText(label, x + 20, y + 95);
      ctx.fillStyle = "#b0c6dc";
      ctx.fillText(`Press ${index + 1}`, x + boxW - 92, y + 95);
    }
  });

  ctx.fillStyle = "#d6ecff";
  ctx.font = "14px monospace";
  ctx.fillText(`Coins: ${shopState.coins}`, canvas.width / 2, canvas.height - 26);
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
    ctx.fillText(`${winner} WINS!`, canvas.width / 2, 200);

    ctx.fillStyle = "#7bdcff";
    ctx.font = "16px monospace";
    ctx.fillText("Press R to restart", canvas.width / 2, 280);
    return true;
  }
  return false;
}

function gameLoop() {
  world.timer++;

  const toggleShop = keys["b"] && !keyWasDown.b;
  if (toggleShop) {
    shopState.open = !shopState.open;
  }
  keyWasDown.b = !!keys["b"];

  if (shopState.open) {
    drawArena();
    drawHud();
    drawShopOverlay();

    const buyKeys = ["1", "2", "3", "4", "5"];
    const heroOrder = Object.keys(HEROES);
    buyKeys.forEach((key, index) => {
      if (keys[key]) {
        buyHero(heroOrder[index]);
      }
    });

    if (keys["r"] && !keyWasDown.r) {
      resetGame();
    }
    keyWasDown.r = !!keys["r"];

    requestAnimationFrame(gameLoop);
    return;
  }

  if (keys["r"] && !keyWasDown.r) {
    resetGame();
  }
  keyWasDown.r = !!keys["r"];

  world.cameraX = clamp((p1.x + p2.x) / 2 - canvas.width / 2, 0, world.width - canvas.width);

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

  if (p1.x < 0) p1.x = 0;
  if (p2.x < 0) p2.x = 0;

  drawPlayer(p1);
  drawPlayer(p2);
  drawCenterText();
  drawHud();
  ctx.restore();

  world.shake *= 0.75;
  if (world.shake < 0.1) world.shake = 0;

  if (!checkWin()) {
    requestAnimationFrame(gameLoop);
  }
}

requestAnimationFrame(gameLoop);
