'use client';

import styled from '@emotion/styled';
import { QAChunk } from '@/types';

type EvidenceCardProps = {
  evidence: QAChunk;
  index: number;
};

export function EvidenceCard({ evidence, index }: EvidenceCardProps) {
  return (
    <Card>
      <CardHeader>
        <IndexBadge>{index}</IndexBadge>
        <Label>참고 자료</Label>
        <SourceInfo>
          {evidence.source.fileName}
          {evidence.source.page && ` (p.${evidence.source.page})`}
        </SourceInfo>
      </CardHeader>

      <Section>
        <SectionTitle>유사 질문</SectionTitle>
        <QuestionText>{evidence.question}</QuestionText>
      </Section>

      <Section>
        <SectionTitle>답변 요약</SectionTitle>
        <AnswerText>
          {evidence.answer.length > 150
            ? `${evidence.answer.substring(0, 150)}...`
            : evidence.answer}
        </AnswerText>
      </Section>

      <Footer>
        <FooterText>📄 {evidence.source.folderPath}</FooterText>
      </Footer>
    </Card>
  );
}

const Card = styled.div`
  background-color: ${({ theme }) => theme.colors.White};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.Slate200};
  transition: border-color 0.2s;
  box-shadow: ${({ theme }) => theme.shadows.card};

  &:hover {
    border-color: ${({ theme }) => theme.colors.Primary};
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const IndexBadge = styled.span`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.Primary};
  color: ${({ theme }) => theme.colors.White};
  ${({ theme }) => theme.fonts.Caption};
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Label = styled.span`
  ${({ theme }) => theme.fonts.Caption};
  color: ${({ theme }) => theme.colors.Slate500};
  margin-left: 0.5rem;
`;

const SourceInfo = styled.div`
  ${({ theme }) => theme.fonts.Caption};
  color: ${({ theme }) => theme.colors.Slate400};
`;

const Section = styled.div`
  margin-bottom: 0.75rem;
`;

const SectionTitle = styled.h4`
  ${({ theme }) => theme.fonts.Caption};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.Slate500};
  margin-bottom: 0.25rem;
`;

const QuestionText = styled.p`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate700};
  line-height: 1.5;
`;

const AnswerText = styled.p`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate700};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Footer = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.colors.Slate200};
`;

const FooterText = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  ${({ theme }) => theme.fonts.Caption};
  color: ${({ theme }) => theme.colors.Slate400};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
