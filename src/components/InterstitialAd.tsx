'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function InterstitialAd() {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [canClose, setCanClose] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(3);
    const adImageUrl = "https://res.cloudinary.com/dpwse9wkc/image/upload/v1767994516/entel_wz6f8k.jpg";
    const secondAdImageUrl = "https://res.cloudinary.com/dpwse9wkc/image/upload/v1770404388/T%C3%ADtulo_2_jjgsgp.png";

    useEffect(() => {
        // Check if ad has already been shown in this session
        const hasSeenAd = sessionStorage.getItem('hasSeenInterstitialAd');

        if (!hasSeenAd) {
            // Show ad after a short delay for a smoother entry
            const timer = setTimeout(() => {
                setIsVisible(true);

                // Countdown to allow closing
                const countdown = setInterval(() => {
                    setSecondsRemaining((prev) => {
                        if (prev <= 1) {
                            setCanClose(true);
                            clearInterval(countdown);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

            }, 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        if (!canClose) return;
        setIsClosing(true);
        // Mark as seen in session storage
        sessionStorage.setItem('hasSeenInterstitialAd', 'true');

        // Wait for animation to finish before removing from DOM
        setTimeout(() => {
            setIsVisible(false);
        }, 500);
    };

    if (!isVisible) return null;

    const adContent = (
        <div className={`ad-overlay ${isClosing ? 'fade-out' : 'fade-in'}`}>
            <div className={`ad-container ${isClosing ? 'scale-down' : 'scale-up'}`}>
                {/* Close Button */}
                <button
                    className={`ad-close-btn ${!canClose ? 'disabled' : ''}`}
                    onClick={handleClose}
                    aria-label="Cerrar"
                    disabled={!canClose}
                >
                    {canClose ? (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <span className="countdown-number">{secondsRemaining}</span>
                    )}
                </button>

                {/* Main Ad Images */}
                <div className="ad-images-container">
                    <div className="ad-image-wrapper">
                        <img
                            src={adImageUrl}
                            alt="Entel Advertisement"
                            className="ad-image"
                            onLoad={(e) => (e.currentTarget as HTMLImageElement).classList.add('loaded')}
                        />
                        <div className="ad-shine" />
                    </div>
                    <div className="ad-image-wrapper">
                        <img
                            src={secondAdImageUrl}
                            alt="Ad Promotion"
                            className="ad-image"
                            onLoad={(e) => (e.currentTarget as HTMLImageElement).classList.add('loaded')}
                        />
                        <div className="ad-shine" />
                    </div>
                </div>

                {/* Modern subtle footer or decoration if needed */}
                <div className="ad-footer">
                    <p>Haz clic fuera o presiona la X para continuar</p>
                </div>
            </div>

            {/* Click outside to close */}
            <div className="ad-backdrop-close" onClick={handleClose} />

            <style jsx>{`
                .ad-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 1000000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(15px);
                    background-color: rgba(0, 0, 0, 0.85);
                    padding: 20px;
                    transition: all 0.5s ease;
                }

                .ad-backdrop-close {
                    position: absolute;
                    inset: 0;
                    z-index: -1;
                }

                .ad-container {
                    position: relative;
                    width: 95%;
                    max-width: 1200px;
                    background: transparent;
                    border-radius: 2rem;
                    overflow: hidden;
                    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .ad-close-btn {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    z-index: 20;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    backdrop-filter: blur(5px);
                }

                .ad-close-btn:hover {
                    background: #ef4444;
                    border-color: #ef4444;
                    transform: rotate(90deg);
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
                }

                .ad-close-btn.disabled {
                    cursor: not-allowed;
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.5);
                }

                .ad-close-btn.disabled:hover {
                    transform: none;
                    box-shadow: none;
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .countdown-number {
                    font-size: 1.1rem;
                    font-weight: 950;
                    font-family: 'Outfit', sans-serif;
                }

                .ad-images-container {
                    display: flex;
                    gap: 1rem;
                    padding: 1rem;
                    width: 100%;
                }

                .ad-image-wrapper {
                    position: relative;
                    flex: 1;
                    aspect-ratio: 4/5;
                    border-radius: 1rem;
                    overflow: hidden;
                }

                .ad-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0;
                    transform: scale(1.1);
                    transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .ad-image.loaded {
                    opacity: 1;
                    transform: scale(1);
                }

                .ad-shine {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.1),
                        transparent
                    );
                    animation: shine 4s infinite;
                }

                @keyframes shine {
                    0% { left: -100%; }
                    20% { left: 200%; }
                    100% { left: 200%; }
                }

                .ad-footer {
                    padding: 1rem;
                    text-align: center;
                }

                .ad-footer p {
                    font-family: 'Inter', sans-serif;
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: rgba(255, 255, 255, 0.3);
                    margin: 0;
                }

                /* Animations */
                .fade-in { opacity: 1; }
                .fade-out { opacity: 0; }
                .scale-up { transform: scale(1); opacity: 1; }
                .scale-down { transform: scale(0.9); opacity: 0; filter: blur(10px); }

                @keyframes ad-entrance {
                    0% { transform: scale(0.8) translateY(30px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }

                @media (max-width: 640px) {
                    .ad-container { max-width: 90vw; }
                }
            `}</style>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(adContent, document.body) : null;
}
