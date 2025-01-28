import React, { useState, useEffect, useCallback } from 'react';

// Constants
const GRAVITY = 0.8;
const MIN_JUMP_FORCE = -15;
const MAX_JUMP_FORCE = -25;
const MOVE_SPEED = 5;
const GROUND_HEIGHT = 480;
const DUCK_SIZE = 40;
const CHARGE_RATE = 1.5;
const INITIAL_LIVES = 3;

const GameScreen = () => {
  const [gameState, setGameState] = useState('start');
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [duckPosition, setDuckPosition] = useState({ x: 50, y: GROUND_HEIGHT - DUCK_SIZE });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [isJumping, setIsJumping] = useState(false);
  const [jumpCharge, setJumpCharge] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [movement, setMovement] = useState({ left: false, right: false });
  const [currentLevel, setCurrentLevel] = useState(0);
  const [cameraOffset, setCameraOffset] = useState(0);

  const levels = [
    {
      obstacles: [
        { type: 'block', x: 200, width: 40, height: 40 },
        { type: 'block', x: 400, width: 40, height: 60 },
        { type: 'block', x: 600, width: 40, height: 50 }
      ],
      groundWidth: 1200
    },
    {
      obstacles: [
        { type: 'block', x: 200, width: 40, height: 40 },
        { type: 'block', x: 500, width: 40, height: 60 },
        { type: 'block', x: 700, width: 40, height: 80 }
      ],
      groundWidth: 1500
    },
    {
      obstacles: [
        { type: 'block', x: 300, width: 40, height: 60 },
        { type: 'gap', x: 600, width: 100 },
        { type: 'block', x: 800, width: 40, height: 70 },
        { type: 'finish', x: 1800, width: 40, height: 120 }
      ],
      groundWidth: 1840
    }
  ];

  const handleKeyDown = useCallback((e) => {
    if (gameState !== 'playing') return;
    
    switch (e.key) {
      case 'ArrowLeft':
        setMovement(m => ({ ...m, left: true }));
        break;
      case 'ArrowRight':
        setMovement(m => ({ ...m, right: true }));
        break;
      case ' ':
        if (!isJumping && !isCharging) {
          setIsCharging(true);
          setJumpCharge(0);
        }
        break;
      default:
        break;
    }
  }, [gameState, isJumping, isCharging]);

  const handleKeyUp = useCallback((e) => {
    switch (e.key) {
      case 'ArrowLeft':
        setMovement(m => ({ ...m, left: false }));
        break;
      case 'ArrowRight':
        setMovement(m => ({ ...m, right: false }));
        break;
      case ' ':
        if (isCharging && !isJumping) {
          const jumpForce = Math.min(MIN_JUMP_FORCE - jumpCharge, MAX_JUMP_FORCE);
          setVelocity(v => ({ ...v, y: jumpForce }));
          setIsJumping(true);
          setIsCharging(false);
          setJumpCharge(0);
        }
        break;
      default:
        break;
    }
  }, [isCharging, isJumping, jumpCharge]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const moveX = movement.right ? MOVE_SPEED : movement.left ? -MOVE_SPEED : 0;
    setVelocity(v => ({ ...v, x: moveX }));
  }, [movement]);

  useEffect(() => {
    if (isCharging && !isJumping) {
      const chargeInterval = setInterval(() => {
        setJumpCharge(current => Math.min(current + CHARGE_RATE, Math.abs(MAX_JUMP_FORCE - MIN_JUMP_FORCE)));
      }, 16);
      return () => clearInterval(chargeInterval);
    }
  }, [isCharging, isJumping]);

  useEffect(() => {
    if (gameState === 'playing') {
      const cameraDeadZone = 300;
      if (duckPosition.x > cameraDeadZone) {
        setCameraOffset(Math.max(0, duckPosition.x - cameraDeadZone));
      }
    }
  }, [duckPosition.x, gameState]);

  const checkCollision = useCallback(() => {
    if (!levels[currentLevel]) return false;
    
    const currentObstacles = levels[currentLevel].obstacles;
    for (const obstacle of currentObstacles) {
      if (obstacle.type === 'block' || obstacle.type === 'gap') {
        const obstacleY = GROUND_HEIGHT - (obstacle.type === 'gap' ? 80 : obstacle.height);
        if (duckPosition.x + DUCK_SIZE > obstacle.x && 
            duckPosition.x < obstacle.x + obstacle.width) {
          if (obstacle.type === 'gap' && duckPosition.y + DUCK_SIZE > GROUND_HEIGHT + 20) {
            return true;
          } else if (obstacle.type === 'block' && duckPosition.y + DUCK_SIZE > obstacleY) {
            return true;
          }
        }
      }
    }
    return false;
  }, [duckPosition, currentLevel]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      setDuckPosition(currentPos => {
        const newY = isJumping 
          ? Math.min(currentPos.y + velocity.y, GROUND_HEIGHT - DUCK_SIZE) 
          : GROUND_HEIGHT - DUCK_SIZE;
        const newX = currentPos.x + velocity.x;
        
        if (newY >= GROUND_HEIGHT - DUCK_SIZE && isJumping) {
          setIsJumping(false);
          setVelocity(v => ({ ...v, y: 0 }));
        }

        return {
          x: Math.max(0, Math.min(newX, levels[currentLevel].groundWidth - DUCK_SIZE)),
          y: newY
        };
      });

      if (isJumping) {
        setVelocity(currentVel => ({
          ...currentVel,
          y: currentVel.y + GRAVITY
        }));
      }

      if (checkCollision()) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState('dead');
            return 0;
          }
          setDuckPosition({ x: 50, y: GROUND_HEIGHT - DUCK_SIZE });
          setCameraOffset(0);
          return newLives;
        });
      }

      if (duckPosition.x > levels[currentLevel].groundWidth - 100 && currentLevel === levels.length - 1) {
        setGameState('win');
      } else if (duckPosition.x > levels[currentLevel].groundWidth - 100) {
        setCurrentLevel(prev => prev + 1);
        setDuckPosition({ x: 50, y: GROUND_HEIGHT - DUCK_SIZE });
        setCameraOffset(0);
      }
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameState, velocity, checkCollision, isJumping, currentLevel, duckPosition.x, levels]);

  const resetGame = () => {
    setDuckPosition({ x: 50, y: GROUND_HEIGHT - DUCK_SIZE });
    setVelocity({ x: 0, y: 0 });
    setIsJumping(false);
    setIsCharging(false);
    setJumpCharge(0);
    setMovement({ left: false, right: false });
    setCurrentLevel(0);
    setCameraOffset(0);
    setLives(INITIAL_LIVES);
    setGameState('playing');
  };

  return (
    <div className="relative w-full h-screen bg-blue-300 overflow-hidden">
      {/* Fixed Hearts UI */}
      {gameState === 'playing' && (
        <div className="fixed top-4 right-4 flex gap-2 z-50">
          {[...Array(INITIAL_LIVES)].map((_, i) => (
            <div key={i} className="w-6 h-6 text-2xl">
              {i < lives ? '❤️' : '🤍'}
            </div>
          ))}
        </div>
      )}

      {gameState === 'start' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-4">START</h1>
          <button onClick={resetGame} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Play
          </button>
        </div>
      )}

      {gameState === 'dead' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-4">UM...</h1>
          <button onClick={resetGame} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
            Try Again
          </button>
        </div>
      )}

      {gameState === 'win' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-4">YIPPEE!</h1>
          <button onClick={resetGame} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Play Again
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div 
          className="relative w-full h-screen"
          style={{
            transform: `translateX(-${cameraOffset}px)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          {/* Background */}
          <div className="absolute bottom-0 bg-yellow-800" style={{ width: `${levels[currentLevel].groundWidth}px`, height: '80px' }} />
          
          {/* Obstacles and Flag */}
          {levels[currentLevel].obstacles.map((obstacle, index) => (
            <div
              key={index}
              className={`absolute ${
                obstacle.type === 'block' ? 'bg-green-600' : 
                obstacle.type === 'finish' ? 'bg-transparent' : ''
              }`}
              style={{
                left: obstacle.x,
                bottom: 80,
                width: obstacle.width,
                height: obstacle.height
              }}
            >
              {obstacle.type === 'finish' && (
                <>
                  <div className="absolute bottom-0 left-1/2 w-2 h-full bg-gray-800" />
                  <div className="absolute top-4 left-1/2 w-16 h-12">
                    <div 
                      className="w-full h-full bg-red-600"
                      style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Duck */}
          <div 
            className="absolute"
            style={{
              left: duckPosition.x,
              top: duckPosition.y,
              transform: `scaleX(${velocity.x >= 0 ? 1 : -1})`
            }}
          >
            {/* Duck body */}
            <div className="absolute w-12 h-10 bg-yellow-300 rounded-3xl transform -rotate-6" />
            
            {/* Duck head */}
            <div className="absolute -top-2 right-0 w-6 h-7">
              <div className="w-full h-full bg-yellow-300 rounded-full" />
              
              {/* Duck beak */}
              <div 
                className="absolute top-2 right-[-10px] w-10 h-3 bg-orange-400 rounded-r-lg"
                style={{ clipPath: 'polygon(0 0, 100% 30%, 100% 70%, 0 100%)' }}
              />
              
              {/* Duck eye */}
              <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
            </div>
            
            {/* Duck feet */}
            <div className="absolute bottom-[-6px] left-2">
              <div className="w-3 h-4 bg-orange-400" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              <div className="absolute bottom-0 left-[-4px] w-10 h-2 bg-orange-400 rounded-full" />
            </div>
            <div className="absolute bottom-[-6px] right-2">
              <div className="w-3 h-4 bg-orange-400" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              <div className="absolute bottom-0 left-[-4px] w-10 h-2 bg-orange-400 rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;