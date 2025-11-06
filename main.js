const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

const config = {
  type: Phaser.AUTO,
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 800 } },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let penguin;
let pipes;
let score = 0;
let scoreText;
let gameOver = false;
let background;
let gameStarted = false;

function preload() {
  // Backgrounds
  this.load.image("background_1", "assets/background_1.jpg");
  this.load.image("background_2", "assets/background_2.jpg");
  this.load.image("background_3", "assets/background_3.jpg");

  // Pipes
  this.load.image("pipeTop", "assets/pipe_top.png");
  this.load.image("pipeBottom", "assets/pipe_bottom.png");

  // Penguins
  this.load.image("penguin_idle", "assets/penguin_idle.png");
  this.load.image("penguin_jump", "assets/penguin_jump.png");
  this.load.image("penguin_death", "assets/penguin_death.png");

  // Sounds
  this.load.audio("jump", "assets/jump.wav");
  this.load.audio("hit", "assets/hit.wav");
}

function create() {
  // Background
  background = this.add
    .image(0, 0, "background_1")
    .setOrigin(0, 0)
    .setDisplaySize(BASE_WIDTH, BASE_HEIGHT)
    .setDepth(-1);

  // Penguin
  const penguinScale = 0.45;
  penguin = this.physics.add
    .sprite(BASE_WIDTH * 0.25, BASE_HEIGHT / 2, "penguin_idle")
    .setScale(penguinScale);
  penguin.body.setSize(penguin.displayWidth, penguin.displayHeight);
  penguin.body.setOffset(0, 0);

  // Pipes group
  pipes = this.physics.add.group();

  // Score
  scoreText = this.add.text(10, 10, "Score: 0", {
    fontSize: "24px",
    fill: "#000",
  });

  // Input
  this.input.on("pointerdown", flap, this);
  this.input.keyboard.on("keydown-SPACE", flap, this);

  // Pipe spawner
  this.time.addEvent({
    delay: 1500,
    callback: addPipeRow,
    callbackScope: this,
    loop: true,
  });

  // Collisions
  this.physics.add.collider(penguin, pipes, hitPipe, null, this);

  // Background selection dropdown
  const bgSelect = document.getElementById("backgroundSelect");
  if (bgSelect) {
    bgSelect.addEventListener("change", () => {
      background.setTexture(bgSelect.value);
      background.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    });
  }

  // Delay before enabling Game Over checks
  this.time.delayedCall(100, () => {
    gameStarted = true;
  });
}

function update() {
  if (!gameOver && gameStarted && penguin && penguin.body) {
    if (penguin.body.velocity.y > 0) penguin.setTexture("penguin_idle");

    const safeMargin = penguin.displayHeight / 2;
    if (penguin.y > BASE_HEIGHT - safeMargin || penguin.y < safeMargin) {
      endGame(this);
    }
  }
}

function flap() {
  if (!gameOver) {
    penguin.setVelocityY(-300);
    penguin.setTexture("penguin_jump");
    this.sound.play("jump");
  }
}

function addPipeRow() {
  if (gameOver) return;

  const pipeScale = 0.7; // scale for 693px pipes
  const pipeHeight = 693 * pipeScale;
  const gapSize = 220; // space for penguin to pass

  // Random vertical position for gap center
  const minGapY = gapSize / 2 + 50;
  const maxGapY = BASE_HEIGHT - gapSize / 2 - 50;
  const gapY = Phaser.Math.Between(minGapY, maxGapY);

  // Top pipe: bottom edge = gapY - gapSize/2
  const pipeTopY = gapY - gapSize / 2 - pipeHeight / 2;
  const pipeTop = pipes
    .create(BASE_WIDTH, pipeTopY, "pipeTop")
    .setScale(pipeScale);
  pipeTop.setVelocityX(-200);
  pipeTop.setImmovable(true);
  pipeTop.body.allowGravity = false;
  pipeTop.body.setSize(pipeTop.displayWidth, pipeTop.displayHeight);
  pipeTop.body.setOffset(0, 0);

  // Bottom pipe: top edge = gapY + gapSize/2
  const pipeBottomY = gapY + gapSize / 2 + pipeHeight / 2;
  const pipeBottom = pipes
    .create(BASE_WIDTH, pipeBottomY, "pipeBottom")
    .setScale(pipeScale);
  pipeBottom.setVelocityX(-200);
  pipeBottom.setImmovable(true);
  pipeBottom.body.allowGravity = false;
  pipeBottom.body.setSize(pipeBottom.displayWidth, pipeBottom.displayHeight);
  pipeBottom.body.setOffset(0, 0);

  score += 1;
  scoreText.setText("Score: " + score);
}

function hitPipe() {
  if (!gameOver) {
    this.sound.play("hit");
    endGame(this);
  }
}

function endGame(scene) {
  gameOver = true;
  penguin.setTexture("penguin_death");
  penguin.setVelocity(0);
  pipes.setVelocityX(0);
  scene.add.text(BASE_WIDTH / 2 - 80, BASE_HEIGHT / 2, "Game Over", {
    fontSize: "32px",
    fill: "#000",
  });
}
