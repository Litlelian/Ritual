import React, { useState, useEffect, useRef } from 'react';
import Map from '../components/Map';
import MAP_CONFIG from '../configs/map/map_test.json';
import soldierImage from '../assets/Soldier.png';

const MAP_DATA = MAP_CONFIG['test']
const TILE_SIZE = 40;
const SPEED = 1;
const PROJECTILE_SPEED = 5;

const GamePage = () => {
  // 玩家座標現在是像素值
  const [pos, setPos] = useState({ x: 40, y: 40 });
  const [facing, setFacing] = useState(1);
  const [isMoving, setIsMoving] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // 發射物
  const [projectiles, setProjectiles] = useState([]);

  const mapContainerRef = useRef(null);
  const requestRef = useRef();
  const keysPressed = useRef({}); // 紀錄目前被按住的所有按鍵
  const posRef = useRef(pos);
  const mouseRef = useRef(mousePos);
  posRef.current = pos;
  mouseRef.current = mousePos;

  // 核心：碰撞偵測函數
  const checkCollision = (nextX, nextY) => {
    const playerSize = TILE_SIZE * 0.8; // 假設玩家碰撞體稍小於格子
    const margin = (TILE_SIZE - playerSize) / 2;
    
    // 計算玩家四個角的座標
    const corners = [
      { x: nextX + margin, y: nextY + margin }, // 左上
      { x: nextX + TILE_SIZE - margin, y: nextY + margin }, // 右上
      { x: nextX + margin, y: nextY + TILE_SIZE - margin }, // 左下
      { x: nextX + TILE_SIZE - margin, y: nextY + TILE_SIZE - margin } // 右下
    ];

    // 只要任一角撞到牆(1)，就回傳 true
    return corners.some(c => {
      const gridX = Math.floor(c.x / TILE_SIZE);
      const gridY = Math.floor(c.y / TILE_SIZE);
      return MAP_DATA[gridY]?.[gridX] === 1;
    });
  };

  const handleShoot = () => {
    const currentPos = posRef.current; 
    const currentMouse = mouseRef.current;

    const startX = currentPos.x + TILE_SIZE / 2;
    const startY = currentPos.y + TILE_SIZE / 2;

    const dx = currentMouse.x - startX;
    const dy = currentMouse.y - startY;

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return; // 避免除以 0

    const vx = (dx / length) * PROJECTILE_SPEED;
    const vy = (dy / length) * PROJECTILE_SPEED;

    const newProjectile = {
      id: Date.now(), // 用時間戳當簡單 ID
      x: startX,
      y: startY,
      vx,
      vy
    };
    setProjectiles(prev => [...prev, newProjectile]);
  };

  const update = () => {
    setPos(prev => {
      let moveX = 0;
      let moveY = 0;

      // 1. 偵測按鍵輸入方向
      if (keysPressed.current['w'] || keysPressed.current['ArrowUp']) moveY -= 1;
      if (keysPressed.current['s'] || keysPressed.current['ArrowDown']) moveY += 1;
      if (keysPressed.current['a'] || keysPressed.current['ArrowLeft']) moveX -= 1;
      if (keysPressed.current['d'] || keysPressed.current['ArrowRight']) moveX += 1;

      // 判斷是否在移動
      const moving = moveX !== 0 || moveY !== 0;
      setIsMoving(moving);
      // 判斷左右方向 (只在有左右移動時改變)
      if (moveX > 0) setFacing(1);  // 右
      if (moveX < 0) setFacing(-1); // 左

      // 2. 向量歸一化 (Vector Normalization)
      if (moveX !== 0 && moveY !== 0) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= length;
        moveY /= length;
      }

      if (moving) {
        if (moveX !== 0 && moveY !== 0) {
          const length = Math.sqrt(moveX * moveX + moveY * moveY);
          moveX /= length;
          moveY /= length;
        }
        const nextX = prev.x + moveX * SPEED;
        const nextY = prev.y + moveY * SPEED;
        
        if (!checkCollision(nextX, nextY)) return { x: nextX, y: nextY };
        if (!checkCollision(nextX, prev.y)) return { x: nextX, y: prev.y };
        if (!checkCollision(prev.x, nextY)) return { x: prev.x, y: nextY };
      }

      return prev;
    });

    // 發射物碰撞邏輯
    setProjectiles(prevProjs => {
      return prevProjs
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy
        }))
        .filter(p => {
          // A. 邊界檢查
          const mapWidth = MAP_DATA[0].length * TILE_SIZE;
          const mapHeight = MAP_DATA.length * TILE_SIZE;
          if (p.x < 0 || p.x > mapWidth || p.y < 0 || p.y > mapHeight) {
            return false;
          }

          // B. 牆壁檢查
          // 把子彈座標轉換回網格座標
          const gridX = Math.floor(p.x / TILE_SIZE);
          const gridY = Math.floor(p.y / TILE_SIZE);
          if (MAP_DATA[gridY]?.[gridX] === 1) {
            return false;
          }

          // C. 未來擴充：撞到人檢查

          return true;
        });
    });

    requestRef.current = requestAnimationFrame(update);
  };

  // 玩家操作
  useEffect(() => {
    const handleKeyDown = (e) => { keysPressed.current[e.key] = true; };
    const handleKeyUp = (e) => { keysPressed.current[e.key] = false; };
    const handleMouseMove = (e) => {
      if (mapContainerRef.current) {
        // 取得地圖容器在瀏覽器畫面上的位置與大小資訊
        const rect = mapContainerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const relativeY = e.clientY - rect.top;
        
        setMousePos({ x: relativeX, y: relativeY });
      }
    };
    const handleMouseDown = (e) => {
      // 左鍵點擊 (button 0)
      if (e.button === 0) {
        handleShoot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

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