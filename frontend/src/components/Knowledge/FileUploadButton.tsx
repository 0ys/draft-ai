'use client';

import styled from '@emotion/styled';
import { useRef, useState } from 'react';

type FileUploadButtonProps = {
  onUpload: (file: File) => Promise<void>;
};

export function FileUploadButton({ onUpload }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('PDF 또는 DOCX 파일만 업로드 가능합니다.');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Wrapper>
      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? '업로드 중...' : '📄 문서 업로드'}
      </Button>
    </Wrapper>
  );
}

const Wrapper = styled.div``;

const HiddenInput = styled.input`
  display: none;
`;

const Button = styled.button`
  width: 100%;
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.colors.SkyDark};
  color: ${({ theme }) => theme.colors.White};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  ${({ theme }) => theme.fonts.Body2};
  font-weight: 500;
  transition: background-color 0.2s;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.Sky};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.Black4};
    cursor: not-allowed;
  }
`;
