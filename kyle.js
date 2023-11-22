/**********************************************************************
 *
 * A series of helper methods for drawing
 *
 **********************************************************************/

/**
 * Converts a hex color string to RGBA.
 * Modified from https://stackoverflow.com/a/51564734
 *
 * @param {string} hex - The hex color string.
 * @returns {vec4} The RGBA components as a vec4.
 */
const hex2rgba = (hex) => {
  const [r, g, b, a] = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255);
  return vec4(r, g, b, 255);
};

/**
 * Draws a cylinder along z axis of height 1 centered at the origin and radius 0.5.
 * Sets the modelview and normal matrices of the global program.
 */
const drawTaperedCylinder = () => {
  setMV(gl);
  TaperedCylinder.draw();
};

/**
 * Base wrapper for drawing objects. Runs push and pop around the function.
 * @param {() => void} fn Function of transformations to apply
 */
const newObj = (fn) => {
  gPush();
  fn();
  gPop();
};

/**
 * Wrapper for drawing objects
 * @param {string} color Hex code
 * @param {TextureFile} texture Element of `textures` object
 * @param {() => void} drawShape Function that draws an object
 * @param {() => void} fn Function of transformations to apply
 */
const drawObj = (color, texture, drawShape, fn) =>
  newObj(() => {
    fn();
    useTexture(texture ?? textures.DEFAULT);
    drawShape();
  });

/**
 * Draw a new cube
 * @param {string} color Hex code
 * @param {TextureFile} texture Element of `textures` object
 * @param {() => void} fn Function of transformations to apply
 */
const newCube = (color, texture, fn) => drawObj(color, texture, drawCube, fn);

/**
 * Draw a new sphere
 * @param {string} color Hex code
 * @param {TextureFile} texture Element of `textures` object
 * @param {() => void} fn Function of transformations to apply
 */
const newSphere = (color, texture, fn) =>
  drawObj(color, texture, drawSphere, fn);

/**
 * Draw a new cone
 * @param {string} color Hex code
 * @param {TextureFile} texture Element of `textures` object
 * @param {() => void} fn Function of transformations to apply
 */
const newCone = (color, texture, fn) => drawObj(color, texture, drawCone, fn);

/**
 * Draw a new cylinder
 * @param {string} color Hex code
 * @param {TextureFile} texture Element of `textures` object
 * @param {() => void} fn Function of transformations to apply
 */
const newCylinder = (color, texture, fn) =>
  drawObj(color, texture, drawCylinder, fn);

/**
 * Draw a new cylinder
 * @param {string} color Hex code
 * @param {TextureFile} texture Element of `textures` object
 * @param {() => void} fn Function of transformations to apply
 */
const newTaperedCylinder = (color, texture, fn) =>
  drawObj(color, texture, drawTaperedCylinder, fn);

/**
 * Uniformly scale
 * @param {number} factor The scaling factor
 * @returns void
 */
const gScaleU = (factor) => gScale(factor, factor, factor);

/**
 * Get current drawing position
 * @returns {vec3} Current drawing position
 */
const gPos = () => vec3(...vertices1);

/**
 * Apply texture
 * @param {TextureFile} texture Element of `textures` object
 * @param {number} unit Shader unit to use for multiple textures
 */
const useTexture = (texture) => {
  const n = Object.values(textures).indexOf(texture);
  // Diffuse / Colour texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, loadedTextures[n].DIF.textureWebGL);
  // Normal map
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, loadedTextures[n].NRM.textureWebGL);
};

/**
 * Wrapper for the WebGL method of the same name
 * @param {string} name
 */
const getUniformLocation = (name) => {
  return gl.getUniformLocation(program, name);
};

/**
 *
 * @param {string} color Hex code
 * @param {TextureFile} texture Element of `textures` object
 * @param {number} count Number of recursive calls
 * @param {(color: string, texture: string, fn: () => void) => void} newShape Shape drawing function
 * @param {*} transforms Function of transformations to apply
 * @returns void
 */
