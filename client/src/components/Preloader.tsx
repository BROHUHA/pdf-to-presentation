'use client';

import React, { useEffect, useState } from 'react';

interface PreloaderProps {
    duration?: number;
    onComplete?: () => void;
}

const Preloader: React.FC<PreloaderProps> = ({ duration = 1500, onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
            }, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onComplete]);

    if (!isVisible) return null;

    return (
        <div className={`preloader ${isExiting ? 'preloader-exit' : ''}`}>
            <div className="preloader-content">
                <div className="preloader-logo">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="72" height="72" fill="#FFE500" stroke="#000" strokeWidth="4" />
                        <path d="M20 25H50V35H20V25Z" fill="#000" />
                        <path d="M20 40H55V50H20V40Z" fill="#FF3366" />
                        <path d="M20 55H45V65H20V55Z" fill="#0066FF" />
                    </svg>
                </div>
                <div className="preloader-text">PDF SLIDESHOW</div>
                <div className="preloader-bar">
                    <div className="preloader-bar-fill"></div>
                </div>
            </div>

            <style jsx>{`
        .preloader {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #FFFEF0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .preloader-exit {
          opacity: 0;
          transform: scale(1.1);
        }

        .preloader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .preloader-logo {
          animation: bounce 0.5s ease-in-out infinite alternate;
        }

        @keyframes bounce {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-15px);
          }
        }

        .preloader-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 4px;
          color: #000;
        }

        .preloader-bar {
          width: 200px;
          height: 12px;
          background: #fff;
          border: 3px solid #000;
          box-shadow: 4px 4px 0 #000;
          overflow: hidden;
        }

        .preloader-bar-fill {
          height: 100%;
          background: #FFE500;
          animation: load 1.5s ease-in-out forwards;
        }

        @keyframes load {
          0% { width: 0; }
          100% { width: 100%; }
        }
      `}</style>
        </div>
    );
};

export default Preloader;
