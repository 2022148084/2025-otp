import requests
from app.core.config import settings

def search_naver_local(query: str, display: int = 1):
    """
    네이버 지역 검색 API를 호출하여 장소 정보를 반환합니다.
    (기본적으로 키워드당 1개만 가져오도록 설정, 늘릴 수 있음)
    """
    client_id = settings.NAVER_CLIENT_ID
    client_secret = settings.NAVER_CLIENT_SECRET

    if not client_id or not client_secret:
        print("❌ 네이버 API 키가 설정되지 않았습니다.")
        return []

    url = "https://openapi.naver.com/v1/search/local.json"
    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret
    }
    params = {
        "query": query,
        "display": display,
        "sort": "random" # 랜덤으로 가져와야 다양함
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get("total", 0) == 0:
            return []

        results = []
        for item in data["items"]:
            # HTML 태그 제거
            name = item["title"].replace("<b>", "").replace("</b>", "")
            
            # 좌표 변환 (KATECH -> WGS84 근사치)
            try:
                lat = int(item["mapy"]) / 10000000
                lng = int(item["mapx"]) / 10000000
            except Exception:
                lat, lng = 0.0, 0.0

            results.append({
                "name": name,
                "category": item.get("category", ""),
                "address": item.get("roadAddress") or item.get("address", ""),
                "lat": lat,
                "lng": lng,
                "link": item.get("link", ""),
                "search_keyword": query # 어떤 검색어로 나왔는지 기록
            })
            
        return results

    except Exception as e:
        print(f"⚠️ 네이버 API 호출 에러 ({query}): {e}")
        return []