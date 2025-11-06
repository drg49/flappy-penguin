const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

const PIPE_SCALE = 0.75;
const PIPE_TEXTURE_W = 360;
const PIPE_TEXTURE_H = 693;
const PIPE_SPEED = -220;
const GAP_SIZE = 220; // vertical gap for penguin

// Adjustable top pipe collider
const TOP_COLLIDER_WIDTH_RATIO = 0.6;
const TOP_COLLIDER_HEIGHT_RATIO = 1.05;
const TOP_COLLIDER_OFFSET_X = 0;
const TOP_COLLIDER_OFFSET_Y = -5;

// Adjustable bottom pipe collider
const BOTTOM_COLLIDER_WIDTH_RATIO = 0.4;
const BOTTOM_COLLIDER_HEIGHT_RATIO = 0.97; // now close to pipe height
const BOTTOM_COLLIDER_OFFSET_X = 45;

const config = {
  type: Phaser.AUTO,
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 900 }, debug: true },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
  scene: { preload, create, update },
};

new Phaser.Game(config);

let penguin;
let pipes;
let score = 0;
let scoreText;
let gameOver = false;
let gameStarted = false;
let background;

function preload() {
  this.load.image("background_1", "assets/background_1.jpg");
  this.load.image("background_2", "assets/background_2.jpg");
  this.load.image("background_3", "assets/background_3.jpg");

  this.load.image("pipeTop", "assets/pipe_top.png");
  this.load.image("pipeBottom", "assets/pipe_bottom.png");

  this.load.image("penguin_idle", "assets/penguin_idle.png");
  this.load.image("penguin_jump", "assets/penguin_jump.png");
  this.load.image("penguin_death", "assets/penguin_death.png");

  this.load.audio("jump", "assets/jump.wav");
  this.load.audio("hit", "assets/hit.wav");
}

function create() {
  background = this.add
    .image(0, 0, "background_1")
    .setOrigin(0, 0)
    .setDisplaySize(BASE_WIDTH, BASE_HEIGHT);

  penguin = this.physics.add.sprite(
    BASE_WIDTH * 0.25,
    BASE_HEIGHT / 2,
    "penguin_idle"
  );
  penguin.setScale(0.65);

  const pengRadius = (penguin.displayWidth * 0.36) / 2;
  penguin.body.setCircle(pengRadius);
  penguin.body.setOffset(
    penguin.displayWidth / 2 - pengRadius,
    penguin.displayHeight / 2 - pengRadius
  );
  penguin.setCollideWorldBounds(true);

  pipes = this.physics.add.group();

  scoreText = this.add.text(12, 10, "Score: 0", {
    fontSize: "24px",
    fill: "#fff",
    stroke: "#000",
    strokeThickness: 3,
  });

  this.input.on("pointerdown", flap, this);
  this.input.keyboard.on("keydown-SPACE", flap, this);

  addPipeRow.call(this);

  this.time.addEvent({
    delay: 1500,
    callback: addPipeRow,
    callbackScope: this,
    loop: true,
  });

  this.physics.add.collider(penguin, pipes, hitPipe, null, this);

  const bgSelect = document.getElementById("backgroundSelect");
  if (bgSelect) {
    bgSelect.addEventListener("change", () => {
      background.setTexture(bgSelect.value);
      background.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    });
  }

  this.time.delayedCall(150, () => {
    gameStarted = true;
  });
}

function update() {
  if (gameOver || !gameStarted) return;

  if (penguin.body.velocity.y > 0) penguin.setTexture("penguin_idle");

  const safeMargin = penguin.displayHeight / 2;
  if (penguin.y < safeMargin || penguin.y > BASE_HEIGHT - safeMargin) {
    endGame(this);
  }

  pipes.getChildren().forEach((pipe) => {
    if (pipe.x + pipe.displayWidth / 2 < 0) pipe.destroy();
  });
}

function flap() {
  if (gameOver) return;
  penguin.setVelocityY(-340);
  penguin.setTexture("penguin_jump");
  if (this.sound.get("jump")) this.sound.play("jump");
}

function addPipeRow() {
  if (gameOver) return;

  const pipeHeight = PIPE_TEXTURE_H * PIPE_SCALE;
  const pipeWidth = PIPE_TEXTURE_W * PIPE_SCALE;
  const minGapCenter = GAP_SIZE / 2 + 40;
  const maxGapCenter = BASE_HEIGHT - GAP_SIZE / 2 - 40;
  const gapCenter = Phaser.Math.Between(minGapCenter, maxGapCenter);

  const topY = gapCenter - GAP_SIZE / 2;
  const bottomY = gapCenter + GAP_SIZE / 2;
  const spawnX = BASE_WIDTH + pipeWidth / 2 + 10;

  const topPipe = pipes
    .create(spawnX, topY, "pipeTop")
    .setScale(PIPE_SCALE)
    .setOrigin(0.5, 1);
  const bottomPipe = pipes
    .create(spawnX, bottomY, "pipeBottom")
    .setScale(PIPE_SCALE)
    .setOrigin(0.5, 0);

  [topPipe, bottomPipe].forEach((pipe) => {
    pipe.setVelocityX(PIPE_SPEED);
    pipe.setImmovable(true);
    pipe.body.allowGravity = false;
  });

  // Top pipe collider - fully adjustable
  topPipe.body.setSize(
    topPipe.displayWidth * TOP_COLLIDER_WIDTH_RATIO,
    topPipe.displayHeight * TOP_COLLIDER_HEIGHT_RATIO
  );
  topPipe.body.setOffset(
    (topPipe.displayWidth - topPipe.displayWidth * TOP_COLLIDER_WIDTH_RATIO) /
      2 +
      TOP_COLLIDER_OFFSET_X,
    topPipe.displayHeight -
      topPipe.displayHeight * TOP_COLLIDER_HEIGHT_RATIO +
      TOP_COLLIDER_OFFSET_Y
  );

  // Bottom pipe collider - adjusted height and centered
  const colliderWidth = bottomPipe.displayWidth * BOTTOM_COLLIDER_WIDTH_RATIO;
  const colliderHeight =
    bottomPipe.displayHeight * BOTTOM_COLLIDER_HEIGHT_RATIO;
  const offsetX =
    (bottomPipe.displayWidth - colliderWidth) / 2 + BOTTOM_COLLIDER_OFFSET_X;
  const offsetY =
    bottomPipe.displayHeight - colliderHeight;

  bottomPipe.body.setSize(colliderWidth, colliderHeight);
  bottomPipe.body.setOffset(offsetX, offsetY);

  score++;
  scoreText.setText("Score: " + score);
}

function hitPipe() {
  if (gameOver) return;
  if (this.sound.get("hit")) this.sound.play("hit");
  endGame(this);
}

function endGame(scene) {
  gameOver = true;
  penguin.setTexture("penguin_death");
  penguin.setVelocity(0);
  pipes.getChildren().forEach((p) => p.setVelocityX(0));
  scene.add.text(BASE_WIDTH / 2 - 80, BASE_HEIGHT / 2, "Game Over", {
    fontSize: "36px",
    fill: "#fff",
    stroke: "#000",
    strokeThickness: 4,
  });
}
