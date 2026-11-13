from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from ..config.database import get_db
from ..config.security import current_user
from ..config.storage import save_image
from ..controllers import matches_controller as ctrl
from ..models.schemas import ManualResultIn, VetoIn
from ..sockets.match_socket import broadcast

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.get("")
def list_active(db: Session = Depends(get_db)):
    return ctrl.list_active(db)


@router.get("/{match_id}")
def get_match(match_id: int, db: Session = Depends(get_db)):
    return ctrl.get_state(db, match_id)


@router.post("/{match_id}/veto")
async def veto(match_id: int, data: VetoIn, user=Depends(current_user), db: Session = Depends(get_db)):
    st = await run_in_threadpool(ctrl.do_veto, db, user, match_id, data)
    await broadcast(st)
    return st


@router.post("/{match_id}/result")
async def upload_result(match_id: int, mapNumber: int = Form(1), screenshot: UploadFile = File(...),
                        user=Depends(current_user), db: Session = Depends(get_db)):
    path, url = await save_image(screenshot, "scoreboards")
    st = await run_in_threadpool(ctrl.submit_result, db, user, match_id, mapNumber, path, url)
    await broadcast(st)
    return st


@router.put("/{match_id}/result")
async def correct(match_id: int, data: ManualResultIn, user=Depends(current_user), db: Session = Depends(get_db)):
    st = await run_in_threadpool(ctrl.correct_result, db, user, match_id, data)
    await broadcast(st)
    return st


@router.post("/{match_id}/result/confirm")
async def confirm(match_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    st = await run_in_threadpool(ctrl.confirm, db, user, match_id)
    await broadcast(st)
    return st


@router.post("/{match_id}/result/dispute")
async def dispute(match_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    st = await run_in_threadpool(ctrl.dispute, db, user, match_id)
    await broadcast(st)
    return st