const drawRecursive = (color, texture, count, newShape, transforms) => {
  if (count <= 0) return;

  newShape(color, texture, () => {
    transforms();
    drawRecursive(color, texture, count - 1, newShape, transforms);
  });
};

/**
 * Set the currently used program
 * @param {Program} p
 */
const setProgram = (p) => {
  gl.useProgram(p.program);
  program = p.program;
  CurrentProgram = p;
};

/**
 * Set uniform locations that may change per render call
 * @param {Program} p Program object
 */
const setUniformLocations = (p) => {
  setProgram(p);

  p.timeLoc = getUniformLocation("time");

  // record the locations of the matrices that are used in the shaders
  p.u_viewLoc = getUniformLocation("u_view");
  p.u_normalLoc = getUniformLocation("u_normal");
  p.u_projectionLoc = getUniformLocation("u_projection");
};

/**
 *
 * @param {Program} p Shader program to use
 * @param {() => void} fn Function with drawing commands
 */
const withShader = (p, fn) => {
  setProgram(p);
  setUniforms();
  fn();
  setProgram(Programs.Default);
  setUniforms();
};

/**
 * Set uniforms
 */
const setUniforms = () => {
  gl.uniform1f(CurrentProgram.timeLoc, TIME / 5);
  setAllMatrices();
};

/**
 *
 * @param {number} start Start time
 * @param {number} duration Duration in seconds
 * @param {(localTime: number) => void} animation Animation function with "local time"
 * @returns
 */
const newAnimation = (start, duration, animation) => {
  const time = TIME % 30;
  if (time > start && time < start + duration) animation(time - start);
};

//------------------- Objects ------------------

const newCoconut = (initX, initY, initZ) => ({
  offsets: {
    x: 0,
    y: 0,
    z: 0,
  },
  move(x, y, z) {
    this.offsets.x = x;
    this.offsets.y = y;
    this.offsets.z = z;
  },
  draw() {
    newObj(() => {
      gRotate(45, 0, 1, -1);
      gScaleU(0.2);
      gTranslate(initX, initY, initZ);
      gRotate(-20, 0, 0, 1);
      gTranslate(this.offsets.x, this.offsets.y, this.offsets.z);

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
  },
});

//-------------- Tapered Cylinder --------------

const TaperedCylinder = {
  pointsArray: [],
  normalsArray: [],
  colorsArray: [],
  texCoordsArray: [],

  taperAmount: 0.2,

  getVertex(u, v) {
    return {
      position: vec4(
        0.5 * (1 - this.taperAmount * v) * Math.cos(u * 2 * Math.PI),
        0.5 * (1 - this.taperAmount * v) * Math.sin(u * 2 * Math.PI),
        v - 0.5,
        1.0
      ),
      normal: vec3(Math.cos(u * 2 * Math.PI), Math.sin(u * 2 * Math.PI), 0.0),
      colour: vec4(u, v, 0.0, 1.0),
      texCoord: vec2(u, v * (1 - this.taperAmount)),
    };
  },

  init(n, program) {
    this.n = n;
    if (this.n < 1) return;

    var du = 1.0 / this.n;
    var dv = du;
    // do it by quads made up of two triangles
    for (var u = 0; u < 1.0; u += du) {
      for (var v = 0; v < 1.0; v += dv) {
        // make them into triangles
        var vd1 = this.getVertex(u, v);
        var vd2 = this.getVertex(u + du, v);
        var vd3 = this.getVertex(u + du, v + dv);
        var vd4 = this.getVertex(u, v + dv);

        // Triangle one
        [vd1, vd2, vd3].forEach((e) => AddInAttribArrays(this, e));
        // Triangle two
        [vd3, vd4, vd1].forEach((e) => AddInAttribArrays(this, e));
      }
    }

    setBuffers(this, program);
  },

  draw() {
    gl.frontFace(gl.CCW);
    setAttribPointers(this);
    gl.drawArrays(gl.TRIANGLES, 0, this.n * this.n * 6);
  },
};
