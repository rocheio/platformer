/** Represents an HTML canvas on which a game is
	being played. */
function GameCanvas(width, height, groundLevel) {
	var thisCanvas = this;

	// Canvas properties
	this.canvas = document.createElement('canvas');
	this.canvasWidth = width || 800;
	this.canvasHeight = height || 600;

	// Frames per second properties
	this.canvasFPS = 30;
	this.currentFPS = 0;
	this.displayFPS = false;

	/** Creates the working game canvas for any browser. */
	this.prepare_canvas = function(canvasDiv) {
		// Create the canvas in a way that works with IE.
		this.canvas.setAttribute('width', this.canvasWidth);
		this.canvas.setAttribute('height', this.canvasHeight);
		this.canvas.setAttribute('id', 'canvas');
		this.canvas.setAttribute('class', 'canvas');
		canvasDiv.appendChild(this.canvas);
		
		if (typeof G_vmlCanvasManager != 'undefined') {
			this.canvas = G_vmlCanvasManager.initElement(this.canvas);
		}

		this.context = document.getElementById('canvas').getContext("2d");
	}

	// Parental properties
	this.characterList = [];
	this.platformList = [];
	this.wallList = [];
	this.platformAreas = [];
	this.wallAreas = [];

	// Physics properties
	this.groundLevel = groundLevel || 0;
	this.images = {};
	this.numResourcesLoaded = 0;
	this.startDrawingLimit = 9; //images loaded
	this.numFramesDrawn = 0;

	// Gravity properties
	this.gravityRate = 25;
	this.gravityAmount = 4;
	this.gravityInterval = setInterval(function(){
		thisCanvas.tick_gravity();
	}, this.gravityRate);

	/** Reduce each character's yPosition until it
		reaches the ground or a solid object. */
	this.tick_gravity = function() {
		for (ii = 0; ii < this.characterList.length; ii++) {
			thisChar = this.characterList[ii];

			// Find the highest object beneath this character
			thisChar.find_yfloor(this.platformAreas);

			// Do nothing if character is currently falling, 
			// on a platform, or at ground level
			if (thisChar.is_above_ground_level()
					&& !thisChar.is_at_yfloor()) {
				thisChar.yPosition -= this.gravityAmount;
				thisChar.start_falling();
			}
		}
	}

	/** Add a new character to this gameCanvas. */
	this.add_npc = function(xPosition, yPosition) {
		var xPosition = xPosition || 0;
		var yPosition = yPosition || 0;

		newNPC = new GameCharacter(this, xPosition, yPosition);
		newNPC.load_assets();
		this.characterList.push(newNPC);

		return newNPC;
	}

	/** Add a platform object to the gameCanvas. */
	this.add_platform = function(xStart, xEnd, yHeight) {
		newPlatform = new GamePlatform(this, xStart, xEnd, yHeight);
		this.platformList.push(newPlatform);
		this.platformAreas.push([newPlatform.xStart,
								 newPlatform.xEnd,
								 newPlatform.yHeight]);

		return newPlatform;
	}

	/** Add a wall object to the gameCanvas. */
	this.add_wall = function(xPosition, yBottom, yHeight) {
		newWall = new GameWall(this, xPosition, yBottom, yHeight);
		this.wallList.push(newWall);
		this.wallAreas.push([newWall.xPosition,
							 newWall.yBottom,
							 newWall.yHeight]);

		return newWall;
	}

	/** Load an image to HTML from the /images/ folder. 
	Begin the animations for that image. */
	this.load_image = function(name, location) {
		if (!(name in this.images)) {
			this.images[name] = new Image();
			this.images[name].onload = this.resource_loaded();
			this.images[name].src = 'images/' + location;
		}
	}

	/** Add resource to total number on page and redraw_canvas. 
	Needs the gameCanvas as a parameter since it is called 
	from an image element onload(). */
	this.resource_loaded = function() {
		this.numResourcesLoaded += 1;

		if (this.numResourcesLoaded === this.startDrawingLimit) {
			this.canvasInterval = setInterval(function(){
				thisCanvas.redraw_canvas();
				thisCanvas.numFramesDrawn += 1;
			}, 1000/this.canvasFPS);
		}
	}

	/** Redraw all images on the canvas. */
	this.redraw_canvas = function() {
		// Clear the canvas
		this.canvas.width = this.canvas.width;

		// Create fps monitor in bottom left of screen
		this.context.font = "bold 12px sans-serif";
		if (this.displayFPS) {
			fpsText = ("fps: " + this.currentFPS + "/" + this.canvasFPS
						+ " (" + this.numFramesDrawn + ")");
			this.context.fillText(fpsText, 5, this.canvasHeight-5);
		}

		// Draw each character bound to this world
		for (ii = 0; ii < this.characterList.length; ii++) {
			characterToDraw = this.characterList[ii];
			characterToDraw.draw_character();
		}

		// Draw each platform bound to this world
		for (ii = 0; ii < this.platformList.length; ii++) {
			platformToDraw = this.platformList[ii];
			platformToDraw.draw_platform();
		}

		// Draw each wall bound to this world
		for (ii = 0; ii < this.wallList.length; ii++) {
			wallToDraw = this.wallList[ii];
			wallToDraw.draw_wall();
		}
	}
	
	/** Update the fps for this canvas. */
	this.update_fps = function() {
		this.currentFPS = this.numFramesDrawn;
		this.numFramesDrawn = 0;
	}
	
	/** Add the fps tracker to this canvas. */
	this.add_fps = function() {
		this.displayFPS = true;

		// Start interval to track frames per second
		this.fpsInterval = setInterval(function(){
			thisCanvas.update_fps();
		}, 1000);
	}
}



