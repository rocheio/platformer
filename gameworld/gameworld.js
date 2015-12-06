MINIMUM_CANVAS_WIDTH = 0;
MINIMUM_CANVAS_HEIGHT = 0;

/** Called on screen resize. Hide the game canvas HTML element
	if the screen is too small to display it. */
function check_display_canvas() {
	if (window.innerWidth < MINIMUM_CANVAS_WIDTH) {
		document.getElementById("canvas").style.visibility = "hidden";
		document.getElementById("canvas").height = 0;
		document.getElementById("canvas").width = 0;
		document.getElementById("canvas-message").style.visibility = "visible";
	} else {
		document.getElementById("canvas").style.visibility = "visible";
		document.getElementById("canvas").height = MINIMUM_CANVAS_HEIGHT;
		document.getElementById("canvas").width = MINIMUM_CANVAS_WIDTH;
		document.getElementById("canvas-message").style.visibility = "hidden";
	}
}

/** Adding HH:MM:SS formatting method to Numbers **/
Number.prototype.toHHMMSS = function () {
    var hours = Math.floor(this / 3600);
    var minutes = Math.floor(this % 3600 / 60);
    var seconds = (this % 3600 % 60).toFixed(1);

    if (minutes != 0) {
    	if (seconds < 10) {
    		seconds = "0"+seconds;
    	}
    	var time = minutes + ":" + seconds;
    } else {
    	var time = seconds;
    }

    if (hours != 0) {
    	time = hours+":"+time;
    }

    return time;
}

