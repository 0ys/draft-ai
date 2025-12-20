'use client';

import styled from '@emotion/styled';
import { useTheme } from '@emotion/react';
import { Folder } from '@/types';
import { FolderTree } from '@/components/Knowledge/FolderTree';
import { FileUploadButton } from '@/components/Knowledge/FileUploadButton';
import { SvgIcon } from '@/components/icons';

type KnowledgeSidebarProps = {
  folders: Folder[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onFolderSelect: (id: string | null) => void;
  onDocumentUpload: (file: File, folderId: string | null) => Promise<void>;
  onLoadDocuments?: (folderId: string) => Promise<void>;  // 폴더 확장 시 문서 로드
  onToggleFolder: (id: string) => void;
};

export function KnowledgeSidebar({
  folders,
  selectedFolderId,
  expandedFolders,
  onFolderSelect,
  onDocumentUpload,
  onLoadDocuments,
  onToggleFolder,
}: KnowledgeSidebarProps) {
  const theme = useTheme();

  return (
    <Wrapper>
      {/* 1. 상단 로고 영역 */}
      <BrandArea>
        <LogoIcon>
          <SvgIcon name="draft" size={30} color={theme.colors.Primary} />
        </LogoIcon>
        <LogoText>
          Draft <span>AI</span>
        </LogoText>
      </BrandArea>

      {/* 2. 업로드 버튼 영역 */}
      <UploadSection>
        <FileUploadButton
          onUpload={(file) => {
            return onDocumentUpload(file, selectedFolderId);
          }}
        />
      </UploadSection>

      {/* 3. 메인 네비게이션 (Knowledge Base) */}
      <NavArea>
        <SectionLabel>KNOWLEDGE BASE</SectionLabel>
        <TreeContainer>
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            expandedFolders={expandedFolders}
            onFolderSelect={onFolderSelect}
            onToggleFolder={onToggleFolder}
            onLoadDocuments={onLoadDocuments}
          />
        </TreeContainer>
      </NavArea>

      {/* 4. 하단 프로필 영역 */}
      <Footer>
        <UserProfile>
          <Avatar>YS</Avatar>
          <UserInfo>
            <UserName>공예슬</UserName>
            <UserDept>서울시 식품의약부</UserDept>
          </UserInfo>
          <SettingsButton>
            <SvgIcon name="setting" size={20} color="#94A3B8" />
          </SettingsButton>
        </UserProfile>
      </Footer>
    </Wrapper>
  );
}

// --- Styled Components ---

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${({ theme }) => theme.colors.White};
  border-right: 1px solid ${({ theme }) => theme.colors.Slate200};
`;

const BrandArea = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 20px;
`;

const LogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogoText = styled.h1`
  ${({ theme }) => theme.fonts.Title1};
  color: ${({ theme }) => theme.colors.Slate950};
  letter-spacing: -0.02em;
  
  span {
    color: ${({ theme }) => theme.colors.Primary};
  }
`;

const UploadSection = styled.div`
  padding: 0 16px 24px 16px;
  
  /* FileUploadButton 내부 스타일을 덮어씌우기 위한 설정 */
  button {
    width: 100%;
    height: 48px;
    background-color: ${({ theme }) => theme.colors.Primary};
    color: white;
    border-radius: ${({ theme }) => theme.borderRadius.md};
    font-weight: 600;
    display: flex;
    justify-content: center;
    gap: 8px;
    border: none;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background-color: #1d4ed8;
    }
  }
`;

const NavArea = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SectionLabel = styled.div`
  padding: 0 20px 12px 20px;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.Slate400};
  letter-spacing: 0.05em;
`;

const TreeContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
  
  /* 스크롤바 커스텀 */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.Slate200};
    border-radius: 10px;
  }
`;

const Footer = styled.div`
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.Slate100};
  background-color: ${({ theme }) => theme.colors.Slate50};
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #DBEAFE;
  color: #2563EB;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
`;

const UserInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const UserName = styled.span`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.Slate950};
`;

const UserDept = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.Slate500};
`;

const SettingsButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.Slate200};
  }
`;