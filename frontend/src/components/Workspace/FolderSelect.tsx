'use client';

import styled from '@emotion/styled';
import { Folder } from '@/types';
import { getFolderName } from '@/utils';

type FolderSelectProps = {
  folders: Folder[];
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
};

export function FolderSelect({ folders, selectedPath, onSelect }: FolderSelectProps) {
  return (
    <Select
      value={selectedPath || 'all'}
      onChange={(e) => onSelect(e.target.value === 'all' ? null : e.target.value)}
    >
      <option value="all">전체 폴더</option>
      {folders.map((folder) => (
        <option key={folder.path} value={folder.path}>
          {getFolderName(folder.path)}
        </option>
      ))}
    </Select>
  );
}

const Select = styled.select`
  width: 100%;
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.colors.Black3};
  border: 1px solid ${({ theme }) => theme.colors.Black4};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.Gray1};
  ${({ theme }) => theme.fonts.Body1};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.Sky};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.Sky}33;
  }
`;
