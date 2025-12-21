'use client';

import { useState } from 'react';
import styled from '@emotion/styled';
import { useTheme } from '@emotion/react';
import { QAChunk } from '@/types';
import { SvgIcon } from '@/components/icons';

type EvidenceCardProps = {
  evidence: QAChunk;
  index: number;
};

export function EvidenceCard({ evidence, index }: EvidenceCardProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 유사도 점수를 백분율로 변환 (0-1 범위를 0-100으로)
  const similarityScore = evidence.score !== undefined 
    ? Math.round(evidence.score * 100) 
    : null;

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  // 파일 확장자에 따라 아이콘 결정
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      return 'pdf';
    } else if (extension === 'doc' || extension === 'docx') {
      return 'doc';
    }
    return 'file'; // 기본값
  };

  // 파일 확장자에 따라 아이콘 색상 결정
  const getFileIconColor = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      return theme.colors.Red;
    } else if (extension === 'doc' || extension === 'docx') {
      return theme.colors.DocBlue;
    }
    return theme.colors.Slate500; // 기본값
  };

  return (
    <Card $isExpanded={isExpanded} onClick={handleCardClick}>
      <CardHeader>
        <HeaderLeft>
          <IndexBadge>{index}</IndexBadge>
          <Label>참고 자료</Label>
        </HeaderLeft>
        <HeaderRight>
          {similarityScore !== null && (
            <ScoreBadge>
              유사도 {similarityScore}%
            </ScoreBadge>
          )}
        </HeaderRight>
      </CardHeader>

      <Section>
        <SectionTitle>유사 질문</SectionTitle>
        <QuestionText>{evidence.question}</QuestionText>
      </Section>

      <Section>
        <SectionTitle>답변 요약</SectionTitle>
        <AnswerText $isExpanded={isExpanded}>
          {isExpanded ? evidence.answer : (
            evidence.answer.length > 150
              ? `${evidence.answer.substring(0, 150)}...`
              : evidence.answer
          )}
        </AnswerText>
        {evidence.answer.length > 150 && (
          <ExpandHint>
            {isExpanded ? '접기' : '전체 보기'} {isExpanded ? '▲' : '▼'}
          </ExpandHint>
        )}
      </Section>

      <Footer>
        <FooterText>
          <SvgIcon 
            name={getFileIcon(evidence.source.fileName)} 
            size={16} 
            color={getFileIconColor(evidence.source.fileName)} 
          />
          {evidence.source.fileName}
          {evidence.source.page && ` (p.${evidence.source.page})`}
        </FooterText>
      </Footer>
    </Card>
  );
}

const Card = styled.div<{ $isExpanded: boolean }>`
  background-color: ${({ theme }) => theme.colors.White};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.Slate200};
  transition: all 0.3s ease;
  box-shadow: ${({ theme }) => theme.shadows.card};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.Primary};
    box-shadow: ${({ theme }) => theme.shadows.card};
    transform: translateY(-1px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  flex-shrink: 0;
`;

const Label = styled.span`
  ${({ theme }) => theme.fonts.Caption};
  color: ${({ theme }) => theme.colors.Slate500};
  margin-left: 0.5rem;
`;

const ScoreBadge = styled.span`
  ${({ theme }) => theme.fonts.Caption};
  color: ${({ theme }) => theme.colors.Primary};
  background-color: ${({ theme }) => theme.colors.Primary}15;
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: 600;
  white-space: nowrap;
`;

const SourceInfo = styled.div`
  ${({ theme }) => theme.fonts.Caption};
  color: ${({ theme }) => theme.colors.Slate400};
  margin-bottom: 0.75rem;
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

const AnswerText = styled.p<{ $isExpanded: boolean }>`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate700};
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  ${({ $isExpanded }) => !$isExpanded && `
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `}
`;

const ExpandHint = styled.div`
  ${({ theme }) => theme.fonts.Caption};
  color: ${({ theme }) => theme.colors.Primary};
  margin-top: 0.5rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
