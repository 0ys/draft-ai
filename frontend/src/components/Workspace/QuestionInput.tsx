'use client';

import styled from '@emotion/styled';

type QuestionInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function QuestionInput({ value, onChange, placeholder }: QuestionInputProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
    />
  );
}

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) => theme.colors.Black3};
  border: 1px solid ${({ theme }) => theme.colors.Black4};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.Gray1};
  ${({ theme }) => theme.fonts.Body1};
  resize: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.Gray5};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.Sky};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.Sky}33;
  }
`;
