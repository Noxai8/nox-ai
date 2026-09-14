type NoxLogoProps = {
  variant?: 'black' | 'green';
  showName?: boolean;
  size?: number;
  className?: string;
};

const NOX_GREEN = '#B7FF00';

export default function NoxLogo({
  variant = 'green',
  showName = true,
  size = 38,
  className = '',
}: NoxLogoProps) {
  const color = variant === 'black' ? '#080808' : NOX_GREEN;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        color,
      }}
    >
      <svg
        width={size}
        height={size * 0.72}
        viewBox="0 0 72 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        style={{
          display: 'block',
          overflow: 'visible',
          flexShrink: 0,
        }}
      >
        <path
          d="M10.8 8.7C12.4 5.9 16 4.8 18.9 6.2L31.8 12.4C35 13.9 36.2 17.7 34.6 20.7C33 23.6 29.4 24.7 26.4 23.3L13.5 17.1C10.4 15.6 9.2 11.8 10.8 8.7Z"
          fill="currentColor"
        />

        <path
          d="M27.4 29.7C28.1 26.4 31.2 24.2 34.5 24.7L61.3 28.7C64.8 29.2 67.1 32.4 66.5 35.8C66 39.1 62.9 41.4 59.5 40.9L32.7 36.9C29.3 36.4 26.9 33.2 27.4 29.7Z"
          fill="currentColor"
        />
      </svg>

      {showName && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 5,
            lineHeight: 1,
            color,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              fontSize: size * 0.5,
              fontWeight: 900,
              letterSpacing: '-0.055em',
            }}
          >
            NOX
          </span>

          <span
            style={{
              fontSize: size * 0.23,
              fontWeight: 800,
              letterSpacing: '0.12em',
              opacity: 0.55,
            }}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
}
