// Game Constants
const CANVAS_WIDTH = 390;
const CANVAS_HEIGHT = 900;
const BLOCK_SIZE = 30;
const GRID_WIDTH = Math.floor(CANVAS_WIDTH / BLOCK_SIZE);
const GRID_HEIGHT = Math.floor(CANVAS_HEIGHT / BLOCK_SIZE);
const PADDLE_WIDTH = 80;  // Made paddle slightly smaller for narrower canvas
const PADDLE_HEIGHT = 15;
const BALL_SIZE = 10;
const BALL_SPEED = 5;
const TETRIS_FALL_SPEED = 1000; // Time in ms between automatic drops
const TETRIS_MOVE_SPEED = 50;   // Time in ms between moves when key is held

// Tetris Colors
const TETRIS_COLORS = {
    I: '#00f0f0', // Cyan
    O: '#f0f000', // Yellow
    T: '#a000f0', // Purple
    L: '#f0a000', // Orange
    J: '#0000f0', // Blue
    S: '#00f000', // Green
    Z: '#f00000'  // Red
};

// Audio System
const sounds = {
    paddle: null,
    block: null,
    tetris: null,
    gameover: null,
    ballLost: null,
    start: null
};

// Game State
let gameState = {
    tetrisScore: 0,
    breakoutScore: 0,
    ballsRemaining: 5,
    grid: Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(null)),
    gridBeforeLastPiece: null, // Store grid state before the latest piece is placed
    currentPiece: null,
    lastFallTime: 0,
    lastMoveTime: 0,
    paddle: {
        x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
        y: CANVAS_HEIGHT - 50,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT
    },
    ball: {
        x: 0,
        y: 0,
        dx: BALL_SPEED,
        dy: -BALL_SPEED,
        size: BALL_SIZE
    },
    countdown: 0,      // Countdown value (3,2,1,0)
    countdownStart: 0,  // Time when countdown started
    highlightRows: [], // Rows to highlight (newly added rows)
    highlightUntil: 0,  // Timestamp until when to highlight
    teleportTrail: [], // Positions for teleport trail effect
    teleportTrailUntil: 0, // When to stop showing teleport trail
    shiftWarning: false, // Whether to show shift warning effect
    shiftWarningUntil: 0, // When to stop showing shift warning
    gameStarted: false // Flag to check if game has been started
};

// Tetris piece shapes
const TETRIS_SHAPES = [
    [[1, 1, 1, 1]],  // I
    [[1, 1], [1, 1]],  // O
    [[1, 1, 1], [0, 1, 0]],  // T
    [[1, 1, 1], [1, 0, 0]],  // L
    [[1, 1, 1], [0, 0, 1]],  // J
    [[1, 1, 0], [0, 1, 1]],  // S
    [[0, 1, 1], [1, 1, 0]]   // Z
];

// Create a reference to the p5 instance that we can use in other functions
let p5Instance;

