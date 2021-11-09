function length(x, y) {
  return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
}

function normaliseVec(x, y) {
  return [x / length(x, y), y / length(x, y)]
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function dotProduct(x1, y1, x2, y2) {
  return x1 * x2 + y1 * y2;
}

//taken from https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
function circle(x, y, cx, cy, r) {
  return length(x - cx, y - cy) - r;
}

function rectangle(x, y, cx, cy, sx, sy) {
  qx = Math.abs(x - cx) - sx / 2;
  qy = Math.abs(y - cy) - sy / 2;
  return length(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0)
}

function polygon(x, y, points) {
  let d = dotProduct(x - points[0][0], y - points[0][1], x - points[0][0], y - points[0][1]);
  let s = 1;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i++) {
    let e = [points[j][0] - points[i][0], points[j][1] - points[i][1]];
    let w = [x - points[i][0], y - points[i][1]];
    let m = clamp(dotProduct(w[0], w[1], e[0], e[1]) / dotProduct(e[0], e[1], e[0], e[1]), 0, 1);
    let b = [w[0] - e[0] * m, w[1] - e[1] * m];
    d = Math.min(d, dotProduct(b[0], b[1], b[0], b[1]));
    let c = [(y >= points[i][1]), (y < points[j][1]), e[0] * w[1] > e[1] * w[0]];
    if (c[0] == c[1] && c[0] == c[2]) s *= -1.0;
  }
  return s * Math.sqrt(d);
}

function sdfSimu(x, y, moving) {
  //gets each distances
  let dists = []
  for (var i in objects) {
    if (objects[i].moving == moving) {
      if (objects[i].type == "circle") {
        dists.push([circle(x, y, objects[i].pos[0], objects[i].pos[1], objects[i].radius), i])
      } else if (objects[i].type == "rectangle") {
        dists.push([rectangle(x, y, objects[i].pos[0], objects[i].pos[1], objects[i].size[0], objects[i].size[1]), i])
      } else if (objects[i].type == "polygon") {
        dists.push([polygon(x, y, objects[i].points), i])
      }
    }
  }
  //screen rectangle
  dists.push([-rectangle(x, y, width / 2, height / 2, width, height), -1])

  //takes the minimum
  let min = [10E10, -1];
  for (var i in dists) {
    if (dists[i][0] < min[0]) {
      min = dists[i]
    }
  }
  return min;
}


function slideVec(_x1, _y1, _x2, _y2) {
  let dot = dotProduct(_x1, _y1, _x2, _y2);
  let px = dot * _x1;
  let py = dot * _y1;
  return [_x2 - px, _y2 - py];
}

// Calcule le vecteur reflection de (x2,y2) par rapport au vecteur (x1, y1)
function reflectVec(_x1, _y1, _x2, _y2) {
  let dot = dotProduct(_x1, _y1, _x2, _y2);
  return [-2 * _x1 * dot, -2 * _y1 * dot];
}

