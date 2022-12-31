/***
 * 
 * Color constants
 * 
 ***/
const mainStrokes2Color = "red";
const mainStrokesColor = "white";
const bluepaperColor = "CornflowerBlue";
const engravesColor = "#BFDEF7";
const cutlineColor = "green";
const holesColor = "purple";
const laserCutColor1 = "#04DD00";
const laserCutColor2 = "#017BC6";

/***
 * 
 * Size constants
 * 
 ***/
const mainStrokeLength = 300;
const mainStokeWidth = mainStrokeLength/20;
const minStrokeDecorations = 2;
const maxStrokeDecorations = 5;

const strokeDecorationWidthFactor = 3/4;
const strokeDecorationLengthFactor = 5;

class Snowflake {
  constructor(point, f, seed) {
    this.angle = 60;
    this.pos = point;

    this.innerLines = [];
    this.outerLines = [];
    this.hexagons = [];
    this.rand = sfc32(seed[0], seed[1], seed[2], seed[3]);  // Create the random number generator from seed

    this.buildUp(point, f);
  }

  copyColorToNewGroup(col, col2) {
    let paths = getLayerByStrokeColor(col);
    let newPaths = [];
    paths.forEach((item) => {
      let newPath = item.clone();
      newPath.strokeColor = col2;
      newPaths.push(newPath);
    });
    return newPaths;
  }

  // Return an array containing the Items from this.lineGroup whose stroke color is col
  getLayerByStrokeColor(col) {
    return this.lineGroup.children.filter(
      (item) => item.strokeColor != null && item.strokeColor.equals(col)
    );
  }

    // Return an array containing the Items from this.lineGroup whose fill color is col
  getLayerByFillColor(col) {
    return this.lineGroup.children.filter(
      (item) => item.fillColor != null && item.fillColor.equals(col)
    );
  }

  // Get all the Items in the project whose name is the passed string
  getItemsByName(name) {
    return project.getItems({
      name: name,
    });
  }

  // Build the basic shapes used in the snowflake, centering the constructon
  // on point.
  async buildUp(point) {
    this.lineGroup = new Group();   // The group into which the snowflake's defining bits and pieces are put

    // Build this.mainLine, the main stroke.
    this.mainLine = new Path.Line(point, point.subtract([0, mainStrokeLength]));
    this.mainLine.strokeColor = mainStrokesColor;
    this.mainLine.strokeWidth = mainStokeWidth;
    this.mainLine.strokeCap = "round";

    // Make the side branches of the main stroke on both sides of mainLine
    // Importantly, they get added to this.lineGroup
    this.decorateLine(this.mainLine, 0);

    // Now flip a copy of what's in this.lineGroup around the vertical axis 
    // and put the copy in this.lineGroup
    this.flip();

    // Make a group of hexagons with a hexagonal hole in the middle the 
    // group centered somewhere along this.mainLine.
    // Importantly, the hexagons' stroke color is engravesColor and the holes'
    // stroke color is holesColor and they get added to this.lineGroup
    this.decorateBackground(this.mainLine);

    // Put this.mainLine in this.lineGroup
    this.lineGroup.addChild(this.mainLine);

    // Take what's in this.lineGroup and duplicate it all six times, rotating
    // it by 60 degrees each time and put the result back in this.lineGroup
    this.spread();

    // Make a group of hexagons with a hole in the middle of the group 
    // centered at the origin.
    // Importantly, the hexagons' stroke color is engravesColor and the holes'
    // stroke color is holesColor and they get added to this.lineGroup
    this.decorateBackground();

    //Assemble all the bits and pieces into the final snowflake
    this.solidifyLine();
  }

  // Return a path that's offset by dist units from the union of everything in 
  // this.lineGroup.
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

    // Take what's in this.lineGroup and duplicate it all six times, rotating
    // it by 60 degrees each time. Put it all in this.lineGroup.
    spread() {
    let newGroup = new Group();
    let groupSize;
    for (let i = 1; i < 6; i++) {
      let sym = this.lineGroup.clone();
      groupSize = sym.children.length;
      sym.rotate(this.angle * i, this.pos);
      newGroup.addChildren(sym.children);
    }
    newGroup.addChildren(this.lineGroup.children);
    this.lineGroup = newGroup;
  }