/** Represents an in-game platform. */
function GamePlatform(gameCanvas, xStart, xEnd, yHeight) {
	// Positional properties
	this.gameCanvas = gameCanvas
	this.xStart = xStart;
	this.xEnd = xEnd;
	this.yHeight = yHeight;

	/** Draw this platform on the canvas. */
	this.draw_platform = function() {
		// Get generic properties to gameWorld
		var gameCanvas = this.gameCanvas,
			canvasHeight = gameCanvas.canvasHeight,
		 	groundLevel = canvasHeight - gameCanvas.groundLevel;

	 	// Translate cartesian properties into gameCanvas
	 	platformHeight = groundLevel - this.yHeight;

		// Draw the platform on the canvas
		context = gameCanvas.context;
		context.beginPath();
		context.moveTo(this.xStart, platformHeight);
		context.lineTo(this.xEnd, platformHeight);
		context.stroke();
		context.closePath();
	}
}



/** Represents an in-game wall. */
function GameWall(gameCanvas, xPosition, yBottom, yHeight) {
	// Positional properties
	this.gameCanvas = gameCanvas;
	this.xPosition = xPosition;
	this.yBottom = yBottom;
	this.yHeight = yHeight;

	/** Draw this wall on the canvas. */
	this.draw_wall = function() {
		// Get generic properties to gameWorld
		var gameCanvas = this.gameCanvas,
			groundLevel = gameCanvas.canvasHeight - gameCanvas.groundLevel,
			yBottom = groundLevel + this.yBottom,
			yTop = groundLevel + this.yBottom - this.yHeight;

		// Draw the wall on the canvas
		context = gameCanvas.context;
		context.beginPath();
		context.moveTo(this.xPosition, yBottom);
		context.lineTo(this.xPosition, yTop);
		context.stroke();
		context.closePath();
	}
}



