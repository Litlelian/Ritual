import React, { useEffect, useState } from 'react';
import SightOverlay from './SightOverlay';
import ProjectileLayer from './ProjectileLayers';

const TILE_SIZE = 40;
const SPRITE_SIZE = 100;   // spirit圖切割問題
const ANIMATION_SPEED = 100;
const ANIMATION_FRAME_NUM = {
  0: 6,
  1: 8
}

const Map = ({ mapData, playerPos, sprite, facing, isMoving, mousePos, projectiles }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, ANIMATION_SPEED);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTick(0);
  }, [isMoving]);
  
  const row = isMoving ? 1 : 0;
  const maxFrames = ANIMATION_FRAME_NUM[row];
  const currentFrame = tick % maxFrames;
  const x = playerPos?.x || 0;
  const y = playerPos?.y || 0;

  return (
    <div style={{
      position: 'relative',
      width: mapData[0].length * TILE_SIZE,
      height: mapData.length * TILE_SIZE,
      backgroundColor: '#222',
      border: '4px solid #444',
      overflow: 'hidden'
    }}>
      {/* 地圖背景 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${mapData[0].length}, ${TILE_SIZE}px)`,
      }}>
        {mapData.map((row, y) => 
          row.map((tile, x) => (
            <div key={`${x}-${y}`} style={{
              width: TILE_SIZE, height: TILE_SIZE,
              backgroundColor: tile === 1 ? '#444' : '#222',
              border: '1px solid rgba(255,255,255,0.05)',
              boxSizing: 'border-box'
            }} />
          ))
        )}
      </div>

      {/* 發射物 */}
      <ProjectileLayer projectiles={projectiles} />

      {/* 瞄準縣 */}
      <SightOverlay 
        playerPos={playerPos} 
        mousePos={mousePos} 
        tileSize={TILE_SIZE} 
      />

      {/* 玩家 */}
      <div style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: TILE_SIZE,
        height: TILE_SIZE,
        zIndex: 10,
        pointerEvents: 'none',
      }}>
        {/* 內層圖片：負責「顯示與置中」 */}
        <div style={{
          position: 'absolute',
          width: SPRITE_SIZE,
          height: SPRITE_SIZE,
          backgroundImage: `url(${sprite})`,
          imageRendering: 'pixelated',
          backgroundRepeat: 'no-repeat',
          
          // 切割圖片 (背景位移)
          backgroundPosition: `-${currentFrame * SPRITE_SIZE}px -${row * SPRITE_SIZE}px`,
          
          // 修正區：
          top: `-${(SPRITE_SIZE - TILE_SIZE) / 2}px`, 
          left: `-${(SPRITE_SIZE - TILE_SIZE) / 2}px`,
          
          transform: `scaleX(${facing}) scale(1.5)`, 
          transformOrigin: 'center center'
        }} />
      </div>
    </div>
  );
};

export default Map;