'use client';

import styled from '@emotion/styled';
import { useState, useEffect } from 'react';
import { KnowledgeSidebar } from '@/components/Knowledge/KnowledgeSidebar';
import { Workspace } from '@/components/Workspace/Workspace';
import { EvidencePanel } from '@/components/Evidence/EvidencePanel';
import { Folder, DraftResult, Document } from '@/types';
import { uploadDocument, getFolders, getDocuments, generateDraft } from '@/app/actions';

export function Dashboard() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);

  useEffect(() => {
    // 현재 로그인 유저 정보 출력
    const currentUserId = '00000000-0000-0000-0000-000000000001'; // 하드코딩된 유저 ID
    console.log('=== 현재 로그인 유저 정보 ===');
    console.log('User ID:', currentUserId);
    console.log('==========================');
    
    loadFolders();
  }, []);

  const loadFolders = async () => {
    console.log('📁 폴더 목록 로드 시작...');
    const folderList = await getFolders();
    console.log('📁 폴더 목록 로드 완료:', folderList);
    console.log('📁 폴더 개수:', folderList.length);
    setFolders(folderList);
  };

  const handleFolderSelect = async (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleLoadDocuments = async (folderId: string) => {
    // 폴더 확장 시 해당 폴더의 문서를 불러와서 폴더 객체에 추가
    console.log('📄 문서 목록 로드 시작...', { folderId });
    const documents = await getDocuments(folderId);
    console.log('📄 문서 목록 로드 완료:', documents);
    console.log('📄 문서 개수:', documents.length);
    setFolders(prevFolders => 
      prevFolders.map(folder => 
        folder.id === folderId 
          ? { ...folder, documents }
          : folder
      )
    );
  };

  const handleDocumentUpload = async (file: File, folderId: string | null) => {
    console.log('📤 문서 업로드 시작...', { fileName: file.name, folderId });
    const result = await uploadDocument(file, folderId);
    console.log('📤 문서 업로드 결과:', result);
    if (result.success) {
      console.log('✅ 업로드 성공, 폴더 목록 새로고침...');
      await loadFolders();
    } else {
      console.error('❌ 업로드 실패:', result.error);
      throw new Error(result.error || '업로드 실패');
    }
  };

  const handleGenerate = async (
    question: string,
    folderId: string | null
  ): Promise<DraftResult> => {
    const result = await generateDraft(question, folderId);
    setDraftResult(result);
    return result;
  };

  return (
    <Wrapper>
      <LeftColumn>
        <KnowledgeSidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onFolderSelect={handleFolderSelect}
          onDocumentUpload={handleDocumentUpload}
          onLoadDocuments={handleLoadDocuments}
        />
      </LeftColumn>

      <CenterColumn>
        <Workspace
          folders={folders}
          selectedFolderId={selectedFolderId}
          onGenerate={handleGenerate}
        />
      </CenterColumn>

      <RightColumn>
        <EvidencePanel evidences={draftResult?.evidences || []} />
      </RightColumn>
    </Wrapper>
  );
}

const Wrapper = styled.main`
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.Slate50};
`;

const LeftColumn = styled.div`
  width: 25rem;
  flex-shrink: 0;
`;

const CenterColumn = styled.div`
  flex: 1;
  min-width: 0;
`;

const RightColumn = styled.div`
  width: 28rem;
  flex-shrink: 0;
`;

