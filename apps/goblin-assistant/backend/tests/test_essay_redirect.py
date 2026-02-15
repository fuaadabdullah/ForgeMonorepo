from backend.chat_router import essay_redirect


async def test_chat_essay_redirects_to_root_essay():
    resp = await essay_redirect()
    assert resp.status_code == 307
    assert resp.headers.get("location") == "/essay"
