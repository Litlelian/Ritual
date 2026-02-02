import React from 'react';

const ProjectileLayer = ({ projectiles }) => {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 25, // 玩家(10) 瞄準線(20)
        pointerEvents: 'none'
      }}
    >
      {projectiles.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r="6" // 子彈半徑
          fill="#ff00ff" // 魔法球顏色 (洋紅色)
          stroke="white"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
};

export default ProjectileLayer;