// Wait for DOM to be fully loaded before starting p5
window.addEventListener('DOMContentLoaded', () => {
    // Set up the start game button
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', function() {
            console.log('Start game button clicked');
            startGame();
        });
        
        // Also handle touch events for mobile
        startGameBtn.addEventListener('touchend', function(event) {
            console.log('Start game button touched');
            event.preventDefault();
            startGame();
        });
    }
    
    // Set up a direct button click handler as a fallback
    const newGameButton = document.getElementById('new-game');
    if (newGameButton) {
        console.log('Setting up direct button click handler');
        newGameButton.addEventListener('click', function(event) {
            console.log('Button direct click detected');
            if (gameState.ballsRemaining <= 0) {
                event.stopPropagation(); // Stop event from reaching canvas
                resetGame();
            }
        });
        
        // Also handle touch events directly
        newGameButton.addEventListener('touchend', function(event) {
            console.log('Button direct touch detected');
            if (gameState.ballsRemaining <= 0) {
                event.stopPropagation(); // Stop event from reaching canvas
                event.preventDefault(); // Prevent mouse events
                resetGame();
            }
        });
    }

    // Create p5 instance
    new p5(function(p) {
        // Store p5 instance for use in other functions
        p5Instance = p;
        let canvas;
        
        p.setup = function() {
            // Create canvas with original dimensions
            canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            const container = document.querySelector('.canvas-container');
            if (container) {
                canvas.parent(container);
            }
            
            // Set up new game button listener after p5 is initialized
            const newGameButton = document.getElementById('new-game');
            if (newGameButton) {
                console.log('Setting up new game button listener');
                newGameButton.addEventListener('click', function() {
                    console.log('New game button clicked');
                    resetGame();
                });
            } else {
                console.log('Warning: New game button not found in DOM');
            }
            
            // Set up mobile controls after p5 is initialized
            setupMobileControls();
            
            // Initialize game (but don't start yet)
            initializeGame();
        };
        
        p.draw = function() {
            // Set a semi-transparent black background to let the grid show through
            p.background(0, 220);
            
            // Draw the grid on top of the background
            drawGrid(p);
            
            if (!gameState.gameStarted) {
                // Game not started yet, just show the grid
                return;
            }
            
            if (gameState.ballsRemaining > 0) {
                // Check if countdown is active
                if (gameState.countdown > 0) {
                    // Calculate elapsed time since countdown started
                    const currentTime = p5Instance.millis();
                    const elapsedTime = currentTime - gameState.countdownStart;
                    
                    // Each number shows for 1 second
                    const secondsElapsed = Math.floor(elapsedTime / 1000);
                    const currentNumber = 3 - secondsElapsed;
                    
                    if (currentNumber <= 0) {
                        // Countdown finished, start the game
                        gameState.countdown = 0;
                        
                        // Set ball in motion
                        gameState.ball.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
                        gameState.ball.dy = -BALL_SPEED;
                    } else {
                        // Update countdown display
                        gameState.countdown = currentNumber;
                        
                        // Draw countdown number
                        p.noStroke();
                        p.fill(255);
                        p.textSize(100); // Larger text for countdown (100px)
                        p.textAlign(p.CENTER, p.CENTER);
                        p.text(currentNumber, CANVAS_WIDTH/2, CANVAS_HEIGHT/3); // Position higher on the board
                    }
                    
                    // Still draw all game elements during countdown
                    drawBlocks(p);
                    drawCurrentPiece(p);
                    drawPaddle(p);
                    drawBall(p);
                } else {
                    // Normal game update when countdown is over
                    updateTetris();
                    updateBall();
                    
                    // Draw game elements
                    drawBlocks(p);
                    drawCurrentPiece(p);
                    drawPaddle(p);
                    drawBall(p);
                }
            } else {
                // Game Over state
                p.noStroke();
                p.fill(255);
                p.textSize(32);
                p.textAlign(p.CENTER, p.CENTER);
                p.text('GAME OVER', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                
                // Show the new game button
                const newGameButton = document.getElementById('new-game');
                if (newGameButton && newGameButton.style.display !== 'block') {
                    newGameButton.style.display = 'block';
                    
                    // Play game over sound
                    playSound(sounds.gameover);
                }
            }
            
            updateScoreDisplay();
        };
        
        // Update drawing functions to use p5 instance
        p.mouseMoved = function() {
            // Only respond if game is started and running
            if (!gameState.gameStarted || !p.mouseIsPressed && gameState.ballsRemaining > 0) {
                const rect = canvas.elt.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                const relativeX = p.mouseX;
                
                // Ensure we're not setting an invalid value
                if (isNaN(relativeX)) {
                    console.log('Invalid mouse position detected');
                    return false;
                }
                
                gameState.paddle.x = p.constrain(
                    relativeX - gameState.paddle.width / 2,
                    0,
                    CANVAS_WIDTH - gameState.paddle.width
                );
            }
            return false;
        };
        
        p.mousePressed = function() {
            // If game is not started, ignore all other mouse presses
            if (!gameState.gameStarted) {
                return true;
            }
            
            // Check if the new game button was clicked
            if (gameState.ballsRemaining <= 0) {
                const newGameButton = document.getElementById('new-game');
                if (newGameButton && newGameButton.style.display === 'block') {
                    const rect = newGameButton.getBoundingClientRect();
                    if (p.mouseX >= rect.left && p.mouseX <= rect.right && 
                        p.mouseY >= rect.top && p.mouseY <= rect.bottom) {
                        console.log('Button clicked via mousePressed');
                        resetGame();
                        return false; // Prevent default only for button click
                    }
                }
            }
            return true; // Allow other clicks to propagate
        };
        
        p.touchStarted = function() {
            // If game is not started, ignore touch events
            if (!gameState.gameStarted) {
                return false;
            }
            
            // Check if new game button was touched
            if (gameState.ballsRemaining <= 0 && p.touches.length > 0) {
                const newGameButton = document.getElementById('new-game');
                if (newGameButton && newGameButton.style.display === 'block') {
                    const rect = newGameButton.getBoundingClientRect();
                    const touch = p.touches[0];
                    if (touch.clientX >= rect.left && touch.clientX <= rect.right && 
                        touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                        console.log('Button clicked via touchStarted');
                        resetGame();
                        return false; // Prevent default only for button touch
                    }
                }
            }
            
            if (gameState.ballsRemaining > 0 && p.touches.length > 0) {
                const rect = canvas.elt.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                const relativeX = (p.touches[0].clientX - rect.left) * scaleX;
                
                // Ensure we're not setting an invalid value
                if (isNaN(relativeX)) {
                    console.log('Invalid touch position detected');
                    return false;
                }
                
                gameState.paddle.x = p.constrain(
                    relativeX - gameState.paddle.width / 2,
                    0,
                    CANVAS_WIDTH - gameState.paddle.width
                );
            }
            return false;
        };
        
        p.touchMoved = function() {
            // If game is not started, ignore touch events
            if (!gameState.gameStarted) {
                return false;
            }
            
            if (gameState.ballsRemaining > 0 && p.touches.length > 0) {
                const rect = canvas.elt.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                const relativeX = (p.touches[0].clientX - rect.left) * scaleX;
                
                // Ensure we're not setting an invalid value
                if (isNaN(relativeX)) {
                    console.log('Invalid touch position detected in touchMoved');
                    return false;
                }
                
                gameState.paddle.x = p.constrain(
                    relativeX - gameState.paddle.width / 2,
                    0,
                    CANVAS_WIDTH - gameState.paddle.width
                );
            }
            return false;
        };
        
        p.keyPressed = function() {
            // If game is not started, ignore key presses
            if (!gameState.gameStarted) {
                return;
            }
            
            // Don't respond to keys if game is over or during countdown
            if (gameState.ballsRemaining <= 0 || gameState.countdown > 0) return;
            
            // Breakout controls
            if (p.keyCode === p.LEFT_ARROW) {
                gameState.paddle.x = p.constrain(gameState.paddle.x - 20, 0, CANVAS_WIDTH - PADDLE_WIDTH);
            } else if (p.keyCode === p.RIGHT_ARROW) {
                gameState.paddle.x = p.constrain(gameState.paddle.x + 20, 0, CANVAS_WIDTH - PADDLE_WIDTH);
            }
            
            // Tetris controls
            if (p.keyCode === 65) {  // 'A' key - move left
                movePieceSideways(-1);
            } else if (p.keyCode === 68) {  // 'D' key - move right
                movePieceSideways(1);
            } else if (p.keyCode === 83) {  // 'S' key - move down
                movePieceDown();
            } else if (p.keyCode === 87) {  // 'W' key - rotate
                rotatePiece();
            }
        };
    });
});

// Function to initialize the game (but not start it yet)
function initializeGame() {
    console.log('initializeGame function called');
    if (!p5Instance) {
        console.error('p5 instance not initialized');
        return;
    }
    
    // Initialize sounds if not already done
    if (!sounds.paddle) {
        initSounds();
    }
    
    // Initialize game state
    gameState.tetrisScore = 0;
    gameState.breakoutScore = 0;
    gameState.ballsRemaining = 5;
    gameState.grid = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(null));
    gameState.gridBeforeLastPiece = null;
    gameState.currentPiece = null;
    gameState.highlightRows = [];
    gameState.highlightUntil = 0;
    gameState.teleportTrail = [];
    gameState.teleportTrailUntil = 0;
    gameState.shiftWarning = false;
    gameState.shiftWarningUntil = 0;
    gameState.gameStarted = false; // Set game as not started yet
    
    gameState.lastFallTime = p5Instance.millis();
    gameState.lastMoveTime = p5Instance.millis();
    
    gameState.paddle = {
        x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
        y: CANVAS_HEIGHT - 50,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT
    };
    
    gameState.ball = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 100,
        dx: 0, // Start with no movement
        dy: 0, // Start with no movement
        size: BALL_SIZE
    };
    
    // Don't set countdown yet
    gameState.countdown = 0;
    
    // Show the start screen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.display = 'flex';
    }
    
    // Hide the new game button
    const newGameButton = document.getElementById('new-game');
    if (newGameButton) {
        newGameButton.style.display = 'none';
    }
    
    // Update all score displays
    updateScoreDisplay();
    document.getElementById('balls-remaining').textContent = gameState.ballsRemaining;
}