  // Make a vertical axis mirror copy of what's in this.lineGroup and put it 
  // back in this.lineGroup
  flip() {
    let flip = this.lineGroup.clone();
    flip.scale(-1, 1, this.lineGroup.bounds.bottomLeft);
    let newGroup = new Group();
    newGroup.addChildren(this.lineGroup.children);
    let lngth = newGroup.children.length;
    newGroup.addChildren(flip.children);
    this.lineGroup = newGroup;
  }

    // Make a group of hexagons and a hole in the middle of the group 
    // centered at the group's origin. Center the group someplace along 
    // the second half of Line line, if one is passed, or, if no Line 
    // is passed, on the center of the snowflake if not.
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
    hexa.strokeColor = engravesColor;
    hexa.remove();
    hexa = PaperOffset.offset(hexa, hexa.strokeWidth / 2);
    hexa.sendToBack();
    this.lineGroup.addChild(hexa);
    for (let i = 1; i < 4; i++) {
      let smallHexa = hexa.clone();
      smallHexa.scale(1 - i * 0.2);

      if (i == 3) {
        smallHexa.strokeWidth = 1;
        smallHexa.fillColor = null;
        smallHexa.strokeColor = holesColor;
        smallHexa.sendToBack();
      } else {
        smallHexa.strokeWidth = hexa.strokeWidth * (1 - i * 0.3);
        smallHexa.remove();
        smallHexa = PaperOffset.offset(smallHexa, smallHexa.strokeWidth / 2);
        smallHexa.sendToBack();
      }
      smallHexa.remove();
      this.lineGroup.addChild(smallHexa);
    }
  }

    // Make between 2 and 5 side branches on both sides of passed Line
    decorateLine(line, depth) {
    for (let i = 0; i < Math.floor(this.rand() * (maxStrokeDecorations - 1) + minStrokeDecorations); i++) {
      let miniLine = line.clone();
      miniLine.scale(1 / (this.rand() * strokeDecorationLengthFactor + 1));
      miniLine.strokeWidth = strokeDecorationWidthFactor * line.strokeWidth;

      let start = line.getPointAt(
        Math.max(miniLine.length, this.rand() * line.length)
      );
      miniLine.position = start;
      miniLine.rotate(60, miniLine.firstSegment.point);
      miniLine.bringToFront();
      this.lineGroup.addChild(miniLine);
      if (depth < 1) {
        miniLine.strokeColor = mainStrokes2Color;
      } else {
        miniLine.strokeColor = engravesColor;
      }

      let conti = this.rand() < 0.7 && miniLine.length > this.mainLine.length / 3;
      if (conti) {
        this.decorateLine(miniLine, depth + 1);
      }
    }
  }

  // Make a border 70 units from what's in this.lineGroup. Add a hanger hole
  // at the top, put 'em in a Group and return it.
  makeBorder() {
    let outline = this.createOutLine(70);
    let hangerLoc = new Point([outline.position.x, outline.bounds.point.y + 35]);
    let borderPoint = outline.getNearestPoint(hangerLoc);
    hangerLoc.y = borderPoint.y + 35;
    return new Group(outline, new Path.Circle(hangerLoc, 15));
  }

  // Assemble all the bits and pieces into the two Groups, whitePaper and
  // bluePaper, that represent the two layers of paper.
  solidifyLine() {
    // cutline is a path 20 units offset from the bounding path of what's in 
    // this.lineGroup before we start messing with things.
    let cutline = this.createOutLine(20);

    // Make the Group this.outline, the border around the snowflake together 
    // with the hanger hole. We'll use this in both the whitePaper and
    // bluePaper Groups.
    this.outline = this.makeBorder();

    // Create this.holes, the Group containing the hexagonal holes that will
    // go into bluePaper.
    this.holes = new Group();
    (this.getLayerByStrokeColor(new Color(holesColor))).forEach((hole) => this.holes.addChild(hole));

    // Create this.engravings, the Group containing the Items to be engraved. 
    // The pieces to use all have a stroke color of engravesColor. Subtract 
    // the portions that would be in a hole. Make them fills with no stroke 
    // so they engrave.
    this.engravings = new Group();
    this.getLayerByStrokeColor(new Color(engravesColor)).forEach((path) => {
      let engrave = PaperOffset.offsetStroke(path, path.strokeWidth / 2);
      engrave.fillColor = engravesColor;
      engrave.strokeColor = null;
      this.holes.children.forEach((hole) => {
        engrave = engrave.subtract(hole);
      });
      this.engravings.addChild(engrave);
    });

    let lines = [];
    // Using the mainStrokes as a base, create their expansions in lines[]
    let arr = this.getLayerByStrokeColor(new Color(mainStrokesColor));
    arr.forEach((item) => {
      item.scale(2, this.pos);
      let newLine = PaperOffset.offsetStroke(item, item.strokeWidth, {
        cap: "round",
      });
      newLine.fillColor = "yellow";
      lines.push(newLine);
      item.remove();
    });

    // Using the mainStrokes2 as a base, create their expansions, then put
    // slightly larger circles at the ends of each line, pushing everything 
    // onto lines as we go
    arr = this.getLayerByStrokeColor(new Color(mainStrokes2Color));
    arr.forEach((item) => {
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

    // Put a copy of the union of everything in lines into finalItem
    let finalItem = new Path();
    lines.forEach((item) => {
      let tmp = item.unite(finalItem);
      item.remove();
      finalItem.remove();
      finalItem = tmp;
    });
    finalItem.fillColor = "orange";

    // Punch finalItem out of cutline, which at this point is 
    // 20 units bigger than the bounding curve around the
    // stuff ginned up in buildUp().
    let tmpcut = cutline.subtract(finalItem);
    finalItem.remove();
    cutline.remove();
    this.cutline = tmpcut;

    this.lineGroup.remove();

    // Create bluePaper. Add the overall outline and the hanger hole. Then add
    // the holes in the hexagons.
    this.bluePaper = new CompoundPath();
    this.bluePaper.fillRule = "evenodd";
    this.bluePaper.addChild(this.outline.children[0].clone());
    this.bluePaper.addChild(this.outline.children[1].clone());
    this.bluePaper.addChildren(this.holes.children);
    this.bluePaper.fillColor = bluepaperColor;
    this.bluePaper.shadowColor = new Color(0, 0, 0);
    this.bluePaper.shadowBlur = 4;
    this.bluePaper.shadowOffset = new Point(2, 2);
    this.bluePaper.sendToBack();
    // The stuff that's to be engraved on the blue paper is already in this.engravings

    // Create whitePaper. Add the overall outline and the hanger hole.
    // Then add cutline, as modified above and then get rid of any stray
    // free-floating "islands" that may have formed 
    this.whitePaper = new CompoundPath();
    this.whitePaper.fillRule = "evenodd";
    this.whitePaper.addChildren(this.outline.children);
    this.whitePaper.addChild(this.cutline);
    this.whitePaper.fillColor = mainStrokesColor;
    this.whitePaper.shadowColor = new Color(0, 0, 0);
    this.whitePaper.shadowBlur = 4;
    this.whitePaper.shadowOffset = new Point(2, 2);

    this.clearIslands(this.whitePaper);
  }

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

  clamp(value, min, max) {
    if (value < min) {
      return min;
    } else if (value > max) {
      return max;
    }
    return value;
  }

  //min and max are included
  randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(this.rand() * (max - min + 1)) + min;
  }

  // Switch whitePaper and bluePaper back and forth between the representation 
  // for the display and the laser cutter svg.
  toggleMode() {
    if (this.whitePaper.fillColor) {  // Display --> Laser
      this.whitePaper.strokeColor = laserCutColor1;
      this.whitePaper.fillColor = null;
      this.bluePaper.strokeColor = laserCutColor2;
      this.bluePaper.fillColor = null;

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

      this.whitePaper.shadowColor = new Color(0, 0, 0);
      this.whitePaper.shadowBlur = 4;
      this.whitePaper.shadowOffset = new Point(2, 2);
      this.whitePaper.position.x = this.bluePaper.position.x;
      this.bluePaper.shadowColor = new Color(0, 0, 0);
      this.bluePaper.shadowBlur = 4;
      this.bluePaper.shadowOffset = new Point(2, 2);
    }
  }
}
