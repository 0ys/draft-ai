from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
async def ping():
    """헬스체크용 ping 엔드포인트"""
    return {"message": "pong"}
