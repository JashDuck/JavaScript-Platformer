class PlayerObj {
  constructor(name) {
    players.push(this);
    const constants = playerConstants[name];
    this.collide = constants.collide;
    this.lives = constants.lives;
    this.x = constants.x;
    this.y = constants.y;
    this.width = constants.width || 40;
    this.height = constants.height || 40;
    this.moveSpeed = constants.moveSpeed;
    this.speedX = constants.speedX;
    this.speedY = constants.speedY;

    this.color = constants.color || null;
    this.text = constants.text || null;
    this.srcType = constants.type;

    this.friction = constants.friction;
    this.gravity = constants.gravity;
    this.lowGravity = constants.lowGravity;
    this.jumpStrength = constants.jumpStrength;

    this.jumpKeys = constants.jumpKeys;
    this.leftKeys = constants.leftKeys;
    this.rightKeys = constants.rightKeys;
    this.boostKeys = constants.boostKeys;

    this.dashCooldown = constants.dashCooldown;
    this.dashDuration = constants.dashDuration;
    this.dashStrength = constants.dashStrength;
    this.maxDashes = constants.maxDashes;

    this.jumpMult = 1;
    this.jumping = false;
    this.running = false;
    this.dashing = false;
    this.curDashes = 0;
    this.dashTimer = 0;
    this.timeoutSet = false;
    this.duration = 0;
    this.prevDir = 'R';

    if (this.srcType === 'img') {
      this.imgSrc = new Image();
      this.imgSrc.src = `./assets/${constants.source}`;
    }

    if (this.srcType === 'sprite') {
      this.imgSrc = new Image();
      fetch(`./assets/${constants.source}`)
        .then(response => response.json())
        .then(json => {
          this.file = json;
          this.metaData = this.file.meta;
          this.imgSrc.src = `./assets/${this.metaData.image}`;
          this.curFrame = 0;
        });
    }
  }

  reset = (doorDir) => {
    if (doorDir === 0 || doorDir === 2) {
      this.y = playerSpawnLocations[1][0];
      this.x = playerSpawnLocations[1][1];
    } else {
      this.y = playerSpawnLocations[0][0];
      this.x = playerSpawnLocations[0][1];
    }

    this.lives = 3;
    fade = 'from';
  };

  draw = () => {
    if ((compareArrays(keysPressed, this.leftKeys) && compareArrays(keysPressed, this.rightKeys)) || fade !== null) this.curDir = 'idle';
    else if (compareArrays(keysPressed, this.rightKeys)) {this.curDir = 'R'; this.prevDir = this.curDir;}
    else if (compareArrays(keysPressed, this.leftKeys)) {this.curDir = 'L'; this.prevDir = this.curDir;}
    else this.curDir = 'idle';

    if (this.curDir !== 'idle') this.move();
    if (compareArrays(keysPressed, this.boostKeys) && !this.dashing) this.dash();
    this.jumping = compareArrays(keysPressed, this.jumpKeys);

    if (this.srcType === 'img') {
      ctx.drawImage(this.imgSrc, this.x, this.y, this.width, this.height);
    } else if (this.srcType === 'sprite') {
      this.getSpriteAnimation();
      ctx.drawImage(this.imgSrc, this.spriteX, this.spriteY, this.spriteWidth, this.spriteHeight, this.x - (this.width * (this.metaData.scale - 1)/2), this.y - (this.height * (this.metaData.scale - 1)), this.width * this.metaData.scale, this.height * this.metaData.scale);
    } else if (this.srcType === 'text') {
      ctx.fillStyle = this.color;
      ctx.font = `${this.width}px cfont`;
      ctx.textAlign = 'center';
      ctx.fillText(this.text, this.x, this.y + 20);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    this.x += this.speedX;
    this.y += this.speedY;
  };

  getSpriteAnimation = () => {
    for (const frameTag of this.metaData.frameTags) {
      if (!this.timeoutSet) {
        if (frameTag.name === `jump.${this.curDir}` && this.jumping) {
          this.frame = this.getFrame(frameTag);
          this.changeAnimation();
        } else if (frameTag.name === `run.${this.curDir}`) {
          this.frame = this.getFrame(frameTag);
          this.changeAnimation();
        } else if (((frameTag.name === 'idle.R' && this.prevDir === 'R') || (frameTag.name === 'idle.L' && this.prevDir === 'L')) && this.curDir === 'idle') {
          this.frame = this.getFrame(frameTag);
          this.changeAnimation();
        }
      }
    }
  };

  changeAnimation = () => {
    this.duration = this.frame.duration;
    this.timeoutSet = true;
    setTimeout(() => {
      this.spriteX = this.frame.frame.x;
      this.spriteY = this.frame.frame.y;
      this.spriteWidth = this.frame.frame.w;
      this.spriteHeight = this.frame.frame.h;

      this.timeoutSet = false;
      this.duration = this.frame.duration;
    }, this.duration);
  };

  getFrame = (frameTag) => {
    frameTag.direction === 'forward' ? (this.curFrame += 1) : (this.curFrame -= 1);
    this.curFrame > frameTag.to && (this.curFrame = frameTag.from);
    this.curFrame < frameTag.from && (this.curFrame = frameTag.to);
    for (const frame of this.file.frames) if (frame.filename == this.curFrame) return frame;
  };

  checkCollisons = () => {
    for (const obj of collideObjs) {
      if (detectCollide(this, obj)) {
        if (this.y < obj.y) {
          this.speedY = obj.speedY;
          this.y = obj.y - this.height;
        } else if (this.y > obj.y + obj.height - 10) {
          if (this.speedY < 0) this.speedY = 0.01;
          obj.speedY !== 0 && (this.speedY = obj.speedY);
          this.y = obj.y + obj.height;
        } else if (this.x < obj.x) {
          this.speedX = 0;
          this.x = obj.x - this.width;
        } else if (this.x > obj.x - obj.width) {
          this.speedX = 0;
          this.x = obj.x + obj.width;
        }
      }

      if (this.jumping && this.speedY === obj.speedY && obj.speedY !== 0) this.jump();
    }
    if (this.jumping && this.speedY === 0) this.jump();
  };

  physics = (maxXSpeed = 50, maxYSpeed = 50) => {
    Math.abs(this.speedX) < 0.1 && (this.speedX = 0);

    this.speedX *= this.friction;
    this.speedY += compareArrays(keysPressed, this.jumpKeys) ? this.lowGravity : this.gravity;

    this.speedX > maxXSpeed && (this.speedX = maxXSpeed);
    this.speedX < -maxXSpeed && (this.speedX = -maxXSpeed);
    this.speedY > maxYSpeed && (this.speedY = maxYSpeed);
    this.speedY < -maxYSpeed && (this.speedY = -maxYSpeed);
  };

  wall = (minX, maxX, minY, maxY) => {
    if (this.x < minX - 40 || this.x > maxX + 40 || this.y < minY - 40 || this.y > maxY + 40) {
      this.lives = 0;
      this.died();
    }

    this.x <= minX && (this.x = minX);
    this.x >= maxX && (this.x = maxX);
    this.y <= minY && (this.y = minY);
    this.y >= maxY && (this.y = maxY) && (this.speedY = 0);

    if (this.x <= cameraCenter[0] - canvas.width / 2)
      this.x = cameraCenter[0] - canvas.width / 2;
    if (this.x >= cameraCenter[0] + canvas.width / 2 - avgPlayerWidth)
      this.x = cameraCenter[0] + canvas.width / 2 - avgPlayerWidth;
    if (this.y <= cameraCenter[1] - canvas.height / 2)
      this.y = cameraCenter[1] - canvas.height / 2;
    if (this.y >= cameraCenter[1] + canvas.height / 2 - avgPlayerWidth)
      this.y = cameraCenter[1] + canvas.height / 2 - avgPlayerWidth;
  };

  move = () => {
    this.curDir === 'L' && (this.speedX = -this.moveSpeed);
    this.curDir === 'R' && (this.speedX = this.moveSpeed);
  };
  
  dash = () => {
    if (this.curDir !== 'idle' && this.curDashes < this.maxDashes) {
      this.curDashes++;
      if (!this.dashing) this.dashing = true;
      this.dashTimer = this.dashDuration;
      const ogYHeight = this.y;

      const ogMoveSpeed = this.moveSpeed;
      this.moveSpeed = this.dashStrength;

      const dashInterval = setInterval(() => {
        this.speedY = 0;
        this.moveSpeed *= 0.95;
        this.y = ogYHeight;
        this.dashTimer--;
        if (this.dashTimer <= 0) {
          this.speedY = 0.5;
          this.moveSpeed = ogMoveSpeed;
          this.dashing = false;
          clearInterval(dashInterval);
        }
      }, 10);
    } else setTimeout(() => (this.curDashes = 0), this.dashCooldown);
  };

  died = () => {
    this.lives -= 1;
    this.speedX = 0;
    this.speedY = 0;

    if (this.lives <= 0) {
      curRoom = 1;
      fade = 'to';
      gameOver = 1;
    } else {
      this.y = playerSpawnLocations[0][0];
      this.x = playerSpawnLocations[0][1];
    }
  };

  jump = () => fade === null && (this.speedY = -this.jumpStrength * this.jumpMult);
}

class Rect {
  constructor(name, x, y) {
    if (blockType == "block") constants = blockConstants[name];
    if (blockType == "entity") constants = entityConstants[name];

    (constants.collide || false) && collideObjs.push(this);
    this.x = x;
    this.y = y;
    this.width = constants.width || 40;
    this.height = constants.height || 40;
    this.xOff = constants.xOffset || 0;
    this.yOff = constants.yOffset || 0;

    this.gravity = constants.gravity || 0;
    this.friction = constants.friction || 0;

    this.speedX = constants.speedX || 0;
    this.speedY = constants.speedY || 0;
    this.maxXSpeed = constants.maxXSpeed || 39;
    this.maxYSpeed = constants.maxYSpeed || 39;

    this.color = constants.color || null;
    this.text = constants.text || null;
    this.imgWidth = constants.imgWidth || null;
    this.imgHeight = constants.imgHeight || null;
    this.srcType = constants.type;

    this.button = constants.button || false;
    this.killPlayer = constants.killPlayer || false;
    this.bounce = constants.bounce || false;

    this.isDoor = constants.isDoor || false;
    this.doorDir = constants.doorDirection || 0;

    if (this.srcType == 'img') {
      this.imgSrc = new Image();
      this.imgSrc.src = `./assets/${constants.source}`;
    }
  }

  draw = () => {
    this.x += this.speedX;
    this.y += this.speedY;
    this.physics();

    for (let player of players) {
      if (detectCollide(this, player)) {
        this.button != false && buttonEvent(this.button);
        this.killPlayer && player.died();

        if (this.isDoor) {
          this.isDoor = false;
          doorDir = this.doorDir;
          fade = 'to';
        }

        if (this.bounce) {
          player.jumpMult = 2;
          setTimeout(() => player.jump(), 0);
        } else player.jumpMult = 1;
      }
    }

    if (this.srcType == 'img') ctx.drawImage(this.imgSrc, this.x + this.xOff, this.y + this.yOff - this.imgHeight, this.width, this.height + this.imgHeight)
    else if (this.srcType == 'text') {
      ctx.fillStyle = this.color;
      ctx.font = `${this.width}px cfont`;
      ctx.textAlign = 'center';
      ctx.fillText(this.text, this.x + this.xOff, this.y + this.yOff);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  physics = () => {
    Math.abs(this.speedX) < .1 && (this.speedX = 0);
    this.speedX *= this.friction;
    this.speedY += this.gravity;

    this.speedX > this.maxXSpeed && (this.speedX = this.maxXSpeed);
    this.speedX < -this.maxXSpeed && (this.speedX = -this.maxXSpeed);
    this.speedY > this.maxYSpeed && (this.speedY = this.maxYSpeed);
    this.speedY < -this.maxYSpeed && (this.speedY = -this.maxYSpeed);
  }

  wall = (bounce, minX, maxX, minY, maxY, speedIncrementX = 0, speedIncrementY = 0) => {
    this.x >= maxX && (this.x = maxX);
    this.x <= minX && (this.x = minX);
    this.y >= maxY && (this.y = maxY);
    this.y >= maxY && (this.y = maxY);
    this.y <= minY && (this.y = minY);

    if (bounce) {
      if (this.x == 0 || this.x == canvas.width - this.width) {
        this.direction == 'R' && (this.speedX += speedIncrementX);
        this.direction == 'L' && (this.speedX -= speedIncrementX);
        this.speedX *= -1;
      }
      if (this.y == 0 || this.y == canvas.height - this.height) {
        this.direction == 'down' && (this.speedY += speedIncrementY);
        this.direction == 'up' && (this.speedY -= speedIncrementY);
        this.speedY *= -1;
      }
    }
  }
}

CanvasRenderingContext2D.prototype.clear = 
  CanvasRenderingContext2D.prototype.clear || function (preserveTransform) {
    preserveTransform && this.save() && this.setTransform(1, 0, 0, 1, 0, 0);
    this.clearRect(0, 0, this.canvas.width, this.canvas.height);
    preserveTransform && this.restore();       
};

const buttonEvent = (btnValue) => {
  btnValue == 'yes' && (fade = 'to');

  if (btnValue == 'no') {
    gameOver = 2;
    fade = 'to';

    gameOver && setTimeout(() => {
      gameOver = undefined;
      fade = 'to';
    }, 2200);
  }
}

const compareArrays = (arr1, arr2) => {
  for (let i of arr1) if (arr2.includes(i)) return true;
  return false
}

const detectCollide = (a, b) => {
  return !(
      ((a.y + a.height) <= (b.y)) ||
      (a.y >= (b.y + b.height)) ||
      ((a.x + a.width) <= b.x) ||
      (a.x >= (b.x + b.width))
  );
}

const readFile = (file, obj) => {
  fetch(`./assets/${file}`)
  .then(response => response.json())
  .then(json => obj.file = json);
}

const readConstantFiles = () => {
  fetch(`constants/playerConstants.json`)
  .then(response => response.json())
  .then(json => playerConstants = json);

  fetch(`constants/blockConstants.json`)
  .then(response => response.json())
  .then(json => blockConstants = json);

  fetch(`constants/entityConstants.json`)
  .then(response => response.json())
  .then(json => entityConstants = json);
}

const readLevelFiles = () => {
  fetch(`levels/level_num_rooms.json`)
  .then(response => response.json())
  .then(json => maxRooms = json);

  if (gameOver) {
    canvas.style.backgroundColor = 'black';
    fileLocation = `levels/game_over/room${gameOver}`;
    gameOver = null;
  } else {
    canvas.style.backgroundColor = 'white';
    fileLocation = `levels/level${curLevel}/room${curRoom}`;
  }

  fetch(`${fileLocation}/spawns.json`)
  .then(response => response.json())
  .then(json => getSpawns(json));

  fetch(`${fileLocation}/entities.json`)
  .then(response => response.json())
  .then(json => createLevel(json, 0));

  fetch(`${fileLocation}/room.json`)
  .then(response => response.json())
  .then(json => createLevel(json, 1));
}

const getSpawns = (levelData) => {
  for (let y = 0; y < levelData.length; y++) {
    for (let x = 0; x <= levelData[y].length; x++) {
      if (levelData[y][x] == 'x') {
        playerSpawnLocations[0].push(y * 40, x * 40);
        !levelData[y].includes('<') && playerSpawnLocations[1].push(y * 40, x * 40);
      }
      levelData[y][x] == '<' && playerSpawnLocations[1].push(y * 40, x * 40)
    }
  }
}

const createLevel = (levelData, type) => {
  for (let y = 0; y < levelData.length; y++) {
    for (let x = 0; x <= levelData[y].length; x++) {
      curChar = levelData[y][x];
      
      if (type == 0) {
        blockType = 'entity';
        // entities
        curChar == 1 && objs.push(new Rect('darkGreenBlock', x * 40, y * 40, ));
        curChar == 2 && objs.push(new Rect('limeGreenBlock', x * 40, y * 40));
        curChar == 3 && objs.push(new Rect('darkBlueBlock', x * 40, y * 40));
        
        // images/words
        curChar == 100 && objs.push(new Rect('gameOverImg', x * 40, y * 40));
        curChar == 101 && objs.push(new Rect('yesButton', x * 40, y * 40));
        curChar == 102 && objs.push(new Rect('noButton', x * 40, y * 40));
        curChar == 103 && objs.push(new Rect('tooBadText', x * 40, y * 40));
      } else if (type == 1) {
        blockType = 'block';
        // blocks
        curChar == 1 && objs.push(new Rect('pinkBlock', x * 40, y * 40));
        curChar == 2 && objs.push(new Rect('blueBlock', x * 40, y * 40));

        // spike
        curChar == 'fs' && objs.push(new Rect('floorSpike', x * 40, y * 40));
        curChar == 'ls' && objs.push(new Rect('leftSpike', x * 40, y * 40));
        curChar == 'rs' && objs.push(new Rect('rightSpike', x * 40, y * 40));
        curChar == 'cs' && objs.push(new Rect('ceilingSpike', x * 40, y * 40));

        // trampoline
        curChar == 't' && objs.push(new Rect('trampoline', x * 40, y * 40));

        // next and prev levels
        curChar == '<<' && objs.push(new Rect('prevLevel', x * 40, y * 40));
        curChar == '>>' && objs.push(new Rect('nextLevel', x * 40, y * 40));

        // next and prev rooms
        curChar == '<' && objs.push(new Rect('prevRoom', x * 40, y * 40));
        curChar == '>' && objs.push(new Rect('nextRoom', x * 40, y * 40));
      }
      
      maxScreenWidth = Math.max(maxScreenWidth, x * 40);
    }
    maxScreenHeight = Math.max(maxScreenHeight, (y + 1) * 40);
  }
  console.log(levelData)
}

const toBlack = () => {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, maxScreenWidth, maxScreenHeight);
  alpha += 0.01;
  if (alpha >= 1) {
    alpha = 1;
    reset();
  }
}

const fromBlack = () => {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, maxScreenWidth, maxScreenHeight);
  alpha -= 0.01;
  if (alpha <= 0) {
    fade = null;
    alpha = 0;
  }
}

const getCameraCenter = () => {
  let xCoord = [];
  let yCoord = [];

  for (let player of players) {
    avgPlayerWidth += player.width;
    xCoord.push(player.x); 
    yCoord.push(player.y);
  }

  avgPlayerWidth /= players.length;

  xCoord.sort()
  yCoord.sort()
  totalX = xCoord[0] + xCoord[xCoord.length - 1];
  totalY = yCoord[0] + yCoord[yCoord.length - 1];

  return [totalX / 2 + 20, totalY / 2 + 20]
}

const checkTranslate = () => {
  cameraCenter = getCameraCenter();
  if (cameraCenter[0] <= canvas.width/2) offsetX = 0
  else if (cameraCenter[0] >= maxScreenWidth - canvas.width/2) offsetX = canvas.width - maxScreenWidth
  else offsetX = -cameraCenter[0] + canvas.width / 2;

  if (cameraCenter[1] <= canvas.height/2) offsetY = 0
  else if (cameraCenter[1] >= maxScreenHeight - canvas.height/2) offsetY = canvas.height - maxScreenHeight
  else offsetY = -cameraCenter[1] + canvas.height / 2;
}

const gameLoop = () => {
  ctx.clear();
  ctx.save();

  checkTranslate();
  ctx.translate(offsetX, offsetY);

  for (let player of players) {
    player.checkCollisons();
    player.file && player.draw();
    player.physics();
    player.wall(0, maxScreenWidth - player.width, 0, maxScreenHeight - player.height);
  }

  for (let obj of objs) {
    obj.draw();
    obj.y > maxScreenHeight && (obj.y = -40);
    obj.y < -40 && (obj.y = maxScreenHeight);
  }

  fade == 'from' && fromBlack();
  fade == 'to' && toBlack();

  ctx.restore();
}

const reset = (start = false) => {
  if (doorDir == 0) {curLevel -= 1; curRoom = maxRooms[curLevel]};
  doorDir == 1 && (curLevel += 1) && (curRoom = 1);
  doorDir == 2 && (curRoom -= 1);
  doorDir == 3 && (curRoom += 1);

  offsetX = 0, offsetY = 0, maxScreenWidth = 0, maxScreenHeight = 0;
  objs = [], collideObjs = [],  playerSpawnLocations = [[], []], enemySpawnLocations = [];

  canvas.style.backgroundColor = 'white';

  readConstantFiles();
  readLevelFiles();
  gameAnimation && clearInterval(gameAnimation);

  setTimeout(() => {
    if (start) for (let i = 1; i <= numPlayers; i++) new PlayerObj(`player${i}`);
    for (let player of players) player.reset(doorDir);
    doorDir = null;
    gameAnimation = setInterval(gameLoop, 10);
  }, 300);
}

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let curLevel = 1, curRoom = 1, gameOver = null;
let maxRooms = [] , alpha = 1, numPlayers = 1;
let player, gameAnimation, offsetX, offsetY, maxScreenWidth, maxScreenHeight, avgPlayerWidth;
let objs, collideObjs, players = [], fade, doorDir = null;

let playerConstants, blockConstants, entityConstants, constants, cameraCenter;

canvas.width = 520, canvas.height = 520;

let keysPressed = [];
document.addEventListener('keydown', e => !keysPressed.includes(e.key) && fade === null && (e.key.length == 1 ? keysPressed.push(e.key.toLowerCase()) : keysPressed.push(e.key)));
document.addEventListener('keyup', e => keysPressed = keysPressed.filter(item => e.key.length == 1 ? item !== e.key.toLowerCase() : item !== e.key));

reset(true)