/** Represents an HTML canvas on which a game is being played. */
function GameCanvas(width, height, groundLevel) {
	var self = this;

	this.canvas = document.createElement("canvas");
	this.canvasWidth = width;
	MINIMUM_CANVAS_WIDTH = this.canvasWidth;
	this.canvasHeight = height;
	MINIMUM_CANVAS_HEIGHT = this.canvasHeight;
	this.groundLevel = groundLevel || 0;
	this.groundOffset = this.canvasHeight - this.groundLevel;

	/** Creates a base game canvas and attaches it to the DOM. */
	this.add_to_DOM = function(element) {
		this.canvas.style.visibility = "hidden";
		this.canvas.setAttribute("width", this.canvasWidth);
		this.canvas.setAttribute("height", this.canvasHeight);
		this.canvas.setAttribute("id", "canvas");
		this.canvas.setAttribute("class", "canvas");
		element.appendChild(this.canvas);
		
		if (typeof G_vmlCanvasManager != "undefined") {
			this.canvas = G_vmlCanvasManager.initElement(this.canvas);
		}
		this.context = document.getElementById("canvas").getContext("2d");
	}

	this.levelOrder = [];
	this.levelDict = {};
	this.currentLevelName = "";

	/** Add a new level to this gameCanvas. */
	this.add_level = function(levelName, levelJSON) {
		var newLevel = new GameLevel(this, levelJSON);
		this.levelOrder.push(levelName);
		this.levelDict[levelName] = newLevel;
	}

	/** Change the level to the next in sequence, or the
		first if currently on the last level. */
	this.complete_level = function() {
		this.currentLevel.clear_intervals();

		var levelName = this.currentLevelName;
		var levelIndex = this.levelOrder.indexOf(levelName);

		if (levelIndex+1 === this.levelOrder.length) {
			this.win_game();
		} else {
			var nextLevel = this.levelOrder[levelIndex+1];
			this.change_level(nextLevel);
		}
	}

	this.partyInterval = {};

	/** Beat the final level, display a win screen, and 
		restart the game. **/
	this.win_game = function() {
		clearInterval(this.timerInterval);
		this.keyBindings.unbind_all();

		this.partyInterval = setInterval(function(){
			self.characters.forEach(function(character) {
				character.attempt_jump();
			});
		}, 1000);

		setTimeout(this.start_new_game.bind(this), 3800);
	}

	this.start_new_game = function() {
		clearInterval(this.partyInterval);
		this.change_level(this.levelOrder[0]);
		this.add_timer();
		this.reset_game_timer();
	}

	this.reset_game = function() {
		this.change_level(this.levelOrder[0]);
		this.timePlayed = 0.0;
		clearInterval(this.timerInterval);
		this.add_timer();
	}

	this.timePlayed = 0.0;
	this.bestTime = 0.0;
	this.displayCurrentTime = false;
	this.displayBestTime = false;
	
	/** Add the timer to this canvas. */
	this.add_timer = function() {
		this.displayCurrentTime = true;
		this.displayBestTime = true;

		// Start interval to track frames per second
		this.timerInterval = setInterval(this.update_timer.bind(this), 100);
	}
	
	/** Update the timer for this game world. */
	this.update_timer = function() {
		if (!this.isPaused) {
			this.timePlayed += 0.1;
		}
	}
	
	/** Reset the game timer and recalc the best time recorded. */
	this.reset_game_timer = function() {
		if (this.timePlayed < this.bestTime
				|| this.bestTime == 0.0) {
			this.bestTime = this.timePlayed;
		}
		this.timePlayed = 0.0;
	}

	/** Advance the game to the next level in sequence. **/
	this.change_level = function(levelName) {
		this.currentLevelName = levelName;
		this.currentLevel = this.levelDict[levelName];
		this.reset_level_assets();
		this.load_level_assets();
	}

	// Playtime object arrays
	this.platformAreas = [];
	this.wallAreas = [];
	this.characters = [];

	/** Remove level assets from the gameWorld. */
	this.reset_level_assets = function() {
		this.currentLevel.objects.length = 0;
		this.platformAreas.length = 0;
		this.wallAreas.length = 0;
		this.characters.length = 0;
	}

	/** Load current level settings to the canvas. */
	this.load_level_assets = function() {
		this.load_default_boundaries();

		this.currentLevel.add_boxes(this.currentLevel.levelJSON["boxes"]);
		this.currentLevel.add_platforms(this.currentLevel.levelJSON["platforms"]);
		this.currentLevel.add_walls(this.currentLevel.levelJSON["walls"]);
		this.currentLevel.add_npcs(this.currentLevel.levelJSON["NPCs"]);

		this.load_level_images();
		this.spawn_player();
	}

	/** Add two walls and two platforms to the canvas
		to form boundaries at the edges. */
	this.load_default_boundaries = function() {
		var level = this.currentLevel;
		level.add_wall(0, 0, this.canvasHeight);
		level.add_wall(this.canvasWidth, 0, this.canvasHeight);
		level.add_platform(0, this.canvasWidth, this.canvasHeight);
		level.add_platform(0, this.canvasWidth, 0, true);
	}

	this.images = {};

	/** Load the images needed for this character to 
		the parent gameCanvas. */
	this.load_level_images = function() {
		this.characters.forEach(function(character){
			character.images.forEach(function(image){
				self.load_image(image.imageID, image.imageLocation);
			});
		});
	}

	/** Load an image to HTML from the /images/ folder. 
		Begin the animations for that image. */
	this.load_image = function(name, location) {
		if (!(name in this.images)) {
			this.images[name] = new Image();
			this.images[name].onload = this.resource_loaded();
			this.images[name].src = "images/" + location;
		}
	}

	this.imagesLoaded = 0;
	this.startDrawingLimit = 9;

	/** Add resource to total number on page and draw_canvas_frame. 
		Needs the gameCanvas as a parameter since it is called 
		from an image element onload(). */
	this.resource_loaded = function() {
		this.imagesLoaded += 1;
		if (this.imagesLoaded === this.startDrawingLimit) {
			this.drawInterval = setInterval(this.attempt_draw_frame.bind(this),
											1000/this.canvasFPS);
		}
	}

	/** Attempt to draw the next frame of the canvas. */
	this.attempt_draw_frame = function() {
		if (!this.isPaused) {
			this.draw_canvas_frame();
			this.framesDrawn += 1;
		}
	}

	this.keyBindings = {};

	/** Spawn a new player character to the canvas. */
	this.spawn_player = function() {
		var xSpawn = this.currentLevel.levelJSON.xSpawn;
		var ySpawn = this.currentLevel.levelJSON.ySpawn;
		var player1 = this.currentLevel.add_npc(xSpawn, ySpawn);
		this.keyBindings = new KeyBindings(player1);
		this.keyBindings.bind_defaults();
	}

	/** Draw a single frame of the canvas using every
		game element currently viewable. */
	this.draw_canvas_frame = function() {
		this.clear_canvas();
		this.context.font = "12px sans-serif";

		if (this.displayFPS) {
			this.draw_fps();
		}

		if (this.displayCurrentTime) {
			this.draw_current_time();
		}

		if (this.bestTime !== 0.0) {
			this.draw_best_time();
		}

		if (this.displayLevelName) {
			this.draw_level_name();
		}

		this.currentLevel.objects.forEach(function(object) {
			object.draw();
		});

		this.characters.forEach(function(character) {
			character.draw();
		});
	}

	/** Clear the canvas before drawing another frame. */
	this.clear_canvas = function() {
		this.canvas.width = this.canvas.width;		
	}

	// Gravity properties
	this.gravityRate = 15;
	this.gravityAmount = 3;
	this.gravityInterval = setInterval(function(){
		self.tick_gravity();
	}, this.gravityRate);

	/** Reduce each character's yPosition until it
		reaches the ground or a solid object. */
	this.tick_gravity = function() {
		self.characters.forEach(function(character){
			if (!character.is_at_yfloor()
					&& !character.isJumping) {
				character.yPosition -= self.gravityAmount;

				if (!character.isAirborne) {
					character.become_airborne();
				}
			}
		});
	}

	this.displayFPS = false;
	this.canvasFPS = 30;
	this.currentFPS = 0;
	this.framesDrawn = 0;
	
	/** Start a tracker for average frames per second. */
	this.add_fps = function() {
		this.displayFPS = true;
		this.fpsInterval = setInterval(this.update_fps.bind(this), 1000);
	}
	
	/** Update the fps for this canvas. */
	this.update_fps = function() {
		this.currentFPS = this.framesDrawn;
		this.framesDrawn = 0;
	}

	this.displayLevelName = false;

	/** Draw level name in top left of window. */
	this.draw_level_name = function() {
		var levelName = this.currentLevel.levelJSON['name'];
		var previousFont = this.context.font;
		this.context.font = "bold 16px sans-serif";
		this.context.fillText(levelName, 3, this.canvasHeight-20);
		this.context.font = previousFont;
	}

	/** Create fps monitor in bottom left of screen */
	this.draw_fps = function() {
		fpsText = ("FPS: " + this.currentFPS + "/" + this.canvasFPS
					+ " (" + this.framesDrawn + ")");
		this.context.fillText(fpsText, 3, this.canvasHeight-5);
	}

	/** Draw the current playtime of this character. */
	this.draw_current_time = function() {
		var timerText = this.timePlayed.toHHMMSS();
		var previousFont = this.context.font;
		this.context.font = "bold 32px sans-serif";
		this.context.textAlign = 'end';
		this.context.fillText(timerText, this.canvasWidth-10, 30);
		this.context.font = previousFont;
		this.context.textAlign = 'start';
	}

	/** Draw the best playtime of this character. */
	this.draw_best_time = function() {
		var timerText = "Best Time: " + this.bestTime.toHHMMSS();
		this.context.fillText(timerText, 100, this.canvasHeight-5);
	}

	this.isPaused = false;
	
	/** Pause all motion on this GameCanvas. */
	this.pause = function() {
		this.isPaused = true;
		clearInterval(this.gravityInterval);
	}
	
	/** Restore all motion on this GameCanvas. */
	this.unpause = function() {
		this.isPaused = false;
		this.gravityInterval = setInterval(this.tick_gravity.bind(this), 
										   this.gravityRate);
	}
}


