'use client';

import styled from '@emotion/styled';
import Image from 'next/image';
import { Document } from '@/types';

type DocumentStatusBadgeProps = {
  status: Document['status'];
  size?: number;  // 아이콘 크기 (기본값: 16)
};

export function DocumentStatusBadge({ status, size = 16 }: DocumentStatusBadgeProps) {
  const statusConfig = {
    processing: {
      icon: '/icons/check-gray.png',
      alt: '처리 중',
    },
    completed: {
      icon: '/icons/check-green.png',
      alt: '완료',
    },
    failed: {
      icon: '/icons/alert.png',
      alt: '오류',
    },
  };

  const config = statusConfig[status];

  return (
    <IconWrapper title={config.alt}>
      <Image
        src={config.icon}
        alt={config.alt}
        width={size}
        height={size}
        unoptimized
      />
    </IconWrapper>
  );
}

const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;
