/* SVG Icon Components */
import React from 'react';

interface IconProps {
    size?: number;
    color?: string;
    className?: string;
}

// Upload Icon
export const UploadIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 4L12 16M12 4L8 8M12 4L16 8" stroke={color} strokeWidth="3" strokeLinecap="square" />
        <path d="M4 17V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V17" stroke={color} strokeWidth="3" strokeLinecap="square" />
    </svg>
);

// Document/PDF Icon
export const DocumentIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z" stroke={color} strokeWidth="3" />
        <path d="M14 2V8H20" stroke={color} strokeWidth="3" />
        <path d="M8 13H16M8 17H12" stroke={color} strokeWidth="2" strokeLinecap="square" />
    </svg>
);

// Template Icon
export const TemplateIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth="3" />
        <rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth="3" />
        <rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth="3" />
        <rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth="3" />
    </svg>
);

// Flipbook Icon
export const FlipbookIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 4H11V20H4C3 20 3 19 3 18V6C3 4 4 4 4 4Z" stroke={color} strokeWidth="3" />
        <path d="M13 4H20C21 4 21 5 21 6V18C21 19 21 20 20 20H13V4Z" stroke={color} strokeWidth="3" />
        <path d="M11 4C11 4 12 5 12 12C12 19 11 20 11 20" stroke={color} strokeWidth="2" />
    </svg>
);

// Documentation Icon
export const DocsIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="3" y="3" width="18" height="18" stroke={color} strokeWidth="3" />
        <path d="M7 8H17M7 12H17M7 16H13" stroke={color} strokeWidth="2" strokeLinecap="square" />
    </svg>
);

// Download Icon
export const DownloadIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 4L12 16M12 16L8 12M12 16L16 12" stroke={color} strokeWidth="3" strokeLinecap="square" />
        <path d="M4 17V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V17" stroke={color} strokeWidth="3" strokeLinecap="square" />
    </svg>
);

// Deploy/Rocket Icon
export const RocketIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2C12 2 8 6 8 12C8 15 9 18 12 22C15 18 16 15 16 12C16 6 12 2 12 2Z" stroke={color} strokeWidth="3" />
        <circle cx="12" cy="11" r="2" fill={color} />
        <path d="M8 12C5 12 3 14 3 14L6 17" stroke={color} strokeWidth="2" />
        <path d="M16 12C19 12 21 14 21 14L18 17" stroke={color} strokeWidth="2" />
    </svg>
);

// Link Icon
export const LinkIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M10 14L14 10" stroke={color} strokeWidth="3" strokeLinecap="square" />
        <path d="M15 9L17 7C18.6569 5.34315 18.6569 2.65685 17 1V1C15.3431 -0.656854 12.6569 -0.656854 11 1L9 3" stroke={color} strokeWidth="3" />
        <path d="M9 15L7 17C5.34315 18.6569 5.34315 21.3431 7 23V23C8.65685 24.6569 11.3431 24.6569 13 23L15 21" stroke={color} strokeWidth="3" />
    </svg>
);

// Check Icon
export const CheckIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M5 12L10 17L19 7" stroke={color} strokeWidth="4" strokeLinecap="square" />
    </svg>
);

// Arrow Right Icon
export const ArrowRightIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke={color} strokeWidth="3" strokeLinecap="square" />
    </svg>
);

// Arrow Left Icon
export const ArrowLeftIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke={color} strokeWidth="3" strokeLinecap="square" />
    </svg>
);

// Hotspot/Pin Icon
export const HotspotIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="10" r="7" stroke={color} strokeWidth="3" />
        <circle cx="12" cy="10" r="3" fill={color} />
        <path d="M12 17V22" stroke={color} strokeWidth="3" />
    </svg>
);

// Lead/User Icon
export const LeadIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="3" />
        <path d="M4 20C4 17 7 14 12 14C17 14 20 17 20 20" stroke={color} strokeWidth="3" />
    </svg>
);

// AI/Brain Icon
export const AIIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="3" />
        <path d="M8 10V10.01M16 10V10.01" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M9 15C10 16 11 16.5 12 16.5C13 16.5 14 16 15 15" stroke={color} strokeWidth="2" />
        <path d="M12 3V1M12 23V21" stroke={color} strokeWidth="2" />
        <path d="M3 12H1M23 12H21" stroke={color} strokeWidth="2" />
    </svg>
);

// Analytics Icon
export const AnalyticsIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="3" y="14" width="4" height="7" stroke={color} strokeWidth="3" />
        <rect x="10" y="10" width="4" height="11" stroke={color} strokeWidth="3" />
        <rect x="17" y="6" width="4" height="15" stroke={color} strokeWidth="3" />
    </svg>
);

// Settings/Gear Icon
export const SettingsIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="3" />
        <path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93" stroke={color} strokeWidth="2" />
    </svg>
);

// Mobile/Phone Icon
export const MobileIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth="3" />
        <path d="M10 18H14" stroke={color} strokeWidth="2" strokeLinecap="square" />
    </svg>
);

// SEO/Search Icon
export const SEOIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="3" />
        <path d="M15 15L21 21" stroke={color} strokeWidth="3" strokeLinecap="square" />
    </svg>
);

export default {
    UploadIcon,
    DocumentIcon,
    TemplateIcon,
    FlipbookIcon,
    DocsIcon,
    DownloadIcon,
    RocketIcon,
    LinkIcon,
    CheckIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    HotspotIcon,
    LeadIcon,
    AIIcon,
    AnalyticsIcon,
    SettingsIcon,
    MobileIcon,
    SEOIcon
};
