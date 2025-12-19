// Theme 설정
export const theme = {
  colors: {
    // 기본 색상
    White: '#FFFFFF',
    Black: '#000000',
    Black1: '#0F172A', // slate-950
    Black2: '#1E293B', // slate-900
    Black3: '#334155', // slate-800
    Black4: '#475569', // slate-700
    
    // 주요 색상
    Sky: '#0EA5E9', // sky-500
    SkyLight: '#38BDF8', // sky-400
    SkyDark: '#0284C7', // sky-600
    
    // 상태 색상
    Green: '#10B981', // green-500
    Yellow: '#F59E0B', // yellow-500
    Red: '#EF4444', // red-500
    
    // 텍스트 색상
    Gray1: '#F1F5F9', // slate-100
    Gray2: '#E2E8F0', // slate-200
    Gray3: '#CBD5E1', // slate-300
    Gray4: '#94A3B8', // slate-400
    Gray5: '#64748B', // slate-500
  },
  fonts: {
    Title1: `
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1.2;
    `,
    Title2: `
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.3;
    `,
    Title3: `
      font-size: 1.5rem;
      font-weight: 600;
      line-height: 1.4;
    `,
    Body1: `
      font-size: 1rem;
      font-weight: 400;
      line-height: 1.5;
    `,
    Body2: `
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.5;
    `,
    Body3: `
      font-size: 0.75rem;
      font-weight: 400;
      line-height: 1.5;
    `,
    EnTitle1: `
      font-size: 2rem;
      font-weight: 600;
      line-height: 1.3;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `,
    EnTitle2: `
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `,
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
};

export type Theme = typeof theme;

