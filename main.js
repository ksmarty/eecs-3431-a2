// Template code for A2 Fall 2021 -- DO NOT DELETE THIS LINE

var canvas;
var gl;

var program;

var near = 1;
var far = 100;

var left = -6.0;
var right = 6.0;
var ytop = 6.0;
var bottom = -6.0;

var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0);
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0);

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(0.4, 0.4, 0.4, 1.0);
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix;
var modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var resetTimerFlag = true;
var animFlag = false;
var prevTime = 0.0;
var useTextures = 1;

const textures = {
  "GroundSand005/GroundSand005_COL_1K.jpg": "sand",
  "BarkPoplar001/BarkPoplar001_COL_1K.jpg": "bark",
  "GroundGrassGreen002/GroundGrassGreen002_COL_1K.jpg": "grass",
  "summer-background-sea-water.jpg": "water",
};

// ------------ Images for textures stuff --------------
var texSize = 64;

var image1 = new Array();
for (var i = 0; i < texSize; i++) image1[i] = new Array();
for (var i = 0; i < texSize; i++)
  for (var j = 0; j < texSize; j++) image1[i][j] = new Float32Array(4);
for (var i = 0; i < texSize; i++)
  for (var j = 0; j < texSize; j++) {
    var c = ((i & 0x8) == 0) ^ ((j & 0x8) == 0);
    image1[i][j] = [c, c, c, 1];
  }

// Convert floats to ubytes for texture

var image2 = new Uint8Array(4 * texSize * texSize);

for (var i = 0; i < texSize; i++)
  for (var j = 0; j < texSize; j++)
    for (var k = 0; k < 4; k++)
      image2[4 * texSize * i + 4 * j + k] = 255 * image1[i][j][k];

var textureArray = [];

function isLoaded(im) {
  if (im.complete) {
    console.log("loaded");
    return true;
  } else {
    console.log("still not loaded!!!!");
    return false;
  }
}

function loadFileTexture(tex, filename) {
  tex.textureWebGL = gl.createTexture();
  tex.image = new Image();
  tex.image.src = filename;
  tex.isTextureReady = false;
  tex.image.onload = function () {
    handleTextureLoaded(tex);
  };
  // The image is going to be loaded asyncronously (lazy) which could be
  // after the program continues to the next functions. OUCH!
}

function loadImageTexture(tex, image) {
  tex.textureWebGL = gl.createTexture();
  tex.image = new Image();
  //tex.image.src = "CheckerBoard-from-Memory" ;

  gl.bindTexture(gl.TEXTURE_2D, tex.textureWebGL);
  //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    texSize,
    texSize,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    image
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.NEAREST_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
  gl.bindTexture(gl.TEXTURE_2D, null);

  tex.isTextureReady = true;
}

function initTextures() {
  Object.keys(textures).forEach((filename) => {
    textureArray.push({});
    loadFileTexture(
      textureArray[textureArray.length - 1],
      `textures/${filename}`
    );
  });

  // textureArray.push({});
  // loadImageTexture(textureArray[textureArray.length - 1], image2);
}

function handleTextureLoaded(textureObj) {
  gl.bindTexture(gl.TEXTURE_2D, textureObj.textureWebGL);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // otherwise the image would be flipped upsdide down
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    textureObj.image
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_NEAREST
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
  gl.bindTexture(gl.TEXTURE_2D, null);
  console.log(textureObj.image.src);

  textureObj.isTextureReady = true;
}

//----------------------------------------------------------------

function setColor(c) {
  ambientProduct = mult(lightAmbient, c);
  diffuseProduct = mult(lightDiffuse, c);
  specularProduct = mult(lightSpecular, materialSpecular);

  gl.uniform4fv(
    gl.getUniformLocation(program, "ambientProduct"),
    flatten(ambientProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "diffuseProduct"),
    flatten(diffuseProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "specularProduct"),
    flatten(specularProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "lightPosition"),
    flatten(lightPosition)
  );
  gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
}

function toggleTextures() {
  useTextures = 1 - useTextures;
  gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
}

function waitForTextures1(tex) {
  setTimeout(function () {
    console.log("Waiting for: " + tex.image.src);
    wtime = new Date().getTime();
    if (!tex.isTextureReady) {
      console.log(wtime + " not ready yet");
      waitForTextures1(tex);
    } else {
      console.log("ready to render");
      window.requestAnimFrame(render);
    }
  }, 5);
}

