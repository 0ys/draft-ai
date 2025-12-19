'use client';

import styled from '@emotion/styled';
import { useState } from 'react';

type DraftEditorProps = {
  draft: string;
  onDraftChange: (draft: string) => void;
};

export function DraftEditor({ draft, onDraftChange }: DraftEditorProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  return (
    <Wrapper>
      <Toolbar>
        <Title>생성된 초안</Title>
        <CopyButton onClick={handleCopy}>
          {isCopied ? '✓ 복사됨' : '📋 복사'}
        </CopyButton>
      </Toolbar>

      <Editor
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="초안이 여기에 표시됩니다..."
      />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const Title = styled.h3`
  ${({ theme }) => theme.fonts.Title3};
  color: ${({ theme }) => theme.colors.Gray1};
`;

const CopyButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.colors.Black3};
  color: ${({ theme }) => theme.colors.Gray2};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  ${({ theme }) => theme.fonts.Body2};
  font-weight: 500;
  transition: background-color 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background-color: ${({ theme }) => theme.colors.Black4};
  }
`;

const Editor = styled.textarea`
  flex: 1;
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) => theme.colors.Black3};
  border: 1px solid ${({ theme }) => theme.colors.Black4};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.Gray1};
  ${({ theme }) => theme.fonts.Body1};
  font-family: 'Courier New', monospace;
  line-height: 1.6;
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
