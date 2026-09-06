import asyncio
import json
from app.db import _service_headers, _request, service_select_one
from app.ai_service import generate_embedding, to_pgvector

async def test():
    sprint_res = await _request('GET', 'https://ynnjtahmjkblamtmezxj.supabase.co/rest/v1/sprints?embedding=not.is.null&select=title,embedding,required_gender,languages_needed,city', _service_headers())
    sprints = sprint_res.json()
    if not sprints:
        print("No sprints with embedding found")
        return
    sprint = sprints[0]
    
    profiles_res = await _request('GET', 'https://ynnjtahmjkblamtmezxj.supabase.co/rest/v1/profiles?select=id,full_name,headline,role_type,skills,hours_available_per_week,bio,gender,languages,city,embedding', _service_headers())
    profiles = profiles_res.json()
    
    s_vec = json.loads(sprint['embedding']) if isinstance(sprint['embedding'], str) else sprint['embedding']
    candidates = []
    for p in profiles:
        if p.get('role_type') not in ('professional', 'student'):
            continue
        p_vec = json.loads(p['embedding']) if p.get('embedding') and isinstance(p['embedding'], str) else p.get('embedding')
        if not p_vec:
            skills_str = " ".join(p.get('skills') or [])
            text = f"{p['full_name']} | {p['headline']} | {skills_str}"
            p_vec = await generate_embedding(text)
            # save back
            embed_str = to_pgvector(p_vec)
            await _request('PATCH', f"https://ynnjtahmjkblamtmezxj.supabase.co/rest/v1/profiles?id=eq.{p['id']}", _service_headers(), json={'embedding': embed_str})
            print(f"Updated profile {p['full_name']} with embedding!")
            
        dot = sum(a*b for a, b in zip(s_vec, p_vec))
        norm_s = sum(a*a for a in s_vec)**0.5
        norm_p = sum(b*b for b in p_vec)**0.5
        similarity = dot / (norm_s * norm_p) if (norm_s and norm_p) else 0.0
        
        candidates.append({
            'id': p['id'],
            'fullName': p['full_name'],
            'headline': p['headline'],
            'skills': p.get('skills') or [],
            'roleType': p['role_type'],
            'hoursAvailable': p.get('hours_available_per_week') or 10,
            'similarity': round(similarity, 3)
        })
        
    candidates.sort(key=lambda c: c['similarity'], reverse=True)
    print("Matching Candidates found:", len(candidates))
    for c in candidates:
        print(" - Candidate:", c['fullName'], "| Score:", c['similarity'])

if __name__ == "__main__":
    asyncio.run(test())
