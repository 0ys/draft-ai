'use client';

import styled from '@emotion/styled';
import { useState } from 'react';
import { useTheme } from '@emotion/react';
import { Folder, Document } from '@/types';
import { getFolderName } from '@/utils';
import { SvgIcon } from '@/components/icons';
import { DocumentStatusBadge } from '@/components/Knowledge/DocumentStatusBadge';

type FolderTreeProps = {
  folders: Folder[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onFolderSelect: (id: string | null) => void;
  onToggleFolder: (id: string) => void;
  onLoadDocuments?: (folderId: string) => Promise<void>;  // 폴더 확장 시 문서 로드
  onDocumentDelete?: (documentId: string, folderId: string) => Promise<void>;  // 문서 삭제 핸들러
};

function getDocumentIcon(fileName: string, theme: any): { name: string; color: string } {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') {
    return { name: 'pdf', color: theme.colors.Red };
  } else if (extension === 'doc' || extension === 'docx') {
    return { name: 'doc', color: theme.colors.DocBlue };
  } else {
    return { name: 'file', color: theme.colors.Slate500 };
  }
}

export function FolderTree({
  folders,
  selectedFolderId,
  expandedFolders,
  onFolderSelect,
  onToggleFolder,
  onLoadDocuments,
  onDocumentDelete,
}: FolderTreeProps) {
  const theme = useTheme();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // 계층 구조를 위한 정렬 (parentId가 null인 것부터, 그 다음 자식들)
  const sortedFolders = [...folders].sort((a, b) => {
    // 루트 폴더(parentId가 null)를 먼저
    if (a.parentId === null && b.parentId !== null) return -1;
    if (a.parentId !== null && b.parentId === null) return 1;
    // 같은 레벨이면 이름으로 정렬
    return a.name.localeCompare(b.name);
  });

  const handleFolderClick = async (folder: Folder) => {
    const wasExpanded = expandedFolders.has(folder.id);
    onToggleFolder(folder.id);
    onFolderSelect(folder.id);
    
    // 폴더를 확장할 때 문서가 없으면 로드
    if (!wasExpanded && folder.documents.length === 0 && onLoadDocuments) {
      await onLoadDocuments(folder.id);
    }
  };

  const handleDocumentClick = (document: Document, folderId: string) => {
    // 문서 클릭 시 선택 상태 토글
    if (selectedDocumentId === document.id) {
      setSelectedDocumentId(null);
    } else {
      setSelectedDocumentId(document.id);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, documentId: string, folderId: string) => {
    e.stopPropagation(); // 문서 클릭 이벤트 전파 방지
    
    if (window.confirm('이 문서를 삭제하시겠습니까?')) {
      if (onDocumentDelete) {
        await onDocumentDelete(documentId, folderId);
        setSelectedDocumentId(null); // 삭제 후 선택 상태 초기화
      }
    }
  };

  return (
    <Wrapper>
      {sortedFolders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = selectedFolderId === folder.id;

        return (
          <FolderItem key={folder.id}>
            <FolderButton
              onClick={() => handleFolderClick(folder)}
              $isSelected={isSelected}
            >
              <IconWrapper>
                <SvgIcon 
                  name={isExpanded ? 'folder' : 'folder-outline'} 
                  size={25} 
                />
              </IconWrapper>
              <FolderName>{folder.name}</FolderName>
              <FolderCount>({folder.documentCount})</FolderCount>
            </FolderButton>
            
            {isExpanded && folder.documents.length > 0 && (
              <DocumentList>
                {folder.documents.map((document) => {
                  const { name: iconName, color: iconColor } = getDocumentIcon(document.fileName, theme);
                  const isSelected = selectedDocumentId === document.id;
                  return (
                    <DocumentItem 
                      key={document.id}
                      onClick={() => handleDocumentClick(document, folder.id)}
                      $isSelected={isSelected}
                    >
                      <SvgIcon name={iconName} size={20} color={iconColor} />
                      <DocumentName>{document.fileName}</DocumentName>
                      <StatusIconWrapper>
                        <DocumentStatusBadge status={document.status} size={16} />
                      </StatusIconWrapper>
                      {isSelected && (
                        <DeleteButton
                          onClick={(e) => handleDeleteClick(e, document.id, folder.id)}
                          title="문서 삭제"
                        >
                          삭제
                        </DeleteButton>
                      )}
                    </DocumentItem>
                  );
                })}
              </DocumentList>
            )}
          </FolderItem>
        );
      })}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FolderItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const FolderButton = styled.button<{ $isSelected: boolean }>`
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  ${({ theme }) => theme.fonts.Body2};
  transition: all 0.2s;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  background-color: ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.Slate100 : 'transparent'};
  color: ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.Black : theme.colors.Slate700};

  &:hover {
    background-color: ${({ theme, $isSelected }) =>
      $isSelected ? theme.colors.Slate200 : theme.colors.Slate100};
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const FolderName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FolderCount = styled.span`
  ${({ theme }) => theme.fonts.Caption};
  opacity: 0.7;
`;

const DocumentList = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 0.75rem;
  padding-left: 1.5rem;
  border-left: 1px solid ${({ theme }) => theme.colors.Slate200};
  margin-top: 0.25rem;
  gap: 0.125rem;
`;

const DocumentItem = styled.div<{ $isSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate700};
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  background-color: ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.Slate100 : 'transparent'};

  &:hover {
    background-color: ${({ theme, $isSelected }) =>
      $isSelected ? theme.colors.Slate200 : theme.colors.Slate50};
    color: ${({ theme }) => theme.colors.Slate950};
  }

  svg {
    flex-shrink: 0;
  }
`;

const DocumentName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
`;

const StatusIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 0.25rem;
`;

const DeleteButton = styled.button`
  flex-shrink: 0;
  padding: 0.25rem 0.5rem;
  background-color: ${({ theme }) => theme.colors.Red};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  ${({ theme }) => theme.fonts.Body4};
  cursor: pointer;
  transition: background-color 0.2s;
  margin-left: auto;

  &:hover {
    background-color: #DC2626;
  }

  &:active {
    background-color: #B91C1C;
  }
`;