// Function to start the game when the start button is clicked
function startGame() {
    // Hide the start screen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.display = 'none';
    }
    
    // Set game as started
    gameState.gameStarted = true;
    
    // Initialize breakout blocks
    initializeBreakoutBlocks();
    
    // Spawn first Tetris piece
    spawnNewPiece();
    
    // Set countdown
    gameState.countdown = 3;
    gameState.countdownStart = p5Instance.millis();
    
    // Play start sound
    playSound(sounds.start);
}

function resetGame() {
    console.log('resetGame function called');
    if (!p5Instance) {
        console.error('p5 instance not initialized');
        return;
    }
    
    // Initialize sounds if not already done
    if (!sounds.paddle) {
        initSounds();
    }
    
    // Reset game state
    gameState.tetrisScore = 0;
    gameState.breakoutScore = 0;
    gameState.ballsRemaining = 5;
    gameState.grid = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(null));
    gameState.gridBeforeLastPiece = null;
    gameState.currentPiece = null;
    gameState.highlightRows = [];
    gameState.highlightUntil = 0;
    gameState.teleportTrail = [];
    gameState.teleportTrailUntil = 0;
    gameState.shiftWarning = false;
    gameState.shiftWarningUntil = 0;
    gameState.gameStarted = true; // Keep game as started
    
    gameState.lastFallTime = p5Instance.millis();
    gameState.lastMoveTime = p5Instance.millis();
    
    gameState.paddle = {
        x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
        y: CANVAS_HEIGHT - 50,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT
    };
    
    gameState.ball = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 100,
        dx: 0, // Start with no movement
        dy: 0, // Start with no movement
        size: BALL_SIZE
    };
    
    // Set countdown
    gameState.countdown = 3;
    gameState.countdownStart = p5Instance.millis();
    
    // Initialize breakout blocks
    initializeBreakoutBlocks();
    
    // Spawn first Tetris piece
    spawnNewPiece();

    // Hide the new game button when game starts
    const newGameButton = document.getElementById('new-game');
    if (newGameButton) {
        newGameButton.style.display = 'none';
    }

    // Update all score displays
    updateScoreDisplay();
    document.getElementById('balls-remaining').textContent = gameState.ballsRemaining;
    
    // Play start sound
    playSound(sounds.start);
}

function initializeBreakoutBlocks() {
    const rows = 5;
    // Position breakout blocks about 2/3 down the grid
    const startRow = Math.floor(GRID_HEIGHT * 0.7) - rows;
    const colors = Object.values(TETRIS_COLORS);
    
    // Clear any existing blocks in the target area and below
    for (let row = startRow; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            gameState.grid[row][col] = null;
        }
    }
    
    // Now add new blocks with gaps and health based on row position
    for (let row = 0; row < rows; row++) {
        // Create gaps pattern for each row
        const skipPositions = [
            Math.floor(Math.random() * GRID_WIDTH),
            Math.floor(Math.random() * GRID_WIDTH)
        ];
        
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (skipPositions.includes(col)) continue;
            
            // Determine block health based on row position from bottom
            let health;
            if (row >= rows - 2) {  // Bottom two rows
                health = 1;
            } else if (row >= rows - 4) {  // Next two rows
                health = 2;
            } else {  // Top row(s)
                health = 3;
            }
            
            const block = {
                color: colors[Math.floor(Math.random() * colors.length)],
                health: health,
                maxHealth: health  // Store original health for color calculation
            };
            gameState.grid[startRow + row][col] = block;
        }
    }
    
    // If there's an active piece, check if it would now collide with the breakout blocks
    if (gameState.currentPiece) {
        // If the current piece would collide, move it up enough to avoid collision
        while (wouldCollide(gameState.currentPiece) && gameState.currentPiece.y > 0) {
            gameState.currentPiece.y--;
        }
        
        // If it would still collide at the top, generate a new piece
        if (wouldCollide(gameState.currentPiece)) {
            spawnNewPiece();
        }
    }
}

function resetBall() {
    if (gameState.ballsRemaining <= 0) return;
    
    gameState.ball.x = CANVAS_WIDTH / 2;
    gameState.ball.y = CANVAS_HEIGHT - 100;
    
    // Only set ball direction if countdown is over
    if (gameState.countdown <= 0) {
        gameState.ball.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
        gameState.ball.dy = -BALL_SPEED;
    } else {
        // Keep ball stationary during countdown
        gameState.ball.dx = 0;
        gameState.ball.dy = 0;
    }
}

