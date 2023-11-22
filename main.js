// Template code for A2 Fall 2021 -- DO NOT DELETE THIS LINE

"use strict";

/**
 * @type {WebGLRenderingContext}
 */
let gl;

/**
 * The current program
 * @type {WebGLProgram}
 */
let program;

/**
 * @typedef {Object} Program
 * @property {WebGLProgram} program
 * @property {WebGLUniformLocation} u_viewLoc
 * @property {WebGLUniformLocation} u_normalLoc
 * @property {WebGLUniformLocation} u_projectionLoc
 */

/**
 * The current shader program
 * @type {Program}
 */
let CurrentProgram = {};

/**
 * Array of shader programs
 * @property {Program} Default
 * @property {Program} Water
 */
const Programs = { Default: {}, Water: {} };

const near = 1;
const far = 100;

// Ortho consts
// const left = -6.0;
// const right = 6.0;
// const ytop = 6.0;
// const bottom = -6.0;

// const lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0);
const lightPosition = vec4(0.0, 0.0, 100.0, 1.0);

const defaultLight = {
  ambient: vec4(0.2, 0.2, 0.2, 1.0),
  diffuse: vec4(1.0, 1.0, 1.0, 1.0),
  specular: vec4(1.0, 1.0, 1.0, 1.0),
};

const defaultMaterial = {
  diffuse: vec4(1.0, 0.8, 0.0, 1.0),
  specular: vec4(0.4, 0.4, 0.4, 1.0),
  shininess: 30.0,
};

// var ambientColor, diffuseColor, specularColor;

let modelMatrix, viewMatrix;
let u_view, u_projection, u_normal;
let u_viewLoc, u_projectionLoc, u_normalLoc;

/**
 * Camera rotations
 */
let Rotations = {
  x: 0,
  y: 0,
  z: 0,
};

let MS = []; // The modeling matrix stack
let TIME = 0.0; // Realtime
let resetTimerFlag = true;
let animFlag = false;
let prevTime = 0.0;

let controller;
let fpsElement;

/**
 * @typedef {string} TextureFile
 */

/**
 * List of texture files
 * @readonly
 * @enum {TextureFile}
 */
const textures = {
  DEFAULT: "default",
  BARK: "bark",
  GRASS: "grass",
  SAND: "sand",
  COCONUT: "coconut",
  GRASS: "grass",
  WATER: "water",
  CHAIR_WOOD: "chair_wood",
  COTTON: "cotton",
  SKIN: "skin",
  DENIM: "denim",
  FLOWERS: "flowers",
  SQUIRRELS: "squirrels",
  EYE: "eye",
  BLACK: "black",
};

/**
 * @typedef Texture
 * @type {Object}
 * @property {WebGLTexture} textureWebGL - The WebGL texture
 * @property {boolean} isTextureReady Flag to tell if texture is ready
 * @property {HTMLImageElement} image The texture image
 */

/**
 * @typedef FullTexture
 * @type {Object}
 * @property {Texture} DIF Diffuse Texture
 * @property {Texture} NRM Normal Map
 */

/**
 * Array of all the textures used in the program
 * @type {FullTexture[]}
 */
let loadedTextures = [];

const initTextures = () => {
  loadedTextures = Object.values(textures).reduce(
    (arr, folderName, i) => [
      ...arr,
      ["DIF", "NRM"].reduce(
        (obj, fileName) => ({
          ...obj,
          [fileName]: {
            textureWebGL: gl.createTexture(),
            isTextureReady: false,
            image: (() => {
              const image = new Image();
              image.src = `textures/${folderName}/${fileName}.jpg`;
              image.onload = () =>
                handleTextureLoaded(loadedTextures[i][fileName]);
              return image;
            })(),
          },
        }),
        {}
      ),
    ],
    []
  );
};

/**
 * Handle the texture once the image has been loaded
 * @param {Texture} textureObj
 */
