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
