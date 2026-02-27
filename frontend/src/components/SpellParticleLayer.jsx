import React from 'react';

const SpellParticleLayer = ({ particles, playerPos, tileSize = 40, isGathering }) => {
  if (!isGathering || !particles || particles.length === 0) return null;

  const playerCenterX = playerPos.x + tileSize / 2;
  const playerCenterY = playerPos.y + tileSize / 2;

  return (
    <div 
      style={{ 
        position: 'absolute', 
        top: 0, left: 0, 
        width: '100%', height: '100%', 
        pointerEvents: 'none', 
        zIndex: 10
      }}
    >
      {particles.map((p, index) => {
        // 將相對座標轉換為絕對座標
        const particleX = playerCenterX + p.x;
        const particleY = playerCenterY + p.y;

        return (
          <div
            key={`spell-particle-${index}`}
            style={{
              position: 'absolute',
              left: `${particleX}px`,
              top: `${particleY}px`,
              width: '4px',
              height: '4px',
              backgroundColor: '#00d4ff',
              borderRadius: '50%',
              boxShadow: '0 0 10px 3px rgba(0, 212, 255, 0.8)',
              transform: 'translate(-50%, -50%)',
              transition: 'left 0.03s linear, top 0.03s linear'
            }}
          />
        );
      })}
    </div>
  );
};

export default SpellParticleLayer;