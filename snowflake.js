/**
 * # snowflake.js
 *
 * Version 1.0.0
 *
 * This file is a part of the Fr0zenSystem snowflake generator optimized and
 * extended for the Glowforge laser cutter.
 *
 * # [Blue Oak Model License 1.0.0](https://blueoakcouncil.org/license/1.0.0)
 *
 */

/**
 * 
 * Color constants
 * 
 **/
const mainStrokes2Color = "red";
const mainStrokesColor = "white";
const shadowColor = "black";
const bluepaperColor = "CornflowerBlue";
const engraveColor = "lavender";
const holesColor = "purple";
const laserCutColor1 = "#04DD00";
const laserCutColor2 = "#017BC6";
const laserEngraveColor = "#BFDEF7";

/**
 * 
 * Size constants
 * 
 **/
const mainStrokeLength = 300;                   // Length of the first stroke. Sets the overall scale
const mainStokeWidth = mainStrokeLength / 20;
const borderWidth = mainStrokeLength / 4;       // The width of the border around the Snowflake
const hangerHoleRadius = mainStrokeLength / 20; // The radius of the hanger hole
const cutlineOffset = mainStrokeLength / 15;    // The offset for the inner outline

const strokeDecorationWidthFactor = 3 / 4;      // Side branch width scaling factor (fixed)
const strokeDecorationLengthParam = 5;          // Side branch length scaling parm (see code)
const minDecoBaseFactor = 1 / 3;                // Minimum scale a branch must have to have engrave decorations

/**
 *
 * Other constants
 *
 **/
const minStrokeDecorations = 2;                 // minimum number of side branches from mainStroke
const maxStrokeDecorations = 5;                 // maximum number of side branches from mainStroke
const symmetry = 6;                             // Rotational symmetry
const symmetryAngle = 360 / symmetry;
const nHexas = 4;                               // Number of hexagons in a decoraton group, incl central hole
const branchDecoPobability = 0.7;               // Probability we'll make engrave decorations for branches

class Snowflake {
  /**
   *
   * Create a new Snowflake
   *
   * @param {number[4]} seed - 32-bit integers to be used as the seed for the sfc32 PRNG
   *
   **/
  constructor(seed) {
    this.pos = view.bounds.center;
    this.rand = sfc32(seed[0], seed[1], seed[2], seed[3]);  // Create the random number generator from seed
    this.buildUp();
  }

  /**
   *
   * Find the Items from this.lineGroup with a given stroke color
   *
   * @param {Color | string} col - the stroke color to be used
   * @returns {Item[]} Array containing the found Items
   *
   **/
  getLayerByStrokeColor(col) {
    return this.lineGroup.children.filter(
      (item) => item.strokeColor != null && item.strokeColor.equals(col)
    );
  }

  /**
   *
   * Build the Snowflake
   *
   **/
  async buildUp() {
    this.lineGroup = new Group();   // The group into which the snowflake's defining bits and pieces are put

    // Build this.mainLine, the main stroke.
    this.mainLine = new Path.Line(this.pos, this.pos.subtract([0, mainStrokeLength]));
    this.mainLine.strokeColor = mainStrokesColor;
    this.mainLine.strokeWidth = mainStokeWidth;
    this.mainLine.strokeCap = "round";

    // Build the bits and pieces for one sector of the Snowflake
    this.decorateLine(this.mainLine);
    this.flip();
    this.decorateBackground(this.mainLine);
    this.lineGroup.addChild(this.mainLine);

    this.spread();
    this.decorateBackground();

    this.assembleParts();
  }

