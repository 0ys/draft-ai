'use client';

import { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { useTheme } from '@emotion/react';
import { useRouter } from 'next/navigation';
import { Folder } from '@/types';
import { FolderTree } from '@/components/Knowledge/FolderTree';
import { FileUploadButton } from '@/components/Knowledge/FileUploadButton';
import { LoadingSpinner } from '@/components/Loading';
import { SvgIcon } from '@/components/icons';
import { getUser } from '@/utils/auth';

type KnowledgeSidebarProps = {
  folders: Folder[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onFolderSelect: (id: string | null) => void;
  onDocumentUpload: (file: File, folderId: string | null) => Promise<void>;
  onLoadDocuments?: (folderId: string) => Promise<void>;  // 폴더 확장 시 문서 로드
  onDocumentDelete?: (documentId: string, folderId: string) => Promise<void>;  // 문서 삭제 핸들러
  onToggleFolder: (id: string) => void;
  isLoadingFolders?: boolean;  // 폴더 목록 로딩 상태
};

export function KnowledgeSidebar({
  folders,
  selectedFolderId,
  expandedFolders,
  onFolderSelect,
  onDocumentUpload,
  onLoadDocuments,
  onDocumentDelete,
  onToggleFolder,
  isLoadingFolders = false,
}: KnowledgeSidebarProps) {
  const theme = useTheme();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
  } | null>(null);

  // 클라이언트에서만 사용자 정보 로드 (Hydration mismatch 방지)
  useEffect(() => {
    setUser(getUser());
  }, []);

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        buttonRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);

  const handleLogout = () => {
    // 로그아웃 로직 (필요시 추가)
    router.push('/login');
  };

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
          {isLoadingFolders ? (
            <LoadingWrapper>
              <LoadingSpinner size="md" message="폴더 목록을 불러오는 중..." />
            </LoadingWrapper>
          ) : (
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onFolderSelect={onFolderSelect}
              onToggleFolder={onToggleFolder}
              onLoadDocuments={onLoadDocuments}
              onDocumentDelete={onDocumentDelete}
            />
          )}
        </TreeContainer>
      </NavArea>

      {/* 4. 하단 프로필 영역 */}
      <Footer>
        <UserProfile>
          <Avatar>
            <SvgIcon name="user" size={20} color={theme.colors.Primary} />
          </Avatar>
          <UserInfo>
            <UserName>{user?.name || '사용자'}</UserName>
            <UserDept>{user?.email || ''}</UserDept>
          </UserInfo>
          <SettingsButtonContainer>
            <SettingsButton
              ref={buttonRef}
              onClick={() => setIsModalOpen(!isModalOpen)}
            >
              <SvgIcon name="setting" size={20} color="#94A3B8" />
            </SettingsButton>
            {isModalOpen && (
              <SettingsModal ref={modalRef}>
                <LogoutButton onClick={handleLogout}>
                  로그아웃
                </LogoutButton>
              </SettingsModal>
            )}
          </SettingsButtonContainer>
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
  position: relative;
  
  /* 스크롤바 커스텀 */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.Slate200};
    border-radius: 10px;
  }
`;

const LoadingWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  width: 100%;
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
  background-color: ${({ theme }) => theme.colors.White};
  border: 1px solid ${({ theme }) => theme.colors.Slate200};
  display: flex;
  align-items: center;
  justify-content: center;
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

const SettingsButtonContainer = styled.div`
  position: relative;
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

const SettingsModal = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  background-color: ${({ theme }) => theme.colors.White};
  border: 1px solid ${({ theme }) => theme.colors.Slate200};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  min-width: 120px;
  z-index: 1000;
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.Slate950};
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.Slate50};
  }
  
  &:first-of-type {
    border-radius: ${({ theme }) => theme.borderRadius.md} ${({ theme }) => theme.borderRadius.md} 0 0;
  }
  
  &:last-of-type {
    border-radius: 0 0 ${({ theme }) => theme.borderRadius.md} ${({ theme }) => theme.borderRadius.md};
  }
`;