import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCognitionStore } from '../../store/useCognitionStore';

export const OpeningGate: React.FC = () => {
  const enterParliament = useCognitionStore((s) => s.enterParliament);

  useEffect(() => {
    const timer = setTimeout(() => {
      enterParliament();
    }, 5000);
    return () => clearTimeout(timer);
  }, [enterParliament]);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
      {/* Immersive Iframe Background - High Fidelity Render */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <iframe 
          src='https://my.spline.design/retrofuturismbganimation-x3NBMapjFEwWV2ukYpKFpbwQ/' 
          frameBorder='0' 
          width='100%' 
          height='100%'
          title="Synapse3D Background"
          className="w-full h-full scale-[1.01]" // Slight scale to hide potential edges
        />
      </div>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-60" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#050505] via-transparent to-[#050505] opacity-40" />
      
      {/* Scanline Effect for Retro-Futuristic Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
};