  /**
   *
   * Create a Path surrounding everything in this.lineGroup offset by the
   * amount given.
   *
   * @param {number} dist - the amount of the offset
   * @returns {Path} the surrounding path. The Path is not in the scene.
   *
   **/
  createOutLine(dist) {
    let shape = new Path();
    this.lineGroup.children.forEach((path) => {
      if (path.closed) {
        let p = PaperOffset.offset(path, dist + path.strokeWidth / 2);

        let tmp = p.unite(shape);
        shape.remove();
        p.remove();
        shape = tmp;
      } else {
        let p = PaperOffset.offsetStroke(path, dist + path.strokeWidth / 2);
        p.fillColor = "orange";
        let tmp = p.unite(shape);
        shape.remove();
        p.remove();
        shape = tmp;

        let c = new Path.Circle(
          path.lastSegment.point,
          dist + path.strokeWidth / 2
        );
        c.fillColor = "black";
        let tmp2 = c.unite(shape);
        shape.remove();
        c.remove();
        shape = tmp2;
      }
    });
    shape.strokeColor = null;
    shape.fillColor = null;
    shape.remove();
    return shape;
  }

    /**
     *
     * Duplicate the contents of this.lineGroup symmetry times, roatating each
     * copy by symmetryAngle around this.pos
     *
     **/
    spread() {
    let newGroup = new Group();
    let groupSize;
    for (let i = 1; i < symmetry; i++) {
      let sym = this.lineGroup.clone();
      groupSize = sym.children.length;
      sym.rotate(symmetryAngle * i, this.pos);
      newGroup.addChildren(sym.children);
    }
    newGroup.addChildren(this.lineGroup.children);
    this.lineGroup = newGroup;
  }

  /**
   *
   * Make a vertical axis mirror copy of what's in this.lineGroup, putting the
   * copy back in this.lineGroup
   *
   **/
  flip() {
    let flip = this.lineGroup.clone();
    flip.scale(-1, 1, this.lineGroup.bounds.bottomLeft);
    let newGroup = new Group();
    newGroup.addChildren(this.lineGroup.children);
    let lngth = newGroup.children.length;
    newGroup.addChildren(flip.children);
    this.lineGroup = newGroup;
  }

    /**
     *
     * Make a group of nHexas concentric hexagons, centered someplace along
     * the second half of the Line line, if one is passed, or, if no Line is
     * passed, on the center of the Snowflake. The outer three have strokeColor
     * engraveColor and the final, innermost one has a strokeColor of
     * holesColor.
     *
     * @param {Line} [line] - the line, if any, to center along
     *
     **/
    decorateBackground(line) {
    let hexa;
    if (line) {
      hexa = new Path.RegularPolygon(
        line.getPointAt((this.rand() * line.length) / 2 + line.length / 2),
        6,
        Math.max(line.length / 5, (this.rand() * line.length) / 2)
      );
      hexa.strokeWidth = line.strokeWidth;
    } else {
      hexa = new Path.RegularPolygon(this.pos, 6, this.rand() * 100 + 100);
      hexa.strokeWidth = this.mainLine.strokeWidth;
    }
    hexa.strokeColor = engraveColor;
    hexa.remove();
    hexa = PaperOffset.offset(hexa, hexa.strokeWidth / 2);
    this.lineGroup.addChild(hexa);
    for (let i = 1; i < nHexas; i++) {
      let smallHexa = hexa.clone();
      smallHexa.scale(1 - i * 0.2);

      if (i == nHexas - 1) {            // The innermost; a hole
        smallHexa.strokeWidth = 1;
        smallHexa.fillColor = null;
        smallHexa.strokeColor = holesColor;
      } else {                          // One of the engraves
        smallHexa.strokeWidth = hexa.strokeWidth * (1 - i * 0.3);
      }
      smallHexa.remove();
      this.lineGroup.addChild(smallHexa);
    }
  }