const handleTextureLoaded = (textureObj) => {
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); //Prevents s-coordinate wrapping (repeating)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT); //Prevents t-coordinate wrapping (repeating)
  gl.bindTexture(gl.TEXTURE_2D, null);

  textureObj.isTextureReady = true;
};

//----------------------------------------------------------------

function setColor(c) {
  const ambientProduct = mult(defaultLight.ambient, c);
  const diffuseProduct = mult(defaultLight.diffuse, c);
  const specularProduct = mult(defaultLight.specular, defaultMaterial.specular);

  gl.uniform4fv(getUniformLocation("ambientProduct"), flatten(ambientProduct));
  gl.uniform4fv(getUniformLocation("diffuseProduct"), flatten(diffuseProduct));
  gl.uniform4fv(
    getUniformLocation("specularProduct"),
    flatten(specularProduct)
  );
  gl.uniform4fv(getUniformLocation("lightPosition"), flatten(lightPosition));
  gl.uniform1f(getUniformLocation("shininess"), defaultMaterial.shininess);
}

/**
 * Takes an array of textures and calls render if the textures are created
 * @param {FullTexture[]} texs Array of textures
 */
const waitForTextures = (texs) => {
  setTimeout(() => {
    const fullyLoaded = texs
      .flatMap((t) => Object.values(t))
      .every(({ isTextureReady }) => {
        return isTextureReady;
      }, 0);

    if (fullyLoaded) {
      console.log("ready to render");
      window.requestAnimFrame(render);
    } else {
      const missing = texs
        .flatMap((t) => Object.values(t))
        .filter(({ isTextureReady }) => {
          return !isTextureReady;
        })
        .reduce((str, t) => `${str}\n\t${t.image.src}`, "");
      console.log(`Not ready yet. Still missing: ${missing}`);
      waitForTextures(texs);
    }
  }, 0);
};

