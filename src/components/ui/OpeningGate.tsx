import React from 'react';
import { motion } from 'framer-motion';
import { useCognitionStore } from '../../store/useCognitionStore';

export const OpeningGate: React.FC = () => {
  const enterParliament = useCognitionStore((s) => s.enterParliament);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden flex items-center justify-center">
      {/* Immersive Iframe Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <iframe 
          src='https://my.spline.design/retrofuturismbganimation-x3NBMapjFEwWV2ukYpKFpbwQ/' 
          frameBorder='0' 
          width='100%' 
          height='100%'
          style={{ opacity: 0.8 }}
          title="Synapse3D Retro-Futurism"
        />
      </div>

      {/* Cinematic UI Overlay */}
      <div className="relative z-10 text-center px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="space-y-6"
        >
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter bg-gradient-to-r from-cyan-400 via-rose-500 to-yellow-500 bg-clip-text text-transparent filter drop-shadow-[0_0_30px_rgba(244,63,94,0.3)]">
            Architecting Truth
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
            Transparency is the bridge between calculation and trust. <br />
            <span className="text-white/80">Step into the Glass Box of AI reasoning.</span>
          </p>

          <div className="pt-8">
            <motion.button
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: 'white', 
                color: 'black',
                boxShadow: '0 0 50px rgba(255,255,255,0.4)' 
              }}
              whileTap={{ scale: 0.95 }}
              onClick={enterParliament}
              className="px-12 py-4 rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-white font-bold tracking-[0.3em] uppercase text-[11px] transition-all duration-500"
            >
              Enter Parliament
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Cinematic Vignettes */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-60" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#050505] via-transparent to-[#050505] opacity-40" />
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
};