// Takes an array of textures and calls render if the textures are created
function waitForTextures(texs) {
  setTimeout(function () {
    var n = 0;
    for (var i = 0; i < texs.length; i++) {
      console.log("boo" + texs[i].image.src);
      n = n + texs[i].isTextureReady;
    }
    wtime = new Date().getTime();
    if (n != texs.length) {
      console.log(wtime + " not ready yet");
      waitForTextures(texs);
    } else {
      console.log("ready to render");
      window.requestAnimFrame(render);
    }
  }, 5);
}

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  // Skybox colour
  gl.clearColor(0.529, 0.808, 0.922, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // Load canonical objects and their attributes
  Cube.init(program);
  Cylinder.init(9, program);
  Cone.init(9, program);
  Sphere.init(36, program);
  TaperedCylinder.init(9, program);

  gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);

  // record the locations of the matrices that are used in the shaders
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

  // set a default material
  setColor(materialDiffuse);

  const sliderX = document.getElementById("sliderXi");
  sliderX.oninput = function () {
    RX = this.value;
    window.requestAnimFrame(render);
  };

  const sliderY = document.getElementById("sliderYi");
  sliderY.oninput = function () {
    RY = this.value;
    window.requestAnimFrame(render);
  };

  const sliderZ = document.getElementById("sliderZi");
  sliderZ.oninput = function () {
    RZ = this.value;
    window.requestAnimFrame(render);
  };

  const set = (element, value) => {
    element.value = value;
    element.oninput();
    window.requestAnimFrame(render);
  };

  const setX = (value) => {
    set(sliderX, value);
  };
  const setY = (value) => {
    set(sliderY, value);
  };
  const setZ = (value) => {
    set(sliderZ, value);
  };

  const setAll = (x, y, z) => {
    setX(x);
    setY(y);
    setZ(z);
  };

  document.getElementById("reset-x").onclick = () => setX(0);
  document.getElementById("reset-y").onclick = () => setY(0);
  document.getElementById("reset-z").onclick = () => setZ(0);
  document.getElementById("reset-all").onclick = () => setAll(0, 0, 0);

  document.getElementById("reset-time").onclick = () => (TIME = 0);

  document.getElementById("view-back-left").onclick = () => setAll(0, 135, 0);
  document.getElementById("view-back").onclick = () => setAll(0, 180, 0);
  document.getElementById("view-back-right").onclick = () => setAll(0, -135, 0);
  document.getElementById("view-left").onclick = () => setAll(0, 90, 0);
  document.getElementById("view-top").onclick = () => setAll(90, 0, 0);
  document.getElementById("view-right").onclick = () => setAll(0, -90, 0);
  document.getElementById("view-front-left").onclick = () => setAll(0, 45, 0);
  document.getElementById("view-front").onclick = () => setAll(0, 0, 0);
  document.getElementById("view-front-right").onclick = () => setAll(0, -45, 0);

  document.getElementById("animToggleButton").onclick = function () {
    if (animFlag) {
      animFlag = false;
    } else {
      animFlag = true;
      resetTimerFlag = true;
      window.requestAnimFrame(render);
    }
    console.log(animFlag);

    controller = new CameraController(canvas);
    controller.onchange = function (xRot, yRot) {
      RX = xRot;
      RY = yRot;
      window.requestAnimFrame(render);
    };
  };

  document.getElementById("textureToggleButton").onclick = function () {
    toggleTextures();
    window.requestAnimFrame(render);
  };

  var controller = new CameraController(canvas);
  controller.onchange = function (xRot, yRot) {
    RX = xRot;
    RY = yRot;
    window.requestAnimFrame(render);
  };

  // load and initialize the textures
  initTextures();

  // Recursive wait for the textures to load
  waitForTextures(textureArray);

  render();
};

// Sets the modelview and normal matrix in the shaders
function setMV() {
  modelViewMatrix = mult(viewMatrix, modelMatrix);
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  normalMatrix = inverseTranspose(modelViewMatrix);
  gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix));
}

/**
 * Sets the projection, modelview and normal matrices in the shaders.
 */
function setAllMatrices() {
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  setMV();
}

/**
 * Draws a 2x2x2 cube centered at the origin.
 * Sets the modelview and normal matrices of the global program.
 */
function drawCube() {
  setMV(gl);
  Cube.draw();
}

/**
 * Draws a sphere centered at the origin with radius 1.0.
 * Sets the modelview and normal matrices of the global program.
 */
function drawSphere() {
  setMV(gl);
  Sphere.draw();
}

/**
 * Draws a cylinder along z axis of height 1 centered at the origin and radius 0.5.
 * Sets the modelview and normal matrices of the global program.
 */
function drawCylinder() {
  setMV(gl);
  Cylinder.draw();
}

/**
 * Draws a cone along z axis of height 1 centered at the origin and base radius 1.0.
 * Sets the modelview and normal matrices of the global program.
 */
function drawCone() {
  setMV(gl);
  Cone.draw();
}

/**
 * Post multiplies the modelview matrix with a translation matrix and replaces
 * the modeling matrix with the result.
 *
 * @param {number} x - The x coordinate of the translation.
 * @param {number} y - The y coordinate of the translation.
 * @param {number} z - The z coordinate of the translation.
 */
function gTranslate(x, y, z) {
  modelMatrix = mult(modelMatrix, translate([x, y, z]));
}

