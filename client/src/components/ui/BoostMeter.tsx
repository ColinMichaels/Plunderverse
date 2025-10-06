import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

interface BoostMeterProps {
  boostMeterRef: React.MutableRefObject<number>;
  maxBoost: number;
  isBoostingRef: React.MutableRefObject<boolean>;
}

export function BoostMeter({ boostMeterRef, maxBoost, isBoostingRef }: BoostMeterProps) {
  const meterRef = useRef<HTMLDivElement>(null);
  const percentageRef = useRef<HTMLSpanElement>(null);
  
  useFrame(() => {
    if (meterRef.current && percentageRef.current) {
      const percentage = (boostMeterRef.current / maxBoost) * 100;
      meterRef.current.style.width = `${percentage}%`;
      percentageRef.current.textContent = `${Math.floor(percentage)}%`;
      
      // Change color based on boost level
      if (percentage > 75) {
        meterRef.current.style.backgroundColor = '#00ff88';
      } else if (percentage > 50) {
        meterRef.current.style.backgroundColor = '#ffdd00';
      } else if (percentage > 25) {
        meterRef.current.style.backgroundColor = '#ff8800';
      } else {
        meterRef.current.style.backgroundColor = '#ff3344';
      }
      
      // Add pulsing effect when boosting
      if (isBoostingRef.current) {
        meterRef.current.style.animation = 'boost-pulse 0.5s ease-in-out infinite';
      } else {
        meterRef.current.style.animation = 'none';
      }
    }
  });
  
  return (
    <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'fixed',
          bottom: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '300px',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          fontFamily: 'monospace',
          color: 'white',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00ff88' }}>
            BOOST {isBoostingRef.current ? '● ACTIVE' : '○ READY'}
          </span>
          <span ref={percentageRef} style={{ fontSize: '12px', fontWeight: 'bold' }}>
            100%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            ref={meterRef}
            style={{
              height: '100%',
              width: '100%',
              backgroundColor: '#00ff88',
              transition: 'width 0.1s ease-out',
              boxShadow: '0 0 10px currentColor',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '10px',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 0 4px black',
            }}
          >
            SHIFT to BOOST
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes boost-pulse {
          0% { opacity: 1; box-shadow: 0 0 10px currentColor; }
          50% { opacity: 0.7; box-shadow: 0 0 20px currentColor; }
          100% { opacity: 1; box-shadow: 0 0 10px currentColor; }
        }
      `}</style>
    </Html>
  );
}