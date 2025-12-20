'use client';

import styled from '@emotion/styled';
import { Folder } from '@/types';
import { getFolderName } from '@/utils';

type FolderSelectProps = {
  folders: Folder[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function FolderSelect({ folders, selectedId, onSelect }: FolderSelectProps) {
  return (
    <Select
      value={selectedId || 'all'}
      onChange={(e) => onSelect(e.target.value === 'all' ? null : e.target.value)}
    >
      <option value="all">전체 폴더</option>
      {folders.map((folder) => (
        <option key={folder.id} value={folder.id}>
          {folder.name}
        </option>
      ))}
    </Select>
  );
}

const Select = styled.select`
  width: 100%;
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.colors.Slate100};
  border: 1px solid ${({ theme }) => theme.colors.Slate200};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.Slate950};
  ${({ theme }) => theme.fonts.Body1};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.Primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.Primary}33;
  }
`;