function updateBall() {
    // Don't update if no balls remaining
    if (gameState.ballsRemaining <= 0) return;
    
    // Update position
    gameState.ball.x += gameState.ball.dx;
    gameState.ball.y += gameState.ball.dy;
    
    // Wall collisions
    if (gameState.ball.x - gameState.ball.size/2 <= 0 || 
        gameState.ball.x + gameState.ball.size/2 >= CANVAS_WIDTH) {
        gameState.ball.dx *= -1;
        // Ensure ball stays within bounds
        gameState.ball.x = p5Instance.constrain(
            gameState.ball.x, 
            gameState.ball.size/2, 
            CANVAS_WIDTH - gameState.ball.size/2
        );
    }
    
    // Top wall collision - now teleports ball down and shifts blocks up
    if (gameState.ball.y - gameState.ball.size/2 <= 0) {
        // Create teleport trail effect
        gameState.teleportTrail = [];
        
        // Store current ball position for trail start
        gameState.teleportTrail.push({
            x: gameState.ball.x,
            y: gameState.ball.y,
            size: gameState.ball.size
        });
        
        // Find position to teleport the ball (below lowest block)
        let lowestBlockRow = -1;
        for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
            if (gameState.grid[row].some(cell => cell !== null)) {
                lowestBlockRow = row;
                break;
            }
        }
        
        // Place the ball below the lowest block (or halfway down the grid if no blocks)
        const newY = (lowestBlockRow >= 0) 
                      ? (lowestBlockRow + 1) * BLOCK_SIZE + gameState.ball.size * 2
                      : CANVAS_HEIGHT / 2;
                      
        // Add trail points between old and new positions
        const steps = 5; // Number of trail points
        for (let i = 1; i <= steps; i++) {
            gameState.teleportTrail.push({
                x: gameState.ball.x,
                y: gameState.ball.y * (1 - i/steps) + newY * (i/steps),
                size: gameState.ball.size * (1 - (i * 0.15))
            });
        }
        
        // Teleport the ball down, keeping its trajectory
        gameState.ball.y = newY;
        
        // Set trail duration
        gameState.teleportTrailUntil = p5Instance.millis() + 500; // Show for 500ms
        
        // Shift all blocks up one row
        shiftBlocksUp();
        
        // Award points for teleporting (reaching the top)
        gameState.breakoutScore += 50;
        
        // Play a sound for the teleport
        playSound(sounds.tetris);
    }
    
    // Paddle collision with angle reflection
    if (checkPaddleCollision()) {
        // Calculate reflection angle based on where ball hits the paddle
        const paddleCenter = gameState.paddle.x + gameState.paddle.width / 2;
        const hitPos = (gameState.ball.x - paddleCenter) / (gameState.paddle.width / 2);
        const angle = hitPos * Math.PI / 4; // Max 45 degree reflection
        
        const speed = Math.sqrt(gameState.ball.dx * gameState.ball.dx + gameState.ball.dy * gameState.ball.dy);
        gameState.ball.dx = speed * Math.sin(angle);
        gameState.ball.dy = -speed * Math.cos(angle);
        
        // Ensure ball doesn't get stuck in paddle
        gameState.ball.y = gameState.paddle.y - gameState.ball.size/2;
        
        // Play paddle hit sound
        playSound(sounds.paddle);
    }
    
    // Ball lost
    if (gameState.ball.y >= CANVAS_HEIGHT) {
        gameState.ballsRemaining--;
        // Update the balls counter display
        document.getElementById('balls-remaining').textContent = gameState.ballsRemaining;
        
        // Play ball lost sound
        playSound(sounds.ballLost);
        
        if (gameState.ballsRemaining > 0) {
            resetBall();
        }
    }
    
    // Check block collisions
    checkBlockCollisions();
}

function checkPaddleCollision() {
    const ballBottom = gameState.ball.y + gameState.ball.size/2;
    const ballTop = gameState.ball.y - gameState.ball.size/2;
    const ballLeft = gameState.ball.x - gameState.ball.size/2;
    const ballRight = gameState.ball.x + gameState.ball.size/2;
    
    return (
        ballBottom >= gameState.paddle.y &&
        ballTop <= gameState.paddle.y + gameState.paddle.height &&
        ballRight >= gameState.paddle.x &&
        ballLeft <= gameState.paddle.x + gameState.paddle.width
    );
}

function checkBlockCollisions() {
    const ballLeft = Math.floor((gameState.ball.x - gameState.ball.size/2) / BLOCK_SIZE);
    const ballRight = Math.floor((gameState.ball.x + gameState.ball.size/2) / BLOCK_SIZE);
    const ballTop = Math.floor((gameState.ball.y - gameState.ball.size/2) / BLOCK_SIZE);
    const ballBottom = Math.floor((gameState.ball.y + gameState.ball.size/2) / BLOCK_SIZE);
    
    let collision = false;
    
    // First check collision with falling piece
    if (gameState.currentPiece) {
        const piece = gameState.currentPiece;
        const shape = piece.shape;
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] > 0) {
                    const blockX = (piece.x + x) * BLOCK_SIZE;
                    const blockY = (piece.y + y) * BLOCK_SIZE;
                    
                    if (checkBallBlockCollision(blockX, blockY)) {
                        // Reduce the block's health instead of removing immediately
                        shape[y][x]--;
                        gameState.breakoutScore += 10;
                        collision = true;
                        
                        // Play block hit sound
                        playSound(sounds.block);
                        
                        // If health reaches zero, remove the block
                        if (shape[y][x] <= 0) {
                            shape[y][x] = 0;
                        }
                    }
                }
            }
        }
    }
    
    // Then check collision with grid blocks
    for (let row = Math.max(0, ballTop); row <= Math.min(GRID_HEIGHT - 1, ballBottom); row++) {
        for (let col = Math.max(0, ballLeft); col <= Math.min(GRID_WIDTH - 1, ballRight); col++) {
            if (gameState.grid[row][col]) {
                const blockX = col * BLOCK_SIZE;
                const blockY = row * BLOCK_SIZE;
                
                // Precise collision check
                if (checkBallBlockCollision(blockX, blockY)) {
                    const block = gameState.grid[row][col];
                    block.health--;
                    
                    // Play block hit sound
                    playSound(sounds.block);
                    
                    if (block.health <= 0) {
                        gameState.grid[row][col] = null;  // Remove block only when health is depleted
                        gameState.breakoutScore += 10 * block.maxHealth;  // More points for tougher blocks
                    }
                    collision = true;
                }
            }
        }
    }
    
    return collision;
}

function checkBallBlockCollision(blockX, blockY) {
    const ballLeft = gameState.ball.x - gameState.ball.size/2;
    const ballRight = gameState.ball.x + gameState.ball.size/2;
    const ballTop = gameState.ball.y - gameState.ball.size/2;
    const ballBottom = gameState.ball.y + gameState.ball.size/2;
    
    if (ballRight >= blockX && 
        ballLeft <= blockX + BLOCK_SIZE && 
        ballBottom >= blockY && 
        ballTop <= blockY + BLOCK_SIZE) {
        
        // Determine which side was hit
        const hitLeft = Math.abs(ballRight - blockX);
        const hitRight = Math.abs(ballLeft - (blockX + BLOCK_SIZE));
        const hitTop = Math.abs(ballBottom - blockY);
        const hitBottom = Math.abs(ballTop - (blockY + BLOCK_SIZE));
        const minOverlap = Math.min(hitLeft, hitRight, hitTop, hitBottom);
        
        // Reverse appropriate velocity component
        if (minOverlap === hitLeft || minOverlap === hitRight) {
            gameState.ball.dx *= -1;
        } else {
            gameState.ball.dy *= -1;
        }
        
        return true;
    }
    return false;
}

