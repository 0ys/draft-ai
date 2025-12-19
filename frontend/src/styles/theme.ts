import { css } from '@emotion/react';

export const theme = {
  colors: {
    White: '#FFFFFF',
    Black: '#000000',
    
    // Grayscale (Slate 계열)
    Slate950: '#0F172A',
    Slate700: '#334155', 
    Slate500: '#64748B',
    Slate400: '#94A3B8',
    Slate200: '#E2E8F0', 
    Slate100: '#F1F5F9',
    Slate50: '#F8FAFC',  
    
    // 주요 색상 (Indigo/Blue 계열)
    Primary: '#2563EB',
    PrimaryLight: '#DBEAFE',
    PrimaryText: '#1E40AF',
    
    // 상태 및 강조 색상
    Green: '#10B981',
    GreenLight: '#ECFDF5',
    Red: '#EF4444',
  },
  
  fonts: {
    Head0: css`
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 3rem;
    font-style: normal;
    font-weight: 700;
    line-height: 130%; /* 5.2rem */
    `,
    Head1: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 2.4rem;
      font-style: normal;
      font-weight: 700;
      line-height: 130%; /* 4.16rem */
    `,
    Head2: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 2rem;
      font-style: normal;
      font-weight: 700;
      line-height: 130%; /* 3.9rem */
    `,
    Head3: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 1.8rem;
      font-style: normal;
      font-weight: 700;
      line-height: 130%; /* 3.38rem */
    `,
    Head4: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 1.6rem;
      font-style: normal;
      font-weight: 700;
      line-height: 130%; /* 3.12rem */
    `,
    Title1: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 2rem;
      font-style: normal;
      font-weight: 600;
      line-height: 130%; /* 2.08rem */
    `,
    Title2: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 1.8rem;
      font-style: normal;
      font-weight: 600;
      line-height: 130%; /* 2.08rem */
    `,
    Title3: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 1.4rem;
      font-style: normal;
      font-weight: 600;
      line-height: 130%; /* 2.08rem */
    `,
    Title4: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 1rem;
      font-style: normal;
      font-weight: 600;
      line-height: 130%; /* 2.08rem */
    `,
    Title5: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 0.6rem;
      font-style: normal;
      font-weight: 600;
      line-height: 130%; /* 2.08rem */
    `,
    Title6: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 0.4rem;
      font-style: normal;
      font-weight: 600;
      line-height: 130%; /* 2.08rem */
    `,
    Body1: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 1.4rem;
      font-style: normal;
      font-weight: 400;
      line-height: 130%; /* 2.08rem */
    `,
    Body2: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 1.2rem;
      font-style: normal;
      font-weight: 400;
      line-height: 130%; /* 1.69rem */
    `,
    Body3: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 1rem;
      font-style: normal;
      font-weight: 400;
      line-height: 130%; /* 1.82rem */
    `,
    Body4: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 0.8rem;
      font-style: normal;
      font-weight: 400;
      line-height: 130%; /* 1.56rem */
    `,
    Caption: css`
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 0.75rem;
      font-weight: 400;
      line-height: 1.4;
    `,
  },

  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
  },

  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    pill: '9999px',
  },

  shadows: {
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  }
};

export type Theme = typeof theme;