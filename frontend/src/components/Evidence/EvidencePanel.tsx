'use client';

import styled from '@emotion/styled';
import { QAChunk } from '@/types';
import { EvidenceCard } from '@/components/Evidence/EvidenceCard';

type EvidencePanelProps = {
  evidences: QAChunk[];
};

export function EvidencePanel({ evidences }: EvidencePanelProps) {
  return (
    <Wrapper>
      <Header>
        <Title>Evidence Panel</Title>
        <Count>{evidences.length}개의 참고 자료</Count>
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
  background-color: ${({ theme }) => theme.colors.Black2};
  border-left: 1px solid ${({ theme }) => theme.colors.Black4};
`;

const Header = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.Black4};
`;

const Title = styled.h2`
  ${({ theme }) => theme.fonts.Title3};
  color: ${({ theme }) => theme.colors.Gray1};
`;

const Count = styled.p`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Gray4};
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
  color: ${({ theme }) => theme.colors.Gray5};
`;