function drawPaddle(p) {
    // Validate paddle position before drawing
    if (isNaN(gameState.paddle.x) || gameState.paddle.x === undefined) {
        console.log('Invalid paddle position detected in drawPaddle, resetting');
        gameState.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    }
    
    // Draw paddle
    p.noStroke();
    p.fill(255);
    p.rect(gameState.paddle.x, gameState.paddle.y, gameState.paddle.width, gameState.paddle.height);
    
    // Draw balls remaining text on paddle
    p.fill(0); // Black text
    p.textSize(PADDLE_HEIGHT * 0.8);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(gameState.ballsRemaining, 
           gameState.paddle.x + gameState.paddle.width / 2, 
           gameState.paddle.y + gameState.paddle.height / 2);
}

function drawBall(p) {
    // Draw teleport trail if active
    const currentTime = p5Instance.millis();
    if (currentTime < gameState.teleportTrailUntil && gameState.teleportTrail.length > 0) {
        p.noStroke();
        
        // Draw trail points with decreasing opacity
        for (let i = 0; i < gameState.teleportTrail.length; i++) {
            const point = gameState.teleportTrail[i];
            const alpha = 255 * (1 - i / gameState.teleportTrail.length) * 0.7;
            p.fill(255, 255, 255, alpha);
            p.circle(point.x, point.y, point.size);
        }
    }
    
    // Draw the actual ball
    p.fill(255);
    p.noStroke();
    p.circle(gameState.ball.x, gameState.ball.y, gameState.ball.size);
}

function drawBlocks(p) {
    // Current time for highlighting
    const currentTime = p5Instance.millis();
    const shouldHighlight = currentTime < gameState.highlightUntil;
    
    // Draw breakout blocks using p5
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const block = gameState.grid[row][col];
            if (block) {
                const worldX = col * BLOCK_SIZE;
                const worldY = row * BLOCK_SIZE;
                
                // Check if this row should be highlighted (newly added)
                const isHighlightedRow = shouldHighlight && gameState.highlightRows.includes(row);
                
                p.noStroke();
                
                // Parse the color to extract RGB components
                let color = block.color;
                if (color.startsWith('#')) {
                    const r = parseInt(color.slice(1, 3), 16);
                    const g = parseInt(color.slice(3, 5), 16);
                    const b = parseInt(color.slice(5, 7), 16);
                    
                    // Calculate color based on health ratio
                    const healthRatio = block.health / block.maxHealth;
                    
                    // For highlighted rows, add a pulsing white effect
                    if (isHighlightedRow) {
                        // Calculate a pulse effect (0 to 1)
                        const pulse = (Math.sin(currentTime * 0.01) + 1) / 2;
                        // Increase the brightness for highlight effect
                        const highlightAmount = 100 + (pulse * 155);
                        p.fill(
                            Math.min(r + highlightAmount, 255),
                            Math.min(g + highlightAmount, 255),
                            Math.min(b + highlightAmount, 255),
                            255 * (0.3 + 0.7 * healthRatio)
                        );
                    } else {
                        // Regular coloring based on health
                        p.fill(r, g, b, 255 * (0.3 + 0.7 * healthRatio));
                    }
                } else {
                    p.fill(color);
                }
                
                p.rect(worldX, worldY, BLOCK_SIZE, BLOCK_SIZE);
                
                // Add subtle darker bottom and right edges for depth
                p.fill(0, 40);
                p.rect(worldX + BLOCK_SIZE - 2, worldY, 2, BLOCK_SIZE);
                p.rect(worldX, worldY + BLOCK_SIZE - 2, BLOCK_SIZE, 2);
            }
        }
    }
}

function updateScoreDisplay() {
    // Update only the hidden balls-remaining element
    document.getElementById('balls-remaining').textContent = gameState.ballsRemaining;
}

function spawnNewPiece() {
    const shapeIndex = Math.floor(Math.random() * TETRIS_SHAPES.length);
    const shape = TETRIS_SHAPES[shapeIndex];
    const pieceColor = Object.values(TETRIS_COLORS)[shapeIndex];
    
    // Deep copy the shape to avoid modifying the original TETRIS_SHAPES
    const shapeCopy = shape.map(row => row.map(cell => cell === 1 ? 3 : 0)); // Set health to 3 for blocks
    
    // Initialize gridBeforeLastPiece if this is the first piece
    if (gameState.gridBeforeLastPiece === null) {
        gameState.gridBeforeLastPiece = JSON.parse(JSON.stringify(gameState.grid));
    }
    
    // Find the highest row with blocks to make sure we spawn above it
    let highestBlockRow = GRID_HEIGHT;
    for (let row = 0; row < GRID_HEIGHT; row++) {
        if (gameState.grid[row].some(cell => cell !== null)) {
            highestBlockRow = row;
            break;
        }
    }
    
    // Default spawn position is at top
    let spawnY = 0;
    
    // Create the piece
    gameState.currentPiece = {
        x: Math.floor(GRID_WIDTH / 2) - Math.floor(shape[0].length / 2),
        y: spawnY,
        shape: shapeCopy,
        color: pieceColor,
        hasLanded: false // Track if the piece has landed yet
    };
    
    // Check if the newly spawned piece would collide
    if (wouldCollide(gameState.currentPiece)) {
        // Game over if we can't spawn a piece at the top
        gameState.ballsRemaining = 0;
    }
}

function updateTetris() {
    // Don't update tetris during countdown
    if (gameState.countdown > 0) return;
    
    // Ensure we always have a current piece
    if (!gameState.currentPiece && gameState.ballsRemaining > 0) {
        spawnNewPiece();
    }
    
    const currentTime = p5Instance.millis();
    
    // Reset lastFallTime if it's not initialized or if it's too large
    if (!gameState.lastFallTime || currentTime < gameState.lastFallTime) {
        gameState.lastFallTime = currentTime;
    }
    
    // Auto-fall every TETRIS_FALL_SPEED milliseconds
    if (currentTime - gameState.lastFallTime >= TETRIS_FALL_SPEED) {
        movePieceDown();
        gameState.lastFallTime = currentTime;
    }
}

