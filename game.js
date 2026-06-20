const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const stageNumber = document.getElementById("stageNumber");
const prevBtn = document.getElementById("prevBtn");
const resetBtn = document.getElementById("resetBtn");
const nextBtn = document.getElementById("nextBtn");

let W, H, CX, CY;
let levelIndex = 0;
let angle = 0;

let ball = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  r: 15
};

let clear = false;
let dragging = false;
let lastPointerX = 0;

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  W = rect.width;
  H = rect.height;
  CX = W / 2;
  CY = H / 2;
}

window.addEventListener("resize", resize);
resize();

function loadLevel(index) {
  levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
  const level = LEVELS[levelIndex];

  angle = 0;
  clear = false;

  ball.x = CX + level.start.x;
  ball.y = CY + level.start.y;
  ball.vx = 0;
  ball.vy = 0;

  stageNumber.textContent = levelIndex + 1;
}

function rotatePoint(x, y, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);

  return {
    x: CX + x * c - y * s,
    y: CY + x * s + y * c
  };
}

function getWorldWalls() {
  const level = LEVELS[levelIndex];

  return level.walls.map(w => {
    const p1 = rotatePoint(w[0], w[1], angle);
    const p2 = rotatePoint(w[2], w[3], angle);
    return [p1.x, p1.y, p2.x, p2.y];
  });
}

function collideBallWithSegment(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const px = x1 + t * dx;
  const py = y1 + t * dy;

  const bx = ball.x - px;
  const by = ball.y - py;
  const dist = Math.sqrt(bx * bx + by * by);

  if (dist < ball.r && dist > 0.001) {
    const nx = bx / dist;
    const ny = by / dist;

    const overlap = ball.r - dist;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const dot = ball.vx * nx + ball.vy * ny;

    if (dot < 0) {
      ball.vx -= 1.55 * dot * nx;
      ball.vy -= 1.55 * dot * ny;
    }

    ball.vx *= 0.985;
    ball.vy *= 0.985;
  }
}

function checkClear() {
  const level = LEVELS[levelIndex];
  const exit = rotatePoint(level.exit.x, level.exit.y, angle);

  const dx = ball.x - exit.x;
  const dy = ball.y - exit.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < level.exit.w * 0.65 && ball.y > exit.y - 20) {
    clear = true;
  }
}

function update() {
  if (!clear) {
    ball.vy += 0.28;

    ball.x += ball.vx;
    ball.y += ball.vy;

    const walls = getWorldWalls();
    for (const wall of walls) {
      collideBallWithSegment(...wall);
    }

    ball.vx *= 0.995;
    ball.vy *= 0.995;

    checkClear();
  }
}

function drawJar() {
  const level = LEVELS[levelIndex];
  const walls = getWorldWalls();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#1f2937";

  for (const w of walls) {
    ctx.beginPath();
    ctx.moveTo(w[0], w[1]);
    ctx.lineTo(w[2], w[3]);
    ctx.stroke();
  }

  const exit = rotatePoint(level.exit.x, level.exit.y, angle);

  ctx.save();
  ctx.translate(exit.x, exit.y);
  ctx.rotate(angle);
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(-level.exit.w / 2, -6, level.exit.w, 12);
  ctx.restore();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = clear ? "#22c55e" : "#f97316";
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#111";
  ctx.stroke();
}

function drawUI() {
  ctx.fillStyle = "#111";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";

  if (clear) {
    ctx.fillText("CLEAR!", CX, 46);
    ctx.font = "14px Arial";
    ctx.fillText("다음 버튼을 눌러 진행", CX, 70);
  } else {
    ctx.fillText(LEVELS[levelIndex].name, CX, 34);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  drawJar();
  drawBall();
  drawUI();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") angle -= 0.055;
  if (e.key === "ArrowRight") angle += 0.055;
  if (e.key === "r") loadLevel(levelIndex);
});

canvas.addEventListener("pointerdown", e => {
  dragging = true;
  lastPointerX = e.clientX;
});

canvas.addEventListener("pointermove", e => {
  if (!dragging) return;

  const dx = e.clientX - lastPointerX;
  angle += dx * 0.02;
  lastPointerX = e.clientX;
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
});

canvas.addEventListener("pointercancel", () => {
  dragging = false;
});

prevBtn.onclick = () => loadLevel(levelIndex - 1);
resetBtn.onclick = () => loadLevel(levelIndex);
nextBtn.onclick = () => loadLevel(levelIndex + 1);

loadLevel(0);
loop();