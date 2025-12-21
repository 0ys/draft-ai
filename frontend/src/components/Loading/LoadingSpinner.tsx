'use client';

import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
};

export function LoadingSpinner({ 
  size = 'md', 
  message,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const spinnerSize = {
    sm: '20px',
    md: '40px',
    lg: '60px',
  }[size];

  const borderWidth = {
    sm: '2px',
    md: '4px',
    lg: '6px',
  }[size];

  if (fullScreen) {
    return (
      <FullScreenContainer>
        <SpinnerContainer>
          <Spinner $size={spinnerSize} $borderWidth={borderWidth} />
          {message && <Message>{message}</Message>}
        </SpinnerContainer>
      </FullScreenContainer>
    );
  }

  return (
    <Container>
      <Spinner $size={spinnerSize} $borderWidth={borderWidth} />
      {message && <Message>{message}</Message>}
    </Container>
  );
}

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
`;

const FullScreenContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 1000;
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
`;

const Spinner = styled.div<{ $size: string; $borderWidth: string }>`
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  border: ${({ $borderWidth }) => $borderWidth} solid ${({ theme }) => theme.colors.Slate200};
  border-top: ${({ $borderWidth }) => $borderWidth} solid ${({ theme }) => theme.colors.Primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const Message = styled.p`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate500};
  margin: 0;
  text-align: center;
`;
