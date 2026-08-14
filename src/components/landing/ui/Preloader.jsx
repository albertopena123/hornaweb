const Preloader = () => {
  return (
    <div
      className="loader-mask"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'linear-gradient(135deg, #05101d 0%, #0D1B2A 60%, #071219 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.5s ease, visibility 0.5s ease',
      }}
    >
      <style>{`
        @keyframes logoPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(233,3,5,0.4)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 35px rgba(233,3,5,0.85)); }
        }
        @keyframes ringSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes barProgress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
      
      <div style={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Animated spinner ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#E90305',
          borderRightColor: '#FF2426',
          animation: 'ringSpin 1.2s linear infinite',
        }} />
        
        {/* Logo */}
        <img
          src="/assets/images/logo/logo-an.webp"
          alt="Ahora Nación Logo"
          style={{
            width: 64,
            height: 64,
            objectFit: 'contain',
            borderRadius: '14px',
            animation: 'logoPulse 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Candidate Name & Party */}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 900,
          color: '#FFFFFF',
          textTransform: 'uppercase',
          letterSpacing: '2px',
        }}>
          Simón <span style={{ color: '#E90305' }}>Horna</span> Alpaca
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.7)',
          textTransform: 'uppercase',
          letterSpacing: '2.5px',
          marginTop: 6,
        }}>
          Ahora Nación · Madre de Dios
        </div>
      </div>

      {/* Loading progress bar */}
      <div style={{
        width: 140,
        height: 3,
        background: 'rgba(255,255,255,0.15)',
        borderRadius: 3,
        marginTop: 20,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #E90305, #FFD700)',
          borderRadius: 3,
          animation: 'barProgress 1.6s ease-in-out infinite',
        }} />
      </div>
    </div>
  )
}

export default Preloader

