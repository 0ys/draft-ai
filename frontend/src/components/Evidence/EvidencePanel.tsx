'use client';

import styled from '@emotion/styled';
import { QAChunk } from '@/types';
import { EvidenceCard } from '@/components/Evidence/EvidenceCard';

type EvidencePanelProps = {
  evidences: QAChunk[];
  onClose?: () => void;
};

export function EvidencePanel({ evidences, onClose }: EvidencePanelProps) {
  return (
    <Wrapper>
      <Header>
        <HeaderLeft>
          <Title>참고 문헌</Title>
          <Count>{evidences.length}개의 참고 자료</Count>
        </HeaderLeft>
        {onClose && (
          <CloseButton onClick={onClose} aria-label="참고 문헌 패널 닫기">
            ✕
          </CloseButton>
        )}
      </Header>

      <Content>
        {evidences.length === 0 ? (
          <EmptyState>
            <EmptyText>참고 자료가 없습니다</EmptyText>
          </EmptyState>
        ) : (
          evidences.map((evidence, index) => (
            <EvidenceCard key={evidence.id || index} evidence={evidence} index={index + 1} />
          ))
        )}
      </Content>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${({ theme }) => theme.colors.White};
  border-left: 1px solid ${({ theme }) => theme.colors.Slate200};
`;

const Header = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.Slate200};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.colors.Slate500};
  padding: 0.25rem 0.5rem;
  line-height: 1;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background-color: ${({ theme }) => theme.colors.Slate100};
    color: ${({ theme }) => theme.colors.Slate950};
  }
`;

const Title = styled.h2`
  ${({ theme }) => theme.fonts.Title2};
  color: ${({ theme }) => theme.colors.Slate950};
`;

const Count = styled.p`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate500};
  margin-top: 0.25rem;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EmptyState = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyText = styled.p`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate400};
`;
