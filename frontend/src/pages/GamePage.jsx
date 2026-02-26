// src/pages/GamePage.jsx
import React from 'react';
import Map from '../components/Map';
import MAP_CONFIG from '../configs/map/map_test.json';
import soldierImage from '../assets/Soldier.png';
import { useGameEngine } from '../hooks/useGameEngine';

const MAP_DATA = MAP_CONFIG['test'];
const TILE_SIZE = 40;
const SPEED = 1;
const PROJECTILE_SPEED = 5;
const FIRE_COOLDOWN = 1000;

const GamePage = () => {
  const { 
    pos, 
    facing, 
    isMoving, 
    mousePos, 
    projectiles, 
    mapContainerRef 
  } = useGameEngine(MAP_DATA, TILE_SIZE, SPEED, PROJECTILE_SPEED, FIRE_COOLDOWN);

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '40px' }}>
      <div ref={mapContainerRef}>
        <Map 
          mapData={MAP_DATA} 
          playerPos={pos} 
          sprite={soldierImage}
          facing={facing}
          isMoving={isMoving}
          mousePos={mousePos}
          projectiles={projectiles}
        />
      </div>
    </div>
  );
};

export default GamePage;