class SignedDistanceField {
  constructor(_sizeX, _sizeY) {
    this.sizeX = _sizeX;
    this.sizeY = _sizeY;
    this.tableDists = new Float32Array(_sizeX * _sizeY);
    this.tableObjects = new Float32Array(_sizeX * _sizeY);
  }
  setValue(_x, _y, _dist, _objects) {
    this.tableDists[_x + _y * this.sizeX] = _dist;
    this.tableObjects[_x + _y * this.sizeX] = _objects;
  }
  getValue(_x, _y) {
    let sdfDynamic = sdfSimu(_x, _y, true);
    let sdfStatic = [this.tableDists[_x + _y * this.sizeX] || 0, this.tableObjects[_x + _y * this.sizeX] || -1];
    let currentSdf = sdfDynamic;
    if (sdfStatic[0] < sdfDynamic[0]) {
      currentSdf = sdfStatic;
    }
    return currentSdf;
  }
  initFromSimu() {
    for (var y = 0; y < this.sizeY; y++) {
      for (var x = 0; x < this.sizeX; x++) {
        let sdf = sdfSimu(x, y, false);
        this.setValue(x, y, sdf[0], sdf[1]);
      }
    }
  }
  // Lit une valeur dans le SDF � partir de coodonn�es flottantes, et en appliquant un filtrage bilin�aire pour rendre le SDF continu.
  sampleBilinear(_x, _y) {
    // Je consid�re qu'une coordonn�e 0,0 pointe en haut � gauche d'un pixel et non son centre. C'est le standard dans les API 3D, parce que c'est souvent plus pratique pour faire des calculs.
    // Avec cette convention une coordonn�es flottante valide doit �tre comprise dans le range [0..size[
    _x -= 0.5;
    _y -= 0.5;
    let _xi = Math.floor(_x);
    let _yi = Math.floor(_y);
    /*_xi = clamp(_xi, 0, this.sizeX - 1); // Ces lignes sont inutiles si on sait qu'on ne peut pas lire au bord ou en dehors du sdf.
    _yi = clamp(_yi, 0, this.sizeY - 1);*/
    let _xf = _x - _xi;
    let _yf = _y - _yi;
    let _xfO = 1.0 - _xf;
    let _yfO = 1.0 - _yf;
    let v00 = this.getValue(_xi, _yi);
    let v10 = this.getValue(_xi + 1, _yi);
    let v01 = this.getValue(_xi, _yi + 1);
    let v11 = this.getValue(_xi + 1, _yi + 1);
    return [v00[0] * _xfO * _yfO + v10[0] * _xf * _yfO + v01[0] * _xfO * _yf + v11[0] * _xf * _yf, v00[1]];
  }
  // Calcule la direction du gradient � un point donn�.
  computeGradient(_x, _y) {
    let delta = 0.01; // Une petite valeur, mais pas trop � cause de la pr�cision limit�e des flottants.
    let centerValue = this.sampleBilinear(_x, _y)[0];
    let leftValue = this.sampleBilinear(_x - delta, _y)[0];
    let upValue = this.sampleBilinear(_x, _y - delta)[0];
    let dx = (centerValue - leftValue) / delta;
    let dy = (centerValue - upValue) / delta;
    let norm = Math.sqrt(dx * dx + dy * dy);
    if (norm > 0) {
      return [dx / norm, dy / norm];
    } else {
      return [0, 0]; // Retourne une direction nulle si le gradient est plat.
    }
  }
}

let canvas = document.getElementById("game");
let context = canvas.getContext("2d"),
  width = canvas.width,
  height = canvas.height;
let scale = 1;

let keys = [];
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

let sdf = new SignedDistanceField(width, height);

let sprite = new Image();
sprite.src = "sprite.png";
let frame = 0;
let time = 0;

let posses = [];
for (var i = 0; i < 1; i++) {
  posses[i] = {
    posX: Math.random()*width,
    posY: Math.random()*height,
    velX: 0,
    velY: 0
  }
}

let small = 0.01

let objects = [{
  type: "circle",
  pos: [width / 2 + 200, height / 2 - 200],
  radius: 100,
  moving: false,
  bounce: false
}, {
  type: "circle",
  pos: [width / 2 + 430, height / 2 - 200],
  radius: 100,
  moving: false,
  bounce: false
}, {
  type: "rectangle",
  pos: [width / 2 - 500, height / 2 - 300],
  size: [200, 50],
  moving: true,
  bounce: false
}, {
  type: "rectangle",
  pos: [width - 50, 50],
  size: [100, 100],
  moving: true,
  bounce: false
}, {
  type: "rectangle",
  pos: [width / 2 - 500, height / 2 - 400],
  size: [200, 400],
  moving: false,
  bounce: false
}, {
  type: "circle",
  pos: [300, height - 100],
  radius: 50,
  moving: false,
  bounce: true
}, {
  type: "polygon",
  points: [
    [1200, height - 100],
    [1700, height - 100],
    [1700, height],
    [1200, height]
  ],
  moving: false,
  bounce: false
}, {
  type: "polygon",
  points: [
    [1400, height - 260],
    [1700, height - 260],
    [1700, height - 160],
    [1400, height - 160]
  ],
  moving: false,
  bounce: false
}, {
  type: "polygon",
  points: [
    [0, height - 400],
    [100, height - 100],
    [200, height - 400],
    [200, height],
    [0, height]
  ],
  moving: false,
  bounce: false
}]

sdf.initFromSimu();

let ballX = width / 2 - 50;
let ballY = height / 2;
let ballVX = 10.5 * 1;
let ballVY = 7.78 * 1;
let ballR = 20;

