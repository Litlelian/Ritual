import React, { useEffect, useState } from 'react';
import MapLayer from './MapLayer';
import SightOverlay from './SightOverlay';
import ProjectileLayer from './ProjectileLayers';
import Player from './Players';

const TILE_SIZE = 40;
const ANIMATION_SPEED = 100;

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

  return (
    <div style={{
      position: 'relative',
      width: mapData[0].length * TILE_SIZE,
      height: mapData.length * TILE_SIZE,
      backgroundColor: '#222',
      border: '4px solid #444',
      overflow: 'hidden',
      cursor: 'crosshair',
      userSelect: 'none',          // 禁止文字/圖片反白選取
      WebkitUserSelect: 'none',    // Chrome/Safari 專用
      WebkitUserDrag: 'none',      // 禁止圖片被拖曳出鬼影
    }}>
      {/* 地圖背景 */}
      <MapLayer mapData={mapData} tileSize={TILE_SIZE} />

      {/* 發射物 */}
      <ProjectileLayer projectiles={projectiles} />

      {/* 瞄準縣 */}
      <SightOverlay 
        playerPos={playerPos} 
        mousePos={mousePos} 
        tileSize={TILE_SIZE} 
      />

      {/* 玩家 */}
      <Player 
        pos={playerPos}
        sprite={sprite}
        facing={facing}
        isMoving={isMoving}
        tick={tick}
        tileSize={TILE_SIZE}
      />
    </div>
  );
};

export default Map;