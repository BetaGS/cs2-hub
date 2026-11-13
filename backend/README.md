# CS2 Tournament Hub — Back-End (FastAPI + MySQL + Socket.IO)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # ajuste DATABASE_URL e JWT_SECRET
mysql -u root -p < schema.sql                          # cria o banco + as 3 salas iniciais
uvicorn src.main:asgi_app --reload --port 8000
```
Documentação interativa: http://localhost:8000/docs

**OCR dos prints:** instale o Tesseract no sistema (Windows: https://github.com/UB-Mannheim/tesseract/wiki;
Linux: `sudo apt install tesseract-ocr`). Sem ele o upload funciona, mas o placar precisa ser
digitado na correção manual. Ajuste `COLUMN_ORDER` em `src/services/ocr_service.py` ao layout dos seus prints.

## Fluxo de uma partida
1. Duas equipes definidas -> status `READY`. Os capitães entram em `/partida/:id` e fazem o veto (Socket.IO).
2. Veto concluído -> `LIVE`. Ao fim de cada mapa, um capitão envia o print (`POST /api/matches/:id/result`).
3. OCR extrai placar + K/D/A/ADR/HS% -> `AWAITING_CONFIRMATION`. O remetente pode corrigir (`PUT`).
4. O capitão adversário confirma (`/confirm`) ou contesta (`/dispute`). Ao confirmar: stats dos jogadores,
   avanço automático no chaveamento e, na Grande Final, troféus (time + jogadores + MVP).
> Partidas `DISPUTED` precisam de decisão de um administrador (painel admin não incluído).
