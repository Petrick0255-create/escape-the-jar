const {
  Engine,
  World,
  Bodies,
  Body,
  Runner,
  Events
} = Matter;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const stageNumber = document.getElementById("stageNumber");
const prevBtn = document.getElementById("prevBtn");
const resetBtn = document.getElementById("resetBtn");
const nextBtn = document.getElementById("nextBtn");

let W, H, CX, CY;

let engine;
let runner;
let ball;
let exitSensor;
let walls = [];

let levelIndex = 0;
let jarAngle = 0;
let targetAngle = 0;
let clear = false;

let dragging = false;
let lastPointerAngle = 0;

const BALL_R = 15;
const WALL_T = 16;

function resize() {
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  W = rect.width;
  H = rect.height;
  CX = W / 2;
  CY = H / 2;

  loadLevel(levelIndex);
}

window.addEventListener("resize", resize);

function localToWorld(x, y, angle = jarAngle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return {
    x: CX + x * c - y * s,
    y: CY + x * s + y * c
  };
}

function makeWall(line) {
  const [x1, y1, x2, y2] = line;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  const dx = x2 - x1;
  const dy = y2 - y1;

  const len = Math.hypot(dx, dy);
  const baseAngle = Math.atan2(dy, dx);

  const p = localToWorld(mx, my, 0);

  const body = Bodies.rectangle(p.x, p.y, len, WALL_T, {
    isStatic: true,
    friction: 0.8,
    restitution: 0.02
  });

  body.local = { mx, my, baseAngle, len };

  Body.setAngle(body, baseAngle);

  return body;
}

function updateWalls() {
  for (const wall of walls) {
    const p = localToWorld(wall.local.mx, wall.local.my, jarAngle);

    Body.setPosition(wall, p);
    Body.setAngle(wall, wall.local.baseAngle + jarAngle);
  }

  const level = LEVELS[levelIndex];
  const ep = localToWorld(level.exit.x, level.exit.y, jarAngle);

  Body.setPosition(exitSensor, ep);
  Body.setAngle(exitSensor, jarAngle);
}

function loadLevel(index) {
  if (runner) Runner.stop(runner);

  levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
  stageNumber.textContent = levelIndex + 1;

  const level = LEVELS[levelIndex];

  engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.0014;

  walls = [];
  jarAngle = 0;
  targetAngle = 0;
  clear = false;

  for (const line of level.walls) {
    walls.push(makeWall(line));
  }

  ball = Bodies.circle(
    CX + level.start.x,
    CY + level.start.y,
    BALL_R,
    {
      friction: 0.35,
      frictionAir: 0.01,
      restitution: 0.02,
      density: 0.003
    }
  );

  exitSensor = Bodies.rectangle(
    CX + level.exit.x,
    CY + level.exit.y,
    level.exit.w,
    28,
    {
      isStatic: true,
      isSensor: true
    }
  );

  World.add(engine.world, [...walls, ball, exitSensor]);

  Events.on(engine, "collisionStart", e => {
    for (const pair of e.pairs) {
      if (
        (pair.bodyA === ball && pair.bodyB === exitSensor) ||
        (pair.bodyB === ball && pair.bodyA === exitSensor)
      ) {
        clear = true;
      }
    }
  });

  runner = Runner.create();
  Runner.run(runner, engine);

  updateWalls();
}

function getPointerAngle(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  return Math.atan2(y - CY, x - CX);
}

function update() {
  jarAngle += (targetAngle - jarAngle) * 0.28;
  updateWalls();

  if (ball.position.y > H + 80) {
    if (!clear) loadLevel(levelIndex);
  }
}

function drawWall(wall) {
  const v = wall.vertices;

  ctx.beginPath();
  ctx.moveTo(v[0].x, v[0].y);

  for (let i = 1; i < v.length; i++) {
    ctx.lineTo(v[i].x, v[i].y);
  }

  ctx.closePath();
  ctx.fillStyle = "#1f2937";
  ctx.fill();
}

function drawExit() {
  const level = LEVELS[levelIndex];

  ctx.save();
  ctx.translate(exitSensor.position.x, exitSensor.position.y);
  ctx.rotate(jarAngle);

  ctx.fillStyle = "#22c55e";
  ctx.fillRect(-level.exit.w / 2, -8, level.exit.w, 16);

  ctx.restore();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.position.x, ball.position.y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = clear ? "#22c55e" : "#f97316";
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#111";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ball.position.x - 5, ball.position.y - 6, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fill();
}

function drawUI() {
  ctx.textAlign = "center";
  ctx.fillStyle = "#111";

  ctx.font = "bold 18px Arial";

  if (clear) {
    ctx.fillText("CLEAR!", CX, 42);
    ctx.font = "14px Arial";
    ctx.fillText("다음 버튼을 눌러 진행", CX, 66);
  } else {
    ctx.fillText(LEVELS[levelIndex].name, CX, 34);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  drawExit();
  walls.forEach(drawWall);
  drawBall();
  drawUI();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", e => {
  dragging = true;
  lastPointerAngle = getPointerAngle(e);
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", e => {
  if (!dragging) return;

  const now = getPointerAngle(e);
  let delta = now - lastPointerAngle;

  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;

  targetAngle += delta;
  lastPointerAngle = now;
});

canvas.addEventListener("pointerup", e => {
  dragging = false;
  canvas.releasePointerCapture(e.pointerId);
});

canvas.addEventListener("pointercancel", e => {
  dragging = false;
  canvas.releasePointerCapture(e.pointerId);
});

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") targetAngle -= 0.08;
  if (e.key === "ArrowRight") targetAngle += 0.08;
  if (e.key === "r" || e.key === "R") loadLevel(levelIndex);
});

prevBtn.onclick = () => loadLevel(levelIndex - 1);
resetBtn.onclick = () => loadLevel(levelIndex);
nextBtn.onclick = () => loadLevel(levelIndex + 1);

resize();
loop();