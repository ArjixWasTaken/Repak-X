import React, { useState, useEffect } from 'react';
import './Terminal.css';

type TerminalProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
  className?: string;
};

type TypingAnimationProps = {
  children: string;
  delay?: number;
  duration?: number;
  className?: string;
};

type AnimatedSpanProps = {
  children?: React.ReactNode;
  delay?: number;
  className?: string;
};

export function Terminal({ children, className = '', ...props }: TerminalProps) {
  return (
    <div className={`terminal-window ${className}`} {...props}>
      <div className="terminal-header">
        <div className="terminal-button red" />
        <div className="terminal-button yellow" />
        <div className="terminal-button green" />
      </div>
      <div className="terminal-body">
        {children}
      </div>
    </div>
  );
}

export function TypingAnimation({ children, delay = 0, duration = 50, className = '' }: TypingAnimationProps) {
  const [text, setText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStarted(true);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= children.length) {
        setText(children.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, duration);

    return () => clearInterval(interval);
  }, [started, children, duration]);

  return (
    <span className={`terminal-line ${className}`}>
      {text}
      {text.length < children.length && started && <span className="typing-cursor" />}
    </span>
  );
}

export function AnimatedSpan({ children, delay = 0, className = '' }: AnimatedSpanProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  if (!visible) return null;

  return (
    <span className={`terminal-line ${className} fade-in`}>
      {children}
    </span>
  );
}
