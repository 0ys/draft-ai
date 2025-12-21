'use client';

import styled from '@emotion/styled';
import { useState, useEffect, useRef, useCallback } from 'react';
import { KnowledgeSidebar } from '@/components/Knowledge/KnowledgeSidebar';
import { Workspace } from '@/components/Workspace/Workspace';
import { EvidencePanel } from '@/components/Evidence/EvidencePanel';
import { SvgIcon } from '@/components/icons';
import { Folder, DraftResult, Document } from '@/types';
import { uploadDocument, getFolders, getDocuments, generateDraft, deleteDocument, getDocumentStatus } from '@/app/actions';

export function Dashboard() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadFolders();
    
    // 컴포넌트 언마운트 시 폴링 정리
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // 인덱싱 중인 문서들의 상태를 주기적으로 확인하는 함수
  const checkDocumentStatuses = useCallback(async () => {
    // 현재 폴더 상태를 기반으로 처리 중인 문서 찾기
    const processingDocuments: Array<{ documentId: string; folderId: string }> = [];
    
    folders.forEach(folder => {
      folder.documents.forEach(doc => {
        if (doc.status === 'processing') {
          processingDocuments.push({
            documentId: doc.id,
            folderId: folder.id,
          });
        }
      });
    });

    // 각 문서의 상태를 확인하고 업데이트
    for (const { documentId, folderId } of processingDocuments) {
      const statusResult = await getDocumentStatus(documentId);
      
      if (statusResult.success && statusResult.status) {
        const newStatus = statusResult.status === 'completed' 
          ? 'completed' 
          : statusResult.status === 'failed' 
          ? 'failed' 
          : 'processing';
        
        // 상태가 변경되었으면 문서 목록 업데이트
        if (newStatus !== 'processing') {
          // 해당 폴더의 문서 목록 새로고침
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
    }
  }, [folders]);

  // 인덱싱 중인 문서들의 상태를 주기적으로 확인
  useEffect(() => {
    // 기존 인터벌 정리
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // 인덱싱 중인 문서가 있는지 확인
    const hasProcessingDocuments = folders.some(folder => 
      folder.documents.some(doc => doc.status === 'processing')
    );

    if (hasProcessingDocuments) {
      // 1분마다 상태 확인
      pollingIntervalRef.current = setInterval(() => {
        checkDocumentStatuses();
      }, 60000);  // 60000ms = 1분
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [folders, checkDocumentStatuses]);

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
      
      // 업로드된 문서가 PDF인 경우 상태 폴링 시작
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // 폴더를 확장하여 새로 업로드된 문서를 표시
        if (targetFolderId) {
          const newExpanded = new Set(expandedFolders);
          newExpanded.add(targetFolderId);
          setExpandedFolders(newExpanded);
          
          // 문서 로드
          await handleLoadDocuments(targetFolderId);
        }
      }
    } else {
      throw new Error(result.error || '업로드 실패');
    }
  };

  const handleDocumentDelete = async (documentId: string, folderId: string) => {
    const result = await deleteDocument(documentId);
    if (result.success) {
      // 삭제 후 해당 폴더의 문서 목록 새로고침
      await handleLoadDocuments(folderId);
      // 폴더 목록도 새로고침하여 문서 개수 업데이트
      await loadFolders();
    } else {
      alert(result.error || '문서 삭제에 실패했습니다.');
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
          onDocumentDelete={handleDocumentDelete}
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

      <RightColumn $isOpen={isEvidencePanelOpen}>
        {isEvidencePanelOpen ? (
          <EvidencePanel 
            evidences={draftResult?.evidences || []} 
            onClose={() => setIsEvidencePanelOpen(false)}
          />
        ) : (
          <ToggleButton onClick={() => setIsEvidencePanelOpen(true)}>
            <ToggleIcon>
              <SvgIcon name="file" size={24} />
            </ToggleIcon>
            <ToggleText>참고 문헌</ToggleText>
          </ToggleButton>
        )}
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

const RightColumn = styled.div<{ $isOpen: boolean }>`
  width: ${({ $isOpen }) => ($isOpen ? '28rem' : '3rem')};
  flex-shrink: 0;
  position: relative;
  transition: width 0.3s ease;
`;

const ToggleButton = styled.button`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: ${({ theme }) => theme.colors.PrimaryLight};
  border: none;
  border-left: 1px solid ${({ theme }) => theme.colors.Slate200};
  cursor: pointer;
  transition: background-color 0.2s;
  padding: 1rem 0;

  &:hover {
    background-color: ${({ theme }) => theme.colors.PrimaryLight};
    opacity: 0.9;
  }
`;

const ToggleIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
`;

const ToggleText = styled.span`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate700};
  font-weight: 500;
`;

