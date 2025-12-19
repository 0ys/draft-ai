'use client';

import styled from '@emotion/styled';
import { Document } from '@/types';

type DocumentStatusBadgeProps = {
  status: Document['status'];
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const statusConfig = {
    processing: {
      label: '처리 중',
      bgColor: 'rgba(245, 158, 11, 0.2)',
      textColor: '#F59E0B',
    },
    completed: {
      label: '완료',
      bgColor: 'rgba(16, 185, 129, 0.2)',
      textColor: '#10B981',
    },
    error: {
      label: '오류',
      bgColor: 'rgba(239, 68, 68, 0.2)',
      textColor: '#EF4444',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge $bgColor={config.bgColor} $textColor={config.textColor}>
      {config.label}
    </Badge>
  );
}

const Badge = styled.span<{ $bgColor: string; $textColor: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  ${({ theme }) => theme.fonts.Body3};
  font-weight: 500;
  background-color: ${({ $bgColor }) => $bgColor};
  color: ${({ $textColor }) => $textColor};
`;
