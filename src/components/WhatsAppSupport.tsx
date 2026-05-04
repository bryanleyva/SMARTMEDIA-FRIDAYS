'use client';

import React from 'react';

const WhatsAppSupport = () => {
    const phoneNumber = '51903138521';
    const message = 'Hola, tengo una consulta sobre el sistema Lishing.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return (
        <>
            <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-float"
            >
                <div className="whatsapp-label">Soporte Técnico</div>
                <div className="whatsapp-icon-container">
                    <svg
                        viewBox="0 0 32 32"
                        className="whatsapp-icon"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.236-.73-3.82-.88-3.92a.967.967 0 0 0-1.02.04c-.29.24-1.106 1.23-1.106 2.45 0 1.32.818 3.526 1.998 5.255 1.142 1.68 2.81 3.48 5.078 4.332 1.15.433 2.155.493 2.903.493 1.225 0 2.45-.852 2.524-.962l.037-.066c.102-.127.164-.265.164-.39 0-.21-.498-.944-2.12-2.01-.162-.107-.43-.156-.547-.156zM16.404 2C9.012 2 3 8.01 3 15.402c0 2.51.69 4.86 1.893 6.87L3 29l6.913-1.815a12.313 12.313 0 0 0 5.49 1.31c7.393 0 13.404-6.01 13.404-13.403C28.807 8.01 22.797 2 16.404 2zM16.404 26.602c-2.28 0-4.434-.63-6.284-1.74l-.452-.27-3.97.94 1.1-3.69-.324-.52c-1.324-2.1-2.022-4.52-2.022-7.02 0-6.103 4.965-11.068 11.07-11.068 6.103 0 11.06 4.96 11.06 11.06 0 6.1-4.965 11.06-11.06 11.06z" />
                    </svg>
                </div>
            </a>
            <style jsx>{`
                .whatsapp-float {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    text-decoration: none;
                    z-index: 10000;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .whatsapp-label {
                    background: rgba(10, 15, 29, 0.8);
                    backdrop-filter: blur(8px);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    opacity: 0;
                    transform: translateX(10px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                    white-space: nowrap;
                }

                .whatsapp-float:hover .whatsapp-label {
                    opacity: 1;
                    transform: translateX(0);
                }

                .whatsapp-icon-container {
                    width: 60px;
                    height: 60px;
                    background-color: #25d366;
                    color: #fff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                }

                .whatsapp-float:hover .whatsapp-icon-container {
                    transform: scale(1.1);
                    background-color: #128c7e;
                    box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
                }

                .whatsapp-icon {
                    width: 35px;
                    height: 35px;
                }

                @media (max-width: 768px) {
                    .whatsapp-float {
                        bottom: 20px;
                        right: 20px;
                    }
                    .whatsapp-icon-container {
                        width: 50px;
                        height: 50px;
                    }
                    .whatsapp-icon {
                        width: 30px;
                        height: 30px;
                    }
                    .whatsapp-label {
                        display: none;
                    }
                }
            `}</style>
        </>
    );
};

export default WhatsAppSupport;