/** Represents a level of the game. */
function GameLevel(gameCanvas, levelJSON) {
	var self = this;

	this.gameCanvas = gameCanvas;
	this.levelJSON = levelJSON;
	this.intervals = [];
	this.objects = [];

	/** Clear all intervals associated with objects in this level. */
	this.clear_intervals = function() {
		this.intervals.forEach(function(interval){
			clearInterval(interval);
		});
	}

	/** Add a box object to the gameCanvas. */
	this.add_box = function (xLeft, xRight, yBottom, yHeight, isFatal, isEndpoint) {
		var isFatal = isFatal || false;
		var isEndpoint = isEndpoint || false;
		var yTop = yBottom + yHeight;

		this.add_platform(xLeft, xRight, yTop, isFatal, isEndpoint);
		this.add_platform(xLeft, xRight, yBottom);
		this.add_wall(xLeft, yBottom, yHeight);
		this.add_wall(xRight, yBottom, yHeight);
	}

	/** Add a list of box objects from JSON to this level. */
	this.add_boxes = function (boxArgs) {
		var boxArgs = boxArgs || [];
		boxArgs.forEach(function (box){
			self.add_box(box.xLeft, box.xRight, box.yBottom,
					 	 box.yHeight, box.isFatal, box.isEndpoint);
		});
	}

	/** Add a platform object to the gameCanvas. */
	this.add_platform = function (xLeft, xRight, yBottom, isFatal, isEndpoint) {
		var isFatal = isFatal || false;
		var isEndpoint = isEndpoint || false;
		var newPlatform = new CanvasLine(this.gameCanvas, xLeft, yBottom, 
									 	 xRight, yBottom, isFatal, isEndpoint);
		this.objects.push(newPlatform);
		this.gameCanvas.platformAreas.push([xLeft, xRight, yBottom]);
	}

	/** Add a list of platform objects from JSON to this level. */
	this.add_platforms = function (platformArgs) {
		var platformArgs = platformArgs || [];
		platformArgs.forEach(function (plat){
			self.add_platform(plat.xLeft, plat.xRight, plat.yBottom, 
							  plat.isFatal, plat.isEndpoint);
		});
	}

	/** Add a wall object to the gameCanvas. */
	this.add_wall = function (xPosition, yBottom, yHeight) {
		var newWall = new CanvasLine(this.gameCanvas, xPosition, yBottom, 
									 xPosition, yBottom+yHeight);
		this.objects.push(newWall);
		this.gameCanvas.wallAreas.push([xPosition, yBottom, yHeight]);
	}

	/** Add a list of wall objects from JSON to this level. */
	this.add_walls = function (wallArgs) {
		var wallArgs = wallArgs || [];
		wallArgs.forEach(function (wall){
			self.add_wall(wall.xPosition, wall.yBottom, wall.yHeight);
		});
	}

	/** Add a new character to this gameCanvas. */
	this.add_npc = function (xPosition, yPosition) {
		var newNPC = new GameCharacter(this.gameCanvas, xPosition, yPosition);
		this.gameCanvas.characters.push(newNPC);
		return newNPC;
	}

	/** Add a list of npc objects from JSON to this level. */
	this.add_npcs = function (npcArgs) {
		var npcArgs = npcArgs || [];
		npcArgs.forEach(function (npc){
			self.add_npc(npc.xPosition, npc.yPosition);
		});
	}
}


