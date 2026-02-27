import React from 'react';

const ProjectileLayer = React.memo(({ projectiles }) => {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 25, 
        pointerEvents: 'none',
        overflow: 'visible' 
      }}
    >
      {projectiles.map((p) => {
        // Phase 2: 如果這顆子彈是 AI 推論出來的魔法陣
        if (p.type === 'MAGIC_ARRAY' && p.shape) {
          return (
            // 使用群組 <g>，將所有粒子統一平移到子彈當前位置
            <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
              {p.shape.map((particle, idx) => (
                <circle
                  key={`${p.id}-particle-${idx}`}
                  cx={particle.x}
                  cy={particle.y}
                  r="2"
                  fill="#00d4ff"
                  style={{
                    filter: 'drop-shadow(0px 0px 3px rgba(0, 212, 255, 0.8))'
                  }}
                />
              ))}
            </g>
          );
        }

        return (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y} 
            r="6"
            fill="#ff00ff"
            stroke="white"
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
});

export default ProjectileLayer;