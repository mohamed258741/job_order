import React from 'react';

interface EtisalatLogoProps {
  className?: string;
  variant?: 'full' | 'symbol' | 'horizontal';
  height?: number | string;
  monochrome?: boolean;
}

/**
 * Official e& (etisalat and) brand emblem and logotype
 * Brand Primary Red: #E1001A
 */
export const EtisalatLogo: React.FC<EtisalatLogoProps> = ({
  className = '',
  variant = 'full',
  height = 36,
  monochrome = false,
}) => {
  const brandRed = monochrome ? 'currentColor' : '#E1001A';

  if (variant === 'symbol') {
    return (
      <svg
        viewBox="0 0 400 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ height }}
        aria-label="e& symbol"
      >
        {/* Iconic e& loop symbol */}
        <path
          d="M172 154.5C172 121.6 150.3 98 114.5 98C78.7 98 52 124.6 52 163.5C52 202.4 79.5 229 117.8 229C149.2 229 171.2 208.7 174.5 178H55C56.2 147.2 78.5 125.8 113.8 125.8C136.5 125.8 150.2 136.2 153.8 154.5H172ZM241.5 52C208.5 52 186.2 74.8 186.2 108.2C186.2 132.8 197.8 152 216.5 168.2L179.2 202C172.5 208 165.2 213.5 156.8 217.2C146.5 221.8 135 224 122 224C72.5 224 32 189.5 32 140C32 90.5 72.5 56 122 56C152.2 56 178.5 69.8 195.2 92.5C198.8 69.2 217.8 52 241.5 52Z"
          fill="none"
        />
        {/* Precise vector path for official e& ribbon */}
        <g fill={brandRed}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M135 48C78.1167 48 32 94.1167 32 151C32 207.883 78.1167 254 135 254C163.2 254 188.8 242.6 207.5 224.2L278.4 286.8C283.6 291.4 291.5 291 296.2 285.8C300.8 280.6 300.4 272.7 295.2 268.1L229.8 210.4C244.7 194.2 254 172.5 254 148.5C254 99.8 218 61 172.5 61C164.2 61 156.4 62.4 149 65C144.5 54 130.5 48 135 48ZM135 84C98 84 68 114 68 151C68 188 98 218 135 218C152.8 218 169 211 181 199.5L145 167C140.5 163 138 157.2 138 151C138 138.8 147.8 129 160 129H205.2C203.4 115 194.2 103.5 181.5 98C172.8 94.2 163.2 92 153 92C146.8 92 140.7 93.3 135 95.8V84Z"
          />
          {/* Loop overlap */}
          <circle cx="230" cy="115" r="42" fill={brandRed} />
          <circle cx="230" cy="115" r="22" fill="#FFFFFF" />
          {/* Main e-circle crossbar */}
          <path d="M72 145H176C176 145 174 112 132 112C90 112 76 138 72 145Z" fill={brandRed} />
        </g>
      </svg>
    );
  }

  // Full official logo with 'e&' emblem and 'etisalat and' logotype underneath
  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 320 350"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height }}
        className="w-auto max-h-full transition-transform hover:scale-105 duration-200"
        aria-label="etisalat and logo"
      >
        {/* Stylized e& Ribbon loop */}
        <g fill={brandRed}>
          {/* Upper loop '&' */}
          <path
            d="M208 40C168 40 144 68 144 104C144 126 156 146 174 162C138 198 122 208 84 208C42 208 12 178 12 136C12 94 44 64 88 64C108 64 124 71 136 82L154 64C136 48 114 38 88 38C30 38 -14 78 -14 136C-14 194 30 234 84 234C130 234 158 214 190 178C206 194 228 206 254 206C274 206 292 198 306 184L288 168C278 178 266 182 254 182C234 182 218 172 204 158L220 142C248 114 266 88 266 58C266 22 238 -2 198 -2C164 -2 140 20 134 46L158 52C162 36 176 22 198 22C222 22 240 38 240 58C240 78 226 98 204 120L188 136C174 122 166 108 166 94C166 74 180 58 204 58C214 58 222 62 228 68L244 52C234 44 222 40 208 40Z"
            transform="translate(20, 10)"
          />
          {/* Center e loop filling */}
          <path
            d="M102 122C102 96 122 76 150 76C178 76 198 96 198 122C198 148 178 168 150 168C122 168 102 148 102 122ZM150 146C164 146 174 136 174 122C174 108 164 98 150 98C136 98 126 108 126 122C126 136 136 146 150 146Z"
            transform="translate(-25, 10)"
          />
        </g>

        {/* Wordmark: "etisalat and" */}
        <text
          x="160"
          y="320"
          textAnchor="middle"
          fill={brandRed}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="48"
          fontWeight="700"
          letterSpacing="-1.5"
        >
          etisalat and
        </text>
      </svg>
    </div>
  );
};
