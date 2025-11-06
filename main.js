const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

const PIPE_SCALE = 0.75;
const PIPE_TEXTURE_W = 360;
const PIPE_TEXTURE_H = 693;
const PIPE_SPEED = -220;

// Gap settings
const BASE_GAP_SIZE = 220;
const MIN_GAP_SIZE = 150;
const MAX_GAP_SIZE = 220;

// Adjustable top pipe collider
let TOP_COLLIDER_WIDTH_RATIO = 0.4;
let TOP_COLLIDER_HEIGHT_RATIO = 1;
let TOP_COLLIDER_OFFSET_X = 45;
let TOP_COLLIDER_OFFSET_Y = 156;

// Adjustable bottom pipe collider
let BOTTOM_COLLIDER_WIDTH_RATIO = 0.4;
let BOTTOM_COLLIDER_HEIGHT_RATIO = 0.97;
let BOTTOM_COLLIDER_OFFSET_X = 45;
let BOTTOM_COLLIDER_OFFSET_Y = 0;

// Adjustable penguin circle collider
let PENGUIN_COLLIDER_RADIUS_RATIO = 0.6;
let PENGUIN_COLLIDER_OFFSET_X = 10;
let PENGUIN_COLLIDER_OFFSET_Y = 10;

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

let penguin,
  pipes,
  score = 0,
  scoreText;
let gameOver = false,
  gameStarted = false;
let background;

// Sounds
let jumpSound, hitSound;

// Idle animation
let idleTween;

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
  penguin.setScale(0.95);
  penguin.setCollideWorldBounds(true);

  const pengRadius = (penguin.displayWidth * PENGUIN_COLLIDER_RADIUS_RATIO) / 2;
  penguin.body.setCircle(pengRadius);
  penguin.body.setOffset(
    penguin.displayWidth / 2 - pengRadius + PENGUIN_COLLIDER_OFFSET_X,
    penguin.displayHeight / 2 - pengRadius + PENGUIN_COLLIDER_OFFSET_Y
  );

  penguin.body.allowGravity = false;
  penguin.body.setVelocity(0);

  pipes = this.physics.add.group();

  scoreText = this.add.text(12, 10, "Score: 0", {
    fontSize: "24px",
    fill: "#fff",
    stroke: "#000",
    strokeThickness: 3,
  });

  jumpSound = this.sound.add("jump");
  hitSound = this.sound.add("hit");

  // Idle bobbing animation
  idleTween = this.tweens.add({
    targets: penguin,
    y: penguin.y + 20,
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  // Background selector
  const bgSelect = document.getElementById("backgroundSelect");
  if (bgSelect) {
    bgSelect.value = "background_1";
    bgSelect.addEventListener("change", () => {
      const selected = bgSelect.value;
      if (this.textures.exists(selected)) {
        background.setTexture(selected);
        background.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
      }
    });
  }

  // Start game on first input
  this.input.once("pointerdown", startGame, this);
  this.input.keyboard.once("keydown-SPACE", startGame, this);

  // Flap input
  this.input.on("pointerdown", flap, this);
  this.input.keyboard.on("keydown-SPACE", flap, this);

  this.physics.add.collider(penguin, pipes, hitPipe, null, this);
}

function startGame() {
  gameStarted = true;

  idleTween.stop();
  penguin.body.allowGravity = true;

  addPipeRow.call(this);
  this.time.addEvent({
    delay: 1500,
    callback: addPipeRow,
    callbackScope: this,
    loop: true,
  });
}

function update() {
  if (gameOver || !gameStarted) return;

  if (penguin.body.velocity.y > 0) penguin.setTexture("penguin_idle");

  const safeMargin = penguin.displayHeight / 2;
  if (penguin.y < safeMargin || penguin.y > BASE_HEIGHT - safeMargin) {
    if (!gameOver) hitSound.play();
    endGame(this);
  }

  pipes.getChildren().forEach((pipe) => {
    if (pipe.x + pipe.displayWidth / 2 < 0) pipe.destroy();
  });
}

function flap() {
  if (gameOver || !gameStarted) return;
  penguin.setVelocityY(-340);
  penguin.setTexture("penguin_jump");
  jumpSound.play();
}

function addPipeRow() {
  if (gameOver) return;

  let gapReduction = Math.floor(score / 5);
  const currentGapSize = Phaser.Math.Clamp(
    BASE_GAP_SIZE - gapReduction,
    MIN_GAP_SIZE,
    MAX_GAP_SIZE
  );
  console.log("Current Gap Size:", currentGapSize);

  const minGapCenter = currentGapSize / 2 + 40;
  const maxGapCenter = BASE_HEIGHT - currentGapSize / 2 - 40;
  const gapCenter = Phaser.Math.Between(minGapCenter, maxGapCenter);

  const spawnX = BASE_WIDTH + (PIPE_TEXTURE_W * PIPE_SCALE) / 2 + 10;

  const topPipe = pipes
    .create(spawnX, gapCenter - currentGapSize / 2, "pipeTop")
    .setScale(PIPE_SCALE)
    .setOrigin(0.5, 1);
  const bottomPipe = pipes
    .create(spawnX, gapCenter + currentGapSize / 2, "pipeBottom")
    .setScale(PIPE_SCALE)
    .setOrigin(0.5, 0);

  [topPipe, bottomPipe].forEach((pipe) => {
    pipe.setVelocityX(PIPE_SPEED);
    pipe.setImmovable(true);
    pipe.body.allowGravity = false;
  });

  topPipe.body.setSize(
    topPipe.displayWidth * TOP_COLLIDER_WIDTH_RATIO,
    topPipe.displayHeight * TOP_COLLIDER_HEIGHT_RATIO
  );
  topPipe.body.setOffset(
    (topPipe.displayWidth - topPipe.body.width) / 2 + TOP_COLLIDER_OFFSET_X,
    topPipe.displayHeight - topPipe.body.height + TOP_COLLIDER_OFFSET_Y
  );

  bottomPipe.body.setSize(
    bottomPipe.displayWidth * BOTTOM_COLLIDER_WIDTH_RATIO,
    bottomPipe.displayHeight * BOTTOM_COLLIDER_HEIGHT_RATIO
  );
  bottomPipe.body.setOffset(
    (bottomPipe.displayWidth - bottomPipe.body.width) / 2 +
      BOTTOM_COLLIDER_OFFSET_X,
    bottomPipe.displayHeight - bottomPipe.body.height + BOTTOM_COLLIDER_OFFSET_Y
  );

  // Increment score starting at 3rd pipe
  if (score >= 2) {
    score++;
    scoreText.setText("Score: " + score);
  } else {
    score++;
  }
}

function hitPipe() {
  if (gameOver) return;
  hitSound.play();
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