/** Represents an in-game character. */
function GameCharacter(gameCanvas, xPosition, yPosition) {
	var thisChar = this;

	// Positional properties
	this.gameCanvas = gameCanvas;
	this.xPosition = xPosition || 100;
	this.yPosition = yPosition || 0;
	this.yFloor = 0;

	// Collision properties
	this.xCollisionRadius = 70;
	this.yCollisionHeight = 120;

	/** Return true if this character is colliding with a wall. */
	this.is_colliding = function() {
		// Recalculate characters collision box based on direction
		if (this.isFacingLeft) {
			xCollisionLeft = this.xPosition - this.xCollisionRadius;
			xCollisionRight = this.xPosition;
		} else {
			xCollisionLeft = this.xPosition;
			xCollisionRight = this.xPosition + this.xCollisionRadius;
		}

		// Check every wall in the character's game world
		wallAreas = this.gameCanvas.wallAreas;
		for (jj = 0; jj < wallAreas.length; jj++) {
			wallArea = wallAreas[jj];
			wallXPosition = wallArea[0];
			wallBottomY = wallArea[1];
			wallTopY = wallArea[1] + wallArea[2];

			// Is this wall within the characters collision box?
			// and is the character vertically within the walls
			// top and bottom vertical position
			if (xCollisionLeft <= wallXPosition
					&& xCollisionRight >= wallXPosition
					&& this.yPosition >= wallBottomY
					&& this.yPosition < wallTopY) {
				return true;
			}
		}

		return false;
	}

	// Character Asset Lists
	this.characterImages = [];

	// Default images for now
	this.characterImages = [
		{
			'imageID': 'soldier-helmet',
			'imageLocation': 'soldier-helmet.png',
			'xOffset': -3,
			'yOffset': 122,
		}, {
			'imageID': 'head',
			'imageLocation': 'head.png',
			'xOffset': 3,
			'yOffset': 105,
		}, {
			'imageID': 'torso',
			'imageLocation': 'torso.png',
			'xOffset': 0,
			'yOffset': 80,
		}, {
			'imageID': 'legs',
			'imageLocation': 'legs.png',
			'xOffset': 0,
			'yOffset': 40,
		}, {
			'imageID': 'legs-jump',
			'imageLocation': 'legs-jump.png',
			'xOffset': 0,
			'yOffset': 40,
		}, {
			'imageID': 'front-arm',
			'imageLocation': 'front-arm.png',
			'xOffset': -5,
			'yOffset': 70,
		}, {
			'imageID': 'front-arm-jump',
			'imageLocation': 'front-arm-jump.png',
			'xOffset': -25,
			'yOffset': 75,
		}, {
			'imageID': 'back-arm',
			'imageLocation': 'back-arm.png',
			'xOffset': 30,
			'yOffset': 70,
		}, {
			'imageID': 'back-arm-jump',
			'imageLocation': 'back-arm-jump.png',
			'xOffset': 40,
			'yOffset': 75,
		}
	];

	// Character States
	this.isFacingLeft = false;
	this.isPlanningMovement = false;
	this.isWalking = false;
	this.isRunning = false;
	this.isAirborne = false;

	/** Return true if this character is above ground level. */
	this.is_above_ground_level = function() {
		if (this.yPosition > 0) {
			return true;
		} else {
			return false;
		}
	}

	/** Return true if this character is directly on a platform. */
	this.is_at_yfloor = function() {
		if (this.yPosition === this.yFloor) {
			return true;
		} else {
			return false;
		}
	}

	/** Find the highest object below the player and set its
		floor so that it does not fall below it. */
	this.find_yfloor = function(platformAreas) {
		var newYFloor = 0;

		// Check every platform in the character's game world
		for (jj = 0; jj < platformAreas.length; jj++) {
			platformArea = platformAreas[jj];
			platformStartX = platformArea[0];
			platformEndX = platformArea[1];
			platformY = platformArea[2];

			// Is this character above the current platform,
			// within its horizontal boundaries, and is the platform
			// above all other platforms the character above?
			if (this.yPosition >= platformY
					&& this.xPosition >= platformStartX
					&& this.xPosition <= platformEndX
					&& platformY > newYFloor) {
				newYFloor = platformY;
			}
		}

		this.yFloor = newYFloor;
	}

	// Movement properties
	this.stepSize = 12;
	this.stepsPerSecond = 30;
	this.millisBeforeMovementStop = 100;
	this.jumpHeight = 180;
	this.runMultiplier = 2;
	this.millisBeforeRunStop = 2000;

	/** Breathing properties */
	this.breathDirection = 1;
	this.breathInc = 0.1;
	this.currentBreath = 0;
	this.breathMax = 2;
	this.breathInterval = setInterval(function(){
		thisChar.update_breath();
	}, 1000/this.gameCanvas.canvasFPS);

	/** Blinking properties */
	this.maxEyeHeight = 10;
	this.curEyeHeight = this.maxEyeHeight;
	this.eyeOpenTime = 0;
	this.timeBtwBlinks = 4000;
	this.blinkUpdateTime = 200;
	this.blinkInterval = setInterval(function(){
		thisChar.update_blink();
	}, this.blinkUpdateTime);

	/** Load the images needed for this character to 
		the parent gameCanvas. */
	this.load_assets = function() {
		for (ii=0; ii<this.characterImages.length; ii++) {
			imageID = this.characterImages[ii].imageID;			
			imageLocation = this.characterImages[ii].imageLocation;
			gameCanvas.load_image(imageID, imageLocation);
		}
	}

	/** Draw this character on the canvas. */
	this.draw_character = function() {
		var gameCanvas = this.gameCanvas,
			canvasWidth = gameCanvas.canvasWidth,
			canvasHeight = gameCanvas.canvasHeight,
		 	groundLevel = canvasHeight - gameCanvas.groundLevel,
		 	characterImages = this.characterImages,
		 	xx = this.xPosition,
		 	breathOffset = this.currentBreath;

	 	// Draw the character in a left position if facing left
	 	if (this.isFacingLeft) {
	 		gameCanvas.context.scale(-1, 1);
	 		xx *= -1;
 		}

	 	// Set character y position relative to game world
	 	yy = groundLevel - this.yPosition;

		// Draw the character's shadow
		var shadowHeight = groundLevel - this.yFloor;
		var shadowWidth = 100 - (this.yPosition - this.yFloor) * 0.8;
		var shadowOffset = xx + 25;

		if (shadowWidth > 0) {
			if (this.isAirborne) {
				this.draw_ellipse(shadowOffset, shadowHeight, 
								  shadowWidth-breathOffset, 4);
			} else {
				this.draw_ellipse(shadowOffset, shadowHeight, 
					  			  shadowWidth-breathOffset, 6);
			}
		}

		// Set the character's dynamic images
		if (this.isAirborne) {
			backArm = characterImages[8];
			frontArm = characterImages[6];
			legs = characterImages[4];
		} else {
			backArm = characterImages[7];
			frontArm = characterImages[5];
			legs = characterImages[3];
		}

		// Draw character dynamic images
		this.draw_image(backArm, xx, yy, breathOffset);
		this.draw_image(frontArm, xx, yy, breathOffset);
		this.draw_image(legs, xx, yy, 0);

		// Set character static images
		torso = characterImages[2]
		head = characterImages[1]
		hat = characterImages[0]

		// Draw character static images
 		this.draw_image(torso, xx, yy, 0);
 		this.draw_image(head, xx, yy, breathOffset);
 		this.draw_image(hat, xx, yy, breathOffset);

		// Draw the character's eyes
	 	eyeHeight = yy-90-breathOffset;
		this.draw_ellipse(xx+27, eyeHeight, 6, this.curEyeHeight);
		this.draw_ellipse(xx+37, eyeHeight, 6, this.curEyeHeight);

	 	// Flip the canvas back around after drawing
	 	if (this.isFacingLeft) {
	 		gameCanvas.context.scale(-1, 1);
 		}
	}

	/** Draw a single image based on imageArguments, etc. */
	this.draw_image = function(imageArguments, xPos, yPos, breathOffset) {
 		imageToDraw = this.gameCanvas.images[imageArguments["imageID"]];
 		drawWidth = xPos + imageArguments["xOffset"];
 		drawHeight = (yPos - imageArguments["yOffset"] - breathOffset);
 		this.gameCanvas.context.drawImage(imageToDraw, drawWidth, drawHeight);
	}

	/** Draw an ellipse on the canvas. */
	this.draw_ellipse = function(centerX, centerY, width, height, color) {
	 	context = this.gameCanvas.context;

		// Calculate coordinates for drawing curves
		halfWidth = width / 2;
		halfHeight = height / 2;
		leftX = centerX - halfWidth;
		rightX = centerX + halfWidth;
		topY = centerY - halfHeight;
		bottomY = centerY + halfHeight;

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
			this.blink();
		}
	}

	/** Make the character blink. */
	this.blink = function() {
		thisChar.curEyeHeight -= 1;
		if (thisChar.curEyeHeight <= 0) {
			thisChar.eyeOpenTime = 0;
			thisChar.curEyeHeight = thisChar.maxEyeHeight;
		} else {
			thisChar.blinkTimeout = setTimeout(thisChar.blink, 10);
		}
	}

	/** Make the character jump. */
	this.start_jumping = function() {
		if (!this.isAirborne) {
			this.yPosition += this.jumpHeight;
		}
	}

	/** Make the character fall. */
	this.start_falling = function() {
		if (!this.isAirborne) {
			this.isAirborne = true;
			this.checkAirborneInterval = setInterval(function(){
				if (thisChar.is_at_yfloor()
					|| !thisChar.is_above_ground_level()) {
					thisChar.end_hangtime();
				}
			}, 50);
		}
	}

	/** Land after hanging in the air from
		falling or jumping. */
	this.end_hangtime = function() {
		thisChar.isAirborne = false;
		clearInterval(thisChar.checkAirborneInterval);
		if (!thisChar.isPlanningMovement) {
			thisChar.attempt_movement_stop();
		}
	}

	/** Make the character walk. */
	this.start_walking = function() {
    	clearTimeout(this.stopMovingTimeout);

		if (!this.is_colliding()) {
			this.step_forward();

			// Reset the step interval
			if (this.isWalking) {
				clearInterval(this.stepInterval);

				this.stepInterval = setInterval(function(){
					if (!thisChar.is_colliding()) {
						thisChar.step_forward();
					}
				}, 1000/this.stepsPerSecond);
			}
		}
	}

	/** Step in the directino the character is facing. */
	this.step_forward = function() {
		var stepAmount = this.stepSize;

		if (this.isFacingLeft) {
			stepAmount *= -1;
		}

		if (this.isRunning) {
			stepAmount *= this.runMultiplier;
		}

		this.xPosition += stepAmount;
	}

	/** Make the character start running. */
	this.start_running = function() {
		if (!this.isRunning) {
			this.isRunning = true;
			this.runTimeout = setTimeout(thisChar.stop_running,
										 thisChar.millisBeforeRunStop);
		}
	}

	/** Stop running. */
	this.stop_running = function() {
		thisChar.isRunning = false;
		thisChar.attempt_movement_stop();
	}

	/** Attempt to stop all movement, unless further
		user input is received. */
	this.attempt_movement_stop = function() {
		this.isPlanningMovement = false;

		// Allow time for new input to be entered
		this.stopMovingTimeout = setTimeout(function(){
			if (!this.isPlanningMovement
					&& !thisChar.isAirborne) {
				thisChar.stop_moving();
			}
		}, this.millisBeforeMovementStop);
	}

	/** Stop all movement. */
	this.stop_moving = function() {
		clearInterval(this.stepInterval);
		this.isWalking = false;
		this.isRunning = false;
	}
}