function movePieceDown() {
    if (!gameState.currentPiece) return;
    
    // If piece has already landed but is empty, spawn a new piece
    if (gameState.currentPiece.hasLanded && !gameState.currentPiece.shape.some(row => row.some(cell => cell > 0))) {
        spawnNewPiece();
        return;
    }
    
    // Try moving down
    gameState.currentPiece.y++;
    
    // Check if this causes a collision (either with existing blocks, game boundaries, or lowest block row)
    if (wouldCollide(gameState.currentPiece)) {
        // Move back up
        gameState.currentPiece.y--;
        
        // Only lock and spawn new piece if current piece is valid
        if (gameState.currentPiece.y >= 0) {
            // Mark the piece as landed
            gameState.currentPiece.hasLanded = true;
            
            // Check if the piece has any blocks left - if not, spawn new piece
            if (!gameState.currentPiece.shape.some(row => row.some(cell => cell > 0))) {
                spawnNewPiece();
                return;
            }
            
            lockPiece();
            checkTetrisLines();
            spawnNewPiece();
            
            // Check for game over
            if (wouldCollide(gameState.currentPiece)) {
                gameState.ballsRemaining = 0;  // End game
            }
        } else {
            // If piece collides above grid, end game
            gameState.ballsRemaining = 0;
        }
    }
}

function movePieceSideways(direction) {
    if (!gameState.currentPiece) return;
    
    gameState.currentPiece.x += direction;
    if (wouldCollide(gameState.currentPiece)) {
        gameState.currentPiece.x -= direction;
    }
}

function rotatePiece() {
    if (!gameState.currentPiece) return;
    
    const oldShape = gameState.currentPiece.shape;
    const newShape = [];
    
    // Create rotated shape matrix
    for (let i = 0; i < oldShape[0].length; i++) {
        newShape[i] = [];
        for (let j = 0; j < oldShape.length; j++) {
            newShape[i][j] = oldShape[oldShape.length - 1 - j][i];
        }
    }
    
    // Try rotation
    const oldPieceShape = gameState.currentPiece.shape;
    gameState.currentPiece.shape = newShape;
    
    // If collision, revert rotation
    if (wouldCollide(gameState.currentPiece)) {
        gameState.currentPiece.shape = oldPieceShape;
    }
}

function lockPiece() {
    if (!gameState.currentPiece) return;
    
    // Save the grid state before placing the piece
    gameState.gridBeforeLastPiece = JSON.parse(JSON.stringify(gameState.grid));
    
    const piece = gameState.currentPiece;
    const shape = piece.shape;
    let validLock = false;
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] > 0) {
                const gridY = piece.y + y;
                const gridX = piece.x + x;
                
                // Only lock if the piece is within valid grid bounds
                if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < GRID_WIDTH) {
                    gameState.grid[gridY][gridX] = {
                        color: piece.color,
                        health: shape[y][x],    // Use the health from the shape
                        maxHealth: 3            // Max health is 3
                    };
                    validLock = true;
                }
            }
        }
    }
    
    // Only count as locked if at least one block was placed in valid position
    if (!validLock) {
        gameState.ballsRemaining = 0; // End game if no valid lock position
    }
}

function checkTetrisLines() {
    let linesCleared = 0;
    let clearedLines = [];
    
    // Start from the bottom of the grid
    for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
        // Check if row is full (all cells have blocks)
        const isLineFull = gameState.grid[row].every(cell => cell !== null);
        
        if (isLineFull) {
            linesCleared++;
            clearedLines.push(row); // Store the row index of cleared line
            
            // Move all rows above this one down
            for (let y = row; y > 0; y--) {
                gameState.grid[y] = [...gameState.grid[y - 1]];
            }
            
            // Create new empty row at top
            gameState.grid[0] = Array(GRID_WIDTH).fill(null);
            
            // Since we moved all rows down, we need to check this row again
            row++;
        }
    }
    
    // Add cleared lines to the breakout section if any lines were cleared
    if (linesCleared > 0 && gameState.gridBeforeLastPiece) {
        // Find the lowest block in the grid
        let lowestBlockRow = -1;
        for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
            if (gameState.grid[row].some(cell => cell !== null)) {
                lowestBlockRow = row;
                break;
            }
        }
        
        // Only add lines if there's space below the lowest block
        if (lowestBlockRow < GRID_HEIGHT - 1) {
            let insertRow = lowestBlockRow + 1;
            
            // Add at most linesCleared rows (limited by available space)
            let rowsToAdd = Math.min(linesCleared, GRID_HEIGHT - 1 - lowestBlockRow);
            
            // Track which rows are added for highlighting
            gameState.highlightRows = [];
            
            // Move existing rows down to make space
            for (let row = GRID_HEIGHT - 1 - rowsToAdd; row >= insertRow; row--) {
                gameState.grid[row + rowsToAdd] = [...gameState.grid[row]];
            }
            
            // Add the cleared lines in their original state (before latest piece was placed)
            for (let i = 0; i < rowsToAdd; i++) {
                if (i < clearedLines.length) {
                    let originalRowIndex = clearedLines[i];
                    gameState.grid[insertRow + i] = gameState.gridBeforeLastPiece[originalRowIndex].map(cell => {
                        // Return a copy of the cell if it exists
                        if (cell !== null) {
                            return {
                                color: cell.color,
                                health: cell.health,
                                maxHealth: cell.maxHealth
                            };
                        }
                        return null;
                    });
                    
                    // Add row to highlight list
                    gameState.highlightRows.push(insertRow + i);
                }
            }
            
            // Set highlight duration (1.5 seconds)
            gameState.highlightUntil = p5Instance.millis() + 1500;
        }
        
        // Update score based on number of lines cleared
        gameState.tetrisScore += linesCleared * 100;
        
        // Play tetris sound for lines cleared
        playSound(sounds.tetris);
    }
}

