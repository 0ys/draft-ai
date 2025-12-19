'use client';

import styled from '@emotion/styled';

type GenerateButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function GenerateButton({ onClick, disabled }: GenerateButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      초안 생성
    </Button>
  );
}

const Button = styled.button`
  padding: 0.5rem 1.5rem;
  background-color: ${({ theme }) => theme.colors.SkyDark};
  color: ${({ theme }) => theme.colors.White};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  ${({ theme }) => theme.fonts.Body1};
  font-weight: 500;
  transition: background-color 0.2s;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.Sky};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.Black4};
    cursor: not-allowed;
  }
`;
