import React from 'react';
import Map from '../components/Map';
import SpellPanel from '../components/SpellPanel';
import MAP_CONFIG from '../configs/map/map_test.json';
import soldierImage from '../assets/Soldier.png';

import { useGameEngine } from '../hooks/useGameEngine';
import { useSpell } from '../hooks/useSpell';

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
    mapContainerRef,
    spawnProjectile
  } = useGameEngine(MAP_DATA, TILE_SIZE, SPEED, PROJECTILE_SPEED, FIRE_COOLDOWN);

  const { 
    particles, 
    isGathering, 
    handleSpellGenerated 
  } = useSpell(spawnProjectile, pos, facing, mousePos);

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '40px', alignItems: 'center'}}>
      <div ref={mapContainerRef}>
        <Map 
          mapData={MAP_DATA} 
          playerPos={pos} 
          sprite={soldierImage}
          facing={facing}
          isMoving={isMoving}
          mousePos={mousePos}
          projectiles={projectiles}
          particles={particles} 
          isGathering={isGathering}
        />
      </div>
      <div><SpellPanel onSpellGenerated={handleSpellGenerated} /></div>
    </div>
  );
};

export default GamePage;