function drawCurrentPiece(p) {
    if (!gameState.currentPiece) return;
    
    // Find landing position for ghost piece
    const ghostPiece = findLandingPosition(gameState.currentPiece);
    
    // Draw ghost piece first (so it appears behind the actual piece)
    if (ghostPiece) {
        p.noStroke();
        const shape = ghostPiece.shape;
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] > 0) {
                    const worldX = (ghostPiece.x + x) * BLOCK_SIZE;
                    const worldY = (ghostPiece.y + y) * BLOCK_SIZE;
                    
                    // Only draw if within canvas bounds
                    if (ghostPiece.y + y >= 0) {
                        // Draw ghost piece with lower opacity
                        let color = ghostPiece.color;
                        if (color.startsWith('#')) {
                            const r = parseInt(color.slice(1, 3), 16);
                            const g = parseInt(color.slice(3, 5), 16);
                            const b = parseInt(color.slice(5, 7), 16);
                            p.fill(r, g, b, 50); // Very transparent
                        } else {
                            p.fill(ghostPiece.color, 50);
                        }
                        
                        // Draw just the outline of the ghost piece
                        p.rect(worldX, worldY, BLOCK_SIZE, BLOCK_SIZE);
                    }
                }
            }
        }
    }
    
    // Draw actual piece
    const piece = gameState.currentPiece;
    const shape = piece.shape;
    
    p.noStroke();
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] > 0) {
                const worldX = (piece.x + x) * BLOCK_SIZE;
                const worldY = (piece.y + y) * BLOCK_SIZE;
                
                // Only draw if within canvas bounds
                if (piece.y + y >= 0) {
                    // Calculate opacity based on health
                    const healthRatio = shape[y][x] / 3;
                    const alpha = 255 * (0.5 + 0.5 * healthRatio);
                    
                    // Parse the color to extract RGB components
                    let color = piece.color;
                    if (color.startsWith('#')) {
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);
                        p.fill(r, g, b, alpha);
                    } else {
                        p.fill(piece.color);
                    }
                    
                    p.rect(worldX, worldY, BLOCK_SIZE, BLOCK_SIZE);
                    
                    // Add subtle darker bottom and right edges for depth
                    p.fill(0, 40);
                    p.rect(worldX + BLOCK_SIZE - 2, worldY, 2, BLOCK_SIZE);
                    p.rect(worldX, worldY + BLOCK_SIZE - 2, BLOCK_SIZE, 2);
                }
            }
        }
    }
}

// Add this new function to handle mobile controls
function setupMobileControls() {
    console.log('Setting up mobile controls');
    
    // Paddle controls
    const paddleLeft = document.getElementById('paddle-left');
    const paddleRight = document.getElementById('paddle-right');
    
    // Tetris controls
    const tetrisLeft = document.getElementById('tetris-left');
    const tetrisRight = document.getElementById('tetris-right');
    const tetrisRotate = document.getElementById('tetris-rotate');
    const tetrisDown = document.getElementById('tetris-down');
    
    // Tracking variables for continuous movement (paddle only)
    const buttonStates = {
        paddleLeft: false,
        paddleRight: false
    };
    
    // Helper function to setup button press and release events
    function setupContinuousButton(button, startAction, stopAction) {
        if (!button) return;
        
        // For mouse events
        button.addEventListener('mousedown', function(event) {
            event.preventDefault();
            startAction();
        });
        
        button.addEventListener('mouseup', function(event) {
            event.preventDefault();
            stopAction();
        });
        
        button.addEventListener('mouseleave', function(event) {
            event.preventDefault();
            stopAction();
        });
        
        // For touch events
        button.addEventListener('touchstart', function(event) {
            event.preventDefault();
            startAction();
        });
        
        button.addEventListener('touchend', function(event) {
            event.preventDefault();
            stopAction();
        });
        
        button.addEventListener('touchcancel', function(event) {
            event.preventDefault();
            stopAction();
        });
    }
    
    // Helper function for single press actions
    function setupButtonControls(button, action) {
        if (!button) return;
        
        button.addEventListener('mousedown', function(event) {
            event.preventDefault();
            action();
        });
        
        button.addEventListener('touchstart', function(event) {
            event.preventDefault();
            action();
        });
    }
    
    // Tetris actions - single press only
    setupButtonControls(tetrisLeft, function() {
        // Check if game is started, has balls remaining, and not in countdown
        if (!gameState.gameStarted || gameState.ballsRemaining <= 0 || gameState.countdown > 0) return;
        console.log('Tetris LEFT pressed');
        movePieceSideways(-1);
    });
    
    setupButtonControls(tetrisRight, function() {
        if (!gameState.gameStarted || gameState.ballsRemaining <= 0 || gameState.countdown > 0) return;
        console.log('Tetris RIGHT pressed');
        movePieceSideways(1);
    });
    
    setupButtonControls(tetrisRotate, function() {
        if (!gameState.gameStarted || gameState.ballsRemaining <= 0 || gameState.countdown > 0) return;
        console.log('Tetris ROTATE pressed');
        rotatePiece();
    });
    
    setupButtonControls(tetrisDown, function() {
        if (!gameState.gameStarted || gameState.ballsRemaining <= 0 || gameState.countdown > 0) return;
        console.log('Tetris DOWN pressed');
        movePieceDown();
    });
    
    // Continuous paddle movement
    setupContinuousButton(
        paddleLeft,
        function() {
            // Only activate if game is started
            if (!gameState.gameStarted) return;
            console.log('Paddle LEFT pressed');
            buttonStates.paddleLeft = true;
        },
        function() {
            console.log('Paddle LEFT released');
            buttonStates.paddleLeft = false;
        }
    );
    
    setupContinuousButton(
        paddleRight,
        function() {
            // Only activate if game is started
            if (!gameState.gameStarted) return;
            console.log('Paddle RIGHT pressed');
            buttonStates.paddleRight = true;
        },
        function() {
            console.log('Paddle RIGHT released');
            buttonStates.paddleRight = false;
        }
    );
    
    // Helper function to constrain a value between a min and max
    function constrain(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    // Set up the continuous movement update function - for paddle only
    const updateInterval = 30; // Update interval in milliseconds
    setInterval(function() {
        // Don't update paddle if game is not started, during countdown, or if game is over
        if (!gameState.gameStarted || gameState.ballsRemaining <= 0 || gameState.countdown > 0) return;
        
        // Check if paddle position is valid, if not reset it
        if (isNaN(gameState.paddle.x) || gameState.paddle.x === undefined) {
            console.log('Fixing invalid paddle position');
            gameState.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
        }
        
        // Only process if p5Instance is defined
        if (!p5Instance) return;
        
        // Update paddle position
        if (buttonStates.paddleLeft) {
            console.log('Moving paddle LEFT', gameState.paddle.x);
            gameState.paddle.x = constrain(
                gameState.paddle.x - 10, 
                0, 
                CANVAS_WIDTH - PADDLE_WIDTH
            );
        }
        
        if (buttonStates.paddleRight) {
            console.log('Moving paddle RIGHT', gameState.paddle.x);
            gameState.paddle.x = constrain(
                gameState.paddle.x + 10, 
                0, 
                CANVAS_WIDTH - PADDLE_WIDTH
            );
        }
    }, updateInterval);
}

// Initialize sounds
function initSounds() {
    sounds.paddle = document.getElementById('sound-paddle');
    sounds.block = document.getElementById('sound-block');
    sounds.tetris = document.getElementById('sound-tetris');
    sounds.gameover = document.getElementById('sound-gameover');
    sounds.ballLost = document.getElementById('sound-ball-lost');
    sounds.start = document.getElementById('sound-start');
}

// Play sound with error handling
function playSound(sound) {
    try {
        if (sound) {
            sound.currentTime = 0; // Reset to start
            sound.play().catch(e => console.log('Error playing sound:', e));
        }
    } catch (e) {
        console.log('Error with sound:', e);
    }
}

// Add a new function to find landing position for pieces
function findLandingPosition(piece) {
    if (!piece) return null;
    
    // Clone the piece to simulate dropping
    const ghostPiece = {
        x: piece.x,
        y: piece.y,
        shape: piece.shape.map(row => [...row]), // Deep copy the shape
        color: piece.color,
        hasLanded: false
    };
    
    // Find the lowest row that contains a block
    let lowestBlockRow = -1;
    for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
        if (gameState.grid[row].some(cell => cell !== null)) {
            lowestBlockRow = row;
            break;
        }
    }
    
    // Move ghost piece down until collision
    let canMoveDown = true;
    while (canMoveDown) {
        ghostPiece.y++;
        
        // Check for collision with blocks or grid limits
        if (wouldCollide(ghostPiece)) {
            ghostPiece.y--; // Move back up to last valid position
            canMoveDown = false;
        }
    }
    
    return ghostPiece;
}

