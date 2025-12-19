'use client';

import styled from '@emotion/styled';
import { useState } from 'react';
import { Folder, Document } from '@/types';
import { FolderTree } from '@/components/Knowledge/FolderTree';
import { FileUploadButton } from '@/components/Knowledge/FileUploadButton';
import { DocumentStatusBadge } from '@/components/Knowledge/DocumentStatusBadge';

type KnowledgeSidebarProps = {
  folders: Folder[];
  selectedFolderPath: string | null;
  onFolderSelect: (path: string | null) => void;
  onDocumentUpload: (file: File, folderPath: string) => Promise<void>;
};

export function KnowledgeSidebar({
  folders,
  selectedFolderPath,
  onFolderSelect,
  onDocumentUpload,
}: KnowledgeSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <Wrapper>
      <Header>
        <Title>Knowledge Library</Title>
        <FileUploadButton
          onUpload={(file) => {
            const folderPath = selectedFolderPath || 'root/2024';
            return onDocumentUpload(file, folderPath);
          }}
        />
      </Header>

      <TreeContainer>
        <FolderTree
          folders={folders}
          selectedFolderPath={selectedFolderPath}
          expandedFolders={expandedFolders}
          onFolderSelect={onFolderSelect}
          onToggleFolder={toggleFolder}
        />
      </TreeContainer>

      {selectedFolderPath && (
        <DocumentList>
          <DocumentListTitle>문서 목록</DocumentListTitle>
          {folders
            .find(f => f.path === selectedFolderPath)
            ?.documents.map((doc) => (
              <DocumentItem key={doc.id}>
                <DocumentName>{doc.fileName}</DocumentName>
                <DocumentStatusBadge status={doc.status} />
              </DocumentItem>
            ))}
        </DocumentList>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${({ theme }) => theme.colors.Black2};
  border-right: 1px solid ${({ theme }) => theme.colors.Black4};
`;

const Header = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.Black4};
`;

const Title = styled.h2`
  ${({ theme }) => theme.fonts.Title3};
  color: ${({ theme }) => theme.colors.Gray1};
  margin-bottom: 0.75rem;
`;

const TreeContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const DocumentList = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.Black4};
  padding: 1rem;
  max-height: 16rem;
  overflow-y: auto;
`;

const DocumentListTitle = styled.h3`
  ${({ theme }) => theme.fonts.Body2};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.Gray3};
  margin-bottom: 0.5rem;
`;

const DocumentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: ${({ theme }) => theme.colors.Black3};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  ${({ theme }) => theme.fonts.Body2};
`;

const DocumentName = styled.span`
  color: ${({ theme }) => theme.colors.Gray2};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
