import React from 'react';

const MapLayer = React.memo(({ mapData, tileSize }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${mapData[0].length}, ${tileSize}px)`,
    }}>
      {mapData.map((row, y) => 
        row.map((tile, x) => (
          <div
            key={`${x}-${y}`}
            style={{
              width: tileSize,
              height: tileSize,
              backgroundColor: tile === 1 ? '#444' : '#222',
              border: '1px solid rgba(255,255,255,0.05)',
              boxSizing: 'border-box'
            }}
          />
        ))
      )}
    </div>
  );
});

export default MapLayer;