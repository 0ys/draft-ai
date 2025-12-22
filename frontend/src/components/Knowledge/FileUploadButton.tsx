'use client';

import styled from '@emotion/styled';
import { useRef, useState } from 'react';
import { SvgIcon } from '@/components/icons';

type FileUploadButtonProps = {
  onUpload: (file: File) => Promise<void>;
};

export function FileUploadButton({ onUpload }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 제한: 5MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`용량 초과: 파일 크기(${fileSizeMB}MB)가 최대 허용 용량(5MB)을 초과했습니다.`);
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    
    // 파일 확장자도 체크 (MIME type이 제대로 감지되지 않는 경우 대비)
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'docx', 'doc'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      alert('PDF 또는 DOCX 파일만 업로드 가능합니다.');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert(errorMessage);
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
        {isUploading ? (
          '업로드 중...'
        ) : (
          <>
            <SvgIcon name="upload" size={20} color="currentColor" />
            <span>새 문서 업로드</span>
          </>
        )}
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
  background-color: ${({ theme }) => theme.colors.Primary};
  color: ${({ theme }) => theme.colors.White};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  ${({ theme }) => theme.fonts.Body3};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.Primary};
    opacity: 0.9;
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.Slate200};
    cursor: not-allowed;
  }
`;
