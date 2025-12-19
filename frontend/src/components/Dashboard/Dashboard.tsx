'use client';

import styled from '@emotion/styled';
import { useState, useEffect } from 'react';
import { KnowledgeSidebar } from '@/components/Knowledge/KnowledgeSidebar';
import { Workspace } from '@/components/Workspace/Workspace';
import { EvidencePanel } from '@/components/Evidence/EvidencePanel';
import { Folder, DraftResult } from '@/types';
import { uploadDocument, getFolders, generateDraft } from '@/app/actions';

export function Dashboard() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    const folderList = await getFolders();
    setFolders(folderList);
  };

  const handleDocumentUpload = async (file: File, folderPath: string) => {
    const result = await uploadDocument(file, folderPath);
    if (result.success) {
      await loadFolders();
    } else {
      throw new Error(result.error || '업로드 실패');
    }
  };

  const handleGenerate = async (
    question: string,
    folderPath: string | null
  ): Promise<DraftResult> => {
    const result = await generateDraft(question, folderPath);
    setDraftResult(result);
    return result;
  };

  return (
    <Wrapper>
      <LeftColumn>
        <KnowledgeSidebar
          folders={folders}
          selectedFolderPath={selectedFolderPath}
          onFolderSelect={setSelectedFolderPath}
          onDocumentUpload={handleDocumentUpload}
        />
      </LeftColumn>

      <CenterColumn>
        <Workspace
          folders={folders}
          selectedFolderPath={selectedFolderPath}
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

