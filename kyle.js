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
function drawTaperedCylinder() {
  setMV(gl);
  TaperedCylinder.draw();
}

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
 * @param {() => void} drawShape Function that draws an object
 * @param {() => void} fn Function of transformations to apply
 */
const drawObj = (color, drawShape, fn) =>
  newObj(() => {
    setColor(hex2rgba(color));
    fn();
    drawShape();
  });

/**
 * Draw a new cube
 * @param {string} color Hex code
 * @param {() => void} fn Function of transformations to apply
 */
const newCube = (color, fn) => drawObj(color, drawCube, fn);

/**
 * Draw a new sphere
 * @param {string} color Hex code
 * @param {() => void} fn Function of transformations to apply
 */
const newSphere = (color, fn) => drawObj(color, drawSphere, fn);

/**
 * Draw a new cone
 * @param {string} color Hex code
 * @param {() => void} fn Function of transformations to apply
 */
const newCone = (color, fn) => drawObj(color, drawCone, fn);

/**
 * Draw a new cylinder
 * @param {string} color Hex code
 * @param {() => void} fn Function of transformations to apply
 */
const newCylinder = (color, fn) => drawObj(color, drawCylinder, fn);

/**
 * Draw a new cylinder
 * @param {string} color Hex code
 * @param {() => void} fn Function of transformations to apply
 */
const newTaperedCylinder = (color, fn) =>
  drawObj(color, () => drawTaperedCylinder(), fn);

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

const useTexture = (alias) => {
  const n = Object.values(textures).indexOf(alias);
  gl.activeTexture(gl[`TEXTURE0`]);
  gl.bindTexture(gl.TEXTURE_2D, textureArray[n].textureWebGL);
  gl.uniform1i(gl.getUniformLocation(program, `texture1`), 0);
};

//-------------- Tapered Cylinder --------------

TaperedCylinder = {};

TaperedCylinder.pointsArray = [];
TaperedCylinder.normalsArray = [];
TaperedCylinder.colorsArray = [];
TaperedCylinder.texCoordsArray = [];
TaperedCylinder.taperAmount = 0.2;

TaperedCylinder.getVertex = function (u, v) {
  var vd = {};
  vd.position = vec4(
    0.5 * (1 - this.taperAmount * v) * Math.cos(u * 2 * Math.PI),
    0.5 * (1 - this.taperAmount * v) * Math.sin(u * 2 * Math.PI),
    v - 0.5,
    1.0
  );
  vd.normal = vec3(Math.cos(u * 2 * Math.PI), Math.sin(u * 2 * Math.PI), 0.0);
  vd.colour = vec4(u, v, 0.0, 1.0);
  vd.texCoord = vec2(u, v * (1 - this.taperAmount));

  return vd;
};

TaperedCylinder.init = function (n, program) {
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
      AddInAttribArrays(this, vd1);
      AddInAttribArrays(this, vd2);
      AddInAttribArrays(this, vd3);

      // Triangle two
      AddInAttribArrays(this, vd3);
      AddInAttribArrays(this, vd4);
      AddInAttribArrays(this, vd1);
    }
  }

  setBuffers(this, program);
};

TaperedCylinder.draw = function () {
  gl.frontFace(gl.CCW);

  setAttribPointers(this);
  gl.drawArrays(gl.TRIANGLES, 0, this.n * this.n * 6);
};
