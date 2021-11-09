function fix(){
  let winw = window.innerWidth;
  let winh = window.innerHeight;
  let xvalue = winw / width;
  let yvalue = winh / height;
  scale = xvalue;
  if (yvalue < xvalue) {
    scale = yvalue
  }
  canvas.style.transform = "scale(" + scale + ")";
  canvas.style.left = (winw - width) / 2 + "px";
  canvas.style.top = (winh - height) / 2 + "px";
}
window.onresize = function() {
  fix()
};
window.onload = function() {
  fix()
}
document.addEventListener("keydown", (e) => {
  keys[e.keyCode] = true;
}, false);

document.addEventListener("keyup", (e) => {
  delete keys[e.keyCode];
}, false);

document.addEventListener('mousemove', (p) => {
  let t = canvas.getBoundingClientRect();
  mouseX = (p.pageX - t.left) / scale;
  mouseY = (p.pageY - t.top) / scale;
}, false);

document.onmousedown = function(e) {
  /*posX=mouseX;
  posY=mouseY;*/
  mouseDown = true;
}
document.onmouseup = function(e) {
  /*posX=mouseX;
  posY=mouseY;*/
  mouseDown = false;
}

window.onblur = function() {
  keys = [];
};
