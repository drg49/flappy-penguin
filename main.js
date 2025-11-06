const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

const config = {
  type: Phaser.AUTO,
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 900 }, debug: true }, // Debug ON for visualization
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

let penguin, pipes, scoreText, background;
let score = 0;
let gameOver = false;

function preload() {
  this.load.image("background_1", "assets/background_1.jpg");
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

  penguin.body.setCircle(penguin.displayWidth * 0.28);
  penguin.body.setOffset(
    (penguin.displayWidth - penguin.body.radius * 2) / 2,
    (penguin.displayHeight - penguin.body.radius * 2) / 2
  );

  pipes = this.physics.add.group();

  scoreText = this.add.text(10, 10, "Score: 0", {
    fontSize: "26px",
    fill: "#fff",
    stroke: "#000",
    strokeThickness: 4,
  });

  this.input.on("pointerdown", flap, this);
  this.input.keyboard.on("keydown-SPACE", flap, this);

  this.time.addEvent({
    delay: 1500,
    callback: addPipeRow,
    callbackScope: this,
    loop: true,
  });

  this.physics.add.collider(penguin, pipes, hitPipe, null, this);
}

function update() {
  if (gameOver) return;

  if (penguin.y > BASE_HEIGHT || penguin.y < 0) {
    hitPipe.call(this);
  }

  pipes.getChildren().forEach((pipe) => {
    if (pipe.x < -pipe.displayWidth) pipe.destroy();
  });
}

function flap() {
  if (!gameOver) {
    penguin.setVelocityY(-310);
    penguin.setTexture("penguin_jump");
    this.sound.play("jump");
  }
}

function addPipeRow() {
  if (gameOver) return;

  const scale = 0.75; // pipes get visually larger
  const gapSize = 240;

  const minGapCenter = gapSize / 2 + 60;
  const maxGapCenter = BASE_HEIGHT - gapSize / 2 - 60;
  const gapCenter = Phaser.Math.Between(minGapCenter, maxGapCenter);

  // Top Pipe
  const top = pipes
    .create(BASE_WIDTH + 50, gapCenter - gapSize / 2, "pipeTop")
    .setOrigin(0.5, 1)
    .setScale(scale);

  // Bottom Pipe
  const bottom = pipes
    .create(BASE_WIDTH + 50, gapCenter + gapSize / 2, "pipeBottom")
    .setOrigin(0.5, 0)
    .setScale(scale);

  // Apply physics movement
  [top, bottom].forEach((pipe) => {
    pipe.setVelocityX(-220);
    pipe.setImmovable(true);
    pipe.body.allowGravity = false;

    // ✅ EXACT COLLIDER MATCH — No shrinking, no stretching
    pipe.body.setSize(pipe.displayWidth, pipe.displayHeight);
    pipe.body.setOffset(
      (pipe.width - pipe.displayWidth) / 2,
      (pipe.height - pipe.displayHeight) / 2
    );
  });

  // Score increments per pipe *pair*
  score++;
  scoreText.setText("Score: " + score);
}

function hitPipe() {
  if (!gameOver) {
    this.sound.play("hit");
    gameOver = true;
    penguin.setVelocity(0);
    penguin.setTexture("penguin_death");
    pipes.setVelocityX(0);

    this.add.text(BASE_WIDTH / 2 - 100, BASE_HEIGHT / 2, "GAME OVER", {
      fontSize: "40px",
      fill: "#fff",
      stroke: "#000",
      strokeThickness: 4,
    });
  }
}
