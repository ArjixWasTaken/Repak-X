import React from 'react';
import { motion } from "framer-motion";
import { LuMoon, LuSun } from "react-icons/lu";

export function AnimatedThemeToggler({ theme, setTheme }) {
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      style={{ 
        background: 'var(--bg-dark)', 
        border: '1px solid var(--panel-border)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0
      }}
      aria-label="Toggle theme"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <motion.div
        initial={false}
        animate={{
          scale: isDark ? 1 : 0,
          rotate: isDark ? 0 : 90,
          opacity: isDark ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        style={{ position: 'absolute' }}
      >
        <LuMoon size={20} style={{ color: 'var(--text-primary)' }} />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          scale: isDark ? 0 : 1,
          rotate: isDark ? -90 : 0,
          opacity: isDark ? 0 : 1,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        style={{ position: 'absolute' }}
      >
        <LuSun size={20} style={{ color: 'var(--text-primary)' }} />
      </motion.div>
    </button>
  );
}