function animate() {
  context.clearRect(0, 0, width, height);
  context.beginPath();
  context.fillStyle = "#bbbbbb";
  context.rect(0, 0, width, height);
  context.fill();
  context.closePath();
  objects[2].pos[1] = Math.sin(time / 30) * 200 + 700;
  if (mouseDown) {
    objects[3].pos = [mouseX, mouseY];
  }
  //rendering the objects
  for (var i in objects) {
    context.beginPath();
    context.fillStyle = "rgb(32, 54, 214)";
    if (objects[i].bounce) {
      context.fillStyle = "rgb(73, 190, 59)";
    }
    if (objects[i].type == "circle") {
      context.arc(objects[i].pos[0], objects[i].pos[1], objects[i].radius, 0, 2 * Math.PI)
      context.fill();
      context.closePath();
    } else if (objects[i].type == "rectangle") {
      context.rect(objects[i].pos[0] - objects[i].size[0] / 2, objects[i].pos[1] - objects[i].size[1] / 2, objects[i].size[0], objects[i].size[1])
    } else if (objects[i].type == "polygon") {
      context.moveTo(objects[i].points[0][0], objects[i].points[0][1]);
      for (var j = 1; j < objects[i].points.length; j++) {
        context.lineTo(objects[i].points[j][0], objects[i].points[j][1]);
      }
    }
    context.fill();
    context.closePath();
  }
  //player movements
  for (var i in posses) {
    posses[i].velX *= 0.9;
    posses[i].velY *= 0.98;
    posses[i].velY += 0.3;
    let speed = 5;
    if (keys[87]) {
      posses[i].velY -= speed;
    }
    if (keys[65]) {
      posses[i].velX -= speed;
    }
    if (keys[83]) {
      posses[i].velY += speed;
    }
    if (keys[68]) {
      posses[i].velX += speed;
    }
    let radius = 38;
    let stepCount = 1;
    for (step = 0; step < stepCount; ++step) {
      let dt = 1.0 / stepCount;
      posses[i].posX += posses[i].velX * dt;
      posses[i].posY += posses[i].velY * dt;

      //player collision
      nearestCol = sdf.sampleBilinear(posses[i].posX, posses[i].posY);
      if (nearestCol[0] < radius) {
        let count = 0;
        let sumNorm = [0, 0]
        do {
          let normCol = sdf.computeGradient(posses[i].posX, posses[i].posY);
          let error = radius - nearestCol[0];
          posses[i].posX += normCol[0] * error;
          posses[i].posY += normCol[1] * error;
          nearestCol = sdf.sampleBilinear(posses[i].posX, posses[i].posY);
          sumNorm[0] += normCol[0];
          sumNorm[1] += normCol[1];
          count++;
        } while ((nearestCol[0] < radius) && (count <= 2))

        let normCol = normaliseVec(sumNorm[0], sumNorm[1]);
        let newSpeed = slideVec(normCol[0], normCol[1], posses[i].velX, posses[i].velY);
        posses[i].velX = newSpeed[0];
        posses[i].velY = newSpeed[1];
      }
    }
  }
  //player rendering
  time++;
  if (time % 10 == 0) {
    frame++
  }
  frame = frame % 5;
  context.imageSmoothingEnabled = false;
  for (var i in posses) {
    context.drawImage(sprite, frame * 12, 0, 12, 12, posses[i].posX - 96 / 2, posses[i].posY - 96 / 2, 96, 96);
  }

  ballX += ballVX;
  ballY += ballVY;
  nearestCol = sdf.sampleBilinear(ballX, ballY)[0];
  if (nearestCol < ballR) {
    let normCol = sdf.computeGradient(ballX, ballY);
    // Corrige la position de la balle pour la faire sortir de la colision.
    ballX += normCol[0] * (ballR - nearestCol);
    ballY += normCol[1] * (ballR - nearestCol);
    // Corrige la vitesse apr�s la collision. Classiquement on calcule la reflexion du vecteur vitesse par rapport � la normale de collision.
    let newSpeed = reflectVec(normCol[0], normCol[1], ballVX, ballVY);
    ballVX += newSpeed[0];
    ballVY += newSpeed[1];
  }

  context.beginPath();
  context.fillStyle = "rgb(255, 255, 255)"
  context.arc(ballX, ballY, ballR, 0, 2 * Math.PI);
  context.fill();
  context.closePath();

  window.requestAnimationFrame(animate);
}
window.requestAnimationFrame(animate);
