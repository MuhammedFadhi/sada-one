import { motion } from 'framer-motion'

export function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(170deg, #0A1628 0%, #0D1B2A 60%, #111F35 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      {/* Animated logo */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
        style={{ width: 80, height: 80, borderRadius: 22, background: 'white', overflow: 'hidden', padding: 5, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
        <img src="/sada-one-logo.jpg" alt="SA'DA ONE" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: 20, fontWeight: 800, letterSpacing: '-.2px' }}>
          SA<span style={{ color: '#C8A96E' }}>'</span>DA ONE
        </div>
        <div style={{ color: 'rgba(255,255,255,.25)', fontSize: 9, letterSpacing: '1.2px', marginTop: 4 }}>
          INTEGRATED EMPLOYEE EXPERIENCE PLATFORM
        </div>
      </motion.div>

      {/* Animated dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#C8A96E' }}
          />
        ))}
      </div>
    </div>
  )
}
