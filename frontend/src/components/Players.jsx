import React from 'react';

const Player = React.memo(({ pos, sprite, facing, isMoving, tick, tileSize }) => {
  const ANIMATION_FRAME_NUM = {
    0: 6,
    1: 8
  }
  const row = isMoving ? 1 : 0;
  const SPRITE_SIZE = 100;   // spirit圖切割問題
  const maxFrames = ANIMATION_FRAME_NUM[row];
  const currentFrame = tick % maxFrames;

  // 建議加上 transform 優化
  const x = pos?.x || 0;
  const y = pos?.y || 0;

  return (
    <div style={{
      position: 'absolute',
      // 使用 transform 效能較好，也方便 GPU 加速
      top: 0,
      left: 0,
      transform: `translate(${x}px, ${y}px)`,
      width: tileSize,
      height: tileSize,
      zIndex: 10,
      pointerEvents: 'none',
      willChange: 'transform', // 瀏覽器優化提示
    }}>
      <div style={{
        position: 'absolute',
        width: SPRITE_SIZE,
        height: SPRITE_SIZE,
        backgroundImage: `url(${sprite})`,
        imageRendering: 'pixelated',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `-${currentFrame * SPRITE_SIZE}px -${row * SPRITE_SIZE}px`,
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scaleX(${facing}) scale(1.5)`,
        transformOrigin: 'center center'
      }} />
    </div>
  );
});

export default Player;