/**
 * Post multiplies the modelview matrix with a rotation matrix and replaces
 * the modeling matrix with the result.
 *
 * @param {number} theta - The angle of rotation in radians.
 * @param {number} x - The x component of the rotation axis.
 * @param {number} y - The y component of the rotation axis.
 * @param {number} z - The z component of the rotation axis.
 */
function gRotate(theta, x, y, z) {
  modelMatrix = mult(modelMatrix, rotate(theta, [x, y, z]));
}

/**
 * Post multiplies the modeling matrix with a scaling matrix and replaces
 * the modeling matrix with the result.
 *
 * @param {number} sx - The scaling factor in x direction.
 * @param {number} sy - The scaling factor in y direction.
 * @param {number} sz - The scaling factor in z direction.
 */
function gScale(sx, sy, sz) {
  modelMatrix = mult(modelMatrix, scale(sx, sy, sz));
}

/** Pops the top matrix from the stack and sets it as the current modelMatrix. */
function gPop() {
  modelMatrix = MS.pop();
}

/** Pushes the current modelMatrix onto the stack. */
function gPush() {
  MS.push(modelMatrix);
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  eye = vec3(0, 10, 20);
  // eye[1] = eye[1] + 0;

  // set the projection matrix
  projectionMatrix = perspective(45, 1, near, far);
  // projectionMatrix = ortho(left, right, bottom, ytop, near, far);

  at = vec3(0, 0, 0);

  // set the camera matrix
  viewMatrix = lookAt(eye, at, up);

  // initialize the modeling matrix stack
  MS = [];
  modelMatrix = mat4();

  // apply the slider rotations
  gRotate(RZ, 0, 0, 1);
  gRotate(RY, 0, 1, 0);
  gRotate(RX, 1, 0, 0);

  // send all the matrices to the shaders
  setAllMatrices();

  // get real time
  var curTime;
  if (animFlag) {
    curTime = new Date().getTime() / 1000;
    if (resetTimerFlag) {
      prevTime = curTime;
      resetTimerFlag = false;
    }
    TIME = TIME + curTime - prevTime;
    prevTime = curTime;
  }

  // Water
  newSphere("#006994", () => {
    useTexture("water");
    gScale(100, 0.01, 100);
  });

  // Island
  newObj(() => {
    newSphere("#c2b280", () => {
      useTexture("sand");
      gScale(5, 1, 5);
    });
  });

  // Palm Tree
  newObj(() => {
    // Trunk
    gTranslate(-2, 0, 0);
    for (let x = 1; x <= 9; x++) {
      const factor = 50;
      gScaleU(1 - x / factor);
      gRotate(-1 * x, 0, 0, 1);
      gTranslate(-(x / factor) / 2, 1 - x / factor, 0);
      newTaperedCylinder("#795c2e", () => {
        useTexture("bark");
        gRotate(270, 1, 0, 0);
      });
    }

    // Leaves
    const leafLength = 3;
    const numLeaves = 5;
    for (let x = 0; x < numLeaves; x++) {
      newCube("#439804", () => {
        useTexture("grass");
        gRotate(Math.cos(TIME + x) * 10, 0, 0, 1);
        gRotate((360 / numLeaves) * x, 0, 1, 0);
        gTranslate(leafLength, 0.5, 0);
        gScale(leafLength, 0, 1);
      });
    }
  });

  if (animFlag) window.requestAnimFrame(render);
}

// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
// var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
function CameraController(element) {
  var controller = this;
  this.onchange = null;
  this.xRot = 0;
  this.yRot = 0;
  this.scaleFactor = 3.0;
  this.dragging = false;
  this.curX = 0;
  this.curY = 0;

  // Assign a mouse down handler to the HTML element.
  element.onmousedown = function (ev) {
    controller.dragging = true;
    controller.curX = ev.clientX;
    controller.curY = ev.clientY;
  };

  // Assign a mouse up handler to the HTML element.
  element.onmouseup = function (ev) {
    controller.dragging = false;
  };

  // Assign a mouse move handler to the HTML element.
  element.onmousemove = function (ev) {
    if (controller.dragging) {
      // Determine how far we have moved since the last mouse move
      // event.
      var curX = ev.clientX;
      var curY = ev.clientY;
      var deltaX = (controller.curX - curX) / controller.scaleFactor;
      var deltaY = (controller.curY - curY) / controller.scaleFactor;
      controller.curX = curX;
      controller.curY = curY;
      // Update the X and Y rotation angles based on the mouse motion.
      controller.yRot = (controller.yRot + deltaX) % 360;
      controller.xRot = controller.xRot + deltaY;
      // Clamp the X rotation to prevent the camera from going upside
      // down.
      if (controller.xRot < -90) {
        controller.xRot = -90;
      } else if (controller.xRot > 90) {
        controller.xRot = 90;
      }
      // Send the onchange event to any listener.
      if (controller.onchange != null) {
        controller.onchange(controller.xRot, controller.yRot);
      }
    }
  };
}
