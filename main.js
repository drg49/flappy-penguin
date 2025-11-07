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

// Adjustable penguin rectangle collider
let PENGUIN_COLLIDER_WIDTH_RATIO = 0.3;
let PENGUIN_COLLIDER_HEIGHT_RATIO = 0.65;
let PENGUIN_COLLIDER_OFFSET_X = 5;
let PENGUIN_COLLIDER_OFFSET_Y = 6.5;

const config = {
  type: Phaser.AUTO,
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 900 } },
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
  scoreText,
  titleText,
  instructionText,
  creatorText;
let gameOver = false,
  gameStarted = false;
let background;

// Sounds
let jumpSound, hitSound;

// Idle animation
let idleTween;

// References for Game Over UI and pipe timer
let gameOverText;
let pipeTimer;
let restartButton;

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
  // Background
  background = this.add
    .image(0, 0, "background_1")
    .setOrigin(0, 0)
    .setDisplaySize(BASE_WIDTH, BASE_HEIGHT);

  const bgSelect = document.getElementById("backgroundSelect");
  if (bgSelect) {
    const savedBackground =
      localStorage.getItem("selectedBackground") || "background_1";
    bgSelect.value = savedBackground;

    if (this.textures.exists(savedBackground)) {
      background.setTexture(savedBackground);
      background.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    }

    bgSelect.addEventListener("change", () => {
      const selected = bgSelect.value;
      if (this.textures.exists(selected)) {
        background.setTexture(selected);
        background.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
        localStorage.setItem("selectedBackground", selected);
      }
    });
  }

  // Penguin setup
  penguin = this.physics.add.sprite(
    BASE_WIDTH * 0.25,
    BASE_HEIGHT / 2,
    "penguin_idle"
  );
  penguin.setScale(0.95);
  penguin.setCollideWorldBounds(true);

  // Rectangle collider for penguin
  const pengWidth = penguin.displayWidth * PENGUIN_COLLIDER_WIDTH_RATIO;
  const pengHeight = penguin.displayHeight * PENGUIN_COLLIDER_HEIGHT_RATIO;
  penguin.body.setSize(pengWidth, pengHeight);
  penguin.body.setOffset(
    (penguin.displayWidth - pengWidth) / 2 + PENGUIN_COLLIDER_OFFSET_X,
    (penguin.displayHeight - pengHeight) / 2 + PENGUIN_COLLIDER_OFFSET_Y
  );

  penguin.body.allowGravity = false;
  penguin.body.setVelocity(0);

  pipes = this.physics.add.group();

  scoreText = this.add
    .text(12, 10, "Score: 0", {
      fontSize: "24px",
      fill: "#fff",
      stroke: "#000",
      strokeThickness: 3,
    })
    .setDepth(10)
    .setVisible(false);

  titleText = this.add
    .text(BASE_WIDTH / 2, BASE_HEIGHT / 8, "Flappy Penguin", {
      fontSize: "48px",
      fill: "#fff",
      stroke: "#000",
      strokeThickness: 6,
    })
    .setOrigin(0.5);

  creatorText = this.add
    .text(BASE_WIDTH / 2, BASE_HEIGHT / 8 + 45, "Created by Daniel Gavin", {
      fontSize: "16px",
      fill: "#fff",
      stroke: "#000",
      strokeThickness: 3,
    })
    .setOrigin(0.5);

  instructionText = this.add
    .text(
      BASE_WIDTH / 2,
      BASE_HEIGHT / 3,
      "Use mouse or spacebar to start\n(click for mobile)",
      {
        fontSize: "24px",
        fill: "#fff",
        stroke: "#000",
        strokeThickness: 4,
        align: "center",
      }
    )
    .setOrigin(0.5);

  jumpSound = this.sound.add("jump");
  hitSound = this.sound.add("hit");

  idleTween = this.tweens.add({
    targets: penguin,
    y: penguin.y + 20,
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  // First-time start listeners
  this.input.once("pointerdown", startGame, this);
  this.input.keyboard.once("keydown-SPACE", startGame, this);
  this.input.on("pointerdown", flap, this);
  this.input.keyboard.on("keydown-SPACE", flap, this);

  this.physics.add.collider(penguin, pipes, hitPipe, null, this);
}

function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  idleTween.stop();
  penguin.body.allowGravity = true;

  titleText.setVisible(false);
  instructionText.setVisible(false);
  creatorText.setVisible(false);

  scoreText.setVisible(true);

  if (!pipeTimer) {
    pipeTimer = this.time.addEvent({
      delay: 1500,
      callback: addPipeRow,
      callbackScope: this,
      loop: true,
    });
  }
}

