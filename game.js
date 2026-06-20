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

const rotatePad = document.getElementById("rotatePad");
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

let gameState = "playing";
let startTime = 0;
let clearTime = 0;

let padDragging = false;
let lastPadX = 0;

const JAR_SCALE = 0.76;
const BALL_R = 14;
const WALL_T = 17;

function resize() {
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  W = rect.width;
  H = rect.height;
  CX = W / 2;
  CY = H / 2 + 12;

  loadLevel(levelIndex);
}

window.addEventListener("resize", resize);

function S(v) {
  return v * JAR_SCALE;
}

function localToWorld(x, y, angle = jarAngle) {
  x = S(x);
  y = S(y);

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

  const dx = S(x2 - x1);
  const dy = S(y2 - y1);

  const len = Math.hypot(dx, dy);
  const baseAngle = Math.atan2(dy, dx);

  const p = localToWorld(mx, my, 0);

  const body = Bodies.rectangle(p.x, p.y, len, WALL_T, {
    isStatic: true,
    friction: 0.9,
    restitution: 0.02
  });

  body.local = {
    x1,
    y1,
    x2,
    y2,
    mx,
    my,
    baseAngle
  };

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
  if (runner) {
    Runner.stop(runner);
  }

  levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
  stageNumber.textContent = levelIndex + 1;

  const level = LEVELS[levelIndex];

  engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.0015;

  walls = [];
  jarAngle = 0;
  targetAngle = 0;

  gameState = "playing";
  startTime = performance.now();
  clearTime = 0;

  for (const line of level.walls) {
    walls.push(makeWall(line));
  }

  ball = Bodies.circle(
    CX + S(level.start.x),
    CY + S(level.start.y),
    BALL_R,
    {
      friction: 0.35,
      frictionAir: 0.012,
      restitution: 0.02,
      density: 0.004
    }
  );

  exitSensor = Bodies.rectangle(
    CX + S(level.exit.x),
    CY + S(level.exit.y),
    S(level.exit.w),
    28,
    {
      isStatic: true,
      isSensor: true
    }
  );

  World.add(engine.world, [...walls, ball, exitSensor]);

  Events.on(engine, "collisionStart", e => {
    if (gameState !== "playing") return;

    for (const pair of e.pairs) {
      if (
        (pair.bodyA === ball && pair.bodyB === exitSensor) ||
        (pair.bodyB === ball && pair.bodyA === exitSensor)
      ) {
        gameState = "clear";
        clearTime = (performance.now() - startTime) / 1000;
      }
    }
  });

  runner = Runner.create();
  Runner.run(runner, engine);

  updateWalls();
}

function getElapsedTime() {
  if (gameState === "clear") return clearTime;
  return (performance.now() - startTime) / 1000;
}

function getRemainingTime() {
  const level = LEVELS[levelIndex];
  return Math.max(0, level.timeLimit - getElapsedTime());
}

function update() {
  jarAngle += (targetAngle - jarAngle) * 0.26;
  updateWalls();

  if (gameState === "playing") {
    if (getRemainingTime() <= 0) {
      gameState = "timeover";
    }

    if (ball.position.y > H + 100 || ball.position.x < -100 || ball.position.x > W + 100) {
      loadLevel(levelIndex);
    }
  }
}

function drawJarShadow() {
  ctx.save();
  ctx.translate(CX, CY + S(20));
  ctx.rotate(jarAngle);

  ctx.beginPath();
  ctx.ellipse(0, S(135), S(105), S(18), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15, 23, 42, 0.12)";
  ctx.fill();

  ctx.restore();
}

function drawWallLine(wall) {
  const p1 = localToWorld(wall.local.x1, wall.local.y1, jarAngle);
  const p2 = localToWorld(wall.local.x2, wall.local.y2, jarAngle);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineWidth = WALL_T + 8;
  ctx.strokeStyle = "#5b4033";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineWidth = WALL_T + 1;
  ctx.strokeStyle = "#c98f5a";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.stroke();
}

function drawJarBodyGlow() {
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(jarAngle);

  ctx.beginPath();
  ctx.ellipse(0, S(0), S(152), S(172), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(201, 143, 90, 0.08)";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, S(-150), S(68), S(18), 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(91, 64, 51, 0.45)";
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.restore();
}

function drawExit() {
  const level = LEVELS[levelIndex];

  ctx.save();
  ctx.translate(exitSensor.position.x, exitSensor.position.y);
  ctx.rotate(jarAngle);

  ctx.fillStyle = "#22c55e";
  ctx.strokeStyle = "#14532d";
  ctx.lineWidth = 3;

  const w = S(level.exit.w);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -9, w, 18, 8);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.position.x, ball.position.y, BALL_R, 0, Math.PI * 2);

  if (gameState === "clear") {
    ctx.fillStyle = "#22c55e";
  } else if (gameState === "timeover") {
    ctx.fillStyle = "#6b7280";
  } else {
    ctx.fillStyle = "#f97316";
  }

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
  const level = LEVELS[levelIndex];
  const remain = getRemainingTime();

  ctx.textAlign = "center";
  ctx.fillStyle = "#111";

  ctx.font = "bold 18px Arial";
  ctx.fillText(level.name, CX, 30);

  ctx.font = "bold 16px Arial";
  ctx.fillText(`남은 시간: ${remain.toFixed(1)}초`, CX, 56);

  if (gameState === "clear") {
    ctx.fillStyle = "#16a34a";
    ctx.font = "bold 26px Arial";
    ctx.fillText("CLEAR!", CX, 96);

    ctx.font = "bold 17px Arial";
    ctx.fillText(`클리어 시간: ${clearTime.toFixed(2)}초`, CX, 124);
  }

  if (gameState === "timeover") {
    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 26px Arial";
    ctx.fillText("TIME OVER", CX, 96);

    ctx.font = "bold 16px Arial";
    ctx.fillText("다시 버튼을 눌러 재도전", CX, 124);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  drawJarShadow();
  drawJarBodyGlow();
  drawExit();

  walls.forEach(drawWallLine);

  drawBall();
  drawUI();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

rotatePad.addEventListener("pointerdown", e => {
  padDragging = true;
  lastPadX = e.clientX;
  rotatePad.setPointerCapture(e.pointerId);
});

rotatePad.addEventListener("pointermove", e => {
  if (!padDragging) return;
  if (gameState !== "playing") return;

  const dx = e.clientX - lastPadX;
  targetAngle += dx * 0.012;

  lastPadX = e.clientX;
});

rotatePad.addEventListener("pointerup", e => {
  padDragging = false;
  rotatePad.releasePointerCapture(e.pointerId);
});

rotatePad.addEventListener("pointercancel", e => {
  padDragging = false;
  rotatePad.releasePointerCapture(e.pointerId);
});

document.addEventListener("keydown", e => {
  if (gameState !== "playing") {
    if (e.key === "r" || e.key === "R") loadLevel(levelIndex);
    return;
  }

  if (e.key === "ArrowLeft") targetAngle -= 0.09;
  if (e.key === "ArrowRight") targetAngle += 0.09;
  if (e.key === "r" || e.key === "R") loadLevel(levelIndex);
});

prevBtn.onclick = () => loadLevel(levelIndex - 1);
resetBtn.onclick = () => loadLevel(levelIndex);
nextBtn.onclick = () => loadLevel(levelIndex + 1);

resize();
loop();