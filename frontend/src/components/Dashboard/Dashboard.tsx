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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    const folderList = await getFolders();
    setFolders(folderList);
    
    // 열려있던 폴더의 문서를 다시 로드
    if (expandedFolders.size > 0) {
      const foldersToLoad = Array.from(expandedFolders).filter(id => 
        folderList.some(f => f.id === id)
      );
      
      for (const folderId of foldersToLoad) {
        const documents = await getDocuments(folderId);
        setFolders(prevFolders => 
          prevFolders.map(f => 
            f.id === folderId 
              ? { ...f, documents }
              : f
          )
        );
      }
    }
  };

  const handleFolderSelect = async (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleLoadDocuments = async (folderId: string) => {
    // 폴더 확장 시 해당 폴더의 문서를 불러와서 폴더 객체에 추가
    const documents = await getDocuments(folderId);
    setFolders(prevFolders => 
      prevFolders.map(folder => 
        folder.id === folderId 
          ? { ...folder, documents }
          : folder
      )
    );
  };

  const handleDocumentUpload = async (file: File, folderId: string | null) => {
    // folderId가 null이면 '최근 문서함' 폴더를 찾아서 사용
    let targetFolderId = folderId;
    if (!targetFolderId) {
      const recentFolder = folders.find(folder => folder.name === '최근 문서함');
      if (recentFolder) {
        targetFolderId = recentFolder.id;
      }
    }
    
    const result = await uploadDocument(file, targetFolderId);
    if (result.success) {
      await loadFolders();
    } else {
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
          expandedFolders={expandedFolders}
          onFolderSelect={handleFolderSelect}
          onDocumentUpload={handleDocumentUpload}
          onLoadDocuments={handleLoadDocuments}
          onToggleFolder={(id: string) => {
            const newExpanded = new Set(expandedFolders);
            if (newExpanded.has(id)) {
              newExpanded.delete(id);
            } else {
              newExpanded.add(id);
            }
            setExpandedFolders(newExpanded);
          }}
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