/** Window onload actions. */
window.onload = function () {
	// Initialize the game world
	var gameWorld = new GameCanvas(width=800, height=500, groundLevel=50);
	gameWorld.prepare_canvas(document.getElementById("canvas-div"));
	gameWorld.add_fps();

	// Add platform objects to the game world
	gameWorld.add_platform(xStart=0, xEnd=800, yHeight=0);
	gameWorld.add_platform(xStart=300, xEnd=600, yHeight=100);
	gameWorld.add_platform(xStart=20, xEnd=250, yHeight=200);
	gameWorld.add_platform(xStart=350, xEnd=500, yHeight=300);
	gameWorld.add_platform(xStart=500, xEnd=650, yHeight=420);

	// Add wall objects to the game world
	gameWorld.add_wall(xPosition=0, yBottom=0, yHeight=1000);
	gameWorld.add_wall(xPosition=300, yBottom=0, yHeight=100);
	gameWorld.add_wall(xPosition=600, yBottom=0, yHeight=100);
	gameWorld.add_wall(xPosition=800, yBottom=0, yHeight=1000);

	// Add one player and two NPCs to the world
	npc1 = gameWorld.add_npc(500, 200);
	npc2 = gameWorld.add_npc(650);
	player1 = gameWorld.add_npc(100);

    // Bind keys for moving left
    Mousetrap.bind(['a', 'left'], function() { 
		player1.isPlanningMovement = true;
    	player1.isFacingLeft = true;
		player1.isWalking = true;
        player1.start_walking();
    });
    Mousetrap.bind(['a', 'left'], function() {
		if (player1.isFacingLeft) {
			player1.attempt_movement_stop();
		}
    }, 'keyup');

    // Bind keys for moving right
    Mousetrap.bind(['d', 'right'], function() {
		player1.isPlanningMovement = true;
    	player1.isFacingLeft = false;
		player1.isWalking = true;
        player1.start_walking();
    });
    Mousetrap.bind(['d', 'right'], function() {
		if (!player1.isFacingLeft) {
			player1.attempt_movement_stop();
		}
    }, 'keyup');

    // Bind keys for jumping
    Mousetrap.bind(['w', 'up', 'space'], function(e) {
    	// Remove default behavior of buttons (page scrolling)
    	if (e.preventDefault()) {
    		e.preventDefault();
    	} else {
    		e.returnValue = false; //IE
    	}
        player1.start_jumping();
    });

    // Bind keys for crouching
    Mousetrap.bind(['s', 'down'], function(e) {
    	// Remove default behavior of buttons (page scrolling)
    	if (e.preventDefault()) {
    		e.preventDefault();
    	} else {
    		e.returnValue = false; //IE
    	}
        //player1.start_crouching();
        player1.stop_moving();
    });

    // Bind keys for running
    Mousetrap.bind('r', function() { 
        player1.start_running();
    });
}