import { useState, useEffect, useRef, useCallback } from 'react';

export const useGameEngine = (MAP_DATA, TILE_SIZE, SPEED, PROJECTILE_SPEED, FIRE_COOLDOWN) => {
  // 所有 State (畫面需要的資料)
  const [pos, setPos] = useState({ x: 40, y: 40 });
  const [facing, setFacing] = useState(1);
  const [isMoving, setIsMoving] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [projectiles, setProjectiles] = useState([]);

  // 所有 Ref (幕後運算的變數)
  const mapContainerRef = useRef(null);
  const requestRef = useRef();
  const playerStatsRef = useRef({ cooldown: FIRE_COOLDOWN, lastShotTime: 0 });
  const keysPressed = useRef({});
  const posRef = useRef(pos);
  const mouseRef = useRef(mousePos);
  
  // 同步最新狀態給 Ref
  posRef.current = pos;
  mouseRef.current = mousePos;

  // 碰撞邏輯
  const checkCollision = (nextX, nextY) => {
    const playerSize = TILE_SIZE * 0.8;
    const margin = (TILE_SIZE - playerSize) / 2;
    const corners = [
      { x: nextX + margin, y: nextY + margin },
      { x: nextX + TILE_SIZE - margin, y: nextY + margin },
      { x: nextX + margin, y: nextY + TILE_SIZE - margin },
      { x: nextX + TILE_SIZE - margin, y: nextY + TILE_SIZE - margin }
    ];
    return corners.some(c => {
      const gridX = Math.floor(c.x / TILE_SIZE);
      const gridY = Math.floor(c.y / TILE_SIZE);
      return MAP_DATA[gridY]?.[gridX] === 1;
    });
  };

  const spawnProjectile = useCallback((config = {}) => {
    const { 
      type = 'NORMAL', // 預設是普通攻擊
      shape = null,    // 預設沒有形狀 (只有 MAGIC_ARRAY 會有)
      targetX, 
      targetY, 
      speed = PROJECTILE_SPEED 
    } = config;

    const currentPos = posRef.current;
    
    // 計算發射起點 (主角中心)
    const startX = currentPos.x + TILE_SIZE / 2;
    const startY = currentPos.y + TILE_SIZE / 2;
    
    // 計算飛行方向向量
    const dx = targetX - startX;
    const dy = targetY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;

    const vx = (dx / length) * speed;
    const vy = (dy / length) * speed;

    // 保留了 x, y 讓 ProjectileLayer 讀取
    setProjectiles(prev => [...prev, { 
      id: Date.now() + Math.random(), // 加上 random 避免同一毫秒發射多顆 ID 重複
      type, 
      shape, 
      x: startX, 
      y: startY, 
      vx, 
      vy 
    }]);
  }, [PROJECTILE_SPEED, TILE_SIZE]);

  // 發射邏輯
  const handleShoot = useCallback(() => {
    const now = Date.now();
    const stats = playerStatsRef.current;
    if (now - stats.lastShotTime < stats.cooldown) return; 
    stats.lastShotTime = now;

    const currentMouse = mouseRef.current;
    
    // 呼叫通用的 spawnProjectile，目標是滑鼠當前位置
    spawnProjectile({
      type: 'NORMAL',
      targetX: currentMouse.x,
      targetY: currentMouse.y,
      speed: PROJECTILE_SPEED
    });
  }, [spawnProjectile, PROJECTILE_SPEED]);

  // 更新迴圈
  const update = useCallback(() => {
    setPos(prev => {
      // ... (保留你原本的移動控制與碰撞檢查邏輯，完全不用改) ...
      let moveX = 0; let moveY = 0;
      if (keysPressed.current['w'] || keysPressed.current['ArrowUp']) moveY -= 1;
      if (keysPressed.current['s'] || keysPressed.current['ArrowDown']) moveY += 1;
      if (keysPressed.current['a'] || keysPressed.current['ArrowLeft']) moveX -= 1;
      if (keysPressed.current['d'] || keysPressed.current['ArrowRight']) moveX += 1;

      const moving = moveX !== 0 || moveY !== 0;
      setIsMoving(moving);
      
      if (moveX > 0) setFacing(1);  
      if (moveX < 0) setFacing(-1); 

      if (moving) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= length;
        moveY /= length;
        
        const nextX = prev.x + moveX * SPEED;
        const nextY = prev.y + moveY * SPEED;
        
        if (!checkCollision(nextX, nextY)) return { x: nextX, y: nextY };
        if (!checkCollision(nextX, prev.y)) return { x: nextX, y: prev.y };
        if (!checkCollision(prev.x, nextY)) return { x: prev.x, y: nextY };
      }
      return prev;
    });

    setProjectiles(prevProjs => {
      // ... (保留你原本的子彈飛行與邊界/牆壁碰撞過濾，完全不用改) ...
      return prevProjs
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy }))
        .filter(p => {
          const mapWidth = MAP_DATA[0].length * TILE_SIZE;
          const mapHeight = MAP_DATA.length * TILE_SIZE;
          if (p.x < 0 || p.x > mapWidth || p.y < 0 || p.y > mapHeight) return false;
          
          const gridX = Math.floor(p.x / TILE_SIZE);
          const gridY = Math.floor(p.y / TILE_SIZE);
          if (MAP_DATA[gridY]?.[gridX] === 1) return false;

          return true;
        });
    });

    requestRef.current = requestAnimationFrame(update);
  }, [MAP_DATA, SPEED, TILE_SIZE]);

  // 事件綁定
  useEffect(() => {
    const handleKeyDown = (e) => { keysPressed.current[e.key] = true; };
    const handleKeyUp = (e) => { keysPressed.current[e.key] = false; };
    const handleMouseMove = (e) => {
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    };
    const handleMouseDown = (e) => {
      if (e.button === 0) handleShoot();
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

  return {
    pos,
    facing,
    isMoving,
    mousePos,
    projectiles,
    mapContainerRef, // 跟外面的 div 綁定
    spawnProjectile // ✨ 暴露給 GamePage 和 useSpell 使用
  };
};