function update() {
  if (gameOver || !gameStarted) return;

  if (penguin.body.velocity.y > 0) penguin.setTexture("penguin_idle");

  if (penguin.body.top <= 0 || penguin.body.bottom >= BASE_HEIGHT) {
    if (!gameOver) hitSound.play();
    endGame(this);
  }

  pipes.getChildren().forEach((pipe) => {
    if (pipe.x + pipe.displayWidth / 2 < 0) pipe.destroy();
  });

  pipes.getChildren().forEach((pipe) => {
    if (!pipe.scored && pipe.texture.key === "pipeTop" && penguin.x > pipe.x) {
      score++;
      scoreText.setText("Score: " + score);
      pipe.scored = true;
    }
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
    pipe.scored = false;
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
}

function hitPipe() {
  if (gameOver) return;
  hitSound.play();
  endGame(this);
}

function endGame(scene) {
  gameOver = true;

  // Change texture to death and enable ragdoll
  penguin.setTexture("penguin_death");
  penguin.body.allowGravity = true;
  penguin.setVelocity(
    Phaser.Math.Between(-200, 200),
    Phaser.Math.Between(-400, -200)
  );
  penguin.setAngularVelocity(Phaser.Math.Between(-200, 200));

  // Stop pipes
  if (pipeTimer) {
    pipeTimer.remove(false);
    pipeTimer = null;
  }
  pipes.getChildren().forEach((p) => p.setVelocityX(0));

  // Show Game Over UI
  gameOverText = scene.add
    .text(BASE_WIDTH / 2, BASE_HEIGHT / 2, "Game Over", {
      fontSize: "36px",
      fill: "#fff",
      stroke: "#000",
      strokeThickness: 4,
    })
    .setOrigin(0.5);

  // Styled restart button
  restartButton = scene.add
    .text(0, 0, "Restart", {
      fontSize: "28px",
      fill: "#ffd700",
      stroke: "#000",
      strokeThickness: 4,
      padding: { x: 20, y: 10 },
      backgroundColor: "#444",
    })
    .setOrigin(0.5)
    .setPosition(BASE_WIDTH / 2, BASE_HEIGHT / 2 + 50)
    .setInteractive({ useHandCursor: true });

  restartButton.on("pointerover", () => {
    restartButton.setStyle({ fill: "#ffff00", backgroundColor: "#666" });
    restartButton.setScale(1.1);
  });

  restartButton.on("pointerout", () => {
    restartButton.setStyle({ fill: "#ffd700", backgroundColor: "#444" });
    restartButton.setScale(1);
  });

  restartButton.on("pointerdown", () => restartGame(scene));
}

function restartGame(scene) {
  pipes.clear(true, true);

  if (gameOverText) {
    gameOverText.destroy();
    gameOverText = null;
  }
  if (restartButton) {
    restartButton.destroy();
    restartButton = null;
  }

  gameOver = false;
  gameStarted = false;
  score = 0;
  scoreText.setText("Score: 0");
  scoreText.setVisible(false);

  penguin.setTexture("penguin_idle");
  penguin.setPosition(BASE_WIDTH * 0.25, BASE_HEIGHT / 2);
  penguin.body.allowGravity = false;
  penguin.setVelocity(0);
  penguin.setAngularVelocity(0);
  penguin.setAngle(0);

  const pengWidth = penguin.displayWidth * PENGUIN_COLLIDER_WIDTH_RATIO;
  const pengHeight = penguin.displayHeight * PENGUIN_COLLIDER_HEIGHT_RATIO;
  penguin.body.setSize(pengWidth, pengHeight);
  penguin.body.setOffset(
    (penguin.displayWidth - pengWidth) / 2 + PENGUIN_COLLIDER_OFFSET_X,
    (penguin.displayHeight - pengHeight) / 2 + PENGUIN_COLLIDER_OFFSET_Y
  );

  idleTween = scene.tweens.add({
    targets: penguin,
    y: penguin.y + 20,
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  instructionText.setVisible(true);

  scene.input.once("pointerdown", startGame, scene);
  scene.input.keyboard.once("keydown-SPACE", startGame, scene);
}
