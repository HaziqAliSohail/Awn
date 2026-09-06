import asyncio
from app.db import _service_headers, _rest_url, _request, service_update
from app.ai_service import generate_embedding, to_pgvector, build_embedding_input
from app.schemas import SprintOutput

async def fix():
    headers = _service_headers()
    url = _rest_url("sprints")
    resp = await _request("GET", url, headers, params={"select": "*"})
    sprints = resp.json()
    print(f"Total sprints found: {len(sprints)}")
    for s in sprints:
        if not s.get("embedding"):
            scoped = SprintOutput(
                title=s["title"],
                domain=s.get("domain", "general"),
                deliverables=s.get("deliverables") or [],
                prerequisites=s.get("prerequisites") or [],
                estimatedHours=s.get("estimated_hours", 10),
                summary=""
            )
            text = build_embedding_input(scoped)
            vec = await generate_embedding(text)
            embed_str = to_pgvector(vec)
            await service_update("sprints", params={"id": f"eq.{s['id']}"}, patch={"embedding": embed_str})
            print(f"Updated sprint {s['id']} ({s['title']}) with embedding!")

if __name__ == "__main__":
    asyncio.run(fix())