  /**
   *
   * Make side branches on one side of the passed Line line with varied
   * scaling and position. Sometimes, make complementary engraving to show
   * behind the branches. Put everything that's made into this.lineGroup.
   * Normally called with a missing second parameter.
   *
   * @param {Line} line - The line to be decorated
   * @param {boolean} [engrave=false] - Whether to make the decorations branches or engraved
   *
   **/
  decorateLine(line, engrave = false) {
    for (let i = 0; i < Math.floor(this.rand() * (maxStrokeDecorations - 1) + minStrokeDecorations); i++) {
      let miniLine = line.clone();
      miniLine.scale(1 / (this.rand() * strokeDecorationLengthParam + 1));
      miniLine.strokeWidth = strokeDecorationWidthFactor * line.strokeWidth;

      let start = line.getPointAt(
        Math.max(miniLine.length, this.rand() * line.length)
      );
      miniLine.position = start;
      miniLine.rotate(symmetryAngle, miniLine.firstSegment.point);
      if (engrave) {
        miniLine.strokeColor = engraveColor;
      } else {
        miniLine.strokeColor = mainStrokes2Color;
      }
      this.lineGroup.addChild(miniLine);

      let conti = this.rand() < branchDecoPobability && miniLine.length > minDecoBaseFactor * this.mainLine.length;
      if (conti) {
        this.decorateLine(miniLine, true);
      }
    }
  }

  /**
   *
   * Make a border Path around the Snowflake. Make and position the Path for
   * the hanger hole. Return them in a Group
   *
   **/
  makeBorder() {
    let outline = this.createOutLine(borderWidth);
    let hangerLoc = new Point([outline.position.x, outline.bounds.point.y + (borderWidth / 2)]);
    let borderPoint = outline.getNearestPoint(hangerLoc);
    hangerLoc.y = borderPoint.y + (borderWidth / 2);
    return new Group(outline, new Path.Circle(hangerLoc, hangerHoleRadius));
  }

  /**
   *
   * Assemble all the bits and pieces into the two Groups of lines to be cut,
   * this.whitePaper and this.bluePaper, that represent the two layers of
   * paper. Put the bits to be engraved into this.engravings.
   *
   **/
  assembleParts() {
    let cutline = this.createOutLine(cutlineOffset);
    this.outline = this.makeBorder();

    // Create holes, the Group containing the hexagonal holes that will
    // go into this.bluePaper.
    let holes = new Group();
    (this.getLayerByStrokeColor(holesColor)).forEach((hole) => holes.addChild(hole));

    // Create this.engravings, the CompoundPath describing the areas to be
    // engraved. The pieces to use are the Paths that have a stroke color of
    // engraveColor. Subtract the portions that would be in a hole. Make them
    // fills with no stroke so they engrave.
    this.engravings = new Path();
    this.getLayerByStrokeColor(engraveColor).forEach((path) => {
      let engrave = PaperOffset.offsetStroke(path, path.strokeWidth / 2);
      holes.children.forEach((hole) => {
        engrave = engrave.subtract(hole);
      });
      this.engravings.remove();
      engrave.remove();
      this.engravings = this.engravings.unite(engrave);
    });
    this.engravings.fillColor = engraveColor;
    this.engravings.strokeColor = null;

    let lines = [];
    // Create the expansions of the Paths with strokeColor mainStrokes in
    // lines[]
    this.getLayerByStrokeColor(mainStrokesColor).forEach((item) => {
      item.scale(2, this.pos);
      let newLine = PaperOffset.offsetStroke(item, item.strokeWidth, {
        cap: "round",
      });
      newLine.fillColor = "yellow";
      lines.push(newLine);
      item.remove();
    });

    // Create the expansions of the Paths with strokeColor mainStrokes2, then
    // put slightly larger circles at the ends of each line, pushing everything
    // onto lines[] as we go
    this.getLayerByStrokeColor(mainStrokes2Color).forEach((item) => {
      let newLine = PaperOffset.offsetStroke(item, item.strokeWidth, {
        cap: "round",
      });
      newLine.fillColor = "yellow";
      lines.push(newLine);
      let r1 = new Path.Circle(
        item.firstSegment.point,
        item.strokeWidth + 0.01
      );
      lines.push(r1);
      let r2 = new Path.Circle(item.lastSegment.point, item.strokeWidth + 0.01);
      lines.push(r2);
      item.remove();
    });

    // Put the union of everything in lines[] into finalItem
    let finalItem = new Path();
    lines.forEach((item) => {
      let tmp = item.unite(finalItem);
      item.remove();
      finalItem.remove();
      finalItem = tmp;
    });

    // Punch finalItem out of cutline, which at this point is cutlineOffset
    // units bigger than the bounding curve around the stuff ginned up in
    // buildUp().
    let tmpcut = cutline.subtract(finalItem);
    finalItem.remove();
    cutline.remove();
    this.cutline = tmpcut;

    this.lineGroup.remove();

    // Create this.bluePaper. Add the overall outline and the hanger hole.
    // Then add the holes in the hexagons.
    this.bluePaper = new CompoundPath();
    this.bluePaper.fillRule = "evenodd";
    this.bluePaper.addChild(this.outline.children[0].clone());
    this.bluePaper.addChild(this.outline.children[1].clone());
    this.bluePaper.addChildren(holes.children);
    this.bluePaper.fillColor = bluepaperColor;
    this.bluePaper.shadowColor = shadowColor;
    this.bluePaper.shadowBlur = 4;
    this.bluePaper.shadowOffset = new Point(2, 2);
    this.bluePaper.sendToBack();

    // Create this.whitePaper. Add the overall outline and the hanger hole.
    // Then add cutline, as modified above and then get rid of any stray
    // free-floating "islands" that may have formed.
    this.whitePaper = new CompoundPath();
    this.whitePaper.fillRule = "evenodd";
    this.whitePaper.addChildren(this.outline.children);
    this.whitePaper.addChild(this.cutline);
    this.whitePaper.fillColor = mainStrokesColor;
    this.whitePaper.shadowColor = shadowColor;
    this.whitePaper.shadowBlur = 4;
    this.whitePaper.shadowOffset = new Point(2, 2);

    this.clearIslands(this.whitePaper);

    // Put the stuff to be engraved above this.bluePaper
    this.engravings.insertAbove(this.bluePaper);
  }

