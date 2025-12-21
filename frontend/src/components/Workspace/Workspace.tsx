'use client';

import styled from '@emotion/styled';
import { useState, useEffect } from 'react';
import { Folder, DraftResult } from '@/types';
import { LoadingSpinner } from '@/components/Loading';
import { QuestionInput } from './QuestionInput';
import { FolderSelect } from './FolderSelect';
import { GenerateButton } from './GenerateButton';
import { DraftEditor } from './DraftEditor';

type WorkspaceProps = {
  folders: Folder[];
  selectedFolderId: string | null;
  onGenerate: (question: string, folderId: string | null) => Promise<DraftResult>;
};

export function Workspace({ folders, selectedFolderId, onGenerate }: WorkspaceProps) {
  const [question, setQuestion] = useState('');
  const [searchFolderId, setSearchFolderId] = useState<string | null>(selectedFolderId);
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setSearchFolderId(selectedFolderId);
  }, [selectedFolderId]);

  const handleGenerate = async () => {
    if (!question.trim()) {
      alert('질문을 입력해주세요.');
      return;
    }

    if (!searchFolderId) {
      alert('참조할 폴더를 선택해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await onGenerate(question, searchFolderId);
      setDraftResult(result);
    } catch (error) {
      alert('초안 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Wrapper>
      <InputSection>
        <FormGroup>
          <Label>새로운 질문</Label>
          <QuestionInput
            value={question}
            onChange={setQuestion}
            placeholder="예: 주민등록증 재발급 절차는 어떻게 되나요?"
          />
        </FormGroup>

        <FormRow>
          <FormGroup style={{ flex: 1 }}>
            <Label>참조할 폴더</Label>
            <FolderSelect
              folders={folders}
              selectedId={searchFolderId}
              onSelect={setSearchFolderId}
            />
          </FormGroup>
          <GenerateButton
            onClick={handleGenerate}
            disabled={isGenerating || !question.trim()}
          />
        </FormRow>
      </InputSection>

      <ContentSection>
        {isGenerating ? (
          <LoadingOverlay>
            <LoadingSpinner size="lg" message="초안을 생성하고 있습니다..." />
          </LoadingOverlay>
        ) : draftResult ? (
          <DraftEditor
            draft={draftResult.draft}
            onDraftChange={(newDraft) => {
              setDraftResult({ ...draftResult, draft: newDraft });
            }}
          />
        ) : (
          <EmptyState>
            <EmptyTitle>초안이 생성되지 않았습니다</EmptyTitle>
            <EmptyText>위에서 질문을 입력하고 초안 생성 버튼을 클릭하세요.</EmptyText>
          </EmptyState>
        )}
      </ContentSection>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${({ theme }) => theme.colors.Slate50};
`;

const InputSection = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.Slate200};
  background-color: ${({ theme }) => theme.colors.White};
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  ${({ theme }) => theme.fonts.Body2};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.Slate700};
  margin-bottom: 0.5rem;
`;

const FormRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 1rem;
`;

const ContentSection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

const EmptyState = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const EmptyTitle = styled.p`
  ${({ theme }) => theme.fonts.Title2};
  color: ${({ theme }) => theme.colors.Slate400};
  margin-bottom: 0.5rem;
`;

const EmptyText = styled.p`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate400};
`;

const LoadingOverlay = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
`;
