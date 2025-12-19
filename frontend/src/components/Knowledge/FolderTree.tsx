'use client';

import styled from '@emotion/styled';
import { Folder } from '@/types';
import { getFolderName } from '@/utils';

type FolderTreeProps = {
  folders: Folder[];
  selectedFolderPath: string | null;
  expandedFolders: Set<string>;
  onFolderSelect: (path: string | null) => void;
  onToggleFolder: (path: string) => void;
};

export function FolderTree({
  folders,
  selectedFolderPath,
  expandedFolders,
  onFolderSelect,
  onToggleFolder,
}: FolderTreeProps) {
  const sortedFolders = [...folders].sort((a, b) => {
    const depthA = a.path.split('/').filter(p => p).length;
    const depthB = b.path.split('/').filter(p => p).length;
    if (depthA !== depthB) return depthA - depthB;
    return a.path.localeCompare(b.path);
  });

  return (
    <Wrapper>
      <RootButton
        onClick={() => onFolderSelect(null)}
        $isSelected={selectedFolderPath === null}
      >
        📁 전체 문서
      </RootButton>

      {sortedFolders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.path);
        const isSelected = selectedFolderPath === folder.path;
        const depth = folder.path.split('/').filter(p => p).length;

        return (
          <FolderButton
            key={folder.path}
            onClick={() => {
              onToggleFolder(folder.path);
              onFolderSelect(folder.path);
            }}
            $isSelected={isSelected}
            $depth={depth}
          >
            <span>{isExpanded ? '📂' : '📁'}</span>
            <FolderName>{getFolderName(folder.path)}</FolderName>
            <FolderCount>({folder.documents.length})</FolderCount>
          </FolderButton>
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

const RootButton = styled.button<{ $isSelected: boolean }>`
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  ${({ theme }) => theme.fonts.Body2};
  transition: all 0.2s;
  border: none;
  background: none;
  cursor: pointer;

  background-color: ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.Primary : 'transparent'};
  color: ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.White : theme.colors.Slate700};

  &:hover {
    background-color: ${({ theme, $isSelected }) =>
      $isSelected ? theme.colors.Primary : theme.colors.Slate100};
  }
`;

const FolderButton = styled.button<{ $isSelected: boolean; $depth: number }>`
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  padding-left: ${({ $depth }) => `${0.75 + $depth * 1}rem`};
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
    $isSelected ? theme.colors.Primary : 'transparent'};
  color: ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.White : theme.colors.Slate700};

  &:hover {
    background-color: ${({ theme, $isSelected }) =>
      $isSelected ? theme.colors.Primary : theme.colors.Slate100};
  }
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