/** Represents a line on the game canvas. */
function CanvasLine(gameCanvas, xStart, yStart, xEnd, yEnd, isFatal, isEndpoint) {
	var self = this;

	this.gameCanvas = gameCanvas;
	this.xStart = xStart;
	this.yStart = yStart;
	this.xEnd = xEnd;
	this.yEnd = yEnd;
	this.isFatal = isFatal || false;
	this.isEndpoint = isEndpoint || false;
	this.tickRate = 500;

	/** Draw this line on the canvas. */
	this.draw = function () {
		var yStartFixed = this.gameCanvas.groundOffset - this.yStart;
		var yEndFixed = this.gameCanvas.groundOffset - this.yEnd;

		// Draw the wall on the canvas
		var context = this.gameCanvas.context;
		context.beginPath();
		context.moveTo(this.xStart, yStartFixed);
		context.lineTo(this.xEnd, yEndFixed);
		context.stroke();
		context.closePath();
	}

	if (this.isFatal) {
		var level = this.gameCanvas.currentLevel;
		level.intervals.push(setInterval(function(){
			self.tick_check_fatalities();
		}, this.tickRate));
	}

	/** Check if each active character in the gameWorld is on this 
		line, and if it is, kill and respawn it. */
	this.tick_check_fatalities = function() {
		this.gameCanvas.characters.forEach(function(character){
			if (character.is_on_line(self)) {
				character.respawn();
			}
		});
	}

	if (this.isEndpoint) {
		var level = this.gameCanvas.currentLevel;
		level.intervals.push(setInterval(function(){
			self.tick_check_endpoints();
		}, this.tickRate));
	}

	/** Check if each active character in the gameWorld is on this 
		line, and if it is, teleport it to the next level. */
	this.tick_check_endpoints = function() {
		this.gameCanvas.characters.forEach(function (character){
			if (character.is_on_line(self)) {
				self.gameCanvas.complete_level();
			}
		});
	}
}


