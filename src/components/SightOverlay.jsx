import React from 'react';

// 你可以在這裡調整線的設定
const SIGHT_LENGTH = 50;
const LINE_COLOR = "rgba(255, 50, 50, 0.6)";

const SightOverlay = ({ playerPos, mousePos, tileSize }) => {
  const x = playerPos?.x || 0;
  const y = playerPos?.y || 0;

  const startX = x + tileSize / 2;
  const startY = y + tileSize / 2;

  const dx = mousePos.x - startX;
  const dy = mousePos.y - startY;
  const angle = Math.atan2(dy, dx);

  const endX = startX + SIGHT_LENGTH * Math.cos(angle);
  const endY = startY + SIGHT_LENGTH * Math.sin(angle);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 20,
        pointerEvents: 'none'
      }}
    >
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={LINE_COLOR}
        strokeWidth="2"
        strokeDasharray="5,5" // 虛線效果
        strokeLinecap="round"
      />
      
      {/* 你未來可以在這裡加更多東西，例如：準心圈圈 */}
      {/* <circle cx={endX} cy={endY} r="5" fill="red" /> */}
    </svg>
  );
};

export default SightOverlay;