  /**
   *
   * Clear out any free-floating "islands" in the passed CompoundPath
   *
   * @param {CompoundPath} compound - the compound path to be worked on
   *
   **/
  clearIslands(compound) {
    compound.children = compound.children.filter(
      (entry) => this.countContains(compound, entry) <= 1
    );
  }

  countContains(compound, item) {
    let count = 0;
    compound.children.forEach((c) => {
      if (c !== item) {
        if (item.isInside(c.bounds) && c.contains(item.position)) {
          count++;
        }
      }
    });
    return count;
  }

  /**
   *
   * Switch this.whitePaper and this.bluePaper back and forth between the
   * representationfor the display and the laser cutter svg.
   *
   **/
  toggleMode() {
    if (this.whitePaper.fillColor) {  // Display --> Laser
      this.whitePaper.strokeColor = laserCutColor1;
      this.whitePaper.fillColor = null;
      this.bluePaper.strokeColor = laserCutColor2;
      this.bluePaper.fillColor = null;
      this.engravings.fillColor = laserEngraveColor;

      this.whitePaper.shadowColor = null;
      this.whitePaper.shadowBlur = 0;
      this.whitePaper.shadowOffset = 0;
      this.whitePaper.position.x += this.whitePaper.bounds.width + 10;
      this.bluePaper.shadowColor = null;
      this.bluePaper.shadowBlur = 0;
      this.bluePaper.shadowOffset = 0;
    } else {                            // Laser --> Display
      this.whitePaper.fillColor = mainStrokesColor;
      this.whitePaper.strokeColor = null;
      this.bluePaper.fillColor = bluepaperColor;
      this.bluePaper.strokeColor = null;
      this.engravings.fillColor = engraveColor;

      this.whitePaper.shadowColor = shadowColor;
      this.whitePaper.shadowBlur = 4;
      this.whitePaper.shadowOffset = new Point(2, 2);
      this.whitePaper.position.x = this.bluePaper.position.x;
      this.bluePaper.shadowColor = shadowColor;
      this.bluePaper.shadowBlur = 4;
      this.bluePaper.shadowOffset = new Point(2, 2);
    }
  }
}