/** Represents an in-game character. */
function GameCharacter(gameCanvas, xPosition, yPosition) {
	var self = this;

	// Related objects
	this.gameCanvas = gameCanvas;

	// Character states
	this.isFacingLeft = false;
	this.isPlanningMovement = false;
	this.isWalking = false;
	this.isRunning = false;
	this.isAirborne = false;
	this.isJumping = false;

	// Positional properties
	this.xPosition = xPosition || 100;
	this.yPosition = yPosition || 0;
	this.yFloor = 0;
	this.yCeiling = this.gameCanvas.canvasHeight;

	// Collision properties
	this.xCollisionRadius = 60;
	this.yCollisionHeight = 120;

	/** Return true if this character is colliding with a wall. */
	this.is_colliding = function() {
		// Recalculate characters collision box based on direction
		if (this.isFacingLeft) {
			var xLeft = this.xPosition - this.xCollisionRadius;
			var xRight = this.xPosition;
		} else {
			var xLeft = this.xPosition;
			var xRight = this.xPosition + this.xCollisionRadius;
		}

		// Check every wall in the character's game world
		wallAreas = this.gameCanvas.wallAreas;
		for (var ii=0; ii<wallAreas.length; ii++) {
			if (this.check_wall_area(wallAreas[ii], xLeft, xRight)) {
				return true;
			}
		}

		return false;
	}

	/** Return true if this wallArea is within character's collison
		box, and within its top and bottom vertical position. */
	this.check_wall_area = function (wallArea, charXLeft, charXRight) {
		var wallX = wallArea[0];
		var wallBottomY = wallArea[1];
		var wallTopY = wallArea[1] + wallArea[2];
		var yMax = this.yPosition + this.yCollisionHeight;

		if (charXLeft <= wallX
				&& charXRight >= wallX
				&& yMax >= wallBottomY
				&& this.yPosition < wallTopY) {
			return true;
		}
	}

	/** Return true if this character is on a platform
		or would be the next time gravity ticks. */
	this.is_at_yfloor = function() {
		this.find_yfloor();

		var nextYPosition = this.yPosition - this.gameCanvas.gravityAmount;

		if (nextYPosition <= this.yFloor) {
			this.yPosition = this.yFloor;
			return true;
		} else {
			return false;
		}
	}

	/** Find the highest object below the character and set its
		floor so that it does not fall below it. */
	this.find_yfloor = function() {
		var newYFloor = 0;
		this.gameCanvas.platformAreas.forEach(function (area){
			if (self.check_floor_area(area, newYFloor)) {
				newYFloor = area[2];
			}
		});
		this.yFloor = newYFloor;
	}

	/** Return true if this floorArea is within character's horizontal
		range, the character is above the platform, and the platform
		is above the previous highest valid platform. */
	this.check_floor_area = function (floorArea, newYFloor) {
		var platformStartX = floorArea[0];
		var platformEndX = floorArea[1];
		var platformY = floorArea[2];

		if (this.yPosition >= platformY
				&& this.xPosition >= platformStartX
				&& this.xPosition <= platformEndX
				&& platformY > newYFloor) {
			return true;
		}

		return false;
	}

	/** Return true if this character is on a line. */
	this.is_on_line = function (canvasLine) {
		if (this.yPosition === canvasLine.yStart
				&& this.xPosition >= canvasLine.xStart
				&& this.xPosition <= canvasLine.xEnd) {
			return true;
		} else {
			return false;
		}
	}

	/** Movement properties */
	this.stepSize = 12;
	this.stepsPerSecond = 30;
	this.stopMovementDelay = 100;
	this.jumpHeight = 50;
	this.runMultiplier = 1.5;
	this.stopRunningDelay = 500;

	/** Breathing properties */
	this.breathDirection = 1;
	this.breathInc = 0.1;
	this.currentBreath = 0;
	this.breathMax = 2;
	this.breathInterval = setInterval(function(){
		self.update_breath();
	}, 1000/this.gameCanvas.canvasFPS);

	/** Blinking properties */
	this.maxEyeHeight = 10;
	this.curEyeHeight = this.maxEyeHeight;
	this.eyeOpenTime = 0;
	this.timeBtwBlinks = 4000;
	this.blinkUpdateTime = 200;
	this.blinkInterval = setInterval(function(){
		self.update_blink();
	}, this.blinkUpdateTime);

	// Default character images
	this.images = SOLDIER.images;

	/** Draw a single frame of this character on the canvas. */
	this.draw = function() {
		var xPosAdjusted = this.xPosition;
		var yPosAdjusted = (this.gameCanvas.groundOffset
						    - this.yPosition);

	 	// Draw the character in a reverse position if facing left
	 	if (this.isFacingLeft) {
	 		this.gameCanvas.context.scale(-1, 1);
	 		xPosAdjusted *= -1;
 		}

		// Set the character's images to draw
		var imagesToDraw = [];

		if (this.isAirborne) {
			imagesToDraw.push(this.images[8]);
			imagesToDraw.push(this.images[4]);
		} else {
			imagesToDraw.push(this.images[7]);
			imagesToDraw.push(this.images[3]);
		}

		imagesToDraw.push(this.images[2]);
		imagesToDraw.push(this.images[1]);
		imagesToDraw.push(this.images[0]);

		if (this.isAirborne) {
			imagesToDraw.push(this.images[6]);
		} else {
			imagesToDraw.push(this.images[5]);
		}

		// Draw each part of the character
 		this.draw_shadow(xPosAdjusted);

 		imagesToDraw.forEach(function(image){
 			self.draw_image(image, xPosAdjusted, yPosAdjusted);
 		});

 		this.draw_eyes(xPosAdjusted, yPosAdjusted);

	 	// Flip the canvas back around after drawing
	 	if (this.isFacingLeft) {
	 		this.gameCanvas.context.scale(-1, 1);
 		}
	}

	/** Draw a single image based on imageArgs, etc. */
	this.draw_image = function(imageArgs, xPos, yPos) {
		var breathOffset = 0;
 		if (imageArgs["hasBreathing"]) {
 			breathOffset = this.currentBreath;
 		}

		var imageToDraw = this.gameCanvas.images[imageArgs["imageID"]];
 		var drawWidth = xPos + imageArgs["xOffset"];
		var drawHeight = yPos - imageArgs["yOffset"] - breathOffset;
 		this.gameCanvas.context.drawImage(imageToDraw, drawWidth, drawHeight);
	}

	/** Draw the character"s shadow for the current frame. */
	this.draw_shadow = function(centerX) {
		var centerY = this.gameCanvas.groundOffset - this.yFloor;
		var shadowWidth = (100 - this.currentBreath
						   - (this.yPosition - this.yFloor) * 0.8);
		if (shadowWidth > 0) {
			this.draw_ellipse(centerX+5, centerY, shadowWidth, 4);
		}
	}

	/** Draw the character"s eyes for the current frame. */
	this.draw_eyes = function(xPos, yPos) {
	 	var eyeHeight = yPos - 88 - this.currentBreath;
		this.draw_ellipse(xPos+6, eyeHeight, 6, this.curEyeHeight);
		this.draw_ellipse(xPos+16, eyeHeight, 6, this.curEyeHeight);
	}

	/** Draw an ellipse on the canvas. */
	this.draw_ellipse = function(centerX, centerY, width, height, color) {
	 	var context = this.gameCanvas.context;

		// Calculate coordinates for drawing curves
		var leftX = centerX - width/2;
		var rightX = centerX + width/2;
		var topY = centerY - height/2;
		var bottomY = centerY + height/2;

		// Draw the left and right curves of the ellipse
		context.beginPath();
		context.moveTo(centerX, topY);
		context.bezierCurveTo(rightX, topY, rightX, bottomY, centerX, bottomY);
		context.bezierCurveTo(leftX, bottomY, leftX, topY, centerX, topY);

		// Fill the ellipse with color
		context.fillStyle = color || "black";
		context.fill();

		context.closePath();
	}

	/** Determine whether the character should breathe in or out next. */
	this.update_breath = function() {
		if (this.breathDirection === 1) {
			// Breath in (character rises)
			this.currentBreath -= this.breathInc;
			if (this.currentBreath < -this.breathMax) {
				this.breathDirection = -1;
			}
		} else { 
			// Breath out (character falls)
			this.currentBreath += this.breathInc;
			if(this.currentBreath > this.breathMax) {
				this.breathDirection = 1;
			}
		}
	}

	/** Determine whether the character should blink next. */
	this.update_blink = function() {
		this.eyeOpenTime += this.blinkUpdateTime;

		if (this.eyeOpenTime >= this.timeBtwBlinks) {
			this.animate_blink();
		}
	}

	/** Make the character blink over a few frames. */
	this.animate_blink = function() {
		this.curEyeHeight -= 1;
		if (this.curEyeHeight <= 0) {
			this.eyeOpenTime = 0;
			this.curEyeHeight = this.maxEyeHeight;
		} else {
			this.blinkTimeout = setTimeout(this.animate_blink.bind(this), 10);
		}
	}

	/** Make the character jump as much as it is able. */
	this.attempt_jump = function() {
		if (!this.isAirborne) {
			this.isJumping = true;
			var maxHeight = this.yPosition + this.jumpHeight;
			var jumpIncrement = this.jumpHeight / 12;

			this.jumpUpInterval = setInterval(function(){
				self.ascend(maxHeight, jumpIncrement);
			}, this.gameCanvas.gravityRate);

			this.become_airborne();
		}
	}

	/** Make the character ascend upward. */
	this.ascend = function(maxHeight, jumpIncrement) {
		if (!this.gameCanvas.isPaused) {
			if (this.yPosition < maxHeight) {
				this.yPosition += jumpIncrement;
			} else {
				clearInterval(this.jumpUpInterval);
				this.isJumping = false;
			}
		}
	}

	/** Set the character to an airborne state so it falls
		correctly and has the appropriate graphics. */
	this.become_airborne = function() {
		this.isAirborne = true;
		this.landInterval = setInterval(this.attempt_land.bind(this), 50);
	}

	/** Land after hanging in the air from falling or jumping. */
	this.attempt_land = function() {
		if (this.is_at_yfloor()) {
			this.isAirborne = false;
			clearInterval(this.landInterval);
			if (!this.isPlanningMovement) {
				this.begin_movement_stop();
			}
		}
	}

	/** Attempt to stop all movement, unless further
		user input is received. */
	this.begin_movement_stop = function() {
		this.isPlanningMovement = false;

		// Allow time for new input to be entered
		this.stopMoveTimeout = setTimeout(this.attempt_stop.bind(this), 
										  this.stopMovementDelay);
	}

	/** Stop movement of this character unless it plans further moves. */
	this.attempt_stop = function() {
		if (!this.isPlanningMovement 
				&& !this.isAirborne) {
			this.stop_moving();
		}
	}

	/** Stop all movement. */
	this.stop_moving = function() {
		clearInterval(this.stepInterval);
		this.isWalking = false;
		this.isRunning = false;
	}

	/** Make the character walk forward until given a stop command. */
	this.start_walking = function() {
    	clearTimeout(this.stopMoveTimeout);
		if (!this.is_colliding()) {
			this.attempt_step();
			if (this.isWalking) {
				clearInterval(this.stepInterval);
				this.stepInterval = setInterval(this.attempt_step.bind(this), 
												1000/this.stepsPerSecond);
			}
		}
	}

	/** If not colliding with an object, step in the direction 
		the character is facing. */
	this.attempt_step = function() {
		if (!this.is_colliding()) {
			var stepAmount = this.stepSize;
			if (this.isFacingLeft) {
				stepAmount *= -1;
			}
			if (this.isRunning) {
				stepAmount *= this.runMultiplier;
			}
			if (!this.gameCanvas.isPaused) {
				this.xPosition += stepAmount;
			}
		}
	}

	/** Make the character start running. */
	this.start_running = function() {
		if (!this.isRunning) {
			this.isRunning = true;
			this.runTimeout = setTimeout(this.stop_running.bind(this),
										 this.stopRunningDelay);
		}
	}

	/** Stop running. */
	this.stop_running = function() {
		this.isRunning = false;
	}

	// Respawn properties
	this.xSpawn = this.xPosition;
	this.ySpawn = this.yPosition;

	/** Respawn the character. */
	this.respawn = function() {
		this.xPosition = this.xSpawn;
		this.yPosition = this.ySpawn;
		this.isFacingLeft = false;
		this.isAirborne = false;
		this.stop_moving();
	}
}


