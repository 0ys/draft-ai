from typing import Any, Dict


class OpenAIService:
    """OpenAI 연동용 서비스 스켈레톤.

    실제 OpenAI API 연동은 추후 구현합니다.
    """

    def __init__(self) -> None:
        # TODO: OpenAI 클라이언트 초기화 (예: openai 라이브러리)
        pass

    async def generate(self, prompt: str) -> Dict[str, Any]:
        # TODO: 실제 OpenAI 호출 로직 구현
        # 임시 응답
        return {"prompt": prompt, "result": "이 기능은 아직 구현되지 않았습니다."}
