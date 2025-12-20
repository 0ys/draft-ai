"""
Q&A RAG 시스템 사용 예제

이 스크립트는 Q&A 형식의 PDF 문서를 분석하고 질문에 답변하는 예제입니다.
"""

import os
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.services.qna_rag_service import QnARAGService
from app.core.config import get_settings


def main():
    """메인 실행 함수"""
    # 설정 로드
    settings = get_settings()

    # 환경 변수 확인
    if not settings.openai_api_key:
        print("오류: OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
        print("환경 변수를 설정하거나 .env 파일에 추가해주세요.")
        return

    if not settings.llama_cloud_api_key:
        print("오류: LLAMA_CLOUD_API_KEY 환경 변수가 설정되지 않았습니다.")
        print("환경 변수를 설정하거나 .env 파일에 추가해주세요.")
        print("LlamaCloud API 키는 https://cloud.llamaindex.ai 에서 발급받을 수 있습니다.")
        return

    # Q&A RAG 서비스 초기화
    print("=" * 60)
    print("Q&A RAG 시스템 초기화 중...")
    print("=" * 60)
    
    rag_service = QnARAGService(
        openai_api_key=settings.openai_api_key,
        llama_cloud_api_key=settings.llama_cloud_api_key,
        storage_dir="./storage_qna",
    )

    # 저장된 모든 인덱스 로드
    print("\n" + "=" * 60)
    print("저장된 인덱스 로드 중...")
    print("=" * 60)
    loaded_count = rag_service.load_all_indices()
    
    # PDF 관리 메뉴
    while True:
        print("\n" + "=" * 60)
        print("PDF 관리 메뉴")
        print("=" * 60)
        print("1. PDF 추가/업데이트")
        print("2. PDF 목록 보기")
        print("3. PDF 삭제")
        print("4. 질문하기 (모든 PDF에서 검색)")
        print("5. 종료")
        print("=" * 60)
        
        choice = input("선택하세요 (1-5): ").strip()
        
        if choice == "1":
            # PDF 추가
            pdf_path = input("PDF 파일 경로를 입력하세요: ").strip()
            # ./storage/00000000-0000-0000-0000-000000000001/20251220_230036_c04ec9bb.pdf
            if not os.path.exists(pdf_path):
                print(f"오류: 파일을 찾을 수 없습니다: {pdf_path}")
                continue
            
            # PDF ID 확인을 위해 임시로 해시 계산
            import hashlib
            abs_path = os.path.abspath(pdf_path)
            pdf_id = hashlib.md5(abs_path.encode()).hexdigest()
            
            if pdf_id in rag_service.indices:
                rebuild = input(f"이미 등록된 PDF입니다. 재구축하시겠습니까? (y/N): ").strip().lower()
                if rebuild != 'y':
                    continue
                force_rebuild = True
            else:
                force_rebuild = False
            
            print(f"\n인덱스 구축 중: {os.path.basename(pdf_path)}")
            try:
                rag_service.build_index(pdf_path, force_rebuild=force_rebuild)
                print("인덱스 구축 완료!")
            except Exception as e:
                print(f"오류 발생: {e}")
                import traceback
                traceback.print_exc()
        
        elif choice == "2":
            # PDF 목록 보기
            pdfs = rag_service.list_pdfs()
            if not pdfs:
                print("등록된 PDF가 없습니다.")
            else:
                print(f"\n등록된 PDF ({len(pdfs)}개):")
                for i, pdf_info in enumerate(pdfs, 1):
                    print(f"\n[{i}] {pdf_info['name']}")
                    print(f"    ID: {pdf_info['id']}")
                    print(f"    경로: {pdf_info['path']}")
        
        elif choice == "3":
            # PDF 삭제
            pdfs = rag_service.list_pdfs()
            if not pdfs:
                print("등록된 PDF가 없습니다.")
                continue
            
            print("\n삭제할 PDF 선택:")
            for i, pdf_info in enumerate(pdfs, 1):
                print(f"[{i}] {pdf_info['name']}")
            
            try:
                idx = int(input("번호를 입력하세요: ").strip()) - 1
                if 0 <= idx < len(pdfs):
                    pdf_id = pdfs[idx]['id']
                    confirm = input(f"'{pdfs[idx]['name']}'를 삭제하시겠습니까? (y/N): ").strip().lower()
                    if confirm == 'y':
                        if rag_service.remove_index(pdf_id):
                            print("삭제 완료!")
                        else:
                            print("삭제 실패!")
                else:
                    print("잘못된 번호입니다.")
            except ValueError:
                print("숫자를 입력해주세요.")
        
        elif choice == "4":
            # 질문하기
            if not rag_service.indices:
                print("등록된 PDF가 없습니다. 먼저 PDF를 추가해주세요.")
                continue
            
            print(f"\n현재 {len(rag_service.indices)}개의 PDF에서 검색합니다.")
            break  # 질문 루프로 이동
        
        elif choice == "5":
            print("프로그램을 종료합니다.")
            return
        
        else:
            print("잘못된 선택입니다.")

    # 질문-답변 루프
    print("\n" + "=" * 60)
    print("질문을 입력하세요. 종료하려면 'quit' 또는 'exit'를 입력하세요.")
    print("=" * 60)

    while True:
        question = input("\n질문: ").strip()

        if question.lower() in ['quit', 'exit', 'q']:
            print("프로그램을 종료합니다.")
            break

        if not question:
            continue

        try:
            # 답변 생성
            answer = rag_service.query(question, similarity_top_k=3)
            
            print("\n" + "-" * 60)
            print("답변:")
            print("-" * 60)
            print(answer)
            print("-" * 60)

            # 참조된 노드 정보 출력 (선택사항)
            show_refs = input("\n참조된 문서를 보시겠습니까? (y/N): ").strip().lower()
            if show_refs == 'y':
                nodes = rag_service.get_retrieved_nodes(question, similarity_top_k=3)
                print("\n참조된 문서:")
                for i, node in enumerate(nodes, 1):
                    pdf_name = node.metadata.get('pdf_name', 'Unknown') if hasattr(node, 'metadata') and node.metadata else 'Unknown'
                    score_str = f"{node.score:.4f}" if node.score is not None else "N/A"
                    print(f"\n[{i}] PDF: {pdf_name}")
                    print(f"    Score: {score_str}")
                    print(f"    내용 (일부): {node.text[:200] if node.text else 'N/A'}...")

        except Exception as e:
            print(f"오류 발생: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()