/** Represents key bindings for a character. */
function KeyBindings(character) {
	this.character = character;

	this.bind_defaults = function() {
		var character = this.character;

		// Bind keys for moving left
	    Mousetrap.bind(["a", "left"], function() { 
			character.isPlanningMovement = true;
	    	character.isFacingLeft = true;
			character.isWalking = true;
	        character.start_walking();
	        //console.log("left");
	    });
	    Mousetrap.bind(["a", "left"], function() {
			if (character.isFacingLeft) {
				character.begin_movement_stop();
			}
	        //console.log("left_up");
	    }, "keyup");

	    // Bind keys for moving right
	    Mousetrap.bind(["d", "right"], function() {
			character.isPlanningMovement = true;
	    	character.isFacingLeft = false;
			character.isWalking = true;
	        character.start_walking();
	        //console.log("right");
	    });
	    Mousetrap.bind(["d", "right"], function() {
			if (!character.isFacingLeft) {
				character.begin_movement_stop();
			}
	        //console.log("right_up");
	    }, "keyup");

	    // Bind keys for jumping
	    Mousetrap.bind(["w", "up", "space"], function(e) {
	    	// Remove default behavior of buttons (page scrolling)
	    	if (e.preventDefault()) {
	    		e.preventDefault();
	    	} else {
	    		e.returnValue = false; //IE
	    	}
	        character.attempt_jump();
	    });

	    // Bind keys for crouching
	    Mousetrap.bind(["s", "down"], function(e) {
	    	// Remove default behavior of buttons (page scrolling)
	    	if (e.preventDefault()) {
	    		e.preventDefault();
	    	} else {
	    		e.returnValue = false; //IE
	    	}
	        //character.start_crouching();
	        character.stop_moving();
	    });

	    // Bind key for running
	    Mousetrap.bind(["q", "capslock"], function() { 
	        character.start_running();
	    });

	    // Bind key for respawning
	    Mousetrap.bind("c", function() { 
	        character.respawn();
	    });

	    // Bind key for pausing
	    Mousetrap.bind("z", function() {
	    	var canvas = character.gameCanvas;
	    	if (canvas.isPaused) {
	    		canvas.unpause();
	    	} else {
	    		canvas.pause();
	    	}
	    });

	    // Bind key for restarting the game
	    Mousetrap.bind("x", function() { 
	        character.gameCanvas.reset_game();
	    });
	}

	this.unbind_all = function() {
		Mousetrap.unbind(["a", "left", "d", "right", "w", "up", "space",
						  "s", "down", "q", "c", "z", "x", "capslock"]);
	}
}


window.onload = function () {
	var game = new GameCanvas(width=900, height=600, groundLevel=38);

	game.add_to_DOM(document.getElementById("canvas-div"));
	game.add_fps();
	game.add_timer();
	game.displayLevelName = true;
	check_display_canvas();

	LEVELS.forEach(function (level) {
		game.add_level(level.name, level);
	});

	game.change_level("Level 1");
}