window.onload = function init() {
  const canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  // Skybox colour
  gl.clearColor(0.529, 0.808, 0.922, 1.0);

  gl.enable(gl.DEPTH_TEST);

  // Load shaders and initialize attribute buffers
  Programs.Default.program = initShaders(
    gl,
    "vertex-shader",
    "fragment-shader"
  );
  Programs.Water.program = initShaders(
    gl,
    "vertex-shader",
    "fragment-shader-water"
  );

  setUniformLocations(Programs.Default);
  setUniformLocations(Programs.Water);

  // Load canonical objects and their attributes
  setProgram(Programs.Default);
  Cube.init(program);
  Cylinder.init(9, program);
  Cone.init(9, program);
  Sphere.init(36, program);
  TaperedCylinder.init(9, program);

  // set a default material
  setColor(defaultMaterial.diffuse);

  const sliderX = document.getElementById("sliderXi");
  sliderX.oninput = function () {
    Rotations.x = this.value;
    window.requestAnimFrame(render);
  };

  const sliderY = document.getElementById("sliderYi");
  sliderY.oninput = function () {
    Rotations.y = this.value;
    window.requestAnimFrame(render);
  };

  const sliderZ = document.getElementById("sliderZi");
  sliderZ.oninput = function () {
    Rotations.z = this.value;
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

  document.getElementById("reset-time").onclick = () => {
    TIME = 0;
    window.requestAnimFrame(render);
  };

  document.getElementById("view-back-left").onclick = () => setAll(0, 135, 0);
  document.getElementById("view-back").onclick = () => setAll(0, 180, 0);
  document.getElementById("view-back-right").onclick = () => setAll(0, -135, 0);
  document.getElementById("view-left").onclick = () => setAll(0, 90, 0);
  document.getElementById("view-top").onclick = () => setAll(90, 0, 0);
  document.getElementById("view-right").onclick = () => setAll(0, -90, 0);
  document.getElementById("view-front-left").onclick = () => setAll(0, 45, 0);
  document.getElementById("view-front").onclick = () => setAll(0, 0, 0);
  document.getElementById("view-front-right").onclick = () => setAll(0, -45, 0);

  fpsElement = document.getElementById("fps");

  document.getElementById("animToggleButton").onclick = function () {
    if (!animFlag) {
      resetTimerFlag = true;
      window.requestAnimFrame(render);
    }
    animFlag = !animFlag;
    console.log(animFlag);
  };

  controller = new CameraController(canvas);
  controller.onchange = function (xRot, yRot) {
    animFlag = false;
    Rotations.x = xRot;
    Rotations.y = yRot;
    window.requestAnimFrame(render);
  };

  // load and initialize the textures
  initTextures();

  // Recursive wait for the textures to load
  waitForTextures(loadedTextures);

  render();
};

// Sets the modelview and normal matrix in the shaders
function setMV() {
  u_view = mult(viewMatrix, modelMatrix);
  gl.uniformMatrix4fv(CurrentProgram.u_viewLoc, false, flatten(u_view));
  u_normal = inverseTranspose(u_view);
  gl.uniformMatrix4fv(CurrentProgram.u_normalLoc, false, flatten(u_normal));
}

/**
 * Sets the projection, modelview and normal matrices in the shaders.
 */
function setAllMatrices() {
  gl.uniformMatrix4fv(
    CurrentProgram.u_projectionLoc,
    false,
    flatten(u_projection)
  );
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

  const eye = vec3(-5, 6, 7);
  // const eye = vec3(-1, 4, 2);

  // set the projection matrix
  u_projection = perspective(45, 1, near, far);
  // u_projection = ortho(left, right, bottom, ytop, near, far);

  const at = vec3(2, 0, -4);
  const up = vec3(0.0, 1.0, 0.0);

  // set the camera matrix
  viewMatrix = lookAt(eye, at, up);

  // initialize the modeling matrix stack
  MS = [];
  modelMatrix = mat4();

  // Spin camera
  // if (animFlag) Rotations.y = (TIME * 10) % 360;

  // apply the slider rotations
  gRotate(Rotations.x, 0, 0, 1);
  gRotate(Rotations.y, 0, 1, 0);
  gRotate(Rotations.z, 1, 0, 0);

  // send all the matrices to the shaders
  setProgram(Programs.Default);
  setUniforms();

  // get real time
  if (animFlag) {
    const curTime = new Date().getTime() / 1000;
    if (resetTimerFlag) {
      prevTime = curTime;
      resetTimerFlag = false;
    }
    const diff = curTime - prevTime;
    if (diff) fpsElement.innerText = Math.round(1 / diff);
    TIME += diff;
    prevTime = curTime;
  }

  // ---------------------------- Drawing ----------------------------

  // Water
  withShader(Programs.Water, () => {
    newSphere("#006994", textures.WATER, () => {
      gScale(100, 0.01, 100);
    });
  });

  // Island
  newObj(() => {
    newSphere("#c2b280", textures.SAND, () => {
      gScale(5, 1, 5);
    });
  });

  // Palm Tree
  newObj(() => {
    gTranslate(-2, 0.4, 0);
    gRotate(90, -1, 0, 0);

    const segments = 10;
    const bark = ["#795c2e", textures.BARK];

    // Trunk
    drawRecursive(...bark, segments, newTaperedCylinder, () => {
      gRotate(4, 0, 1, 0);
      gTranslate(-0.0125, 0, 0.8);
      gScaleU(0.9);
    });

    // Tree toppers
    newObj(() => {
      gTranslate(1.75, 0, 5);
      gRotate(90, 1, 0, -1);

      // Leaves
      const numLeaves = 5;
      [-20, 15, 30].forEach((x, i) => {
        [...Array(numLeaves).keys()].forEach((y) => {
          newTaperedCylinder("#439804", textures.GRASS, () => {
            const leafLength = Math.abs(x) / 10;
            gRotate((360 / numLeaves) * y + 35 * i, 0, 1, 0);
            gRotate(Math.cos(TIME + y) * 10 + x, 0, 0, 1);
            gTranslate(leafLength / 3, 0, 0);
            gRotate(90, 0, 1, 0);
            gScale(numLeaves / 7, 0.01, leafLength);
          });
        });
      });

      // Coconuts
      const numCoconuts = 3;
      [...Array(numCoconuts).keys()].forEach((x) => {
        newObj(() => {
          gRotate(45, 0, 1, -1);
          gScaleU(0.2);
          gTranslate(2 + (x % 2), -1.5 + (x % 2) / 2, x - 1);
          gRotate(135 + x * 45, 1, 0, 0);

          newSphere("#79513E", textures.COCONUT, () => {
            const numHoles = 3;
            gRotate(90, 0, 0, 1);
            [...Array(numHoles).keys()].forEach((x) => {
              newSphere("", textures.BLACK, () => {
                gRotate((x / numHoles) * 360, 0, 1, 0);
                gTranslate(0, -0.8, -0.25);
                gScaleU(0.2);
              });
            });
          });
        });
      });
    });
  });

  // Beach chair
  newObj(() => {
    gScaleU(0.5);
    gTranslate(1, 3.8, 0);

    // Top Fabric
    newCube("#017fbd", textures.FLOWERS, () => {
      gTranslate(0, 0, -2);
      gRotate(45, 1, 0, 0);
      gScale(1, 0.02, 1.5);
    });
    // Bottom Fabric
    newCube("#017fbd", textures.FLOWERS, () => {
      gTranslate(0, -1, 1);
      gScale(1, 0.02, 2);
    });

    // Wood Supports
    const woodSupport = (fn) => newCylinder("#a48205", textures.CHAIR_WOOD, fn);
    [-1, 1].forEach((e) => {
      newObj(() => {
        gTranslate(e, 0, 0);
        // Bottom Bar
        woodSupport(() => {
          gTranslate(0, -1, 1);
          gScale(0.2, 0.2, 4.1);
        });
        // Back Bar
        woodSupport(() => {
          gTranslate(0, 0, -2);
          gRotate(45, 1, 0, 0);
          gScale(0.2, 0.2, 3);
        });
        // Back Bar Caps
        newSphere("#a48205", textures.CHAIR_WOOD, () => {
          gTranslate(0, 1.025, -3.025);
          gRotate(45, 1, 0, 0);
          gScaleU(0.1);
        });
        // Back Leg
        woodSupport(() => {
          gTranslate(0, -1.5, -1.5);
          gRotate(135, 1, 0, 0);
          gScale(0.2, 0.2, 1.5);
        });
        // Front Leg
        woodSupport(() => {
          gTranslate(0, -1.5, 3.5);
          gRotate(45, 1, 0, 0);
          gScale(0.2, 0.2, 1.5);
        });
        // Head Bar
        woodSupport(() => {
          gRotate(90, 0, 1, 0);
          gTranslate(3, 1, -e / 2);
          gScale(0.2, 0.2, 1);
        });
        // Foot Bar
        woodSupport(() => {
          gRotate(90, 0, 1, 0);
          gTranslate(-3, -1, -e / 2);
          gScale(0.2, 0.2, 1);
        });
      });
    });
  });

  // Steve
  newObj(() => {
    gScaleU(0.5);
    gTranslate(1, 4, 0);

    const skin = ["#a3806d", textures.SKIN];

    // Shirt
    const shirt = ["#a3806d", textures.SQUIRRELS];
    newTaperedCylinder(...shirt, () => {
      gTranslate(0, -0.3, -1.1);
      gRotate(-135, 1, 0, 0);

      // Shirt
      newTaperedCylinder(...shirt, () => {
        gTranslate(0, 0, 0.8);

        // Neck
        newTaperedCylinder(...skin, () => {
          gTranslate(0, 0, 0.2);
          gScale(1, 0.65, 0.25);
        });

        // Arms
        [-1, 1].forEach((e) => {
          // Sleeves
          newTaperedCylinder(...shirt, () => {
            // Don't touch
            gRotate(90, 0, e, 0);
            gTranslate(e * 0.4, 0, 0.35);

            // Move Upper arm
            gRotate(45, (Math.cos(TIME) + 1) / 2, e, 0);

            // Don't touch
            gTranslate(0, 0, 0.5);

            // Upper arm
            newTaperedCylinder(...skin, () => {
              gTranslate(0, 0, 0.5);

              // Elbow
              newSphere(...skin, () => {
                gTranslate(0, 0, 0.25);

                // Forearm
                newTaperedCylinder("...skin", textures.DEFAULT, () => {
                  gRotate(60 + Math.cos(TIME) * 30, 1, e, 0);
                  gTranslate(0, 0, 0.5);

                  gScale(0.3, 0.3, 1);
                });

                gScaleU(0.14);
              });

              gScale(0.35, 0.4, 0.5);
            });

            gScale(0.5, 0.5, 0.75);
          });
        });

        gScale(1.2, 0.85, 0.25);
      });

      // Head;
      newSphere(...skin, () => {
        gTranslate(0, 0, 1.5);

        // Eyes
        [-1, 1].forEach((e) => {
          newSphere("", textures.EYE, () => {
            gTranslate(e * 0.2, -0.4, 0.1);
            gRotate(e * 20, 0, 0, 1);
            gScaleU(0.1);
          });
        });

        // Mouth
        newSphere("", textures.BLACK, () => {
          gTranslate(0, -0.28, -0.2);
          gScaleU(0.2);
        });
        newSphere("", textures.SKIN, () => {
          gTranslate(0, -0.28, -0.17);
          gScaleU(0.21);
        });

        // Hair
        [...Array(31).keys()]
          .map((i) => i - 15)
          .forEach((y) => {
            [...Array(31).keys()]
              .map((i) => i - 15)
              .forEach((x) => {
                newObj(() => {
                  gRotate(y * 3, 1, 0, 0);
                  newTaperedCylinder("", textures.COCONUT, () => {
                    gRotate(x * 3, 0, 1, 0);
                    gTranslate(0, 0, 0.6);
                    // gTranslate(0, 0, 0.15);
                    gScale(0.03, 0.03, 0.3);
                  });
                });
              });
          });

        gScale(0.5, 0.5, 0.6);
      });

      const shorts = ["#2f5060", textures.DENIM];

      // Hips
      newCylinder(...shorts, () => {
        gRotate(135, 1, 0, 0);
        gTranslate(0, -0.5, 0.75);

        // Crotch cover
        newSphere(...shorts, () => {
          gScale(0.6, 0.25, 0.1);
        });

        // Legs - Top
        [-1, 1].forEach((e) => {
          newTaperedCylinder(...shorts, () => {
            gTranslate(e / 3, 0, 0.85);

            // Legs - Bottom
            newTaperedCylinder(...skin, () => {
              gTranslate(0, 0, 1);

              // Feet
              newSphere(...skin, () => {
                gTranslate(0, 0.15, 0.65);
                gRotate(15, 1, 0, -e);

                // Toes
                [1.75, 1, 1, 1, 1].forEach((t, i) => {
                  newSphere(...skin, () => {
                    gTranslate(
                      (e * (i - t)) / 25,
                      0.35 - Math.tan(i / 3) / 60,
                      0.02
                    );
                    gScale(0.025 * t, 0.035 * t, 0.03);
                  });
                });

                gScale(0.175, 0.35, 0.1);
              });

              gScale(0.4, 0.3, 1.25);
            });

            gScale(0.75, 0.4, 1.25);
          });
        });

        gScale(1.49, 0.5, 0.5);
      });

      gScale(1.5, 1, 1.5);
    });
  });

  if (animFlag) window.requestAnimFrame(render);
}

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