// Check if a piece would collide at its current position
function wouldCollide(piece) {
    if (!piece) return false;
    
    const shape = piece.shape;
    
    // Find the lowest row that contains a block
    let lowestBlockRow = -1;
    for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
        if (gameState.grid[row].some(cell => cell !== null)) {
            lowestBlockRow = row;
            break;
        }
    }
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] > 0) {
                const gridX = piece.x + x;
                const gridY = piece.y + y;
                
                // Check boundaries
                if (gridX < 0 || gridX >= GRID_WIDTH || gridY >= GRID_HEIGHT) {
                    return true;
                }
                
                // Check collision with blocks in the grid
                if (gridY >= 0 && gameState.grid[gridY] && gameState.grid[gridY][gridX]) {
                    return true;
                }
                
                // Prevent falling below the lowest block row
                if (lowestBlockRow >= 0 && gridY > lowestBlockRow) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Modified p.draw function to add warning flash
function drawGrid(p) {
    // Check if we should show shift warning
    const currentTime = p5Instance.millis();
    const showWarning = gameState.shiftWarning && currentTime < gameState.shiftWarningUntil;
    
    // Grid color - red during warning, normal blue otherwise
    const gridColor = showWarning 
        ? p.color(255, 0, 0, 150 + Math.sin(currentTime * 0.05) * 75) // Pulsing red during warning
        : p.color(0, 0, 250, 75); // Normal blue
    
    p.stroke(gridColor);
    p.strokeWeight(1);
    
    // Draw vertical lines
    for (let x = 0; x <= CANVAS_WIDTH; x += BLOCK_SIZE) {
        p.line(x, 0, x, CANVAS_HEIGHT);
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= CANVAS_HEIGHT; y += BLOCK_SIZE) {
        p.line(0, y, CANVAS_WIDTH, y);
    }
    
    // Add a red overlay during warning for extra emphasis
    if (showWarning) {
        // Calculate a pulsing alpha value
        const warningAlpha = 30 + Math.sin(currentTime * 0.01) * 20;
        
        // Draw a semi-transparent red overlay
        p.noStroke();
        p.fill(255, 0, 0, warningAlpha);
        p.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

// New function to shift all blocks up one row
function shiftBlocksUp() {
    // Check if there's already blocks at the top row, which would end the game
    if (gameState.grid[0].some(cell => cell !== null)) {
        gameState.ballsRemaining = 0; // Game over
        return;
    }
    
    // Show shift warning effect
    gameState.shiftWarning = true;
    gameState.shiftWarningUntil = p5Instance.millis() + 500; // 500ms warning
    
    // If there's a current piece, move it up by one row to maintain relative position
    if (gameState.currentPiece) {
        gameState.currentPiece.y -= 1;
        
        // If this creates a collision, it's game over
        if (wouldCollide(gameState.currentPiece)) {
            gameState.ballsRemaining = 0; // Game over
            return;
        }
    }
    
    // Shift all rows up by one
    for (let row = 0; row < GRID_HEIGHT - 1; row++) {
        gameState.grid[row] = [...gameState.grid[row + 1]];
    }
    
    // Create empty bottom row
    gameState.grid[GRID_HEIGHT - 1] = Array(GRID_WIDTH).fill(null);
    
    // Also update gridBeforeLastPiece if it exists
    if (gameState.gridBeforeLastPiece) {
        // Shift it up too
        for (let row = 0; row < GRID_HEIGHT - 1; row++) {
            gameState.gridBeforeLastPiece[row] = [...gameState.gridBeforeLastPiece[row + 1]];
        }
        
        // Create empty bottom row
        gameState.gridBeforeLastPiece[GRID_HEIGHT - 1] = Array(GRID_WIDTH).fill(null);
    }
    
    // Highlight all rows to show the shift
    gameState.highlightRows = Array.from({length: GRID_HEIGHT}, (_, i) => i);
    gameState.highlightUntil = p5Instance.millis() + 500; // Brief highlight
} 